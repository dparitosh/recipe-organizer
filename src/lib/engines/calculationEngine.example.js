/**
 * @typedef {import('./calculationEngine.js').CalculationEngineRequest} CalculationEngineRequest
 * @typedef {import('./calculationEngine.js').DensityMap} DensityMap
 * @typedef {import('./calculationEngine.js').PlantConstraints} PlantConstraints
 * @typedef {import('./calculationEngine.js').LossModel} LossModel
 */

import { createCalculationEngine } from './calculationEngine.js'

/**
 * Runs showcase scenarios for the calculation engine and logs detailed output.
 * @returns {{ result1: import('./calculationEngine.js').CalculationEngineResult, result2: import('./calculationEngine.js').CalculationEngineResult, result3: import('./calculationEngine.js').CalculationEngineResult }}
 */
export function runCalculationEngineExample() {
  /** @type {import('@/lib/schemas/formulation.js').Formulation} */
  const exampleFormulation = {
    id: 'formula-001',
    name: 'Orange Juice Concentrate',
    version: '2.0',
    type: 'concentrate',
    status: 'approved',
    targetYield: 100,
    yieldUnit: 'kg',
    costPerUnit: 0,
    ingredients: [
      {
        id: 'ing-001',
        materialId: 'MAT-OJ-001',
        name: 'Orange Juice',
        quantity: 85,
        unit: 'kg',
        percentage: 85,
        function: 'base',
        cost: 2.5,
        nutrients: {
          calories: 45,
          protein: 0.7,
          carbohydrates: 10.4,
          fat: 0.2,
          sugar: 8.4,
          fiber: 0.2,
          sodium: 1,
          vitamins: {
            C: 50,
            A: 200,
          },
        },
      },
      {
        id: 'ing-002',
        materialId: 'MAT-SUGAR-001',
        name: 'Sugar',
        quantity: 10,
        unit: 'kg',
        percentage: 10,
        function: 'sweetener',
        cost: 1.2,
        nutrients: {
          calories: 387,
          carbohydrates: 100,
          sugar: 100,
        },
      },
      {
        id: 'ing-003',
        materialId: 'MAT-CA-001',
        name: 'Citric Acid',
        quantity: 2,
        unit: 'kg',
        percentage: 2,
        function: 'preservative',
        cost: 4.5,
      },
      {
        id: 'ing-004',
        materialId: 'MAT-WATER-001',
        name: 'Water',
        quantity: 3,
        unit: 'kg',
        percentage: 3,
        function: 'other',
        cost: 0.1,
        nutrients: {
          calories: 0,
        },
      },
    ],
    metadata: {
      owner: 'john.doe',
      department: 'R&D',
      project: 'Summer Refresh Line',
      tags: ['concentrate', 'orange', 'beverage'],
      notes: 'Premium orange juice concentrate for retail distribution',
      allergens: [],
      claims: ['No artificial flavors', 'Non-GMO'],
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-20'),
  }

  /** @type {import('@/lib/schemas/bom.js').BOM} */
  const exampleBOM = {
    id: 'bom-001',
    formulationId: 'formula-001',
    name: 'Orange Concentrate Production',
    batchSize: 100,
    batchUnit: 'kg',
    totalCost: 0,
    leadTime: 0,
    process: [
      {
        id: 'step-001',
        name: 'Juice Extraction',
        order: 1,
        description: 'Extract juice from fresh oranges',
        duration: 30,
        durationUnit: 'minutes',
        temperature: 20,
        equipment: 'Citrus Press CP-500',
        parameters: {
          pressure: 150,
          speed: 60,
        },
        yields: {
          input: 100,
          output: 92,
          waste: 8,
          unit: 'kg',
        },
      },
      {
        id: 'step-002',
        name: 'Filtration',
        order: 2,
        description: 'Remove pulp and sediment',
        duration: 45,
        durationUnit: 'minutes',
        temperature: 15,
        equipment: 'Microfiltration Unit MF-200',
        parameters: {
          poreSize: 0.2,
          flowRate: 100,
        },
        yields: {
          input: 92,
          output: 88,
          waste: 4,
          unit: 'kg',
        },
      },
      {
        id: 'step-003',
        name: 'Concentration',
        order: 3,
        description: 'Evaporate water to concentrate',
        duration: 120,
        durationUnit: 'minutes',
        temperature: 65,
        equipment: 'Evaporator EV-1000',
        parameters: {
          vacuum: -0.8,
          targetBrix: 65,
        },
        yields: {
          input: 88,
          output: 70,
          waste: 18,
          unit: 'kg',
        },
      },
      {
        id: 'step-004',
        name: 'Blending',
        order: 4,
        description: 'Add sugar and citric acid',
        duration: 20,
        durationUnit: 'minutes',
        temperature: 25,
        equipment: 'Mixer MX-300',
        parameters: {
          mixingSpeed: 200,
          mixingTime: 20,
        },
      },
      {
        id: 'step-005',
        name: 'Pasteurization',
        order: 5,
        description: 'Heat treatment for preservation',
        duration: 15,
        durationUnit: 'minutes',
        temperature: 85,
        equipment: 'Pasteurizer PS-400',
        parameters: {
          holdTime: 15,
          coolingRate: 5,
        },
        yields: {
          input: 82,
          output: 80,
          waste: 2,
          unit: 'kg',
        },
      },
    ],
    components: [],
    metadata: {
      productionSite: 'Main Facility',
      validFrom: new Date('2024-01-15'),
      revisionNumber: 2,
      notes: 'Optimized process for 2024',
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-20'),
  }

  /** @type {DensityMap} */
  const customDensityMap = {
    'orange juice': { density: 1.05, unit: 'kg/L', temperature: 20 },
    sugar: { density: 1.59, unit: 'kg/L' },
    'citric acid': { density: 1.54, unit: 'kg/L' },
    water: { density: 1.0, unit: 'kg/L' },
  }

  /** @type {PlantConstraints} */
  const plantConstraints = {
    roundingRules: [
      { minQuantity: 1000, roundToNearest: 100, unit: 'kg' },
      { minQuantity: 100, roundToNearest: 10, unit: 'kg' },
      { minQuantity: 10, roundToNearest: 1, unit: 'kg' },
      { minQuantity: 1, roundToNearest: 0.5, unit: 'kg' },
      { minQuantity: 0.1, roundToNearest: 0.1, unit: 'kg' },
      { ingredientPattern: 'citric', minQuantity: 0.1, roundToNearest: 0.05, unit: 'kg' },
    ],
    minBatchSize: 50,
    maxBatchSize: 5000,
    equipmentCapacity: {
      'Citrus Press CP-500': 500,
      'Evaporator EV-1000': 1000,
      'Mixer MX-300': 300,
    },
    processingTime: {
      'Juice Extraction': 30,
      Concentration: 120,
    },
  }

  /** @type {LossModel[]} */
  const lossModels = [
    {
      stepName: 'Juice Extraction',
      lossType: 'process',
      lossPercentage: 8,
      description: 'Peel and pith waste',
    },
    {
      stepName: 'Filtration',
      lossType: 'process',
      lossPercentage: 4,
      description: 'Pulp and sediment removal',
    },
    {
      stepName: 'Concentration',
      lossType: 'evaporation',
      lossPercentage: 20,
      description: 'Water evaporation during concentration',
    },
    {
      stepName: 'Pasteurization',
      lossType: 'evaporation',
      lossPercentage: 2,
      description: 'Steam loss during heating',
    },
    {
      stepName: 'Transfer Loss',
      lossType: 'transfer',
      lossPercentage: 1,
      description: 'Product remaining in pipes and equipment',
    },
  ]

  console.log('=== Calculation Engine Example ===\n')
  console.log('Creating Calculation Engine with custom density map and plant constraints...\n')

  const engine = createCalculationEngine(customDensityMap, plantConstraints)

  console.log('--- Scenario 1: Scale to 10,000 L production batch ---\n')

  /** @type {CalculationEngineRequest} */
  const request1 = {
    formulation: exampleFormulation,
    bom: exampleBOM,
    targetBatchSize: 10000,
    targetUnit: 'L',
    yieldPercentage: 78,
    lossModels,
    densityMap: customDensityMap,
    plantConstraints,
    costParameters: {
      overheadRate: 25,
      laborCostPerHour: 45,
      energyCostPerUnit: 150,
      packagingCost: 500,
      shippingCost: 200,
      markupPercentage: 30,
    },
  }

  const result1 = engine.calculate(request1)

  console.log('Scaled Ingredients (with density conversion):')
  result1.scaledIngredients.forEach(ing => {
    console.log(`  - ${ing.name}:`)
    console.log(`      Original: ${ing.originalQuantity.toFixed(2)} ${ing.unit}`)
    console.log(`      Scaled: ${ing.scaledQuantity.toFixed(2)} ${ing.unit}`)
    console.log(`      Rounded: ${ing.roundedQuantity.toFixed(2)} ${ing.unit}`)
    console.log(`      Scale Factor: ${ing.scaleFactor.toFixed(2)}x`)
    if (ing.densityUsed) {
      console.log(`      Density Used: ${ing.densityUsed.toFixed(2)} kg/L`)
    }
  })

  console.log('\nYield Chain Computation:')
  result1.yieldChain.forEach(step => {
    console.log(`  Step ${step.stepIndex}: ${step.stepName}`)
    console.log(`      Input: ${step.inputQuantity.toFixed(2)} ${result1.outputUnit}`)
    console.log(`      Output: ${step.outputQuantity.toFixed(2)} ${result1.outputUnit}`)
    console.log(`      Loss: ${step.lossQuantity.toFixed(2)} ${result1.outputUnit} (${step.lossPercentage.toFixed(1)}%)`)
    console.log(`      Yield: ${step.yieldPercentage.toFixed(1)}%`)
    console.log(`      Cumulative Yield: ${step.cumulativeYield.toFixed(1)}%`)
    console.log(`      Loss Type: ${step.lossType}`)
  })

  console.log('\nByproducts Generated:')
  result1.byproducts.forEach(bp => {
    console.log(`  - ${bp.name}:`)
    console.log(`      Quantity: ${bp.quantity.toFixed(2)} ${bp.unit}`)
    console.log(`      Source: ${bp.source}`)
    console.log(`      Category: ${bp.category}`)
    if (bp.recoveryMethod) {
      console.log(`      Recovery: ${bp.recoveryMethod}`)
    }
  })

  console.log('\nAggregated Nutrition (per 100g):')
  console.log(`  Calories: ${result1.aggregatedNutrition.calories?.toFixed(1)} kcal`)
  console.log(`  Protein: ${result1.aggregatedNutrition.protein?.toFixed(1)}g`)
  console.log(`  Carbohydrates: ${result1.aggregatedNutrition.carbohydrates?.toFixed(1)}g`)
  console.log(`  Fat: ${result1.aggregatedNutrition.fat?.toFixed(1)}g`)
  console.log(`  Sugar: ${result1.aggregatedNutrition.sugar?.toFixed(1)}g`)
  console.log(`  Fiber: ${result1.aggregatedNutrition.fiber?.toFixed(1)}g`)
  console.log(`  Sodium: ${result1.aggregatedNutrition.sodium?.toFixed(1)}mg`)

  console.log('\nCost Rollup:')
  console.log(`  Total Cost: $${result1.costRollup.totalCost.toFixed(2)}`)
  console.log(`  Cost Per Unit: $${result1.costRollup.costPerUnit.toFixed(4)}`)
  console.log(`  Cost Per Batch: $${result1.costRollup.costPerBatch.toFixed(2)}`)
  console.log(`  Byproduct Value: $${result1.costRollup.byproductValue.toFixed(2)}`)
  console.log(`  Net Cost: $${result1.costRollup.netCost.toFixed(2)}`)
  console.log('  Cost Breakdown:')
  console.log(`    - Raw Materials: $${result1.costRollup.breakdown.rawMaterials.toFixed(2)}`)
  console.log(`    - Labor: $${result1.costRollup.breakdown.labor.toFixed(2)}`)
  console.log(`    - Overhead: $${result1.costRollup.breakdown.overhead.toFixed(2)}`)
  console.log(`    - Packaging: $${result1.costRollup.breakdown.packaging.toFixed(2)}`)
  console.log(`    - Energy: $${result1.costRollup.breakdown.energy.toFixed(2)}`)
  console.log(`    - Shipping: $${result1.costRollup.breakdown.shipping.toFixed(2)}`)

  console.log('\nCalculation Metadata:')
  console.log(`  Base Yield: ${result1.metadata.baseYield} kg`)
  console.log(`  Target Yield: ${result1.metadata.targetYield} ${result1.outputUnit}`)
  console.log(`  Scale Factor: ${result1.metadata.scaleFactor.toFixed(2)}x`)
  console.log(`  Actual Yield: ${result1.metadata.actualYieldPercentage.toFixed(1)}%`)
  console.log(`  Efficiency Score: ${result1.metadata.efficiencyScore}/100`)
  console.log(`  Total Output: ${result1.totalOutput.toFixed(2)} ${result1.outputUnit}`)

  if (result1.warnings.length > 0) {
    console.log('\nWarnings:')
    result1.warnings.forEach(warning => {
      console.log(`  ⚠ ${warning}`)
    })
  }

  console.log('\n\n--- Scenario 2: Small batch (500 kg) ---\n')

  /** @type {CalculationEngineRequest} */
  const request2 = {
    formulation: exampleFormulation,
    bom: exampleBOM,
    targetBatchSize: 500,
    targetUnit: 'kg',
    yieldPercentage: 80,
    lossModels: lossModels.slice(0, 3),
    costParameters: {
      overheadRate: 20,
      laborCostPerHour: 40,
      energyCostPerUnit: 50,
      markupPercentage: 35,
    },
  }

  const result2 = engine.calculate(request2)

  console.log('Small Batch Summary:')
  console.log(`  Scale Factor: ${result2.metadata.scaleFactor.toFixed(2)}x`)
  console.log(`  Total Output: ${result2.totalOutput.toFixed(2)} ${result2.outputUnit}`)
  console.log(`  Actual Yield: ${result2.metadata.actualYieldPercentage.toFixed(1)}%`)
  console.log(`  Total Cost: $${result2.costRollup.totalCost.toFixed(2)}`)
  console.log(`  Cost Per Unit: $${result2.costRollup.costPerUnit.toFixed(4)}`)
  console.log(`  Efficiency Score: ${result2.metadata.efficiencyScore}/100`)

  console.log('\n\n--- Scenario 3: Unit Conversion (kg to gallons) ---\n')

  /** @type {CalculationEngineRequest} */
  const request3 = {
    formulation: exampleFormulation,
    targetBatchSize: 2000,
    targetUnit: 'gal',
    yieldPercentage: 75,
    lossModels: [
      { stepName: 'General Loss', lossType: 'process', lossPercentage: 5 },
    ],
  }

  const result3 = engine.calculate(request3)

  console.log('Unit Conversion Summary:')
  console.log(`  Base: ${exampleFormulation.targetYield} ${exampleFormulation.yieldUnit}`)
  console.log(`  Target: ${request3.targetBatchSize} ${request3.targetUnit}`)
  console.log(`  Total Output: ${result3.totalOutput.toFixed(2)} ${result3.outputUnit}`)
  console.log('  Ingredient Conversions:')
  result3.scaledIngredients.slice(0, 2).forEach(ing => {
    console.log(`    - ${ing.name}: ${ing.originalQuantity} ${ing.unit} → ${ing.roundedQuantity.toFixed(2)} ${request3.targetUnit}`)
  })

  console.log('\n\n--- Custom Density Example ---\n')

  engine.setDensity('orange pulp', {
    density: 1.08,
    unit: 'kg/L',
    temperature: 20,
    conditions: 'Fresh, medium pulp content',
  })

  const customDensity = engine.getDensity('orange pulp')
  console.log('Set custom density for "orange pulp":')
  console.log(`  Density: ${customDensity?.density} ${customDensity?.unit}`)
  console.log(`  Temperature: ${customDensity?.temperature}°C`)
  console.log(`  Conditions: ${customDensity?.conditions}`)

  console.log('\n=== Example Complete ===')

  return {
    result1,
    result2,
    result3,
  }
}

export const exampleUsage = `
// Basic Usage
import { createCalculationEngine } from '@/lib/engines/calculationEngine'

const engine = createCalculationEngine()

const result = engine.calculate({
  formulation: myFormulation,
  bom: myBOM,
  targetBatchSize: 10000,
  targetUnit: 'L',
  yieldPercentage: 85,
  lossModels: [
    { stepName: 'Filtration', lossType: 'process', lossPercentage: 5 },
    { stepName: 'Evaporation', lossType: 'evaporation', lossPercentage: 15 }
  ],
  costParameters: {
    overheadRate: 25,
    laborCostPerHour: 45,
    markupPercentage: 30
  }
})

// Access results
console.log('Scaled Ingredients:', result.scaledIngredients)
console.log('Yield Chain:', result.yieldChain)
console.log('Byproducts:', result.byproducts)
console.log('Aggregated Nutrition:', result.aggregatedNutrition)
console.log('Cost Rollup:', result.costRollup)
console.log('Efficiency Score:', result.metadata.efficiencyScore)

// Custom Density
engine.setDensity('my-ingredient', {
  density: 1.25,
  unit: 'kg/L'
})

// Custom Plant Constraints
engine.setPlantConstraints({
  roundingRules: [
    { minQuantity: 100, roundToNearest: 10, unit: 'kg' },
    { minQuantity: 1, roundToNearest: 0.5, unit: 'kg' }
  ],
  minBatchSize: 50,
  maxBatchSize: 5000
})
`
