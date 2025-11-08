"""Seed Neo4j with the default graph schema metadata."""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

# Ensure the backend package is discoverable when executed from the repo root
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from app.core.config import settings
from app.db.neo4j_client import Neo4jClient
from app.services.graph_schema_service import GraphSchemaService

logger = logging.getLogger(__name__)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    client = Neo4jClient(
        uri=settings.NEO4J_URI,
        user=settings.NEO4J_USER,
        password=settings.NEO4J_PASSWORD,
        database=settings.NEO4J_DATABASE,
    )

    try:
        logger.info("Connecting to Neo4j at %s", settings.NEO4J_URI)
        client.connect()
    except Exception as exc:  # pragma: no cover - connection diagnostic
        logger.error("Failed to connect to Neo4j: %s", exc)
        return 1

    try:
        service = GraphSchemaService(client, settings.GRAPH_SCHEMA_NAME)
        result = service.install_default_schema()
        logger.info("Graph schema '%s' applied (version=%s)", result.get("name"), result.get("version"))
        print(json.dumps(result, indent=2))
        return 0
    except Exception as exc:  # pragma: no cover - defensive guard
        logger.error("Failed to seed graph schema: %s", exc)
        return 2
    finally:
        client.close()


if __name__ == "__main__":  # pragma: no cover - script entry point
    raise SystemExit(main())
