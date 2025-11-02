# API Quick Reference Guide

## Endpoint Categories

### 🧪 Formulation API
Create, scale, and validate product formulations

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/formulation/create` | POST | Create new formulation with validation |
| `/formulation/scale` | POST | Scale formulation to target quantity |
| `/formulation/validate-yield` | POST | Validate formulation yield percentage |

### 🏭 Manufacturing API
Generate and manage manufacturing recipes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/manufacturing/generate` | POST | Generate manufacturing recipe from master recipe |
| `/manufacturing/calculate-yield` | POST | Calculate yield across operations |

### 📦 Sales Order API
Derive recipes from customer orders

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/salesorder/derive` | POST | Derive recipes from sales order line items |

### ✅ Validation API
Validate units, yields, and mass balance

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/validation/unit-of-measure` | POST | Validate unit of measure |
| `/validation/yield-percentage` | POST | Validate yield percentage with severity |
| `/validation/byproduct-logic` | POST | Validate byproduct mass balance |

---

## Quick Examples

### Create Formulation
```json
POST /formulation/create
{
  "name": "Orange Juice",
  "type": "final_product",
  "ingredients": [
    {"name": "Orange Juice", "percentage": 85, "quantity": 85, "unit": "kg", "function": "base"},
    {"name": "Sugar", "percentage": 15, "quantity": 15, "unit": "kg", "function": "sweetener"}
  ],
  "targetYield": 100,
  "yieldUnit": "kg",
  "metadata": {"owner": "user-123"}
}
```

### Scale Formulation
```json
POST /formulation/scale
{
  "formulationId": "formula-123",
  "targetQuantity": 5000,
  "targetUnit": "kg",
  "userId": "user-123",
  "userName": "John Doe"
}
```

### Generate Manufacturing Recipe
```json
POST /manufacturing/generate
{
  "masterRecipeId": "recipe-123",
  "batchSize": 1000,
  "plant": "PLANT-001",
  "userId": "user-123",
  "userName": "John Doe"
}
```

### Calculate Yield
```json
POST /manufacturing/calculate-yield
{
  "manufacturingRecipeId": "mfg-789",
  "operations": [
    {"inputQty": 1000, "outputQty": 950, "unit": "kg"},
    {"inputQty": 950, "outputQty": 900, "unit": "kg"}
  ],
  "userId": "user-123",
  "userName": "John Doe"
}
```

### Validate Unit
```json
POST /validation/unit-of-measure
{
  "unit": "kg",
  "allowedUnits": ["KG", "G", "LB", "OZ"]
}
```

### Validate Yield
```json
POST /validation/yield-percentage
{
  "yieldPercentage": 87.5
}
```

### Validate Byproduct
```json
POST /validation/byproduct-logic
{
  "inputQuantity": 1000,
  "outputQuantity": 850,
  "byproductQuantity": 150,
  "unit": "kg"
}
```

---

## Validation Rules

### Yield Percentage
- **Range:** 0-100%
- **< 60%:** Error (critically low)
- **< 80%:** Warning (inefficient)
- **≥ 80%:** Info (acceptable)

### Unit of Measure
**Mass:** KG, G, LB, OZ, MT, TON  
**Volume:** L, ML, GAL, QT, PT, FL_OZ  
**Count:** EA, PC, BOX, CASE

### Byproduct Mass Balance
```
Input = Output + Byproduct ± 0.01
```

---

## Response Format

```json
{
  "success": boolean,
  "data": object | null,
  "error": {
    "code": string,
    "message": string,
    "details": string[]
  } | null,
  "metadata": {
    "timestamp": ISO8601,
    "executionTime": number,
    "version": string,
    "warnings": string[]
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `INVALID_QUANTITY` | Quantity value invalid |
| `INVALID_BATCH_SIZE` | Batch size invalid |
| `MISSING_PLANT` | Plant field missing |
| `NO_OPERATIONS` | No operations provided |
| `NO_LINE_ITEMS` | No line items provided |
| `EXECUTION_ERROR` | General execution error |

---

## Entities

### MaterialMaster
Material master data with cost, procurement, regulatory, and quality info

### FormulationBOM
Extended formulation with BOM components and process steps

### MasterRecipe
Production recipe template with ingredients, instructions, and yields

### ManufacturingRecipe
Actual production order with operations, resources, and tracking

### SalesOrder
Customer order with line items and recipe derivation

### CalculationLog
Audit log for calculations with input/output and validation results

---

## Testing

Use the **API Testing** tab in the application to:
1. Select an endpoint from the tabs
2. View default request body
3. Modify request parameters
4. Execute the request
5. View formatted response
6. Copy or download results

---

## Documentation

See `API_DOCUMENTATION.md` for complete details including:
- Full request/response examples
- Detailed validation rules
- Rate limiting information
- Versioning policy
- Support contacts
