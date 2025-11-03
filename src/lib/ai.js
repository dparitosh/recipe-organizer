import { useKV } from '@github/spark/hooks'

const DEFAULT_BACKEND_URL = 'http://localhost:8000'

class AIAssistant {
  constructor() {
    this.backendUrl = DEFAULT_BACKEND_URL
    this.serviceMode = 'auto'
  }

  setBackendUrl(url) {
    this.backendUrl = url || DEFAULT_BACKEND_URL
  }

  setServiceMode(mode) {
    this.serviceMode = mode
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.backendUrl}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }
      
      const data = await response.json()
      return {
        status: data.status,
        llmAvailable: data.llm_available,
        neo4jAvailable: data.neo4j_available,
        genaiAvailable: data.genai_available,
        responseTimeMs: data.response_time_ms
      }
    } catch (error) {
      console.error('Health check error:', error)
      return {
        status: 'unavailable',
        llmAvailable: false,
        neo4jAvailable: false,
        genaiAvailable: false,
        responseTimeMs: 0,
        error: error.message
      }
    }
  }

  async query({ question, context = {}, serviceMode = null }) {
    const mode = serviceMode || this.serviceMode
    
    try {
      const response = await fetch(`${this.backendUrl}/api/ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: question,
          service_mode: mode,
          include_graph: true
        })
      })

      if (!response.ok) {
        if (mode === 'online') {
          throw new Error(`AI service unavailable: ${response.status}`)
        }
        
        return this.offlineFallback(question, context)
      }

      const data = await response.json()
      
      return {
        answer: data.answer,
        mode: data.mode,
        executionTime: data.execution_time_ms,
        confidence: data.confidence,
        sources: this.formatDataSources(data.data_sources),
        cypher: data.cypher_query || null,
        nodeHighlights: this.formatNodeHighlights(data.node_highlights),
        relationshipSummaries: this.formatRelationshipSummaries(data.relationship_summaries),
        recommendations: this.formatRecommendations(data.recommendations)
      }
    } catch (error) {
      console.error('AI query error:', error)
      
      if (mode === 'online') {
        throw error
      }
      
      return this.offlineFallback(question, context)
    }
  }

  offlineFallback(question, context) {
    const questionLower = question.toLowerCase()
    const { formulations = [] } = context
    
    let answer = '⚠️ AI service is offline. Using local search capabilities.\n\n'
    
    const keywords = {
      cost: () => {
        const withCost = formulations.filter(f => f.totalCost > 0)
        return `Found ${withCost.length} formulations with cost data available.`
      },
      yield: () => {
        const withYield = formulations.filter(f => f.yieldPercentage)
        return `Found ${withYield.length} formulations with yield data.`
      },
      ingredient: () => {
        const allIngredients = new Set()
        formulations.forEach(f => {
          (f.ingredients || []).forEach(ing => allIngredients.add(ing.name))
        })
        return `Found ${allIngredients.size} unique ingredients across all formulations.`
      },
      recipe: () => {
        return `Found ${formulations.length} total formulations in your workspace.`
      }
    }
    
    let keywordMatched = false
    for (const [keyword, handler] of Object.entries(keywords)) {
      if (questionLower.includes(keyword)) {
        answer += handler()
        keywordMatched = true
        break
      }
    }
    
    if (!keywordMatched) {
      answer += 'Unable to process this query in offline mode. Please try again when the AI service is available, or use the search and filter tools.'
    }
    
    return {
      answer,
      mode: 'offline',
      executionTime: 50,
      confidence: 0.3,
      sources: [{ type: 'local', description: 'Local Cache', recordCount: formulations.length }],
      cypher: null,
      nodeHighlights: [],
      relationshipSummaries: [],
      recommendations: [
        {
          type: 'general',
          title: 'Use Manual Search',
          description: 'Use the formulations view to search and filter recipes manually',
          impact: 'low',
          actionable: true
        },
        {
          type: 'general',
          title: 'Check Service Status',
          description: 'Check Settings → AI Service to see when the AI becomes available',
          impact: 'low',
          actionable: true
        }
      ]
    }
  }

  formatDataSources(sources) {
    if (!sources || !Array.isArray(sources)) return []
    
    return sources.map(source => {
      if (source.includes('Neo4j')) {
        return { type: 'neo4j', description: source }
      } else if (source.includes('OpenAI') || source.includes('GPT')) {
        return { type: 'llm', description: source }
      } else {
        return { type: 'other', description: source }
      }
    })
  }

  formatNodeHighlights(nodes) {
    if (!nodes || !Array.isArray(nodes)) return []
    
    return nodes.map(node => ({
      nodeType: node.type || 'Unknown',
      name: node.name || node.id || 'Unnamed',
      properties: node.properties || {},
      relevance: 0.8
    }))
  }

  formatRelationshipSummaries(summaries) {
    if (!summaries || !Array.isArray(summaries)) return []
    
    return summaries.map(summary => ({
      relationshipType: summary.type || 'UNKNOWN',
      count: summary.count || 0,
      description: summary.description || `${summary.count} relationships found`
    }))
  }

  formatRecommendations(recommendations) {
    if (!recommendations || !Array.isArray(recommendations)) return []
    
    return recommendations.map(rec => ({
      type: rec.type || 'general',
      title: this.getRecommendationTitle(rec.type),
      description: rec.description || 'No description available',
      impact: rec.impact || 'low',
      actionable: rec.actionable !== false
    }))
  }

  getRecommendationTitle(type) {
    const titles = {
      cost_optimization: 'Cost Optimization',
      yield_improvement: 'Yield Improvement',
      substitution: 'Ingredient Substitution',
      process_optimization: 'Process Optimization',
      quality_enhancement: 'Quality Enhancement',
      general: 'General Recommendation'
    }
    return titles[type] || 'Recommendation'
  }
}

export const aiAssistant = new AIAssistant()
