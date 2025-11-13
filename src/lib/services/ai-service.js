import { envService } from './env-service.js'

class AIService {
  constructor() {
    this.defaultOptions = {
      temperature: 0.7,
      maxTokens: 800,
    }
    this.cache = new Map()
    this.cacheTtlMs = 3 * 60 * 1000
    this.maxCacheEntries = 64
    this.inFlightRequests = new Map()
  }

  async generateCompletion({ prompt, systemPrompt, temperature, maxTokens } = {}) {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('Prompt is required for AI completion')
    }

    const effectiveTemperature = typeof temperature === 'number' ? temperature : this.defaultOptions.temperature
    const effectiveMaxTokens = typeof maxTokens === 'number' ? maxTokens : this.defaultOptions.maxTokens
    const cacheKey = this.composeCacheKey({ prompt, systemPrompt, temperature: effectiveTemperature, maxTokens: effectiveMaxTokens })

    const cached = this.readCache(cacheKey)
    if (cached) {
      return cached
    }

    if (this.inFlightRequests.has(cacheKey)) {
      return this.inFlightRequests.get(cacheKey)
    }

    const backendUrl = envService.getBackendUrl()
    const requestPromise = this.performCompletionRequest({
      backendUrl,
      prompt,
      systemPrompt,
      temperature: effectiveTemperature,
      maxTokens: effectiveMaxTokens,
    })

    this.inFlightRequests.set(cacheKey, requestPromise)

    try {
      const result = await requestPromise
      this.writeCache(cacheKey, result)
      return result
    } finally {
      this.inFlightRequests.delete(cacheKey)
    }
  }

  composeCacheKey({ prompt, systemPrompt, temperature, maxTokens }) {
    return JSON.stringify({ prompt, systemPrompt: systemPrompt || '', temperature, maxTokens })
  }

  readCache(cacheKey) {
    const entry = this.cache.get(cacheKey)
    if (!entry) {
      return null
    }

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(cacheKey)
      return null
    }

    return entry.payload
  }

  writeCache(cacheKey, payload) {
    if (!payload) {
      return
    }

    this.cache.set(cacheKey, {
      payload,
      expiresAt: Date.now() + this.cacheTtlMs,
    })

    if (this.cache.size <= this.maxCacheEntries) {
      return
    }

    const overflow = this.cache.size - this.maxCacheEntries
    const keysToDelete = Array.from(this.cache.keys()).slice(0, overflow)
    keysToDelete.forEach((key) => this.cache.delete(key))
  }

  async performCompletionRequest({ backendUrl, prompt, systemPrompt, temperature, maxTokens }) {
    const response = await fetch(`${backendUrl}/api/ai/completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...envService.getAuthHeaders(),
      },
      body: JSON.stringify({
        prompt,
        system_prompt: systemPrompt,
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      let errorDetail = 'AI completion request failed'
      try {
        const body = await response.json()
        errorDetail = body.detail || body.message || errorDetail
      } catch (error) {
        const text = await response.text()
        errorDetail = text || errorDetail
      }
      throw new Error(errorDetail)
    }

    return response.json()
  }
}

export const aiService = new AIService()
