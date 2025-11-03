import { useKV } from '@github/spark/hooks'

export type AIServiceMode = 'online' | 'offline' | 'auto'

export interface AIServiceConfig {
  mode: AIServiceMode
  onlineEndpoint?: string
  offlineCapabilities: {
    basicSearch: boolean
    dataAnalysis: boolean
    recommendations: boolean
  }
  autoFallback: boolean
  retryAttempts: number
  timeoutMs: number
}

export const DEFAULT_AI_CONFIG: AIServiceConfig = {
  mode: 'auto',
  onlineEndpoint: undefined,
  offlineCapabilities: {
    basicSearch: true,
    dataAnalysis: true,
    recommendations: true
  },
  autoFallback: true,
  retryAttempts: 2,
  timeoutMs: 10000
}

export class AIServiceConfigManager {
  private config: AIServiceConfig = DEFAULT_AI_CONFIG

  setConfig(config: Partial<AIServiceConfig>) {
    this.config = { ...this.config, ...config }
  }

  getConfig(): AIServiceConfig {
    return { ...this.config }
  }

  getMode(): AIServiceMode {
    return this.config.mode
  }

  setMode(mode: AIServiceMode) {
    this.config.mode = mode
  }

  isOnlineMode(): boolean {
    return this.config.mode === 'online' || this.config.mode === 'auto'
  }

  isOfflineMode(): boolean {
    return this.config.mode === 'offline'
  }

  shouldAutoFallback(): boolean {
    return this.config.autoFallback && this.config.mode === 'auto'
  }

  getRetryAttempts(): number {
    return this.config.retryAttempts
  }

  getTimeoutMs(): number {
    return this.config.timeoutMs
  }

  getOfflineCapabilities() {
    return { ...this.config.offlineCapabilities }
  }
}

export const aiServiceConfig = new AIServiceConfigManager()
