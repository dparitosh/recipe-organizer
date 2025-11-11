# Multi-Agent Orchestration Quick Start

**Purpose:** Automated recipe generation, cost calculation, and quality validation with full Neo4j persistence.

## What It Does

The orchestration pipeline coordinates 5 specialized agents to transform user requirements into production-ready formulations:

1. **RecipeEngineer** - Generates ingredient lists optimized for cost, nutrition, or functionality
2. **ScalingCalculator** - Computes scaled quantities, costs, yields for target batch sizes
3. **GraphBuilder** - Creates Neo4j relationship mappings
4. **QAValidator** - Validates completeness, cost accuracy, regulatory compliance
5. **UIDesigner** - Generates optimal UI configuration for data presentation

**Result:** Complete audit trail in Neo4j with queryable history for analytics and replay.

---

## Data Sources

### Primary Sources
- **User Request** - Natural language or structured requirement (e.g., "Create low-cost protein bar with 20g protein")
- **Cost Maps** - Ingredient pricing data ($/kg) from procurement systems or manual input
- **Density Maps** - Ingredient densities for volume-to-weight conversions
- **Nutrient Data** - From USDA FDC or custom databases
- **Historical Runs** - Previous orchestration results stored in Neo4j

### Optional Context
- Supplier constraints (min/max quantities)
- Regulatory requirements (allergen labels, nutrition claims)
- Manufacturing constraints (equipment limits, process times)
- Target markets (regional preferences, price points)

---

## API Endpoint

```
POST /api/orchestration/runs
Content-Type: application/json
```

### Request Schema

```json
{
  "userRequest": "string (natural language or structured)",
  "result": {
    "id": "string (unique run ID)",
    "status": "success | partial | failed",
    "recipe": {
      "name": "string",
      "ingredients": [
        {
          "id": "string",
          "name": "string",
          "percentage": "number (0-100)",
          "function": "string (optional)",
          "category": "string (optional)"
        }
      ],
      "totalPercentage": "number (should equal 100)",
      "metadata": {}
    },
    "calculation": {
      "recipeId": "string",
      "targetBatchSize": "number",
      "targetUnit": "string (kg, g, L, etc.)",
      "scaledIngredients": [
        {
          "name": "string",
          "scaledQuantity": "number",
          "scaledUnit": "string",
          "cost": "number (optional)"
        }
      ],
      "costs": {
        "total": "number",
        "perKg": "number",
        "breakdown": {}
      },
      "yield": "number",
      "timestamp": "ISO 8601 string"
    },
    "graph": {
      "nodes": [],
      "edges": [],
      "cypherCommands": []
    },
    "validation": {
      "valid": "boolean",
      "errors": [],
      "warnings": [],
      "checks": {},
      "summary": "string",
      "canProceed": "boolean"
    },
    "uiConfig": {
      "layout": "string",
      "components": []
    },
    "agentHistory": [
      {
        "agent": "string",
        "timestamp": "ISO 8601",
        "duration": "number (ms)",
        "status": "string",
        "error": "string (optional)"
      }
    ],
    "totalDuration": "number (ms)",
    "timestamp": "ISO 8601"
  },
  "requestId": "string (optional)",
  "requestTimestamp": "ISO 8601 (optional)",
  "targetBatchSize": "number (optional)",
  "targetUnit": "string (optional)",
  "includeNutrients": "boolean (default: false)",
  "includeCosts": "boolean (default: true)",
  "context": {
    "costMap": {},
    "densityMap": {},
    "constraints": {}
  },
  "configVersion": "string (default: v1)",
  "metadata": {}
}
```

### Response Schema

```json
{
  "runId": "string",
  "nodesCreated": "number",
  "relationshipsCreated": "number",
  "propertiesSet": "number"
}
```

---

## Example Usage

### Basic Recipe Generation

```bash
curl -X POST http://localhost:8000/api/orchestration/runs \
  -H "Content-Type: application/json" \
  -d '{
    "userRequest": "Create chocolate chip cookie recipe",
    "result": {
      "id": "run-001",
      "status": "success",
      "recipe": {
        "name": "Chocolate Chip Cookies",
        "ingredients": [
          {"id": "flour-001", "name": "All-Purpose Flour", "percentage": 50.0, "category": "base"},
          {"id": "sugar-001", "name": "Granulated Sugar", "percentage": 20.0, "category": "sweetener"},
          {"id": "butter-001", "name": "Butter", "percentage": 15.0, "category": "fat"},
          {"id": "eggs-001", "name": "Eggs", "percentage": 10.0, "category": "binder"},
          {"id": "chips-001", "name": "Chocolate Chips", "percentage": 5.0, "category": "flavor"}
        ],
        "totalPercentage": 100.0
      },
      "calculation": {
        "targetBatchSize": 1000,
        "targetUnit": "g",
        "costs": {"total": 5.50, "perKg": 5.50},
        "yield": 95.0
      },
      "graph": {"nodes": [], "edges": []},
      "validation": {"valid": true, "errors": [], "warnings": []},
      "uiConfig": {"layout": "default"},
      "agentHistory": [
        {"agent": "RecipeEngineer", "duration": 800, "status": "success"},
        {"agent": "ScalingCalculator", "duration": 500, "status": "success"}
      ],
      "totalDuration": 1300,
      "timestamp": "2025-11-11T12:00:00Z"
    }
  }'
```

### Cost-Optimized Protein Bar

```bash
curl -X POST http://localhost:8000/api/orchestration/runs \
  -H "Content-Type: application/json" \
  -d '{
    "userRequest": "Create low-cost protein bar with 20g protein per 50g serving",
    "result": {
      "id": "run-002",
      "status": "success",
      "recipe": {
        "name": "Budget Protein Bar",
        "ingredients": [
          {"id": "oats", "name": "Rolled Oats", "percentage": 40.0, "function": "base"},
          {"id": "whey", "name": "Whey Protein Isolate", "percentage": 35.0, "function": "protein"},
          {"id": "peanut", "name": "Peanut Butter", "percentage": 15.0, "function": "binding"},
          {"id": "honey", "name": "Honey", "percentage": 10.0, "function": "sweetener"}
        ],
        "totalPercentage": 100.0,
        "metadata": {"targetProtein": 20, "servingSize": 50}
      },
      "calculation": {
        "targetBatchSize": 5000,
        "targetUnit": "g",
        "costs": {
          "total": 18.75,
          "perKg": 3.75,
          "per100g": 0.375,
          "breakdown": {
            "oats": 4.00,
            "whey": 10.50,
            "peanut": 3.00,
            "honey": 1.25
          }
        },
        "yield": 98.0
      },
      "validation": {
        "valid": true,
        "errors": [],
        "warnings": ["Consider adding salt for flavor"],
        "checks": {
          "proteinTarget": "pass",
          "costTarget": "pass",
          "totalPercentage": "pass"
        }
      },
      "agentHistory": [
        {"agent": "RecipeEngineer", "duration": 950, "status": "success"},
        {"agent": "ScalingCalculator", "duration": 620, "status": "success"},
        {"agent": "QAValidator", "duration": 380, "status": "success"}
      ],
      "totalDuration": 1950,
      "timestamp": "2025-11-11T12:05:00Z"
    },
    "targetBatchSize": 5000,
    "targetUnit": "g",
    "includeCosts": true,
    "includeNutrients": true,
    "context": {
      "costMap": {
        "oats": 2.00,
        "whey": 6.00,
        "peanut": 4.00,
        "honey": 2.50
      },
      "densityMap": {
        "oats": 0.45,
        "whey": 0.35,
        "peanut": 0.95,
        "honey": 1.42
      },
      "constraints": {
        "maxCostPerKg": 5.00,
        "minProtein": 20
      }
    }
  }'
```

---

## Neo4j Data Model

### Created Nodes

```cypher
// Main orchestration run
(run:OrchestrationRun {
  runId: "string",
  status: "success|partial|failed",
  totalDuration: number,
  timestamp: datetime,
  userRequest: "string"
})

// Recipe snapshot
(recipe:RecipeVersion {
  versionId: "string",
  name: "string",
  totalPercentage: number
})

// Cost calculation results
(calc:CalculationResult {
  resultId: "string",
  targetBatchSize: number,
  targetUnit: "string",
  totalCost: number,
  costPerKg: number,
  yieldPercentage: number
})

// Validation report
(validation:ValidationReport {
  reportId: "string",
  valid: boolean,
  errorCount: number,
  warningCount: number
})

// Per-agent execution metadata
(agent:AgentInvocation {
  invocationId: "string",
  agent: "string",
  sequence: number,
  duration: number,
  status: "string"
})
```

### Relationships

```cypher
(run)-[:USED_RECIPE]->(recipe)
(run)-[:PRODUCED_CALCULATION]->(calc)
(run)-[:PRODUCED_VALIDATION]->(validation)
(run)-[:HAS_AGENT_INVOCATION]->(agent)
(recipe)-[:HAS_INGREDIENT]->(:Ingredient)
(recipe)-[:DERIVED_FROM]->(:Food)  // If FDC source
```

---

## Query Examples

### Find Recent Runs

```cypher
MATCH (run:OrchestrationRun)
WHERE run.timestamp > datetime() - duration('P7D')
RETURN run.runId, run.status, run.totalDuration, run.timestamp
ORDER BY run.timestamp DESC
LIMIT 10
```

### Analyze Agent Performance

```cypher
MATCH (run:OrchestrationRun)-[:HAS_AGENT_INVOCATION]->(agent:AgentInvocation)
WHERE run.timestamp > datetime() - duration('P30D')
RETURN 
  agent.agent AS agentName,
  count(*) AS invocations,
  avg(agent.duration) AS avgDuration,
  max(agent.duration) AS maxDuration,
  sum(CASE WHEN agent.status = 'success' THEN 1 ELSE 0 END) * 100.0 / count(*) AS successRate
ORDER BY agentName
```

### Find Low-Cost Recipes

```cypher
MATCH (run:OrchestrationRun)-[:PRODUCED_CALCULATION]->(calc:CalculationResult)
WHERE calc.costPerKg < 5.00
MATCH (run)-[:USED_RECIPE]->(recipe:RecipeVersion)
RETURN recipe.name, calc.costPerKg, calc.totalCost, run.timestamp
ORDER BY calc.costPerKg ASC
LIMIT 20
```

### Identify Failed Runs

```cypher
MATCH (run:OrchestrationRun)
WHERE run.status IN ['failed', 'partial']
MATCH (run)-[:HAS_AGENT_INVOCATION]->(agent:AgentInvocation)
WHERE agent.status = 'failed'
RETURN run.runId, run.userRequest, collect(agent.agent) AS failedAgents, run.timestamp
ORDER BY run.timestamp DESC
```

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| End-to-end duration | < 4s | ~2-3s |
| Peak memory | < 600 MB | ~400 MB |
| Neo4j write latency | < 450 ms | ~200-300 ms |
| Recipe generation | < 800 ms | ~600 ms |
| Scaling calculation | < 500 ms | ~300 ms |
| QA validation | < 400 ms | ~250 ms |

---

## Troubleshooting

### Run Not Persisted

**Symptom:** API returns 503 or Neo4j queries show no `OrchestrationRun` nodes

**Solutions:**
1. Check Neo4j connection: `curl http://localhost:8000/api/health`
2. Verify credentials in `backend/.env` or `backend/env.local.json`
3. Check backend logs for transaction errors
4. Ensure Neo4j database has write permissions

### Validation Failures

**Symptom:** `result.validation.valid: false` with errors

**Common Issues:**
- `totalPercentage != 100` → Sum of ingredient percentages must equal 100
- Missing required fields → `recipe.ingredients[].name` and `percentage` required
- Cost calculation mismatch → Check `context.costMap` for all ingredients
- Nutrient validation → Ensure FDC data available if `includeNutrients: true`

### Slow Performance

**Symptom:** `totalDuration > 4000 ms`

**Optimization Steps:**
1. Reduce ingredient count (< 20 recommended)
2. Enable caching for cost/density lookups
3. Check Ollama model performance (switch to smaller model if needed)
4. Review Neo4j index coverage
5. Consider batching multiple runs

---

## Integration Examples

### Python

```python
import requests

def persist_orchestration_run(run_data):
    response = requests.post(
        "http://localhost:8000/api/orchestration/runs",
        json=run_data,
        timeout=30
    )
    response.raise_for_status()
    return response.json()

# Example
run_data = {
    "userRequest": "Create vegan protein shake",
    "result": {
        "id": "python-run-001",
        "status": "success",
        # ... rest of result payload
    }
}

result = persist_orchestration_run(run_data)
print(f"Run {result['runId']} persisted with {result['nodesCreated']} nodes")
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

async function persistOrchestrationRun(runData) {
  const response = await axios.post(
    'http://localhost:8000/api/orchestration/runs',
    runData,
    { timeout: 30000 }
  );
  return response.data;
}

// Example
const runData = {
  userRequest: 'Create gluten-free bread',
  result: {
    id: 'js-run-001',
    status: 'success',
    // ... rest of result payload
  }
};

const result = await persistOrchestrationRun(runData);
console.log(`Run ${result.runId} persisted with ${result.nodesCreated} nodes`);
```

---

## Related Documentation

- **[CAP-01_ORCHESTRATION_PIPELINE.md](../CAP-01_ORCHESTRATION_PIPELINE.md)** - Complete pipeline design and contracts
- **[API_DOCUMENTATION.md](../API_DOCUMENTATION.md)** - Full API reference
- **[NEO4J_ARCHITECTURE.md](../NEO4J_ARCHITECTURE.md)** - Graph schema details
- **[BACKEND_IMPLEMENTATION_SUMMARY.md](../BACKEND_IMPLEMENTATION_SUMMARY.md)** - Backend architecture

---

**Last Updated:** 2025-11-11  
**Status:** ✅ Production Ready
