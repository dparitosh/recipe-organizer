import { useKV } from '@github/spark/hooks'

export interface ApplicationConfig {
  backend: {
    apiUrl: string
    healthCheckIntervalMs: number
    requestTimeoutMs: number
  }
  neo4j: {
    uri: string
    username: string
    password: string
    database: string
    connectionTimeoutMs: number
    maxConnectionLifetimeMs: number
    maxConnectionPoolSize: number
    defaultQueryLimit: number
  }
  ai: {
    defaultModel: 'gpt-4o' | 'gpt-4o-mini'
    fallbackModel: 'gpt-4o' | 'gpt-4o-mini'
    defaultConfidenceThreshold: number
    cypherGenerationConfidence: number
    maxQueryHistory: number
    serviceMode: 'online' | 'offline' | 'auto'
    autoFallback: boolean
    retryAttempts: number
    timeoutMs: number
  }
  fdc: {
    apiBaseUrl: string
    apiKey: string
    defaultPageSize: number
    maxPageSize: number
    rateLimitPerHour: number
  }
  calculation: {
    defaultPrecision: number
    yieldWarningThreshold: number
    yieldCriticalThreshold: number
    highLossThreshold: number
    percentageTolerance: number
    massBalanceTolerance: number
  }
  ui: {
    toastPosition: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
    graphDefaultHeight: string
    graphLayoutAnimationMs: number
    searchDebounceMs: number
    minTouchTargetSize: number
    maxScrollAreaHeight: number
  }
  validation: {
    minPercentage: number
    maxPercentage: number
    minBatchSize: number
    maxIngredientNameLength: number
    maxFormulationNameLength: number
  }
  graph: {
    colors: {
      food: string
      nutrient: string
      foodCategory: string
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
    autoFallback: true,
    retryAttempts: 2,
    timeoutMs: 10000,
  },
  fdc: {
    apiBaseUrl: 'https://api.nal.usda.gov/fdc/v1',
    apiKey: 'axHdO7CFrKh2wBPBSHKRaASp9m8lanCIaDY5W9ya',
    defaultPageSize: 25,
    maxPageSize: 200,
    rateLimitPerHour: 1000,
  },
  calculation: {
    defaultPrecision: 2,
    yieldWarningThreshold: 0.8,
    yieldCriticalThreshold: 0.6,
    highLossThreshold: 0.2,
    percentageTolerance: 0.01,
    massBalanceTolerance: 0.01,
  },
  ui: {
    toastPosition: 'top-center',
    graphDefaultHeight: '500px',
    graphLayoutAnimationMs: 500,
    searchDebounceMs: 300,
    minTouchTargetSize: 44,
    maxScrollAreaHeight: 400,
  },
  validation: {
    minPercentage: 0,
    maxPercentage: 100,
    minBatchSize: 0,
    maxIngredientNameLength: 100,
    maxFormulationNameLength: 200,
  },
  graph: {
    colors: {
      food: 'oklch(0.48 0.14 260)',
      nutrient: 'oklch(0.65 0.14 35)',
      foodCategory: 'oklch(0.60 0.12 180)',
      formulation: 'oklch(0.50 0.16 255)',
      recipe: 'oklch(0.50 0.16 255)',
      masterRecipe: 'oklch(0.58 0.14 240)',
      manufacturingRecipe: 'oklch(0.48 0.12 300)',
      plant: 'oklch(0.55 0.12 200)',
      salesOrder: 'oklch(0.65 0.14 35)',
      process: 'oklch(0.52 0.12 280)',
      supplier: 'oklch(0.55 0.12 200)',
    },
    nodeLabels: {
      food: 'Food',
      nutrient: 'Nutrient',
      foodCategory: 'FoodCategory',
      formulation: 'Formulation',
      recipe: 'Recipe',
      masterRecipe: 'MasterRecipe',
      manufacturingRecipe: 'ManufacturingRecipe',
      plant: 'Plant',
      salesOrder: 'SalesOrder',
    },
    relationships: {
      belongsToCategory: 'BELONGS_TO_CATEGORY',
      containsNutrient: 'CONTAINS_NUTRIENT',
      alternativeTo: 'ALTERNATIVE_TO',
      usesIngredient: 'USES_INGREDIENT',
      providesNutrient: 'PROVIDES_NUTRIENT',
      derivedFrom: 'DERIVED_FROM',
      uses: 'USES',
      produces: 'PRODUCES',
      requires: 'REQUIRES',
    },
  },
  orchestration: {
    defaultTargetBatchSize: 1000,
    defaultTargetUnit: 'kg',
    includeNutrients: false,
    includeCosts: true,
    maxHistoryItems: 10,
  },
}

class AppConfigManager {
  private config: ApplicationConfig = DEFAULT_APP_CONFIG
  private listeners: Array<(config: ApplicationConfig) => void> = []

  setConfig(config: ApplicationConfig) {
    this.config = config
    this.notifyListeners()
  }

  updateConfig(updates: Partial<ApplicationConfig>) {
    this.config = { ...this.config, ...updates }
    this.notifyListeners()
  }

  getConfig(): ApplicationConfig {
    return { ...this.config }
  }

  subscribe(listener: (config: ApplicationConfig) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.config))
  }
}

export const appConfigManager = new AppConfigManager()

export function useAppConfig() {
  const [config, setConfig] = useKV<ApplicationConfig>('app-config', DEFAULT_APP_CONFIG)
  return [config || DEFAULT_APP_CONFIG, setConfig] as const
}
