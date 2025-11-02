import { genAIClient } from '@/lib/genai'
import { neo4jDriver } from '@/lib/drivers/neo4j-driver'
import { Formulation } from '@/lib/schemas/formulation'

export interface AIQuery {
  question: string
  context?: {
    formulations?: Formulation[]
    activeFormulationId?: string
    timeRange?: { start: Date; end: Date }
  }
}

export interface AIResponse {
  answer: string
  nodeHighlights?: NodeHighlight[]
  relationshipSummaries?: RelationshipSummary[]
  recommendations?: Recommendation[]
  cypher?: string
  executionTime: number
  confidence: number
  sources?: DataSource[]
}

export interface NodeHighlight {
  nodeId: string
  nodeType: 'Formulation' | 'Ingredient' | 'Recipe' | 'MasterRecipe' | 'ManufacturingRecipe' | 'Plant' | 'SalesOrder'
  name: string
  relevance: number
  properties: Record<string, any>
}

export interface RelationshipSummary {
  relationshipType: string
  count: number
  description: string
  examples?: Array<{
    source: string
    target: string
    properties?: Record<string, any>
  }>
}

export interface Recommendation {
  type: 'cost_optimization' | 'yield_improvement' | 'substitution' | 'process_optimization' | 'quality_enhancement'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  actionable: boolean
  details?: Record<string, any>
}

export interface DataSource {
  type: 'neo4j' | 'formulations' | 'llm' | 'calculation'
  description: string
  recordCount?: number
}

class AIAssistantService {
  async query(request: AIQuery): Promise<AIResponse> {
    const startTime = Date.now()

    try {
      const analysis = await this.analyzeQuery(request.question)
      
      let graphData: any = null
      let cypherQuery: string | undefined
      
      if (analysis.requiresGraph) {
        const cypherResult = await this.retrieveGraphContext(request, analysis)
        graphData = cypherResult.data
        cypherQuery = cypherResult.cypher
      }

      const enrichedContext = this.enrichContext(request.context, graphData)
      
      const answer = await this.generateAnswer(request.question, enrichedContext, analysis)
      
      const nodeHighlights = this.extractNodeHighlights(graphData, analysis)
      const relationshipSummaries = this.extractRelationshipSummaries(graphData, analysis)
      const recommendations = await this.generateRecommendations(request, graphData, analysis)
      
      const executionTime = Date.now() - startTime

      return {
        answer: answer.text,
        nodeHighlights,
        relationshipSummaries,
        recommendations,
        cypher: cypherQuery,
        executionTime,
        confidence: answer.confidence,
        sources: this.identifySources(graphData, request.context)
      }
    } catch (error) {
      console.error('AI Assistant Error:', error)
      
      const executionTime = Date.now() - startTime
      return {
        answer: `I encountered an error processing your question: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your question or check your Neo4j connection.`,
        executionTime,
        confidence: 0,
        sources: []
      }
    }
  }

  private async analyzeQuery(question: string): Promise<QueryAnalysis> {
    const prompt = (window as any).spark.llmPrompt`
Analyze the following user question about food & beverage formulations and graph data.

Question: "${question}"

Determine:
1. What type of query is this? (search, comparison, analysis, recommendation, summarization)
2. Does it require graph database queries? (yes/no)
3. What entities are mentioned? (ingredients, recipes, formulations, plants, orders, etc.)
4. What metrics or filters are implied? (yield, cost, quantity, time period, etc.)
5. What is the user's intent? (find information, optimize, substitute, analyze trends, etc.)

Return your analysis as a JSON object with this structure:
{
  "queryType": "search" | "comparison" | "analysis" | "recommendation" | "summarization",
  "requiresGraph": boolean,
  "entities": string[],
  "filters": { "field": string, "operator": string, "value": any }[],
  "metrics": string[],
  "intent": string,
  "keywords": string[]
}
`

    try {
      const response = await (window as any).spark.llm(prompt, 'gpt-4o', true)
      const analysis = JSON.parse(response)
      return analysis
    } catch (error) {
      console.warn('Query analysis failed, using defaults:', error)
      return {
        queryType: 'search',
        requiresGraph: true,
        entities: [],
        filters: [],
        metrics: [],
        intent: 'find information',
        keywords: question.toLowerCase().split(' ')
      }
    }
  }

  private async retrieveGraphContext(request: AIQuery, analysis: QueryAnalysis): Promise<{ data: any; cypher: string }> {
    if (!neo4jDriver.isConnected()) {
      console.warn('Neo4j not connected, using local formulation data only')
      return { data: null, cypher: '' }
    }

    try {
      const schema = this.getGraphSchema()
      const contextStr = this.buildContextString(request.context, analysis)
      
      const naturalLanguageQuery = `${request.question}\n\nContext: ${contextStr}`
      
      const cypherResponse = await genAIClient.generateCypher({
        naturalLanguageQuery,
        schema,
        context: {
          entities: analysis.entities,
          filters: analysis.filters,
          metrics: analysis.metrics
        }
      })

      console.log('Generated Cypher:', cypherResponse.cypher)

      const result = await neo4jDriver.executeQuery(cypherResponse.cypher)

      return {
        data: result,
        cypher: cypherResponse.cypher
      }
    } catch (error) {
      console.error('Graph context retrieval failed:', error)
      return { data: null, cypher: '' }
    }
  }

  private getGraphSchema(): string {
    return `
Graph Schema:

Node Types:
- (:Formulation {id, name, version, type, status, targetYield, yieldUnit, costPerUnit})
- (:Ingredient {id, name, materialId, fdcId, quantity, unit, percentage, function, supplier, cost})
- (:Recipe {id, name, recipeType, version})
- (:MasterRecipe {id, name, materialNumber, version})
- (:ManufacturingRecipe {id, name, plantId, batchSize, processTime})
- (:Plant {id, name, location, capacity})
- (:SalesOrder {id, orderNumber, quantity, deliveryDate})

Relationship Types:
- (:Formulation)-[:CONTAINS]->(:Ingredient)
- (:Recipe)-[:USES]->(:Ingredient)
- (:MasterRecipe)-[:DERIVED_FROM]->(:Recipe)
- (:ManufacturingRecipe)-[:PRODUCES]->(:MasterRecipe)
- (:Plant)-[:MANUFACTURES]->(:ManufacturingRecipe)
- (:SalesOrder)-[:REQUIRES]->(:MasterRecipe)
- (:Ingredient)-[:ALTERNATIVE_TO]->(:Ingredient)

Common Patterns:
- Find formulations by ingredient: MATCH (f:Formulation)-[:CONTAINS]->(i:Ingredient {name: $ingredientName}) RETURN f, i
- Find recipes with yield filter: MATCH (f:Formulation) WHERE f.targetYield < $maxYield RETURN f
- Find substitutes: MATCH (i1:Ingredient {name: $original})-[:ALTERNATIVE_TO]->(i2:Ingredient) RETURN i2
- Trace recipe lineage: MATCH path = (so:SalesOrder)-[:REQUIRES]->(mr:MasterRecipe)-[:DERIVED_FROM]->(r:Recipe) RETURN path
`
  }

  private buildContextString(context: AIQuery['context'], analysis: QueryAnalysis): string {
    const parts: string[] = []

    if (context?.formulations && context.formulations.length > 0) {
      parts.push(`Available Formulations: ${context.formulations.length}`)
      
      if (context.activeFormulationId) {
        const active = context.formulations.find(f => f.id === context.activeFormulationId)
        if (active) {
          parts.push(`Active Formulation: ${active.name} (${active.ingredients.length} ingredients, yield: ${active.targetYield}${active.yieldUnit})`)
        }
      }
    }

    if (context?.timeRange) {
      parts.push(`Time Range: ${context.timeRange.start.toISOString()} to ${context.timeRange.end.toISOString()}`)
    }

    if (analysis.filters.length > 0) {
      parts.push(`Filters: ${analysis.filters.map(f => `${f.field} ${f.operator} ${f.value}`).join(', ')}`)
    }

    return parts.join('. ')
  }

  private enrichContext(context: AIQuery['context'], graphData: any): EnrichedContext {
    return {
      formulations: context?.formulations || [],
      activeFormulation: context?.activeFormulationId ? 
        context?.formulations?.find(f => f.id === context.activeFormulationId) : 
        undefined,
      graphNodes: graphData?.records?.map((r: any) => r.toObject()) || [],
      timeRange: context?.timeRange
    }
  }

  private async generateAnswer(question: string, context: EnrichedContext, analysis: QueryAnalysis): Promise<{ text: string; confidence: number }> {
    const formulationSummary = context.formulations.map(f => ({
      name: f.name,
      type: f.type,
      status: f.status,
      ingredientCount: f.ingredients.length,
      targetYield: f.targetYield,
      yieldUnit: f.yieldUnit,
      costPerUnit: f.costPerUnit,
      ingredients: f.ingredients.map(i => ({
        name: i.name,
        percentage: i.percentage,
        function: i.function,
        cost: i.cost
      }))
    }))

    const activeFormulationDetail = context.activeFormulation ? {
      name: context.activeFormulation.name,
      version: context.activeFormulation.version,
      ingredients: context.activeFormulation.ingredients.map(i => ({
        name: i.name,
        percentage: i.percentage,
        quantity: i.quantity,
        unit: i.unit,
        function: i.function,
        cost: i.cost,
        supplier: i.supplier
      })),
      totalCost: context.activeFormulation.costPerUnit,
      targetYield: context.activeFormulation.targetYield
    } : null

    const prompt = (window as any).spark.llmPrompt`
You are an AI assistant for a Food & Beverage Formulation Management System. Answer the following question using the provided context.

Question: "${question}"

Query Analysis:
- Type: ${analysis.queryType}
- Intent: ${analysis.intent}
- Entities: ${analysis.entities.join(', ')}
- Metrics: ${analysis.metrics.join(', ')}

Available Formulations (${formulationSummary.length} total):
${JSON.stringify(formulationSummary, null, 2)}

${activeFormulationDetail ? `Active Formulation Detail:\n${JSON.stringify(activeFormulationDetail, null, 2)}` : ''}

${context.graphNodes.length > 0 ? `Graph Database Results:\n${JSON.stringify(context.graphNodes, null, 2)}` : 'No graph data available.'}

Instructions:
1. Provide a clear, direct answer to the question
2. Reference specific formulations, ingredients, or data points when relevant
3. Include quantitative data (percentages, costs, yields) when available
4. Be concise but comprehensive
5. If data is missing or incomplete, acknowledge it
6. Format numbers clearly (e.g., "45.5%", "$2.50/kg")

Provide your answer in plain text (no markdown formatting).
`

    try {
      const answer = await (window as any).spark.llm(prompt, 'gpt-4o')
      return {
        text: answer.trim(),
        confidence: 0.85
      }
    } catch (error) {
      console.error('Answer generation failed:', error)
      return {
        text: 'I was unable to generate a complete answer. Please check your question and try again.',
        confidence: 0
      }
    }
  }

  private extractNodeHighlights(graphData: any, analysis: QueryAnalysis): NodeHighlight[] {
    if (!graphData || !graphData.records) return []

    const highlights: NodeHighlight[] = []

    try {
      graphData.records.forEach((record: any) => {
        const obj = record.toObject()
        
        Object.values(obj).forEach((value: any) => {
          if (value && typeof value === 'object' && value.labels) {
            const nodeType = value.labels[0] as NodeHighlight['nodeType']
            const props = value.properties || {}
            
            highlights.push({
              nodeId: value.identity?.toString() || props.id || 'unknown',
              nodeType,
              name: props.name || props.materialId || 'Unnamed',
              relevance: this.calculateRelevance(props, analysis),
              properties: props
            })
          }
        })
      })

      return highlights.sort((a, b) => b.relevance - a.relevance).slice(0, 10)
    } catch (error) {
      console.error('Error extracting node highlights:', error)
      return []
    }
  }

  private calculateRelevance(properties: Record<string, any>, analysis: QueryAnalysis): number {
    let score = 0.5

    analysis.keywords.forEach(keyword => {
      Object.values(properties).forEach(value => {
        if (typeof value === 'string' && value.toLowerCase().includes(keyword)) {
          score += 0.1
        }
      })
    })

    if (properties.targetYield !== undefined && analysis.metrics.includes('yield')) {
      score += 0.2
    }
    
    if (properties.cost !== undefined && analysis.metrics.includes('cost')) {
      score += 0.2
    }

    return Math.min(score, 1.0)
  }

  private extractRelationshipSummaries(graphData: any, analysis: QueryAnalysis): RelationshipSummary[] {
    if (!graphData || !graphData.records) return []

    const relationshipMap = new Map<string, any[]>()

    try {
      graphData.records.forEach((record: any) => {
        const obj = record.toObject()
        
        Object.values(obj).forEach((value: any) => {
          if (value && typeof value === 'object' && value.type && value.start && value.end) {
            const relType = value.type
            if (!relationshipMap.has(relType)) {
              relationshipMap.set(relType, [])
            }
            relationshipMap.get(relType)!.push(value)
          }
        })
      })

      const summaries: RelationshipSummary[] = []
      
      relationshipMap.forEach((rels, type) => {
        summaries.push({
          relationshipType: type,
          count: rels.length,
          description: this.describeRelationship(type, rels.length),
          examples: rels.slice(0, 3).map(r => ({
            source: r.start?.toString() || 'unknown',
            target: r.end?.toString() || 'unknown',
            properties: r.properties || {}
          }))
        })
      })

      return summaries
    } catch (error) {
      console.error('Error extracting relationship summaries:', error)
      return []
    }
  }

  private describeRelationship(type: string, count: number): string {
    const descriptions: Record<string, string> = {
      'CONTAINS': `Found ${count} ingredient relationship${count !== 1 ? 's' : ''} in formulations`,
      'USES': `Found ${count} ingredient usage${count !== 1 ? 's' : ''} in recipes`,
      'DERIVED_FROM': `Found ${count} recipe derivation${count !== 1 ? 's' : ''}`,
      'PRODUCES': `Found ${count} production relationship${count !== 1 ? 's' : ''}`,
      'MANUFACTURES': `Found ${count} manufacturing assignment${count !== 1 ? 's' : ''}`,
      'REQUIRES': `Found ${count} order requirement${count !== 1 ? 's' : ''}`,
      'ALTERNATIVE_TO': `Found ${count} ingredient substitution option${count !== 1 ? 's' : ''}`
    }

    return descriptions[type] || `Found ${count} ${type} relationship${count !== 1 ? 's' : ''}`
  }

  private async generateRecommendations(request: AIQuery, graphData: any, analysis: QueryAnalysis): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = []

    if (analysis.intent.includes('substitute') || analysis.intent.includes('alternative')) {
      recommendations.push(...await this.generateSubstitutionRecommendations(request.context))
    }

    if (analysis.intent.includes('cost') || analysis.intent.includes('optimize')) {
      recommendations.push(...this.generateCostOptimizationRecommendations(request.context))
    }

    if (analysis.intent.includes('yield') || analysis.intent.includes('loss')) {
      recommendations.push(...this.generateYieldImprovementRecommendations(request.context))
    }

    if (request.context?.activeFormulationId && request.context?.formulations) {
      const active = request.context.formulations.find(f => f.id === request.context?.activeFormulationId)
      if (active) {
        recommendations.push(...this.analyzeFormulationIssues(active))
      }
    }

    return recommendations.slice(0, 5)
  }

  private async generateSubstitutionRecommendations(context?: AIQuery['context']): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = []

    if (context?.formulations) {
      context.formulations.forEach(formulation => {
        const highCostIngredients = formulation.ingredients
          .filter(i => i.cost && i.cost > 10)
          .sort((a, b) => (b.cost || 0) - (a.cost || 0))
          .slice(0, 2)

        highCostIngredients.forEach(ingredient => {
          recommendations.push({
            type: 'substitution',
            title: `Consider substituting ${ingredient.name}`,
            description: `${ingredient.name} costs $${ingredient.cost?.toFixed(2)}/kg and represents ${ingredient.percentage.toFixed(1)}% of the formulation. Look for lower-cost alternatives with similar functional properties.`,
            impact: ingredient.percentage > 10 ? 'high' : 'medium',
            actionable: true,
            details: {
              ingredientId: ingredient.id,
              currentCost: ingredient.cost,
              percentage: ingredient.percentage,
              function: ingredient.function
            }
          })
        })
      })
    }

    return recommendations
  }

  private generateCostOptimizationRecommendations(context?: AIQuery['context']): Recommendation[] {
    const recommendations: Recommendation[] = []

    if (context?.formulations) {
      context.formulations.forEach(formulation => {
        const totalIngredientCost = formulation.ingredients.reduce((sum, i) => sum + ((i.cost || 0) * i.quantity), 0)
        
        if (totalIngredientCost > formulation.costPerUnit * 0.7) {
          recommendations.push({
            type: 'cost_optimization',
            title: `High ingredient cost ratio in ${formulation.name}`,
            description: `Ingredient costs represent ${((totalIngredientCost / formulation.costPerUnit) * 100).toFixed(0)}% of total cost. Consider bulk purchasing, supplier negotiations, or ingredient substitutions.`,
            impact: 'high',
            actionable: true,
            details: {
              formulationId: formulation.id,
              ingredientCostRatio: totalIngredientCost / formulation.costPerUnit,
              totalCost: formulation.costPerUnit
            }
          })
        }
      })
    }

    return recommendations
  }

  private generateYieldImprovementRecommendations(context?: AIQuery['context']): Recommendation[] {
    const recommendations: Recommendation[] = []

    if (context?.formulations) {
      const lowYieldFormulations = context.formulations.filter(f => 
        f.targetYield < 90 && f.status !== 'archived'
      )

      lowYieldFormulations.forEach(formulation => {
        recommendations.push({
          type: 'yield_improvement',
          title: `Improve yield for ${formulation.name}`,
          description: `Current yield is ${formulation.targetYield}%. Analyze process steps for excessive losses, review equipment efficiency, and consider process parameter optimization.`,
          impact: formulation.targetYield < 80 ? 'high' : 'medium',
          actionable: true,
          details: {
            formulationId: formulation.id,
            currentYield: formulation.targetYield,
            targetYield: 95
          }
        })
      })
    }

    return recommendations
  }

  private analyzeFormulationIssues(formulation: Formulation): Recommendation[] {
    const recommendations: Recommendation[] = []

    const totalPercentage = formulation.ingredients.reduce((sum, i) => sum + i.percentage, 0)
    if (Math.abs(totalPercentage - 100) > 0.1) {
      recommendations.push({
        type: 'quality_enhancement',
        title: 'Ingredient percentage imbalance',
        description: `Total percentage is ${totalPercentage.toFixed(2)}% instead of 100%. Adjust ingredient ratios to ensure formulation accuracy.`,
        impact: 'high',
        actionable: true,
        details: {
          formulationId: formulation.id,
          totalPercentage,
          deviation: Math.abs(totalPercentage - 100)
        }
      })
    }

    const missingCostData = formulation.ingredients.filter(i => !i.cost).length
    if (missingCostData > 0) {
      recommendations.push({
        type: 'quality_enhancement',
        title: 'Incomplete cost data',
        description: `${missingCostData} ingredient${missingCostData !== 1 ? 's' : ''} missing cost information. Complete cost data for accurate calculations.`,
        impact: 'medium',
        actionable: true,
        details: {
          formulationId: formulation.id,
          missingCostCount: missingCostData
        }
      })
    }

    return recommendations
  }

  private identifySources(graphData: any, context?: AIQuery['context']): DataSource[] {
    const sources: DataSource[] = []

    if (context?.formulations && context.formulations.length > 0) {
      sources.push({
        type: 'formulations',
        description: 'Local formulation data',
        recordCount: context.formulations.length
      })
    }

    if (graphData && graphData.records && graphData.records.length > 0) {
      sources.push({
        type: 'neo4j',
        description: 'Neo4j graph database',
        recordCount: graphData.records.length
      })
    }

    sources.push({
      type: 'llm',
      description: 'AI reasoning and natural language processing'
    })

    return sources
  }
}

interface QueryAnalysis {
  queryType: 'search' | 'comparison' | 'analysis' | 'recommendation' | 'summarization'
  requiresGraph: boolean
  entities: string[]
  filters: Array<{ field: string; operator: string; value: any }>
  metrics: string[]
  intent: string
  keywords: string[]
}

interface EnrichedContext {
  formulations: Formulation[]
  activeFormulation?: Formulation
  graphNodes: any[]
  timeRange?: { start: Date; end: Date }
}

export const aiAssistant = new AIAssistantService()
