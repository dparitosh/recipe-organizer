# Formulation Graph Studio - Complete Setup Guide

## Overview

This application uses a **two-tier architecture**:
- **Frontend**: React 19 + JSX (all files are .jsx, NOT .tsx)
- **Backend**: Python FastAPI with AI logic

## Quick Start Commands

```bash
# 1. Setup backend (one-time)
chmod +x setup-backend.sh
./setup-backend.sh

# 2. Edit backend/.env and add your OpenAI API key

# 3. Start backend server
chmod +x start-backend.sh
./start-backend.sh

# 4. In another terminal, start frontend
npm install
npm run dev

# 5. Configure frontend (in browser)
# Settings → AI Service → Backend URL: http://localhost:8000 → Test → Save
```

## Detailed Setup

### Backend Setup

#### Prerequisites
- Python 3.9 or higher
- pip (Python package manager)
- OpenAI API key (get from https://platform.openai.com/api-keys)

#### Installation Steps

1. **Run Setup Script**
   ```bash
   chmod +x setup-backend.sh
   ./setup-backend.sh
   ```

2. **Configure Environment**
   
   Edit `backend/.env`:
   ```env
   NEO4J_URI=neo4j+s://2cccd05b.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-secure-password
   NEO4J_DATABASE=neo4j
   OPENAI_API_KEY=sk-your-actual-key-here
   ```

3. **Start Backend**
   ```bash
   chmod +x start-backend.sh
   ./start-backend.sh
   ```
   
   Or manually:
   ```bash
   cd backend
   source venv/bin/activate
   python main.py
   ```

4. **Verify Backend**
   ```bash
   curl http://localhost:8000/
   # Should return: {"message": "Formulation Graph Studio API", "version": "1.0.0"}
   ```

### Frontend Setup

#### Prerequisites
- Node.js 18 or higher
- npm or yarn

#### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Configure Backend Connection**
   
   In the browser:
   - Navigate to **Settings** → **AI Service**
   - Backend URL: `http://localhost:8000`
   - Click **Test** to verify connection
   - Click **Save**
   - Set Service Mode to **Auto** (recommended)

4. **Verify Setup**
   
   Navigate to **AI Assistant** tab and ask a question. Mode badge should show "Online" if connected.

## File Structure

```
/workspaces/spark-template/
├── backend/                    # Python FastAPI backend
│   ├── main.py                # Main FastAPI application
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example          # Environment template
│   ├── .env                  # Your configuration (create this)
│   └── README.md             # Backend documentation
│
├── src/                       # React frontend (ALL JSX)
│   ├── App.jsx               # Main app component
│   ├── components/           # React components (JSX only)
│   │   ├── AIAssistantPanel.jsx
│   │   ├── AIServiceSettings.jsx
│   │   └── ...
│   ├── lib/
│   │   ├── ai.js            # AI service client for backend
│   │   └── utils.js
│   └── index.css            # Tailwind styles
│
├── setup-backend.sh          # Backend setup script
├── start-backend.sh          # Backend start script
├── test-backend.sh           # Backend test script
├── BACKEND_INTEGRATION_GUIDE.md
└── README.md
```

## Important: JSX vs TypeScript

**All frontend files are JSX**, not TypeScript (.tsx):

✅ Correct:
- `App.jsx`
- `AIAssistantPanel.jsx`
- `lib/ai.js`

❌ Wrong:
- `App.tsx`
- `AIAssistantPanel.tsx`
- `lib/ai.ts`

If you see `.tsx` or `.ts` files, they should be converted to `.jsx` or `.js`.

## AI Service Modes

### Online Mode
**Requirements:** Backend running + OpenAI API key  
**Features:** Full GPT-4, Cypher generation, 85% confidence  
**Use When:** You want maximum accuracy and intelligence

### Offline Mode
**Requirements:** None  
**Features:** Keyword search, 30% confidence, generic recommendations  
**Use When:** Backend unavailable or testing without API key

### Auto Mode (Recommended)
**Requirements:** None (graceful degradation)  
**Features:** Online with automatic offline fallback  
**Use When:** Production use, maximum reliability

## Testing

### Test Backend Health

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
  "response_time_ms": 123
}
```

### Test AI Query

```bash
curl -X POST http://localhost:8000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Show all recipes",
    "service_mode": "auto",
    "include_graph": true
  }'
```

### Run Test Suite

```bash
chmod +x test-backend.sh
./test-backend.sh
```

## API Documentation

Once backend is running:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

These provide interactive API documentation and testing.

## Troubleshooting

### Backend Won't Start

**Problem:** `ModuleNotFoundError: No module named 'fastapi'`  
**Solution:** Run `pip install -r requirements.txt`

**Problem:** `Port 8000 already in use`  
**Solution:** Kill existing process:
```bash
lsof -ti:8000 | xargs kill -9
```

### OpenAI Errors

**Problem:** `AuthenticationError: Invalid API key`  
**Solution:** 
1. Get valid key from https://platform.openai.com/api-keys
2. Update `backend/.env` with correct key
3. Restart backend

**Problem:** `RateLimitError`  
**Solution:** Wait or upgrade OpenAI plan

### Neo4j Connection Issues

**Problem:** `ServiceUnavailable: Connection refused`  
**Solution:** 
1. Verify credentials in `backend/.env`
2. Check Neo4j instance is running
3. Test connection in Settings → Integrations

### Frontend Connection Errors

**Problem:** Frontend shows "Offline" even though backend running  
**Solution:**
1. Test: `curl http://localhost:8000/api/health`
2. Check Settings → AI Service → Backend URL
3. Click Test to verify
4. Check browser console for CORS errors

### TypeScript Errors

**Problem:** TypeScript compilation errors  
**Solution:** All files should be JSX, not TSX. If you see `.tsx` files, they need conversion.

## Environment Variables

### Backend (.env)

```env
# Neo4j Connection
NEO4J_URI=neo4j+s://2cccd05b.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-secure-password
NEO4J_DATABASE=neo4j

# OpenAI API
OPENAI_API_KEY=sk-your-key-here
```

### Frontend (useKV storage)

These are stored in browser using `useKV`:
- `backend-url`: Backend API URL
- `ai-service-mode`: online/offline/auto
- `ai-auto-fallback`: true/false

## Production Deployment

### Backend

1. **Use production ASGI server**
   ```bash
   pip install gunicorn
   gunicorn main:app -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
   ```

2. **Enable HTTPS/TLS**

3. **Restrict CORS**
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://your-domain.com"],
       ...
   )
   ```

4. **Use environment variables** (no .env file in production)

5. **Set up logging and monitoring**

### Frontend

1. **Build production bundle**
   ```bash
   npm run build
   ```

2. **Update backend URL** to production endpoint

3. **Serve with CDN/static hosting**

4. **Enable auto-fallback** by default

## Getting Help

1. **Check logs**
   - Backend: Terminal where `python main.py` is running
   - Frontend: Browser console (F12)

2. **Test health endpoint**
   ```bash
   curl http://localhost:8000/api/health
   ```

3. **Review documentation**
   - [BACKEND_INTEGRATION_GUIDE.md](./BACKEND_INTEGRATION_GUIDE.md)
   - [backend/README.md](./backend/README.md)
   - [AI_ASSISTANT_GUIDE.md](./AI_ASSISTANT_GUIDE.md)

4. **API docs**: http://localhost:8000/docs

## Features Summary

✅ Python FastAPI backend with OpenAI GPT-4  
✅ React JSX frontend (all .jsx files)  
✅ AI Assistant with online/offline/auto modes  
✅ Natural language to Cypher query generation  
✅ Neo4j graph database integration  
✅ Automatic fallback on service failure  
✅ Configurable backend URL with persistence  
✅ Health monitoring and status indicators  
✅ Comprehensive API documentation  
✅ Interactive Swagger UI for testing  

## Next Steps

1. ✅ Backend setup complete
2. ✅ Frontend configured
3. → Try AI Assistant with sample queries
4. → Load sample data (Sample Data tab)
5. → Explore graph relationships
6. → Create your first formulation
7. → Configure BOM and calculations

Happy formulating! 🧪
