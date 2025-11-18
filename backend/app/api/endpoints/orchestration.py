import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request, Query, status
from neo4j import exceptions as neo4j_exceptions

from app.models.orchestration import (
    OrchestrationPersistRequest, 
    OrchestrationPersistResponse,
    OrchestrationRunSummary,
    OrchestrationRunDetail,
    AgentInvocationDetail
)
from app.models.schemas import GraphDataResponse
from app.services import OrchestrationPersistenceService
from app.services.orchestration_mapper import map_orchestration_payload_to_graph_write_set
from app.services.graph_search_service import GraphSearchService

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
    except (neo4j_exceptions.Neo4jError, RuntimeError, ValueError) as exc:  # pragma: no cover - surface driver errors
        logger.error("Failed to persist orchestration run %s", write_set.run.get("runId"), exc_info=True)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to write orchestration run") from exc

    return OrchestrationPersistResponse(
        runId=summary.run_id,
        nodesCreated=summary.nodes_created,
        relationshipsCreated=summary.relationships_created,
        propertiesSet=summary.properties_set,
    )


@router.get("/runs", response_model=List[OrchestrationRunSummary])
async def list_orchestration_runs(
    request: Request,
    limit: int = Query(50, ge=1, le=100, description="Max runs to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    status: Optional[str] = Query(None, regex="^(success|partial|failed)$", description="Filter by status"),
    start_date: Optional[str] = Query(None, description="ISO8601 start date"),
    end_date: Optional[str] = Query(None, description="ISO8601 end date")
) -> List[OrchestrationRunSummary]:
    """
    List orchestration runs with filtering and pagination.
    
    - **limit**: Max runs to return (1-100, default 50)
    - **offset**: Pagination offset (default 0)
    - **status**: Filter by status (success|partial|failed)
    - **start_date**: ISO8601 timestamp (e.g., 2025-11-17T00:00:00Z)
    - **end_date**: ISO8601 timestamp
    """
    neo4j_client = getattr(request.app.state, "neo4j_client", None)
    if neo4j_client is None or neo4j_client.driver is None:
        logger.warning("List runs requested but Neo4j client unavailable")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Neo4j client not available")
    
    # Build filter conditions
    status_filter = "AND run.status = $status" if status else ""
    date_filter = ""
    if start_date:
        date_filter += "AND run.timestamp >= $start_date "
    if end_date:
        date_filter += "AND run.timestamp <= $end_date "
    
    query = f"""
    MATCH (run:OrchestrationRun)
    WHERE 1=1
      {status_filter}
      {date_filter}
    OPTIONAL MATCH (run)-[:USED_RECIPE]->(recipe:RecipeVersion)
    OPTIONAL MATCH (run)-[:HAS_AGENT_INVOCATION]->(agent:AgentInvocation)
    WITH run, recipe, 
         count(DISTINCT agent) as agentCount,
         sum(CASE WHEN agent.status = 'success' THEN 1 ELSE 0 END) as successCount
    RETURN run.runId as runId,
           run.status as status,
           run.timestamp as timestamp,
           run.totalDuration as totalDuration,
           recipe.name as recipeName,
           agentCount,
           successCount
    ORDER BY run.timestamp DESC
    SKIP $offset
    LIMIT $limit
    """
    
    params = {"offset": offset, "limit": limit}
    if status:
        params["status"] = status
    if start_date:
        params["start_date"] = start_date
    if end_date:
        params["end_date"] = end_date
    
    try:
        results = neo4j_client.execute_query(query, params)
        
        return [
            OrchestrationRunSummary(
                runId=row["runId"],
                status=row["status"],
                timestamp=row["timestamp"],
                totalDuration=row.get("totalDuration"),
                recipeName=row.get("recipeName"),
                agentCount=row.get("agentCount", 0),
                successCount=row.get("successCount", 0)
            )
            for row in results
        ]
    except neo4j_exceptions.Neo4jError as exc:
        logger.error("Failed to list orchestration runs", exc_info=True)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to query orchestration runs") from exc


@router.get("/runs/{run_id}", response_model=OrchestrationRunDetail)
async def get_orchestration_run(run_id: str, request: Request) -> OrchestrationRunDetail:
    """Get complete details of a specific orchestration run."""
    neo4j_client = getattr(request.app.state, "neo4j_client", None)
    if neo4j_client is None or neo4j_client.driver is None:
        logger.warning("Run details requested but Neo4j client unavailable")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Neo4j client not available")
    
    query = """
    MATCH (run:OrchestrationRun {runId: $run_id})
    OPTIONAL MATCH (run)-[:USED_RECIPE]->(recipe:RecipeVersion)
    OPTIONAL MATCH (run)-[:PRODUCED_CALCULATION]->(calc:CalculationResult)
    OPTIONAL MATCH (run)-[:PRODUCED_GRAPH]->(graph:GraphSnapshot)
    OPTIONAL MATCH (run)-[:PRODUCED_VALIDATION]->(validation:ValidationReport)
    OPTIONAL MATCH (run)-[:PRODUCED_UI]->(ui:UIConfig)
    OPTIONAL MATCH (run)-[:HAS_AGENT_INVOCATION]->(agent:AgentInvocation)
    WITH run, recipe, calc, graph, validation, ui,
         collect(agent) as agents
    RETURN run,
           recipe,
           calc,
           graph,
           validation,
           ui,
           agents
    ORDER BY agents[0].sequence
    """
    
    try:
        results = neo4j_client.execute_query(query, {"run_id": run_id})
        
        if not results:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orchestration run not found")
        
        row = results[0]
        
        # Parse agent invocations
        agent_list = []
        if row.get("agents"):
            for agent in row["agents"]:
                if agent:  # Skip None values
                    agent_list.append(AgentInvocationDetail(
                        sequence=agent.get("sequence", 0),
                        agentName=agent.get("agentName", ""),
                        status=agent.get("status", ""),
                        duration=agent.get("duration"),
                        error=agent.get("error"),
                        inputSnapshot=agent.get("inputSnapshot"),
                        outputSnapshot=agent.get("outputSnapshot")
                    ))
        
        # Sort agents by sequence
        agent_list.sort(key=lambda a: a.sequence)
        
        return OrchestrationRunDetail(
            run=dict(row.get("run", {})),
            recipe=dict(row.get("recipe")) if row.get("recipe") else None,
            calculation=dict(row.get("calc")) if row.get("calc") else None,
            graphSnapshot=dict(row.get("graph")) if row.get("graph") else None,
            validation=dict(row.get("validation")) if row.get("validation") else None,
            uiConfig=dict(row.get("ui")) if row.get("ui") else None,
            agents=agent_list
        )
        
    except HTTPException:
        raise
    except neo4j_exceptions.Neo4jError as exc:
        logger.error("Failed to get orchestration run %s", run_id, exc_info=True)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to query orchestration run") from exc


@router.get("/runs/{run_id}/graph", response_model=GraphDataResponse)
async def get_run_graph(run_id: str, request: Request) -> GraphDataResponse:
    neo4j_client = getattr(request.app.state, "neo4j_client", None)
    if neo4j_client is None or neo4j_client.driver is None:
        logger.warning("Run graph requested but Neo4j client unavailable")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Neo4j client not available")

    search_service = GraphSearchService(neo4j_client)

    try:
        result = search_service.search(run_id, mode="orchestration")
    except LookupError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orchestration run not found")
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return GraphDataResponse(
        nodes=result["nodes"],
        edges=result["edges"],
        node_count=result["node_count"],
        edge_count=result["edge_count"],
    )
