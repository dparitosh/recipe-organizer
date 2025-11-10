from fastapi import APIRouter, Request, HTTPException, status
from datetime import datetime
from typing import Any, Dict, Optional
import logging

from app.models.schemas import (
    FormulationCreate,
    FormulationUpdate,
    FormulationResponse,
    FormulationListResponse
)

router = APIRouter()
logger = logging.getLogger(__name__)

_SINGLE_FORMULATION_QUERY = """
MATCH (f:Formulation {id: $id})
OPTIONAL MATCH (f)-[c:CONTAINS]->(i:Food)
RETURN f, collect({
    name: i.name,
    percentage: coalesce(c['percentage'], 0.0),
    cost_per_kg: coalesce(c['cost_per_kg'], 0.0),
    function: coalesce(c['function'], i['function'], 'unspecified')
}) as ingredients
"""

def _map_formulation_record(record: Dict[str, Any]) -> Optional[FormulationResponse]:
    form_node = record.get("f")
    if not form_node:
        return None

    try:
        form_props = dict(form_node)
    except TypeError:
        form_props = form_node if isinstance(form_node, dict) else {}

    raw_ingredients = record.get("ingredients") or []
    ingredients = [ing for ing in raw_ingredients if isinstance(ing, dict) and ing.get("name")]
    total_percentage = sum(ing.get("percentage", 0.0) for ing in ingredients)

    return FormulationResponse(
        id=form_props.get("id", ""),
        name=form_props.get("name", ""),
        description=form_props.get("description"),
        status=form_props.get("status", "draft"),
        ingredients=ingredients,
        total_percentage=total_percentage,
        created_at=form_props.get("created_at", ""),
        updated_at=form_props.get("updated_at")
    )

def _fetch_formulation(neo4j_client, formulation_id: str) -> Optional[FormulationResponse]:
    records = neo4j_client.execute_query(_SINGLE_FORMULATION_QUERY, {"id": formulation_id})
    if not records:
        return None
    return _map_formulation_record(records[0])

@router.post("", response_model=FormulationResponse, status_code=status.HTTP_201_CREATED, summary="Create Formulation")
async def create_formulation(formulation: FormulationCreate, request: Request):
    """
    Create a new formulation with ingredients.
    Validates that ingredient percentages sum to 100% (with 0.1% tolerance).
    """
    
    total_percentage = sum(ing.percentage for ing in formulation.ingredients)
    
    if abs(total_percentage - 100.0) > 0.1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ingredient percentages must sum to 100%. Current total: {total_percentage}%"
        )
    
    formulation_id = f"form_{int(datetime.now().timestamp() * 1000)}"
    created_at = datetime.now().isoformat()
    
    neo4j_client = request.app.state.neo4j_client
    
    if neo4j_client:
        try:
            query = """
            CREATE (f:Formulation {
                id: $id,
                name: $name,
                description: $description,
                status: $status,
                created_at: $created_at
            })
            RETURN f
            """
            
            params = {
                "id": formulation_id,
                "name": formulation.name,
                "description": formulation.description,
                "status": formulation.status,
                "created_at": created_at
            }
            
            neo4j_client.execute_query(query, params)
            
            for ing in formulation.ingredients:
                ing_query = """
                MATCH (f:Formulation {id: $form_id})
                MERGE (i:Food {name: $name})
                CREATE (f)-[:CONTAINS {
                    percentage: $percentage,
                    cost_per_kg: $cost_per_kg,
                    function: $function
                }]->(i)
                """
                
                ing_params = {
                    "form_id": formulation_id,
                    "name": ing.name,
                    "percentage": ing.percentage,
                    "cost_per_kg": ing.cost_per_kg if ing.cost_per_kg is not None else 0.0,
                    "function": ing.function or "unspecified"
                }
                
                neo4j_client.execute_query(ing_query, ing_params)
            
            logger.info(f"Created formulation {formulation_id} in Neo4j")
        
        except Exception as e:
            logger.error(f"Failed to create formulation in Neo4j: {e}")
    
    return FormulationResponse(
        id=formulation_id,
        name=formulation.name,
        description=formulation.description,
        status=formulation.status,
        ingredients=[ing.model_dump() for ing in formulation.ingredients],
        total_percentage=total_percentage,
        created_at=created_at
    )


@router.get("", response_model=FormulationListResponse, summary="List Formulations")
async def list_formulations(request: Request, limit: int = 50, skip: int = 0):
    """
    List all formulations from Neo4j database.
    Returns empty list if Neo4j is not connected.
    """
    
    neo4j_client = request.app.state.neo4j_client
    
    if not neo4j_client:
        return FormulationListResponse(
            formulations=[],
            total_count=0
        )
    
    try:
        query = """
        MATCH (f:Formulation)
        OPTIONAL MATCH (f)-[c:CONTAINS]->(i:Food)
        RETURN f, collect({
            name: i.name,
            percentage: coalesce(c['percentage'], 0.0),
            cost_per_kg: coalesce(c['cost_per_kg'], 0.0),
            function: coalesce(c['function'], i['function'], 'unspecified')
        }) as ingredients
        ORDER BY coalesce(f.updated_at, f.created_at) DESC
        SKIP $skip
        LIMIT $limit
        """

        records = neo4j_client.execute_query(query, {"skip": skip, "limit": limit})
        formulations = []

        for record in records:
            mapped = _map_formulation_record(record)
            if mapped:
                formulations.append(mapped)

        count_query = "MATCH (f:Formulation) RETURN count(f) as total"
        count_result = neo4j_client.execute_query(count_query)
        total_count = count_result[0].get("total", 0) if count_result else 0

        return FormulationListResponse(
            formulations=formulations,
            total_count=total_count
        )
    
    except Exception as e:
        logger.error(f"Failed to list formulations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch formulations: {str(e)}"
        )


@router.get("/{formulation_id}", response_model=FormulationResponse, summary="Get Formulation")
async def get_formulation(formulation_id: str, request: Request):
    """
    Get a specific formulation by ID.
    """
    
    neo4j_client = request.app.state.neo4j_client
    
    if not neo4j_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neo4j database not connected"
        )
    
    try:
        formulation = _fetch_formulation(neo4j_client, formulation_id)

        if not formulation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Formulation {formulation_id} not found"
            )

        return formulation
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get formulation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch formulation: {str(e)}"
        )


@router.put("/{formulation_id}", response_model=FormulationResponse, summary="Update Formulation")
async def update_formulation(formulation_id: str, update: FormulationUpdate, request: Request):
    """Update formulation metadata and, optionally, ingredient composition."""

    neo4j_client = request.app.state.neo4j_client

    if not neo4j_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neo4j database not connected"
        )

    update_data = update.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update fields provided"
        )

    try:
        existing = _fetch_formulation(neo4j_client, formulation_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Formulation {formulation_id} not found"
            )

        fields = set(update_data.keys())
        updated_name = update.name if "name" in fields else existing.name
        updated_description = update.description if "description" in fields else existing.description
        updated_status = update.status if "status" in fields else existing.status
        updated_at = datetime.now().isoformat()

        neo4j_client.execute_query(
            """
            MATCH (f:Formulation {id: $id})
            SET f.name = $name,
                f.description = $description,
                f.status = $status,
                f.updated_at = $updated_at
            RETURN f
            """,
            {
                "id": formulation_id,
                "name": updated_name,
                "description": updated_description,
                "status": updated_status,
                "updated_at": updated_at,
            },
        )

        if "ingredients" in fields:
            ingredients_payload = update.ingredients or []
            total_percentage = sum(ing.percentage for ing in ingredients_payload)

            if abs(total_percentage - 100.0) > 0.1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ingredient percentages must sum to 100%. Current total: {total_percentage}%"
                )

            neo4j_client.execute_query(
                """
                MATCH (:Formulation {id: $id})-[rel:CONTAINS]->(:Food)
                DELETE rel
                """,
                {"id": formulation_id},
            )

            for ing in ingredients_payload:
                neo4j_client.execute_query(
                    """
                    MATCH (f:Formulation {id: $form_id})
                    MERGE (i:Food {name: $name})
                    CREATE (f)-[:CONTAINS {
                        percentage: $percentage,
                        cost_per_kg: $cost_per_kg,
                        function: $function
                    }]->(i)
                    """,
                    {
                        "form_id": formulation_id,
                        "name": ing.name,
                        "percentage": ing.percentage,
                        "cost_per_kg": ing.cost_per_kg if ing.cost_per_kg is not None else 0.0,
                        "function": ing.function or "unspecified",
                    },
                )

        updated_formulation = _fetch_formulation(neo4j_client, formulation_id)
        logger.info(f"Updated formulation {formulation_id}")

        if not updated_formulation:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Formulation update failed to persist"
            )

        return updated_formulation

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update formulation {formulation_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update formulation: {str(e)}"
        )


@router.delete("/{formulation_id}", summary="Delete Formulation")
async def delete_formulation(formulation_id: str, request: Request):
    """Delete a formulation and its ingredient relationships."""

    neo4j_client = request.app.state.neo4j_client

    if not neo4j_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neo4j database not connected"
        )

    try:
        existing = _fetch_formulation(neo4j_client, formulation_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Formulation {formulation_id} not found"
            )

        neo4j_client.execute_query(
            """
            MATCH (f:Formulation {id: $id})
            DETACH DELETE f
            """,
            {"id": formulation_id},
        )

        logger.info(f"Deleted formulation {formulation_id}")
        return {"detail": f"Formulation {formulation_id} deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete formulation {formulation_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete formulation: {str(e)}"
        )
