import neo4j from 'neo4j-driver'
import { neo4jDriver, Neo4jDriverConfig } from '@/lib/drivers/neo4j-driver'
import { genAIClient } from '@/lib/genai/genai-client'
import { Neo4jGraphNode, Neo4jGraphRelationship, Neo4jResult } from '@/lib/schemas/integration'
import { NEO4J_CONSTANTS } from '@/lib/constants'

export interface ConnectionStatus {
  isConnected: boolean
  config: Neo4jDriverConfig | null
  serverInfo?: any
  mockMode: boolean
}

export class Neo4jManager {
  private mockMode = true

  private readonly mockNodes: Neo4jGraphNode[] = [
    {
      id: 'form-001',
      labels: ['Formulation'],
      properties: {
        name: 'Artisan Sourdough',
        version: '1.0',
        status: 'draft',
        createdAt: '2024-01-12T08:30:00Z',
      },
    },
    {
      id: 'form-002',
      labels: ['Formulation'],
      properties: {
        name: 'Chocolate Muffin',
        version: '2.1',
        status: 'released',
        createdAt: '2024-02-22T13:15:00Z',
      },
    },
    {
      id: 'ing-001',
      labels: ['Ingredient'],
      properties: {
        name: 'Bread Flour',
        percentage: 55,
        unit: 'kg',
      },
    },
    {
      id: 'ing-002',
      labels: ['Ingredient'],
      properties: {
        name: 'Water',
        percentage: 35,
        unit: 'kg',
      },
    },
    {
      id: 'ing-003',
      labels: ['Ingredient'],
      properties: {
        name: 'Cocoa Powder',
        percentage: 8,
        unit: 'kg',
      },
    },
    {
      id: 'ing-004',
      labels: ['Ingredient'],
      properties: {
        name: 'Sugar',
        percentage: 12,
        unit: 'kg',
      },
    },
  ]

  private readonly mockRelationships: Neo4jGraphRelationship[] = [
    {
      id: 'rel-001',
      type: 'USES_INGREDIENT',
      startNode: 'form-001',
      endNode: 'ing-001',
      properties: { contribution: 55 },
    },
    {
      id: 'rel-002',
      type: 'USES_INGREDIENT',
      startNode: 'form-001',
      endNode: 'ing-002',
      properties: { contribution: 35 },
    },
    {
      id: 'rel-003',
      type: 'USES_INGREDIENT',
      startNode: 'form-002',
      endNode: 'ing-003',
      properties: { contribution: 8 },
    },
    {
      id: 'rel-004',
      type: 'USES_INGREDIENT',
      startNode: 'form-002',
      endNode: 'ing-004',
      properties: { contribution: 12 },
    },
  ]

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
    this.mockMode = true
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
    if (enabled && neo4jDriver.isConnected()) {
      neo4jDriver.disconnect().catch((error) => {
        console.warn('Neo4j Manager: Failed to disconnect when enabling mock mode', error)
      })
    }
  }

  isMockMode(): boolean {
    return this.mockMode
  }

  isConnected(): boolean {
    if (this.mockMode) {
      return true
    }
    return neo4jDriver.isConnected()
  }

  getConnectionStatus(): ConnectionStatus {
    return {
      isConnected: this.isConnected(),
      config: neo4jDriver.getConfig(),
      serverInfo: neo4jDriver.getServerInfo(),
      mockMode: this.mockMode,
    }
  }

  async query(cypher: string, parameters?: Record<string, any>): Promise<Neo4jResult> {
    const startTime = Date.now()
    
    try {
      if (this.mockMode) {
        return this.createMockResult(startTime)
      }

      if (!neo4jDriver.isConnected()) {
        throw new Error('Neo4j driver not connected. Call connect() first.')
      }

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
      const cypher = this.buildMockCypher(query)
      const graph = this.createMockResult(Date.now())
      return {
        generatedCypher: cypher,
        explanation: 'Generated using mock GenAI provider',
        records: [
          {
            mock: true,
            nodes: graph.nodes,
            relationships: graph.relationships,
          },
        ],
        summary: {
          resultAvailableAfter: { low: 1, high: 0 },
          resultConsumedAfter: { low: 2, high: 0 },
        },
      }
    }

    return await genAIClient.executeCypherFromNL(query, context)
  }

  async getFormulationGraph(formulationId: string): Promise<Neo4jResult> {
    const cypher = `
      MATCH (f:${NEO4J_CONSTANTS.NODE_LABELS.FORMULATION} {id: $formulationId})
      OPTIONAL MATCH (f)-[r1:${NEO4J_CONSTANTS.RELATIONSHIP_TYPES.USES_INGREDIENT}]->(food:${NEO4J_CONSTANTS.NODE_LABELS.FOOD})
      OPTIONAL MATCH (food)-[r2:${NEO4J_CONSTANTS.RELATIONSHIP_TYPES.CONTAINS_NUTRIENT}]->(n:${NEO4J_CONSTANTS.NODE_LABELS.NUTRIENT})
      OPTIONAL MATCH (f)-[r3:REQUIRES]->(p:Process)
      RETURN f, r1, food, r2, n, r3, p
    `
    return this.query(cypher, { formulationId })
  }

  async getRelationshipGraph(): Promise<Neo4jResult> {
    const cypher = `
      MATCH path = (n)-[r]->(m)
      WHERE n:${NEO4J_CONSTANTS.NODE_LABELS.FOOD} 
         OR n:${NEO4J_CONSTANTS.NODE_LABELS.FORMULATION}
         OR n:${NEO4J_CONSTANTS.NODE_LABELS.RECIPE} 
         OR n:${NEO4J_CONSTANTS.NODE_LABELS.MASTER_RECIPE} 
         OR n:${NEO4J_CONSTANTS.NODE_LABELS.MANUFACTURING_RECIPE} 
         OR n:${NEO4J_CONSTANTS.NODE_LABELS.PLANT} 
         OR n:${NEO4J_CONSTANTS.NODE_LABELS.SALES_ORDER}
      RETURN path
      LIMIT $limit
    `
    return this.query(cypher, { limit: NEO4J_CONSTANTS.DEFAULT_QUERY_LIMIT })
  }

  async clearSchema(): Promise<void> {
    try {
      if (this.mockMode) {
        return
      }
      await this.query('MATCH (n) DETACH DELETE n')
    } catch (error) {
      console.error('✗ Neo4j Manager: Failed to clear schema', error)
      throw error
    }
  }

  async getNodeCount(): Promise<number> {
    try {
      if (this.mockMode) {
        return this.mockNodes.length
      }
      const result = await this.query('MATCH (n) RETURN count(n) as count')
      return result.metadata?.recordCount || 0
    } catch (error) {
      console.error('✗ Neo4j Manager: Failed to get node count', error)
      return 0
    }
  }

  private createMockResult(startTime: number): Neo4jResult {
    const nodes = this.mockNodes.map((node) => ({
      ...node,
      properties: { ...node.properties },
    }))

    const relationships = this.mockRelationships.map((relationship) => ({
      ...relationship,
      properties: { ...relationship.properties },
    }))

    return {
      nodes,
      relationships,
      metadata: {
        executionTime: Math.max(2, Date.now() - startTime),
        recordCount: nodes.length,
      },
    }
  }

  private buildMockCypher(naturalLanguageQuery: string): string {
    const normalized = naturalLanguageQuery.toLowerCase()

    if (normalized.includes('chocolate')) {
      return 'MATCH (f:Formulation {name: "Chocolate Muffin"})-[:USES_INGREDIENT]->(i:Ingredient) RETURN f, i LIMIT 10'
    }

    if (normalized.includes('ingredient') || normalized.includes('uses')) {
      return 'MATCH (f:Formulation)-[:USES_INGREDIENT]->(i:Ingredient) RETURN f, i LIMIT 10'
    }

    if (normalized.includes('recipe')) {
      return 'MATCH (f:Formulation) RETURN f LIMIT 5'
    }

    return 'MATCH (n) RETURN n LIMIT 10'
  }
}

export const neo4jManager = new Neo4jManager()
