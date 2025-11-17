# Quick Implementation Guide - Orchestration Persistence

## TL;DR - What You Asked

**Your 4 Questions:**
1. ❌ **How user can save output in neo4j from Orchestration page** - Backend exists, frontend saves but NO UI to browse history
2. ❌ **How graph generate from graph builder generated output is saved** - ✅ Backend saves, ❌ No viewer UI
3. ❌ **UI designer metrics output in neo4j** - ✅ Backend saves, ❌ No dashboard UI
4. ❌ **Nutritional fact label** - ✅ API generates, ❌ NOT saved to Neo4j, NO history

---

## Answer Summary

### 1️⃣ Orchestration Output Saving

**Current State:**
```javascript
// OrchestrationView.jsx line 116
const result = await orchestrator.orchestrate(config)

// Line 130-145: Calls persist API
const persistenceSummary = await orchestrationService.persistRun(persistencePayload)
// ✅ THIS WORKS - Saves to Neo4j via POST /api/orchestration/runs
```

**What's Missing:**
- ❌ No UI to **browse past runs** with timestamps
- ❌ No **search/filter** by date, status, recipe name
- ❌ Cannot **view historical run details**

**Quick Fix:**
```bash
# 1. Add backend endpoint
# File: backend/app/api/endpoints/orchestration.py

@router.get("/runs")  # NEW ENDPOINT
async def list_orchestration_runs(limit: int = 50, status: str = None):
    query = """
    MATCH (run:OrchestrationRun)
    WHERE ($status IS NULL OR run.status = $status)
    RETURN run
    ORDER BY run.timestamp DESC
    LIMIT $limit
    """
    # Returns list of all runs with timestamps

# 2. Add frontend component
# File: src/components/orchestration/OrchestrationHistoryBrowser.jsx
# Shows table of past runs with "View" button
```

---

### 2️⃣ Graph Builder Output

**Current State:**
```python
# backend/app/services/orchestration_persistence_service.py
# Lines 144-191: ALREADY SAVES graph nodes/edges to Neo4j

WITH run
UNWIND $graphNodes AS node
MERGE (n:GraphEntity {id: node.id})
SET n.name = node.label, n.type = node.type
MERGE (run)-[:GENERATED_ENTITY]->(n)
# ✅ This creates nodes in Neo4j linked to OrchestrationRun
```

**What's Missing:**
- ❌ No **visual graph viewer** UI
- ❌ Cannot see **graph evolution** over time
- ❌ No way to **compare graphs** from different runs

**Quick Fix:**
```jsx
// File: src/components/orchestration/GraphSnapshotViewer.jsx
import ReactFlow from 'reactflow'

export function GraphSnapshotViewer({ runId }) {
  const [graph, setGraph] = useState(null)
  
  useEffect(() => {
    // Already implemented: GET /api/orchestration/runs/{run_id}/graph
    const data = await fetch(`/api/orchestration/runs/${runId}/graph`)
    setGraph(data)
  }, [runId])
  
  return (
    <ReactFlow 
      nodes={graph.nodes} 
      edges={graph.edges}
    />
  )
}
```

---

### 3️⃣ UI Designer Metrics

**Current State:**
```python
# orchestration_persistence_service.py line 134
MERGE (ui:UIConfig { uiConfigId: $uiConfig.uiConfigId })
SET ui.payload = $uiConfig.payload, ui.createdAt = $uiConfig.createdAt
MERGE (run)-[:PRODUCED_UI]->(ui)
# ✅ UI config SAVED to Neo4j
```

**What's Missing:**
- ❌ No **dashboard** to view saved UI configs
- ❌ Cannot **compare metrics** across runs
- ❌ No **timeline view** of UI changes

**Quick Fix:**
```jsx
// File: src/components/orchestration/UIMetricsDashboard.jsx

export function UIMetricsDashboard({ runId }) {
  const [uiConfig, setUiConfig] = useState(null)
  
  useEffect(() => {
    // Fetch from: GET /api/orchestration/runs/{runId}
    const details = await orchestrationService.getRunDetails(runId)
    setUiConfig(details.uiConfig)
  }, [runId])
  
  return (
    <div>
      {uiConfig?.components.map(comp => (
        <Card>
          <CardTitle>{comp.title}</CardTitle>
          <Badge>{comp.type}</Badge>
          <pre>{JSON.stringify(comp.config, null, 2)}</pre>
        </Card>
      ))}
    </div>
  )
}
```

---

### 4️⃣ Nutrition Fact Label

**Current State:**
```python
# backend/app/api/endpoints/nutrition.py line 22-23
@router.post("/{formulation_id}/nutrition-label")
async def generate_nutrition_label(...):
    nutrition_facts = await nutrition_service.calculate_nutrition_label(...)
    return nutrition_facts.dict()
    # ❌ DOES NOT SAVE TO NEO4J - Only calculates and returns
```

**What's Missing:**
- ❌ **NOT saved to Neo4j** at all
- ❌ No **label history** tracking
- ❌ No **versioning** of labels
- ❌ Cannot **access past labels** with timestamps

**Quick Fix:**
```python
# 1. Add NutritionLabel node to schema
# File: backend/app/services/graph_schema_service.py

{
    "node_type": "NutritionLabel",
    "properties": {
        "labelId": "string",
        "formulationId": "string",
        "calories": "float",
        "nutrients": "json",  # Complete nutrient data
        "generatedAt": "datetime",
        "version": "integer"
    }
}

# 2. Create persistence service
# File: backend/app/services/nutrition_persistence_service.py

class NutritionPersistenceService:
    def save_nutrition_label(self, formulation_id, nutrition_facts):
        query = """
        MATCH (f:Formulation {id: $formulation_id})
        CREATE (label:NutritionLabel {
            labelId: $label_id,
            formulationId: $formulation_id,
            calories: $calories,
            nutrients: $nutrients,
            generatedAt: datetime(),
            version: $version
        })
        CREATE (f)-[:HAS_NUTRITION_LABEL]->(label)
        RETURN label.labelId
        """

# 3. Update nutrition endpoint to save
# File: backend/app/api/endpoints/nutrition.py

@router.post("/{formulation_id}/nutrition-label")
async def generate_nutrition_label(..., save_to_neo4j: bool = True):
    nutrition_facts = await nutrition_service.calculate_nutrition_label(...)
    
    # NEW: Save to Neo4j
    if save_to_neo4j:
        persistence = NutritionPersistenceService(neo4j_client)
        label_id = persistence.save_nutrition_label(formulation_id, nutrition_facts)
    
    return {**nutrition_facts.dict(), "labelId": label_id, "savedToNeo4j": True}

# 4. Add history endpoint
@router.get("/{formulation_id}/nutrition-labels")
async def get_nutrition_label_history(formulation_id: str, limit: int = 10):
    """Get all past nutrition labels for formulation"""
    query = """
    MATCH (f:Formulation {id: $formulation_id})-[:HAS_NUTRITION_LABEL]->(label:NutritionLabel)
    RETURN label
    ORDER BY label.version DESC
    LIMIT $limit
    """
```

---

## Implementation Priority

### ⚠️ CRITICAL (Do First)
1. **Nutrition Label Persistence** - Currently NOT saved at all
   - Effort: 4 hours
   - Files: `graph_schema_service.py`, `nutrition_persistence_service.py`, `nutrition.py`

2. **Orchestration History Browser** - Cannot access past runs
   - Effort: 6 hours
   - Files: `orchestration.py` (backend), `OrchestrationHistoryBrowser.jsx`

### 🟡 HIGH (Do Next)
3. **Graph Snapshot Viewer** - Cannot visualize saved graphs
   - Effort: 4 hours
   - Files: `GraphSnapshotViewer.jsx` (with ReactFlow)

4. **UI Metrics Dashboard** - Cannot view saved UI configs
   - Effort: 3 hours
   - Files: `UIMetricsDashboard.jsx`

---

## Code Examples Ready to Copy

### Backend: List Orchestrations
```python
# File: backend/app/api/endpoints/orchestration.py
# Add this endpoint:

@router.get("/runs", response_model=List[OrchestrationRunSummary])
async def list_orchestration_runs(
    request: Request,
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None
) -> List[OrchestrationRunSummary]:
    neo4j_client = request.app.state.neo4j_client
    
    query = """
    MATCH (run:OrchestrationRun)
    WHERE ($status IS NULL OR run.status = $status)
    OPTIONAL MATCH (run)-[:USED_RECIPE]->(recipe:RecipeVersion)
    OPTIONAL MATCH (run)-[:HAS_AGENT_INVOCATION]->(agent:AgentInvocation)
    WITH run, recipe, count(agent) as agentCount
    RETURN run.runId as runId,
           run.status as status,
           run.timestamp as timestamp,
           run.totalDuration as totalDuration,
           recipe.name as recipeName,
           agentCount
    ORDER BY run.timestamp DESC
    SKIP $offset
    LIMIT $limit
    """
    
    results = neo4j_client.execute_query(query, {
        "status": status,
        "offset": offset,
        "limit": limit
    })
    
    return [
        {
            "runId": row["runId"],
            "status": row["status"],
            "timestamp": row["timestamp"],
            "totalDuration": row["totalDuration"],
            "recipeName": row.get("recipeName"),
            "agentCount": row["agentCount"]
        }
        for row in results
    ]
```

### Frontend: History Browser
```jsx
// File: src/components/orchestration/OrchestrationHistoryBrowser.jsx

import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'

export function OrchestrationHistoryBrowser({ onSelectRun }) {
  const [runs, setRuns] = useState([])
  
  useEffect(() => {
    loadRuns()
  }, [])
  
  const loadRuns = async () => {
    const response = await fetch('/api/orchestration/runs?limit=50')
    const data = await response.json()
    setRuns(data)
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Run ID</TableHead>
          <TableHead>Recipe</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Timestamp</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.runId}>
            <TableCell className="font-mono text-xs">
              {run.runId.substring(0, 8)}...
            </TableCell>
            <TableCell>{run.recipeName || '—'}</TableCell>
            <TableCell>
              <Badge variant={
                run.status === 'success' ? 'default' : 
                run.status === 'failed' ? 'destructive' : 'secondary'
              }>
                {run.status}
              </Badge>
            </TableCell>
            <TableCell>{(run.totalDuration / 1000).toFixed(2)}s</TableCell>
            <TableCell>
              {formatDistanceToNow(new Date(run.timestamp), { addSuffix: true })}
            </TableCell>
            <TableCell>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onSelectRun(run.runId)}
              >
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

---

## Summary Table

| Feature | Backend Status | Frontend Status | Effort | Priority |
|---------|---------------|----------------|--------|----------|
| **Orchestration Save** | ✅ Works | ✅ Works | 0h | ✅ Done |
| **Orchestration History** | ❌ Missing | ❌ Missing | 6h | 🔴 Critical |
| **Graph Builder Save** | ✅ Works | ❌ No Viewer | 4h | 🟡 High |
| **UI Designer Save** | ✅ Works | ❌ No Dashboard | 3h | 🟡 High |
| **Nutrition Label Save** | ❌ Not Implemented | ❌ Not Implemented | 4h | 🔴 Critical |
| **Nutrition History** | ❌ Missing | ❌ Missing | 3h | 🔴 Critical |

**Total Effort**: ~20 hours (2.5 developer days)

---

## Next Steps

1. **Run schema migration** to add `NutritionLabel` node
2. **Implement nutrition persistence** service
3. **Add history endpoints** for orchestration and nutrition
4. **Build UI components** for history browsing
5. **Test end-to-end** with real data

---

**Full details**: See `ORCHESTRATION_PERSISTENCE_GAPS.md`
