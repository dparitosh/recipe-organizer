const DEFAULT_CONFIG = {
  backendUrl: 'http://localhost:8000',
}

class EnvironmentService {
  constructor() {
    this.config = { ...DEFAULT_CONFIG }
  }

  setBackendUrl(url) {
    if (!url) return
    this.config.backendUrl = url.replace(/\/$/, '')
  }

  getBackendUrl() {
    return this.config.backendUrl || DEFAULT_CONFIG.backendUrl
  }

  getAuthHeaders({ requireAdmin = false } = {}) {
    void requireAdmin
    return {}
  }

  async _request(path, { method = 'GET', body, headers = {}, requireAdmin = false } = {}) {
    const url = `${this.getBackendUrl()}${path}`
    const authHeaders = this.getAuthHeaders({ requireAdmin })
    const init = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...headers,
      },
    }

    if (body !== undefined) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body)
    }

    const response = await fetch(url, init)

    if (!response.ok) {
      let errorDetail = 'Unknown error'
      try {
        const errorBody = await response.json()
        errorDetail = errorBody.detail || errorBody.message || errorDetail
      } catch (_) {
        const text = await response.text()
        errorDetail = text || errorDetail
      }
      throw new Error(errorDetail)
    }

    if (response.status === 204) {
      return null
    }

    return response.json()
  }

  async getEnvSettings() {
    return this._request('/api/env', { requireAdmin: true })
  }

  async updateEnvSettings(values) {
    return this._request('/api/env', {
      method: 'POST',
      body: {
        values,
      },
      requireAdmin: true,
    })
  }

  async getServiceHealth() {
    return this._request('/api/health')
  }

  async testNeo4jConnection({ uri, username, password, database }) {
    return this._request('/api/health/neo4j', {
      method: 'POST',
      body: {
        uri,
        username,
        password,
        database,
      },
    })
  }
}

export const envService = new EnvironmentService()
