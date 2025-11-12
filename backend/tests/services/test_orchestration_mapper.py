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
            "ingredients": [
                {
                    "id": "ing_cornmeal",
                    "name": "Corn Meal",
                    "percentage": 70.0,
                    "costPerKg": 0.52,
                },
                {
                    "id": "ing_cane_sugar",
                    "name": "Cane Sugar",
                    "percentage": 25.0,
                    "costPerKg": 0.9,
                },
                {
                    "id": "ing_sea_salt",
                    "name": "Sea Salt",
                    "percentage": 5.0,
                    "costPerKg": 0.3,
                },
            ],
            "metadata": {
                "createdAt": "2025-01-01T00:00:00Z",
                "version": "v2",
                "brand": "Aurora Foods",
                "category": "Cereal",
            },
        },
        calculation={
            "recipeId": "recipe-001",
            "targetBatchSize": 1000,
            "targetUnit": "kg",
            "scaledIngredients": [
                {"id": "ing_cornmeal", "quantity": 700.0, "unit": "kg"},
                {"id": "ing_cane_sugar", "quantity": 250.0, "unit": "kg"},
                {"id": "ing_sea_salt", "quantity": 50.0, "unit": "kg"},
            ],
            "timestamp": "2025-01-01T00:00:00Z",
        },
        graph={
            "nodes": [
                {"id": "form_aurora_cornflakes", "labels": ["Formulation"], "properties": {"name": "Corn Flakes Base"}},
                {"id": "form_aurora_cornflakes_v1", "labels": ["FormulationVersion"], "properties": {"version": "1.0"}},
                {"id": "ing_cornmeal", "labels": ["Ingredient"], "properties": {"name": "Corn Meal"}},
                {"id": "food_cornmeal", "labels": ["Food"], "properties": {"description": "Yellow Corn Meal"}},
                {"id": "step_mix", "labels": ["ProcessStep"], "properties": {"sequence": 1}},
                {"id": "param_temp", "labels": ["Parameter"], "properties": {"name": "Cooking Temperature"}},
                {"id": "bom_polybag", "labels": ["BOMComponent"], "properties": {"name": "Poly Bag 500g"}},
                {"id": "supplier_packaging", "labels": ["Supplier"], "properties": {"name": "Packaging World Inc."}},
                {"id": "chunk_cf_v1_ops", "labels": ["KnowledgeChunk"], "properties": {"formulation_id": "form_aurora_cornflakes"}},
            ],
            "edges": [
                {"source": "form_aurora_cornflakes", "target": "form_aurora_cornflakes_v1", "type": "HAS_VERSION"},
                {"source": "form_aurora_cornflakes_v1", "target": "ing_cornmeal", "type": "CONTAINS_INGREDIENT"},
                {"source": "ing_cornmeal", "target": "food_cornmeal", "type": "DERIVED_FROM"},
                {"source": "form_aurora_cornflakes_v1", "target": "step_mix", "type": "HAS_STEP"},
                {"source": "step_mix", "target": "param_temp", "type": "HAS_PARAMETER"},
                {"source": "form_aurora_cornflakes_v1", "target": "bom_polybag", "type": "HAS_BOM_ITEM"},
                {"source": "bom_polybag", "target": "supplier_packaging", "type": "PURCHASED_FROM"},
                {"source": "form_aurora_cornflakes_v1", "target": "chunk_cf_v1_ops", "type": "LINKED_CHUNK"},
            ],
            "metadata": {"graphComplexity": "medium"},
            "cypherCommands": [
                "MERGE (f:Formulation {id: 'form_aurora_cornflakes'})",
                "MERGE (v:FormulationVersion {id: 'form_aurora_cornflakes_v1'})",
                "MERGE (f)-[:HAS_VERSION]->(v)",
            ],
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


def test_map_orchestration_payload_to_graph_write_set_includes_graph_counts():
    payload = _build_payload()
    write_set = map_orchestration_payload_to_graph_write_set(payload)

    metadata = write_set.graph_snapshot["metadata"]
    assert metadata["nodeCount"] == 9
    assert metadata["edgeCount"] == 8
    assert metadata["graphComplexity"] == "medium"
    assert metadata["cypherCommandsBytes"] > 0

    recipe_metadata = write_set.recipe_version["metadata"]
    assert recipe_metadata["ingredientsCount"] == 3
    assert recipe_metadata["brand"] == "Aurora Foods"
