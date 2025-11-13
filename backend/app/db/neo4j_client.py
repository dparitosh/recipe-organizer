from datetime import date, datetime, time
from decimal import Decimal
import logging
from typing import Optional, List, Dict, Any

from fastapi import Request

from neo4j import GraphDatabase, Driver
from neo4j.exceptions import Neo4jError, ServiceUnavailable, AuthError

try:  # neo4j graph primitives for richer JSON conversion
    from neo4j.graph import Node as GraphNode, Relationship as GraphRelationship, Path as GraphPath
except ImportError:  # pragma: no cover - fallback when graph helpers unavailable
    GraphNode = GraphRelationship = GraphPath = None

try:  # Neo4j temporal helpers are optional depending on driver version
    from neo4j.time import (
        Date as GraphDate,
        DateTime as GraphDateTime,
        Duration as GraphDuration,
        Time as GraphTime,
    )
except ImportError:  # pragma: no cover - older driver fallback
    GraphDate = GraphDateTime = GraphDuration = GraphTime = None

logger = logging.getLogger(__name__)

class Neo4jClient:
    def __init__(
        self,
        uri: str,
        user: str,
        password: str,
        database: str = "neo4j",
        *,
        max_connection_pool_size: Optional[int] = None,
        max_connection_lifetime_seconds: Optional[int] = None,
        connection_acquisition_timeout_seconds: Optional[int] = None,
        encrypted: bool = False,
    ) -> None:
        self.uri = uri
        self.user = user
        self.password = password
        self.database = database
        self.driver: Optional[Driver] = None
        self._max_connection_pool_size = max_connection_pool_size
        self._max_connection_lifetime_seconds = max_connection_lifetime_seconds
        self._connection_acquisition_timeout_seconds = connection_acquisition_timeout_seconds
        self._encrypted = encrypted
    
    def connect(self):
        try:
            connection_kwargs = {}
            if self._max_connection_pool_size is not None:
                connection_kwargs["max_connection_pool_size"] = self._max_connection_pool_size
            if self._max_connection_lifetime_seconds is not None:
                connection_kwargs["max_connection_lifetime"] = self._max_connection_lifetime_seconds
            if self._connection_acquisition_timeout_seconds is not None:
                connection_kwargs["connection_acquisition_timeout"] = (
                    self._connection_acquisition_timeout_seconds
                )
            if self._encrypted:
                connection_kwargs["encrypted"] = True

            self.driver = GraphDatabase.driver(
                self.uri,
                auth=(self.user, self.password),
                **connection_kwargs,
            )
            self.driver.verify_connectivity()
            logger.info("Connected to Neo4j at %s", self.uri)
        except (ServiceUnavailable, AuthError, Neo4jError, OSError):
            logger.exception("Failed to connect to Neo4j at %s", self.uri)
            raise
    
    def close(self):
        if self.driver:
            self.driver.close()
            logger.info("Neo4j connection closed")
    
    def execute_query(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if not self.driver:
            raise RuntimeError("Neo4j driver not initialized")
        
        with self.driver.session(database=self.database) as session:
            result = session.run(query, parameters or {})
            records = []
            for record in result:
                # Convert Neo4j types to JSON-serializable primitives
                record_dict = {}
                for key in record.keys():
                    record_dict[key] = self._jsonify(record[key])
                records.append(record_dict)
            return records
    
    def execute_write(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not self.driver:
            raise RuntimeError("Neo4j driver not initialized")
        
        with self.driver.session(database=self.database) as session:
            result = session.run(query, parameters or {})
            summary = result.consume()
            return {
                "nodes_created": summary.counters.nodes_created,
                "relationships_created": summary.counters.relationships_created,
                "properties_set": summary.counters.properties_set
            }
    
    def check_health(self) -> bool:
        try:
            if self.driver:
                self.driver.verify_connectivity()
                return True
            return False
        except (Neo4jError, ServiceUnavailable, AuthError, OSError):
            return False
    
    @staticmethod
    def _jsonify(value: Any) -> Any:
        """Convert Neo4j driver values into JSON-serializable primitives."""

        if isinstance(value, (list, tuple, set)):
            return [Neo4jClient._jsonify(item) for item in value]

        if isinstance(value, dict):
            return {key: Neo4jClient._jsonify(val) for key, val in value.items()}

        if GraphNode is not None and isinstance(value, GraphNode):
            props = {key: Neo4jClient._jsonify(val) for key, val in dict(value).items()}
            return {
                "id": getattr(value, "element_id", getattr(value, "id", None)),
                "labels": list(getattr(value, "labels", [])),
                "properties": props,
            }

        if GraphRelationship is not None and isinstance(value, GraphRelationship):
            props = {key: Neo4jClient._jsonify(val) for key, val in dict(value).items()}
            start_id = getattr(value, "start_node_element_id", None)
            if start_id is None and hasattr(value, "start_node"):
                start_id = getattr(value.start_node, "element_id", getattr(value.start_node, "id", None))
            end_id = getattr(value, "end_node_element_id", None)
            if end_id is None and hasattr(value, "end_node"):
                end_id = getattr(value.end_node, "element_id", getattr(value.end_node, "id", None))
            return {
                "id": getattr(value, "element_id", getattr(value, "id", None)),
                "type": value.type,
                "start": start_id,
                "end": end_id,
                "properties": props,
            }

        if GraphPath is not None and isinstance(value, GraphPath):
            return {
                "nodes": [Neo4jClient._jsonify(node) for node in value.nodes],
                "relationships": [Neo4jClient._jsonify(rel) for rel in value.relationships],
            }

        if isinstance(value, (datetime, date, time)):
            return value.isoformat()

        if GraphDateTime is not None and isinstance(value, GraphDateTime):
            return value.iso_format()

        if GraphDate is not None and isinstance(value, GraphDate):
            return value.iso_format()

        if GraphTime is not None and isinstance(value, GraphTime):
            return value.iso_format()

        if GraphDuration is not None and isinstance(value, GraphDuration):
            return value.total_seconds()

        if isinstance(value, Decimal):
            return float(value)

        if hasattr(value, "isoformat"):
            try:
                return value.isoformat()
            except (TypeError, ValueError):  # pragma: no cover - defensive
                return str(value)

        return value

    def get_graph_data(self, limit: int = 100) -> Dict[str, Any]:
        try:
            limit_value = int(limit)
        except (TypeError, ValueError):
            limit_value = 100
        safe_limit = max(1, min(limit_value, 500))
        query = (
            "MATCH (n)\n"
            "OPTIONAL MATCH (n)-[r]->(m)\n"
            "RETURN n, r, m\n"
            "LIMIT $limit"
        )

        records = self.execute_query(query, {"limit": safe_limit})

        nodes_dict: Dict[str, Dict[str, Any]] = {}
        edges: List[Dict[str, Any]] = []

        def _normalise_node(raw: Any) -> Optional[Dict[str, Any]]:
            if not raw:
                return None
            if isinstance(raw, dict):
                return raw
            try:
                return dict(raw)
            except TypeError:
                return None

        for record in records:
            node_a = _normalise_node(record.get("n"))
            rel = record.get("r") if isinstance(record.get("r"), dict) else None
            node_b = _normalise_node(record.get("m"))

            for node in (node_a, node_b):
                if not node:
                    continue
                node_id = node.get("id")
                if node_id is None:
                    continue
                node_key = str(node_id)
                if node_key in nodes_dict:
                    continue
                labels = list(node.get("labels") or [])
                props = node.get("properties") or {}
                label = labels[0] if labels else props.get("label", "Unknown")
                nodes_dict[node_key] = {
                    "id": node_key,
                    "label": label,
                    "labels": labels,
                    "properties": props,
                }

            if rel:
                edges.append(
                    {
                        "source": str(rel.get("start")) if rel.get("start") is not None else None,
                        "target": str(rel.get("end")) if rel.get("end") is not None else None,
                        "type": rel.get("type"),
                        "properties": rel.get("properties") or {},
                    }
                )

        return {
            "nodes": list(nodes_dict.values()),
            "edges": edges,
        }


def get_neo4j_client(request: Request) -> Optional["Neo4jClient"]:
    """Convenience accessor for the per-app Neo4j client."""
    return getattr(request.app.state, "neo4j_client", None)  # type: ignore[attr-defined]
