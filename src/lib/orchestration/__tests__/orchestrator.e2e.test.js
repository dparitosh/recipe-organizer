import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AgentOrchestrator } from '../orchestrator.js'

const baseRecipe = {
  id: 'recipe-001',
  name: 'Matcha Functional Beverage',
  description: 'Functional beverage concept for testing',
  ingredients: [
    { id: 'ing-1', name: 'Purified Water', percentage: 88, function: 'base', category: 'water' },
    { id: 'ing-2', name: 'Matcha Extract', percentage: 7, function: 'flavor', category: 'botanical' },
    { id: 'ing-3', name: 'Cane Sugar', percentage: 5, function: 'sweetener', category: 'sweetener' },
  ],
  totalPercentage: 100,
  metadata: {
    version: '1.0',
    author: 'Recipe Engineer Agent',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
}

const baseCalculation = {
  recipeId: baseRecipe.id,
  recipeName: baseRecipe.name,
  targetBatchSize: 1000,
  targetUnit: 'kg',
  scaledIngredients: [
    {
      id: 'ing-1',
      name: 'Purified Water',
      originalPercentage: 88,
      scaledQuantity: 880,
      scaledUnit: 'kg',
      volumeEquivalent: 880,
      cost: 200,
      density: 1,
    },
    {
      id: 'ing-2',
      name: 'Matcha Extract',
      originalPercentage: 7,
      scaledQuantity: 70,
      scaledUnit: 'kg',
      volumeEquivalent: 65,
      cost: 1500,
      density: 0.93,
    },
    {
      id: 'ing-3',
      name: 'Cane Sugar',
      originalPercentage: 5,
      scaledQuantity: 50,
      scaledUnit: 'kg',
      volumeEquivalent: 34,
      cost: 120,
      density: 1.45,
    },
  ],
  costs: {
    rawMaterials: 1820,
    labor: 180,
    overhead: 120,
    packaging: 50,
    total: 2170,
    perUnit: 2.17,
  },
  yield: {
    theoretical: 1000,
    actual: 950,
    percentage: 95,
    losses: [
      { step: 'processing', amount: 30, reason: 'evaporation' },
      { step: 'transfer', amount: 20, reason: 'line retention' },
    ],
  },
  timestamp: '2025-01-01T00:00:00.000Z',
}

const baseGraph = {
  nodes: [
    { id: 'node-1', label: baseRecipe.name, type: 'formulation', properties: { category: 'beverage' } },
    { id: 'node-2', label: 'Purified Water', type: 'ingredient', properties: { percentage: 88 } },
    { id: 'node-3', label: 'Matcha Extract', type: 'ingredient', properties: { percentage: 7 } },
  ],
  edges: [
    { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'CONTAINS', properties: { percentage: 88 } },
    { id: 'edge-2', source: 'node-1', target: 'node-3', type: 'CONTAINS', properties: { percentage: 7 } },
  ],
  cypherCommands: ['// cypher commands omitted for brevity'],
  metadata: {
    nodeCount: 3,
    edgeCount: 2,
    graphComplexity: 'low',
  },
}

const baseValidation = {
  valid: true,
  errors: [],
  warnings: [],
  checks: {
    recipePercentageValid: true,
    costPositive: true,
    yieldRealistic: true,
    graphIntegrity: true,
    dataConsistency: true,
  },
  summary: {
    totalChecks: 5,
    passed: 5,
    failed: 0,
    score: 1,
  },
  timestamp: '2025-01-01T00:00:00.000Z',
}

const baseUiConfig = {
  layout: 'single-column',
  components: [
    {
      type: 'card',
      title: 'Recipe Summary',
      data: {
        name: baseRecipe.name,
        totalPercentage: baseRecipe.totalPercentage,
      },
      position: { row: 1, col: 1 },
      config: {
        showLegend: false,
      },
    },
    {
      type: 'table',
      title: 'Scaled Ingredients',
      data: baseCalculation.scaledIngredients,
      position: { row: 2, col: 1 },
      config: {
        columns: [
          { key: 'name', label: 'Ingredient' },
          { key: 'scaledQuantity', label: 'Quantity (kg)' },
          { key: 'cost', label: 'Cost', format: 'currency' },
        ],
      },
    },
  ],
  theme: {
    primaryColor: '#356859',
    accentColor: '#FD5523',
    spacing: 'standard',
  },
}

const baseConfig = {
  userRequest: 'Create a matcha functional beverage',
  targetBatchSize: 1000,
  targetUnit: 'kg',
  includeCosts: true,
  includeNutrients: true,
  context: {
    costMap: { 'Matcha Extract': 20 },
    densityMap: { 'Purified Water': 1 },
  },
}

describe('AgentOrchestrator end-to-end flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a validated orchestration result when all agents succeed', async () => {
    const orchestrator = new AgentOrchestrator()

    vi.spyOn(orchestrator.recipeEngineer, 'execute').mockResolvedValue({
      recipe: baseRecipe,
      reasoning: 'Recipe reasoning',
      alternatives: ['Alt formulation'],
    })

    vi.spyOn(orchestrator.scalingCalculator, 'execute').mockResolvedValue({
      calculation: baseCalculation,
      warnings: [],
      optimizations: [],
    })

    vi.spyOn(orchestrator.graphBuilder, 'execute').mockResolvedValue({
      graph: baseGraph,
      svg: '<svg></svg>',
      metrics: { density: 'low' },
    })

    vi.spyOn(orchestrator.qaValidator, 'execute').mockResolvedValue({
      validation: baseValidation,
      canProceed: true,
      criticalErrors: [],
      improvementAreas: [],
    })

    vi.spyOn(orchestrator.uiDesigner, 'execute').mockResolvedValue({
      uiConfig: baseUiConfig,
    })

    const result = await orchestrator.orchestrate(baseConfig)

    expect(result.status).toBe('success')
    expect(result.recipe).toEqual(baseRecipe)
    expect(result.calculation).toEqual(baseCalculation)
    expect(result.graph).toEqual(baseGraph)
    expect(result.validation).toEqual(baseValidation)
    expect(result.uiConfig).toEqual(baseUiConfig)
    expect(result.agentHistory).toHaveLength(5)
    expect(result.agentHistory.every((entry) => entry.status === 'success')).toBe(true)
  })

  it('returns a failed orchestration summary when a downstream agent throws', async () => {
    const orchestrator = new AgentOrchestrator()

    vi.spyOn(orchestrator.recipeEngineer, 'execute').mockResolvedValue({
      recipe: baseRecipe,
      reasoning: 'Recipe reasoning',
      alternatives: [],
    })

    vi.spyOn(orchestrator.scalingCalculator, 'execute').mockRejectedValue(new Error('Scaling service unavailable'))

    const result = await orchestrator.orchestrate(baseConfig)

    expect(result.status).toBe('failed')
    expect(result.validation.valid).toBe(false)
    expect(result.agentHistory).toHaveLength(2)
    expect(result.agentHistory[0].status).toBe('success')
    expect(result.agentHistory[1].status).toBe('failed')
    expect(result.agentHistory[1].error).toBe('Scaling service unavailable')
  })
})
