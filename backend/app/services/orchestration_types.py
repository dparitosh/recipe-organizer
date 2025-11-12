from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass
class GraphWriteSet:
    run: Dict[str, Any]
    user_request: Dict[str, Any]
    recipe_version: Dict[str, Any]
    calculation: Dict[str, Any]
    graph_snapshot: Dict[str, Any]
    graph_nodes: List[Dict[str, Any]]
    graph_edges: List[Dict[str, Any]]
    validation: Dict[str, Any]
    ui_config: Dict[str, Any]
    agent_invocations: List[Dict[str, Any]]


@dataclass
class PersistenceSummary:
    run_id: str
    nodes_created: int
    relationships_created: int
    properties_set: int
