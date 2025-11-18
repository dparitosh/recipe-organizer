import { envService } from './env-service'

class OrchestrationService {
  async persistRun(payload) {
    if (!payload || !payload.userRequest || !payload.result) {
      throw new Error('Persistence payload is missing required fields')
    }

    const backendUrl = envService.getBackendUrl()
    const response = await fetch(`${backendUrl}/api/orchestration/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...envService.getAuthHeaders({ requireAdmin: true }),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`
      try {
        const body = await response.json()
        errorDetail = body.detail || body.message || errorDetail
      } catch (_) {
        const text = await response.text().catch(() => '')
        errorDetail = text || errorDetail
      }
      throw new Error(errorDetail)
    }

    return response.json()
  }

  async fetchRunGraph(runId) {
    if (!runId) {
      throw new Error('runId is required to fetch graph data')
    }

    const backendUrl = envService.getBackendUrl()
    const response = await fetch(`${backendUrl}/api/orchestration/runs/${encodeURIComponent(runId)}/graph`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...envService.getAuthHeaders({ requireAdmin: true }),
      },
    })

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`
      try {
        const body = await response.json()
        errorDetail = body.detail || body.message || errorDetail
      } catch (_) {
        const text = await response.text().catch(() => '')
        errorDetail = text || errorDetail
      }
      throw new Error(errorDetail)
    }

    return response.json()
  }

  /**
   * List orchestration runs with filtering and pagination
   */
  async listRuns({ limit = 50, offset = 0, status, startDate, endDate } = {}) {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() })
    if (status) params.append('status', status)
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const backendUrl = envService.getBackendUrl()
    const response = await fetch(`${backendUrl}/api/orchestration/runs?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...envService.getAuthHeaders({ requireAdmin: true }),
      },
    })
    
    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`
      try {
        const body = await response.json()
        errorDetail = body.detail || body.message || errorDetail
      } catch (_) {
        const text = await response.text().catch(() => '')
        errorDetail = text || errorDetail
      }
      throw new Error(`Failed to list orchestration runs: ${errorDetail}`)
    }
    
    return response.json()
  }

  /**
   * Get complete details of a specific orchestration run
   */
  async getRunDetails(runId) {
    if (!runId) {
      throw new Error('runId is required to fetch run details')
    }
    
    const backendUrl = envService.getBackendUrl()
    const response = await fetch(`${backendUrl}/api/orchestration/runs/${encodeURIComponent(runId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...envService.getAuthHeaders({ requireAdmin: true }),
      },
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Orchestration run not found')
      }
      let errorDetail = `HTTP ${response.status}`
      try {
        const body = await response.json()
        errorDetail = body.detail || body.message || errorDetail
      } catch (_) {
        const text = await response.text().catch(() => '')
        errorDetail = text || errorDetail
      }
      throw new Error(`Failed to fetch run details: ${errorDetail}`)
    }
    
    return response.json()
  }
}

export const orchestrationService = new OrchestrationService()
export { OrchestrationService }
