# Formulation Graph Studio Backend - Linux/Mac Start Script

#!/bin/bash

echo "========================================"
echo "Formulation Graph Studio Backend"
echo "========================================"
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Check if venv exists
if [ ! -f "venv/bin/activate" ]; then
    echo "ERROR: Virtual environment not found!"
    echo "Please run setup-backend.sh first."
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "WARNING: .env file not found!"
    echo "Creating from .env.example..."
    cp .env.example .env
    echo "Please edit .env file with your configuration."
    read -p "Press enter to continue..."
fi

# Check if OLLAMA is running
echo "Checking OLLAMA service..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✓ OLLAMA service is running"
else
    echo "WARNING: OLLAMA service not responding at http://localhost:11434"
    echo "Please ensure OLLAMA is installed and running."
    echo "Install: curl -fsSL https://ollama.ai/install.sh | sh"
    echo "Start: ollama serve"
    echo ""
fi

echo ""
echo "Starting FastAPI server..."
echo "API will be available at: http://localhost:8000"
echo "Documentation: http://localhost:8000/docs"
echo ""

# Start the server
python main.py

# If server stops
echo ""
echo "Server stopped."
