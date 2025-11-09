# Testing & Validation Guide

## Overview

This document describes the comprehensive testing and validation framework for the Formulation Graph Studio application, with focus on the Calculation Engine and BOM Configurator modules.

## Test Suite Structure

### Test Coverage
- **Calculation Engine**: Scaling logic, yield calculations, UoM conversions
- **Validation Rules**: Data validation, business rules, mass balance
- **BOM Configurator**: Component management, process steps, calculations
- **Integration Tests**: End-to-end production scenarios

### Test Files Location
```
src/
└── lib/
    ├── engines/
    │   └── __tests__/
    │       ├── scaling.test.js         # Scaling logic tests
    │       ├── yield.test.js           # Yield calculation tests
    │       ├── uom-conversions.test.js # Unit conversion tests
    │       └── integration.test.js     # End-to-end batch scenarios
    ├── orchestration/
    │   └── __tests__/orchestrator.e2e.test.js  # Agent pipeline orchestration
    └── validation/
        └── __tests__/rules.test.js     # Validation rules tests

backend/
└── tests/
    └── services/test_graph_schema_service.py   # Graph schema service tests
```

## Running Tests

### Frontend (Vitest) Commands
```bash
# Run all frontend unit and integration tests
npm test

# Run tests once in CI-friendly mode
npx vitest run

# Run tests with coverage report
npx vitest run --coverage

# Launch the Vitest UI runner
npx vitest --ui

# Run tests in watch mode
npx vitest --watch
```

### Backend (Pytest) Commands
```bash
# Install backend development dependencies (from backend/)
venv\Scripts\pip install -r requirements-dev.txt

# Execute backend service tests
venv\Scripts\python -m pytest
```

### Running Specific Test Suites
```bash
# Run only scaling tests
npx vitest src/lib/engines/__tests__/scaling.test.js

# Run only validation tests
npx vitest src/lib/validation/__tests__/rules.test.js

# Run only yield tests
npx vitest src/lib/engines/__tests__/yield.test.js
```

## Calculation Engine Tests

### Scaling Logic Tests

**File**: `src/lib/engines/__tests__/scaling.test.js`

#### Test Coverage
- ✅ Scale formulation by integer factors (2x, 10x, 100x)
- ✅ Scale formulation by decimal factors (0.5x, 0.05x)
- ✅ Apply rounding rules (1g, 5g, 10g precision)
- ✅ Maintain ingredient ratios during scaling
- ✅ Warn for very small scale factors (<0.1)
- ✅ Warn for very large scale factors (>100)
- ✅ Respect min/max quantity constraints
- ✅ Unit conversions (kg↔g, L↔ml, kg↔lb)
- ✅ Scale to standard batch sizes
- ✅ Multi-batch scaling
- ✅ Find optimal batch size for demand
- ✅ Maintain precision within 0.1%
- ✅ Handle decimal precision correctly

#### Snapshot Tests
- 10x scale (100kg → 1000kg)
- 1000L batch with rounding
- Pilot batch (5kg with high precision)

#### Example Test
```javascript
it('scales formulation by factor of 2', () => {
  const formulation = createMockFormulation()
  const result = scaleFormulation({
    formulation,
    targetQuantity: 200,
    targetUnit: 'kg'
  })

  expect(result.scaleFactor).toBe(2)
  expect(result.scaledFormulation.ingredients[0].quantity).toBe(160)
})
```

### Yield Calculation Tests

**File**: `src/lib/engines/__tests__/yield.test.js`

#### Test Coverage
- ✅ Calculate yield with no losses (100%)
- ✅ Calculate yield with process loss
- ✅ Calculate yield with multiple loss factors
- ✅ Calculate yield with moisture loss
- ✅ Warn when yield < 80%
- ✅ Warn when total losses > 25%
- ✅ Validate yield percentage 0-100 range
- ✅ Calculate yield through single process step
- ✅ Calculate yield through multiple process steps
- ✅ Handle steps without yield data
- ✅ Calculate cumulative yield correctly
- ✅ Optimize ingredients for target yield
- ✅ Compare yields (best, worst, average, variance)
- ✅ Validate yield at 60% threshold
- ✅ Validate yield at 80% threshold

#### Snapshot Tests
- Complex yield with multiple losses
- High-efficiency process (>95%)
- Low-yield warning scenario (<80%)

#### Example Test
```javascript
it('calculates yield with multiple loss factors', () => {
  const formulation = createMockFormulation()
  const result = calculateYield({
    formulation,
    parameters: {
      processLoss: 5,
      evaporationRate: 3,
      wasteFactor: 2
    }
  })

  expect(result.actualYield).toBe(90)
  expect(result.yieldPercentage).toBe(90)
  expect(result.lossBreakdown.total).toBe(10)
})
```

### Integration Tests

**File**: `src/lib/engines/__tests__/integration.test.js`

#### Test Coverage
- ✅ End-to-end production scaling (100kg → 10,000kg)
- ✅ Scale with rounding to meet plant constraints
- ✅ Calculate yield after scaling
- ✅ Convert between mass units during scaling
- ✅ Convert volume units correctly
- ✅ Calculate cumulative yield through multiple operations
- ✅ Maintain precision across multiple scaling operations
- ✅ Handle very large scale factors (>1000x)
- ✅ Handle very small scale factors (<0.01x)
- ✅ Handle extreme yield losses (>50%)
- ✅ Maintain accuracy with minimal losses (<1%)

#### Snapshot Tests
- 1000L production batch with losses
- 10,000L industrial batch
- Pilot batch with high precision

### Orchestration End-to-End Tests

**File**: `src/lib/orchestration/__tests__/orchestrator.e2e.test.js`

#### Test Coverage
- ✅ Full agent pipeline success path (recipe engineer → UI designer)
- ✅ Failure reporting when downstream agents throw errors
- ✅ Agent history bookkeeping and status propagation
- ✅ Preservation of recipe, calculation, graph, validation, and UI outputs

#### Key Scenarios
- Ensures mocked agents hand off consistent domain objects through the orchestrator
- Verifies failed runs surface validation flags and captured error messages


## Backend Tests

**Location**: `backend/tests/services/test_graph_schema_service.py`

### Graph Schema Service Tests
- ✅ GraphML export includes expected nodes, edges, and metadata keys
- ✅ Edge payloads capture type, source, and target descriptors
- ✅ SVG export emits core shapes, markers, and connection lines

### Execution
```bash
cd backend
venv\Scripts\pip install -r requirements-dev.txt
venv\Scripts\python -m pytest
```

> Tip: rerun `venv\Scripts\pip install -r requirements-dev.txt` whenever new backend test dependencies are added.

## Validation Rules Tests

**File**: `src/lib/validation/__tests__/rules.test.js`

### Quantity Validation
- ✅ Validate positive quantities
- ✅ Reject zero quantity
- ✅ Reject negative quantity
- ✅ Reject non-numeric quantity (NaN)
- ✅ Reject infinite quantity
- ✅ Warn for very small quantities (<0.001)
- ✅ Accept decimal quantities

### Unit of Measure Validation
- ✅ Validate all mass units (kg, g, lb, oz, mg, t)
- ✅ Validate all volume units (L, ml, gal, fl_oz, kl)
- ✅ Validate all count units (pcs, units, ea, dozen)
- ✅ Reject invalid units
- ✅ Reject empty unit
- ✅ Reject whitespace-only unit

### Yield Percentage Validation
- ✅ Validate yield 0-100%
- ✅ Warn for yield < 80%
- ✅ Warn critically for yield < 60%
- ✅ Reject yield > 100%
- ✅ Reject negative yield
- ✅ Reject non-numeric yield

### Rounding Validation
- ✅ Validate values with acceptable decimal places (≤3)
- ✅ Warn for excessive decimal places (>3)
- ✅ Warn for rounding errors (>0.001)
- ✅ Validate integer values
- ✅ Reject non-numeric values

### Ingredient Validation
- ✅ Validate complete ingredient
- ✅ Reject ingredient without name
- ✅ Reject ingredient with invalid quantity
- ✅ Reject ingredient with invalid unit
- ✅ Reject ingredient with percentage > 100%
- ✅ Reject ingredient with negative percentage

### Formulation Validation
- ✅ Validate complete formulation
- ✅ Reject formulation without name
- ✅ Reject formulation without ingredients
- ✅ Reject formulation with incorrect total percentage (≠100%)
- ✅ Validate percentage total within tolerance (±0.1%)
- ✅ Reject formulation with invalid target yield
- ✅ Reject formulation with invalid yield unit

### BOM Component Validation
- ✅ Validate complete component
- ✅ Reject component without description
- ✅ Reject component with negative cost
- ✅ Reject component with negative lead time
- ✅ Accept component with zero cost

### Process Step Validation
- ✅ Validate complete process step
- ✅ Reject step without name
- ✅ Reject step with invalid duration
- ✅ Reject step where output > input
- ✅ Warn for low yield percentage
- ✅ Warn for waste balance mismatch
- ✅ Validate step with correct waste calculation

### Byproduct Mass Balance Validation
- ✅ Validate balanced equation: input = output + byproduct
- ✅ Validate balance within tolerance (±0.01)
- ✅ Reject unbalanced equation
- ✅ Warn for balance 0.5-1.0% difference
- ✅ Handle decimal precision

### BOM Validation
- ✅ Validate complete BOM
- ✅ Reject BOM without name
- ✅ Reject BOM without components
- ✅ Reject BOM with invalid step order
- ✅ Validate BOM with sequential process steps

## Validation Rules Reference

### Data Validation Rules

#### 1. Non-Zero Quantity Rule
```javascript
validateQuantity(quantity) -> ValidationResult
```
- **Rule**: Quantity must be > 0
- **Error Code**: `NON_POSITIVE_QUANTITY`
- **Severity**: Error

#### 2. Valid UoM Rule
```javascript
validateUnitOfMeasure(unit) -> ValidationResult
```
- **Rule**: Unit must be one of: kg, g, lb, oz, mg, t, L, ml, gal, fl_oz, kl, pcs, units, ea, dozen
- **Error Code**: `INVALID_UOM`
- **Severity**: Error

#### 3. Numeric Yield Percentage Rule
```javascript
validateYieldPercentage(yieldPercentage) -> ValidationResult
```
- **Rule**: Yield must be numeric between 0-100
- **Error Code**: `YIELD_OUT_OF_RANGE`
- **Severity**: Error
- **Warning Thresholds**:
  - < 60%: Critical warning (`LOW_YIELD_CRITICAL`)
  - < 80%: Warning (`LOW_YIELD_WARNING`)

#### 4. Rounding Rule
```javascript
validateRounding(value, maxDecimalPlaces) -> ValidationResult
```
- **Rule**: Value should not exceed max decimal places (default: 3)
- **Warning Code**: `EXCESSIVE_PRECISION`
- **Severity**: Warning
- **Rounding Error**: Warn if difference > 0.001

#### 5. Byproduct Mass Balance Rule
```javascript
validateByproductMassBalance(input, output, byproduct, tolerance) -> ValidationResult
```
- **Rule**: input = output + byproduct (±tolerance)
- **Error Code**: `MASS_BALANCE_ERROR`
- **Tolerance**: 0.01 (default)
- **Severity**: Error

### Business Rules

#### Percentage Total Rule
- Formulation ingredient percentages must sum to 100% (±0.1% tolerance)
- **Error Code**: `PERCENTAGE_MISMATCH`

#### Process Step Order Rule
- Process steps must be sequentially ordered (1, 2, 3, ...)
- **Error Code**: `INVALID_STEP_ORDER`

#### Yield Balance Rule
- Process step output cannot exceed input
- **Error Code**: `INVALID_YIELD_BALANCE`

## Snapshot Testing

Snapshot tests capture expected output for complex scenarios and ensure consistency across changes.

### How to Update Snapshots
```bash
# Update all snapshots
npx vitest -u

# Update specific test file snapshots
npx vitest src/lib/engines/__tests__/scaling.test.js -u
```

### When to Update Snapshots
- When intentionally changing calculation logic
- When adding new fields to output
- When fixing bugs that change expected output

### Snapshot Review Process
1. Review snapshot changes in git diff
2. Verify changes are intentional and correct
3. Ensure changes align with business requirements
4. Update documentation if behavior changed

## Coverage Requirements

### Minimum Coverage Targets
- **Statements**: 90%
- **Branches**: 85%
- **Functions**: 90%
- **Lines**: 90%

### Coverage Report
```bash
npx vitest run --coverage
```

Coverage reports are generated in:
- Console: Summary table
- HTML: `coverage/index.html`
- JSON: `coverage/coverage-final.json`

## Test Data

### Mock Formulations
All tests use realistic mock data:
- **Orange Juice Concentrate**: 85.5% juice, 12.3% sugar, vitamins
- **Potato Chips**: 70% potatoes, 21% oil, seasonings
- **Beverage Base**: Water, concentrate, preservatives

### Mock BOM Components
- Raw materials with costs and lead times
- Process steps with durations and yields
- Sequential operations with loss modeling

## Continuous Integration

### CI Pipeline Tests
```yaml
test:
  - npx vitest run
  - npx vitest run --coverage
  - Upload coverage to CI platform
```

### Pre-commit Hooks (Recommended)
```bash
# .husky/pre-commit
npx vitest run
npm run lint
```

## Debugging Tests

### Run Single Test
```bash
npx vitest -t "scales formulation by factor of 2"
```

### Run Tests in Debug Mode
```bash
node --inspect-brk node_modules/.bin/vitest
```

### View Test Output
```bash
npx vitest --reporter=verbose
```

## Best Practices

### Writing Tests
1. **Descriptive Names**: Use clear, specific test names
2. **Arrange-Act-Assert**: Follow AAA pattern
3. **One Assertion Focus**: Test one concept per test
4. **Mock External Dependencies**: Isolate units under test
5. **Use Factories**: Create reusable test data factories
6. **Test Edge Cases**: Cover boundary conditions

### Test Organization
1. Group related tests with `describe` blocks
2. Use nested `describe` for sub-categories
3. Keep test files near implementation files
4. Maintain consistent naming: `*.test.js`

### Performance
1. Avoid slow operations in tests
2. Use `beforeEach` for common setup
3. Mock expensive operations
4. Run tests in parallel (default in Vitest)

## Common Issues & Solutions

### Issue: Test Timeout
**Solution**: Increase timeout in vitest.config.js
```javascript
test: {
  testTimeout: 10000
}
```

### Issue: Snapshot Mismatch
**Solution**: Review changes, update if intentional
```bash
npx vitest -u
```

### Issue: Mock Not Working
**Solution**: Clear mocks in afterEach
```javascript
afterEach(() => {
  vi.clearAllMocks()
})
```

## Future Enhancements

### Planned Tests
- [ ] Cost calculation engine tests
- [ ] Byproduct analysis tests
- [ ] Nutrition aggregation tests
- [ ] Plant constraint rounding tests
- [ ] Density conversion tests
- [ ] Multi-currency cost tests

### Test Infrastructure
- [ ] Add performance benchmarks
- [ ] Add visual regression tests
- [ ] Add API contract tests
- [ ] Add E2E tests with Playwright
- [ ] Add mutation testing

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [Snapshot Testing Best Practices](https://jestjs.io/docs/snapshot-testing)

## Support

For questions or issues with tests:
1. Check this documentation
2. Review existing test examples
3. Check Vitest documentation
4. Contact the development team

---

**Last Updated**: November 2025  
**Version**: 1.1  
**Maintainer**: Development Team
