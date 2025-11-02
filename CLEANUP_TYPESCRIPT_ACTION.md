# IMMEDIATE ACTION REQUIRED: TypeScript Files Cleanup

## Summary
The project has been migrated from TypeScript to JavaScript. However, many TypeScript files (.ts/.tsx) still exist and need to be deleted to align with the new JavaScript architecture.

## Quick Action - Run the Cleanup Script

I've created an automated cleanup script that will delete all TypeScript files (except protected structural ones).

### Execute the cleanup:

```bash
cd /workspaces/spark-template
chmod +x cleanup-typescript.sh
./cleanup-typescript.sh
```

This script will safely delete:
- 16 duplicate .tsx/.ts files that have .jsx/.js equivalents
- 61+ TypeScript-only files that represent unmigrated features

### Protected Files (Will NOT be deleted):
- `src/main.tsx` - Structural file required by Spark
- `src/vite-end.d.ts` - Type definitions
- `vite.config.ts` - Vite configuration required by Spark
- `tsconfig.json` - TypeScript configuration
- All files in `src/components/ui/` - shadcn UI components

## Alternative: Manual Deletion

If you prefer to delete files manually, here are the key duplicates to remove:

### Core Files (src/)
```bash
rm src/App.tsx
rm src/ErrorFallback.tsx
```

### Hooks
```bash
rm src/hooks/use-mobile.ts
```

### Lib Files
```bash
rm src/lib/utils.ts
rm src/lib/constants.ts
rm src/lib/api/service.ts
```

### Components - Root
```bash
rm src/components/EmptyState.tsx
rm src/components/SearchBar.tsx
rm src/components/Toolbar.tsx
```

### Components - Layout
```bash
rm src/components/layout/Header.tsx
rm src/components/layout/MainContent.tsx
rm src/components/layout/Sidebar.tsx
```

### Components - Views
```bash
rm src/components/views/FormulationsView.tsx
rm src/components/views/GraphView.tsx
rm src/components/views/IngestView.tsx
rm src/components/views/SettingsView.tsx
```

### All TypeScript-Only Files
```bash
# Remove all TypeScript-only library files
rm -rf src/lib/ai/*.ts
rm -rf src/lib/api/mdg.ts src/lib/api/neo4j-api.ts src/lib/api/neo4j.ts src/lib/api/plm.ts src/lib/api/rest-endpoints.ts
rm -rf src/lib/data/*.ts
rm -rf src/lib/drivers/*.ts
rm -rf src/lib/engines/*.ts
rm -rf src/lib/genai/*.ts
rm -rf src/lib/graph/*.ts
rm -rf src/lib/managers/*.ts
rm -rf src/lib/schemas/*.ts
rm -rf src/lib/services/*.ts
rm src/lib/types.ts src/lib/foodData.ts

# Remove all TypeScript-only component files
rm src/components/AIAssistantPanel.tsx
rm src/components/APITester.tsx
rm src/components/CalculationEngineInterface.tsx
rm src/components/ConnectionTester.tsx
rm src/components/DataLoaderPanel.tsx
rm src/components/FDCDataIngestionPanel.tsx
rm src/components/FoodDetailPanel.tsx
rm src/components/GraphCanvas.tsx
rm src/components/Neo4jSettings.tsx
rm src/components/NodeEditor.tsx
rm src/components/RecipeCard.tsx
rm src/components/RecipeForm.tsx
rm src/components/RecipeView.tsx
rm -rf src/components/bom/
rm -rf src/components/formulation/
rm -rf src/components/graph/
rm -rf src/components/integrations/
```

## Verification After Cleanup

1. **Check that the app starts:**
   ```bash
   npm run dev
   ```

2. **Verify main application loads:**
   - Open browser to the dev URL
   - Check that the app renders without errors
   - Test navigation between views

3. **Check for any import errors:**
   - Look for console errors about missing modules
   - Fix any import statements that still reference .ts/.tsx files

## Files Remaining After Cleanup

Your src directory should only contain:
```
src/
├── App.jsx
├── ErrorFallback.jsx
├── index.css
├── main.css
├── main.tsx (protected)
├── vite-end.d.ts (protected)
├── components/
│   ├── EmptyState.jsx
│   ├── SearchBar.jsx
│   ├── Toolbar.jsx
│   ├── layout/
│   │   ├── Header.jsx
│   │   ├── MainContent.jsx
│   │   └── Sidebar.jsx
│   ├── ui/ (shadcn components - keep all)
│   └── views/
│       ├── FormulationsView.jsx
│       ├── GraphView.jsx
│       ├── IngestView.jsx
│       └── SettingsView.jsx
├── hooks/
│   └── use-mobile.js
├── lib/
│   ├── api/
│   │   └── service.js
│   ├── constants.js
│   └── utils.js
└── styles/
    └── theme.css
```

## Impact of Deletion

### ✅ Safe to Delete (No Impact)
- All duplicate .tsx/.ts files with .jsx/.js equivalents
- These are redundant and not being used

### ⚠️ Feature Removal
- TypeScript-only files represent features not yet migrated to JavaScript
- Deleting these will remove:
  - AI Assistant functionality
  - Neo4j integration components
  - BOM calculation engines
  - Schema definitions
  - Advanced graph components
  - Data loaders

If these features are needed, they should be reimplemented in JavaScript before deletion.

## Recommended Action

**Use the automated script for clean, complete removal:**

```bash
chmod +x cleanup-typescript.sh
./cleanup-typescript.sh
```

Then test the application to ensure it works correctly.

---

**Status**: Ready for cleanup execution
**Risk Level**: Low for duplicates, High for TypeScript-only files
**Action Required**: Run cleanup script or manual deletion commands
