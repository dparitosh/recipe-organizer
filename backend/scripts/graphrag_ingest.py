"""Utility entry point for ingesting knowledge sources into the GraphRAG store.

The command loads the manifest defined in `config/graphrag_sources.json`, validates
the configuration, and when requested executes manifest-driven chunk generation
for each enabled source. Chunk files can be written to disk for downstream
embedding and persistence steps that follow in later CAP-03 milestones.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import settings  # noqa: E402
from app.db.neo4j_client import Neo4jClient  # noqa: E402
from app.services.graphrag_ingestion import GraphRAGIngestionService  # noqa: E402

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = PROJECT_ROOT / "config" / "graphrag_sources.json"


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="GraphRAG ingestion helper")
    parser.add_argument(
        "--manifest",
        type=Path,
        default=DEFAULT_MANIFEST,
        help="Path to the GraphRAG source manifest (defaults to config/graphrag_sources.json)",
    )
    parser.add_argument(
        "--list-only",
        action="store_true",
        help="Only display enabled sources without performing ingestion",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Directory where chunk artifacts should be written",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Execute ingestion logic without persisting chunk artifacts",
    )
    parser.add_argument(
        "--skip-neo4j",
        action="store_true",
        help="Do not write knowledge chunks to Neo4j",
    )
    return parser.parse_args(list(argv))


def load_manifest(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Manifest not found: {path}")

    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    if "sources" not in data or not isinstance(data["sources"], list):
        raise ValueError("Manifest is missing required 'sources' array")

    return data


def validate_source_entry(entry: Dict[str, Any]) -> List[str]:
    errors: List[str] = []
    required_fields = ["id", "type", "description", "enabled", "ingestion", "chunking"]
    for field in required_fields:
        if field not in entry:
            errors.append(f"missing field '{field}'")

    allowed_types = {"structured", "unstructured", "semi-structured"}
    entry_type = entry.get("type")
    if entry_type not in allowed_types:
        errors.append(f"invalid type '{entry_type}'")

    if not isinstance(entry.get("ingestion"), dict):
        errors.append("'ingestion' must be an object")
    if not isinstance(entry.get("chunking"), dict):
        errors.append("'chunking' must be an object")

    return errors


def summarize_sources(sources: List[Dict[str, Any]]) -> None:
    enabled = [s for s in sources if s.get("enabled")]
    disabled = [s for s in sources if not s.get("enabled")]

    print("GraphRAG Source Summary")
    print("========================")
    print(f"Enabled sources: {len(enabled)}")
    for source in enabled:
        print(f"  - {source.get('id')} ({source.get('type')}) :: {source.get('description')}")

    print(f"Disabled sources: {len(disabled)}")
    for source in disabled:
        print(f"  - {source.get('id')} :: enable when ready")


def run(argv: Iterable[str]) -> int:
    args = parse_args(argv)
    manifest_path = args.manifest.resolve()
    manifest = load_manifest(manifest_path)

    sources = manifest.get("sources", [])
    total_errors = 0
    for source in sources:
        problems = validate_source_entry(source)
        if problems:
            total_errors += len(problems)
            joined = ", ".join(problems)
            print(f"! Source '{source.get('id', '<unknown>')}' has issues: {joined}")

    if total_errors:
        print(f"Manifest validation failed with {total_errors} issues")
        return 1

    summarize_sources(sources)

    if args.list_only:
        return 0

    output_dir = args.output_dir.resolve() if args.output_dir else None

    requires_neo4j = any(
        source.get("enabled") and source.get("ingestion", {}).get("driver") == "neo4j"
        for source in sources
    )

    neo4j_client: Neo4jClient | None = None

    try:
        if requires_neo4j:
            neo4j_client = Neo4jClient(
                uri=settings.NEO4J_URI,
                user=settings.NEO4J_USER,
                password=settings.NEO4J_PASSWORD,
                database=settings.NEO4J_DATABASE,
            )
            neo4j_client.connect()

        service = GraphRAGIngestionService(
            manifest,
            manifest_path,
            neo4j_client=neo4j_client,
            output_dir=output_dir,
            persist_chunks=output_dir is not None and not args.dry_run,
            write_to_neo4j=not args.skip_neo4j,
        )
        results = service.ingest(dry_run=args.dry_run)
    finally:
        if neo4j_client is not None:
            neo4j_client.close()

    if not results:
        print("No enabled sources to ingest.")
        return 0

    print("\nIngestion Summary")
    print("-----------------")
    for result in results:
        print(f"{result.source_id}: {result.chunk_count} chunks from {result.record_count} records")
        for warning in result.warnings:
            print(f"  ! {warning}")
        if result.output_path:
            print(f"  -> wrote artifacts to {result.output_path}")
        if result.neo4j_summary:
            print(
                "  -> Neo4j write summary: "
                f"nodes+={result.neo4j_summary.get('nodes_created', 0)}, "
                f"rels+={result.neo4j_summary.get('relationships_created', 0)}, "
                f"props+={result.neo4j_summary.get('properties_set', 0)}"
            )

    if args.dry_run:
        print("\nDry run complete - no chunk artifacts were written.")
    elif output_dir is None and not args.skip_neo4j:
        print("\nChunks generated in-memory. Provide --output-dir to persist artifacts.")
    elif output_dir is None and args.skip_neo4j:
        print("\nChunks generated in-memory and not written elsewhere.")

    return 0


def main() -> None:
    sys.exit(run(sys.argv[1:]))


if __name__ == "__main__":
    main()
