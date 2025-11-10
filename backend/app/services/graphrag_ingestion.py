"""Manifest-driven GraphRAG ingestion utilities.

This module centralizes chunking helpers and orchestration needed by the
`backend/scripts/graphrag_ingest.py` CLI. It builds structured and
unstructured chunks, optionally persists them as JSONL artifacts, and can
write chunk metadata into Neo4j so downstream GraphRAG services have a
consistent knowledge index to query.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple, Protocol, Set

from app.db.neo4j_client import Neo4jClient

Metadata = Dict[str, Any]


class QueryRunner(Protocol):
    def execute_query(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:  # noqa: D401 - protocol stub
        """Execute a Cypher query and return raw Neo4j records."""


@dataclass
class KnowledgeChunk:
    chunk_id: str
    source: str
    content: str
    metadata: Metadata


@dataclass
class SourceIngestionResult:
    source_id: str
    record_count: int = 0
    chunk_count: int = 0
    warnings: List[str] = field(default_factory=list)
    output_path: Optional[Path] = None
    neo4j_summary: Optional[Dict[str, int]] = None


def _jsonify(value: Any) -> Any:
    """Convert Neo4j driver values into JSON-safe primitives."""

    return Neo4jClient._jsonify(value)


def normalize_record(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a raw Neo4j record into JSON-serializable primitives."""

    return {key: _jsonify(value) for key, value in raw.items()}


def extract_metadata(record: Dict[str, Any], keys: Sequence[str]) -> Tuple[Metadata, List[str]]:
    """Extract metadata keys from a nested record structure."""

    found: Metadata = {}
    missing: Set[str] = set(keys)

    def _visit(node: Any) -> None:
        if not missing:
            return
        if isinstance(node, dict):
            for key, value in node.items():
                if key in missing and value is not None:
                    found[key] = value
                    missing.discard(key)
                _visit(value)
        elif isinstance(node, (list, tuple)):
            for item in node:
                _visit(item)

    _visit(record)
    return found, sorted(missing)


def stringify_record(record: Dict[str, Any]) -> str:
    """Render a record as a stable JSON string for chunk content."""

    return json.dumps(record, ensure_ascii=True, sort_keys=True, indent=2)


def build_structured_chunks(
    source_id: str,
    source_type: str,
    records: Sequence[Dict[str, Any]],
    chunking_cfg: Dict[str, Any],
    metadata_keys: Sequence[str],
) -> Tuple[List[KnowledgeChunk], List[str]]:
    """Create chunks for structured sources following a single-node strategy."""

    chunks: List[KnowledgeChunk] = []
    warnings: List[str] = []

    strategy = chunking_cfg.get("strategy", "single-node")
    if strategy != "single-node":
        warnings.append(f"strategy '{strategy}' not yet supported for structured sources")
        return chunks, warnings

    for index, record in enumerate(records, start=1):
        metadata, missing = extract_metadata(record, metadata_keys)
        if missing:
            warnings.append(
                f"{source_id} chunk {index:04d} missing metadata keys: {', '.join(missing)}"
            )

        content = stringify_record(record)
        content_tokens = content.split()

        metadata.update(
            {
                "source": source_id,
                "source_type": source_type,
                "chunk_strategy": strategy,
                "chunk_index": index,
                "content_word_count": len(content_tokens),
            }
        )

        chunk_id = f"{source_id}::{index:04d}"
        chunks.append(
            KnowledgeChunk(
                chunk_id=chunk_id,
                source=source_id,
                content=content,
                metadata=metadata,
            )
        )

    return chunks, warnings


def _collect_markdown_headings(text: str) -> Tuple[str, str]:
    """Return the primary heading and breadcrumb approximation for markdown text."""

    headings: List[Tuple[int, str]] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("#"):
            continue
        level = len(stripped) - len(stripped.lstrip("#"))
        title = stripped.lstrip("#").strip()
        if title:
            headings.append((level, title))

    if not headings:
        return "", ""

    primary = headings[0][1]
    breadcrumb = " > ".join(title for _, title in headings[:3])
    return primary, breadcrumb


def chunk_markdown_text(
    source_id: str,
    source_type: str,
    text: str,
    chunking_cfg: Dict[str, Any],
    origin_path: Path,
    start_index: int = 1,
) -> List[KnowledgeChunk]:
    """Chunk markdown text using a simple sliding-window tokenization."""

    tokens = text.split()
    if not tokens:
        return []

    token_target = int(chunking_cfg.get("token_target", 450))
    token_overlap = int(chunking_cfg.get("token_overlap", 50))
    metadata_keys = chunking_cfg.get("metadata_keys", [])

    step = max(token_target - token_overlap, 1)
    primary_heading, breadcrumb = _collect_markdown_headings(text)

    chunks: List[KnowledgeChunk] = []
    for offset, start in enumerate(range(0, len(tokens), step)):
        window = tokens[start : start + token_target]
        if not window:
            continue

        chunk_index = start_index + offset
        content = " ".join(window)
        metadata: Metadata = {
            "source": source_id,
            "source_type": source_type,
            "chunk_strategy": chunking_cfg.get("strategy", "sliding-window"),
            "chunk_index": chunk_index,
            "source_path": str(origin_path),
            "token_start": start,
            "token_end": start + len(window),
            "token_length": len(window),
            "content_word_count": len(window),
        }

        if "heading" in metadata_keys and primary_heading:
            metadata["heading"] = primary_heading
        if "breadcrumb" in metadata_keys and breadcrumb:
            metadata["breadcrumb"] = breadcrumb

        chunk_id = f"{source_id}::{chunk_index:04d}"
        chunks.append(
            KnowledgeChunk(
                chunk_id=chunk_id,
                source=source_id,
                content=content,
                metadata=metadata,
            )
        )

    return chunks


class GraphRAGIngestionService:
    """High-level orchestrator for manifest-driven GraphRAG ingestion."""

    def __init__(
        self,
        manifest: Dict[str, Any],
        manifest_path: Path,
        *,
        neo4j_client: Optional[QueryRunner] = None,
        output_dir: Optional[Path] = None,
        persist_chunks: bool = True,
        write_to_neo4j: bool = True,
    ) -> None:
        self.manifest = manifest
        self.manifest_path = manifest_path
        self.neo4j_client = neo4j_client
        self.output_dir = output_dir
        self.persist_chunks = persist_chunks and output_dir is not None
        self.write_to_neo4j = bool(neo4j_client) and write_to_neo4j
        if self.persist_chunks and output_dir is not None:
            output_dir.mkdir(parents=True, exist_ok=True)

    def ingest(self, *, dry_run: bool = False) -> List[SourceIngestionResult]:
        sources = self.manifest.get("sources", [])
        results: List[SourceIngestionResult] = []
        for source in sources:
            if not source.get("enabled", False):
                continue

            driver = source.get("ingestion", {}).get("driver")
            if driver == "neo4j":
                results.append(self._ingest_neo4j_source(source, dry_run=dry_run))
            elif driver == "filesystem":
                results.append(self._ingest_filesystem_source(source, dry_run=dry_run))
            else:
                results.append(
                    SourceIngestionResult(
                        source_id=source.get("id", "<unknown>"),
                        warnings=[f"driver '{driver}' not supported"],
                    )
                )
        return results

    def _ingest_neo4j_source(self, source: Dict[str, Any], *, dry_run: bool) -> SourceIngestionResult:
        source_id = source.get("id", "<unknown>")
        if self.neo4j_client is None:
            raise RuntimeError("Neo4j client required for neo4j-driven ingestion")

        query = source.get("ingestion", {}).get("query")
        if not query:
            return SourceIngestionResult(source_id=source_id, warnings=["missing ingestion query"])

        raw_records = self.neo4j_client.execute_query(query)
        records = [normalize_record(record) for record in raw_records]

        chunking_cfg = source.get("chunking", {})
        metadata_keys = chunking_cfg.get("metadata_keys", [])
        chunks, warnings = build_structured_chunks(
            source_id,
            source.get("type", "structured"),
            records,
            chunking_cfg,
            metadata_keys,
        )

        output_path: Optional[Path] = None
        if self.persist_chunks and not dry_run and chunks:
            output_path = self._persist_chunks(source_id, chunks)

        neo4j_summary: Optional[Dict[str, int]] = None
        if self.write_to_neo4j and not dry_run and chunks:
            neo4j_summary = self._persist_chunks_to_neo4j(
                source_id,
                source.get("type", "structured"),
                chunks,
            )

        return SourceIngestionResult(
            source_id=source_id,
            record_count=len(records),
            chunk_count=len(chunks),
            warnings=warnings,
            output_path=output_path,
            neo4j_summary=neo4j_summary,
        )

    def _ingest_filesystem_source(self, source: Dict[str, Any], *, dry_run: bool) -> SourceIngestionResult:
        source_id = source.get("id", "<unknown>")
        ingestion_cfg = source.get("ingestion", {})
        chunking_cfg = source.get("chunking", {})

        files = self._resolve_files(ingestion_cfg)
        if not files:
            return SourceIngestionResult(
                source_id=source_id,
                warnings=["no files resolved for filesystem source"],
            )

        chunks: List[KnowledgeChunk] = []
        warnings: List[str] = []
        next_index = 1
        for path in files:
            try:
                text = path.read_text(encoding="utf-8")
            except FileNotFoundError:
                warnings.append(f"missing file: {path}")
                continue

            if not text.strip():
                warnings.append(f"file contains no text: {path}")
                continue

            file_chunks = chunk_markdown_text(
                source_id,
                source.get("type", "unstructured"),
                text,
                chunking_cfg,
                path,
                start_index=next_index,
            )
            chunks.extend(file_chunks)
            next_index += len(file_chunks)

        output_path: Optional[Path] = None
        if self.persist_chunks and not dry_run and chunks:
            output_path = self._persist_chunks(source_id, chunks)

        neo4j_summary: Optional[Dict[str, int]] = None
        if self.write_to_neo4j and not dry_run and chunks:
            neo4j_summary = self._persist_chunks_to_neo4j(
                source_id,
                source.get("type", "unstructured"),
                chunks,
            )

        return SourceIngestionResult(
            source_id=source_id,
            record_count=len(files),
            chunk_count=len(chunks),
            warnings=warnings,
            output_path=output_path,
            neo4j_summary=neo4j_summary,
        )

    def _persist_chunks(self, source_id: str, chunks: Iterable[KnowledgeChunk]) -> Path:
        assert self.output_dir is not None  # defensive - ensured by constructor
        output_path = self.output_dir / f"{source_id}_chunks.jsonl"
        with output_path.open("w", encoding="utf-8") as handle:
            for chunk in chunks:
                payload = {
                    "chunk_id": chunk.chunk_id,
                    "source": chunk.source,
                    "content": chunk.content,
                    "metadata": chunk.metadata,
                }
                handle.write(json.dumps(payload, ensure_ascii=True))
                handle.write("\n")
        return output_path

    def _persist_chunks_to_neo4j(
        self,
        source_id: str,
        source_type: str,
        chunks: Sequence[KnowledgeChunk],
    ) -> Dict[str, int]:
        if self.neo4j_client is None:
            raise RuntimeError("Neo4j client required for persistence")

        chunk_payload = [
            {
                "chunk_id": chunk.chunk_id,
                "content": chunk.content,
                "metadata": chunk.metadata,
                "chunk_index": chunk.metadata.get("chunk_index"),
                "chunk_strategy": chunk.metadata.get("chunk_strategy"),
            }
            for chunk in chunks
        ]

        query = """
        MERGE (source:KnowledgeSource {id: $source_id})
        ON CREATE SET source.created_at = datetime()
        SET source.type = $source_type,
            source.updated_at = datetime()

        WITH source, $chunks AS chunkList
        UNWIND chunkList AS chunk
        MERGE (c:KnowledgeChunk {chunk_id: chunk.chunk_id})
        ON CREATE SET c.created_at = datetime()
        SET c.content = chunk.content,
            c.metadata = chunk.metadata,
            c.source = $source_id,
            c.source_type = $source_type,
            c.chunk_index = chunk.chunk_index,
            c.chunk_strategy = chunk.chunk_strategy,
            c.updated_at = datetime()
        MERGE (source)-[:HAS_CHUNK]->(c)
        """

        summary = self.neo4j_client.execute_write(
            query,
            {
                "source_id": source_id,
                "source_type": source_type,
                "chunks": chunk_payload,
            },
        )
        return {
            "nodes_created": summary.get("nodes_created", 0),
            "relationships_created": summary.get("relationships_created", 0),
            "properties_set": summary.get("properties_set", 0),
        }

    def _resolve_files(self, ingestion_cfg: Dict[str, Any]) -> List[Path]:
        base_dir = self.manifest_path.parent
        resolved: List[Path] = []

        for raw_path in ingestion_cfg.get("paths", []) or []:
            candidate = (base_dir / raw_path).resolve()
            if candidate.is_file():
                resolved.append(candidate)

        include_globs = ingestion_cfg.get("include_glob")
        patterns: List[str]
        if isinstance(include_globs, str):
            patterns = [include_globs]
        else:
            patterns = list(include_globs or [])

        for pattern in patterns:
            for candidate in base_dir.glob(pattern):
                if candidate.is_file():
                    resolved.append(candidate.resolve())

        unique: List[Path] = []
        seen: Set[Path] = set()
        for path in resolved:
            if path in seen:
                continue
            seen.add(path)
            unique.append(path)

        return unique
