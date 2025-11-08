/**
 * @typedef {Object} CostParameters
 * @property {number} [overheadRate]
 * @property {number} [laborCostPerHour]
 * @property {number} [energyCostPerUnit]
 * @property {number} [packagingCost]
 * @property {number} [shippingCost]
 * @property {number} [markupPercentage]
 */

/**
 * @typedef {Object} CostBreakdown
 * @property {number} rawMaterials
 * @property {number} labor
 * @property {number} overhead
 * @property {number} packaging
 * @property {number} energy
 * @property {number} shipping
 * @property {number} other
 */

/**
 * @typedef {Object} ProfitabilityMetrics
 * @property {number} grossMargin
 * @property {number} contributionMargin
 * @property {number} [breakEvenVolume]
 * @property {number} [targetPrice]
 */

/**
 * @typedef {Object} CostResult
 * @property {number} totalCost
 * @property {number} costPerUnit
 * @property {CostBreakdown} breakdown
 * @property {ProfitabilityMetrics} profitability
 * @property {string[]} warnings
 */

/**
 * @typedef {Object} CostComparison
 * @property {CostResult|null} lowest
 * @property {CostResult|null} highest
 * @property {number} average
 */

/**
 * @typedef {Object} CostOptimizationConstraints
 * @property {string[]} [fixedIngredients]
 * @property {Record<string, number>} [minPercentages]
 * @property {Record<string, number>} [maxCostPerIngredient]
 */

/**
 * @param {{ formulation: Object, bom?: Object, parameters: CostParameters }} request
 * @returns {CostResult}
 */
export function calculateCost(request) {
  const { formulation, bom, parameters } = request

  const rawMaterialsCost = calculateRawMaterialsCost(formulation.ingredients)

  const laborCost = bom ? calculateLaborCost(bom, parameters.laborCostPerHour || 0) : 0

  const overheadCost = (rawMaterialsCost * (parameters.overheadRate || 0)) / 100
  const packagingCost = parameters.packagingCost || 0
  const energyCost = parameters.energyCostPerUnit || 0
  const shippingCost = parameters.shippingCost || 0

  const breakdown = {
    rawMaterials: rawMaterialsCost,
    labor: laborCost,
    overhead: overheadCost,
    packaging: packagingCost,
    energy: energyCost,
    shipping: shippingCost,
    other: 0
  }

  const totalCost = Object.values(breakdown).reduce((sum, cost) => sum + cost, 0)
  const costPerUnit = formulation.targetYield ? totalCost / formulation.targetYield : 0

  const markupPercentage = parameters.markupPercentage || 0
  const targetPrice = costPerUnit * (1 + markupPercentage / 100)
  const marginDenominator = targetPrice === 0 ? 1 : targetPrice
  const contributionMargin = targetPrice - costPerUnit

  const profitability = {
    grossMargin: ((targetPrice - costPerUnit) / marginDenominator) * 100,
    contributionMargin,
    targetPrice,
    breakEvenVolume: contributionMargin > 0 ? breakdown.overhead / contributionMargin : undefined
  }

  const warnings = []

  if (profitability.grossMargin < 20) {
    warnings.push('Gross margin below 20% - may not be profitable')
  }

  if (breakdown.rawMaterials > totalCost * 0.7) {
    warnings.push('Raw materials exceed 70% of cost - consider alternatives')
  }

  if (breakdown.labor > totalCost * 0.4) {
    warnings.push('Labor costs high - consider process automation')
  }

  return {
    totalCost,
    costPerUnit,
    breakdown,
    profitability,
    warnings
  }
}

/**
 * @param {Array<Object>} ingredients
 * @returns {number}
 */
export function calculateRawMaterialsCost(ingredients) {
  return (ingredients || []).reduce((sum, ing) => {
    const cost = ing.cost || 0
    const quantity = ing.quantity || 0
    return sum + quantity * cost
  }, 0)
}

/**
 * @param {Object} bom
 * @param {number} laborCostPerHour
 * @returns {number}
 */
export function calculateLaborCost(bom, laborCostPerHour) {
  const totalHours = (bom.process || []).reduce((sum, step) => {
    const duration = step.duration || 0
    const hours = step.durationUnit === 'hours'
      ? duration
      : step.durationUnit === 'days'
        ? duration * 8
        : duration / 60
    return sum + hours
  }, 0)

  return totalHours * laborCostPerHour
}

/**
 * @param {CostResult[]} results
 * @returns {CostComparison}
 */
export function compareCosts(results) {
  if (!results || results.length === 0) {
    return { lowest: null, highest: null, average: 0 }
  }

  const sortedResults = [...results].sort((a, b) => a.costPerUnit - b.costPerUnit)
  const average = results.reduce((sum, r) => sum + r.costPerUnit, 0) / results.length

  return {
    lowest: sortedResults[0],
    highest: sortedResults[sortedResults.length - 1],
    average
  }
}

/**
 * @param {Object} formulation
 * @param {number} targetCost
 * @param {CostOptimizationConstraints} [constraints]
 * @returns {Array<Object>}
 */
export function optimizeCost(formulation, targetCost, constraints = {}) {
  const currentCost = calculateRawMaterialsCost(formulation.ingredients)

  if (currentCost <= targetCost) {
    return formulation.ingredients
  }

  const reductionNeeded = currentCost === 0 ? 0 : (currentCost - targetCost) / currentCost

  return (formulation.ingredients || []).map(ing => {
    const canReduce = !(constraints.fixedIngredients || []).includes(ing.id)

    if (!canReduce) {
      return ing
    }

    const alternatives = ing.alternatives || []
    if (alternatives.length > 0 && Math.random() > 0.5) {
      return { ...ing, materialId: alternatives[0] }
    }

    const reducedQuantity = ing.quantity * (1 - reductionNeeded * 0.5)

    return {
      ...ing,
      quantity: reducedQuantity,
      percentage: formulation.targetYield
        ? (reducedQuantity / formulation.targetYield) * 100
        : ing.percentage
    }
  })
}
