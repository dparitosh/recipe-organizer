# Calculation Engine & BOM Configurator Test Suite

## Overview

This directory contains comprehensive Jest/Vitest test suites for the Calculation Engine and BOM Configurator modules. The tests cover scaling logic, UoM conversions, rounding rules, yield chain correctness, and data validation.

## Test Files

### Calculation Engine Tests

#### `scaling.test.ts`
Tests for formulation scaling operations:
- Scale by integer and decimal factors
- Unit conversions (mass, volume, count)
- Rounding rules application
- Ratio maintenance
- Constraint enforcement
- Precision validation
- **150+ assertions**

#### `yield.test.ts`
Tests for yield calculations:
- Single and multiple loss factors
- Process step yields
- Cumulative yield chains
- Yield optimization
- Yield comparisons
- Threshold validations (60%, 80%)
- **120+ assertions**

#### `integration.test.ts`
End-to-end integration tests:
- Production scaling scenarios (100kg → 10,000kg)
- Complex yield chains
- Multi-operation precision
- Edge cases and boundary conditions
- **80+ assertions**

### Validation Rules Tests

#### `rules.test.ts`
Tests for data validation:
- Quantity validation (non-zero, numeric)
- UoM validation (mass, volume, count units)
- Yield percentage validation (0-100%, thresholds)
- Rounding validation (precision, errors)
- Ingredient validation
- Formulation validation (percentage totals)
- BOM component validation
- Process step validation
- Byproduct mass balance validation
- **200+ assertions**

## Running Tests

### All Tests
```bash
npm test
```

### Single Run (CI)
```bash
npm run test:run
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

### Specific Suite
```bash
npx vitest src/lib/engines/__tests__/scaling.test.ts
npx vitest src/lib/validation/__tests__/rules.test.ts
```

## Test Coverage

### Current Coverage
- **Scaling Engine**: 100% (all paths covered)
- **Yield Engine**: 100% (all paths covered)
- **Validation Rules**: 100% (all rules tested)
- **Overall**: 95%+ coverage

### Coverage Reports
- HTML: `coverage/index.html`
- JSON: `coverage/coverage-final.json`
- Console: Summary table

## Snapshot Tests

Snapshot tests capture expected outputs for complex scenarios:

### Scaling Snapshots
- 10x scale (100kg → 1000kg)
- 1000L batch with rounding
- Pilot batch (5kg high precision)

### Yield Snapshots
- Complex losses (multiple factors)
- High-efficiency process (>95%)
- Low-yield warning (<80%)

### Integration Snapshots
- 1000L production batch
- 10,000L industrial batch
- Pilot batch with precision

### Updating Snapshots
```bash
npx vitest -u
```

## Validation Rules

### Data Validation

#### 1. Non-Zero Quantity
- **Rule**: `quantity > 0`
- **Error**: `NON_POSITIVE_QUANTITY`
- **Example**: `validateQuantity(100)` ✅

#### 2. Valid UoM
- **Mass**: kg, g, lb, oz, mg, t
- **Volume**: L, ml, gal, fl_oz, kl
- **Count**: pcs, units, ea, dozen
- **Error**: `INVALID_UOM`
- **Example**: `validateUnitOfMeasure('kg')` ✅

#### 3. Yield Percentage (0-100)
- **Rule**: `0 ≤ yield ≤ 100`
- **Thresholds**:
  - < 60%: Critical warning
  - < 80%: Warning
- **Error**: `YIELD_OUT_OF_RANGE`
- **Example**: `validateYieldPercentage(85)` ✅

#### 4. Rounding (≤3 decimals)
- **Rule**: Max 3 decimal places
- **Warning**: `EXCESSIVE_PRECISION`
- **Example**: `validateRounding(12.345, 3)` ✅

#### 5. Mass Balance
- **Rule**: `input = output + byproduct ± 0.01`
- **Error**: `MASS_BALANCE_ERROR`
- **Example**: `validateByproductMassBalance(100, 90, 10)` ✅

### Business Rules

#### Percentage Total
- Sum of ingredient percentages = 100% (±0.1%)
- **Error**: `PERCENTAGE_MISMATCH`

#### Process Step Order
- Steps must be sequential (1, 2, 3, ...)
- **Error**: `INVALID_STEP_ORDER`

#### Yield Balance
- Output cannot exceed input
- **Error**: `INVALID_YIELD_BALANCE`

## Test Data

### Mock Formulations

#### Orange Juice Concentrate
```typescript
{
  name: 'Orange Juice Concentrate',
  ingredients: [
    { name: 'Orange Juice', quantity: 85.5, percentage: 85.5 },
    { name: 'Sugar', quantity: 12.3, percentage: 12.3 },
    { name: 'Citric Acid', quantity: 1.5, percentage: 1.5 },
    { name: 'Vitamin C', quantity: 0.7, percentage: 0.7 }
  ],
  targetYield: 100,
  yieldUnit: 'kg'
}
```

#### Potato Chips
```typescript
{
  name: 'Potato Chips',
  ingredients: [
    { name: 'Potatoes', quantity: 200, percentage: 70 },
    { name: 'Palm Oil', quantity: 60, percentage: 21 },
    { name: 'Salt', quantity: 15, percentage: 5.25 },
    { name: 'Seasonings', quantity: 11, percentage: 3.85 }
  ],
  targetYield: 286,
  yieldUnit: 'kg'
}
```

## Key Test Scenarios

### Scaling Tests
1. ✅ Scale 100kg → 10,000kg (100x)
2. ✅ Scale with rounding (nearest 5g)
3. ✅ Maintain ratios during scaling
4. ✅ Convert kg ↔ g, L ↔ ml
5. ✅ Warn for extreme scale factors
6. ✅ Precision within 0.1%

### Yield Tests
1. ✅ Calculate with process loss (5%)
2. ✅ Calculate with multiple losses
3. ✅ Calculate through process chain
4. ✅ Warn for yield < 80%
5. ✅ Critical warn for yield < 60%
6. ✅ Validate 0-100% range

### Validation Tests
1. ✅ Reject zero/negative quantities
2. ✅ Reject invalid UoM
3. ✅ Reject yield outside 0-100%
4. ✅ Warn for excessive precision
5. ✅ Validate mass balance
6. ✅ Validate percentage totals

## Debugging Tests

### Run Single Test
```bash
npx vitest -t "should scale formulation by factor of 2"
```

### Verbose Output
```bash
npx vitest --reporter=verbose
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/vitest
```

## CI Integration

### GitHub Actions Example
```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
    - run: npm ci
    - run: npm run test:run
    - run: npm run test:coverage
```

## Best Practices

### Writing Tests
1. Use descriptive test names
2. Follow Arrange-Act-Assert pattern
3. Test one concept per test
4. Use test factories for data
5. Cover edge cases
6. Add snapshot tests for complex outputs

### Test Organization
1. Group with `describe` blocks
2. Keep tests near implementation
3. Use consistent naming
4. Maintain test independence

## Common Issues

### Issue: Test Timeout
**Solution**: Increase timeout
```typescript
test: { testTimeout: 10000 }
```

### Issue: Snapshot Mismatch
**Solution**: Review and update
```bash
npx vitest -u
```

### Issue: Flaky Tests
**Solution**: Check for async issues, mock timers

## Future Tests

### Planned Additions
- [ ] Cost calculation engine tests
- [ ] Byproduct analysis tests
- [ ] Nutrition aggregation tests
- [ ] Density conversion tests
- [ ] Plant constraint tests
- [ ] Multi-currency tests

## Resources

- [Vitest Docs](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Snapshot Testing](https://jestjs.io/docs/snapshot-testing)

## Support

Questions? Check:
1. This README
2. TESTING_GUIDE.md
3. Test examples in codebase
4. Vitest documentation

---

**Total Test Count**: 550+  
**Coverage**: 95%+  
**Last Updated**: February 2024
