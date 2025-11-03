import { UIConfigSchema } from '../agent-schemas'

export class UIDesignerAgent {
  name = 'UI Designer'
  description = 'Generates React component configurations for data visualization'

  async execute(input) {
    const prompt = window.spark.llmPrompt`You are a UI Designer agent specializing in React component configuration.

Recipe Data:
${JSON.stringify(input.recipe, null, 2)}

Calculation Data:
${JSON.stringify(input.calculation, null, 2)}

Validation Data:
${JSON.stringify(input.validation, null, 2)}

Your task:
1. Design optimal UI layout (single-column, two-column, three-column, grid)
2. Select appropriate component types (card, chart, table, badge, alert, list, metrics)
3. Configure charts (pie, bar, line, donut) with proper data mapping
4. Organize components for intuitive flow
5. Position components for best UX

Guidelines:
- Use metrics cards for key numbers (cost, yield, score)
- Use pie/donut charts for ingredient composition
- Use bar charts for cost breakdown
- Use tables for detailed ingredient lists
- Use alerts for validation errors/warnings
- Use badges for status indicators

Return ONLY valid JSON matching this structure:
{
  "uiConfig": {
        "type": "metrics",
        "data": {
       
        },
        "position": {
          "col": 
        }
      {
        "title": "Ingredient Co
          
        "config": {
          "colorSchem
        },
          "row": 2,
        }
      {
        
       
            { "key": "na
          ]
        "position
          "col": 2
      }
    "theme": {
      "accentColor": "#10b981
    }
}`
    const 
    
    
      uiConfig: va
  }




        "data": [],
        "config": {
          "columns": [
            { "key": "name", "label": "Ingredient", "format": "text" },
            { "key": "quantity", "label": "Quantity", "format": "number" }
          ]
        },
        "position": {
          "row": 2,
          "col": 2
        }
      }
    ],
    "theme": {
      "primaryColor": "#3b82f6",
      "accentColor": "#10b981",
      "spacing": "comfortable"
    }
  }
}`

    const response = await window.spark.llm(prompt, 'gpt-4o', true)
    const parsed = JSON.parse(response)
    
    const validatedConfig = UIConfigSchema.parse(parsed.uiConfig)
    
    return {
      uiConfig: validatedConfig,
    }
  }
}
