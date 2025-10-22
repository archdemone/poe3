# Item Validation System

This directory contains comprehensive automated validation for the game's item systems, ensuring data integrity and functionality across all game mechanics.

## Components

### Core Validation (`validateItems.ts`)
- **Item Schema Validation**: Validates all item data against Zod schemas
- **Referential Integrity**: Ensures all stat keys and base IDs are valid
- **Data Quality Checks**: Validates value ranges, duplicate detection, and consistency

### Drop Table Auditor (`dropAudit.ts`)
- **Accessibility Analysis**: Verifies all items can be obtained at appropriate levels
- **Level Gating Validation**: Ensures item requirements are reasonable

### Test Suites
- **Stat Engine Tests** (`tests/statEngine.spec.ts`): Validates equipment bonus calculations
- **Property-Based Tests** (`tests/randomizedItems.spec.ts`): Fuzz testing with fast-check
- **Inventory Tests** (`tests/inventory.spec.ts`): Grid operations and trading contracts

## CLI Tools

### Item Validation
```bash
npm run check:items
```
Validates all item data and generates `reports/item-data-report.md`

### Drop Table Audit
```bash
npx ts-node scripts/audit-drop-tables.ts
```
Audits item accessibility and generates `reports/drop-table-report.md`

### Smoke Testing
```bash
npm run smoke
```
Runs comprehensive smoke tests for item systems

## Quality Assurance Pipeline

Run the complete QA pipeline:
```bash
npm run qa:items
```

This executes:
1. Data validation (`check:items`)
2. Unit tests (`test`)
3. E2E tests (`e2e:headless`)
4. Smoke tests (`smoke`)

## Reports

All validation results are saved to the `reports/` directory:
- `item-data-report.md`: Schema validation results
- `drop-table-report.md`: Accessibility analysis
- Test results in console output

## Architecture

The validation system is designed to be:
- **Non-intrusive**: Doesn't modify game data, only validates
- **Comprehensive**: Covers data, logic, and UI layers
- **Fast**: Optimized for quick validation cycles
- **CI-ready**: Fails builds on validation errors

## Adding New Validations

1. **Data Validation**: Add new Zod schemas in `schemas.ts`
2. **Logic Validation**: Add unit tests in appropriate test files
3. **UI Validation**: Add E2E tests in `tests/e2e/items.spec.ts`
4. **Integration**: Update the QA pipeline in `package.json`

## Dependencies

- `zod`: Schema validation
- `fast-check`: Property-based testing
- `@playwright/test`: E2E testing

## Acceptance Criteria

✅ All item data validates against schemas
✅ No NaN/Infinity values in stat calculations
✅ Property-based tests pass on 1000+ random scenarios
✅ E2E tests verify UI functionality without errors
✅ All items are accessible at appropriate levels
✅ Save/load cycles preserve item data
✅ QA pipeline passes in CI
