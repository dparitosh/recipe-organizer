import json
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
QUERY = """
MATCH (f:Food)
OPTIONAL MATCH (f)-[r:CONTAINS_NUTRIENT]->(n:Nutrient)
WHERE n.nutrientName IN [
  'Energy',
  'Protein',
  'Total lipid (fat)',
  'Carbohydrate, by difference',
  'Fiber, total dietary',
  'Sugars, total including NLEA',
  'Sodium, Na'
]
WITH f, collect({name: n.nutrientName, value: r.value, unit: r.unit}) AS nutrients
RETURN f.fdcId AS fdcId, f.description AS description, f.foodCategory AS category, nutrients
LIMIT 10
"""

def main():
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
    try:
        with driver.session(database=DATABASE) as session:
            records = session.run(QUERY).data()
        print(json.dumps(records, indent=2))
    finally:
        driver.close()

if __name__ == "__main__":
    main()
