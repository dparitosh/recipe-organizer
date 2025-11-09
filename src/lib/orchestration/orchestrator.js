import { RecipeEngineerAgent } from './agents/recipe-engineer-agent.js'
import { ScalingCalculatorAgent } from './agents/scaling-calculator-agent.js'
import { GraphBuilderAgent } from './agents/graph-builder-agent.js'
import { QAValidatorAgent } from './agents/qa-validator-agent.js'
import { UIDesignerAgent } from './agents/ui-designer-agent.js'
import { OrchestrationResultSchema } from './agent-schemas.js'

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
      const recipeResult = await this.runAgent(
        this.recipeEngineer.name,
        async () => {
          const input = {
            userRequest: config.userRequest,
            context: config.context,
          }
          return await this.recipeEngineer.execute(input)
        },
        0
      )

      if (!recipeResult) {
        throw new Error('Recipe Engineer failed')
      }

      const calculationResult = await this.runAgent(
        this.scalingCalculator.name,
        async () => {
          const input = {
            recipe: recipeResult.recipe,
            targetBatchSize: config.targetBatchSize || 1000,
            targetUnit: config.targetUnit || 'kg',
            densityMap: config.context?.densityMap,
            costMap: config.context?.costMap,
          }
          return await this.scalingCalculator.execute(input)
        },
        1
      )

      if (!calculationResult) {
        throw new Error('Scaling Calculator failed')
      }

      const graphResult = await this.runAgent(
        this.graphBuilder.name,
        async () => {
          const input = {
            recipe: recipeResult.recipe,
            calculation: calculationResult.calculation,
            includeNutrients: config.includeNutrients ?? false,
            includeCosts: config.includeCosts ?? true,
          }
          return await this.graphBuilder.execute(input)
        },
        2
      )

      if (!graphResult) {
        throw new Error('Graph Builder failed')
      }

      const validationResult = await this.runAgent(
        this.qaValidator.name,
        async () => {
          const input = {
            recipe: recipeResult.recipe,
            calculation: calculationResult.calculation,
            graph: graphResult.graph,
          }
          return await this.qaValidator.execute(input)
        },
        3
      )

      if (!validationResult) {
        throw new Error('QA Validator failed')
      }

      const uiResult = await this.runAgent(
        this.uiDesigner.name,
        async () => {
          const input = {
            recipe: recipeResult.recipe,
            calculation: calculationResult.calculation,
            validation: validationResult.validation,
          }
          return await this.uiDesigner.execute(input)
        },
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

  async runAgent(agentName, executor, index) {
    const startTime = Date.now()
    const timestamp = new Date().toISOString()

    try {
      if (typeof this.onAgentStart === 'function') {
        this.onAgentStart({ agent: agentName, index })
      }
    } catch (callbackError) {
      console.warn('Agent start callback error:', callbackError)
    }

    try {
      const output = await executor()
      const duration = Date.now() - startTime

      this.history.push({
        agent: agentName,
        timestamp,
        duration,
        input: {},
        output,
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

      this.history.push({
        agent: agentName,
        timestamp,
        duration,
        input: {},
        output: null,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      try {
        if (typeof this.onAgentComplete === 'function') {
          this.onAgentComplete({
            agent: agentName,
            index,
            status: 'failed',
            duration,
            error: error instanceof Error ? error.message : 'Unknown error',
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
