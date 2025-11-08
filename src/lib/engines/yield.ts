import type { Formulation } from '@/lib/schemas/formulation'
import type { BOM, ProcessStep } from '@/lib/schemas/bom'

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

export interface YieldComparison {
	best: YieldResult | null
	worst: YieldResult | null
	average: number
	variance: number
}

export * from './yield.js'
