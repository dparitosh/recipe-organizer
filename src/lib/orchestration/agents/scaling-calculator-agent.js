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
  }
}
