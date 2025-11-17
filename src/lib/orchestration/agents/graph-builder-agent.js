import { GraphSchemaOutput } from '../agent-schemas.js'

export class GraphBuilderAgent {
  name = 'Graph Builder'
  description = 'Transforms data into Neo4j graph structures with nodes and relationships'

  async execute(input) {
    const { recipe, calculation, includeNutrients } = input

    if (!recipe || !recipe.id) {
      throw new Error('Recipe data is required to build the graph')
    }

    const nodes = []
    const edges = []

    const addNode = (node) => {
      nodes.push(node)
      return node
    }

    const addEdge = (edge) => {
      edges.push(edge)
      return edge
    }

    const findScaledIngredient = (ingredientId) => {
      if (!calculation?.scaledIngredients) return null
      return calculation.scaledIngredients.find((item) => item.id === ingredientId)
    }

    const formulationNode = addNode({
      id: `formulation-${recipe.id}`,
      label: recipe.name || 'Formulation',
      type: 'formulation',
      properties: {
        description: recipe.description || '',
        totalPercentage: recipe.totalPercentage ?? 100,
        metadata: recipe.metadata || {},
      },
    })

    if (Array.isArray(recipe.ingredients)) {
      recipe.ingredients.forEach((ingredient) => {
        const ingredientNode = addNode({
          id: `ingredient-${ingredient.id || ingredient.name}`,
          label: ingredient.name,
          type: 'ingredient',
          properties: {
            function: ingredient.function || 'other',
            category: ingredient.category || 'unspecified',
            percentage: ingredient.percentage ?? null,
          },
        })

        const scaled = findScaledIngredient(ingredient.id)

        addEdge({
          id: `edge-${formulationNode.id}-${ingredientNode.id}`,
          source: formulationNode.id,
          target: ingredientNode.id,
          type: 'CONTAINS',
          properties: {
            percentage: ingredient.percentage ?? null,
            scaledQuantity: scaled?.scaledQuantity ?? null,
            scaledUnit: scaled?.scaledUnit ?? null,
          },
        })
      })
    }

    if (calculation?.costs) {
      const costNode = addNode({
        id: `cost-${recipe.id}`,
        label: 'Cost Summary',
        type: 'cost',
        properties: {
          ...calculation.costs,
        },
      })

      addEdge({
        id: `edge-${formulationNode.id}-${costNode.id}`,
        source: formulationNode.id,
        target: costNode.id,
        type: 'COSTS',
        properties: {},
      })
    }

    if (calculation?.yield) {
      const yieldNode = addNode({
        id: `process-${recipe.id}`,
        label: 'Yield Profile',
        type: 'process',
        properties: {
          theoretical: calculation.yield.theoretical,
          actual: calculation.yield.actual,
          percentage: calculation.yield.percentage,
        },
      })

      addEdge({
        id: `edge-${formulationNode.id}-${yieldNode.id}`,
        source: formulationNode.id,
        target: yieldNode.id,
        type: 'PRODUCES',
        properties: {
          losses: calculation.yield.losses || [],
        },
      })
    }

    if (includeNutrients && Array.isArray(recipe.ingredients)) {
      recipe.ingredients.forEach((ingredient) => {
        if (!ingredient.nutrients) return

        ingredient.nutrients.forEach((nutrient, idx) => {
          const nutrientNode = addNode({
            id: `nutrient-${ingredient.id || ingredient.name}-${idx}`,
            label: nutrient.name || nutrient.type || 'Nutrient',
            type: 'nutrient',
            properties: {
              amount: nutrient.amount ?? null,
              unit: nutrient.unit ?? null,
            },
          })

          addEdge({
            id: `edge-nutrient-${ingredient.id || ingredient.name}-${idx}`,
            source: `ingredient-${ingredient.id || ingredient.name}`,
            target: nutrientNode.id,
            type: 'HAS_NUTRIENT',
            properties: {},
          })
        })
      })
    }

    const nodeCount = nodes.length
    const edgeCount = edges.length
    const graphComplexity = nodeCount + edgeCount > 20 ? 'medium' : 'low'

    // Neo4j 2.0 compatible Cypher generation utilities
    const sanitizeIdentifier = (id) => {
      // Allow alphanumeric, hyphens, underscores - escape everything else with backticks
      const cleaned = String(id).replace(/[^\w-]/g, '_')
      // Use backticks for identifiers that might contain reserved words or special chars
      return `\`${cleaned}\``
    }

    const sanitizeLabel = (label) => {
      // Labels must be alphanumeric + underscore only (no hyphens)
      const cleaned = String(label).replace(/[^a-zA-Z0-9_]/g, '')
      // Ensure label starts with letter
      return cleaned.match(/^[a-zA-Z]/) ? cleaned : `L_${cleaned}`
    }

    const escapeString = (value) => {
      return String(value)
        .replace(/\\/g, '\\\\')    // Backslash
        .replace(/'/g, "\\'")       // Single quote
        .replace(/"/g, '\\"')       // Double quote
        .replace(/\n/g, '\\n')      // Newline
        .replace(/\r/g, '\\r')      // Carriage return
        .replace(/\t/g, '\\t')      // Tab
    }

    const formatPropertyKey = (key) => {
      // Property keys: alphanumeric + underscore
      return String(key).replace(/[^a-zA-Z0-9_]/g, '_')
    }

    const formatCypherValue = (value, depth = 0) => {
      // Prevent infinite recursion on circular objects
      if (depth > 5) {
        return 'null'
      }

      if (value === null || value === undefined) {
        return 'null'
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value)
      }
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false'
      }
      if (Array.isArray(value)) {
        // Neo4j supports homogeneous arrays; serialize complex items as JSON strings
        const items = value.map((item) => {
          if (typeof item === 'object' && item !== null) {
            return `'${escapeString(JSON.stringify(item))}'`
          }
          return formatCypherValue(item, depth + 1)
        })
        return `[${items.join(', ')}]`
      }
      if (typeof value === 'object') {
        // Flatten nested objects into dot-notation keys or serialize as JSON string
        // For Neo4j 2.0, prefer JSON string for complex nested objects
        try {
          return `'${escapeString(JSON.stringify(value))}'`
        } catch {
          return 'null'
        }
      }
      return `'${escapeString(String(value))}'`
    }

    const formatCypherProperties = (obj) => {
      const entries = Object.entries(obj || {})
      if (!entries.length) {
        return '{}'
      }

      const parts = entries.map(([key, val]) => `${formatPropertyKey(key)}: ${formatCypherValue(val)}`)
      return `{ ${parts.join(', ')} }`
    }

    // Generate CREATE statements for nodes with sanitized identifiers and labels
    const cypherNodes = nodes.map((node) => {
      const label = sanitizeLabel(node.type)
      const identifier = sanitizeIdentifier(node.id)
      const properties = formatCypherProperties({
        id: node.id,
        label: node.label,
        ...node.properties,
      })
      return `CREATE (${identifier}:${label} ${properties})`
    })

    // Generate relationship CREATE statements using MATCH with indexed id property
    // Neo4j 2.0 best practice: rely on id property index for efficient lookups
    const cypherEdges = edges.map((edge) => {
      const sourceId = sanitizeIdentifier(edge.source)
      const targetId = sanitizeIdentifier(edge.target)
      const relType = sanitizeLabel(edge.type)
      const properties = formatCypherProperties(edge.properties || {})
      const propertiesSegment = properties === '{}' ? '' : ` ${properties}`
      
      // Use MATCH with id property (assumes nodes already created in prior statements)
      return `MATCH (${sourceId} {id: '${escapeString(edge.source)}'}), (${targetId} {id: '${escapeString(edge.target)}'})\\nCREATE (${sourceId})-[:${relType}${propertiesSegment}]->(${targetId})`
    })

    const graph = {
      nodes,
      edges,
      cypherCommands: [...cypherNodes, ...cypherEdges],
      metadata: {
        nodeCount,
        edgeCount,
        graphComplexity,
      },
    }

    const result = {
      graph,
      cypherScript: [...cypherNodes, ...cypherEdges].join('\n'),
      visualization: {
        suggestedLayout: 'cose',
        colorCoding: {
          formulation: '#3b82f6',
          ingredient: '#10b981',
          nutrient: '#f59e0b',
          process: '#8b5cf6',
          cost: '#ef4444',
        },
      },
    }

    const validatedGraph = GraphSchemaOutput.parse(result.graph)

    return {
      ...result,
      graph: validatedGraph,
    }
  }
}
