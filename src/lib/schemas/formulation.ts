export interface Formulation {
  id: string
  name: string
  version: string
  type: 'concentrate' | 'final_product' | 'intermediate'
  status: 'draft' | 'review' | 'approved' | 'archived'
  ingredients: Ingredient[]
  targetYield: number
  yieldUnit: string
  costPerUnit: number
  metadata: FormulationMetadata
  createdAt: Date
  updatedAt: Date
}

export interface Ingredient {
  id: string
  materialId: string
  fdcId?: number
  name: string
  quantity: number
  unit: string
  percentage: number
  function: 'base' | 'flavor' | 'preservative' | 'sweetener' | 'colorant' | 'other'
  supplier?: string
  cost?: number
  nutrients?: NutrientProfile
  alternatives?: string[]
}

export interface NutrientProfile {
  calories?: number
  protein?: number
  carbohydrates?: number
  fat?: number
  fiber?: number
  sugar?: number
  sodium?: number
  vitamins?: Record<string, number>
  minerals?: Record<string, number>
}

export interface FormulationMetadata {
  owner: string
  department: string
  project?: string
  plmReference?: string
  mdgMaterialId?: string
  tags: string[]
  notes: string
  allergens?: string[]
  claims?: string[]
}

export declare const INGREDIENT_FUNCTIONS: readonly [
  'base',
  'flavor',
  'preservative',
  'sweetener',
  'colorant',
  'other'
]

export declare const FORMULATION_TYPES: readonly [
  'concentrate',
  'final_product',
  'intermediate'
]

export declare const FORMULATION_STATUS: readonly [
  'draft',
  'review',
  'approved',
  'archived'
]

export declare function createEmptyFormulation(owner: string): Formulation

export declare function calculateTotalPercentage(ingredients: Ingredient[]): number

export declare function validateFormulation(formulation: Formulation): string[]

export * from './formulation.js'
