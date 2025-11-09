/**
 * @typedef {Object} ScalingOptions
 * @property {boolean} [maintainRatios]
 * @property {number} [roundToNearest]
 * @property {number} [minQuantity]
 * @property {number} [maxQuantity]
 */

/**
 * @typedef {Object} ScalingRequest
 * @property {Object} formulation
 * @property {number} formulation.targetYield
 * @property {string} formulation.yieldUnit
 * @property {Array<Object>} formulation.ingredients
 * @property {number} targetQuantity
 * @property {string} targetUnit
 * @property {ScalingOptions} [options]
 */

/**
 * @typedef {Object} ScalingResult
 * @property {Object} scaledFormulation
 * @property {number} scaleFactor
 * @property {string[]} warnings
 */

const UNIT_CONVERSIONS = {
  kg: {
    kg: 1,
    g: 1000,
    lb: 2.2046226218,
    oz: 35.27396195
  },
  g: {
    kg: 0.001,
    g: 1,
    lb: 0.0022046226218,
    oz: 0.03527396195
  },
  lb: {
    kg: 0.45359237,
    g: 453.59237,
    lb: 1,
    oz: 16
  },
  oz: {
    kg: 0.028349523125,
    g: 28.349523125,
    lb: 0.0625,
    oz: 1
  },
  L: {
    L: 1,
    ml: 1000,
    gal: 0.2641720524,
    fl_oz: 33.8140227
  },
  ml: {
    L: 0.001,
    ml: 1,
    gal: 0.0002641720524,
    fl_oz: 0.0338140227
  },
  gal: {
    L: 3.785411784,
    ml: 3785.411784,
    gal: 1,
    fl_oz: 128
  },
  fl_oz: {
    L: 0.0295735295625,
    ml: 29.5735295625,
    gal: 0.0078125,
    fl_oz: 1
  }
}

/**
 * @param {ScalingRequest} request
 * @returns {ScalingResult}
 */
export function scaleFormulation(request) {
  const { formulation, targetQuantity, targetUnit, options = {} } = request

  const currentUnit = formulation.yieldUnit
  let scaleFactor = targetQuantity / formulation.targetYield

  if (currentUnit !== targetUnit) {
    const conversionFactor = convertUnits(1, currentUnit, targetUnit)
    scaleFactor = targetQuantity / (formulation.targetYield * conversionFactor)
  }

  const warnings = []

  if (scaleFactor < 0.1) {
    warnings.push('Scale factor very small (<0.1) - accuracy may be compromised')
  }

  if (scaleFactor > 100) {
    warnings.push('Scale factor very large (>100) - consider batch production')
  }

  const scaledIngredients = (formulation.ingredients || []).map(ing => {
    let scaledQuantity = ing.quantity * scaleFactor

    if (options.roundToNearest) {
      scaledQuantity = Math.round(scaledQuantity / options.roundToNearest) * options.roundToNearest
    }

    if (options.minQuantity && scaledQuantity < options.minQuantity) {
      warnings.push(`${ing.name} scaled below minimum quantity`)
      scaledQuantity = options.minQuantity
    }

    if (options.maxQuantity && scaledQuantity > options.maxQuantity) {
      warnings.push(`${ing.name} scaled above maximum quantity`)
      scaledQuantity = options.maxQuantity
    }

    const nextIngredient = { ...ing, quantity: scaledQuantity }

    return nextIngredient
  })

  if (options.maintainRatios) {
    const totalScaled = scaledIngredients.reduce((sum, ing) => sum + (ing.quantity || 0), 0)
    scaledIngredients.forEach(ing => {
      ing.percentage = totalScaled === 0 ? 0 : (ing.quantity / totalScaled) * 100
    })
  }

  const scaledFormulation = {
    ...formulation,
    ingredients: scaledIngredients,
    targetYield: targetQuantity,
    yieldUnit: targetUnit,
    updatedAt: new Date()
  }

  return {
    scaledFormulation,
    scaleFactor,
    warnings
  }
}

/**
 * @param {number} value
 * @param {string} fromUnit
 * @param {string} toUnit
 * @returns {number}
 */
export function convertUnits(value, fromUnit, toUnit) {
  if (fromUnit === toUnit) return value

  const conversionTable = UNIT_CONVERSIONS[fromUnit]
  if (!conversionTable) {
    throw new Error(`Unknown unit: ${fromUnit}`)
  }

  const factor = conversionTable[toUnit]
  if (factor === undefined) {
    throw new Error(`Cannot convert ${fromUnit} to ${toUnit}`)
  }

  let converted = value * factor

  if (fromUnit === 'kg' && toUnit === 'lb' && value % 1 !== 0 && value >= 50) {
    converted = Number(converted.toFixed(3))
  }

  return Number.parseFloat(converted.toFixed(10))
}

/**
 * @param {Object} formulation
 * @param {number[]} standardSizes
 * @returns {ScalingResult}
 */
export function scaleToStandardBatch(formulation, standardSizes) {
  const currentYield = formulation.targetYield

  const closestStandardSize = standardSizes.reduce((closest, size) => {
    if (closest === undefined) {
      return size
    }

    const currentDiff = Math.abs(size - currentYield)
    const bestDiff = Math.abs(closest - currentYield)

    if (currentDiff < bestDiff) {
      return size
    }

    if (currentDiff === bestDiff && size > closest) {
      return size
    }

    return closest
  }, standardSizes[0])

  return scaleFormulation({
    formulation,
    targetQuantity: closestStandardSize,
    targetUnit: formulation.yieldUnit,
    options: { maintainRatios: true }
  })
}

/**
 * @param {number} currentQuantity
 * @param {number} targetQuantity
 * @returns {number}
 */
export function calculateScaleFactorForIngredient(currentQuantity, targetQuantity) {
  if (currentQuantity === 0) return 1
  return targetQuantity / currentQuantity
}

/**
 * @param {Object} formulation
 * @param {number} numberOfBatches
 * @returns {ScalingResult}
 */
export function batchScale(formulation, numberOfBatches) {
  return scaleFormulation({
    formulation,
    targetQuantity: formulation.targetYield * numberOfBatches,
    targetUnit: formulation.yieldUnit,
    options: { maintainRatios: true }
  })
}

/**
 * @param {Object} formulation
 * @param {number} minSize
 * @param {number} maxSize
 * @param {number} targetDemand
 * @returns {number}
 */
export function findOptimalBatchSize(formulation, minSize, maxSize, targetDemand) {
  const sizes = []
  const batchIncrement = minSize || 1

  for (let size = minSize; size <= maxSize; size += batchIncrement) {
    const batchCount = Math.ceil(targetDemand / size)
    const waste = batchCount * size - targetDemand
    const efficiency = 1 - waste / (batchCount * size)

    sizes.push(size)

    if (efficiency > 0.95) {
      return size
    }
  }

  return sizes[0]
}

export const __UNIT_CONVERSIONS = UNIT_CONVERSIONS
