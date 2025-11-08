import { Formulation } from '@/lib/schemas/formulation'
import { AIQuery, AIResponse, NodeHighlight, Recommendation } from './ai-assistant'

export class OfflineAIHandler {
  async query(request: AIQuery): Promise<AIResponse> {
    const startTime = Date.now()

    try {
      const analysis = this.analyzeQueryOffline(request.question)
      const answer = this.generateOfflineAnswer(request, analysis)
      const recommendations = this.generateOfflineRecommendations(request, analysis)

      const executionTime = Date.now() - startTime

      return {
        answer: answer,
        nodeHighlights: [],
        relationshipSummaries: [],
        recommendations: recommendations,
        cypher: null,
        executionTime,
        confidence: 0.7,
        sources: [
          {
            type: 'formulations',
            description: 'Local formulation data',
            recordCount: request.context?.formulations?.length || 0
          }
        ]
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      return {
        answer: `Unable to process your question in offline mode: ${error instanceof Error ? error.message : 'Unknown error'}. Limited functionality is available without AI service.`,
        nodeHighlights: [],
        relationshipSummaries: [],
        recommendations: [],
        cypher: null,
        executionTime,
        confidence: 0,
        sources: []
      }
    }
  }

  private analyzeQueryOffline(question: string): OfflineAnalysis {
    const lowerQuestion = question.toLowerCase()

    const queryType = this.detectQueryType(lowerQuestion)
    const entities = this.detectEntities(lowerQuestion)
    const metrics = this.detectMetrics(lowerQuestion)
    const keywords = lowerQuestion.split(/\s+/).filter(w => w.length > 3)

    return {
      queryType,
      entities,
      metrics,
      keywords,
      intent: this.inferIntent(queryType, entities)
    }
  }

  private detectQueryType(question: string): string {
    if (question.includes('show') || question.includes('list') || question.includes('find')) {
      return 'search'
    }
    if (question.includes('compare') || question.includes('difference') || question.includes('vs')) {
      return 'comparison'
    }
    if (question.includes('suggest') || question.includes('recommend') || question.includes('substitute')) {
      return 'recommendation'
    }
    if (question.includes('analyze') || question.includes('trend') || question.includes('pattern')) {
      return 'analysis'
    }
    if (question.includes('summarize') || question.includes('summary') || question.includes('overview')) {
      return 'summarization'
    }
    return 'search'
  }

  private detectEntities(question: string): string[] {
    const entities: string[] = []
    
    if (question.includes('ingredient') || question.includes('material')) {
      entities.push('ingredient')
    }
    if (question.includes('recipe') || question.includes('formulation')) {
      entities.push('formulation')
    }
    if (question.includes('cost') || question.includes('price')) {
      entities.push('cost')
    }
    if (question.includes('yield')) {
      entities.push('yield')
    }
    if (question.includes('nutrition') || question.includes('nutrient')) {
      entities.push('nutrition')
    }
    if (question.includes('plant') || question.includes('facility')) {
      entities.push('plant')
    }
    if (question.includes('order')) {
      entities.push('order')
    }

    return entities
  }

  private detectMetrics(question: string): string[] {
    const metrics: string[] = []
    
    if (question.includes('cost')) metrics.push('cost')
    if (question.includes('yield')) metrics.push('yield')
    if (question.includes('quantity') || question.includes('amount')) metrics.push('quantity')
    if (question.includes('percent') || question.includes('%')) metrics.push('percentage')
    if (question.includes('price')) metrics.push('price')
    if (question.includes('time') || question.includes('duration')) metrics.push('time')

    return metrics
  }

  private inferIntent(queryType: string, entities: string[]): string {
    if (queryType === 'recommendation') {
      return 'optimize or substitute'
    }
    if (queryType === 'comparison') {
      return 'compare alternatives'
    }
    if (queryType === 'analysis' && entities.includes('cost')) {
      return 'cost analysis'
    }
    if (queryType === 'analysis' && entities.includes('yield')) {
      return 'yield analysis'
    }
    if (queryType === 'search') {
      return 'find information'
    }
    return 'general inquiry'
  }

  private generateOfflineAnswer(request: AIQuery, analysis: OfflineAnalysis): string {
    const formulations = request.context?.formulations || []

    if (formulations.length === 0) {
      return '⚠️ **Offline Mode**: No formulation data available. Please ensure formulations are loaded or switch to online mode for full functionality.'
    }

    if (analysis.queryType === 'summarization') {
      return this.generateSummary(formulations, analysis)
    }

    if (analysis.queryType === 'search') {
      return this.generateSearchResults(formulations, analysis)
    }

    if (analysis.queryType === 'recommendation') {
      return this.generateRecommendationText(formulations, analysis)
    }

    if (analysis.queryType === 'comparison') {
      return this.generateComparison(formulations, analysis)
    }

    if (analysis.queryType === 'analysis') {
      return this.generateAnalysis(formulations, analysis)
    }

    return `⚠️ **Offline Mode**: I found ${formulations.length} formulation(s) in local data. For detailed analysis of your question "${request.question}", please connect to the AI service.`
  }

  private generateSummary(formulations: Formulation[], analysis: OfflineAnalysis): string {
    const total = formulations.length
    const approved = formulations.filter(f => f.status === 'approved').length
    const draft = formulations.filter(f => f.status === 'draft').length

    let summary = `📊 **Formulation Summary** (Offline Mode)\n\n`
    summary += `• Total formulations: ${total}\n`
    summary += `• Approved: ${approved}\n`
    summary += `• Draft: ${draft}\n\n`

    if (analysis.entities.includes('ingredient')) {
      const allIngredients = new Set<string>()
      formulations.forEach(f => {
        f.ingredients?.forEach(ing => {
          if (ing.name) allIngredients.add(ing.name)
        })
      })
      summary += `• Unique ingredients: ${allIngredients.size}\n`
    }

    summary += `\n⚠️ Limited analysis in offline mode. Connect to AI service for comprehensive insights.`

    return summary
  }

  private generateSearchResults(formulations: Formulation[], analysis: OfflineAnalysis): string {
    const keywords = analysis.keywords
    const matchingFormulations = formulations.filter(f => {
      const searchText = `${f.name} ${f.metadata?.notes || ''} ${f.type || ''}`.toLowerCase()
      return keywords.some(kw => searchText.includes(kw))
    })

    if (matchingFormulations.length === 0) {
      return `🔍 **Search Results** (Offline Mode)\n\nNo formulations found matching your criteria. Total formulations available: ${formulations.length}\n\n⚠️ Offline search is limited to basic keyword matching. Connect to AI service for semantic search.`
    }

    let results = `🔍 **Search Results** (Offline Mode)\n\nFound ${matchingFormulations.length} matching formulation(s):\n\n`
    
    matchingFormulations.slice(0, 5).forEach((f, idx) => {
  results += `${idx + 1}. **${f.name}** (${f.status})\n`
  if (f.metadata?.notes) results += `   ${f.metadata.notes}\n`
      if (f.ingredients) results += `   Ingredients: ${f.ingredients.length}\n`
      results += `\n`
    })

    if (matchingFormulations.length > 5) {
      results += `...and ${matchingFormulations.length - 5} more\n\n`
    }

    results += `⚠️ Limited search in offline mode. Connect to AI service for advanced filtering and semantic search.`

    return results
  }

  private generateRecommendationText(formulations: Formulation[], analysis: OfflineAnalysis): string {
    let text = `💡 **Recommendations** (Offline Mode)\n\n`
    text += `Based on local data analysis:\n\n`
    
    if (analysis.entities.includes('cost')) {
      text += `• Review high-cost ingredients for substitution opportunities\n`
      text += `• Consider bulk purchasing for frequently used materials\n`
    }
    
    if (analysis.entities.includes('yield')) {
      text += `• Optimize process steps to minimize losses\n`
      text += `• Review formulations with yield < 85% for improvement\n`
    }
    
    text += `\n⚠️ Generic recommendations in offline mode. Connect to AI service for formulation-specific optimization suggestions.`
    
    return text
  }

  private generateComparison(formulations: Formulation[], analysis: OfflineAnalysis): string {
    if (formulations.length < 2) {
      return `⚠️ **Offline Mode**: Need at least 2 formulations to compare. Currently available: ${formulations.length}`
    }

    let comparison = `⚖️ **Comparison** (Offline Mode)\n\n`
    comparison += `Comparing ${Math.min(formulations.length, 3)} formulations:\n\n`

    formulations.slice(0, 3).forEach((f, idx) => {
      comparison += `**${idx + 1}. ${f.name}**\n`
      comparison += `   Status: ${f.status}\n`
      comparison += `   Ingredients: ${f.ingredients?.length || 0}\n`
      comparison += `\n`
    })

    comparison += `⚠️ Basic comparison only in offline mode. Connect to AI service for detailed cost, yield, and nutrition analysis.`

    return comparison
  }

  private generateAnalysis(formulations: Formulation[], analysis: OfflineAnalysis): string {
    let analysisText = `📈 **Analysis** (Offline Mode)\n\n`
    
    if (analysis.entities.includes('cost')) {
      analysisText += `Cost analysis requires detailed ingredient pricing data.\n`
    }
    
    if (analysis.entities.includes('yield')) {
      analysisText += `Yield analysis requires process step data and historical records.\n`
    }
    
    analysisText += `\nAvailable data: ${formulations.length} formulation(s)\n\n`
    analysisText += `⚠️ Limited analysis capabilities in offline mode. Connect to AI service for comprehensive trend analysis and predictive insights.`
    
    return analysisText
  }

  private generateOfflineRecommendations(request: AIQuery, analysis: OfflineAnalysis): Recommendation[] {
    const recommendations: Recommendation[] = []

    if (analysis.entities.includes('cost')) {
      recommendations.push({
        type: 'cost_optimization',
        title: 'Review Ingredient Costs',
        description: 'Analyze ingredient pricing and consider bulk purchasing or alternative suppliers. (Offline suggestion)',
        impact: 'medium',
        actionable: true
      })
    }

    if (analysis.entities.includes('yield')) {
      recommendations.push({
        type: 'yield_improvement',
        title: 'Optimize Process Efficiency',
        description: 'Review process steps for potential yield improvements and waste reduction. (Offline suggestion)',
        impact: 'medium',
        actionable: true
      })
    }

    if (analysis.queryType === 'recommendation') {
      recommendations.push({
        type: 'substitution',
        title: 'Explore Ingredient Alternatives',
        description: 'Consider evaluating alternative ingredients that may offer cost or quality benefits. (Offline suggestion)',
        impact: 'low',
        actionable: true
      })
    }

    recommendations.push({
      type: 'quality_enhancement',
      title: 'Connect AI Service for Enhanced Recommendations',
      description: 'Switch to online mode or configure AI service for formulation-specific, data-driven recommendations.',
      impact: 'high',
      actionable: true
    })

    return recommendations.slice(0, 4)
  }
}

interface OfflineAnalysis {
  queryType: string
  entities: string[]
  metrics: string[]
  keywords: string[]
  intent: string
}

export const offlineAIHandler = new OfflineAIHandler()
