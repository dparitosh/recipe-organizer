from typing import Any, Dict, List, Optional, Literal
from pydantic import BaseModel, Field


class OrchestrationResultPayload(BaseModel):
    id: str
    status: Literal["success", "partial", "failed"]
    recipe: Dict[str, Any]
    calculation: Dict[str, Any]
    graph: Dict[str, Any]
    validation: Dict[str, Any]
    uiConfig: Dict[str, Any]
    agentHistory: List[Dict[str, Any]] = Field(default_factory=list)
    totalDuration: int
    timestamp: str


class OrchestrationPersistRequest(BaseModel):
    userRequest: str
    result: OrchestrationResultPayload
    requestId: Optional[str] = None
    requestTimestamp: Optional[str] = None
    targetBatchSize: Optional[float] = None
    targetUnit: Optional[str] = None
    includeNutrients: Optional[bool] = False
    includeCosts: Optional[bool] = True
    context: Dict[str, Any] = Field(default_factory=dict)
    configVersion: str = Field(default="v1")
    metadata: Dict[str, Any] = Field(default_factory=dict)


class OrchestrationPersistResponse(BaseModel):
    runId: str
    nodesCreated: int
    relationshipsCreated: int
    propertiesSet: int


class AgentInvocationDetail(BaseModel):
    """Details of a single agent invocation."""
    sequence: int
    agentName: str
    status: str
    duration: Optional[int] = None
    error: Optional[str] = None
    inputSnapshot: Optional[str] = None
    outputSnapshot: Optional[str] = None


class OrchestrationRunSummary(BaseModel):
    """Summary of an orchestration run for list view."""
    runId: str = Field(..., description="Unique run identifier")
    status: str = Field(..., description="Run status (success|partial|failed)")
    timestamp: str = Field(..., description="ISO8601 timestamp")
    totalDuration: Optional[int] = Field(None, description="Total duration in milliseconds")
    recipeName: Optional[str] = Field(None, description="Recipe name if available")
    agentCount: int = Field(0, description="Total number of agents invoked")
    successCount: int = Field(0, description="Number of successful agents")

    class Config:
        schema_extra = {
            "example": {
                "runId": "550e8400-e29b-41d4-a716-446655440000",
                "status": "success",
                "timestamp": "2025-11-17T14:30:00Z",
                "totalDuration": 5420,
                "recipeName": "Sports Drink Formula v3",
                "agentCount": 5,
                "successCount": 5
            }
        }


class OrchestrationRunDetail(BaseModel):
    """Complete details of an orchestration run."""
    run: Dict[str, Any]
    recipe: Optional[Dict[str, Any]] = None
    calculation: Optional[Dict[str, Any]] = None
    graphSnapshot: Optional[Dict[str, Any]] = None
    validation: Optional[Dict[str, Any]] = None
    uiConfig: Optional[Dict[str, Any]] = None
    agents: List[AgentInvocationDetail] = Field(default_factory=list)
