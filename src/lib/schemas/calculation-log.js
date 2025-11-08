/**
 * @typedef {import('./calculation-log').CalculationLog} CalculationLog
 * @typedef {import('./calculation-log').CalculationInput} CalculationInput
 * @typedef {import('./calculation-log').ValidationResult} ValidationResult
 */

/** @type {readonly ['scale','yield','cost','nutrition','manufacturing_derive','sales_order_derive']} */
export const CALCULATION_TYPES = ['scale','yield','cost','nutrition','manufacturing_derive','sales_order_derive']

/** @type {readonly ['formulation','bom','master_recipe','manufacturing_recipe','sales_order']} */
export const ENTITY_TYPES = ['formulation','bom','master_recipe','manufacturing_recipe','sales_order']

/** @type {readonly ['success','warning','error']} */
export const CALCULATION_STATUSES = ['success','warning','error']

/** @type {readonly ['info','warning','error']} */
export const VALIDATION_SEVERITIES = ['info','warning','error']

/**
 * Construct a new calculation log populated with sensible defaults.
 * @param {typeof CALCULATION_TYPES[number]} type
 * @param {typeof ENTITY_TYPES[number]} entityType
 * @param {string} entityId
 * @param {string} entityName
 * @param {string} userId
 * @param {string} userName
 * @returns {CalculationLog}
 */
export function createCalculationLog(type, entityType, entityId, entityName, userId, userName) {
  const startTime = new Date()
  return {
    id: `calc-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
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
      startTime,
      endTime: startTime,
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
    createdAt: startTime
  }
}

/**
 * Run a lightweight validation on calculation inputs according to their type.
 * @param {typeof CALCULATION_TYPES[number]} type
 * @param {CalculationInput} input
 * @returns {ValidationResult[]}
 */
export function validateCalculationInput(type, input) {
  const results = []
  if (!input || typeof input !== 'object') {
    return [{
      rule: 'input_required',
      field: 'baseValues',
      severity: 'error',
      message: 'Calculation input is required',
      passed: false
    }]
  }

  switch (type) {
    case 'scale': {
      const baseValues = input.baseValues || {}
      const sourceQuantity = Number(baseValues.sourceQuantity)
      const targetQuantity = Number(baseValues.targetQuantity)

      if (!(sourceQuantity > 0)) {
        results.push({
          rule: 'positive_source_quantity',
          field: 'sourceQuantity',
          severity: 'error',
          message: 'Source quantity must be positive',
          actualValue: baseValues.sourceQuantity,
          passed: false
        })
      }

      if (!(targetQuantity > 0)) {
        results.push({
          rule: 'positive_target_quantity',
          field: 'targetQuantity',
          severity: 'error',
          message: 'Target quantity must be positive',
          actualValue: baseValues.targetQuantity,
          passed: false
        })
      }
      break
    }

    case 'yield': {
      const baseValues = input.baseValues || {}
      const inputQuantity = Number(baseValues.inputQuantity)

      if (!(inputQuantity > 0)) {
        results.push({
          rule: 'positive_input_quantity',
          field: 'inputQuantity',
          severity: 'error',
          message: 'Input quantity must be positive',
          actualValue: baseValues.inputQuantity,
          passed: false
        })
      }
      break
    }

    case 'cost': {
      const baseValues = input.baseValues || {}
      const materials = Array.isArray(baseValues.materials) ? baseValues.materials : []

      if (materials.length === 0) {
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

    default:
      break
  }

  return results
}
