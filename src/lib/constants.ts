export const NEO4J_CONSTANTS = {
  DEFAULT_DATABASE: 'neo4j',
  CONNECTION_TIMEOUT_MS: 120000,
  MAX_CONNECTION_LIFETIME_MS: 3 * 60 * 60 * 1000,
  MAX_CONNECTION_POOL_SIZE: 50,
  DEFAULT_QUERY_LIMIT: 200,
  TEST_CONNECTION_TIMEOUT_MS: 30000,
  NODE_LABELS: {
    FOOD: 'Food',
    NUTRIENT: 'Nutrient',
    FOOD_CATEGORY: 'FoodCategory',
    FORMULATION: 'Formulation',
    RECIPE: 'Recipe',
    MASTER_RECIPE: 'MasterRecipe',
    MANUFACTURING_RECIPE: 'ManufacturingRecipe',
    PLANT: 'Plant',
    SALES_ORDER: 'SalesOrder',
  },
  RELATIONSHIP_TYPES: {
    BELONGS_TO_CATEGORY: 'BELONGS_TO_CATEGORY',
    CONTAINS_NUTRIENT: 'CONTAINS_NUTRIENT',
    ALTERNATIVE_TO: 'ALTERNATIVE_TO',
    USES_INGREDIENT: 'USES_INGREDIENT',
    PROVIDES_NUTRIENT: 'PROVIDES_NUTRIENT',
    DERIVED_FROM: 'DERIVED_FROM',
    USES: 'USES',
    PRODUCES: 'PRODUCES',
    REQUIRES: 'REQUIRES',
  },
} as const

export const AI_CONSTANTS = {
  DEFAULT_MODEL: 'gpt-4o' as const,
  FALLBACK_MODEL: 'gpt-4o-mini' as const,
  DEFAULT_CONFIDENCE_THRESHOLD: 0.7,
  CYPHER_GENERATION_CONFIDENCE: 0.85,
  MAX_QUERY_HISTORY: 10,
  MAX_NODE_HIGHLIGHTS: 10,
} as const

export const CALCULATION_CONSTANTS = {
  DEFAULT_PRECISION: 2,
  YIELD_WARNING_THRESHOLD: 0.8,
  YIELD_CRITICAL_THRESHOLD: 0.6,
  HIGH_LOSS_THRESHOLD: 0.2,
  PERCENTAGE_TOLERANCE: 0.01,
  MASS_BALANCE_TOLERANCE: 0.01,
} as const

export const UI_CONSTANTS = {
  TOAST_POSITION: 'top-center' as const,
  GRAPH_DEFAULT_HEIGHT: '500px',
  GRAPH_LAYOUT_ANIMATION_MS: 500,
  SEARCH_DEBOUNCE_MS: 300,
  MIN_TOUCH_TARGET_SIZE: 44,
  MAX_SCROLL_AREA_HEIGHT: 400,
} as const

export const VALIDATION_CONSTANTS = {
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
  MIN_BATCH_SIZE: 0,
  MAX_INGREDIENT_NAME_LENGTH: 100,
  MAX_FORMULATION_NAME_LENGTH: 200,
} as const

export const GRAPH_COLORS = {
  FOOD: 'oklch(0.48 0.14 260)',
  NUTRIENT: 'oklch(0.65 0.14 35)',
  FOOD_CATEGORY: 'oklch(0.60 0.12 180)',
  FORMULATION: 'oklch(0.50 0.16 255)',
  RECIPE: 'oklch(0.50 0.16 255)',
  MASTER_RECIPE: 'oklch(0.58 0.14 240)',
  MANUFACTURING_RECIPE: 'oklch(0.48 0.12 300)',
  PLANT: 'oklch(0.55 0.12 200)',
  SALES_ORDER: 'oklch(0.65 0.14 35)',
  PROCESS: 'oklch(0.52 0.12 280)',
  SUPPLIER: 'oklch(0.55 0.12 200)',
} as const

export const FDC_CONSTANTS = {
  API_BASE_URL: 'https://api.nal.usda.gov/fdc/v1',
  DEFAULT_API_KEY: 'axHdO7CFrKh2wBPBSHKRaASp9m8lanCIaDY5W9ya',
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 200,
  RATE_LIMIT_PER_HOUR: 1000,
  DATA_TYPES: {
    FOUNDATION: 'Foundation',
    SR_LEGACY: 'SR Legacy',
    BRANDED: 'Branded',
    SURVEY: 'Survey (FNDDS)',
  },
} as const

export const ERROR_MESSAGES = {
  NEO4J: {
    NOT_CONNECTED: 'Neo4j driver not connected. Please configure your connection in settings.',
    CONNECTION_FAILED: 'Failed to connect to Neo4j. Please check your credentials.',
    QUERY_FAILED: 'Failed to execute Neo4j query. Please try again.',
    TEST_FAILED: 'Connection test failed. Please verify your Neo4j configuration.',
  },
  FORMULATION: {
    NOT_FOUND: 'Formulation not found.',
    INVALID_PERCENTAGE: 'Ingredient percentages must sum to 100%.',
    EMPTY_NAME: 'Formulation name cannot be empty.',
    NO_INGREDIENTS: 'Formulation must have at least one ingredient.',
  },
  AI: {
    QUERY_FAILED: 'Failed to process AI query. Please try again.',
    NO_RESULTS: 'No results found for your query.',
    CYPHER_GENERATION_FAILED: 'Failed to generate Cypher query.',
  },
  GENERAL: {
    UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    VALIDATION_ERROR: 'Validation error. Please check your input.',
  },
} as const

export const SUCCESS_MESSAGES = {
  NEO4J: {
    CONNECTED: 'Connected to Neo4j successfully',
    DISCONNECTED: 'Disconnected from Neo4j',
    CONFIG_SAVED: 'Neo4j configuration saved',
    QUERY_SUCCESS: 'Query executed successfully',
  },
  FORMULATION: {
    CREATED: 'Formulation created successfully',
    UPDATED: 'Formulation updated successfully',
    DELETED: 'Formulation deleted successfully',
  },
  BOM: {
    CREATED: 'BOM created successfully',
    UPDATED: 'BOM updated successfully',
  },
  GRAPH: {
    DATA_LOADED: 'Graph data loaded successfully',
    GENERATED: 'Graph generated from formulation',
  },
} as const
