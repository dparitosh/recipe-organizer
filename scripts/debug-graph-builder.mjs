import { runPromptWithFallback } from '../src/lib/orchestration/utils/prompt-runner.js'

const recipe = {
  id: 'RT001',
  name: 'Green Tree Extract Beverage Recipe',
  description: 'A refreshing beverage using green tree extract as the main flavor component.',
  ingredients: [
    {
      id: 'GT001',
      name: 'Green Tree Extract',
      percentage: 60,
      function: 'flavor',
      category: 'natural'
    },
    {
      id: 'WV001',
      name: 'Water',
      percentage: 30,
      function: 'base',
      category: 'water'
    },
    {
      id: 'AS001',
      name: 'Ascorbic Acid (Vitamin C)',
      percentage: 5,
      function: 'preservative',
      category: 'vitamin'
    },
    {
      id: 'ST001',
      name: 'Sucrose (Sugar)',
      percentage: 5,
      function: 'sweetener',
      category: 'sugar'
    }
  ],
  totalPercentage: 100,
  metadata: {
    version: '1.0',
    author: 'Recipe Engineer Agent',
    createdAt: '2023-02-20T14:30:00.000Z'
  }
}

const calculation = {
  recipeId: 'RT001',
  recipeName: 'Green Tree Extract Beverage Recipe',
  targetBatchSize: 1000,
  targetUnit: 'kg',
  scaledIngredients: [
    {
      id: 'GT001',
      name: 'Green Tree Extract',
      originalPercentage: 60,
      scaledQuantity: 600,
      scaledUnit: 'kg',
      volumeEquivalent: null,
      cost: 3000,
      density: 1.05
    },
    {
      id: 'WV001',
      name: 'Water',
      originalPercentage: 30,
      scaledQuantity: 300,
      scaledUnit: 'kg',
      volumeEquivalent: null,
      cost: 150,
      density: 1
    },
    {
      id: 'AS001',
      name: 'Ascorbic Acid (Vitamin C)',
      originalPercentage: 5,
      scaledQuantity: 50,
      scaledUnit: 'kg',
      volumeEquivalent: null,
      cost: 25,
      density: 1
    },
    {
      id: 'ST001',
      name: 'Sucrose (Sugar)',
      originalPercentage: 5,
      scaledQuantity: 50,
      scaledUnit: 'kg',
      volumeEquivalent: null,
      cost: 25,
      density: 1
    }
  ],
  costs: {
    rawMaterials: 3200,
    labor: 800,
    overhead: 600,
    packaging: 300,
    total: 4300,
    perUnit: 0.43
  },
  yield: {
    theoretical: 1000,
    actual: 950,
    percentage: 95,
    losses: [
      {
        step: 'process',
        amount: 50,
        reason: 'evaporation'
      }
    ]
  },
  timestamp: '2025-11-08T11:10:12.053Z'
}

const includeNutrients = false
const includeCosts = true

const promptSections = [
  'You are a Graph Builder agent specializing in Neo4j graph data modeling.',
  '',
  'Recipe Data:',
  JSON.stringify(recipe, null, 2),
  '',
  'Calculation Data:',
  JSON.stringify(calculation, null, 2),
  '',
  `Include Nutrients: ${includeNutrients}`,
  `Include Costs: ${includeCosts}`,
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
  '',
  'STRICT OUTPUT PROTOCOL:',
  '- Respond with valid JSON only. No additional commentary outside the JSON document.',
  '- If unable, respond with {"error": "reason"}.',
  '- Output must begin with "{" and end with "}".',
]

const promptText = promptSections.join('\n')

const responseText = await runPromptWithFallback(promptText, {
  temperature: 0.05,
  maxTokens: 900,
  systemPrompt: 'You are a structured output generator. Respond with valid JSON only. No commentary. If graph data cannot be produced, respond with {"error":"reason"}.',
})

console.log(responseText)
