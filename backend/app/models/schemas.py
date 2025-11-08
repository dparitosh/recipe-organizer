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


class AICompletionRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Prompt passed to the language model")
    system_prompt: Optional[str] = Field(default=None, description="Optional system level instructions")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=800, ge=1, le=4096)


class AICompletionResponse(BaseModel):
    completion: str
    model: str
    duration_ms: int

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


class GraphNodeTypeConfig(BaseModel):
    type: str
    label: Optional[str] = None
    color: Optional[str] = None
    shape: Optional[str] = None
    icon: Optional[str] = None
    size: Optional[int] = None
    defaults: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GraphRelationshipTypeConfig(BaseModel):
    type: str
    label: Optional[str] = None
    color: Optional[str] = None
    style: Optional[str] = None
    width: Optional[float] = None
    target_arrow: Optional[str] = None
    source_arrow: Optional[str] = None
    defaults: Dict[str, Any] = Field(default_factory=dict)
    allowed_source_types: List[str] = Field(default_factory=list)
    allowed_target_types: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GraphSchemaResponse(BaseModel):
    name: str
    version: Optional[str] = None
    description: Optional[str] = None
    node_types: List[GraphNodeTypeConfig]
    relationship_types: List[GraphRelationshipTypeConfig]
    defaults: Dict[str, Any] = Field(default_factory=dict)
    last_updated: Optional[str] = None


class GraphSchemaUpsertRequest(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    description: Optional[str] = None
    node_types: List[GraphNodeTypeConfig] = Field(default_factory=list)
    relationship_types: List[GraphRelationshipTypeConfig] = Field(default_factory=list)
    defaults: Dict[str, Any] = Field(default_factory=dict)

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


class FDCSearchRequest(BaseModel):
    api_key: Optional[str] = Field(default=None, description="FDC API key override")
    query: str = Field(..., min_length=1, max_length=200, description="Search term")
    page_size: int = Field(default=25, ge=1, le=200)
    page_number: int = Field(default=1, ge=1)
    data_types: Optional[List[str]] = None
    sort_by: Optional[str] = None
    sort_order: Optional[Literal["asc", "desc"]] = None


class FDCDetailsRequest(BaseModel):
    api_key: Optional[str] = Field(default=None, description="FDC API key override")


class FDCIngestRequest(BaseModel):
    api_key: Optional[str] = Field(default=None, description="FDC API key override")
    fdc_ids: List[int] = Field(..., min_length=1, description="FDC identifiers to ingest")


class FDCQuickIngestRequest(BaseModel):
    api_key: Optional[str] = Field(default=None, description="FDC API key override")
    search_term: str = Field(..., min_length=1, max_length=100)
    count: int = Field(default=20, ge=1, le=200)
    data_types: Optional[List[str]] = None


class FDCIngestFailure(BaseModel):
    fdc_id: int
    message: str


class FDCIngestSummary(BaseModel):
    foods_processed: int
    foods_ingested: int
    nutrients_linked: int
    categories_linked: int
    neo4j_nodes_created: int
    neo4j_relationships_created: int
    neo4j_properties_set: int


class FDCIngestResponse(BaseModel):
    success_count: int
    failure_count: int
    failures: List[FDCIngestFailure]
    summary: FDCIngestSummary
    duration_ms: int
