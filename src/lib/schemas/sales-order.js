export const SALES_ORDER_STATUSES = ['draft', 'confirmed', 'in_production', 'ready_to_ship', 'shipped', 'delivered', 'cancelled']
export const PRODUCTION_STATUSES = ['not_started', 'scheduled', 'in_progress', 'completed']
export const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']

export function createEmptySalesOrder(creator) {
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

export function calculateOrderTotal(order) {
  return order.items.reduce((sum, item) => sum + item.totalPrice, 0)
}

export function calculateFulfillmentProgress(order) {
  if (!order || !order.items || order.items.length === 0) return 0

  const totalOrdered = order.items.reduce((sum, item) => sum + (item.orderedQuantity || 0), 0)
  const totalProduced = order.items.reduce((sum, item) => {
    const fulfillment = (order.fulfillmentTracking && order.fulfillmentTracking.items)
      ? order.fulfillmentTracking.items.find(f => f.lineNumber === item.lineNumber)
      : undefined
    return sum + (fulfillment?.producedQuantity || 0)
  }, 0)

  return totalOrdered > 0 ? (totalProduced / totalOrdered) * 100 : 0
}

export function validateSalesOrder(order) {
  const errors = []

  if (!order) return ['Order is required']

  if (!order.salesOrderNumber || order.salesOrderNumber.toString().trim() === '') {
    errors.push('Sales order number is required')
  }

  if (!order.customerId || order.customerId.toString().trim() === '') {
    errors.push('Customer ID is required')
  }

  if (!order.customerName || order.customerName.toString().trim() === '') {
    errors.push('Customer name is required')
  }

  if (!order.items || order.items.length === 0) {
    errors.push('At least one order item is required')
  }

  (order.items || []).forEach((item, idx) => {
    if (!item.materialId || item.materialId.toString().trim() === '') {
      errors.push(`Item ${idx + 1}: Material ID is required`)
    }
    if ((item.orderedQuantity || 0) <= 0) {
      errors.push(`Item ${idx + 1}: Ordered quantity must be positive`)
    }
    if ((item.unitPrice || 0) < 0) {
      errors.push(`Item ${idx + 1}: Unit price cannot be negative`)
    }
  })

  if (order.requestedDeliveryDate && order.orderDate && order.requestedDeliveryDate < order.orderDate) {
    errors.push('Requested delivery date cannot be before order date')
  }

  if (!order.shippingDetails || !order.shippingDetails.shippingAddress || !order.shippingDetails.shippingAddress.country) {
    errors.push('Shipping country is required')
  }

  return errors
}
