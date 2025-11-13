from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, Sequence, Tuple

from neo4j import exceptions as neo4j_exceptions

from app.db.neo4j_client import Neo4jClient
from app.services.graphrag_retrieval import GraphRAGRetrievalService, HybridRetrievalResult

logger = logging.getLogger(__name__)


class GraphSearchService:
    """Provide higher-level graph discovery utilities for the Graph Explorer UI."""

    RUN_ID_PATTERN = re.compile(r"^(?:orch|run)-", re.IGNORECASE)

    def __init__(
        self,
        neo4j_client: Neo4jClient,
        graphrag_service: Optional[GraphRAGRetrievalService] = None,
    ) -> None:
        if neo4j_client is None or neo4j_client.driver is None:
            raise RuntimeError("Neo4j client must be connected for graph searching")
        self._neo4j = neo4j_client
        self._graphrag = graphrag_service

    def search(
        self,
        query: str,
        *,
        mode: str = "auto",
        limit: int = 50,
        include_related: bool = True,
    ) -> Dict[str, Any]:
        canonical = (query or "").strip()
        if not canonical:
            raise ValueError("Search query must not be empty")

        resolved_mode = self._resolve_mode(canonical, mode)
        if resolved_mode == "orchestration":
            return self._search_orchestration_run(canonical)
        if resolved_mode == "graphrag":
            return self._search_with_graphrag(canonical, limit=limit, include_related=include_related)
        return self._search_keywords(canonical, limit=limit, include_related=include_related)

    def _resolve_mode(self, query: str, mode: str) -> str:
        mode_lower = (mode or "auto").lower()
        if mode_lower != "auto":
            return mode_lower

        if self.RUN_ID_PATTERN.match(query):
            return "orchestration"

        token_count = len(query.split())
        if token_count >= 5 and self._graphrag is not None:
            return "graphrag"

        return "keyword"

    def _search_orchestration_run(self, run_id: str) -> Dict[str, Any]:
        try:
            run_records = self._neo4j.execute_query(
                """
                MATCH (run:OrchestrationRun { runId: $runId })
                RETURN run
                LIMIT 1
                """,
                {"runId": run_id},
            )
        except neo4j_exceptions.Neo4jError as exc:
            logger.error("Failed to query orchestration run %s: %s", run_id, exc)
            raise RuntimeError("Failed to query orchestration run") from exc

        if not run_records:
            raise LookupError("Orchestration run not found")

        run_node = Neo4jClient._jsonify(run_records[0].get("run"))
        run_props = (run_node or {}).get("properties", {})

        node_records = self._neo4j.execute_query(
            """
            MATCH (run:OrchestrationRun { runId: $runId })-[:GENERATED_ENTITY]->(node:GraphEntity)
            RETURN DISTINCT node
            """,
            {"runId": run_id},
        )

        nodes_map: Dict[str, Dict[str, Any]] = {}
        for record in node_records:
            raw_node = Neo4jClient._jsonify(record.get("node"))
            if not raw_node:
                continue
            node = self._format_node(raw_node)
            if node:
                nodes_map[node["id"]] = node

        edge_records = self._neo4j.execute_query(
            """
            MATCH (source:GraphEntity)-[rel]->(target:GraphEntity)
            WHERE $runId IN rel.generatedRunIds
            RETURN source, rel, target
            """,
            {"runId": run_id},
        )

        edges: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
        for record in edge_records:
            source = self._format_node(Neo4jClient._jsonify(record.get("source")))
            target = self._format_node(Neo4jClient._jsonify(record.get("target")))
            rel = Neo4jClient._jsonify(record.get("rel"))
            if not source or not target or not rel:
                continue
            nodes_map.setdefault(source["id"], source)
            nodes_map.setdefault(target["id"], target)
            edge = self._format_edge(source["id"], target["id"], rel)
            edges[(edge["source"], edge["target"], edge["type"])] = edge

        nodes = list(nodes_map.values())
        edge_list = list(edges.values())

        highlight = {
            "id": run_id,
            "type": "OrchestrationRun",
            "name": run_props.get("runId", run_id),
            "properties": {
                "status": run_props.get("status"),
                "totalDuration": run_props.get("totalDuration"),
                "timestamp": run_props.get("timestamp"),
            },
            "relevance": 1.0,
        }

        summary = (
            f"Orchestration run {run_id} generated {len(nodes)} nodes and {len(edge_list)} relationships."  # noqa: E501
        )

        return {
            "nodes": nodes,
            "edges": edge_list,
            "node_count": len(nodes),
            "edge_count": len(edge_list),
            "summary": summary,
            "data_sources": ["Neo4j"],
            "highlights": [highlight],
            "graphrag_chunks": [],
        }

    def _search_keywords(
        self,
        query: str,
        *,
        limit: int,
        include_related: bool,
    ) -> Dict[str, Any]:
        params = {"term": query.lower(), "limit": int(max(1, limit))}
        try:
            node_records = self._neo4j.execute_query(
                """
                MATCH (n)
                WHERE (
                    (exists(n.name) AND toLower(n.name) CONTAINS $term) OR
                    (exists(n.label) AND toLower(n.label) CONTAINS $term) OR
                    (exists(n.id) AND toLower(n.id) CONTAINS $term) OR
                    (exists(n.description) AND toLower(n.description) CONTAINS $term)
                )
                RETURN DISTINCT n
                LIMIT $limit
                """,
                params,
            )
        except neo4j_exceptions.Neo4jError as exc:
            logger.error("Keyword search failed: %s", exc)
            raise RuntimeError("Failed to execute keyword search") from exc

        nodes_map: Dict[str, Dict[str, Any]] = {}
        highlights: List[Dict[str, Any]] = []
        matched_ids: List[str] = []

        for record in node_records:
            node = self._format_node(Neo4jClient._jsonify(record.get("n")))
            if not node:
                continue
            nodes_map[node["id"]] = node
            matched_ids.append(node["id"])
            matches = self._collect_keyword_matches(node, query)
            if matches:
                highlights.append(
                    {
                        "id": node["id"],
                        "type": node.get("type"),
                        "name": node.get("name"),
                        "properties": {"matches": matches},
                        "relevance": 0.6,
                    }
                )

        edge_list: List[Dict[str, Any]] = []
        if include_related and matched_ids:
            edge_limit = max(1, min(500, limit * 6))
            try:
                edge_records = self._neo4j.execute_query(
                    """
                    MATCH (a)-[r]->(b)
                    WHERE a.id IN $ids OR b.id IN $ids
                    RETURN a, r, b
                    LIMIT $edge_limit
                    """,
                    {"ids": matched_ids, "edge_limit": edge_limit},
                )
            except neo4j_exceptions.Neo4jError as exc:
                logger.warning("Failed to load related edges for keyword search: %s", exc)
                edge_records = []

            seen_edges: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
            for record in edge_records:
                source = self._format_node(Neo4jClient._jsonify(record.get("a")))
                target = self._format_node(Neo4jClient._jsonify(record.get("b")))
                rel = Neo4jClient._jsonify(record.get("r"))
                if not source or not target or not rel:
                    continue
                nodes_map.setdefault(source["id"], source)
                nodes_map.setdefault(target["id"], target)
                edge = self._format_edge(source["id"], target["id"], rel)
                seen_edges[(edge["source"], edge["target"], edge["type"])] = edge
            edge_list = list(seen_edges.values())

        nodes = list(nodes_map.values())
        summary = (
            f"Keyword search for '{query}' returned {len(nodes)} nodes and {len(edge_list)} relationships."  # noqa: E501
        )

        return {
            "nodes": nodes,
            "edges": edge_list,
            "node_count": len(nodes),
            "edge_count": len(edge_list),
            "summary": summary,
            "data_sources": ["Neo4j"],
            "highlights": highlights,
            "graphrag_chunks": [],
        }

    def _search_with_graphrag(
        self,
        query: str,
        *,
        limit: int,
        include_related: bool,
    ) -> Dict[str, Any]:
        if not self._graphrag:
            raise RuntimeError("GraphRAG retrieval service is unavailable")

        try:
            result = self._graphrag.retrieve(
                query,
                limit=max(3, min(15, limit)),
                structured_limit=max(20, min(150, limit * 4)),
            )
        except Exception as exc:  # pragma: no cover - rely on service level handling
            logger.error("GraphRAG retrieval failed: %s", exc)
            raise RuntimeError("GraphRAG retrieval failed") from exc

        nodes_map: Dict[str, Dict[str, Any]] = {}
        edges: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
        highlights: List[Dict[str, Any]] = []
        scores = self._collect_chunk_scores(result)

        for context in result.structured_entities:
            source = self._format_node(context.node)
            if not source:
                continue
            nodes_map[source["id"]] = source
            relevance = min(1.0, scores.get(source["id"], 0.0)) if scores else None
            if relevance:
                highlights.append(
                    {
                        "id": source["id"],
                        "type": source.get("type"),
                        "name": source.get("name"),
                        "properties": {"matchedBy": "GraphRAG", "score": relevance},
                        "relevance": relevance,
                    }
                )

            for relationship in context.relationships:
                target = self._format_node(relationship.target)
                if not target:
                    continue
                nodes_map.setdefault(target["id"], target)
                edge = self._format_edge(source["id"], target["id"], {
                    "type": relationship.type,
                    "properties": relationship.properties,
                })
                edges[(edge["source"], edge["target"], edge["type"])] = edge

        if include_related and nodes_map:
            related_limit = max(1, min(200, limit * 4))
            try:
                additional = self._neo4j.execute_query(
                    """
                    MATCH (a)-[r]->(b)
                    WHERE a.id IN $ids OR b.id IN $ids
                    RETURN a, r, b
                    LIMIT $limit
                    """,
                    {"ids": list(nodes_map.keys()), "limit": related_limit},
                )
            except neo4j_exceptions.Neo4jError as exc:
                logger.warning("Unable to enrich GraphRAG search with related edges: %s", exc)
                additional = []

            for record in additional:
                source = self._format_node(Neo4jClient._jsonify(record.get("a")))
                target = self._format_node(Neo4jClient._jsonify(record.get("b")))
                rel = Neo4jClient._jsonify(record.get("r"))
                if not source or not target or not rel:
                    continue
                nodes_map.setdefault(source["id"], source)
                nodes_map.setdefault(target["id"], target)
                edge = self._format_edge(source["id"], target["id"], rel)
                edges[(edge["source"], edge["target"], edge["type"])] = edge

        nodes = list(nodes_map.values())
        edge_list = list(edges.values())

        summary = (
            f"GraphRAG search for '{query}' returned {len(nodes)} nodes and {len(edge_list)} relationships."  # noqa: E501
        )

        chunk_payload = [
            {
                "chunk_id": chunk.chunk_id,
                "score": float(chunk.score),
                "content": chunk.content,
                "metadata": chunk.metadata,
                "source_id": chunk.source_id,
                "source_type": chunk.source_type,
                "source_description": chunk.source_description,
            }
            for chunk in result.chunks
        ]

        return {
            "nodes": nodes,
            "edges": edge_list,
            "node_count": len(nodes),
            "edge_count": len(edge_list),
            "summary": summary,
            "data_sources": ["Neo4j", "GraphRAG Knowledge Base"],
            "highlights": highlights,
            "graphrag_chunks": chunk_payload,
        }

    def _collect_chunk_scores(self, result: HybridRetrievalResult) -> Dict[str, float]:
        scores: Dict[str, float] = {}
        for chunk in result.chunks:
            for key, value in chunk.metadata.items():
                if not isinstance(value, str):
                    continue
                if "id" not in key.lower():
                    continue
                current = scores.get(value, 0.0)
                if chunk.score > current:
                    scores[value] = float(chunk.score)
        return scores

    @staticmethod
    def _collect_keyword_matches(node: Dict[str, Any], query: str) -> List[Dict[str, Any]]:
        matches: List[Dict[str, Any]] = []
        query_lower = query.lower()
        properties = node.get("properties", {})
        candidate_fields: Sequence[Tuple[str, Any]] = (
            ("name", node.get("name")),
            ("label", node.get("label")),
            ("type", node.get("type")),
            ("id", node.get("id")),
            ("description", properties.get("description")),
        )
        for field, value in candidate_fields:
            if not value:
                continue
            text = str(value)
            if query_lower in text.lower():
                matches.append({"field": field, "value": text})
        return matches

    @staticmethod
    def _format_node(raw_node: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not raw_node:
            return None
        properties = raw_node.get("properties") or {}
        node_id = properties.get("id") or raw_node.get("id")
        if node_id is None:
            return None
        labels = raw_node.get("labels") or []
        node_type = properties.get("type") or (labels[0] if labels else None)
        name = (
            properties.get("name")
            or properties.get("label")
            or raw_node.get("label")
            or str(node_id)
        )
        return {
            "id": str(node_id),
            "labels": labels,
            "type": node_type,
            "name": name,
            "properties": properties,
        }

    @staticmethod
    def _format_edge(source_id: str, target_id: str, rel: Dict[str, Any]) -> Dict[str, Any]:
        properties = rel.get("properties") or {}
        rel_type = rel.get("type") or properties.get("type") or "RELATED_TO"
        edge_id = properties.get("edgeId") or rel.get("id") or f"edge::{source_id}::{target_id}::{rel_type}"
        return {
            "id": str(edge_id),
            "type": rel_type,
            "source": str(source_id),
            "target": str(target_id),
            "properties": properties,
        }
