# Formulation Graph Studio - Architecture Documentation

## Directory Structure

```
src/
├── components/
│   ├── ui/                          # shadcn components (existing)
│   ├── formulation/                 # Formulation management components
│   │   ├── FormulationEditor.tsx    # Main formulation editor
│   │   ├── FormulaCard.tsx          # Formula display card
│   │   ├── IngredientList.tsx       # BOM ingredient list
│   │   ├── BOMConfigurator.tsx      # Bill of Materials configurator
│   │   ├── YieldCalculator.tsx      # Yield & cost calculator
│   │   └── ConcentratePanel.tsx     # Concentrate mixing panel
│   ├── graph/                       # Graph visualization components
│   │   ├── FormulationGraph.tsx     # Main Cytoscape graph component
│   │   ├── GraphToolbar.tsx         # Graph controls
│   │   ├── NodeEditor.tsx           # Edit node properties (existing)
│   │   └── RelationshipPanel.tsx    # Show node relationships
│   ├── integrations/                # External system integrations
│   │   ├── PLMDataBrowser.tsx       # Browse PLM master data
│   │   ├── MDGSync.tsx              # SAP MDG sync interface
│   │   └── Neo4jQueryPanel.tsx      # Neo4j query interface
│   ├── SearchBar.tsx                # (existing)
│   ├── Toolbar.tsx                  # (existing)
│   └── EmptyState.tsx               # (existing)
│
├── lib/
│   ├── types.ts                     # Core TypeScript types
│   ├── schemas/                     # Data schemas & validation
│   │   ├── formulation.ts           # Formulation data models
│   │   ├── bom.ts                   # Bill of Materials schema
│   │   ├── nutrient.ts              # Nutrient calculations
│   │   └── integration.ts           # External API models
│   ├── api/                         # API integration layer
│   │   ├── neo4j.ts                 # Neo4j graph queries
│   │   ├── plm.ts                   # PLM API client
│   │   ├── mdg.ts                   # SAP MDG API client
│   │   └── fdc.ts                   # USDA FDC API (existing)
│   ├── engines/                     # Calculation engines
│   │   ├── yield.ts                 # Yield calculations
│   │   ├── cost.ts                  # Cost calculations
│   │   ├── scaling.ts               # Recipe scaling
│   │   └── byproduct.ts             # Byproduct calculations
│   ├── graph/                       # Graph utilities
│   │   ├── cytoscape-config.ts      # Cytoscape setup
│   │   ├── layouts.ts               # Graph layout algorithms
│   │   └── styling.ts               # Node/edge styling
│   ├── foodData.ts                  # (existing)
│   └── utils.ts                     # (existing)
│
├── hooks/
│   ├── use-formulation.ts           # Formulation state management
│   ├── use-bom.ts                   # BOM management
│   ├── use-calculation.ts           # Calculation engine hooks
│   ├── use-neo4j.ts                 # Neo4j query hook
│   └── use-mobile.ts                # (existing)
│
├── App.tsx                          # Main application component
├── index.css                        # Global styles
└── main.tsx                         # Entry point
```

## Data Schema

### 1. Formulation Schema

```typescript
interface Formulation {
  id: string
  name: string
  version: string
  type: 'concentrate' | 'final_product' | 'intermediate'
  status: 'draft' | 'review' | 'approved' | 'archived'
  ingredients: Ingredient[]
  targetYield: number
  yieldUnit: string
  costPerUnit: number
  metadata: FormulationMetadata
  createdAt: Date
  updatedAt: Date
}

interface Ingredient {
  id: string
  materialId: string        // PLM/MDG material ID
  fdcId?: number            // Optional FDC reference
  name: string
  quantity: number
  unit: string
  percentage: number        // % of total formula
  function: string          // 'base' | 'flavor' | 'preservative' | etc
  supplier?: string
  cost?: number
  nutrients?: NutrientProfile
}

interface FormulationMetadata {
  owner: string
  department: string
  project?: string
  plmReference?: string
  mdgMaterialId?: string
  tags: string[]
  notes: string
}
```

### 2. Bill of Materials (BOM) Schema

```typescript
interface BOM {
  id: string
  formulationId: string
  name: string
  batchSize: number
  batchUnit: string
  components: BOMComponent[]
  process: ProcessStep[]
  totalCost: number
  leadTime: number
  metadata: BOMMetadata
}

interface BOMComponent {
  id: string
  materialId: string
  description: string
  quantity: number
  unit: string
  phase: 'procurement' | 'production' | 'packaging'
  supplier?: string
  leadTime?: number
  cost: number
  substituteIds?: string[]
}

interface ProcessStep {
  id: string
  order: number
  name: string
  description: string
  duration: number
  temperature?: number
  equipment?: string
  parameters: Record<string, any>
}

interface BOMMetadata {
  productionSite: string
  validFrom: Date
  validTo?: Date
  sapBomId?: string
  revisionNumber: number
}
```

### 3. Calculation Engine Schema

```typescript
interface CalculationRequest {
  type: 'yield' | 'cost' | 'scaling' | 'byproduct'
  formulationId: string
  parameters: CalculationParameters
}

interface CalculationParameters {
  targetQuantity?: number
  targetUnit?: string
  processLoss?: number
  moistureContent?: number
  conversionFactors?: Record<string, number>
}

interface CalculationResult {
  type: string
  formulationId: string
  results: {
    actualYield?: number
    theoreticalYield?: number
    yieldPercentage?: number
    totalCost?: number
    costPerUnit?: number
    scaledIngredients?: Ingredient[]
    byproducts?: Byproduct[]
  }
  warnings: string[]
  timestamp: Date
}

interface Byproduct {
  id: string
  name: string
  quantity: number
  unit: string
  value?: number
  disposal?: string
}
```

### 4. Neo4j Relationship Schema

```typescript
interface GraphNode {
  id: string
  labels: string[]          // ['Formulation', 'Ingredient', 'Nutrient', etc]
  properties: Record<string, any>
}

interface GraphRelationship {
  id: string
  type: string              // 'CONTAINS', 'DERIVED_FROM', 'SIMILAR_TO', etc
  startNode: string
  endNode: string
  properties: Record<string, any>
}

interface Neo4jQuery {
  cypher: string
  parameters?: Record<string, any>
}

interface Neo4jResult {
  nodes: GraphNode[]
  relationships: GraphRelationship[]
  metadata: {
    executionTime: number
    recordCount: number
  }
}
```

### 5. PLM/MDG Integration Schema

```typescript
interface PLMMaterial {
  materialId: string
  description: string
  type: string
  status: string
  specifications: MaterialSpecification[]
  regulatory: RegulatoryInfo
  supplier: SupplierInfo
  lastSync: Date
}

interface MaterialSpecification {
  attribute: string
  value: any
  unit?: string
  tolerance?: number
  source: 'PLM' | 'lab' | 'supplier'
}

interface MDGMaterial {
  materialNumber: string
  materialDescription: string
  materialGroup: string
  baseUnit: string
  valuationClass: string
  procurementType: string
  mrpType: string
  plant: string
  storageLocation: string
}

interface SyncRequest {
  system: 'PLM' | 'MDG'
  action: 'pull' | 'push'
  materialIds: string[]
  options: {
    includeSpecifications?: boolean
    includeInventory?: boolean
    validateOnly?: boolean
  }
}
```

## React State Management

### Global State (useKV)
- `formulations: Formulation[]` - All formulations
- `boms: BOM[]` - All BOMs
- `favorites: string[]` - Favorite formulation IDs
- `recentSearches: string[]` - Recent material searches

### Component State (useState)
- Current formulation being edited
- Active graph view/filter
- Calculation results (temporary)
- UI state (panels, modals)

## UI Component Hierarchy

```
App
├── Header
│   ├── Logo
│   ├── Navigation
│   └── UserMenu
├── MainLayout
│   ├── Sidebar
│   │   ├── FormulationList
│   │   ├── BOMList
│   │   └── IntegrationStatus
│   ├── WorkArea
│   │   ├── FormulationEditor
│   │   │   ├── IngredientList
│   │   │   ├── BOMConfigurator
│   │   │   └── YieldCalculator
│   │   └── FormulationGraph (Cytoscape)
│   │       ├── GraphToolbar
│   │       └── NodeContextMenu
│   └── RightPanel (conditional)
│       ├── NodeEditor
│       ├── RelationshipPanel
│       └── CalculationResults
└── Modals
    ├── PLMDataBrowser
    ├── MDGSync
    └── Neo4jQueryPanel
```

## Graph Visualization (Cytoscape)

### Node Types
- **Formulation Node**: Main formula (circle, large)
- **Ingredient Node**: Component (rounded square)
- **Nutrient Node**: Nutritional element (diamond)
- **Process Node**: Manufacturing step (hexagon)

### Edge Types
- **CONTAINS**: Formulation → Ingredient (solid line)
- **DERIVED_FROM**: Concentrate → Base (dashed line)
- **REQUIRES**: Process → Equipment (dotted line)
- **ENRICHES**: Ingredient → Nutrient (thin line)
- **ALTERNATIVE**: Ingredient ↔ Ingredient (bidirectional)

### Layout Algorithms
- **Hierarchy**: Top-down for formulation → ingredients
- **Force-directed**: For relationship exploration
- **Circular**: For concentrate blending
- **Grid**: For BOM component organization

### Cytoscape Configuration
```typescript
const cytoscapeConfig = {
  style: [
    {
      selector: 'node[type="formulation"]',
      style: {
        'background-color': '#4CAF50',
        'label': 'data(name)',
        'shape': 'ellipse',
        'width': 80,
        'height': 80
      }
    },
    {
      selector: 'node[type="ingredient"]',
      style: {
        'background-color': '#2196F3',
        'shape': 'roundrectangle',
        'width': 60,
        'height': 60
      }
    },
    {
      selector: 'edge[type="CONTAINS"]',
      style: {
        'line-color': '#999',
        'target-arrow-color': '#999',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier'
      }
    }
  ],
  layout: {
    name: 'breadthfirst',
    directed: true,
    spacingFactor: 1.5
  }
}
```

## Integration Architecture

### Neo4j Integration
```typescript
// Connection stub
interface Neo4jClient {
  query(cypher: string, params?: any): Promise<Neo4jResult>
  createNode(labels: string[], properties: any): Promise<string>
  createRelationship(from: string, to: string, type: string, props?: any): Promise<string>
  findShortestPath(from: string, to: string): Promise<GraphPath>
}
```

### PLM Integration
```typescript
// PLM API stub
interface PLMClient {
  searchMaterials(query: string): Promise<PLMMaterial[]>
  getMaterial(materialId: string): Promise<PLMMaterial>
  getSpecifications(materialId: string): Promise<MaterialSpecification[]>
  updateMaterial(materialId: string, data: Partial<PLMMaterial>): Promise<void>
}
```

### SAP MDG Integration
```typescript
// MDG API stub
interface MDGClient {
  getMasterData(materialNumber: string): Promise<MDGMaterial>
  createMaterial(material: MDGMaterial): Promise<string>
  updateMaterial(materialNumber: string, data: Partial<MDGMaterial>): Promise<void>
  validateMaterial(material: MDGMaterial): Promise<ValidationResult>
}
```

## Calculation Engines

### Yield Calculator
```typescript
function calculateYield(
  ingredients: Ingredient[],
  processLoss: number,
  moistureContent?: number
): CalculationResult {
  // 1. Sum total ingredient mass
  // 2. Apply process loss percentage
  // 3. Adjust for moisture content if relevant
  // 4. Return theoretical vs actual yield
}
```

### Cost Calculator
```typescript
function calculateCost(
  ingredients: Ingredient[],
  overhead: number,
  batchSize: number
): CalculationResult {
  // 1. Sum ingredient costs
  // 2. Apply overhead/burden rates
  // 3. Calculate per-unit cost
  // 4. Include packaging materials
}
```

### Scaling Engine
```typescript
function scaleFormulation(
  formulation: Formulation,
  targetQuantity: number,
  targetUnit: string
): Formulation {
  // 1. Convert units if needed
  // 2. Calculate scaling factor
  // 3. Scale all ingredients proportionally
  // 4. Preserve percentage relationships
}
```

### Byproduct Calculator
```typescript
function calculateByproducts(
  formulation: Formulation,
  processSteps: ProcessStep[]
): Byproduct[] {
  // 1. Identify waste streams
  // 2. Calculate byproduct quantities
  // 3. Determine value/disposal cost
  // 4. Optimize for waste reduction
}
```

## API Endpoints (Stub Implementation)

All external integrations include:
- Mock data for development
- Error handling with fallbacks
- Loading states
- Retry logic with exponential backoff
- Type-safe request/response models
