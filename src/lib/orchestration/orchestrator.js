import { RecipeEngineerAgent } from './agents/recipe-engineer-agent'
import { ScalingCalculatorAgent } from './agents/scaling-calculator-agent'
import { GraphBuilderAgent } from './agents/graph-builder-agent'
import { QAValidatorAgent } from './agents/qa-validator-agent'
import { UIDesignerAgent } from './agents/ui-designer-agent'
import { OrchestrationResultSchema } from './agent-schemas'

export class AgentOrchestrator {
  constructor() {
    this.recipeEngineer = new RecipeEngineerAgent()
    this.scalingCalculator = new ScalingCalculatorAgent()
    this.graphBuilder = new GraphBuilderAgent()
    this.qaValidator = new QAValidatorAgent()
    this.uiDesigner = new UIDesignerAgent()
    this.history = []
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
        }
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
        }
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
        }
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
        }
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
        }
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

  async runAgent(agentName, executor) {
    const startTime = Date.now()
    const timestamp = new Date().toISOString()

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
