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
| CAP-01 | Multi-Agent → Neo4j Automation | Persist agentic pipeline outputs (recipe, calculation, graph, validation, UI) into Neo4j transactions. | TBD | IP | P1 | Initial scope defined; needs schema/design spikes. |
| CAP-02 | Formulation ↔ Neo4j Sync | Integrate formulation creation/update flow with Neo4j graph store. | TBD | NS | P1 | Awaiting API contract review. |
| CAP-03 | GraphRAG Enablement | Stand up knowledge ingestion, embeddings, and hybrid retrieval on Neo4j for conversational RAG. | TBD | NS | P2 | Requires tooling selection and infra alignment. |
| CAP-04 | Memory & Performance Optimization | Define data pipeline contracts, caching, and resource budgets for orchestration runs. | TBD | NS | P1 | New stream ensuring orchestration stays within memory/latency budgets. |

## CAP-01 Breakdown

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Document graph schema extensions for agent outputs | IP | P1 | Draft relationships pending validation with data team (see `CAP-01_ORCHESTRATION_PIPELINE.md`). |
| Implement transactional persistence layer | RD | P1 | Persistence service now serializes nested payloads; awaiting final review with live Neo4j writes. |
| Define orchestration data pipeline contracts (inputs/outputs, versioning, retention) | IP | P1 | Initial contract drafted in `CAP-01_ORCHESTRATION_PIPELINE.md`. |
| Update orchestrator to call persistence layer | RD | P1 | Frontend orchestration view posts runs to backend; confirm end-to-end verification before marking done. |
| Add automated tests validating Neo4j writes | IP | P2 | Mapper and persistence unit tests landed. Integration coverage still pending. |
| Optimize orchestration agent latency | IP | P2 | Identified long-running LLM prompts; plan prompt tightening and faster model evaluation. |
| Improve orchestration result interpretability | IP | P2 | Documented clarity gaps in validation metrics and persistence feedback; design UI refinements. |

## CAP-02 Breakdown

- **Audit current formulation API & UI flows** - Status `NS`, Priority `P1`: Coordinate with frontend lead.
- **Extend backend endpoints for Neo4j sync** - Status `NS`, Priority `P1`: Add update and delete routes plus Neo4j property persistence for formulations and ingredients.
- **Design formulation data pipeline (eventing, caching, retry)** - Status `NS`, Priority `P1`: Keep multi-agent reads and writes consistent across services.
- **Update frontend to surface Neo4j-backed data** - Status `NS`, Priority `P1`: Connect FormulationEditor save flow into the backend update path.
- **Persist ingredient cost metadata for analytics views** - Status `NS`, Priority `P2`: Populate Neo4j cost fields to unlock Pareto analysis.
- **Write regression tests covering sync path** - Status `NS`, Priority `P2`: Build end-to-end validation once contracts stabilize.

## CAP-03 Breakdown

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Define ingestion sources & chunking strategy | NS | P2 | Identify prioritized knowledge assets. |
| Select embedding model & storage approach | NS | P2 | Compare Ollama-hosted vs hosted APIs. |
| Implement hybrid retrieval (vector + Cypher) | NS | P1 | Align with Neo4j best practices. |
| Integrate GraphRAG into conversation service | NS | P2 | Follows retrieval implementation. |
| Optimize retrieval memory footprint & caching strategy | NS | P1 | Prevent excessive vector loads during conversations. |

## Cross-Doc Action Items

| ID | Source Doc | Task | Status | Priority | Notes |
|----|------------|------|--------|----------|-------|
| DOC-01 | `FIXES_APPLIED.md` | Run full manual testing checklist (Neo4j connectivity, mock mode, BOM, error UX) | NS | P1 | Create shared test log for each checklist item. |
| DOC-02 | `FIXES_APPLIED.md` | Implement automated testing TODOs (neo4jDriver, manager, graph ops, error handling, useKV, spark mocks) | NS | P2 | Break into test tickets once priorities confirmed. |
| DOC-03 | `FIXES_APPLIED.md` | Address remaining medium-priority issues (Zod validation, logging utility, JSDoc, component organization, export functions) | NS | P2 | Sequence after CAP-02 backend contracts finalize. |
| DOC-04 | `PRE_DEPLOYMENT_CHECKLIST.md` | Complete follow-up tasks (Phase 2 cleanup, dark mode decision, Phase 3 testing plan, doc review) | NS | P3 | Schedule owners and due dates. |
| DOC-05 | `PRE_DEPLOYMENT_CHECKLIST.md` | Execute post-deployment next steps (commit, push, deploy, monitor, plan improvements) | NS | P2 | Link to deployment runbook. |
| DOC-06 | `FDC_INTEGRATION_GUIDE.md` | Pilot FDC ingest (5-10 foods), category mapping, formulation linkage, nutrition calc, optimization workflow | NS | P1 | Depends on Neo4j schema alignment. |
| DOC-07 | `BACKEND_IMPLEMENTATION_SUMMARY.md` | Validate AI workflow steps (backend start, frontend config, AI assistant test, sample data load, formulation creation) | NS | P1 | Use QA scenario to confirm documentation accuracy. |

## Pareto Focus (Top 20% Work → 80% Impact)

1. **CAP-01 Pipeline Enablement (P1 tasks)** – Schema definition, transactional persistence, orchestration data contracts, and orchestrator integration collectively unlock automated graph persistence and reliable agent memory. Complete these before other workstreams.  
2. **CAP-02 Formulation Graph Sync (P1 tasks)** – API/UI audit, backend update and delete endpoints, FormulationEditor save integration, and cost metadata persistence ensure formulation data becomes a first-class graph citizen for downstream analytics and multi-agent reuse.  
3. **CAP-03 Retrieval Performance (P1 task)** – Implement hybrid retrieval and memory/caching optimization to prevent GraphRAG queries from exhausting resources once knowledge ingestion begins.  
4. **Cross-Doc Critical Runs (DOC-01, DOC-06, DOC-07)** – Manual QA checklist, FDC ingest pilot, and AI workflow validation prove the end-to-end data pipeline, feeding both orchestrator memory and formulation flows.

> Once these are in motion, cycle remaining P2/P3 tasks in weekly triage. Track memory footprint and latency metrics as acceptance criteria for each data pipeline milestone.

---

_Last updated: 2025-11-09_
