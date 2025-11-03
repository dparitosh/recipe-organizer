import { Recipe, Calculation, ValidationReport, UIConfig, UIConfigSchema } from '../agent-schemas'

  calculation: Calculation
}
  calculation: Calculation
  validation: ValidationReport
}

export interface UIDesignerOutput {
  uiConfig: UIConfig
  description = 'Gener
}

export class UIDesignerAgent {
  name = 'UI Designer'
  description = 'Generates React component configurations for data visualization'

5. Position components for best UX
Guidelines:

- Use tables
- Use badges for status indicators

  "uiConfig": {
    "components": [

        "data": {
          "yield": 95,

        "p
          "col": 1,
        }
      {
        "title": "Ingredient Compos
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























































