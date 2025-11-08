/**
 * @typedef {import('./material-master').MaterialMaster} MaterialMaster
 */

/** @type {readonly ['raw','semi-finished','finished','packaging']} */
export const MATERIAL_TYPES = ['raw','semi-finished','finished','packaging']

/** @type {readonly ['active','restricted','obsolete','blocked']} */
export const LIFECYCLE_STATUSES = ['active','restricted','obsolete','blocked']

/** @type {readonly ['standard','moving_average','market']} */
export const VALUATION_TYPES = ['standard','moving_average','market']

/**
 * Create a blank material master record for the given creator.
 * @param {string} creator
 * @returns {MaterialMaster}
 */
export function createEmptyMaterialMaster(creator) {
  const now = new Date()
  return {
    id: `mat-${Date.now()}`,
    materialNumber: '',
    description: '',
    type: 'raw',
    baseUnit: 'KG',
    alternateUnits: [],
    specifications: [],
    cost: {
      standardCost: 0,
      currency: 'USD',
      costingDate: now,
      priceUnit: 1,
      valuationType: 'standard',
      history: []
    },
    procurement: {
      purchasingGroup: '',
      suppliers: [],
      leadTimeDays: 0,
      minimumOrderQuantity: 0,
      lotSizeKey: 'EX',
      plantSpecific: []
    },
    regulatory: {
      region: 'US',
      certifications: [],
      allergens: [],
      claims: [],
      restrictions: [],
      complianceStatus: 'pending'
    },
    quality: {
      inspectionType: 'sampling',
      shelfLifeDays: 365,
      storageConditions: 'Cool, dry place',
      testingRequirements: []
    },
    lifecycle: {
      status: 'active',
      effectiveDate: now
    },
    metadata: {
      sapMaterialType: 'ROH',
      createdBy: creator,
      lastModifiedBy: creator,
      version: '1.0',
      externalIds: {}
    },
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Validate a material master instance.
 * @param {MaterialMaster} material
 * @returns {string[]}
 */
export function validateMaterialMaster(material) {
  const errors = []
  if (!material) {
    return ['Material is required']
  }

  if (!String(material.materialNumber || '').trim()) {
    errors.push('Material number is required')
  }

  if (!String(material.description || '').trim()) {
    errors.push('Material description is required')
  }

  if (!String(material.baseUnit || '').trim()) {
    errors.push('Base unit is required')
  }

  if (material.cost && material.cost.standardCost < 0) {
    errors.push('Standard cost cannot be negative')
  }

  if (material.procurement && material.procurement.leadTimeDays < 0) {
    errors.push('Lead time cannot be negative')
  }

  if (material.quality && material.quality.shelfLifeDays <= 0) {
    errors.push('Shelf life must be positive')
  }

  const alternateUnits = Array.isArray(material.alternateUnits) ? material.alternateUnits : []
  alternateUnits.forEach((unit, index) => {
    if (!(unit.conversionFactor > 0)) {
      errors.push(`Alternate unit ${index + 1} conversion factor must be positive`)
    }
  })

  return errors
}
