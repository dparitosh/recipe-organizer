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
