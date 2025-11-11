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

## Pareto Focus (Top 20% Work → 80% Impact)

1. **CAP-02 Formulation Graph Sync (P1 tasks)** – API/UI audit, backend update and delete endpoints, FormulationEditor save integration, and cost metadata persistence ensure formulation data becomes a first-class graph citizen for downstream analytics and multi-agent reuse.  
2. **CAP-03 Retrieval & FDC Integration (P1 tasks)** - Pair hybrid retrieval work with FDC ingestion validation, Neo4j query endpoints, and frontend surfacing so knowledge assets and USDA data are queryable inside the app.  
3. **CAP-04 Memory & Performance Guardrails (P1 tasks)** – Finalize data pipeline contracts, caching strategy, and resource budgets to keep orchestration and formulation flows within latency and memory targets.  
4. **Cross-Doc Critical Runs (DOC-01, DOC-06, DOC-07)** – Manual QA checklist, FDC ingest pilot, and AI workflow validation prove the end-to-end data pipeline while exercising the completed CAP-01 automation.

> Once these are in motion, cycle remaining P2/P3 tasks in weekly triage. Track memory footprint and latency metrics as acceptance criteria for each data pipeline milestone.

---

<!-- Last updated: 2025-11-11 (CAP03 retrieval caching + CAP02 pipeline updates) -->
`;
