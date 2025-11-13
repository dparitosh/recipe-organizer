"""Schema migration API endpoint."""

from fastapi import APIRouter, Request, HTTPException, status
from neo4j import exceptions as neo4j_exceptions
from typing import Dict, Any
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/migrate-to-knowledge-graph", summary="Migrate to Knowledge Graph Schema")
async def migrate_to_knowledge_graph(request: Request) -> Dict[str, Any]:
    """
    Transform disconnected hyper-graph to proper knowledge graph structure.
    
    This migration:
    1. Extracts ingredients from Formulation JSON properties
    2. Creates individual Ingredient nodes
    3. Links Formulation → Ingredient → Food → Nutrient
    
    Enables graph traversal for nutrition calculation and GraphRAG queries.
    """
    neo4j_client = getattr(request.app.state, 'neo4j_client', None)
    if not neo4j_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neo4j not connected"
        )
    
    try:
        # Step 1: Check current state
        check_query = """
        MATCH (f:Formulation)
        WHERE f.ingredients IS NOT NULL
        RETURN count(f) as formulations_with_ingredients
        """
        result = neo4j_client.execute_query(check_query)
        formulations_count = result[0]['formulations_with_ingredients'] if result else 0
        
        if formulations_count == 0:
            return {
                "status": "no_migration_needed",
                "message": "No formulations with ingredient arrays found",
                "formulations_checked": 0
            }
        
        logger.info(f"Found {formulations_count} formulations to migrate")
        
        # Step 2: Execute migration
        migration_query = """
        // For each formulation with an ingredients property (JSON array)
        MATCH (f:Formulation)
        WHERE f.ingredients IS NOT NULL
        
        // Unwind the ingredients array
        UNWIND f.ingredients as ing_data
        
        // Create Ingredient node for each item
        MERGE (ing:Ingredient {
            id: f.id + '_' + toLower(replace(ing_data.name, ' ', '_'))
        })
        ON CREATE SET
            ing.name = ing_data.name,
            ing.formulation_id = f.id,
            ing.percentage = toFloat(ing_data.percentage),
            ing.amount = toFloat(COALESCE(ing_data.quantity_kg, ing_data.amount, 0)),
            ing.unit = COALESCE(ing_data.unit, 'kg'),
            ing.function = ing_data.function,
            ing.cost_per_kg = toFloat(COALESCE(ing_data.cost_per_kg, 0)),
            ing.created_at = datetime()
        
        // Create CONTAINS_INGREDIENT relationship
        MERGE (f)-[r:CONTAINS_INGREDIENT]->(ing)
        ON CREATE SET
            r.percentage = toFloat(ing_data.percentage),
            r.amount = toFloat(COALESCE(ing_data.quantity_kg, ing_data.amount, 0)),
            r.unit = COALESCE(ing_data.unit, 'kg'),
            r.function = ing_data.function,
            r.created_at = datetime()
        
        WITH ing, ing_data.name as ingredient_name, f
        
        // Try to match to Food nodes (case-insensitive, CONTAINS match)
        OPTIONAL MATCH (food:Food)
        WHERE toLower(food.description) CONTAINS toLower(ingredient_name)
        
        WITH ing, ingredient_name, f, food
        ORDER BY 
            CASE 
                WHEN toLower(food.description) = toLower(ingredient_name) THEN 0
                WHEN food.description IS NULL THEN 999
                ELSE abs(length(food.description) - length(ingredient_name))
            END
        
        WITH ing, ingredient_name, f, head(collect(food)) as best_food
        
        // Create DERIVED_FROM relationship if food found
        FOREACH (dummy IN CASE WHEN best_food IS NOT NULL THEN [1] ELSE [] END |
            MERGE (ing)-[df:DERIVED_FROM]->(best_food)
            ON CREATE SET
                df.confidence = CASE 
                    WHEN toLower(best_food.description) = toLower(ingredient_name) THEN 1.0
                    ELSE 0.7
                END,
                df.matched_food = best_food.description,
                df.created_at = datetime()
        )
        
        RETURN count(DISTINCT ing) as ingredients_created,
               count(DISTINCT f) as formulations_processed
        """
        
        result = neo4j_client.execute_query(migration_query)
        
        if not result:
            raise ValueError("Migration query returned no results")
        
        ingredients_created = result[0].get('ingredients_created', 0)
        formulations_processed = result[0].get('formulations_processed', 0)
        
        logger.info(f"Migration complete: {ingredients_created} ingredients, {formulations_processed} formulations")
        
        # Step 3: Verify the graph structure
        verify_query = """
        MATCH path = (f:Formulation)-[:CONTAINS_INGREDIENT]->(i:Ingredient)
                     -[:DERIVED_FROM]->(food:Food)
                     -[:CONTAINS_NUTRIENT]->(n:Nutrient)
        RETURN count(DISTINCT f) as formulations_with_complete_paths,
               count(DISTINCT i) as ingredients_with_food_links,
               count(DISTINCT path) as total_nutrient_paths
        LIMIT 1
        """
        
        verify_result = neo4j_client.execute_query(verify_query)
        verification = verify_result[0] if verify_result else {}
        
        # Step 4: Create indexes
        index_queries = [
            "CREATE INDEX ingredient_id IF NOT EXISTS FOR (i:Ingredient) ON (i.id)",
            "CREATE INDEX ingredient_name IF NOT EXISTS FOR (i:Ingredient) ON (i.name)",
            "CREATE INDEX ingredient_formulation IF NOT EXISTS FOR (i:Ingredient) ON (i.formulation_id)",
        ]
        
        for idx_query in index_queries:
            try:
                neo4j_client.execute_write(idx_query)
            except neo4j_exceptions.ConstraintError:
                continue
            except neo4j_exceptions.Neo4jError as exc:
                logger.warning("Index creation skipped due to Neo4j error: %s", exc)
        
        return {
            "status": "success",
            "message": "Knowledge graph migration completed",
            "formulations_processed": formulations_processed,
            "ingredients_created": ingredients_created,
            "verification": verification,
            "next_steps": [
                "Nutrition service now uses graph traversal: Formulation → Ingredient → Food → Nutrient",
                "Enable GraphRAG by setting OLLAMA_EMBED_MODEL=nomic-embed-text",
                "Test with: POST /api/formulations/{id}/nutrition-label"
            ]
        }
        
    except (neo4j_exceptions.Neo4jError, RuntimeError, ValueError) as exc:
        logger.error("Migration failed", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Migration failed: {exc}"
        ) from exc
