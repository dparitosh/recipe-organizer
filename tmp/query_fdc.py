import json
from neo4j import GraphDatabase

URI = "neo4j+s://2cccd05b.databases.neo4j.io"
USER = "neo4j"
PASSWORD = "tcs12345"
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
        with driver.session(database="neo4j") as session:
            records = session.run(QUERY).data()
        print(json.dumps(records, indent=2))
    finally:
        driver.close()

if __name__ == "__main__":
    main()
