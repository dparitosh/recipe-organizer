# USDA Food Data Central (FDC) Schema Integration

## Overview
This document defines the Neo4j graph schema aligned with USDA FDC (Food Data Central) API structure for the Formulation Graph Studio.

Reference: https://fdc.nal.usda.gov/

## USDA FDC Data Model

### Core Entities

#### Food
- **fdcId**: Unique identifier in FDC database
- **description**: Food name/description
- **dataType**: Data source type (Foundation, SR Legacy, Branded, Survey)
- **foodCategory**: Category classification
- **brandOwner**: Brand owner (for branded foods)
- **brandName**: Brand name
- **subbrandName**: Sub-brand name
- **gtinUpc**: GTIN/UPC code
- **ingredients**: Ingredient list (comma-separated)
- **servingSize**: Standard serving size
- **servingSizeUnit**: Unit for serving size
- **householdServingFullText**: Household serving description
- **publicationDate**: Publication date

#### FoodNutrient
- **nutrientId**: Unique nutrient identifier
- **nutrientName**: Nutrient name (e.g., "Protein", "Energy")
- **nutrientNumber**: USDA nutrient number
- **unitName**: Unit of measurement (g, mg, kcal, etc.)
- **value**: Nutrient amount
- **derivationCode**: How value was derived
- **derivationDescription**: Derivation method description

#### FoodCategory
- **id**: Category identifier
- **code**: Category code
- **description**: Category description

#### Nutrient
- **id**: Nutrient identifier
- **number**: USDA nutrient number
- **name**: Nutrient name
- **rank**: Display order rank
- **unitName**: Standard unit

## Neo4j Graph Schema

### Node Labels

#### `:Food`
Properties from USDA FDC Food entity:
```cypher
{
  fdcId: Integer (UNIQUE),
  description: String (INDEXED),
  dataType: String,
  foodCategory: String,
  brandOwner: String?,
  brandName: String?,
  gtinUpc: String?,
  ingredients: String?,
  servingSize: Float?,
  servingSizeUnit: String?,
  publicationDate: Date,
  
  // Custom properties for formulation
  materialId: String?,
  supplier: String?,
  cost: Float?,
  allergens: [String]
}
```

#### `:Nutrient`
Properties from USDA FDC Nutrient entity:
```cypher
{
  nutrientId: Integer (UNIQUE),
  nutrientNumber: String (UNIQUE),
  nutrientName: String (INDEXED),
  rank: Integer,
  unitName: String
}
```

#### `:FoodCategory`
Properties from USDA FDC FoodCategory entity:
```cypher
{
  categoryId: String (UNIQUE),
  categoryCode: String?,
  description: String (INDEXED)
}
```

#### `:Formulation`
Custom entity for recipe/formulation management:
```cypher
{
  id: String (UNIQUE),
  name: String (INDEXED),
  version: String,
  type: String, // 'concentrate', 'final_product', 'intermediate'
  status: String, // 'draft', 'review', 'approved', 'archived'
  targetYield: Float,
  yieldUnit: String,
  costPerUnit: Float,
  owner: String,
  department: String,
  createdAt: DateTime,
  updatedAt: DateTime,
  tags: [String],
  allergens: [String],
  claims: [String]
}
```

#### `:Recipe`
General recipe node:
```cypher
{
  id: String (UNIQUE),
  name: String (INDEXED),
  yield: String,
  prepTime: String?,
  cookTime: String?,
  description: String?
}
```

#### `:MasterRecipe`
Master recipe template:
```cypher
{
  id: String (UNIQUE),
  name: String (INDEXED),
  version: String,
  status: String,
  createdBy: String,
  approvedBy: String?,
  approvedDate: DateTime?,
  created: DateTime
}
```

#### `:ManufacturingRecipe`
Manufacturing-specific recipe:
```cypher
{
  id: String (UNIQUE),
  name: String (INDEXED),
  batchSize: String,
  efficiency: String?,
  equipmentRequired: [String],
  processSteps: Integer
}
```

#### `:Plant`
Manufacturing plant:
```cypher
{
  id: String (UNIQUE),
  name: String (INDEXED),
  region: String,
  capacity: String,
  location: String,
  certifications: [String]
}
```

#### `:SalesOrder`
Sales order entity:
```cypher
{
  id: String (UNIQUE),
  name: String,
  quantity: String,
  customer: String,
  dueDate: Date,
  priority: String,
  status: String?
}
```

### Relationship Types

#### Food Relationships

**`:BELONGS_TO_CATEGORY`**
- Direction: `(Food)-[:BELONGS_TO_CATEGORY]->(FoodCategory)`
- Properties: None

**`:CONTAINS_NUTRIENT`**
- Direction: `(Food)-[:CONTAINS_NUTRIENT]->(Nutrient)`
- Properties:
  ```cypher
  {
    value: Float,
    unit: String,
    per100g: Float,
    derivationCode: String?
  }
  ```

**`:ALTERNATIVE_TO`**
- Direction: `(Food)-[:ALTERNATIVE_TO]-(Food)`
- Properties:
  ```cypher
  {
    similarityScore: Float,
    reason: String?
  }
  ```

#### Formulation Relationships

**`:USES_INGREDIENT`**
- Direction: `(Formulation)-[:USES_INGREDIENT]->(Food)`
- Properties:
  ```cypher
  {
    quantity: Float,
    unit: String,
    percentage: Float,
    function: String, // 'base', 'flavor', 'preservative', etc.
    order: Integer?
  }
  ```

**`:PROVIDES_NUTRIENT`**
- Direction: `(Formulation)-[:PROVIDES_NUTRIENT]->(Nutrient)`
- Properties:
  ```cypher
  {
    totalAmount: Float,
    unit: String,
    per100g: Float,
    percentDV: Float?
  }
  ```

**`:DERIVED_FROM`**
- Direction: `(Recipe|ManufacturingRecipe)-[:DERIVED_FROM]->(MasterRecipe|Recipe)`
- Properties:
  ```cypher
  {
    derivedDate: DateTime,
    modifications: String?
  }
  ```

**`:USES`**
- Direction: `(Recipe|ManufacturingRecipe)-[:USES]->(Food)`
- Properties:
  ```cypher
  {
    amount: String,
    scaled: Boolean?
  }
  ```

**`:PRODUCES`**
- Direction: `(Plant)-[:PRODUCES]->(ManufacturingRecipe)`
- Properties:
  ```cypher
  {
    line: String?,
    capacity: String?
  }
  ```

**`:REQUIRES`**
- Direction: `(SalesOrder)-[:REQUIRES]->(ManufacturingRecipe)`
- Properties:
  ```cypher
  {
    quantity: Float,
    deliveryDate: Date?
  }
  ```

## Indexes and Constraints

```cypher
// Unique constraints
CREATE CONSTRAINT food_fdc_id IF NOT EXISTS
FOR (f:Food) REQUIRE f.fdcId IS UNIQUE;

CREATE CONSTRAINT nutrient_id IF NOT EXISTS
FOR (n:Nutrient) REQUIRE n.nutrientId IS UNIQUE;

CREATE CONSTRAINT nutrient_number IF NOT EXISTS
FOR (n:Nutrient) REQUIRE n.nutrientNumber IS UNIQUE;

CREATE CONSTRAINT category_id IF NOT EXISTS
FOR (c:FoodCategory) REQUIRE c.categoryId IS UNIQUE;

CREATE CONSTRAINT formulation_id IF NOT EXISTS
FOR (f:Formulation) REQUIRE f.id IS UNIQUE;

CREATE CONSTRAINT recipe_id IF NOT EXISTS
FOR (r:Recipe) REQUIRE r.id IS UNIQUE;

CREATE CONSTRAINT master_recipe_id IF NOT EXISTS
FOR (mr:MasterRecipe) REQUIRE mr.id IS UNIQUE;

CREATE CONSTRAINT mfg_recipe_id IF NOT EXISTS
FOR (mr:ManufacturingRecipe) REQUIRE mr.id IS UNIQUE;

CREATE CONSTRAINT plant_id IF NOT EXISTS
FOR (p:Plant) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT sales_order_id IF NOT EXISTS
FOR (so:SalesOrder) REQUIRE so.id IS UNIQUE;

// Search indexes
CREATE INDEX food_description IF NOT EXISTS
FOR (f:Food) ON (f.description);

CREATE INDEX nutrient_name IF NOT EXISTS
FOR (n:Nutrient) ON (n.nutrientName);

CREATE INDEX food_category_desc IF NOT EXISTS
FOR (c:FoodCategory) ON (c.description);

CREATE INDEX formulation_name IF NOT EXISTS
FOR (f:Formulation) ON (f.name);

CREATE INDEX recipe_name IF NOT EXISTS
FOR (r:Recipe) ON (r.name);
```

## Sample Cypher Queries

### Import Food from USDA FDC
```cypher
// Create Food node with FDC data
MERGE (f:Food {fdcId: $fdcId})
SET f.description = $description,
    f.dataType = $dataType,
    f.foodCategory = $foodCategory,
    f.brandOwner = $brandOwner,
    f.ingredients = $ingredients,
    f.servingSize = $servingSize,
    f.servingSizeUnit = $servingSizeUnit

// Link to category
MERGE (c:FoodCategory {description: $foodCategory})
MERGE (f)-[:BELONGS_TO_CATEGORY]->(c)

// Add nutrients
UNWIND $nutrients as nutrient
MERGE (n:Nutrient {nutrientId: nutrient.nutrientId})
SET n.nutrientName = nutrient.nutrientName,
    n.nutrientNumber = nutrient.nutrientNumber,
    n.unitName = nutrient.unitName
MERGE (f)-[r:CONTAINS_NUTRIENT]->(n)
SET r.value = nutrient.value,
    r.unit = nutrient.unitName
```

### Link Formulation to FDC Foods
```cypher
// Connect formulation ingredients to FDC foods
MATCH (form:Formulation {id: $formulationId})
UNWIND $ingredients as ing
MATCH (food:Food {fdcId: ing.fdcId})
MERGE (form)-[r:USES_INGREDIENT]->(food)
SET r.quantity = ing.quantity,
    r.unit = ing.unit,
    r.percentage = ing.percentage,
    r.function = ing.function
```

### Find Alternative Ingredients
```cypher
// Find alternative foods in same category with similar nutrients
MATCH (food:Food {fdcId: $fdcId})-[:BELONGS_TO_CATEGORY]->(cat:FoodCategory)
MATCH (alt:Food)-[:BELONGS_TO_CATEGORY]->(cat)
WHERE food <> alt
MATCH (food)-[r1:CONTAINS_NUTRIENT]->(n:Nutrient)
MATCH (alt)-[r2:CONTAINS_NUTRIENT]->(n)
WHERE abs(r1.value - r2.value) / r1.value < 0.2
RETURN alt, collect(n.nutrientName) as similarNutrients
```

### Calculate Formulation Nutrition
```cypher
// Aggregate nutrition from all ingredients
MATCH (form:Formulation {id: $formulationId})-[uses:USES_INGREDIENT]->(food:Food)
MATCH (food)-[contains:CONTAINS_NUTRIENT]->(nutrient:Nutrient)
WITH nutrient, 
     sum(contains.value * uses.percentage / 100.0) as totalValue,
     contains.unit as unit
MERGE (form)-[provides:PROVIDES_NUTRIENT]->(nutrient)
SET provides.totalAmount = totalValue,
    provides.unit = unit,
    provides.per100g = totalValue
```

## API Integration Points

### USDA FDC API Endpoints
- Base URL: `https://api.nal.usda.gov/fdc/v1`
- Search: `GET /foods/search?query={query}&api_key={key}`
- Food Details: `GET /food/{fdcId}?api_key={key}`
- Nutrients List: `GET /nutrients?api_key={key}`

### Configuration
- API Key: Configurable (default: DEMO_KEY)
- Rate Limits: 1000 requests/hour
- Cache Strategy: Store food/nutrient data in Neo4j for offline access
