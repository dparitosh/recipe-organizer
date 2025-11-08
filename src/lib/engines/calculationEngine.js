
/**
 * @typedef {import('@/lib/schemas/formulation').Formulation} Formulation
 * @typedef {import('@/lib/schemas/formulation').Ingredient} Ingredient
 * @typedef {import('@/lib/schemas/formulation').NutrientProfile} NutrientProfile
 * @typedef {import('@/lib/schemas/bom').BOM} BOM
 * @typedef {import('@/lib/schemas/bom').ProcessStep} ProcessStep
 */

import { convertUnits } from './scaling.js'
import { calculateCost } from './cost.js'
import { calculateByproducts } from './byproduct.js'

/**
 * @typedef {Object} LossModel
 * @property {string} stepName
 * @property {'process'|'evaporation'|'moisture'|'waste'|'transfer'} lossType
 * @property {number} lossPercentage
 * @property {string} [description]
 */

/**
 * @typedef {Object.<string, MaterialDensity>} DensityMap
 */

/**
 * @typedef {Object} MaterialDensity
 * @property {number} density
 * @property {'kg/L'|'g/mL'|'lb/gal'} unit
 * @property {number} [temperature]
 * @property {string} [conditions]
 */

/**
 * @typedef {Object} RoundingRule
 * @property {string} [ingredientPattern]
 * @property {number} minQuantity
 * @property {number} roundToNearest
 * @property {string} unit
 */

/**
 * @typedef {Object} PlantConstraints
 * @property {RoundingRule[]} roundingRules
 * @property {number} [minBatchSize]
 * @property {number} [maxBatchSize]
 * @property {Object.<string, number>} [equipmentCapacity]
 * @property {Object.<string, number>} [processingTime]
 */

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
 * @typedef {Object} CostRollup
 * @property {number} totalCost
 * @property {number} costPerUnit
 * @property {number} costPerBatch
 * @property {CostBreakdown} breakdown
 * @property {number} byproductValue
 * @property {number} netCost
 */

/**
 * @typedef {Object} CalculationMetadata
 * @property {Date} calculatedAt
 * @property {number} baseYield
 * @property {number} targetYield
 * @property {number} scaleFactor
 * @property {number} actualYieldPercentage
 * @property {number} efficiencyScore
 */

/**
 * @typedef {Object} ScaledIngredient
 * @property {string} id
 * @property {string} materialId
 * @property {string} name
 * @property {number} originalQuantity
 * @property {number} scaledQuantity
 * @property {number} roundedQuantity
 * @property {number} [volumeEquivalent]
 * @property {number} [densityUsed]
 * @property {number} scaleFactor
 */

/**
 * @typedef {Object} YieldChainStep
 * @property {string} stepName
 * @property {number} stepIndex
 * @property {number} inputQuantity
 * @property {number} outputQuantity
 * @property {number} lossQuantity
 * @property {number} lossPercentage
 * @property {number} yieldPercentage
 * @property {number} cumulativeYield
 * @property {string} lossType
 */

/**
 * @typedef {Object} CalculationEngineRequest
 * @property {Formulation} formulation
 * @property {BOM} [bom]
 * @property {number} targetBatchSize
 * @property {string} targetUnit
 * @property {number} yieldPercentage
 * @property {LossModel[]} [lossModels]
 * @property {DensityMap} [densityMap]
 * @property {PlantConstraints} [plantConstraints]
 * @property {CostParameters} [costParameters]
 */

/**
 * @typedef {Object} CalculationEngineResult
 * @property {ScaledIngredient[]} scaledIngredients
 * @property {import('./byproduct.js').Byproduct[]} byproducts
 * @property {NutrientProfile} aggregatedNutrition
 * @property {CostRollup} costRollup
 * @property {YieldChainStep[]} yieldChain
 * @property {number} totalOutput
 * @property {string} outputUnit
 * @property {string[]} warnings
 * @property {CalculationMetadata} metadata
 */

/**
 * Comprehensive formulation calculation engine coordinating scaling, yield, cost,
 * and by-product analysis for a production batch.
 */
export class CalculationEngine {
  /**
   * @param {DensityMap} [densityMap]
   * @param {PlantConstraints} [plantConstraints]
   */
  constructor(densityMap, plantConstraints) {
    this.densityMap = densityMap || this.getDefaultDensityMap()
    this.plantConstraints = plantConstraints || this.getDefaultPlantConstraints()
  }

  /**
   * @param {CalculationEngineRequest} request
   * @returns {CalculationEngineResult}
   */
  calculate(request) {
    const warnings = []

    const baseYield = request.formulation.targetYield
    const scaleFactor = request.targetBatchSize / baseYield

    const yieldChain = this.computeYieldChain(
      request.formulation,
      request.bom,
      request.lossModels || [],
      request.yieldPercentage
    )

    const scaledIngredients = this.scaleIngredientsWithDensity(
      request.formulation.ingredients,
      scaleFactor,
      request.targetUnit,
      request.formulation.yieldUnit
    )

    const roundedIngredients = this.applyPlantConstraints(
      scaledIngredients,
      this.plantConstraints
    )

    const byproducts = this.calculateByproductsFromChain(
      yieldChain,
      request.formulation,
      request.bom
    )

    const aggregatedNutrition = this.aggregateNutrition(roundedIngredients)

    const costRollup = this.calculateCostRollup(
      roundedIngredients,
      request.formulation,
      request.bom,
      request.costParameters,
      byproducts
    )

    const finalYield = yieldChain[yieldChain.length - 1]
    const totalOutput = finalYield && typeof finalYield.outputQuantity === 'number'
      ? finalYield.outputQuantity
      : request.targetBatchSize

    const actualYieldPercentage = request.targetBatchSize === 0
      ? 0
      : (totalOutput / request.targetBatchSize) * 100

    const efficiencyScore = this.calculateEfficiencyScore(
      actualYieldPercentage,
      costRollup.costPerUnit,
      warnings.length
    )

    if (actualYieldPercentage < 80) {
      warnings.push(`Actual yield (${actualYieldPercentage.toFixed(1)}%) is below target - significant losses detected`)
    }

    if (scaleFactor > 100) {
      warnings.push(`Scale factor (${scaleFactor.toFixed(1)}x) is very large - consider multiple batches`)
    }

    if (scaleFactor < 0.1) {
      warnings.push(`Scale factor (${scaleFactor.toFixed(3)}x) is very small - precision may be compromised`)
    }

    return {
      scaledIngredients: roundedIngredients,
      byproducts,
      aggregatedNutrition,
      costRollup,
      yieldChain,
      totalOutput,
      outputUnit: request.targetUnit,
      warnings,
      metadata: {
        calculatedAt: new Date(),
        baseYield,
        targetYield: request.targetBatchSize,
        scaleFactor,
        actualYieldPercentage,
        efficiencyScore
      }
    }
  }

  /**
   * @param {Ingredient[]} ingredients
   * @param {number} scaleFactor
   * @param {string} targetUnit
   * @param {string} baseUnit
   * @returns {ScaledIngredient[]}
   */
  scaleIngredientsWithDensity(ingredients, scaleFactor, targetUnit, baseUnit) {
    return (ingredients || []).map(ing => {
      const originalQuantity = ing.quantity
      let scaledQuantity = originalQuantity * scaleFactor

      if (this.needsUnitConversion(ing.unit, targetUnit)) {
        const density = this.getDensityForMaterial(ing.name, ing.unit, targetUnit)
        scaledQuantity = this.convertMassToVolume(scaledQuantity, ing.unit, targetUnit, density)
      }

      return {
        ...ing,
        originalQuantity,
        scaledQuantity,
        roundedQuantity: scaledQuantity,
  densityUsed: this.densityMap[ing.name]?.density,
        scaleFactor
      }
    })
  }

  /**
   * @param {string} fromUnit
   * @param {string} toUnit
   * @returns {boolean}
   */
  needsUnitConversion(fromUnit, toUnit) {
    const massUnits = ['kg', 'g', 'lb', 'oz']
    const volumeUnits = ['L', 'ml', 'gal', 'fl_oz']

    const fromIsMass = massUnits.includes(fromUnit)
    const toIsVolume = volumeUnits.includes(toUnit)
    const fromIsVolume = volumeUnits.includes(fromUnit)
    const toIsMass = massUnits.includes(toUnit)

    return (fromIsMass && toIsVolume) || (fromIsVolume && toIsMass)
  }

  /**
   * @param {number} value
   * @param {string} fromUnit
   * @param {string} toUnit
   * @param {number} density
   * @returns {number}
   */
  convertMassToVolume(value, fromUnit, toUnit, density) {
    const massUnits = ['kg', 'g', 'lb', 'oz']
    const volumeUnits = ['L', 'ml', 'gal', 'fl_oz']

    const isMassToVolume = massUnits.includes(fromUnit) && volumeUnits.includes(toUnit)
    const isVolumeToMass = volumeUnits.includes(fromUnit) && massUnits.includes(toUnit)

    if (isMassToVolume) {
      const massInKg = this.normalizeToKg(value, fromUnit)
      const volumeInL = density === 0 ? 0 : massInKg / density
      return this.convertFromLiters(volumeInL, toUnit)
    }

    if (isVolumeToMass) {
      const volumeInL = this.normalizeToLiters(value, fromUnit)
      const massInKg = volumeInL * density
      return this.convertFromKg(massInKg, toUnit)
    }

    return convertUnits(value, fromUnit, toUnit)
  }

  /**
   * @param {string} materialName
   * @param {string} fromUnit
   * @param {string} toUnit
   * @returns {number}
   */
  getDensityForMaterial(materialName, fromUnit, toUnit) {
    const materialData = this.densityMap[materialName?.toLowerCase?.() || materialName]

    if (materialData) {
      return this.normalizeDensityToKgPerL(materialData.density, materialData.unit)
    }

    return 1.0
  }

  /**
   * @param {number} density
   * @param {string} unit
   * @returns {number}
   */
  normalizeDensityToKgPerL(density, unit) {
    if (unit === 'kg/L') return density
    if (unit === 'g/mL') return density
    if (unit === 'lb/gal') return density * 0.119826
    return density
  }

  /**
   * @param {number} value
   * @param {string} unit
   * @returns {number}
   */
  normalizeToKg(value, unit) {
    const conversions = {
      kg: 1,
      g: 0.001,
      lb: 0.453592,
      oz: 0.0283495
    }
    return value * (conversions[unit] || 1)
  }

  /**
   * @param {number} value
   * @param {string} unit
   * @returns {number}
   */
  convertFromKg(value, unit) {
    const conversions = {
      kg: 1,
      g: 1000,
      lb: 2.20462,
      oz: 35.274
    }
    return value * (conversions[unit] || 1)
  }

  /**
   * @param {number} value
   * @param {string} unit
   * @returns {number}
   */
  normalizeToLiters(value, unit) {
    const conversions = {
      L: 1,
      ml: 0.001,
      gal: 3.78541,
      fl_oz: 0.0295735
    }
    return value * (conversions[unit] || 1)
  }

  /**
   * @param {number} value
   * @param {string} unit
   * @returns {number}
   */
  convertFromLiters(value, unit) {
    const conversions = {
      L: 1,
      ml: 1000,
      gal: 0.264172,
      fl_oz: 33.814
    }
    return value * (conversions[unit] || 1)
  }

  /**
   * @param {ScaledIngredient[]} ingredients
   * @param {PlantConstraints} constraints
   * @returns {ScaledIngredient[]}
   */
  applyPlantConstraints(ingredients, constraints) {
    return ingredients.map(ing => {
      const roundedQuantity = this.applyRoundingRules(ing, constraints.roundingRules || [])

      return {
        ...ing,
        roundedQuantity,
        quantity: roundedQuantity
      }
    })
  }

  /**
   * @param {ScaledIngredient} ingredient
   * @param {RoundingRule[]} rules
   * @returns {number}
   */
  applyRoundingRules(ingredient, rules) {
    let applicableRule

    for (const rule of rules) {
      const matchesPattern = !rule.ingredientPattern || (ingredient.name || '').toLowerCase().includes(rule.ingredientPattern.toLowerCase())
      if (matchesPattern && ingredient.scaledQuantity >= rule.minQuantity) {
        applicableRule = rule
        break
      }
    }

    if (!applicableRule) {
      applicableRule = rules.find(rule => !rule.ingredientPattern && ingredient.scaledQuantity >= rule.minQuantity)
    }

    if (applicableRule) {
      const rounded = Math.round(ingredient.scaledQuantity / applicableRule.roundToNearest) * applicableRule.roundToNearest
      return Math.max(rounded, applicableRule.roundToNearest)
    }

    if (ingredient.scaledQuantity < 1) {
      return Math.round(ingredient.scaledQuantity * 100) / 100
    }

    if (ingredient.scaledQuantity < 10) {
      return Math.round(ingredient.scaledQuantity * 10) / 10
    }

    return Math.round(ingredient.scaledQuantity)
  }

  /**
   * @param {Formulation} formulation
   * @param {BOM|undefined} bom
   * @param {LossModel[]} lossModels
   * @param {number} targetYieldPercentage
   * @returns {YieldChainStep[]}
   */
  computeYieldChain(formulation, bom, lossModels, targetYieldPercentage) {
    const chain = []
    const totalInput = (formulation.ingredients || []).reduce((sum, ing) => sum + (ing.quantity || 0), 0)

    let currentQuantity = totalInput
    let cumulativeYield = 100

    chain.push({
      stepName: 'Initial Input',
      stepIndex: 0,
      inputQuantity: 0,
      outputQuantity: totalInput,
      lossQuantity: 0,
      lossPercentage: 0,
      yieldPercentage: 100,
      cumulativeYield: 100,
      lossType: 'none'
    })

    if (bom && Array.isArray(bom.process)) {
      bom.process.forEach((step, idx) => {
        const stepLossModel = lossModels.find(lm => lm.stepName.toLowerCase() === (step.name || '').toLowerCase())

        const lossPercentage = stepLossModel?.lossPercentage || (step.yields ? ((step.yields.input - step.yields.output) / step.yields.input) * 100 : 0)

        const lossQuantity = currentQuantity * (lossPercentage / 100)
        const outputQuantity = currentQuantity - lossQuantity
        const yieldPercentage = currentQuantity === 0 ? 0 : (outputQuantity / currentQuantity) * 100
        cumulativeYield *= currentQuantity === 0 ? 1 : (yieldPercentage / 100)

        chain.push({
          stepName: step.name,
          stepIndex: idx + 1,
          inputQuantity: currentQuantity,
          outputQuantity,
          lossQuantity,
          lossPercentage,
          yieldPercentage,
          cumulativeYield,
          lossType: stepLossModel?.lossType || 'process'
        })

        currentQuantity = outputQuantity
      })
    }

    const additionalLosses = lossModels.filter(loss => {
      if (!bom || !Array.isArray(bom.process)) {
        return true
      }
      return !bom.process.some(step => step.name?.toLowerCase?.() === loss.stepName.toLowerCase())
    })

    additionalLosses.forEach((loss, idx) => {
      const lossQuantity = currentQuantity * (loss.lossPercentage / 100)
      const outputQuantity = currentQuantity - lossQuantity
      const yieldPercentage = currentQuantity === 0 ? 0 : (outputQuantity / currentQuantity) * 100
      cumulativeYield *= currentQuantity === 0 ? 1 : (yieldPercentage / 100)

      chain.push({
        stepName: loss.stepName,
        stepIndex: (bom?.process?.length || 0) + idx + 1,
        inputQuantity: currentQuantity,
        outputQuantity,
        lossQuantity,
        lossPercentage: loss.lossPercentage,
        yieldPercentage,
        cumulativeYield,
        lossType: loss.lossType
      })

      currentQuantity = outputQuantity
    })

    if (targetYieldPercentage < 100 && targetYieldPercentage !== cumulativeYield) {
      const targetAdjustmentLoss = 100 - targetYieldPercentage
      const adjustmentQuantity = totalInput * (targetAdjustmentLoss / 100)

      chain.push({
        stepName: 'Target Yield Adjustment',
        stepIndex: chain.length,
        inputQuantity: totalInput,
        outputQuantity: totalInput * (targetYieldPercentage / 100),
        lossQuantity: adjustmentQuantity,
        lossPercentage: targetAdjustmentLoss,
        yieldPercentage: targetYieldPercentage,
        cumulativeYield: targetYieldPercentage,
        lossType: 'adjustment'
      })
    }

    return chain
  }

  /**
   * @param {YieldChainStep[]} yieldChain
   * @param {Formulation} formulation
   * @param {BOM} [bom]
   * @returns {import('./byproduct.js').Byproduct[]}
   */
  calculateByproductsFromChain(yieldChain, formulation, bom) {
    const byproducts = []

    yieldChain.forEach((step, idx) => {
      if (step.lossQuantity > 0 && step.stepName !== 'Initial Input') {
        byproducts.push({
          id: `byproduct-${idx}`,
          name: `${step.stepName} Loss`,
          quantity: step.lossQuantity,
          unit: formulation.yieldUnit,
          source: step.stepName,
          category: this.categorizeByproductType(step.lossType),
          recoveryMethod: this.suggestRecoveryMethod(step.lossType, step.stepName)
        })
      }
    })

    if (bom) {
      const bomByproducts = calculateByproducts(formulation, bom.process || [])
      byproducts.push(...bomByproducts.byproducts)
    }

    return byproducts
  }

  /**
   * @param {string} lossType
   * @returns {'waste'|'recyclable'|'saleable'|'hazardous'}
   */
  categorizeByproductType(lossType) {
    switch (lossType) {
      case 'evaporation':
      case 'moisture':
        return 'waste'
      case 'process':
      case 'transfer':
        return 'recyclable'
      case 'waste':
        return 'waste'
      default:
        return 'waste'
    }
  }

  /**
   * @param {string} lossType
   * @param {string} stepName
   * @returns {string|undefined}
   */
  suggestRecoveryMethod(lossType, stepName) {
    const stepNameLower = (stepName || '').toLowerCase()
    if (lossType === 'evaporation') {
      return 'Condenser recovery system'
    }
    if (lossType === 'process' && stepNameLower.includes('filter')) {
      return 'Composting or secondary extraction'
    }
    if (lossType === 'transfer') {
      return 'Equipment optimization and line flushing'
    }
    return undefined
  }

  /**
   * @param {ScaledIngredient[]} ingredients
   * @returns {NutrientProfile}
   */
  aggregateNutrition(ingredients) {
    const aggregated = {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      vitamins: {},
      minerals: {}
    }

    let totalQuantity = 0

    ingredients.forEach(ing => {
      if (ing.nutrients) {
        const scaleFactor = ing.roundedQuantity / 100
        const nutrients = ing.nutrients

        aggregated.calories += (nutrients.calories || 0) * scaleFactor
        aggregated.protein += (nutrients.protein || 0) * scaleFactor
        aggregated.carbohydrates += (nutrients.carbohydrates || 0) * scaleFactor
        aggregated.fat += (nutrients.fat || 0) * scaleFactor
        aggregated.fiber += (nutrients.fiber || 0) * scaleFactor
        aggregated.sugar += (nutrients.sugar || 0) * scaleFactor
        aggregated.sodium += (nutrients.sodium || 0) * scaleFactor

        if (nutrients.vitamins) {
          Object.entries(nutrients.vitamins).forEach(([vitamin, value]) => {
            aggregated.vitamins[vitamin] = (aggregated.vitamins[vitamin] || 0) + value * scaleFactor
          })
        }

        if (nutrients.minerals) {
          Object.entries(nutrients.minerals).forEach(([mineral, value]) => {
            aggregated.minerals[mineral] = (aggregated.minerals[mineral] || 0) + value * scaleFactor
          })
        }
      }

      totalQuantity += ing.roundedQuantity
    })

    if (totalQuantity > 100 && totalQuantity !== 0) {
      const normalizationFactor = 100 / totalQuantity

      aggregated.calories *= normalizationFactor
      aggregated.protein *= normalizationFactor
      aggregated.carbohydrates *= normalizationFactor
      aggregated.fat *= normalizationFactor
      aggregated.fiber *= normalizationFactor
      aggregated.sugar *= normalizationFactor
      aggregated.sodium *= normalizationFactor

      Object.keys(aggregated.vitamins).forEach(vitamin => {
        aggregated.vitamins[vitamin] *= normalizationFactor
      })

      Object.keys(aggregated.minerals).forEach(mineral => {
        aggregated.minerals[mineral] *= normalizationFactor
      })
    }

    return aggregated
  }

  /**
   * @param {ScaledIngredient[]} ingredients
   * @param {Formulation} formulation
   * @param {BOM} [bom]
   * @param {CostParameters} [costParameters]
   * @param {import('./byproduct.js').Byproduct[]} byproducts
   * @returns {CostRollup}
   */
  calculateCostRollup(ingredients, formulation, bom, costParameters, byproducts) {
    const tempFormulation = {
      ...formulation,
      ingredients: ingredients.map(ing => ({
        ...ing,
        quantity: ing.roundedQuantity
      }))
    }

    const costResult = calculateCost({
      formulation: tempFormulation,
      bom,
      parameters: costParameters || {}
    })

    const byproductValue = byproducts.reduce((sum, bp) => sum + (bp.value || 0), 0)
    const netCost = costResult.totalCost - byproductValue

    return {
      totalCost: costResult.totalCost,
      costPerUnit: costResult.costPerUnit,
      costPerBatch: costResult.totalCost,
      breakdown: costResult.breakdown,
      byproductValue,
      netCost
    }
  }

  /**
   * @param {number} yieldPercentage
   * @param {number} costPerUnit
   * @param {number} warningCount
   * @returns {number}
   */
  calculateEfficiencyScore(yieldPercentage, costPerUnit, warningCount) {
    const yieldScore = yieldPercentage / 100
    const costScore = Math.min(1, 1 / (costPerUnit + 1))
    const warningPenalty = Math.max(0, 1 - warningCount * 0.1)

    return Math.round((yieldScore * 0.5 + costScore * 0.3 + warningPenalty * 0.2) * 100)
  }

  /**
   * @returns {DensityMap}
   */
  getDefaultDensityMap() {
    return {
      water: { density: 1.0, unit: 'kg/L' },
      sugar: { density: 1.59, unit: 'kg/L' },
      salt: { density: 2.16, unit: 'kg/L' },
      flour: { density: 0.593, unit: 'kg/L' },
      milk: { density: 1.03, unit: 'kg/L' },
      oil: { density: 0.92, unit: 'kg/L' },
      honey: { density: 1.42, unit: 'kg/L' },
      'corn syrup': { density: 1.37, unit: 'kg/L' },
      'citric acid': { density: 1.54, unit: 'kg/L' },
      'vanilla extract': { density: 0.88, unit: 'kg/L' },
      butter: { density: 0.911, unit: 'kg/L' },
      cream: { density: 1.01, unit: 'kg/L' }
    }
  }

  /**
   * @returns {PlantConstraints}
   */
  getDefaultPlantConstraints() {
    return {
      roundingRules: [
        { minQuantity: 100, roundToNearest: 10, unit: 'kg' },
        { minQuantity: 10, roundToNearest: 1, unit: 'kg' },
        { minQuantity: 1, roundToNearest: 0.1, unit: 'kg' },
        { minQuantity: 0.1, roundToNearest: 0.01, unit: 'kg' },
        { minQuantity: 100, roundToNearest: 10, unit: 'L' },
        { minQuantity: 10, roundToNearest: 1, unit: 'L' },
        { minQuantity: 1, roundToNearest: 0.1, unit: 'L' }
      ],
      minBatchSize: 10,
      maxBatchSize: 10000
    }
  }

  /**
   * @param {string} materialName
   * @param {MaterialDensity} density
   */
  setDensity(materialName, density) {
    this.densityMap[materialName.toLowerCase()] = density
  }

  /**
   * @param {PlantConstraints} constraints
   */
  setPlantConstraints(constraints) {
    this.plantConstraints = constraints
  }

  /**
   * @param {string} materialName
   * @returns {MaterialDensity|undefined}
   */
  getDensity(materialName) {
    return this.densityMap[materialName.toLowerCase()]
  }
}

/**
 * @param {DensityMap} [densityMap]
 * @param {PlantConstraints} [plantConstraints]
 * @returns {CalculationEngine}
 */
export function createCalculationEngine(densityMap, plantConstraints) {
  return new CalculationEngine(densityMap, plantConstraints)
}

/**
 * @param {CalculationEngine} engine
 * @param {CalculationEngineRequest[]} requests
 * @returns {CalculationEngineResult[]}
 */
export function batchCalculate(engine, requests) {
  return (requests || []).map(req => engine.calculate(req))
}

/**
 * @typedef {Object} CalculationComparison
 * @property {CalculationEngineResult|null} mostEfficient
 * @property {CalculationEngineResult|null} leastEfficient
 * @property {number} averageEfficiency
 * @property {{min: number, max: number}} totalCostRange
 * @property {{min: number, max: number}} yieldRange
 */

/**
 * @param {CalculationEngineResult[]} results
 * @returns {CalculationComparison}
 */
export function compareCalculations(results) {
  if (!results || results.length === 0) {
    return {
      mostEfficient: null,
      leastEfficient: null,
      averageEfficiency: 0,
      totalCostRange: { min: 0, max: 0 },
      yieldRange: { min: 0, max: 0 }
    }
  }

  const sorted = [...results].sort((a, b) => b.metadata.efficiencyScore - a.metadata.efficiencyScore)

  const efficiencies = results.map(r => r.metadata.efficiencyScore)
  const averageEfficiency = efficiencies.reduce((sum, value) => sum + value, 0) / efficiencies.length

  const costs = results.map(r => r.costRollup.totalCost)
  const yields = results.map(r => r.metadata.actualYieldPercentage)

  return {
    mostEfficient: sorted[0],
    leastEfficient: sorted[sorted.length - 1],
    averageEfficiency,
    totalCostRange: {
      min: Math.min(...costs),
      max: Math.max(...costs)
    },
    yieldRange: {
      min: Math.min(...yields),
      max: Math.max(...yields)
    }
  }
}
