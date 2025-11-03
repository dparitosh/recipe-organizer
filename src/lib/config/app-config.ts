import { useKV } from '@github/spark/hooks'

export interface ApplicationConfig {
  backend: {
    requestTimeout
    healthCheckIntervalMs: number
    requestTimeoutMs: number
  }
    defaul
  ai: {
    fallbackModel: '
    cypherGeneration
    serviceMode: 'on
    retryAttempts: number
  }
    apiBaseUrl: string
    defaultPageSize: number
   
  calcu
    yieldWarningThreshold: number
    highLossThreshold: number
    massBalanceTolerance: number
  ui: {
    graphDefaultHeight: str
    searchDebounceMs: number
    maxScrollAreaHeight: 
  validation: {
    maxPercentage: nu
   
  }
    colors: {
      nutrient: st
      formulation: string
      masterRecipe: str
      plant: string
   
    }
      food: string
      foodCategory: string
      recipe: string
      manufacturingRecipe: st
      salesOrder: string
    relationships: {
   
      u
      derivedFrom: string
      produces: string
    }
  orchestration: {
    defaultTargetUnit: 'kg' | 
    includeCosts: boolean
  }

  backend: {
    healthCheckIntervalMs
  },
    uri: '',
    password: '',
   
    maxCon
  },
    defaultModel: 
    defaultConfidenceT
    maxQueryHistory: 10,
      formulation: string
      recipe: string
      masterRecipe: string
      manufacturingRecipe: string
      plant: string
      salesOrder: string
      process: string
      supplier: string
    }
    nodeLabels: {
      food: string
      nutrient: string
      foodCategory: string
      formulation: string
      recipe: string
      masterRecipe: string
      manufacturingRecipe: string
      plant: string
      salesOrder: string
    }
    relationships: {
      belongsToCategory: string
      containsNutrient: string
      alternativeTo: string
      usesIngredient: string
      providesNutrient: string
      derivedFrom: string
      uses: string
      produces: string
      requires: string
    }
  }
  orchestration: {
    defaultTargetBatchSize: number
    defaultTargetUnit: 'kg' | 'L' | 'gal' | 'oz' | 'lb'
    includeNutrients: boolean
    includeCosts: boolean
    maxHistoryItems: number
  }
}

export const DEFAULT_APP_CONFIG: ApplicationConfig = {
  backend: {
    apiUrl: 'http://localhost:8000',
    healthCheckIntervalMs: 30000,
    requestTimeoutMs: 10000,
  },
  neo4j: {
    uri: '',
    username: '',
    password: '',
    database: 'neo4j',
    connectionTimeoutMs: 120000,
    maxConnectionLifetimeMs: 10800000,
    maxConnectionPoolSize: 50,
    defaultQueryLimit: 200,
  },
  ai: {
    defaultModel: 'gpt-4o',
    fallbackModel: 'gpt-4o-mini',
    defaultConfidenceThreshold: 0.7,
    cypherGenerationConfidence: 0.85,
    maxQueryHistory: 10,
    serviceMode: 'auto',




















































































































