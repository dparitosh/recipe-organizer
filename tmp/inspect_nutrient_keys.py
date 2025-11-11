from neo4j import GraphDatabase

URI = "neo4j+s://2cccd05b.databases.neo4j.io"
USER = "neo4j"
PASSWORD = "tcs12345"

QUERY = """
MATCH (n:Nutrient)
RETURN keys(n) AS keys
LIMIT 5
"""

with GraphDatabase.driver(URI, auth=(USER, PASSWORD)) as driver:
    with driver.session(database="neo4j") as session:
        rows = session.run(QUERY).data()

for row in rows:
    print(row)
