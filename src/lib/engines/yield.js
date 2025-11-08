/**
 * @typedef {Object} YieldParameters
 * @property {number} [processLoss]
 * @property {number} [moistureContent]
 * @property {number} [evaporationRate]
 * @property {number} [wasteFactor]
 */

/**
 * @typedef {Object} LossBreakdown
 * @property {number} processLoss
 * @property {number} moistureLoss
 * @property {number} evaporationLoss
 * @property {number} waste
 * @property {number} total
 */

/**
 * @typedef {Object} YieldResult
 * @property {number} theoreticalYield
 * @property {number} actualYield
 * @property {number} yieldPercentage
 * @property {LossBreakdown} lossBreakdown
 * @property {string} unit
 * @property {string[]} warnings
 */

/**
 * @typedef {Object} YieldComparison
 * @property {YieldResult|null} best
 * @property {YieldResult|null} worst
 * @property {number} average
 * @property {number} variance
 */

/**
 * @param {{ formulation: Object, bom?: Object, parameters: YieldParameters }} request
 * @returns {YieldResult}
 */
export function calculateYield(request) {
  const { formulation, bom, parameters } = request

  const totalMass = (formulation.ingredients || []).reduce((sum, ing) => sum + (ing.quantity || 0), 0)

  const processLoss = (parameters.processLoss || 0) / 100
  const moistureLoss = (parameters.moistureContent || 0) / 100
  const evaporationLoss = (parameters.evaporationRate || 0) / 100
  const wasteFactor = (parameters.wasteFactor || 0) / 100

  const losses = {
    processLoss: totalMass * processLoss,
    moistureLoss: totalMass * moistureLoss,
    evaporationLoss: totalMass * evaporationLoss,
    waste: totalMass * wasteFactor,
    total: 0
  }

  losses.total = losses.processLoss + losses.moistureLoss + losses.evaporationLoss + losses.waste

  const theoreticalYield = formulation.targetYield
  const actualYield = totalMass - losses.total
  const yieldPercentage = totalMass === 0 ? 0 : (actualYield / totalMass) * 100

  const warnings = []

  if (yieldPercentage < 80) {
    warnings.push('Yield is below 80% - consider reviewing process efficiency')
  }

  if (losses.total > totalMass * 0.25) {
    warnings.push('Total losses exceed 25% - high waste detected')
  }

  if (bom && Array.isArray(bom.process)) {
    const processYield = calculateProcessYield(bom.process, totalMass)
    if (processYield < actualYield * 0.9) {
      warnings.push('Process steps may result in additional yield loss')
    }
  }

  return {
    theoreticalYield,
    actualYield,
    yieldPercentage,
    lossBreakdown: losses,
    unit: formulation.yieldUnit,
    warnings
  }
}

/**
 * @param {Array<Object>} steps
 * @param {number} inputMass
 * @returns {number}
 */
export function calculateProcessYield(steps, inputMass) {
  let currentMass = inputMass

  for (const step of steps || []) {
    if (step.yields && step.yields.input) {
      const yieldFactor = step.yields.output / step.yields.input
      currentMass = currentMass * yieldFactor
    }
  }

  return currentMass
}

/**
 * @param {Object} formulation
 * @param {number} targetYield
 * @returns {Array<Object>}
 */
export function optimizeYield(formulation, targetYield) {
  const currentTotal = (formulation.ingredients || []).reduce((sum, ing) => sum + (ing.quantity || 0), 0)
  const scaleFactor = currentTotal === 0 ? 0 : targetYield / currentTotal

  return (formulation.ingredients || []).map(ing => ({
    ...ing,
    quantity: ing.quantity * scaleFactor
  }))
}

/**
 * @param {YieldResult[]} results
 * @returns {YieldComparison}
 */
export function compareYields(results) {
  if (!results || results.length === 0) {
    return { best: null, worst: null, average: 0, variance: 0 }
  }

  const percentages = results.map(r => r.yieldPercentage)
  const average = percentages.reduce((sum, p) => sum + p, 0) / percentages.length
  const variance = percentages.reduce((sum, p) => sum + Math.pow(p - average, 2), 0) / percentages.length

  const sortedResults = [...results].sort((a, b) => b.yieldPercentage - a.yieldPercentage)

  return {
    best: sortedResults[0],
    worst: sortedResults[sortedResults.length - 1],
    average,
    variance
  }
}

