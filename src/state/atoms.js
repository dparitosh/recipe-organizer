import { atom } from 'recoil'

const isBrowser = typeof window !== 'undefined'

const createLocalStorageEffect = (key) => ({ setSelf, onSet, trigger }) => {
  if (!isBrowser) {
    return
  }

  if (trigger === 'get') {
    const storedValue = window.localStorage.getItem(key)
    if (storedValue != null) {
      try {
        setSelf(JSON.parse(storedValue))
      } catch (error) {
        console.warn(`Failed to parse stored value for ${key}`, error)
      }
    }
  }

  onSet((newValue, _, isReset) => {
    if (!isBrowser) {
      return
    }
    if (isReset || newValue === undefined) {
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, JSON.stringify(newValue))
    }
  })
}

export const DEFAULT_APP_CONFIG = {
  backend: {
    apiUrl: 'http://localhost:8000',
    apiKey: 'dev-api-key',
    adminApiKey: 'dev-admin-key',
    healthCheckIntervalMs: 30000,
    requestTimeoutMs: 10000,
  },
  ui: {
    toastPosition: 'top-right',
  },
  orchestration: {
    defaultTargetBatchSize: 1000,
    defaultTargetUnit: 'kg',
    includeNutrients: false,
    includeCosts: true,
    maxHistoryItems: 10,
  },
}

export const DEFAULT_NEO4J_CONFIG = {
  uri: '',
  username: '',
  password: '',
  database: 'neo4j',
}

export const DEFAULT_PLM_CONFIG = {
  baseUrl: import.meta.env.VITE_PLM_API_URL || 'https://plm.company.com/api',
  apiKey: '',
  enabled: false,
}

export const DEFAULT_MDG_CONFIG = {
  baseUrl: import.meta.env.VITE_MDG_API_URL || 'https://sap.company.com/mdg/api',
  apiKey: '',
  client: import.meta.env.VITE_MDG_CLIENT || '100',
  plant: import.meta.env.VITE_MDG_PLANT || '1000',
  enabled: false,
}

export const DEFAULT_FDC_CONFIG = {
  apiKey: '',
  cacheInNeo4j: true,
  autoSync: false,
}

export const appConfigAtom = atom({
  key: 'appConfig',
  default: DEFAULT_APP_CONFIG,
  effects_UNSTABLE: [createLocalStorageEffect('app-config')],
})

export const backendUrlAtom = atom({
  key: 'backendUrl',
  default: DEFAULT_APP_CONFIG.backend.apiUrl,
  effects_UNSTABLE: [createLocalStorageEffect('backend-url')],
})

export const neo4jConfigAtom = atom({
  key: 'neo4jConfig',
  default: DEFAULT_NEO4J_CONFIG,
  effects_UNSTABLE: [createLocalStorageEffect('neo4j-config')],
})

export const plmConfigAtom = atom({
  key: 'plmConfig',
  default: DEFAULT_PLM_CONFIG,
  effects_UNSTABLE: [createLocalStorageEffect('plm-config')],
})

export const mdgConfigAtom = atom({
  key: 'mdgConfig',
  default: DEFAULT_MDG_CONFIG,
  effects_UNSTABLE: [createLocalStorageEffect('mdg-config')],
})

export const neo4jMockModeAtom = atom({
  key: 'neo4jMockMode',
  default: true,
  effects_UNSTABLE: [createLocalStorageEffect('neo4j-mock-mode')],
})

export const plmMockModeAtom = atom({
  key: 'plmMockMode',
  default: true,
  effects_UNSTABLE: [createLocalStorageEffect('plm-mock-mode')],
})

export const mdgMockModeAtom = atom({
  key: 'mdgMockMode',
  default: true,
  effects_UNSTABLE: [createLocalStorageEffect('mdg-mock-mode')],
})

export const fdcConfigAtom = atom({
  key: 'fdcConfig',
  default: DEFAULT_FDC_CONFIG,
  effects_UNSTABLE: [createLocalStorageEffect('fdc-config')],
})

export const aiServiceModeAtom = atom({
  key: 'aiServiceMode',
  default: 'auto',
  effects_UNSTABLE: [createLocalStorageEffect('ai-service-mode')],
})

export const aiAutoFallbackAtom = atom({
  key: 'aiAutoFallback',
  default: true,
  effects_UNSTABLE: [createLocalStorageEffect('ai-auto-fallback')],
})

export const orchestrationHistoryAtom = atom({
  key: 'orchestrationHistory',
  default: [],
  effects_UNSTABLE: [createLocalStorageEffect('orchestration-history')],
})
