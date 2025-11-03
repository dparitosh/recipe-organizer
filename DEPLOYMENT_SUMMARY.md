# Formulation Graph Studio - Complete Architecture & Deployment Guide

## Executive Summary

Formulation Graph Studio is a modern Food & Beverage formulation management platform with a clear frontend/backend separation designed for Azure Windows VM deployment.

### Architecture Stack

**Frontend:**
- React 19 with JSX (all components in .jsx format)
- Tailwind CSS v4 for styling
- shadcn/ui component library
- Cytoscape.js for graph visualization
- Vite for development and bundling

**Backend:**
- Python 3.10+ with FastAPI framework
- OLLAMA for local AI processing (replaces OpenAI)
- Neo4j graph database
- Pydantic for data validation
- OpenAPI/Swagger documentation
- Async/await for optimal performance

**Deployment:**
- Azure Windows VM (Standard_D4s_v3 or higher)
- OLLAMA service running locally on VM
- Neo4j Aura (cloud) or local Neo4j instance
- Windows Service configuration for automatic startup
- Frontend served via Vite or static hosting

## Directory Structure

```
formulation-graph-studio/
├── frontend/                   # React application (to be organized)
│   └── src/
│       ├── components/         # All .jsx components
│       ├── hooks/              # Custom React hooks
│       ├── lib/                # Utilities
│       └── assets/             # Static assets
├── backend/                    # Python FastAPI application
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints/      # API route handlers
│   │   │   │   ├── health.py   # Service health checks
│   │   │   │   ├── ai.py       # AI query processing
│   │   │   │   ├── formulations.py
│   │   │   │   ├── calculations.py
│   │   │   │   ├── graph.py
│   │   │   │   └── sample_data.py
│   │   │   └── routes.py
│   │   ├── core/
│   │   │   └── config.py       # Configuration
│   │   ├── db/
│   │   │   └── neo4j_client.py # Neo4j client
│   │   ├── models/
│   │   │   └── schemas.py      # Pydantic models
│   │   └── services/
│   │       └── ollama_service.py # OLLAMA AI service
│   ├── main.py                 # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   ├── setup-backend.bat       # Windows setup script
│   ├── setup-backend.sh        # Linux/Mac setup script
│   ├── start-backend.bat       # Windows start script
│   ├── start-backend.sh        # Linux/Mac start script
│   └── README.md
├── AZURE_DEPLOYMENT.md         # Azure deployment guide
└── PRD.md                      # Product requirements
```

## Backend API Architecture

### Core Components

#### 1. Main Application (main.py)
- FastAPI application with lifespan management
- CORS middleware configuration
- Service initialization (Neo4j, OLLAMA)
- Automatic API documentation at /docs

#### 2. Configuration (app/core/config.py)
- Environment-based configuration using pydantic-settings
- Neo4j connection settings
- OLLAMA service configuration
- AI service mode (online/offline/auto)

#### 3. Neo4j Client (app/db/neo4j_client.py)
- Official Neo4j Python driver integration
- Connection pooling and session management
- Query execution methods
- Health check functionality
- Graph data retrieval for visualization

#### 4. OLLAMA Service (app/services/ollama_service.py)
- Async HTTP client for OLLAMA API
- Natural language to Cypher query generation
- Context-aware answer generation
- Recommendation generation
- Health monitoring

#### 5. Pydantic Models (app/models/schemas.py)
- Request/response validation
- OpenAPI schema generation
- Type safety throughout application
- Business logic constraints

### API Endpoints

#### Health (`/api/health`)
- `GET /api/health` - Service health status
  - Returns: LLM availability, Neo4j availability, GenAI capability, response time

#### AI Assistant (`/api/ai`)
- `POST /api/ai/query` - Process natural language query
  - Request: query, service_mode, include_graph
  - Response: answer, mode, execution_time, confidence, data_sources, cypher_query, node_highlights, relationship_summaries, recommendations
  - Modes: online (with OLLAMA), offline (keyword search), auto (fallback)

#### Formulations (`/api/formulations`)
- `POST /api/formulations` - Create formulation
  - Validates ingredients sum to 100%
  - Stores in Neo4j with relationships
- `GET /api/formulations` - List formulations
  - Pagination support
  - Returns ingredients and metadata
- `GET /api/formulations/{id}` - Get formulation details

#### Calculations (`/api/calculations`)
- `POST /api/calculations/scale` - Scale formulation
  - Unit conversion (kg, g, L, mL, gal)
  - Cost calculation
  - Yield computation
  - Warning generation

#### Graph Data (`/api/graph`)
- `GET /api/graph/data` - Retrieve graph visualization data
  - Returns nodes and edges for Cytoscape
  - Configurable limit

#### Sample Data (`/api/sample-data`)
- `POST /api/sample-data/load` - Load sample datasets
  - Potato chips, cola, juices
  - Full relationship hierarchies
  - Constraints creation
- `DELETE /api/sample-data/clear` - Clear database

## OLLAMA Integration

### Why OLLAMA Instead of OpenAI?

1. **Local Deployment**: Runs entirely on Azure VM, no external API dependencies
2. **No API Costs**: Free to use, no per-token charges
3. **Data Privacy**: All processing happens locally, sensitive formulation data never leaves VM
4. **Offline Capability**: Works without internet connection
5. **Customizable**: Can use different models (llama2, mistral, etc.)

### OLLAMA Setup

```bash
# Windows
winget install Ollama.Ollama
ollama pull llama2

# Linux
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama2

# Verify
ollama list
curl http://localhost:11434/api/tags
```

### OLLAMA Service Features

1. **Cypher Query Generation**
   - Converts natural language to Neo4j Cypher queries
   - Uses graph schema context for accuracy
   - Temperature 0.3 for consistent query generation

2. **Answer Generation**
   - Context-aware responses using graph data
   - Multiple data source synthesis
   - Confidence scoring

3. **Recommendations**
   - Actionable suggestions based on query results
   - Categorized (cost_optimization, yield_improvement, etc.)
   - Impact level assessment

4. **Health Monitoring**
   - Automatic health checks
   - Timeout handling
   - Graceful degradation to offline mode

## Deployment Process

### Phase 1: Azure VM Setup (30 minutes)

1. Create Windows VM (Standard_D4s_v3 or higher)
2. Configure Network Security Group (ports 3389, 8000)
3. Connect via RDP
4. Install Windows updates

### Phase 2: Install Dependencies (20 minutes)

1. Install Python 3.10+ (`winget install Python.Python.3.11`)
2. Install OLLAMA (`winget install Ollama.Ollama`)
3. Pull OLLAMA model (`ollama pull llama2`)
4. Install NSSM for Windows Service (`choco install nssm`)
5. Configure Neo4j (Aura cloud or local)

### Phase 3: Deploy Backend (15 minutes)

1. Copy backend files to `C:\Apps\formulation-graph-studio\backend`
2. Run `setup-backend.bat`
3. Configure `.env` file with Neo4j credentials
4. Test manual start: `start-backend.bat`
5. Verify: `curl http://localhost:8000/api/health`

### Phase 4: Configure Windows Service (10 minutes)

```powershell
# Create service with NSSM
nssm install FormulationAPI "C:\Apps\formulation-graph-studio\backend\venv\Scripts\python.exe"
nssm set FormulationAPI AppParameters "C:\Apps\formulation-graph-studio\backend\main.py"
nssm set FormulationAPI AppDirectory "C:\Apps\formulation-graph-studio\backend"
nssm set FormulationAPI Start SERVICE_AUTO_START
nssm start FormulationAPI
```

### Phase 5: Network Configuration (10 minutes)

1. Configure Windows Firewall: Allow port 8000
2. Configure Azure NSG: Add inbound rule for port 8000
3. Test external access: `http://<VM-PUBLIC-IP>:8000/docs`

### Phase 6: Frontend Deployment (15 minutes)

1. Update frontend API URL to point to VM
2. Build frontend: `npm run build`
3. Deploy to static hosting or serve from VM
4. Test end-to-end connectivity

## Frontend Configuration

The frontend needs to be configured to communicate with the backend API:

### Option 1: Environment Variable (Recommended)

```bash
# .env.production
VITE_API_BASE_URL=http://<VM-PUBLIC-IP>:8000
```

### Option 2: Direct Configuration

```javascript
// src/config.js
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
```

### API Service Layer

All API calls should go through a centralized service:

```javascript
// src/services/api.js
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = {
  async health() {
    const response = await fetch(`${BASE_URL}/api/health`)
    return response.json()
  },
  
  async aiQuery(query, serviceMode = 'auto') {
    const response = await fetch(`${BASE_URL}/api/ai/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, service_mode: serviceMode, include_graph: true })
    })
    return response.json()
  },
  
  async createFormulation(data) {
    const response = await fetch(`${BASE_URL}/api/formulations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  },
  
  async getFormulations() {
    const response = await fetch(`${BASE_URL}/api/formulations`)
    return response.json()
  },
  
  async scaleFormulation(data) {
    const response = await fetch(`${BASE_URL}/api/calculations/scale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  },
  
  async getGraphData(limit = 100) {
    const response = await fetch(`${BASE_URL}/api/graph/data?limit=${limit}`)
    return response.json()
  },
  
  async loadSampleData(datasets = ['all']) {
    const response = await fetch(`${BASE_URL}/api/sample-data/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear_existing: true, datasets })
    })
    return response.json()
  }
}
```

## Testing Strategy

### Backend Testing

```powershell
# Health check
curl http://localhost:8000/api/health

# AI query
curl -X POST http://localhost:8000/api/ai/query `
  -H "Content-Type: application/json" `
  -d '{"query": "Show all formulations", "service_mode": "auto"}'

# Create formulation
curl -X POST http://localhost:8000/api/formulations `
  -H "Content-Type: application/json" `
  -d '{"name": "Test Recipe", "status": "draft", "ingredients": [{"name": "Ingredient A", "percentage": 60.0}, {"name": "Ingredient B", "percentage": 40.0}]}'

# Load sample data
curl -X POST http://localhost:8000/api/sample-data/load `
  -H "Content-Type: application/json" `
  -d '{"clear_existing": true, "datasets": ["all"]}'
```

### Integration Testing

1. Test frontend → backend communication
2. Test AI query processing (online and offline modes)
3. Test Neo4j connectivity and data retrieval
4. Test graph visualization rendering
5. Test formulation CRUD operations
6. Test calculation engine accuracy

## Monitoring & Maintenance

### Service Health Monitoring

```powershell
# Check service status
Get-Service FormulationAPI
nssm status FormulationAPI

# View logs
Get-Content C:\Apps\formulation-graph-studio\backend\logs\service-output.log -Tail 50 -Wait

# Check OLLAMA
Get-Service Ollama
curl http://localhost:11434/api/tags
```

### Performance Monitoring

- Monitor CPU and memory usage
- Track API response times via `/api/health`
- Monitor OLLAMA model performance
- Check Neo4j connection pool metrics

### Backup Strategy

1. **Application Code**: Version control (Git)
2. **Configuration**: Backup `.env` file regularly
3. **Neo4j Data**: Use Neo4j backup tools or export to GraphML
4. **Logs**: Archive logs periodically

## Security Considerations

1. **Credentials**: Store Neo4j credentials in `.env`, never in code
2. **CORS**: Configure allowed origins in production
3. **Firewall**: Restrict port 8000 to necessary IP ranges
4. **HTTPS**: Use reverse proxy (IIS/nginx) with SSL for production
5. **Updates**: Keep Python, OLLAMA, and dependencies updated
6. **Access Control**: Add authentication/authorization middleware
7. **Data Encryption**: Use Neo4j SSL (neo4j+s://)

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Service won't start | Check logs, verify Python path, check port availability |
| OLLAMA not responding | Restart OLLAMA service, check model is downloaded |
| Neo4j connection failed | Verify credentials, check firewall, test with Neo4j Browser |
| Can't access from network | Check Windows Firewall and Azure NSG rules |
| High CPU usage | Use smaller OLLAMA model (mistral), optimize queries |
| AI query timeout | Increase `AI_TIMEOUT_SECONDS`, check OLLAMA performance |
| Import errors | Reinstall requirements: `pip install -r requirements.txt --upgrade` |

## Next Steps

1. **Complete Backend Deployment**: Follow AZURE_DEPLOYMENT.md
2. **Configure Frontend**: Update API URL to point to backend
3. **Test Integration**: Verify all features work end-to-end
4. **Load Sample Data**: Use `/api/sample-data/load` endpoint
5. **Monitor Performance**: Check logs and health endpoints
6. **Security Hardening**: Implement authentication, HTTPS, IP restrictions
7. **Documentation**: Train users on AI Assistant and graph features

## Support Resources

- **API Documentation**: http://<VM-IP>:8000/docs
- **Backend README**: backend/README.md
- **Azure Deployment Guide**: AZURE_DEPLOYMENT.md
- **OLLAMA Docs**: https://ollama.ai/docs
- **Neo4j Docs**: https://neo4j.com/docs/
- **FastAPI Docs**: https://fastapi.tiangolo.com/

## Conclusion

The backend is now fully implemented with:
- ✅ Complete FastAPI application with OpenAPI standards
- ✅ OLLAMA AI integration for local processing
- ✅ Neo4j graph database client
- ✅ Comprehensive API endpoints
- ✅ Service health monitoring
- ✅ Graceful degradation (online/offline modes)
- ✅ Azure deployment scripts and documentation
- ✅ Windows Service configuration
- ✅ Sample data loading
- ✅ Complete deployment guides

The application is ready for Azure Windows VM deployment with OLLAMA and Neo4j!
