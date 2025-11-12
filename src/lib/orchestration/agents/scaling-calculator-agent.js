import { CalculationSchema } from '../agent-schemas.js'
import { requestJsonResponse } from '../utils/prompt-runner.js'

const formatRecipeForPrompt = (recipe) => {
  if (!recipe) {
    return '{}'
  }

  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        percentage: ingredient.percentage,
        function: ingredient.function || 'other',
        category: ingredient.category,
      }))
    : []

  const minimalRecipe = {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    totalPercentage: recipe.totalPercentage,
    ingredients,
  }

  if (recipe.metadata?.createdAt || recipe.metadata?.version) {
    minimalRecipe.metadata = {
      version: recipe.metadata?.version,
      createdAt: recipe.metadata?.createdAt,
    }
  }

  return JSON.stringify(minimalRecipe)
}

const FALLBACK_LABOR_RATE = 0.2
const FALLBACK_OVERHEAD_RATE = 0.15
const FALLBACK_PACKAGING_RATE = 0.08
const FALLBACK_YIELD_PERCENTAGE = 95

const toNumberOrNull = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const resolveCostRate = (ingredient, costMap = {}) => {
  if (!ingredient) return null
  if (ingredient.id && toNumberOrNull(costMap[ingredient.id]) !== null) {
    return Number(costMap[ingredient.id])
  }
  if (ingredient.name && toNumberOrNull(costMap[ingredient.name]) !== null) {
    return Number(costMap[ingredient.name])
  }
  return null
}

const resolveDensity = (ingredient, densityMap = {}) => {
  if (!ingredient) return null
  if (ingredient.id && toNumberOrNull(densityMap[ingredient.id]) !== null) {
    return Number(densityMap[ingredient.id])
  }
  if (ingredient.name && toNumberOrNull(densityMap[ingredient.name]) !== null) {
    return Number(densityMap[ingredient.name])
  }
  return null
}

const buildFallbackCalculation = (input, timestamp) => {
  const recipe = input.recipe ?? { ingredients: [] }
  const targetBatchSize = Number(input.targetBatchSize) || 1000
  const targetUnit = input.targetUnit || 'kg'
  const densityMap = input.densityMap || {}
  const costMap = input.costMap || {}

  const scaledIngredients = (recipe.ingredients || []).map((ingredient) => {
    const percentage = Number(ingredient.percentage) || 0
    const scaledQuantity = Number(((percentage / 100) * targetBatchSize).toFixed(3))
    const density = resolveDensity(ingredient, densityMap)
    const volumeEquivalent = density ? Number((scaledQuantity / density).toFixed(3)) : null
    const costRate = resolveCostRate(ingredient, costMap)
    const cost = costRate !== null ? Number((scaledQuantity * costRate).toFixed(2)) : null

    return {
      id: ingredient.id || ingredient.name || `ingredient-${Math.random().toString(36).slice(2, 8)}`,
      name: ingredient.name || ingredient.id || 'Ingredient',
      originalPercentage: percentage,
      scaledQuantity,
      scaledUnit: targetUnit,
      volumeEquivalent,
      cost,
      density: density ?? null,
    }
  })

  const rawMaterials = scaledIngredients.reduce((total, ing) => total + (ing.cost || 0), 0)
  const labor = Number((rawMaterials * FALLBACK_LABOR_RATE).toFixed(2))
  const overhead = Number((rawMaterials * FALLBACK_OVERHEAD_RATE).toFixed(2))
  const packaging = Number((rawMaterials * FALLBACK_PACKAGING_RATE).toFixed(2))
  const total = Number((rawMaterials + labor + overhead + packaging).toFixed(2))
  const perUnit = Number((total / Math.max(targetBatchSize, 1)).toFixed(4))

  const calculation = {
    recipeId: recipe.id || 'unknown-recipe',
    recipeName: recipe.name || 'Fallback Formulation',
    targetBatchSize,
    targetUnit,
    scaledIngredients,
    costs: {
      rawMaterials: Number(rawMaterials.toFixed(2)),
      labor,
      overhead,
      packaging,
      total,
      perUnit,
    },
    yield: {
      theoretical: targetBatchSize,
      actual: Number((targetBatchSize * (FALLBACK_YIELD_PERCENTAGE / 100)).toFixed(2)),
      percentage: FALLBACK_YIELD_PERCENTAGE,
      losses: [
        {
          step: 'process',
          amount: Number((targetBatchSize * ((100 - FALLBACK_YIELD_PERCENTAGE) / 100)).toFixed(2)),
          reason: 'Assumed process variability',
        },
      ],
    },
    timestamp,
  }

  const validated = CalculationSchema.parse(calculation)

  return {
    calculation: validated,
    warnings: [
      'Scaling Calculator fallback logic executed because AI response was unavailable.',
    ],
    optimizations: [
      'Provide ingredient-specific cost and density data to improve automated scaling outputs.',
    ],
  }
}

export class ScalingCalculatorAgent {
  name = 'Scaling Calculator'
  description = 'Computes quantities, costs, and yields with density conversions'

  async execute(input) {
    const timestamp = new Date().toISOString()
    const densityLine = input.densityMap
      ? `Density Map: ${JSON.stringify(input.densityMap)}`
      : 'Use default densities'
    const costLine = input.costMap
      ? `Cost Map: ${JSON.stringify(input.costMap)}`
      : 'Use estimated costs'
    const lossLine = input.lossFactors
      ? `Loss Factors: ${JSON.stringify(input.lossFactors)}`
      : 'Use default losses'
    const compactRecipeJson = formatRecipeForPrompt(input.recipe)

    const promptSections = [
      'You are a Scaling Calculator agent specializing in quantitative formulation computation.',
      '',
      'Recipe Data:',
      compactRecipeJson,
      '',
      `Target Batch: ${input.targetBatchSize} ${input.targetUnit}`,
      densityLine,
      costLine,
      lossLine,
      '',
      'Your task:',
      '1. Scale each ingredient from percentage to actual quantity for target batch',
      '2. Apply density conversions (mass ↔ volume) where needed',
      '3. Calculate costs (raw materials, labor estimate, overhead estimate)',
      '4. Compute yield accounting for process losses',
      '5. Flag any warnings (unusual ratios, high costs, extreme losses)',
      '',
      'Return ONLY valid JSON matching this structure:',
      '{',
      '  "calculation": {',
      `    "recipeId": "${input.recipe.id}",`,
      `    "recipeName": "${input.recipe.name}",`,
      `    "targetBatchSize": ${input.targetBatchSize},`,
      `    "targetUnit": "${input.targetUnit}",`,
      '    "scaledIngredients": [',
      '      {',
      '        "id": "ingredient-id",',
      '        "name": "Ingredient Name",',
      '        "originalPercentage": 45.5,',
      '        "scaledQuantity": 4550,',
      '        "scaledUnit": "kg",',
      '        "volumeEquivalent": 4321.5,',
      '        "cost": 1250.50,',
      '        "density": 1.053',
      '      }',
      '    ],',
      '    "costs": {',
      '      "rawMaterials": 5000,',
      '      "labor": 800,',
      '      "overhead": 600,',
      '      "packaging": 300,',
      '      "total": 6700,',
      '      "perUnit": 0.67',
      '    },',
      '    "yield": {',
      `      "theoretical": ${input.targetBatchSize},`,
      `      "actual": ${input.targetBatchSize * 0.95},`,
      '      "percentage": 95,',
      '      "losses": [',
      '        {',
      '          "step": "process",',
      `          "amount": ${input.targetBatchSize * 0.03},`,
      '          "reason": "evaporation"',
      '        }',
      '      ]',
      '    },',
      `    "timestamp": "${timestamp}"`,
      '  },',
      '  "warnings": ["List any calculation warnings"],',
      '  "optimizations": ["Suggestions for improvement"]',
      '}',
    ]

    const promptText = promptSections.join('\n')

    try {
      const parsed = await requestJsonResponse(promptText, {
        temperature: 0.2,
        maxTokens: 1400,
        systemPrompt: 'You are a scaling calculator that must return JSON only. Ensure the data matches the schema exactly.',
        maxAttempts: 3,
      })

      const validatedCalculation = CalculationSchema.parse(parsed.calculation)

      return {
        calculation: validatedCalculation,
        warnings: parsed.warnings || [],
        optimizations: parsed.optimizations || [],
      }
    } catch (error) {
      return buildFallbackCalculation(input, timestamp)
    }
  }
}
