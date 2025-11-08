import type { Formulation } from '@/lib/schemas/formulation'

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

export * from './scaling.js'
