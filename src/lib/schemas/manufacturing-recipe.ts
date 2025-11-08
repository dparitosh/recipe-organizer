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

export declare const MANUFACTURING_STATUSES: readonly ['planned', 'released', 'in_progress', 'completed', 'cancelled']
export declare const OPERATION_STATUSES: readonly ['pending', 'ready', 'in_progress', 'completed', 'confirmed', 'cancelled']
export declare const DEVIATION_TYPES: readonly ['process', 'material', 'equipment', 'quality', 'safety']
export declare const SEVERITIES: readonly ['minor', 'major', 'critical']

export declare function createEmptyManufacturingRecipe(masterRecipeId: string, creator: string): ManufacturingRecipe

export declare function calculateManufacturingYield(recipe: ManufacturingRecipe): number

export declare function validateManufacturingRecipe(recipe: ManufacturingRecipe): string[]

export * from './manufacturing-recipe.js'
