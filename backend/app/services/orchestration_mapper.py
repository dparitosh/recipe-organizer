from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.models.orchestration import OrchestrationPersistRequest
from .orchestration_types import GraphWriteSet

_MAX_USER_REQUEST_LENGTH = 4000
_CONTEXT_MAX_ITEMS = 8
_CONTEXT_MAX_DEPTH = 2
_CONTEXT_MAX_STRING = 512
_AGENT_HISTORY_LIMIT = 25


def map_orchestration_payload_to_graph_write_set(payload: OrchestrationPersistRequest) -> GraphWriteSet:
    """Translate an orchestration persistence payload into a GraphWriteSet."""

    result = payload.result
    run_id = result.id
    run_timestamp = _coerce_iso(result.timestamp)

    request_id = payload.requestId or f"req-{run_id}"
    request_created_at = _coerce_iso(payload.requestTimestamp) if payload.requestTimestamp else run_timestamp

    run_summary = {
        "runId": run_id,
        "status": result.status,
        "totalDuration": result.totalDuration,
        "timestamp": run_timestamp,
        "configSnapshot": _build_config_snapshot(payload, run_timestamp),
    }

    user_request = {
        "requestId": request_id,
        "payload": _truncate_string(payload.userRequest, _MAX_USER_REQUEST_LENGTH),
        "createdAt": request_created_at,
    }

    recipe_version = _build_recipe_version(result.recipe, run_id, run_timestamp)
    calculation = _build_calculation_snapshot(result.calculation, run_id, run_timestamp)
    graph_snapshot, graph_nodes, graph_edges = _build_graph_snapshot(result.graph, run_id, run_timestamp)
    validation = _build_validation_snapshot(result.validation, run_id, run_timestamp)
    ui_config = _build_ui_snapshot(result.uiConfig, run_id, run_timestamp)
    agent_invocations = _build_agent_invocations(result.agentHistory, run_id)

    return GraphWriteSet(
        run=run_summary,
        user_request=user_request,
        recipe_version=recipe_version,
        calculation=calculation,
        graph_snapshot=graph_snapshot,
        graph_nodes=graph_nodes,
        graph_edges=graph_edges,
        validation=validation,
        ui_config=ui_config,
        agent_invocations=agent_invocations,
    )


def _build_config_snapshot(payload: OrchestrationPersistRequest, fallback_ts: str) -> Dict[str, Any]:
    snapshot: Dict[str, Any] = {
        "version": payload.configVersion,
        "targetBatchSize": payload.targetBatchSize,
        "targetUnit": payload.targetUnit,
        "includeNutrients": payload.includeNutrients,
        "includeCosts": payload.includeCosts,
        "requestTimestamp": payload.requestTimestamp or fallback_ts,
    }

    if payload.context:
        snapshot["contextSummary"] = _summarize_context(payload.context)

    if payload.metadata:
        snapshot["metadata"] = payload.metadata

    return snapshot


def _build_recipe_version(recipe: Dict[str, Any], run_id: str, fallback_ts: str) -> Dict[str, Any]:
    metadata = dict(recipe.get("metadata") or {})
    metadata.setdefault("ingredientsCount", len(recipe.get("ingredients", [])))
    if recipe.get("description"):
        metadata.setdefault("description", recipe.get("description"))

    metadata["checksum"] = _compute_checksum(recipe)

    return {
        "recipeId": recipe.get("id") or f"{run_id}-recipe",
        "version": metadata.get("version", "v1"),
        "name": recipe.get("name", ""),
        "totalPercentage": recipe.get("totalPercentage", 0),
        "metadata": metadata,
        "createdAt": metadata.get("createdAt") or fallback_ts,
    }


def _build_calculation_snapshot(calculation: Dict[str, Any], run_id: str, fallback_ts: str) -> Dict[str, Any]:
    payload = dict(calculation or {})
    payload.setdefault("checksum", _compute_checksum({
        "recipeId": payload.get("recipeId"),
        "targetBatchSize": payload.get("targetBatchSize"),
        "targetUnit": payload.get("targetUnit"),
        "scaledIngredients": payload.get("scaledIngredients", []),
    }))

    return {
        "calculationId": payload.get("calculationId") or f"{run_id}-calculation",
        "payload": payload,
        "createdAt": payload.get("timestamp") or fallback_ts,
    }


def _build_graph_snapshot(graph: Dict[str, Any], run_id: str, fallback_ts: str) -> Tuple[Dict[str, Any], List[Dict[str, Any]], List[Dict[str, Any]]]:
    payload = dict(graph or {})
    nodes = payload.get("nodes", [])
    edges = payload.get("edges", [])

    metadata = dict(payload.get("metadata") or {})
    metadata.setdefault("nodeCount", len(nodes))
    metadata.setdefault("edgeCount", len(edges))
    metadata.setdefault("graphComplexity", payload.get("graphComplexity", metadata.get("graphComplexity")))
    metadata.setdefault("cypherCommandsBytes", len("".join(payload.get("cypherCommands", []))))

    checksum_payload = {
        "nodes": nodes,
        "edges": edges,
        "metadata": metadata,
    }

    blob_uri = payload.get("blobUri")

    snapshot = {
        "graphId": payload.get("graphId") or f"{run_id}-graph",
        "metadata": metadata,
        "checksum": _compute_checksum(checksum_payload),
        "blobUri": blob_uri,
        "createdAt": payload.get("timestamp") or fallback_ts,
    }

    normalized_nodes, normalized_edges = _normalize_graph_entities(nodes, edges)

    return snapshot, normalized_nodes, normalized_edges


def _normalize_graph_entities(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    normalized_nodes: List[Dict[str, Any]] = []
    normalized_edges: List[Dict[str, Any]] = []

    for node in nodes or []:
        node_id = node.get("id") or node.get("nodeId")
        if not node_id:
            continue

        properties = dict(node.get("properties") or {})
        normalized_nodes.append(
            {
                "id": node_id,
                "label": node.get("label") or node.get("name") or properties.get("name"),
                "type": node.get("type") or properties.get("type"),
                "properties": properties,
            }
        )

    for edge in edges or []:
        source = edge.get("source") or edge.get("from")
        target = edge.get("target") or edge.get("to")
        if not source or not target:
            continue

        edge_id = edge.get("edgeId") or edge.get("id") or f"edge::{source}::{target}::{edge.get('type', 'RELATED')}"

        normalized_edges.append(
            {
                "id": edge.get("id") or edge_id,
                "edgeId": edge_id,
                "source": source,
                "target": target,
                "type": edge.get("type") or "RELATED",
                "properties": dict(edge.get("properties") or {}),
            }
        )

    return normalized_nodes, normalized_edges


def _build_validation_snapshot(validation: Dict[str, Any], run_id: str, fallback_ts: str) -> Dict[str, Any]:
    payload = dict(validation or {})
    payload.setdefault("checksum", _compute_checksum(payload))

    return {
        "validationId": payload.get("validationId") or f"{run_id}-validation",
        "payload": payload,
        "createdAt": payload.get("timestamp") or fallback_ts,
        "valid": payload.get("valid", False),
    }


def _build_ui_snapshot(ui_config: Dict[str, Any], run_id: str, fallback_ts: str) -> Dict[str, Any]:
    payload = dict(ui_config or {})
    payload.setdefault("checksum", _compute_checksum(payload))

    return {
        "uiConfigId": payload.get("uiConfigId") or f"{run_id}-ui",
        "payload": payload,
        "createdAt": payload.get("timestamp") or fallback_ts,
    }


def _build_agent_invocations(agent_history: List[Dict[str, Any]], run_id: str) -> List[Dict[str, Any]]:
    invocations: List[Dict[str, Any]] = []

    for idx, entry in enumerate(agent_history or []):
        if idx >= _AGENT_HISTORY_LIMIT:
            break

        timestamp = entry.get("timestamp")
        error_text = entry.get("error")
        truncated_error = None
        if error_text is not None:
            truncated_error = _truncate_string(str(error_text), 512)
        invocations.append({
            "runId": run_id,
            "sequence": idx,
            "agentName": entry.get("agent"),
            "duration": entry.get("duration", 0),
            "status": entry.get("status", "unknown"),
            "error": truncated_error,
            "createdAt": _coerce_iso(timestamp) if timestamp else _utc_now_iso(),
        })

    return invocations


def _summarize_context(context: Dict[str, Any]) -> Dict[str, Any]:
    summary: Dict[str, Any] = {}
    for idx, (key, value) in enumerate(context.items()):
        if idx >= _CONTEXT_MAX_ITEMS:
            break
        summary[key] = _truncate_value(value, depth=0)
    return summary


def _truncate_value(value: Any, depth: int) -> Any:
    if isinstance(value, str):
        return _truncate_string(value, _CONTEXT_MAX_STRING)

    if isinstance(value, (int, float, bool)) or value is None:
        return value

    if isinstance(value, list):
        if depth >= _CONTEXT_MAX_DEPTH:
            return f"<list length={len(value)}>"
        return [_truncate_value(item, depth + 1) for item in value[:5]]

    if isinstance(value, dict):
        if depth >= _CONTEXT_MAX_DEPTH:
            keys = list(value.keys())[:5]
            return {key: "<truncated>" for key in keys}
        nested: Dict[str, Any] = {}
        for idx, (key, nested_value) in enumerate(value.items()):
            if idx >= 5:
                break
            nested[key] = _truncate_value(nested_value, depth + 1)
        return nested

    return str(value)


def _truncate_string(value: str, max_length: int) -> str:
    if len(value) <= max_length:
        return value
    if max_length <= 3:
        return value[:max_length]
    return value[: max_length - 3] + "..."


def _compute_checksum(payload: Any) -> str:
    try:
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    except TypeError:
        serialized = json.dumps(_stringify_unknown(payload), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _stringify_unknown(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _stringify_unknown(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_stringify_unknown(item) for item in value]
    return str(value)


def _coerce_iso(ts: Optional[str]) -> str:
    if not ts:
        return _utc_now_iso()
    try:
        parsed = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except (ValueError, AttributeError):
        return _utc_now_iso()


def _utc_now_iso() -> str:
    now = datetime.utcnow().replace(tzinfo=timezone.utc)
    return now.isoformat(timespec="milliseconds").replace("+00:00", "Z")
