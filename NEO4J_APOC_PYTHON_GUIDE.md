# Neo4j APOC Integration Guide for Python Backend

## Overview

This guide demonstrates how to integrate Neo4j APOC (Awesome Procedures On Cypher) library with your Python FastAPI backend for advanced graph database operations.

## What is APOC?

APOC is Neo4j's standard library with 450+ procedures and functions for:
- Data import/export (CSV, JSON, XML, Excel)
- Graph algorithms
- Data transformation
- Spatial operations
- Text processing
- Date/time utilities

## Prerequisites

```bash
# Install required Python packages
pip install neo4j fastapi python-dotenv
```

## Neo4j Configuration

### Enable APOC in Neo4j

1. **Neo4j Desktop**: APOC is bundled by default
2. **Neo4j AuraDB**: APOC Core is pre-installed
3. **Docker**:
```bash
docker run -d \
  --name neo4j-apoc \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  -e NEO4J_apoc_export_file_enabled=true \
  -e NEO4J_apoc_import_file_enabled=true \
  -e NEO4J_apoc_import_file_use__neo4j__config=true \
  neo4j:latest
```

## Python Backend Implementation

### 1. Database Connection Setup

```python
# backend/app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    NEO4J_URI: str = "neo4j+s://xxxxx.databases.neo4j.io"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"
    NEO4J_DATABASE: str = "neo4j"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### 2. Neo4j Driver with APOC Support

```python
# backend/app/database/neo4j_client.py
from neo4j import GraphDatabase
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class Neo4jAPOCClient:
    def __init__(self, uri: str, user: str, password: str, database: str = "neo4j"):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        self.database = database
        
    def close(self):
        self.driver.close()
    
    def verify_apoc_availability(self) -> Dict[str, Any]:
        """Check if APOC is available and list available procedures"""
        with self.driver.session(database=self.database) as session:
            result = session.run("""
                CALL dbms.procedures() 
                YIELD name, description 
                WHERE name STARTS WITH 'apoc' 
                RETURN count(name) as apoc_procedures
            """)
            record = result.single()
            
            return {
                "apoc_available": record["apoc_procedures"] > 0,
                "procedure_count": record["apoc_procedures"]
            }
    
    def list_apoc_procedures(self, category: Optional[str] = None) -> List[Dict[str, str]]:
        """List available APOC procedures, optionally filtered by category"""
        with self.driver.session(database=self.database) as session:
            query = """
                CALL dbms.procedures() 
                YIELD name, description, signature
                WHERE name STARTS WITH 'apoc'
            """
            if category:
                query += f" AND name CONTAINS '{category}'"
            query += " RETURN name, description, signature ORDER BY name"
            
            result = session.run(query)
            return [
                {
                    "name": record["name"],
                    "description": record["description"],
                    "signature": record["signature"]
                }
                for record in result
            ]
```

### 3. APOC Data Import Operations

```python
# backend/app/services/apoc_import_service.py
from typing import List, Dict, Any
from app.database.neo4j_client import Neo4jAPOCClient
import json

class APOCImportService:
    def __init__(self, neo4j_client: Neo4jAPOCClient):
        self.client = neo4j_client
    
    def import_json_data(self, json_data: List[Dict[str, Any]], node_label: str) -> Dict[str, Any]:
        """
        Import JSON data as nodes using APOC
        
        Example:
            data = [{"id": "1", "name": "Product A"}, {"id": "2", "name": "Product B"}]
            import_json_data(data, "Product")
        """
        with self.client.driver.session(database=self.client.database) as session:
            result = session.run("""
                UNWIND $data AS item
                CALL apoc.create.node([$label], item) YIELD node
                RETURN count(node) as nodes_created
            """, data=json_data, label=node_label)
            
            record = result.single()
            return {
                "success": True,
                "nodes_created": record["nodes_created"],
                "label": node_label
            }
    
    def import_csv_from_url(self, url: str, node_label: str, 
                           field_mapping: Dict[str, str]) -> Dict[str, Any]:
        """
        Import CSV data directly from URL using APOC
        
        Args:
            url: CSV file URL
            node_label: Label for created nodes
            field_mapping: Map CSV headers to node properties
        
        Example:
            import_csv_from_url(
                "https://example.com/data.csv",
                "Ingredient",
                {"csv_name": "name", "csv_cost": "cost"}
            )
        """
        with self.client.driver.session(database=self.client.database) as session:
            # Build property mapping for Cypher
            props = ", ".join([f"{v}: row.{k}" for k, v in field_mapping.items()])
            
            query = f"""
                CALL apoc.load.csv($url, {{header: true}}) YIELD map AS row
                CREATE (n:{node_label} {{{props}}})
                RETURN count(n) as nodes_created
            """
            
            result = session.run(query, url=url)
            record = result.single()
            
            return {
                "success": True,
                "nodes_created": record["nodes_created"],
                "label": node_label
            }
    
    def import_xml_data(self, xml_url: str, xpath: str, 
                       node_label: str) -> Dict[str, Any]:
        """
        Import XML data using APOC
        
        Example:
            import_xml_data(
                "https://example.com/data.xml",
                "/root/items/item",
                "Product"
            )
        """
        with self.client.driver.session(database=self.client.database) as session:
            result = session.run("""
                CALL apoc.load.xml($url, $xpath) YIELD value
                CREATE (n:$label)
                SET n = value._attributes
                RETURN count(n) as nodes_created
            """, url=xml_url, xpath=xpath, label=node_label)
            
            record = result.single()
            return {
                "success": True,
                "nodes_created": record["nodes_created"]
            }
    
    def batch_import_with_periodic_commit(self, data: List[Dict[str, Any]], 
                                         node_label: str, 
                                         batch_size: int = 1000) -> Dict[str, Any]:
        """
        Import large datasets with periodic commits using APOC
        
        This is more efficient for large datasets (10k+ records)
        """
        with self.client.driver.session(database=self.client.database) as session:
            result = session.run("""
                CALL apoc.periodic.iterate(
                    'UNWIND $data AS item RETURN item',
                    'CREATE (n:$label) SET n = item',
                    {batchSize: $batchSize, parallel: false, params: {data: $data, label: $label}}
                )
                YIELD batches, total, errorMessages
                RETURN batches, total, errorMessages
            """, data=data, label=node_label, batchSize=batch_size)
            
            record = result.single()
            return {
                "success": len(record["errorMessages"]) == 0,
                "batches": record["batches"],
                "total": record["total"],
                "errors": record["errorMessages"]
            }
```

### 4. APOC Data Transformation

```python
# backend/app/services/apoc_transform_service.py
from app.database.neo4j_client import Neo4jAPOCClient
from typing import List, Dict, Any

class APOCTransformService:
    def __init__(self, neo4j_client: Neo4jAPOCClient):
        self.client = neo4j_client
    
    def convert_property_types(self, label: str, property_name: str, 
                              target_type: str) -> Dict[str, Any]:
        """
        Convert property types using APOC
        
        Supported types: int, float, string, boolean
        """
        with self.client.driver.session(database=self.client.database) as session:
            type_conversion = {
                'int': 'toInteger',
                'float': 'toFloat',
                'string': 'toString',
                'boolean': 'toBoolean'
            }
            
            conversion_func = type_conversion.get(target_type, 'toString')
            
            result = session.run(f"""
                MATCH (n:{label})
                WHERE n.{property_name} IS NOT NULL
                CALL apoc.create.setProperty(n, '{property_name}', 
                    apoc.convert.{conversion_func}(n.{property_name}))
                YIELD node
                RETURN count(node) as updated_count
            """)
            
            record = result.single()
            return {
                "success": True,
                "updated_count": record["updated_count"]
            }
    
    def merge_nodes_by_property(self, label: str, 
                               merge_property: str) -> Dict[str, Any]:
        """
        Merge duplicate nodes with same property value using APOC
        """
        with self.client.driver.session(database=self.client.database) as session:
            result = session.run(f"""
                MATCH (n:{label})
                WITH n.{merge_property} AS key, collect(n) AS nodes
                WHERE size(nodes) > 1
                CALL apoc.refactor.mergeNodes(nodes, {{
                    properties: 'combine',
                    mergeRels: true
                }})
                YIELD node
                RETURN count(node) as merged_count
            """)
            
            record = result.single()
            return {
                "success": True,
                "merged_count": record["merged_count"]
            }
```

### 5. APOC Path Finding

```python
# backend/app/services/apoc_path_service.py
from app.database.neo4j_client import Neo4jAPOCClient
from typing import List, Dict, Any, Optional

class APOCPathService:
    def __init__(self, neo4j_client: Neo4jAPOCClient):
        self.client = neo4j_client
    
    def find_all_paths(self, start_node_id: str, end_node_id: str, 
                      relationship_types: Optional[List[str]] = None,
                      max_depth: int = 5) -> List[Dict[str, Any]]:
        """
        Find all paths between two nodes using APOC
        
        Example:
            find_all_paths("ingredient_1", "recipe_5", ["USES", "CONTAINS"], 4)
        """
        with self.client.driver.session(database=self.client.database) as session:
            rel_filter = ""
            if relationship_types:
                rel_filter = "|".join(relationship_types)
            
            query = """
                MATCH (start {id: $start_id}), (end {id: $end_id})
                CALL apoc.path.expandConfig(start, {
                    relationshipFilter: $rel_filter,
                    maxLevel: $max_depth,
                    endNodes: [end],
                    uniqueness: 'NODE_PATH'
                })
                YIELD path
                RETURN path, length(path) as path_length
                ORDER BY path_length
                LIMIT 100
            """
            
            result = session.run(query, 
                               start_id=start_node_id, 
                               end_id=end_node_id,
                               rel_filter=rel_filter,
                               max_depth=max_depth)
            
            paths = []
            for record in result:
                path = record["path"]
                paths.append({
                    "nodes": [dict(node) for node in path.nodes],
                    "relationships": [dict(rel) for rel in path.relationships],
                    "length": record["path_length"]
                })
            
            return paths
    
    def find_shortest_path_dijkstra(self, start_node_id: str, 
                                    end_node_id: str,
                                    weight_property: str = "cost") -> Dict[str, Any]:
        """
        Find shortest weighted path using Dijkstra algorithm
        
        Example:
            find_shortest_path_dijkstra("plant_1", "ingredient_5", "distance")
        """
        with self.client.driver.session(database=self.client.database) as session:
            result = session.run("""
                MATCH (start {id: $start_id}), (end {id: $end_id})
                CALL apoc.algo.dijkstra(start, end, '', $weight_property)
                YIELD path, weight
                RETURN path, weight
            """, start_id=start_node_id, end_id=end_node_id, 
                 weight_property=weight_property)
            
            record = result.single()
            if not record:
                return {"success": False, "message": "No path found"}
            
            path = record["path"]
            return {
                "success": True,
                "nodes": [dict(node) for node in path.nodes],
                "total_weight": record["weight"],
                "path_length": len(path.nodes) - 1
            }
```

### 6. FastAPI Endpoints

```python
# backend/app/api/routes/apoc_routes.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.database.neo4j_client import Neo4jAPOCClient
from app.services.apoc_import_service import APOCImportService
from app.services.apoc_path_service import APOCPathService
from app.config import settings

router = APIRouter(prefix="/api/apoc", tags=["APOC"])

# Dependency
def get_neo4j_client():
    client = Neo4jAPOCClient(
        settings.NEO4J_URI,
        settings.NEO4J_USER,
        settings.NEO4J_PASSWORD,
        settings.NEO4J_DATABASE
    )
    try:
        yield client
    finally:
        client.close()

# Pydantic Models
class ImportJSONRequest(BaseModel):
    data: List[Dict[str, Any]]
    node_label: str

class ImportCSVRequest(BaseModel):
    url: str
    node_label: str
    field_mapping: Dict[str, str]

class PathQueryRequest(BaseModel):
    start_node_id: str
    end_node_id: str
    relationship_types: Optional[List[str]] = None
    max_depth: int = 5

# Endpoints
@router.get("/status")
async def check_apoc_status(client: Neo4jAPOCClient = Depends(get_neo4j_client)):
    """Check if APOC is available"""
    try:
        status = client.verify_apoc_availability()
        return {"status": "ok", **status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/procedures")
async def list_procedures(
    category: Optional[str] = None,
    client: Neo4jAPOCClient = Depends(get_neo4j_client)
):
    """List available APOC procedures"""
    try:
        procedures = client.list_apoc_procedures(category)
        return {"procedures": procedures, "count": len(procedures)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import/json")
async def import_json(
    request: ImportJSONRequest,
    client: Neo4jAPOCClient = Depends(get_neo4j_client)
):
    """Import JSON data as nodes"""
    try:
        service = APOCImportService(client)
        result = service.import_json_data(request.data, request.node_label)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import/csv")
async def import_csv(
    request: ImportCSVRequest,
    client: Neo4jAPOCClient = Depends(get_neo4j_client)
):
    """Import CSV data from URL"""
    try:
        service = APOCImportService(client)
        result = service.import_csv_from_url(
            request.url, 
            request.node_label, 
            request.field_mapping
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/paths/find")
async def find_paths(
    request: PathQueryRequest,
    client: Neo4jAPOCClient = Depends(get_neo4j_client)
):
    """Find all paths between two nodes"""
    try:
        service = APOCPathService(client)
        paths = service.find_all_paths(
            request.start_node_id,
            request.end_node_id,
            request.relationship_types,
            request.max_depth
        )
        return {"paths": paths, "count": len(paths)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### 7. Main Application Setup

```python
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import apoc_routes

app = FastAPI(title="Neo4j APOC API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include APOC routes
app.include_router(apoc_routes.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## Common APOC Operations

### 1. Bulk Data Import
```python
# Import 10,000 records with batching
service.batch_import_with_periodic_commit(
    data=large_dataset,
    node_label="Ingredient",
    batch_size=1000
)
```

### 2. JSON Export
```python
def export_graph_to_json(self) -> Dict[str, Any]:
    with self.client.driver.session(database=self.client.database) as session:
        result = session.run("""
            CALL apoc.export.json.all(null, {stream: true})
            YIELD data
            RETURN data
        """)
        return {"json_export": result.single()["data"]}
```

### 3. Graph Refactoring
```python
def create_relationship_from_property(self, label: str, property: str):
    """Create relationships based on property values"""
    with self.client.driver.session(database=self.client.database) as session:
        session.run(f"""
            MATCH (n:{label})
            WHERE n.{property} IS NOT NULL
            MATCH (m:{label} {{id: n.{property}}})
            CALL apoc.create.relationship(n, 'LINKED_TO', {{}}, m) 
            YIELD rel
            RETURN count(rel)
        """)
```

## Environment Configuration

```bash
# backend/.env
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
NEO4J_DATABASE=neo4j
```

## Testing APOC

```python
# tests/test_apoc.py
import pytest
from app.database.neo4j_client import Neo4jAPOCClient
from app.config import settings

def test_apoc_availability():
    client = Neo4jAPOCClient(
        settings.NEO4J_URI,
        settings.NEO4J_USER,
        settings.NEO4J_PASSWORD
    )
    
    status = client.verify_apoc_availability()
    assert status["apoc_available"] == True
    assert status["procedure_count"] > 0
    
    client.close()
```

## Best Practices

1. **Connection Pooling**: Use driver connection pooling for production
2. **Error Handling**: Always wrap APOC calls in try-except blocks
3. **Batch Processing**: Use `apoc.periodic.iterate` for large datasets
4. **Monitoring**: Log APOC procedure execution times
5. **Security**: Validate all user inputs before passing to APOC procedures

## Resources

- [APOC Documentation](https://neo4j.com/labs/apoc/)
- [APOC Core Functions](https://neo4j.com/labs/apoc/4.4/overview/apoc.core/)
- [Neo4j Python Driver](https://neo4j.com/docs/api/python-driver/current/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## Conclusion

This guide provides a comprehensive foundation for integrating Neo4j APOC with your Python backend. The examples cover data import, transformation, path finding, and API exposure, enabling powerful graph database operations for your F&B formulation platform.
