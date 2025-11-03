#!/bin/bash

echo "========================================="
echo "Formulation Graph Studio - Backend Setup"
echo "========================================="
echo ""

cd backend

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

echo ""
echo "Activating virtual environment..."
source venv/bin/activate

echo ""
echo "Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠ Please edit backend/.env and add your OpenAI API key"
    echo "  NEO4J_URI=neo4j+s://2cccd05b.databases.neo4j.io"
    echo "  NEO4J_USER=neo4j"
    echo "  NEO4J_PASSWORD=tcs12345"
    echo "  NEO4J_DATABASE=neo4j"
    echo "  OPENAI_API_KEY=<your-key-here>"
else
    echo "✓ .env file exists"
fi

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "To start the backend server:"
echo "  cd backend"
echo "  source venv/bin/activate  # On Windows: venv\\Scripts\\activate"
echo "  python main.py"
echo ""
echo "The API will be available at: http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
echo ""
echo "Don't forget to configure your OpenAI API key in backend/.env"
echo ""
