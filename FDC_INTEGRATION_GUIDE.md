# USDA FoodData Central (FDC) Integration Guide

## Overview
The Formulation Graph Studio now includes full integration with the USDA FoodData Central (FDC) API, allowing you to search, import, and utilize real nutritional data from the USDA's comprehensive food database in your Neo4j graph.

## API Configuration

### API Key
The application is pre-configured with your FDC API key:
```
axHdO7CFrKh2wBPBSHKRaASp9m8lanCIaDY5W9ya
```

### API Reference
- **Base URL**: `https://api.nal.usda.gov/fdc/v1`
- **Documentation**: https://fdc.nal.usda.gov/api-guide
- **Rate Limits**: 1000 requests/hour

## Features

### 1. FDC Data Ingestion Panel

The new **FDC Ingestion** tab provides two methods for importing food data:

#### Search & Select Mode
- **Purpose**: Manually search and select specific foods to ingest
- **How to Use**:
  1. Navigate to the "FDC Ingestion" tab
  2. Enter a search term (e.g., "apple", "chicken breast", "milk")
  3. Click "Search" to retrieve results from USDA FDC
  4. Review the search results with their FDC IDs, data types, and categories
  5. Click on foods to select them (or use "Select All")
  6. Click "Ingest Selected Foods" to import them into Neo4j

#### Quick Ingest Mode
- **Purpose**: Rapidly import common food categories
- **Pre-configured Categories**:
  - **Fruits**: Imports 20 apple varieties
  - **Vegetables**: Imports 20 common vegetables (broccoli, etc.)
  - **Proteins**: Imports 15 meat and poultry items
  - **Dairy**: Imports 15 milk and dairy products
  - **Grains**: Imports 20 bread and cereal items
  - **Fats & Oils**: Imports 10 cooking oils and fats

### 2. Automatic Neo4j Caching

When foods are ingested, they are automatically stored in your Neo4j database with:
- **Food Node**: Contains FDC data (description, category, serving size, etc.)
- **Nutrient Nodes**: Individual nutrients with standard properties
- **Relationships**: `CONTAINS_NUTRIENT` relationships linking foods to their nutritional content
- **Category Links**: `BELONGS_TO_CATEGORY` relationships for food classification

### 3. Data Structure in Neo4j

#### Food Node Schema
```cypher
(:Food {
  fdcId: Integer (UNIQUE),
  description: String,
  dataType: String,
  foodCategory: String,
  brandOwner: String?,
  brandName: String?,
  gtinUpc: String?,
  ingredients: String?,
  servingSize: Float?,
  servingSizeUnit: String?,
  updatedAt: DateTime
})
```

#### Nutrient Node Schema
```cypher
(:Nutrient {
  nutrientId: Integer (UNIQUE),
  nutrientName: String,
  nutrientNumber: String,
  unitName: String
})
```

#### Relationships
```cypher
(:Food)-[:CONTAINS_NUTRIENT {
  value: Float,
  unit: String,
  per100g: Float
}]->(:Nutrient)

(:Food)-[:BELONGS_TO_CATEGORY]->(:FoodCategory)
```

## Usage Workflows

### Workflow 1: Building a Formulation with FDC Data

1. **Ingest Base Ingredients**:
   - Go to "FDC Ingestion" tab
   - Search for your base ingredients (e.g., "flour", "sugar", "eggs")
   - Select and ingest them into Neo4j

2. **View in Relationships Tab**:
   - Switch to "Relationships" tab
   - Click "Load from Neo4j" to visualize the ingested foods
   - Explore the nutrient connections

3. **Link to Formulations**:
   - The foods are now available in your graph database
   - Use the API Testing tab to query for foods by category
   - Link formulations to FDC foods using the provided Cypher queries

### Workflow 2: Nutritional Analysis

1. **Ingest Foods**: Import foods related to your formulation
2. **Query Nutrients**: Use the Relationships tab to explore nutritional profiles
3. **Calculate Totals**: Aggregate nutrients across ingredients using Cypher queries
4. **Optimize**: Find alternative ingredients with similar nutritional profiles

### Workflow 3: Alternative Ingredient Discovery

1. **Ingest Current Ingredient**: Import your current ingredient from FDC
2. **Ingest Category**: Use Quick Ingest to import similar foods
3. **Find Alternatives**: Use the `findAlternativeFoods()` service method
4. **Compare**: Analyze nutritional similarity and cost differences

## FDC Service API

The `FDCService` class provides programmatic access to all FDC functionality:

### Search Foods
```typescript
import { fdcService } from '@/lib/services/fdc-service'

const results = await fdcService.searchFoods({
  query: 'apple',
  pageSize: 25,
  dataType: ['Foundation', 'SR Legacy']
})
```

### Get Food Details
```typescript
const foodData = await fdcService.getFoodDetails(12345)
```

### Cache in Neo4j
```typescript
await fdcService.cacheFoodInNeo4j(foodData)
```

### Link to Formulation
```typescript
await fdcService.linkFormulationToFDC(formulationId, [
  { fdcId: 12345, quantity: 100, unit: 'g', percentage: 50, function: 'base' },
  { fdcId: 67890, quantity: 100, unit: 'g', percentage: 50, function: 'flavor' }
])
```

### Calculate Formulation Nutrition
```typescript
const nutrition = await fdcService.calculateFormulationNutrition(formulationId)
```

### Find Alternative Foods
```typescript
const alternatives = await fdcService.findAlternativeFoods(12345, 0.8)
```

## Sample Cypher Queries

### Find All Ingested Foods
```cypher
MATCH (f:Food)
RETURN f.fdcId, f.description, f.foodCategory
ORDER BY f.description
LIMIT 25
```

### Get Food with Nutrients
```cypher
MATCH (f:Food {fdcId: $fdcId})-[r:CONTAINS_NUTRIENT]->(n:Nutrient)
RETURN f, r, n
```

### Find High-Protein Foods
```cypher
MATCH (f:Food)-[r:CONTAINS_NUTRIENT]->(n:Nutrient)
WHERE n.nutrientName CONTAINS 'Protein' AND r.value > 20
RETURN f.description, r.value, r.unit
ORDER BY r.value DESC
```

### Compare Two Foods
```cypher
MATCH (f1:Food {fdcId: $fdcId1})-[r1:CONTAINS_NUTRIENT]->(n:Nutrient)
MATCH (f2:Food {fdcId: $fdcId2})-[r2:CONTAINS_NUTRIENT]->(n)
RETURN n.nutrientName, r1.value as food1Value, r2.value as food2Value, n.unitName
ORDER BY n.nutrientName
```

### Find Foods by Category
```cypher
MATCH (f:Food)-[:BELONGS_TO_CATEGORY]->(c:FoodCategory {description: $category})
RETURN f.fdcId, f.description
ORDER BY f.description
```

## Best Practices

### 1. Selective Ingestion
- Don't ingest everything at once
- Focus on foods relevant to your formulations
- Use the search to find specific items

### 2. Category-Based Workflow
- Use Quick Ingest for broad categories
- Then use Search & Select for specific varieties
- This builds a comprehensive but focused database

### 3. Regular Updates
- FDC data is periodically updated by USDA
- Re-ingest key foods quarterly to get latest data
- The system will update existing nodes automatically

### 4. Performance Considerations
- Ingesting 100+ foods may take a few minutes
- The system processes foods sequentially to avoid rate limits
- Use the progress indicator to track ingestion status

### 5. Integration with Formulations
- Ingest ingredients first, then create formulations
- Link formulations to FDC foods for automatic nutrition calculation
- Use the relationships graph to verify connections

## Troubleshooting

### No Search Results
- Check your search term spelling
- Try broader terms (e.g., "apple" vs "fuji apple")
- Verify your Neo4j connection if using cached data

### Ingestion Failures
- Check Neo4j connection status in the System Status panel
- Verify your FDC API key is valid
- Check browser console for detailed error messages
- Ensure you're not hitting rate limits (1000 requests/hour)

### Missing Nutrients
- Some foods may have incomplete nutrient data
- Try searching for similar foods with more complete profiles
- Use "Foundation" or "SR Legacy" data types for most complete data

### Graph Visualization Issues
- After ingesting, click "Load from Neo4j" in Relationships tab
- Large datasets may take time to render
- Use filters to focus on specific food categories

## Data Types

### Foundation Foods
- Reference foods with complete nutrient profiles
- Most reliable data source
- Best for formulation accuracy

### SR Legacy
- Historical Standard Reference database
- Comprehensive nutrient data
- Good for common ingredients

### Branded Foods
- Commercial products with package info
- Includes brand names and UPCs
- Useful for comparing branded ingredients

### Survey (FNDDS)
- Foods from dietary surveys
- As-consumed forms
- Good for end-product comparisons

## Next Steps

1. **Start Small**: Ingest 5-10 foods to test the workflow
2. **Build Categories**: Use Quick Ingest for your main ingredient categories
3. **Create Formulations**: Link your formulations to FDC foods
4. **Calculate Nutrition**: Use the service methods to aggregate nutrients
5. **Optimize**: Find alternatives and optimize your formulations

## Support

For issues or questions:
- Check the USDA FDC documentation: https://fdc.nal.usda.gov/api-guide
- Review the Neo4j Architecture document: `NEO4J_ARCHITECTURE.md`
- Examine the USDA FDC Schema document: `USDA_FDC_SCHEMA.md`
- Test queries in the API Testing tab
