import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from neo4j.exceptions import AuthError, Neo4jError, ServiceUnavailable

from app.core.config import settings
from app.core.rate_limit import limiter
from app.models.schemas import (
    GraphDataResponse,
    GraphSchemaResetRequest,
    GraphSchemaResponse,
    GraphSchemaUpsertRequest,
    GraphSearchRequest,
    GraphSearchResponse,
)
from app.services.graph_search_service import GraphSearchService

router = APIRouter()
logger = logging.getLogger(__name__)

NEO4J_UNAVAILABLE_EXCEPTIONS = (Neo4jError, ServiceUnavailable, AuthError)

@router.get("/data", response_model=GraphDataResponse, summary="Get Graph Data")
@limiter.limit(settings.RATE_LIMIT_GRAPH_READ)
async def get_graph_data(
    request: Request,
    limit: Annotated[int, Query(ge=1, le=500, description="Maximum number of node rows to fetch")] = 100,
):
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
    
    except NEO4J_UNAVAILABLE_EXCEPTIONS as exc:
        logger.warning("Neo4j unavailable while fetching graph data", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neo4j database unavailable",
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.get("/schema", response_model=GraphSchemaResponse, summary="Get graph schema metadata")
@limiter.limit(settings.RATE_LIMIT_GRAPH_READ)
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
    except NEO4J_UNAVAILABLE_EXCEPTIONS as exc:  # pragma: no cover - defensive logging
        logger.warning("Neo4j unavailable while persisting graph schema", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neo4j database unavailable",
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except OSError as exc:  # pragma: no cover - defensive logging
        logger.error("Failed to persist graph schema due to system error", exc_info=True)
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
    except NEO4J_UNAVAILABLE_EXCEPTIONS as exc:  # pragma: no cover - defensive logging
        logger.warning("Neo4j unavailable while installing graph schema", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neo4j database unavailable",
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except OSError as exc:  # pragma: no cover - defensive logging
        logger.error("Failed to install default graph schema due to system error", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to install default graph schema",
        ) from exc

    return GraphSchemaResponse(**schema_payload)


@router.post(
    "/schema/reset",
    response_model=GraphSchemaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Reset graph data and reinstall default schema",
)
async def reset_graph_schema(payload: GraphSchemaResetRequest, request: Request):
    service = getattr(request.app.state, "graph_schema_service", None)

    if not service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Graph schema service unavailable",
        )

    try:
        schema_payload = await run_in_threadpool(
            service.reset_and_install_default_schema,
            drop_data=payload.drop_data,
            drop_constraints=payload.drop_constraints,
            drop_indexes=payload.drop_indexes,
            drop_vector_indexes=payload.drop_vector_indexes,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return GraphSchemaResponse(**schema_payload)


@router.get(
    "/schema/export/graphml",
    summary="Export graph schema as GraphML",
    response_class=Response,
)
@limiter.limit(settings.RATE_LIMIT_GRAPH_READ)
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
@limiter.limit(settings.RATE_LIMIT_GRAPH_READ)
async def export_graph_schema_svg(request: Request):
    service = getattr(request.app.state, "graph_schema_service", None)

    if not service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Graph schema service unavailable",
        )

    svg = await run_in_threadpool(service.export_schema_svg)
    return Response(content=svg, media_type="image/svg+xml")


@router.post(
    "/search",
    response_model=GraphSearchResponse,
    summary="Search graph data by keyword, orchestration run, or GraphRAG",
)
async def search_graph(payload: GraphSearchRequest, request: Request):
    neo4j_client = getattr(request.app.state, "neo4j_client", None)
    if neo4j_client is None or neo4j_client.driver is None:
        logger.warning("Graph search requested but Neo4j client unavailable")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Neo4j client not available")

    graphrag_service = getattr(request.app.state, "graphrag_retrieval_service", None)
    search_service = GraphSearchService(neo4j_client, graphrag_service)

    try:
        result = search_service.search(
            payload.query,
            mode=payload.mode,
            limit=payload.limit,
            include_related=payload.include_related,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return GraphSearchResponse(**result)
