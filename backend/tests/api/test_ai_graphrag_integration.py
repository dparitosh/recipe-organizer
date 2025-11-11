import json
import sys
import types
from pathlib import Path
from typing import Any, Dict, List

import pytest
from starlette.requests import Request
from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.api.endpoints.ai import (
    _summarize_chunk_context,
    _build_node_highlights_from_structured,
    _build_relationship_summaries_from_structured,
    process_online_query,
)
from app.services.graphrag_retrieval import (
    HybridRetrievalResult,
    RetrievalChunk,
    StructuredEntityContext,
    StructuredRelationship,
)


class StubOllamaService:
    def __init__(self) -> None:
        self.answer_calls: List[Dict[str, Any]] = []

    async def generate_answer(self, query: str, context: str, data_sources: List[str]) -> str:
        self.answer_calls.append({"query": query, "context": context, "data_sources": list(data_sources)})
        return "answer"

    async def generate_recommendations(self, query: str, answer: str) -> List[Dict[str, Any]]:
        return [
            {
                "type": "general",
                "impact": "medium",
                "description": "stub recommendation",
                "actionable": True,
            }
        ]

    async def generate_cypher_query(self, query: str) -> str:
        raise AssertionError("Cypher generation should not be called when GraphRAG context is available")


class StubRetrievalService:
    def __init__(self) -> None:
        self.requests: List[Dict[str, Any]] = []

    def retrieve(self, query: str, limit: int, structured_limit: int) -> HybridRetrievalResult:
        self.requests.append({"query": query, "limit": limit, "structured_limit": structured_limit})
        chunk_payload = {"id": "form:1", "name": "Formulation A", "status": "approved"}
        chunk = RetrievalChunk(
            chunk_id="formulations::0001",
            score=0.88,
            content=json.dumps(chunk_payload),
            metadata={"id": "form:1", "status": "approved"},
            source_id="formulations",
            source_type="structured",
        )

        structured_entity = StructuredEntityContext(
            node={
                "properties": {"id": "form:1", "name": "Formulation A"},
                "labels": ["Formulation"],
            },
            relationships=[
                StructuredRelationship(
                    type="CONTAINS",
                    direction="OUT",
                    target={"properties": {"id": "ingredient:1", "name": "Salt"}, "labels": ["Ingredient"]},
                    properties={"percentage": 5.0},
                )
            ],
        )

        return HybridRetrievalResult(
            query=query,
            chunks=[chunk],
            structured_entities=[structured_entity],
        )


def _make_request(ollama_service: StubOllamaService, retrieval_service: StubRetrievalService) -> Request:
    async def receive() -> Dict[str, Any]:
        return {"type": "http.request"}

    scope: Dict[str, Any] = {
        "type": "http",
        "method": "POST",
        "path": "/api/ai/query",
        "headers": [],
    }

    state = types.SimpleNamespace(
        ollama_service=ollama_service,
        neo4j_client=None,
        graphrag_retrieval_service=retrieval_service,
    )
    scope["app"] = types.SimpleNamespace(state=state)

    return Request(scope, receive)


def test_summarize_chunk_context_includes_metadata_and_content() -> None:
    chunk = RetrievalChunk(
        chunk_id="docs::0001",
        score=0.5,
        content="A" * 600,
        metadata={"id": "doc:1", "title": "Sample Doc", "chunk_index": 1},
        source_id="docs",
        source_type="unstructured",
    )

    summary = _summarize_chunk_context([chunk], max_chars=300)
    assert "docs::0001" in summary
    assert "title=Sample Doc" in summary
    assert summary.endswith("...")


def test_structured_helpers_build_highlights_and_relationships() -> None:
    entity = StructuredEntityContext(
        node={"properties": {"id": "form:1", "name": "Formulation A"}, "labels": ["Formulation"]},
        relationships=[
            StructuredRelationship(
                type="USES",
                direction="OUT",
                target={"properties": {"id": "ingredient:1", "name": "Salt"}, "labels": ["Ingredient"]},
                properties={},
            )
        ],
    )

    highlights = _build_node_highlights_from_structured([entity])
    assert highlights[0].id == "form:1"
    assert highlights[0].type == "Formulation"

    summaries = _build_relationship_summaries_from_structured([entity])
    assert summaries[0].type == "USES"
    assert summaries[0].count == 1
    assert summaries[0].examples[0]["target"] == "Salt"


@pytest.mark.parametrize(
    "prompt",
    [
        "recommended salt levels",
        "optimize ingredient cost for salsa",
    ],
)
@pytest.mark.anyio("asyncio")
async def test_process_online_query_with_graphrag_context(prompt: str) -> None:
    ollama_service = StubOllamaService()
    retrieval_service = StubRetrievalService()
    request = _make_request(ollama_service, retrieval_service)

    response = await process_online_query(prompt, include_graph=True, request=request)

    assert response.answer == "answer"
    assert response.cypher_query is None
    assert response.node_highlights and response.node_highlights[0].name == "Formulation A"
    assert response.relationship_summaries[0].type == "CONTAINS"
    assert "GraphRAG Knowledge Base" in response.data_sources

    recorded_context = ollama_service.answer_calls[0]["context"]
    assert "GraphRAG knowledge chunks" in recorded_context
    assert "Structured graph context" in recorded_context
    assert ollama_service.answer_calls[0]["query"] == prompt


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


def build_test_client() -> tuple[TestClient, StubOllamaService, StubRetrievalService]:
    app = FastAPI()
    from app.api.endpoints.ai import router as ai_router  # local import to avoid circulars at module import

    app.include_router(ai_router, prefix="/api/ai")

    ollama_service = StubOllamaService()
    retrieval_service = StubRetrievalService()

    app.state.ollama_service = ollama_service
    app.state.neo4j_client = None
    app.state.graphrag_retrieval_service = retrieval_service

    client = TestClient(app)
    return client, ollama_service, retrieval_service


@pytest.mark.parametrize(
    "prompt",
    [
        "recommended salt levels",
        "optimize ingredient cost for salsa",
    ],
)
def test_ai_query_endpoint_handles_prompts(prompt: str) -> None:
    client, ollama_service, retrieval_service = build_test_client()

    response = client.post(
        "/api/ai/query",
        json={"query": prompt, "service_mode": "online", "include_graph": True},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["answer"] == "answer"
    assert payload["mode"] == "online"
    assert "GraphRAG Knowledge Base" in payload["data_sources"]
    assert ollama_service.answer_calls[-1]["query"] == prompt
    assert retrieval_service.requests[-1]["query"] == prompt


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"