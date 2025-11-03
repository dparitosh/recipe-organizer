import { describe, it, expect } from 'vitest'
import { calculateYield } from '@/lib/engines/yield'
import { scaleFormulation, convertUnits } from '@/lib/engines/scaling'
import { Formulation } from '@/lib/schemas/formulation'

describe('Calculation Engine - Integration Tests', () => {
  const createProductionFormulation = (): Formulation => ({
    id: 'prod-formula-1',
    name: 'Orange Juice Production',
    version: '2.1',
    type: 'final_product',
    status: 'approved',
    ingredients: [
      {
        id: 'ing-1',
        materialId: 'MAT-OJ-001',
        name: 'Fresh Orange Juice',
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
        name: 'Ascorbic Acid',
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
      tags: ['juice', 'beverage', 'vitamin-enriched'],
      notes: 'Premium orange juice with vitamin C fortification'
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-20')
  })

  describe('End-to-End Production Scaling', () => {
    it('should scale formulation from 100kg to 10,000kg batch', () => {
      const formulation = createProductionFormulation()
      
      const scaledResult = scaleFormulation({
        formulation,
        targetQuantity: 10000,
        targetUnit: 'kg'
      })

      expect(scaledResult.scaleFactor).toBe(100)
      expect(scaledResult.scaledFormulation.targetYield).toBe(10000)
      
      expect(scaledResult.scaledFormulation.ingredients[0].quantity).toBe(8550)
      expect(scaledResult.scaledFormulation.ingredients[1].quantity).toBe(1230)
      expect(scaledResult.scaledFormulation.ingredients[2].quantity).toBe(150)
      expect(scaledResult.scaledFormulation.ingredients[3].quantity).toBe(70)
    })

    it('should scale with rounding to meet plant constraints', () => {
      const formulation = createProductionFormulation()
      
      const scaledResult = scaleFormulation({
        formulation,
        targetQuantity: 1000,
        targetUnit: 'kg',
        options: {
          roundToNearest: 5
        }
      })

      scaledResult.scaledFormulation.ingredients.forEach(ing => {
        const remainder = ing.quantity % 5
        expect(remainder).toBe(0)
      })
    })

    it('should calculate yield after scaling', () => {
      const formulation = createProductionFormulation()
      
      const scaledResult = scaleFormulation({
        formulation,
        targetQuantity: 5000,
        targetUnit: 'kg'
      })

      const yieldResult = calculateYield({
        formulation: scaledResult.scaledFormulation,
        parameters: {
          processLoss: 5.2,
          evaporationRate: 3.1,
          wasteFactor: 1.8
        }
      })

      const expectedActualYield = 5000 - (5000 * 0.052) - (5000 * 0.031) - (5000 * 0.018)
      expect(yieldResult.actualYield).toBeCloseTo(expectedActualYield, 1)
      expect(yieldResult.yieldPercentage).toBeCloseTo(89.9, 1)
    })
  })

  describe('Unit Conversion with Scaling', () => {
    it('should convert between mass units during scaling', () => {
      const formulation = createProductionFormulation()
      
      const scaledResult = scaleFormulation({
        formulation,
        targetQuantity: 5000,
        targetUnit: 'kg'
      })

      const ing1Grams = convertUnits(scaledResult.scaledFormulation.ingredients[0].quantity, 'kg', 'g')
      expect(ing1Grams).toBe(427500)

      const ing1Pounds = convertUnits(scaledResult.scaledFormulation.ingredients[0].quantity, 'kg', 'lb')
      expect(ing1Pounds).toBeCloseTo(942.47, 1)
    })

    it('should convert volume units correctly', () => {
      const volumeInLiters = 1000
      const volumeInMl = convertUnits(volumeInLiters, 'L', 'ml')
      const volumeInGallons = convertUnits(volumeInLiters, 'L', 'gal')

      expect(volumeInMl).toBe(1000000)
      expect(volumeInGallons).toBeCloseTo(264.172, 2)
    })
  })

  describe('Complex Yield Chain Scenarios', () => {
    it('should calculate cumulative yield through multiple operations', () => {
      const formulation = createProductionFormulation()

      const operation1 = calculateYield({
        formulation,
        parameters: { processLoss: 5 }
      })

      formulation.targetYield = operation1.actualYield
      const operation2 = calculateYield({
        formulation,
        parameters: { evaporationRate: 8 }
      })

      formulation.targetYield = operation2.actualYield
      const operation3 = calculateYield({
        formulation,
        parameters: { wasteFactor: 2 }
      })

      const overallYield = (operation3.actualYield / 100) * 100
      expect(overallYield).toBeLessThan(100)
      expect(overallYield).toBeGreaterThan(80)
    })

    it('should maintain precision across multiple scaling operations', () => {
      let formulation = createProductionFormulation()

      const scale1 = scaleFormulation({
        formulation,
        targetQuantity: 1000,
        targetUnit: 'kg'
      })

      const scale2 = scaleFormulation({
        formulation: scale1.scaledFormulation,
        targetQuantity: 500,
        targetUnit: 'kg'
      })

      const scale3 = scaleFormulation({
        formulation: scale2.scaledFormulation,
        targetQuantity: 1000,
        targetUnit: 'kg'
      })

      scale3.scaledFormulation.ingredients.forEach((ing, idx) => {
        const originalScaled = scale1.scaledFormulation.ingredients[idx].quantity
        const finalScaled = ing.quantity
        const percentDiff = Math.abs((finalScaled - originalScaled) / originalScaled) * 100
        expect(percentDiff).toBeLessThan(0.1)
      })
    })
  })

  describe('Production Scenario Snapshot Tests', () => {
    it('should match snapshot for 1000L production batch with losses', () => {
      const formulation = createProductionFormulation()
      
      const scaledResult = scaleFormulation({
        formulation,
        targetQuantity: 1000,
        targetUnit: 'kg',
        options: {
          roundToNearest: 1,
          maintainRatios: true
        }
      })

      const yieldResult = calculateYield({
        formulation: scaledResult.scaledFormulation,
        parameters: {
          processLoss: 4.5,
          evaporationRate: 2.8,
          wasteFactor: 1.2
        }
      })

      expect({
        batch: {
          targetQuantity: scaledResult.scaledFormulation.targetYield,
          scaleFactor: scaledResult.scaleFactor
        },
        ingredients: scaledResult.scaledFormulation.ingredients.map(ing => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          percentage: ing.percentage
        })),
        yield: {
          theoreticalYield: yieldResult.theoreticalYield,
          actualYield: yieldResult.actualYield,
          yieldPercentage: yieldResult.yieldPercentage,
          totalLoss: yieldResult.lossBreakdown.total
        },
        warnings: [...scaledResult.warnings, ...yieldResult.warnings]
      }).toMatchSnapshot()
    })

    it('should match snapshot for 10,000L industrial batch', () => {
      const formulation = createProductionFormulation()
      
      const scaledResult = scaleFormulation({
        formulation,
        targetQuantity: 10000,
        targetUnit: 'kg',
        options: {
          roundToNearest: 10,
          maintainRatios: true
        }
      })

      const yieldResult = calculateYield({
        formulation: scaledResult.scaledFormulation,
        parameters: {
          processLoss: 3.2,
          evaporationRate: 1.8,
          wasteFactor: 0.9
        }
      })

      expect({
        batch: {
          targetQuantity: scaledResult.scaledFormulation.targetYield,
          scaleFactor: scaledResult.scaleFactor
        },
        ingredients: scaledResult.scaledFormulation.ingredients.map(ing => ({
          name: ing.name,
          quantity: ing.quantity,
          roundedQuantity: Math.round(ing.quantity / 10) * 10
        })),
        yield: {
          actualYield: yieldResult.actualYield,
          yieldPercentage: yieldResult.yieldPercentage,
          lossBreakdown: yieldResult.lossBreakdown
        }
      }).toMatchSnapshot()
    })

    it('should match snapshot for pilot batch with high precision', () => {
      const formulation = createProductionFormulation()
      
      const scaledResult = scaleFormulation({
        formulation,
        targetQuantity: 5,
        targetUnit: 'kg',
        options: {
          roundToNearest: 0.001
        }
      })

      const yieldResult = calculateYield({
        formulation: scaledResult.scaledFormulation,
        parameters: {
          processLoss: 8.5,
          evaporationRate: 4.2
        }
      })

      expect({
        batch: {
          targetQuantity: scaledResult.scaledFormulation.targetYield,
          scaleFactor: scaledResult.scaleFactor
        },
        ingredients: scaledResult.scaledFormulation.ingredients.map(ing => ({
          name: ing.name,
          quantity: Number(ing.quantity.toFixed(3)),
          unit: ing.unit
        })),
        yield: {
          actualYield: Number(yieldResult.actualYield.toFixed(3)),
          yieldPercentage: Number(yieldResult.yieldPercentage.toFixed(2)),
          warnings: yieldResult.warnings
        },
        scalingWarnings: scaledResult.warnings
      }).toMatchSnapshot()
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle very large scale factors', () => {
      const formulation = createProductionFormulation()
      
      const scaledResult = scaleFormulation({
        formulation,
        targetQuantity: 100000,
        targetUnit: 'kg'
      })

      expect(scaledResult.scaleFactor).toBe(1000)
      expect(scaledResult.warnings).toContain('Scale factor very large (>100) - consider batch production')
    })

    it('should handle very small scale factors', () => {
      const formulation = createProductionFormulation()
      
      const scaledResult = scaleFormulation({
        formulation,
        targetQuantity: 1,
        targetUnit: 'kg'
      })

      expect(scaledResult.scaleFactor).toBe(0.01)
      expect(scaledResult.warnings).toContain('Scale factor very small (<0.1) - accuracy may be compromised')
    })

    it('should handle extreme yield losses', () => {
      const formulation = createProductionFormulation()
      
      const yieldResult = calculateYield({
        formulation,
        parameters: {
          processLoss: 30,
          evaporationRate: 15,
          wasteFactor: 10
        }
      })

      expect(yieldResult.yieldPercentage).toBeLessThan(60)
      expect(yieldResult.warnings.length).toBeGreaterThan(0)
      expect(yieldResult.warnings.some(w => w.includes('high waste'))).toBe(true)
    })

    it('should maintain accuracy with minimal losses', () => {
      const formulation = createProductionFormulation()
      
      const yieldResult = calculateYield({
        formulation,
        parameters: {
          processLoss: 0.5,
          evaporationRate: 0.3
        }
      })

      expect(yieldResult.yieldPercentage).toBeGreaterThan(99)
      expect(yieldResult.warnings).toHaveLength(0)
    })
  })
})
