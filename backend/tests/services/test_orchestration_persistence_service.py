import sys
from pathlib import Path

import pytest
from neo4j.exceptions import ServiceUnavailable, TransientError

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.orchestration_persistence_service import OrchestrationPersistenceService  # type: ignore[import]
from app.services.orchestration_types import GraphWriteSet  # type: ignore[import]


class DummyNeo4jClient:
    def __init__(self, results):
        self.results = results
        self.driver = object()
        self.calls = 0

    def execute_write(self, query, parameters):  # pragma: no cover - simple stub
        self.calls += 1
        result = self.results.pop(0)
        if isinstance(result, Exception):
            raise result
        return result


def _build_write_set():
    return GraphWriteSet(
        run={"runId": "test-run", "status": "success", "totalDuration": 123, "timestamp": "2025-01-01T00:00:00Z", "configSnapshot": {"nested": {"value": 1}}},
        user_request={"requestId": "req", "payload": "Make a beverage", "createdAt": "2025-01-01T00:00:00Z"},
        recipe_version={"recipeId": "recipe", "name": "Recipe", "version": "v1", "totalPercentage": 100, "metadata": {"key": "value"}, "createdAt": "2025-01-01T00:00:00Z"},
        calculation={"calculationId": "calc", "payload": {"list": [1, 2, 3]}, "createdAt": "2025-01-01T00:00:00Z"},
        graph_snapshot={"graphId": "graph", "metadata": {"nodeCount": 2}, "checksum": "abc", "blobUri": None, "createdAt": "2025-01-01T00:00:00Z"},
        graph_nodes=[
            {
                "id": "formulation-RT001",
                "label": "Recipe",
                "type": "formulation",
                "properties": {"totalPercentage": 100, "metadata": {"version": "v1"}},
            }
        ],
        graph_edges=[
            {
                "id": "edge-formulation-RT001-ingredient-ING001",
                "edgeId": "edge-formulation-RT001-ingredient-ING001",
                "source": "formulation-RT001",
                "target": "ingredient-ING001",
                "type": "CONTAINS",
                "properties": {"percentage": 60},
            }
        ],
        validation={"validationId": "validation", "payload": {"valid": True}, "createdAt": "2025-01-01T00:00:00Z", "valid": True},
        ui_config={"uiConfigId": "ui", "payload": {"layout": "grid"}, "createdAt": "2025-01-01T00:00:00Z"},
        agent_invocations=[],
    )


def test_persistence_service_retries_transient_errors(monkeypatch):
    # eliminate actual sleeping for faster tests
    monkeypatch.setattr("time.sleep", lambda _: None)

    client = DummyNeo4jClient([
        TransientError("Neo.TransientError.Transaction.DeadlockDetected", "deadlock"),
        {"nodes_created": 2, "relationships_created": 1, "properties_set": 5},
    ])
    service = OrchestrationPersistenceService(client, max_retries=2, backoff_seconds=0.1)

    summary = service.persist_run(_build_write_set())

    assert summary.run_id == "test-run"
    assert summary.nodes_created == 2
    assert client.calls == 2


def test_persistence_service_raises_when_retries_exhausted(monkeypatch):
    monkeypatch.setattr("time.sleep", lambda _: None)

    client = DummyNeo4jClient([
        ServiceUnavailable("unavailable"),
        ServiceUnavailable("still unavailable"),
        ServiceUnavailable("nope"),
    ])
    service = OrchestrationPersistenceService(client, max_retries=2, backoff_seconds=0.1)

    with pytest.raises(ServiceUnavailable):
        service.persist_run(_build_write_set())

    assert client.calls == 3


def test_snapshot_parameters_are_neo4j_safe():
    client = DummyNeo4jClient([
        {"nodes_created": 0, "relationships_created": 0, "properties_set": 0},
    ])
    service = OrchestrationPersistenceService(client)

    write_set = _build_write_set()
    params = service._snapshot_to_parameters(write_set)

    assert isinstance(params["run"]["configSnapshot"], str)
    assert isinstance(params["recipeVersion"]["metadata"], str)
    assert isinstance(params["calculation"]["payload"], str)
    assert isinstance(params["graphSnapshot"]["metadata"], str)
    assert isinstance(params["graphNodes"], list)
    assert params["graphNodes"][0]["id"] == "formulation-RT001"
    assert isinstance(params["graphEdges"], list)
    assert params["graphEdges"][0]["source"] == "formulation-RT001"
    assert isinstance(params["validation"]["payload"], str)
    assert isinstance(params["uiConfig"]["payload"], str)