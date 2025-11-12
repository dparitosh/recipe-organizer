"""Hybrid retrieval utilities combining vector search with graph context."""

from __future__ import annotations

import copy
import json
import re
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from threading import Lock
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple

from app.db.neo4j_client import Neo4jClient
from app.services.embedding_service import EmbeddingClient


class GraphRAGRetrievalError(RuntimeError):
    """Raised when hybrid retrieval encounters a fatal error."""


@dataclass
class RetrievalChunk:
    chunk_id: str
    score: float
    content: str
    metadata: Dict[str, Any]
    source_id: Optional[str] = None
    source_type: Optional[str] = None
    source_description: Optional[str] = None


@dataclass
class StructuredRelationship:
    type: str
    direction: str
    target: Dict[str, Any]
    properties: Dict[str, Any] = field(default_factory=dict)


@dataclass
class StructuredEntityContext:
    node: Dict[str, Any]
    relationships: List[StructuredRelationship] = field(default_factory=list)


@dataclass
class HybridRetrievalResult:
    query: str
    chunks: List[RetrievalChunk]
    structured_entities: List[StructuredEntityContext]


class GraphRAGRetrievalService:
    """Coordinate vector similarity search with structured graph lookups."""

    DEFAULT_ID_KEYS: Sequence[str] = (
        "id",
        "formulation_id",
        "ingredient_id",
        "source_id",
        "entity_id",
    )

    def __init__(
        self,
        neo4j_client: Neo4jClient,
        embedding_client: EmbeddingClient,
        *,
        chunk_index_name: str,
        metadata_id_keys: Optional[Sequence[str]] = None,
        cache_max_entries: int = 0,
        cache_ttl_seconds: float = 0.0,
        chunk_content_truncate_chars: int = 0,
    ) -> None:
        self.neo4j_client = neo4j_client
        self.embedding_client = embedding_client
        self.chunk_index_name = chunk_index_name
        self.metadata_id_keys = tuple(metadata_id_keys or self.DEFAULT_ID_KEYS)
        self._id_key_pattern = re.compile(r"(^|_)(id|ids)$", re.IGNORECASE)
        self.cache_max_entries = max(0, int(cache_max_entries or 0))
        self.cache_ttl_seconds = max(0.0, float(cache_ttl_seconds or 0.0))
        self.chunk_content_truncate_chars = max(0, int(chunk_content_truncate_chars or 0))
        self._cache: OrderedDict[str, Tuple[float, HybridRetrievalResult]] = OrderedDict()
        self._cache_lock = Lock()

    def retrieve(
        self,
        query: str,
        *,
        limit: int = 5,
        structured_limit: int = 25,
    ) -> HybridRetrievalResult:
        canonical_query = query.strip()
        if not canonical_query:
            raise GraphRAGRetrievalError("Query text must not be empty")

        cached = self._get_cached_result(canonical_query)
        if cached is not None:
            return cached

        query_vector = self._embed_query(canonical_query)
        chunk_hits = self._vector_search(query_vector, limit)

        ordered_entity_ids = self._collect_candidate_entity_ids(chunk_hits)
        structured_context: List[StructuredEntityContext]
        if ordered_entity_ids:
            structured_context = self._load_structured_context(
                ordered_entity_ids,
                structured_limit=structured_limit,
            )
        else:
            structured_context = []

        result = HybridRetrievalResult(
            query=canonical_query,
            chunks=chunk_hits,
            structured_entities=structured_context,
        )
        self._set_cached_result(canonical_query, result)
        return result

    def _embed_query(self, query: str) -> Sequence[float]:
        try:
            vectors = self.embedding_client.embed_texts([query])
        except Exception as exc:  # pragma: no cover - defensive network failure
            raise GraphRAGRetrievalError(f"Failed to embed query: {exc}") from exc

        if not vectors:
            raise GraphRAGRetrievalError("Embedding backend returned no vectors")

        vector = vectors[0]
        if not vector:
            raise GraphRAGRetrievalError("Embedding backend returned empty vector")

        return [float(value) for value in vector]

    def _vector_search(self, embedding: Sequence[float], limit: int) -> List[RetrievalChunk]:
        cypher = """
        CALL db.index.vector.queryNodes($index_name, $limit, $embedding)
        YIELD node, score
        OPTIONAL MATCH (source:KnowledgeSource)-[:HAS_CHUNK]->(node)
        RETURN node, score, source
        ORDER BY score DESC
        """

        try:
            records = self.neo4j_client.execute_query(
                cypher,
                {
                    "index_name": self.chunk_index_name,
                    "limit": int(max(1, limit)),
                    "embedding": list(embedding),
                },
            )
        except Exception as exc:
            raise GraphRAGRetrievalError(f"Vector search failed: {exc}") from exc

        chunks: List[RetrievalChunk] = []
        for raw in records:
            node_dict = Neo4jClient._jsonify(raw.get("node")) if raw.get("node") else None
            if not node_dict:
                continue

            node_props = node_dict.get("properties", {})
            metadata = self._parse_metadata(node_props.get("metadata_json"))
            content = self._truncate_content(str(node_props.get("content", "")))
            chunks.append(
                RetrievalChunk(
                    chunk_id=str(node_props.get("chunk_id")),
                    score=float(raw.get("score", 0.0)),
                    content=content,
                    metadata=metadata,
                    source_id=self._extract_source_id(raw.get("source")),
                    source_type=self._extract_source_type(raw.get("source")),
                    source_description=self._extract_source_description(raw.get("source")),
                )
            )

        return chunks

    def _truncate_content(self, content: str) -> str:
        if not content:
            return content

        if self.chunk_content_truncate_chars <= 0:
            return content

        if len(content) <= self.chunk_content_truncate_chars:
            return content

        first_char = content.lstrip()[:1]
        if first_char in {"{", "["}:
            try:
                json.loads(content)
                return content
            except json.JSONDecodeError:
                pass

        limit = self.chunk_content_truncate_chars
        if limit <= 3:
            return content[:limit]
        return content[: limit - 3].rstrip() + "..."
        return content

    def _extract_source_id(self, source_obj: Any) -> Optional[str]:
        if not source_obj:
            return None
        source_dict = Neo4jClient._jsonify(source_obj)
        return str(source_dict.get("properties", {}).get("id")) if source_dict else None

    def _extract_source_type(self, source_obj: Any) -> Optional[str]:
        if not source_obj:
            return None
        source_dict = Neo4jClient._jsonify(source_obj)
        return source_dict.get("properties", {}).get("type") if source_dict else None

    def _extract_source_description(self, source_obj: Any) -> Optional[str]:
        if not source_obj:
            return None
        source_dict = Neo4jClient._jsonify(source_obj)
        return source_dict.get("properties", {}).get("description") if source_dict else None

    def _parse_metadata(self, metadata_json: Any) -> Dict[str, Any]:
        if not metadata_json:
            return {}
        if isinstance(metadata_json, dict):
            return metadata_json
        if isinstance(metadata_json, str):
            try:
                return json.loads(metadata_json)
            except json.JSONDecodeError:
                return {}
        return {}

    def _collect_candidate_entity_ids(self, chunks: Iterable[RetrievalChunk]) -> List[str]:
        seen: Set[str] = set()
        ordered: List[str] = []
        for chunk in chunks:
            for candidate in self._yield_metadata_ids(chunk.metadata):
                if candidate not in seen:
                    seen.add(candidate)
                    ordered.append(candidate)
        return ordered

    def _yield_metadata_ids(self, metadata: Dict[str, Any]) -> Iterable[str]:
        for key, value in metadata.items():
            key_lower = key.lower()
            if isinstance(value, str):
                if key_lower in self.metadata_id_keys or self._id_key_pattern.search(key_lower):
                    yield value
            elif isinstance(value, (list, tuple)):
                if key_lower.endswith("_ids"):
                    for item in value:
                        if isinstance(item, str):
                            yield item

    def _load_structured_context(
        self,
        entity_ids: Sequence[str],
        *,
        structured_limit: int,
    ) -> List[StructuredEntityContext]:
        nodes_query = """
        MATCH (n)
        WHERE n.id IN $entity_ids
        RETURN n
        """
        node_records = self.neo4j_client.execute_query(
            nodes_query,
            {"entity_ids": list(entity_ids)},
        )

        node_lookup: Dict[str, StructuredEntityContext] = {}
        for record in node_records:
            node_dict = Neo4jClient._jsonify(record.get("n")) if record.get("n") else None
            if not node_dict:
                continue
            node_props = node_dict.get("properties", {})
            node_id = str(node_props.get("id")) if node_props.get("id") else None
            if not node_id:
                continue
            node_lookup[node_id] = StructuredEntityContext(node=node_dict)

        if not node_lookup:
            return []

        rel_query = """
        MATCH (n)-[r]->(m)
        WHERE n.id IN $entity_ids
        RETURN n.id AS source_id, r, m
        ORDER BY source_id
        LIMIT $limit
        """
        rel_records = self.neo4j_client.execute_query(
            rel_query,
            {
                "entity_ids": list(node_lookup.keys()),
                "limit": int(max(0, structured_limit)),
            },
        )

        for record in rel_records:
            source_id = record.get("source_id")
            context = node_lookup.get(str(source_id)) if source_id is not None else None
            if context is None:
                continue

            rel_dict = Neo4jClient._jsonify(record.get("r")) if record.get("r") else None
            target_dict = Neo4jClient._jsonify(record.get("m")) if record.get("m") else None
            if not rel_dict or not target_dict:
                continue

            rel_type = rel_dict.get("type") or rel_dict.get("properties", {}).get("type")
            if not rel_type:
                rel_type = "UNKNOWN"

            context.relationships.append(
                StructuredRelationship(
                    type=str(rel_type),
                    direction="OUT",
                    target=target_dict,
                    properties=rel_dict.get("properties", {}),
                )
            )

        ordered_contexts = [node_lookup[node_id] for node_id in entity_ids if node_id in node_lookup]
        return ordered_contexts

    def _get_cached_result(self, query: str) -> Optional[HybridRetrievalResult]:
        if self.cache_max_entries <= 0:
            return None

        with self._cache_lock:
            cached = self._cache.get(query)
            if cached is None:
                return None

            timestamp, result = cached
            if self.cache_ttl_seconds > 0.0 and (time.monotonic() - timestamp) > self.cache_ttl_seconds:
                self._cache.pop(query, None)
                return None

            self._cache.move_to_end(query)
            return copy.deepcopy(result)

    def _set_cached_result(self, query: str, result: HybridRetrievalResult) -> None:
        if self.cache_max_entries <= 0:
            return

        with self._cache_lock:
            self._cache[query] = (time.monotonic(), copy.deepcopy(result))
            self._cache.move_to_end(query)
            while len(self._cache) > self.cache_max_entries:
                self._cache.popitem(last=False)