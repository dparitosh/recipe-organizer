import type { Formulation } from '@/lib/schemas/formulation'
import type { BOM } from '@/lib/schemas/bom'

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

export interface CostComparison {
	lowest: CostResult | null
	highest: CostResult | null
	average: number
}

export interface CostOptimizationConstraints {
	fixedIngredients?: string[]
	minPercentages?: Record<string, number>
	maxCostPerIngredient?: Record<string, number>
}

export * from './cost.js'
