# REST API Documentation
## BOM and Recipe Management System

**Version:** 1.0.0  
**Base URL:** `/api/v1`  
**Content-Type:** `application/json`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Error Handling](#error-handling)
5. [Entities](#entities)
6. [Endpoints](#endpoints)
   - [Formulation Endpoints](#formulation-endpoints)
   - [Manufacturing Endpoints](#manufacturing-endpoints)
   - [Sales Order Endpoints](#sales-order-endpoints)
   - [Validation Endpoints](#validation-endpoints)
7. [Validation Rules](#validation-rules)
8. [Examples](#examples)

---

## Overview

This API provides comprehensive endpoints for managing Food & Beverage formulations, Bills of Materials (BOMs), master recipes, manufacturing recipes, and sales orders. It includes robust validation for yield percentages, units of measure, and byproduct logic.

### Key Features

- **Formulation Management**: Create, scale, and validate product formulations
- **Manufacturing Recipe Generation**: Derive manufacturing recipes from master recipes
- **Sales Order Integration**: Automatically generate recipes from sales order line items
- **Yield Calculation**: Multi-step yield tracking with loss factor analysis
- **Cost Tracking**: Comprehensive cost calculation with material, labor, and overhead
- **Validation**: Built-in validation for UoM, yield %, and mass balance

---

## Authentication

Currently, the API uses user ID and user name passed in request bodies. In production, implement JWT or OAuth 2.0 authentication.

**Required Fields:**
- `userId`: User identifier
- `userName`: User display name

---

## Response Format

All API responses follow a standard format:

```json
{
  "success": boolean,
  "data": object | null,
  "error": {
    "code": string,
    "message": string,
    "details": string[],
    "field": string
  } | null,
  "metadata": {
    "timestamp": ISO8601 date,
    "executionTime": number (milliseconds),
    "version": string,
    "warnings": string[]
  }
}
```

### Success Response Example

```json
{
  "success": true,
  "data": {
    "id": "formula-123",
    "name": "Orange Juice Concentrate"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "executionTime": 45,
    "version": "1.0.0"
  }
}
```

### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Formulation validation failed",
    "details": [
      "Total percentage must equal 100% (currently 98.50%)",
      "Ingredient \"Sugar\" must have a positive quantity"
    ]
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "executionTime": 12,
    "version": "1.0.0"
  }
}
```

---

## Error Handling

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `INVALID_QUANTITY` | Quantity value is invalid |
| `INVALID_BATCH_SIZE` | Batch size is invalid |
| `MISSING_PLANT` | Required plant field is missing |
| `NO_OPERATIONS` | No operations provided |
| `NO_LINE_ITEMS` | No line items provided |
| `EXECUTION_ERROR` | General execution error |

---

## Entities

### MaterialMaster

Represents a material in the master data system.

**Key Fields:**
- `materialNumber`: Unique material identifier
- `description`: Material description
- `type`: `raw | semi-finished | finished | packaging`
- `cost`: Cost information with history
- `procurement`: Supplier and lead time data
- `regulatory`: Certifications, allergens, restrictions
- `quality`: Testing requirements and shelf life

### FormulationBOM

Extended formulation with BOM details.

**Key Fields:**
- `formulation`: Base formulation data
- `components`: BOM components by phase
- `process`: Process steps with yields
- `totalCost`: Calculated total cost

### MasterRecipe

Production recipe template.

**Key Fields:**
- `recipeNumber`: Unique recipe identifier
- `outputMaterial`: Material produced
- `ingredients`: Recipe ingredients with tolerances
- `processInstructions`: Step-by-step instructions
- `yields`: Yield data with loss factors
- `scaleRange`: Min/max batch sizes

### ManufacturingRecipe

Actual production order.

**Key Fields:**
- `manufacturingOrderNumber`: Order number
- `masterRecipeId`: Source master recipe
- `plant`: Production plant
- `operations`: Manufacturing operations
- `actualYields`: Actual yield data
- `costTracking`: Cost tracking

### SalesOrder

Customer order with recipe derivation.

**Key Fields:**
- `salesOrderNumber`: Order number
- `items`: Order line items
- `derivedRecipes`: Recipes derived from order
- `fulfillmentTracking`: Fulfillment progress

### CalculationLog

Audit log for calculations.

**Key Fields:**
- `calculationType`: Type of calculation performed
- `inputParameters`: Input data
- `outputResults`: Calculation results
- `validationResults`: Validation outcomes
- `executionMetrics`: Performance metrics

---

## Endpoints

### Formulation Endpoints

#### POST /formulation/create

Create a new formulation with validation.

**Request Body:**
```json
{
  "id": "formula-123",
  "name": "Orange Juice Concentrate",
  "version": "1.0",
  "type": "concentrate",
  "status": "draft",
  "ingredients": [
    {
      "id": "ing-1",
      "materialId": "MAT-001",
      "name": "Orange Juice",
      "quantity": 85,
      "unit": "kg",
      "percentage": 85,
      "function": "base"
    },
    {
      "id": "ing-2",
      "materialId": "MAT-002",
      "name": "Sugar",
      "quantity": 15,
      "unit": "kg",
      "percentage": 15,
      "function": "sweetener"
    }
  ],
  "targetYield": 100,
  "yieldUnit": "kg",
  "metadata": {
    "owner": "user-123",
    "department": "R&D",
    "tags": ["beverage", "concentrate"],
    "notes": "Initial formulation"
  }
}
```

**Validation Rules:**
- Formulation name is required
- At least one ingredient required
- Total percentage must equal 100% (±0.1% tolerance)
- All ingredients must have positive quantities
- Percentages must be between 0-100%

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "formula-123",
    "name": "Orange Juice Concentrate",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "executionTime": 45,
    "version": "1.0.0"
  }
}
```

---

#### POST /formulation/scale

Scale a formulation to a target quantity.

**Request Body:**
```json
{
  "formulationId": "formula-123",
  "targetQuantity": 5000,
  "targetUnit": "kg",
  "userId": "user-123",
  "userName": "John Doe"
}
```

**Validation Rules:**
- Target quantity must be positive
- Valid unit of measure required
- Formulation must exist

**Success Response:**
```json
{
  "success": true,
  "data": {
    "scaledFormulation": {
      "id": "formula-123-scaled",
      "ingredients": [
        {
          "id": "ing-1",
          "name": "Orange Juice",
          "quantity": 4250,
          "unit": "kg",
          "percentage": 85
        },
        {
          "id": "ing-2",
          "name": "Sugar",
          "quantity": 750,
          "unit": "kg",
          "percentage": 15
        }
      ]
    },
    "calculationLog": {
      "id": "calc-456",
      "calculationType": "scale",
      "status": "success",
      "executionMetrics": {
        "durationMs": 23
      }
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:35:00Z",
    "executionTime": 23,
    "version": "1.0.0"
  }
}
```

---

#### POST /formulation/validate-yield

Validate formulation yield percentage.

**Request Body:**
```json
{
  "formulation": {
    "id": "formula-123",
    "ingredients": [...],
    "targetYield": 100,
    "yieldUnit": "kg"
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "yieldPercentage": 100,
    "warnings": []
  },
  "metadata": {
    "timestamp": "2024-01-15T10:40:00Z",
    "executionTime": 8,
    "version": "1.0.0"
  }
}
```

---

### Manufacturing Endpoints

#### POST /manufacturing/generate

Generate a manufacturing recipe from a master recipe.

**Request Body:**
```json
{
  "masterRecipeId": "recipe-123",
  "batchSize": 1000,
  "plant": "PLANT-001",
  "userId": "user-123",
  "userName": "John Doe"
}
```

**Validation Rules:**
- Batch size must be positive
- Plant is required
- Master recipe must exist
- Batch size must be within scale range

**Success Response:**
```json
{
  "success": true,
  "data": {
    "manufacturingRecipe": {
      "id": "mfg-789",
      "manufacturingOrderNumber": "MO-2024-0015",
      "masterRecipeId": "recipe-123",
      "plant": "PLANT-001",
      "status": "planned",
      "outputMaterial": {
        "materialId": "MAT-001",
        "plannedQuantity": 1000,
        "unit": "kg"
      }
    },
    "calculationLog": {
      "id": "calc-790",
      "calculationType": "manufacturing_derive",
      "status": "success"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T11:00:00Z",
    "executionTime": 67,
    "version": "1.0.0"
  }
}
```

---

#### POST /manufacturing/calculate-yield

Calculate yield across manufacturing operations.

**Request Body:**
```json
{
  "manufacturingRecipeId": "mfg-789",
  "operations": [
    {
      "inputQty": 1000,
      "outputQty": 950,
      "unit": "kg"
    },
    {
      "inputQty": 950,
      "outputQty": 900,
      "unit": "kg"
    },
    {
      "inputQty": 900,
      "outputQty": 875,
      "unit": "kg"
    }
  ],
  "userId": "user-123",
  "userName": "John Doe"
}
```

**Validation Rules:**
- At least one operation required
- All quantities must be positive
- Output quantity ≤ input quantity per step

**Success Response:**
```json
{
  "success": true,
  "data": {
    "overallYield": 87.5,
    "stepYields": [95.0, 94.74, 97.22],
    "calculationLog": {
      "id": "calc-791",
      "calculationType": "yield",
      "status": "success",
      "outputResults": {
        "summary": {
          "totalItems": 3,
          "successCount": 3,
          "keyMetrics": {
            "overallYield": 87.5,
            "averageStepYield": 95.65
          }
        }
      }
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T11:15:00Z",
    "executionTime": 15,
    "version": "1.0.0"
  }
}
```

---

### Sales Order Endpoints

#### POST /salesorder/derive

Derive manufacturing recipes from sales order line items.

**Request Body:**
```json
{
  "salesOrderId": "so-123",
  "lineNumbers": [10, 20, 30],
  "userId": "user-123",
  "userName": "John Doe"
}
```

**Validation Rules:**
- At least one line item required
- Sales order must exist
- Line items must be valid

**Success Response:**
```json
{
  "success": true,
  "data": {
    "derivedRecipes": [
      {
        "lineNumber": 10,
        "masterRecipeId": "recipe-10",
        "batchSize": 1000
      },
      {
        "lineNumber": 20,
        "masterRecipeId": "recipe-20",
        "batchSize": 2000
      },
      {
        "lineNumber": 30,
        "masterRecipeId": "recipe-30",
        "batchSize": 1500
      }
    ],
    "calculationLog": {
      "id": "calc-792",
      "calculationType": "sales_order_derive",
      "status": "success"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T11:30:00Z",
    "executionTime": 45,
    "version": "1.0.0"
  }
}
```

---

### Validation Endpoints

#### POST /validation/unit-of-measure

Validate unit of measure against allowed units.

**Request Body:**
```json
{
  "unit": "kg",
  "allowedUnits": ["KG", "G", "LB", "OZ", "L", "ML", "GAL"]
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "suggestions": null
  },
  "metadata": {
    "timestamp": "2024-01-15T12:00:00Z",
    "executionTime": 2,
    "version": "1.0.0"
  }
}
```

**Invalid Unit Response:**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "suggestions": ["KG", "G"]
  },
  "metadata": {
    "timestamp": "2024-01-15T12:00:00Z",
    "executionTime": 2,
    "version": "1.0.0"
  }
}
```

---

#### POST /validation/yield-percentage

Validate yield percentage and get severity assessment.

**Request Body:**
```json
{
  "yieldPercentage": 87.5
}
```

**Validation Rules:**
- Must be between 0-100%
- < 60%: Critical error
- < 80%: Warning
- ≥ 80%: Acceptable

**Success Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "severity": "info",
    "message": "Yield percentage is within acceptable range"
  },
  "metadata": {
    "timestamp": "2024-01-15T12:05:00Z",
    "executionTime": 1,
    "version": "1.0.0"
  }
}
```

**Low Yield Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "severity": "warning",
    "message": "Yield percentage below 80% may indicate inefficiency"
  },
  "metadata": {
    "timestamp": "2024-01-15T12:05:00Z",
    "executionTime": 1,
    "version": "1.0.0"
  }
}
```

---

#### POST /validation/byproduct-logic

Validate byproduct mass balance.

**Request Body:**
```json
{
  "inputQuantity": 1000,
  "outputQuantity": 850,
  "byproductQuantity": 150,
  "unit": "kg"
}
```

**Validation Rules:**
- Input = Output + Byproduct (±0.01 tolerance)
- All quantities must be positive

**Success Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "balanceCheck": true,
    "message": "Mass balance check passed"
  },
  "metadata": {
    "timestamp": "2024-01-15T12:10:00Z",
    "executionTime": 3,
    "version": "1.0.0"
  }
}
```

**Failed Balance Response:**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "balanceCheck": false,
    "message": "Mass balance check failed: Input (1000 kg) ≠ Output (850 kg) + Byproduct (120 kg)"
  },
  "metadata": {
    "timestamp": "2024-01-15T12:10:00Z",
    "executionTime": 3,
    "version": "1.0.0"
  }
}
```

---

## Validation Rules

### Yield Percentage

- **Range:** 0-100%
- **Critical Threshold:** < 60% (Error)
- **Warning Threshold:** < 80% (Warning)
- **Acceptable:** ≥ 80% (Info)

### Unit of Measure

**Standard Units:**
- **Mass:** KG, G, LB, OZ, MT, TON
- **Volume:** L, ML, GAL, QT, PT, FL_OZ
- **Count:** EA, PC, BOX, CASE

**Validation:**
- Case-insensitive matching
- Suggestions provided for similar units
- Custom units allowed with approval

### Byproduct Logic

**Mass Balance Equation:**
```
Input = Output + Byproduct + Waste
```

**Tolerance:** ±0.01 (0.01 unit)

**Categories:**
- **Output:** Primary product
- **Byproduct:** Recoverable secondary product
- **Waste:** Non-recoverable loss

---

## Examples

### Complete Formulation Workflow

```bash
# 1. Create Formulation
POST /formulation/create
{
  "name": "Chocolate Milk",
  "type": "final_product",
  "ingredients": [
    {"name": "Milk", "percentage": 92, "quantity": 92, "unit": "L"},
    {"name": "Cocoa", "percentage": 5, "quantity": 5, "unit": "kg"},
    {"name": "Sugar", "percentage": 3, "quantity": 3, "unit": "kg"}
  ],
  "targetYield": 100,
  "yieldUnit": "L",
  "metadata": {"owner": "user-123"}
}

# 2. Validate Yield
POST /formulation/validate-yield
{
  "formulation": {...}
}

# 3. Scale to Production
POST /formulation/scale
{
  "formulationId": "formula-123",
  "targetQuantity": 10000,
  "targetUnit": "L",
  "userId": "user-123",
  "userName": "John Doe"
}

# 4. Generate Manufacturing Recipe
POST /manufacturing/generate
{
  "masterRecipeId": "recipe-456",
  "batchSize": 10000,
  "plant": "PLANT-001",
  "userId": "user-123",
  "userName": "John Doe"
}

# 5. Calculate Actual Yield
POST /manufacturing/calculate-yield
{
  "manufacturingRecipeId": "mfg-789",
  "operations": [
    {"inputQty": 10000, "outputQty": 9800, "unit": "L"},
    {"inputQty": 9800, "outputQty": 9750, "unit": "L"}
  ],
  "userId": "user-123",
  "userName": "John Doe"
}
```

### Sales Order to Production

```bash
# 1. Receive Sales Order
POST /salesorder/derive
{
  "salesOrderId": "so-2024-001",
  "lineNumbers": [10, 20, 30],
  "userId": "user-123",
  "userName": "John Doe"
}

# Response includes derived recipes for each line item
```

---

## Rate Limiting

**Current Limits:**
- 100 requests per minute per user
- 1000 requests per hour per user

**Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

---

## Versioning

The API uses URL versioning: `/api/v1/`

Breaking changes will result in a new version (`/api/v2/`). Non-breaking changes (additions) will not increment the version.

---

## Support

For API support, contact: api-support@tcs.com

**Documentation Version:** 1.0.0  
**Last Updated:** 2024-01-15
