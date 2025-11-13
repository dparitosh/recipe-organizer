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
}

export const orchestrationService = new OrchestrationService()
export { OrchestrationService }
