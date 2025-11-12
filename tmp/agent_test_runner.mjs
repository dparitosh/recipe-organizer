import { RecipeEngineerAgent } from '../src/lib/orchestration/agents/recipe-engineer-agent.js'
import { ScalingCalculatorAgent } from '../src/lib/orchestration/agents/scaling-calculator-agent.js'
import { GraphBuilderAgent } from '../src/lib/orchestration/agents/graph-builder-agent.js'
import { QAValidatorAgent } from '../src/lib/orchestration/agents/qa-validator-agent.js'
import { UIDesignerAgent } from '../src/lib/orchestration/agents/ui-designer-agent.js'

const userRequest = 'Create a cola-inspired carbonated drink with citrus notes and natural sweeteners. Avoid brand names.'

const fallbackRecipe = {
  id: 'RT001',
  name: 'Cola Citrus Sparkling Beverage',
  description: 'Sparkling beverage with citrus and botanical notes derived from the user request.',
  ingredients: [
    {
      id: 'ING-CARBONATED-WATER',
      name: 'Carbonated Water',
      percentage: 81,
      function: 'base',
      category: 'water',
    },
    {
      id: 'ING-COLA-EXTRACT',
      name: 'Botanical Cola Extract',
      percentage: 6,
      function: 'flavor',
      category: 'botanical extract',
    },
    {
      id: 'ING-CITRUS-EXTRACT',
      name: 'Citrus Peel Extract',
      percentage: 3,
      function: 'flavor',
      category: 'citrus',
    },
    {
      id: 'ING-CANE-SUGAR',
      name: 'Cane Sugar',
      percentage: 8.5,
      function: 'sweetener',
      category: 'sweetener',
    },
    {
      id: 'ING-CITRIC-ACID',
      name: 'Citric Acid',
      percentage: 0.8,
      function: 'preservative',
      category: 'acidulant',
    },
    {
      id: 'ING-ASCORBIC-ACID',
      name: 'Ascorbic Acid (Vitamin C)',
      percentage: 0.7,
      function: 'preservative',
      category: 'antioxidant',
    },
  ],
  totalPercentage: 100,
  metadata: {
    version: 'fallback',
    author: 'Recipe Engineer Agent',
    createdAt: new Date().toISOString(),
  },
}

const sampleCalculation = {
  recipeId: fallbackRecipe.id,
  recipeName: fallbackRecipe.name,
  targetBatchSize: 1000,
  targetUnit: 'kg',
  scaledIngredients: [
    {
      id: 'ING-CARBONATED-WATER',
      name: 'Carbonated Water',
      originalPercentage: 81,
      scaledQuantity: 810,
      scaledUnit: 'kg',
      volumeEquivalent: 810,
      cost: 198,
      density: 1,
    },
    {
      id: 'ING-COLA-EXTRACT',
      name: 'Botanical Cola Extract',
      originalPercentage: 6,
      scaledQuantity: 60,
      scaledUnit: 'kg',
      volumeEquivalent: 64,
      cost: 1800,
      density: 0.94,
    },
    {
      id: 'ING-CITRUS-EXTRACT',
      name: 'Citrus Peel Extract',
      originalPercentage: 3,
      scaledQuantity: 30,
      scaledUnit: 'kg',
      volumeEquivalent: 30,
      cost: 750,
      density: 1,
    },
    {
      id: 'ING-CANE-SUGAR',
      name: 'Cane Sugar',
      originalPercentage: 8.5,
      scaledQuantity: 85,
      scaledUnit: 'kg',
      volumeEquivalent: 70,
      cost: 220,
      density: 1.21,
    },
    {
      id: 'ING-CITRIC-ACID',
      name: 'Citric Acid',
      originalPercentage: 0.8,
      scaledQuantity: 8,
      scaledUnit: 'kg',
      volumeEquivalent: 7.5,
      cost: 95,
      density: 1.07,
    },
    {
      id: 'ING-ASCORBIC-ACID',
      name: 'Ascorbic Acid (Vitamin C)',
      originalPercentage: 0.7,
      scaledQuantity: 7,
      scaledUnit: 'kg',
      volumeEquivalent: 6.8,
      cost: 110,
      density: 1.03,
    },
  ],
  costs: {
    rawMaterials: 3173,
    labor: 820,
    overhead: 640,
    packaging: 340,
    total: 4973,
    perUnit: 4.973,
  },
  yield: {
    theoretical: 1000,
    actual: 940,
    percentage: 94,
    losses: [
      {
        step: 'carbonation',
        amount: 30,
        reason: 'Dissolved CO2 loss during filling',
      },
      {
        step: 'filtration',
        amount: 30,
        reason: 'Filter retention',
      },
    ],
  },
  timestamp: new Date().toISOString(),
}

const sampleValidation = {
  valid: true,
  errors: [],
  warnings: [],
  checks: {
    recipePercentageValid: true,
    costPositive: true,
    yieldRealistic: true,
    graphIntegrity: true,
    dataConsistency: true,
  },
  summary: {
    totalChecks: 10,
    passed: 10,
    failed: 0,
    score: 100,
  },
  timestamp: new Date().toISOString(),
}

function logHeader(title) {
  console.log('\n================================')
  console.log(title)
  console.log('================================')
}

async function testRecipeEngineer() {
  const agent = new RecipeEngineerAgent()
  logHeader('Recipe Engineer')

  try {
    const result = await agent.execute({
      userRequest,
      context: {
        targetConsumer: 'Adults seeking reduced sugar carbonated beverages',
        regulatoryNotes: ['Avoid caffeine levels above 32 mg/100 mL'],
      },
    })

    console.log('Recipe name:', result.recipe?.name)
    console.log('Ingredient count:', result.recipe?.ingredients?.length ?? 0)
    console.log('Total percentage:', result.recipe?.totalPercentage)
    return result.recipe ?? fallbackRecipe
  } catch (error) {
    console.error('Recipe Engineer failed, using fallback recipe.', error?.message || error)
    return fallbackRecipe
  }
}

async function testScalingCalculator(recipe) {
  const agent = new ScalingCalculatorAgent()
  logHeader('Scaling Calculator')

  try {
    const result = await agent.execute({
      recipe,
      targetBatchSize: 1000,
      targetUnit: 'kg',
      densityMap: {
        'Carbonated Water': 1.0,
        'Botanical Cola Extract': 0.94,
        'Citrus Peel Extract': 1.02,
        'Cane Sugar': 1.21,
        'Citric Acid': 1.66,
        'Ascorbic Acid (Vitamin C)': 1.65,
      },
      costMap: {
        'Carbonated Water': 0.25,
        'Botanical Cola Extract': 30,
        'Citrus Peel Extract': 24,
        'Cane Sugar': 1.2,
        'Citric Acid': 4.5,
        'Ascorbic Acid (Vitamin C)': 6.0,
      },
    })

    console.log('Total scaled ingredients:', result.calculation?.scaledIngredients?.length ?? 0)
    console.log('Total cost:', result.calculation?.costs?.total)
    return result.calculation
  } catch (error) {
    console.error('Scaling Calculator failed.', error?.message || error)
    return sampleCalculation
  }
}

async function testGraphBuilder(recipe, calculation) {
  const agent = new GraphBuilderAgent()
  logHeader('Graph Builder')

  try {
    const result = await agent.execute({
      recipe,
      calculation,
      includeNutrients: false,
      includeCosts: true,
    })

    console.log('Nodes:', result.graph?.nodes?.length ?? 0)
    console.log('Edges:', result.graph?.edges?.length ?? 0)
    return result.graph
  } catch (error) {
    console.error('Graph Builder failed.', error?.message || error)
    return {
      nodes: [],
      edges: [],
      cypherCommands: [],
      metadata: { nodeCount: 0, edgeCount: 0, graphComplexity: 'none' },
    }
  }
}

async function testQAValidator(recipe, calculation, graph) {
  const agent = new QAValidatorAgent()
  logHeader('QA Validator')

  try {
    const result = await agent.execute({
      recipe,
      calculation,
      graph,
    })

    console.log('Valid:', result.validation?.valid)
    console.log('Errors:', result.validation?.errors?.length ?? 0)
    return result.validation
  } catch (error) {
    console.error('QA Validator failed.', error?.message || error)
    return sampleValidation
  }
}

async function testUIDesigner(recipe, calculation, validation) {
  const agent = new UIDesignerAgent()
  logHeader('UI Designer')

  try {
    const result = await agent.execute({
      recipe,
      calculation,
      validation,
    })

    console.log('Layout:', result.uiConfig?.layout)
    console.log('Components:', result.uiConfig?.components?.length ?? 0)
    return result
  } catch (error) {
    console.error('UI Designer failed.', error?.message || error)
    return {
      uiConfig: {
        layout: 'two-column',
        components: [],
        theme: {
          primaryColor: '#3b82f6',
          accentColor: '#10b981',
          spacing: 'comfortable',
        },
      },
      reasoning: 'Fallback configuration applied after failure.',
    }
  }
}

async function main() {
  const recipe = await testRecipeEngineer()
  const calculation = await testScalingCalculator(recipe)
  const graph = await testGraphBuilder(recipe, calculation)
  const validation = await testQAValidator(recipe, calculation, graph)
  await testUIDesigner(recipe, calculation, validation)
}

main().catch((error) => {
  console.error('Agent testing encountered an unexpected error.', error)
  process.exit(1)
})
