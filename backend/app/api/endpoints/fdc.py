import logging
import time
from typing import List, TYPE_CHECKING

from fastapi import APIRouter, HTTPException, Request, status

from app.core.config import settings
from app.models.schemas import (
    FDCDetailsRequest,
    FDCIngestFailure,
    FDCIngestRequest,
    FDCIngestResponse,
    FDCIngestSummary,
    FDCQuickIngestRequest,
    FDCSearchRequest,
)
from app.services.fdc_service import FDCService, FDCServiceError

if TYPE_CHECKING:  # pragma: no cover
    from app.db.neo4j_client import Neo4jClient

router = APIRouter()
logger = logging.getLogger(__name__)


def _resolve_api_key(api_key: str | None) -> str:
    resolved = api_key or settings.FDC_DEFAULT_API_KEY
    if not resolved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="FDC API key is required. Configure it in settings and retry.",
        )
    return resolved


def _get_services(request: Request) -> tuple[FDCService, "Neo4jClient"]:
    fdc_service: FDCService | None = getattr(request.app.state, "fdc_service", None)
    neo4j_client = getattr(request.app.state, "neo4j_client", None)

    if fdc_service is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="FDC service unavailable")

    if neo4j_client is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Neo4j database not connected")

    return fdc_service, neo4j_client


@router.post("/search", summary="Search foods from USDA FDC")
async def search_foods(payload: FDCSearchRequest, request: Request) -> dict:
    api_key = _resolve_api_key(payload.api_key)
    fdc_service = getattr(request.app.state, "fdc_service", None)

    if fdc_service is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="FDC service unavailable")

    try:
        data = await fdc_service.search_foods(
            api_key,
            query=payload.query,
            page_size=payload.page_size,
            page_number=payload.page_number,
            data_types=payload.data_types,
            sort_by=payload.sort_by,
            sort_order=payload.sort_order,
        )

        return {
            "foods": data.get("foods", []),
            "total_hits": data.get("totalHits"),
            "current_page": data.get("currentPage"),
            "total_pages": data.get("totalPages"),
        }
    except FDCServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)


@router.post("/foods/{fdc_id}/details", summary="Get FDC food details")
async def get_food_details(fdc_id: int, payload: FDCDetailsRequest, request: Request) -> dict:
    api_key = _resolve_api_key(payload.api_key)
    fdc_service = getattr(request.app.state, "fdc_service", None)

    if fdc_service is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="FDC service unavailable")

    try:
        return await fdc_service.get_food_details(api_key, fdc_id)
    except FDCServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)


@router.post("/ingest", response_model=FDCIngestResponse, summary="Ingest FDC foods into Neo4j")
async def ingest_foods(payload: FDCIngestRequest, request: Request) -> FDCIngestResponse:
    if not payload.fdc_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide at least one FDC ID to ingest")

    api_key = _resolve_api_key(payload.api_key)
    fdc_service, neo4j_client = _get_services(request)

    return await _perform_ingestion(api_key, payload.fdc_ids, fdc_service, neo4j_client)


@router.post("/quick-ingest", response_model=FDCIngestResponse, summary="Search and ingest foods from a term")
async def quick_ingest(payload: FDCQuickIngestRequest, request: Request) -> FDCIngestResponse:
    api_key = _resolve_api_key(payload.api_key)
    fdc_service, neo4j_client = _get_services(request)

    try:
        search_result = await fdc_service.search_foods(
            api_key,
            query=payload.search_term,
            page_size=payload.count,
            data_types=payload.data_types,
        )
    except FDCServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)

    foods = search_result.get("foods", []) or []
    fdc_ids: List[int] = [item.get("fdcId") for item in foods if isinstance(item.get("fdcId"), int)]

    if not fdc_ids:
        return FDCIngestResponse(
            success_count=0,
            failure_count=0,
            failures=[],
            summary=FDCIngestSummary(
                foods_processed=0,
                foods_ingested=0,
                nutrients_linked=0,
                categories_linked=0,
                neo4j_nodes_created=0,
                neo4j_relationships_created=0,
                neo4j_properties_set=0,
            ),
            duration_ms=0,
        )

    return await _perform_ingestion(api_key, fdc_ids, fdc_service, neo4j_client)


async def _perform_ingestion(
    api_key: str,
    fdc_ids: List[int],
    fdc_service: FDCService,
    neo4j_client: "Neo4jClient",
) -> FDCIngestResponse:
    start_time = time.perf_counter()
    failures: List[FDCIngestFailure] = []
    success_count = 0

    nodes_created = 0
    relationships_created = 0
    properties_set = 0
    nutrients_linked = 0

    fdc_service.ensure_schema(neo4j_client)

    for fdc_id in fdc_ids:
        try:
            food_data = await fdc_service.get_food_details(api_key, fdc_id)
            ingest_stats = fdc_service.ingest_food(neo4j_client, food_data)

            success_count += 1
            nodes_created += ingest_stats.get("nodes_created", 0)
            relationships_created += ingest_stats.get("relationships_created", 0)
            properties_set += ingest_stats.get("properties_set", 0)
            nutrients_linked += ingest_stats.get("nutrients_linked", 0)

            logger.info("Ingested FDC food %s", fdc_id)
        except FDCServiceError as exc:
            failures.append(FDCIngestFailure(fdc_id=fdc_id, message=exc.detail))
            logger.warning("FDC API error for %s: %s", fdc_id, exc.detail)
        except Exception as exc:  # pragma: no cover - defensive logging
            message = str(exc)
            failures.append(FDCIngestFailure(fdc_id=fdc_id, message=message))
            logger.exception("Failed to ingest FDC food %s", fdc_id)

    duration_ms = int((time.perf_counter() - start_time) * 1000)

    summary = FDCIngestSummary(
        foods_processed=len(fdc_ids),
        foods_ingested=success_count,
        nutrients_linked=nutrients_linked,
        categories_linked=success_count,
        neo4j_nodes_created=nodes_created,
        neo4j_relationships_created=relationships_created,
        neo4j_properties_set=properties_set,
    )

    return FDCIngestResponse(
        success_count=success_count,
        failure_count=len(failures),
        failures=failures,
        summary=summary,
        duration_ms=duration_ms,
    )
