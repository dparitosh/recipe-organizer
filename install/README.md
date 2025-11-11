# Installation and Configuration (Windows)

This folder contains PowerShell scripts and a short guide to install and configure the Formulation Graph Studio backend on Windows.

Overview:
- `install.ps1` — Interactive installer that prompts for required settings and writes `backend/env.local.json`.
- `configure.ps1` — Non-interactive script to create `backend/env.local.json` from environment variables or a provided file.
- `start_services.ps1` — Starts the Python backend (uvicorn) in a new PowerShell window after creating a venv and installing requirements.

Prerequisites:
- Windows 10/11 with PowerShell 7+ recommended.
- Python 3.11/3.12 installed and on PATH (or use the script to point to a local interpreter).
- Node.js (optional) if you plan to run the frontend or seed scripts that use npm/node.
- Neo4j instance reachable from the machine (Aura or self-hosted).
- Ollama or alternative embedding service reachable from the machine.

Quick start (recommended):
1. Open PowerShell as Administrator.
2. Run `.
un-install.ps1` (or `.uild-and-start.ps1`) from this folder.

Files created by these scripts:
- `backend/env.local.json` — local overrides used by the backend to load environment values.

Security notes:
- Do not check `backend/env.local.json` into source control.
- Use secure secrets storage for production (Azure Key Vault, Windows Credential Manager, etc.).
