import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Awaitable, Callable, Dict, Iterable, List, Optional, Tuple, TypeVar

from app.models.schemas import (
    FormulationCreate,
    FormulationListResponse,
    FormulationResponse,
    FormulationUpdate,
)

logger = logging.getLogger(__name__)

T = TypeVar("T")

_SINGLE_FORMULATION_QUERY = """
MATCH (f:Formulation {id: $id})
OPTIONAL MATCH (f)-[c:CONTAINS]->(i:Food)
RETURN f, collect({
    name: i.name,
    percentage: coalesce(c['percentage'], 0.0),
    cost_per_kg: coalesce(c['cost_per_kg'], 0.0),
    function: coalesce(c['function'], i['function'], 'unspecified'),
    quantity_kg: coalesce(c['quantity_kg'], coalesce(c['percentage'], 0.0) / 100.0),
    cost_reference: coalesce(
        c['cost_reference'],
        (coalesce(c['percentage'], 0.0) / 100.0) * coalesce(c['cost_per_kg'], 0.0)
    )
}) as ingredients
"""


@dataclass
class FormulationEvent:
    """Event emitted whenever the pipeline mutates formulation data."""

    type: str
    payload: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.utcnow)


class FormulationEventBus:
    """Minimal async event bus for formulation lifecycle events."""

    def __init__(self) -> None:
        self._subscribers: Dict[str, List[Callable[[FormulationEvent], Awaitable[None] | None]]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, event_type: str, handler: Callable[[FormulationEvent], Awaitable[None] | None]) -> None:
        async with self._lock:
            self._subscribers.setdefault(event_type, []).append(handler)

    async def publish(self, event_type: str, payload: Dict[str, Any]) -> None:
        async with self._lock:
            listeners = list(self._subscribers.get(event_type, []))

        if not listeners:
            return

        event = FormulationEvent(type=event_type, payload=payload)
        for listener in listeners:
            try:
                result = listener(event)
                if asyncio.iscoroutine(result):
                    await result
            except Exception:  # pragma: no cover - defensive logging
                logger.exception("Formulation event handler failed", extra={"event": event_type})


class FormulationPipelineCache:
    """Process-local TTL cache for formulation read operations."""

    def __init__(self, ttl_seconds: int = 10, max_entries: int = 128) -> None:
        self._ttl_seconds = ttl_seconds
        self._max_entries = max(1, max_entries)
        self._store: Dict[Any, Tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: Any) -> Optional[Any]:
        async with self._lock:
            entry = self._store.get(key)
            if not entry:
                return None

            expires_at, value = entry
            if expires_at < time.time():
                self._store.pop(key, None)
                return None

            return _safe_copy(value)

    async def set(self, key: Any, value: Any) -> None:
        async with self._lock:
            if len(self._store) >= self._max_entries:
                # Drop oldest entry to respect cache size
                oldest_key = min(self._store.keys(), key=lambda candidate: self._store[candidate][0])
                self._store.pop(oldest_key, None)

            self._store[key] = (time.time() + self._ttl_seconds, _safe_copy(value))

    async def invalidate(self, predicate: Optional[Callable[[Any], bool]] = None) -> None:
        async with self._lock:
            if predicate is None:
                self._store.clear()
                return

            keys_to_delete = [key for key in self._store if predicate(key)]
            for key in keys_to_delete:
                self._store.pop(key, None)


def _safe_copy(value: Any) -> Any:
    try:
        from copy import deepcopy

        return deepcopy(value)
    except Exception:  # pragma: no cover - defensive
        return value


def _compute_cost_fields(percentage: Optional[float], cost_per_kg: Optional[float]) -> Tuple[float, float]:
    pct = float(percentage or 0.0)
    cost_value = float(cost_per_kg or 0.0)
    quantity_kg = pct / 100.0
    cost_reference = quantity_kg * cost_value
    return quantity_kg, cost_reference


def _map_formulation_record(record: Dict[str, Any]) -> Optional[FormulationResponse]:
    form_node = record.get("f")
    if not form_node:
        return None

    try:
        form_props = dict(form_node)
    except TypeError:
        form_props = form_node if isinstance(form_node, dict) else {}

    raw_ingredients = record.get("ingredients") or []
    ingredients = [ing for ing in raw_ingredients if isinstance(ing, dict) and ing.get("name")]
    for ingredient in ingredients:
        quantity_kg, cost_reference = _compute_cost_fields(
            ingredient.get("percentage"),
            ingredient.get("cost_per_kg"),
        )
        ingredient.setdefault("quantity_kg", quantity_kg)
        ingredient.setdefault("cost_reference", cost_reference)
    total_percentage = sum(ing.get("percentage", 0.0) for ing in ingredients)

    return FormulationResponse(
        id=form_props.get("id", ""),
        name=form_props.get("name", ""),
        description=form_props.get("description"),
        status=form_props.get("status", "draft"),
        ingredients=ingredients,
        total_percentage=total_percentage,
        created_at=form_props.get("created_at", ""),
        updated_at=form_props.get("updated_at"),
        cost_per_kg=form_props.get("cost_per_kg"),
        cost_basis_kg=form_props.get("cost_basis_kg"),
        cost_updated_at=form_props.get("cost_updated_at"),
    )


def _fetch_formulation(neo4j_client, formulation_id: str) -> Optional[FormulationResponse]:
    if not neo4j_client:
        return None

    records = neo4j_client.execute_query(_SINGLE_FORMULATION_QUERY, {"id": formulation_id})
    if not records:
        return None
    return _map_formulation_record(records[0])


class FormulationPipelineService:
    """Centralized formulation pipeline coordinating retries, caching, and events."""

    def __init__(
        self,
        neo4j_client,
        *,
        cache: Optional[FormulationPipelineCache] = None,
        event_bus: Optional[FormulationEventBus] = None,
        max_retries: int = 2,
        backoff_seconds: float = 0.3,
        max_backoff_seconds: float = 2.0,
    ) -> None:
        self._neo4j = neo4j_client
        self._cache = cache or FormulationPipelineCache()
        self._event_bus = event_bus or FormulationEventBus()
        self._max_retries = max(1, max_retries)
        self._backoff_seconds = max(0.0, backoff_seconds)
        self._max_backoff_seconds = max(self._backoff_seconds, max_backoff_seconds)

    async def create(self, payload: FormulationCreate) -> FormulationResponse:
        created_at = datetime.now().isoformat()
        formulation_id = f"form_{int(datetime.now().timestamp() * 1000)}"

        def operation() -> FormulationResponse:
            total_percentage = sum(ing.percentage for ing in payload.ingredients)
            if abs(total_percentage - 100.0) > 0.1:
                raise ValueError(
                    f"Ingredient percentages must sum to 100%. Current total: {total_percentage}%"
                )

            manual_ingredients: List[Dict[str, Any]] = []
            manual_cost_per_kg = 0.0
            for ing in payload.ingredients:
                ingredient_dict = ing.model_dump()
                quantity_kg, cost_reference = _compute_cost_fields(ing.percentage, ing.cost_per_kg)
                ingredient_dict["quantity_kg"] = quantity_kg
                ingredient_dict["cost_reference"] = cost_reference
                manual_ingredients.append(ingredient_dict)
                manual_cost_per_kg += cost_reference

            if self._neo4j:
                self._persist_creation(formulation_id, payload, created_at)
                created = _fetch_formulation(self._neo4j, formulation_id)
                if created:
                    return created

            return FormulationResponse(
                id=formulation_id,
                name=payload.name,
                description=payload.description,
                status=payload.status,
                ingredients=manual_ingredients,
                total_percentage=total_percentage,
                created_at=created_at,
                cost_per_kg=manual_cost_per_kg,
                cost_basis_kg=1.0,
                cost_updated_at=datetime.now().isoformat(),
            )

        try:
            result = await self._execute_with_retry(operation)
        except ValueError:
            raise
        except Exception:
            logger.exception("Failed to create formulation")
            raise

        await self._cache.invalidate()
        await self._publish("formulation.created", {"id": result.id})
        return result

    def _persist_creation(self, formulation_id: str, payload: FormulationCreate, created_at: str) -> None:
        self._neo4j.execute_query(
            """
            CREATE (f:Formulation {
                id: $id,
                name: $name,
                description: $description,
                status: $status,
                created_at: $created_at
            })
            RETURN f
            """,
            {
                "id": formulation_id,
                "name": payload.name,
                "description": payload.description,
                "status": payload.status,
                "created_at": created_at,
            },
        )

        total_cost_reference = 0.0
        for ing in payload.ingredients:
            quantity_kg, cost_reference = _compute_cost_fields(ing.percentage, ing.cost_per_kg)
            total_cost_reference += cost_reference
            self._neo4j.execute_query(
                """
                MATCH (f:Formulation {id: $form_id})
                MERGE (i:Food {name: $name})
                CREATE (f)-[:CONTAINS {
                    percentage: $percentage,
                    cost_per_kg: $cost_per_kg,
                    function: $function,
                    quantity_kg: $quantity_kg,
                    cost_reference: $cost_reference
                }]->(i)
                """,
                {
                    "form_id": formulation_id,
                    "name": ing.name,
                    "percentage": ing.percentage,
                    "cost_per_kg": ing.cost_per_kg if ing.cost_per_kg is not None else 0.0,
                    "function": ing.function or "unspecified",
                    "quantity_kg": quantity_kg,
                    "cost_reference": cost_reference,
                },
            )

        self._neo4j.execute_query(
            """
            MATCH (f:Formulation {id: $id})
            SET f.cost_per_kg = $cost_per_kg,
                f.cost_basis_kg = $cost_basis_kg,
                f.cost_updated_at = datetime()
            RETURN f
            """,
            {
                "id": formulation_id,
                "cost_per_kg": total_cost_reference,
                "cost_basis_kg": 1.0,
            },
        )

    async def list(self, *, skip: int = 0, limit: int = 50) -> FormulationListResponse:
        cache_key = ("list", skip, limit)
        cached = await self._cache.get(cache_key)
        if cached:
            return FormulationListResponse.model_validate(cached)

        if not self._neo4j:
            response = FormulationListResponse(formulations=[], total_count=0)
            await self._cache.set(cache_key, response.model_dump())
            return response

        def operation() -> FormulationListResponse:
            query = """
            MATCH (f:Formulation)
            OPTIONAL MATCH (f)-[c:CONTAINS]->(i:Food)
            RETURN f, collect({
                name: i.name,
                percentage: coalesce(c['percentage'], 0.0),
                cost_per_kg: coalesce(c['cost_per_kg'], 0.0),
                function: coalesce(c['function'], i['function'], 'unspecified'),
                quantity_kg: coalesce(c['quantity_kg'], coalesce(c['percentage'], 0.0) / 100.0),
                cost_reference: coalesce(
                    c['cost_reference'],
                    (coalesce(c['percentage'], 0.0) / 100.0) * coalesce(c['cost_per_kg'], 0.0)
                )
            }) as ingredients
            ORDER BY coalesce(f.updated_at, f.created_at) DESC
            SKIP $skip
            LIMIT $limit
            """

            records = self._neo4j.execute_query(query, {"skip": skip, "limit": limit})
            formulations: List[FormulationResponse] = []
            for record in records:
                mapped = _map_formulation_record(record)
                if mapped:
                    formulations.append(mapped)

            count_query = "MATCH (f:Formulation) RETURN count(f) as total"
            count_result = self._neo4j.execute_query(count_query)
            total_count = count_result[0].get("total", 0) if count_result else 0

            return FormulationListResponse(formulations=formulations, total_count=total_count)

        response = await self._execute_with_retry(operation)
        await self._cache.set(cache_key, response.model_dump())
        return response

    async def get(self, formulation_id: str) -> Optional[FormulationResponse]:
        cache_key = ("get", formulation_id)
        cached = await self._cache.get(cache_key)
        if cached:
            return FormulationResponse.model_validate(cached)

        if not self._neo4j:
            return None

        def operation() -> Optional[FormulationResponse]:
            return _fetch_formulation(self._neo4j, formulation_id)

        result = await self._execute_with_retry(operation)
        if result:
            await self._cache.set(cache_key, result.model_dump())
        return result

    async def update(self, formulation_id: str, payload: FormulationUpdate) -> FormulationResponse:
        if not self._neo4j:
            raise RuntimeError("Neo4j database not connected")

        update_data = payload.model_dump(exclude_unset=True)
        if not update_data:
            raise ValueError("No update fields provided")

        def operation() -> FormulationResponse:
            existing = _fetch_formulation(self._neo4j, formulation_id)
            if not existing:
                raise LookupError(f"Formulation {formulation_id} not found")

            fields = set(update_data.keys())
            updated_name = payload.name if "name" in fields else existing.name
            updated_description = payload.description if "description" in fields else existing.description
            updated_status = payload.status if "status" in fields else existing.status
            updated_at = datetime.now().isoformat()

            self._neo4j.execute_query(
                """
                MATCH (f:Formulation {id: $id})
                SET f.name = $name,
                    f.description = $description,
                    f.status = $status,
                    f.updated_at = $updated_at
                RETURN f
                """,
                {
                    "id": formulation_id,
                    "name": updated_name,
                    "description": updated_description,
                    "status": updated_status,
                    "updated_at": updated_at,
                },
            )

            if "ingredients" in fields:
                ingredients_payload = payload.ingredients or []
                total_percentage = sum(ing.percentage for ing in ingredients_payload)

                if abs(total_percentage - 100.0) > 0.1:
                    raise ValueError(
                        f"Ingredient percentages must sum to 100%. Current total: {total_percentage}%"
                    )

                self._neo4j.execute_query(
                    """
                    MATCH (:Formulation {id: $id})-[rel:CONTAINS]->(:Food)
                    DELETE rel
                    """,
                    {"id": formulation_id},
                )

                total_cost_reference = 0.0
                for ing in ingredients_payload:
                    quantity_kg, cost_reference = _compute_cost_fields(ing.percentage, ing.cost_per_kg)
                    total_cost_reference += cost_reference
                    self._neo4j.execute_query(
                        """
                        MATCH (f:Formulation {id: $form_id})
                        MERGE (i:Food {name: $name})
                        CREATE (f)-[:CONTAINS {
                            percentage: $percentage,
                            cost_per_kg: $cost_per_kg,
                            function: $function,
                            quantity_kg: $quantity_kg,
                            cost_reference: $cost_reference
                        }]->(i)
                        """,
                        {
                            "form_id": formulation_id,
                            "name": ing.name,
                            "percentage": ing.percentage,
                            "cost_per_kg": ing.cost_per_kg if ing.cost_per_kg is not None else 0.0,
                            "function": ing.function or "unspecified",
                            "quantity_kg": quantity_kg,
                            "cost_reference": cost_reference,
                        },
                    )

                self._neo4j.execute_query(
                    """
                    MATCH (f:Formulation {id: $id})
                    SET f.cost_per_kg = $cost_per_kg,
                        f.cost_basis_kg = $cost_basis_kg,
                        f.cost_updated_at = datetime()
                    RETURN f
                    """,
                    {
                        "id": formulation_id,
                        "cost_per_kg": total_cost_reference,
                        "cost_basis_kg": 1.0,
                    },
                )

            updated_formulation = _fetch_formulation(self._neo4j, formulation_id)
            if not updated_formulation:
                raise RuntimeError("Formulation update failed to persist")

            return updated_formulation

        response = await self._execute_with_retry(operation)
        await self._cache.invalidate(lambda key: isinstance(key, tuple) and key[0] in {"list", "get"})
        await self._cache.set(("get", response.id), response.model_dump())
        await self._publish("formulation.updated", {"id": response.id})
        return response

    async def delete(self, formulation_id: str) -> None:
        if not self._neo4j:
            raise RuntimeError("Neo4j database not connected")

        def operation() -> None:
            existing = _fetch_formulation(self._neo4j, formulation_id)
            if not existing:
                raise LookupError(f"Formulation {formulation_id} not found")

            self._neo4j.execute_query(
                """
                MATCH (f:Formulation {id: $id})
                DETACH DELETE f
                """,
                {"id": formulation_id},
            )

        await self._execute_with_retry(operation)
        await self._cache.invalidate(lambda key: isinstance(key, tuple) and key[0] in {"list", "get"})
        await self._publish("formulation.deleted", {"id": formulation_id})

    async def _publish(self, event_type: str, payload: Dict[str, Any]) -> None:
        if not self._event_bus:
            return
        await self._event_bus.publish(event_type, payload)

    async def _execute_with_retry(self, operation: Callable[[], T]) -> T:
        attempt = 0
        while True:
            try:
                return operation()
            except Exception as exc:
                attempt += 1
                if attempt >= self._max_retries:
                    raise

                sleep_for = min(self._backoff_seconds * (2 ** (attempt - 1)), self._max_backoff_seconds)
                logger.debug(
                    "Formulation pipeline operation failed, retrying",
                    exc_info=True,
                )
                await asyncio.sleep(sleep_for)


def get_formulation_pipeline(request) -> Optional[FormulationPipelineService]:
    return getattr(request.app.state, "formulation_pipeline", None)


def attach_formulation_pipeline(
    app,
    neo4j_client,
    *,
    cache_ttl: int = 10,
    cache_entries: int = 128,
    retry_attempts: int = 3,
    retry_backoff: float = 0.3,
    retry_max_backoff: float = 2.0,
) -> FormulationPipelineService:
    cache = FormulationPipelineCache(ttl_seconds=cache_ttl, max_entries=cache_entries)
    event_bus = FormulationEventBus()
    pipeline = FormulationPipelineService(
        neo4j_client,
        cache=cache,
        event_bus=event_bus,
        max_retries=retry_attempts,
        backoff_seconds=retry_backoff,
        max_backoff_seconds=retry_max_backoff,
    )
    app.state.formulation_pipeline = pipeline
    app.state.formulation_event_bus = event_bus
    return pipeline


__all__ = [
    "FormulationEvent",
    "FormulationEventBus",
    "FormulationPipelineCache",
    "FormulationPipelineService",
    "attach_formulation_pipeline",
    "get_formulation_pipeline",
]
