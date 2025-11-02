import {
  Neo4jGraphNode,
  Neo4jGraphRelationship,
  Neo4jQuery,
  Neo4jResult,
  GraphPath,
  RELATIONSHIP_TYPES,
  NODE_LABELS
} from '@/lib/schemas/integration'

const NEO4J_CONFIG = {
  uri: import.meta.env.VITE_NEO4J_URI || 'bolt://localhost:7687',
  user: import.meta.env.VITE_NEO4J_USER || 'neo4j',
  password: import.meta.env.VITE_NEO4J_PASSWORD || 'password'
}

export class Neo4jClient {
  private mockMode: boolean = true

  constructor(mockMode: boolean = true) {
    this.mockMode = mockMode
  }

  async query(cypher: string, parameters?: Record<string, any>): Promise<Neo4jResult> {
    if (this.mockMode) {
      return this.mockQuery(cypher, parameters)
    }

    const startTime = Date.now()
    
    const response = await fetch('/api/neo4j/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cypher, parameters })
    })

    if (!response.ok) {
      throw new Error(`Neo4j query failed: ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      nodes: data.nodes || [],
      relationships: data.relationships || [],
      metadata: {
        executionTime: Date.now() - startTime,
        recordCount: data.nodes?.length || 0
      }
    }
  }

  async createNode(labels: string[], properties: any): Promise<string> {
    const nodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    if (this.mockMode) {
      console.log('Mock: Creating node', { labels, properties })
      return nodeId
    }

    const labelsStr = labels.map(l => `:${l}`).join('')
    const cypher = `CREATE (n${labelsStr} $props) RETURN id(n) as id`
    
    const result = await this.query(cypher, { props: properties })
    return result.nodes[0]?.id || nodeId
  }

  async createRelationship(
    from: string,
    to: string,
    type: string,
    properties?: any
  ): Promise<string> {
    const relId = `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    if (this.mockMode) {
      console.log('Mock: Creating relationship', { from, to, type, properties })
      return relId
    }

    const cypher = `
      MATCH (a), (b)
      WHERE id(a) = $fromId AND id(b) = $toId
      CREATE (a)-[r:${type} $props]->(b)
      RETURN id(r) as id
    `
    
    const result = await this.query(cypher, { fromId: from, toId: to, props: properties })
    return result.relationships[0]?.id || relId
  }

  async findShortestPath(from: string, to: string): Promise<GraphPath> {
    if (this.mockMode) {
      return this.mockShortestPath(from, to)
    }

    const cypher = `
      MATCH path = shortestPath((a)-[*]-(b))
      WHERE id(a) = $fromId AND id(b) = $toId
      RETURN path
    `
    
    const result = await this.query(cypher, { fromId: from, toId: to })
    
    return {
      start: from,
      end: to,
      nodes: result.nodes,
      relationships: result.relationships,
      length: result.relationships.length
    }
  }

  async findFormulationIngredients(formulationId: string): Promise<Neo4jResult> {
    const cypher = `
      MATCH (f:Formulation)-[:CONTAINS]->(i:Ingredient)
      WHERE f.id = $formulationId
      RETURN f, i
    `
    return this.query(cypher, { formulationId })
  }

  async findSimilarFormulations(formulationId: string, limit: number = 10): Promise<Neo4jResult> {
    const cypher = `
      MATCH (f:Formulation)-[:CONTAINS]->(i:Ingredient)<-[:CONTAINS]-(similar:Formulation)
      WHERE f.id = $formulationId AND f <> similar
      WITH similar, COUNT(i) as commonIngredients
      ORDER BY commonIngredients DESC
      LIMIT $limit
      RETURN similar, commonIngredients
    `
    return this.query(cypher, { formulationId, limit })
  }

  async findIngredientAlternatives(ingredientId: string): Promise<Neo4jResult> {
    const cypher = `
      MATCH (i:Ingredient)-[:ALTERNATIVE]-(alt:Ingredient)
      WHERE i.id = $ingredientId
      RETURN alt
    `
    return this.query(cypher, { ingredientId })
  }

  async getFormulationGraph(formulationId: string): Promise<Neo4jResult> {
    const cypher = `
      MATCH (f:Formulation {id: $formulationId})
      OPTIONAL MATCH (f)-[r1:CONTAINS]->(i:Ingredient)
      OPTIONAL MATCH (i)-[r2:ENRICHES]->(n:Nutrient)
      OPTIONAL MATCH (f)-[r3:REQUIRES]->(p:Process)
      RETURN f, r1, i, r2, n, r3, p
    `
    return this.query(cypher, { formulationId })
  }

  private mockQuery(cypher: string, parameters?: Record<string, any>): Promise<Neo4jResult> {
    console.log('Mock Neo4j Query:', cypher, parameters)
    
    return Promise.resolve({
      nodes: [
        {
          id: 'node-1',
          labels: [NODE_LABELS.FORMULATION],
          properties: { id: 'formula-1', name: 'Orange Juice Concentrate' }
        },
        {
          id: 'node-2',
          labels: [NODE_LABELS.INGREDIENT],
          properties: { id: 'ing-1', name: 'Orange Extract', percentage: 60 }
        },
        {
          id: 'node-3',
          labels: [NODE_LABELS.INGREDIENT],
          properties: { id: 'ing-2', name: 'Water', percentage: 35 }
        },
        {
          id: 'node-4',
          labels: [NODE_LABELS.INGREDIENT],
          properties: { id: 'ing-3', name: 'Citric Acid', percentage: 5 }
        }
      ],
      relationships: [
        {
          id: 'rel-1',
          type: RELATIONSHIP_TYPES.CONTAINS,
          startNode: 'node-1',
          endNode: 'node-2',
          properties: {}
        },
        {
          id: 'rel-2',
          type: RELATIONSHIP_TYPES.CONTAINS,
          startNode: 'node-1',
          endNode: 'node-3',
          properties: {}
        },
        {
          id: 'rel-3',
          type: RELATIONSHIP_TYPES.CONTAINS,
          startNode: 'node-1',
          endNode: 'node-4',
          properties: {}
        }
      ],
      metadata: {
        executionTime: 15,
        recordCount: 4
      }
    })
  }

  private mockShortestPath(from: string, to: string): Promise<GraphPath> {
    return Promise.resolve({
      start: from,
      end: to,
      nodes: [
        { id: from, labels: [NODE_LABELS.FORMULATION], properties: {} },
        { id: to, labels: [NODE_LABELS.INGREDIENT], properties: {} }
      ],
      relationships: [
        {
          id: 'path-rel-1',
          type: RELATIONSHIP_TYPES.CONTAINS,
          startNode: from,
          endNode: to,
          properties: {}
        }
      ],
      length: 1
    })
  }
}

export const neo4jClient = new Neo4jClient(true)
