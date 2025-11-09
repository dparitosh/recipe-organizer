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

    const formatNodeIdentifier = (id) => id.replace(/[^a-zA-Z0-9_]/g, '_')

    const cypherNodes = nodes.map((node) => {
      const label = node.type.charAt(0).toUpperCase() + node.type.slice(1)
      const identifier = formatNodeIdentifier(node.id)
      const properties = JSON.stringify({
        id: node.id,
        label: node.label,
        ...node.properties,
      })
      return `CREATE (${identifier}:${label} ${properties})`
    })

    const cypherEdges = edges.map((edge) => {
      const type = edge.type.toUpperCase()
      const properties = JSON.stringify(edge.properties || {})
      return `MATCH (a {id: "${edge.source}"}), (b {id: "${edge.target}"}) CREATE (a)-[:${type} ${properties}]->(b)`
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
