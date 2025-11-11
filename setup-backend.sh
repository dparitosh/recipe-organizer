#!/usr/bin/env bash

set -euo pipefail

echo "========================================="
echo "Formulation Graph Studio - Backend Setup"
echo "========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
VENV_DIR="$BACKEND_DIR/venv"

if [ ! -d "$BACKEND_DIR" ]; then
    echo "[ERROR] backend directory not found at $BACKEND_DIR" >&2
    exit 1
fi

cd "$BACKEND_DIR"

if [ -d "$VENV_DIR" ]; then
    read -rp "Existing backend/venv detected. Recreate it? [y/N] " RECREATE
    if [[ "$RECREATE" =~ ^[Yy]$ ]]; then
        echo "Removing existing virtual environment..."
        rm -rf "$VENV_DIR"
    else
        echo "Keeping existing virtual environment."
    fi
fi

if [ ! -x "$VENV_DIR/bin/python" ]; then
    echo "Creating Python virtual environment under backend/venv ..."
    if command -v python3 >/dev/null 2>&1; then
        python3 -m venv "$VENV_DIR"
    else
        python -m venv "$VENV_DIR"
    fi
    echo "✓ Virtual environment created."
else
    echo "✓ Virtual environment ready at backend/venv."
fi

echo ""
echo "Activating virtual environment..."
# shellcheck disable=SC1090
source "$VENV_DIR/bin/activate"

echo ""
echo "Installing dependencies..."
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if [ -f "requirements-dev.txt" ]; then
    python -m pip install -r requirements-dev.txt
fi
echo "✓ Dependencies installed."

echo ""
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✓ backend/.env created. Update Neo4j and Ollama credentials before starting the server."
    else
        echo "[WARN] .env.example not found. Create backend/.env manually."
    fi
else
    echo "✓ backend/.env already present."
fi

if [ ! -f "env.local.json" ] && [ -f "env.local.json.example" ]; then
    cp env.local.json.example env.local.json
    echo "✓ env.local.json created (optional runtime overrides)."
fi

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env and env.local.json with real credentials."
echo "  2. (Optional) Pull Ollama models:  ollama pull llama3:latest"
echo "  3. Start backend: ./start-backend.sh"
echo ""
echo "To run the API manually:"
echo "  cd backend"
echo "  source venv/bin/activate"
echo "  uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "Remember: do not copy backend/venv between machines—recreate it with this script."
echo ""
