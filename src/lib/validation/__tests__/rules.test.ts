import { describe, it, expect } from 'vitest'
import {
  validateQuantity,
  validateUnitOfMeasure,
  validateYieldPercentage,
  validateRounding,
  validateIngredient,
  validateFormulation,
  validateBOMComponent,
  validateProcessStep,
  validateBOM,
  validateByproductMassBalance,
  VALID_MASS_UNITS,
  VALID_VOLUME_UNITS,
  VALID_COUNT_UNITS
} from '@/lib/validation/rules'
import { Ingredient, Formulation } from '@/lib/schemas/formulation'
import { BOM, BOMComponent, ProcessStep } from '@/lib/schemas/bom'

describe('Validation Rules - Quantity Validation', () => {
  it('should validate positive quantity', () => {
    const result = validateQuantity(100)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject zero quantity', () => {
    const result = validateQuantity(0)
    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].code).toBe('NON_POSITIVE_QUANTITY')
  })

  it('should reject negative quantity', () => {
    const result = validateQuantity(-50)
    expect(result.isValid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].code).toBe('NON_POSITIVE_QUANTITY')
  })

  it('should reject non-numeric quantity', () => {
    const result = validateQuantity(NaN)
    expect(result.isValid).toBe(false)
    expect(result.errors[0].code).toBe('INVALID_NUMBER')
  })

  it('should reject infinite quantity', () => {
    const result = validateQuantity(Infinity)
    expect(result.isValid).toBe(false)
    expect(result.errors[0].code).toBe('INVALID_NUMBER')
  })

  it('should warn for very small quantities', () => {
    const result = validateQuantity(0.0005)
    expect(result.isValid).toBe(true)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].code).toBe('LOW_PRECISION_WARNING')
  })

  it('should accept decimal quantities', () => {
    const result = validateQuantity(12.345)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

describe('Validation Rules - Unit of Measure Validation', () => {
  it('should validate valid mass units', () => {
    VALID_MASS_UNITS.forEach(unit => {
      const result = validateUnitOfMeasure(unit)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  it('should validate valid volume units', () => {
    VALID_VOLUME_UNITS.forEach(unit => {
      const result = validateUnitOfMeasure(unit)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  it('should validate valid count units', () => {
    VALID_COUNT_UNITS.forEach(unit => {
      const result = validateUnitOfMeasure(unit)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  it('should reject invalid unit', () => {
    const result = validateUnitOfMeasure('invalid_unit')
    expect(result.isValid).toBe(false)
    expect(result.errors[0].code).toBe('INVALID_UOM')
  })

  it('should reject empty unit', () => {
    const result = validateUnitOfMeasure('')
    expect(result.isValid).toBe(false)
    expect(result.errors[0].code).toBe('MISSING_UOM')
  })

  it('should reject whitespace-only unit', () => {
    const result = validateUnitOfMeasure('   ')
    expect(result.isValid).toBe(false)
    expect(result.errors[0].code).toBe('MISSING_UOM')
  })
})

describe('Validation Rules - Yield Percentage Validation', () => {
  it('should validate yield percentage of 100', () => {
    const result = validateYieldPercentage(100)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should validate yield percentage of 85', () => {
    const result = validateYieldPercentage(85)
    expect(result.isValid).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  it('should validate yield percentage at 80% threshold', () => {
    const result = validateYieldPercentage(80)
    expect(result.isValid).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  it('should warn for yield percentage below 80%', () => {
    const result = validateYieldPercentage(75)
    expect(result.isValid).toBe(true)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].code).toBe('LOW_YIELD_WARNING')
  })

  it('should warn critically for yield percentage below 60%', () => {
    const result = validateYieldPercentage(55)
    expect(result.isValid).toBe(true)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].code).toBe('LOW_YIELD_CRITICAL')
  })

  it('should reject yield percentage above 100', () => {
    const result = validateYieldPercentage(105)
    expect(result.isValid).toBe(false)
    expect(result.errors[0].code).toBe('YIELD_OUT_OF_RANGE')
  })

  it('should reject negative yield percentage', () => {
    const result = validateYieldPercentage(-10)
    expect(result.isValid).toBe(false)
    expect(result.errors[0].code).toBe('YIELD_OUT_OF_RANGE')
  })

  it('should reject non-numeric yield percentage', () => {
    const result = validateYieldPercentage(NaN)
    expect(result.isValid).toBe(false)
    expect(result.errors[0].code).toBe('INVALID_YIELD_NUMBER')
  })

  it('should validate yield percentage at 60% threshold', () => {
    const result = validateYieldPercentage(60)
    expect(result.isValid).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  it('should validate yield percentage between 60-80%', () => {
    const result = validateYieldPercentage(70)
    expect(result.isValid).toBe(true)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].code).toBe('LOW_YIELD_WARNING')
  })
})

describe('Validation Rules - Rounding Validation', () => {
  it('should validate value with acceptable decimal places', () => {
    const result = validateRounding(12.345, 3)
    expect(result.isValid).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  it('should warn for excessive decimal places', () => {
    const result = validateRounding(12.3456789, 3)
    expect(result.isValid).toBe(true)
    expect(result.warnings.some(w => w.code === 'EXCESSIVE_PRECISION')).toBe(true)
  })

  it('should warn for rounding errors', () => {
    const result = validateRounding(12.999999999, 3)
    expect(result.isValid).toBe(true)
  })

  it('should validate integer values', () => {
    const result = validateRounding(100, 3)
    expect(result.isValid).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  it('should reject non-numeric values', () => {
    const result = validateRounding(NaN, 3)
    expect(result.isValid).toBe(false)
    expect(result.errors[0].code).toBe('INVALID_NUMBER')
  })
})

describe('Validation Rules - Ingredient Validation', () => {
  const createValidIngredient = (): Ingredient => ({
    id: 'ing-1',
    materialId: 'MAT-001',
    name: 'Water',
    quantity: 100,
    unit: 'kg',
    percentage: 80,
    function: 'base'
  })

  it('should validate complete valid ingredient', () => {
    const ingredient = createValidIngredient()
    const result = validateIngredient(ingredient)
    expect(result.isValid).toBe(true)
  })

  it('should reject ingredient without name', () => {
    const ingredient = { ...createValidIngredient(), name: '' }
    const result = validateIngredient(ingredient)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.code === 'MISSING_NAME')).toBe(true)
  })

  it('should reject ingredient with invalid quantity', () => {
    const ingredient = { ...createValidIngredient(), quantity: -5 }
    const result = validateIngredient(ingredient)
    expect(result.isValid).toBe(false)
  })

  it('should reject ingredient with invalid unit', () => {
    const ingredient = { ...createValidIngredient(), unit: 'invalid' }
    const result = validateIngredient(ingredient)
    expect(result.isValid).toBe(false)
  })

  it('should reject ingredient with percentage above 100', () => {
    const ingredient = { ...createValidIngredient(), percentage: 150 }
    const result = validateIngredient(ingredient)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.code === 'INVALID_PERCENTAGE')).toBe(true)
  })

  it('should reject ingredient with negative percentage', () => {
    const ingredient = { ...createValidIngredient(), percentage: -10 }
    const result = validateIngredient(ingredient)
    expect(result.isValid).toBe(false)
  })
})

describe('Validation Rules - Formulation Validation', () => {
  const createValidFormulation = (): Formulation => ({
    id: 'formula-1',
    name: 'Test Formula',
    version: '1.0',
    type: 'final_product',
    status: 'draft',
    ingredients: [
      {
        id: 'ing-1',
        materialId: 'MAT-001',
        name: 'Water',
        quantity: 80,
        unit: 'kg',
        percentage: 80,
        function: 'base'
      },
      {
        id: 'ing-2',
        materialId: 'MAT-002',
        name: 'Sugar',
        quantity: 20,
        unit: 'kg',
        percentage: 20,
        function: 'sweetener'
      }
    ],
    targetYield: 100,
    yieldUnit: 'kg',
    costPerUnit: 5.0,
    metadata: {
      owner: 'test-user',
      department: 'R&D',
      tags: [],
      notes: ''
    },
    createdAt: new Date(),
    updatedAt: new Date()
  })

  it('should validate complete valid formulation', () => {
    const formulation = createValidFormulation()
    const result = validateFormulation(formulation)
    expect(result.isValid).toBe(true)
  })

  it('should reject formulation without name', () => {
    const formulation = { ...createValidFormulation(), name: '' }
    const result = validateFormulation(formulation)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.code === 'MISSING_NAME')).toBe(true)
  })

  it('should reject formulation without ingredients', () => {
    const formulation = { ...createValidFormulation(), ingredients: [] }
    const result = validateFormulation(formulation)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.code === 'NO_INGREDIENTS')).toBe(true)
  })

  it('should reject formulation with incorrect total percentage', () => {
    const formulation = createValidFormulation()
    formulation.ingredients[0].percentage = 70
    const result = validateFormulation(formulation)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.code === 'PERCENTAGE_MISMATCH')).toBe(true)
  })

  it('should validate formulation with percentage total within tolerance', () => {
    const formulation = createValidFormulation()
    formulation.ingredients[0].percentage = 79.95
    formulation.ingredients[1].percentage = 20.05
    const result = validateFormulation(formulation)
    expect(result.isValid).toBe(true)
  })

  it('should reject formulation with invalid target yield', () => {
    const formulation = { ...createValidFormulation(), targetYield: -100 }
    const result = validateFormulation(formulation)
    expect(result.isValid).toBe(false)
  })

  it('should reject formulation with invalid yield unit', () => {
    const formulation = { ...createValidFormulation(), yieldUnit: 'invalid' }
    const result = validateFormulation(formulation)
    expect(result.isValid).toBe(false)
  })
})

describe('Validation Rules - BOM Component Validation', () => {
  const createValidComponent = (): BOMComponent => ({
    id: 'comp-1',
    materialId: 'MAT-001',
    description: 'Raw Material',
    quantity: 100,
    unit: 'kg',
    phase: 'production',
    cost: 50.0
  })

  it('should validate complete valid component', () => {
    const component = createValidComponent()
    const result = validateBOMComponent(component)
    expect(result.isValid).toBe(true)
  })

  it('should reject component without description', () => {
    const component = { ...createValidComponent(), description: '' }
    const result = validateBOMComponent(component)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.code === 'MISSING_DESCRIPTION')).toBe(true)
  })

  it('should reject component with negative cost', () => {
    const component = { ...createValidComponent(), cost: -10 }
    const result = validateBOMComponent(component)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.code === 'NEGATIVE_COST')).toBe(true)
  })

  it('should reject component with negative lead time', () => {
    const component = { ...createValidComponent(), leadTime: -5 }
    const result = validateBOMComponent(component)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.code === 'NEGATIVE_LEAD_TIME')).toBe(true)
  })

  it('should accept component with zero cost', () => {
    const component = { ...createValidComponent(), cost: 0 }
    const result = validateBOMComponent(component)
    expect(result.isValid).toBe(true)
  })
})

describe('Validation Rules - Process Step Validation', () => {
  const createValidStep = (): ProcessStep => ({
    id: 'step-1',
    order: 1,
    name: 'Mixing',
    description: 'Mix ingredients',
    duration: 30,
    durationUnit: 'minutes',
    parameters: {},
    yields: {
      input: 100,
      output: 98,
      unit: 'kg'
    }
  })

  it('should validate complete valid process step', () => {
    const step = createValidStep()
    const result = validateProcessStep(step)
    expect(result.isValid).toBe(true)
  })

  it('should reject step without name', () => {
    const step = { ...createValidStep(), name: '' }
    const result = validateProcessStep(step)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.code === 'MISSING_NAME')).toBe(true)
  })

  it('should reject step with invalid duration', () => {
    const step = { ...createValidStep(), duration: -10 }
    const result = validateProcessStep(step)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.code === 'INVALID_DURATION')).toBe(true)
  })

  it('should reject step where output exceeds input', () => {
    const step = createValidStep()
    step.yields!.output = 110
    const result = validateProcessStep(step)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.code === 'INVALID_YIELD_BALANCE')).toBe(true)
  })

  it('should warn for low yield percentage', () => {
    const step = createValidStep()
    step.yields!.input = 100
    step.yields!.output = 70
    const result = validateProcessStep(step)
    expect(result.isValid).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('should warn for waste balance mismatch', () => {
    const step = createValidStep()
    step.yields!.waste = 10
    const result = validateProcessStep(step)
    expect(result.isValid).toBe(true)
    expect(result.warnings.some(w => w.code === 'WASTE_BALANCE_WARNING')).toBe(true)
  })

  it('should validate step with correct waste calculation', () => {
    const step = createValidStep()
    step.yields!.waste = 2
    const result = validateProcessStep(step)
    expect(result.isValid).toBe(true)
  })
})

describe('Validation Rules - Byproduct Mass Balance', () => {
  it('should validate balanced mass equation', () => {
    const result = validateByproductMassBalance(100, 90, 10)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should validate balance within tolerance', () => {
    const result = validateByproductMassBalance(100, 90.005, 9.995, 0.01)
    expect(result.isValid).toBe(true)
  })

  it('should reject unbalanced mass equation', () => {
    const result = validateByproductMassBalance(100, 90, 5)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.code === 'MASS_BALANCE_ERROR')).toBe(true)
  })

  it('should warn for balance within 0.5-1.0% difference', () => {
    const result = validateByproductMassBalance(100, 90, 9.2)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('should validate exact balance', () => {
    const result = validateByproductMassBalance(1000, 850, 150)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should handle decimal precision', () => {
    const result = validateByproductMassBalance(100.0, 85.5, 14.5)
    expect(result.isValid).toBe(true)
  })
})

describe('Validation Rules - BOM Validation', () => {
  const createValidBOM = (): BOM => ({
    id: 'bom-1',
    formulationId: 'formula-1',
    name: 'Test BOM',
    batchSize: 1000,
    batchUnit: 'kg',
    components: [
      {
        id: 'comp-1',
        materialId: 'MAT-001',
        description: 'Component 1',
        quantity: 100,
        unit: 'kg',
        phase: 'production',
        cost: 50
      }
    ],
    process: [
      {
        id: 'step-1',
        order: 1,
        name: 'Step 1',
        description: 'First step',
        duration: 30,
        durationUnit: 'minutes',
        parameters: {}
      }
    ],
    totalCost: 50,
    leadTime: 2,
    metadata: {
      productionSite: 'Site A',
      validFrom: new Date(),
      revisionNumber: 1
    },
    createdAt: new Date(),
    updatedAt: new Date()
  })

  it('should validate complete valid BOM', () => {
    const bom = createValidBOM()
    const result = validateBOM(bom)
    expect(result.isValid).toBe(true)
  })

  it('should reject BOM without name', () => {
    const bom = { ...createValidBOM(), name: '' }
    const result = validateBOM(bom)
    expect(result.isValid).toBe(false)
  })

  it('should reject BOM without components', () => {
    const bom = { ...createValidBOM(), components: [] }
    const result = validateBOM(bom)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.code === 'NO_COMPONENTS')).toBe(true)
  })

  it('should reject BOM with invalid step order', () => {
    const bom = createValidBOM()
    bom.process.push({
      id: 'step-2',
      order: 5,
      name: 'Step 2',
      description: 'Second step',
      duration: 20,
      durationUnit: 'minutes',
      parameters: {}
    })
    const result = validateBOM(bom)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.code === 'INVALID_STEP_ORDER')).toBe(true)
  })

  it('should validate BOM with sequential process steps', () => {
    const bom = createValidBOM()
    bom.process.push({
      id: 'step-2',
      order: 2,
      name: 'Step 2',
      description: 'Second step',
      duration: 20,
      durationUnit: 'minutes',
      parameters: {}
    })
    const result = validateBOM(bom)
    expect(result.isValid).toBe(true)
  })
})
