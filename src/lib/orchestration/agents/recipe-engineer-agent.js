import { RecipeSchema } from '../agent-schemas'
import { runPromptWithFallback } from '../utils/prompt-runner'

export class RecipeEngineerAgent {
  name = 'Recipe Engineer'
  description = 'Interprets formulation requirements and structures ingredients with validated yields'

  async execute(input) {
    const createdAt = new Date().toISOString()
    const contextLines = []

    if (input.context?.existingIngredients?.length) {
      contextLines.push(`Available Ingredients: ${input.context.existingIngredients.join(', ')}`)
    }

    if (input.context?.targetCategory) {
      contextLines.push(`Target Category: ${input.context.targetCategory}`)
    }

    if (input.context?.constraints?.length) {
      contextLines.push(`Constraints: ${input.context.constraints.join(', ')}`)
    }

    const promptSections = [
      'You are a Recipe Engineer agent specializing in food and beverage formulation.',
      '',
      `User Request: ${input.userRequest}`,
      '',
      ...contextLines,
      contextLines.length ? '' : null,
      'Your task:',
      "1. Parse the user's formulation request",
      '2. Identify required ingredients with their functions (base, flavor, preservative, sweetener, emulsifier, stabilizer, colorant, other)',
      '3. Assign realistic percentages that sum to exactly 100%',
      '4. Create a structured recipe with metadata',
      '',
      'Return ONLY valid JSON matching this structure:',
      '{',
      '  "recipe": {',
      '    "id": "unique-id",',
      '    "name": "Recipe Name",',
      '    "description": "Brief description",',
      '    "ingredients": [',
      '      {',
      '        "id": "ingredient-id",',
      '        "name": "Ingredient Name",',
      '        "percentage": 45.5,',
      '        "function": "base",',
      '        "category": "dairy"',
      '      }',
      '    ],',
      '    "totalPercentage": 100,',
      '    "metadata": {',
      '      "version": "1.0",',
      '      "author": "Recipe Engineer Agent",',
      `      "createdAt": "${createdAt}"`,
      '    }',
      '  },',
      '  "reasoning": "Explanation of formulation choices",',
      '  "alternatives": ["Alternative approach 1", "Alternative approach 2"]',
      '}',
    ].filter((line) => line !== null)

    const promptText = promptSections.join('\n')

    const responseText = await runPromptWithFallback(promptText, { temperature: 0.4, maxTokens: 1200 })
    const parsed = JSON.parse(responseText)
    
    const validatedRecipe = RecipeSchema.parse(parsed.recipe)
    
    return {
      recipe: validatedRecipe,
      reasoning: parsed.reasoning || 'No reasoning provided',
      alternatives: parsed.alternatives || [],
    }
  }
}
