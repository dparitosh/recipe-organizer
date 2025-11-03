from fastapi import APIRouter, Request
from datetime import datetime
from app.models.schemas import ServiceHealthResponse
from app.core.config import settings

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
        ollama_model=settings.OLLAMA_MODEL if llm_available else None
    )
