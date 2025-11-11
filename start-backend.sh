#!/usr/bin/env bash

set -euo pipefail

echo "========================================="
echo "Starting Formulation Graph Studio Backend"
echo "========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
PRIMARY_VENV="$BACKEND_DIR/venv/bin/activate"
ROOT_VENV="$SCRIPT_DIR/.venv/bin/activate"

if [ ! -d "$BACKEND_DIR" ]; then
    echo "[ERROR] backend directory not found at $BACKEND_DIR" >&2
    exit 1
fi

if [ -f "$PRIMARY_VENV" ]; then
    # shellcheck disable=SC1090
    source "$PRIMARY_VENV"
elif [ -f "$ROOT_VENV" ]; then
    # shellcheck disable=SC1090
    source "$ROOT_VENV"
else
    echo "[ERROR] No virtual environment found. Run setup-backend.sh first." >&2
    exit 1
fi

cd "$BACKEND_DIR"

if [ ! -f ".env" ]; then
    echo "[WARN] backend/.env not found. Default configuration will be used."
fi

echo "Backend server starting on http://localhost:8000 (Ctrl+C to stop)"
echo ""

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
