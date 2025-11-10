# FDC Graph Schema Overview

This document summarizes the nodes, relationships, and core properties created when ingesting USDA FoodData Central entities into Neo4j via the current backend service.

## Node Types

### Food (`Food`)
- **Key**: `fdcId` (numeric identifier from FoodData Central)
- **Properties**: `description`, `dataType`, `foodCategory`, `brandOwner`, `brandName`, `gtinUpc`, `ingredients`, `servingSize`, `servingSizeUnit`, `publicationDate`, `updatedAt`, `dataSource`
- **Notes**: Serves as the central node for each ingested product. Updated timestamps and descriptive metadata are refreshed on each ingest.

### Nutrient (`Nutrient`)
- **Key**: `nutrientId`
- **Properties**: `nutrientName`, `nutrientNumber`, `unitName`, `rank`
- **Notes**: Nutrients are de-duplicated globally by USDA identifier so multiple foods can reference the same nutrient node.

### Food Category (`FoodCategory`)
- **Key**: `description`
- **Properties**: `categoryId` (slugified description)
- **Notes**: Captures the coarse classification shipped with FDC entries.

## Relationships

### `(:Food)-[:BELONGS_TO_CATEGORY]->(:FoodCategory)`
- Ensures every food connects to its category node.
- Category nodes are shared across foods with matching descriptions.

### `(:Food)-[:CONTAINS_NUTRIENT]->(:Nutrient)`
- **Properties**: `value`, `unit`, `per100g`, `derivationCode`
- Represents the numeric nutrient amount embedded in the FDC record.
- Relationship properties mirror the values returned from the USDA API.

## Indexes & Constraints

The backend ensures the following schema primitives:
- `Food.fdcId` uniqueness constraint
- `Nutrient.nutrientId` uniqueness constraint
- `FoodCategory.description` uniqueness constraint

Run `GET /api/fdc/foods` to verify contents. Use the new `src/lib/services/fdc-service.js#listStoredFoods` helper plus the “Stored Foods” tab in `src/components/FDCDataIngestionPanel.jsx` to browse graph state.
