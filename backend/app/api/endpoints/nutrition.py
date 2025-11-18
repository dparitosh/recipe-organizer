"""Nutrition label API endpoints."""

from fastapi import APIRouter, Request, HTTPException, status, Query
from neo4j import exceptions as neo4j_exceptions
from typing import Optional
import logging

from app.services.nutrition_service import NutritionCalculationService
from app.services.nutrition_persistence_service import NutritionPersistenceService

router = APIRouter()
logger = logging.getLogger(__name__)


def get_nutrition_service(request: Request) -> Optional[NutritionCalculationService]:
    """Get nutrition calculation service from app state."""
    neo4j_client = getattr(request.app.state, 'neo4j_client', None)  # type: ignore
    if not neo4j_client:
        return None
    return NutritionCalculationService(neo4j_client)


@router.post("/{formulation_id}/nutrition-label", summary="Generate & Save Nutrition Label")
async def generate_nutrition_label(
    formulation_id: str,
    request: Request,
    serving_size: float = Query(default=100.0, gt=0, description="Serving size amount"),
    serving_size_unit: str = Query(default="g", description="Serving size unit (g, ml, oz, etc)"),
    servings_per_container: Optional[float] = Query(default=None, gt=0, description="Number of servings per container"),
    save_to_neo4j: bool = Query(default=True, description="Save label to Neo4j for history tracking")
):
    """
    Generate FDA-compliant nutrition facts label and optionally save to Neo4j.
    
    Aggregates nutrients from all ingredients weighted by their percentages
    and calculates values per serving size. Saves to Neo4j with auto-incrementing version.
    
    - **formulation_id**: ID of the formulation
    - **serving_size**: Serving size amount (default 100.0)
    - **serving_size_unit**: Unit (g, ml, oz, etc)
    - **servings_per_container**: Optional number of servings
    - **save_to_neo4j**: Save to Neo4j for history (default True)
    
    Returns nutrition facts with:
    - Calories
    - Macronutrients (fat, carbs, protein)
    - Key micronutrients (vitamins, minerals)
    - FDA Daily Value percentages
    - labelId and version (if saved)
    """
    nutrition_service = get_nutrition_service(request)
    if not nutrition_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nutrition service not available (Neo4j not connected)"
        )
    
    try:
        nutrition_facts = await nutrition_service.calculate_nutrition_label(
            formulation_id=formulation_id,
            serving_size=serving_size,
            serving_size_unit=serving_size_unit,
            servings_per_container=servings_per_container
        )
        
        # Convert to dict for JSON response
        response_data = {
            "formulation_id": nutrition_facts.formulation_id,
            "formulation_name": nutrition_facts.formulation_name,
            "serving_size": nutrition_facts.serving_size,
            "serving_size_unit": nutrition_facts.serving_size_unit,
            "servings_per_container": nutrition_facts.servings_per_container,
            "calories": nutrition_facts.calories,
            "nutrients": {
                "total_fat": {
                    "name": nutrition_facts.total_fat.name,
                    "amount": nutrition_facts.total_fat.amount,
                    "unit": nutrition_facts.total_fat.unit,
                    "daily_value_percent": nutrition_facts.total_fat.daily_value_percent
                },
                "saturated_fat": {
                    "name": nutrition_facts.saturated_fat.name,
                    "amount": nutrition_facts.saturated_fat.amount,
                    "unit": nutrition_facts.saturated_fat.unit,
                    "daily_value_percent": nutrition_facts.saturated_fat.daily_value_percent
                },
                "trans_fat": {
                    "name": nutrition_facts.trans_fat.name,
                    "amount": nutrition_facts.trans_fat.amount,
                    "unit": nutrition_facts.trans_fat.unit,
                    "daily_value_percent": nutrition_facts.trans_fat.daily_value_percent
                },
                "cholesterol": {
                    "name": nutrition_facts.cholesterol.name,
                    "amount": nutrition_facts.cholesterol.amount,
                    "unit": nutrition_facts.cholesterol.unit,
                    "daily_value_percent": nutrition_facts.cholesterol.daily_value_percent
                },
                "sodium": {
                    "name": nutrition_facts.sodium.name,
                    "amount": nutrition_facts.sodium.amount,
                    "unit": nutrition_facts.sodium.unit,
                    "daily_value_percent": nutrition_facts.sodium.daily_value_percent
                },
                "total_carbohydrate": {
                    "name": nutrition_facts.total_carbohydrate.name,
                    "amount": nutrition_facts.total_carbohydrate.amount,
                    "unit": nutrition_facts.total_carbohydrate.unit,
                    "daily_value_percent": nutrition_facts.total_carbohydrate.daily_value_percent
                },
                "dietary_fiber": {
                    "name": nutrition_facts.dietary_fiber.name,
                    "amount": nutrition_facts.dietary_fiber.amount,
                    "unit": nutrition_facts.dietary_fiber.unit,
                    "daily_value_percent": nutrition_facts.dietary_fiber.daily_value_percent
                },
                "total_sugars": {
                    "name": nutrition_facts.total_sugars.name,
                    "amount": nutrition_facts.total_sugars.amount,
                    "unit": nutrition_facts.total_sugars.unit,
                    "daily_value_percent": nutrition_facts.total_sugars.daily_value_percent
                },
                "added_sugars": {
                    "name": nutrition_facts.added_sugars.name,
                    "amount": nutrition_facts.added_sugars.amount,
                    "unit": nutrition_facts.added_sugars.unit,
                    "daily_value_percent": nutrition_facts.added_sugars.daily_value_percent
                },
                "protein": {
                    "name": nutrition_facts.protein.name,
                    "amount": nutrition_facts.protein.amount,
                    "unit": nutrition_facts.protein.unit,
                    "daily_value_percent": nutrition_facts.protein.daily_value_percent
                },
                "vitamin_d": {
                    "name": nutrition_facts.vitamin_d.name,
                    "amount": nutrition_facts.vitamin_d.amount,
                    "unit": nutrition_facts.vitamin_d.unit,
                    "daily_value_percent": nutrition_facts.vitamin_d.daily_value_percent
                },
                "calcium": {
                    "name": nutrition_facts.calcium.name,
                    "amount": nutrition_facts.calcium.amount,
                    "unit": nutrition_facts.calcium.unit,
                    "daily_value_percent": nutrition_facts.calcium.daily_value_percent
                },
                "iron": {
                    "name": nutrition_facts.iron.name,
                    "amount": nutrition_facts.iron.amount,
                    "unit": nutrition_facts.iron.unit,
                    "daily_value_percent": nutrition_facts.iron.daily_value_percent
                },
                "potassium": {
                    "name": nutrition_facts.potassium.name,
                    "amount": nutrition_facts.potassium.amount,
                    "unit": nutrition_facts.potassium.unit,
                    "daily_value_percent": nutrition_facts.potassium.daily_value_percent
                }
            },
            "additional_nutrients": [
                {
                    "name": nutrient.name,
                    "amount": nutrient.amount,
                    "unit": nutrient.unit,
                    "daily_value_percent": nutrient.daily_value_percent
                }
                for nutrient in nutrition_facts.additional_nutrients
            ]
        }
        
        # Save to Neo4j if requested
        if save_to_neo4j:
            try:
                neo4j_client = getattr(request.app.state, 'neo4j_client', None)
                if neo4j_client and neo4j_client.driver:
                    persistence = NutritionPersistenceService(neo4j_client)
                    label_id = persistence.save_nutrition_label(
                        formulation_id=formulation_id,
                        nutrition_facts=response_data,
                        generated_by="system"
                    )
                    response_data["labelId"] = label_id
                    response_data["savedToNeo4j"] = True
                    logger.info("Saved nutrition label %s for formulation %s", label_id, formulation_id)
                else:
                    logger.warning("Neo4j not available, label not saved")
                    response_data["savedToNeo4j"] = False
            except (RuntimeError, ValueError, KeyError) as save_exc:
                logger.error("Failed to save nutrition label: %s", save_exc, exc_info=True)
                response_data["savedToNeo4j"] = False
                response_data["saveError"] = str(save_exc)
        else:
            response_data["savedToNeo4j"] = False
        
        return response_data
        
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc)
        ) from exc
    except (neo4j_exceptions.Neo4jError, RuntimeError) as exc:
        logger.error("Failed to generate nutrition label for %s", formulation_id, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate nutrition label"
        ) from exc


@router.get("/{formulation_id}/nutrition-labels", summary="Get Nutrition Label History")
async def get_nutrition_label_history(
    formulation_id: str,
    request: Request,
    limit: int = Query(default=10, ge=1, le=100, description="Maximum number of labels to return")
):
    """
    Get nutrition label history for a formulation.
    
    Returns all saved nutrition labels ordered by version (newest first).
    Each label includes version number, serving size, calories, and nutrients.
    
    - **formulation_id**: ID of the formulation
    - **limit**: Maximum number of labels to return (1-100, default 10)
    
    Returns list of nutrition labels with version history.
    """
    neo4j_client = getattr(request.app.state, 'neo4j_client', None)
    if not neo4j_client or not neo4j_client.driver:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neo4j service not available"
        )
    
    try:
        persistence = NutritionPersistenceService(neo4j_client)
        labels = persistence.get_nutrition_label_history(
            formulation_id=formulation_id,
            limit=limit
        )
        
        return {
            "formulation_id": formulation_id,
            "total_labels": len(labels),
            "labels": labels
        }
        
    except RuntimeError as exc:
        logger.error("Failed to get nutrition label history for %s", formulation_id, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve nutrition label history"
        ) from exc


@router.get("/label/{label_id}", summary="Get Nutrition Label by ID")
async def get_nutrition_label_by_id(
    label_id: str,
    request: Request
):
    """
    Get a specific nutrition label by its ID.
    
    - **label_id**: Unique identifier of the nutrition label
    
    Returns the complete nutrition label data.
    """
    neo4j_client = getattr(request.app.state, 'neo4j_client', None)
    if not neo4j_client or not neo4j_client.driver:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neo4j service not available"
        )
    
    try:
        persistence = NutritionPersistenceService(neo4j_client)
        label = persistence.get_nutrition_label_by_id(label_id)
        
        if not label:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Nutrition label {label_id} not found"
            )
        
        return label
        
    except RuntimeError as exc:
        logger.error("Failed to get nutrition label %s", label_id, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve nutrition label"
        ) from exc
