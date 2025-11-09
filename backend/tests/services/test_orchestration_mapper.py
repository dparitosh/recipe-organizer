import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.models.orchestration import OrchestrationPersistRequest, OrchestrationResultPayload  # type: ignore[import]
from app.services.orchestration_mapper import map_orchestration_payload_to_graph_write_set  # type: ignore[import]


def _build_payload() -> OrchestrationPersistRequest:
    result = OrchestrationResultPayload(
        id="orch-123",
        status="success",
        recipe={
            "id": "recipe-001",
            "name": "Sample Beverage",
            "totalPercentage": 100,
            "ingredients": [],
            "metadata": {"createdAt": "2025-01-01T00:00:00Z", "version": "v2"},
        },
        calculation={
            "recipeId": "recipe-001",
            "targetBatchSize": 1000,
            "targetUnit": "kg",
            "scaledIngredients": [],
            "timestamp": "2025-01-01T00:00:00Z",
        },
        graph={
            "nodes": [],
            "edges": [],
            "metadata": {"graphComplexity": "low"},
            "cypherCommands": ["MERGE (:Recipe {id: 'recipe-001'})"],
        },
        validation={
            "valid": True,
            "timestamp": "2025-01-01T00:00:00Z",
            "errors": [],
            "warnings": [],
        },
        uiConfig={
            "layout": "single-column",
            "components": [],
            "timestamp": "2025-01-01T00:00:00Z",
        },
        agentHistory=[
            {
                "agent": "Recipe Engineer",
                "timestamp": "2025-01-01T00:00:00Z",
                "duration": 1200,
                "status": "success",
            }
        ],
        totalDuration=3500,
        timestamp="2025-01-01T00:00:00Z",
    )

    return OrchestrationPersistRequest(
        userRequest="Create a citrus sports drink",
        requestId="req-123",
        requestTimestamp="2025-01-01T00:00:00Z",
        targetBatchSize=1000,
        targetUnit="kg",
        includeCosts=True,
        includeNutrients=False,
        context={"densityMap": {"water": 1.0}, "costMap": {"salt": 2.5}},
        configVersion="v1",
        result=result,
    )


def test_map_orchestration_payload_to_graph_write_set_creates_expected_nodes():
    payload = _build_payload()
    write_set = map_orchestration_payload_to_graph_write_set(payload)

    assert write_set.run["runId"] == "orch-123"
    assert write_set.user_request["requestId"] == "req-123"
    assert write_set.recipe_version["recipeId"] == "recipe-001"
    assert write_set.calculation["calculationId"] == "orch-123-calculation"
    assert write_set.graph_snapshot["graphId"] == "orch-123-graph"
    assert write_set.validation["validationId"] == "orch-123-validation"
    assert write_set.ui_config["uiConfigId"] == "orch-123-ui"


def test_map_orchestration_payload_to_graph_write_set_summarizes_context_and_agents():
    payload = _build_payload()
    write_set = map_orchestration_payload_to_graph_write_set(payload)

    config_snapshot = write_set.run["configSnapshot"]
    assert config_snapshot["contextSummary"]["densityMap"] == {"water": 1.0}

    agent_invocations = write_set.agent_invocations
    assert len(agent_invocations) == 1
    assert agent_invocations[0]["sequence"] == 0
    assert agent_invocations[0]["agentName"] == "Recipe Engineer"
    assert agent_invocations[0]["status"] == "success"
    assert agent_invocations[0]["runId"] == "orch-123"
