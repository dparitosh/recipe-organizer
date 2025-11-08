import { envService } from '@/lib/services/env-service'
import { offlineAIHandler } from './offline-ai-handler'

const DEFAULT_BACKEND_URL = 'http://localhost:8000'
const SUPPORTED_SERVICE_MODES = new Set(['online', 'offline', 'auto'])

function clamp(value, min, max) {
  if (value < min) return min
  if (value > max) return max
  return value
}

class AIAssistantService {
  constructor() {
    this.backendUrl = envService.getBackendUrl() || DEFAULT_BACKEND_URL
    this.serviceMode = 'auto'
    this.includeGraph = true
    this.autoFallback = true
  }

  setBackendUrl(url) {
    if (typeof url !== 'string') return
    const sanitized = url.trim().replace(/\/$/, '')
    this.backendUrl = sanitized || DEFAULT_BACKEND_URL
    envService.setBackendUrl(this.backendUrl)
  }

  getBackendUrl() {
    return this.backendUrl || DEFAULT_BACKEND_URL
  }

  setServiceMode(mode) {
    if (SUPPORTED_SERVICE_MODES.has(mode)) this.serviceMode = mode
  }

  getServiceMode() {
    return this.serviceMode
  }

  setIncludeGraph(include) {
    this.includeGraph = Boolean(include)
  }

  setAutoFallback(enabled) {
    this.autoFallback = enabled !== false
  }

  async checkHealth() {
    const resp = await fetch(this.buildUrl('/api/health'))
    if (!resp.ok) throw new Error(`Health check failed: ${resp.status}`)
    return resp.json()
  }

  async query(request) {
    const { question, context } = request || {}
    if (!question || !question.trim()) throw new Error('Question is required')

    if (this.serviceMode === 'offline') {
      return offlineAIHandler.query({ question, context })
    }

    const payload = { query: question, context: context ?? null, service_mode: this.serviceMode, include_graph: this.includeGraph }

    try {
      const resp = await fetch(this.buildUrl('/api/ai/query'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '')
        throw new Error(txt || `AI backend returned ${resp.status}`)
      }

      const data = await resp.json()

      return this.normalizeBackendResponse(data, context, Date.now())
    } catch (err) {
      if (this.autoFallback) {
        try {
          return await offlineAIHandler.query({ question, context })
        } catch (_) {
          throw err
        }
      }
      throw err
    }
  }

  normalizeBackendResponse(data, context, startTime) {
    const executionTime = typeof data?.execution_time_ms === 'number' ? data.execution_time_ms : 0

    const normalized = {
      answer: data?.answer || '',
      nodeHighlights: data?.node_highlights || data?.nodeHighlights || [],
      relationshipSummaries: data?.relationship_summaries || data?.relationshipSummaries || [],
      recommendations: data?.recommendations || [],
      cypher: data?.cypher_query || data?.cypher || null,
      executionTime,
      confidence: typeof data?.confidence === 'number' ? clamp(data.confidence, 0, 1) : 0,
      sources: data?.data_sources || data?.sources || []
    }

    const ctxSources = this.collectContextSources(context)
    if (ctxSources.length) normalized.sources = [...normalized.sources, ...ctxSources]

    return normalized
  }

  collectContextSources(context) {
    if (!context || !Array.isArray(context.formulations) || context.formulations.length === 0) return []
    return [{ type: 'formulations', description: 'Local formulation data', recordCount: context.formulations.length }]
  }

  shouldFallback() {
    return this.autoFallback && this.serviceMode !== 'online'
  }

  buildUrl(path) {
    const base = this.getBackendUrl()
    const normalized = path && path.startsWith('/') ? path : `/${path || ''}`
    return `${base}${normalized}`
  }
}

export const aiAssistant = new AIAssistantService()

export { AIAssistantService }
