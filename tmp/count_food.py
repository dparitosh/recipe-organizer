from neo4j import GraphDatabase

URI = "neo4j+s://2cccd05b.databases.neo4j.io"
USER = "neo4j"
PASSWORD = "tcs12345"

QUERY = """
MATCH (f:Food)
RETURN count(f) AS count
"""

with GraphDatabase.driver(URI, auth=(USER, PASSWORD)) as driver:
    with driver.session(database="neo4j") as session:
        count = session.run(QUERY).single()["count"]

print("Food nodes:", count)
