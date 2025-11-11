import { RecipeSchema } from '../agent-schemas.js'
import { requestJsonResponse } from '../utils/prompt-runner.js'

const BASE_WATER_PERCENTAGE = 88
const ALLOWED_FUNCTIONS = ['base', 'flavor', 'preservative', 'sweetener', 'emulsifier', 'stabilizer', 'colorant', 'other']

const makeId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`
const normalizeRequest = (value) => value?.toLowerCase() ?? ''

const extractActiveIngredient = (normalizedRequest) => {
  if (normalizedRequest.includes('green tea')) {
    return 'Green Tea Extract'
  }

  if (normalizedRequest.includes('matcha')) {
    return 'Matcha Powder'
  }

  const words = normalizedRequest.split(/[,.;]/)[0] || 'Botanical Extract'
  const token = words.trim().split(' ').slice(-2).join(' ') || 'Functional Extract'
  return token
    .replace(/extract extract/i, 'Extract')
    .replace(/\btea\b/i, 'Tea')
    .replace(/^(.)/, (char) => char.toUpperCase())
}

const summarizeContext = (context = {}) => {
  const summary = {}

  if (context.densityMap) {
    summary.densityMap = context.densityMap
  }

  if (context.costMap) {
    summary.costMap = context.costMap
  }

  if (context.targetConsumer) {
    summary.targetConsumer = context.targetConsumer
  }

  if (context.claims) {
    summary.claims = context.claims
  }

  if (Array.isArray(context.ingredientsLibrary)) {
    summary.ingredientsLibrary = context.ingredientsLibrary.slice(0, 10)
  }

  if (Array.isArray(context.relatedFormulas)) {
    summary.relatedFormulas = context.relatedFormulas.slice(0, 5)
  }

  return Object.keys(summary).length > 0 ? JSON.stringify(summary) : 'No additional context provided.'
}

const buildPrompt = (userRequest, contextSummary, timestamp) => {
  return [
    'You are the Recipe Engineer agent for a food & beverage R&D co-pilot.',
    'Translate user requirements into a validated formulation.',
    '',
    'Instructions:',
    `- Ingredient functions must be one of: ${ALLOWED_FUNCTIONS.join(', ')}.`,
    '- Percentages must sum to exactly 100%.',
    '- Use available context to ground realistic ingredient choices.',
    '- Provide descriptive text explaining the formulation decisions.',
    '- Return only JSON that matches the requested schema.',
    '',
    `User Request: ${userRequest}`,
    'Context:',
    contextSummary,
    '',
    'JSON Schema:',
    '{',
    '  "recipe": {',
    '    "id": "string",',
    '    "name": "string",',
    '    "description": "string",',
    '    "ingredients": [',
    '      {',
    '        "id": "string",',
    '        "name": "string",',
    '        "percentage": 42.5,',
    '        "function": "base|flavor|preservative|sweetener|emulsifier|stabilizer|colorant|other",',
    '        "category": "string"',
    '      }',
    '    ],',
    '    "totalPercentage": 100,',
    '    "metadata": {',
    `      "createdAt": "${timestamp}",`,
    '      "author": "Recipe Engineer Agent",',
    '      "version": "string"',
    '    }',
    '  },',
    '  "reasoning": "Explain the formulation choices.",',
    '  "alternatives": ["Optional alternate approaches"]',
    '}',
  ].join('\n')
}

const buildFallbackRecipe = (userRequest, createdAt) => {
  const normalized = normalizeRequest(userRequest)
  const isBeverage = /drink|beverage|tea|juice|smoothie/.test(normalized)
  const activeIngredient = isBeverage ? extractActiveIngredient(normalized) : 'Functional Extract'
  const recipeId = makeId('recipe')

  const ingredients = [
    {
      id: makeId('ing'),
      name: isBeverage ? 'Purified Water' : 'Base Ingredient',
      percentage: isBeverage ? BASE_WATER_PERCENTAGE : 70,
      function: 'base',
      category: isBeverage ? 'water' : 'general',
    },
    {
      id: makeId('ing'),
      name: isBeverage ? activeIngredient : 'Active Component',
      percentage: isBeverage ? 5 : 20,
      function: isBeverage ? 'flavor' : 'other',
      category: isBeverage ? 'botanical extract' : 'active',
    },
    {
      id: makeId('ing'),
      name: isBeverage ? 'Cane Sugar' : 'Support Ingredient',
      percentage: isBeverage ? 4 : 10,
      function: isBeverage ? 'sweetener' : 'other',
      category: isBeverage ? 'sweetener' : 'support',
    },
    {
      id: makeId('ing'),
      name: isBeverage ? 'Citric Acid' : 'Stabilizer',
      percentage: isBeverage ? 0.8 : 0,
      function: isBeverage ? 'preservative' : 'other',
      category: isBeverage ? 'acidulant' : 'general',
    },
    {
      id: makeId('ing'),
      name: isBeverage ? 'Ascorbic Acid (Vitamin C)' : 'Processing Aid',
      percentage: isBeverage ? 0.5 : 0,
      function: 'preservative',
      category: isBeverage ? 'antioxidant' : 'general',
    },
  ].filter((ingredient) => ingredient.percentage > 0)

  const recipeName = isBeverage ? `${activeIngredient} Functional Beverage` : 'Concept Formulation'

  const currentTotal = ingredients.reduce((total, item) => total + item.percentage, 0)
  if (Math.abs(currentTotal - 100) > 0.001 && ingredients.length > 0) {
    const adjusted = { ...ingredients[0] }
    adjusted.percentage = Math.max(0, adjusted.percentage + (100 - currentTotal))
    ingredients[0] = adjusted
  }

  return {
    recipe: {
      id: recipeId,
      name: recipeName,
      description: `Preliminary formulation derived from request: ${userRequest}`,
      ingredients,
      totalPercentage: ingredients.reduce((total, item) => total + item.percentage, 0),
      metadata: {
        version: 'fallback',
        author: 'Recipe Engineer Agent',
        createdAt,
      },
    },
    reasoning: 'Returned fallback formulation because structured output generation failed.',
    alternatives: [
      'Provide more detail about desired taste profile and functional claims.',
      'Specify processing constraints or regulatory limits to refine the formulation.',
    ],
  }
}

export class RecipeEngineerAgent {
  name = 'Recipe Engineer'
  description = 'Interprets formulation requirements and structures ingredients with validated yields'

  async execute(input) {
    const createdAt = new Date().toISOString()
    const contextSummary = summarizeContext(input.context)
    const prompt = buildPrompt(input.userRequest, contextSummary, createdAt)

    try {
      const response = await requestJsonResponse(prompt, {
        temperature: 0.35,
        maxTokens: 1200,
        systemPrompt: 'You are a formulation scientist. Return JSON only and adhere to the provided schema.',
        maxAttempts: 2,
      })

      const parsedRecipe = RecipeSchema.parse({
        ...response.recipe,
        metadata: {
          ...(response.recipe?.metadata || {}),
          author: 'Recipe Engineer Agent',
          createdAt: response.recipe?.metadata?.createdAt || createdAt,
        },
      })

      if (!Array.isArray(response.alternatives)) {
        response.alternatives = []
      }

      return {
        recipe: parsedRecipe,
        reasoning: response.reasoning || 'Formulation generated based on user request and available context.',
        alternatives: response.alternatives,
      }
    } catch (error) {
      return buildFallbackRecipe(input.userRequest, createdAt)
    }
  }
}
