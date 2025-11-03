from fastapi import APIRouter, Request, HTTPException, status
import logging

from app.models.schemas import GraphDataResponse

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/data", response_model=GraphDataResponse, summary="Get Graph Data")
async def get_graph_data(request: Request, limit: int = 100):
    """
    Retrieve graph data from Neo4j for visualization.
    Returns nodes and relationships for rendering in graph visualization tools.
    """
    
    neo4j_client = request.app.state.neo4j_client
    
    if not neo4j_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neo4j database not connected"
        )
    
    try:
        graph_data = neo4j_client.get_graph_data(limit=limit)
        
        return GraphDataResponse(
            nodes=graph_data.get('nodes', []),
            edges=graph_data.get('edges', []),
            node_count=len(graph_data.get('nodes', [])),
            edge_count=len(graph_data.get('edges', []))
        )
    
    except Exception as e:
        logger.error(f"Failed to fetch graph data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch graph data: {str(e)}"
        )
