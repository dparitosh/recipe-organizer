import { Formulation, Ingredient } from '@/lib/schemas/formulation'
import { BOM, ProcessStep } from '@/lib/schemas/bom'

export interface YieldCalculationRequest {
  formulation: Formulation
  bom?: BOM
  parameters: YieldParameters
}

export interface YieldParameters {
  processLoss?: number
  moistureContent?: number
  evaporationRate?: number
  wasteFactor?: number
}

export interface YieldResult {
  theoreticalYield: number
  actualYield: number
  yieldPercentage: number
  lossBreakdown: LossBreakdown
  unit: string
  warnings: string[]
}

export interface LossBreakdown {
  processLoss: number
  moistureLoss: number
  evaporationLoss: number
  waste: number
  total: number
}

export function calculateYield(request: YieldCalculationRequest): YieldResult {
  const { formulation, bom, parameters } = request
  
  const totalMass = formulation.ingredients.reduce((sum, ing) => sum + ing.quantity, 0)
  
  const processLoss = (parameters.processLoss || 0) / 100
  const moistureLoss = (parameters.moistureContent || 0) / 100
  const evaporationLoss = (parameters.evaporationRate || 0) / 100
  const wasteFactor = (parameters.wasteFactor || 0) / 100
  
  const losses: LossBreakdown = {
    processLoss: totalMass * processLoss,
    moistureLoss: totalMass * moistureLoss,
    evaporationLoss: totalMass * evaporationLoss,
    waste: totalMass * wasteFactor,
    total: 0
  }
  
  losses.total = losses.processLoss + losses.moistureLoss + losses.evaporationLoss + losses.waste
  
  const theoreticalYield = formulation.targetYield
  const actualYield = totalMass - losses.total
  const yieldPercentage = (actualYield / totalMass) * 100
  
  const warnings: string[] = []
  
  if (yieldPercentage < 80) {
    warnings.push('Yield is below 80% - consider reviewing process efficiency')
  }
  
  if (losses.total > totalMass * 0.25) {
    warnings.push('Total losses exceed 25% - high waste detected')
  }
  
  if (bom) {
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

export function calculateProcessYield(steps: ProcessStep[], inputMass: number): number {
  let currentMass = inputMass
  
  for (const step of steps) {
    if (step.yields) {
      const yieldFactor = step.yields.output / step.yields.input
      currentMass = currentMass * yieldFactor
    }
  }
  
  return currentMass
}

export function optimizeYield(formulation: Formulation, targetYield: number): Ingredient[] {
  const currentTotal = formulation.ingredients.reduce((sum, ing) => sum + ing.quantity, 0)
  const scaleFactor = targetYield / currentTotal
  
  return formulation.ingredients.map(ing => ({
    ...ing,
    quantity: ing.quantity * scaleFactor
  }))
}

export function compareYields(results: YieldResult[]): YieldComparison {
  if (results.length === 0) {
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

export interface YieldComparison {
  best: YieldResult | null
  worst: YieldResult | null
  average: number
  variance: number
}
