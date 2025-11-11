# Formulation Graph Studio - Backend API

Modern Python FastAPI backend for Food & Beverage formulation management platform with Neo4j, Ollama AI, USDA FDC integration, and GraphRAG knowledge retrieval.

## Current Status

✅ **Production Ready**
- All services operational (Neo4j, Ollama, FDC)
- GraphRAG ingestion and retrieval active
- 33/33 tests passing
- FDC nutrition data ingestion working
- Embedding generation via Ollama
- Knowledge chunk storage in Neo4j

## Features

- **FastAPI Framework**: Modern, fast web framework with automatic OpenAPI documentation
- **Ollama AI Integration**: Local AI processing for natural language queries, Cypher generation, and embeddings
- **Neo4j Graph Database**: Official Neo4j Python driver for graph data management
- **USDA FDC Integration**: Food nutrition data ingestion and retrieval
- **GraphRAG Retrieval**: Hybrid search (vector + Cypher) for knowledge chunks
- **Pydantic Validation**: Comprehensive request/response validation with OpenAPI standards
- **Async Operations**: Full async/await support for optimal performance
- **Service Health Monitoring**: Real-time health checks for all integrated services
- **Graceful Degradation**: Automatic fallback when services unavailable

## Architecture

```
backend/
├── app/
│   ├── api/
│   │   ├── endpoints/          # API route handlers
│   │   │   ├── health.py       # Service health checks
│   │   │   ├── ai.py           # AI query processing (OLLAMA)
│   │   │   ├── formulations.py # Formulation CRUD operations
│   │   │   ├── calculations.py # Scaling and cost calculations
│   │   │   ├── graph.py        # Graph data retrieval
│   │   │   └── sample_data.py  # Sample data loader
│   │   └── routes.py           # Router aggregation
│   ├── core/
│   │   └── config.py           # Configuration management
│   ├── db/
│   │   └── neo4j_client.py     # Neo4j database client
│   ├── models/
│   │   └── schemas.py          # Pydantic models
│   └── services/
│       └── ollama_service.py   # OLLAMA AI service client
├── main.py                     # FastAPI application entry point
├── requirements.txt            # Python dependencies
└── .env.example                # Environment variables template
```

## Prerequisites

### Required Services

1. **Python 3.10+**
2. **Ollama** - Local AI service
   - Download: https://ollama.ai/
   - Pull models: `ollama pull llama3:latest` and `ollama pull nomic-embed-text:latest`
3. **Neo4j Database** - Graph database
   - Cloud: Neo4j Aura (https://neo4j.com/cloud/aura/) - Recommended
   - Local: Neo4j Desktop or Docker
4. **USDA FDC API Key** - Nutrition data
   - Register: https://fdc.nal.usda.gov/api-key-signup.html

## Installation

### 1. Clone and Setup

```bash
cd backend
python -m venv venv
```

### 2. Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt  # tooling for testing/linting
```

### 4. Configure Environment

Create `.env` file or `env.local.json` (JSON takes precedence):

**Option A: `.env` file**
```bash
cp .env.example .env
```

Edit `.env`:

```env
# Neo4j Configuration (REQUIRED)
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j

# Ollama Configuration (REQUIRED)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3:latest
OLLAMA_EMBED_MODEL=nomic-embed-text:latest
OLLAMA_TIMEOUT=60
OLLAMA_EMBED_BATCH_SIZE=16

# USDA FDC API (REQUIRED)
FDC_API_KEY=your-fdc-api-key
FDC_API_BASE_URL=https://api.nal.usda.gov/fdc/v1
FDC_REQUEST_TIMEOUT=30

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=False

# GraphRAG Configuration
GRAPHRAG_CHUNK_INDEX_NAME=knowledge_chunks
GRAPHRAG_CACHE_MAX_ENTRIES=64
GRAPHRAG_CACHE_TTL_SECONDS=120
GRAPHRAG_CHUNK_CONTENT_MAX_CHARS=2000
```

**Option B: `env.local.json` (recommended, overrides .env)**
```json
{
  "NEO4J_URI": "neo4j+s://xxxxx.databases.neo4j.io",
  "NEO4J_USER": "neo4j",
  "NEO4J_PASSWORD": "your-password",
  "OLLAMA_BASE_URL": "http://localhost:11434",
  "OLLAMA_MODEL": "llama3:latest",
  "OLLAMA_EMBED_MODEL": "nomic-embed-text:latest",
  "FDC_API_KEY": "your-fdc-api-key"
}
```

## Running the Server

### Development Mode (with auto-reload)

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode

```bash
python main.py
```

### Using Uvicorn Directly

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## API Endpoints

### Health Check
- `GET /api/health` - Service health status for Neo4j, Ollama, FDC

### Multi-Agent Orchestration
- `POST /api/orchestration/runs` - Persist orchestration run with recipe, costs, validation, and UI config

### AI Assistant
- `POST /api/ai/query` - Process natural language queries with optional graph context
- `POST /api/ai/completion` - Direct Ollama completion endpoint

### Formulations
- `POST /api/formulations` - Create formulation
- `GET /api/formulations` - List formulations
- `GET /api/formulations/{id}` - Get formulation details
- `PUT /api/formulations/{id}` - Update formulation
- `DELETE /api/formulations/{id}` - Delete formulation

### FDC (Food Data Central)
- `POST /api/fdc/search` - Search USDA foods
- `POST /api/fdc/foods/{fdc_id}/details` - Get food details
- `POST /api/fdc/ingest` - Ingest foods by FDC IDs
- `POST /api/fdc/quick-ingest` - Search and ingest in one step
- `GET /api/fdc/foods` - List ingested foods with optional nutrients

### Calculations
- `POST /api/calculations/scale` - Scale formulation to batch size

### Graph Data
- `GET /api/graph/data` - Retrieve graph visualization data
- `POST /api/graph/query` - Execute custom Cypher query

### Sample Data
- `POST /api/sample-data/load` - Load sample F&B datasets
- `DELETE /api/sample-data/clear` - Clear database

## OLLAMA Setup

### Installation

**Windows:**
1. Download OLLAMA from https://ollama.ai/download
2. Run installer
3. Open terminal and pull model:
```bash
ollama pull llama2
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama2
```

### Verify OLLAMA

```bash
ollama list
curl http://localhost:11434/api/tags
```

### Alternative Models

```bash
# Faster, smaller model
ollama pull mistral

# Larger, more capable model
ollama pull llama2:13b

# Update .env to use different model
OLLAMA_MODEL=mistral
```

## Neo4j Setup

### Cloud (Neo4j Aura - Recommended)

1. Sign up at https://neo4j.com/cloud/aura/
2. Create free instance
3. Note connection URI, username, password
4. Update `.env` with credentials

### Local (Docker)

```bash
docker run \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your-password \
  neo4j:latest
```

Update `.env`:
```env
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
```

## Azure Deployment

### Prerequisites
- Azure account with Windows VM provisioned
- Python 3.10+ installed on VM
- OLLAMA installed on VM
- Neo4j accessible (cloud or local)

### Deployment Steps

#### 1. Connect to Azure VM

```bash
# Via RDP or SSH
ssh azureuser@your-vm-ip
```

#### 2. Install Dependencies on Windows VM

```powershell
# Install Python 3.10+
winget install Python.Python.3.10

# Install OLLAMA
# Download from https://ollama.ai/download and install

# Verify installations
python --version
ollama --version
```

#### 3. Clone and Setup Application

```powershell
cd C:\Apps
git clone <your-repo>
cd formulation-graph-studio/backend

python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

#### 4. Configure Environment

```powershell
copy .env.example .env
notepad .env
```

Update with production values:
```env
HOST=0.0.0.0
PORT=8000
DEBUG=False
NEO4J_URI=neo4j+s://your-production-instance.databases.neo4j.io
OLLAMA_BASE_URL=http://localhost:11434
```

#### 5. Run as Windows Service

Create `start-backend.bat`:
```batch
@echo off
cd C:\Apps\formulation-graph-studio\backend
call venv\Scripts\activate
python main.py
```

**Option A: Use NSSM (Non-Sucking Service Manager)**
```powershell
# Install NSSM
choco install nssm

# Create service
nssm install FormulationAPI "C:\Apps\formulation-graph-studio\backend\venv\Scripts\python.exe" "C:\Apps\formulation-graph-studio\backend\main.py"
nssm set FormulationAPI AppDirectory "C:\Apps\formulation-graph-studio\backend"
nssm start FormulationAPI
```

**Option B: Use Task Scheduler**
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: At startup
4. Action: Start program `C:\Apps\formulation-graph-studio\backend\start-backend.bat`
5. Run whether user is logged in or not

#### 6. Configure Firewall

```powershell
# Allow port 8000
New-NetFirewallRule -DisplayName "Formulation API" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

#### 7. Verify Deployment

```powershell
# Test locally
curl http://localhost:8000/health

# Test from network
curl http://your-vm-ip:8000/health
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HOST` | Server bind address | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `DEBUG` | Debug mode | `False` |
| `NEO4J_URI` | Neo4j connection URI | `neo4j+s://...` |
| `NEO4J_USER` | Neo4j username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password | - |
| `NEO4J_DATABASE` | Neo4j database name | `neo4j` |
| `OLLAMA_BASE_URL` | OLLAMA service URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | OLLAMA model name | `llama2` |
| `OLLAMA_TIMEOUT` | Request timeout (seconds) | `60` |
| `AI_SERVICE_MODE` | AI mode (online/offline/auto) | `auto` |
| `AI_RETRY_ATTEMPTS` | Retry attempts | `3` |
| `AI_TIMEOUT_SECONDS` | AI timeout | `30` |

## Troubleshooting

### OLLAMA Not Connecting

```bash
# Check OLLAMA status
ollama list

# Test OLLAMA API
curl http://localhost:11434/api/tags

# Restart OLLAMA (Windows)
# Task Manager > Services > Restart OLLAMA

# Check logs
# Windows: C:\Users\<user>\.ollama\logs\
```

### Neo4j Connection Failed

```bash
# Verify credentials in .env
# Test connection with Neo4j Browser
# Check firewall rules for port 7687
```

### Port Already in Use

```powershell
# Windows: Find process using port 8000
netstat -ano | findstr :8000
taskkill /PID <process-id> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

### Import Errors

```bash
# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Check Python version
python --version  # Should be 3.10+
```

## Testing

### Manual Testing

```bash
# Health check
curl http://localhost:8000/api/health

# Orchestration pipeline test
curl -X POST http://localhost:8000/api/orchestration/runs \
  -H "Content-Type: application/json" \
  -d '{
    "userRequest": "Create a chocolate chip cookie recipe",
    "result": {
      "id": "test-run-001",
      "status": "success",
      "recipe": {
        "name": "Chocolate Chip Cookies",
        "ingredients": [
          {"id": "1", "name": "Flour", "percentage": 50.0},
          {"id": "2", "name": "Sugar", "percentage": 25.0},
          {"id": "3", "name": "Butter", "percentage": 20.0},
          {"id": "4", "name": "Chocolate Chips", "percentage": 5.0}
        ],
        "totalPercentage": 100.0
      },
      "calculation": {
        "targetBatchSize": 1000,
        "targetUnit": "g",
        "costs": {"total": 5.50, "perKg": 5.50}
      },
      "graph": {
        "nodes": [],
        "edges": []
      },
      "validation": {
        "valid": true,
        "errors": [],
        "warnings": []
      },
      "uiConfig": {
        "layout": "default"
      },
      "agentHistory": [
        {"agent": "RecipeEngineer", "duration": 800, "status": "success"},
        {"agent": "ScalingCalculator", "duration": 500, "status": "success"},
        {"agent": "QAValidator", "duration": 300, "status": "success"}
      ],
      "totalDuration": 1600,
      "timestamp": "2025-11-11T12:00:00Z"
    },
    "targetBatchSize": 1000.0,
    "targetUnit": "g",
    "includeCosts": true
  }'

# FDC quick ingest
curl -X POST http://localhost:8000/api/fdc/quick-ingest \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "your-fdc-key",
    "search_term": "almond butter",
    "count": 5
  }'

# Create formulation
curl -X POST http://localhost:8000/api/formulations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Recipe",
    "status": "draft",
    "ingredients": [
      {"name": "Ingredient A", "percentage": 60.0},
      {"name": "Ingredient B", "percentage": 40.0}
    ]
  }'

# AI Query
curl -X POST http://localhost:8000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Show all formulations",
    "service_mode": "auto"
  }'
```

### Automated Testing

```bash
pytest
```

### Load Sample Data

```bash
curl -X POST http://localhost:8000/api/sample-data/load \
  -H "Content-Type: application/json" \
  -d '{"clear_existing": true, "datasets": ["all"]}'
```

## Performance Tuning

### Uvicorn Workers

```bash
# Multiple workers for production
uvicorn main:app --workers 4 --host 0.0.0.0 --port 8000
```

### OLLAMA Performance

```bash
# Use GPU acceleration (if available)
# Automatically detected by OLLAMA

# Use smaller model for faster responses
ollama pull mistral
# Update OLLAMA_MODEL=mistral in .env
```

### Neo4j Optimization

- Create indexes on frequently queried properties
- Use appropriate batch sizes
- Enable connection pooling (handled by driver)

## Security Considerations

1. **Environment Variables**: Never commit `.env` file
2. **CORS**: Configure `CORS_ORIGINS` for production
3. **Authentication**: Add authentication middleware for production
4. **HTTPS**: Use reverse proxy (nginx/IIS) with SSL certificates
5. **Neo4j**: Use secure connection (neo4j+s://)
6. **Firewall**: Restrict ports to necessary services only

## Support

For issues or questions:
- Check API documentation: http://localhost:8000/docs
- Review logs for error details
- Verify all services are running (OLLAMA, Neo4j)

## License

Proprietary - TCS Internal Use
