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

export declare const MATERIAL_TYPES: readonly ['raw', 'semi-finished', 'finished', 'packaging']
export declare const LIFECYCLE_STATUSES: readonly ['active', 'restricted', 'obsolete', 'blocked']
export declare const VALUATION_TYPES: readonly ['standard', 'moving_average', 'market']

export declare function createEmptyMaterialMaster(creator: string): MaterialMaster

export declare function validateMaterialMaster(material: MaterialMaster): string[]

export * from './material-master.js'
