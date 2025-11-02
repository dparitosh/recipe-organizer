export {
  CalculationEngine,
  createCalculationEngine,
  batchCalculate,
  compareCalculations,
  type CalculationEngineRequest,
  type CalculationEngineResult,
  type LossModel,
  type DensityMap,
  type MaterialDensity,
  type PlantConstraints,
  type RoundingRule,
  type ScaledIngredient,
  type CostRollup,
  type YieldChainStep,
  type CalculationMetadata,
  type CalculationComparison
} from './calculationEngine'

export {
  scaleFormulation,
  convertUnits,
  scaleToStandardBatch,
  calculateScaleFactorForIngredient,
  batchScale,
  findOptimalBatchSize,
  type ScalingRequest,
  type ScalingOptions,
  type ScalingResult
} from './scaling'

export {
  calculateYield,
  calculateProcessYield,
  optimizeYield,
  compareYields,
  type YieldCalculationRequest,
  type YieldParameters,
  type YieldResult,
  type LossBreakdown,
  type YieldComparison
} from './yield'

export {
  calculateCost,
  calculateRawMaterialsCost,
  calculateLaborCost,
  compareCosts,
  optimizeCost,
  type CostCalculationRequest,
  type CostParameters,
  type CostResult,
  type CostBreakdown,
  type ProfitabilityMetrics,
  type CostComparison,
  type CostOptimizationConstraints
} from './cost'

export {
  calculateByproducts,
  optimizeByproductRecovery,
  trackByproductTrends,
  type Byproduct,
  type ByproductAnalysis,
  type ByproductOptimization,
  type OptimizationOpportunity,
  type ByproductTrend
} from './byproduct'

export { runCalculationEngineExample, exampleUsage } from './calculationEngine.example'
