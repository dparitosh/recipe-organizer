import os
from neo4j import GraphDatabase

URI = os.environ.get("NEO4J_URI", "")
USER = os.environ.get("NEO4J_USER", "")
PASSWORD = os.environ.get("NEO4J_PASSWORD", "")
DATABASE = os.environ.get("NEO4J_DATABASE", "neo4j")

if not (URI and USER and PASSWORD):
    raise RuntimeError(
        "Set NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD environment variables before running this script."
    )

fdc_id = 2709215

QUERY = """
MATCH (f:Food {fdcId: $fdc_id})-[r:CONTAINS_NUTRIENT]->(n:Nutrient)
RETURN f.description AS description, n.nutrientName AS nutrient, r.value AS value, r.unit AS unit
ORDER BY nutrient
LIMIT 20
"""

with GraphDatabase.driver(URI, auth=(USER, PASSWORD)) as driver:
    with driver.session(database=DATABASE) as session:
        rows = session.run(QUERY, fdc_id=fdc_id).data()

for row in rows:
    print(row)
