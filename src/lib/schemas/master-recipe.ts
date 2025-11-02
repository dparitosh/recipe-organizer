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

export const RECIPE_TYPES = ['standard', 'alternative', 'trial', 'template'] as const
export const RECIPE_STATUSES = ['draft', 'review', 'approved', 'active', 'obsolete'] as const
export const RECIPE_PHASES = ['preparation', 'mixing', 'processing', 'cooling', 'packaging'] as const

export function createEmptyMasterRecipe(creator: string): MasterRecipe {
  return {
    id: `recipe-${Date.now()}`,
    recipeNumber: '',
    name: 'New Master Recipe',
    type: 'standard',
    status: 'draft',
    outputMaterial: {
      materialId: '',
      materialNumber: '',
      description: '',
      quantity: 0,
      unit: 'KG',
      batchSize: 0
    },
    ingredients: [],
    processInstructions: [],
    controlParameters: [],
    qualityChecks: [],
    packaging: [],
    yields: {
      theoreticalYield: 100,
      expectedYield: 95,
      unit: 'KG',
      yieldPercentage: 95,
      lossFactors: [],
      byproducts: []
    },
    scaleRange: {
      minimumBatch: 50,
      maximumBatch: 5000,
      standardBatch: 1000,
      unit: 'KG',
      scalingFactor: 1.0
    },
    metadata: {
      plant: '',
      developedBy: creator,
      validFrom: new Date(),
      version: '1.0',
      revisionNumber: 1,
      regulatoryApprovalRequired: false,
      productCategory: '',
      allergenInfo: [],
      certifications: [],
      notes: ''
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

export function calculateRecipeYield(recipe: MasterRecipe): number {
  const totalLoss = recipe.yields.lossFactors.reduce(
    (sum, factor) => sum + factor.lossPercentage,
    0
  )
  return Math.max(0, 100 - totalLoss)
}

export function validateMasterRecipe(recipe: MasterRecipe): string[] {
  const errors: string[] = []

  if (!recipe.recipeNumber || recipe.recipeNumber.trim() === '') {
    errors.push('Recipe number is required')
  }

  if (!recipe.name || recipe.name.trim() === '') {
    errors.push('Recipe name is required')
  }

  if (!recipe.outputMaterial.materialId) {
    errors.push('Output material is required')
  }

  if (recipe.outputMaterial.quantity <= 0) {
    errors.push('Output quantity must be positive')
  }

  if (recipe.ingredients.length === 0) {
    errors.push('At least one ingredient is required')
  }

  const totalPercentage = recipe.ingredients.reduce((sum, ing) => sum + ing.percentage, 0)
  if (Math.abs(totalPercentage - 100) > 0.1) {
    errors.push(`Total ingredient percentage must equal 100% (currently ${totalPercentage.toFixed(2)}%)`)
  }

  recipe.ingredients.forEach((ing, idx) => {
    if (ing.quantity <= 0) {
      errors.push(`Ingredient ${idx + 1} quantity must be positive`)
    }
    if (ing.percentage < 0 || ing.percentage > 100) {
      errors.push(`Ingredient ${idx + 1} percentage must be between 0-100%`)
    }
  })

  if (recipe.processInstructions.length === 0) {
    errors.push('At least one process instruction is required')
  }

  const steps = [...recipe.processInstructions].sort((a, b) => a.step - b.step)
  steps.forEach((instruction, idx) => {
    if (instruction.step !== idx + 1) {
      errors.push(`Process steps must be sequential (found step ${instruction.step} at position ${idx + 1})`)
    }
  })

  if (recipe.yields.yieldPercentage < 0 || recipe.yields.yieldPercentage > 100) {
    errors.push('Yield percentage must be between 0-100%')
  }

  if (recipe.scaleRange.minimumBatch > recipe.scaleRange.maximumBatch) {
    errors.push('Minimum batch size cannot exceed maximum batch size')
  }

  return errors
}
