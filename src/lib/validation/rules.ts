import { Formulation, Ingredient } from '@/lib/schemas/formulation'
import { BOM, BOMComponent, ProcessStep } from '@/lib/schemas/bom'

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  severity: 'error'
  code: string
}

export interface ValidationWarning {
  field: string
  message: string
  severity: 'warning'
  code: string
}

export const VALID_MASS_UNITS = ['kg', 'g', 'lb', 'oz', 'mg', 't']
export const VALID_VOLUME_UNITS = ['L', 'ml', 'gal', 'fl_oz', 'kl']
export const VALID_COUNT_UNITS = ['pcs', 'units', 'ea', 'dozen']

export function validateQuantity(quantity: number, fieldName: string = 'quantity'): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (typeof quantity !== 'number' || !Number.isFinite(quantity)) {
    errors.push({
      field: fieldName,
      message: 'Quantity must be a valid number',
      severity: 'error',
      code: 'INVALID_NUMBER'
    })
  }

  if (quantity <= 0) {
    errors.push({
      field: fieldName,
      message: 'Quantity must be greater than zero',
      severity: 'error',
      code: 'NON_POSITIVE_QUANTITY'
    })
  }

  if (quantity < 0.001) {
    warnings.push({
      field: fieldName,
      message: 'Quantity is very small and may cause precision issues',
      severity: 'warning',
      code: 'LOW_PRECISION_WARNING'
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export function validateUnitOfMeasure(unit: string, fieldName: string = 'unit'): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (!unit || typeof unit !== 'string' || unit.trim() === '') {
    errors.push({
      field: fieldName,
      message: 'Unit of measure is required',
      severity: 'error',
      code: 'MISSING_UOM'
    })
    return { isValid: false, errors, warnings }
  }

  const allValidUnits = [...VALID_MASS_UNITS, ...VALID_VOLUME_UNITS, ...VALID_COUNT_UNITS]
  
  if (!allValidUnits.includes(unit)) {
    errors.push({
      field: fieldName,
      message: `Invalid unit of measure: ${unit}. Must be one of: ${allValidUnits.join(', ')}`,
      severity: 'error',
      code: 'INVALID_UOM'
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export function validateYieldPercentage(yieldPercentage: number, fieldName: string = 'yieldPercentage'): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (typeof yieldPercentage !== 'number' || !Number.isFinite(yieldPercentage)) {
    errors.push({
      field: fieldName,
      message: 'Yield percentage must be a valid number',
      severity: 'error',
      code: 'INVALID_YIELD_NUMBER'
    })
    return { isValid: false, errors, warnings }
  }

  if (yieldPercentage < 0 || yieldPercentage > 100) {
    errors.push({
      field: fieldName,
      message: 'Yield percentage must be between 0 and 100',
      severity: 'error',
      code: 'YIELD_OUT_OF_RANGE'
    })
  }

  if (yieldPercentage < 60) {
    warnings.push({
      field: fieldName,
      message: 'Yield percentage is below 60% - process may be inefficient',
      severity: 'warning',
      code: 'LOW_YIELD_CRITICAL'
    })
  } else if (yieldPercentage < 80) {
    warnings.push({
      field: fieldName,
      message: 'Yield percentage is below 80% - consider process optimization',
      severity: 'warning',
      code: 'LOW_YIELD_WARNING'
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export function validateRounding(value: number, maxDecimalPlaces: number = 3, fieldName: string = 'value'): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push({
      field: fieldName,
      message: 'Value must be a valid number',
      severity: 'error',
      code: 'INVALID_NUMBER'
    })
    return { isValid: false, errors, warnings }
  }

  const valueStr = value.toString()
  const decimalIndex = valueStr.indexOf('.')
  
  if (decimalIndex !== -1) {
    const decimalPlaces = valueStr.length - decimalIndex - 1
    
    if (decimalPlaces > maxDecimalPlaces) {
      warnings.push({
        field: fieldName,
        message: `Value has ${decimalPlaces} decimal places, exceeds recommended ${maxDecimalPlaces}`,
        severity: 'warning',
        code: 'EXCESSIVE_PRECISION'
      })
    }
  }

  const roundedValue = Number(value.toFixed(maxDecimalPlaces))
  const difference = Math.abs(value - roundedValue)
  
  if (difference > 0.001) {
    warnings.push({
      field: fieldName,
      message: `Rounding error detected: ${difference.toExponential(2)}`,
      severity: 'warning',
      code: 'ROUNDING_ERROR'
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export function validateIngredient(ingredient: Ingredient): ValidationResult {
  const allErrors: ValidationError[] = []
  const allWarnings: ValidationWarning[] = []

  if (!ingredient.name || ingredient.name.trim() === '') {
    allErrors.push({
      field: 'name',
      message: 'Ingredient name is required',
      severity: 'error',
      code: 'MISSING_NAME'
    })
  }

  const qtyValidation = validateQuantity(ingredient.quantity, 'quantity')
  allErrors.push(...qtyValidation.errors)
  allWarnings.push(...qtyValidation.warnings)

  const uomValidation = validateUnitOfMeasure(ingredient.unit, 'unit')
  allErrors.push(...uomValidation.errors)
  allWarnings.push(...uomValidation.warnings)

  if (ingredient.percentage < 0 || ingredient.percentage > 100) {
    allErrors.push({
      field: 'percentage',
      message: 'Percentage must be between 0 and 100',
      severity: 'error',
      code: 'INVALID_PERCENTAGE'
    })
  }

  const roundingValidation = validateRounding(ingredient.quantity, 3, 'quantity')
  allWarnings.push(...roundingValidation.warnings)

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  }
}

export function validateFormulation(formulation: Formulation): ValidationResult {
  const allErrors: ValidationError[] = []
  const allWarnings: ValidationWarning[] = []

  if (!formulation.name || formulation.name.trim() === '') {
    allErrors.push({
      field: 'name',
      message: 'Formulation name is required',
      severity: 'error',
      code: 'MISSING_NAME'
    })
  }

  if (formulation.ingredients.length === 0) {
    allErrors.push({
      field: 'ingredients',
      message: 'At least one ingredient is required',
      severity: 'error',
      code: 'NO_INGREDIENTS'
    })
  }

  const totalPercentage = formulation.ingredients.reduce((sum, ing) => sum + ing.percentage, 0)
  if (Math.abs(totalPercentage - 100) > 0.1) {
    allErrors.push({
      field: 'ingredients',
      message: `Total percentage must equal 100% (currently ${totalPercentage.toFixed(2)}%)`,
      severity: 'error',
      code: 'PERCENTAGE_MISMATCH'
    })
  }

  formulation.ingredients.forEach((ing, idx) => {
    const ingValidation = validateIngredient(ing)
    ingValidation.errors.forEach(err => {
      allErrors.push({
        ...err,
        field: `ingredients[${idx}].${err.field}`
      })
    })
    ingValidation.warnings.forEach(warn => {
      allWarnings.push({
        ...warn,
        field: `ingredients[${idx}].${warn.field}`
      })
    })
  })

  const yieldValidation = validateQuantity(formulation.targetYield, 'targetYield')
  allErrors.push(...yieldValidation.errors)
  allWarnings.push(...yieldValidation.warnings)

  const yieldUomValidation = validateUnitOfMeasure(formulation.yieldUnit, 'yieldUnit')
  allErrors.push(...yieldUomValidation.errors)
  allWarnings.push(...yieldUomValidation.warnings)

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  }
}

export function validateBOMComponent(component: BOMComponent): ValidationResult {
  const allErrors: ValidationError[] = []
  const allWarnings: ValidationWarning[] = []

  if (!component.description || component.description.trim() === '') {
    allErrors.push({
      field: 'description',
      message: 'Component description is required',
      severity: 'error',
      code: 'MISSING_DESCRIPTION'
    })
  }

  const qtyValidation = validateQuantity(component.quantity, 'quantity')
  allErrors.push(...qtyValidation.errors)
  allWarnings.push(...qtyValidation.warnings)

  const uomValidation = validateUnitOfMeasure(component.unit, 'unit')
  allErrors.push(...uomValidation.errors)
  allWarnings.push(...uomValidation.warnings)

  if (component.cost < 0) {
    allErrors.push({
      field: 'cost',
      message: 'Cost cannot be negative',
      severity: 'error',
      code: 'NEGATIVE_COST'
    })
  }

  if (component.leadTime && component.leadTime < 0) {
    allErrors.push({
      field: 'leadTime',
      message: 'Lead time cannot be negative',
      severity: 'error',
      code: 'NEGATIVE_LEAD_TIME'
    })
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  }
}

export function validateProcessStep(step: ProcessStep): ValidationResult {
  const allErrors: ValidationError[] = []
  const allWarnings: ValidationWarning[] = []

  if (!step.name || step.name.trim() === '') {
    allErrors.push({
      field: 'name',
      message: 'Process step name is required',
      severity: 'error',
      code: 'MISSING_NAME'
    })
  }

  if (step.duration <= 0) {
    allErrors.push({
      field: 'duration',
      message: 'Duration must be positive',
      severity: 'error',
      code: 'INVALID_DURATION'
    })
  }

  if (step.yields) {
    const inputValidation = validateQuantity(step.yields.input, 'yields.input')
    allErrors.push(...inputValidation.errors)

    const outputValidation = validateQuantity(step.yields.output, 'yields.output')
    allErrors.push(...outputValidation.errors)

    if (step.yields.output > step.yields.input) {
      allErrors.push({
        field: 'yields',
        message: 'Output cannot exceed input',
        severity: 'error',
        code: 'INVALID_YIELD_BALANCE'
      })
    }

    const yieldPercentage = (step.yields.output / step.yields.input) * 100
    const yieldValidation = validateYieldPercentage(yieldPercentage, 'yields')
    allWarnings.push(...yieldValidation.warnings)

    if (step.yields.waste !== undefined) {
      const expectedWaste = step.yields.input - step.yields.output
      const wasteDifference = Math.abs(step.yields.waste - expectedWaste)
      
      if (wasteDifference > 0.01) {
        allWarnings.push({
          field: 'yields.waste',
          message: `Waste amount (${step.yields.waste}) doesn't match input-output difference (${expectedWaste.toFixed(2)})`,
          severity: 'warning',
          code: 'WASTE_BALANCE_WARNING'
        })
      }
    }
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  }
}

export function validateBOM(bom: BOM): ValidationResult {
  const allErrors: ValidationError[] = []
  const allWarnings: ValidationWarning[] = []

  if (!bom.name || bom.name.trim() === '') {
    allErrors.push({
      field: 'name',
      message: 'BOM name is required',
      severity: 'error',
      code: 'MISSING_NAME'
    })
  }

  const batchSizeValidation = validateQuantity(bom.batchSize, 'batchSize')
  allErrors.push(...batchSizeValidation.errors)
  allWarnings.push(...batchSizeValidation.warnings)

  const batchUnitValidation = validateUnitOfMeasure(bom.batchUnit, 'batchUnit')
  allErrors.push(...batchUnitValidation.errors)
  allWarnings.push(...batchUnitValidation.warnings)

  if (bom.components.length === 0) {
    allErrors.push({
      field: 'components',
      message: 'At least one component is required',
      severity: 'error',
      code: 'NO_COMPONENTS'
    })
  }

  bom.components.forEach((comp, idx) => {
    const compValidation = validateBOMComponent(comp)
    compValidation.errors.forEach(err => {
      allErrors.push({
        ...err,
        field: `components[${idx}].${err.field}`
      })
    })
    compValidation.warnings.forEach(warn => {
      allWarnings.push({
        ...warn,
        field: `components[${idx}].${warn.field}`
      })
    })
  })

  bom.process.forEach((step, idx) => {
    const stepValidation = validateProcessStep(step)
    stepValidation.errors.forEach(err => {
      allErrors.push({
        ...err,
        field: `process[${idx}].${err.field}`
      })
    })
    stepValidation.warnings.forEach(warn => {
      allWarnings.push({
        ...warn,
        field: `process[${idx}].${warn.field}`
      })
    })
  })

  const processSteps = [...bom.process].sort((a, b) => a.order - b.order)
  processSteps.forEach((step, idx) => {
    if (step.order !== idx + 1) {
      allErrors.push({
        field: `process[${idx}].order`,
        message: `Process step orders must be sequential (found ${step.order} at position ${idx + 1})`,
        severity: 'error',
        code: 'INVALID_STEP_ORDER'
      })
    }
  })

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  }
}

export function validateByproductMassBalance(
  input: number,
  output: number,
  byproduct: number,
  tolerance: number = 0.01
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  const balance = input - output - byproduct
  const balancePercentage = Math.abs(balance / input) * 100

  if (Math.abs(balance) > tolerance) {
    errors.push({
      field: 'byproduct',
      message: `Mass balance error: input (${input}) ≠ output (${output}) + byproduct (${byproduct}). Difference: ${balance.toFixed(4)}`,
      severity: 'error',
      code: 'MASS_BALANCE_ERROR'
    })
  }

  if (balancePercentage > 0.5 && balancePercentage <= 1.0) {
    warnings.push({
      field: 'byproduct',
      message: `Mass balance difference is ${balancePercentage.toFixed(2)}% of input`,
      severity: 'warning',
      code: 'MASS_BALANCE_WARNING'
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}
