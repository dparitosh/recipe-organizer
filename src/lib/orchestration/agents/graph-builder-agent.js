import { GraphSchemaOutput } from '../agent-schemas'
import { runPromptWithFallback } from '../utils/prompt-runner'

export class GraphBuilderAgent {
  name = 'Graph Builder'
  description = 'Transforms data into Neo4j graph structures with nodes and relationships'

  async execute(input) {
    const promptSections = [
      'You are a Graph Builder agent specializing in Neo4j graph data modeling.',
      '',
      'Recipe Data:',
      JSON.stringify(input.recipe, null, 2),
      '',
      'Calculation Data:',
      JSON.stringify(input.calculation, null, 2),
      '',
      `Include Nutrients: ${input.includeNutrients ?? false}`,
      `Include Costs: ${input.includeCosts ?? true}`,
      '',
      'Your task:',
      '1. Design graph schema with nodes (formulation, ingredient, nutrient, process, cost)',
      '2. Define relationships (CONTAINS, PRODUCES, COSTS, HAS_NUTRIENT)',
      '3. Generate Cypher CREATE commands for Neo4j',
      '4. Suggest layout and color coding for visualization',
      '',
      'Return ONLY valid JSON matching this structure:',
      '{',
      '  "graph": {',
      '    "nodes": [',
      '      {',
      '        "id": "node-id",',
      '        "label": "Node Label",',
      '        "type": "formulation",',
      '        "properties": {',
      '          "name": "value",',
      '          "quantity": 100',
      '        }',
      '      }',
      '    ],',
      '    "edges": [',
      '      {',
      '        "id": "edge-id",',
      '        "source": "source-node-id",',
      '        "target": "target-node-id",',
      '        "type": "CONTAINS",',
      '        "properties": {',
      '          "percentage": 45.5',
      '        }',
      '      }',
    '    ],',
    '    "cypherCommands": [',
    '      "CREATE (f:Formulation {id: \'form-1\', name: \'Recipe Name\'})",',
    '      "CREATE (i:Ingredient {id: \'ing-1\', name: \'Water\'})",',
    '      "MATCH (f:Formulation {id: \'form-1\'}), (i:Ingredient {id: \'ing-1\'}) CREATE (f)-[:CONTAINS {percentage: 45.5}]->(i)"',
    '    ],',
      '    "metadata": {',
      '      "nodeCount": 10,',
      '      "edgeCount": 15,',
      '      "graphComplexity": "medium"',
      '    }',
      '  },',
      '  "cypherScript": "Complete Cypher script with all commands",',
      '  "visualization": {',
      '    "suggestedLayout": "cose",',
      '    "colorCoding": {',
      '      "formulation": "#3b82f6",',
      '      "ingredient": "#10b981",',
      '      "nutrient": "#f59e0b",',
      '      "process": "#8b5cf6",',
      '      "cost": "#ef4444"',
      '    }',
      '  }',
      '}',
    ]

    const promptText = promptSections.join('\n')

    const responseText = await runPromptWithFallback(promptText, { temperature: 0.4, maxTokens: 1600 })
    const parsed = JSON.parse(responseText)
    
    const validatedGraph = GraphSchemaOutput.parse(parsed.graph)
    
    return {
      graph: validatedGraph,
      cypherScript: parsed.cypherScript || '',
      visualization: parsed.visualization || {
        suggestedLayout: 'cose',
        colorCoding: {},
      },
    }
  }
}
