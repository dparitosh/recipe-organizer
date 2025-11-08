import { aiService } from '@/lib/services/ai-service'

function hasSparkLLM() {
  return typeof window !== 'undefined' && window.spark?.llm && window.spark?.llmPrompt
}

export async function runPromptWithFallback(
  promptText,
  { systemPrompt, temperature = 0.7, maxTokens = 800, model = 'gpt-4o', stream = true } = {}
) {
  if (!promptText || typeof promptText !== 'string') {
    throw new Error('Prompt text must be a non-empty string')
  }

  if (hasSparkLLM()) {
    try {
      const prompt = window.spark.llmPrompt`${promptText}`
      return await window.spark.llm(prompt, model, stream)
    } catch (error) {
      console.warn('Spark LLM invocation failed, falling back to backend completion.', error)
    }
  }

  const completion = await aiService.generateCompletion({
    prompt: promptText,
    systemPrompt,
    temperature,
    maxTokens,
  })

  return completion?.completion ?? ''
}

export { hasSparkLLM }
