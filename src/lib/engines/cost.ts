import { Formulation, Ingredient } from '@/lib/schemas/formulation'
import { BOM, BOMComponent } from '@/lib/schemas/bom'

export interface CostCalculationRequest {
  formulation: Formulation
  bom?: BOM
  parameters: CostParameters
}

export interface CostParameters {
  overheadRate?: number
  laborCostPerHour?: number
  energyCostPerUnit?: number
  packagingCost?: number
  shippingCost?: number
  markupPercentage?: number
}

export interface CostResult {
  totalCost: number
  costPerUnit: number
  breakdown: CostBreakdown
  profitability: ProfitabilityMetrics
  warnings: string[]
}

export interface CostBreakdown {
  rawMaterials: number
  labor: number
  overhead: number
  packaging: number
  energy: number
  shipping: number
  other: number
}

export interface ProfitabilityMetrics {
  grossMargin: number
  contributionMargin: number
  breakEvenVolume?: number
  targetPrice?: number
}

export function calculateCost(request: CostCalculationRequest): CostResult {
  const { formulation, bom, parameters } = request
  
  const rawMaterialsCost = calculateRawMaterialsCost(formulation.ingredients)
  
  const laborCost = bom 
    ? calculateLaborCost(bom, parameters.laborCostPerHour || 0)
    : 0
  
  const overheadCost = rawMaterialsCost * (parameters.overheadRate || 0) / 100
  const packagingCost = parameters.packagingCost || 0
  const energyCost = parameters.energyCostPerUnit || 0
  const shippingCost = parameters.shippingCost || 0
  
  const breakdown: CostBreakdown = {
    rawMaterials: rawMaterialsCost,
    labor: laborCost,
    overhead: overheadCost,
    packaging: packagingCost,
    energy: energyCost,
    shipping: shippingCost,
    other: 0
  }
  
  const totalCost = Object.values(breakdown).reduce((sum, cost) => sum + cost, 0)
  const costPerUnit = totalCost / formulation.targetYield
  
  const markupPercentage = parameters.markupPercentage || 0
  const targetPrice = costPerUnit * (1 + markupPercentage / 100)
  
  const profitability: ProfitabilityMetrics = {
    grossMargin: ((targetPrice - costPerUnit) / targetPrice) * 100,
    contributionMargin: targetPrice - costPerUnit,
    targetPrice,
    breakEvenVolume: breakdown.overhead > 0 ? breakdown.overhead / (targetPrice - costPerUnit) : undefined
  }
  
  const warnings: string[] = []
  
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

export function calculateRawMaterialsCost(ingredients: Ingredient[]): number {
  return ingredients.reduce((sum, ing) => {
    const cost = ing.cost || 0
    return sum + (ing.quantity * cost)
  }, 0)
}

export function calculateLaborCost(bom: BOM, laborCostPerHour: number): number {
  const totalHours = bom.process.reduce((sum, step) => {
    const hours = step.durationUnit === 'hours' ? step.duration :
                  step.durationUnit === 'days' ? step.duration * 8 :
                  step.duration / 60
    return sum + hours
  }, 0)
  
  return totalHours * laborCostPerHour
}

export function compareCosts(results: CostResult[]): CostComparison {
  if (results.length === 0) {
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

export interface CostComparison {
  lowest: CostResult | null
  highest: CostResult | null
  average: number
}

export function optimizeCost(
  formulation: Formulation,
  targetCost: number,
  constraints?: CostOptimizationConstraints
): Ingredient[] {
  const currentCost = calculateRawMaterialsCost(formulation.ingredients)
  
  if (currentCost <= targetCost) {
    return formulation.ingredients
  }
  
  const reductionNeeded = (currentCost - targetCost) / currentCost
  
  return formulation.ingredients.map(ing => {
    const canReduce = !constraints?.fixedIngredients?.includes(ing.id)
    
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
      percentage: (reducedQuantity / formulation.targetYield) * 100
    }
  })
}

export interface CostOptimizationConstraints {
  fixedIngredients?: string[]
  minPercentages?: Record<string, number>
  maxCostPerIngredient?: Record<string, number>
}
