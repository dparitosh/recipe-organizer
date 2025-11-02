#!/bin/bash

# Cleanup Script - Remove TypeScript Files After JS/JSX Migration
# This script removes all .ts and .tsx files that have been converted to .js/.jsx

set -e

echo "==========================================="
echo "TypeScript to JavaScript Migration Cleanup"
echo "==========================================="
echo ""
echo "This script will remove TypeScript files (.ts/.tsx)"
echo "that have been migrated to JavaScript (.js/.jsx)"
echo ""

# Core src files
echo "Removing core TypeScript duplicate files..."
rm -f src/App.tsx
rm -f src/ErrorFallback.tsx

# Hook files  
echo "Removing hook TypeScript files..."
rm -f src/hooks/use-mobile.ts

# Lib files
echo "Removing lib TypeScript files..."
rm -f src/lib/utils.ts
rm -f src/lib/constants.ts
rm -f src/lib/types.ts
rm -f src/lib/foodData.ts

# Lib subdirectories - ai
echo "Removing lib/ai TypeScript files..."
rm -f src/lib/ai/ai-assistant.ts
rm -f src/lib/ai/index.ts

# Lib subdirectories - api
echo "Removing lib/api TypeScript files..."
rm -f src/lib/api/mdg.ts
rm -f src/lib/api/neo4j-api.ts
rm -f src/lib/api/neo4j.ts
rm -f src/lib/api/plm.ts
rm -f src/lib/api/rest-endpoints.ts
rm -f src/lib/api/service.ts

# Lib subdirectories - data
echo "Removing lib/data TypeScript files..."
rm -f src/lib/data/sample-data-loader.ts

# Lib subdirectories - drivers
echo "Removing lib/drivers TypeScript files..."
rm -f src/lib/drivers/index.ts
rm -f src/lib/drivers/neo4j-driver.ts

# Lib subdirectories - engines
echo "Removing lib/engines TypeScript files..."
rm -f src/lib/engines/byproduct.ts
rm -f src/lib/engines/calculationEngine.example.ts
rm -f src/lib/engines/calculationEngine.ts
rm -f src/lib/engines/cost.ts
rm -f src/lib/engines/index.ts
rm -f src/lib/engines/scaling.ts
rm -f src/lib/engines/yield.ts

# Lib subdirectories - genai
echo "Removing lib/genai TypeScript files..."
rm -f src/lib/genai/genai-client.ts
rm -f src/lib/genai/index.ts

# Lib subdirectories - graph
echo "Removing lib/graph TypeScript files..."
rm -f src/lib/graph/cytoscape-config.ts

# Lib subdirectories - managers
echo "Removing lib/managers TypeScript files..."
rm -f src/lib/managers/index.ts
rm -f src/lib/managers/integration-manager.ts
rm -f src/lib/managers/neo4j-manager.ts

# Lib subdirectories - schemas
echo "Removing lib/schemas TypeScript files..."
rm -f src/lib/schemas/bom.ts
rm -f src/lib/schemas/calculation-log.ts
rm -f src/lib/schemas/formulation.ts
rm -f src/lib/schemas/integration.ts
rm -f src/lib/schemas/manufacturing-recipe.ts
rm -f src/lib/schemas/master-recipe.ts
rm -f src/lib/schemas/material-master.ts
rm -f src/lib/schemas/sales-order.ts

# Lib subdirectories - services
echo "Removing lib/services TypeScript files..."
rm -f src/lib/services/fdc-service.ts

# Component files (root level)
echo "Removing component TypeScript files..."
rm -f src/components/AIAssistantPanel.tsx
rm -f src/components/APITester.tsx
rm -f src/components/CalculationEngineInterface.tsx
rm -f src/components/ConnectionTester.tsx
rm -f src/components/DataLoaderPanel.tsx
rm -f src/components/EmptyState.tsx
rm -f src/components/FDCDataIngestionPanel.tsx
rm -f src/components/FoodDetailPanel.tsx
rm -f src/components/GraphCanvas.tsx
rm -f src/components/Neo4jSettings.tsx
rm -f src/components/NodeEditor.tsx
rm -f src/components/RecipeCard.tsx
rm -f src/components/RecipeForm.tsx
rm -f src/components/RecipeView.tsx
rm -f src/components/SearchBar.tsx
rm -f src/components/Toolbar.tsx

# Component subdirectories - bom
echo "Removing components/bom TypeScript files..."
rm -f src/components/bom/BOMConfigurator.tsx
rm -f src/components/bom/CalculationSummary.tsx
rm -f src/components/bom/IngredientTree.tsx
rm -f src/components/bom/ProcessStepEditor.tsx
rm -f src/components/bom/index.ts

# Component subdirectories - formulation
echo "Removing components/formulation TypeScript files..."
rm -f src/components/formulation/CalculationPanel.tsx
rm -f src/components/formulation/FormulationEditor.tsx

# Component subdirectories - graph
echo "Removing components/graph TypeScript files..."
rm -f src/components/graph/FormulationGraph.tsx
rm -f src/components/graph/RelationshipGraphViewer.tsx

# Component subdirectories - integrations
echo "Removing components/integrations TypeScript files..."
rm -f src/components/integrations/BackendConfigPanel.tsx
rm -f src/components/integrations/FDCConfigPanel.tsx
rm -f src/components/integrations/IntegrationPanel.tsx
rm -f src/components/integrations/Neo4jConfigPanel.tsx
rm -f src/components/integrations/Neo4jDataLoader.tsx

# Component subdirectories - layout
echo "Removing components/layout TypeScript files..."
rm -f src/components/layout/Header.tsx
rm -f src/components/layout/MainContent.tsx
rm -f src/components/layout/Sidebar.tsx

# Component subdirectories - views
echo "Removing components/views TypeScript files..."
rm -f src/components/views/FormulationsView.tsx
rm -f src/components/views/GraphView.tsx
rm -f src/components/views/IngestView.tsx
rm -f src/components/views/SettingsView.tsx

echo ""
echo "✅ TypeScript files cleanup complete!"
echo ""
echo "Preserved files (structural/config):"
echo "  - src/main.tsx (structural file - do not modify)"
echo "  - src/vite-end.d.ts (type definitions)"
echo "  - vite.config.ts (vite configuration - do not modify)"
echo "  - tsconfig.json (TypeScript configuration)"
echo "  - All files in src/components/ui/ (shadcn components)"
echo ""
echo "Next steps:"
echo "  1. Test the application: npm run dev"
echo "  2. Verify all features work correctly"
echo "  3. Consider removing tsconfig.json if no longer needed"
echo ""
