/**
 * @typedef {import('./bom').BOM} BOM
 * @typedef {import('./bom').BOMComponent} BOMComponent
 * @typedef {import('./bom').ProcessStep} ProcessStep
 */

/** @type {readonly ['procurement', 'production', 'packaging']} */
export const BOM_PHASES = ['procurement', 'production', 'packaging']

/**
 * Create an empty bill of materials scaffold for the provided formulation.
 * @param {string} formulationId
 * @returns {BOM}
 */
export function createEmptyBOM(formulationId) {
  const now = new Date()
  return {
    id: `bom-${Date.now()}`,
    formulationId,
    name: 'New BOM',
    batchSize: 100,
    batchUnit: 'kg',
    components: [],
    process: [],
    totalCost: 0,
    leadTime: 0,
    metadata: {
      productionSite: '',
      validFrom: now,
      revisionNumber: 1
    },
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Calculate the total cost of a bill of materials by summing component costs.
 * @param {BOM} bom
 * @returns {number}
 */
export function calculateBOMCost(bom) {
  return (bom.components || []).reduce((sum, component) => {
    const cost = typeof component.cost === 'number' ? component.cost : 0
    const quantity = typeof component.quantity === 'number' ? component.quantity : 0
    return sum + cost * quantity
  }, 0)
}

/**
 * Compute the combined procurement and process duration (in days).
 * @param {BOM} bom
 * @returns {number}
 */
export function calculateLeadTime(bom) {
  const procurementComponents = (bom.components || []).filter(component => component.phase === 'procurement')
  const procurementTime = procurementComponents.length === 0
    ? 0
    : Math.max(...procurementComponents.map(component => component.leadTime || 0), 0)

  const processHours = (bom.process || []).reduce((sum, step) => {
    const duration = typeof step.duration === 'number' ? step.duration : 0
    if (step.durationUnit === 'hours') {
      return sum + duration
    }
    if (step.durationUnit === 'days') {
      return sum + duration * 24
    }
    return sum + duration / 60
  }, 0)

  return procurementTime + processHours / 24
}

/**
 * Validate a bill of materials and return descriptive error messages.
 * @param {BOM} bom
 * @returns {string[]}
 */
export function validateBOM(bom) {
  const errors = []

  if (!String(bom.name || '').trim()) {
    errors.push('BOM name is required')
  }

  if (!(typeof bom.batchSize === 'number') || bom.batchSize <= 0) {
    errors.push('Batch size must be positive')
  }

  if (!Array.isArray(bom.components) || bom.components.length === 0) {
    errors.push('At least one component is required')
  }

  const components = bom.components || []
  components.forEach((component, index) => {
    if (!String(component.description || '').trim()) {
      errors.push(`Component ${index + 1} is missing a description`)
    }
    if (!(typeof component.quantity === 'number') || component.quantity <= 0) {
      errors.push(`Component "${component.description}" must have positive quantity`)
    }
  })

  const processSteps = [...(bom.process || [])].sort((a, b) => a.order - b.order)
  processSteps.forEach((step, index) => {
    if ((step.order || 0) !== index + 1) {
      errors.push(`Process step orders must be sequential (found ${step.order} at position ${index + 1})`)
    }
  })

  return errors
}
