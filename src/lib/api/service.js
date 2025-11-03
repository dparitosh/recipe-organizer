const MOCK_DATA = {
  formulations: [
    {
      id: 'f1',
      name: 'Classic Potato Chips',
      version: '1.0',
      type: 'recipe',
      status: 'approved',
      targetYield: 100,
      yieldUnit: 'kg',
      createdBy: 'demo-user',
      ingredients: [
        { id: 'i1', name: 'Potato Slices', quantity: 70, unit: 'kg', percentage: 70, function: 'base' },
        { id: 'i2', name: 'Palm Oil', quantity: 25, unit: 'kg', percentage: 25, function: 'frying' },
        { id: 'i3', name: 'Salt', quantity: 3, unit: 'kg', percentage: 3, function: 'seasoning' },
        { id: 'i4', name: 'Natural Antioxidant', quantity: 2, unit: 'kg', percentage: 2, function: 'preservative' },
      ],
    },
    {
      id: 'f2',
      name: 'Orange Juice Concentrate',
      version: '2.1',
      type: 'beverage',
      status: 'approved',
      targetYield: 1000,
      yieldUnit: 'L',
      createdBy: 'demo-user',
      ingredients: [
        { id: 'i5', name: 'Orange Concentrate', quantity: 200, unit: 'L', percentage: 20, function: 'base' },
        { id: 'i6', name: 'Water', quantity: 750, unit: 'L', percentage: 75, function: 'base' },
        { id: 'i7', name: 'Sugar', quantity: 40, unit: 'kg', percentage: 4, function: 'sweetener' },
        { id: 'i8', name: 'Vitamin C', quantity: 10, unit: 'kg', percentage: 1, function: 'fortification' },
      ],
    },
  ],
  graph: {
    nodes: [
      { id: 'f1', labels: ['Formulation'], properties: { name: 'Classic Potato Chips', version: '1.0', status: 'approved' } },
      { id: 'f2', labels: ['Formulation'], properties: { name: 'Orange Juice Concentrate', version: '2.1', status: 'approved' } },
      { id: 'p1', labels: ['Food'], properties: { name: 'Potato Slices', fdcId: '170026' } },
      { id: 'p2', labels: ['Food'], properties: { name: 'Palm Oil', fdcId: '171028' } },
      { id: 'p3', labels: ['Food'], properties: { name: 'Salt', fdcId: '172047' } },
      { id: 'o1', labels: ['Food'], properties: { name: 'Orange Concentrate', fdcId: '173944' } },
      { id: 'w1', labels: ['Food'], properties: { name: 'Water', fdcId: '171881' } },
      { id: 'n1', labels: ['Nutrient'], properties: { name: 'Carbohydrates', amount: 15, unit: 'g' } },
      { id: 'n2', labels: ['Nutrient'], properties: { name: 'Protein', amount: 2, unit: 'g' } },
      { id: 'n3', labels: ['Nutrient'], properties: { name: 'Fat', amount: 35, unit: 'g' } },
      { id: 'n4', labels: ['Nutrient'], properties: { name: 'Vitamin C', amount: 45, unit: 'mg' } },
    ],
    relationships: [
      { id: 'r1', type: 'CONTAINS', startNode: 'f1', endNode: 'p1' },
      { id: 'r2', type: 'CONTAINS', startNode: 'f1', endNode: 'p2' },
      { id: 'r3', type: 'CONTAINS', startNode: 'f1', endNode: 'p3' },
      { id: 'r4', type: 'CONTAINS', startNode: 'f2', endNode: 'o1' },
      { id: 'r5', type: 'CONTAINS', startNode: 'f2', endNode: 'w1' },
      { id: 'r6', type: 'HAS_NUTRIENT', startNode: 'p1', endNode: 'n1' },
      { id: 'r7', type: 'HAS_NUTRIENT', startNode: 'p1', endNode: 'n2' },
      { id: 'r8', type: 'HAS_NUTRIENT', startNode: 'p2', endNode: 'n3' },
      { id: 'r9', type: 'HAS_NUTRIENT', startNode: 'o1', endNode: 'n4' },
    ],
  },
  fdcSearchResults: [
    { fdcId: 170026, description: 'Potato, raw' },
    { fdcId: 171028, description: 'Oil, palm' },
    { fdcId: 172047, description: 'Salt, table' },
  ],
}

class APIService {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl
    this.useMockData = false
  }

  setBaseUrl(url) {
    this.baseUrl = url
  }

  async request(endpoint, options) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(error.detail || `HTTP ${response.status}`)
      }

      this.useMockData = false
      return response.json()
    } catch (error) {
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        this.useMockData = true
        return this.getMockResponse(endpoint, options)
      }
      throw error
    }
  }

  getMockResponse(endpoint, options) {
    if (endpoint === '/health') {
      return Promise.resolve({ status: 'ok', mode: 'mock' })
    }

    if (endpoint === '/api/graph') {
      return Promise.resolve(MOCK_DATA.graph)
    }

    if (endpoint === '/api/formulations') {
      if (options?.method === 'POST') {
        const newFormulation = JSON.parse(options.body)
        newFormulation.id = `f${Date.now()}`
        MOCK_DATA.formulations.push(newFormulation)
        return Promise.resolve(newFormulation)
      }
      return Promise.resolve(MOCK_DATA.formulations)
    }

    if (endpoint.startsWith('/api/formulations/')) {
      const id = endpoint.split('/')[3]
      if (options?.method === 'DELETE') {
        const index = MOCK_DATA.formulations.findIndex(f => f.id === id)
        if (index !== -1) {
          MOCK_DATA.formulations.splice(index, 1)
        }
        return Promise.resolve({ success: true })
      }
      const formulation = MOCK_DATA.formulations.find(f => f.id === id)
      return Promise.resolve(formulation || null)
    }

    if (endpoint.startsWith('/api/fdc/search')) {
      return Promise.resolve(MOCK_DATA.fdcSearchResults)
    }

    if (endpoint.startsWith('/api/fdc/ingest')) {
      return Promise.resolve({ success: true, message: 'Data ingested (mock)' })
    }

    if (endpoint === '/api/database/clear') {
      MOCK_DATA.formulations = []
      MOCK_DATA.graph = { nodes: [], relationships: [] }
      return Promise.resolve({ success: true, message: 'Database cleared (mock)' })
    }

    if (endpoint === '/api/database/sample') {
      return Promise.resolve({ 
        success: true, 
        message: 'Sample data loaded (mock)',
        stats: {
          nodes: MOCK_DATA.graph.nodes.length,
          relationships: MOCK_DATA.graph.relationships.length,
        }
      })
    }

    return Promise.resolve({ message: 'Mock endpoint not implemented' })
  }

  async getHealth() {
    return this.request('/health')
  }

  async getGraph() {
    return this.request('/api/graph')
  }

  async getFormulations() {
    return this.request('/api/formulations')
  }

  async getFormulation(id) {
    return this.request(`/api/formulations/${id}`)
  }

  async createFormulation(formulation) {
    return this.request('/api/formulations', {
      method: 'POST',
      body: JSON.stringify(formulation),
    })
  }

  async updateFormulation(id, formulation) {
    return this.request(`/api/formulations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(formulation),
    })
  }

  async deleteFormulation(id) {
    return this.request(`/api/formulations/${id}`, {
      method: 'DELETE',
    })
  }

  async searchFDC(query) {
    return this.request(`/api/fdc/search?q=${encodeURIComponent(query)}`)
  }

  async ingestFDC(fdcId) {
    return this.request(`/api/fdc/ingest/${fdcId}`, {
      method: 'POST',
    })
  }

  async clearDatabase() {
    return this.request('/api/database/clear', {
      method: 'POST',
    })
  }

  async loadSampleData() {
    return this.request('/api/database/sample', {
      method: 'POST',
    })
  }
}

export const apiService = new APIService()
