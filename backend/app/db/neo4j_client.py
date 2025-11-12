from datetime import date, datetime, time
from decimal import Decimal
import logging
from typing import Optional, List, Dict, Any

from fastapi import Request

from neo4j import GraphDatabase, Driver

try:  # neo4j graph primitives for richer JSON conversion
    from neo4j.graph import Node, Relationship, Path
except ImportError:  # pragma: no cover - fallback when graph helpers unavailable
    Node = Relationship = Path = None

try:  # Neo4j temporal helpers are optional depending on driver version
    from neo4j.time import Date as Neo4jDate, DateTime as Neo4jDateTime, Duration as Neo4jDuration, Time as Neo4jTime
except ImportError:  # pragma: no cover - older driver fallback
    Neo4jDate = Neo4jDateTime = Neo4jDuration = Neo4jTime = None

logger = logging.getLogger(__name__)

class Neo4jClient:
    def __init__(self, uri: str, user: str, password: str, database: str = "neo4j"):
        self.uri = uri
        self.user = user
        self.password = password
        self.database = database
        self.driver: Optional[Driver] = None
    
    def connect(self):
        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            self.driver.verify_connectivity()
            logger.info(f"Connected to Neo4j at {self.uri}")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            raise
    
    def close(self):
        if self.driver:
            self.driver.close()
            logger.info("Neo4j connection closed")
    
    def execute_query(self, query: str, parameters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if not self.driver:
            raise Exception("Neo4j driver not initialized")
        
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
            raise Exception("Neo4j driver not initialized")
        
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
        except:
            return False
    
    @staticmethod
    def _jsonify(value: Any) -> Any:
        """Convert Neo4j driver values into JSON-serializable primitives."""

        if isinstance(value, (list, tuple, set)):
            return [Neo4jClient._jsonify(item) for item in value]

        if isinstance(value, dict):
            return {key: Neo4jClient._jsonify(val) for key, val in value.items()}

        if Node and isinstance(value, Node):
            props = {key: Neo4jClient._jsonify(val) for key, val in dict(value).items()}
            return {
                "id": getattr(value, "element_id", getattr(value, "id", None)),
                "labels": list(getattr(value, "labels", [])),
                "properties": props,
            }

        if Relationship and isinstance(value, Relationship):
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

        if Path and isinstance(value, Path):
            return {
                "nodes": [Neo4jClient._jsonify(node) for node in value.nodes],
                "relationships": [Neo4jClient._jsonify(rel) for rel in value.relationships],
            }

        if isinstance(value, (datetime, date, time)):
            return value.isoformat()

        if Neo4jDateTime and isinstance(value, Neo4jDateTime):
            return value.iso_format()

        if Neo4jDate and isinstance(value, Neo4jDate):
            return value.iso_format()

        if Neo4jTime and isinstance(value, Neo4jTime):
            return value.iso_format()

        if Neo4jDuration and isinstance(value, Neo4jDuration):
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
        query = f"""
        MATCH (n)
        OPTIONAL MATCH (n)-[r]->(m)
        RETURN n, r, m
        LIMIT {limit}
        """
        
        records = self.execute_query(query)
        
        nodes_dict = {}
        edges = []
        
        for record in records:
            n = record.get('n')
            r = record.get('r')
            m = record.get('m')
            
            if n and hasattr(n, 'id'):
                node_id = str(n.id)
                if node_id not in nodes_dict:
                    labels = list(n.labels) if hasattr(n, 'labels') else []
                    props = self._jsonify(dict(n)) if n else {}
                    nodes_dict[node_id] = {
                        "id": node_id,
                        "label": labels[0] if labels else "Unknown",
                        "labels": labels,
                        "properties": props
                    }
            
            if m and hasattr(m, 'id'):
                node_id = str(m.id)
                if node_id not in nodes_dict:
                    labels = list(m.labels) if hasattr(m, 'labels') else []
                    props = self._jsonify(dict(m)) if m else {}
                    nodes_dict[node_id] = {
                        "id": node_id,
                        "label": labels[0] if labels else "Unknown",
                        "labels": labels,
                        "properties": props
                    }
            
            if r and hasattr(r, 'type'):
                edges.append({
                    "source": str(r.start_node.id) if hasattr(r.start_node, 'id') else None,
                    "target": str(r.end_node.id) if hasattr(r.end_node, 'id') else None,
                    "type": r.type,
                    "properties": self._jsonify(dict(r)) if r else {}
                })
        
        return {
            "nodes": list(nodes_dict.values()),
            "edges": edges
        }


def get_neo4j_client(request: Request) -> Optional["Neo4jClient"]:
    """Convenience accessor for the per-app Neo4j client."""
    return getattr(request.app.state, "neo4j_client", None)  # type: ignore[attr-defined]
