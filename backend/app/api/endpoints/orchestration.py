import logging
from fastapi import APIRouter, HTTPException, Request, status

from app.models.orchestration import OrchestrationPersistRequest, OrchestrationPersistResponse
from app.models.schemas import GraphDataResponse
from app.services import OrchestrationPersistenceService
from app.services.orchestration_mapper import map_orchestration_payload_to_graph_write_set

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/runs", response_model=OrchestrationPersistResponse, status_code=status.HTTP_201_CREATED)
async def persist_orchestration_run(payload: OrchestrationPersistRequest, request: Request) -> OrchestrationPersistResponse:
    neo4j_client = getattr(request.app.state, "neo4j_client", None)
    if neo4j_client is None or neo4j_client.driver is None:
        logger.warning("Orchestration persistence requested but Neo4j client is unavailable")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Neo4j client not available")

    write_set = map_orchestration_payload_to_graph_write_set(payload)
    service = OrchestrationPersistenceService(neo4j_client)

    try:
        summary = service.persist_run(write_set)
    except Exception as exc:  # pragma: no cover - surface driver errors
        logger.error("Failed to persist orchestration run %s: %s", write_set.run.get("runId"), exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to write orchestration run") from exc

    return OrchestrationPersistResponse(
        runId=summary.run_id,
        nodesCreated=summary.nodes_created,
        relationshipsCreated=summary.relationships_created,
        propertiesSet=summary.properties_set,
    )


@router.get("/runs/{run_id}/graph", response_model=GraphDataResponse)
async def get_run_graph(run_id: str, request: Request) -> GraphDataResponse:
    neo4j_client = getattr(request.app.state, "neo4j_client", None)
    if neo4j_client is None or neo4j_client.driver is None:
        logger.warning("Run graph requested but Neo4j client unavailable")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Neo4j client not available")

    run_exists = neo4j_client.execute_query(
        """
        MATCH (run:OrchestrationRun { runId: $runId })
        RETURN run LIMIT 1
        """,
        {"runId": run_id},
    )

    if not run_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orchestration run not found")

    node_records = neo4j_client.execute_query(
        """
        MATCH (run:OrchestrationRun { runId: $runId })-[:GENERATED_ENTITY]->(node:GraphEntity)
        RETURN DISTINCT node.id AS nodeId,
                        coalesce(node.type, head(labels(node))) AS nodeType,
                        coalesce(node.name, node.label, node.id) AS nodeName,
                        labels(node) AS labels,
                        properties(node) AS props
        """,
        {"runId": run_id},
    )

    nodes = []
    for record in node_records:
        node_id = record.get("nodeId")
        if not node_id:
            continue
        nodes.append(
            {
                "id": node_id,
                "type": record.get("nodeType"),
                "name": record.get("nodeName"),
                "labels": record.get("labels") or [],
                "properties": record.get("props") or {},
            }
        )

    edge_records = neo4j_client.execute_query(
        """
        MATCH (source:GraphEntity)-[rel]->(target:GraphEntity)
        WHERE $runId IN rel.generatedRunIds
        RETURN DISTINCT rel.edgeId AS edgeId,
                        type(rel) AS relType,
                        source.id AS sourceId,
                        target.id AS targetId,
                        properties(rel) AS props
        """,
        {"runId": run_id},
    )

    edges = []
    for record in edge_records:
        source_id = record.get("sourceId")
        target_id = record.get("targetId")
        if not source_id or not target_id:
            continue
        edges.append(
            {
                "id": record.get("edgeId") or f"edge::{source_id}::{target_id}::{record.get('relType', 'RELATED_TO')}",
                "type": record.get("relType"),
                "source": source_id,
                "target": target_id,
                "properties": record.get("props") or {},
            }
        )

    return GraphDataResponse(
        nodes=nodes,
        edges=edges,
        node_count=len(nodes),
        edge_count=len(edges),
    )
