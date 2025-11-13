import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.core.config import settings
from app.core.rate_limit import limiter
from app.models.schemas import (
    FormulationCreate,
    FormulationUpdate,
    FormulationResponse,
    FormulationListResponse,
)
from app.services.formulation_pipeline import (
    FormulationDependencyError,
    FormulationPipelineError,
    get_formulation_pipeline,
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post(
    "",
    response_model=FormulationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Formulation",
)
@limiter.limit(settings.RATE_LIMIT_FORMULATION_WRITE)
async def create_formulation(formulation: FormulationCreate, request: Request):
    """
    Create a new formulation with ingredients.
    Validates that ingredient percentages sum to 100% (with 0.1% tolerance).
    """
    pipeline = get_formulation_pipeline(request)
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Formulation pipeline not initialized"
        )

    try:
        return await pipeline.create(formulation)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except FormulationDependencyError as exc:
        logger.warning("Formulation create blocked by dependency", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Formulation pipeline dependency unavailable",
        ) from exc
    except FormulationPipelineError as exc:
        logger.error("Failed to create formulation", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create formulation",
        ) from exc


@router.get("", response_model=FormulationListResponse, summary="List Formulations")
async def list_formulations(request: Request, limit: int = 50, skip: int = 0):
    """
    List all formulations from Neo4j database.
    Returns empty list if Neo4j is not connected.
    """
    pipeline = get_formulation_pipeline(request)
    if not pipeline:
        return FormulationListResponse(formulations=[], total_count=0)

    try:
        return await pipeline.list(skip=skip, limit=limit)
    except FormulationDependencyError as exc:
        logger.warning("Formulation list blocked by dependency", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Formulation pipeline dependency unavailable",
        ) from exc
    except FormulationPipelineError as exc:
        logger.error("Failed to list formulations", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch formulations",
        ) from exc


@router.get("/{formulation_id}", response_model=FormulationResponse, summary="Get Formulation")
async def get_formulation(formulation_id: str, request: Request):
    """
    Get a specific formulation by ID.
    """
    pipeline = get_formulation_pipeline(request)
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Formulation pipeline not initialized"
        )

    try:
        formulation = await pipeline.get(formulation_id)
    except FormulationDependencyError as exc:
        logger.warning("Formulation fetch blocked by dependency", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Formulation pipeline dependency unavailable",
        ) from exc
    except FormulationPipelineError as exc:
        logger.error("Failed to get formulation", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch formulation",
        ) from exc

    if not formulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Formulation {formulation_id} not found"
        )

    return formulation


@router.put(
    "/{formulation_id}",
    response_model=FormulationResponse,
    summary="Update Formulation",
)
@limiter.limit(settings.RATE_LIMIT_FORMULATION_WRITE)
async def update_formulation(formulation_id: str, update: FormulationUpdate, request: Request):
    """Update formulation metadata and, optionally, ingredient composition."""
    pipeline = get_formulation_pipeline(request)
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Formulation pipeline not initialized"
        )

    try:
        return await pipeline.update(formulation_id, update)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except FormulationDependencyError as exc:
        logger.warning("Formulation update blocked by dependency", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Formulation pipeline dependency unavailable",
        ) from exc
    except FormulationPipelineError as exc:
        logger.error("Failed to update formulation", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update formulation",
        ) from exc


@router.delete(
    "/{formulation_id}",
    summary="Delete Formulation",
)
@limiter.limit(settings.RATE_LIMIT_FORMULATION_WRITE)
async def delete_formulation(formulation_id: str, request: Request):
    """Delete a formulation and its ingredient relationships."""
    pipeline = get_formulation_pipeline(request)
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Formulation pipeline not initialized"
        )

    try:
        await pipeline.delete(formulation_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except FormulationDependencyError as exc:
        logger.warning("Formulation delete blocked by dependency", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Formulation pipeline dependency unavailable",
        ) from exc
    except FormulationPipelineError as exc:
        logger.error("Failed to delete formulation", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete formulation",
        ) from exc

    return {"detail": f"Formulation {formulation_id} deleted"}
