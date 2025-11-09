import { UIConfigSchema } from '../agent-schemas.js'
import { requestJsonResponse } from '../utils/prompt-runner.js'

export class UIDesignerAgent {
  name = 'UI Designer'
  description = 'Generates React component configurations for data visualization'

  async execute(input) {
    const promptSections = [
      'You are a UI Designer agent specializing in data-rich dashboard layouts for food & beverage operations.',
      '',
      'Recipe Data:',
      JSON.stringify(input.recipe, null, 2),
      '',
      'Calculation Data:',
      JSON.stringify(input.calculation, null, 2),
      '',
      'Validation Data:',
      JSON.stringify(input.validation, null, 2),
      '',
      'Design Requirements:',
      '1. Choose an optimal layout (single-column, two-column, three-column, or grid).',
      '2. Select component types (metrics, chart, table, card, list, badge, alert) that highlight the most important insights.',
      '3. Provide data bindings for each component and suggest chart/table configurations where appropriate.',
      '4. Position components so that related information is grouped together and key insights appear first.',
      '5. Include optional theme guidance when it improves clarity.',
      '',
      'Return ONLY valid JSON matching this schema:',
      '{',
      '  "uiConfig": {',
      '    "layout": "two-column",',
      '    "components": [',
      '      {',
      '        "type": "metrics",',
      '        "title": "Key Metrics",',
      '        "data": {',
      '          "totalCost": 0,',
      '          "yield": 0,',
      '          "validationScore": 0',
      '        },',
      '        "position": { "row": 1, "col": 1, "span": 2 }',
      '      }',
      '    ],',
      '    "theme": {',
      '      "primaryColor": "#3b82f6",',
      '      "accentColor": "#10b981",',
      '      "spacing": "comfortable"',
      '    }',
      '  },',
      '  "reasoning": "Why this layout works"',
      '}',
    ]

    const promptText = promptSections.join('\n')

    const parsed = await requestJsonResponse(promptText, {
      temperature: 0.3,
      maxTokens: 1100,
      systemPrompt: 'You are a UI configuration generator. Produce JSON only with no additional commentary.',
      maxAttempts: 3,
    })

    const validatedConfig = UIConfigSchema.parse(parsed.uiConfig)

    return {
      uiConfig: validatedConfig,
      reasoning: parsed.reasoning ?? 'No reasoning provided',
    }
  }
}
