# Formulation Graph Studio Backend - Linux/Mac Setup Script

#!/bin/bash

echo "========================================"
echo "Formulation Graph Studio Backend Setup"
echo "========================================"
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Check Python installation
echo "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed!"
    echo "Please install Python 3.10 or higher"
    exit 1
fi

# Display Python version
python3 --version

# Check if venv exists
if [ -d "venv" ]; then
    echo ""
    read -p "Virtual environment already exists. Recreate it? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Removing existing virtual environment..."
        rm -rf venv
    fi
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo ""
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo ""
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo ""
echo "Installing dependencies..."
pip install -r requirements.txt

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "========================================"
    echo "IMPORTANT: Configure your .env file"
    echo "========================================"
    echo "Please edit .env file with your:"
    echo "- Neo4j connection details"
    echo "- OLLAMA configuration"
    echo ""
fi

# Check OLLAMA
echo ""
echo "Checking OLLAMA installation..."
if command -v ollama &> /dev/null; then
    echo "✓ OLLAMA found!"
    echo ""
    echo "Checking OLLAMA models..."
    ollama list
    echo ""
    echo "If llama2 is not listed, run: ollama pull llama2"
else
    echo ""
    echo "WARNING: OLLAMA not found"
    echo "Please install OLLAMA:"
    echo "  curl -fsSL https://ollama.ai/install.sh | sh"
    echo "After installation, run: ollama pull llama2"
    echo ""
fi

# Make start script executable
chmod +x start-backend.sh

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Ensure OLLAMA is running (ollama serve)"
echo "3. Ensure Neo4j is accessible"
echo "4. Run: ./start-backend.sh"
echo ""
echo "Documentation: README.md"
echo ""
