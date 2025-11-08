import type { Formulation, Ingredient, NutrientProfile } from '@/lib/schemas/formulation'
import type { BOM } from '@/lib/schemas/bom'
import type { CostParameters, CostBreakdown } from './cost'
import type { Byproduct } from './byproduct'

export interface CalculationEngineRequest {
	formulation: Formulation
	bom?: BOM
	targetBatchSize: number
	targetUnit: string
	yieldPercentage: number
	lossModels?: LossModel[]
	densityMap?: DensityMap
	plantConstraints?: PlantConstraints
	costParameters?: CostParameters
}

export interface LossModel {
	stepName: string
	lossType: 'process' | 'evaporation' | 'moisture' | 'waste' | 'transfer'
	lossPercentage: number
	description?: string
}

export interface DensityMap {
	[materialName: string]: MaterialDensity
}

export interface MaterialDensity {
	density: number
	unit: 'kg/L' | 'g/mL' | 'lb/gal'
	temperature?: number
	conditions?: string
}

export interface PlantConstraints {
	roundingRules: RoundingRule[]
	minBatchSize?: number
	maxBatchSize?: number
	equipmentCapacity?: Record<string, number>
	processingTime?: Record<string, number>
}

export interface RoundingRule {
	ingredientPattern?: string
	minQuantity: number
	roundToNearest: number
	unit: string
}

export interface CalculationEngineResult {
	scaledIngredients: ScaledIngredient[]
	byproducts: Byproduct[]
	aggregatedNutrition: NutrientProfile
	costRollup: CostRollup
	yieldChain: YieldChainStep[]
	totalOutput: number
	outputUnit: string
	warnings: string[]
	metadata: CalculationMetadata
}

export interface ScaledIngredient extends Ingredient {
	originalQuantity: number
	scaledQuantity: number
	roundedQuantity: number
	volumeEquivalent?: number
	densityUsed?: number
	scaleFactor: number
}

export interface CostRollup {
	totalCost: number
	costPerUnit: number
	costPerBatch: number
	breakdown: CostBreakdown
	byproductValue: number
	netCost: number
}

export interface YieldChainStep {
	stepName: string
	stepIndex: number
	inputQuantity: number
	outputQuantity: number
	lossQuantity: number
	lossPercentage: number
	yieldPercentage: number
	cumulativeYield: number
	lossType: string
}

export interface CalculationMetadata {
	calculatedAt: Date
	baseYield: number
	targetYield: number
	scaleFactor: number
	actualYieldPercentage: number
	efficiencyScore: number
}

export declare class CalculationEngine {
	private densityMap: DensityMap
	private plantConstraints: PlantConstraints

	constructor(densityMap?: DensityMap, plantConstraints?: PlantConstraints)

	calculate(request: CalculationEngineRequest): CalculationEngineResult

	setDensity(materialName: string, density: MaterialDensity): void
	setPlantConstraints(constraints: PlantConstraints): void
	getDensity(materialName: string): MaterialDensity | undefined
}

export declare function createCalculationEngine(
	densityMap?: DensityMap,
	plantConstraints?: PlantConstraints
): CalculationEngine

export declare function batchCalculate(
	engine: CalculationEngine,
	requests: CalculationEngineRequest[]
): CalculationEngineResult[]

export interface CalculationComparison {
	mostEfficient: CalculationEngineResult | null
	leastEfficient: CalculationEngineResult | null
	averageEfficiency: number
	totalCostRange: { min: number; max: number }
	yieldRange: { min: number; max: number }
}

export declare function compareCalculations(
	results: CalculationEngineResult[]
): CalculationComparison

export * from './calculationEngine.js'
