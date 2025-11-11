# Manual Installation & Configuration Guide

This document captures the steps required to stand up the Formulation Graph Studio stack without relying on automation scripts. Follow the sections in order when bringing up a fresh developer environment or validating CI instructions.

---

## 1. System Prerequisites

- Windows 11 / Windows Server 2022 (PowerShell 7 recommended)
- Git (latest stable) with credential manager
- Node.js 18 LTS or newer (includes npm)
- Python 3.12.x with pip
- Neo4j Aura instance (or local Neo4j 5.x server)
- Ollama CLI for local LLM inference (https://ollama.com)

> Optional: VS Code with Python, Pylance, ESLint, and GraphQL extensions.

---

## 2. Repository Checkout

```powershell
# Clone the repository
cd C:\Users\<you>
git clone https://github.com/<org>/recipe-organizer.git
cd recipe-organizer

# Ensure submodules (if any) are synced
# git submodule update --init --recursive
```

---

## 3. Python Backend Setup

### 3.1 Preferred (Windows PowerShell)

```powershell
cd C:\Users\<you>\recipe-organizer
./setup-backend.ps1            # add -Force to rebuild an existing venv
```

### 3.2 Preferred (macOS / Linux)

```bash
cd ~/recipe-organizer
chmod +x setup-backend.sh
./setup-backend.sh
```

These scripts will:

- Create or recreate `backend\venv`
- Install `requirements.txt` (and `requirements-dev.txt` when present)
- Copy `.env.example` → `.env` and `env.local.json.example` → `env.local.json`
- Remind you to update credentials before running the API

> The scripts intentionally rebuild the virtual environment. **Do not copy `backend\venv` between machines**—its executables contain absolute paths that will fail elsewhere.

### 3.3 Manual Setup (if you prefer direct commands)

```powershell
cd backend
py -3.12 -m venv venv
venv\Scripts\Activate.ps1      # macOS/Linux: source venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if (Test-Path requirements-dev.txt) { python -m pip install -r requirements-dev.txt }
Copy-Item .env.example .env -Force
Copy-Item env.local.json.example env.local.json -Force
```

Populate `.env` / `env.local.json` with real values:

- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `NEO4J_DATABASE`
- `OLLAMA_BASE_URL` (typically `http://localhost:11434`)
- `OLLAMA_MODEL` (e.g., `llama3:latest`)
- `OLLAMA_EMBED_MODEL` for GraphRAG embeddings (e.g., `nomic-embed-text:latest`)
- `FDC_API_KEY`

> **Low VRAM tip:** set `OLLAMA_GPU_LAYERS=0` before `ollama serve` so `llama3` loads fully in system RAM instead of the GPU.

### 3.4 Launch Backend

```powershell
# Scripted launch (auto-detects backend\venv or repo\.venv)
./start-backend.ps1

# Manual launch
cd backend
venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Confirm health:

```
GET http://localhost:8000/health → {"status":"healthy"}
```

---

## 4. Frontend Setup

```powershell
cd ..  # back to repo root
npm install
npm run dev
```

Visit http://localhost:5173.

> Frontend uses Vite. Press `h` in the dev server terminal for helper commands.

---

## 5. Ollama & Model Preparation

1. Install the Ollama CLI and ensure `ollama` is on PATH.
2. Run `ollama serve` (or `start-ollama.ps1`).
3. Pull required models:
   ```powershell
   ollama pull llama3:latest
   ollama pull nomic-embed-text:latest
   ```
4. For low VRAM machines:
   ```powershell
   $env:OLLAMA_GPU_LAYERS = 0
   ollama serve
   ```

---

## 6. Neo4j Configuration

1. Create a database (Aura or self-hosted) and note the Bolt+SSL URI.
2. Ensure the vector index `knowledge_chunks` exists if using GraphRAG features.
3. Set credentials in `.env` / `env.local.json`.
4. Optional: run ingestion scripts under `backend/scripts/` for sample data.

---

## 7. End-to-End Smoke Test

1. Start backend (`start-backend.ps1` / `.bat` / `.sh`).
2. Start frontend (`npm run dev` or `start-frontend.ps1`).
3. Hit http://localhost:5173 and run an AI conversation.
4. Verify `/api/ai/query` returns 200 responses.

If you encounter errors:
- Check backend logs for missing env vars or Ollama errors.
- Ensure Ollama server is running and the model fits in memory.
- Confirm Neo4j credentials and network access.

---

## 8. Troubleshooting Cheatsheet

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `ModuleNotFoundError: requests` | Requirements not installed in venv | Re-run `python -m pip install -r requirements*.txt` inside the activated venv |
| `Ollama API error: model requires more system memory` | Model too large for GPU VRAM | Run with `OLLAMA_GPU_LAYERS=0` or use smaller model (`llama3.2:1b`) |
| `GraphRAG retrieval skipped` log | Embedding model not configured | Set `OLLAMA_EMBED_MODEL` / `GRAPHRAG_*` settings and pull the embed model |
| 502 from `/api/ai/query` | Backend couldn’t generate LLM response | Check Ollama status; confirm model pulled and server running |

---

## 9. Useful Commands

```powershell
# Backend tests
cd backend
venv\Scripts\Activate.ps1
python -m pytest

# Frontend tests
cd ..
npm run test

# Format frontend
npm run lint
npm run format
```

---

## 10. Pre-Commit Checklist

- [ ] `.env` and `env.local.json` contain valid secrets (never commit real credentials)
- [ ] Backend tests: `python -m pytest`
- [ ] Frontend tests: `npm run test`
- [ ] Vite dev server loads without errors
- [ ] `/api/health` and `/api/ai/query` reachable
- [ ] Neo4j console shows expected graph data

---

Document last updated: 2025-11-11. Update this guide whenever new services, scripts, or configuration keys are introduced.
