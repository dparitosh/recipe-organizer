import neo4j from 'neo4j-driver'
import { neo4jDriver, Neo4jDriverConfig } from '@/lib/drivers/neo4j-driver'
import { genAIClient } from '@/lib/genai/genai-client'
import { Neo4jGraphNode, Neo4jGraphRelationship, Neo4jResult } from '@/lib/schemas/integration'
import { NEO4J_CONSTANTS } from '@/lib/constants'

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
    } catch (error) {
      console.error('Neo4j Manager: Connection failed', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    await neo4jDriver.disconnect()
  }

  async testConnection(config: Neo4jDriverConfig): Promise<boolean> {
    try {
      const testDriver = neo4j.driver(
        config.uri,
        neo4j.auth.basic(config.username, config.password),
        {
          connectionAcquisitionTimeout: NEO4J_CONSTANTS.TEST_CONNECTION_TIMEOUT_MS,
        }
      )
      await testDriver.verifyConnectivity()
      await testDriver.close()
      return true
    } catch (error) {
      console.error('Neo4j Manager: Test connection failed', error)
      return false
    }
  }

  setMockMode(enabled: boolean) {
    this.mockMode = enabled
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
      const nodeMap = new Map<string, boolean>()

      for (const record of result.records) {
        const obj = record.toObject()
        
        for (const key in obj) {
          const value = obj[key]
          
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
                nodeMap.set(nodeId, true)
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
                  nodeMap.set(startId, true)
                }

                const endId = segment.end.identity?.toString() || segment.end.elementId
                if (!nodeMap.has(endId)) {
                  const endNode: Neo4jGraphNode = {
                    id: endId,
                    labels: segment.end.labels,
                    properties: segment.end.properties || {}
                  }
                  nodes.push(endNode)
                  nodeMap.set(endId, true)
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
    } catch (error) {
      console.error('✗ Neo4j Manager: Query execution failed', error)
      throw error
    }
  }

  async naturalLanguageQuery(query: string, context?: Record<string, any>): Promise<any> {
    if (this.mockMode) {
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
      LIMIT $limit
    `
    return this.query(cypher, { limit: NEO4J_CONSTANTS.DEFAULT_QUERY_LIMIT })
  }

  private executeMockQuery(cypher: string, parameters?: Record<string, any>): Promise<Neo4jResult> {
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
