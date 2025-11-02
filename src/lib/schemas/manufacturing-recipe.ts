export interface ManufacturingRecipe {
  id: string
  manufacturingOrderNumber: string
  masterRecipeId: string
  name: string
  plant: string
  productionLine: string
  status: 'planned' | 'released' | 'in_progress' | 'completed' | 'cancelled'
  scheduledStartDate: Date
  scheduledEndDate: Date
  actualStartDate?: Date
  actualEndDate?: Date
  outputMaterial: ManufacturingOutput
  ingredients: ManufacturingIngredient[]
  operations: ManufacturingOperation[]
  resourceAllocation: ResourceAllocation
  actualYields: ActualYieldData
  qualityResults: QualityResult[]
  deviations: Deviation[]
  costTracking: CostTracking
  metadata: ManufacturingMetadata
  createdAt: Date
  updatedAt: Date
}

export interface ManufacturingOutput {
  materialId: string
  materialNumber: string
  description: string
  plannedQuantity: number
  actualQuantity?: number
  unit: string
  batchNumber: string
  lotNumber?: string
  expiryDate?: Date
}

export interface ManufacturingIngredient {
  id: string
  materialId: string
  materialNumber: string
  description: string
  plannedQuantity: number
  actualQuantity?: number
  unit: string
  batchNumber?: string
  issuedQuantity?: number
  returnedQuantity?: number
  storageLocation: string
  reservationNumber?: string
  goodsMovementNumber?: string
}

export interface ManufacturingOperation {
  id: string
  operationNumber: string
  description: string
  workCenter: string
  controlKey: string
  sequence: number
  standardDuration: number
  actualDuration?: number
  durationUnit: 'minutes' | 'hours'
  setupTime: number
  teardownTime: number
  laborHours: number
  machineHours: number
  status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'confirmed' | 'cancelled'
  operatorId?: string
  startTime?: Date
  endTime?: Date
  processParameters: ProcessParameterActual[]
  confirmation: OperationConfirmation
  yields: OperationYield
}

export interface ProcessParameterActual {
  parameterId: string
  parameterName: string
  targetValue: number
  actualValue?: number
  unit: string
  lowerLimit: number
  upperLimit: number
  inSpec: boolean
  measuredAt?: Date
  measuredBy?: string
}

export interface OperationConfirmation {
  confirmedBy?: string
  confirmedAt?: Date
  yieldConfirmed: boolean
  qualityConfirmed: boolean
  comments?: string
}

export interface OperationYield {
  inputQuantity: number
  outputQuantity: number
  scrapQuantity: number
  reworkQuantity: number
  unit: string
  yieldPercentage: number
}

export interface ResourceAllocation {
  equipment: EquipmentResource[]
  labor: LaborResource[]
  utilities: UtilityConsumption[]
}

export interface EquipmentResource {
  equipmentId: string
  equipmentName: string
  workCenter: string
  allocatedFrom: Date
  allocatedTo: Date
  operationNumbers: string[]
  status: 'allocated' | 'in_use' | 'released'
}

export interface LaborResource {
  employeeId: string
  employeeName: string
  role: string
  shift: string
  allocatedHours: number
  actualHours?: number
  costCenter: string
}

export interface UtilityConsumption {
  utilityType: 'electricity' | 'steam' | 'water' | 'gas' | 'compressed_air'
  plannedConsumption: number
  actualConsumption?: number
  unit: string
  cost?: number
}

export interface ActualYieldData {
  totalInput: number
  totalOutput: number
  scrap: number
  rework: number
  byproducts: ActualByproduct[]
  unit: string
  overallYieldPercentage: number
  varianceFromStandard: number
}

export interface ActualByproduct {
  materialId: string
  description: string
  quantity: number
  unit: string
  batchNumber?: string
  disposition: 'sold' | 'recycled' | 'disposed' | 'reworked'
  value?: number
  costSavings?: number
}

export interface QualityResult {
  id: string
  checkpointId: string
  checkName: string
  inspectionLot?: string
  stage: 'in_process' | 'intermediate' | 'final'
  testedAt: Date
  testedBy: string
  result: 'pass' | 'fail' | 'conditional'
  measurements: Measurement[]
  disposition: 'approved' | 'rejected' | 'blocked' | 'conditional_release'
  comments?: string
}

export interface Measurement {
  characteristic: string
  measuredValue: number
  unit: string
  specLowerLimit: number
  specUpperLimit: number
  inSpec: boolean
  deviation?: number
}

export interface Deviation {
  id: string
  deviationType: 'process' | 'material' | 'equipment' | 'quality' | 'safety'
  severity: 'minor' | 'major' | 'critical'
  description: string
  impact: string
  rootCause?: string
  correctiveAction?: string
  preventiveAction?: string
  reportedBy: string
  reportedAt: Date
  resolvedBy?: string
  resolvedAt?: Date
  status: 'open' | 'investigating' | 'resolved' | 'closed'
}

export interface CostTracking {
  materialCost: number
  laborCost: number
  equipmentCost: number
  utilityCost: number
  overheadCost: number
  scrapCost: number
  reworkCost: number
  totalCost: number
  costPerUnit: number
  varianceFromStandard: number
  currency: string
}

export interface ManufacturingMetadata {
  orderType: string
  salesOrderNumber?: string
  customerName?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  createdBy: string
  releasedBy?: string
  confirmedBy?: string
  campaignId?: string
  erpOrderNumber?: string
  mesOrderNumber?: string
  batchRecordNumber?: string
  regulatoryBatch: boolean
  notes?: string
}

export const MANUFACTURING_STATUSES = ['planned', 'released', 'in_progress', 'completed', 'cancelled'] as const
export const OPERATION_STATUSES = ['pending', 'ready', 'in_progress', 'completed', 'confirmed', 'cancelled'] as const
export const DEVIATION_TYPES = ['process', 'material', 'equipment', 'quality', 'safety'] as const
export const SEVERITIES = ['minor', 'major', 'critical'] as const

export function createEmptyManufacturingRecipe(masterRecipeId: string, creator: string): ManufacturingRecipe {
  return {
    id: `mfg-${Date.now()}`,
    manufacturingOrderNumber: '',
    masterRecipeId,
    name: 'New Manufacturing Order',
    plant: '',
    productionLine: '',
    status: 'planned',
    scheduledStartDate: new Date(),
    scheduledEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    outputMaterial: {
      materialId: '',
      materialNumber: '',
      description: '',
      plannedQuantity: 0,
      unit: 'KG',
      batchNumber: ''
    },
    ingredients: [],
    operations: [],
    resourceAllocation: {
      equipment: [],
      labor: [],
      utilities: []
    },
    actualYields: {
      totalInput: 0,
      totalOutput: 0,
      scrap: 0,
      rework: 0,
      byproducts: [],
      unit: 'KG',
      overallYieldPercentage: 0,
      varianceFromStandard: 0
    },
    qualityResults: [],
    deviations: [],
    costTracking: {
      materialCost: 0,
      laborCost: 0,
      equipmentCost: 0,
      utilityCost: 0,
      overheadCost: 0,
      scrapCost: 0,
      reworkCost: 0,
      totalCost: 0,
      costPerUnit: 0,
      varianceFromStandard: 0,
      currency: 'USD'
    },
    metadata: {
      orderType: 'PP01',
      priority: 'normal',
      createdBy: creator,
      regulatoryBatch: false
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

export function calculateManufacturingYield(recipe: ManufacturingRecipe): number {
  if (recipe.actualYields.totalInput === 0) return 0
  return (recipe.actualYields.totalOutput / recipe.actualYields.totalInput) * 100
}

export function validateManufacturingRecipe(recipe: ManufacturingRecipe): string[] {
  const errors: string[] = []

  if (!recipe.manufacturingOrderNumber || recipe.manufacturingOrderNumber.trim() === '') {
    errors.push('Manufacturing order number is required')
  }

  if (!recipe.plant || recipe.plant.trim() === '') {
    errors.push('Plant is required')
  }

  if (!recipe.outputMaterial.materialId) {
    errors.push('Output material is required')
  }

  if (recipe.outputMaterial.plannedQuantity <= 0) {
    errors.push('Planned output quantity must be positive')
  }

  if (recipe.ingredients.length === 0) {
    errors.push('At least one ingredient is required')
  }

  if (recipe.operations.length === 0) {
    errors.push('At least one operation is required')
  }

  const operations = [...recipe.operations].sort((a, b) => a.sequence - b.sequence)
  operations.forEach((op, idx) => {
    if (op.sequence !== idx + 1) {
      errors.push(`Operations must be sequential (found sequence ${op.sequence} at position ${idx + 1})`)
    }
  })

  if (recipe.scheduledStartDate >= recipe.scheduledEndDate) {
    errors.push('Scheduled start date must be before end date')
  }

  return errors
}
