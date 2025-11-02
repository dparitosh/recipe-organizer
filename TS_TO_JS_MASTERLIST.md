# TypeScript to JavaScript Conversion Masterlist

## Root Source Files
- [x] src/App.tsx → src/App.jsx (ALREADY EXISTS)
- [x] src/ErrorFallback.tsx → src/ErrorFallback.jsx (ALREADY EXISTS)
- [ ] src/main.tsx (DO NOT CONVERT - structural file)

## Components - Root Level
- [x] src/components/AIAssistantPanel.tsx → AIAssistantPanel.jsx (CONVERTED)
- [x] src/components/APITester.tsx → APITester.jsx (CONVERTED)
- [ ] src/components/CalculationEngineInterface.tsx
- [ ] src/components/ConnectionTester.tsx
- [x] src/components/DataLoaderPanel.tsx → DataLoaderPanel.jsx (CONVERTED)
- [x] src/components/EmptyState.tsx → EmptyState.jsx (ALREADY EXISTS)
- [ ] src/components/FDCDataIngestionPanel.tsx
- [ ] src/components/FoodDetailPanel.tsx
- [ ] src/components/GraphCanvas.tsx
- [ ] src/components/Neo4jSettings.tsx
- [ ] src/components/NodeEditor.tsx
- [ ] src/components/RecipeCard.tsx (EMPTY - CAN BE REMOVED)
- [ ] src/components/RecipeForm.tsx (EMPTY - CAN BE REMOVED)
- [ ] src/components/RecipeView.tsx
- [x] src/components/SearchBar.tsx → SearchBar.jsx (ALREADY EXISTS)
- [x] src/components/Toolbar.tsx → Toolbar.jsx (ALREADY EXISTS)

## Components - BOM
- [ ] src/components/bom/BOMConfigurator.tsx
- [ ] src/components/bom/CalculationSummary.tsx
- [ ] src/components/bom/IngredientTree.tsx
- [ ] src/components/bom/ProcessStepEditor.tsx
- [ ] src/components/bom/index.ts

## Components - Formulation
- [ ] src/components/formulation/CalculationPanel.tsx
- [ ] src/components/formulation/FormulationEditor.tsx

## Components - Graph
- [ ] src/components/graph/FormulationGraph.tsx
- [ ] src/components/graph/RelationshipGraphViewer.tsx

## Components - Integrations
- [ ] src/components/integrations/BackendConfigPanel.tsx
- [ ] src/components/integrations/FDCConfigPanel.tsx
- [ ] src/components/integrations/IntegrationPanel.tsx
- [ ] src/components/integrations/Neo4jConfigPanel.tsx
- [ ] src/components/integrations/Neo4jDataLoader.tsx

## Components - Layout
- [x] src/components/layout/Header.tsx → Header.jsx (ALREADY EXISTS)
- [x] src/components/layout/MainContent.tsx → MainContent.jsx (ALREADY EXISTS)
- [x] src/components/layout/Sidebar.tsx → Sidebar.jsx (ALREADY EXISTS)

## Components - Views
- [x] src/components/views/FormulationsView.tsx → FormulationsView.jsx (ALREADY EXISTS)
- [x] src/components/views/GraphView.tsx → GraphView.jsx (ALREADY EXISTS)
- [x] src/components/views/IngestView.tsx → IngestView.jsx (ALREADY EXISTS)
- [x] src/components/views/SettingsView.tsx → SettingsView.jsx (ALREADY EXISTS)

## Components - UI (Shadcn)
- [ ] src/components/ui/*.tsx (DO NOT CONVERT - third-party shadcn components)

## Hooks
- [x] src/hooks/use-mobile.ts → use-mobile.js (ALREADY EXISTS)

## Lib - Root
- [x] src/lib/constants.ts → constants.js (ALREADY EXISTS)
- [ ] src/lib/foodData.ts
- [ ] src/lib/types.ts
- [x] src/lib/utils.ts → utils.js (ALREADY EXISTS)

## Lib - AI
- [ ] src/lib/ai/ai-assistant.ts
- [ ] src/lib/ai/index.ts

## Lib - API
- [ ] src/lib/api/mdg.ts
- [ ] src/lib/api/neo4j-api.ts
- [ ] src/lib/api/neo4j.ts
- [ ] src/lib/api/plm.ts
- [ ] src/lib/api/rest-endpoints.ts
- [x] src/lib/api/service.ts → service.js (ALREADY EXISTS)

## Lib - Data
- [ ] src/lib/data/sample-data-loader.ts

## Lib - Drivers
- [ ] src/lib/drivers/index.ts
- [ ] src/lib/drivers/neo4j-driver.ts

## Lib - Engines
- [ ] src/lib/engines/byproduct.ts
- [ ] src/lib/engines/calculationEngine.example.ts
- [ ] src/lib/engines/calculationEngine.ts
- [ ] src/lib/engines/cost.ts
- [ ] src/lib/engines/index.ts
- [ ] src/lib/engines/scaling.ts
- [ ] src/lib/engines/yield.ts

## Lib - GenAI
- [ ] src/lib/genai/genai-client.ts
- [ ] src/lib/genai/index.ts

## Lib - Graph
- [ ] src/lib/graph/cytoscape-config.ts

## Lib - Managers
- [ ] src/lib/managers/index.ts
- [ ] src/lib/managers/integration-manager.ts
- [ ] src/lib/managers/neo4j-manager.ts

## Lib - Schemas
- [ ] src/lib/schemas/bom.ts
- [ ] src/lib/schemas/calculation-log.ts
- [ ] src/lib/schemas/formulation.ts
- [ ] src/lib/schemas/integration.ts
- [ ] src/lib/schemas/manufacturing-recipe.ts
- [ ] src/lib/schemas/master-recipe.ts
- [ ] src/lib/schemas/material-master.ts
- [ ] src/lib/schemas/sales-order.ts

## Lib - Services
- [ ] src/lib/services/fdc-service.ts

## Summary
- Total TypeScript files to convert: ~70
- Already converted: ~20
- Remaining: ~50
- Files to skip: main.tsx, vite-end.d.ts, ui components (shadcn)

## Documentation Created
- TS_TO_JS_MASTERLIST.md - Complete file-by-file checklist
- CONVERSION_GUIDE.md - Detailed conversion patterns and examples
- CONVERSION_SUMMARY.md - Project overview and status tracking

## Recent Progress
- Converted AIAssistantPanel.tsx → .jsx
- Converted APITester.tsx → .jsx
- Converted DataLoaderPanel.tsx → .jsx
- Identified empty stub files (RecipeCard, RecipeForm)

## Next Priority Files to Convert
1. CalculationEngineInterface.tsx (used in calculations)
2. ConnectionTester.tsx (testing utilities)
3. FDCDataIngestionPanel.tsx (data ingestion)
4. GraphCanvas.tsx (visualization)
5. Neo4jSettings.tsx (configuration)
