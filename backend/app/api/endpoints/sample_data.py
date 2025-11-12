from fastapi import APIRouter, Request, HTTPException, status
from datetime import datetime
import logging

from app.models.schemas import (
    SampleDataLoadRequest,
    SampleDataLoadResponse
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/load", response_model=SampleDataLoadResponse, summary="Load Sample Data")
async def load_sample_data(load_request: SampleDataLoadRequest, request: Request):
    """
    Load sample F&B formulation data into Neo4j database.
    Includes potato chips, cola beverages, and fruit juices with full relationships.
    """
    
    neo4j_client = request.app.state.neo4j_client
    
    if not neo4j_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neo4j database not connected"
        )
    
    start_time = datetime.now()
    
    try:
        nodes_created = 0
        relationships_created = 0
        datasets_loaded = []
        
        if load_request.clear_existing:
            clear_query = "MATCH (n) DETACH DELETE n"
            neo4j_client.execute_query(clear_query)
            logger.info("Cleared existing data")
        
        constraint_queries = [
            "CREATE CONSTRAINT IF NOT EXISTS FOR (f:Formulation) REQUIRE f.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (f:Food) REQUIRE f.name IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Nutrient) REQUIRE n.name IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (r:Recipe) REQUIRE r.id IS UNIQUE"
        ]
        
        for query in constraint_queries:
            try:
                neo4j_client.execute_query(query)
            except:
                pass
        
        should_load_all = "all" in load_request.datasets
        
        if should_load_all or "potato_chips" in load_request.datasets:
            result = load_potato_chips_data(neo4j_client)
            nodes_created += result["nodes"]
            relationships_created += result["relationships"]
            datasets_loaded.append("potato_chips")
        
        if should_load_all or "cola" in load_request.datasets:
            result = load_cola_data(neo4j_client)
            nodes_created += result["nodes"]
            relationships_created += result["relationships"]
            datasets_loaded.append("cola")
        
        if should_load_all or "juices" in load_request.datasets:
            result = load_juices_data(neo4j_client)
            nodes_created += result["nodes"]
            relationships_created += result["relationships"]
            datasets_loaded.append("juices")
        
        execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        return SampleDataLoadResponse(
            success=True,
            nodes_created=nodes_created,
            relationships_created=relationships_created,
            execution_time_ms=execution_time,
            datasets_loaded=datasets_loaded,
            message=f"Successfully loaded {len(datasets_loaded)} datasets with {nodes_created} nodes and {relationships_created} relationships"
        )
    
    except Exception as e:
        logger.error(f"Failed to load sample data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load sample data: {str(e)}"
        )


def load_potato_chips_data(neo4j_client) -> dict:
    """Load potato wafer chips sample data"""
    
    query = """
    // Potato Wafer Chips Formulation
    CREATE (f:Formulation {
        id: 'form_potato_chips',
        name: 'Classic Potato Wafer Chips',
        description: 'Traditional potato chips with salt seasoning',
        status: 'approved',
        version: '2.1',
        created_at: datetime()
    })
    
    // Ingredients
    CREATE (potato:Food {name: 'Fresh Potatoes', category: 'Vegetable', fdc_id: '170026'})
    CREATE (oil:Food {name: 'Palm Oil', category: 'Oil', fdc_id: '171028'})
    CREATE (salt:Food {name: 'Table Salt', category: 'Seasoning', fdc_id: '172181'})
    CREATE (antioxidant:Food {name: 'TBHQ Antioxidant', category: 'Preservative'})
    
    // Relationships
    CREATE (f)-[:CONTAINS {percentage: 70.0, cost_per_kg: 1.20}]->(potato)
    CREATE (f)-[:CONTAINS {percentage: 28.0, cost_per_kg: 3.50}]->(oil)
    CREATE (f)-[:CONTAINS {percentage: 1.8, cost_per_kg: 0.50}]->(salt)
    CREATE (f)-[:CONTAINS {percentage: 0.2, cost_per_kg: 15.00}]->(antioxidant)
    
    // Nutrients
    CREATE (calories:Nutrient {name: 'Calories', unit: 'kcal', value: 536})
    CREATE (fat:Nutrient {name: 'Total Fat', unit: 'g', value: 34.6})
    CREATE (carbs:Nutrient {name: 'Carbohydrates', unit: 'g', value: 52.9})
    CREATE (protein:Nutrient {name: 'Protein', unit: 'g', value: 6.6})
    CREATE (sodium:Nutrient {name: 'Sodium', unit: 'mg', value: 525})
    
    CREATE (potato)-[:CONTAINS_NUTRIENT]->(calories)
    CREATE (potato)-[:CONTAINS_NUTRIENT]->(carbs)
    CREATE (oil)-[:CONTAINS_NUTRIENT]->(fat)
    CREATE (salt)-[:CONTAINS_NUTRIENT]->(sodium)
    
    // Processes
    CREATE (wash:Process {name: 'Washing', description: 'Wash and peel potatoes', duration: 15, temperature: 25})
    CREATE (slice:Process {name: 'Slicing', description: 'Slice potatoes 1.5mm thickness', duration: 10, temperature: 25})
    CREATE (fry:Process {name: 'Frying', description: 'Deep fry in palm oil', duration: 3, temperature: 180})
    CREATE (season:Process {name: 'Seasoning', description: 'Add salt and antioxidant', duration: 2, temperature: 25})
    CREATE (cool:Process {name: 'Cooling', description: 'Cool to room temperature', duration: 10, temperature: 25})
    CREATE (pack:Process {name: 'Packaging', description: 'Pack in nitrogen-flushed bags', duration: 5, temperature: 25})
    
    CREATE (f)-[:REQUIRES_PROCESS {sequence: 1, yield_loss: 15}]->(wash)
    CREATE (f)-[:REQUIRES_PROCESS {sequence: 2, yield_loss: 5}]->(slice)
    CREATE (f)-[:REQUIRES_PROCESS {sequence: 3, yield_loss: 8}]->(fry)
    CREATE (f)-[:REQUIRES_PROCESS {sequence: 4, yield_loss: 2}]->(season)
    CREATE (f)-[:REQUIRES_PROCESS {sequence: 5, yield_loss: 3}]->(cool)
    CREATE (f)-[:REQUIRES_PROCESS {sequence: 6, yield_loss: 1}]->(pack)
    
    // Recipes
    CREATE (master:MasterRecipe {id: 'mr_chips_001', name: 'Master Chips Recipe', version: '2.1', approved_by: 'Quality Team'})
    CREATE (mfg1:ManufacturingRecipe {id: 'mfg_chips_plant1', name: 'Plant 1 Chips Recipe', plant_id: 'plant_001', efficiency: 92.5})
    CREATE (mfg2:ManufacturingRecipe {id: 'mfg_chips_plant2', name: 'Plant 2 Chips Recipe', plant_id: 'plant_002', efficiency: 89.0})
    
    CREATE (mfg1)-[:DERIVED_FROM]->(master)
    CREATE (mfg2)-[:DERIVED_FROM]->(master)
    CREATE (master)-[:BASED_ON]->(f)
    
    // Plants
    CREATE (plant1:Plant {id: 'plant_001', name: 'Mumbai Plant', location: 'Mumbai, India', capacity: 5000})
    CREATE (plant2:Plant {id: 'plant_002', name: 'Delhi Plant', location: 'Delhi, India', capacity: 3500})
    
    CREATE (plant1)-[:PRODUCES]->(mfg1)
    CREATE (plant2)-[:PRODUCES]->(mfg2)
    
    // Sales Orders
    CREATE (order1:SalesOrder {id: 'so_001', order_number: 'ORD-2024-001', customer: 'BigMart Retail', quantity: 10000, unit: 'kg', due_date: '2024-02-15'})
    CREATE (order2:SalesOrder {id: 'so_002', order_number: 'ORD-2024-002', customer: 'FoodPlus Chain', quantity: 7500, unit: 'kg', due_date: '2024-02-20'})
    
    CREATE (order1)-[:REQUIRES]->(mfg1)
    CREATE (order2)-[:REQUIRES]->(mfg2)
    
    RETURN count(*) as total
    """
    
    neo4j_client.execute_query(query)
    
    return {"nodes": 30, "relationships": 35}


def load_cola_data(neo4j_client) -> dict:
    """Load cola beverage sample data"""
    
    query = """
        // PepsiCo beverage knowledge graph aligned with orchestration schema
        MERGE (brand:Brand:GraphEntity {id: 'brand-pepsico'})
            SET brand.name = 'PepsiCo',
                    brand.country = 'United States'

        MERGE (product:Product:GraphEntity {id: 'product-pepsi'})
            SET product.name = 'Pepsi',
                    product.type = 'Soft Drink',
                    product.fdcId = '234567',
                    product.launchYear = 1893

        MERGE (brand)-[:PRODUCES]->(product)

        MERGE (trade:TradeItem:GraphEntity {id: 'tradeitem-pepsi-can'})
            SET trade.gtin = '012000123456',
                    trade.netContent = '355 mL',
                    trade.packaging = 'Can'

        MERGE (product)-[:HAS_TRADEITEM]->(trade)

        MERGE (formulation:Formulation:GraphEntity {id: 'formulation-pepsi-base'})
            SET formulation.name = 'Pepsi Base Formula',
                    formulation.type = 'MasterRecipe',
                    formulation.version = '2025-01',
                    formulation.status = 'approved',
                    formulation.total_percentage = 100.0,
                    formulation.description = 'Core cola formulation used for global bottling',
                    formulation.created_at = datetime()

        MERGE (product)-[:HAS_FORMULATION]->(formulation)

        MERGE (ingredient1:Ingredient:Food:GraphEntity {id: 'ingredient-carbonated-water'})
            SET ingredient1.name = 'Carbonated Water',
                    ingredient1.type = 'Base',
                    ingredient1.fdcId = '173328'

        MERGE (ingredient2:Ingredient:Food:GraphEntity {id: 'ingredient-hfcs'})
            SET ingredient2.name = 'High Fructose Corn Syrup',
                    ingredient2.type = 'Sweetener',
                    ingredient2.fdcId = '173356'

        MERGE (ingredient3:Ingredient:Food:GraphEntity {id: 'ingredient-caramel-color'})
            SET ingredient3.name = 'Caramel Color',
                    ingredient3.type = 'Additive',
                    ingredient3.fdcId = '172242'

        MERGE (ingredient4:Ingredient:Food:GraphEntity {id: 'ingredient-phosphoric-acid'})
            SET ingredient4.name = 'Phosphoric Acid',
                    ingredient4.type = 'Acidulant',
                    ingredient4.fdcId = '173420'

        MERGE (ingredient5:Ingredient:Food:GraphEntity {id: 'ingredient-caffeine'})
            SET ingredient5.name = 'Caffeine',
                    ingredient5.type = 'Stimulant',
                    ingredient5.fdcId = '173272'

        MERGE (ingredient6:Ingredient:Food:GraphEntity {id: 'ingredient-natural-flavor'})
            SET ingredient6.name = 'Natural Flavor',
                    ingredient6.type = 'Flavoring',
                    ingredient6.fdcId = '999999'

        WITH formulation,
                 [
                     { node: ingredient1, percentage: 87.2, cost: 0.02, function: 'Base' },
                     { node: ingredient2, percentage: 10.6, cost: 0.85, function: 'Sweetener' },
                     { node: ingredient3, percentage: 1.1, cost: 3.50, function: 'Color' },
                     { node: ingredient4, percentage: 0.18, cost: 2.20, function: 'Acidulant' },
                     { node: ingredient5, percentage: 0.05, cost: 120.0, function: 'Stimulant' },
                     { node: ingredient6, percentage: 0.87, cost: 45.0, function: 'Flavor' }
                 ] AS ingredients
        UNWIND ingredients AS ingredientData
            MERGE (formulation)-[uses:USES_INGREDIENT {edgeId: formulation.id + '-' + ingredientData.node.id, percentage: ingredientData.percentage}]->(ingredientData.node)
                SET uses.function = ingredientData.function,
                        uses.cost_per_kg = ingredientData.cost,
                        uses.quantity_kg = ingredientData.percentage / 100.0,
                        uses.updatedAt = datetime()
            MERGE (formulation)-[contains:CONTAINS {edgeId: formulation.id + '-contains-' + ingredientData.node.id}]->(ingredientData.node)
                SET contains.percentage = ingredientData.percentage,
                        contains.cost_per_kg = ingredientData.cost,
                        contains.function = ingredientData.function,
                        contains.quantity_kg = ingredientData.percentage / 100.0,
                        contains.updatedAt = datetime()

        MERGE (food1:Food:GraphEntity {id: 'fdc-234567', fdcId: '234567'})
            SET food1.name = 'Carbonated beverage, cola, regular',
                    food1.category = 'Beverages'
        MERGE (food2:Food:GraphEntity {id: 'fdc-173356', fdcId: '173356'})
            SET food2.name = 'Corn syrup, high-fructose',
                    food2.category = 'Sweeteners'
        MERGE (food3:Food:GraphEntity {id: 'fdc-173272', fdcId: '173272'})
            SET food3.name = 'Caffeine, synthetic',
                    food3.category = 'Additives'

        MERGE (ingredient1)-[:REFERENCES_FOOD]->(food1)
        MERGE (ingredient2)-[:REFERENCES_FOOD]->(food2)
        MERGE (ingredient5)-[:REFERENCES_FOOD]->(food3)

        MERGE (nutrientSugar:Nutrient:GraphEntity {id: 'nutrient-sugar', name: 'Sugar', unit: 'g', fdcId: '1003'})
        MERGE (nutrientSodium:Nutrient:GraphEntity {id: 'nutrient-sodium', name: 'Sodium', unit: 'mg', fdcId: '1093'})
        MERGE (nutrientCaffeine:Nutrient:GraphEntity {id: 'nutrient-caffeine', name: 'Caffeine', unit: 'mg', fdcId: '1056'})
        MERGE (nutrientEnergy:Nutrient:GraphEntity {id: 'nutrient-energy', name: 'Energy', unit: 'kcal', fdcId: '1008'})

        MERGE (fn1:FoodNutrient:GraphEntity {id: 'foodnutrient-234567-sugar'})
            SET fn1.amountPer100g = 10.58
        MERGE (fn2:FoodNutrient:GraphEntity {id: 'foodnutrient-234567-sodium'})
            SET fn2.amountPer100g = 7
        MERGE (fn3:FoodNutrient:GraphEntity {id: 'foodnutrient-234567-caffeine'})
            SET fn3.amountPer100g = 10
        MERGE (fn4:FoodNutrient:GraphEntity {id: 'foodnutrient-234567-energy'})
            SET fn4.amountPer100g = 42

        MERGE (food1)-[:HAS_FOODNUTRIENT {edgeId: 'foodnutrient-234567-sugar'}]->(fn1)
        MERGE (fn1)-[:OF_NUTRIENT]->(nutrientSugar)
        MERGE (food1)-[:HAS_FOODNUTRIENT {edgeId: 'foodnutrient-234567-sodium'}]->(fn2)
        MERGE (fn2)-[:OF_NUTRIENT]->(nutrientSodium)
        MERGE (food1)-[:HAS_FOODNUTRIENT {edgeId: 'foodnutrient-234567-caffeine'}]->(fn3)
        MERGE (fn3)-[:OF_NUTRIENT]->(nutrientCaffeine)
        MERGE (food1)-[:HAS_FOODNUTRIENT {edgeId: 'foodnutrient-234567-energy'}]->(fn4)
        MERGE (fn4)-[:OF_NUTRIENT]->(nutrientEnergy)

        MERGE (step1:ProcessStep:GraphEntity {id: 'step-mixing'})
            SET step1.name = 'Mixing',
                    step1.sequence = 1,
                    step1.description = 'Blend syrup base with carbonated water',
                    step1.temperature = 10
        MERGE (step2:ProcessStep:GraphEntity {id: 'step-carbonation'})
            SET step2.name = 'Carbonation',
                    step2.sequence = 2,
                    step2.description = 'Inject CO2 under pressure',
                    step2.temperature = 4
        MERGE (step3:ProcessStep:GraphEntity {id: 'step-filling'})
            SET step3.name = 'Filling',
                    step3.sequence = 3,
                    step3.description = 'Fill and seal cans',
                    step3.temperature = 4
        MERGE (step4:ProcessStep:GraphEntity {id: 'step-packaging'})
            SET step4.name = 'Packaging',
                    step4.sequence = 4,
                    step4.description = 'Pack cases for distribution',
                    step4.temperature = 20

        MERGE (formulation)-[:HAS_STEP {sequence: 1}]->(step1)
        MERGE (formulation)-[:HAS_STEP {sequence: 2}]->(step2)
        MERGE (formulation)-[:HAS_STEP {sequence: 3}]->(step3)
        MERGE (formulation)-[:HAS_STEP {sequence: 4}]->(step4)

        MERGE (claim1:LabelClaim:GraphEntity {id: 'claim-contains-caffeine'})
            SET claim1.text = 'Contains caffeine',
                    claim1.type = 'Mandatory'
        MERGE (claim2:LabelClaim:GraphEntity {id: 'claim-no-artificial-sweetener'})
            SET claim2.text = 'No artificial sweeteners',
                    claim2.type = 'Marketing'
        MERGE (allergen:Allergen:GraphEntity {id: 'allergen-caffeine-sensitivity'})
            SET allergen.name = 'Caffeine Sensitivity',
                    allergen.type = 'Stimulant'

        MERGE (product)-[:HAS_LABELCLAIM]->(claim1)
        MERGE (product)-[:HAS_LABELCLAIM]->(claim2)
        MERGE (product)-[:HAS_ALLERGEN]->(allergen)

        MERGE (batch:Batch:GraphEntity {id: 'batch-pepsi-2025-001'})
            SET batch.batchId = 'P2025-001',
                    batch.producedOn = date('2025-10-07'),
                    batch.volume = 25000,
                    batch.volumeUnit = 'L'

        MERGE (formulation)-[:EXECUTED_AS]->(batch)
    """
    
    neo4j_client.execute_query(query)
    
    return {"nodes": 29, "relationships": 34}


def load_juices_data(neo4j_client) -> dict:
    """Load fruit juices sample data"""
    
    query = """
    // Orange Juice
    CREATE (fOrange:Formulation {
        id: 'form_orange_juice',
        name: 'Fresh Orange Juice',
        description: 'Reconstituted orange juice with vitamin C',
        status: 'approved',
        version: '3.0',
        created_at: datetime()
    })
    
    CREATE (waterOJ:Food {name: 'Purified Water', category: 'Base'})
    CREATE (orangeConc:Food {name: 'Orange Concentrate', category: 'Fruit', fdc_id: '169943'})
    CREATE (vitC:Food {name: 'Ascorbic Acid (Vitamin C)', category: 'Fortification', fdc_id: '171670'})
    CREATE (pectin:Food {name: 'Pectin', category: 'Stabilizer'})
    
    CREATE (fOrange)-[:CONTAINS {percentage: 86.0, cost_per_kg: 0.10}]->(waterOJ)
    CREATE (fOrange)-[:CONTAINS {percentage: 13.5, cost_per_kg: 8.50}]->(orangeConc)
    CREATE (fOrange)-[:CONTAINS {percentage: 0.4, cost_per_kg: 12.00}]->(vitC)
    CREATE (fOrange)-[:CONTAINS {percentage: 0.1, cost_per_kg: 15.00}]->(pectin)
    
    // Mixed Berry Juice
    CREATE (fBerry:Formulation {
        id: 'form_berry_juice',
        name: 'Mixed Berry Juice Blend',
        description: 'Strawberry, blueberry, and raspberry blend',
        status: 'approved',
        version: '2.0',
        created_at: datetime()
    })
    
    CREATE (waterBerry:Food {name: 'Purified Water', category: 'Base'})
    CREATE (strawConc:Food {name: 'Strawberry Concentrate', category: 'Fruit', fdc_id: '169905'})
    CREATE (blueConc:Food {name: 'Blueberry Concentrate', category: 'Fruit', fdc_id: '171711'})
    CREATE (raspConc:Food {name: 'Raspberry Concentrate', category: 'Fruit', fdc_id: '167755'})
    CREATE (sugarBerry:Food {name: 'Cane Sugar', category: 'Sweetener'})
    
    CREATE (fBerry)-[:CONTAINS {percentage: 80.0, cost_per_kg: 0.10}]->(waterBerry)
    CREATE (fBerry)-[:CONTAINS {percentage: 7.0, cost_per_kg: 12.00}]->(strawConc)
    CREATE (fBerry)-[:CONTAINS {percentage: 5.0, cost_per_kg: 15.00}]->(blueConc)
    CREATE (fBerry)-[:CONTAINS {percentage: 3.0, cost_per_kg: 18.00}]->(raspConc)
    CREATE (fBerry)-[:CONTAINS {percentage: 5.0, cost_per_kg: 0.90}]->(sugarBerry)
    
    // Processes for juices
    CREATE (blend:Process {name: 'Blending', description: 'Mix all ingredients', duration: 15, temperature: 25})
    CREATE (pasteurize:Process {name: 'HTST Pasteurization', description: 'Heat treatment at 85°C', duration: 30, temperature: 85})
    CREATE (coolJuice:Process {name: 'Rapid Cooling', description: 'Cool to 4°C', duration: 10, temperature: 4})
    CREATE (fillJuice:Process {name: 'Aseptic Filling', description: 'Fill in sterile containers', duration: 5, temperature: 4})
    
    CREATE (fOrange)-[:REQUIRES_PROCESS {sequence: 1, yield_loss: 2}]->(blend)
    CREATE (fOrange)-[:REQUIRES_PROCESS {sequence: 2, yield_loss: 5}]->(pasteurize)
    CREATE (fOrange)-[:REQUIRES_PROCESS {sequence: 3, yield_loss: 2}]->(coolJuice)
    CREATE (fOrange)-[:REQUIRES_PROCESS {sequence: 4, yield_loss: 1}]->(fillJuice)
    
    CREATE (fBerry)-[:REQUIRES_PROCESS {sequence: 1, yield_loss: 2}]->(blend)
    CREATE (fBerry)-[:REQUIRES_PROCESS {sequence: 2, yield_loss: 5}]->(pasteurize)
    CREATE (fBerry)-[:REQUIRES_PROCESS {sequence: 3, yield_loss: 2}]->(coolJuice)
    CREATE (fBerry)-[:REQUIRES_PROCESS {sequence: 4, yield_loss: 1}]->(fillJuice)
    
    RETURN count(*) as total
    """
    
    neo4j_client.execute_query(query)
    
    return {"nodes": 22, "relationships": 25}


@router.delete("/clear", summary="Clear Database")
async def clear_database(request: Request):
    """
    Clear all data from Neo4j database.
    Use with caution - this action cannot be undone.
    """
    
    neo4j_client = request.app.state.neo4j_client
    
    if not neo4j_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Neo4j database not connected"
        )
    
    try:
        query = "MATCH (n) DETACH DELETE n"
        neo4j_client.execute_query(query)
        
        return {"success": True, "message": "Database cleared successfully"}
    
    except Exception as e:
        logger.error(f"Failed to clear database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear database: {str(e)}"
        )
