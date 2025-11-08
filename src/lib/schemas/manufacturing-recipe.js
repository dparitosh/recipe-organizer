/**
 * @typedef {import('./manufacturing-recipe').ManufacturingRecipe} ManufacturingRecipe
 */

/** @type {readonly ['planned','released','in_progress','completed','cancelled']} */
export const MANUFACTURING_STATUSES = ['planned','released','in_progress','completed','cancelled']

/** @type {readonly ['pending','ready','in_progress','completed','confirmed','cancelled']} */
export const OPERATION_STATUSES = ['pending','ready','in_progress','completed','confirmed','cancelled']

/** @type {readonly ['process','material','equipment','quality','safety']} */
export const DEVIATION_TYPES = ['process','material','equipment','quality','safety']

/** @type {readonly ['minor','major','critical']} */
export const SEVERITIES = ['minor','major','critical']

/**
 * Create a default manufacturing recipe for the provided master recipe id.
 * @param {string} masterRecipeId
 * @param {string} creator
 * @returns {ManufacturingRecipe}
 */
export function createEmptyManufacturingRecipe(masterRecipeId, creator) {
  const now = new Date()
  return {
    id: `mfg-${Date.now()}`,
    manufacturingOrderNumber: '',
    masterRecipeId,
    name: 'New Manufacturing Order',
    plant: '',
    productionLine: '',
    status: 'planned',
    scheduledStartDate: now,
    scheduledEndDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    outputMaterial: {
      materialId: '',
      materialNumber: '',
      description: '',
      plannedQuantity: 0,
      unit: 'KG',
      batchNumber: ''
    },
    ingredients: [],
    operations: [],
    resourceAllocation: {
      equipment: [],
      labor: [],
      utilities: []
    },
    actualYields: {
      totalInput: 0,
      totalOutput: 0,
      scrap: 0,
      rework: 0,
      byproducts: [],
      unit: 'KG',
      overallYieldPercentage: 0,
      varianceFromStandard: 0
    },
    qualityResults: [],
    deviations: [],
    costTracking: {
      materialCost: 0,
      laborCost: 0,
      equipmentCost: 0,
      utilityCost: 0,
      overheadCost: 0,
      scrapCost: 0,
      reworkCost: 0,
      totalCost: 0,
      costPerUnit: 0,
      varianceFromStandard: 0,
      currency: 'USD'
    },
    metadata: {
      orderType: 'PP01',
      priority: 'normal',
      createdBy: creator,
      regulatoryBatch: false
    },
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Calculate manufacturing yield percentage.
 * @param {ManufacturingRecipe} recipe
 * @returns {number}
 */
export function calculateManufacturingYield(recipe) {
  if (!recipe || !recipe.actualYields || recipe.actualYields.totalInput === 0) {
    return 0
  }
  return (recipe.actualYields.totalOutput / recipe.actualYields.totalInput) * 100
}

/**
 * Validate a manufacturing recipe and return descriptive issues.
 * @param {ManufacturingRecipe} recipe
 * @returns {string[]}
 */
export function validateManufacturingRecipe(recipe) {
  const errors = []
  if (!recipe) {
    return ['Recipe is required']
  }

  if (!String(recipe.manufacturingOrderNumber || '').trim()) {
    errors.push('Manufacturing order number is required')
  }

  if (!String(recipe.plant || '').trim()) {
    errors.push('Plant is required')
  }

  if (!recipe.outputMaterial || !recipe.outputMaterial.materialId) {
    errors.push('Output material is required')
  }

  if (!recipe.outputMaterial || !(recipe.outputMaterial.plannedQuantity > 0)) {
    errors.push('Planned output quantity must be positive')
  }

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  if (ingredients.length === 0) {
    errors.push('At least one ingredient is required')
  }

  const operations = Array.isArray(recipe.operations) ? [...recipe.operations] : []
  if (operations.length === 0) {
    errors.push('At least one operation is required')
  }

  operations.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
  operations.forEach((operation, index) => {
    if ((operation.sequence || 0) !== index + 1) {
      errors.push(`Operations must be sequential (found sequence ${operation.sequence} at position ${index + 1})`)
    }
  })

  const start = recipe.scheduledStartDate ? new Date(recipe.scheduledStartDate) : null
  const end = recipe.scheduledEndDate ? new Date(recipe.scheduledEndDate) : null
  if (start && end && !(start < end)) {
    errors.push('Scheduled start date must be before end date')
  }

  return errors
}
