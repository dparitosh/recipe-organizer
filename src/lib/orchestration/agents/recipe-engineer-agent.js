const BASE_WATER_PERCENTAGE = 88

const makeId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`
const normalizeRequest = (value) => value?.toLowerCase() ?? ''

function extractActiveIngredient(normalizedRequest) {
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

function buildRecipeName(normalizedRequest, activeIngredient) {
  if (normalizedRequest.includes('sparkling')) {
    return `${activeIngredient} Sparkling Beverage`
  }

  if (normalizedRequest.includes('energy')) {
    return `${activeIngredient} Energy Drink`
  }

  return `${activeIngredient} Functional Beverage`
}

function buildDefaultRecipe(userRequest, createdAt) {
  const recipeId = makeId('recipe')
  const ingredients = [
    {
      id: makeId('ing'),
      name: 'Base Ingredient',
      percentage: 70,
      function: 'base',
      category: 'general',
    },
    {
      id: makeId('ing'),
      name: 'Active Component',
      percentage: 20,
      function: 'other',
      category: 'active',
    },
    {
      id: makeId('ing'),
      name: 'Support Ingredient',
      percentage: 10,
      function: 'other',
      category: 'support',
    },
  ]

  return {
    recipe: {
      id: recipeId,
      name: 'Concept Formulation',
      description: `Preliminary formulation derived from request: ${userRequest}`,
      ingredients,
      totalPercentage: 100,
      metadata: {
        version: '0.1',
        author: 'Recipe Engineer Agent',
        createdAt,
      },
    },
    reasoning: 'Generated a placeholder formulation because the request could not be mapped to a detailed template.',
    alternatives: [
      'Provide more detail about the product type for a richer formulation.',
      'List critical functional requirements (e.g., sugar-free, dairy-free).',
    ],
  }
}

function buildBeverageRecipe(userRequest, createdAt) {
  const normalized = normalizeRequest(userRequest)
  const activeIngredient = extractActiveIngredient(normalized)
  const recipeId = makeId('recipe')

  const ingredients = [
    {
      id: makeId('ing'),
      name: 'Purified Water',
      percentage: BASE_WATER_PERCENTAGE,
      function: 'base',
      category: 'water',
    },
    {
      id: makeId('ing'),
      name: activeIngredient,
      percentage: 5,
      function: 'flavor',
      category: 'botanical extract',
    },
    {
      id: makeId('ing'),
      name: 'Cane Sugar',
      percentage: 4,
      function: 'sweetener',
      category: 'sweetener',
    },
    {
      id: makeId('ing'),
      name: 'Natural Lemon Flavor',
      percentage: 1.5,
      function: 'flavor',
      category: 'flavor',
    },
    {
      id: makeId('ing'),
      name: 'Citric Acid',
      percentage: 0.8,
      function: 'preservative',
      category: 'acidulant',
    },
    {
      id: makeId('ing'),
      name: 'Ascorbic Acid (Vitamin C)',
      percentage: 0.5,
      function: 'preservative',
      category: 'antioxidant',
    },
    {
      id: makeId('ing'),
      name: 'Sodium Benzoate',
      percentage: 0.2,
      function: 'preservative',
      category: 'preservative',
    },
  ]

  return {
    recipe: {
      id: recipeId,
      name: buildRecipeName(normalized, activeIngredient),
      description: `Ready-to-drink functional beverage built around ${activeIngredient.toLowerCase()} with balanced sweetness and shelf-stable acidification.`,
      ingredients,
      totalPercentage: 100,
      metadata: {
        version: '1.0',
        author: 'Recipe Engineer Agent',
        createdAt,
      },
    },
    reasoning: `Allocated ${BASE_WATER_PERCENTAGE}% purified water as base, ${activeIngredient} for functional benefit, and supporting acids/preservatives to maintain flavor stability and shelf life.`,
    alternatives: [
      'Replace cane sugar with stevia + erythritol blend for lower calories.',
      'Swap lemon flavor for peach or mango concentrates to expand the product line.',
    ],
  }
}

function buildRecipeProfile(userRequest, createdAt) {
  const normalized = normalizeRequest(userRequest)
  const isBeverage = /drink|beverage|tea|juice|smoothie/.test(normalized)

  if (!isBeverage) {
    return buildDefaultRecipe(userRequest, createdAt)
  }

  return buildBeverageRecipe(userRequest, createdAt)
}

export class RecipeEngineerAgent {
  name = 'Recipe Engineer'
  description = 'Interprets formulation requirements and structures ingredients with validated yields'

  async execute(input) {
    const createdAt = new Date().toISOString()
    const profile = buildRecipeProfile(input.userRequest, createdAt)

    return {
      recipe: profile.recipe,
      reasoning: profile.reasoning,
      alternatives: profile.alternatives,
    }
  }
}
