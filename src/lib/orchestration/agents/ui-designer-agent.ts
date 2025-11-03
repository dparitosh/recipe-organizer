import { Recipe, Calculation, ValidationReport, UIConfig, UIConfigSchema } from '../agent-schemas'

export interface UIDesignerInput {
  recipe: Recipe
  calculation: Calculation
  validation: ValidationReport
}

export interface UIDesignerOutput {
  uiConfig: UIConfig
  previewHtml?: string
}

export class UIDesignerAgent {
  name = 'UI Designer'
  description = 'Generates React component configurations for data visualization'

  async execute(input: UIDesignerInput): Promise<UIDesignerOutput> {
    const prompt = window.spark.llmPrompt`You are a UI Designer agent specializing in React component configuration.

Recipe Data:
${JSON.stringify(input.recipe, null, 2)}

Calculation Data:
${JSON.stringify(input.calculation, null, 2)}

Validation Report:
${JSON.stringify(input.validation, null, 2)}

Your task:
1. Design optimal layout (single-column, two-column, three-column, grid)
2. Select appropriate component types (card, chart, table, badge, alert, list, metrics)
3. Configure charts (bar, pie, line, area, donut) with data
4. Define color schemes and spacing
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
    "layout": "three-column",
    "components": [
      {
        "type": "metrics",
        "title": "Key Metrics",
        "data": {
          "totalCost": 6700,
          "yield": 95,
          "validationScore": 90
        },
        "config": {},
        "position": {
          "row": 1,
          "col": 1,
          "span": 3
        }
      },
      {
        "type": "chart",
        "title": "Ingredient Composition",
        "data": [
          {"name": "Water", "value": 45.5},
          {"name": "Sugar", "value": 30.0}
        ],
        "config": {
          "chartType": "pie",
          "colorScheme": "primary",
          "showLegend": true
        },
        "position": {
          "row": 2,
          "col": 1,
          "span": 1
        }
      },
      {
        "type": "table",
        "title": "Scaled Ingredients",
        "data": [
          {"ingredient": "Water", "quantity": 4550, "unit": "kg", "cost": 500}
        ],
        "config": {
          "columns": [
            {"key": "ingredient", "label": "Ingredient", "format": "text"},
            {"key": "quantity", "label": "Quantity", "format": "number"},
            {"key": "unit", "label": "Unit", "format": "text"},
            {"key": "cost", "label": "Cost ($)", "format": "currency"}
          ]
        },
        "position": {
          "row": 2,
          "col": 2,
          "span": 2
        }
      }
    ],
    "theme": {
      "primaryColor": "#3b82f6",
      "accentColor": "#10b981",
      "spacing": "comfortable"
    }
  },
  "previewHtml": "<div>Optional HTML preview</div>"
}`

    const response = await window.spark.llm(prompt, 'gpt-4o', true)
    const parsed = JSON.parse(response)
    
    const validatedConfig = UIConfigSchema.parse(parsed.uiConfig)
    
    return {
      uiConfig: validatedConfig,
      previewHtml: parsed.previewHtml,
    }
  }
}
