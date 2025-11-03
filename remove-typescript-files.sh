#!/bin/bash

# Remove TypeScript Files - Keep JavaScript/JSX Only
# This script removes all .ts and .tsx files from the frontend
# Keeps: .js, .jsx files (frontend in JavaScript only)
# Keeps: .py files (backend in Python only)

set -e

echo "==========================================="
echo "Removing TypeScript Files"
echo "==========================================="
echo ""
echo "This script will remove all .ts and .tsx files"
echo "Keeping only .js and .jsx for frontend"
echo "Backend remains Python only"
echo ""

# Confirm before proceeding
read -p "Continue with TypeScript removal? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Removal cancelled."
    exit 1
fi

echo ""
echo "Starting TypeScript file removal..."
echo ""

# Track deleted files
DELETED_COUNT=0

# Function to delete file if it exists
delete_if_exists() {
    if [ -f "$1" ]; then
        rm -f "$1"
        echo "  ✓ Deleted: $1"
        ((DELETED_COUNT++))
    fi
}

# Core application files
echo "[1/9] Core application files..."
delete_if_exists "src/App.tsx"
delete_if_exists "src/ErrorFallback.tsx"

# Keep main.tsx and vite-end.d.ts as they are structural

# Hook files
echo "[2/9] Hook files..."
delete_if_exists "src/hooks/use-mobile.ts"

# Library files
echo "[3/9] Library files..."
delete_if_exists "src/lib/utils.ts"
delete_if_exists "src/lib/constants.ts"
delete_if_exists "src/lib/types.ts"
delete_if_exists "src/lib/foodData.ts"

# Library subdirectories - ai
echo "[4/9] Library AI files..."
delete_if_exists "src/lib/ai/ai-assistant.ts"
delete_if_exists "src/lib/ai/index.ts"

# Library subdirectories - api
echo "[5/9] Library API files..."
delete_if_exists "src/lib/api/mdg.ts"
delete_if_exists "src/lib/api/neo4j-api.ts"
delete_if_exists "src/lib/api/neo4j.ts"
delete_if_exists "src/lib/api/plm.ts"
delete_if_exists "src/lib/api/rest-endpoints.ts"
delete_if_exists "src/lib/api/service.ts"

# Library subdirectories - data
delete_if_exists "src/lib/data/sample-data-loader.ts"

# Library subdirectories - drivers
delete_if_exists "src/lib/drivers/index.ts"
delete_if_exists "src/lib/drivers/neo4j-driver.ts"

# Library subdirectories - engines
delete_if_exists "src/lib/engines/byproduct.ts"
delete_if_exists "src/lib/engines/calculationEngine.example.ts"
delete_if_exists "src/lib/engines/calculationEngine.ts"
delete_if_exists "src/lib/engines/cost.ts"
delete_if_exists "src/lib/engines/index.ts"
delete_if_exists "src/lib/engines/scaling.ts"
delete_if_exists "src/lib/engines/yield.ts"

# Library subdirectories - genai
delete_if_exists "src/lib/genai/genai-client.ts"
delete_if_exists "src/lib/genai/index.ts"

# Library subdirectories - graph
delete_if_exists "src/lib/graph/cytoscape-config.ts"

# Library subdirectories - managers
delete_if_exists "src/lib/managers/index.ts"
delete_if_exists "src/lib/managers/integration-manager.ts"
delete_if_exists "src/lib/managers/neo4j-manager.ts"

# Library subdirectories - schemas
delete_if_exists "src/lib/schemas/bom.ts"
delete_if_exists "src/lib/schemas/calculation-log.ts"
delete_if_exists "src/lib/schemas/formulation.ts"
delete_if_exists "src/lib/schemas/integration.ts"
delete_if_exists "src/lib/schemas/manufacturing-recipe.ts"
delete_if_exists "src/lib/schemas/master-recipe.ts"
delete_if_exists "src/lib/schemas/material-master.ts"
delete_if_exists "src/lib/schemas/sales-order.ts"

# Library subdirectories - services
delete_if_exists "src/lib/services/fdc-service.ts"

# Component files (root level)
echo "[6/9] Root component files..."
delete_if_exists "src/components/AIAssistantPanel.tsx"
delete_if_exists "src/components/AIServiceSettings.tsx"
delete_if_exists "src/components/APITester.tsx"
delete_if_exists "src/components/CalculationEngineInterface.tsx"
delete_if_exists "src/components/ConnectionTester.tsx"
delete_if_exists "src/components/DataExportButton.tsx"
delete_if_exists "src/components/DataImportMapper.tsx"
delete_if_exists "src/components/DataLoaderPanel.tsx"
delete_if_exists "src/components/EmptyState.tsx"
delete_if_exists "src/components/FDCDataIngestionPanel.tsx"
delete_if_exists "src/components/FoodDetailPanel.tsx"
delete_if_exists "src/components/GraphCanvas.tsx"
delete_if_exists "src/components/Neo4jSettings.tsx"
delete_if_exists "src/components/NodeEditor.tsx"
delete_if_exists "src/components/RecipeCard.tsx"
delete_if_exists "src/components/RecipeForm.tsx"
delete_if_exists "src/components/RecipeView.tsx"
delete_if_exists "src/components/SearchBar.tsx"
delete_if_exists "src/components/Toolbar.tsx"

# Component subdirectories - bom
echo "[7/9] BOM component files..."
delete_if_exists "src/components/bom/BOMConfigurator.tsx"
delete_if_exists "src/components/bom/CalculationSummary.tsx"
delete_if_exists "src/components/bom/IngredientTree.tsx"
delete_if_exists "src/components/bom/ProcessStepEditor.tsx"
delete_if_exists "src/components/bom/index.ts"

# Component subdirectories - formulation
delete_if_exists "src/components/formulation/CalculationPanel.tsx"
delete_if_exists "src/components/formulation/FormulationEditor.tsx"

# Component subdirectories - graph
delete_if_exists "src/components/graph/FormulationGraph.tsx"
delete_if_exists "src/components/graph/RelationshipGraphViewer.tsx"

# Component subdirectories - integrations
delete_if_exists "src/components/integrations/BackendConfigPanel.tsx"
delete_if_exists "src/components/integrations/FDCConfigPanel.tsx"
delete_if_exists "src/components/integrations/IntegrationPanel.tsx"
delete_if_exists "src/components/integrations/Neo4jConfigPanel.tsx"
delete_if_exists "src/components/integrations/Neo4jDataLoader.tsx"

# Layout components
echo "[8/9] Layout component files..."
delete_if_exists "src/components/layout/Header.tsx"
delete_if_exists "src/components/layout/MainContent.tsx"
delete_if_exists "src/components/layout/Sidebar.tsx"

# View components
echo "[9/9] View component files..."
delete_if_exists "src/components/views/FormulationsView.tsx"
delete_if_exists "src/components/views/GraphView.tsx"
delete_if_exists "src/components/views/IngestView.tsx"
delete_if_exists "src/components/views/SettingsView.tsx"
delete_if_exists "src/components/views/SettingsView-new.tsx"
delete_if_exists "src/components/views/SettingsView2.tsx"

echo ""
echo "==========================================="
echo "✅ TypeScript Removal Complete!"
echo "==========================================="
echo ""
echo "Summary:"
echo "  - TypeScript files deleted: $DELETED_COUNT"
echo "  - JavaScript/JSX files retained"
echo "  - Python backend files retained"
echo ""
echo "Preserved structural files:"
echo "  - src/main.tsx (required by vite)"
echo "  - src/vite-end.d.ts (type definitions)"
echo "  - vite.config.ts (vite configuration)"
echo "  - tsconfig.json (TypeScript configuration)"
echo "  - src/components/ui/*.tsx (shadcn components)"
echo ""
echo "Next steps:"
echo "  1. Test frontend: npm run dev"
echo "  2. Test backend: ./start-backend.sh"
echo "  3. Verify all features work correctly"
echo ""
