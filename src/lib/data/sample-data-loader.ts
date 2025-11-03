import { neo4jManager } from '@/lib/managers/neo4j-manager'

export interface SampleDataStats {
  nodesCreated: number
  relationshipsCreated: number
  categories: string[]
  executionTime: number
}

export class SampleDataLoader {
  async loadAllSampleData(): Promise<SampleDataStats> {
    throw new Error('Sample data loading has been removed. Please use real FDC data ingestion.')
  }

  async clearDatabase(): Promise<void> {
    const cypher = `
      MATCH (n)
      DETACH DELETE n
    `
    await neo4jManager.query(cypher)
  }
}

export const sampleDataLoader = new SampleDataLoader()
