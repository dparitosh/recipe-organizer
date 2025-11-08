export interface CalculationLog {
  id: string
  calculationType: 'scale' | 'yield' | 'cost' | 'nutrition' | 'manufacturing_derive' | 'sales_order_derive'
  entityType: 'formulation' | 'bom' | 'master_recipe' | 'manufacturing_recipe' | 'sales_order'
  entityId: string
  entityName: string
  inputParameters: CalculationInput
  outputResults: CalculationOutput
  validationResults: ValidationResult[]
  executionMetrics: ExecutionMetrics
  status: 'success' | 'warning' | 'error'
  metadata: CalculationMetadata
  createdAt: Date
}

export interface CalculationInput {
  baseValues: Record<string, any>
  constraints: Record<string, any>
  rules: Record<string, any>
  options: Record<string, any>
}

export interface CalculationOutput {
  results: Record<string, any>
  intermediateSteps: CalculationStep[]
  summary: ResultSummary
}

export interface CalculationStep {
  stepNumber: number
  operation: string
  input: Record<string, any>
  output: Record<string, any>
  duration: number
  notes?: string
}

export interface ResultSummary {
  totalItems: number
  successCount: number
  warningCount: number
  errorCount: number
  overallScore?: number
  keyMetrics: Record<string, number>
}

export interface ValidationResult {
  rule: string
  field: string
  severity: 'info' | 'warning' | 'error'
  message: string
  actualValue?: any
  expectedValue?: any
  passed: boolean
}

export interface ExecutionMetrics {
  startTime: Date
  endTime: Date
  durationMs: number
  cpuTime?: number
  memoryUsed?: number
  operationsPerformed: number
  cacheHits?: number
  cacheMisses?: number
}

export interface CalculationMetadata {
  userId: string
  userName: string
  sessionId?: string
  triggerSource: 'manual' | 'automated' | 'scheduled' | 'api'
  environment: 'development' | 'test' | 'production'
  version: string
  tags: string[]
  notes?: string
}

export interface ScaleCalculationInput extends CalculationInput {
  baseValues: {
    sourceQuantity: number
    sourceUnit: string
    targetQuantity: number
    targetUnit: string
    ingredients: Array<{
      id: string
      quantity: number
      unit: string
      density?: number
    }>
  }
  constraints: {
    roundingRules: RoundingRule[]
    minBatchSize?: number
    maxBatchSize?: number
    equipmentConstraints?: EquipmentConstraint[]
  }
}

export interface RoundingRule {
  pattern: string
  thresholds: Array<{
    min: number
    max: number
    precision: number
  }>
  method: 'round' | 'ceil' | 'floor' | 'nearest_standard'
}

export interface EquipmentConstraint {
  equipmentType: string
  minCapacity: number
  maxCapacity: number
  unit: string
  availableUnits: number
}

export interface YieldCalculationInput extends CalculationInput {
  baseValues: {
    inputQuantity: number
    processSteps: Array<{
      stepName: string
      lossType: string
      lossPercentage: number
    }>
  }
  constraints: {
    acceptableYieldMin: number
    acceptableYieldMax: number
    warningThreshold: number
  }
}

export interface CostCalculationInput extends CalculationInput {
  baseValues: {
    materials: Array<{
      materialId: string
      quantity: number
      unit: string
      unitCost: number
    }>
    labor: {
      hours: number
      rate: number
    }
    overhead: {
      rate: number
      basis: 'labor' | 'material' | 'fixed'
    }
    utilities?: {
      type: string
      quantity: number
      cost: number
    }[]
  }
  constraints: {
    currency: string
    costingDate: Date
    includeScrap: boolean
    byproductRecovery?: number
  }
}

export interface NutritionCalculationInput extends CalculationInput {
  baseValues: {
    ingredients: Array<{
      ingredientId: string
      quantity: number
      unit: string
      nutrients: Record<string, number>
    }>
    servingSize: number
    servingUnit: string
  }
  constraints: {
    normalizeTo: number
    roundingDecimals: number
    includeTrace: boolean
  }
}

export declare const CALCULATION_TYPES: readonly ['scale', 'yield', 'cost', 'nutrition', 'manufacturing_derive', 'sales_order_derive']
export declare const ENTITY_TYPES: readonly ['formulation', 'bom', 'master_recipe', 'manufacturing_recipe', 'sales_order']
export declare const CALCULATION_STATUSES: readonly ['success', 'warning', 'error']
export declare const VALIDATION_SEVERITIES: readonly ['info', 'warning', 'error']

export declare function createCalculationLog(
  type: typeof CALCULATION_TYPES[number],
  entityType: typeof ENTITY_TYPES[number],
  entityId: string,
  entityName: string,
  userId: string,
  userName: string
): CalculationLog

export declare function validateCalculationInput(
  type: typeof CALCULATION_TYPES[number],
  input: CalculationInput
): ValidationResult[]

export * from './calculation-log.js'
