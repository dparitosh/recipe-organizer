import { aiService } from '../../services/ai-service.js'

function hasSparkLLM() {
  return typeof window !== 'undefined' && window.spark?.llm && window.spark?.llmPrompt
}

export async function runPromptWithFallback(
  promptText,
  {
    systemPrompt,
    temperature = 0.7,
    maxTokens = 800,
    model = 'gpt-4o',
    stream = true,
    expectJson = false,
  } = {}
) {
  if (!promptText || typeof promptText !== 'string') {
    throw new Error('Prompt text must be a non-empty string')
  }

  const enforcedSystemPrompt = expectJson
    ? 'You are a structured-output generation service. Respond with VALID JSON only. Do not include commentary, markdown fences, or text outside the JSON payload.'
    : ''

  const finalSystemPrompt = [enforcedSystemPrompt, systemPrompt].filter(Boolean).join('\n\n') || undefined
  const shouldStream = expectJson ? false : stream

  const invokeSpark = async (combinedPrompt) => {
    const prompt = window.spark.llmPrompt`${combinedPrompt}`
    return window.spark.llm(prompt, model, shouldStream)
  }

  const invokeBackend = async (basePrompt) => {
    const completion = await aiService.generateCompletion({
      prompt: basePrompt,
      systemPrompt: finalSystemPrompt,
      temperature,
      maxTokens,
    })

    return completion?.completion ?? ''
  }

  const basePrompt = finalSystemPrompt ? `${finalSystemPrompt}\n\n${promptText}` : promptText

  if (hasSparkLLM()) {
    try {
      return await invokeSpark(basePrompt)
    } catch (error) {
      console.warn('Spark LLM invocation failed, falling back to backend completion.', error)
    }
  }

  return invokeBackend(promptText)
}

export { hasSparkLLM }

export function parseJsonResponse(rawText) {
  if (typeof rawText !== 'string') {
    throw new Error('AI response must be a string')
  }

  let text = rawText.trim()
  if (!text) {
    throw new Error('AI response was empty')
  }

  const normalizeQuotes = (value) =>
    value
      .replace(/[“”]/g, '"')
      .replace(/[‘’‛]/g, "'")
      .replace(/\r\n/g, '\n')
      .replace(/\u201c|\u201d/g, '"')
      .replace(/\u2018|\u2019/g, "'")

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) {
    text = fencedMatch[1].trim()
  }

  const attemptParse = (candidate) => {
    const trimmed = normalizeQuotes(candidate.trim())
    if (!trimmed) {
      throw new Error('No JSON content found in AI response')
    }
    return JSON.parse(trimmed)
  }

  try {
    return attemptParse(text)
  } catch (error) {
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sliced = text.slice(firstBrace, lastBrace + 1)
      const candidates = [sliced]

      const withQuotedKeys = sliced.replace(/(['"])?([A-Za-z_][A-Za-z0-9_]*)\1?\s*:/g, '"$2":')
      candidates.push(withQuotedKeys)

      const withQuotedValues = withQuotedKeys.replace(/:\s*'([^']*)'/g, (_, value) => `: "${value.replace(/"/g, '\\"')}"`)
      candidates.push(withQuotedValues)

      let lastError = error
      for (const candidate of candidates) {
        try {
          return attemptParse(candidate)
        } catch (_) {
          lastError = _
          continue
        }
      }

      const snippet = text.slice(firstBrace, Math.min(text.length, firstBrace + 280)).replace(/\s+/g, ' ').trim()
      throw new Error(`Failed to parse AI JSON response: ${lastError instanceof Error ? lastError.message : 'Unknown error'} | snippet: ${snippet}`)
    }

    const snippet = text.slice(0, Math.min(text.length, 280)).replace(/\s+/g, ' ').trim()
    throw new Error(`Failed to parse AI JSON response: ${error instanceof Error ? error.message : 'Unknown error'} | snippet: ${snippet}`)
  }
}

export async function requestJsonResponse(
  promptText,
  {
    systemPrompt,
    temperature = 0.5,
    maxTokens = 1000,
    model,
    maxAttempts = 3,
  } = {}
) {
  if (!promptText || typeof promptText !== 'string') {
    throw new Error('Prompt text must be a non-empty string')
  }

  let lastError = null

  for (let attempt = 0; attempt < Math.max(1, maxAttempts); attempt += 1) {
    const attemptInstructions = [
      'STRICT OUTPUT FORMAT:',
      '- Respond with a single JSON object that matches the requested schema.',
      '- Use double quotes for all keys and string values.',
      '- Do not include markdown fences, comments, or descriptive text.',
    ]

    let attemptPrompt = `${promptText}\n\n${attemptInstructions.join('\n')}`
    if (attempt > 0) {
      attemptPrompt += `\n\nAttempt ${attempt + 1}: The previous response was not valid JSON. Return ONLY valid JSON now.`
    }

    try {
      const responseText = await runPromptWithFallback(attemptPrompt, {
        systemPrompt,
        temperature,
        maxTokens,
        model,
        stream: false,
        expectJson: true,
      })

      return parseJsonResponse(responseText)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('AI did not return valid JSON response')
}
