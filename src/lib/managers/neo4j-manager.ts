import { neo4jDriver, Neo4jDriverConfig } from '@/lib/drivers/neo4j-driver'
import { genAIClient } from '@/lib/genai/genai-client'
import { Neo4jGraphNode, Neo4jGraphRelationship, Neo4jResult } from '@/lib/schemas/integration'

export interface ConnectionStatus {
  isConnected: boolean
  isMockMode: boolean
  config: Neo4jDriverConfig | null
  serverInfo?: any
}

export class Neo4jManager {
  private mockMode: boolean = true
  private mockData: Neo4jResult | null = null

  async connect(config: Neo4jDriverConfig): Promise<void> {
    try {
      await neo4jDriver.connect(config)
      this.mockMode = false
      console.log('✓ Neo4j Manager: Connection established')
    } catch (error) {
      console.error('✗ Neo4j Manager: Connection failed', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    await neo4jDriver.disconnect()
    console.log('✓ Neo4j Manager: Disconnected')
  }

  async testConnection(config: Neo4jDriverConfig): Promise<boolean> {
    try {
      await neo4jDriver.connect(config)
      const isConnected = await neo4jDriver.verifyConnectivity()
      
      if (!isConnected) {
        await neo4jDriver.disconnect()
      }
      
      return isConnected
    } catch (error) {
      console.error('✗ Neo4j Manager: Test connection failed', error)
      return false
    }
  }

  setMockMode(enabled: boolean) {
    this.mockMode = enabled
    if (enabled) {
      console.log('✓ Neo4j Manager: Mock mode enabled')
    } else {
      console.log('✓ Neo4j Manager: Mock mode disabled')
    }
  }

  isMockMode(): boolean {
    return this.mockMode
  }

  isConnected(): boolean {
    return neo4jDriver.isConnected() && !this.mockMode
  }

  getConnectionStatus(): ConnectionStatus {
    return {
      isConnected: this.isConnected(),
      isMockMode: this.mockMode,
      config: neo4jDriver.getConfig(),
      serverInfo: neo4jDriver.getServerInfo()
    }
  }

  async query(cypher: string, parameters?: Record<string, any>): Promise<Neo4jResult> {
    if (this.mockMode) {
      return this.executeMockQuery(cypher, parameters)
    }

    const startTime = Date.now()
    
    try {
      const result = await neo4jDriver.executeQuery(cypher, parameters)
      
      const nodes: Neo4jGraphNode[] = []
      const relationships: Neo4jGraphRelationship[] = []
      const nodeMap = new Map<string, Neo4jGraphNode>()

      for (const record of result.records) {
        const keys = Object.keys(record.toObject())
        
        for (const key of keys) {
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
    } catch (error) {
      console.error('✗ Neo4j Manager: Query execution failed', error)
      throw error
    }
  }

  async naturalLanguageQuery(query: string, context?: Record<string, any>): Promise<any> {
    if (this.mockMode) {
      console.log('Natural language query in mock mode:', query)
      return this.executeMockQuery('MATCH (n) RETURN n LIMIT 10')
    }

    return await genAIClient.executeCypherFromNL(query, context)
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

  private executeMockQuery(cypher: string, parameters?: Record<string, any>): Promise<Neo4jResult> {
    console.log('Mock Query:', cypher, parameters)
    
    const mockNodes: Neo4jGraphNode[] = [
      {
        id: 'master-recipe-1',
        labels: ['MasterRecipe'],
        properties: { 
          id: 'mr-001', 
          name: 'Chocolate Chip Cookie Master',
          version: '2.0',
          status: 'Approved'
        }
      },
      {
        id: 'recipe-1',
        labels: ['Recipe'],
        properties: { 
          id: 'recipe-001', 
          name: 'Chocolate Chip Cookie Base',
          yield: '100 units'
        }
      },
      {
        id: 'mfg-recipe-1',
        labels: ['ManufacturingRecipe'],
        properties: { 
          id: 'mfg-001', 
          name: 'Cookie Production Line A',
          batchSize: '1000 kg'
        }
      },
      {
        id: 'ingredient-1',
        labels: ['Ingredient'],
        properties: { 
          id: 'ing-flour', 
          name: 'All-Purpose Flour',
          allergen: 'Gluten'
        }
      },
      {
        id: 'ingredient-2',
        labels: ['Ingredient'],
        properties: { 
          id: 'ing-chocolate', 
          name: 'Chocolate Chips',
          allergen: 'Dairy'
        }
      },
      {
        id: 'plant-1',
        labels: ['Plant'],
        properties: { 
          id: 'plant-north', 
          name: 'North Regional Plant',
          region: 'North America'
        }
      },
      {
        id: 'order-1',
        labels: ['SalesOrder'],
        properties: { 
          id: 'so-12345', 
          name: 'Retail Chain Order Q1',
          quantity: '50000 units'
        }
      }
    ]

    const mockRelationships: Neo4jGraphRelationship[] = [
      { id: 'rel-1', type: 'derived_from', startNode: 'recipe-1', endNode: 'master-recipe-1', properties: {} },
      { id: 'rel-2', type: 'derived_from', startNode: 'mfg-recipe-1', endNode: 'recipe-1', properties: {} },
      { id: 'rel-3', type: 'uses', startNode: 'recipe-1', endNode: 'ingredient-1', properties: {} },
      { id: 'rel-4', type: 'uses', startNode: 'recipe-1', endNode: 'ingredient-2', properties: {} },
      { id: 'rel-5', type: 'produces', startNode: 'plant-1', endNode: 'mfg-recipe-1', properties: {} },
      { id: 'rel-6', type: 'REQUIRES', startNode: 'order-1', endNode: 'mfg-recipe-1', properties: {} }
    ]
    
    return Promise.resolve({
      nodes: mockNodes,
      relationships: mockRelationships,
      metadata: {
        executionTime: 15,
        recordCount: mockNodes.length
      }
    })
  }
}

export const neo4jManager = new Neo4jManager()
