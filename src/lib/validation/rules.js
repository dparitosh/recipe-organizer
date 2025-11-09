/**
 * @typedef {Object} ValidationError
 * @property {string} field
 * @property {string} message
 * @property {'error'} severity
 * @property {string} code
 */

/**
 * @typedef {Object} ValidationWarning
 * @property {string} field
 * @property {string} message
 * @property {'warning'} severity
 * @property {string} code
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {ValidationError[]} errors
 * @property {ValidationWarning[]} warnings
 */

export const VALID_MASS_UNITS = ['kg', 'g', 'lb', 'oz', 'mg', 't']
export const VALID_VOLUME_UNITS = ['L', 'ml', 'gal', 'fl_oz', 'kl']
export const VALID_COUNT_UNITS = ['pcs', 'units', 'ea', 'dozen']

/**
 * @param {number} quantity
 * @param {string} [fieldName='quantity']
 * @returns {ValidationResult}
 */
export function validateQuantity(quantity, fieldName = 'quantity') {
  const errors = []
  const warnings = []

  if (typeof quantity !== 'number' || !Number.isFinite(quantity)) {
    errors.push({
      field: fieldName,
      message: 'Quantity must be a valid number',
      severity: 'error',
      code: 'INVALID_NUMBER',
    })
  }

  if (quantity <= 0) {
    errors.push({
      field: fieldName,
      message: 'Quantity must be greater than zero',
      severity: 'error',
      code: 'NON_POSITIVE_QUANTITY',
    })
  }

  if (quantity < 0.001) {
    warnings.push({
      field: fieldName,
      message: 'Quantity is very small and may cause precision issues',
      severity: 'warning',
      code: 'LOW_PRECISION_WARNING',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * @param {string} unit
 * @param {string} [fieldName='unit']
 * @returns {ValidationResult}
 */
export function validateUnitOfMeasure(unit, fieldName = 'unit') {
  const errors = []
  const warnings = []

  if (!unit || typeof unit !== 'string' || unit.trim() === '') {
    errors.push({
      field: fieldName,
      message: 'Unit of measure is required',
      severity: 'error',
      code: 'MISSING_UOM',
    })
    return { isValid: false, errors, warnings }
  }

  const allValidUnits = [...VALID_MASS_UNITS, ...VALID_VOLUME_UNITS, ...VALID_COUNT_UNITS]

  if (!allValidUnits.includes(unit)) {
    errors.push({
      field: fieldName,
      message: `Invalid unit of measure: ${unit}. Must be one of: ${allValidUnits.join(', ')}`,
      severity: 'error',
      code: 'INVALID_UOM',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * @param {number} yieldPercentage
 * @param {string} [fieldName='yieldPercentage']
 * @returns {ValidationResult}
 */
export function validateYieldPercentage(yieldPercentage, fieldName = 'yieldPercentage') {
  const errors = []
  const warnings = []

  if (typeof yieldPercentage !== 'number' || !Number.isFinite(yieldPercentage)) {
    errors.push({
      field: fieldName,
      message: 'Yield percentage must be a valid number',
      severity: 'error',
      code: 'INVALID_YIELD_NUMBER',
    })
    return { isValid: false, errors, warnings }
  }

  if (yieldPercentage < 0 || yieldPercentage > 100) {
    errors.push({
      field: fieldName,
      message: 'Yield percentage must be between 0 and 100',
      severity: 'error',
      code: 'YIELD_OUT_OF_RANGE',
    })
  }

  if (yieldPercentage < 60) {
    warnings.push({
      field: fieldName,
      message: 'Yield percentage is below 60% - process may be inefficient',
      severity: 'warning',
      code: 'LOW_YIELD_CRITICAL',
    })
  } else if (yieldPercentage < 80 && yieldPercentage > 60) {
    warnings.push({
      field: fieldName,
      message: 'Yield percentage is below 80% - consider process optimization',
      severity: 'warning',
      code: 'LOW_YIELD_WARNING',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * @param {number} value
 * @param {number} [maxDecimalPlaces=3]
 * @param {string} [fieldName='value']
 * @returns {ValidationResult}
 */
export function validateRounding(value, maxDecimalPlaces = 3, fieldName = 'value') {
  const errors = []
  const warnings = []

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push({
      field: fieldName,
      message: 'Value must be a valid number',
      severity: 'error',
      code: 'INVALID_NUMBER',
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
        code: 'EXCESSIVE_PRECISION',
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
      code: 'ROUNDING_ERROR',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * @param {Record<string, any>} ingredient
 * @returns {ValidationResult}
 */
export function validateIngredient(ingredient) {
  const allErrors = []
  const allWarnings = []

  if (!ingredient || !ingredient.name || ingredient.name.trim() === '') {
    allErrors.push({
      field: 'name',
      message: 'Ingredient name is required',
      severity: 'error',
      code: 'MISSING_NAME',
    })
  }

  const qtyValidation = validateQuantity(ingredient?.quantity, 'quantity')
  allErrors.push(...qtyValidation.errors)
  allWarnings.push(...qtyValidation.warnings)

  const uomValidation = validateUnitOfMeasure(ingredient?.unit, 'unit')
  allErrors.push(...uomValidation.errors)
  allWarnings.push(...uomValidation.warnings)

  if (ingredient?.percentage < 0 || ingredient?.percentage > 100) {
    allErrors.push({
      field: 'percentage',
      message: 'Percentage must be between 0 and 100',
      severity: 'error',
      code: 'INVALID_PERCENTAGE',
    })
  }

  const roundingValidation = validateRounding(ingredient?.quantity ?? 0, 3, 'quantity')
  allWarnings.push(...roundingValidation.warnings)

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  }
}

/**
 * @param {Record<string, any>} formulation
 * @returns {ValidationResult}
 */
export function validateFormulation(formulation) {
  const allErrors = []
  const allWarnings = []

  if (!formulation || !formulation.name || formulation.name.trim() === '') {
    allErrors.push({
      field: 'name',
      message: 'Formulation name is required',
      severity: 'error',
      code: 'MISSING_NAME',
    })
  }

  const ingredients = Array.isArray(formulation?.ingredients) ? formulation.ingredients : []

  if (ingredients.length === 0) {
    allErrors.push({
      field: 'ingredients',
      message: 'At least one ingredient is required',
      severity: 'error',
      code: 'NO_INGREDIENTS',
    })
  }

  const totalPercentage = ingredients.reduce((sum, ing) => sum + (ing.percentage ?? 0), 0)
  if (Math.abs(totalPercentage - 100) > 0.1) {
    allErrors.push({
      field: 'ingredients',
      message: `Total percentage must equal 100% (currently ${totalPercentage.toFixed(2)}%)`,
      severity: 'error',
      code: 'PERCENTAGE_MISMATCH',
    })
  }

  ingredients.forEach((ing, idx) => {
    const ingValidation = validateIngredient(ing)
    ingValidation.errors.forEach((err) => {
      allErrors.push({
        ...err,
        field: `ingredients[${idx}].${err.field}`,
      })
    })
    ingValidation.warnings.forEach((warn) => {
      allWarnings.push({
        ...warn,
        field: `ingredients[${idx}].${warn.field}`,
      })
    })
  })

  const yieldValidation = validateQuantity(formulation?.targetYield, 'targetYield')
  allErrors.push(...yieldValidation.errors)
  allWarnings.push(...yieldValidation.warnings)

  const yieldUomValidation = validateUnitOfMeasure(formulation?.yieldUnit, 'yieldUnit')
  allErrors.push(...yieldUomValidation.errors)
  allWarnings.push(...yieldUomValidation.warnings)

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  }
}

/**
 * @param {Record<string, any>} component
 * @returns {ValidationResult}
 */
export function validateBOMComponent(component) {
  const allErrors = []
  const allWarnings = []

  if (!component || !component.description || component.description.trim() === '') {
    allErrors.push({
      field: 'description',
      message: 'Component description is required',
      severity: 'error',
      code: 'MISSING_DESCRIPTION',
    })
  }

  const qtyValidation = validateQuantity(component?.quantity, 'quantity')
  allErrors.push(...qtyValidation.errors)
  allWarnings.push(...qtyValidation.warnings)

  const uomValidation = validateUnitOfMeasure(component?.unit, 'unit')
  allErrors.push(...uomValidation.errors)
  allWarnings.push(...uomValidation.warnings)

  if (typeof component?.cost === 'number' && component.cost < 0) {
    allErrors.push({
      field: 'cost',
      message: 'Cost cannot be negative',
      severity: 'error',
      code: 'NEGATIVE_COST',
    })
  }

  if (typeof component?.leadTime === 'number' && component.leadTime < 0) {
    allErrors.push({
      field: 'leadTime',
      message: 'Lead time cannot be negative',
      severity: 'error',
      code: 'NEGATIVE_LEAD_TIME',
    })
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  }
}

/**
 * @param {Record<string, any>} step
 * @returns {ValidationResult}
 */
export function validateProcessStep(step) {
  const allErrors = []
  const allWarnings = []

  if (!step || !step.name || step.name.trim() === '') {
    allErrors.push({
      field: 'name',
      message: 'Process step name is required',
      severity: 'error',
      code: 'MISSING_NAME',
    })
  }

  if (!(step?.duration > 0)) {
    allErrors.push({
      field: 'duration',
      message: 'Duration must be positive',
      severity: 'error',
      code: 'INVALID_DURATION',
    })
  }

  if (step?.yields) {
    const inputValidation = validateQuantity(step.yields.input, 'yields.input')
    allErrors.push(...inputValidation.errors)

    const outputValidation = validateQuantity(step.yields.output, 'yields.output')
    allErrors.push(...outputValidation.errors)

    if (step.yields.output > step.yields.input) {
      allErrors.push({
        field: 'yields',
        message: 'Output cannot exceed input',
        severity: 'error',
        code: 'INVALID_YIELD_BALANCE',
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
          code: 'WASTE_BALANCE_WARNING',
        })
      }
    }
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  }
}

/**
 * @param {Record<string, any>} bom
 * @returns {ValidationResult}
 */
export function validateBOM(bom) {
  const allErrors = []
  const allWarnings = []

  if (!bom || !bom.name || bom.name.trim() === '') {
    allErrors.push({
      field: 'name',
      message: 'BOM name is required',
      severity: 'error',
      code: 'MISSING_NAME',
    })
  }

  const batchSizeValidation = validateQuantity(bom?.batchSize, 'batchSize')
  allErrors.push(...batchSizeValidation.errors)
  allWarnings.push(...batchSizeValidation.warnings)

  const batchUnitValidation = validateUnitOfMeasure(bom?.batchUnit, 'batchUnit')
  allErrors.push(...batchUnitValidation.errors)
  allWarnings.push(...batchUnitValidation.warnings)

  const components = Array.isArray(bom?.components) ? bom.components : []
  if (components.length === 0) {
    allErrors.push({
      field: 'components',
      message: 'At least one component is required',
      severity: 'error',
      code: 'NO_COMPONENTS',
    })
  }

  components.forEach((comp, idx) => {
    const compValidation = validateBOMComponent(comp)
    compValidation.errors.forEach((err) => {
      allErrors.push({
        ...err,
        field: `components[${idx}].${err.field}`,
      })
    })
    compValidation.warnings.forEach((warn) => {
      allWarnings.push({
        ...warn,
        field: `components[${idx}].${warn.field}`,
      })
    })
  })

  const processSteps = Array.isArray(bom?.process) ? bom.process : []
  processSteps.forEach((step, idx) => {
    const stepValidation = validateProcessStep(step)
    stepValidation.errors.forEach((err) => {
      allErrors.push({
        ...err,
        field: `process[${idx}].${err.field}`,
      })
    })
    stepValidation.warnings.forEach((warn) => {
      allWarnings.push({
        ...warn,
        field: `process[${idx}].${warn.field}`,
      })
    })
  })

  const orderedSteps = [...processSteps].sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
  orderedSteps.forEach((step, idx) => {
    if ((step?.order ?? 0) !== idx + 1) {
      allErrors.push({
        field: `process[${idx}].order`,
        message: `Process step orders must be sequential (found ${step?.order} at position ${idx + 1})`,
        severity: 'error',
        code: 'INVALID_STEP_ORDER',
      })
    }
  })

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  }
}

/**
 * @param {number} input
 * @param {number} output
 * @param {number} byproduct
 * @param {number} [tolerance=0.01]
 * @returns {ValidationResult}
 */
export function validateByproductMassBalance(input, output, byproduct, tolerance = 0.01) {
  const errors = []
  const warnings = []

  const balance = input - output - byproduct
  const balancePercentage = Math.abs(balance / input) * 100

  if (Math.abs(balance) > tolerance) {
    errors.push({
      field: 'byproduct',
      message: `Mass balance error: input (${input}) ≠ output (${output}) + byproduct (${byproduct}). Difference: ${balance.toFixed(4)}`,
      severity: 'error',
      code: 'MASS_BALANCE_ERROR',
    })
  }

  if (balancePercentage > 0.5 && balancePercentage <= 1.0) {
    warnings.push({
      field: 'byproduct',
      message: `Mass balance difference is ${balancePercentage.toFixed(2)}% of input`,
      severity: 'warning',
      code: 'MASS_BALANCE_WARNING',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}
