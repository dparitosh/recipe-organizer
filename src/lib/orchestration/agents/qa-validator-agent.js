import { ValidationReportSchema } from '../agent-schemas.js'
import { requestJsonResponse } from '../utils/prompt-runner.js'

export class QAValidatorAgent {
  name = 'QA Validator'
  description = 'Cross-checks data consistency and validates business rules'

  async execute(input) {
    const timestamp = new Date().toISOString()

    const promptSections = [
      'You are a QA Validator agent specializing in data consistency and business rule validation.',
      '',
      'Recipe Data:',
      JSON.stringify(input.recipe, null, 2),
      '',
      'Calculation Data:',
      JSON.stringify(input.calculation, null, 2),
      '',
      'Graph Data:',
      JSON.stringify(input.graph, null, 2),
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

    const parsed = await requestJsonResponse(promptText, {
      temperature: 0.15,
      maxTokens: 1200,
      systemPrompt: 'You are a QA validation agent. Return JSON only that conforms exactly to the specified schema.',
      maxAttempts: 3,
    })
    
    const validatedReport = ValidationReportSchema.parse(parsed.validation)
    
    const criticalErrors = validatedReport.errors
      .filter(e => e.severity === 'error')
      .map(e => `${e.agent}: ${e.message}`)
    
    return {
      validation: validatedReport,
      canProceed: criticalErrors.length === 0,
      criticalErrors,
    }
  }
}
