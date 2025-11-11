import json
from pathlib import Path
from typing import Any, Dict, List, Sequence

from app.services.graphrag_ingestion import (
    GraphRAGIngestionService,
    build_structured_chunks,
    chunk_markdown_text,
    extract_metadata,
)


def test_extract_metadata_nested_structures() -> None:
    record = {
        "f": {"id": "form:123", "status": "approved"},
        "ingredients": [
            {"ingredient": {"name": "Salt"}, "rel": {"percentage": 1.0}},
            {"ingredient": {"name": "Oil"}, "rel": {"percentage": 5.0}},
        ],
    }

    metadata, missing = extract_metadata(record, ["id", "status", "updated_at"])

    assert metadata == {"id": "form:123", "status": "approved"}
    assert missing == ["updated_at"]


def test_build_structured_chunks_single_node() -> None:
    records = [
        {
            "f": {
                "id": "form:alpha",
                "name": "Alpha",
                "status": "approved",
            },
            "ingredients": [],
        }
    ]
    chunking_cfg = {"strategy": "single-node", "metadata_keys": ["id", "status"]}

    chunks, warnings = build_structured_chunks(
        "formulations",
        "structured",
        records,
        chunking_cfg,
        chunking_cfg["metadata_keys"],
    )

    assert warnings == []
    assert len(chunks) == 1

    chunk = chunks[0]
    assert chunk.chunk_id == "formulations::0001"
    assert chunk.metadata["id"] == "form:alpha"
    assert chunk.metadata["status"] == "approved"
    assert chunk.metadata["chunk_index"] == 1
    assert chunk.metadata["chunk_strategy"] == "single-node"


def test_chunk_markdown_text_sliding_window() -> None:
    text = "# Sample Doc\n\n" + " ".join(f"token{i}" for i in range(40))
    chunking_cfg = {
        "strategy": "sliding-window",
        "token_target": 10,
        "token_overlap": 5,
        "metadata_keys": ["heading", "breadcrumb"],
    }

    chunks = chunk_markdown_text(
        "playbooks",
        "unstructured",
        text,
        chunking_cfg,
        Path("docs/sample.md"),
        start_index=1,
    )

    assert len(chunks) >= 5

    first_chunk = chunks[0]
    assert first_chunk.chunk_id == "playbooks::0001"
    assert first_chunk.metadata["heading"] == "Sample Doc"
    assert first_chunk.metadata["breadcrumb"].startswith("Sample Doc")
    assert first_chunk.metadata["source_path"].endswith("docs\\sample.md") or first_chunk.metadata["source_path"].endswith("docs/sample.md")
    assert first_chunk.metadata["token_length"] == 10


def test_ingest_structured_source_persists_chunks_to_neo4j(tmp_path: Path) -> None:
    class StubNeo4jClient:
        def __init__(self) -> None:
            self.write_params: Dict[str, Any] | None = None

        def execute_query(self, query: str, parameters: Dict[str, Any] | None = None) -> List[Dict[str, Any]]:
            return [
                {
                    "f": {
                        "id": "form:test",
                        "name": "Test Formulation",
                        "status": "draft",
                    },
                    "ingredients": [],
                }
            ]

        def execute_write(self, query: str, parameters: Dict[str, Any] | None = None) -> Dict[str, int]:
            self.write_params = parameters or {}
            return {
                "nodes_created": 1,
                "relationships_created": 1,
                "properties_set": 4,
            }

    manifest = {
        "sources": [
            {
                "id": "formulations",
                "type": "structured",
                "description": "Test formulations",
                "enabled": True,
                "ingestion": {
                    "driver": "neo4j",
                    "query": "MATCH (f:Formulation) RETURN f",
                },
                "chunking": {
                    "strategy": "single-node",
                    "metadata_keys": ["id", "status"],
                },
            }
        ]
    }

    stub_client = StubNeo4jClient()
    service = GraphRAGIngestionService(
        manifest,
        manifest_path=tmp_path / "manifest.json",
        neo4j_client=stub_client,
        output_dir=None,
        persist_chunks=False,
        write_to_neo4j=True,
    )

    results = service.ingest(dry_run=False)
    assert len(results) == 1
    result = results[0]
    assert result.chunk_count == 1
    assert result.neo4j_summary == {
        "nodes_created": 1,
        "relationships_created": 1,
        "properties_set": 4,
    }

    assert stub_client.write_params is not None
    assert stub_client.write_params["source_id"] == "formulations"
    chunks_payload = stub_client.write_params["chunks"]
    assert len(chunks_payload) == 1
    assert chunks_payload[0]["chunk_id"].startswith("formulations::")


def test_ingest_structured_source_generates_embeddings(tmp_path: Path) -> None:
    class StubNeo4jClient:
        def execute_query(self, query: str, parameters: Dict[str, Any] | None = None) -> List[Dict[str, Any]]:
            return [
                {
                    "f": {"id": "form:beta", "name": "Beta", "status": "draft"},
                }
            ]

        def execute_write(self, query: str, parameters: Dict[str, Any] | None = None) -> Dict[str, int]:
            return {
                "nodes_created": 1,
                "relationships_created": 1,
                "properties_set": 4,
            }

    class StubEmbeddingClient:
        def __init__(self) -> None:
            self.batches: List[Sequence[str]] = []

        def embed_texts(self, texts: Sequence[str]) -> Sequence[Sequence[float]]:
            self.batches.append(tuple(texts))
            return [[float(index) for index in range(3)] for _ in texts]

    manifest = {
        "sources": [
            {
                "id": "formulations",
                "type": "structured",
                "description": "Test formulations",
                "enabled": True,
                "ingestion": {
                    "driver": "neo4j",
                    "query": "MATCH (f:Formulation) RETURN f",
                },
                "chunking": {
                    "strategy": "single-node",
                    "metadata_keys": ["id", "status"],
                },
            }
        ]
    }

    stub_embeddings = StubEmbeddingClient()
    output_dir = tmp_path / "artifacts"
    service = GraphRAGIngestionService(
        manifest,
        manifest_path=tmp_path / "manifest.json",
        neo4j_client=StubNeo4jClient(),
        embedding_client=stub_embeddings,
        output_dir=output_dir,
        persist_chunks=True,
        write_to_neo4j=False,
        embed_chunks=True,
    )

    results = service.ingest(dry_run=False)
    assert results[0].chunk_count == 1

    assert stub_embeddings.batches, "Embedding client should receive batch input"
    artifact_path = results[0].output_path
    assert artifact_path is not None and artifact_path.exists()
    payload = json.loads(artifact_path.read_text(encoding="utf-8").splitlines()[0])
    assert payload["embedding"] == [0.0, 1.0, 2.0]



def test_ingest_filesystem_source_writes_artifacts(tmp_path: Path) -> None:
    manifest = {
        "sources": [
            {
                "id": "docs",
                "type": "unstructured",
                "description": "Test docs",
                "enabled": True,
                "ingestion": {
                    "driver": "filesystem",
                    "paths": ["sample.md"],
                },
                "chunking": {
                    "strategy": "sliding-window",
                    "token_target": 20,
                    "token_overlap": 5,
                },
            }
        ]
    }

    manifest_path = tmp_path / "manifest.json"
    sample_md = tmp_path / "sample.md"
    sample_md.write_text(
        "# Title\n\n" + " ".join(f"token{i}" for i in range(40)),
        encoding="utf-8",
    )

    output_dir = tmp_path / "artifacts"
    service = GraphRAGIngestionService(
        manifest,
        manifest_path=manifest_path,
        neo4j_client=None,
        output_dir=output_dir,
        persist_chunks=True,
        write_to_neo4j=False,
    )

    results = service.ingest(dry_run=False)
    assert len(results) == 1
    result = results[0]
    assert result.output_path is not None
    assert result.output_path.exists()

    lines = result.output_path.read_text(encoding="utf-8").strip().splitlines()
    assert lines, "Expected at least one chunk artifact"

    payload = json.loads(lines[0])
    assert payload["chunk_id"].startswith("docs::")
    assert payload["metadata"]["source"] == "docs"
    assert payload["metadata"]["chunk_strategy"] == "sliding-window"