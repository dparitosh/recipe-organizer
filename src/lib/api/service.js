class APIService {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl
  }

  setBaseUrl(url) {
    this.baseUrl = url
  }

  async request(endpoint, options) {
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

  async uploadCSV(file, mappingConfig) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mapping', JSON.stringify(mappingConfig))

    const response = await fetch(`${this.baseUrl}/api/upload/csv`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async uploadJSON(file, mappingConfig) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mapping', JSON.stringify(mappingConfig))

    const response = await fetch(`${this.baseUrl}/api/upload/json`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json()
  }
}

export const apiService = new APIService()
