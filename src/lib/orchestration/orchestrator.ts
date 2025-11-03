import { RecipeEngineerAgent, RecipeEngineerInput } from './agents/recipe-engineer-agent'
import { ScalingCalculatorAgent, ScalingCalculatorInput } from './agents/scaling-calculator-agent'
import { GraphBuilderAgent, GraphBuilderInput } from './agents/graph-builder-agent'
import { QAValidatorAgent, QAValidatorInput } from './agents/qa-validator-agent'
import { UIDesignerAgent, UIDesignerInput } from './agents/ui-designer-agent'
import { OrchestrationResult, OrchestrationResultSchema } from './agent-schemas'

export interface OrchestrationConfig {
  userRequest: string
  targetBatchSize?: number
  targetUnit?: 'kg' | 'L' | 'gal' | 'oz' | 'lb'
  includeNutrients?: boolean
  includeCosts?: boolean
  context?: {
    existingIngredients?: string[]
    targetCategory?: string
    constraints?: string[]
    densityMap?: Record<string, number>
    costMap?: Record<string, number>
  }
}

export interface AgentHistoryEntry {
  agent: string
  timestamp: string
  duration: number
  input: any
  output: any
  status: 'success' | 'failed' | 'skipped'
  error?: string
}

export class AgentOrchestrator {
  private recipeEngineer: RecipeEngineerAgent
  private scalingCalculator: ScalingCalculatorAgent
  private graphBuilder: GraphBuilderAgent
  private qaValidator: QAValidatorAgent
  private uiDesigner: UIDesignerAgent
  
  private history: AgentHistoryEntry[] = []
  
  constructor() {
    this.recipeEngineer = new RecipeEngineerAgent()
    this.scalingCalculator = new ScalingCalculatorAgent()
    this.graphBuilder = new GraphBuilderAgent()
    this.qaValidator = new QAValidatorAgent()
    this.uiDesigner = new UIDesignerAgent()
  }

  async orchestrate(config: OrchestrationConfig): Promise<OrchestrationResult> {
    const orchestrationId = `orch-${Date.now()}`
    const startTime = Date.now()
    this.history = []

    try {
      const recipeResult = await this.runAgent(
        this.recipeEngineer.name,
        async () => {
          const input: RecipeEngineerInput = {
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
          const input: ScalingCalculatorInput = {
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
          const input: GraphBuilderInput = {
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
          const input: QAValidatorInput = {
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
          const input: UIDesignerInput = {
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

      const result: OrchestrationResult = {
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
      
      const failedResult: OrchestrationResult = {
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

  private async runAgent<T>(
    agentName: string,
    executor: () => Promise<T>
  ): Promise<T | null> {
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

  getHistory(): AgentHistoryEntry[] {
    return this.history
  }

  clearHistory(): void {
    this.history = []
  }
}
