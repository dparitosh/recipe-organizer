import { Neo4jConnectionConfig } from './neo4j'

export class Neo4jAPIClient {
  static async testConnection(config: Neo4jConnectionConfig): Promise<boolean> {
    try {
      const response = await fetch('/api/neo4j/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      return response.ok
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  static async executeQuery(
    cypher: string,
    parameters: Record<string, any>,
    config: Neo4jConnectionConfig
  ): Promise<any> {
    const response = await fetch('/api/neo4j/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cypher, parameters, config })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || 'Query execution failed')
    }

    return response.json()
  }
}

export function createMockNeo4jAPI() {
  let mockConnectionValid = true

  const originalFetch = window.fetch

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    if (url.includes('/api/neo4j/test')) {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      if (mockConnectionValid) {
        return new Response(JSON.stringify({ success: true, message: 'Connection successful' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      } else {
        return new Response('Connection failed: Invalid credentials', {
          status: 401,
          headers: { 'Content-Type': 'text/plain' }
        })
      }
    }

    if (url.includes('/api/neo4j/query')) {
      await new Promise(resolve => setTimeout(resolve, 300))

      const body = init?.body ? JSON.parse(init.body as string) : {}
      const { cypher, parameters, config } = body

      const mockNodes = [
        {
          id: 'node-1',
          labels: ['Recipe'],
          properties: {
            id: 'recipe-001',
            name: 'Master Cookie Recipe',
            version: '1.0'
          }
        },
        {
          id: 'node-2',
          labels: ['Ingredient'],
          properties: {
            id: 'ing-001',
            name: 'Flour',
            quantity: '500g'
          }
        }
      ]

      const mockRelationships = [
        {
          id: 'rel-1',
          type: 'USES',
          startNode: 'node-1',
          endNode: 'node-2',
          properties: { amount: '500g' }
        }
      ]

      return new Response(JSON.stringify({
        nodes: mockNodes,
        relationships: mockRelationships,
        recordCount: mockNodes.length
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return originalFetch(input, init!)
  }

  return {
    setConnectionValid: (valid: boolean) => {
      mockConnectionValid = valid
    },
    restore: () => {
      window.fetch = originalFetch
    }
  }
}
