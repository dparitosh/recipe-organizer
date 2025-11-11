# Embedding Model & Storage Evaluation

_Date: 2025-11-11_

## Scope

CAP-03 requires a baseline embedding model and storage approach for GraphRAG retrieval. This evaluation compares available Ollama-hosted options against project requirements (latency, dimensionality, quality) and confirms the storage target for similarity search.

## Candidates

| Model | Availability | Dimensionality | Notes |
|-------|--------------|----------------|-------|
| `nomic-embed-text:latest` | Local Ollama | 768 | Purpose-built embedding model bundled with Ollama. Already pulled for earlier CAP-03 work. |
| `llama3:latest` | Local Ollama | Not suitable | Text-generation focused; Ollama embed endpoint does not expose embedding vectors. |
| Managed embeddings (Azure OpenAI, OpenAI text-embedding-3-small) | External | 1,536+ | Requires external connectivity and billing; deferred until we revisit hosted options. |

Because only `nomic-embed-text:latest` is currently available in the development environment, the benchmark focuses on that model while documenting blockers for alternates.

## Methodology

A lightweight benchmark harness (`backend/scripts/embedding_benchmark.py`) embeds three representative GraphRAG queries and their candidate chunks. For each model, the script records:

- Vector dimensionality returned by the Ollama `/api/embed` endpoint.
- Average latency for chunk embedding batches and individual query embeddings.
- Top-1 retrieval accuracy using cosine similarity against labelled relevant chunks.

Command executed:

```powershell
cd backend
..\..\.venv\Scripts\python.exe scripts\embedding_benchmark.py \
  --models nomic-embed-text:latest \
  --output-json ..\reports\embedding-benchmark.json
```

Raw results are stored at `reports/embedding-benchmark.json` for reproducibility.

## Results

| Metric | Value |
|--------|-------|
| Vector dimensions | 768 |
| Avg chunk embedding latency | 2,209 ms |
| Avg query embedding latency | 2,096 ms |
| Max query embedding latency | 2,103 ms |
| Evaluation samples | 3 |
| Top-1 accuracy | 100% |

### Observations

- The model returns fixed-width 768-d vectors compatible with the existing Neo4j vector index (`knowledge_chunks`).
- Average latency sits around 2.1 s for single-call batches; batching 3 chunks at a time keeps total runtime manageable for ingestion workloads.
- Accuracy on the reference micro-dataset is perfect; while small, it validates that semantic queries land on the expected chunk type.
- `llama3:latest` does not supply embeddings via Ollama, so it remains reserved for generation tasks only.

## Storage Decision

Neo4j vector indexes remain the preferred storage layer for embeddings:

- Existing ingestion pipeline already writes chunk vectors into Neo4j using the `knowledge_chunks` index.
- Hybrid retrieval combines vector search with graph traversal, keeping compute co-located in the database.
- No additional infrastructure (Redis/FAISS service) is required, simplifying deployment.

GDS in-memory similarity was considered but deferred because the current dataset fits the native vector index, and we avoid managing graph projections across restarts.

## Recommendations & Next Steps

1. **Adopt `nomic-embed-text:latest` as the default embedding model** in all environments. Ensure `OLLAMA_EMBED_MODEL=nomic-embed-text:latest` is set in `.env` for production parity.
2. **Continue storing embeddings in the Neo4j `knowledge_chunks` vector index.** Monitor ingest sizes; revisit GDS projections if index growth impacts latency.
3. **Add managed model evaluation** once external API access is approved. Extend the benchmark script to call Azure/OpenAI endpoints for a broader comparison.
4. **Integrate benchmark into CI smoke tests** (optional): run the script in `--models` mode for sanity checks when Ollama is available on the runner.

With this evaluation complete, CAP-03 task “Select embedding model & storage approach” is ready for review.
