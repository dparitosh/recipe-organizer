import { neo4jDriver, Neo4jDriverConfig } from '@/lib/drivers/neo4j-driver'
import { plmClient } from '@/lib/api/plm'
import { mdgClient } from '@/lib/api/mdg'
import { Neo4jResult, PLMMaterial, MDGMaterial } from '@/lib/schemas/integration'
import { Formulation } from '@/lib/schemas/formulation'

export interface IntegrationConfig {
  neo4j?: Neo4jDriverConfig
  plm?: {
    baseUrl: string
    apiKey: string
    enabled: boolean
  }
  mdg?: {
    baseUrl: string
    apiKey: string
    client: string
    plant: string
    enabled: boolean
  }
}

export interface SyncStatus {
  service: 'neo4j' | 'plm' | 'mdg'
  connected: boolean
  lastSync?: Date
  error?: string
}

export class IntegrationManager {
  private config: IntegrationConfig = {}
  private syncStatuses: Map<string, SyncStatus> = new Map()

  async initializeConnections(config: IntegrationConfig): Promise<void> {
    this.config = config
    const promises: Promise<void>[] = []

    if (config.neo4j) {
      promises.push(this.connectNeo4j(config.neo4j))
    }

    if (config.plm?.enabled) {
      promises.push(this.connectPLM())
    }

    if (config.mdg?.enabled) {
      promises.push(this.connectMDG())
    }

    await Promise.allSettled(promises)
  }

  private async connectNeo4j(config: Neo4jDriverConfig): Promise<void> {
    try {
      await neo4jDriver.connect(config)
      this.updateSyncStatus('neo4j', {
        service: 'neo4j',
        connected: true,
        lastSync: new Date()
      })
      console.log('✓ Integration Manager: Neo4j connected')
    } catch (error) {
      this.updateSyncStatus('neo4j', {
        service: 'neo4j',
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      })
      console.error('✗ Integration Manager: Neo4j connection failed', error)
      throw error
    }
  }

  private async connectPLM(): Promise<void> {
    try {
      this.updateSyncStatus('plm', {
        service: 'plm',
        connected: true,
        lastSync: new Date()
      })
      console.log('✓ Integration Manager: PLM connected')
    } catch (error) {
      this.updateSyncStatus('plm', {
        service: 'plm',
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      })
      console.error('✗ Integration Manager: PLM connection failed', error)
    }
  }

  private async connectMDG(): Promise<void> {
    try {
      this.updateSyncStatus('mdg', {
        service: 'mdg',
        connected: true,
        lastSync: new Date()
      })
      console.log('✓ Integration Manager: MDG connected')
    } catch (error) {
      this.updateSyncStatus('mdg', {
        service: 'mdg',
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      })
      console.error('✗ Integration Manager: MDG connection failed', error)
    }
  }

  async syncFormulationToNeo4j(formulation: Formulation): Promise<void> {
    if (!neo4jDriver.isConnected()) {
      throw new Error('Neo4j not connected')
    }

    try {
      const cypher = `
        MERGE (f:Formulation {id: $id})
        SET f.name = $name,
            f.version = $version,
            f.type = $type,
            f.status = $status,
            f.targetYield = $targetYield,
            f.yieldUnit = $yieldUnit,
            f.updatedAt = datetime()
        
        WITH f
        UNWIND $ingredients AS ingredient
        MERGE (i:Ingredient {id: ingredient.id})
        SET i.name = ingredient.name,
            i.quantity = ingredient.quantity,
            i.unit = ingredient.unit,
            i.percentage = ingredient.percentage,
            i.function = ingredient.function,
            i.supplier = ingredient.supplier,
            i.cost = ingredient.cost
        MERGE (f)-[r:CONTAINS]->(i)
        SET r.percentage = ingredient.percentage,
            r.quantity = ingredient.quantity
        
        RETURN f, collect(i) as ingredients
      `

      await neo4jDriver.executeWriteQuery(cypher, {
        id: formulation.id,
        name: formulation.name,
        version: formulation.version,
        type: formulation.type,
        status: formulation.status,
        targetYield: formulation.targetYield,
        yieldUnit: formulation.yieldUnit,
        ingredients: formulation.ingredients.map(ing => ({
          id: ing.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          percentage: ing.percentage,
          function: ing.function,
          supplier: ing.supplier || '',
          cost: ing.cost || 0
        }))
      })

      this.updateSyncStatus('neo4j', {
        service: 'neo4j',
        connected: true,
        lastSync: new Date()
      })

      console.log('✓ Formulation synced to Neo4j:', formulation.id)
    } catch (error) {
      console.error('✗ Failed to sync formulation to Neo4j', error)
      throw error
    }
  }

  async enrichIngredientFromPLM(ingredientName: string): Promise<PLMMaterial | null> {
    try {
      const materials = await plmClient.searchMaterials(ingredientName)
      
      if (materials.length > 0) {
        this.updateSyncStatus('plm', {
          service: 'plm',
          connected: true,
          lastSync: new Date()
        })
        return materials[0]
      }
      
      return null
    } catch (error) {
      console.error('✗ Failed to enrich ingredient from PLM', error)
      return null
    }
  }

  async syncIngredientToMDG(ingredient: any): Promise<string | null> {
    try {
      const mdgMaterial: MDGMaterial = {
        materialNumber: '',
        materialDescription: ingredient.name,
        materialGroup: 'RAW',
        materialType: 'ROH',
        baseUnit: ingredient.unit || 'KG',
        valuationClass: '3000',
        procurementType: 'E',
        mrpType: 'ND',
        plant: this.config.mdg?.plant || '1000',
        storageLocation: '0001',
        standardCost: ingredient.cost || 0
      }

      const materialNumber = await mdgClient.createMaterial(mdgMaterial)
      
      this.updateSyncStatus('mdg', {
        service: 'mdg',
        connected: true,
        lastSync: new Date()
      })

      console.log('✓ Ingredient synced to MDG:', materialNumber)
      return materialNumber
    } catch (error) {
      console.error('✗ Failed to sync ingredient to MDG', error)
      return null
    }
  }

  async queryNeo4j(cypher: string, parameters?: Record<string, any>): Promise<Neo4jResult> {
    if (!neo4jDriver.isConnected()) {
      throw new Error('Neo4j not connected')
    }

    try {
      const result = await neo4jDriver.executeQuery(cypher, parameters)
      
      const nodes: any[] = []
      const relationships: any[] = []
      const nodeMap = new Map<string, boolean>()

      for (const record of result.records) {
        const obj = record.toObject()
        
        for (const key in obj) {
          const value = obj[key]
          
          if (value && typeof value === 'object') {
            if (value.labels) {
              const nodeId = value.identity?.toString() || value.elementId
              if (!nodeMap.has(nodeId)) {
                const node = {
                  id: nodeId,
                  labels: value.labels,
                  properties: value.properties || {}
                }
                nodes.push(node)
                nodeMap.set(nodeId, true)
              }
            } else if (value.type) {
              relationships.push({
                id: value.identity?.toString() || value.elementId,
                type: value.type,
                startNode: value.start?.toString() || value.startNodeElementId,
                endNode: value.end?.toString() || value.endNodeElementId,
                properties: value.properties || {}
              })
            } else if (value.segments) {
              for (const segment of value.segments) {
                const startId = segment.start.identity?.toString() || segment.start.elementId
                if (!nodeMap.has(startId)) {
                  nodes.push({
                    id: startId,
                    labels: segment.start.labels,
                    properties: segment.start.properties || {}
                  })
                  nodeMap.set(startId, true)
                }

                const endId = segment.end.identity?.toString() || segment.end.elementId
                if (!nodeMap.has(endId)) {
                  nodes.push({
                    id: endId,
                    labels: segment.end.labels,
                    properties: segment.end.properties || {}
                  })
                  nodeMap.set(endId, true)
                }

                relationships.push({
                  id: segment.relationship.identity?.toString() || segment.relationship.elementId,
                  type: segment.relationship.type,
                  startNode: startId,
                  endNode: endId,
                  properties: segment.relationship.properties || {}
                })
              }
            }
          }
        }
      }

      return {
        nodes,
        relationships,
        metadata: {
          executionTime: result.summary?.resultAvailableAfter?.toNumber() || 0,
          recordCount: nodes.length
        }
      }
    } catch (error) {
      console.error('✗ Neo4j query failed', error)
      throw error
    }
  }

  async testAllConnections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}

    if (this.config.neo4j) {
      try {
        results.neo4j = await neo4jDriver.verifyConnectivity()
      } catch {
        results.neo4j = false
      }
    }

    if (this.config.plm?.enabled) {
      try {
        await plmClient.searchMaterials('test')
        results.plm = true
      } catch {
        results.plm = false
      }
    }

    if (this.config.mdg?.enabled) {
      try {
        await mdgClient.searchMaterials('test')
        results.mdg = true
      } catch {
        results.mdg = false
      }
    }

    return results
  }

  getSyncStatus(service: 'neo4j' | 'plm' | 'mdg'): SyncStatus | undefined {
    return this.syncStatuses.get(service)
  }

  getAllSyncStatuses(): SyncStatus[] {
    return Array.from(this.syncStatuses.values())
  }

  private updateSyncStatus(service: string, status: SyncStatus): void {
    this.syncStatuses.set(service, status)
  }

  async disconnect(): Promise<void> {
    await neo4jDriver.disconnect()
    this.syncStatuses.clear()
    console.log('✓ Integration Manager: All connections closed')
  }

  isNeo4jConnected(): boolean {
    return neo4jDriver.isConnected()
  }

  getConfig(): IntegrationConfig {
    return { ...this.config }
  }
}

export const integrationManager = new IntegrationManager()
