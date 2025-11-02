export interface MaterialMaster {
  id: string
  materialNumber: string
  description: string
  type: 'raw' | 'semi-finished' | 'finished' | 'packaging'
  baseUnit: string
  alternateUnits: AlternateUnit[]
  specifications: MaterialSpecification[]
  cost: MaterialCost
  procurement: ProcurementData
  regulatory: RegulatoryInfo
  quality: QualityData
  lifecycle: LifecycleStatus
  metadata: MaterialMetadata
  createdAt: Date
  updatedAt: Date
}

export interface AlternateUnit {
  unit: string
  conversionFactor: number
  isPrimary: boolean
}

export interface MaterialSpecification {
  parameter: string
  value: string | number
  unit?: string
  min?: number
  max?: number
  testMethod?: string
  isRequired: boolean
}

export interface MaterialCost {
  standardCost: number
  currency: string
  costingDate: Date
  priceUnit: number
  valuationType: 'standard' | 'moving_average' | 'market'
  history: CostHistoryEntry[]
}

export interface CostHistoryEntry {
  date: Date
  cost: number
  currency: string
  changeReason: string
}

export interface ProcurementData {
  purchasingGroup: string
  suppliers: SupplierInfo[]
  leadTimeDays: number
  minimumOrderQuantity: number
  lotSizeKey: string
  plantSpecific: PlantProcurement[]
}

export interface SupplierInfo {
  supplierId: string
  supplierName: string
  isPrimary: boolean
  leadTime: number
  minOrderQty: number
  price: number
  currency: string
  validFrom: Date
  validTo?: Date
}

export interface PlantProcurement {
  plant: string
  mrpController: string
  reorderPoint: number
  safetyStock: number
  maximumStock: number
}

export interface RegulatoryInfo {
  region: string
  certifications: Certification[]
  allergens: string[]
  claims: string[]
  restrictions: Restriction[]
  complianceStatus: 'compliant' | 'pending' | 'non_compliant'
}

export interface Certification {
  type: string
  certificationBody: string
  certificateNumber: string
  validFrom: Date
  validTo: Date
  status: 'active' | 'expired' | 'suspended'
}

export interface Restriction {
  region: string
  restrictionType: string
  description: string
  maxAllowedAmount?: number
  unit?: string
}

export interface QualityData {
  inspectionType: 'none' | 'sampling' | 'full'
  shelfLifeDays: number
  storageConditions: string
  testingRequirements: TestRequirement[]
  qualityScore?: number
}

export interface TestRequirement {
  testName: string
  specification: string
  frequency: string
  mandatoryForRelease: boolean
}

export interface LifecycleStatus {
  status: 'active' | 'restricted' | 'obsolete' | 'blocked'
  effectiveDate: Date
  expiryDate?: Date
  replacementMaterialId?: string
  reason?: string
}

export interface MaterialMetadata {
  mdgId?: string
  plmId?: string
  sapMaterialType: string
  industryStandard?: string
  createdBy: string
  lastModifiedBy: string
  version: string
  externalIds: Record<string, string>
}

export const MATERIAL_TYPES = ['raw', 'semi-finished', 'finished', 'packaging'] as const
export const LIFECYCLE_STATUSES = ['active', 'restricted', 'obsolete', 'blocked'] as const
export const VALUATION_TYPES = ['standard', 'moving_average', 'market'] as const

export function createEmptyMaterialMaster(creator: string): MaterialMaster {
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
      costingDate: new Date(),
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
      effectiveDate: new Date()
    },
    metadata: {
      sapMaterialType: 'ROH',
      createdBy: creator,
      lastModifiedBy: creator,
      version: '1.0',
      externalIds: {}
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

export function validateMaterialMaster(material: MaterialMaster): string[] {
  const errors: string[] = []

  if (!material.materialNumber || material.materialNumber.trim() === '') {
    errors.push('Material number is required')
  }

  if (!material.description || material.description.trim() === '') {
    errors.push('Material description is required')
  }

  if (!material.baseUnit || material.baseUnit.trim() === '') {
    errors.push('Base unit is required')
  }

  if (material.cost.standardCost < 0) {
    errors.push('Standard cost cannot be negative')
  }

  if (material.procurement.leadTimeDays < 0) {
    errors.push('Lead time cannot be negative')
  }

  if (material.quality.shelfLifeDays <= 0) {
    errors.push('Shelf life must be positive')
  }

  material.alternateUnits.forEach((unit, idx) => {
    if (unit.conversionFactor <= 0) {
      errors.push(`Alternate unit ${idx + 1} conversion factor must be positive`)
    }
  })

  return errors
}
