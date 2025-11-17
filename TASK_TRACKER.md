export const taskTrackerMarkdown = `
# Capability Task Tracker

## Overview

This tracker captures the immediate capability workstreams around Neo4j integration and agent orchestration. Update statuses as tasks progress.

## Legend

- **NS** – Not Started
- **IP** – In Progress
- **BL** – Blocked
- **RD** – Ready for Review
- **DN** – Done

## Capability Roadmap

| ID | Capability | Description | Owner | Status | Priority | Notes |
|----|------------|-------------|-------|--------|----------|-------|
| CAP-01 | Multi-Agent → Neo4j Automation | Persist agentic pipeline outputs (recipe, calculation, graph, validation, UI) into Neo4j transactions. | TBD | DN | P1 | CAP-01 validation completed 2025-11-10 with Ollama, Neo4j persistence, latency, interpretability, and integration tests closed out. |
| CAP-02 | Formulation ↔ Neo4j Sync | Integrate formulation creation/update flow with Neo4j graph store. | TBD | RD | P1 | Ready for review 2025-11-11. |
| CAP-03 | GraphRAG Enablement | Stand up knowledge ingestion, embeddings, and hybrid retrieval on Neo4j for conversational RAG. | TBD | IP | P2 | Source manifest drafted; ingestion tooling in progress; retrieval caching + truncation under review. |
| CAP-04 | Memory & Performance Optimization | Define data pipeline contracts, caching, and resource budgets for orchestration runs. | TBD | NS | P1 | New stream ensuring orchestration stays within memory/latency budgets. |
| CAP-05 | Orchestration History & Persistence | Enable users to save, retrieve, and visualize orchestration outputs and nutrition labels with full historical tracking. | TBD | NS | P0 | **NEW 2025-11-17**: Critical gaps identified - no UI for browsing past orchestrations, nutrition labels not persisted, no graph viewer, no UI metrics dashboard. Target completion: Nov 22, 2025. See CAP-05 section below for 20h task breakdown. |

## CAP-01 Breakdown

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Document graph schema extensions for agent outputs | DN | P1 | Relationships validated with data team; 'CAP-01_ORCHESTRATION_PIPELINE.md' published 2025-11-10. |
| Implement transactional persistence layer | DN | P1 | Live Neo4j writes verified during end-to-end run on 2025-11-10. |
| Define orchestration data pipeline contracts (inputs/outputs, versioning, retention) | DN | P1 | Contract signed off 2025-11-10; updates tracked in 'CAP-01_ORCHESTRATION_PIPELINE.md'. |
| Update orchestrator to call persistence layer | DN | P1 | End-to-end orchestration validated with Ollama + persistence on 2025-11-10. |
| Add automated tests validating Neo4j writes | DN | P2 | Integration suite executed 2025-11-10 covering persistence pipeline. |
| Optimize orchestration agent latency | DN | P2 | Prompt tuning + model swap cut latency under target on 2025-11-10 run. |
| Improve orchestration result interpretability | DN | P2 | UI telemetry + clarity refinements merged 2025-11-10. |

## CAP-02 Breakdown

- **Audit current formulation API & UI flows** - Status 'DN', Priority 'P1'. Mapping completed after aligning FormulationEditor with refreshed endpoints (2025-11-10).
- **Extend backend endpoints for Neo4j sync** - Status 'DN', Priority 'P1'. Update and delete handlers merged with unit coverage (2025-11-10).
- **Design formulation data pipeline (eventing, caching, retry)** - Status 'DN', Priority 'P1'. FormulationPipelineService now handles caching, retries, and event publication; backend suite green on 2025-11-11.
- **Update frontend to surface Neo4j backed data** - Status 'DN', Priority 'P1'. Formulations view wires the editor to Neo4j APIs with save and reset actions (2025-11-10).
- **Persist ingredient cost metadata for analytics views** - Status 'DN', Priority 'P2'. Pipeline writes cost_per_kg, quantity_kg, and cost_reference for formulations and ingredients (2025-11-11).
- **Write regression tests covering sync path** - Status 'DN', Priority 'P2'. API suite now covers create, get, update, and delete flows with cost metadata (pytest backend/tests, 2025-11-11).

## CAP-03 Breakdown

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Define ingestion sources & chunking strategy | RD | P2 | Plan captured in 'CAP-03_GRAPH_RAG_PLAN.md'; ingestion service now generates chunks and writes to Neo4j via 'backend/scripts/graphrag_ingest.py' with persistence tests (2025-11-10). |
| Select embedding model & storage approach | RD | P2 | 'nomic-embed-text:latest' benchmarked via 'scripts/embedding_benchmark.py'; report in 'docs/embedding-selection-report.md' confirms Neo4j vector index strategy (2025-11-11). |
| Implement hybrid retrieval (vector + Cypher) | RD | P1 | 'GraphRAGRetrievalService' integrated with `/api/ai/query` hybrid endpoint; caching/truncation optimized and covered by pytest (2025-11-11). |
| Integrate GraphRAG into conversation service | RD | P2 | GraphRAG UI integration complete and pending UX review. |
| Optimize retrieval memory footprint & caching strategy | RD | P1 | GraphRAG retrieval service now applies LRU+TTL cache and chunk truncation with pytest coverage (2025-11-11). |
| Build Neo4j FDC query endpoint | RD | P1 | GET '/api/fdc/foods' returning paginated ingest list; tests in 'backend/tests/services/test_fdc_service.py'. |
| Verify FDC ingestion pipeline end-to-end | IP | P1 | 'npm run seed:fdc' seeding helper lives in 'scripts/seed-fdc-data.mjs'; needs run with real API key. |
| Update graph schema documentation for FDC coverage | RD | P2 | 'FDC_SCHEMA.md' documents nodes, relationships, constraints. |
| Surface FDC data in frontend | RD | P2 | 'src/components/FDCDataIngestionPanel.jsx' exposes Stored Foods catalog using the new endpoint. |

## Cross-Doc Action Items

| ID | Source Doc | Task | Status | Priority | Notes |
|----|------------|------|--------|----------|-------|
| DOC-01 | 'FIXES_APPLIED.md' | Run full manual testing checklist (Neo4j connectivity, mock mode, BOM, error UX) | NS | P1 | Create shared test log for each checklist item. |
| DOC-02 | 'FIXES_APPLIED.md' | Implement automated testing TODOs (neo4jDriver, manager, graph ops, error handling, useKV, spark mocks) | NS | P2 | Break into test tickets once priorities confirmed. |
| DOC-03 | 'FIXES_APPLIED.md' | Address remaining medium-priority issues (Zod validation, logging utility, JSDoc, component organization, export functions) | NS | P2 | Sequence after CAP-02 backend contracts finalize. |
| DOC-04 | 'PRE_DEPLOYMENT_CHECKLIST.md' | Complete follow-up tasks (Phase 2 cleanup, dark mode decision, Phase 3 testing plan, doc review) | NS | P3 | Schedule owners and due dates. |
| DOC-05 | 'PRE_DEPLOYMENT_CHECKLIST.md' | Execute post-deployment next steps (commit, push, deploy, monitor, plan improvements) | NS | P2 | Link to deployment runbook. |
| DOC-06 | 'FDC_INTEGRATION_GUIDE.md' | Pilot FDC ingest (5-10 foods), category mapping, formulation linkage, nutrition calc, optimization workflow | NS | P1 | Depends on Neo4j schema alignment. |
| DOC-07 | 'BACKEND_IMPLEMENTATION_SUMMARY.md' | Validate AI workflow steps (backend start, frontend config, AI assistant test, sample data load, formulation creation) | NS | P1 | Use QA scenario to confirm documentation accuracy. |

---

## CAP-05: Orchestration History & Persistence (NEW - Nov 17, 2025)

**Epic Goal**: Enable users to save, retrieve, and visualize orchestration outputs and nutrition labels with full historical tracking and timestamps.

**Business Value**: Users can access past orchestration runs, track formulation changes over time, and maintain audit trails for regulatory compliance.

**Total Effort**: 20 hours (~2.5 developer days)  
**Target Completion**: November 22, 2025  
**Status**: 🟡 Planning Phase  
**Priority**: P0 (CRITICAL)

### Phase 1: Orchestration History (CRITICAL 🔴)

| ID | Task | Description | Effort | Status | Priority | Dependencies | Acceptance Criteria |
|----|------|-------------|--------|--------|----------|--------------|---------------------|
| 5.1.1 | Backend - List Orchestrations Endpoint | Create GET /api/orchestration/runs with filtering and pagination | 3h | NS | P0 | None | Endpoint returns runId, status, timestamp, duration, recipeName, agentCount with filter by status/date |
| 5.1.2 | Backend - Get Run Details Endpoint | Create GET /api/orchestration/runs/{run_id} for complete run details | 2h | NS | P0 | 5.1.1 | Returns complete run with recipe, calculation, graph, validation, uiConfig, agents |
| 5.1.3 | Backend - Response Models | Create Pydantic models for API responses | 1h | NS | P0 | None | OrchestrationRunSummary and OrchestrationRunDetail models with validation |
| 5.1.4 | Frontend - Orchestration Service Methods | Add listRuns() and getRunDetails() to orchestration service | 1h | NS | P0 | 5.1.1, 5.1.2 | Service methods with TypeScript types and error handling |
| 5.1.5 | Frontend - History Browser Component | Create UI to browse orchestration history with filters | 4h | NS | P0 | 5.1.4 | Table with status filter, date range, pagination, View button |
| 5.1.6 | Frontend - Integrate History Browser | Add history browser to OrchestrationView with toggle | 1h | NS | P0 | 5.1.5 | Show/Hide History button, clicking View loads full result |

**Phase 1 Subtotal**: 12 hours

### Phase 2: Nutrition Label Persistence (CRITICAL 🔴)

| ID | Task | Description | Effort | Status | Priority | Dependencies | Acceptance Criteria |
|----|------|-------------|--------|--------|----------|--------------|---------------------|
| 5.2.1 | Backend - Update Graph Schema | Add NutritionLabel node type to Neo4j schema | 1h | NS | P0 | None | NutritionLabel node with constraints on labelId, indexes on formulationId/generatedAt/version |
| 5.2.2 | Backend - Nutrition Persistence Service | Create service to save/retrieve nutrition labels | 2h | NS | P0 | 5.2.1 | save_nutrition_label() with auto-increment version, get_nutrition_history() |
| 5.2.3 | Backend - Update Nutrition Endpoint | Modify POST endpoint to save labels to Neo4j | 1.5h | NS | P0 | 5.2.2 | save_to_neo4j parameter (default true), returns labelId and savedToNeo4j flag |
| 5.2.4 | Backend - Nutrition History Endpoint | Create GET endpoint for nutrition label history | 1h | NS | P0 | 5.2.2 | GET /api/nutrition/{formulation_id}/nutrition-labels returns list ordered by version DESC |
| 5.2.5 | Frontend - Nutrition Label History Component | Create UI to display nutrition label history | 3h | NS | P1 | 5.2.4 | Table with version, calories, serving size, generated date, View/Compare buttons |

**Phase 2 Subtotal**: 8.5 hours

### Phase 3: Graph Snapshot Viewer (HIGH 🟡)

| ID | Task | Description | Effort | Status | Priority | Dependencies | Acceptance Criteria |
|----|------|-------------|--------|--------|----------|--------------|---------------------|
| 5.3.1 | Frontend - Graph Snapshot Viewer | Create ReactFlow visualization for Neo4j graphs | 4h | NS | P1 | None | Interactive graph with colored nodes by type, zoom/pan, mini-map, node properties |
| 5.3.2 | Frontend - Integrate Graph Viewer | Add graph viewer tab to OrchestrationResultView | 1h | NS | P1 | 5.3.1 | New tab shows GraphSnapshotViewer, fallback if not saved |

**Phase 3 Subtotal**: 5 hours

### Phase 4: UI Metrics Dashboard (HIGH 🟡)

| ID | Task | Description | Effort | Status | Priority | Dependencies | Acceptance Criteria |
|----|------|-------------|--------|--------|----------|--------------|---------------------|
| 5.4.1 | Frontend - UI Metrics Dashboard | Create dashboard for UI Designer agent output | 3h | NS | P1 | 5.1.2 | Display layout, theme, components with color swatches and type badges |
| 5.4.2 | Frontend - UI Config Comparison | Create comparison view for multiple UI configs | 2h | NS | P2 | 5.4.1 | Side-by-side comparison, highlight differences, export to JSON |

**Phase 4 Subtotal**: 5 hours

### CAP-05 Critical Path

**Week 1 (Nov 17-20)**
- **Day 1 (Nov 17)**: Tasks 5.1.1, 5.1.2, 5.1.3 (Backend orchestration endpoints) - 6h
- **Day 2 (Nov 18)**: Tasks 5.1.4, 5.1.5, 5.2.1 (Frontend history + schema update) - 6h
- **Day 3 (Nov 19)**: Tasks 5.1.6, 5.2.2, 5.2.3, 5.2.4 (Integration + nutrition persistence) - 5.5h

**Week 2 (Nov 20-22)**
- **Day 4 (Nov 20)**: Tasks 5.2.5, 5.3.1 (Nutrition history UI + graph viewer) - 7h
- **Day 5 (Nov 21)**: Tasks 5.3.2, 5.4.1 (Graph integration + UI dashboard) - 4h
- **Day 6 (Nov 22)**: Task 5.4.2 + Integration testing + Bug fixes - 3h

### CAP-05 Success Metrics

**Functional Metrics**
- [ ] Users can browse all past orchestration runs with timestamps
- [ ] Users can retrieve orchestration details from 1 month ago
- [ ] Users can see nutrition label history for any formulation
- [ ] Users can visualize graph snapshot in interactive UI
- [ ] Users can view UI Designer metrics from past runs

**Performance Metrics**
- [ ] Orchestration list API responds in <500ms (p95)
- [ ] Nutrition history API responds in <300ms (p95)
- [ ] Graph viewer renders in <2s for 100-node graph
- [ ] Zero data loss on save operations

**Business Metrics**
- [ ] 80% of orchestrations successfully persisted to Neo4j
- [ ] Nutrition labels generated and saved for 50+ formulations
- [ ] Users accessing history feature 10+ times per week

### CAP-05 Database Schema Changes

**New Nodes**
```cypher
// NutritionLabel node
CREATE CONSTRAINT nutrition_label_id FOR (n:NutritionLabel) 
  REQUIRE n.labelId IS UNIQUE;

CREATE INDEX nutrition_label_formulation_idx FOR (n:NutritionLabel) 
  ON (n.formulationId);

CREATE INDEX nutrition_label_generated_at_idx FOR (n:NutritionLabel) 
  ON (n.generatedAt);

CREATE INDEX nutrition_label_version_idx FOR (n:NutritionLabel) 
  ON (n.version);
```

**New Relationships**
```cypher
// Formulation -> NutritionLabel
(:Formulation)-[:HAS_NUTRITION_LABEL]->(:NutritionLabel)
```

### CAP-05 Testing Strategy

**Unit Tests**
- [ ] Nutrition persistence service: save_nutrition_label, get_nutrition_history, get_latest_label
- [ ] Orchestration endpoints: list_orchestration_runs with filters, get_orchestration_run
- [ ] Service methods: listRuns error handling, getRunDetails 404 handling

**Integration Tests**
- [ ] End-to-end: orchestration save → list → retrieve → display
- [ ] End-to-end: nutrition label generate → save → history → retrieve
- [ ] End-to-end: graph snapshot save → fetch → visualize

**UI Tests**
- [ ] History browser loads data and displays table correctly
- [ ] Status and date filters update results
- [ ] Pagination works (next/previous buttons)
- [ ] Nutrition history component renders all versions
- [ ] Graph viewer displays nodes/edges with correct colors

**Performance Tests**
- [ ] List 1000 orchestrations completes in <500ms
- [ ] Load graph with 100 nodes renders in <2s
- [ ] Nutrition history with 50 versions loads in <300ms

### CAP-05 Known Issues & Risks

**Blockers**: None currently

**Risks**
- **Neo4j Performance**: Large graphs (>500 nodes) may be slow to load
  - *Mitigation*: Add pagination to graph API, implement client-side virtualization
- **Storage Growth**: Nutrition labels could significantly grow database size
  - *Mitigation*: Add cleanup policy (delete labels older than 1 year), add archival strategy
- **Frontend Bundle Size**: ReactFlow library adds ~200KB to bundle
  - *Mitigation*: Lazy load GraphSnapshotViewer component, code splitting

### CAP-05 Related Documents
- `ORCHESTRATION_PERSISTENCE_GAPS.md` - Detailed gap analysis with complete code examples
- `QUICK_IMPLEMENTATION_GUIDE.md` - Quick reference with TL;DR answers and ready-to-copy code
- `SCHEMA_VERIFICATION_SUMMARY.md` - Neo4j schema verification confirming orchestration support

## Pareto Focus (Top 20% Work → 80% Impact)

1. **CAP-05 Orchestration History & Nutrition Persistence (P0 tasks)** – **NEW CRITICAL PATH**: List/detail endpoints for orchestration history, nutrition label persistence with versioning, and history browser UI enable users to access past runs with timestamps and track formulation changes for regulatory compliance. Without this, all orchestration data is lost after browser refresh.
2. **CAP-02 Formulation Graph Sync (P1 tasks)** – API/UI audit, backend update and delete endpoints, FormulationEditor save integration, and cost metadata persistence ensure formulation data becomes a first-class graph citizen for downstream analytics and multi-agent reuse.  
3. **CAP-03 Retrieval & FDC Integration (P1 tasks)** - Pair hybrid retrieval work with FDC ingestion validation, Neo4j query endpoints, and frontend surfacing so knowledge assets and USDA data are queryable inside the app.  
4. **CAP-04 Memory & Performance Guardrails (P1 tasks)** – Finalize data pipeline contracts, caching strategy, and resource budgets to keep orchestration and formulation flows within latency and memory targets.  
5. **Cross-Doc Critical Runs (DOC-01, DOC-06, DOC-07)** – Manual QA checklist, FDC ingest pilot, and AI workflow validation prove the end-to-end data pipeline while exercising the completed CAP-01 automation.

> **CAP-05 takes priority over CAP-03/CAP-04** due to critical gap in persistence layer. Once CAP-05 Phase 1 (orchestration history) and Phase 2 (nutrition labels) are complete, cycle remaining P2/P3 tasks in weekly triage. Track memory footprint and latency metrics as acceptance criteria for each data pipeline milestone.

---

<!-- Last updated: 2025-11-17 (CAP-05 orchestration persistence added as P0 priority) -->
`;
