import { describe, it, expect } from 'vitest'

import { AIAssistantService } from '../ai-assistant.runtime.js'

describe('AIAssistantService.normalizeBackendResponse', () => {
  it('maps GraphRAG payloads to UI-friendly structures', () => {
    const service = new AIAssistantService()

    const backendPayload = {
      answer: 'Example answer',
      execution_time_ms: 120,
      confidence: 0.92,
      data_sources: ['OLLAMA AI', 'GraphRAG Knowledge Base'],
      node_highlights: [
        {
          id: 'form:1',
          type: 'Formulation',
          name: 'Formulation A',
          properties: { id: 'form:1', status: 'approved' },
        },
      ],
      relationship_summaries: [
        {
          type: 'CONTAINS',
          count: 3,
          description: 'Contains 3 ingredients',
        },
      ],
      recommendations: [
        {
          type: 'cost_optimization',
          impact: 'high',
          description: 'Reduce salt usage by 2%',
          actionable: true,
        },
      ],
    }

    const normalized = service.normalizeBackendResponse(backendPayload, {}, Date.now())

    expect(normalized.answer).toBe('Example answer')
    expect(normalized.executionTime).toBe(120)
    expect(normalized.confidence).toBeCloseTo(0.92)

    expect(normalized.nodeHighlights).toHaveLength(1)
    expect(normalized.nodeHighlights[0]).toMatchObject({
      nodeId: 'form:1',
      nodeType: 'Formulation',
      name: 'Formulation A',
      properties: { id: 'form:1', status: 'approved' },
    })

    expect(normalized.relationshipSummaries[0]).toEqual({
      relationshipType: 'CONTAINS',
      count: 3,
      description: 'Contains 3 ingredients',
    })

    expect(normalized.recommendations[0]).toMatchObject({
      type: 'cost_optimization',
      impact: 'high',
      actionable: true,
      description: 'Reduce salt usage by 2%',
    })

    expect(normalized.sources.map((source) => source.type)).toContain('neo4j')
    expect(normalized.sources.map((source) => source.description)).toContain('OLLAMA AI')
  })
})