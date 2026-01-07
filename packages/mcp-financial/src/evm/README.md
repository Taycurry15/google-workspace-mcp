# EVM (Earned Value Management) Calculations Module

## Overview

This module provides comprehensive EVM calculations following PMI/PMBOK standards. It enables project managers to track cost and schedule performance, forecast project completion, and assess overall project health.

## PMBOK Standard Formulas

### Core Metrics

- **PV (Planned Value)**: Budgeted cost of work scheduled
  - Also known as BCWS (Budgeted Cost of Work Scheduled)
  - Represents the authorized budget for scheduled work

- **EV (Earned Value)**: Budgeted cost of work performed
  - Also known as BCWP (Budgeted Cost of Work Performed)
  - Represents the value of work actually completed

- **AC (Actual Cost)**: Actual cost of work performed
  - Also known as ACWP (Actual Cost of Work Performed)
  - Represents the actual expenditures incurred

- **BAC (Budget at Completion)**: Total planned budget
  - Represents the baseline budget for the entire project

### Variance Metrics

- **CV (Cost Variance)**: `EV - AC`
  - Positive = Under budget (good)
  - Negative = Over budget (bad)

- **SV (Schedule Variance)**: `EV - PV`
  - Positive = Ahead of schedule (good)
  - Negative = Behind schedule (bad)

### Performance Indices

- **CPI (Cost Performance Index)**: `EV / AC`
  - CPI > 1.0 = Under budget (good)
  - CPI < 1.0 = Over budget (bad)
  - CPI = 1.0 = On budget

- **SPI (Schedule Performance Index)**: `EV / PV`
  - SPI > 1.0 = Ahead of schedule (good)
  - SPI < 1.0 = Behind schedule (bad)
  - SPI = 1.0 = On schedule

### Forecasting Metrics

- **EAC (Estimate at Completion)**: `BAC / CPI`
  - Projected total cost at project completion
  - Based on current cost performance

- **ETC (Estimate to Complete)**: `EAC - AC`
  - Estimated remaining cost to complete the project

- **VAC (Variance at Completion)**: `BAC - EAC`
  - Positive = Expected to be under budget (good)
  - Negative = Expected to be over budget (bad)

- **TCPI (To-Complete Performance Index)**: `(BAC - EV) / (BAC - AC)`
  - Performance level needed to achieve BAC
  - TCPI > 1.0 = Need to improve efficiency
  - TCPI < 1.0 = Can be less efficient and still meet budget

## Functions

### `calculatePV(sheets, spreadsheetId, programId, asOfDate?)`

Calculates Planned Value from schedule baseline.

**Parameters:**
- `sheets`: Google Sheets API instance
- `spreadsheetId`: Spreadsheet containing program data
- `programId`: Program identifier
- `asOfDate`: Date to calculate PV (defaults to today)

**Returns:** `Promise<number>` - Planned Value

**Note:** Phase 5 will integrate with Program server for actual schedule data.

### `calculateEV(sheets, spreadsheetId, programId, asOfDate?)`

Calculates Earned Value from actual progress.

**Parameters:**
- `sheets`: Google Sheets API instance
- `spreadsheetId`: Spreadsheet containing deliverables data
- `programId`: Program identifier
- `asOfDate`: Date to calculate EV (defaults to today)

**Returns:** `Promise<number>` - Earned Value

**Note:** Phase 5 will integrate with Deliverables server for actual progress data.

### `calculateAC(sheets, spreadsheetId, programId, asOfDate?)`

Calculates Actual Cost from budget transactions.

**Parameters:**
- `sheets`: Google Sheets API instance
- `spreadsheetId`: Spreadsheet containing budget data
- `programId`: Program identifier
- `asOfDate`: Date to calculate AC (defaults to today)

**Returns:** `Promise<number>` - Actual Cost

### `calculateBAC(sheets, spreadsheetId, programId)`

Calculates Budget at Completion.

**Parameters:**
- `sheets`: Google Sheets API instance
- `spreadsheetId`: Spreadsheet containing budget data
- `programId`: Program identifier

**Returns:** `Promise<number>` - Budget at Completion

### `calculateEVMMetrics(pv, ev, ac, bac)`

Calculates all derived EVM metrics (pure calculation function).

**Parameters:**
- `pv`: Planned Value
- `ev`: Earned Value
- `ac`: Actual Cost
- `bac`: Budget at Completion

**Returns:** `EVMMetrics` object containing:
- `cv`, `sv`: Variance metrics
- `cvPercent`, `svPercent`: Percentage variances
- `cpi`, `spi`: Performance indices
- `eac`, `etc`, `vac`: Forecasting metrics
- `tcpi`: To-Complete Performance Index

### `performEVMCalculation(sheets, spreadsheetId, programId, asOfDate?)`

Comprehensive EVM calculation combining all metrics.

**Parameters:**
- `sheets`: Google Sheets API instance
- `spreadsheetId`: Spreadsheet containing program data
- `programId`: Program identifier
- `asOfDate`: Date to calculate metrics (defaults to today)

**Returns:** `Promise<object>` containing:
- `pv`, `ev`, `ac`, `bac`: Base values
- `metrics`: Complete EVMMetrics object

### `calculateHealthIndex(metrics)`

Calculates project health from EVM metrics.

**Parameters:**
- `metrics`: EVMMetrics object

**Returns:** `HealthStatus` object containing:
- `score`: 0-100 health score
- `status`: "healthy" | "warning" | "critical"
- `indicators`: Array of health indicators

**Health Status Criteria:**
- **Healthy** (70-100): CPI >= 0.95, SPI >= 0.95
- **Warning** (50-69): CPI 0.85-0.94 or SPI 0.85-0.94
- **Critical** (<50): CPI < 0.85 or SPI < 0.85

## Usage Examples

### Basic EVM Calculation

```typescript
import { google } from 'googleapis';
import { performEVMCalculation } from './evm/calculations.js';

const sheets = google.sheets('v4');
const spreadsheetId = 'your-spreadsheet-id';
const programId = 'PROG-001';

const result = await performEVMCalculation(
  sheets,
  spreadsheetId,
  programId,
  new Date('2024-12-31')
);

console.log('PV:', result.pv);
console.log('EV:', result.ev);
console.log('AC:', result.ac);
console.log('BAC:', result.bac);
console.log('CPI:', result.metrics.cpi);
console.log('SPI:', result.metrics.spi);
console.log('EAC:', result.metrics.eac);
```

### Health Assessment

```typescript
import { calculateEVMMetrics, calculateHealthIndex } from './evm/calculations.js';

const metrics = calculateEVMMetrics(100000, 110000, 95000, 200000);
const health = calculateHealthIndex(metrics);

console.log(`Health Score: ${health.score}/100`);
console.log(`Status: ${health.status}`);
console.log('Indicators:');
health.indicators.forEach(ind => console.log(`  - ${ind}`));
```

### Individual Metric Calculations

```typescript
import {
  calculatePV,
  calculateEV,
  calculateAC,
  calculateBAC
} from './evm/calculations.js';

const pv = await calculatePV(sheets, spreadsheetId, programId);
const ev = await calculateEV(sheets, spreadsheetId, programId);
const ac = await calculateAC(sheets, spreadsheetId, programId);
const bac = await calculateBAC(sheets, spreadsheetId, programId);

console.log('Planned Value:', pv);
console.log('Earned Value:', ev);
console.log('Actual Cost:', ac);
console.log('Budget at Completion:', bac);
```

## Interpreting Results

### Example 1: Healthy Project

**Inputs:**
- PV: $100,000
- EV: $110,000
- AC: $95,000
- BAC: $200,000

**Results:**
- CV: $15,000 (under budget)
- SV: $10,000 (ahead of schedule)
- CPI: 1.16 (excellent cost performance)
- SPI: 1.10 (excellent schedule performance)
- EAC: $172,727 (projected under budget)
- VAC: $27,273 (expected savings)
- TCPI: 0.86 (can maintain current performance)

**Interpretation:** Project is performing excellently, both under budget and ahead of schedule.

### Example 2: Troubled Project

**Inputs:**
- PV: $100,000
- EV: $80,000
- AC: $110,000
- BAC: $200,000

**Results:**
- CV: -$30,000 (over budget)
- SV: -$20,000 (behind schedule)
- CPI: 0.73 (poor cost performance)
- SPI: 0.80 (poor schedule performance)
- EAC: $275,000 (projected over budget)
- VAC: -$75,000 (expected overrun)
- TCPI: 1.33 (need significant improvement)

**Interpretation:** Project is in trouble, requiring immediate corrective action.

## Implementation Notes

### Phase 5 Integration (Week 17)

The following functions currently use placeholder data and will be enhanced in Phase 5:

- `calculatePV()`: Will integrate with Program server for schedule baseline
- `calculateEV()`: Will integrate with Deliverables server for actual progress

These placeholders allow the module to be tested and used immediately while maintaining clean interfaces for future integration.

### Edge Cases

All calculations handle edge cases properly:
- **Division by zero**: Returns 0 for indices when divisor is 0
- **Negative values**: Properly handles cost overruns and schedule delays
- **Exhausted budget**: Correctly calculates TCPI when remaining budget is 0

### Precision

All monetary values are rounded to 2 decimal places, and performance indices are rounded to 4 decimal places for precision.

## References

- PMI Project Management Body of Knowledge (PMBOK® Guide)
- PMI Practice Standard for Earned Value Management
- ANSI/EIA-748 Earned Value Management Systems Standard
