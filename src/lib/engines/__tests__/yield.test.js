import { describe, it, expect } from 'vitest'
import {
  calculateYield,
  calculateProcessYield,
  optimizeYield,
  compareYields,
} from '@/lib/engines/yield.js'

/**
 * @typedef {import('@/lib/schemas/formulation.js').Formulation} Formulation
 * @typedef {import('@/lib/schemas/bom.js').ProcessStep} ProcessStep
 */

/**
 * Provide a minimal formulation for yield-focused tests.
 * @returns {Formulation}
 */
const createMockFormulation = () => ({
  id: 'test-formula-yield',
  name: 'Test Beverage',
  version: '1.0',
  type: 'final_product',
  status: 'approved',
  ingredients: [
    {
      id: 'ing-1',
      materialId: 'MAT-001',
      name: 'Water',
      quantity: 90,
      unit: 'kg',
      percentage: 90,
      function: 'base',
    },
    {
      id: 'ing-2',
      materialId: 'MAT-002',
      name: 'Concentrate',
      quantity: 10,
      unit: 'kg',
      percentage: 10,
      function: 'flavor',
    },
  ],
  targetYield: 100,
  yieldUnit: 'kg',
  costPerUnit: 0,
  metadata: {
    owner: 'test-user',
    department: 'Production',
    tags: [],
    notes: '',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('Calculation Engine - Yield Calculations', () => {
  describe('calculateYield', () => {
    it('should calculate yield with no losses', () => {
      const formulation = createMockFormulation()
      const result = calculateYield({
        formulation,
        parameters: {},
      })

      expect(result.theoreticalYield).toBe(100)
      expect(result.actualYield).toBe(100)
      expect(result.yieldPercentage).toBe(100)
      expect(result.lossBreakdown.total).toBe(0)
    })

    it('should calculate yield with process loss', () => {
      const formulation = createMockFormulation()
      const result = calculateYield({
        formulation,
        parameters: { processLoss: 5 },
      })

      expect(result.actualYield).toBe(95)
      expect(result.yieldPercentage).toBe(95)
      expect(result.lossBreakdown.processLoss).toBe(5)
      expect(result.lossBreakdown.total).toBe(5)
    })

    it('should calculate yield with multiple loss factors', () => {
      const formulation = createMockFormulation()
      const result = calculateYield({
        formulation,
        parameters: {
          processLoss: 5,
          evaporationRate: 3,
          wasteFactor: 2,
        },
      })

      expect(result.actualYield).toBe(90)
      expect(result.yieldPercentage).toBe(90)
      expect(result.lossBreakdown.processLoss).toBe(5)
      expect(result.lossBreakdown.evaporationLoss).toBe(3)
      expect(result.lossBreakdown.waste).toBe(2)
      expect(result.lossBreakdown.total).toBe(10)
    })

    it('should calculate yield with moisture loss', () => {
      const formulation = createMockFormulation()
      const result = calculateYield({
        formulation,
        parameters: { moistureContent: 15 },
      })

      expect(result.actualYield).toBe(85)
      expect(result.yieldPercentage).toBe(85)
      expect(result.lossBreakdown.moistureLoss).toBe(15)
    })

    it('should warn when yield is below 80%', () => {
      const formulation = createMockFormulation()
      const result = calculateYield({
        formulation,
        parameters: {
          processLoss: 15,
          evaporationRate: 10,
        },
      })

      expect(result.yieldPercentage).toBe(75)
      expect(result.warnings).toContain('Yield is below 80% - consider reviewing process efficiency')
    })

    it('should warn when total losses exceed 25%', () => {
      const formulation = createMockFormulation()
      const result = calculateYield({
        formulation,
        parameters: {
          processLoss: 20,
          wasteFactor: 10,
        },
      })

      expect(result.warnings).toContain('Total losses exceed 25% - high waste detected')
    })

    it('should validate yield percentage is between 0 and 100', () => {
      const formulation = createMockFormulation()
      const result = calculateYield({
        formulation,
        parameters: { processLoss: 10 },
      })

      expect(result.yieldPercentage).toBeGreaterThan(0)
      expect(result.yieldPercentage).toBeLessThanOrEqual(100)
    })
  })

  describe('calculateProcessYield', () => {
    it('should calculate yield through single process step', () => {
      /** @type {ProcessStep[]} */
      const steps = [
        {
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
            unit: 'kg',
          },
        },
      ]

      const result = calculateProcessYield(steps, 100)
      expect(result).toBe(98)
    })

    it('should calculate yield through multiple process steps', () => {
      /** @type {ProcessStep[]} */
      const steps = [
        {
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
            unit: 'kg',
          },
        },
        {
          id: 'step-2',
          order: 2,
          name: 'Heating',
          description: 'Heat to 85°C',
          duration: 45,
          durationUnit: 'minutes',
          temperature: 85,
          temperatureUnit: 'C',
          parameters: {},
          yields: {
            input: 98,
            output: 95,
            unit: 'kg',
          },
        },
        {
          id: 'step-3',
          order: 3,
          name: 'Cooling',
          description: 'Cool to 25°C',
          duration: 60,
          durationUnit: 'minutes',
          temperature: 25,
          temperatureUnit: 'C',
          parameters: {},
          yields: {
            input: 95,
            output: 94,
            unit: 'kg',
          },
        },
      ]

      const result = calculateProcessYield(steps, 100)
      expect(result).toBeCloseTo(94, 2)
    })

    it('should handle steps without yield data', () => {
      /** @type {ProcessStep[]} */
      const steps = [
        {
          id: 'step-1',
          order: 1,
          name: 'Inspection',
          description: 'Visual inspection',
          duration: 10,
          durationUnit: 'minutes',
          parameters: {},
        },
      ]

      const result = calculateProcessYield(steps, 100)
      expect(result).toBe(100)
    })

    it('should calculate cumulative yield correctly', () => {
      /** @type {ProcessStep[]} */
      const steps = [
        {
          id: 'step-1',
          order: 1,
          name: 'Step 1',
          description: 'First step',
          duration: 10,
          durationUnit: 'minutes',
          parameters: {},
          yields: {
            input: 100,
            output: 90,
            unit: 'kg',
          },
        },
        {
          id: 'step-2',
          order: 2,
          name: 'Step 2',
          description: 'Second step',
          duration: 10,
          durationUnit: 'minutes',
          parameters: {},
          yields: {
            input: 90,
            output: 85,
            unit: 'kg',
          },
        },
      ]

      const result = calculateProcessYield(steps, 100)
      const expectedYield = 100 * (90 / 100) * (85 / 90)
      expect(result).toBeCloseTo(expectedYield, 2)
    })
  })

  describe('optimizeYield', () => {
    it('should optimize ingredients for target yield', () => {
      const formulation = createMockFormulation()
      const optimized = optimizeYield(formulation, 150)

      const total = optimized.reduce((sum, ing) => sum + ing.quantity, 0)
      expect(total).toBeCloseTo(150, 2)
    })

    it('should maintain ingredient ratios when optimizing', () => {
      const formulation = createMockFormulation()
      const optimized = optimizeYield(formulation, 200)

      const waterPercentage = (optimized[0].quantity / 200) * 100
      const concentratePercentage = (optimized[1].quantity / 200) * 100

      expect(waterPercentage).toBeCloseTo(90, 1)
      expect(concentratePercentage).toBeCloseTo(10, 1)
    })
  })

  describe('compareYields', () => {
    it('should identify best and worst yields', () => {
      const formulation = createMockFormulation()

      const results = [
        calculateYield({ formulation, parameters: { processLoss: 5 } }),
        calculateYield({ formulation, parameters: { processLoss: 10 } }),
        calculateYield({ formulation, parameters: { processLoss: 15 } }),
      ]

      const comparison = compareYields(results)

      expect(comparison.best?.yieldPercentage).toBe(95)
      expect(comparison.worst?.yieldPercentage).toBe(85)
      expect(comparison.average).toBe(90)
    })

    it('should calculate variance correctly', () => {
      const formulation = createMockFormulation()

      const results = [
        calculateYield({ formulation, parameters: { processLoss: 0 } }),
        calculateYield({ formulation, parameters: { processLoss: 10 } }),
        calculateYield({ formulation, parameters: { processLoss: 20 } }),
      ]

      const comparison = compareYields(results)

      expect(comparison.variance).toBeGreaterThan(0)
    })

    it('should handle empty results array', () => {
      const comparison = compareYields([])

      expect(comparison.best).toBeNull()
      expect(comparison.worst).toBeNull()
      expect(comparison.average).toBe(0)
      expect(comparison.variance).toBe(0)
    })

    it('should handle single result', () => {
      const formulation = createMockFormulation()
      const results = [calculateYield({ formulation, parameters: { processLoss: 5 } })]

      const comparison = compareYields(results)

      expect(comparison.best).toEqual(results[0])
      expect(comparison.worst).toEqual(results[0])
      expect(comparison.average).toBe(95)
      expect(comparison.variance).toBe(0)
    })
  })

  describe('Yield Chain Correctness', () => {
    it('should validate yield percentage is numeric between 0-100', () => {
      const formulation = createMockFormulation()
      const result = calculateYield({
        formulation,
        parameters: {
          processLoss: 10,
          evaporationRate: 5,
        },
      })

      expect(typeof result.yieldPercentage).toBe('number')
      expect(result.yieldPercentage).toBeGreaterThanOrEqual(0)
      expect(result.yieldPercentage).toBeLessThanOrEqual(100)
      expect(Number.isFinite(result.yieldPercentage)).toBe(true)
    })

    it('should validate yield at 60% threshold', () => {
      const formulation = createMockFormulation()
      const result = calculateYield({
        formulation,
        parameters: {
          processLoss: 25,
          evaporationRate: 15,
          wasteFactor: 5,
        },
      })

      if (result.yieldPercentage < 60) {
        expect(result.warnings.length).toBeGreaterThan(0)
      }
    })

    it('should validate yield at 80% threshold', () => {
      const formulation = createMockFormulation()
      const result = calculateYield({
        formulation,
        parameters: { processLoss: 25 },
      })

      expect(result.yieldPercentage).toBe(75)
      expect(result.warnings).toContain('Yield is below 80% - consider reviewing process efficiency')
    })
  })
})

describe('Yield Calculation - Snapshot Tests', () => {
  /**
   * @returns {Formulation}
   */
  const createComplexFormulation = () => ({
    id: 'complex-formula-1',
    name: 'Potato Chips Production',
    version: '3.0',
    type: 'final_product',
    status: 'approved',
    ingredients: [
      {
        id: 'ing-1',
        materialId: 'MAT-POT-001',
        name: 'Fresh Potatoes',
        quantity: 200,
        unit: 'kg',
        percentage: 70,
        function: 'base',
      },
      {
        id: 'ing-2',
        materialId: 'MAT-OIL-001',
        name: 'Palm Oil',
        quantity: 60,
        unit: 'kg',
        percentage: 21,
        function: 'other',
      },
      {
        id: 'ing-3',
        materialId: 'MAT-SAL-001',
        name: 'Salt',
        quantity: 15,
        unit: 'kg',
        percentage: 5.25,
        function: 'flavor',
      },
      {
        id: 'ing-4',
        materialId: 'MAT-SEA-001',
        name: 'Seasonings',
        quantity: 11,
        unit: 'kg',
        percentage: 3.85,
        function: 'flavor',
      },
    ],
    targetYield: 286,
    yieldUnit: 'kg',
    costPerUnit: 3.5,
    metadata: {
      owner: 'production-lead',
      department: 'Snacks Manufacturing',
      tags: ['chips', 'snacks', 'fried'],
      notes: 'Standard potato chip production with high-yield process',
    },
    createdAt: new Date('2024-02-01T08:00:00Z'),
    updatedAt: new Date('2024-02-15T16:45:00Z'),
  })

  it('should match snapshot for complex yield calculation with multiple losses', () => {
    const formulation = createComplexFormulation()
    const result = calculateYield({
      formulation,
      parameters: {
        processLoss: 8.5,
        moistureContent: 12.3,
        evaporationRate: 5.2,
        wasteFactor: 3.1,
      },
    })

    expect({
      theoreticalYield: result.theoreticalYield,
      actualYield: result.actualYield,
      yieldPercentage: result.yieldPercentage,
      lossBreakdown: result.lossBreakdown,
      unit: result.unit,
      warnings: result.warnings,
    }).toMatchSnapshot()
  })

  it('should match snapshot for high-efficiency process', () => {
    const formulation = createComplexFormulation()
    const result = calculateYield({
      formulation,
      parameters: {
        processLoss: 2.1,
        evaporationRate: 1.5,
      },
    })

    expect({
      yieldPercentage: result.yieldPercentage,
      actualYield: result.actualYield,
      lossBreakdown: result.lossBreakdown,
      warnings: result.warnings,
    }).toMatchSnapshot()
  })

  it('should match snapshot for low-yield warning scenario', () => {
    const formulation = createComplexFormulation()
    const result = calculateYield({
      formulation,
      parameters: {
        processLoss: 18,
        moistureContent: 10,
        wasteFactor: 5,
      },
    })

    expect({
      yieldPercentage: result.yieldPercentage,
      lossBreakdown: result.lossBreakdown,
      warnings: result.warnings,
    }).toMatchSnapshot()
  })
})
