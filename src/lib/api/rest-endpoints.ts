import { Formulation, validateFormulation, Ingredient } from '@/lib/schemas/formulation'
import { MasterRecipe, validateMasterRecipe, RecipeIngredient, calculateRecipeYield } from '@/lib/schemas/master-recipe'
import { ManufacturingRecipe, validateManufacturingRecipe, createEmptyManufacturingRecipe } from '@/lib/schemas/manufacturing-recipe'
import { SalesOrder, validateSalesOrder, calculateOrderTotal, calculateFulfillmentProgress } from '@/lib/schemas/sales-order'
import { CalculationLog, createCalculationLog, validateCalculationInput, ScaleCalculationInput, YieldCalculationInput } from '@/lib/schemas/calculation-log'

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: APIError
  metadata?: ResponseMetadata
}

export interface APIError {
  code: string
  message: string
  details?: string[]
  field?: string
}

export interface ResponseMetadata {
  timestamp: Date
  executionTime: number
  version: string
  warnings?: string[]
}

export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

export class FormulationAPI {
  static async create(formulation: Formulation, userId: string): Promise<APIResponse<Formulation>> {
    const startTime = Date.now()
    
    const validationErrors = validateFormulation(formulation)
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Formulation validation failed',
          details: validationErrors
        },
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          version: '1.0.0'
        }
      }
    }

    formulation.createdAt = new Date()
    formulation.updatedAt = new Date()

    return {
      success: true,
      data: formulation,
      metadata: {
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
        version: '1.0.0'
      }
    }
  }

  static async scale(
    formulationId: string,
    targetQuantity: number,
    targetUnit: string,
    userId: string,
    userName: string
  ): Promise<APIResponse<{ scaledFormulation: Formulation; calculationLog: CalculationLog }>> {
    const startTime = Date.now()

    if (targetQuantity <= 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Target quantity must be positive',
          field: 'targetQuantity'
        },
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          version: '1.0.0'
        }
      }
    }

    const calcLog = createCalculationLog('scale', 'formulation', formulationId, 'Scaled Formulation', userId, userName)
    calcLog.inputParameters = {
      baseValues: {
        sourceQuantity: 100,
        sourceUnit: 'kg',
        targetQuantity,
        targetUnit,
        ingredients: []
      },
      constraints: {
        roundingRules: []
      },
      rules: {},
      options: {}
    }

    const validationResults = validateCalculationInput('scale', calcLog.inputParameters)
    calcLog.validationResults = validationResults

    if (validationResults.some(v => v.severity === 'error')) {
      calcLog.status = 'error'
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Scale calculation validation failed',
          details: validationResults.filter(v => v.severity === 'error').map(v => v.message)
        },
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          version: '1.0.0'
        }
      }
    }

    return {
      success: true,
      data: {
        scaledFormulation: {} as Formulation,
        calculationLog: calcLog
      },
      metadata: {
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
        version: '1.0.0'
      }
    }
  }

  static async validateYield(
    formulation: Formulation
  ): Promise<APIResponse<{ yieldPercentage: number; warnings: string[] }>> {
    const startTime = Date.now()
    const warnings: string[] = []

    const totalPercentage = formulation.ingredients.reduce((sum, ing) => sum + ing.percentage, 0)
    
    if (Math.abs(totalPercentage - 100) > 0.1) {
      warnings.push(`Total percentage is ${totalPercentage.toFixed(2)}%, expected 100%`)
    }

    formulation.ingredients.forEach(ing => {
      if (!ing.unit || ing.unit.trim() === '') {
        warnings.push(`Ingredient "${ing.name}" is missing unit of measure`)
      }
    })

    return {
      success: true,
      data: {
        yieldPercentage: totalPercentage,
        warnings
      },
      metadata: {
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
        version: '1.0.0',
        warnings: warnings.length > 0 ? warnings : undefined
      }
    }
  }
}

export class ManufacturingAPI {
  static async generate(
    masterRecipeId: string,
    batchSize: number,
    plant: string,
    userId: string,
    userName: string
  ): Promise<APIResponse<{ manufacturingRecipe: ManufacturingRecipe; calculationLog: CalculationLog }>> {
    const startTime = Date.now()

    if (batchSize <= 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_BATCH_SIZE',
          message: 'Batch size must be positive',
          field: 'batchSize'
        },
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          version: '1.0.0'
        }
      }
    }

    if (!plant || plant.trim() === '') {
      return {
        success: false,
        error: {
          code: 'MISSING_PLANT',
          message: 'Plant is required',
          field: 'plant'
        },
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          version: '1.0.0'
        }
      }
    }

    const mfgRecipe = createEmptyManufacturingRecipe(masterRecipeId, userId)
    mfgRecipe.plant = plant
    mfgRecipe.outputMaterial.plannedQuantity = batchSize

    const calcLog = createCalculationLog('manufacturing_derive', 'manufacturing_recipe', mfgRecipe.id, mfgRecipe.name, userId, userName)
    calcLog.inputParameters = {
      baseValues: {
        masterRecipeId,
        batchSize,
        plant
      },
      constraints: {},
      rules: {},
      options: {}
    }

    const validationErrors = validateManufacturingRecipe(mfgRecipe)
    if (validationErrors.length > 0) {
      calcLog.status = 'error'
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Manufacturing recipe validation failed',
          details: validationErrors
        },
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          version: '1.0.0'
        }
      }
    }

    calcLog.status = 'success'
    calcLog.executionMetrics.endTime = new Date()
    calcLog.executionMetrics.durationMs = Date.now() - startTime

    return {
      success: true,
      data: {
        manufacturingRecipe: mfgRecipe,
        calculationLog: calcLog
      },
      metadata: {
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
        version: '1.0.0'
      }
    }
  }

  static async calculateYield(
    manufacturingRecipeId: string,
    operations: Array<{ inputQty: number; outputQty: number; unit: string }>,
    userId: string,
    userName: string
  ): Promise<APIResponse<{ overallYield: number; stepYields: number[]; calculationLog: CalculationLog }>> {
    const startTime = Date.now()

    if (operations.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_OPERATIONS',
          message: 'At least one operation is required',
          field: 'operations'
        },
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          version: '1.0.0'
        }
      }
    }

    const stepYields: number[] = []
    let cumulativeYield = 100

    operations.forEach(op => {
      const stepYield = op.inputQty > 0 ? (op.outputQty / op.inputQty) * 100 : 0
      stepYields.push(stepYield)
      cumulativeYield *= (stepYield / 100)
    })

    const calcLog = createCalculationLog('yield', 'manufacturing_recipe', manufacturingRecipeId, 'Yield Calculation', userId, userName)
    calcLog.inputParameters = {
      baseValues: {
        inputQuantity: operations[0]?.inputQty || 0,
        processSteps: operations.map((op, idx) => ({
          stepName: `Operation ${idx + 1}`,
          lossType: 'process',
          lossPercentage: 100 - (op.outputQty / op.inputQty * 100)
        }))
      },
      constraints: {
        acceptableYieldMin: 80,
        acceptableYieldMax: 100,
        warningThreshold: 85
      },
      rules: {},
      options: {}
    }

    if (cumulativeYield < 80) {
      calcLog.status = 'warning'
      calcLog.validationResults.push({
        rule: 'acceptable_yield_range',
        field: 'overallYield',
        severity: 'warning',
        message: `Overall yield ${cumulativeYield.toFixed(2)}% is below acceptable minimum of 80%`,
        actualValue: cumulativeYield,
        expectedValue: 80,
        passed: false
      })
    } else {
      calcLog.status = 'success'
    }

    calcLog.outputResults = {
      results: {
        overallYield: cumulativeYield,
        stepYields
      },
      intermediateSteps: operations.map((op, idx) => ({
        stepNumber: idx + 1,
        operation: `Operation ${idx + 1}`,
        input: { quantity: op.inputQty, unit: op.unit },
        output: { quantity: op.outputQty, unit: op.unit },
        duration: 0
      })),
      summary: {
        totalItems: operations.length,
        successCount: stepYields.filter(y => y >= 80).length,
        warningCount: stepYields.filter(y => y < 80 && y >= 60).length,
        errorCount: stepYields.filter(y => y < 60).length,
        keyMetrics: {
          overallYield: cumulativeYield,
          averageStepYield: stepYields.reduce((sum, y) => sum + y, 0) / stepYields.length
        }
      }
    }

    calcLog.executionMetrics.endTime = new Date()
    calcLog.executionMetrics.durationMs = Date.now() - startTime

    return {
      success: true,
      data: {
        overallYield: cumulativeYield,
        stepYields,
        calculationLog: calcLog
      },
      metadata: {
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
        version: '1.0.0'
      }
    }
  }
}

export class SalesOrderAPI {
  static async derive(
    salesOrderId: string,
    lineNumbers: number[],
    userId: string,
    userName: string
  ): Promise<APIResponse<{ derivedRecipes: Array<{ lineNumber: number; masterRecipeId: string; batchSize: number }>; calculationLog: CalculationLog }>> {
    const startTime = Date.now()

    if (lineNumbers.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_LINE_ITEMS',
          message: 'At least one line item is required',
          field: 'lineNumbers'
        },
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          version: '1.0.0'
        }
      }
    }

    const derivedRecipes = lineNumbers.map(lineNumber => ({
      lineNumber,
      masterRecipeId: `recipe-${lineNumber}`,
      batchSize: 1000
    }))

    const calcLog = createCalculationLog('sales_order_derive', 'sales_order', salesOrderId, 'Recipe Derivation', userId, userName)
    calcLog.inputParameters = {
      baseValues: {
        salesOrderId,
        lineNumbers
      },
      constraints: {},
      rules: {},
      options: {}
    }

    calcLog.status = 'success'
    calcLog.outputResults = {
      results: {
        derivedRecipes
      },
      intermediateSteps: [],
      summary: {
        totalItems: lineNumbers.length,
        successCount: lineNumbers.length,
        warningCount: 0,
        errorCount: 0,
        keyMetrics: {
          totalRecipes: lineNumbers.length
        }
      }
    }

    calcLog.executionMetrics.endTime = new Date()
    calcLog.executionMetrics.durationMs = Date.now() - startTime

    return {
      success: true,
      data: {
        derivedRecipes,
        calculationLog: calcLog
      },
      metadata: {
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
        version: '1.0.0'
      }
    }
  }

  static async validateOrder(order: SalesOrder): Promise<APIResponse<{ valid: boolean; errors: string[]; warnings: string[] }>> {
    const startTime = Date.now()

    const errors = validateSalesOrder(order)
    const warnings: string[] = []

    order.items.forEach(item => {
      if (item.confirmedQuantity < item.orderedQuantity) {
        warnings.push(`Item ${item.lineNumber}: Confirmed quantity (${item.confirmedQuantity}) is less than ordered (${item.orderedQuantity})`)
      }
    })

    return {
      success: true,
      data: {
        valid: errors.length === 0,
        errors,
        warnings
      },
      metadata: {
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
        version: '1.0.0',
        warnings: warnings.length > 0 ? warnings : undefined
      }
    }
  }
}

export class ValidationAPI {
  static validateUnitOfMeasure(unit: string, allowedUnits: string[]): APIResponse<{ valid: boolean; suggestions?: string[] }> {
    const startTime = Date.now()
    const normalizedUnit = unit.toUpperCase().trim()
    const valid = allowedUnits.map(u => u.toUpperCase()).includes(normalizedUnit)

    const suggestions = !valid ? allowedUnits.filter(u => 
      u.toLowerCase().includes(unit.toLowerCase()) || 
      unit.toLowerCase().includes(u.toLowerCase())
    ) : undefined

    return {
      success: true,
      data: {
        valid,
        suggestions
      },
      metadata: {
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
        version: '1.0.0'
      }
    }
  }

  static validateYieldPercentage(yieldPercentage: number): APIResponse<{ valid: boolean; severity?: 'info' | 'warning' | 'error'; message?: string }> {
    const startTime = Date.now()

    if (yieldPercentage < 0 || yieldPercentage > 100) {
      return {
        success: true,
        data: {
          valid: false,
          severity: 'error',
          message: 'Yield percentage must be between 0% and 100%'
        },
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          version: '1.0.0'
        }
      }
    }

    if (yieldPercentage < 60) {
      return {
        success: true,
        data: {
          valid: true,
          severity: 'error',
          message: 'Yield percentage below 60% is critically low'
        },
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          version: '1.0.0'
        }
      }
    }

    if (yieldPercentage < 80) {
      return {
        success: true,
        data: {
          valid: true,
          severity: 'warning',
          message: 'Yield percentage below 80% may indicate inefficiency'
        },
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          version: '1.0.0'
        }
      }
    }

    return {
      success: true,
      data: {
        valid: true,
        severity: 'info',
        message: 'Yield percentage is within acceptable range'
      },
      metadata: {
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
        version: '1.0.0'
      }
    }
  }

  static validateByproductLogic(
    inputQuantity: number,
    outputQuantity: number,
    byproductQuantity: number,
    unit: string
  ): APIResponse<{ valid: boolean; balanceCheck: boolean; message?: string }> {
    const startTime = Date.now()

    const totalOutput = outputQuantity + byproductQuantity
    const balanceCheck = Math.abs(inputQuantity - totalOutput) < 0.01

    if (!balanceCheck) {
      return {
        success: true,
        data: {
          valid: false,
          balanceCheck: false,
          message: `Mass balance check failed: Input (${inputQuantity} ${unit}) ≠ Output (${outputQuantity} ${unit}) + Byproduct (${byproductQuantity} ${unit})`
        },
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          version: '1.0.0'
        }
      }
    }

    return {
      success: true,
      data: {
        valid: true,
        balanceCheck: true,
        message: 'Mass balance check passed'
      },
      metadata: {
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
        version: '1.0.0'
      }
    }
  }
}
