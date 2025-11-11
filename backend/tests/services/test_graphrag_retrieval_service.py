import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Sequence

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.graphrag_retrieval import GraphRAGRetrievalError, GraphRAGRetrievalService


class StubEmbeddingClient:
    def __init__(self) -> None:
        self.requests: List[Sequence[str]] = []

    def embed_texts(self, texts: Sequence[str]) -> Sequence[Sequence[float]]:
        self.requests.append(tuple(texts))
        return [[float(index) for index in range(4)]]


class StubNeo4jClient:
    def __init__(self, *, chunk_content: str | None = None) -> None:
        self.calls: List[Dict[str, Any]] = []
        self.chunk_content = chunk_content

    def execute_query(self, query: str, parameters: Dict[str, Any] | None = None) -> List[Dict[str, Any]]:
        self.calls.append({"query": query, "parameters": parameters or {}})

        if "db.index.vector.queryNodes" in query:
            content_value = self.chunk_content
            if content_value is None:
                content_value = json.dumps({"id": "form:1", "name": "Formulation A"})
            return [
                {
                    "node": {
                        "properties": {
                            "chunk_id": "formulations::0001",
                            "content": content_value,
                            "metadata_json": json.dumps({
                                "id": "form:1",
                                "status": "approved",
                                "source": "formulations",
                            }),
                        },
                        "labels": ["KnowledgeChunk"],
                    },
                    "source": {
                        "properties": {
                            "id": "formulations",
                            "type": "structured",
                            "description": "Formulation knowledge chunks",
                        }
                    },
                    "score": 0.42,
                }
            ]

        if query.strip().startswith("MATCH (n)\n        WHERE n.id IN $entity_ids"):
            return [
                {
                    "n": {
                        "properties": {"id": "form:1", "name": "Formulation A"},
                        "labels": ["Formulation"],
                    }
                }
            ]

        if "MATCH (n)-[r]->(m)" in query:
            return [
                {
                    "source_id": "form:1",
                    "r": {
                        "type": "CONTAINS",
                        "properties": {"percentage": 5.0},
                    },
                    "m": {
                        "properties": {"id": "ingredient:1", "name": "Salt"},
                        "labels": ["Ingredient"],
                    },
                }
            ]

        return []


def test_retrieve_hybrid_context_combines_vector_and_structured_results() -> None:
    service = GraphRAGRetrievalService(
        neo4j_client=StubNeo4jClient(),
        embedding_client=StubEmbeddingClient(),
        chunk_index_name="knowledge_chunks",
    )

    result = service.retrieve("recommended salt levels", limit=3, structured_limit=10)

    assert result.query == "recommended salt levels"
    assert len(result.chunks) == 1

    chunk = result.chunks[0]
    assert chunk.chunk_id == "formulations::0001"
    assert chunk.metadata["id"] == "form:1"
    assert chunk.source_id == "formulations"
    assert chunk.source_type == "structured"

    structured = result.structured_entities
    assert len(structured) == 1

    entity = structured[0]
    assert entity.node["properties"]["name"] == "Formulation A"
    assert entity.relationships, "Expected at least one structured relationship"
    rel = entity.relationships[0]
    assert rel.type == "CONTAINS"
    assert rel.target["properties"]["name"] == "Salt"


def test_retrieve_rejects_empty_query() -> None:
    service = GraphRAGRetrievalService(
        neo4j_client=StubNeo4jClient(),
        embedding_client=StubEmbeddingClient(),
        chunk_index_name="knowledge_chunks",
    )

    try:
        service.retrieve("   ")
        raise AssertionError("Expected GraphRAGRetrievalError for empty query")
    except GraphRAGRetrievalError:
        pass


def test_retrieve_uses_cache_when_available() -> None:
    embedding_client = StubEmbeddingClient()
    service = GraphRAGRetrievalService(
        neo4j_client=StubNeo4jClient(),
        embedding_client=embedding_client,
        chunk_index_name="knowledge_chunks",
        cache_max_entries=8,
    )

    result_first = service.retrieve("recommended salt levels")
    assert len(embedding_client.requests) == 1

    result_second = service.retrieve("recommended salt levels")
    assert len(embedding_client.requests) == 1
    assert result_second.query == result_first.query
    assert result_second.chunks[0].chunk_id == result_first.chunks[0].chunk_id


def test_retrieve_cache_respects_ttl_expiry() -> None:
    embedding_client = StubEmbeddingClient()
    service = GraphRAGRetrievalService(
        neo4j_client=StubNeo4jClient(),
        embedding_client=embedding_client,
        chunk_index_name="knowledge_chunks",
        cache_max_entries=8,
        cache_ttl_seconds=0.01,
    )

    service.retrieve("recommended salt levels")
    assert len(embedding_client.requests) == 1

    cache_key = "recommended salt levels"
    timestamp, cached_result = service._cache[cache_key]
    service._cache[cache_key] = (timestamp - 10.0, cached_result)

    service.retrieve("recommended salt levels")
    assert len(embedding_client.requests) == 2


def test_vector_search_truncates_chunk_content_to_limit() -> None:
    long_content = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" * 10
    service = GraphRAGRetrievalService(
        neo4j_client=StubNeo4jClient(chunk_content=long_content),
        embedding_client=StubEmbeddingClient(),
        chunk_index_name="knowledge_chunks",
        chunk_content_truncate_chars=32,
    )

    result = service.retrieve("recommended salt levels")
    chunk = result.chunks[0]
    assert len(chunk.content) <= 32
    assert chunk.content.endswith("..."), chunk.content


def test_vector_search_preserves_json_content_without_truncation() -> None:
    json_content = json.dumps({"id": "form:1", "name": "Formulation A", "notes": "x" * 200})
    service = GraphRAGRetrievalService(
        neo4j_client=StubNeo4jClient(chunk_content=json_content),
        embedding_client=StubEmbeddingClient(),
        chunk_index_name="knowledge_chunks",
        chunk_content_truncate_chars=32,
    )

    result = service.retrieve("recommended salt levels")
    chunk = result.chunks[0]
    assert chunk.content == json_content