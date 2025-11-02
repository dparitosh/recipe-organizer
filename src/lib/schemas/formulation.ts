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

export const INGREDIENT_FUNCTIONS = [
  'base',
  'flavor',
  'preservative',
  'sweetener',
  'colorant',
  'other'
] as const

export const FORMULATION_TYPES = [
  'concentrate',
  'final_product',
  'intermediate'
] as const

export const FORMULATION_STATUS = [
  'draft',
  'review',
  'approved',
  'archived'
] as const

export function createEmptyFormulation(owner: string): Formulation {
  return {
    id: `formula-${Date.now()}`,
    name: 'New Formulation',
    version: '1.0',
    type: 'final_product',
    status: 'draft',
    ingredients: [],
    targetYield: 100,
    yieldUnit: 'kg',
    costPerUnit: 0,
    metadata: {
      owner,
      department: '',
      tags: [],
      notes: ''
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

export function calculateTotalPercentage(ingredients: Ingredient[]): number {
  return ingredients.reduce((sum, ing) => sum + ing.percentage, 0)
}

export function validateFormulation(formulation: Formulation): string[] {
  const errors: string[] = []

  if (!formulation.name.trim()) {
    errors.push('Formulation name is required')
  }

  if (formulation.ingredients.length === 0) {
    errors.push('At least one ingredient is required')
  }

  const totalPercentage = calculateTotalPercentage(formulation.ingredients)
  if (Math.abs(totalPercentage - 100) > 0.1) {
    errors.push(`Total percentage must equal 100% (currently ${totalPercentage.toFixed(2)}%)`)
  }

  formulation.ingredients.forEach((ing, idx) => {
    if (!ing.name.trim()) {
      errors.push(`Ingredient ${idx + 1} is missing a name`)
    }
    if (ing.quantity <= 0) {
      errors.push(`Ingredient "${ing.name}" must have a positive quantity`)
    }
    if (ing.percentage < 0 || ing.percentage > 100) {
      errors.push(`Ingredient "${ing.name}" percentage must be between 0-100%`)
    }
  })

  return errors
}
