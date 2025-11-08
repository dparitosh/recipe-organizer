/**
 * @typedef {import('./formulation').Formulation} Formulation
 * @typedef {import('./formulation').Ingredient} Ingredient
 */

/** @type {readonly ['base','flavor','preservative','sweetener','colorant','other']} */
export const INGREDIENT_FUNCTIONS = ['base','flavor','preservative','sweetener','colorant','other']

/** @type {readonly ['concentrate','final_product','intermediate']} */
export const FORMULATION_TYPES = ['concentrate','final_product','intermediate']

/** @type {readonly ['draft','review','approved','archived']} */
export const FORMULATION_STATUS = ['draft','review','approved','archived']

/**
 * Create a blank formulation template owned by the provided user.
 * @param {string} owner
 * @returns {Formulation}
 */
export function createEmptyFormulation(owner) {
  const now = new Date()
  return {
    id: `formula-${Date.now()}`,
    name: 'New Formulation',
    version: '1.0',
    type: 'final_product',
    status: 'draft',
    ingredients: [],
    targetYield: 100,
    yieldUnit: 'kg',
    costPerUnit: 0,
    metadata: {
      owner,
      department: '',
      tags: [],
      notes: ''
    },
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Sum ingredient percentages, ignoring nullish entries.
 * @param {Ingredient[]} ingredients
 * @returns {number}
 */
export function calculateTotalPercentage(ingredients) {
  return (ingredients || []).reduce((sum, ingredient) => {
    const value = typeof ingredient.percentage === 'number' ? ingredient.percentage : 0
    return sum + value
  }, 0)
}

/**
 * Validate a formulation and return a list of issues.
 * @param {Formulation} formulation
 * @returns {string[]}
 */
export function validateFormulation(formulation) {
  const errors = []

  if (!String(formulation.name || '').trim()) {
    errors.push('Formulation name is required')
  }

  const ingredients = Array.isArray(formulation.ingredients) ? formulation.ingredients : []
  if (ingredients.length === 0) {
    errors.push('At least one ingredient is required')
  }

  const totalPercentage = calculateTotalPercentage(ingredients)
  if (Math.abs(totalPercentage - 100) > 0.1) {
    errors.push(`Total percentage must equal 100% (currently ${totalPercentage.toFixed(2)}%)`)
  }

  ingredients.forEach((ingredient, index) => {
    if (!String(ingredient.name || '').trim()) {
      errors.push(`Ingredient ${index + 1} is missing a name`)
    }
    if (!(typeof ingredient.quantity === 'number') || ingredient.quantity <= 0) {
      errors.push(`Ingredient "${ingredient.name}" must have a positive quantity`)
    }
    if (!(typeof ingredient.percentage === 'number') || ingredient.percentage < 0 || ingredient.percentage > 100) {
      errors.push(`Ingredient "${ingredient.name}" percentage must be between 0-100%`)
    }
  })

  return errors
}
