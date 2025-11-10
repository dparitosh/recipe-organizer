import copy
import sys
from importlib import import_module
from pathlib import Path
from typing import Any, Dict, List, Optional

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

formulations = import_module("app.api.endpoints.formulations")


class FakeNeo4jClient:
    """In-memory stand-in for the Neo4j client used by the formulations API."""

    def __init__(self, initial_formulations: Optional[List[Dict[str, Any]]] = None):
        self.formulations: Dict[str, Dict[str, Any]] = {}
        self.captured_queries: List[Dict[str, Any]] = []

        initial_formulations = initial_formulations or []
        for item in initial_formulations:
            node = {
                "id": item["id"],
                "name": item["name"],
                "description": item.get("description"),
                "status": item.get("status", "draft"),
                "created_at": item.get("created_at", "2025-11-10T00:00:00"),
                "updated_at": item.get("updated_at"),
            }
            self.formulations[item["id"]] = {
                "node": node,
                "ingredients": copy.deepcopy(item.get("ingredients", [])),
            }

    def __bool__(self) -> bool:  # pragma: no cover - ensure truthiness in the route guard
        return True

    def execute_query(self, query: str, parameters: Optional[Dict[str, Any]] = None):
        params = parameters or {}
        self.captured_queries.append({"query": query, "params": params})

        if "RETURN f, collect" in query and "MATCH (f:Formulation {id: $id})" in query:
            formulation_id = params["id"]
            return self._return_single(formulation_id)

        if "SET f.name = $name" in query and "MATCH (f:Formulation {id: $id})" in query:
            return self._apply_update(params)

        if "DELETE rel" in query and "CONTAINS" in query:
            return self._remove_ingredients(params)

        if "MERGE (i:Food" in query and "CREATE (f)-[:CONTAINS" in query:
            return self._add_ingredient(params)

        if "DETACH DELETE" in query and "MATCH (f:Formulation {id: $id})" in query:
            return self._delete_formulation(params)

        return []

    # Internal helpers -------------------------------------------------
    def _return_single(self, formulation_id: str):
        stored = self.formulations.get(formulation_id)
        if not stored:
            return []

        ingredient_payload = [
            {
                "name": ing.get("name"),
                "percentage": ing.get("percentage", 0.0),
                "cost_per_kg": ing.get("cost_per_kg", 0.0),
                "function": ing.get("function", "unspecified"),
            }
            for ing in stored["ingredients"]
        ]

        return [{"f": stored["node"], "ingredients": ingredient_payload}]

    def _apply_update(self, params: Dict[str, Any]):
        formulation_id = params["id"]
        stored = self.formulations.get(formulation_id)
        if not stored:
            return []

        stored["node"]["name"] = params.get("name")
        stored["node"]["description"] = params.get("description")
        stored["node"]["status"] = params.get("status")
        stored["node"]["updated_at"] = params.get("updated_at")
        return [{"f": stored["node"]}]

    def _remove_ingredients(self, params: Dict[str, Any]):
        formulation_id = params["id"]
        stored = self.formulations.get(formulation_id)
        if stored:
            stored["ingredients"] = []
        return []

    def _add_ingredient(self, params: Dict[str, Any]):
        formulation_id = params["form_id"]
        stored = self.formulations.get(formulation_id)
        if not stored:
            return []

        stored["ingredients"].append(
            {
                "name": params.get("name"),
                "percentage": params.get("percentage", 0.0),
                "cost_per_kg": params.get("cost_per_kg", 0.0),
                "function": params.get("function", "unspecified"),
            }
        )
        return []

    def _delete_formulation(self, params: Dict[str, Any]):
        formulation_id = params["id"]
        self.formulations.pop(formulation_id, None)
        return []


def build_test_app(fake_client: FakeNeo4jClient) -> FastAPI:
    app = FastAPI()
    app.include_router(formulations.router, prefix="/formulations")
    app.state.neo4j_client = fake_client
    return app


@pytest.fixture(name="default_formulation")
def _default_formulation_fixture() -> Dict[str, Any]:
    return {
        "id": "form-123",
        "name": "Prototype Smoothie",
        "description": "Balanced breakfast option",
        "status": "draft",
        "created_at": "2025-11-10T00:00:00",
        "updated_at": None,
        "ingredients": [
            {
                "name": "Water",
                "percentage": 60.0,
                "cost_per_kg": 0.0,
                "function": "base",
            },
            {
                "name": "Sugar",
                "percentage": 40.0,
                "cost_per_kg": 1.5,
                "function": "sweetener",
            },
        ],
    }

@pytest.fixture(name="fake_neo4j_client")
def _fake_neo4j_client_fixture(default_formulation: Dict[str, Any]) -> FakeNeo4jClient:
    return FakeNeo4jClient([default_formulation])


@pytest.fixture(name="api_client")
def _api_client_fixture(fake_neo4j_client: FakeNeo4jClient):
    app = build_test_app(fake_neo4j_client)
    with TestClient(app) as client:
        yield client


def test_update_formulation_replaces_ingredients_and_updates_metadata(api_client, fake_neo4j_client):
    payload = {
        "name": "Updated Smoothie",
        "status": "review",
        "ingredients": [
            {
                "name": "Banana",
                "percentage": 60.0,
                "cost_per_kg": 2.5,
                "function": "fruit",
            },
            {
                "name": "Protein Powder",
                "percentage": 40.0,
                "cost_per_kg": 5.0,
                "function": "protein",
            },
        ],
    }

    response = api_client.put("/formulations/form-123", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Updated Smoothie"
    assert body["status"] == "review"
    assert pytest.approx(body["total_percentage"], rel=1e-3) == 100.0
    returned_names = {item["name"] for item in body["ingredients"]}
    assert returned_names == {"Banana", "Protein Powder"}
    assert fake_neo4j_client.formulations["form-123"]["node"]["name"] == "Updated Smoothie"
    assert fake_neo4j_client.formulations["form-123"]["ingredients"][0]["name"] == "Banana"
    assert fake_neo4j_client.formulations["form-123"]["node"]["updated_at"] is not None


def test_update_formulation_requires_percentages_to_sum_to_100(api_client, fake_neo4j_client):
    payload = {
        "ingredients": [
            {"name": "Water", "percentage": 70.0},
            {"name": "Sugar", "percentage": 20.0},
        ]
    }

    response = api_client.put("/formulations/form-123", json=payload)

    assert response.status_code == 400
    assert "must sum to 100" in response.json()["detail"]
    ingredients = fake_neo4j_client.formulations["form-123"]["ingredients"]
    assert len(ingredients) == 2
    assert {ing["name"] for ing in ingredients} == {"Water", "Sugar"}


def test_delete_formulation_removes_node(api_client, fake_neo4j_client):
    response = api_client.delete("/formulations/form-123")

    assert response.status_code == 200
    assert response.json()["detail"] == "Formulation form-123 deleted"
    assert "form-123" not in fake_neo4j_client.formulations

    follow_up = api_client.get("/formulations/form-123")
    assert follow_up.status_code == 404