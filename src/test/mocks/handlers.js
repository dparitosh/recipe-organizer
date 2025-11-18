// Mock API handlers for MSW (Mock Service Worker)
export const mockOrchestrationRuns = [
  {
    runId: 'orch_test123',
    status: 'success',
    timestamp: '2025-11-18T10:30:00Z',
    totalDuration: 45.2,
    recipeName: 'Sports Drink v1',
    agentCount: 5,
    successCount: 5,
  },
  {
    runId: 'orch_test456',
    status: 'partial',
    timestamp: '2025-11-17T15:20:00Z',
    totalDuration: 52.8,
    recipeName: 'Protein Bar v2',
    agentCount: 5,
    successCount: 4,
  },
  {
    runId: 'orch_test789',
    status: 'failed',
    timestamp: '2025-11-16T09:45:00Z',
    totalDuration: 12.3,
    recipeName: 'Energy Gel v1',
    agentCount: 5,
    successCount: 2,
  },
]

export const mockOrchestrationRunDetail = {
  run: {
    runId: 'orch_test123',
    status: 'success',
    timestamp: '2025-11-18T10:30:00Z',
    totalDuration: 45.2,
  },
  recipe: {
    name: 'Sports Drink v1',
    ingredients: [
      { name: 'Water', percentage: 85.0 },
      { name: 'Sugar', percentage: 10.0 },
      { name: 'Salt', percentage: 5.0 },
    ],
  },
  calculation: {
    scalingFactor: 5.0,
    targetBatchSize: 500.0,
  },
  graphSnapshot: {
    nodes: [
      { id: '1', label: 'Formulation', type: 'Formulation', properties: {} },
      { id: '2', label: 'Water', type: 'Ingredient', properties: {} },
    ],
    edges: [
      { id: 'e1', source: '1', target: '2', type: 'CONTAINS' },
    ],
  },
  validation: {
    overallStatus: 'pass',
    errors: [],
    warnings: [],
  },
  uiConfig: {
    theme: { primary: '#0ea5e9', secondary: '#64748b' },
    layout: { type: 'grid' },
    components: [
      { type: 'Card', title: 'Overview' },
    ],
  },
  agents: [
    {
      sequence: 1,
      agentName: 'Recipe Engineer',
      status: 'success',
      duration: 8.3,
    },
  ],
}

export const mockNutritionLabels = [
  {
    labelId: 'nutr_test123',
    formulationId: 'form_123',
    version: 2,
    servingSize: 100.0,
    servingSizeUnit: 'g',
    servingsPerContainer: 10,
    calories: 250.0,
    nutrients: {
      total_fat: { name: 'Total Fat', amount: 5.0, unit: 'g' },
      protein: { name: 'Protein', amount: 10.0, unit: 'g' },
    },
    generatedAt: '2025-11-18T15:30:00Z',
    generatedBy: 'system',
  },
  {
    labelId: 'nutr_test456',
    formulationId: 'form_123',
    version: 1,
    servingSize: 100.0,
    servingSizeUnit: 'g',
    servingsPerContainer: 10,
    calories: 245.0,
    nutrients: {
      total_fat: { name: 'Total Fat', amount: 4.5, unit: 'g' },
      protein: { name: 'Protein', amount: 9.5, unit: 'g' },
    },
    generatedAt: '2025-11-17T10:15:00Z',
    generatedBy: 'system',
  },
]
