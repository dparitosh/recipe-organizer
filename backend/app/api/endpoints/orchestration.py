import logging
from fastapi import APIRouter, HTTPException, Request, status

from app.models.orchestration import OrchestrationPersistRequest, OrchestrationPersistResponse
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
