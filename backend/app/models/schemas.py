from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime

class AIServiceConfig(BaseModel):
    mode: Literal["online", "offline", "auto"] = Field(default="auto", description="AI service operation mode")
    auto_fallback: bool = Field(default=True, description="Enable automatic fallback to offline mode")
    retry_attempts: int = Field(default=3, ge=1, le=10, description="Number of retry attempts for AI service")
    timeout_seconds: int = Field(default=30, ge=5, le=120, description="Timeout for AI service calls")

class AIQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000, description="Natural language query")
    service_mode: Optional[str] = Field(default="auto", description="Service mode: online, offline, or auto")
    include_graph: bool = Field(default=True, description="Include graph database data in query processing")

class NodeHighlight(BaseModel):
    id: str
    type: str
    name: str
    properties: Dict[str, Any] = {}
    relevance: Optional[float] = None

class RelationshipSummary(BaseModel):
    type: str
    count: int
    description: str
    examples: Optional[List[Dict[str, str]]] = None

class Recommendation(BaseModel):
    type: Literal["cost_optimization", "yield_improvement", "substitution", "process_optimization", "quality_enhancement", "general"]
    impact: Literal["high", "medium", "low"]
    description: str
    actionable: bool = True

class AIQueryResponse(BaseModel):
    answer: str
    mode: Literal["online", "offline"]
    execution_time_ms: int
    confidence: float = Field(ge=0.0, le=1.0)
    data_sources: List[str]
    cypher_query: Optional[str] = None
    node_highlights: List[NodeHighlight] = []
    relationship_summaries: List[RelationshipSummary] = []
    recommendations: List[Recommendation] = []

class ServiceHealthResponse(BaseModel):
    status: Literal["healthy", "degraded", "unavailable"]
    llm_available: bool
    neo4j_available: bool
    genai_available: bool
    response_time_ms: int
    ollama_model: Optional[str] = None

class IngredientInput(BaseModel):
    name: str
    percentage: float = Field(ge=0, le=100)
    cost_per_kg: Optional[float] = Field(default=None, ge=0)
    function: Optional[str] = None
    supplier: Optional[str] = None

class FormulationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    status: Literal["draft", "review", "approved", "archived"] = "draft"
    ingredients: List[IngredientInput] = []

class FormulationResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    ingredients: List[Dict[str, Any]]
    total_percentage: float
    created_at: str
    updated_at: Optional[str] = None

class FormulationListResponse(BaseModel):
    formulations: List[FormulationResponse]
    total_count: int

class CalculationRequest(BaseModel):
    formulation_id: str
    batch_size: float = Field(gt=0, description="Target batch size")
    unit: Literal["kg", "g", "L", "mL", "gal"] = "kg"
    include_costs: bool = True
    include_nutrition: bool = False

class ScaledIngredient(BaseModel):
    name: str
    original_percentage: float
    scaled_quantity: float
    unit: str
    cost: Optional[float] = None

class CalculationResponse(BaseModel):
    formulation_id: str
    formulation_name: str
    batch_size: float
    unit: str
    scaled_ingredients: List[ScaledIngredient]
    total_cost: Optional[float] = None
    cost_per_unit: Optional[float] = None
    yield_percentage: float = 95.0
    warnings: List[str] = []

class ProcessStep(BaseModel):
    name: str
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    temperature: Optional[float] = None
    equipment: Optional[str] = None
    yield_percentage: float = Field(default=100.0, ge=0, le=100)

class BOMComponent(BaseModel):
    name: str
    quantity: float = Field(gt=0)
    unit: str
    cost_per_unit: Optional[float] = None
    phase: Literal["procurement", "production", "packaging"] = "production"

class BOMCreate(BaseModel):
    formulation_id: str
    name: str
    components: List[BOMComponent] = []
    process_steps: List[ProcessStep] = []

class BOMResponse(BaseModel):
    id: str
    formulation_id: str
    name: str
    components: List[Dict[str, Any]]
    process_steps: List[Dict[str, Any]]
    overall_yield: float
    total_material_cost: Optional[float] = None
    total_processing_cost: Optional[float] = None
    created_at: str

class GraphDataResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    node_count: int
    edge_count: int

class SampleDataLoadRequest(BaseModel):
    clear_existing: bool = Field(default=True, description="Clear existing data before loading")
    datasets: List[Literal["potato_chips", "cola", "juices", "all"]] = Field(default=["all"])

class SampleDataLoadResponse(BaseModel):
    success: bool
    nodes_created: int
    relationships_created: int
    execution_time_ms: int
    datasets_loaded: List[str]
    message: str

class Neo4jConnectionTest(BaseModel):
    uri: str
    username: str
    password: str
    database: str = "neo4j"

class Neo4jConnectionTestResponse(BaseModel):
    success: bool
    message: str
    server_version: Optional[str] = None
