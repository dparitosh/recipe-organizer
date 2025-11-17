# Orchestration Persistence Implementation Gaps
**Date**: November 17, 2025  
**Status**: ⚠️ CRITICAL GAPS IDENTIFIED

## Executive Summary

While the Neo4j schema is **fully configured** for multi-agent orchestration, there are **critical implementation gaps** preventing users from:
1. Saving orchestration outputs to Neo4j
2. Accessing past orchestration records with timestamps
3. Saving nutrition fact labels with formulation history
4. Retrieving historical graph snapshots

## Current State Analysis

### ✅ What Works (Backend Exists)

| Component | Status | Location |
|-----------|--------|----------|
| **Persistence Service** | ✅ Implemented | `backend/app/services/orchestration_persistence_service.py` |
| **API Endpoints** | ✅ Implemented | `backend/app/api/endpoints/orchestration.py` |
| **Frontend Service** | ✅ Implemented | `src/lib/services/orchestration-service.js` |
| **Neo4j Schema** | ✅ Complete | 35 node types, 47 relationships |
| **Nutrition Label API** | ✅ Implemented | `backend/app/api/endpoints/nutrition.py` |

### ❌ What's Missing (Critical Gaps)

| Gap | Impact | Priority |
|-----|--------|----------|
| **No history UI for past runs** | Users cannot see previous orchestrations | 🔴 HIGH |
| **No nutrition label persistence** | Generated labels lost after generation | 🔴 HIGH |
| **No formulation versioning UI** | Cannot track formulation changes over time | 🟡 MEDIUM |
| **No graph snapshot viewer** | Cannot visualize saved Neo4j graphs | 🟡 MEDIUM |
| **No timestamp-based search** | Cannot filter orchestrations by date/time | 🟠 MEDIUM |
| **No export functionality** | Cannot export orchestration data | 🟢 LOW |

---

## Gap #1: Orchestration History UI

### Problem
- OrchestrationView saves runs to Recoil state (`orchestrationHistoryAtom`)
- **NOT saved to Neo4j** for long-term persistence
- No UI to browse past orchestration runs with timestamps
- History lost on browser refresh

### Current Code (Frontend Only)
```javascript
// OrchestrationView.jsx line 116
setOrchestrationHistory((prev) => [result, ...(prev || [])].slice(0, 10))
```

### What Needs Implementation

#### 1.1 Backend: Add List Orchestrations Endpoint
**File**: `backend/app/api/endpoints/orchestration.py`

```python
@router.get("/runs", response_model=List[OrchestrationRunSummary])
async def list_orchestration_runs(
    request: Request,
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[OrchestrationRunSummary]:
    """
    List orchestration runs with filtering and pagination.
    
    Query Parameters:
    - limit: Max runs to return (default 50)
    - offset: Skip first N runs (for pagination)
    - status: Filter by status (success|partial|failed)
    - start_date: ISO8601 timestamp (e.g., 2025-11-17T00:00:00Z)
    - end_date: ISO8601 timestamp
    """
    neo4j_client = getattr(request.app.state, "neo4j_client", None)
    if neo4j_client is None:
        raise HTTPException(status_code=503, detail="Neo4j not available")
    
    query = """
    MATCH (run:OrchestrationRun)
    WHERE 1=1
      {status_filter}
      {date_filter}
    OPTIONAL MATCH (run)-[:USED_RECIPE]->(recipe:RecipeVersion)
    OPTIONAL MATCH (run)-[:HAS_AGENT_INVOCATION]->(agent:AgentInvocation)
    WITH run, recipe, 
         count(DISTINCT agent) as agentCount,
         sum(CASE WHEN agent.status = 'success' THEN 1 ELSE 0 END) as successCount
    RETURN run.runId as runId,
           run.status as status,
           run.timestamp as timestamp,
           run.totalDuration as totalDuration,
           recipe.name as recipeName,
           agentCount,
           successCount
    ORDER BY run.timestamp DESC
    SKIP $offset
    LIMIT $limit
    """
    
    # Build filters based on parameters
    status_filter = "AND run.status = $status" if status else ""
    date_filter = ""
    if start_date:
        date_filter += "AND run.timestamp >= $start_date "
    if end_date:
        date_filter += "AND run.timestamp <= $end_date "
    
    query = query.format(status_filter=status_filter, date_filter=date_filter)
    
    params = {"offset": offset, "limit": limit}
    if status:
        params["status"] = status
    if start_date:
        params["start_date"] = start_date
    if end_date:
        params["end_date"] = end_date
    
    results = neo4j_client.execute_query(query, params)
    
    return [
        OrchestrationRunSummary(
            runId=row["runId"],
            status=row["status"],
            timestamp=row["timestamp"],
            totalDuration=row["totalDuration"],
            recipeName=row.get("recipeName"),
            agentCount=row["agentCount"],
            successCount=row["successCount"]
        )
        for row in results
    ]


@router.get("/runs/{run_id}", response_model=OrchestrationRunDetail)
async def get_orchestration_run(run_id: str, request: Request):
    """Get complete details of a specific orchestration run."""
    neo4j_client = getattr(request.app.state, "neo4j_client", None)
    if neo4j_client is None:
        raise HTTPException(status_code=503, detail="Neo4j not available")
    
    query = """
    MATCH (run:OrchestrationRun {runId: $run_id})
    OPTIONAL MATCH (run)-[:USED_RECIPE]->(recipe:RecipeVersion)
    OPTIONAL MATCH (run)-[:PRODUCED_CALCULATION]->(calc:CalculationResult)
    OPTIONAL MATCH (run)-[:PRODUCED_GRAPH]->(graph:GraphSnapshot)
    OPTIONAL MATCH (run)-[:PRODUCED_VALIDATION]->(validation:ValidationReport)
    OPTIONAL MATCH (run)-[:PRODUCED_UI]->(ui:UIConfig)
    OPTIONAL MATCH (run)-[:HAS_AGENT_INVOCATION]->(agent:AgentInvocation)
    WITH run, recipe, calc, graph, validation, ui,
         collect({
           sequence: agent.sequence,
           agentName: agent.agentName,
           status: agent.status,
           duration: agent.duration,
           error: agent.error,
           inputSnapshot: agent.inputSnapshot,
           outputSnapshot: agent.outputSnapshot
         }) as agents
    RETURN run, recipe, calc, graph, validation, ui, agents
    """
    
    result = neo4j_client.execute_query(query, {"run_id": run_id})
    
    if not result:
        raise HTTPException(status_code=404, detail="Orchestration run not found")
    
    # Parse and return complete orchestration detail
    row = result[0]
    # ... construct OrchestrationRunDetail from row data
```

#### 1.2 Frontend: Create History Browser Component
**File**: `src/components/orchestration/OrchestrationHistoryBrowser.jsx`

```jsx
import { useState, useEffect } from 'react'
import { orchestrationService } from '@/lib/services/orchestration-service'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ClockClockwise, Eye, Download } from '@phosphor-icons/react'
import { formatDistanceToNow } from 'date-fns'

export function OrchestrationHistoryBrowser({ onSelectRun }) {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState({ status: 'all', limit: 50 })

  useEffect(() => {
    loadRuns()
  }, [filter])

  const loadRuns = async () => {
    setLoading(true)
    try {
      const data = await orchestrationService.listRuns({
        limit: filter.limit,
        status: filter.status === 'all' ? undefined : filter.status
      })
      setRuns(data)
    } catch (error) {
      console.error('Failed to load orchestration history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewRun = async (runId) => {
    const details = await orchestrationService.getRunDetails(runId)
    onSelectRun(details)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockClockwise size={24} />
            <CardTitle>Orchestration History</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={loadRuns}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter controls */}
        <div className="flex gap-2 mb-4">
          <Button variant={filter.status === 'all' ? 'default' : 'outline'} 
                  onClick={() => setFilter({...filter, status: 'all'})}>
            All
          </Button>
          <Button variant={filter.status === 'success' ? 'default' : 'outline'}
                  onClick={() => setFilter({...filter, status: 'success'})}>
            Success
          </Button>
          <Button variant={filter.status === 'failed' ? 'default' : 'outline'}
                  onClick={() => setFilter({...filter, status: 'failed'})}>
            Failed
          </Button>
        </div>

        {/* History table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run ID</TableHead>
              <TableHead>Recipe</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Agents</TableHead>
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
                <TableCell>
                  {run.successCount}/{run.agentCount}
                </TableCell>
                <TableCell>
                  {(run.totalDuration / 1000).toFixed(2)}s
                </TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(run.timestamp), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" 
                          onClick={() => handleViewRun(run.runId)}>
                    <Eye size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

#### 1.3 Update Orchestration Service
**File**: `src/lib/services/orchestration-service.js`

Add new methods:
```javascript
export const orchestrationService = {
  // ... existing persistRun, fetchRunGraph ...

  /**
   * List orchestration runs with filtering
   */
  async listRuns({ limit = 50, offset = 0, status, startDate, endDate } = {}) {
    const params = new URLSearchParams({ limit, offset })
    if (status) params.append('status', status)
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await fetch(`${API_BASE}/api/orchestration/runs?${params}`)
    if (!response.ok) throw new Error('Failed to list orchestration runs')
    return response.json()
  },

  /**
   * Get complete details of a specific run
   */
  async getRunDetails(runId) {
    const response = await fetch(`${API_BASE}/api/orchestration/runs/${runId}`)
    if (!response.ok) throw new Error('Failed to fetch run details')
    return response.json()
  }
}
```

---

## Gap #2: Nutrition Label Persistence

### Problem
- Nutrition label generated via POST `/api/nutrition/{formulation_id}/nutrition-label`
- **Label NOT saved to Neo4j** after generation
- No way to retrieve historical nutrition labels
- Cannot track label changes over time

### Current Implementation
**File**: `backend/app/api/endpoints/nutrition.py`
- Line 22-23: `generate_nutrition_label()` endpoint
- Calculates nutrition facts but **DOES NOT PERSIST**

### What Needs Implementation

#### 2.1 Add NutritionLabel Node to Schema
**File**: `backend/app/services/graph_schema_service.py`

Add to schema definition:
```python
{
    "node_type": "NutritionLabel",
    "description": "FDA-compliant nutrition facts label for formulation",
    "properties": {
        "labelId": {"type": "string", "description": "Unique label ID"},
        "formulationId": {"type": "string", "description": "Source formulation"},
        "servingSize": {"type": "float"},
        "servingSizeUnit": {"type": "string"},
        "servingsPerContainer": {"type": "float"},
        "calories": {"type": "float"},
        "nutrients": {"type": "json", "description": "Complete nutrient breakdown"},
        "generatedAt": {"type": "datetime"},
        "generatedBy": {"type": "string", "description": "User or system"},
        "version": {"type": "integer", "description": "Label version number"}
    },
    "primary_key": "labelId",
    "indexed_properties": ["formulationId", "generatedAt", "version"],
    "relationships": [
        {"type": "HAS_NUTRITION_LABEL", "target": "Formulation", "direction": "outgoing"}
    ]
}
```

#### 2.2 Create Nutrition Persistence Service
**File**: `backend/app/services/nutrition_persistence_service.py`

```python
from typing import Dict, Any
from uuid import uuid4
from datetime import datetime
from app.db.neo4j_client import Neo4jClient

class NutritionPersistenceService:
    def __init__(self, neo4j_client: Neo4jClient):
        self.neo4j_client = neo4j_client
    
    def save_nutrition_label(
        self,
        formulation_id: str,
        nutrition_facts: Dict[str, Any],
        generated_by: str = "system"
    ) -> str:
        """Save nutrition label to Neo4j and link to formulation."""
        
        label_id = str(uuid4())
        generated_at = datetime.utcnow().isoformat()
        
        query = """
        MATCH (f:Formulation {id: $formulation_id})
        
        // Get current version number
        OPTIONAL MATCH (f)-[:HAS_NUTRITION_LABEL]->(existing:NutritionLabel)
        WITH f, coalesce(max(existing.version), 0) as maxVersion
        
        // Create new label with incremented version
        CREATE (label:NutritionLabel {
            labelId: $label_id,
            formulationId: $formulation_id,
            servingSize: $serving_size,
            servingSizeUnit: $serving_size_unit,
            servingsPerContainer: $servings_per_container,
            calories: $calories,
            nutrients: $nutrients,
            generatedAt: $generated_at,
            generatedBy: $generated_by,
            version: maxVersion + 1
        })
        
        // Link to formulation
        CREATE (f)-[:HAS_NUTRITION_LABEL]->(label)
        
        RETURN label.labelId as labelId, label.version as version
        """
        
        params = {
            "formulation_id": formulation_id,
            "label_id": label_id,
            "serving_size": nutrition_facts.get("serving_size"),
            "serving_size_unit": nutrition_facts.get("serving_size_unit"),
            "servings_per_container": nutrition_facts.get("servings_per_container"),
            "calories": nutrition_facts.get("calories"),
            "nutrients": json.dumps(nutrition_facts.get("nutrients", {})),
            "generated_at": generated_at,
            "generated_by": generated_by
        }
        
        result = self.neo4j_client.execute_write(query, params)
        return result[0]["labelId"]
    
    def get_nutrition_history(self, formulation_id: str, limit: int = 10):
        """Get nutrition label history for formulation."""
        
        query = """
        MATCH (f:Formulation {id: $formulation_id})-[:HAS_NUTRITION_LABEL]->(label:NutritionLabel)
        RETURN label
        ORDER BY label.version DESC
        LIMIT $limit
        """
        
        results = self.neo4j_client.execute_query(
            query, 
            {"formulation_id": formulation_id, "limit": limit}
        )
        
        return [row["label"] for row in results]
```

#### 2.3 Update Nutrition Endpoint to Save
**File**: `backend/app/api/endpoints/nutrition.py`

Modify `generate_nutrition_label()`:
```python
@router.post("/{formulation_id}/nutrition-label", summary="Generate & Save Nutrition Label")
async def generate_nutrition_label(
    formulation_id: str,
    payload: NutritionLabelRequest,
    request: Request,
    save_to_neo4j: bool = True  # NEW: Option to save
):
    # ... existing calculation code ...
    
    nutrition_facts = await nutrition_service.calculate_nutrition_label(...)
    
    # NEW: Persist to Neo4j
    if save_to_neo4j:
        neo4j_client = getattr(request.app.state, "neo4j_client", None)
        if neo4j_client and neo4j_client.driver:
            persistence = NutritionPersistenceService(neo4j_client)
            label_id = persistence.save_nutrition_label(
                formulation_id=formulation_id,
                nutrition_facts={
                    "serving_size": nutrition_facts.serving_size,
                    "serving_size_unit": nutrition_facts.serving_size_unit,
                    "servings_per_container": nutrition_facts.servings_per_container,
                    "calories": nutrition_facts.calories,
                    "nutrients": {
                        "total_fat": nutrition_facts.total_fat.dict(),
                        "saturated_fat": nutrition_facts.saturated_fat.dict(),
                        # ... all other nutrients
                    }
                },
                generated_by=payload.generated_by or "system"
            )
            
            return {
                **nutrition_facts.dict(),
                "labelId": label_id,  # NEW: Return label ID
                "savedToNeo4j": True
            }
    
    return nutrition_facts.dict()


@router.get("/{formulation_id}/nutrition-labels", summary="Get Nutrition Label History")
async def get_nutrition_label_history(
    formulation_id: str,
    request: Request,
    limit: int = 10
):
    """Get historical nutrition labels for formulation."""
    neo4j_client = getattr(request.app.state, "neo4j_client", None)
    if not neo4j_client:
        raise HTTPException(status_code=503, detail="Neo4j not available")
    
    persistence = NutritionPersistenceService(neo4j_client)
    labels = persistence.get_nutrition_history(formulation_id, limit)
    
    return {
        "formulationId": formulation_id,
        "labels": labels,
        "count": len(labels)
    }
```

#### 2.4 Frontend: Add History Viewer
**File**: `src/components/nutrition/NutritionLabelHistory.jsx`

```jsx
export function NutritionLabelHistory({ formulationId }) {
  const [labels, setLabels] = useState([])
  const [selectedLabel, setSelectedLabel] = useState(null)
  
  useEffect(() => {
    loadHistory()
  }, [formulationId])
  
  const loadHistory = async () => {
    const response = await fetch(
      `/api/nutrition/${formulationId}/nutrition-labels`
    )
    const data = await response.json()
    setLabels(data.labels)
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nutrition Label History</CardTitle>
        <CardDescription>
          {labels.length} label{labels.length !== 1 ? 's' : ''} generated
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Calories</TableHead>
              <TableHead>Generated</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {labels.map((label) => (
              <TableRow key={label.labelId}>
                <TableCell>v{label.version}</TableCell>
                <TableCell>{label.calories} kcal</TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(label.generatedAt), { addSuffix: true })}
                </TableCell>
                <TableCell>{label.generatedBy}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm"
                          onClick={() => setSelectedLabel(label)}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

---

## Gap #3: Graph Builder Output Persistence

### Problem
- Graph Builder agent generates Neo4j Cypher commands
- Commands saved to `OrchestrationRun.graph_snapshot` as blob
- **No way to query individual graph nodes** created by specific runs
- Cannot visualize graph evolution over time

### Current State
**File**: `backend/app/services/orchestration_persistence_service.py`
- Lines 144-191: Saves `GraphEntity` nodes and relationships
- Links to `OrchestrationRun` via `GENERATED_ENTITY`
- ✅ **Actually works** but no UI to display it

### What Needs Implementation

#### 3.1 Frontend: Graph Snapshot Viewer
**File**: `src/components/orchestration/GraphSnapshotViewer.jsx`

```jsx
import { useEffect, useState } from 'react'
import { orchestrationService } from '@/lib/services/orchestration-service'
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow'
import 'reactflow/dist/style.css'

export function GraphSnapshotViewer({ runId }) {
  const [graphData, setGraphData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadGraph()
  }, [runId])
  
  const loadGraph = async () => {
    setLoading(true)
    try {
      const data = await orchestrationService.fetchRunGraph(runId)
      
      // Convert to ReactFlow format
      const nodes = data.nodes.map((node, idx) => ({
        id: node.id,
        data: { 
          label: node.properties?.name || node.type,
          type: node.type,
          properties: node.properties
        },
        position: { x: (idx % 5) * 200, y: Math.floor(idx / 5) * 150 },
        style: {
          background: getNodeColor(node.type),
          borderRadius: 8,
          padding: 12
        }
      }))
      
      const edges = data.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.type,
        type: 'smoothstep'
      }))
      
      setGraphData({ nodes, edges })
    } catch (error) {
      console.error('Failed to load graph:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const getNodeColor = (type) => {
    const colors = {
      'formulation': '#3b82f6',
      'ingredient': '#10b981',
      'process': '#f59e0b',
      'cost': '#ef4444',
      'nutrient': '#8b5cf6'
    }
    return colors[type.toLowerCase()] || '#6b7280'
  }
  
  if (loading) return <div>Loading graph snapshot...</div>
  if (!graphData) return <div>No graph data available</div>
  
  return (
    <div style={{ height: 600 }}>
      <ReactFlow
        nodes={graphData.nodes}
        edges={graphData.edges}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}
```

---

## Gap #4: UI Designer Metrics Persistence

### Problem
- UI Designer agent generates component configurations
- Saved to `UIConfig` node in Neo4j ✅
- **No dashboard to display historical UI metrics**
- Cannot compare UI configurations across runs

### What Needs Implementation

#### 4.1 UI Metrics Dashboard
**File**: `src/components/orchestration/UIMetricsDashboard.jsx`

```jsx
export function UIMetricsDashboard({ runId }) {
  const [uiConfig, setUiConfig] = useState(null)
  
  useEffect(() => {
    loadUIConfig()
  }, [runId])
  
  const loadUIConfig = async () => {
    const details = await orchestrationService.getRunDetails(runId)
    setUiConfig(details.uiConfig)
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>UI Configuration - Run {runId.substring(0, 8)}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Render saved UI config */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uiConfig?.components?.map((comp, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-sm">{comp.title}</CardTitle>
                  <Badge variant="outline">{comp.type}</Badge>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs">
                    {JSON.stringify(comp.config, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Add metrics comparison across multiple runs */}
      <UIMetricsComparison runIds={[runId]} />
    </div>
  )
}
```

---

## Implementation Priority

### Phase 1: Critical (Week 1) 🔴
1. **Orchestration History Browser** (Gap #1)
   - Backend: `GET /api/orchestration/runs` endpoint
   - Frontend: `OrchestrationHistoryBrowser.jsx`
   - Enable timestamp filtering

2. **Nutrition Label Persistence** (Gap #2)
   - Add `NutritionLabel` node to schema
   - Create `NutritionPersistenceService`
   - Update nutrition endpoint to save

### Phase 2: High Priority (Week 2) 🟡
3. **Graph Snapshot Viewer** (Gap #3)
   - Frontend: `GraphSnapshotViewer.jsx` with ReactFlow
   - Time-series graph comparison

4. **UI Metrics Dashboard** (Gap #4)
   - Frontend: `UIMetricsDashboard.jsx`
   - Historical UI config comparison

### Phase 3: Nice-to-Have (Week 3+) 🟢
5. **Export Functionality**
   - Export orchestration data to JSON/CSV
   - Export nutrition labels to PDF
   - Export graphs to PNG/SVG

6. **Advanced Search**
   - Full-text search across orchestration history
   - Filter by agent status, recipe name, date range
   - Saved search queries

---

## Database Schema Changes Required

### New Nodes
```cypher
// NutritionLabel node
CREATE CONSTRAINT nutrition_label_id FOR (n:NutritionLabel) 
  REQUIRE n.labelId IS UNIQUE

CREATE INDEX nutrition_label_formulation_idx FOR (n:NutritionLabel) 
  ON (n.formulationId)

CREATE INDEX nutrition_label_generated_at_idx FOR (n:NutritionLabel) 
  ON (n.generatedAt)
```

### New Relationships
```cypher
// Formulation -> NutritionLabel
(:Formulation)-[:HAS_NUTRITION_LABEL]->(:NutritionLabel)

// Existing (already in schema) ✅
(:OrchestrationRun)-[:GENERATED_ENTITY]->(:GraphEntity)
(:OrchestrationRun)-[:PRODUCED_UI]->(:UIConfig)
(:OrchestrationRun)-[:PRODUCED_GRAPH]->(:GraphSnapshot)
```

---

## Testing Checklist

### Orchestration History
- [ ] Create 5 orchestration runs with different statuses
- [ ] Verify all appear in history browser with timestamps
- [ ] Test filtering by status (success/failed)
- [ ] Test date range filtering
- [ ] Verify pagination works with limit/offset
- [ ] Click "View" on historical run loads full details

### Nutrition Label Persistence
- [ ] Generate nutrition label for formulation
- [ ] Verify label saved to Neo4j with `labelId`
- [ ] Generate second label, verify version increments to 2
- [ ] Load nutrition label history, verify both labels shown
- [ ] View historical label, verify all nutrients correct
- [ ] Delete formulation, verify cascade deletes labels

### Graph Snapshot Viewer
- [ ] Run orchestration that generates graph
- [ ] Open graph snapshot viewer for runId
- [ ] Verify nodes and edges render in ReactFlow
- [ ] Verify node colors match type (ingredient green, etc.)
- [ ] Test zoom/pan controls
- [ ] Click node to see properties

### UI Metrics Dashboard
- [ ] Run orchestration with UI Designer agent
- [ ] Open UI metrics dashboard
- [ ] Verify all component configs displayed
- [ ] Compare UI configs across 2 different runs
- [ ] Export UI config to JSON

---

## Conclusion

### Summary
- ✅ **Backend infrastructure exists** and is robust
- ❌ **Frontend UIs missing** for accessing persisted data
- ❌ **Nutrition labels not persisted** despite API existing
- ❌ **No historical search** or filtering capabilities

### Effort Estimate
- **Phase 1**: 3-4 days (2 developers)
- **Phase 2**: 3-4 days (2 developers)
- **Phase 3**: 2-3 days (1 developer)
- **Total**: ~10-12 developer days

### Next Steps
1. ✅ Review this document with team
2. Create schema migration for `NutritionLabel` node
3. Implement `GET /api/orchestration/runs` endpoint
4. Build `OrchestrationHistoryBrowser` component
5. Test end-to-end orchestration persistence flow

---

**Status**: Ready for implementation planning
**Last Updated**: November 17, 2025
