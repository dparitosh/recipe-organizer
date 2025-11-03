from fastapi import APIRouter, Request, HTTPException, status
from datetime import datetime
import logging

from app.models.schemas import (
    CalculationRequest,
    CalculationResponse,
    ScaledIngredient
)

router = APIRouter()
logger = logging.getLogger(__name__)

UNIT_CONVERSIONS = {
    "kg": 1.0,
    "g": 0.001,
    "L": 1.0,
    "mL": 0.001,
    "gal": 3.78541
}

@router.post("/scale", response_model=CalculationResponse, summary="Scale Formulation")
async def calculate_scale(calc_request: CalculationRequest, request: Request):
    """
    Scale a formulation to a target batch size.
    Converts units, calculates ingredient quantities, and computes costs.
    """
    
    neo4j_client = request.app.state.neo4j_client
    
    if not neo4j_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neo4j database not connected"
        )
    
    try:
        query = """
        MATCH (f:Formulation {id: $id})
        OPTIONAL MATCH (f)-[c:CONTAINS]->(i:Food)
        RETURN f.name as name, collect({
            name: i.name,
            percentage: c.percentage,
            cost_per_kg: c.cost_per_kg
        }) as ingredients
        """
        
        records = neo4j_client.execute_query(query, {"id": calc_request.formulation_id})
        
        if not records:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Formulation {calc_request.formulation_id} not found"
            )
        
        record = records[0]
        formulation_name = record.get('name', 'Unknown')
        ingredients = record.get('ingredients', [])
        
        batch_size_kg = calc_request.batch_size * UNIT_CONVERSIONS.get(calc_request.unit, 1.0)
        
        scaled_ingredients = []
        total_cost = 0.0
        warnings = []
        
        for ing in ingredients:
            if not ing.get('name'):
                continue
            
            percentage = ing.get('percentage', 0)
            cost_per_kg = ing.get('cost_per_kg')
            
            scaled_quantity = (percentage / 100.0) * batch_size_kg
            
            ingredient_cost = None
            if cost_per_kg and calc_request.include_costs:
                ingredient_cost = scaled_quantity * cost_per_kg
                total_cost += ingredient_cost
            elif calc_request.include_costs and not cost_per_kg:
                warnings.append(f"Missing cost data for ingredient: {ing.get('name')}")
            
            scaled_ingredients.append(
                ScaledIngredient(
                    name=ing.get('name'),
                    original_percentage=percentage,
                    scaled_quantity=scaled_quantity,
                    unit=calc_request.unit,
                    cost=ingredient_cost
                )
            )
        
        cost_per_unit = total_cost / calc_request.batch_size if calc_request.batch_size > 0 else 0.0
        
        yield_percentage = 95.0
        
        if not scaled_ingredients:
            warnings.append("No ingredients found in formulation")
        
        return CalculationResponse(
            formulation_id=calc_request.formulation_id,
            formulation_name=formulation_name,
            batch_size=calc_request.batch_size,
            unit=calc_request.unit,
            scaled_ingredients=scaled_ingredients,
            total_cost=total_cost if calc_request.include_costs else None,
            cost_per_unit=cost_per_unit if calc_request.include_costs else None,
            yield_percentage=yield_percentage,
            warnings=warnings
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Calculation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Calculation failed: {str(e)}"
        )
