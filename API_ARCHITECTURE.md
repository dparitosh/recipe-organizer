# API Architecture Documentation

## Overview

The REST API for BOM and Recipe Management is designed as a client-side API layer that provides structured endpoints for formulation management, manufacturing recipe generation, sales order processing, and validation services. The architecture emphasizes validation, audit logging, and compatibility with React frontend components.

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  (Components consuming API responses)                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    API Layer                             │
│  ┌────────────────────────────────────────────────┐    │
│  │  FormulationAPI                                 │    │
│  │  - create(), scale(), validateYield()          │    │
│  └────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────┐    │
│  │  ManufacturingAPI                               │    │
│  │  - generate(), calculateYield()                 │    │
│  └────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────┐    │
│  │  SalesOrderAPI                                  │    │
│  │  - derive(), validateOrder()                    │    │
│  └────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────┐    │
│  │  ValidationAPI                                  │    │
│  │  - validateUnitOfMeasure()                      │    │
│  │  - validateYieldPercentage()                    │    │
│  │  - validateByproductLogic()                     │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Schema Layer                            │
│  ┌────────────────────────────────────────────────┐    │
│  │  Entity Schemas                                 │    │
│  │  - MaterialMaster                               │    │
│  │  - Formulation, BOM                             │    │
│  │  - MasterRecipe, ManufacturingRecipe           │    │
│  │  - SalesOrder                                   │    │
│  │  - CalculationLog                               │    │
│  └────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────┐    │
│  │  Validation Functions                           │    │
│  │  - validateFormulation()                        │    │
│  │  - validateMasterRecipe()                       │    │
│  │  - validateManufacturingRecipe()               │    │
│  │  - validateSalesOrder()                         │    │
│  │  - validateCalculationInput()                   │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                Persistence Layer                         │
│  (useKV hooks for browser storage)                      │
└─────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. API Endpoints (`/lib/api/rest-endpoints.ts`)

**Purpose:** Provide REST-like API methods that can be called from React components

**Classes:**
- `FormulationAPI`: Formulation operations
- `ManufacturingAPI`: Manufacturing recipe operations
- `SalesOrderAPI`: Sales order operations
- `ValidationAPI`: Validation services

**Response Structure:**
```typescript
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: APIError
  metadata?: ResponseMetadata
}
```

### 2. Schema Definitions (`/lib/schemas/`)

**Purpose:** TypeScript interfaces and validation functions for all entities

**Files:**
- `material-master.ts`: Material master data with cost, procurement, regulatory
- `formulation.ts`: Product formulations with ingredients
- `bom.ts`: Bill of materials with components and process steps
- `master-recipe.ts`: Recipe templates with instructions and yields
- `manufacturing-recipe.ts`: Production orders with operations and tracking
- `sales-order.ts`: Customer orders with fulfillment tracking
- `calculation-log.ts`: Audit logs for calculations

### 3. API Testing Interface (`/components/APITester.tsx`)

**Purpose:** Interactive UI for testing API endpoints

**Features:**
- Tabbed interface for endpoint categories
- JSON request body editor
- Execute button with loading state
- Formatted response display with success/error status
- Copy and download response capabilities
- Execution time tracking

---

## Data Flow

### Example: Scale Formulation

```
1. User Input
   └─> React Component calls FormulationAPI.scale()

2. API Layer
   └─> Validates input parameters
   └─> Creates CalculationLog
   └─> Validates calculation input
   └─> Performs scaling calculation
   └─> Updates CalculationLog with results

3. Response
   └─> Returns APIResponse with:
       - scaledFormulation
       - calculationLog
       - metadata (timestamp, executionTime)

4. Frontend
   └─> Displays scaled ingredients
   └─> Shows warnings if any
   └─> Logs calculation for audit trail
```

---

## Entity Relationships

```
MaterialMaster
    │
    ├─> Used in → Formulation
    │                  │
    │                  ├─> Scaled to → ScaledFormulation
    │                  │
    │                  └─> Converted to → BOM
    │                                      │
    │                                      └─> Components
    │
    └─> Used in → MasterRecipe
                      │
                      ├─> Ingredients
                      ├─> ProcessInstructions
                      ├─> YieldData
                      │
                      └─> Generated from → ManufacturingRecipe
                                             │
                                             ├─> Operations
                                             ├─> ActualYields
                                             ├─> QualityResults
                                             │
                                             └─> Fulfills → SalesOrderItem
                                                              │
                                                              └─> Part of → SalesOrder

CalculationLog
    └─> Tracks all calculations across entities
```

---

## Validation Architecture

### Three-Tier Validation

1. **Schema Validation** (Entity Level)
   - Validates entity structure
   - Enforces required fields
   - Checks data types and ranges
   - Examples: `validateFormulation()`, `validateMasterRecipe()`

2. **Business Rule Validation** (API Level)
   - Enforces business logic
   - Validates relationships between entities
   - Checks constraints (e.g., yield percentages, mass balance)
   - Examples: `validateYield()`, `validateByproductLogic()`

3. **Input Validation** (Calculation Level)
   - Validates calculation inputs
   - Checks parameter completeness
   - Verifies numeric ranges
   - Example: `validateCalculationInput()`

### Validation Results

```typescript
interface ValidationResult {
  rule: string
  field: string
  severity: 'info' | 'warning' | 'error'
  message: string
  actualValue?: any
  expectedValue?: any
  passed: boolean
}
```

---

## Calculation Logging

### Purpose
Provides complete audit trail for all calculations performed

### Structure
```typescript
interface CalculationLog {
  id: string
  calculationType: 'scale' | 'yield' | 'cost' | 'nutrition' | ...
  entityType: 'formulation' | 'bom' | 'master_recipe' | ...
  entityId: string
  inputParameters: CalculationInput
  outputResults: CalculationOutput
  validationResults: ValidationResult[]
  executionMetrics: ExecutionMetrics
  status: 'success' | 'warning' | 'error'
  metadata: CalculationMetadata
}
```

### Use Cases
- Audit trail for regulatory compliance
- Performance monitoring
- Debugging calculation issues
- Historical analysis
- Reproducibility of results

---

## Error Handling Strategy

### Error Categories

1. **Validation Errors** (`VALIDATION_ERROR`)
   - Input validation failures
   - Returns detailed list of validation issues
   - HTTP equivalent: 400 Bad Request

2. **Business Logic Errors** (`INVALID_*`)
   - Business rule violations
   - Examples: INVALID_QUANTITY, MISSING_PLANT
   - HTTP equivalent: 422 Unprocessable Entity

3. **Execution Errors** (`EXECUTION_ERROR`)
   - Runtime errors
   - Unexpected failures
   - HTTP equivalent: 500 Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Formulation validation failed",
    "details": ["Error 1", "Error 2"],
    "field": "ingredients"
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "executionTime": 12,
    "version": "1.0.0"
  }
}
```

---

## Performance Considerations

### Calculation Complexity

| Operation | Complexity | Expected Time |
|-----------|-----------|---------------|
| Create Formulation | O(n) | < 50ms |
| Scale Formulation | O(n) | < 30ms |
| Validate Yield | O(n) | < 10ms |
| Generate Manufacturing | O(n+m) | < 100ms |
| Calculate Yield | O(n) | < 20ms |
| Validate Unit | O(1) | < 5ms |
| Validate Byproduct | O(1) | < 5ms |

n = number of ingredients/components  
m = number of process steps/operations

### Optimization Strategies
- Early validation to fail fast
- Lazy calculation of optional fields
- Caching of unit conversion factors
- Minimal object cloning
- Efficient array operations

---

## Testing Strategy

### Unit Testing
- Test each API method independently
- Mock dependencies (schemas, persistence)
- Verify validation logic
- Test error handling

### Integration Testing
- Test complete workflows
- Verify data consistency
- Test edge cases
- Validate calculation accuracy

### API Testing Interface
- Interactive UI for manual testing
- Predefined test cases
- Response validation
- Performance monitoring

---

## Security Considerations

### Current Implementation
- User ID/name in request body
- Client-side validation
- No authentication layer

### Production Recommendations
1. **Authentication**
   - Implement JWT tokens
   - OAuth 2.0 for enterprise integration
   - Role-based access control (RBAC)

2. **Authorization**
   - User permissions for create/read/update/delete
   - Plant-level access control
   - Approval workflow enforcement

3. **Data Protection**
   - Encrypt sensitive cost data
   - Sanitize user inputs
   - Rate limiting per user

4. **Audit Trail**
   - Log all API calls
   - Track user actions
   - Maintain calculation logs

---

## Future Enhancements

### Phase 2
- GraphQL API layer
- Real-time subscriptions for updates
- Batch operations support
- Advanced caching strategies

### Phase 3
- Machine learning integration for yield prediction
- Optimization algorithms for cost reduction
- Predictive analytics for quality
- Advanced scheduling algorithms

### Phase 4
- Blockchain for supply chain traceability
- IoT integration for real-time monitoring
- AI-powered recipe recommendations
- Digital twin simulations

---

## API Versioning Strategy

**Current:** v1.0.0  
**Policy:** Semantic versioning (MAJOR.MINOR.PATCH)

- **MAJOR:** Breaking changes (incompatible API changes)
- **MINOR:** New features (backward-compatible)
- **PATCH:** Bug fixes (backward-compatible)

**URL Structure:** `/api/v1/endpoint`

---

## Documentation

### Available Documentation
1. **API_DOCUMENTATION.md**: Complete API reference with examples
2. **API_QUICK_REFERENCE.md**: Quick lookup guide
3. **API_ARCHITECTURE.md**: This document (architecture details)
4. **Inline Code Comments**: JSDoc comments in source code

### Documentation Standards
- All endpoints documented with examples
- Request/response schemas defined
- Validation rules clearly stated
- Error codes and messages listed
- Performance expectations noted

---

## Support and Maintenance

### Code Location
- API Endpoints: `/src/lib/api/rest-endpoints.ts`
- Schemas: `/src/lib/schemas/*.ts`
- Testing UI: `/src/components/APITester.tsx`

### Dependencies
- TypeScript for type safety
- Zod for runtime validation (future enhancement)
- Date-fns for date handling
- React for testing interface

### Contact
For technical support: api-support@tcs.com

---

**Document Version:** 1.0.0  
**Last Updated:** 2024-01-15  
**Author:** TCS Development Team
