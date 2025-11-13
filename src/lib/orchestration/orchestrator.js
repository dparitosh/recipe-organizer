import { RecipeEngineerAgent } from './agents/recipe-engineer-agent.js'
import { ScalingCalculatorAgent } from './agents/scaling-calculator-agent.js'
import { GraphBuilderAgent } from './agents/graph-builder-agent.js'
import { QAValidatorAgent } from './agents/qa-validator-agent.js'
import { UIDesignerAgent } from './agents/ui-designer-agent.js'
import { OrchestrationResultSchema } from './agent-schemas.js'

const safeClone = (value) => {
  if (value === null || value === undefined) {
    return value
  }

  try {
    return JSON.parse(JSON.stringify(value))
  } catch (error) {
    console.warn('Failed to clone agent payload:', error)
    return value
  }
}

export class AgentOrchestrator {
  constructor(options = {}) {
    this.recipeEngineer = new RecipeEngineerAgent()
    this.scalingCalculator = new ScalingCalculatorAgent()
    this.graphBuilder = new GraphBuilderAgent()
    this.qaValidator = new QAValidatorAgent()
    this.uiDesigner = new UIDesignerAgent()
    this.history = []
    this.onAgentStart = options.onAgentStart
    this.onAgentComplete = options.onAgentComplete
  }

  async orchestrate(config) {
    const orchestrationId = `orch-${Date.now()}`
    const startTime = Date.now()
    this.history = []

    try {
      const recipeInput = {
        userRequest: config.userRequest,
        context: config.context,
      }

      const recipeResult = await this.runAgent(
        this.recipeEngineer.name,
        recipeInput,
        async (payload) => this.recipeEngineer.execute(payload),
        0
      )

      if (!recipeResult) {
        throw new Error('Recipe Engineer failed')
      }

      const scalingInput = {
        recipe: recipeResult.recipe,
        targetBatchSize: config.targetBatchSize || 1000,
        targetUnit: config.targetUnit || 'kg',
        densityMap: config.context?.densityMap,
        costMap: config.context?.costMap,
      }

      const calculationResult = await this.runAgent(
        this.scalingCalculator.name,
        scalingInput,
        async (payload) => this.scalingCalculator.execute(payload),
        1
      )

      if (!calculationResult) {
        throw new Error('Scaling Calculator failed')
      }

      const graphInput = {
        recipe: recipeResult.recipe,
        calculation: calculationResult.calculation,
        includeNutrients: config.includeNutrients ?? false,
        includeCosts: config.includeCosts ?? true,
      }

      const graphResult = await this.runAgent(
        this.graphBuilder.name,
        graphInput,
        async (payload) => this.graphBuilder.execute(payload),
        2
      )

      if (!graphResult) {
        throw new Error('Graph Builder failed')
      }

      const validationInput = {
        recipe: recipeResult.recipe,
        calculation: calculationResult.calculation,
        graph: graphResult.graph,
      }

      const validationResult = await this.runAgent(
        this.qaValidator.name,
        validationInput,
        async (payload) => this.qaValidator.execute(payload),
        3
      )

      if (!validationResult) {
        throw new Error('QA Validator failed')
      }

      const uiInput = {
        recipe: recipeResult.recipe,
        calculation: calculationResult.calculation,
        validation: validationResult.validation,
      }

      const uiResult = await this.runAgent(
        this.uiDesigner.name,
        uiInput,
        async (payload) => this.uiDesigner.execute(payload),
        4
      )

      if (!uiResult) {
        throw new Error('UI Designer failed')
      }

      const totalDuration = Date.now() - startTime

      const result = {
        id: orchestrationId,
        status: validationResult.canProceed ? 'success' : 'partial',
        recipe: recipeResult.recipe,
        calculation: calculationResult.calculation,
        graph: graphResult.graph,
        validation: validationResult.validation,
        uiConfig: uiResult.uiConfig,
        agentHistory: this.history,
        totalDuration,
        timestamp: new Date().toISOString(),
      }

      return OrchestrationResultSchema.parse(result)
    } catch (error) {
      const totalDuration = Date.now() - startTime
      
      const failedResult = {
        id: orchestrationId,
        status: 'failed',
        recipe: { id: '', name: '', ingredients: [], totalPercentage: 0 },
        calculation: {
          recipeId: '',
          recipeName: '',
          targetBatchSize: 0,
          targetUnit: 'kg',
          scaledIngredients: [],
          costs: { rawMaterials: 0, total: 0, perUnit: 0 },
          yield: { theoretical: 0, actual: 0, percentage: 0 },
          timestamp: new Date().toISOString(),
        },
        graph: { nodes: [], edges: [], cypherCommands: [], metadata: { nodeCount: 0, edgeCount: 0, graphComplexity: 'none' } },
        validation: {
          valid: false,
          errors: [{
            agent: 'Orchestrator',
            field: 'general',
            message: error instanceof Error ? error.message : 'Unknown error',
            severity: 'error',
          }],
          warnings: [],
          checks: {
            recipePercentageValid: false,
            costPositive: false,
            yieldRealistic: false,
            graphIntegrity: false,
            dataConsistency: false,
          },
          summary: { totalChecks: 0, passed: 0, failed: 1, score: 0 },
          timestamp: new Date().toISOString(),
        },
        uiConfig: { layout: 'single-column', components: [] },
        agentHistory: this.history,
        totalDuration,
        timestamp: new Date().toISOString(),
      }

      return failedResult
    }
  }

  async runAgent(agentName, inputPayload, executor, index) {
    const startTime = Date.now()
    const timestamp = new Date().toISOString()
    const inputSnapshot = safeClone(inputPayload)

    try {
      if (typeof this.onAgentStart === 'function') {
        this.onAgentStart({ agent: agentName, index })
      }
    } catch (callbackError) {
      console.warn('Agent start callback error:', callbackError)
    }

    try {
      const output = await executor(inputPayload)
      const duration = Date.now() - startTime
      const outputSnapshot = safeClone(output)

      this.history.push({
        agent: agentName,
        timestamp,
        duration,
        input: inputSnapshot,
        output: outputSnapshot,
        status: 'success',
      })

      try {
        if (typeof this.onAgentComplete === 'function') {
          this.onAgentComplete({ agent: agentName, index, status: 'success', duration })
        }
      } catch (callbackError) {
        console.warn('Agent complete callback error:', callbackError)
      }

      return output
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      this.history.push({
        agent: agentName,
        timestamp,
        duration,
        input: inputSnapshot,
        output: null,
        status: 'failed',
        error: errorMessage,
      })

      try {
        if (typeof this.onAgentComplete === 'function') {
          this.onAgentComplete({
            agent: agentName,
            index,
            status: 'failed',
            duration,
            error: errorMessage,
          })
        }
      } catch (callbackError) {
        console.warn('Agent complete callback error:', callbackError)
      }

      return null
    }
  }

  getHistory() {
    return this.history
  }

  clearHistory() {
    this.history = []
  }
}
