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
    if (this.mockMode) {
      throw new Error('Cannot clear schema in mock mode')
    }

    try {
      await this.query('MATCH (n) DETACH DELETE n')
    } catch (error) {
      console.error('✗ Neo4j Manager: Failed to clear schema', error)
      throw error
    }
  }

  async getNodeCount(): Promise<number> {
    if (this.mockMode) {
      return this.mockData?.nodes.length || 0
    }

    try {
      const result = await this.query('MATCH (n) RETURN count(n) as count')
      return result.metadata?.recordCount || 0
    } catch (error) {
      console.error('✗ Neo4j Manager: Failed to get node count', error)
      return 0
    }
  }

  private executeMockQuery(cypher: string, parameters?: Record<string, any>): Promise<Neo4jResult> {
    const mockNodes: Neo4jGraphNode[] = [
      {
        id: 'master-recipe-1',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.MASTER_RECIPE],
        properties: { 
          id: 'mr-001', 
          name: 'Chocolate Chip Cookie Master Recipe',
          version: '2.0',
          status: 'Approved',
          createdBy: 'chef@tcs.com',
          created: '2024-01-15'
        }
      },
      {
        id: 'recipe-1',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.RECIPE],
        properties: { 
          id: 'recipe-001', 
          name: 'Chocolate Chip Cookie Base Recipe',
          yield: '100 cookies',
          prepTime: '30 min',
          cookTime: '15 min'
        }
      },
      {
        id: 'mfg-recipe-1',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.MANUFACTURING_RECIPE],
        properties: { 
          id: 'mfg-001', 
          name: 'Cookie Production Line A',
          batchSize: '1000 kg',
          efficiency: '95%',
          equipmentRequired: ['Industrial Mixer', 'Conveyor Oven']
        }
      },
      {
        id: 'mfg-recipe-2',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.MANUFACTURING_RECIPE],
        properties: { 
          id: 'mfg-002', 
          name: 'Cookie Production Line B',
          batchSize: '750 kg',
          efficiency: '92%',
          equipmentRequired: ['Batch Mixer', 'Rotary Oven']
        }
      },
      {
        id: 'food-1',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.FOOD],
        properties: { 
          fdcId: 169414,
          description: 'Wheat flour, white, all-purpose, enriched',
          dataType: 'SR Legacy',
          foodCategory: 'Cereal Grains and Pasta',
          servingSize: 100,
          servingSizeUnit: 'g'
        }
      },
      {
        id: 'food-2',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.FOOD],
        properties: { 
          fdcId: 169655,
          description: 'Sugars, granulated',
          dataType: 'SR Legacy',
          foodCategory: 'Sweets',
          servingSize: 100,
          servingSizeUnit: 'g'
        }
      },
      {
        id: 'food-3',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.FOOD],
        properties: { 
          fdcId: 170851,
          description: 'Chocolate, dark, 70-85% cacao solids',
          dataType: 'SR Legacy',
          foodCategory: 'Sweets',
          servingSize: 100,
          servingSizeUnit: 'g'
        }
      },
      {
        id: 'food-4',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.FOOD],
        properties: { 
          fdcId: 173430,
          description: 'Butter, without salt',
          dataType: 'SR Legacy',
          foodCategory: 'Dairy and Egg Products',
          servingSize: 100,
          servingSizeUnit: 'g'
        }
      },
      {
        id: 'food-5',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.FOOD],
        properties: { 
          fdcId: 173424,
          description: 'Egg, whole, raw, fresh',
          dataType: 'SR Legacy',
          foodCategory: 'Dairy and Egg Products',
          servingSize: 50,
          servingSizeUnit: 'g'
        }
      },
      {
        id: 'nutrient-1',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.NUTRIENT],
        properties: {
          nutrientId: 1003,
          nutrientName: 'Protein',
          nutrientNumber: '203',
          unitName: 'g'
        }
      },
      {
        id: 'nutrient-2',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.NUTRIENT],
        properties: {
          nutrientId: 1004,
          nutrientName: 'Total lipid (fat)',
          nutrientNumber: '204',
          unitName: 'g'
        }
      },
      {
        id: 'nutrient-3',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.NUTRIENT],
        properties: {
          nutrientId: 1005,
          nutrientName: 'Carbohydrate, by difference',
          nutrientNumber: '205',
          unitName: 'g'
        }
      },
      {
        id: 'category-1',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.FOOD_CATEGORY],
        properties: {
          categoryId: 'cat-001',
          description: 'Cereal Grains and Pasta'
        }
      },
      {
        id: 'category-2',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.FOOD_CATEGORY],
        properties: {
          categoryId: 'cat-002',
          description: 'Sweets'
        }
      },
      {
        id: 'category-3',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.FOOD_CATEGORY],
        properties: {
          categoryId: 'cat-003',
          description: 'Dairy and Egg Products'
        }
      },
      {
        id: 'plant-1',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.PLANT],
        properties: { 
          id: 'plant-north', 
          name: 'North Regional Plant',
          region: 'North America',
          capacity: '10000 units/day',
          location: 'Chicago, IL',
          certifications: ['FDA', 'HACCP', 'ISO 22000']
        }
      },
      {
        id: 'plant-2',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.PLANT],
        properties: { 
          id: 'plant-south', 
          name: 'South Regional Plant',
          region: 'South America',
          capacity: '8000 units/day',
          location: 'São Paulo, BR',
          certifications: ['ANVISA', 'HACCP']
        }
      },
      {
        id: 'order-1',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.SALES_ORDER],
        properties: { 
          id: 'so-12345', 
          name: 'Retail Chain Order Q1 2024',
          quantity: '50000 units',
          customer: 'MegaMart',
          dueDate: '2024-03-30',
          priority: 'High',
          status: 'In Production'
        }
      },
      {
        id: 'order-2',
        labels: [NEO4J_CONSTANTS.NODE_LABELS.SALES_ORDER],
        properties: { 
          id: 'so-12346', 
          name: 'Export Order EU Q2 2024',
          quantity: '30000 units',
          customer: 'European Distributors',
          dueDate: '2024-04-15',
          priority: 'Medium',
          status: 'Planning'
        }
      }
    ]

    const mockRelationships: Neo4jGraphRelationship[] = [
      { id: 'rel-1', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.DERIVED_FROM, startNode: 'recipe-1', endNode: 'master-recipe-1', properties: { derivedDate: '2024-01-20' } },
      { id: 'rel-2', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.DERIVED_FROM, startNode: 'mfg-recipe-1', endNode: 'recipe-1', properties: { derivedDate: '2024-02-01' } },
      { id: 'rel-3', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.DERIVED_FROM, startNode: 'mfg-recipe-2', endNode: 'recipe-1', properties: { derivedDate: '2024-02-01' } },
      
      { id: 'rel-4', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.USES, startNode: 'recipe-1', endNode: 'food-1', properties: { amount: '500g' } },
      { id: 'rel-5', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.USES, startNode: 'recipe-1', endNode: 'food-2', properties: { amount: '300g' } },
      { id: 'rel-6', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.USES, startNode: 'recipe-1', endNode: 'food-3', properties: { amount: '200g' } },
      { id: 'rel-7', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.USES, startNode: 'recipe-1', endNode: 'food-4', properties: { amount: '250g' } },
      { id: 'rel-8', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.USES, startNode: 'recipe-1', endNode: 'food-5', properties: { amount: '2 units' } },
      
      { id: 'rel-9', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.USES, startNode: 'mfg-recipe-1', endNode: 'food-1', properties: { scaled: true } },
      { id: 'rel-10', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.USES, startNode: 'mfg-recipe-1', endNode: 'food-2', properties: { scaled: true } },
      { id: 'rel-11', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.USES, startNode: 'mfg-recipe-1', endNode: 'food-3', properties: { scaled: true } },

      { id: 'rel-12', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.BELONGS_TO_CATEGORY, startNode: 'food-1', endNode: 'category-1', properties: {} },
      { id: 'rel-13', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.BELONGS_TO_CATEGORY, startNode: 'food-2', endNode: 'category-2', properties: {} },
      { id: 'rel-14', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.BELONGS_TO_CATEGORY, startNode: 'food-3', endNode: 'category-2', properties: {} },
      { id: 'rel-15', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.BELONGS_TO_CATEGORY, startNode: 'food-4', endNode: 'category-3', properties: {} },
      { id: 'rel-16', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.BELONGS_TO_CATEGORY, startNode: 'food-5', endNode: 'category-3', properties: {} },

      { id: 'rel-17', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.CONTAINS_NUTRIENT, startNode: 'food-1', endNode: 'nutrient-1', properties: { value: 10.3, unit: 'g', per100g: 10.3 } },
      { id: 'rel-18', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.CONTAINS_NUTRIENT, startNode: 'food-1', endNode: 'nutrient-2', properties: { value: 1.2, unit: 'g', per100g: 1.2 } },
      { id: 'rel-19', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.CONTAINS_NUTRIENT, startNode: 'food-1', endNode: 'nutrient-3', properties: { value: 76.3, unit: 'g', per100g: 76.3 } },
      
      { id: 'rel-20', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.PRODUCES, startNode: 'plant-1', endNode: 'mfg-recipe-1', properties: { line: 'A', capacity: '500kg/hr' } },
      { id: 'rel-21', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.PRODUCES, startNode: 'plant-2', endNode: 'mfg-recipe-2', properties: { line: 'B', capacity: '350kg/hr' } },
      
      { id: 'rel-22', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.REQUIRES, startNode: 'order-1', endNode: 'mfg-recipe-1', properties: { quantity: 50000 } },
      { id: 'rel-23', type: NEO4J_CONSTANTS.RELATIONSHIP_TYPES.REQUIRES, startNode: 'order-2', endNode: 'mfg-recipe-2', properties: { quantity: 30000 } }
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
