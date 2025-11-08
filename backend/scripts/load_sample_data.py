"""Utility script to load sample formulation data into Neo4j."""

from pathlib import Path
import sys


REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from app.api.endpoints.sample_data import (  # type: ignore  # noqa: E402
    load_potato_chips_data,
    load_cola_data,
    load_juices_data,
)
from app.core.config import settings  # type: ignore  # noqa: E402
from app.db.neo4j_client import Neo4jClient  # type: ignore  # noqa: E402


def main() -> None:
    client = Neo4jClient(
        uri=settings.NEO4J_URI,
        user=settings.NEO4J_USER,
        password=settings.NEO4J_PASSWORD,
        database=settings.NEO4J_DATABASE,
    )
    client.connect()
    try:
        client.execute_query("MATCH (n) DETACH DELETE n")
        load_potato_chips_data(client)
        load_cola_data(client)
        load_juices_data(client)
    finally:
        client.close()


if __name__ == "__main__":
    main()
