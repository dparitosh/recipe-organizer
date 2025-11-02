# Calculation Engine Module

A comprehensive, deterministic calculation engine for formulation scaling, yield computation, cost analysis, and nutrition aggregation.

## Overview

The Calculation Engine provides enterprise-grade functionality for scaling Food & Beverage formulations from a 100g basis to production batch sizes (e.g., 10,000 L), with full support for:

- **Mass ↔ Volume Conversion** using density maps
- **Yield Chain Computation** with loss models per step
- **Plant Constraint Rounding** based on equipment capabilities
- **Nutrition & Cost Aggregation** with byproduct tracking
- **Multi-step Process Modeling** with cumulative yields

## Features

### 1. Unit Conversion with Density

Converts between mass units (kg, g, lb, oz) and volume units (L, mL, gal, fl_oz) using material-specific density values.

```typescript
import { createCalculationEngine } from '@/lib/engines/calculationEngine'

const densityMap = {
  'orange juice': { density: 1.05, unit: 'kg/L', temperature: 20 },
  'sugar': { density: 1.59, unit: 'kg/L' },
  'water': { density: 1.0, unit: 'kg/L' }
}

const engine = createCalculationEngine(densityMap)
```

### 2. Yield Chain Computation

Tracks product quantity through each process step, computing cumulative yield and loss at each stage.

```typescript
const lossModels = [
  {
    stepName: 'Filtration',
    lossType: 'process',
    lossPercentage: 5,
    description: 'Pulp and sediment removal'
  },
  {
    stepName: 'Evaporation',
    lossType: 'evaporation',
    lossPercentage: 15,
    description: 'Water removal during concentration'
  }
]

const result = engine.calculate({
  formulation,
  bom,
  targetBatchSize: 10000,
  targetUnit: 'L',
  yieldPercentage: 85,
  lossModels
})

// Access yield chain
result.yieldChain.forEach(step => {
  console.log(`${step.stepName}: ${step.yieldPercentage}% (Cumulative: ${step.cumulativeYield}%)`)
})
```

### 3. Plant Constraints & Rounding

Applies intelligent rounding rules based on ingredient patterns, quantities, and plant equipment capabilities.

```typescript
const plantConstraints = {
  roundingRules: [
    { minQuantity: 1000, roundToNearest: 100, unit: 'kg' },
    { minQuantity: 100, roundToNearest: 10, unit: 'kg' },
    { ingredientPattern: 'citric', minQuantity: 0.1, roundToNearest: 0.05, unit: 'kg' }
  ],
  minBatchSize: 50,
  maxBatchSize: 5000,
  equipmentCapacity: {
    'Evaporator': 1000,
    'Mixer': 300
  }
}

engine.setPlantConstraints(plantConstraints)
```

### 4. Nutrition Aggregation

Aggregates nutrition data from all ingredients, accounting for scaling factors and normalizing to per-100g basis.

```typescript
// Result includes aggregated nutrition
console.log(result.aggregatedNutrition)
// {
//   calories: 45.2,
//   protein: 0.8,
//   carbohydrates: 11.5,
//   fat: 0.3,
//   sugar: 9.2,
//   vitamins: { C: 52, A: 210 },
//   minerals: { ...}
// }
```

### 5. Cost Rollup

Comprehensive cost calculation including raw materials, labor, overhead, packaging, and byproduct value recovery.

```typescript
const costResult = result.costRollup
console.log(`Total Cost: $${costResult.totalCost}`)
console.log(`Cost Per Unit: $${costResult.costPerUnit}`)
console.log(`Byproduct Value: $${costResult.byproductValue}`)
console.log(`Net Cost: $${costResult.netCost}`)
console.log('Breakdown:', costResult.breakdown)
```

## API Reference

### CalculationEngine Class

#### Constructor
```typescript
new CalculationEngine(densityMap?: DensityMap, plantConstraints?: PlantConstraints)
```

#### Methods

##### `calculate(request: CalculationEngineRequest): CalculationEngineResult`

Main calculation method that orchestrates all computations.

**Parameters:**
- `formulation`: Base formulation (100g basis)
- `bom`: Bill of Materials with process steps (optional)
- `targetBatchSize`: Desired output quantity
- `targetUnit`: Desired output unit
- `yieldPercentage`: Expected overall yield (0-100)
- `lossModels`: Array of loss models per process step
- `densityMap`: Material density mapping (optional, uses defaults)
- `plantConstraints`: Rounding and capacity rules (optional)
- `costParameters`: Cost calculation parameters (optional)

**Returns:**
- `scaledIngredients`: Ingredients scaled and rounded for production
- `byproducts`: Generated waste and byproducts
- `aggregatedNutrition`: Nutritional profile per 100g
- `costRollup`: Complete cost breakdown
- `yieldChain`: Step-by-step yield computation
- `totalOutput`: Final output quantity
- `outputUnit`: Output unit
- `warnings`: Calculation warnings
- `metadata`: Calculation metadata and efficiency score

##### `setDensity(materialName: string, density: MaterialDensity): void`

Set or update density for a specific material.

##### `setPlantConstraints(constraints: PlantConstraints): void`

Update plant constraints and rounding rules.

##### `getDensity(materialName: string): MaterialDensity | undefined`

Retrieve density data for a material.

## Data Structures

### CalculationEngineRequest

```typescript
interface CalculationEngineRequest {
  formulation: Formulation
  bom?: BOM
  targetBatchSize: number
  targetUnit: string
  yieldPercentage: number
  lossModels?: LossModel[]
  densityMap?: DensityMap
  plantConstraints?: PlantConstraints
  costParameters?: CostParameters
}
```

### CalculationEngineResult

```typescript
interface CalculationEngineResult {
  scaledIngredients: ScaledIngredient[]
  byproducts: Byproduct[]
  aggregatedNutrition: NutrientProfile
  costRollup: CostRollup
  yieldChain: YieldChainStep[]
  totalOutput: number
  outputUnit: string
  warnings: string[]
  metadata: CalculationMetadata
}
```

### LossModel

```typescript
interface LossModel {
  stepName: string
  lossType: 'process' | 'evaporation' | 'moisture' | 'waste' | 'transfer'
  lossPercentage: number
  description?: string
}
```

### YieldChainStep

```typescript
interface YieldChainStep {
  stepName: string
  stepIndex: number
  inputQuantity: number
  outputQuantity: number
  lossQuantity: number
  lossPercentage: number
  yieldPercentage: number
  cumulativeYield: number
  lossType: string
}
```

### PlantConstraints

```typescript
interface PlantConstraints {
  roundingRules: RoundingRule[]
  minBatchSize?: number
  maxBatchSize?: number
  equipmentCapacity?: Record<string, number>
  processingTime?: Record<string, number>
}
```

### DensityMap

```typescript
interface DensityMap {
  [materialName: string]: MaterialDensity
}

interface MaterialDensity {
  density: number
  unit: 'kg/L' | 'g/mL' | 'lb/gal'
  temperature?: number
  conditions?: string
}
```

## Usage Examples

### Basic Scaling

```typescript
import { createCalculationEngine } from '@/lib/engines/calculationEngine'

const engine = createCalculationEngine()

const result = engine.calculate({
  formulation: myFormulation, // 100 kg basis
  targetBatchSize: 1000,
  targetUnit: 'kg',
  yieldPercentage: 90
})

console.log(`Scaled to ${result.totalOutput} ${result.outputUnit}`)
console.log(`Efficiency: ${result.metadata.efficiencyScore}/100`)
```

### With Loss Models

```typescript
const result = engine.calculate({
  formulation: myFormulation,
  bom: myBOM,
  targetBatchSize: 10000,
  targetUnit: 'L',
  yieldPercentage: 85,
  lossModels: [
    { stepName: 'Filtration', lossType: 'process', lossPercentage: 5 },
    { stepName: 'Concentration', lossType: 'evaporation', lossPercentage: 18 },
    { stepName: 'Transfer', lossType: 'transfer', lossPercentage: 2 }
  ]
})

result.yieldChain.forEach(step => {
  console.log(`${step.stepName}:`)
  console.log(`  Input: ${step.inputQuantity.toFixed(2)} L`)
  console.log(`  Output: ${step.outputQuantity.toFixed(2)} L`)
  console.log(`  Loss: ${step.lossPercentage.toFixed(1)}%`)
  console.log(`  Cumulative Yield: ${step.cumulativeYield.toFixed(1)}%`)
})
```

### With Cost Analysis

```typescript
const result = engine.calculate({
  formulation: myFormulation,
  bom: myBOM,
  targetBatchSize: 5000,
  targetUnit: 'kg',
  yieldPercentage: 88,
  costParameters: {
    overheadRate: 25,
    laborCostPerHour: 45,
    energyCostPerUnit: 150,
    packagingCost: 500,
    shippingCost: 200,
    markupPercentage: 30
  }
})

console.log('Cost Analysis:')
console.log(`  Raw Materials: $${result.costRollup.breakdown.rawMaterials}`)
console.log(`  Labor: $${result.costRollup.breakdown.labor}`)
console.log(`  Overhead: $${result.costRollup.breakdown.overhead}`)
console.log(`  Total: $${result.costRollup.totalCost}`)
console.log(`  Byproduct Value: $${result.costRollup.byproductValue}`)
console.log(`  Net Cost: $${result.costRollup.netCost}`)
```

### Unit Conversion Example

```typescript
// Scale from kg to liters with density
const densityMap = {
  'orange juice': { density: 1.05, unit: 'kg/L' }
}

const engine = createCalculationEngine(densityMap)

const result = engine.calculate({
  formulation: myFormulation, // 100 kg basis
  targetBatchSize: 2000,
  targetUnit: 'L', // Convert to liters
  yieldPercentage: 85
})

// Ingredients automatically converted using density
result.scaledIngredients.forEach(ing => {
  console.log(`${ing.name}: ${ing.originalQuantity} kg → ${ing.roundedQuantity.toFixed(2)} L`)
  if (ing.densityUsed) {
    console.log(`  (using density: ${ing.densityUsed} kg/L)`)
  }
})
```

### Batch Comparison

```typescript
import { batchCalculate, compareCalculations } from '@/lib/engines/calculationEngine'

const scenarios = [
  { targetBatchSize: 500, targetUnit: 'kg', yieldPercentage: 90 },
  { targetBatchSize: 1000, targetUnit: 'kg', yieldPercentage: 88 },
  { targetBatchSize: 5000, targetUnit: 'kg', yieldPercentage: 85 }
]

const results = batchCalculate(engine, scenarios.map(s => ({
  formulation: myFormulation,
  bom: myBOM,
  ...s
})))

const comparison = compareCalculations(results)

console.log(`Most Efficient: ${comparison.mostEfficient?.metadata.targetYield} ${comparison.mostEfficient?.outputUnit}`)
console.log(`Efficiency Score: ${comparison.mostEfficient?.metadata.efficiencyScore}/100`)
console.log(`Average Efficiency: ${comparison.averageEfficiency.toFixed(1)}/100`)
console.log(`Cost Range: $${comparison.totalCostRange.min} - $${comparison.totalCostRange.max}`)
```

## Default Density Values

The engine includes default densities for common F&B ingredients:

| Material | Density | Unit |
|----------|---------|------|
| Water | 1.0 | kg/L |
| Sugar | 1.59 | kg/L |
| Salt | 2.16 | kg/L |
| Flour | 0.593 | kg/L |
| Milk | 1.03 | kg/L |
| Oil | 0.92 | kg/L |
| Honey | 1.42 | kg/L |
| Corn Syrup | 1.37 | kg/L |
| Citric Acid | 1.54 | kg/L |
| Butter | 0.911 | kg/L |
| Cream | 1.01 | kg/L |

## Efficiency Scoring

The engine calculates an efficiency score (0-100) based on:

- **Yield Percentage (50%)**: Higher yields score better
- **Cost Effectiveness (30%)**: Lower cost per unit scores better
- **Warning Penalty (20%)**: Fewer warnings score better

Scores above 80 indicate excellent efficiency.
Scores 60-80 are acceptable.
Scores below 60 suggest optimization opportunities.

## Error Handling & Warnings

The engine provides comprehensive warnings for:

- Scale factors that are too large (>100x) or too small (<0.1x)
- Actual yields below target (< 80%)
- High loss percentages (> 25%)
- Missing density data (defaults to 1.0 kg/L)
- Rounding impacts on small quantities

All warnings are included in the result's `warnings` array.

## Best Practices

1. **Always provide density data** for materials requiring mass-volume conversion
2. **Use realistic loss models** based on historical production data
3. **Set plant constraints** that match your equipment capabilities
4. **Include cost parameters** for complete financial analysis
5. **Review warnings** before production to catch potential issues
6. **Test multiple scenarios** using batch calculation for optimization

## Integration with Other Modules

The Calculation Engine integrates seamlessly with:

- **Scaling Module** (`scaling.ts`): For basic unit conversions
- **Yield Module** (`yield.ts`): For yield calculation algorithms
- **Cost Module** (`cost.ts`): For cost computation logic
- **Byproduct Module** (`byproduct.ts`): For waste analysis

## Performance

The engine is optimized for:
- Calculations under 10ms for typical formulations (< 50 ingredients)
- Batch calculations of 100+ scenarios in under 1 second
- Memory-efficient operation with minimal allocations

## Testing

See `calculationEngine.example.ts` for comprehensive usage examples and test scenarios.

Run the example:
```typescript
import { runCalculationEngineExample } from '@/lib/engines/calculationEngine.example'

runCalculationEngineExample()
```

## License

Part of the Formulation Graph Studio application.
