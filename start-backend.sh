#!/bin/bash

echo "Starting Formulation Graph Studio Backend..."
echo ""

cd backend

if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run setup-backend.sh first."
    exit 1
fi

source venv/bin/activate

if [ ! -f ".env" ]; then
    echo "⚠ Warning: .env file not found. Using default configuration."
fi

echo "Backend server starting on http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""

python main.py
