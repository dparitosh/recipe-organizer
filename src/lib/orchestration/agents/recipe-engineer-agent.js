import { RecipeSchema } from '../agent-schemas'

export class RecipeEngineerAgent {
  name = 'Recipe Engineer'
  description = 'Interprets formulation requirements and structures ingredients with validated yields'

  async execute(input) {
    const startTime = Date.now()
    
    const prompt = window.spark.llmPrompt`You are a Recipe Engineer agent specializing in food and beverage formulation.

User Request: ${input.userRequest}

${input.context?.existingIngredients ? `Available Ingredients: ${input.context.existingIngredients.join(', ')}` : ''}
${input.context?.targetCategory ? `Target Category: ${input.context.targetCategory}` : ''}
${input.context?.constraints ? `Constraints: ${input.context.constraints.join(', ')}` : ''}

Your task:
1. Parse the user's formulation request
2. Identify required ingredients with their functions (base, flavor, preservative, sweetener, emulsifier, stabilizer, colorant, other)
3. Assign realistic percentages that sum to exactly 100%
4. Create a structured recipe with metadata

Return ONLY valid JSON matching this structure:
{
  "recipe": {
    "id": "unique-id",
    "name": "Recipe Name",
    "description": "Brief description",
    "ingredients": [
      {
        "id": "ingredient-id",
        "name": "Ingredient Name",
        "percentage": 45.5,
        "function": "base",
        "category": "dairy"
      }
    ],
    "totalPercentage": 100,
    "metadata": {
      "version": "1.0",
      "author": "Recipe Engineer Agent",
      "createdAt": "${new Date().toISOString()}"
    }
  },
  "reasoning": "Explanation of formulation choices",
  "alternatives": ["Alternative approach 1", "Alternative approach 2"]
}`

    const response = await window.spark.llm(prompt, 'gpt-4o', true)
    const parsed = JSON.parse(response)
    
    const validatedRecipe = RecipeSchema.parse(parsed.recipe)
    
    return {
      recipe: validatedRecipe,
      reasoning: parsed.reasoning || 'No reasoning provided',
      alternatives: parsed.alternatives || [],
    }
  }
}
