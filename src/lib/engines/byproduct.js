/**
 * @typedef {Object} Byproduct
 * @property {string} id
 * @property {string} name
 * @property {number} quantity
 * @property {string} unit
 * @property {string} source
 * @property {'waste'|'recyclable'|'saleable'|'hazardous'} category
 * @property {number} [value]
 * @property {number} [disposalCost]
 * @property {string} [recoveryMethod]
 */

/**
 * @typedef {Object} ByproductAnalysis
 * @property {Byproduct[]} byproducts
 * @property {number} totalWaste
 * @property {number} totalValue
 * @property {number} totalDisposalCost
 * @property {number} wastePercentage
 * @property {string[]} recommendations
 */

/**
 * @typedef {Object} OptimizationOpportunity
 * @property {string} byproductId
 * @property {string} opportunity
 * @property {number} potentialValue
 * @property {string} implementation
 * @property {'high'|'medium'|'low'} priority
 */

/**
 * @typedef {Object} ByproductOptimization
 * @property {OptimizationOpportunity[]} opportunities
 * @property {number} totalPotentialValue
 * @property {number} estimatedROI
 */

/**
 * @typedef {Object} ByproductTrend
 * @property {'increasing'|'decreasing'|'stable'} trend
 * @property {number} averageWaste
 * @property {number} changePercentage
 * @property {number} projection
 */

/**
 * @param {Object} formulation
 * @param {Array<Object>} processSteps
 * @returns {ByproductAnalysis}
 */
export function calculateByproducts(formulation, processSteps) {
  const byproducts = []
  const ingredients = Array.isArray(formulation?.ingredients) ? formulation.ingredients : []
  const steps = Array.isArray(processSteps) ? processSteps : []
  const totalInput = ingredients.reduce((sum, ing) => sum + (ing.quantity || 0), 0)

  steps.forEach((step, idx) => {
    if (step.yields && step.yields.waste && step.yields.waste > 0) {
      byproducts.push({
        id: `byproduct-${idx}`,
        name: `${step.name} Waste`,
        quantity: step.yields.waste,
        unit: step.yields.unit,
        source: step.name,
        category: categorizeByproduct(step),
        recoveryMethod: suggestRecoveryMethod(step)
      })
    }
  })

  ingredients.forEach(ing => {
    if (ing.function === 'other' && ing.percentage < 0.1) {
      const trimmingWaste = ing.quantity * 0.05
      if (trimmingWaste > 0.01) {
        byproducts.push({
          id: `waste-${ing.id}`,
          name: `${ing.name} Trimmings`,
          quantity: trimmingWaste,
          unit: ing.unit,
          source: ing.name,
          category: 'recyclable'
        })
      }
    }
  })

  const totalWaste = byproducts.reduce((sum, bp) => sum + bp.quantity, 0)
  const wastePercentage = totalInput === 0 ? 0 : (totalWaste / totalInput) * 100

  const totalValue = byproducts.reduce((sum, bp) => sum + (bp.value || 0), 0)
  const totalDisposalCost = byproducts.reduce((sum, bp) => sum + (bp.disposalCost || 0), 0)

  const recommendations = generateRecommendations(byproducts, wastePercentage)

  return {
    byproducts,
    totalWaste,
    totalValue,
    totalDisposalCost,
    wastePercentage,
    recommendations
  }
}

function categorizeByproduct(step) {
  const name = String(step.name || '').toLowerCase()

  if (name.includes('filter') || name.includes('clarif')) {
    return 'recyclable'
  }

  if (name.includes('extract') || name.includes('concentrate')) {
    return 'saleable'
  }

  if (name.includes('chemical') || name.includes('solvent')) {
    return 'hazardous'
  }

  return 'waste'
}

function suggestRecoveryMethod(step) {
  const name = String(step.name || '').toLowerCase()

  if (name.includes('filter')) {
    return 'Composting or animal feed'
  }

  if (name.includes('concentrate') || name.includes('evaporate')) {
    return 'Water recovery for reuse'
  }

  if (name.includes('extract')) {
    return 'Secondary extraction or composting'
  }

  return undefined
}

function generateRecommendations(byproducts, wastePercentage) {
  const recommendations = []

  if (wastePercentage > 15) {
    recommendations.push('High waste percentage - consider process optimization')
  }

  const recyclableWaste = byproducts.filter(bp => bp.category === 'recyclable')
  if (recyclableWaste.length > 0) {
    recommendations.push(`${recyclableWaste.length} recyclable byproduct(s) identified - explore recovery options`)
  }

  const saleableByproducts = byproducts.filter(bp => bp.category === 'saleable')
  if (saleableByproducts.length > 0) {
    recommendations.push(`${saleableByproducts.length} potentially saleable byproduct(s) - consider market opportunities`)
  }

  const hazardousWaste = byproducts.filter(bp => bp.category === 'hazardous')
  if (hazardousWaste.length > 0) {
    recommendations.push(`${hazardousWaste.length} hazardous waste stream(s) - ensure proper disposal protocols`)
  }

  const largeWasteStreams = byproducts.filter(bp => bp.quantity > 10)
  if (largeWasteStreams.length > 0) {
    recommendations.push('Large waste streams detected - prioritize these for reduction efforts')
  }

  return recommendations
}

/**
 * @param {Byproduct[]} byproducts
 * @returns {ByproductOptimization}
 */
export function optimizeByproductRecovery(byproducts) {
  const optimizations = []

  byproducts.forEach(bp => {
    if (bp.category === 'recyclable' && bp.quantity > 5) {
      optimizations.push({
        byproductId: bp.id,
        opportunity: 'Recycling program',
        potentialValue: bp.quantity * 0.5,
        implementation: 'Partner with recycling facility',
        priority: 'medium'
      })
    }

    if (bp.category === 'saleable' && bp.quantity > 1) {
      optimizations.push({
        byproductId: bp.id,
        opportunity: 'Market as secondary product',
        potentialValue: bp.quantity * 2,
        implementation: 'Develop sales channel',
        priority: 'high'
      })
    }

    if (bp.category === 'waste' && bp.quantity > 10) {
      optimizations.push({
        byproductId: bp.id,
        opportunity: 'Process improvement',
        potentialValue: bp.quantity * 0.3,
        implementation: 'Optimize process to reduce waste',
        priority: 'high'
      })
    }
  })

  const sortedOptimizations = optimizations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })

  const totalPotentialValue = optimizations.reduce((sum, opt) => sum + opt.potentialValue, 0)

  return {
    opportunities: sortedOptimizations,
    totalPotentialValue,
    estimatedROI: byproducts.length > 0 ? totalPotentialValue / byproducts.length : 0
  }
}

/**
 * @param {ByproductAnalysis[]} historicalData
 * @param {'weekly'|'monthly'|'yearly'} timeframe
 * @returns {ByproductTrend}
 */
export function trackByproductTrends(historicalData, timeframe) {
  if (!historicalData || historicalData.length < 2) {
    return {
      trend: 'stable',
      averageWaste: 0,
      changePercentage: 0,
      projection: 0
    }
  }

  const wasteValues = historicalData.map(d => d.totalWaste)
  const averageWaste = wasteValues.reduce((sum, val) => sum + val, 0) / wasteValues.length

  const firstValue = wasteValues[0]
  const lastValue = wasteValues[wasteValues.length - 1]
  const changePercentage = firstValue === 0 ? 0 : ((lastValue - firstValue) / firstValue) * 100

  const trend =
    changePercentage > 5 ? 'increasing' :
    changePercentage < -5 ? 'decreasing' :
    'stable'

  const projection = lastValue + (lastValue - firstValue)

  return {
    trend,
    averageWaste,
    changePercentage,
    projection
  }
}
