import process from 'node:process'
import { AgentOrchestrator } from '../src/lib/orchestration/orchestrator.js'
import { envService } from '../src/lib/services/env-service.js'

const userPrompt = process.argv[2] || 'Create Formulation recipe of beverage using green tree extract'

envService.setBackendUrl(process.env.BACKEND_URL || 'http://localhost:8000')

const orchestrator = new AgentOrchestrator()

const config = {
  userRequest: userPrompt,
  targetBatchSize: 1000,
  targetUnit: 'kg',
  includeNutrients: false,
  includeCosts: true,
}

try {
  const result = await orchestrator.orchestrate(config)
  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error('Failed to run orchestration:', error)
  process.exitCode = 1
}
