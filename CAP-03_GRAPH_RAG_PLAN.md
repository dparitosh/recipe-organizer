# CAP-03 GraphRAG Ingestion Plan

## Objectives
- Establish the initial scope of knowledge sources that will power GraphRAG responses.
- Define chunking heuristics for each source type so embeddings and graph nodes remain context rich but compact.
- Capture implementation guardrails to streamline ingestion pipeline development in later CAP-03 tasks.

## Source Inventory
| Source | Type | Owner | Status | Notes |
|--------|------|-------|--------|-------|
| Formulations (Neo4j) | Structured | Product Graph | Available | Use existing `Formulation`, `Ingredient`, `ProcessStep`, and `BOM` nodes with relationship context. |
| USDA FDC Foods | Structured | Data Engineering | Available | Sync via `/api/fdc/foods`; include nutrient summaries and source metadata. |
| Orchestration Playbooks | Unstructured | AI Platform | Draft | Markdown docs (`CAP-01_ORCHESTRATION_PIPELINE.md`, `BACKEND_IMPLEMENTATION_SUMMARY.md`). |
| Lab Notebooks & QA Reports | Unstructured | R&D | Sourcing | Export as PDF/Markdown for ingestion once access granted. |
| Supplier Datasheets | Semi-structured | Procurement | Backlog | Prioritize high-volume ingredients; convert to JSON via manual QA. |

## Chunking Strategy Guidelines
### Structured Data
- **Formulations & Ingredients**: one chunk per formulation node enriched with top-level attributes and concatenated ingredient list (max 25 ingredients). Include relationships (`CONTAINS`, `USES_PROCESS_STEP`).
- **Process Steps**: chunk by process step; include duration, temperature, equipment, and yield metadata.
- **FDC Foods**: group by food item with aggregated nutrient facts; include source brand, category, and nutrient highlights (top 10 by rank).

### Unstructured / Semi-Structured Data
- **Markdown / Rich Text**: sliding window chunking at ~450 tokens with 50-token overlap. Preserve headings as chunk titles and include breadcrumb path (e.g., `CAP-01 > Persistence`).
- **PDF/Scanned Docs**: run OCR + clean-up before chunking; target ~300 tokens with 20-token overlap because of noisier text.
- **Datasheets / Tables**: flatten to key-value bullet lists prior to chunking; limit each chunk to 20 key-value pairs.

### Metadata Requirements
- `source_id`: stable identifier (Neo4j node ID, document slug, or datasheet SKU).
- `source_type`: `formulation`, `process_step`, `fdc_food`, `playbook`, `qa_report`, `datasheet`.
- `version`: ISO timestamp or semantic version when available.
- `ingested_at`: ingestion timestamp (UTC).
- `breadcrumbs`: human-readable path for UI display.
- `relationships`: array describing graph edges to create (target node labels & relationship types).

## Embedding & Graph Considerations
- Embed chunks with 1024-dim model (Ollama `nomic-embed-text` or Azure alternative) once benchmarking completes.
- Store embeddings in Neo4j vector index keyed by `source_id` + chunk ordinal.
- Create relationship types:
  - `DESCRIBES` from knowledge chunk node to existing domain nodes (e.g., `Formulation`, `Ingredient`).
  - `CITES` between chunks referencing the same external document to support provenance chains.
- Track token budgets: maximum chunk length 512 tokens to maintain retrieval latency under 200ms during hybrid search.

## Implementation Next Steps
1. Extend the scaffolded ingestion CLI (`backend/scripts/graphrag_ingest.py`) to chunk, embed, and persist enabled sources. *(Embedding prototype with Ollama nomic-embed-text now wired for local vectors; continue benchmarking before locking storage schema.)*
2. Iterate on the manifest (`config/graphrag_sources.json`) and schema (`schemas/graphrag-sources.schema.json`) as source owners confirm metadata needs.
3. Benchmark candidate embedding models (local Ollama vs managed) with sample chunks to verify cosine recall on known QA pairs.
4. Extend backend Graph API with `GET /api/graph/knowledge` for chunk inspection and provenance filtering.
5. Partner with Data Engineering to secure QA report exports and define redaction workflow.

_Last updated: 2025-11-10_
