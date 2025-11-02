# TypeScript to JavaScript Conversion Guide

## Overview
This document provides guidelines and tracking for converting TypeScript files to JavaScript in the Formulation Graph Studio application.

## Conversion Principles

### 1. Remove Type Annotations
**TypeScript:**
```typescript
const [value, setValue] = useState<string>('')
function handleClick(event: React.MouseEvent): void {}
interface Props { name: string; age: number }
```

**JavaScript:**
```javascript
const [value, setValue] = useState('')
function handleClick(event) {}
// Interfaces are removed entirely
```

### 2. Remove Interface/Type Definitions
**TypeScript:**
```typescript
interface FormulationProps {
  formulation: Formulation
  onSave?: (f: Formulation) => void
}

export function MyComponent({ formulation, onSave }: FormulationProps) {}
```

**JavaScript:**
```javascript
export function MyComponent({ formulation, onSave }) {}
```

### 3. Remove Generic Type Parameters
**TypeScript:**
```typescript
const [items, setItems] = useState<Item[]>([])
const result = await apiCall<ResponseType>(data)
```

**JavaScript:**
```javascript
const [items, setItems] = useState([])
const result = await apiCall(data)
```

### 4. Remove Type Assertions and Casts
**TypeScript:**
```typescript
const element = document.getElementById('root') as HTMLDivElement
const value = data as string
```

**JavaScript:**
```javascript
const element = document.getElementById('root')
const value = data
```

### 5. Keep JSDoc Comments (Optional)
You can optionally add JSDoc comments for better IDE support:
```javascript
/**
 * @param {Object} props
 * @param {string} props.name
 * @param {number} props.age
 */
export function MyComponent({ name, age }) {}
```

## Conversion Progress

### ✅ Completed (17 files)

#### Components
- src/components/AIAssistantPanel.jsx
- src/components/APITester.jsx
- src/components/EmptyState.jsx
- src/components/SearchBar.jsx
- src/components/Toolbar.jsx

#### Layout
- src/components/layout/Header.jsx
- src/components/layout/MainContent.jsx
- src/components/layout/Sidebar.jsx

#### Views
- src/components/views/FormulationsView.jsx
- src/components/views/GraphView.jsx
- src/components/views/IngestView.jsx
- src/components/views/SettingsView.jsx

#### Hooks
- src/hooks/use-mobile.js

#### Lib
- src/lib/constants.js
- src/lib/utils.js

#### API
- src/lib/api/service.js

#### Root
- src/App.jsx
- src/ErrorFallback.jsx

### ⏳ In Progress / Remaining (53 files)

#### High Priority - Components (11 files)
These are actively used in the UI and should be converted first:
- [ ] src/components/CalculationEngineInterface.tsx
- [ ] src/components/ConnectionTester.tsx
- [ ] src/components/DataLoaderPanel.tsx
- [ ] src/components/FDCDataIngestionPanel.tsx
- [ ] src/components/FoodDetailPanel.tsx
- [ ] src/components/GraphCanvas.tsx
- [ ] src/components/Neo4jSettings.tsx
- [ ] src/components/NodeEditor.tsx
- [ ] src/components/RecipeCard.tsx
- [ ] src/components/RecipeForm.tsx
- [ ] src/components/RecipeView.tsx

#### Medium Priority - Specialized Components (14 files)
- [ ] src/components/bom/BOMConfigurator.tsx
- [ ] src/components/bom/CalculationSummary.tsx
- [ ] src/components/bom/IngredientTree.tsx
- [ ] src/components/bom/ProcessStepEditor.tsx
- [ ] src/components/bom/index.ts
- [ ] src/components/formulation/CalculationPanel.tsx
- [ ] src/components/formulation/FormulationEditor.tsx
- [ ] src/components/graph/FormulationGraph.tsx
- [ ] src/components/graph/RelationshipGraphViewer.tsx
- [ ] src/components/integrations/BackendConfigPanel.tsx
- [ ] src/components/integrations/FDCConfigPanel.tsx
- [ ] src/components/integrations/IntegrationPanel.tsx
- [ ] src/components/integrations/Neo4jConfigPanel.tsx
- [ ] src/components/integrations/Neo4jDataLoader.tsx

#### High Priority - Core Library Files (4 files)
- [ ] src/lib/foodData.ts (data definitions)
- [ ] src/lib/types.ts (type definitions - can be removed or converted to JSDoc)
- [ ] src/lib/data/sample-data-loader.ts
- [ ] src/lib/drivers/index.ts

#### Medium Priority - API Layer (5 files)
- [ ] src/lib/api/mdg.ts
- [ ] src/lib/api/neo4j-api.ts
- [ ] src/lib/api/neo4j.ts
- [ ] src/lib/api/plm.ts
- [ ] src/lib/api/rest-endpoints.ts

#### Medium Priority - Schemas (8 files)
These define data structures, can be converted to plain objects or removed:
- [ ] src/lib/schemas/bom.ts
- [ ] src/lib/schemas/calculation-log.ts
- [ ] src/lib/schemas/formulation.ts
- [ ] src/lib/schemas/integration.ts
- [ ] src/lib/schemas/manufacturing-recipe.ts
- [ ] src/lib/schemas/master-recipe.ts
- [ ] src/lib/schemas/material-master.ts
- [ ] src/lib/schemas/sales-order.ts

#### High Priority - Calculation Engines (7 files)
- [ ] src/lib/engines/byproduct.ts
- [ ] src/lib/engines/calculationEngine.example.ts
- [ ] src/lib/engines/calculationEngine.ts
- [ ] src/lib/engines/cost.ts
- [ ] src/lib/engines/index.ts
- [ ] src/lib/engines/scaling.ts
- [ ] src/lib/engines/yield.ts

#### Medium Priority - Support Services (7 files)
- [ ] src/lib/ai/ai-assistant.ts
- [ ] src/lib/ai/index.ts
- [ ] src/lib/genai/genai-client.ts
- [ ] src/lib/genai/index.ts
- [ ] src/lib/managers/index.ts
- [ ] src/lib/managers/integration-manager.ts
- [ ] src/lib/managers/neo4j-manager.ts

#### Low Priority - Configuration (3 files)
- [ ] src/lib/graph/cytoscape-config.ts
- [ ] src/lib/services/fdc-service.ts
- [ ] src/lib/drivers/neo4j-driver.ts

### ⛔ Do Not Convert
- src/main.tsx (structural file required by Vite)
- src/vite-end.d.ts (TypeScript declaration file)
- src/components/ui/*.tsx (third-party shadcn components)

## Conversion Checklist Per File

For each file you convert:

1. [ ] Copy the .tsx/.ts file content
2. [ ] Remove all type annotations (`: Type`)
3. [ ] Remove all generic parameters (`<Type>`)
4. [ ] Remove all `interface` and `type` declarations
5. [ ] Remove all `as Type` casts
6. [ ] Update any imports from `.ts` to `.js` files
7. [ ] Save as .jsx/.js file
8. [ ] Test that the component/module still works
9. [ ] Update imports in files that reference this one

## Common Patterns

### useState with Types
```typescript
// Before
const [data, setData] = useState<DataType | null>(null)

// After
const [data, setData] = useState(null)
```

### Function Props
```typescript
// Before
interface Props {
  onSave: (data: FormData) => void
  onCancel?: () => void
}

// After
// Just use destructuring, no interface needed
function MyComponent({ onSave, onCancel }) {
  // ...
}
```

### API Response Types
```typescript
// Before
const response: APIResponse = await fetch(...)
const data: ResponseData = await response.json()

// After
const response = await fetch(...)
const data = await response.json()
```

### Import Changes
```typescript
// Before
import { MyFunction } from '@/lib/utils.ts'
import type { MyType } from '@/lib/types'

// After
import { MyFunction } from '@/lib/utils.js'
// type imports are removed entirely
```

## Testing After Conversion

After converting files, verify:
1. No TypeScript errors in dependent files
2. Application still runs without errors
3. All imports are updated to .js/.jsx
4. Component functionality is preserved
5. No runtime errors in browser console

## Notes

- JavaScript files are fully compatible with the Spark template
- Type safety is lost but runtime behavior is identical
- Consider adding JSDoc comments for better IDE support
- Some files may need runtime validation to replace TypeScript checks

## Next Steps

1. Start with high-priority component files
2. Convert one directory at a time
3. Test after each conversion
4. Update imports in dependent files
5. Track progress in TS_TO_JS_MASTERLIST.md
