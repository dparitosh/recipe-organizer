from fastapi import APIRouter, Depends

from app.core.security import require_admin_api_key, require_api_key

from .endpoints import (
	health,
	ai,
	formulations,
	calculations,
	graph,
	sample_data,
	fdc,
	env,
	orchestration,
	nutrition,
	schema_migration,
)

router = APIRouter()

router.include_router(health.router, prefix="/health", tags=["Health"])
router.include_router(
	ai.router,
	prefix="/ai",
	tags=["AI Assistant"],
	dependencies=[Depends(require_api_key)],
)
router.include_router(
	formulations.router,
	prefix="/formulations",
	tags=["Formulations"],
	dependencies=[Depends(require_api_key)],
)
router.include_router(
	nutrition.router,
	prefix="/formulations",
	tags=["Nutrition"],
	dependencies=[Depends(require_api_key)],
)
router.include_router(
	calculations.router,
	prefix="/calculations",
	tags=["Calculations"],
	dependencies=[Depends(require_api_key)],
)
router.include_router(
	graph.router,
	prefix="/graph",
	tags=["Graph"],
	dependencies=[Depends(require_api_key)],
)
router.include_router(
	sample_data.router,
	prefix="/sample-data",
	tags=["Sample Data"],
	dependencies=[Depends(require_api_key)],
)
router.include_router(
	fdc.router,
	prefix="/fdc",
	tags=["FDC"],
	dependencies=[Depends(require_api_key)],
)
router.include_router(
	env.router,
	prefix="/env",
	tags=["Environment"],
	dependencies=[Depends(require_admin_api_key)],
)
router.include_router(
	orchestration.router,
	prefix="/orchestration",
	tags=["Orchestration"],
	dependencies=[Depends(require_api_key)],
)
router.include_router(
	schema_migration.router,
	prefix="/schema",
	tags=["Schema Migration"],
	dependencies=[Depends(require_admin_api_key)],
)
