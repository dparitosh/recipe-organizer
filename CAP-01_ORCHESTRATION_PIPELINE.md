# CAP-01 Orchestration Data Pipeline Design

## 1. Purpose

Establish a durable data pipeline that captures multi-agent orchestration output, persists it to Neo4j with transactional guarantees, and operates within defined memory and latency budgets.

## 2. Objectives

- Provide a shared contract for all agent inputs and outputs so downstream services retain context across runs.
- Map orchestration artifacts to a Neo4j schema that supports historical replay, analytics, and retrieval for GraphRAG.
- Define transactional, batching, and retention strategies that minimize resource usage while maintaining integrity.
- Capture performance guardrails (memory, processing time) and observability expectations.

## 3. Orchestration Data Contract

| Artifact | Source Agent | Required Fields | Notes |
|----------|--------------|-----------------|-------|
| `recipe` | RecipeEngineer | `id`, `name`, `ingredients[]`, `totalPercentage`, `metadata` | Ingredients must include `id`, `name`, `percentage`, optional `function`, `category`. |
| `calculation` | ScalingCalculator | `recipeId`, `targetBatchSize`, `targetUnit`, `scaledIngredients[]`, `costs`, `yield`, `timestamp` | Each scaled ingredient includes `scaledQuantity`, `scaledUnit`, optional density/cost. |
| `graph` | GraphBuilder | `nodes[]`, `edges[]`, `cypherCommands[]`, `metadata` | Nodes require `id`, `label`, `type`, `properties`. Edges require `id`, `source`, `target`, `type`, `properties`. |
| `validation` | QAValidator | `valid`, `errors[]`, `warnings[]`, `checks`, `summary`, `timestamp`, `canProceed`, `criticalErrors[]` | Errors/warnings require `agent`, `field`, `message`, `severity`. |
| `uiConfig` | UIDesigner | `layout`, `components[]`, `theme` | UI components include `type`, `title`, `data`, `position`, `config`. |
| `agentHistory` | Orchestrator | `agent`, `timestamp`, `duration`, `status`, `error?`, `outputRef` | Store output references instead of full payload to avoid duplication. |
| `metadata` | Orchestrator | `id`, `status`, `totalDuration`, `timestamp`, `configSnapshot` | `configSnapshot` captures request context, batch size, flags, truncated to avoid oversized payloads. |

> JSON schema definitions will be published alongside implementation (see TODOs in CAP-01 tasks).

## 4. Neo4j Schema Mapping

### 4.1 Node Labels

- `OrchestrationRun` – primary node keyed by `runId`.
- `RecipeVersion` – snapshot of recipe used for the run.
- `CalculationResult` – scaling + cost output.
- `GraphSnapshot` – stores structural metadata, references large artifacts via file/blob if needed.
- `ValidationReport` – QA summary including errors/warnings.
- `UIConfig` – assembled UI layout.
- `AgentInvocation` – per-agent execution metadata.
- `UserRequest` – original request context (enables replay/search).

### 4.2 Relationships

- `(UserRequest)-[:TRIGGERED]->(OrchestrationRun)`
- `(OrchestrationRun)-[:USED_RECIPE]->(RecipeVersion)`
- `(OrchestrationRun)-[:PRODUCED_CALCULATION]->(CalculationResult)`
- `(OrchestrationRun)-[:PRODUCED_GRAPH]->(GraphSnapshot)`
- `(OrchestrationRun)-[:PRODUCED_VALIDATION]->(ValidationReport)`
- `(OrchestrationRun)-[:PRODUCED_UI]->(UIConfig)`
- `(OrchestrationRun)-[:HAS_AGENT_INVOCATION]->(AgentInvocation)` (one per agent, ordered by `sequence`)
- `(RecipeVersion)-[:HAS_INGREDIENT]->(:Ingredient)` reused from existing formulation graph.

### 4.3 Indexes and Constraints

- `CREATE CONSTRAINT orchestration_run_id IF NOT EXISTS ON (o:OrchestrationRun) ASSERT o.runId IS UNIQUE;`
- `CREATE INDEX agent_invocation_run_seq IF NOT EXISTS FOR (a:AgentInvocation) ON (a.runId, a.sequence);`
- `CREATE INDEX graph_snapshot_hash IF NOT EXISTS FOR (g:GraphSnapshot) ON (g.checksum);`
- Reuse existing ingredient/product indexes for fast lookups.

## 5. Persistence Pipeline

1. **Collect Outputs** – Orchestrator accumulates validated artifacts per agent run.
2. **Normalize Payloads** – Mapper service trims computed payloads (remove transient fields, compute hashes/checksums for dedupe).
3. **Begin Transaction** – Use Neo4j driver `session.executeWrite` (Python) with retry policy (max 3 attempts, exponential backoff).
4. **Upsert Nodes** – Merge `OrchestrationRun`, `UserRequest`, `RecipeVersion`, etc. Use `ON CREATE SET` for timestamps, `ON MATCH` for counters.
5. **Create Relationships** – Link nodes within the same transaction; enforce `sequence` on `AgentInvocation` edges.
6. **Persist Large Artifacts** – If `graph.cypherCommands` > 32 KB, store in external blob storage and set `GraphSnapshot.blobUri`.
7. **Commit** – On success, return `runId` + summary; on failure, log and surface to orchestrator.

## 6. Data Pipeline Contracts

- **Input Contract** – JSON request with `userRequest`, `targetBatchSize`, `targetUnit`, `context.costMap`, `context.densityMap`. Versioned via `config.version` (default `v1`).
- **Agent Hand-off Contract** – Standard object with `payload`, `metadata` (`agent`, `runId`, `sequence`, `checksum`), `resources` (memory, cpu estimate), `expiresAt`.
- **Persistence Contract** – Mapper interface `mapRunToGraph(runResult) -> GraphWriteSet` describing node merges and relationships.
- **Retention Policy** – Keep full runs for 30 days, condensed metadata beyond that (`RecipeVersion`, `CalculationResult` kept if referenced by active formulations).

## 7. Memory and Processing Budgets

| Stage | Target Duration | Max Memory | Notes |
|-------|-----------------|------------|-------|
| Recipe Engineer | ≤ 800 ms | ≤ 150 MB | Input capped at 20 ingredients. |
| Scaling Calculator | ≤ 500 ms | ≤ 120 MB | Reuse cached density/cost maps. |
| Graph Builder | ≤ 1.2 s | ≤ 200 MB | Stream node creation; avoid large arrays in memory. |
| QA Validator | ≤ 400 ms | ≤ 80 MB | Returns summaries only. |
| UI Designer | ≤ 300 ms | ≤ 60 MB | No large assets in payload. |
| Persistence Transaction | ≤ 450 ms | ≤ 70 MB | Batch writes; no more than 500 nodes/edges per run. |

- **Global Run Budget**: < 4 seconds end-to-end in steady state, < 600 MB peak memory.
- **Backpressure**: If memory exceeds 80% of budget, orchestrator queues requests (max concurrent runs: 3).

## 8. Observability

- Emit structured logs per agent (`agent`, `runId`, `duration`, `memoryUsage`, `status`).
- Push metrics to Prometheus (or existing monitor) for `orchestration_duration_ms`, `neo4j_write_latency_ms`, `run_memory_mb`.
- Configure alerts when `neo4j_write_latency_ms` p95 > 750 ms or failure rate > 2% over 10 min.

## 9. Implementation Plan (Mapping to Tracker)

1. **Schema Definition (CAP-01, P1)** – Finalize node/relationship model and publish JSON schema files.
2. **Pipeline Contract (CAP-01, P1)** – Implement mapper utilities enforcing the contracts above.
3. **Transactional Writer (CAP-01, P1)** – Create persistence service with retries, chunking, and optional blob storage integration. _Base Neo4j writer + `/api/orchestration/runs` endpoint implemented 2025-11-09; add retry/backoff + blob handoff next._
4. **Orchestrator Integration (CAP-01, P1)** – Invoke persistence service post-run; record `runId` in UI events.
5. **Testing (CAP-01, P2)** – Unit tests for mapper/driver code; integration test running orchestrator and verifying Neo4j state.
6. **Performance Validation** – Load-test with synthetic runs (min 100) to verify budgets and adjust thresholds.

## 10. Open Questions

- Do we need to retain raw agent prompts/responses? (Impacts privacy and storage.)
- Should graph snapshots be compressed JSON or stored as separate nodes per ingredient? (Evaluate once volume observed.)
- Determine blob storage solution if `cypherCommands` exceed Neo4j property limits (S3, Azure Blob, etc.).

---
_Last updated: 2025-11-09_
