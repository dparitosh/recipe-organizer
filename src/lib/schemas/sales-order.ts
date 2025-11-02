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

export const SALES_ORDER_STATUSES = ['draft', 'confirmed', 'in_production', 'ready_to_ship', 'shipped', 'delivered', 'cancelled'] as const
export const PRODUCTION_STATUSES = ['not_started', 'scheduled', 'in_progress', 'completed'] as const
export const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'] as const

export function createEmptySalesOrder(creator: string): SalesOrder {
  return {
    id: `so-${Date.now()}`,
    salesOrderNumber: '',
    customerPO: '',
    customerId: '',
    customerName: '',
    orderDate: new Date(),
    requestedDeliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'draft',
    items: [],
    totalValue: 0,
    currency: 'USD',
    paymentTerms: 'Net 30',
    shippingDetails: {
      shippingAddress: {
        name: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: ''
      },
      billingAddress: {
        name: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: ''
      },
      shippingMethod: 'Standard Ground',
      freightCost: 0,
      incoterms: 'FCA'
    },
    derivedRecipes: [],
    fulfillmentTracking: {
      overallProgress: 0,
      items: [],
      milestones: []
    },
    metadata: {
      salesOrganization: '',
      distributionChannel: '',
      division: '',
      salesPerson: creator,
      customerPriority: 'standard',
      orderSource: 'manual'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

export function calculateOrderTotal(order: SalesOrder): number {
  return order.items.reduce((sum, item) => sum + item.totalPrice, 0)
}

export function calculateFulfillmentProgress(order: SalesOrder): number {
  if (order.items.length === 0) return 0
  
  const totalOrdered = order.items.reduce((sum, item) => sum + item.orderedQuantity, 0)
  const totalProduced = order.items.reduce((sum, item) => {
    const fulfillment = order.fulfillmentTracking.items.find(f => f.lineNumber === item.lineNumber)
    return sum + (fulfillment?.producedQuantity || 0)
  }, 0)
  
  return totalOrdered > 0 ? (totalProduced / totalOrdered) * 100 : 0
}

export function validateSalesOrder(order: SalesOrder): string[] {
  const errors: string[] = []

  if (!order.salesOrderNumber || order.salesOrderNumber.trim() === '') {
    errors.push('Sales order number is required')
  }

  if (!order.customerId || order.customerId.trim() === '') {
    errors.push('Customer ID is required')
  }

  if (!order.customerName || order.customerName.trim() === '') {
    errors.push('Customer name is required')
  }

  if (order.items.length === 0) {
    errors.push('At least one order item is required')
  }

  order.items.forEach((item, idx) => {
    if (!item.materialId || item.materialId.trim() === '') {
      errors.push(`Item ${idx + 1}: Material ID is required`)
    }
    if (item.orderedQuantity <= 0) {
      errors.push(`Item ${idx + 1}: Ordered quantity must be positive`)
    }
    if (item.unitPrice < 0) {
      errors.push(`Item ${idx + 1}: Unit price cannot be negative`)
    }
  })

  if (order.requestedDeliveryDate < order.orderDate) {
    errors.push('Requested delivery date cannot be before order date')
  }

  if (!order.shippingDetails.shippingAddress.country) {
    errors.push('Shipping country is required')
  }

  return errors
}
