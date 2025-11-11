from neo4j import GraphDatabase

URI = "neo4j+s://2cccd05b.databases.neo4j.io"
USER = "neo4j"
PASSWORD = "tcs12345"

fdc_id = 2709215

QUERY = """
MATCH (f:Food {fdcId: $fdc_id})-[r:CONTAINS_NUTRIENT]->(n:Nutrient)
RETURN f.description AS description, n.nutrientName AS nutrient, r.value AS value, r.unit AS unit
ORDER BY nutrient
LIMIT 20
"""

with GraphDatabase.driver(URI, auth=(USER, PASSWORD)) as driver:
    with driver.session(database="neo4j") as session:
        rows = session.run(QUERY, fdc_id=fdc_id).data()

for row in rows:
    print(row)
