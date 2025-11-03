export type ServiceStatus = 'online' | 'offline' | 'checking' | 'error'

export interface ServiceHealth {
  status: ServiceStatus
  lastChecked: Date
  responseTime?: number
  errorMessage?: string
  capabilities: {
    llm: boolean
    neo4j: boolean
    genai: boolean
  }
}

export class AIServiceMonitor {
  private status: ServiceStatus = 'checking'
  private lastHealth: ServiceHealth | null = null
  private listeners: Array<(health: ServiceHealth) => void> = []
  private checkInterval: NodeJS.Timeout | null = null

  async checkHealth(): Promise<ServiceHealth> {
    const startTime = Date.now()
    this.status = 'checking'
    this.notifyListeners()

    try {
      const capabilities = await this.testCapabilities()
      const responseTime = Date.now() - startTime

      const isOnline = capabilities.llm || capabilities.neo4j

      const health: ServiceHealth = {
        status: isOnline ? 'online' : 'offline',
        lastChecked: new Date(),
        responseTime,
        capabilities
      }

      this.status = health.status
      this.lastHealth = health
      this.notifyListeners()

      return health
    } catch (error) {
      const health: ServiceHealth = {
        status: 'error',
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        capabilities: {
          llm: false,
          neo4j: false,
          genai: false
        }
      }

      this.status = 'error'
      this.lastHealth = health
      this.notifyListeners()

      return health
    }
  }

  private async testCapabilities(): Promise<ServiceHealth['capabilities']> {
    const capabilities = {
      llm: false,
      neo4j: false,
      genai: false
    }

    try {
      if (typeof window !== 'undefined' && (window as any).spark?.llm) {
        const testPrompt = (window as any).spark.llmPrompt`Test`
        await Promise.race([
          (window as any).spark.llm(testPrompt, 'gpt-4o-mini'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('LLM timeout')), 5000))
        ])
        capabilities.llm = true
        capabilities.genai = true
      }
    } catch (error) {
      console.warn('LLM service check failed:', error)
    }

    try {
      const { neo4jDriver } = await import('@/lib/drivers/neo4j-driver')
      if (neo4jDriver.isConnected()) {
        capabilities.neo4j = true
      }
    } catch (error) {
      console.warn('Neo4j service check failed:', error)
    }

    return capabilities
  }

  getStatus(): ServiceStatus {
    return this.status
  }

  getLastHealth(): ServiceHealth | null {
    return this.lastHealth
  }

  isOnline(): boolean {
    return this.status === 'online'
  }

  isOffline(): boolean {
    return this.status === 'offline' || this.status === 'error'
  }

  subscribe(listener: (health: ServiceHealth) => void): () => void {
    this.listeners.push(listener)
    
    if (this.lastHealth) {
      listener(this.lastHealth)
    }

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners() {
    if (this.lastHealth) {
      this.listeners.forEach(listener => listener(this.lastHealth!))
    }
  }

  startMonitoring(intervalMs: number = 60000) {
    if (this.checkInterval) {
      this.stopMonitoring()
    }

    this.checkHealth()
    
    this.checkInterval = setInterval(() => {
      this.checkHealth()
    }, intervalMs)
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }
}

export const aiServiceMonitor = new AIServiceMonitor()
