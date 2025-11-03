#!/bin/bash

echo "Testing Formulation Graph Studio Backend..."
echo ""

BACKEND_URL="http://localhost:8000"

echo "1. Testing root endpoint..."
curl -s $BACKEND_URL | python -m json.tool
echo ""

echo "2. Testing health endpoint..."
curl -s $BACKEND_URL/api/health | python -m json.tool
echo ""

echo "3. Testing AI query (offline mode)..."
curl -s -X POST $BACKEND_URL/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show all recipes", "service_mode": "offline", "include_graph": false}' \
  | python -m json.tool
echo ""

echo "Tests complete!"
echo ""
echo "To view full API documentation, visit:"
echo "  http://localhost:8000/docs"
