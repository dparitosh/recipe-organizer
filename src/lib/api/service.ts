export interface GraphNode {
  id: string
  labels: string[]
  properties: Record<string, any>
}

export interface GraphRelationship {
  id: string
  type: string
  startNode: string
  endNode: string
  properties: Record<string, any>
}

export interface GraphData {
  nodes: GraphNode[]
  relationships: GraphRelationship[]
  metadata?: {
    executionTime?: number
    recordCount?: number
  }
}

export interface Formulation {
  id: string
  name: string
  version: string
  type: string
  status: string
  ingredients: Ingredient[]
  targetYield: number
  yieldUnit: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Ingredient {
  id: string
  name: string
  quantity: number
  unit: string
  percentage: number
  function: string
  cost?: number
}

export interface BackendHealth {
  status: string
  neo4j: {
    connected: boolean
    database: string
  }
  timestamp: string
}

class APIService {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl
  }

  setBaseUrl(url: string) {
    this.baseUrl = url
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
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

    return response.json()
  }

  async getHealth(): Promise<BackendHealth> {
    return this.request<BackendHealth>('/health')
  }

  async getGraph(): Promise<GraphData> {
    return this.request<GraphData>('/api/graph')
  }

  async getFormulations(): Promise<Formulation[]> {
    return this.request<Formulation[]>('/api/formulations')
  }

  async getFormulation(id: string): Promise<Formulation> {
    return this.request<Formulation>(`/api/formulations/${id}`)
  }

  async createFormulation(formulation: Partial<Formulation>): Promise<Formulation> {
    return this.request<Formulation>('/api/formulations', {
      method: 'POST',
      body: JSON.stringify(formulation),
    })
  }

  async updateFormulation(id: string, formulation: Partial<Formulation>): Promise<Formulation> {
    return this.request<Formulation>(`/api/formulations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(formulation),
    })
  }

  async deleteFormulation(id: string): Promise<void> {
    return this.request<void>(`/api/formulations/${id}`, {
      method: 'DELETE',
    })
  }

  async searchFDC(query: string): Promise<any[]> {
    return this.request<any[]>(`/api/fdc/search?q=${encodeURIComponent(query)}`)
  }

  async ingestFDC(fdcId: string): Promise<void> {
    return this.request<void>(`/api/fdc/ingest/${fdcId}`, {
      method: 'POST',
    })
  }

  async clearDatabase(): Promise<void> {
    return this.request<void>('/api/database/clear', {
      method: 'POST',
    })
  }

  async loadSampleData(): Promise<void> {
    return this.request<void>('/api/database/sample', {
      method: 'POST',
    })
  }
}

export const apiService = new APIService()
