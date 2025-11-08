export interface MasterRecipe {
  id: string
  recipeNumber: string
  name: string
  type: 'standard' | 'alternative' | 'trial' | 'template'
  status: 'draft' | 'review' | 'approved' | 'active' | 'obsolete'
  formulationId?: string
  outputMaterial: OutputMaterial
  ingredients: RecipeIngredient[]
  processInstructions: ProcessInstruction[]
  controlParameters: ControlParameter[]
  qualityChecks: QualityCheckPoint[]
  packaging: PackagingInstruction[]
  yields: YieldData
  scaleRange: ScaleRange
  metadata: RecipeMetadata
  createdAt: Date
  updatedAt: Date
}

export interface OutputMaterial {
  materialId: string
  materialNumber: string
  description: string
  quantity: number
  unit: string
  batchSize: number
}

export interface RecipeIngredient {
  id: string
  materialId: string
  materialNumber: string
  description: string
  quantity: number
  unit: string
  percentage: number
  phase: 'base' | 'processing' | 'final'
  additionPoint: number
  additionMethod: string
  isOptional: boolean
  substitutes: string[]
  tolerancePlus: number
  toleranceMinus: number
}

export interface ProcessInstruction {
  id: string
  step: number
  phase: 'preparation' | 'mixing' | 'processing' | 'cooling' | 'packaging'
  instruction: string
  duration: number
  durationUnit: 'seconds' | 'minutes' | 'hours'
  temperature?: number
  temperatureUnit?: 'C' | 'F'
  pressure?: number
  pressureUnit?: 'bar' | 'psi'
  speed?: number
  speedUnit?: 'rpm'
  equipment: string[]
  criticalControlPoint: boolean
  safetyNotes?: string
}

export interface ControlParameter {
  parameterId: string
  parameterName: string
  targetValue: number
  unit: string
  lowerLimit: number
  upperLimit: number
  measurementPoint: string
  controlAction: string
  isAutomated: boolean
}

export interface QualityCheckPoint {
  id: string
  checkName: string
  stage: 'in_process' | 'intermediate' | 'final'
  specification: string
  acceptanceCriteria: string
  testMethod: string
  frequency: string
  isReleaseRelevant: boolean
  documentation: string[]
}

export interface PackagingInstruction {
  id: string
  packagingMaterial: string
  quantity: number
  unit: string
  packagingLevel: 'primary' | 'secondary' | 'tertiary'
  instructions: string
}

export interface YieldData {
  theoreticalYield: number
  expectedYield: number
  unit: string
  yieldPercentage: number
  lossFactors: LossFactor[]
  byproducts: Byproduct[]
}

export interface LossFactor {
  stage: string
  lossType: 'evaporation' | 'spillage' | 'sampling' | 'transfer' | 'other'
  lossPercentage: number
  recoverable: boolean
}

export interface Byproduct {
  materialId: string
  description: string
  quantity: number
  unit: string
  disposition: 'sell' | 'recycle' | 'waste' | 'rework'
  value?: number
}

export interface ScaleRange {
  minimumBatch: number
  maximumBatch: number
  standardBatch: number
  unit: string
  scalingFactor: number
}

export interface RecipeMetadata {
  plant: string
  productionLine?: string
  developedBy: string
  approvedBy?: string
  approvalDate?: Date
  validFrom: Date
  validTo?: Date
  version: string
  revisionNumber: number
  predecessorRecipeId?: string
  regulatoryApprovalRequired: boolean
  sapProcessOrderType?: string
  productCategory: string
  allergenInfo: string[]
  certifications: string[]
  notes: string
}

export declare const RECIPE_TYPES: readonly ['standard', 'alternative', 'trial', 'template']
export declare const RECIPE_STATUSES: readonly ['draft', 'review', 'approved', 'active', 'obsolete']
export declare const RECIPE_PHASES: readonly ['preparation', 'mixing', 'processing', 'cooling', 'packaging']

export declare function createEmptyMasterRecipe(creator: string): MasterRecipe

export declare function calculateRecipeYield(recipe: MasterRecipe): number

export declare function validateMasterRecipe(recipe: MasterRecipe): string[]

export * from './master-recipe.js'
