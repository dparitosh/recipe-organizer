import { Recipe, Calculation, CalculationSchema } from '../agent-schemas'

export interface ScalingCalculatorInput {
  recipe: Recipe
  targetBatchSize: number
  targetUnit: 'kg' | 'L' | 'gal' | 'oz' | 'lb'
  densityMap?: Record<string, number>
  costMap?: Record<string, number>
  lossFactors?: {
    process?: number
    evaporation?: number
    transfer?: number
  }
}

export interface ScalingCalculatorOutput {
  calculation: Calculation
  warnings: string[]
  optimizations?: string[]
}

export class ScalingCalculatorAgent {
  name = 'Scaling Calculator'
  description = 'Computes quantities, costs, and yields with density conversions'

  async execute(input: ScalingCalculatorInput): Promise<ScalingCalculatorOutput> {
    const prompt = window.spark.llmPrompt`You are a Scaling Calculator agent specializing in quantitative formulation computation.

Recipe Data:
${JSON.stringify(input.recipe, null, 2)}

Target Batch: ${input.targetBatchSize} ${input.targetUnit}
${input.densityMap ? `Density Map: ${JSON.stringify(input.densityMap)}` : 'Use default densities'}
${input.costMap ? `Cost Map: ${JSON.stringify(input.costMap)}` : 'Use estimated costs'}
${input.lossFactors ? `Loss Factors: ${JSON.stringify(input.lossFactors)}` : 'Use default losses'}

Your task:
1. Scale each ingredient from percentage to actual quantity for target batch
2. Apply density conversions (mass ↔ volume) where needed
3. Calculate costs (raw materials, labor estimate, overhead estimate)
4. Compute yield accounting for process losses
5. Flag any warnings (unusual ratios, high costs, extreme losses)

Return ONLY valid JSON matching this structure:
{
  "calculation": {
    "recipeId": "${input.recipe.id}",
    "recipeName": "${input.recipe.name}",
    "targetBatchSize": ${input.targetBatchSize},
    "targetUnit": "${input.targetUnit}",
    "scaledIngredients": [
      {
        "id": "ingredient-id",
        "name": "Ingredient Name",
        "originalPercentage": 45.5,
        "scaledQuantity": 4550,
        "scaledUnit": "kg",
        "volumeEquivalent": 4321.5,
        "cost": 1250.50,
        "density": 1.053
      }
    ],
    "costs": {
      "rawMaterials": 5000,
      "labor": 800,
      "overhead": 600,
      "packaging": 300,
      "total": 6700,
      "perUnit": 0.67
    },
    "yield": {
      "theoretical": ${input.targetBatchSize},
      "actual": ${input.targetBatchSize * 0.95},
      "percentage": 95,
      "losses": [
        {
          "step": "process",
          "amount": ${input.targetBatchSize * 0.03},
          "reason": "evaporation"
        }
      ]
    },
    "timestamp": "${new Date().toISOString()}"
  },
  "warnings": ["List any calculation warnings"],
  "optimizations": ["Suggestions for improvement"]
}`

    const response = await window.spark.llm(prompt, 'gpt-4o', true)
    const parsed = JSON.parse(response)
    
    const validatedCalculation = CalculationSchema.parse(parsed.calculation)
    
    return {
      calculation: validatedCalculation,
      warnings: parsed.warnings || [],
      optimizations: parsed.optimizations || [],
    }
  }
}
