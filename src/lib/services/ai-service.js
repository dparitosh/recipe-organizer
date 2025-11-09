import { envService } from './env-service.js'

class AIService {
  constructor() {
    this.defaultOptions = {
      temperature: 0.7,
      maxTokens: 800,
    }
  }

  async generateCompletion({ prompt, systemPrompt, temperature, maxTokens } = {}) {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('Prompt is required for AI completion')
    }

    const backendUrl = envService.getBackendUrl()
    const response = await fetch(`${backendUrl}/api/ai/completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        system_prompt: systemPrompt,
        temperature: typeof temperature === 'number' ? temperature : this.defaultOptions.temperature,
        max_tokens: typeof maxTokens === 'number' ? maxTokens : this.defaultOptions.maxTokens,
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
