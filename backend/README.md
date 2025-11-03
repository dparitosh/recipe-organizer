# Formulation Graph Studio - Python Backend

Python FastAPI backend handling all AI logic, Cypher generation, and business logic for the Formulation Graph Studio.

## Features

✅ **AI Query Processing** - Online, offline, and auto modes with seamless fallback  
✅ **Neo4j Integration** - Graph database queries with Cypher generation  
✅ **OpenAI GPT-4** - Natural language understanding and intelligent recommendations  
✅ **Health Monitoring** - Real-time service status for LLM, Neo4j, GenAI  
✅ **Formulation APIs** - REST endpoints for formulation CRUD operations  
✅ **Calculation Engine** - Scaling, yield, and cost calculations  
✅ **Auto Documentation** - Swagger UI and ReDoc at /docs and /redoc  
✅ **CORS Enabled** - Frontend integration ready  

## Quick Start

### Automated Setup (Recommended)

From project root:
```bash
chmod +x setup-backend.sh
./setup-backend.sh
```

Or on Windows:
```cmd
setup-backend.bat
```

### Manual Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate (Unix/Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### Configure Environment

Edit `.env`:

```env
NEO4J_URI=neo4j+s://2cccd05b.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=tcs12345
NEO4J_DATABASE=neo4j
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Get OpenAI API key:** https://platform.openai.com/api-keys

### Start Server

```bash
# Using start script (from project root)
./start-backend.sh

# Or manually
cd backend
source venv/bin/activate  # venv\Scripts\activate on Windows
python main.py
```

Server starts on: `http://localhost:8000`

### Verify Setup

```bash
# Test root endpoint
curl http://localhost:8000/

# Test health endpoint
curl http://localhost:8000/api/health
```

## API Documentation

Once running, access interactive documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Both provide:
- Complete API reference
- Request/response schemas
- Interactive testing interface
- Example requests

## API Endpoints

### Health Check

**GET** `/api/health`

Returns service status:

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

Process natural language queries with AI:

**Request:**
```json
{
  "query": "Show all recipes using mango concentrate with yield < 90%",
  "service_mode": "auto",
  "include_graph": true
}
```

**Response:**
```json
{
  "answer": "Found 3 recipes using mango concentrate...",
  "mode": "online",
  "execution_time_ms": 1850,
  "confidence": 0.85,
  "data_sources": ["OpenAI GPT-4", "Neo4j Graph"],
  "cypher_query": "MATCH (r:Recipe)-[:USES]->...",
  "node_highlights": [...],
  "relationship_summaries": [...],
  "recommendations": [...]
}
```

### Formulation Management

**POST** `/api/formulations`

Create new formulation:

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

**GET** `/api/formulations`

List all formulations.

### Calculation Engine

**POST** `/api/calculations/scale`

Scale formulation to batch size:

```json
{
  "formulation_id": "form_1234567890",
  "batch_size": 1000,
  "unit": "kg"
}
```

## AI Service Modes

### Online Mode

**Requirements:**
- Backend running
- Valid OpenAI API key
- Internet connection

**Capabilities:**
- Natural language understanding with GPT-4
- Automatic Cypher query generation
- Neo4j graph analysis
- High confidence answers (80-95%)
- Intelligent, actionable recommendations

**Example:**
```bash
curl -X POST http://localhost:8000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What formulations use vanilla extract?",
    "service_mode": "online",
    "include_graph": true
  }'
```

### Offline Mode

**Requirements:**
- None - fully local

**Capabilities:**
- Keyword-based search
- Simple data filtering
- Generic recommendations
- Low confidence (30-40%)

**When Used:**
- Backend unavailable
- No OpenAI API key
- Network issues
- User selects offline mode

### Auto Mode (Recommended)

**Behavior:**
1. Attempts online processing
2. Falls back to offline on failure
3. Transparent to user
4. Maximum reliability

**Configuration:**
- Default mode
- Configurable retry attempts
- Configurable timeout

## Dependencies

```txt
fastapi==0.115.0         # Web framework
uvicorn==0.32.0          # ASGI server
pydantic==2.10.0         # Data validation
neo4j==5.27.0            # Neo4j driver
openai==1.55.0           # OpenAI client
python-dotenv==1.0.1     # Environment vars
python-multipart==0.0.12 # File uploads
```

## Project Structure

```
backend/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── .env.example        # Environment template
├── .env                # Your config (create this)
├── venv/               # Virtual environment (created)
└── README.md           # This file
```

## Development

### Run in Development Mode

```bash
source venv/bin/activate
python main.py
```

Server automatically reloads on code changes.

### Run Tests

```bash
# From project root
./test-backend.sh
```

### Add Dependencies

```bash
pip install <package>
pip freeze > requirements.txt
```

## Troubleshooting

### Module Not Found

**Error:** `ModuleNotFoundError: No module named 'fastapi'`

**Fix:**
```bash
pip install -r requirements.txt
```

### Port Already in Use

**Error:** `Address already in use`

**Fix:**
```bash
# Unix/Linux/Mac
lsof -ti:8000 | xargs kill -9

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### OpenAI Authentication Error

**Error:** `AuthenticationError: Invalid API key`

**Fix:**
1. Get valid key from https://platform.openai.com/api-keys
2. Update `OPENAI_API_KEY` in `.env`
3. Restart backend

### Neo4j Connection Refused

**Error:** `ServiceUnavailable: Connection refused`

**Fix:**
1. Verify `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` in `.env`
2. Check Neo4j instance is running
3. Test credentials manually

### CORS Errors

If frontend can't connect:

1. Check CORS middleware in `main.py`
2. Ensure `allow_origins=["*"]` for development
3. Check frontend URL matches

## Production Deployment

### Use Production Server

```bash
pip install gunicorn
gunicorn main:app -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 -w 4
```

### Security

1. **Restrict CORS** to frontend domain only
2. **Enable HTTPS** with TLS certificates
3. **Use environment variables** (no .env in production)
4. **Rate limiting** for API endpoints
5. **JWT authentication** (future enhancement)

### Monitoring

1. **Logging**: Configure structured logging
2. **Health checks**: Monitor `/api/health`
3. **Metrics**: Track response times, error rates
4. **Alerts**: Set up alerts for downtime

## Architecture

```
┌─────────────────────────────────┐
│      React Frontend (JSX)       │
│  - AIAssistantPanel.jsx         │
│  - AIServiceSettings.jsx        │
│  - lib/ai.js                    │
└──────────────┬──────────────────┘
               │
               │ HTTP REST API
               │ JSON payloads
               │
┌──────────────▼──────────────────┐
│    Python FastAPI Backend       │
│  ┌──────────────────────────┐  │
│  │  main.py                 │  │
│  │  - Routes                │  │
│  │  - AI processing         │  │
│  │  - Validation            │  │
│  │  - Business logic        │  │
│  └──────────────────────────┘  │
└──────────┬───────────┬──────────┘
           │           │
           ▼           ▼
    ┌──────────┐  ┌──────────┐
    │  Neo4j   │  │  OpenAI  │
    │  Graph   │  │   GPT-4  │
    └──────────┘  └──────────┘
```

## Support

For issues:

1. Check server logs in terminal
2. Test health endpoint: `curl http://localhost:8000/api/health`
3. Review API docs: http://localhost:8000/docs
4. Check `.env` configuration
5. Verify Python version (3.9+)
6. Review [BACKEND_INTEGRATION_GUIDE.md](../BACKEND_INTEGRATION_GUIDE.md)

## License

MIT

---

**Ready to use!** Start the backend, configure the frontend, and enjoy AI-powered formulation management.
