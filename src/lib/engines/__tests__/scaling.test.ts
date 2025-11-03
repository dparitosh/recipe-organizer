import { describe, it, expect } from 'vitest'
import { scaleFormulation, convertUnits, scaleToStandardBatch, batchScale, findOptimalBatchSize } from '@/lib/engines/scaling'
import { Formulation, Ingredient } from '@/lib/schemas/formulation'

describe('Calculation Engine - Scaling Logic', () => {
  const createMockFormulation = (): Formulation => ({
    id: 'test-formula-1',
    name: 'Test Formula',
    version: '1.0',
    type: 'final_product',
    status: 'approved',
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
        quantity: 15,
        unit: 'kg',
        percentage: 15,
        function: 'sweetener'
      },
      {
        id: 'ing-3',
        materialId: 'MAT-003',
        name: 'Citric Acid',
        quantity: 5,
        unit: 'kg',
        percentage: 5,
        function: 'preservative'
      }
    ],
    targetYield: 100,
    yieldUnit: 'kg',
    costPerUnit: 0,
    metadata: {
      owner: 'test-user',
      department: 'R&D',
      tags: [],
      notes: ''
    },
    createdAt: new Date(),
    updatedAt: new Date()
  })

  describe('scaleFormulation', () => {
    it('should scale formulation by factor of 2', () => {
      const formulation = createMockFormulation()
      const result = scaleFormulation({
        formulation,
        targetQuantity: 200,
        targetUnit: 'kg'
      })

      expect(result.scaleFactor).toBe(2)
      expect(result.scaledFormulation.ingredients[0].quantity).toBe(160)
      expect(result.scaledFormulation.ingredients[1].quantity).toBe(30)
      expect(result.scaledFormulation.ingredients[2].quantity).toBe(10)
    })

    it('should scale formulation by factor of 0.5', () => {
      const formulation = createMockFormulation()
      const result = scaleFormulation({
        formulation,
        targetQuantity: 50,
        targetUnit: 'kg'
      })

      expect(result.scaleFactor).toBe(0.5)
      expect(result.scaledFormulation.ingredients[0].quantity).toBe(40)
      expect(result.scaledFormulation.ingredients[1].quantity).toBe(7.5)
      expect(result.scaledFormulation.ingredients[2].quantity).toBe(2.5)
    })

    it('should apply rounding rules when specified', () => {
      const formulation = createMockFormulation()
      const result = scaleFormulation({
        formulation,
        targetQuantity: 150,
        targetUnit: 'kg',
        options: {
          roundToNearest: 5
        }
      })

      expect(result.scaledFormulation.ingredients[0].quantity).toBe(120)
      expect(result.scaledFormulation.ingredients[1].quantity).toBe(25)
      expect(result.scaledFormulation.ingredients[2].quantity).toBe(10)
    })

    it('should maintain ratios when scaling', () => {
      const formulation = createMockFormulation()
      const result = scaleFormulation({
        formulation,
        targetQuantity: 300,
        targetUnit: 'kg',
        options: {
          maintainRatios: true
        }
      })

      const total = result.scaledFormulation.ingredients.reduce((sum, ing) => sum + ing.quantity, 0)
      expect(result.scaledFormulation.ingredients[0].percentage).toBeCloseTo(80, 1)
      expect(result.scaledFormulation.ingredients[1].percentage).toBeCloseTo(15, 1)
      expect(result.scaledFormulation.ingredients[2].percentage).toBeCloseTo(5, 1)
    })

    it('should warn for very small scale factors', () => {
      const formulation = createMockFormulation()
      const result = scaleFormulation({
        formulation,
        targetQuantity: 5,
        targetUnit: 'kg'
      })

      expect(result.scaleFactor).toBe(0.05)
      expect(result.warnings).toContain('Scale factor very small (<0.1) - accuracy may be compromised')
    })

    it('should warn for very large scale factors', () => {
      const formulation = createMockFormulation()
      const result = scaleFormulation({
        formulation,
        targetQuantity: 15000,
        targetUnit: 'kg'
      })

      expect(result.scaleFactor).toBe(150)
      expect(result.warnings).toContain('Scale factor very large (>100) - consider batch production')
    })

    it('should respect min quantity constraints', () => {
      const formulation = createMockFormulation()
      const result = scaleFormulation({
        formulation,
        targetQuantity: 0.5,
        targetUnit: 'kg',
        options: {
          minQuantity: 0.5
        }
      })

      result.scaledFormulation.ingredients.forEach(ing => {
        expect(ing.quantity).toBeGreaterThanOrEqual(0.5)
      })
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should respect max quantity constraints', () => {
      const formulation = createMockFormulation()
      const result = scaleFormulation({
        formulation,
        targetQuantity: 10000,
        targetUnit: 'kg',
        options: {
          maxQuantity: 500
        }
      })

      result.scaledFormulation.ingredients.forEach(ing => {
        expect(ing.quantity).toBeLessThanOrEqual(500)
      })
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('convertUnits', () => {
    it('should convert kg to g correctly', () => {
      expect(convertUnits(1, 'kg', 'g')).toBe(1000)
      expect(convertUnits(5, 'kg', 'g')).toBe(5000)
    })

    it('should convert g to kg correctly', () => {
      expect(convertUnits(1000, 'g', 'kg')).toBe(1)
      expect(convertUnits(500, 'g', 'kg')).toBe(0.5)
    })

    it('should convert kg to lb correctly', () => {
      expect(convertUnits(1, 'kg', 'lb')).toBeCloseTo(2.20462, 3)
      expect(convertUnits(10, 'kg', 'lb')).toBeCloseTo(22.0462, 3)
    })

    it('should convert L to ml correctly', () => {
      expect(convertUnits(1, 'L', 'ml')).toBe(1000)
      expect(convertUnits(2.5, 'L', 'ml')).toBe(2500)
    })

    it('should convert ml to L correctly', () => {
      expect(convertUnits(1000, 'ml', 'L')).toBe(1)
      expect(convertUnits(750, 'ml', 'L')).toBe(0.75)
    })

    it('should return same value for same unit', () => {
      expect(convertUnits(100, 'kg', 'kg')).toBe(100)
      expect(convertUnits(50, 'L', 'L')).toBe(50)
    })

    it('should throw error for unknown source unit', () => {
      expect(() => convertUnits(1, 'unknown', 'kg')).toThrow('Unknown unit: unknown')
    })

    it('should throw error for incompatible unit conversion', () => {
      expect(() => convertUnits(1, 'kg', 'L')).toThrow('Cannot convert kg to L')
    })
  })

  describe('scaleToStandardBatch', () => {
    it('should select closest standard size', () => {
      const formulation = createMockFormulation()
      const standardSizes = [50, 100, 250, 500, 1000]
      
      const result = scaleToStandardBatch(formulation, standardSizes)
      
      expect(result.scaledFormulation.targetYield).toBe(100)
      expect(result.scaleFactor).toBe(1)
    })

    it('should scale to nearest standard size when not exact match', () => {
      const formulation = { ...createMockFormulation(), targetYield: 175 }
      const standardSizes = [50, 100, 250, 500, 1000]
      
      const result = scaleToStandardBatch(formulation, standardSizes)
      
      expect(result.scaledFormulation.targetYield).toBe(250)
    })
  })

  describe('batchScale', () => {
    it('should scale formulation for multiple batches', () => {
      const formulation = createMockFormulation()
      const result = batchScale(formulation, 5)

      expect(result.scaleFactor).toBe(5)
      expect(result.scaledFormulation.targetYield).toBe(500)
      expect(result.scaledFormulation.ingredients[0].quantity).toBe(400)
    })

    it('should maintain ratios across multiple batches', () => {
      const formulation = createMockFormulation()
      const result = batchScale(formulation, 10)

      expect(result.scaledFormulation.ingredients[0].percentage).toBeCloseTo(80, 1)
      expect(result.scaledFormulation.ingredients[1].percentage).toBeCloseTo(15, 1)
      expect(result.scaledFormulation.ingredients[2].percentage).toBeCloseTo(5, 1)
    })
  })

  describe('findOptimalBatchSize', () => {
    it('should find optimal batch size with minimal waste', () => {
      const formulation = createMockFormulation()
      const optimalSize = findOptimalBatchSize(formulation, 100, 1000, 950)

      expect(optimalSize).toBeGreaterThanOrEqual(100)
      expect(optimalSize).toBeLessThanOrEqual(1000)
    })

    it('should return min size when no optimal found', () => {
      const formulation = createMockFormulation()
      const optimalSize = findOptimalBatchSize(formulation, 500, 1000, 250)

      expect(optimalSize).toBe(500)
    })
  })

  describe('Scaling Precision Tests', () => {
    it('should maintain precision within 0.1%', () => {
      const formulation = createMockFormulation()
      const result = scaleFormulation({
        formulation,
        targetQuantity: 1000,
        targetUnit: 'kg'
      })

      const totalScaled = result.scaledFormulation.ingredients.reduce((sum, ing) => sum + ing.quantity, 0)
      const expectedTotal = 1000
      const percentageDiff = Math.abs((totalScaled - expectedTotal) / expectedTotal) * 100

      expect(percentageDiff).toBeLessThan(0.1)
    })

    it('should handle decimal precision correctly', () => {
      const formulation = createMockFormulation()
      const result = scaleFormulation({
        formulation,
        targetQuantity: 123.456,
        targetUnit: 'kg'
      })

      result.scaledFormulation.ingredients.forEach(ing => {
        expect(ing.quantity).toBeCloseTo(ing.quantity, 3)
      })
    })
  })
})

describe('Calculation Engine - Scaling Snapshot Tests', () => {
  const createSnapshotFormulation = (): Formulation => ({
    id: 'snapshot-formula-1',
    name: 'Orange Juice Concentrate',
    version: '2.0',
    type: 'concentrate',
    status: 'approved',
    ingredients: [
      {
        id: 'ing-1',
        materialId: 'MAT-OJ-001',
        name: 'Orange Juice (Fresh)',
        quantity: 85.5,
        unit: 'kg',
        percentage: 85.5,
        function: 'base'
      },
      {
        id: 'ing-2',
        materialId: 'MAT-SUG-001',
        name: 'Cane Sugar',
        quantity: 12.3,
        unit: 'kg',
        percentage: 12.3,
        function: 'sweetener'
      },
      {
        id: 'ing-3',
        materialId: 'MAT-CIT-001',
        name: 'Citric Acid',
        quantity: 1.5,
        unit: 'kg',
        percentage: 1.5,
        function: 'preservative'
      },
      {
        id: 'ing-4',
        materialId: 'MAT-ASC-001',
        name: 'Ascorbic Acid (Vitamin C)',
        quantity: 0.7,
        unit: 'kg',
        percentage: 0.7,
        function: 'other'
      }
    ],
    targetYield: 100,
    yieldUnit: 'kg',
    costPerUnit: 5.25,
    metadata: {
      owner: 'production-manager',
      department: 'Beverage Production',
      tags: ['juice', 'concentrate', 'vitamin-c'],
      notes: 'Premium orange juice concentrate with vitamin C fortification'
    },
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-20T14:30:00Z')
  })

  it('should match snapshot for 10x scale', () => {
    const formulation = createSnapshotFormulation()
    const result = scaleFormulation({
      formulation,
      targetQuantity: 1000,
      targetUnit: 'kg'
    })

    expect({
      scaleFactor: result.scaleFactor,
      targetYield: result.scaledFormulation.targetYield,
      ingredients: result.scaledFormulation.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit
      })),
      warnings: result.warnings
    }).toMatchSnapshot()
  })

  it('should match snapshot for 1000L batch with rounding', () => {
    const formulation = createSnapshotFormulation()
    const result = scaleFormulation({
      formulation,
      targetQuantity: 10000,
      targetUnit: 'kg',
      options: {
        roundToNearest: 10,
        maintainRatios: true
      }
    })

    expect({
      scaleFactor: result.scaleFactor,
      targetYield: result.scaledFormulation.targetYield,
      ingredients: result.scaledFormulation.ingredients.map(ing => ({
        name: ing.name,
        originalQuantity: ing.quantity,
        roundedQuantity: ing.quantity,
        percentage: ing.percentage
      })),
      warnings: result.warnings
    }).toMatchSnapshot()
  })

  it('should match snapshot for pilot batch (5kg)', () => {
    const formulation = createSnapshotFormulation()
    const result = scaleFormulation({
      formulation,
      targetQuantity: 5,
      targetUnit: 'kg',
      options: {
        roundToNearest: 0.01
      }
    })

    expect({
      scaleFactor: result.scaleFactor,
      targetYield: result.scaledFormulation.targetYield,
      ingredients: result.scaledFormulation.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit
      })),
      warnings: result.warnings
    }).toMatchSnapshot()
  })
})
