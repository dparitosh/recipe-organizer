import { z } from 'zod'

export const RecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  ingredients: z.array(z.object({
    id: z.string(),
    name: z.string(),
    percentage: z.number().min(0).max(100),
    function: z.enum(['base', 'flavor', 'preservative', 'sweetener', 'emulsifier', 'stabilizer', 'colorant', 'other']),
    category: z.string().optional(),
  })),
  totalPercentage: z.number(),
  metadata: z.object({
    version: z.string().optional(),
    author: z.string().optional(),
    createdAt: z.string(),
  }).optional(),
})

export const CalculationSchema = z.object({
  recipeId: z.string(),
  recipeName: z.string(),
  targetBatchSize: z.number(),
  targetUnit: z.enum(['kg', 'L', 'gal', 'oz', 'lb']),
  scaledIngredients: z.array(z.object({
    id: z.string(),
    name: z.string(),
    originalPercentage: z.number(),
    scaledQuantity: z.number(),
    scaledUnit: z.string(),
    volumeEquivalent: z.number().optional(),
    cost: z.number().optional(),
    density: z.number().optional(),
  })),
  costs: z.object({
    rawMaterials: z.number(),
    labor: z.number().optional(),
    overhead: z.number().optional(),
    packaging: z.number().optional(),
    total: z.number(),
    perUnit: z.number(),
  }),
  yield: z.object({
    theoretical: z.number(),
    actual: z.number(),
    percentage: z.number(),
    losses: z.array(z.object({
      step: z.string(),
      amount: z.number(),
      reason: z.string(),
    })).optional(),
  }),
  timestamp: z.string(),
})

export const GraphSchemaOutput = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(['formulation', 'ingredient', 'nutrient', 'process', 'cost']),
    properties: z.record(z.any()),
  })),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    type: z.string(),
    properties: z.record(z.any()).optional(),
  })),
  cypherCommands: z.array(z.string()),
  metadata: z.object({
    nodeCount: z.number(),
    edgeCount: z.number(),
    graphComplexity: z.string(),
  }),
})

export const ValidationReportSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.object({
    agent: z.string(),
    field: z.string(),
    message: z.string(),
    severity: z.enum(['error', 'warning', 'info']),
  })),
  warnings: z.array(z.object({
    agent: z.string(),
    field: z.string(),
    message: z.string(),
  })),
  checks: z.object({
    recipePercentageValid: z.boolean(),
    costPositive: z.boolean(),
    yieldRealistic: z.boolean(),
    graphIntegrity: z.boolean(),
    dataConsistency: z.boolean(),
  }),
  summary: z.object({
    totalChecks: z.number(),
    passed: z.number(),
    failed: z.number(),
    score: z.number(),
  }),
  timestamp: z.string(),
})

export const UIConfigSchema = z.object({
  layout: z.enum(['single-column', 'two-column', 'three-column', 'grid']),
  components: z.array(z.object({
    type: z.enum(['card', 'chart', 'table', 'badge', 'alert', 'list', 'metrics']),
    title: z.string(),
    data: z.any(),
    config: z.object({
      chartType: z.enum(['bar', 'pie', 'line', 'area', 'donut']).optional(),
      colorScheme: z.string().optional(),
      showLegend: z.boolean().optional(),
      columns: z.array(z.object({
        key: z.string(),
        label: z.string(),
        format: z.string().optional(),
      })).optional(),
    }).optional(),
    position: z.object({
      row: z.number(),
      col: z.number(),
      span: z.number().optional(),
    }).optional(),
  })),
  theme: z.object({
    primaryColor: z.string(),
    accentColor: z.string(),
    spacing: z.string(),
  }).optional(),
})

export const OrchestrationResultSchema = z.object({
  id: z.string(),
  status: z.enum(['success', 'partial', 'failed']),
  recipe: RecipeSchema,
  calculation: CalculationSchema,
  graph: GraphSchemaOutput,
  validation: ValidationReportSchema,
  uiConfig: UIConfigSchema,
  agentHistory: z.array(z.object({
    agent: z.string(),
    timestamp: z.string(),
    duration: z.number(),
    input: z.any(),
    output: z.any(),
    status: z.enum(['success', 'failed', 'skipped']),
    error: z.string().optional(),
  })),
  totalDuration: z.number(),
  timestamp: z.string(),
})

export type Recipe = z.infer<typeof RecipeSchema>
export type Calculation = z.infer<typeof CalculationSchema>
export type GraphSchemaOutputType = z.infer<typeof GraphSchemaOutput>
export type ValidationReport = z.infer<typeof ValidationReportSchema>
export type UIConfig = z.infer<typeof UIConfigSchema>
export type OrchestrationResult = z.infer<typeof OrchestrationResultSchema>
