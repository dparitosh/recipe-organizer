from fastapi import APIRouter
from .endpoints import (
	health,
	ai,
	formulations,
	calculations,
	graph,
	sample_data,
	fdc,
	env,
)

router = APIRouter()

router.include_router(health.router, prefix="/health", tags=["Health"])
router.include_router(ai.router, prefix="/ai", tags=["AI Assistant"])
router.include_router(formulations.router, prefix="/formulations", tags=["Formulations"])
router.include_router(calculations.router, prefix="/calculations", tags=["Calculations"])
router.include_router(graph.router, prefix="/graph", tags=["Graph"])
router.include_router(sample_data.router, prefix="/sample-data", tags=["Sample Data"])
router.include_router(fdc.router, prefix="/fdc", tags=["FDC"])
router.include_router(env.router, prefix="/env", tags=["Environment"])
