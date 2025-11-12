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
    return this.request('/api/graph/data')
  }

  async getGraphSchema() {
    return this.request('/api/graph/schema')
  }

  async installDefaultGraphSchema() {
    return this.request('/api/graph/schema/install-default', {
      method: 'POST',
    })
  }

  async exportGraphSchemaGraphML() {
    return this._requestText(
      '/api/graph/schema/export/graphml',
      'application/graphml+xml'
    )
  }

  async exportGraphSchemaSVG() {
    return this._requestText(
      '/api/graph/schema/export/svg',
      'image/svg+xml'
    )
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

  async quickIngestFDC(searchTerm, { count = 10, dataTypes, apiKey } = {}) {
    const payload = {
      search_term: searchTerm,
      count,
    }

    if (Array.isArray(dataTypes) && dataTypes.length) {
      payload.data_types = dataTypes
    }

    if (apiKey) {
      payload.api_key = apiKey
    }

    return this.request('/api/fdc/quick-ingest', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async listFDCFoods({ search, page = 1, pageSize = 25, includeNutrients = false } = {}) {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('page_size', String(pageSize))
    params.set('include_nutrients', includeNutrients ? 'true' : 'false')
    if (search) {
      params.set('search', search)
    }

    return this.request(`/api/fdc/foods?${params.toString()}`)
  }

  async generateNutritionLabel(formulationId, { servingSize = 100, servingSizeUnit = 'g', servingsPerContainer } = {}) {
    const params = new URLSearchParams()
    params.set('serving_size', String(servingSize))
    params.set('serving_size_unit', servingSizeUnit)
    if (servingsPerContainer) {
      params.set('servings_per_container', String(servingsPerContainer))
    }

    return this.request(`/api/formulations/${formulationId}/nutrition-label?${params.toString()}`, {
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

  async _requestText(endpoint, accept = 'text/plain') {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        Accept: accept,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.text()
  }
}

export const apiService = new APIService()
