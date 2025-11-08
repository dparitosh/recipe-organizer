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

export declare const RELATIONSHIP_TYPES: {
  readonly CONTAINS: 'CONTAINS'
  readonly DERIVED_FROM: 'DERIVED_FROM'
  readonly REQUIRES: 'REQUIRES'
  readonly ENRICHES: 'ENRICHES'
  readonly ALTERNATIVE: 'ALTERNATIVE'
  readonly SUPPLIES: 'SUPPLIES'
  readonly PRODUCES: 'PRODUCES'
  readonly SIMILAR_TO: 'SIMILAR_TO'
  readonly USES: 'uses'
  readonly derived_from: 'derived_from'
  readonly produces: 'produces'
}

export declare const NODE_LABELS: {
  readonly FORMULATION: 'Formulation'
  readonly INGREDIENT: 'Ingredient'
  readonly NUTRIENT: 'Nutrient'
  readonly PROCESS: 'Process'
  readonly EQUIPMENT: 'Equipment'
  readonly SUPPLIER: 'Supplier'
  readonly PRODUCT: 'Product'
  readonly RECIPE: 'Recipe'
  readonly MASTER_RECIPE: 'MasterRecipe'
  readonly MANUFACTURING_RECIPE: 'ManufacturingRecipe'
  readonly PLANT: 'Plant'
  readonly SALES_ORDER: 'SalesOrder'
}

export * from './integration.js'
