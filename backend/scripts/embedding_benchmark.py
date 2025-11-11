"""Benchmark candidate embedding models for GraphRAG chunk retrieval.

The script embeds a small evaluation dataset using each provided model, measures
latency, verifies vector dimensionality, and computes top-1 retrieval accuracy.
Results can be emitted as JSON for persistence or analysis.
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Sequence

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import settings
from app.services.embedding_service import EmbeddingClientError, OllamaEmbeddingClient

# Lightweight evaluation corpus with labelled relevant chunks.
BENCHMARK_DATA = [
    {
        "query": "How do we save formulation updates into Neo4j?",
        "chunks": [
            {
                "id": "formulation-persistence",
                "text": (
                    "The FormulationPipelineService wraps Neo4j transactions to persist"
                    " formulation nodes, ingredient relationships, and cost metadata"
                    " via the /api/formulations endpoints."
                ),
                "relevant": True,
            },
            {
                "id": "fdc-ingest",
                "text": "FDC quick ingest pulls top search results and writes FoodItem nodes with nutrient facts.",
                "relevant": False,
            },
            {
                "id": "graphviz-ui",
                "text": "The React Cytoscape view renders graph highlights using shadcn/ui components.",
                "relevant": False,
            },
        ],
    },
    {
        "query": "What chunking strategy do we use for markdown playbooks?",
        "chunks": [
            {
                "id": "markdown-chunking",
                "text": (
                    "Markdown sources use sliding window chunking at roughly 450 tokens with"
                    " a 50 token overlap while preserving heading breadcrumbs."
                ),
                "relevant": True,
            },
            {
                "id": "process-steps",
                "text": "Process steps include duration, temperature, equipment, and yield metadata per node.",
                "relevant": False,
            },
            {
                "id": "ai-endpoint",
                "text": "The /api/ai/query endpoint returns GraphRAG context, highlights, and AI responses.",
                "relevant": False,
            },
        ],
    },
    {
        "query": "Which relationships are created for knowledge chunks?",
        "chunks": [
            {
                "id": "chunk-relationships",
                "text": (
                    "Knowledge chunks create DESCRIBES edges to domain nodes and CITES edges"
                    " between chunks referencing the same document."
                ),
                "relevant": True,
            },
            {
                "id": "memory-guardrails",
                "text": "CAP-04 will define memory budgets and caching constraints for orchestration runs.",
                "relevant": False,
            },
            {
                "id": "ollama-config",
                "text": "Set OLLAMA_MODEL and OLLAMA_BASE_URL in the backend .env file before starting the API server.",
                "relevant": False,
            },
        ],
    },
]


@dataclass
class BenchmarkResult:
    model: str
    vector_dimensions: int
    avg_chunk_latency_ms: float
    avg_query_latency_ms: float
    top1_accuracy: float
    detail: Dict[str, float]


def cosine_similarity(vector_a: Sequence[float], vector_b: Sequence[float]) -> float:
    dot = sum(a * b for a, b in zip(vector_a, vector_b))
    norm_a = math.sqrt(sum(a * a for a in vector_a))
    norm_b = math.sqrt(sum(b * b for b in vector_b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def benchmark_model(model: str) -> BenchmarkResult:
    client = OllamaEmbeddingClient(
        base_url=settings.OLLAMA_BASE_URL,
        model=model,
        timeout=settings.OLLAMA_TIMEOUT,
    )

    chunk_vectors: Dict[str, List[float]] = {}
    chunk_latencies: List[float] = []

    # Embed chunks upfront for reuse across queries.
    for entry in BENCHMARK_DATA:
        texts = [chunk["text"] for chunk in entry["chunks"]]
        start = time.perf_counter()
        vectors = client.embed_texts(texts)
        elapsed_ms = (time.perf_counter() - start) * 1000
        chunk_latencies.append(elapsed_ms)
        for chunk, vector in zip(entry["chunks"], vectors):
            chunk_vectors[chunk["id"]] = list(vector)

    vector_dimensions = len(next(iter(chunk_vectors.values()), []))

    correct = 0
    total = 0
    query_latencies: List[float] = []

    for entry in BENCHMARK_DATA:
        query_text = entry["query"]
        start = time.perf_counter()
        query_vector = client.embed_texts([query_text])[0]
        elapsed_ms = (time.perf_counter() - start) * 1000
        query_latencies.append(elapsed_ms)

        best_chunk_id = None
        best_score = -1.0
        for chunk in entry["chunks"]:
            chunk_vector = chunk_vectors[chunk["id"]]
            score = cosine_similarity(query_vector, chunk_vector)
            if score > best_score:
                best_score = score
                best_chunk_id = chunk["id"]

        total += 1
        if best_chunk_id:
            chosen = next(chunk for chunk in entry["chunks"] if chunk["id"] == best_chunk_id)
            if chosen["relevant"]:
                correct += 1

    accuracy = correct / total if total else 0.0

    detail = {
        "avg_chunk_latency_ms": statistics.mean(chunk_latencies) if chunk_latencies else 0.0,
        "max_chunk_latency_ms": max(chunk_latencies) if chunk_latencies else 0.0,
        "avg_query_latency_ms": statistics.mean(query_latencies) if query_latencies else 0.0,
        "max_query_latency_ms": max(query_latencies) if query_latencies else 0.0,
        "evaluation_samples": total,
    }

    return BenchmarkResult(
        model=model,
        vector_dimensions=vector_dimensions,
        avg_chunk_latency_ms=detail["avg_chunk_latency_ms"],
        avg_query_latency_ms=detail["avg_query_latency_ms"],
        top1_accuracy=accuracy,
        detail=detail,
    )


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark embedding models using a sample GraphRAG corpus")
    parser.add_argument(
        "--models",
        nargs="+",
        default=[settings.OLLAMA_EMBED_MODEL or "nomic-embed-text:latest"],
        help="Embedding models to evaluate (defaults to the configured OLLAMA embed model)",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        help="Optional path to write benchmark results as JSON",
    )
    if argv is None:
        return parser.parse_args()
    return parser.parse_args(list(argv))


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv)
    results: List[BenchmarkResult] = []
    for model in args.models:
        try:
            result = benchmark_model(model)
            results.append(result)
        except EmbeddingClientError as exc:
            print(f"✖ Failed to benchmark model '{model}': {exc}")
        except Exception as exc:  # pragma: no cover - defensive guard against unexpected errors
            print(f"✖ Unexpected error benchmarking model '{model}': {exc}")

    if not results:
        print("No benchmark results generated.")
        return 1

    print("Embedding Benchmark Summary")
    print("===========================")
    for result in results:
        print(f"Model: {result.model}")
        print(f"  Vector dims: {result.vector_dimensions}")
        print(f"  Avg chunk embed latency: {result.avg_chunk_latency_ms:.2f} ms")
        print(f"  Avg query embed latency: {result.avg_query_latency_ms:.2f} ms")
        print(f"  Top-1 accuracy: {result.top1_accuracy:.2%}")

    if args.output_json is not None:
        output_path = args.output_json.expanduser().resolve()
        payload = [
            {
                "model": r.model,
                "vector_dimensions": r.vector_dimensions,
                "avg_chunk_latency_ms": r.avg_chunk_latency_ms,
                "avg_query_latency_ms": r.avg_query_latency_ms,
                "top1_accuracy": r.top1_accuracy,
                "detail": r.detail,
            }
            for r in results
        ]
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(f"Results written to {output_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
