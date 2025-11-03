from neo4j import GraphDatabase, Driver
from typing import Optional, List, Dict, Any
import logging

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
                records.append(dict(record))
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
                    props = dict(n) if n else {}
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
                    props = dict(m) if m else {}
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
                    "properties": dict(r) if r else {}
                })
        
        return {
            "nodes": list(nodes_dict.values()),
            "edges": edges
        }
