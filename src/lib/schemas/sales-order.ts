export interface SalesOrder {
  id: string
  salesOrderNumber: string
  customerPO: string
  customerId: string
  customerName: string
  orderDate: Date
  requestedDeliveryDate: Date
  confirmedDeliveryDate?: Date
  status: 'draft' | 'confirmed' | 'in_production' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled'
  items: SalesOrderItem[]
  totalValue: number
  currency: string
  paymentTerms: string
  shippingDetails: ShippingDetails
  derivedRecipes: DerivedRecipeReference[]
  fulfillmentTracking: FulfillmentTracking
  metadata: SalesOrderMetadata
  createdAt: Date
  updatedAt: Date
}

export interface SalesOrderItem {
  id: string
  lineNumber: number
  materialId: string
  materialNumber: string
  description: string
  orderedQuantity: number
  confirmedQuantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  plant: string
  storageLocation: string
  requestedDeliveryDate: Date
  confirmedDeliveryDate?: Date
  productionStatus: 'not_started' | 'scheduled' | 'in_progress' | 'completed'
  availableToPromise: number
  masterRecipeId?: string
  manufacturingOrderId?: string
  customerSpecifications?: CustomerSpecification[]
}

export interface CustomerSpecification {
  parameter: string
  value: string | number
  unit?: string
  isCustomized: boolean
  requiresValidation: boolean
}

export interface ShippingDetails {
  shippingAddress: Address
  billingAddress: Address
  shippingMethod: string
  carrier?: string
  trackingNumber?: string
  freightCost: number
  incoterms: string
  specialInstructions?: string
}

export interface Address {
  name: string
  street: string
  city: string
  state: string
  postalCode: string
  country: string
  contactPerson?: string
  phone?: string
  email?: string
}

export interface DerivedRecipeReference {
  recipeId: string
  recipeType: 'master' | 'manufacturing'
  lineNumber: number
  materialId: string
  batchSize: number
  unit: string
  derivedAt: Date
  derivedBy: string
  status: 'pending' | 'approved' | 'in_production' | 'completed'
  modifications: RecipeModification[]
}

export interface RecipeModification {
  modificationType: 'ingredient_substitution' | 'quantity_adjustment' | 'process_change' | 'packaging_change'
  description: string
  reason: string
  approvedBy?: string
  approvalDate?: Date
}

export interface FulfillmentTracking {
  overallProgress: number
  items: ItemFulfillment[]
  milestones: FulfillmentMilestone[]
}

export interface ItemFulfillment {
  lineNumber: number
  materialId: string
  orderedQuantity: number
  producedQuantity: number
  shippedQuantity: number
  deliveredQuantity: number
  percentComplete: number
}

export interface FulfillmentMilestone {
  milestone: string
  plannedDate: Date
  actualDate?: Date
  status: 'pending' | 'completed' | 'delayed'
  responsibleParty: string
}

export interface SalesOrderMetadata {
  salesOrganization: string
  distributionChannel: string
  division: string
  salesGroup?: string
  salesOffice?: string
  salesPerson: string
  projectId?: string
  contractNumber?: string
  customerPriority: 'standard' | 'preferred' | 'vip'
  orderSource: 'manual' | 'edi' | 'web' | 'api'
  erpOrderNumber?: string
  notes?: string
}

export declare const SALES_ORDER_STATUSES: readonly ['draft', 'confirmed', 'in_production', 'ready_to_ship', 'shipped', 'delivered', 'cancelled']
export declare const PRODUCTION_STATUSES: readonly ['not_started', 'scheduled', 'in_progress', 'completed']
export declare const INCOTERMS: readonly ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']

export declare function createEmptySalesOrder(creator: string): SalesOrder

export declare function calculateOrderTotal(order: SalesOrder): number

export declare function calculateFulfillmentProgress(order: SalesOrder): number

export declare function validateSalesOrder(order: SalesOrder): string[]

export * from './sales-order.js'
