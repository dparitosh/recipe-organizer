import logging

from fastapi import APIRouter, Request, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

from app.models.schemas import (
    GraphDataResponse,
    GraphSchemaResponse,
    GraphSchemaUpsertRequest,
)

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


@router.get("/schema", response_model=GraphSchemaResponse, summary="Get graph schema metadata")
async def get_graph_schema(request: Request):
    service = getattr(request.app.state, "graph_schema_service", None)

    if not service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Graph schema service unavailable",
        )

    schema_payload = await run_in_threadpool(service.get_schema)
    return GraphSchemaResponse(**schema_payload)


@router.post(
    "/schema",
    response_model=GraphSchemaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Apply graph schema metadata",
)
async def upsert_graph_schema(payload: GraphSchemaUpsertRequest, request: Request):
    service = getattr(request.app.state, "graph_schema_service", None)

    if not service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Graph schema service unavailable",
        )

    try:
        updated_schema = await run_in_threadpool(
            service.apply_schema,
            payload.model_dump(exclude_none=True),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Failed to persist graph schema: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist graph schema",
        ) from exc

    return GraphSchemaResponse(**updated_schema)


@router.post(
    "/schema/install-default",
    response_model=GraphSchemaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Install default graph schema metadata",
)
async def install_default_graph_schema(request: Request):
    service = getattr(request.app.state, "graph_schema_service", None)

    if not service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Graph schema service unavailable",
        )

    try:
        schema_payload = await run_in_threadpool(service.install_default_schema)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Failed to install default graph schema: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to install default graph schema",
        ) from exc

    return GraphSchemaResponse(**schema_payload)


@router.get(
    "/schema/export/graphml",
    summary="Export graph schema as GraphML",
    response_class=Response,
)
async def export_graph_schema_graphml(request: Request):
    service = getattr(request.app.state, "graph_schema_service", None)

    if not service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Graph schema service unavailable",
        )

    graphml = await run_in_threadpool(service.export_schema_graphml)
    return Response(content=graphml, media_type="application/graphml+xml")


@router.get(
    "/schema/export/svg",
    summary="Export graph schema legend as SVG",
    response_class=Response,
)
async def export_graph_schema_svg(request: Request):
    service = getattr(request.app.state, "graph_schema_service", None)

    if not service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Graph schema service unavailable",
        )

    svg = await run_in_threadpool(service.export_schema_svg)
    return Response(content=svg, media_type="image/svg+xml")
