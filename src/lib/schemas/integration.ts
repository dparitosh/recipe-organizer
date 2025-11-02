export interface PLMMaterial {
  materialId: string
  description: string
  type: 'raw' | 'packaging' | 'finished_good' | 'semi_finished'
  status: 'active' | 'inactive' | 'obsolete' | 'pending'
  specifications: MaterialSpecification[]
  regulatory: RegulatoryInfo
  supplier?: SupplierInfo
  lastSync: Date
}

export interface MaterialSpecification {
  attribute: string
  value: any
  unit?: string
  tolerance?: number
  source: 'PLM' | 'lab' | 'supplier'
  lastUpdated: Date
}

export interface RegulatoryInfo {
  fdaApproved?: boolean
  euApproved?: boolean
  allergens: string[]
  certifications: string[]
  restrictions?: string[]
  grasStatus?: boolean
  kosher?: boolean
  halal?: boolean
}

export interface SupplierInfo {
  id: string
  name: string
  contact?: string
  leadTime?: number
  moq?: number
  pricing?: SupplierPricing[]
}

export interface SupplierPricing {
  quantity: number
  unit: string
  price: number
  currency: string
  validFrom: Date
  validTo?: Date
}

export interface MDGMaterial {
  materialNumber: string
  materialDescription: string
  materialGroup: string
  materialType: string
  baseUnit: string
  alternateUnits?: AlternateUnit[]
  valuationClass: string
  procurementType: 'E' | 'F' | 'X'
  mrpType: string
  plant: string
  storageLocation: string
  standardCost?: number
  lastCostUpdate?: Date
}

export interface AlternateUnit {
  unit: string
  conversionFactor: number
  ean?: string
}

export interface SyncRequest {
  system: 'PLM' | 'MDG'
  action: 'pull' | 'push'
  materialIds: string[]
  options: SyncOptions
}

export interface SyncOptions {
  includeSpecifications?: boolean
  includeInventory?: boolean
  includePricing?: boolean
  validateOnly?: boolean
  force?: boolean
}

export interface SyncResult {
  success: boolean
  materialIds: string[]
  errors: SyncError[]
  warnings: string[]
  syncedAt: Date
  duration: number
}

export interface SyncError {
  materialId: string
  error: string
  code?: string
}

export interface Neo4jGraphNode {
  id: string
  labels: string[]
  properties: Record<string, any>
}

export interface Neo4jGraphRelationship {
  id: string
  type: string
  startNode: string
  endNode: string
  properties: Record<string, any>
}

export interface Neo4jQuery {
  cypher: string
  parameters?: Record<string, any>
}

export interface Neo4jResult {
  nodes: Neo4jGraphNode[]
  relationships: Neo4jGraphRelationship[]
  metadata: {
    executionTime: number
    recordCount: number
  }
}

export interface GraphPath {
  start: string
  end: string
  nodes: Neo4jGraphNode[]
  relationships: Neo4jGraphRelationship[]
  length: number
}

export const RELATIONSHIP_TYPES = {
  CONTAINS: 'CONTAINS',
  DERIVED_FROM: 'DERIVED_FROM',
  REQUIRES: 'REQUIRES',
  ENRICHES: 'ENRICHES',
  ALTERNATIVE: 'ALTERNATIVE',
  SUPPLIES: 'SUPPLIES',
  PRODUCES: 'PRODUCES',
  SIMILAR_TO: 'SIMILAR_TO',
  USES: 'uses',
  derived_from: 'derived_from',
  produces: 'produces'
} as const

export const NODE_LABELS = {
  FORMULATION: 'Formulation',
  INGREDIENT: 'Ingredient',
  NUTRIENT: 'Nutrient',
  PROCESS: 'Process',
  EQUIPMENT: 'Equipment',
  SUPPLIER: 'Supplier',
  PRODUCT: 'Product',
  RECIPE: 'Recipe',
  MASTER_RECIPE: 'MasterRecipe',
  MANUFACTURING_RECIPE: 'ManufacturingRecipe',
  PLANT: 'Plant',
  SALES_ORDER: 'SalesOrder'
} as const
