"""Manufacturing operations endpoints - ISA-88 data from Neo4j."""

import logging
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Request, status

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/unit-operations", summary="Get all unit operations from Neo4j")
async def get_unit_operations(request: Request) -> Dict[str, Any]:
    """Retrieve all UnitOperation nodes from Neo4j graph."""
    neo4j_client = getattr(request.app.state, "neo4j_client", None)
    
    if neo4j_client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neo4j database not connected"
        )
    
    try:
        query = """
        MATCH (op:UnitOperation)
        RETURN op {
            .operation_id,
            .operation_type,
            .equipment_type,
            .typical_time_min,
            .typical_temperature_c,
            .cost_per_hour,
            .parameters,
            .equipment_types
        } as operation
        ORDER BY op.operation_type
        """
        
        result = neo4j_client.execute_read(query)
        operations = {}
        
        for record in result:
            op_data = record["operation"]
            op_key = op_data.get("operation_type", "unknown")
            operations[op_key] = op_data
        
        return operations
    except Exception as exc:
        logger.exception("Failed to fetch unit operations from Neo4j")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve unit operations: {str(exc)}"
        ) from exc


@router.get("/equipment", summary="Get all equipment from Neo4j")
async def get_equipment(request: Request) -> Dict[str, Any]:
    """Retrieve all Equipment nodes from Neo4j graph."""
    neo4j_client = getattr(request.app.state, "neo4j_client", None)
    
    if neo4j_client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neo4j database not connected"
        )
    
    try:
        query = """
        MATCH (eq:Equipment)
        RETURN eq {
            .equipment_id,
            .equipment_type,
            .batch_size_category,
            .min_batch_size_l,
            .max_batch_size_l,
            .cost_per_batch
        } as equipment
        ORDER BY eq.equipment_type
        """
        
        result = neo4j_client.execute_read(query)
        equipment_list = [record["equipment"] for record in result]
        
        return {"equipment": equipment_list}
    except Exception as exc:
        logger.exception("Failed to fetch equipment from Neo4j")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve equipment: {str(exc)}"
        ) from exc


@router.get("/material-grades", summary="Get all material grades from Neo4j")
async def get_material_grades(request: Request) -> Dict[str, Any]:
    """Retrieve all MaterialGrade nodes from Neo4j graph."""
    neo4j_client = getattr(request.app.state, "neo4j_client", None)
    
    if neo4j_client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neo4j database not connected"
        )
    
    try:
        query = """
        MATCH (mg:MaterialGrade)
        RETURN mg {
            .grade_id,
            .name,
            .certifications,
            .cost_multiplier,
            .description
        } as grade
        ORDER BY mg.grade_id
        """
        
        result = neo4j_client.execute_read(query)
        grades = {}
        
        for record in result:
            grade_data = record["grade"]
            grade_key = grade_data.get("grade_id", "unknown")
            grades[grade_key] = grade_data
        
        return grades
    except Exception as exc:
        logger.exception("Failed to fetch material grades from Neo4j")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve material grades: {str(exc)}"
        ) from exc


@router.get("/all", summary="Get all ISA-88 manufacturing data")
async def get_all_manufacturing_data(request: Request) -> Dict[str, Any]:
    """Retrieve all ISA-88 manufacturing data in one call."""
    unit_ops = await get_unit_operations(request)
    equipment = await get_equipment(request)
    grades = await get_material_grades(request)
    
    return {
        "unit_operations": unit_ops,
        "equipment": equipment.get("equipment", []),
        "material_grades": grades
    }
