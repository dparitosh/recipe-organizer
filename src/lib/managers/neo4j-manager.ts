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
  private mockMode: boolean = false
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
      await this.query('MATCH (n) DETACH DELETE n')
    } catch (error) {
      console.error('✗ Neo4j Manager: Failed to clear schema', error)
      throw error
    }
  }

  async getNodeCount(): Promise<number> {
    try {
      const result = await this.query('MATCH (n) RETURN count(n) as count')
      return result.metadata?.recordCount || 0
    } catch (error) {
      console.error('✗ Neo4j Manager: Failed to get node count', error)
      return 0
    }
  }

  private executeMockQuery(cypher: string, parameters?: Record<string, any>): Promise<Neo4jResult> {
    console.log('Neo4j Manager: Running in mock mode - no data available')
    console.log('Please connect to Neo4j or ingest FDC data to see results')
    
    return Promise.resolve({
      nodes: [],
      relationships: [],
      metadata: {
        executionTime: 0,
        recordCount: 0
      }
    })
  }
}

export const neo4jManager = new Neo4jManager()
