import neo4j, { Driver, Session, Result } from 'neo4j-driver'
import { NEO4J_CONSTANTS } from '@/lib/constants'

export interface Neo4jDriverConfig {
  uri: string
  username: string
  password: string
  database: string
}

export interface QueryResult {
  records: any[]
  summary: any
}

export class Neo4jDriver {
  private driver: Driver | null = null
  private config: Neo4jDriverConfig | null = null

  async connect(config: Neo4jDriverConfig): Promise<void> {
    if (this.driver) {
      await this.disconnect()
    }

    try {
      this.config = config
      this.driver = neo4j.driver(
        config.uri,
        neo4j.auth.basic(config.username, config.password),
        {
          maxConnectionLifetime: NEO4J_CONSTANTS.MAX_CONNECTION_LIFETIME_MS,
          maxConnectionPoolSize: NEO4J_CONSTANTS.MAX_CONNECTION_POOL_SIZE,
          connectionAcquisitionTimeout: NEO4J_CONSTANTS.CONNECTION_TIMEOUT_MS,
          disableLosslessIntegers: true
        }
      )

      await this.driver.verifyConnectivity()
    } catch (error) {
      console.error('Neo4j Driver: Connection failed', error)
      this.driver = null
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close()
      this.driver = null
      this.config = null
    }
  }

  async verifyConnectivity(): Promise<boolean> {
    if (!this.driver) {
      return false
    }

    try {
      await this.driver.verifyConnectivity()
      return true
    } catch (error) {
      console.error('Neo4j Driver: Connectivity check failed', error)
      return false
    }
  }

  async executeQuery(cypher: string, parameters?: Record<string, any>): Promise<QueryResult> {
    if (!this.driver || !this.config) {
      throw new Error('Neo4j driver not connected. Call connect() first.')
    }

    const session = this.driver.session({ database: this.config.database })

    try {
      const result = await session.run(cypher, parameters || {})
      return {
        records: result.records,
        summary: result.summary
      }
    } finally {
      await session.close()
    }
  }

  async executeWriteQuery(cypher: string, parameters?: Record<string, any>): Promise<QueryResult> {
    if (!this.driver || !this.config) {
      throw new Error('Neo4j driver not connected. Call connect() first.')
    }

    const session = this.driver.session({ database: this.config.database })

    try {
      const result = await session.executeWrite(async (tx) => {
        return await tx.run(cypher, parameters || {})
      })
      return {
        records: result.records,
        summary: result.summary
      }
    } finally {
      await session.close()
    }
  }

  async executeTransaction<T>(
    work: (tx: any) => Promise<T>,
    accessMode: 'READ' | 'WRITE' = 'READ'
  ): Promise<T> {
    if (!this.driver || !this.config) {
      throw new Error('Neo4j driver not connected. Call connect() first.')
    }

    const session = this.driver.session({ database: this.config.database })

    try {
      if (accessMode === 'WRITE') {
        return await session.executeWrite(work)
      } else {
        return await session.executeRead(work)
      }
    } finally {
      await session.close()
    }
  }

  getServerInfo(): any {
    return this.driver?.getServerInfo()
  }

  isConnected(): boolean {
    return this.driver !== null
  }

  getConfig(): Neo4jDriverConfig | null {
    return this.config ? { ...this.config } : null
  }
}

export const neo4jDriver = new Neo4jDriver()
