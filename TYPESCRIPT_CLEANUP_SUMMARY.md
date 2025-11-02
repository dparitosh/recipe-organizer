# TypeScript Files Cleanup Summary

## Overview
This document lists all TypeScript files that should be deleted after the migration to JavaScript architecture.

## Migration Status
The project has been migrated from TypeScript to JavaScript as per the new architecture defined in PRD.md. All TypeScript files (.ts/.tsx) should be removed except for structural files that must not be modified.

## Files to DELETE

### Core Application Files (src/)
- ✅ `src/App.tsx` (JSX version exists)
- ✅ `src/ErrorFallback.tsx` (JSX version exists)

### Hooks (src/hooks/)
- ✅ `src/hooks/use-mobile.ts` (JS version exists)

### Library Files (src/lib/)
- ✅ `src/lib/utils.ts` (JS version exists)
- ✅ `src/lib/constants.ts` (JS version exists)
- ❌ `src/lib/types.ts` (TypeScript-only, should be deleted or migrated)
- ❌ `src/lib/foodData.ts` (TypeScript-only, should be deleted or migrated)

### Library - AI (src/lib/ai/)
- ❌ `src/lib/ai/ai-assistant.ts` (TypeScript-only)
- ❌ `src/lib/ai/index.ts` (TypeScript-only)

### Library - API (src/lib/api/)
- ❌ `src/lib/api/mdg.ts` (TypeScript-only)
- ❌ `src/lib/api/neo4j-api.ts` (TypeScript-only)
- ❌ `src/lib/api/neo4j.ts` (TypeScript-only)
- ❌ `src/lib/api/plm.ts` (TypeScript-only)
- ❌ `src/lib/api/rest-endpoints.ts` (TypeScript-only)
- ✅ `src/lib/api/service.ts` (JS version exists)

### Library - Data (src/lib/data/)
- ❌ `src/lib/data/sample-data-loader.ts` (TypeScript-only)

### Library - Drivers (src/lib/drivers/)
- ❌ `src/lib/drivers/index.ts` (TypeScript-only)
- ❌ `src/lib/drivers/neo4j-driver.ts` (TypeScript-only)

### Library - Engines (src/lib/engines/)
- ❌ `src/lib/engines/byproduct.ts` (TypeScript-only)
- ❌ `src/lib/engines/calculationEngine.example.ts` (TypeScript-only)
- ❌ `src/lib/engines/calculationEngine.ts` (TypeScript-only)
- ❌ `src/lib/engines/cost.ts` (TypeScript-only)
- ❌ `src/lib/engines/index.ts` (TypeScript-only)
- ❌ `src/lib/engines/scaling.ts` (TypeScript-only)
- ❌ `src/lib/engines/yield.ts` (TypeScript-only)

### Library - GenAI (src/lib/genai/)
- ❌ `src/lib/genai/genai-client.ts` (TypeScript-only)
- ❌ `src/lib/genai/index.ts` (TypeScript-only)

### Library - Graph (src/lib/graph/)
- ❌ `src/lib/graph/cytoscape-config.ts` (TypeScript-only)

### Library - Managers (src/lib/managers/)
- ❌ `src/lib/managers/index.ts` (TypeScript-only)
- ❌ `src/lib/managers/integration-manager.ts` (TypeScript-only)
- ❌ `src/lib/managers/neo4j-manager.ts` (TypeScript-only)

### Library - Schemas (src/lib/schemas/)
- ❌ `src/lib/schemas/bom.ts` (TypeScript-only)
- ❌ `src/lib/schemas/calculation-log.ts` (TypeScript-only)
- ❌ `src/lib/schemas/formulation.ts` (TypeScript-only)
- ❌ `src/lib/schemas/integration.ts` (TypeScript-only)
- ❌ `src/lib/schemas/manufacturing-recipe.ts` (TypeScript-only)
- ❌ `src/lib/schemas/master-recipe.ts` (TypeScript-only)
- ❌ `src/lib/schemas/material-master.ts` (TypeScript-only)
- ❌ `src/lib/schemas/sales-order.ts` (TypeScript-only)

### Library - Services (src/lib/services/)
- ❌ `src/lib/services/fdc-service.ts` (TypeScript-only)

### Components - Root Level (src/components/)
- ❌ `src/components/AIAssistantPanel.tsx` (TypeScript-only)
- ❌ `src/components/APITester.tsx` (TypeScript-only)
- ❌ `src/components/CalculationEngineInterface.tsx` (TypeScript-only)
- ❌ `src/components/ConnectionTester.tsx` (TypeScript-only)
- ❌ `src/components/DataLoaderPanel.tsx` (TypeScript-only)
- ✅ `src/components/EmptyState.tsx` (JSX version exists)
- ❌ `src/components/FDCDataIngestionPanel.tsx` (TypeScript-only)
- ❌ `src/components/FoodDetailPanel.tsx` (TypeScript-only)
- ❌ `src/components/GraphCanvas.tsx` (TypeScript-only)
- ❌ `src/components/Neo4jSettings.tsx` (TypeScript-only)
- ❌ `src/components/NodeEditor.tsx` (TypeScript-only)
- ❌ `src/components/RecipeCard.tsx` (TypeScript-only)
- ❌ `src/components/RecipeForm.tsx` (TypeScript-only)
- ❌ `src/components/RecipeView.tsx` (TypeScript-only)
- ✅ `src/components/SearchBar.tsx` (JSX version exists)
- ✅ `src/components/Toolbar.tsx` (JSX version exists)

### Components - BOM (src/components/bom/)
- ❌ `src/components/bom/BOMConfigurator.tsx` (TypeScript-only)
- ❌ `src/components/bom/CalculationSummary.tsx` (TypeScript-only)
- ❌ `src/components/bom/IngredientTree.tsx` (TypeScript-only)
- ❌ `src/components/bom/ProcessStepEditor.tsx` (TypeScript-only)
- ❌ `src/components/bom/index.ts` (TypeScript-only)

### Components - Formulation (src/components/formulation/)
- ❌ `src/components/formulation/CalculationPanel.tsx` (TypeScript-only)
- ❌ `src/components/formulation/FormulationEditor.tsx` (TypeScript-only)

### Components - Graph (src/components/graph/)
- ❌ `src/components/graph/FormulationGraph.tsx` (TypeScript-only)
- ❌ `src/components/graph/RelationshipGraphViewer.tsx` (TypeScript-only)

### Components - Integrations (src/components/integrations/)
- ❌ `src/components/integrations/BackendConfigPanel.tsx` (TypeScript-only)
- ❌ `src/components/integrations/FDCConfigPanel.tsx` (TypeScript-only)
- ❌ `src/components/integrations/IntegrationPanel.tsx` (TypeScript-only)
- ❌ `src/components/integrations/Neo4jConfigPanel.tsx` (TypeScript-only)
- ❌ `src/components/integrations/Neo4jDataLoader.tsx` (TypeScript-only)

### Components - Layout (src/components/layout/)
- ✅ `src/components/layout/Header.tsx` (JSX version exists)
- ✅ `src/components/layout/MainContent.tsx` (JSX version exists)
- ✅ `src/components/layout/Sidebar.tsx` (JSX version exists)

### Components - Views (src/components/views/)
- ✅ `src/components/views/FormulationsView.tsx` (JSX version exists)
- ✅ `src/components/views/GraphView.tsx` (JSX version exists)
- ✅ `src/components/views/IngestView.tsx` (JSX version exists)
- ✅ `src/components/views/SettingsView.tsx` (JSX version exists)

## Files to KEEP (Protected/Structural)
- ✅ `src/main.tsx` - Structural file, must not be modified
- ✅ `src/vite-end.d.ts` - Type definitions
- ✅ `vite.config.ts` - Vite configuration, must not be modified
- ✅ `tsconfig.json` - TypeScript configuration (can be removed if desired)
- ✅ All files in `src/components/ui/` - shadcn components (TypeScript is acceptable)

## Deletion Summary

### Files with JavaScript Equivalents (Duplicates) - 19 files
These should definitely be deleted as they are redundant:
1. src/App.tsx
2. src/ErrorFallback.tsx
3. src/hooks/use-mobile.ts
4. src/lib/utils.ts
5. src/lib/constants.ts
6. src/lib/api/service.ts
7. src/components/EmptyState.tsx
8. src/components/SearchBar.tsx
9. src/components/Toolbar.tsx
10. src/components/layout/Header.tsx
11. src/components/layout/MainContent.tsx
12. src/components/layout/Sidebar.tsx
13. src/components/views/FormulationsView.tsx
14. src/components/views/GraphView.tsx
15. src/components/views/IngestView.tsx
16. src/components/views/SettingsView.tsx

### TypeScript-Only Files - 61+ files
These files don't have JavaScript equivalents and represent features not yet migrated:
- All files in src/lib/ai/ (2 files)
- Most files in src/lib/api/ (5 files)
- All files in src/lib/data/ (1 file)
- All files in src/lib/drivers/ (2 files)
- All files in src/lib/engines/ (7 files)
- All files in src/lib/genai/ (2 files)
- All files in src/lib/graph/ (1 file)
- All files in src/lib/managers/ (3 files)
- All files in src/lib/schemas/ (8 files)
- All files in src/lib/services/ (1 file)
- Many components (26+ files)
- src/lib/types.ts
- src/lib/foodData.ts

## Automated Cleanup

Run the cleanup script to delete all TypeScript files:

```bash
chmod +x cleanup-typescript.sh
./cleanup-typescript.sh
```

## Next Steps

After running the cleanup:

1. **Test the Application**
   ```bash
   npm run dev
   ```

2. **Verify Core Functionality**
   - Navigation between views
   - Settings panel
   - All main features

3. **Implement Missing Features**
   - Many TypeScript-only files represent features not yet implemented in JavaScript
   - Review TypeScript files before deletion to understand what needs migration
   - Consider implementing critical features in JavaScript before deletion

4. **Optional: Remove TypeScript Configuration**
   - Delete `tsconfig.json` if no longer needed
   - Keep `vite.config.ts` (required by Vite)
   - Keep `src/main.tsx` (structural file)

## Impact Assessment

### Low Risk (Duplicates)
Deleting duplicate .tsx/.ts files where .jsx/.js versions exist is **low risk** as the JavaScript versions are already in use.

### High Risk (TypeScript-Only)
Deleting TypeScript-only files is **high risk** as it removes functionality that hasn't been migrated yet. Consider migrating these files to JavaScript first, or document which features will be removed.

## Recommendations

1. **Phase 1**: Delete duplicate files only (19 files) - **SAFE**
2. **Phase 2**: Review and migrate or delete TypeScript-only files (61+ files) - **REQUIRES REVIEW**
3. **Phase 3**: Clean up TypeScript configuration files - **OPTIONAL**

---

*Generated during JavaScript migration cleanup*
*Date: Migration Phase 2*
