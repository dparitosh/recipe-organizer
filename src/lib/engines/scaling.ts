import { Formulation, Ingredient } from '@/lib/schemas/formulation'

export interface ScalingRequest {
  formulation: Formulation
  targetQuantity: number
  targetUnit: string
  options?: ScalingOptions
}

export interface ScalingOptions {
  maintainRatios?: boolean
  roundToNearest?: number
  minQuantity?: number
  maxQuantity?: number
}

export interface ScalingResult {
  scaledFormulation: Formulation
  scaleFactor: number
  warnings: string[]
}

const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  kg: { kg: 1, g: 1000, lb: 2.20462, oz: 35.274 },
  g: { kg: 0.001, g: 1, lb: 0.00220462, oz: 0.035274 },
  lb: { kg: 0.453592, g: 453.592, lb: 1, oz: 16 },
  oz: { kg: 0.0283495, g: 28.3495, lb: 0.0625, oz: 1 },
  L: { L: 1, ml: 1000, gal: 0.264172, fl_oz: 33.814 },
  ml: { L: 0.001, ml: 1, gal: 0.000264172, fl_oz: 0.033814 }
}

export function scaleFormulation(request: ScalingRequest): ScalingResult {
  const { formulation, targetQuantity, targetUnit, options = {} } = request
  
  const currentUnit = formulation.yieldUnit
  let scaleFactor = targetQuantity / formulation.targetYield
  
  if (currentUnit !== targetUnit) {
    const conversionFactor = convertUnits(1, currentUnit, targetUnit)
    scaleFactor = (targetQuantity / (formulation.targetYield * conversionFactor))
  }
  
  const warnings: string[] = []
  
  if (scaleFactor < 0.1) {
    warnings.push('Scale factor very small (<0.1) - accuracy may be compromised')
  }
  
  if (scaleFactor > 100) {
    warnings.push('Scale factor very large (>100) - consider batch production')
  }
  
  const scaledIngredients = formulation.ingredients.map(ing => {
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
    
    return {
      ...ing,
      quantity: scaledQuantity
    }
  })
  
  if (options.maintainRatios) {
    const totalScaled = scaledIngredients.reduce((sum, ing) => sum + ing.quantity, 0)
    scaledIngredients.forEach(ing => {
      ing.percentage = (ing.quantity / totalScaled) * 100
    })
  }
  
  const scaledFormulation: Formulation = {
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

export function convertUnits(value: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return value
  
  const conversionTable = UNIT_CONVERSIONS[fromUnit]
  if (!conversionTable) {
    throw new Error(`Unknown unit: ${fromUnit}`)
  }
  
  const factor = conversionTable[toUnit]
  if (factor === undefined) {
    throw new Error(`Cannot convert ${fromUnit} to ${toUnit}`)
  }
  
  return value * factor
}

export function scaleToStandardBatch(formulation: Formulation, standardSizes: number[]): ScalingResult {
  const currentYield = formulation.targetYield
  
  const closestStandardSize = standardSizes.reduce((closest, size) => {
    return Math.abs(size - currentYield) < Math.abs(closest - currentYield) ? size : closest
  }, standardSizes[0])
  
  return scaleFormulation({
    formulation,
    targetQuantity: closestStandardSize,
    targetUnit: formulation.yieldUnit,
    options: { maintainRatios: true }
  })
}

export function calculateScaleFactorForIngredient(
  currentQuantity: number,
  targetQuantity: number
): number {
  if (currentQuantity === 0) return 1
  return targetQuantity / currentQuantity
}

export function batchScale(
  formulation: Formulation,
  numberOfBatches: number
): ScalingResult {
  return scaleFormulation({
    formulation,
    targetQuantity: formulation.targetYield * numberOfBatches,
    targetUnit: formulation.yieldUnit,
    options: { maintainRatios: true }
  })
}

export function findOptimalBatchSize(
  formulation: Formulation,
  minSize: number,
  maxSize: number,
  targetDemand: number
): number {
  const sizes: number[] = []
  
  for (let size = minSize; size <= maxSize; size += minSize) {
    const batchCount = Math.ceil(targetDemand / size)
    const waste = (batchCount * size) - targetDemand
    const efficiency = 1 - (waste / (batchCount * size))
    
    sizes.push(size)
    
    if (efficiency > 0.95) {
      return size
    }
  }
  
  return sizes[0]
}
