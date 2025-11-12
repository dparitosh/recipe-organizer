import { ValidationReportSchema } from '../agent-schemas.js'
import { requestJsonResponse } from '../utils/prompt-runner.js'

const formatRecipeForPrompt = (recipe) => {
  if (!recipe) {
    return '{}'
  }

  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        percentage: ingredient.percentage,
        function: ingredient.function || 'other',
        category: ingredient.category,
      }))
    : []

  return JSON.stringify({
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    totalPercentage: recipe.totalPercentage,
    ingredients,
    metadata: recipe.metadata,
  })
}

const formatCalculationForPrompt = (calculation) => {
  if (!calculation) {
    return '{}'
  }

  const scaledIngredients = Array.isArray(calculation.scaledIngredients)
    ? calculation.scaledIngredients.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        originalPercentage: ingredient.originalPercentage,
        scaledQuantity: ingredient.scaledQuantity,
        scaledUnit: ingredient.scaledUnit,
        cost: ingredient.cost,
        density: ingredient.density,
      }))
    : []

  return JSON.stringify({
    recipeId: calculation.recipeId,
    recipeName: calculation.recipeName,
    targetBatchSize: calculation.targetBatchSize,
    targetUnit: calculation.targetUnit,
    scaledIngredients,
    costs: calculation.costs,
    yield: calculation.yield,
  })
}

const formatGraphForPrompt = (graph) => {
  if (!graph) {
    return '{}'
  }

  const nodes = Array.isArray(graph.nodes)
    ? graph.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        type: node.type,
        properties: node.properties,
      }))
    : []

  const edges = Array.isArray(graph.edges)
    ? graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        properties: edge.properties,
      }))
    : []

  return JSON.stringify({
    nodes,
    edges,
    metadata: graph.metadata,
  })
}

const VALIDATION_TOLERANCE = 0.01

const sumPercentages = (ingredients = []) =>
  ingredients.reduce((total, ingredient) => total + (Number(ingredient.percentage) || 0), 0)

const deriveIngredientNodes = (graph) => {
  if (!graph || !Array.isArray(graph.nodes)) {
    return new Set()
  }
  return new Set(graph.nodes.filter((node) => node.type === 'ingredient').map((node) => node.id))
}

const buildFallbackValidation = (input) => {
  const timestamp = new Date().toISOString()
  const recipe = input.recipe || { ingredients: [], totalPercentage: 0 }
  const calculation = input.calculation || { scaledIngredients: [], costs: {}, yield: {} }
  const graph = input.graph || { nodes: [], edges: [] }

  const checks = {
    recipePercentageValid: false,
    costPositive: false,
    yieldRealistic: false,
    graphIntegrity: false,
    dataConsistency: false,
  }

  const errors = []
  const warnings = []

  const totalPercentage = sumPercentages(recipe.ingredients)
  const percentageDelta = Math.abs(totalPercentage - 100)
  checks.recipePercentageValid = percentageDelta <= VALIDATION_TOLERANCE
  if (!checks.recipePercentageValid) {
    errors.push({
      agent: 'Recipe Engineer',
      field: 'totalPercentage',
      message: `Ingredient percentages sum to ${totalPercentage.toFixed(2)}% (expected 100%).`,
      severity: percentageDelta > 1 ? 'error' : 'warning',
    })
  }

  const costs = calculation.costs || {}
  const positiveCost = ['rawMaterials', 'total']
    .map((field) => Number(costs[field]) || 0)
    .every((value) => value > 0)
  checks.costPositive = positiveCost
  if (!positiveCost) {
    errors.push({
      agent: 'Scaling Calculator',
      field: 'costs.total',
      message: 'Total cost must be greater than zero.',
      severity: 'error',
    })
  }

  const yieldPercentage = Number(calculation.yield?.percentage)
  checks.yieldRealistic = Number.isFinite(yieldPercentage)
    ? yieldPercentage >= 70 && yieldPercentage <= 100
    : false
  if (!checks.yieldRealistic) {
    warnings.push({
      agent: 'Scaling Calculator',
      field: 'yield.percentage',
      message: 'Yield should be between 70% and 100% for typical beverage processes.',
    })
  }

  const ingredientNodes = deriveIngredientNodes(graph)
  const missingGraphNodes = (recipe.ingredients || []).filter((ingredient) => {
    const nodeId = `ingredient-${ingredient.id || ingredient.name}`
    return !ingredientNodes.has(nodeId)
  })
  checks.graphIntegrity = missingGraphNodes.length === 0
  if (!checks.graphIntegrity && missingGraphNodes.length) {
    errors.push({
      agent: 'Graph Builder',
      field: 'graph.nodes',
      message: `${missingGraphNodes.length} ingredient node(s) missing from graph output.`,
      severity: 'warning',
    })
  }

  const percentageLookup = new Map(
    (recipe.ingredients || []).map((ingredient) => [ingredient.id || ingredient.name, Number(ingredient.percentage) || 0])
  )
  const scaledConsistent = (calculation.scaledIngredients || []).every((scaled) => {
    const key = scaled.id || scaled.name
    if (!percentageLookup.has(key)) {
      return false
    }
    const expected = (percentageLookup.get(key) / 100) * (Number(calculation.targetBatchSize) || 0)
    return Math.abs(expected - Number(scaled.scaledQuantity || 0)) <= Math.max(0.01 * expected, 0.5)
  })
  checks.dataConsistency = scaledConsistent
  if (!scaledConsistent) {
    errors.push({
      agent: 'QA Validator',
      field: 'scaledIngredients',
      message: 'Scaled quantities do not align with recipe percentages.',
      severity: 'error',
    })
  }

  const totalChecks = Object.values(checks).length
  const passed = Object.values(checks).filter(Boolean).length
  const failed = totalChecks - passed
  const score = Math.round((passed / Math.max(totalChecks, 1)) * 100)

  const validationPayload = {
    valid: errors.every((issue) => issue.severity !== 'error'),
    errors,
    warnings,
    checks,
    summary: {
      totalChecks,
      passed,
      failed,
      score,
    },
    timestamp,
  }

  const validatedReport = ValidationReportSchema.parse(validationPayload)

  const criticalErrors = validatedReport.errors
    .filter((issue) => issue.severity === 'error')
    .map((issue) => `${issue.agent}: ${issue.message}`)

  return {
    validation: validatedReport,
    canProceed: criticalErrors.length === 0,
    criticalErrors,
  }
}

export class QAValidatorAgent {
  name = 'QA Validator'
  description = 'Cross-checks data consistency and validates business rules'

  async execute(input) {
    const timestamp = new Date().toISOString()
    const recipeJson = formatRecipeForPrompt(input.recipe)
    const calculationJson = formatCalculationForPrompt(input.calculation)
    const graphJson = formatGraphForPrompt(input.graph)

    const promptSections = [
      'You are a QA Validator agent specializing in data consistency and business rule validation.',
      '',
      'Recipe Data:',
      recipeJson,
      '',
      'Calculation Data:',
      calculationJson,
      '',
      'Graph Data:',
      graphJson,
      '',
      'Your task:',
      '1. Validate recipe percentages sum to exactly 100%',
      '2. Check all costs are positive and realistic',
      '3. Verify yield is between 70-100% (typical for F&B)',
      '4. Ensure graph nodes match recipe ingredients',
      '5. Check data consistency across all agent outputs',
      '6. Flag errors (severity: error/warning/info)',
      '',
      'Business Rules:',
      '- Recipe total percentage must equal 100% (±0.01 tolerance)',
      '- All costs must be > 0',
      '- Yield percentage should be 70-100%',
      '- Each ingredient in recipe must have corresponding graph node',
      '- Scaled quantities must match percentage * batch size (±1% tolerance)',
      '',
      'Return ONLY valid JSON matching this structure:',
      '{',
      '  "validation": {',
      '    "valid": true,',
      '    "errors": [',
      '      {',
      '        "agent": "Recipe Engineer",',
      '        "field": "totalPercentage",',
      '        "message": "Percentages sum to 99.8%, should be 100%",',
      '        "severity": "warning"',
      '      }',
      '    ],',
      '    "warnings": [',
      '      {',
      '        "agent": "Scaling Calculator",',
      '        "field": "yield.percentage",',
      '        "message": "Yield of 68% is below typical 70% threshold"',
      '      }',
      '    ],',
      '    "checks": {',
      '      "recipePercentageValid": true,',
      '      "costPositive": true,',
      '      "yieldRealistic": true,',
      '      "graphIntegrity": true,',
      '      "dataConsistency": true',
      '    },',
      '    "summary": {',
      '      "totalChecks": 10,',
      '      "passed": 9,',
      '      "failed": 1,',
      '      "score": 90',
      '    },',
      `    "timestamp": "${timestamp}"`,
      '  },',
      '  "canProceed": true,',
      '  "criticalErrors": []',
      '}',
    ]

    const promptText = promptSections.join('\n')

    try {
      const parsed = await requestJsonResponse(promptText, {
        temperature: 0.15,
        maxTokens: 1200,
        systemPrompt: 'You are a QA validation agent. Return JSON only that conforms exactly to the specified schema.',
        maxAttempts: 3,
      })

      const validatedReport = ValidationReportSchema.parse(parsed.validation)

      const criticalErrors = validatedReport.errors
        .filter((e) => e.severity === 'error')
        .map((e) => `${e.agent}: ${e.message}`)

      return {
        validation: validatedReport,
        canProceed: criticalErrors.length === 0,
        criticalErrors,
      }
    } catch (error) {
      // Fallback ensures deterministic validation when the LLM call fails
      return buildFallbackValidation({
        recipe: input.recipe,
        calculation: input.calculation,
        graph: input.graph,
      })
    }
  }
}
