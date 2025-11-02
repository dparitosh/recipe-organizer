import neo4j, { Driver, Session } from 'neo4j-driver'
import {
  Neo4jGraphNode,
  Neo4jGraphRelationship,
  Neo4jQuery,
  Neo4jResult,
  GraphPath,
  RELATIONSHIP_TYPES,
  NODE_LABELS
} from '@/lib/schemas/integration'

export interface Neo4jConnectionConfig {
  uri: string
  username: string
  password: string
  database: string
}

export class Neo4jClient {
  private mockMode: boolean = true
  private driver: Driver | null = null
  private config: Neo4jConnectionConfig = {
    uri: 'neo4j+s://2cccd05b.databases.neo4j.io',
    username: 'neo4j',
    password: 'tcs12345',
    database: 'neo4j'
  }

  constructor(mockMode: boolean = true, config?: Neo4jConnectionConfig) {
    this.mockMode = mockMode
    if (config) {
      this.config = config
    }
  }

  async connect(): Promise<void> {
    if (this.driver) {
      await this.driver.close()
    }

    try {
      this.driver = neo4j.driver(
        this.config.uri,
        neo4j.auth.basic(this.config.username, this.config.password)
      )
      await this.driver.verifyConnectivity()
      console.log('Neo4j connected successfully')
    } catch (error) {
      console.error('Failed to connect to Neo4j:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close()
      this.driver = null
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.driver) {
        await this.connect()
      }
      await this.driver!.verifyConnectivity()
      return true
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  setMockMode(enabled: boolean) {
    this.mockMode = enabled
  }

  async setConfig(config: Neo4jConnectionConfig): Promise<void> {
    this.config = config
    if (!this.mockMode && this.driver) {
      await this.disconnect()
      await this.connect()
    }
  }

  getConfig(): Neo4jConnectionConfig {
    return { ...this.config }
  }

  isMockMode(): boolean {
    return this.mockMode
  }

  isConnected(): boolean {
    return this.driver !== null
  }

  async query(cypher: string, parameters?: Record<string, any>): Promise<Neo4jResult> {
    if (this.mockMode) {
      return this.mockQuery(cypher, parameters)
    }

    const startTime = Date.now()
    
    try {
      if (!this.driver) {
        await this.connect()
      }

      const session = this.driver!.session({
        database: this.config.database,
        defaultAccessMode: neo4j.session.READ
      })

      try {
        const result = await session.run(cypher, parameters)
        
        const nodes: Neo4jGraphNode[] = []
        const relationships: Neo4jGraphRelationship[] = []
        const nodeMap = new Map<string, Neo4jGraphNode>()

        for (const record of result.records) {
          for (const key of record.keys) {
            const value = record.get(key)
            
            if (value && typeof value === 'object') {
              if (value.labels) {
                const nodeId = value.identity?.toString() || value.elementId
                if (!nodeMap.has(nodeId)) {
                  const node: Neo4jGraphNode = {
                    id: nodeId,
                    labels: value.labels,
                    properties: value.properties || {}
                  }
                  nodes.push(node)
                  nodeMap.set(nodeId, node)
                }
              } else if (value.type) {
                const rel: Neo4jGraphRelationship = {
                  id: value.identity?.toString() || value.elementId,
                  type: value.type,
                  startNode: value.start?.toString() || value.startNodeElementId,
                  endNode: value.end?.toString() || value.endNodeElementId,
                  properties: value.properties || {}
                }
                relationships.push(rel)
              } else if (value.segments) {
                for (const segment of value.segments) {
                  const startId = segment.start.identity?.toString() || segment.start.elementId
                  if (!nodeMap.has(startId)) {
                    const startNode: Neo4jGraphNode = {
                      id: startId,
                      labels: segment.start.labels,
                      properties: segment.start.properties || {}
                    }
                    nodes.push(startNode)
                    nodeMap.set(startId, startNode)
                  }

                  const endId = segment.end.identity?.toString() || segment.end.elementId
                  if (!nodeMap.has(endId)) {
                    const endNode: Neo4jGraphNode = {
                      id: endId,
                      labels: segment.end.labels,
                      properties: segment.end.properties || {}
                    }
                    nodes.push(endNode)
                    nodeMap.set(endId, endNode)
                  }

                  const rel: Neo4jGraphRelationship = {
                    id: segment.relationship.identity?.toString() || segment.relationship.elementId,
                    type: segment.relationship.type,
                    startNode: startId,
                    endNode: endId,
                    properties: segment.relationship.properties || {}
                  }
                  relationships.push(rel)
                }
              }
            }
          }
        }
        
        return {
          nodes,
          relationships,
          metadata: {
            executionTime: Date.now() - startTime,
            recordCount: nodes.length
          }
        }
      } finally {
        await session.close()
      }
    } catch (error) {
      console.error('Neo4j query error:', error)
      throw error
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

  async getRelationshipGraph(): Promise<Neo4jResult> {
    const cypher = `
      MATCH path = (n)-[r]->(m)
      WHERE n:Ingredient OR n:Recipe OR n:MasterRecipe OR n:ManufacturingRecipe OR n:Plant OR n:SalesOrder
      RETURN path
      LIMIT 200
    `
    return this.query(cypher)
  }

  async getRecipeRelationships(recipeId: string): Promise<Neo4jResult> {
    const cypher = `
      MATCH path = (r:Recipe {id: $recipeId})-[*1..3]-(n)
      RETURN path
    `
    return this.query(cypher, { recipeId })
  }

  async findPathBetweenNodes(fromId: string, toId: string): Promise<Neo4jResult> {
    const cypher = `
      MATCH path = shortestPath((a {id: $fromId})-[*]-(b {id: $toId}))
      RETURN path
    `
    return this.query(cypher, { fromId, toId })
  }

  async getPlantManufacturingGraph(plantId: string): Promise<Neo4jResult> {
    const cypher = `
      MATCH (p:Plant {id: $plantId})-[:produces]->(mr:ManufacturingRecipe)
      OPTIONAL MATCH (mr)-[:derived_from]->(r:Recipe)
      OPTIONAL MATCH (mr)-[:uses]->(i:Ingredient)
      OPTIONAL MATCH (so:SalesOrder)-[:REQUIRES]->(mr)
      RETURN p, mr, r, i, so
    `
    return this.query(cypher, { plantId })
  }

  async filterByAllergen(allergen: string): Promise<Neo4jResult> {
    const cypher = `
      MATCH (i:Ingredient {allergen: $allergen})<-[:uses]-(r)
      RETURN i, r
    `
    return this.query(cypher, { allergen })
  }

  async filterByPlant(plantId: string): Promise<Neo4jResult> {
    const cypher = `
      MATCH (p:Plant {id: $plantId})-[:produces]->(mr:ManufacturingRecipe)
      OPTIONAL MATCH (mr)-[*1..2]-(n)
      RETURN p, mr, n
    `
    return this.query(cypher, { plantId })
  }

  async filterByRegion(region: string): Promise<Neo4jResult> {
    const cypher = `
      MATCH (p:Plant {region: $region})-[:produces]->(mr:ManufacturingRecipe)
      OPTIONAL MATCH (mr)-[*1..2]-(n)
      RETURN p, mr, n
    `
    return this.query(cypher, { region })
  }

  private mockQuery(cypher: string, parameters?: Record<string, any>): Promise<Neo4jResult> {
    console.log('Mock Neo4j Query:', cypher, parameters)
    
    const mockNodes = [
      {
        id: 'master-recipe-1',
        labels: ['MasterRecipe'],
        properties: { 
          id: 'mr-001', 
          name: 'Chocolate Chip Cookie Master',
          version: '2.0',
          status: 'Approved',
          created: '2024-01-15'
        }
      },
      {
        id: 'recipe-1',
        labels: ['Recipe'],
        properties: { 
          id: 'recipe-001', 
          name: 'Chocolate Chip Cookie Base',
          yield: '100 units',
          prepTime: '45 min'
        }
      },
      {
        id: 'mfg-recipe-1',
        labels: ['ManufacturingRecipe'],
        properties: { 
          id: 'mfg-001', 
          name: 'Cookie Production Line A',
          batchSize: '1000 kg',
          efficiency: '95%'
        }
      },
      {
        id: 'mfg-recipe-2',
        labels: ['ManufacturingRecipe'],
        properties: { 
          id: 'mfg-002', 
          name: 'Cookie Production Line B',
          batchSize: '750 kg',
          efficiency: '92%'
        }
      },
      {
        id: 'ingredient-1',
        labels: ['Ingredient'],
        properties: { 
          id: 'ing-flour', 
          name: 'All-Purpose Flour',
          quantity: '500g',
          allergen: 'Gluten',
          supplier: 'Grain Co.'
        }
      },
      {
        id: 'ingredient-2',
        labels: ['Ingredient'],
        properties: { 
          id: 'ing-sugar', 
          name: 'Granulated Sugar',
          quantity: '300g',
          supplier: 'Sweet Supply Inc.'
        }
      },
      {
        id: 'ingredient-3',
        labels: ['Ingredient'],
        properties: { 
          id: 'ing-chocolate', 
          name: 'Chocolate Chips',
          quantity: '200g',
          allergen: 'Dairy',
          supplier: 'Cocoa Corp'
        }
      },
      {
        id: 'ingredient-4',
        labels: ['Ingredient'],
        properties: { 
          id: 'ing-butter', 
          name: 'Unsalted Butter',
          quantity: '250g',
          allergen: 'Dairy',
          supplier: 'Dairy Farms Ltd'
        }
      },
      {
        id: 'ingredient-5',
        labels: ['Ingredient'],
        properties: { 
          id: 'ing-eggs', 
          name: 'Large Eggs',
          quantity: '2 units',
          allergen: 'Eggs',
          supplier: 'Farm Fresh'
        }
      },
      {
        id: 'plant-1',
        labels: ['Plant'],
        properties: { 
          id: 'plant-north', 
          name: 'North Regional Plant',
          region: 'North America',
          capacity: '10000 units/day',
          location: 'Chicago, IL'
        }
      },
      {
        id: 'plant-2',
        labels: ['Plant'],
        properties: { 
          id: 'plant-south', 
          name: 'South Regional Plant',
          region: 'South America',
          capacity: '8000 units/day',
          location: 'São Paulo, BR'
        }
      },
      {
        id: 'order-1',
        labels: ['SalesOrder'],
        properties: { 
          id: 'so-12345', 
          name: 'Retail Chain Order Q1',
          quantity: '50000 units',
          customer: 'MegaMart',
          dueDate: '2024-03-30',
          priority: 'High'
        }
      },
      {
        id: 'order-2',
        labels: ['SalesOrder'],
        properties: { 
          id: 'so-12346', 
          name: 'Export Order EU',
          quantity: '30000 units',
          customer: 'European Distributors',
          dueDate: '2024-04-15',
          priority: 'Medium'
        }
      }
    ]

    const mockRelationships = [
      { id: 'rel-1', type: 'derived_from', startNode: 'recipe-1', endNode: 'master-recipe-1', properties: {} },
      { id: 'rel-2', type: 'derived_from', startNode: 'mfg-recipe-1', endNode: 'recipe-1', properties: {} },
      { id: 'rel-3', type: 'derived_from', startNode: 'mfg-recipe-2', endNode: 'recipe-1', properties: {} },
      
      { id: 'rel-4', type: 'uses', startNode: 'recipe-1', endNode: 'ingredient-1', properties: { amount: '500g' } },
      { id: 'rel-5', type: 'uses', startNode: 'recipe-1', endNode: 'ingredient-2', properties: { amount: '300g' } },
      { id: 'rel-6', type: 'uses', startNode: 'recipe-1', endNode: 'ingredient-3', properties: { amount: '200g' } },
      { id: 'rel-7', type: 'uses', startNode: 'recipe-1', endNode: 'ingredient-4', properties: { amount: '250g' } },
      { id: 'rel-8', type: 'uses', startNode: 'recipe-1', endNode: 'ingredient-5', properties: { amount: '2 units' } },
      
      { id: 'rel-9', type: 'uses', startNode: 'mfg-recipe-1', endNode: 'ingredient-1', properties: { scaled: true } },
      { id: 'rel-10', type: 'uses', startNode: 'mfg-recipe-1', endNode: 'ingredient-2', properties: { scaled: true } },
      { id: 'rel-11', type: 'uses', startNode: 'mfg-recipe-1', endNode: 'ingredient-3', properties: { scaled: true } },
      
      { id: 'rel-12', type: 'produces', startNode: 'plant-1', endNode: 'mfg-recipe-1', properties: { line: 'A' } },
      { id: 'rel-13', type: 'produces', startNode: 'plant-2', endNode: 'mfg-recipe-2', properties: { line: 'B' } },
      
      { id: 'rel-14', type: 'REQUIRES', startNode: 'order-1', endNode: 'mfg-recipe-1', properties: {} },
      { id: 'rel-15', type: 'REQUIRES', startNode: 'order-2', endNode: 'mfg-recipe-2', properties: {} }
    ]
    
    return Promise.resolve({
      nodes: mockNodes,
      relationships: mockRelationships,
      metadata: {
        executionTime: 25,
        recordCount: mockNodes.length
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
