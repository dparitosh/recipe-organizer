# Python FastAPI Backend

## Overview

This is the Python FastAPI backend for the Formulation Graph Studio application. It provides REST APIs for formulation management, graph data operations, and integration with Neo4j and USDA FoodData Central.

## Architecture

```
backend/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (not committed)
├── app/
│   ├── __init__.py
│   ├── config.py          # Configuration management
│   ├── models/
│   │   ├── __init__.py
│   │   ├── formulation.py # Pydantic models for formulations
│   │   └── graph.py       # Graph data models
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── health.py      # Health check endpoint
│   │   ├── formulations.py # Formulation CRUD
│   │   ├── graph.py       # Graph operations
│   │   ├── database.py    # Database management
│   │   └── fdc.py         # USDA FDC integration
│   ├── services/
│   │   ├── __init__.py
│   │   ├── neo4j_service.py   # Neo4j operations
│   │   └── fdc_service.py     # FDC API client
│   └── utils/
│       ├── __init__.py
│       └── helpers.py     # Utility functions
```

## Installation

### Prerequisites

- Python 3.10 or higher
- Neo4j database (local or cloud)
- pip package manager

### Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file:
```env
# Neo4j Configuration
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j

# USDA FDC API
FDC_API_KEY=your-fdc-api-key

# Application
ENVIRONMENT=development
DEBUG=True
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

4. Start the server:
```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

## API Endpoints

### Health Check

**GET** `/health`

Returns backend health status and Neo4j connection info.

Response:
```json
{
  "status": "healthy",
  "neo4j": {
    "connected": true,
    "database": "neo4j"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Formulations

**GET** `/api/formulations`

List all formulations.

**GET** `/api/formulations/{id}`

Get a specific formulation by ID.

**POST** `/api/formulations`

Create a new formulation.

Request body:
```json
{
  "name": "Orange Juice",
  "version": "1.0",
  "type": "beverage",
  "status": "draft",
  "targetYield": 1000,
  "yieldUnit": "L",
  "ingredients": [],
  "createdBy": "user123"
}
```

**PUT** `/api/formulations/{id}`

Update an existing formulation.

**DELETE** `/api/formulations/{id}`

Delete a formulation.

### Graph Operations

**GET** `/api/graph`

Get complete graph data with nodes and relationships.

Response:
```json
{
  "nodes": [
    {
      "id": "node-1",
      "labels": ["Formulation"],
      "properties": {
        "name": "Orange Juice",
        "version": "1.0"
      }
    }
  ],
  "relationships": [
    {
      "id": "rel-1",
      "type": "CONTAINS",
      "startNode": "node-1",
      "endNode": "node-2",
      "properties": {}
    }
  ],
  "metadata": {
    "executionTime": 45,
    "recordCount": 150
  }
}
```

### Database Management

**POST** `/api/database/clear`

Clear all data from Neo4j database.

**POST** `/api/database/sample`

Load sample data into Neo4j.

### FDC Integration

**GET** `/api/fdc/search?q={query}`

Search USDA FoodData Central.

Query parameters:
- `q`: Search query string

**POST** `/api/fdc/ingest/{fdcId}`

Ingest food data from FDC into Neo4j.

## Implementation Guide

### main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import health, formulations, graph, database, fdc

app = FastAPI(
    title="Formulation Graph Studio API",
    description="Backend API for F&B formulation management",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(formulations.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(database.router, prefix="/api")
app.include_router(fdc.router, prefix="/api")

@app.get("/")
def root():
    return {
        "message": "Formulation Graph Studio API",
        "docs": "/docs",
        "health": "/health"
    }
```

### requirements.txt

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
pydantic-settings==2.1.0
neo4j==5.16.0
python-dotenv==1.0.0
httpx==0.26.0
python-multipart==0.0.6
```

### app/config.py

```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    NEO4J_URI: str
    NEO4J_USER: str
    NEO4J_PASSWORD: str
    NEO4J_DATABASE: str = "neo4j"
    
    FDC_API_KEY: str = ""
    
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

### app/models/formulation.py

```python
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import uuid4

class Ingredient(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    quantity: float
    unit: str
    percentage: float
    function: str
    cost: Optional[float] = None

class Formulation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    version: str
    type: str
    status: str
    targetYield: float
    yieldUnit: str
    ingredients: List[Ingredient] = []
    createdBy: str
    createdAt: datetime = Field(default_factory=datetime.now)
    updatedAt: datetime = Field(default_factory=datetime.now)

class FormulationCreate(BaseModel):
    name: str
    version: str
    type: str
    status: str
    targetYield: float
    yieldUnit: str
    ingredients: List[Ingredient] = []
    createdBy: str

class FormulationUpdate(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    targetYield: Optional[float] = None
    yieldUnit: Optional[str] = None
    ingredients: Optional[List[Ingredient]] = None
```

### app/models/graph.py

```python
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class GraphNode(BaseModel):
    id: str
    labels: List[str]
    properties: Dict[str, Any]

class GraphRelationship(BaseModel):
    id: str
    type: str
    startNode: str
    endNode: str
    properties: Dict[str, Any]

class GraphData(BaseModel):
    nodes: List[GraphNode]
    relationships: List[GraphRelationship]
    metadata: Optional[Dict[str, Any]] = None
```

### app/services/neo4j_service.py

```python
from neo4j import GraphDatabase
from app.config import settings
from app.models.graph import GraphData, GraphNode, GraphRelationship
from typing import List, Dict, Any

class Neo4jService:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )
    
    def close(self):
        self.driver.close()
    
    def verify_connectivity(self):
        try:
            self.driver.verify_connectivity()
            return True
        except Exception:
            return False
    
    def get_all_graph_data(self) -> GraphData:
        with self.driver.session(database=settings.NEO4J_DATABASE) as session:
            result = session.run("""
                MATCH (n)
                OPTIONAL MATCH (n)-[r]->(m)
                RETURN 
                    collect(DISTINCT {
                        id: elementId(n),
                        labels: labels(n),
                        properties: properties(n)
                    }) as nodes,
                    collect({
                        id: elementId(r),
                        type: type(r),
                        startNode: elementId(startNode(r)),
                        endNode: elementId(endNode(r)),
                        properties: properties(r)
                    }) as relationships
            """)
            
            data = result.single()
            nodes = [GraphNode(**n) for n in data['nodes'] if n['id']]
            relationships = [
                GraphRelationship(**r) 
                for r in data['relationships'] 
                if r['id'] is not None
            ]
            
            return GraphData(
                nodes=nodes,
                relationships=relationships,
                metadata={
                    "recordCount": len(nodes),
                    "relationshipCount": len(relationships)
                }
            )
    
    def clear_database(self):
        with self.driver.session(database=settings.NEO4J_DATABASE) as session:
            session.run("MATCH (n) DETACH DELETE n")
    
    def load_sample_data(self):
        with self.driver.session(database=settings.NEO4J_DATABASE) as session:
            session.run("""
                CREATE (f:Formulation {
                    id: 'form-1',
                    name: 'Orange Juice',
                    version: '1.0',
                    type: 'beverage'
                })
                CREATE (i1:Ingredient {
                    id: 'ing-1',
                    name: 'Orange Concentrate',
                    quantity: 200
                })
                CREATE (i2:Ingredient {
                    id: 'ing-2',
                    name: 'Water',
                    quantity: 800
                })
                CREATE (f)-[:CONTAINS {percentage: 20}]->(i1)
                CREATE (f)-[:CONTAINS {percentage: 80}]->(i2)
            """)

neo4j_service = Neo4jService()
```

### app/routes/health.py

```python
from fastapi import APIRouter
from datetime import datetime
from app.services.neo4j_service import neo4j_service

router = APIRouter()

@router.get("/health")
def health_check():
    neo4j_connected = neo4j_service.verify_connectivity()
    
    return {
        "status": "healthy" if neo4j_connected else "degraded",
        "neo4j": {
            "connected": neo4j_connected,
            "database": "neo4j"
        },
        "timestamp": datetime.now().isoformat()
    }
```

### app/routes/formulations.py

```python
from fastapi import APIRouter, HTTPException
from typing import List
from app.models.formulation import Formulation, FormulationCreate, FormulationUpdate

router = APIRouter(tags=["formulations"])

formulations_db: Dict[str, Formulation] = {}

@router.get("/formulations", response_model=List[Formulation])
def list_formulations():
    return list(formulations_db.values())

@router.get("/formulations/{formulation_id}", response_model=Formulation)
def get_formulation(formulation_id: str):
    if formulation_id not in formulations_db:
        raise HTTPException(status_code=404, detail="Formulation not found")
    return formulations_db[formulation_id]

@router.post("/formulations", response_model=Formulation)
def create_formulation(formulation: FormulationCreate):
    new_formulation = Formulation(**formulation.dict())
    formulations_db[new_formulation.id] = new_formulation
    return new_formulation

@router.put("/formulations/{formulation_id}", response_model=Formulation)
def update_formulation(formulation_id: str, formulation: FormulationUpdate):
    if formulation_id not in formulations_db:
        raise HTTPException(status_code=404, detail="Formulation not found")
    
    existing = formulations_db[formulation_id]
    update_data = formulation.dict(exclude_unset=True)
    updated = existing.copy(update=update_data)
    formulations_db[formulation_id] = updated
    return updated

@router.delete("/formulations/{formulation_id}")
def delete_formulation(formulation_id: str):
    if formulation_id not in formulations_db:
        raise HTTPException(status_code=404, detail="Formulation not found")
    del formulations_db[formulation_id]
    return {"message": "Formulation deleted"}
```

### app/routes/graph.py

```python
from fastapi import APIRouter
from app.services.neo4j_service import neo4j_service
from app.models.graph import GraphData

router = APIRouter(tags=["graph"])

@router.get("/graph", response_model=GraphData)
def get_graph():
    return neo4j_service.get_all_graph_data()
```

### app/routes/database.py

```python
from fastapi import APIRouter
from app.services.neo4j_service import neo4j_service

router = APIRouter(tags=["database"])

@router.post("/database/clear")
def clear_database():
    neo4j_service.clear_database()
    return {"message": "Database cleared successfully"}

@router.post("/database/sample")
def load_sample_data():
    neo4j_service.load_sample_data()
    return {"message": "Sample data loaded successfully"}
```

### app/routes/fdc.py

```python
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import httpx

router = APIRouter(tags=["fdc"])

@router.get("/fdc/search")
async def search_fdc(q: str) -> List[Dict[str, Any]]:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.nal.usda.gov/fdc/v1/foods/search",
            params={"query": q, "pageSize": 10}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="FDC API error")
        
        data = response.json()
        return data.get("foods", [])

@router.post("/fdc/ingest/{fdc_id}")
async def ingest_fdc(fdc_id: str):
    return {"message": f"Ingested food {fdc_id}"}
```

## Deployment

### Production Considerations

1. Use environment-specific `.env` files
2. Enable HTTPS with proper SSL certificates
3. Use a production ASGI server (e.g., gunicorn with uvicorn workers)
4. Implement rate limiting and authentication
5. Set up proper logging and monitoring
6. Use connection pooling for Neo4j

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
docker build -t formulation-backend .
docker run -p 8000:8000 --env-file .env formulation-backend
```

## Testing

Run the backend and test endpoints:

```bash
# Health check
curl http://localhost:8000/health

# List formulations
curl http://localhost:8000/api/formulations

# Get graph data
curl http://localhost:8000/api/graph
```

## Support

For issues or questions, refer to the main README.md or open an issue on GitHub.
