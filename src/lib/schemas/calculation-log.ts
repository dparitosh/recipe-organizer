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

export const CALCULATION_TYPES = ['scale', 'yield', 'cost', 'nutrition', 'manufacturing_derive', 'sales_order_derive'] as const
export const ENTITY_TYPES = ['formulation', 'bom', 'master_recipe', 'manufacturing_recipe', 'sales_order'] as const
export const CALCULATION_STATUSES = ['success', 'warning', 'error'] as const
export const VALIDATION_SEVERITIES = ['info', 'warning', 'error'] as const

export function createCalculationLog(
  type: typeof CALCULATION_TYPES[number],
  entityType: typeof ENTITY_TYPES[number],
  entityId: string,
  entityName: string,
  userId: string,
  userName: string
): CalculationLog {
  return {
    id: `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    calculationType: type,
    entityType,
    entityId,
    entityName,
    inputParameters: {
      baseValues: {},
      constraints: {},
      rules: {},
      options: {}
    },
    outputResults: {
      results: {},
      intermediateSteps: [],
      summary: {
        totalItems: 0,
        successCount: 0,
        warningCount: 0,
        errorCount: 0,
        keyMetrics: {}
      }
    },
    validationResults: [],
    executionMetrics: {
      startTime: new Date(),
      endTime: new Date(),
      durationMs: 0,
      operationsPerformed: 0
    },
    status: 'success',
    metadata: {
      userId,
      userName,
      triggerSource: 'manual',
      environment: 'development',
      version: '1.0.0',
      tags: []
    },
    createdAt: new Date()
  }
}

export function validateCalculationInput(
  type: typeof CALCULATION_TYPES[number],
  input: CalculationInput
): ValidationResult[] {
  const results: ValidationResult[] = []

  switch (type) {
    case 'scale':
      const scaleInput = input as ScaleCalculationInput
      if (!scaleInput.baseValues.sourceQuantity || scaleInput.baseValues.sourceQuantity <= 0) {
        results.push({
          rule: 'positive_source_quantity',
          field: 'sourceQuantity',
          severity: 'error',
          message: 'Source quantity must be positive',
          actualValue: scaleInput.baseValues.sourceQuantity,
          passed: false
        })
      }
      if (!scaleInput.baseValues.targetQuantity || scaleInput.baseValues.targetQuantity <= 0) {
        results.push({
          rule: 'positive_target_quantity',
          field: 'targetQuantity',
          severity: 'error',
          message: 'Target quantity must be positive',
          actualValue: scaleInput.baseValues.targetQuantity,
          passed: false
        })
      }
      break

    case 'yield':
      const yieldInput = input as YieldCalculationInput
      if (!yieldInput.baseValues.inputQuantity || yieldInput.baseValues.inputQuantity <= 0) {
        results.push({
          rule: 'positive_input_quantity',
          field: 'inputQuantity',
          severity: 'error',
          message: 'Input quantity must be positive',
          actualValue: yieldInput.baseValues.inputQuantity,
          passed: false
        })
      }
      break

    case 'cost':
      const costInput = input as CostCalculationInput
      if (!costInput.baseValues.materials || costInput.baseValues.materials.length === 0) {
        results.push({
          rule: 'materials_required',
          field: 'materials',
          severity: 'error',
          message: 'At least one material is required',
          passed: false
        })
      }
      break
  }

  return results
}
