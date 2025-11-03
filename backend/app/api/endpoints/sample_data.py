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
    // Classic Cola Beverage
    CREATE (f:Formulation {
        id: 'form_cola',
        name: 'Classic Cola Beverage',
        description: 'Carbonated cola soft drink',
        status: 'approved',
        version: '1.5',
        created_at: datetime()
    })
    
    // Ingredients
    CREATE (water:Food {name: 'Purified Water', category: 'Base', fdc_id: '171881'})
    CREATE (sugar:Food {name: 'White Sugar', category: 'Sweetener', fdc_id: '169655'})
    CREATE (concentrate:Food {name: 'Cola Concentrate', category: 'Flavoring'})
    CREATE (co2:Food {name: 'Carbon Dioxide', category: 'Gas'})
    CREATE (citric:Food {name: 'Citric Acid', category: 'Acidulant', fdc_id: '171666'})
    
    CREATE (f)-[:CONTAINS {percentage: 88.5, cost_per_kg: 0.10}]->(water)
    CREATE (f)-[:CONTAINS {percentage: 10.0, cost_per_kg: 0.80}]->(sugar)
    CREATE (f)-[:CONTAINS {percentage: 1.0, cost_per_kg: 25.00}]->(concentrate)
    CREATE (f)-[:CONTAINS {percentage: 0.4, cost_per_kg: 1.50}]->(co2)
    CREATE (f)-[:CONTAINS {percentage: 0.1, cost_per_kg: 3.00}]->(citric)
    
    // Processes
    CREATE (mix:Process {name: 'Syrup Mixing', description: 'Mix sugar and concentrate', duration: 20, temperature: 25})
    CREATE (carb:Process {name: 'Carbonation', description: 'Add CO2 under pressure', duration: 5, temperature: 4})
    CREATE (fill:Process {name: 'Filling', description: 'Fill and cap bottles', duration: 2, temperature: 4})
    
    CREATE (f)-[:REQUIRES_PROCESS {sequence: 1, yield_loss: 2}]->(mix)
    CREATE (f)-[:REQUIRES_PROCESS {sequence: 2, yield_loss: 3}]->(carb)
    CREATE (f)-[:REQUIRES_PROCESS {sequence: 3, yield_loss: 1}]->(fill)
    
    RETURN count(*) as total
    """
    
    neo4j_client.execute_query(query)
    
    return {"nodes": 12, "relationships": 10}


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
