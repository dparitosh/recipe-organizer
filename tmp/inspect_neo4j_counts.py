from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import settings
from app.db.neo4j_client import Neo4jClient


def main() -> None:
    settings.warn_for_missing_configuration()
    client = Neo4jClient(
        uri=settings.NEO4J_URI,
        user=settings.NEO4J_USER,
        password=settings.NEO4J_PASSWORD,
        database=settings.NEO4J_DATABASE,
    )
    client.connect()
    try:
        counts = client.execute_query(
            """
            MATCH (f:Food)
            OPTIONAL MATCH (f)-[:CONTAINS_NUTRIENT]->(n:Nutrient)
            WITH count(DISTINCT f) AS foodCount, count(DISTINCT n) AS nutrientCount
            RETURN foodCount AS foods, nutrientCount AS nutrients
            """
        )
        print(counts)
    finally:
        client.close()


if __name__ == "__main__":
    main()
