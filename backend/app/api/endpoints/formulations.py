from fastapi import APIRouter, Request, HTTPException, status
from datetime import datetime
from typing import List
import logging

from app.models.schemas import (
    FormulationCreate,
    FormulationResponse,
    FormulationListResponse
)

router = APIRouter()
logger = logging.getLogger(__name__)

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
                    "cost_per_kg": ing.cost_per_kg,
                    "function": ing.function
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
            percentage: c.percentage,
            cost_per_kg: c.cost_per_kg,
            function: c.function
        }) as ingredients
        ORDER BY f.created_at DESC
        SKIP $skip
        LIMIT $limit
        """
        
        records = neo4j_client.execute_query(query, {"skip": skip, "limit": limit})
        
        formulations = []
        for record in records:
            form_node = record.get('f')
            ingredients = record.get('ingredients', [])
            
            if form_node:
                form_props = dict(form_node)
                total_percentage = sum(ing.get('percentage', 0) for ing in ingredients if ing.get('name'))
                
                formulations.append(FormulationResponse(
                    id=form_props.get('id', ''),
                    name=form_props.get('name', ''),
                    description=form_props.get('description'),
                    status=form_props.get('status', 'draft'),
                    ingredients=[ing for ing in ingredients if ing.get('name')],
                    total_percentage=total_percentage,
                    created_at=form_props.get('created_at', ''),
                    updated_at=form_props.get('updated_at')
                ))
        
        count_query = "MATCH (f:Formulation) RETURN count(f) as total"
        count_result = neo4j_client.execute_query(count_query)
        total_count = count_result[0].get('total', 0) if count_result else 0
        
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
        query = """
        MATCH (f:Formulation {id: $id})
        OPTIONAL MATCH (f)-[c:CONTAINS]->(i:Food)
        RETURN f, collect({
            name: i.name,
            percentage: c.percentage,
            cost_per_kg: c.cost_per_kg,
            function: c.function
        }) as ingredients
        """
        
        records = neo4j_client.execute_query(query, {"id": formulation_id})
        
        if not records:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Formulation {formulation_id} not found"
            )
        
        record = records[0]
        form_node = record.get('f')
        ingredients = record.get('ingredients', [])
        
        form_props = dict(form_node)
        total_percentage = sum(ing.get('percentage', 0) for ing in ingredients if ing.get('name'))
        
        return FormulationResponse(
            id=form_props.get('id', ''),
            name=form_props.get('name', ''),
            description=form_props.get('description'),
            status=form_props.get('status', 'draft'),
            ingredients=[ing for ing in ingredients if ing.get('name')],
            total_percentage=total_percentage,
            created_at=form_props.get('created_at', ''),
            updated_at=form_props.get('updated_at')
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get formulation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch formulation: {str(e)}"
        )
