# Important: Project Structure Clarification

## Current Situation
This Spark template is designed for **frontend-only applications** that run in the browser. However, your project includes:
- Frontend (React/TypeScript)
- Backend (Python/FastAPI)
- Database (Neo4j)
- AI Service (OLLAMA)

## The Problem
The Spark runtime environment:
- ✅ Supports React, TypeScript, and browser-based code
- ❌ Cannot run Python backends
- ❌ Cannot host Neo4j databases
- ❌ Cannot run OLLAMA

## Your Deployment Plan (Azure VM)
You mentioned deploying to an **Azure Windows VM**, which is the correct approach for this type of application. On the VM, you'll have:
- Frontend served by Vite/Node
- Backend FastAPI Python server
- Neo4j database
- OLLAMA AI service

## Recommended Project Structure

For Azure VM deployment, you should organize as:

```
project-root/
├── frontend/              # All React/TypeScript code
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/               # All Python FastAPI code
│   ├── app/
│   ├── requirements.txt
│   ├── main.py
│   └── ...
│
├── docs/                  # Essential documentation only
│   ├── README.md
│   ├── AZURE_DEPLOYMENT.md
│   └── API_DOCUMENTATION.md
│
├── scripts/               # Deployment and setup scripts
│   ├── setup-backend.sh
│   ├── start-backend.sh
│   └── deploy-azure.sh
│
└── docker-compose.yml     # Optional: for containerized deployment
```

## What to Do Next

### Option 1: Keep Current Structure (Simpler)
Keep frontend files in root, backend in `backend/` folder. Just clean up duplicates.

### Option 2: Reorganize (Better for deployment)
Move all frontend files into a `frontend/` folder to separate concerns clearly.

## Immediate Cleanup Recommendations

Regardless of structure choice, you should DELETE:

1. **All .jsx files** (22 files) - Keep only .tsx versions
2. **Test files** - Not needed for production deployment
3. **Excessive docs** - 55+ markdown files documenting the build process
4. **Cleanup scripts** - Already executed or not needed

This will reduce clutter and make the project cleaner for Azure deployment.

## Note About This Spark Environment
The Spark agent can help you build and refine the **frontend code**, but the backend Python code and database setup need to be handled separately when you deploy to Azure VM.
