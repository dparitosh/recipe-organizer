# Installation & Configuration Guide

**Last Updated:** 2025-11-11  
**Version:** 1.0.0  
**Status:** ✅ Production Ready

## System Requirements

### Required Software
- **Node.js** 18+ (for frontend)
- **Python** 3.10+ (for backend)
- **Neo4j** Database (Aura Cloud or local)
- **Ollama** AI runtime (local installation)

### Recommended System
- **OS:** Windows 10/11, Ubuntu 20.04+, macOS 12+
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 5GB free space
- **CPU:** 4 cores recommended for Ollama

---

## Part 1: Frontend Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd recipe-organizer
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration (Optional)
Create `.env` file in project root:
```env
# Neo4j (configured via UI Settings - optional here)
VITE_NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
VITE_NEO4J_USER=neo4j
VITE_NEO4J_PASSWORD=your-password

# Backend API
VITE_BACKEND_URL=http://localhost:8000

# Optional integrations
VITE_PLM_API_URL=https://plm.company.com/api
VITE_PLM_API_KEY=your-plm-key
VITE_MDG_API_URL=https://sap.company.com/mdg/api
VITE_MDG_API_KEY=your-mdg-key
```

### 4. Start Frontend
```bash
npm run dev
```
Frontend will be available at: **http://localhost:5173**

### 5. Verify Installation
- Open browser to http://localhost:5173
- Click "New Formulation" to test mock mode
- No backend required for basic functionality

---

## Part 2: Backend Setup

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Create Virtual Environment
**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Python Dependencies
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### 4. Configure Backend Environment

#### Option A: Using `.env` file
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

# USDA FDC API (REQUIRED for nutrition data)
FDC_API_KEY=your-fdc-api-key
FDC_API_BASE_URL=https://api.nal.usda.gov/fdc/v1
FDC_REQUEST_TIMEOUT=30

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=False

# GraphRAG Settings
GRAPHRAG_CHUNK_INDEX_NAME=knowledge_chunks
GRAPHRAG_CACHE_MAX_ENTRIES=64
GRAPHRAG_CACHE_TTL_SECONDS=120
GRAPHRAG_CHUNK_CONTENT_MAX_CHARS=2000
```

#### Option B: Using `env.local.json` (Overrides `.env`)
Create `backend/env.local.json`:
```json
{
  "NEO4J_URI": "neo4j+s://xxxxx.databases.neo4j.io",
  "NEO4J_USER": "neo4j",
  "NEO4J_PASSWORD": "your-password",
  "NEO4J_DATABASE": "neo4j",
  "OLLAMA_BASE_URL": "http://localhost:11434",
  "OLLAMA_MODEL": "llama3:latest",
  "OLLAMA_EMBED_MODEL": "nomic-embed-text:latest",
  "FDC_API_KEY": "your-fdc-api-key",
     "FDC_API_BASE_URL": "https://api.nal.usda.gov/fdc/v1"
}
```

### 5. Start Backend Server

#### Windows:
```bash
start-backend.bat
```

#### Linux/macOS:
```bash
./start-backend.sh
```

#### Or using Python directly:
```bash
python main.py
```

Backend will be available at: **http://localhost:8000**  
API Documentation: **http://localhost:8000/docs**

---

## Part 3: Neo4j Setup

### Option A: Neo4j Aura (Cloud - Recommended)

1. **Sign Up**
   - Go to https://neo4j.com/cloud/aura/
   - Create free account
   - Click "Create Database" → "Free"

2. **Get Credentials**
   - Note connection URI (looks like `neo4j+s://xxxxx.databases.neo4j.io`)
   - Save generated password (shown once)
   - Username is `neo4j`

3. **Configure Application**
   - Update `backend/.env` or `backend/env.local.json`
   - Or configure via UI Settings panel

4. **Verify Connection**
   ```bash
   curl http://localhost:8000/api/health
   ```
   Should show `neo4j: healthy`

### Option B: Neo4j Desktop (Local)

1. **Download**
   - Get Neo4j Desktop from https://neo4j.com/download/

2. **Create Database**
   - Open Neo4j Desktop
   - Click "New" → "Create Local Database"
   - Set password
   - Click "Start"

3. **Get Connection Details**
   - URI: `neo4j://localhost:7687` or `bolt://localhost:7687`
   - User: `neo4j`
   - Password: (your chosen password)

4. **Update Configuration**
   ```env
   NEO4J_URI=neo4j://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-password
   ```

### Option C: Neo4j Docker

```bash
docker run \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your-password \
  neo4j:latest
```

Configuration:
```env
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
```

---

## Part 4: Ollama Setup

### Windows Installation

1. **Download Ollama**
   - Visit https://ollama.ai/download
   - Download Windows installer
   - Run installer

2. **Pull AI Models**
   ```powershell
   ollama pull llama3:latest
   ollama pull nomic-embed-text:latest
   ```

3. **Verify Installation**
   ```powershell
   ollama list
   curl http://localhost:11434/api/tags
   ```

4. **Start Ollama (if not running)**
   - Ollama runs as Windows service automatically
   - Or run `ollama serve` manually

### Linux Installation

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models
ollama pull llama3:latest
ollama pull nomic-embed-text:latest

# Verify
ollama list
curl http://localhost:11434/api/tags
```

### macOS Installation

```bash
# Download from https://ollama.ai/download
# Or use Homebrew
brew install ollama

# Pull models
ollama pull llama3:latest
ollama pull nomic-embed-text:latest

# Start service
ollama serve
```

### Alternative Models

```bash
# Faster, smaller model
ollama pull mistral

# Larger model (requires more RAM)
ollama pull llama3:13b

# Different embedding model
ollama pull mxbai-embed-large
```

Update `.env`:
```env
OLLAMA_MODEL=mistral
OLLAMA_EMBED_MODEL=mxbai-embed-large
```

---

## Part 5: USDA FDC API Key

### Get API Key

1. **Register**
   - Go to https://fdc.nal.usda.gov/api-key-signup.html
   - Fill registration form
   - Receive API key via email

2. **Configure Backend**
   - Add to `backend/.env`:
     ```env
     FDC_API_KEY=your-api-key-here
     ```
   - Or add to `backend/env.local.json`:
     ```json
     {
       "FDC_API_KEY": "your-api-key-here"
     }
     ```

3. **Test API Key**
   ```bash
   curl "https://api.nal.usda.gov/fdc/v1/foods/search?api_key=YOUR_KEY&query=apple"
   ```

---

## Part 6: Initial Data Loading

### 1. Load Sample Formulation Data

```bash
# Via API
curl -X POST http://localhost:8000/api/sample-data/load \
  -H "Content-Type: application/json" \
  -d '{"clear_existing": true, "datasets": ["all"]}'

# Or via Python script
cd backend
python scripts/load_sample_data.py
```

### 2. Seed USDA FDC Foods

```bash
# From project root
npm run seed:fdc

# Or manually with custom API key
node scripts/seed-fdc-data.mjs --api-key=YOUR_KEY
```

This ingests ~46 common foods (apple, broccoli, chicken, milk, olive oil) with full nutritional data.

### 2b. Test Multi-Agent Orchestration (Optional)

The system includes a multi-agent orchestration pipeline for recipe generation, cost calculation, and validation:

```bash
# Test orchestration with sample request
curl -X POST http://localhost:8000/api/orchestration/runs \
  -H "Content-Type: application/json" \
  -d '{
    "userRequest": "Create a chocolate chip cookie recipe",
    "result": {
      "id": "test-001",
      "status": "success",
      "recipe": {"name": "Chocolate Chip Cookies", "ingredients": []},
      "calculation": {"costs": {"total": 0}},
      "graph": {"nodes": [], "edges": []},
      "validation": {"valid": true},
      "uiConfig": {"layout": "default"},
      "agentHistory": [],
      "totalDuration": 1200,
      "timestamp": "2025-11-11T00:00:00Z"
    }
  }'
```

This creates an `OrchestrationRun` node in Neo4j with full audit trail.

### 3. Ingest GraphRAG Knowledge

```bash
cd backend
python scripts/graphrag_ingest.py --manifest ../config/graphrag_sources.json --output-dir tmp/graphrag
```

This creates knowledge chunks from:
- Formulations in Neo4j
- FDC nutrition data
- Documentation markdown files

---

## Part 7: Verification

### Backend Health Check
```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "neo4j": "healthy",
    "ollama": "healthy",
    "fdc": "healthy"
  }
}
```

### Frontend Connectivity
1. Open http://localhost:5173
2. Click Settings (⚙️) in top-right
3. Check service status indicators
4. All should show green "Connected"

### Test AI Query
```bash
curl -X POST http://localhost:8000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Show all formulations",
    "use_graph_context": true
  }'
```

### Test FDC Ingestion
```bash
curl http://localhost:8000/api/fdc/foods?page=1&page_size=10&include_nutrients=true
```

Should return list of ingested foods with nutrients.

---

## Part 8: Running Tests

### Backend Tests
```bash
cd backend
python -m pytest
```

All tests should pass (33 passed).

### Frontend Tests (if configured)
```bash
npm run test
```

---

## Troubleshooting

### Backend Port Already in Use
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <process-id> /F

# Linux/macOS
lsof -ti:8000 | xargs kill -9
```

### Ollama Not Responding
```bash
# Check status
ollama list

# Restart service (Windows)
# Open Services → Find "Ollama" → Restart

# Linux/macOS
pkill ollama
ollama serve
```

### Neo4j Connection Failed
- Verify credentials in `.env` or `env.local.json`
- Check firewall allows port 7687
- Test with Neo4j Browser: http://localhost:7474
- For Aura: ensure URI uses `neo4j+s://` protocol

### FDC API Rate Limit
- Free tier: 1000 requests/hour
- If exceeded, wait or upgrade plan
- Check response headers for rate limit status

### Frontend Can't Connect to Backend
- Verify backend is running on port 8000
- Check CORS settings in `backend/app/core/config.py`
- Ensure `VITE_BACKEND_URL` is correct in frontend `.env`

### Import Errors (Python)
```bash
# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Check Python version
python --version  # Should be 3.10+
```

---

## Configuration Summary

### Minimal Required Configuration

**Backend `.env`:**
```env
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_PASSWORD=your-password
OLLAMA_BASE_URL=http://localhost:11434
FDC_API_KEY=your-fdc-key
```

**Frontend:** Works with defaults, no `.env` required for mock mode.

### Full Configuration

See:
- `backend/.env.example` - All backend options
- `backend/env.local.json.example` - JSON override format
- `backend/app/core/config.py` - Configuration class with defaults

---

## Next Steps

1. ✅ **Read Documentation**
   - [AI_ASSISTANT_GUIDE.md](./AI_ASSISTANT_GUIDE.md) - AI features
   - [FDC_INTEGRATION_GUIDE.md](./FDC_INTEGRATION_GUIDE.md) - Nutrition data
   - [CAP-03_GRAPH_RAG_PLAN.md](./CAP-03_GRAPH_RAG_PLAN.md) - Knowledge graph

2. ✅ **Complete Testing Tasks**
   - See [TASK_TRACKER.md](./TASK_TRACKER.md) for pending items
   - Run DOC-01 manual QA checklist
   - Execute DOC-06 FDC pilot (5-10 foods)
   - Validate DOC-07 AI workflow

3. ✅ **Production Deployment**
   - See [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md) for cloud setup
   - Configure HTTPS with reverse proxy
   - Set up monitoring and logging
   - Enable authentication middleware

---

## Support & Resources

- **API Documentation:** http://localhost:8000/docs
- **Neo4j Browser:** http://localhost:7474
- **Ollama Docs:** https://ollama.ai/docs
- **USDA FDC API:** https://fdc.nal.usda.gov/api-guide.html

---

**Installation Complete! 🎉**

Your Formulation Graph Studio is ready. Start by creating a formulation or ask the AI assistant a question.
