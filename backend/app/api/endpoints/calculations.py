from fastapi import APIRouter, Request, HTTPException, status
from neo4j import exceptions as neo4j_exceptions
from datetime import datetime
import logging

from app.models.schemas import (
    CalculationRequest,
    CalculationResponse,
    ScaledIngredient
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Comprehensive unit conversion table (bidirectional)
UNIT_CONVERSIONS = {
    # Mass conversions to kg
    "kg": 1.0,
    "g": 0.001,
    "mg": 0.000001,
    "lb": 0.45359237,
    "oz": 0.028349523125,
    # Volume conversions to L
    "L": 1.0,
    "ml": 0.001,
    "mL": 0.001,
    "gal": 3.785411784,
    "fl_oz": 0.0295735295625,
}

def convert_to_base_unit(value: float, unit: str) -> float:
    """Convert any supported unit to its base unit (kg or L)."""
    return value * UNIT_CONVERSIONS.get(unit, 1.0)

def normalize_unit(unit: str) -> str:
    """Normalize unit string variations."""
    unit_map = {
        "ml": "ml",
        "mL": "ml",
        "gram": "g",
        "grams": "g",
        "kilogram": "kg",
        "kilograms": "kg",
        "liter": "L",
        "liters": "L",
        "gallon": "gal",
        "gallons": "gal",
    }
    return unit_map.get(unit, unit)

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
        
        # Normalize and convert batch size to base unit
        normalized_unit = normalize_unit(calc_request.unit)
        batch_size_base = convert_to_base_unit(calc_request.batch_size, normalized_unit)
        
        scaled_ingredients = []
        total_cost = 0.0
        warnings = []
        
        for ing in ingredients:
            if not ing.get('name'):
                continue
            
            percentage = ing.get('percentage', 0)
            cost_per_kg = ing.get('cost_per_kg')
            
            scaled_quantity = (percentage / 100.0) * batch_size_base
            
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
    except (neo4j_exceptions.Neo4jError, RuntimeError, ValueError, TypeError) as exc:
        logger.error("Calculation failed", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Calculation failed: {exc}"
        ) from exc
