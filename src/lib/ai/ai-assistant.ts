import type { Formulation } from '@/lib/schemas/formulation'

import { aiAssistant as jsAIAssistant } from './ai-assistant.runtime.js'

export interface AIQuery {
  question: string
  context?: {
    formulations?: Formulation[]
    activeFormulationId?: string
    timeRange?: { start: Date; end: Date }
  }
}

export interface NodeHighlight {
  nodeId: string
  nodeType: string
  name: string
  relevance: number
  properties: Record<string, any>
}

export interface RelationshipSummary {
  relationshipType: string
  count: number
  description: string
}

export interface Recommendation {
  type: 'cost_optimization' | 'yield_improvement' | 'substitution' | 'process_optimization' | 'quality_enhancement' | 'general'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  actionable: boolean
  details?: Record<string, any>
}

export interface DataSource {
  type: 'neo4j' | 'formulations' | 'llm'
  description: string
  recordCount?: number
}

export interface AIResponse {
  answer: string
  nodeHighlights: NodeHighlight[]
  relationshipSummaries: RelationshipSummary[]
  recommendations: Recommendation[]
  cypher: string | null
  executionTime: number
  confidence: number
  sources: DataSource[]
}

export const aiAssistant = jsAIAssistant
