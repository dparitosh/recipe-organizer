from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
import os
from neo4j import GraphDatabase
import openai
import json

app = FastAPI(title="Formulation Graph Studio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NEO4J_URI = os.getenv("NEO4J_URI", "neo4j+s://2cccd05b.databases.neo4j.io")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "tcs12345")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

driver = None
openai_client = None

class AIServiceConfig(BaseModel):
    mode: Literal["online", "offline", "auto"] = "auto"
    auto_fallback: bool = True
    retry_attempts: int = 3
    timeout_seconds: int = 10

class AIQueryRequest(BaseModel):
    query: str
    service_mode: Optional[str] = "auto"
    include_graph: bool = True

class AIQueryResponse(BaseModel):
    answer: str
    mode: str
    execution_time_ms: int
    confidence: float
    data_sources: List[str]
    cypher_query: Optional[str] = None
    node_highlights: List[Dict[str, Any]] = []
    relationship_summaries: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []

class ServiceHealthResponse(BaseModel):
    status: str
    llm_available: bool
    neo4j_available: bool
    genai_available: bool
    response_time_ms: int

@app.on_event("startup")
async def startup_event():
    global driver, openai_client
    
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        driver.verify_connectivity()
        print("✓ Neo4j connected")
    except Exception as e:
        print(f"⚠ Neo4j connection failed: {e}")
        driver = None
    
    if OPENAI_API_KEY:
        openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
        print("✓ OpenAI configured")
    else:
        print("⚠ OpenAI API key not set")

@app.on_event("shutdown")
async def shutdown_event():
    if driver:
        driver.close()

@app.get("/")
def read_root():
    return {"message": "Formulation Graph Studio API", "version": "1.0.0"}

@app.get("/api/health", response_model=ServiceHealthResponse)
async def check_health():
    start_time = datetime.now()
    
    llm_available = False
    neo4j_available = False
    genai_available = False
    
    if openai_client:
        try:
            openai_client.models.list()
            llm_available = True
        except:
            pass
    
    if driver:
        try:
            driver.verify_connectivity()
            neo4j_available = True
        except:
            pass
    
    execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
    
    status = "healthy" if (llm_available or neo4j_available) else "degraded"
    
    return ServiceHealthResponse(
        status=status,
        llm_available=llm_available,
        neo4j_available=neo4j_available,
        genai_available=genai_available and neo4j_available,
        response_time_ms=execution_time
    )

@app.post("/api/ai/query", response_model=AIQueryResponse)
async def process_ai_query(request: AIQueryRequest):
    start_time = datetime.now()
    
    mode = request.service_mode or "auto"
    
    if mode == "online" or mode == "auto":
        try:
            response = await process_online_query(request.query, request.include_graph)
            execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
            response.execution_time_ms = execution_time
            response.mode = "online"
            return response
        except Exception as e:
            if mode == "online":
                raise HTTPException(status_code=503, detail=f"AI service unavailable: {str(e)}")
            
            response = await process_offline_query(request.query)
            execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
            response.execution_time_ms = execution_time
            response.mode = "offline"
            return response
    
    else:
        response = await process_offline_query(request.query)
        execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
        response.execution_time_ms = execution_time
        response.mode = "offline"
        return response

async def process_online_query(query: str, include_graph: bool) -> AIQueryResponse:
    if not openai_client:
        raise Exception("OpenAI client not configured")
    
    cypher_query = None
    node_highlights = []
    relationship_summaries = []
    graph_data = ""
    
    if include_graph and driver:
        try:
            cypher_query = await generate_cypher_query(query)
            
            with driver.session(database=NEO4J_DATABASE) as session:
                result = session.run(cypher_query)
                records = list(result)
                
                nodes_dict = {}
                relationships = []
                
                for record in records:
                    for value in record.values():
                        if hasattr(value, 'labels'):
                            node_id = value.id
                            nodes_dict[node_id] = {
                                "id": node_id,
                                "type": list(value.labels)[0] if value.labels else "Unknown",
                                "name": value.get("name", value.get("id", str(node_id))),
                                "properties": dict(value)
                            }
                        elif hasattr(value, 'type'):
                            relationships.append({
                                "type": value.type,
                                "source": value.start_node.id,
                                "target": value.end_node.id
                            })
                
                nodes = list(nodes_dict.values())
                node_highlights = nodes[:10]
                
                rel_counts = {}
                for rel in relationships:
                    rel_type = rel["type"]
                    rel_counts[rel_type] = rel_counts.get(rel_type, 0) + 1
                
                for rel_type, count in rel_counts.items():
                    relationship_summaries.append({
                        "type": rel_type,
                        "count": count,
                        "description": f"Found {count} {rel_type} relationships"
                    })
                
                graph_data = f"\nGraph data: {len(nodes)} nodes, {len(relationships)} relationships found."
        
        except Exception as e:
            graph_data = f"\nNote: Graph query failed ({str(e)}), using formulation data only."
    
    prompt = f"""You are an AI assistant for a Food & Beverage formulation management system.

User Query: {query}
{graph_data}

Provide a clear, concise answer based on the available data. Be specific and quantitative when possible.
If you cannot answer with certainty, acknowledge the limitations."""

    completion = openai_client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a helpful F&B formulation expert."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=500
    )
    
    answer = completion.choices[0].message.content
    
    recommendations = await generate_recommendations(query, answer)
    
    return AIQueryResponse(
        answer=answer,
        mode="online",
        execution_time_ms=0,
        confidence=0.85,
        data_sources=["OpenAI GPT-4", "Neo4j Graph"] if cypher_query else ["OpenAI GPT-4"],
        cypher_query=cypher_query,
        node_highlights=node_highlights,
        relationship_summaries=relationship_summaries,
        recommendations=recommendations
    )

async def process_offline_query(query: str) -> AIQueryResponse:
    query_lower = query.lower()
    
    answer = "Offline mode: AI service is unavailable. "
    
    keywords = {
        "cost": "Cost analysis requires real-time data from the calculation engine.",
        "yield": "Yield information is available in the formulations view.",
        "ingredient": "Ingredient search is available in the formulation editor.",
        "recipe": "Recipe data can be viewed in the formulations list.",
        "nutrition": "Nutritional data requires connection to USDA FDC.",
    }
    
    for keyword, response in keywords.items():
        if keyword in query_lower:
            answer += response
            break
    else:
        answer += "Please try again when the AI service is available, or use the search and filter tools in the application."
    
    recommendations = [
        {
            "type": "general",
            "impact": "low",
            "description": "Use the formulations view to search and filter recipes manually",
            "actionable": True
        },
        {
            "type": "general",
            "impact": "low",
            "description": "Check service status in Settings to see when AI becomes available",
            "actionable": True
        }
    ]
    
    return AIQueryResponse(
        answer=answer,
        mode="offline",
        execution_time_ms=0,
        confidence=0.3,
        data_sources=["Local Cache"],
        recommendations=recommendations
    )

async def generate_cypher_query(natural_language: str) -> str:
    if not openai_client:
        raise Exception("OpenAI not configured")
    
    schema_context = """
Neo4j Schema:
- Nodes: Formulation, Food (ingredients), Nutrient, Process, Recipe, MasterRecipe, ManufacturingRecipe, Plant, SalesOrder
- Relationships: CONTAINS, USES_INGREDIENT, CONTAINS_NUTRIENT, REQUIRES_PROCESS, DERIVED_FROM, PRODUCES, REQUIRES
- Properties: name, id, percentage, cost, yield, efficiency
"""
    
    prompt = f"""Convert this natural language query to Cypher:

{schema_context}

Query: {natural_language}

Return only the Cypher query, no explanation."""

    completion = openai_client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a Neo4j Cypher expert."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=200
    )
    
    cypher = completion.choices[0].message.content.strip()
    
    if cypher.startswith("```"):
        cypher = cypher.split("```")[1]
        if cypher.startswith("cypher"):
            cypher = cypher[6:]
        cypher = cypher.strip()
    
    return cypher

async def generate_recommendations(query: str, answer: str) -> List[Dict[str, Any]]:
    if not openai_client:
        return []
    
    prompt = f"""Based on this query and answer, suggest 3-5 actionable recommendations:

Query: {query}
Answer: {answer}

Return recommendations as JSON array with format:
[{{"type": "cost_optimization|yield_improvement|substitution|process_optimization|quality_enhancement", "impact": "high|medium|low", "description": "...", "actionable": true}}]
"""

    try:
        completion = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=300
        )
        
        content = completion.choices[0].message.content
        recommendations = json.loads(content)
        return recommendations[:5]
    except:
        return []

class FormulationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    ingredients: List[Dict[str, Any]] = []

class FormulationResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    ingredients: List[Dict[str, Any]]
    total_percentage: float
    created_at: str

@app.post("/api/formulations", response_model=FormulationResponse)
async def create_formulation(formulation: FormulationCreate):
    total_percentage = sum(ing.get("percentage", 0) for ing in formulation.ingredients)
    
    formulation_data = {
        "id": f"form_{int(datetime.now().timestamp())}",
        "name": formulation.name,
        "description": formulation.description,
        "ingredients": formulation.ingredients,
        "total_percentage": total_percentage,
        "created_at": datetime.now().isoformat()
    }
    
    return FormulationResponse(**formulation_data)

@app.get("/api/formulations")
async def list_formulations():
    return {"formulations": [], "message": "Connect to Neo4j to load formulations"}

class CalculationRequest(BaseModel):
    formulation_id: str
    batch_size: float
    unit: str = "kg"

class CalculationResponse(BaseModel):
    formulation_id: str
    batch_size: float
    unit: str
    scaled_ingredients: List[Dict[str, Any]]
    total_cost: float
    cost_per_unit: float
    yield_percentage: float

@app.post("/api/calculations/scale", response_model=CalculationResponse)
async def calculate_scale(calc_request: CalculationRequest):
    scaled_ingredients = []
    total_cost = 100.0
    
    return CalculationResponse(
        formulation_id=calc_request.formulation_id,
        batch_size=calc_request.batch_size,
        unit=calc_request.unit,
        scaled_ingredients=scaled_ingredients,
        total_cost=total_cost,
        cost_per_unit=total_cost / calc_request.batch_size,
        yield_percentage=95.0
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
