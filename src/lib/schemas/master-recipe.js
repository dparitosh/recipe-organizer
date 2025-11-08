/**
 * @typedef {import('./master-recipe').MasterRecipe} MasterRecipe
 */

/** @type {readonly ['standard','alternative','trial','template']} */
export const RECIPE_TYPES = ['standard','alternative','trial','template']

/** @type {readonly ['draft','review','approved','active','obsolete']} */
export const RECIPE_STATUSES = ['draft','review','approved','active','obsolete']

/** @type {readonly ['preparation','mixing','processing','cooling','packaging']} */
export const RECIPE_PHASES = ['preparation','mixing','processing','cooling','packaging']

/**
 * Create a default master recipe scaffold.
 * @param {string} creator
 * @returns {MasterRecipe}
 */
export function createEmptyMasterRecipe(creator) {
  const now = new Date()
  return {
    id: `recipe-${Date.now()}`,
    recipeNumber: '',
    name: 'New Master Recipe',
    type: 'standard',
    status: 'draft',
    outputMaterial: {
      materialId: '',
      materialNumber: '',
      description: '',
      quantity: 0,
      unit: 'KG',
      batchSize: 0
    },
    ingredients: [],
    processInstructions: [],
    controlParameters: [],
    qualityChecks: [],
    packaging: [],
    yields: {
      theoreticalYield: 100,
      expectedYield: 95,
      unit: 'KG',
      yieldPercentage: 95,
      lossFactors: [],
      byproducts: []
    },
    scaleRange: {
      minimumBatch: 50,
      maximumBatch: 5000,
      standardBatch: 1000,
      unit: 'KG',
      scalingFactor: 1
    },
    metadata: {
      plant: '',
      developedBy: creator,
      validFrom: now,
      version: '1.0',
      revisionNumber: 1,
      regulatoryApprovalRequired: false,
      productCategory: '',
      allergenInfo: [],
      certifications: [],
      notes: ''
    },
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Compute recipe yield by subtracting loss factors from 100.
 * @param {MasterRecipe} recipe
 * @returns {number}
 */
export function calculateRecipeYield(recipe) {
  if (!recipe || !recipe.yields) {
    return 0
  }
  const losses = Array.isArray(recipe.yields.lossFactors) ? recipe.yields.lossFactors : []
  const totalLoss = losses.reduce((sum, factor) => sum + (factor.lossPercentage || 0), 0)
  return Math.max(0, 100 - totalLoss)
}

/**
 * Validate a master recipe and collect user facing errors.
 * @param {MasterRecipe} recipe
 * @returns {string[]}
 */
export function validateMasterRecipe(recipe) {
  const errors = []
  if (!recipe) {
    return ['Recipe is required']
  }

  if (!String(recipe.recipeNumber || '').trim()) {
    errors.push('Recipe number is required')
  }

  if (!String(recipe.name || '').trim()) {
    errors.push('Recipe name is required')
  }

  if (!recipe.outputMaterial || !recipe.outputMaterial.materialId) {
    errors.push('Output material is required')
  }

  if (!recipe.outputMaterial || !(recipe.outputMaterial.quantity > 0)) {
    errors.push('Output quantity must be positive')
  }

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  if (ingredients.length === 0) {
    errors.push('At least one ingredient is required')
  }

  const totalPercentage = ingredients.reduce((sum, ingredient) => sum + (ingredient.percentage || 0), 0)
  if (Math.abs(totalPercentage - 100) > 0.1) {
    errors.push(`Total ingredient percentage must equal 100% (currently ${totalPercentage.toFixed(2)}%)`)
  }

  ingredients.forEach((ingredient, index) => {
    if (!(ingredient.quantity > 0)) {
      errors.push(`Ingredient ${index + 1} quantity must be positive`)
    }
    if (!(ingredient.percentage >= 0 && ingredient.percentage <= 100)) {
      errors.push(`Ingredient ${index + 1} percentage must be between 0-100%`)
    }
  })

  const instructions = Array.isArray(recipe.processInstructions) ? [...recipe.processInstructions] : []
  if (instructions.length === 0) {
    errors.push('At least one process instruction is required')
  }

  instructions.sort((a, b) => (a.step || 0) - (b.step || 0))
  instructions.forEach((instruction, index) => {
    if ((instruction.step || 0) !== index + 1) {
      errors.push(`Process steps must be sequential (found step ${instruction.step} at position ${index + 1})`)
    }
  })

  if (recipe.yields && !(recipe.yields.yieldPercentage >= 0 && recipe.yields.yieldPercentage <= 100)) {
    errors.push('Yield percentage must be between 0-100%')
  }

  if (recipe.scaleRange && recipe.scaleRange.minimumBatch > recipe.scaleRange.maximumBatch) {
    errors.push('Minimum batch size cannot exceed maximum batch size')
  }

  return errors
}
