import { Formulation, Ingredient } from '@/lib/schemas/formulation'
import { ProcessStep } from '@/lib/schemas/bom'

export interface Byproduct {
  id: string
  name: string
  quantity: number
  unit: string
  source: string
  category: 'waste' | 'recyclable' | 'saleable' | 'hazardous'
  value?: number
  disposalCost?: number
  recoveryMethod?: string
}

export interface ByproductAnalysis {
  byproducts: Byproduct[]
  totalWaste: number
  totalValue: number
  totalDisposalCost: number
  wastePercentage: number
  recommendations: string[]
}

export function calculateByproducts(
  formulation: Formulation,
  processSteps: ProcessStep[]
): ByproductAnalysis {
  const byproducts: Byproduct[] = []
  const totalInput = formulation.ingredients.reduce((sum, ing) => sum + ing.quantity, 0)
  
  processSteps.forEach((step, idx) => {
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
  
  formulation.ingredients.forEach(ing => {
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
  const wastePercentage = (totalWaste / totalInput) * 100
  
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

function categorizeByproduct(step: ProcessStep): Byproduct['category'] {
  const name = step.name.toLowerCase()
  
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

function suggestRecoveryMethod(step: ProcessStep): string | undefined {
  const name = step.name.toLowerCase()
  
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

function generateRecommendations(byproducts: Byproduct[], wastePercentage: number): string[] {
  const recommendations: string[] = []
  
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

export function optimizeByproductRecovery(byproducts: Byproduct[]): ByproductOptimization {
  const optimizations: OptimizationOpportunity[] = []
  
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
    estimatedROI: totalPotentialValue > 0 ? totalPotentialValue / byproducts.length : 0
  }
}

export interface ByproductOptimization {
  opportunities: OptimizationOpportunity[]
  totalPotentialValue: number
  estimatedROI: number
}

export interface OptimizationOpportunity {
  byproductId: string
  opportunity: string
  potentialValue: number
  implementation: string
  priority: 'high' | 'medium' | 'low'
}

export function trackByproductTrends(
  historicalData: ByproductAnalysis[],
  timeframe: 'weekly' | 'monthly' | 'yearly'
): ByproductTrend {
  if (historicalData.length < 2) {
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
  const changePercentage = ((lastValue - firstValue) / firstValue) * 100
  
  const trend: ByproductTrend['trend'] = 
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

export interface ByproductTrend {
  trend: 'increasing' | 'decreasing' | 'stable'
  averageWaste: number
  changePercentage: number
  projection: number
}
