# Backend Setup and Integration Guide

## Architecture Overview

The Formulation Graph Studio uses a **two-tier architecture**:

```
┌──────────────────────────────────────┐
│        React Frontend (JSX)          │
│  - User Interface                    │
│  - Data Visualization                │
│  - State Management (useKV)          │
│  - Graph Rendering (Cytoscape)       │
└──────────────┬───────────────────────┘
               │
               │ HTTP REST API
               │ (JSON payloads)
               │
┌──────────────▼───────────────────────┐
│     Python FastAPI Backend           │
│  - AI Query Processing               │
│  - Natural Language to Cypher        │
│  - Business Logic                    │
│  - Data Validation                   │
└──────────┬───────────┬───────────────┘
           │           │
           ▼           ▼
    ┌──────────┐  ┌──────────┐
    │  Neo4j   │  │ OpenAI   │
    │  Graph   │  │  GPT-4   │
    └──────────┘  └──────────┘
```

## Backend Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

**Required packages:**
- `fastapi==0.115.0` - Web framework
- `uvicorn==0.32.0` - ASGI server
- `pydantic==2.10.0` - Data validation
- `neo4j==5.27.0` - Neo4j Python driver
- `openai==1.55.0` - OpenAI API client
- `python-dotenv==1.0.1` - Environment variables
- `python-multipart==0.0.12` - File uploads

### 2. Configure Environment Variables

Create `.env` file in the `backend/` directory:

```bash
cp .env.example .env
```

Edit `.env`:

```env
NEO4J_URI=neo4j+s://2cccd05b.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=tcs12345
NEO4J_DATABASE=neo4j
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

**Important:** Get your OpenAI API key from https://platform.openai.com/api-keys

### 2.1 Neo4j GenAI Plugin Prerequisites

Apps that interact with Neo4j through an LLM depend on the **Neo4j GenAI plugin**. Complete the following before starting the backend.

**Version / licensing requirements**
- Neo4j 5.16 or newer.
- Neo4j AuraDS or Aura Professional (includes GenAI toggle) *or* a self-managed Enterprise build with plugin support enabled.

**Neo4j Aura (preferred path)**
1. Sign in to the Aura console and choose the target instance.
2. Open **Plugins → GenAI**, switch the plugin to **Enabled**.
3. Under **Settings → GenAI**, choose your provider (OpenAI or Azure OpenAI) and add the API key, endpoint, and deployment/model name you plan to use.
4. Click **Save** and restart the instance if Aura prompts you.

**Self-managed Neo4j server**
1. Download the latest `neo4j-genai` plugin jar from the [Neo4j Download Center](https://neo4j.com/download-center/).
2. Place the jar inside the Neo4j `plugins/` directory (owned by the Neo4j service account).
3. Edit `neo4j.conf` and add:
  ```
  dbms.security.procedures.unrestricted=genai.*
  dbms.security.procedures.allowlist=genai.*
  dbms.security.procedures.roles=genai.*
  ```
4. Supply LLM credentials (pick one provider):
  - **OpenAI**
    ```
    genai.openai.apikey=<openai-api-key>
    genai.openai.model=gpt-4o-mini
    ```
  - **Azure OpenAI**
    ```
    genai.azureopenai.endpoint=https://<resource-name>.openai.azure.com/
    genai.azureopenai.deployment=<deployment-name>
    genai.azureopenai.apikey=<azure-openai-key>
    genai.azureopenai.api_version=2024-08-01-preview
    ```
  You can place these entries directly in `neo4j.conf` or export them as `NEO4J_dbms_connector_bolt_advertised__address` style environment variables (see docs for exact naming).
5. Restart Neo4j, then validate inside Neo4j Browser:
  ```cypher
  CALL genai.listProviders();
  ```
  The chosen provider should appear with status `READY`.

**Backend dependency**
```bash
pip install neo4j-genai
```
This Python helper lets the FastAPI service call the plugin procedures.

> For advanced configuration (e.g., Anthropic, Vertex AI), review the [Neo4j GenAI documentation](https://neo4j.com/docs/genai/current/).

### 3. Run the Backend Server

```bash
cd backend
python main.py
```

The server will start on `http://localhost:8000`

**Verify it's running:**
```bash
curl http://localhost:8000/
# Should return: {"message": "Formulation Graph Studio API", "version": "1.0.0"}
```

### 4. Test Health Endpoint

```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "llm_available": true,
  "neo4j_available": true,
  "genai_available": true,
  "response_time_ms": 245
}
```

## Frontend Configuration

### 1. Set Backend URL

In the React app, navigate to **Settings** → **AI Service** tab:

1. Enter Backend URL: `http://localhost:8000`
2. Click **Test** to verify connection
3. Click **Save** to persist configuration

The URL is stored using `useKV` and persists across sessions.

### 2. Configure Service Mode

Three modes available:

- **Online Mode**: Full AI with GPT-4 (requires backend + OpenAI key)
- **Auto Mode** (Recommended): Automatic fallback to offline on failure
- **Offline Mode**: Local keyword search only (no backend required)

## API Endpoints

### Health Check

**GET** `/api/health`

Checks service availability:

```json
{
  "status": "healthy",
  "llm_available": true,
  "neo4j_available": true,
  "genai_available": true,
  "response_time_ms": 123
}
```

### AI Query Processing

**POST** `/api/ai/query`

Request:
```json
{
  "query": "Show all recipes using mango concentrate with yield < 90%",
  "service_mode": "auto",
  "include_graph": true
}
```

Response:
```json
{
  "answer": "Found 3 recipes using mango concentrate...",
  "mode": "online",
  "execution_time_ms": 1850,
  "confidence": 0.85,
  "data_sources": ["OpenAI GPT-4", "Neo4j Graph"],
  "cypher_query": "MATCH (r:Recipe)-[:USES]->(i:Ingredient {name: 'Mango Concentrate'})...",
  "node_highlights": [
    {
      "id": 123,
      "type": "Recipe",
      "name": "Tropical Smoothie",
      "properties": {...}
    }
  ],
  "relationship_summaries": [
    {
      "type": "USES",
      "count": 5,
      "description": "Found 5 USES relationships"
    }
  ],
  "recommendations": [
    {
      "type": "yield_improvement",
      "impact": "high",
      "description": "Consider adjusting processing temperature...",
      "actionable": true
    }
  ]
}
```

### Create Formulation

**POST** `/api/formulations`

Request:
```json
{
  "name": "Potato Chips",
  "description": "Classic salted potato chips",
  "ingredients": [
    {"name": "Potato", "percentage": 85},
    {"name": "Palm Oil", "percentage": 12},
    {"name": "Salt", "percentage": 3}
  ]
}
```

Response:
```json
{
  "id": "form_1234567890",
  "name": "Potato Chips",
  "description": "Classic salted potato chips",
  "ingredients": [...],
  "total_percentage": 100.0,
  "created_at": "2024-01-15T10:30:00"
}
```

### Calculate Scale

**POST** `/api/calculations/scale`

Request:
```json
{
  "formulation_id": "form_1234567890",
  "batch_size": 1000,
  "unit": "kg"
}
```

Response:
```json
{
  "formulation_id": "form_1234567890",
  "batch_size": 1000,
  "unit": "kg",
  "scaled_ingredients": [
    {"name": "Potato", "quantity": 850, "unit": "kg"},
    {"name": "Palm Oil", "quantity": 120, "unit": "kg"},
    {"name": "Salt", "quantity": 30, "unit": "kg"}
  ],
  "total_cost": 2450.0,
  "cost_per_unit": 2.45,
  "yield_percentage": 95.0
}
```

## AI Service Modes

### Online Mode

**Requirements:**
- Backend server running
- Valid OpenAI API key in `.env`
- Neo4j connection (optional but recommended)

**Capabilities:**
- Natural language understanding with GPT-4
- Cypher query generation for graph database
- Intelligent recommendations
- High confidence answers (80-95%)

**Example:**
```javascript
const result = await fetch('http://localhost:8000/api/ai/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'What formulations use vanilla extract?',
    service_mode: 'online',
    include_graph: true
  })
})
```

### Offline Mode

**Requirements:**
- None - fully local

**Capabilities:**
- Keyword-based search
- Local formulation filtering
- Generic recommendations
- Low confidence (30-40%)

**When used:**
- Backend unavailable
- No internet connection
- OpenAI API key missing
- User explicitly selects offline mode

### Auto Mode (Recommended)

**Behavior:**
1. Attempts online processing first
2. If backend unavailable → falls back to offline
3. If OpenAI fails → falls back to offline
4. User sees mode indicator badge

**Configuration:**
```javascript
// In AIServiceSettings.jsx
const [serviceMode, setServiceMode] = useKV('ai-service-mode', 'auto')
const [autoFallback, setAutoFallback] = useKV('ai-auto-fallback', true)
```

## Frontend Integration

### Using the AI Assistant

```javascript
import { aiAssistant } from '@/lib/ai'

// Set backend URL (usually done in Settings)
aiAssistant.setBackendUrl('http://localhost:8000')

// Set service mode
aiAssistant.setServiceMode('auto')

// Query
const result = await aiAssistant.query({
  question: 'Show recipes with high cost',
  context: {
    formulations: [...],
    activeFormulationId: 'form_123'
  },
  serviceMode: 'auto'
})

console.log(result.answer)
console.log(result.mode) // 'online' or 'offline'
console.log(result.recommendations)
```

### Check Service Health

```javascript
const health = await aiAssistant.checkHealth()

if (health.llmAvailable) {
  console.log('GPT-4 is available')
}

if (health.neo4jAvailable) {
  console.log('Neo4j is connected')
}
```

## Troubleshooting

### Backend Not Starting

**Error:** `ModuleNotFoundError: No module named 'fastapi'`
- **Fix:** Run `pip install -r requirements.txt`

**Error:** `Port 8000 already in use`
- **Fix:** Kill existing process or change port:
  ```python
  uvicorn.run(app, host="0.0.0.0", port=8001)
  ```

### OpenAI API Errors

**Error:** `AuthenticationError: Invalid API key`
- **Fix:** Check `OPENAI_API_KEY` in `.env`
- Get valid key from https://platform.openai.com/api-keys

**Error:** `RateLimitError: Rate limit exceeded`
- **Fix:** Wait or upgrade OpenAI plan

### Neo4j Connection Issues

**Error:** `ServiceUnavailable: Connection refused`
- **Fix:** Check `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` in `.env`
- Verify Neo4j instance is running

### Frontend Connection Errors

**Error:** `Failed to fetch`
- **Fix:** Ensure backend is running on correct port
- Check CORS settings in `main.py` (should allow all origins for dev)

**Error:** `Offline fallback even though backend running`
- **Fix:** Test health endpoint directly: `curl http://localhost:8000/api/health`
- Check backend URL in Settings

## Production Deployment

### Backend

1. Use environment variables for all secrets
2. Enable HTTPS/TLS
3. Restrict CORS to frontend domain only
4. Use production ASGI server (Gunicorn + Uvicorn workers)
5. Set up logging and monitoring

```python
# Production CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Frontend

1. Update backend URL to production endpoint
2. Build React app: `npm run build`
3. Serve static files with CDN
4. Enable auto-fallback mode by default

## API Documentation

Once backend is running, access:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

These provide interactive API documentation and testing interfaces.

## Support

For issues:
1. Check backend logs
2. Test health endpoint
3. Verify environment variables
4. Check browser console for frontend errors
5. Review API documentation at `/docs`
