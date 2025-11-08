
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

export interface ByproductTrend {
	trend: 'increasing' | 'decreasing' | 'stable'
	averageWaste: number
	changePercentage: number
	projection: number
}

export * from './byproduct.js'
