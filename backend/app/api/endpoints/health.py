from datetime import datetime

from fastapi import APIRouter, Request
from neo4j import GraphDatabase
from neo4j.exceptions import Neo4jError

from app.core.config import settings
from app.models.schemas import (
    Neo4jConnectionTest,
    Neo4jConnectionTestResponse,
    ServiceHealthResponse,
)

router = APIRouter()

@router.get("", response_model=ServiceHealthResponse, summary="Service Health Check")
async def check_service_health(request: Request):
    """
    Check the health status of all services (OLLAMA AI, Neo4j database).
    Returns availability status for each service and overall system health.
    """
    start_time = datetime.now()
    
    llm_available = False
    neo4j_available = False
    genai_available = False
    
    if hasattr(request.app.state, 'ollama_service') and request.app.state.ollama_service:
        try:
            llm_available = await request.app.state.ollama_service.check_health()
        except:
            pass
    
    if hasattr(request.app.state, 'neo4j_client') and request.app.state.neo4j_client:
        try:
            neo4j_available = request.app.state.neo4j_client.check_health()
        except:
            pass
    
    genai_available = llm_available and neo4j_available
    
    execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
    
    if llm_available and neo4j_available:
        status = "healthy"
    elif llm_available or neo4j_available:
        status = "degraded"
    else:
        status = "unavailable"
    
    return ServiceHealthResponse(
        status=status,
        llm_available=llm_available,
        neo4j_available=neo4j_available,
        genai_available=genai_available,
        response_time_ms=execution_time,
        ollama_model=settings.OLLAMA_MODEL if llm_available else None,
    )


@router.post("/neo4j", response_model=Neo4jConnectionTestResponse, summary="Test Neo4j connection")
async def test_neo4j_connection(payload: Neo4jConnectionTest) -> Neo4jConnectionTestResponse:
    """Attempt a one-off Neo4j connection using the supplied credentials."""

    driver = None
    try:
        driver = GraphDatabase.driver(payload.uri, auth=(payload.username, payload.password))
        driver.verify_connectivity()

        server_version = None
        try:
            with driver.session(database=payload.database) as session:
                record = session.run(
                    "CALL dbms.components() YIELD versions RETURN versions[0] AS version LIMIT 1"
                ).single()
                if record:
                    server_version = record.get("version")
        except Neo4jError:
            # Best effort – version info is optional and not worth failing the test over.
            server_version = None

        return Neo4jConnectionTestResponse(
            success=True,
            message="Neo4j connection successful.",
            server_version=server_version,
        )
    except Exception as exc:  # pragma: no cover - network/auth errors vary
        return Neo4jConnectionTestResponse(success=False, message=str(exc))
    finally:
        if driver is not None:
            driver.close()
