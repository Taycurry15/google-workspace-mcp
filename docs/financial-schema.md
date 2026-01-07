# Financial Management Google Sheets Schema

## Overview

This document defines the Google Sheets structure for the mcp-financial server.

**Spreadsheet ID Environment Variable:** `FINANCIAL_SPREADSHEET_ID`

**Server Port:** 3005

**Cross-Server Dependencies:**
- Links to Program server (programId, schedule for PV)
- Links to Deliverables server (% complete for EV)
- Links to Subcontract server (invoices for AC)
- Links to Compliance server (risk financial impact)

---

## Sheet 1: Budgets

**Purpose:** Track budget allocations and spending

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | budgetId | string | Unique budget ID | BUD-001 |
| B | programId | string | Program ID (FK) | PROG-001 |
| C | projectId | string | Project ID (optional) | PROJ-001 |
| D | name | string | Budget name | Phase 1 Labor |
| E | description | string | Budget description | Engineering labor for... |
| F | category | string | Budget category | labor |
| G | status | string | Budget status | active |
| H | allocated | number | Allocated amount | 500000 |
| I | committed | number | Committed amount | 200000 |
| J | spent | number | Spent amount | 150000 |
| K | remaining | number | Remaining amount | 350000 |
| L | fiscalYear | string | Fiscal year | FY2024 |
| M | periodStart | date | Period start | 2024-01-01 |
| N | periodEnd | date | Period end | 2024-12-31 |
| O | variance | number | Variance (allocated - spent) | 350000 |
| P | variancePercent | number | Variance % | 70 |
| Q | requestedBy | string | Requested by | pm@example.com |
| R | approvedBy | string | Approved by | director@example.com |
| S | approvedDate | date | Approved date | 2023-12-01 |
| T | currency | string | Currency | USD |
| U | createdDate | date | Created date | 2023-11-15 |
| V | createdBy | string | Created by | pm@example.com |
| W | lastModified | date | Last modified | 2024-01-15 |
| X | notes | string | Notes | Approved with conditions... |

### Data Validation

- **budgetId:** Must be unique, format BUD-XXX
- **programId:** Must exist in mcp-program server
- **category:** Enum [labor, materials, equipment, subcontracts, travel, indirect, contingency, other]
- **status:** Enum [draft, submitted, approved, active, closed]
- **allocated, committed, spent, remaining:** Numbers
- **remaining:** Must equal allocated - spent

### Cross-References

- programId → mcp-program.Programs.programId
- projectId → mcp-program.Projects.projectId (if applicable)

---

## Sheet 2: Budget Line Items

**Purpose:** Detailed breakdown of budgets

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | lineItemId | string | Unique line item ID | BLI-001 |
| B | budgetId | string | Budget ID (FK) | BUD-001 |
| C | lineNumber | number | Line number | 1 |
| D | description | string | Line description | Senior Engineer (5 FTE) |
| E | category | string | Budget category | labor |
| F | allocated | number | Allocated amount | 100000 |
| G | spent | number | Spent amount | 25000 |
| H | remaining | number | Remaining amount | 75000 |
| I | costCenterId | string | Cost center ID (FK) | CC-001 |
| J | accountCode | string | GL account code | 5010-100 |
| K | justification | string | Justification | Required for design phase |
| L | assumptions | string | Assumptions | 5 FTE @ $200/hr |

### Data Validation

- **lineItemId:** Must be unique, format BLI-XXX
- **budgetId:** Must exist in Budgets sheet
- **category:** Same enum as Budgets.category
- **remaining:** Must equal allocated - spent
- **costCenterId:** Must exist in Cost Centers sheet (if provided)

### Cross-References

- budgetId → Budgets.budgetId
- costCenterId → Cost Centers.costCenterId

---

## Sheet 3: Cost Centers

**Purpose:** Organizational cost tracking units

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | costCenterId | string | Unique cost center ID | CC-001 |
| B | programId | string | Program ID (FK) | PROG-001 |
| C | name | string | Cost center name | Engineering |
| D | code | string | Cost center code | CC-ENGG |
| E | description | string | Description | Engineering department |
| F | parentCostCenterId | string | Parent CC ID (FK) | null |
| G | totalBudget | number | Total budget | 1000000 |
| H | totalSpent | number | Total spent | 250000 |
| I | managerId | string | Manager ID | mgr@example.com |
| J | managerName | string | Manager name | John Manager |
| K | isActive | boolean | Is active | TRUE |
| L | createdDate | date | Created date | 2024-01-01 |
| M | lastModified | date | Last modified | 2024-01-15 |

### Data Validation

- **costCenterId:** Must be unique, format CC-XXX
- **programId:** Must exist in mcp-program server
- **parentCostCenterId:** Must exist in Cost Centers sheet (if provided)
- **isActive:** Boolean

### Cross-References

- programId → mcp-program.Programs.programId
- parentCostCenterId → Cost Centers.costCenterId

---

## Sheet 4: EVM Snapshots

**Purpose:** Earned Value Management periodic snapshots

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | snapshotId | string | Unique snapshot ID | EVM-001 |
| B | programId | string | Program ID (FK) | PROG-001 |
| C | projectId | string | Project ID (optional) | PROJ-001 |
| D | snapshotDate | date | Snapshot date | 2024-01-31 |
| E | reportingPeriod | string | Reporting period | 2024-Q1 |
| F | pv | number | Planned Value (BCWS) | 500000 |
| G | ev | number | Earned Value (BCWP) | 450000 |
| H | ac | number | Actual Cost (ACWP) | 480000 |
| I | sv | number | Schedule Variance (EV - PV) | -50000 |
| J | cv | number | Cost Variance (EV - AC) | -30000 |
| K | svPercent | number | SV % | -10.0 |
| L | cvPercent | number | CV % | -6.25 |
| M | spi | number | Schedule Performance Index | 0.90 |
| N | cpi | number | Cost Performance Index | 0.9375 |
| O | bac | number | Budget at Completion | 2000000 |
| P | eac | number | Estimate at Completion | 2133333 |
| Q | etc | number | Estimate to Complete | 1653333 |
| R | vac | number | Variance at Completion | -133333 |
| S | tcpi | number | To-Complete Perf Index | 1.087 |
| T | percentComplete | number | Physical % complete | 22.5 |
| U | percentScheduleComplete | number | Planned % complete | 25.0 |
| V | trend | string | Trend | declining |
| W | calculatedBy | string | Calculated by | system |
| X | calculatedDate | date | Calculated date | 2024-02-01 |
| Y | notes | string | Notes | Behind schedule and budget |

### Data Validation

- **snapshotId:** Must be unique, format EVM-XXX
- **programId:** Must exist in mcp-program server
- **trend:** Enum [improving, stable, declining]
- **sv:** Must equal ev - pv
- **cv:** Must equal ev - ac
- **spi:** Must equal ev / pv (if pv > 0)
- **cpi:** Must equal ev / ac (if ac > 0)
- **eac:** Calculated using BAC / CPI
- **etc:** Must equal eac - ac
- **vac:** Must equal bac - eac

### EVM Formulas

- **SV (Schedule Variance):** EV - PV
- **CV (Cost Variance):** EV - AC
- **SV%:** (SV / PV) × 100
- **CV%:** (CV / AC) × 100
- **SPI (Schedule Performance Index):** EV / PV
- **CPI (Cost Performance Index):** EV / AC
- **EAC (Estimate at Completion):** BAC / CPI (if current trend continues)
- **ETC (Estimate to Complete):** EAC - AC
- **VAC (Variance at Completion):** BAC - EAC
- **TCPI (To-Complete Performance Index):** (BAC - EV) / (BAC - AC)

### Cross-References

- programId → mcp-program.Programs.programId
- projectId → mcp-program.Projects.projectId (if applicable)

**Data Sources for EVM:**
- **PV (Planned Value):** Calculated from mcp-program schedule baseline
- **EV (Earned Value):** Calculated from mcp-deliverables % complete
- **AC (Actual Cost):** Calculated from mcp-subcontract invoices + transactions

---

## Sheet 5: Cash Flow

**Purpose:** Track cash inflows and outflows

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | flowId | string | Unique flow ID | CF-001 |
| B | programId | string | Program ID (FK) | PROG-001 |
| C | type | string | Flow type | outflow |
| D | category | string | Flow category | vendor_payment |
| E | description | string | Description | Payment to Acme Eng |
| F | amount | number | Amount | 10000 |
| G | currency | string | Currency | USD |
| H | forecastDate | date | Forecast date | 2024-02-15 |
| I | actualDate | date | Actual date | 2024-02-15 |
| J | status | string | Status | completed |
| K | invoiceId | string | Invoice ID (FK) | INV-001 |
| L | contractId | string | Contract ID (FK) | CONT-001 |
| M | budgetId | string | Budget ID (FK) | BUD-001 |
| N | paymentMethod | string | Payment method | Wire Transfer |
| O | paymentReference | string | Payment reference | WT-12345 |
| P | createdDate | date | Created date | 2024-01-15 |
| Q | createdBy | string | Created by | finance@example.com |
| R | lastModified | date | Last modified | 2024-02-15 |
| S | notes | string | Notes | Monthly payment |

### Data Validation

- **flowId:** Must be unique, format CF-XXX
- **programId:** Must exist in mcp-program server
- **type:** Enum [inflow, outflow]
- **category:** Enum [client_payment, milestone_payment, vendor_payment, payroll, invoice_payment, expense_reimbursement, other]
- **status:** Enum [forecasted, scheduled, pending, completed, cancelled]
- **invoiceId:** Must exist in mcp-subcontract.Invoices (if provided)
- **contractId:** Must exist in mcp-subcontract.Contracts (if provided)
- **budgetId:** Must exist in Budgets sheet (if provided)

### Cross-References

- programId → mcp-program.Programs.programId
- invoiceId → mcp-subcontract.Invoices.invoiceId
- contractId → mcp-subcontract.Contracts.contractId
- budgetId → Budgets.budgetId

---

## Sheet 6: Financial Transactions

**Purpose:** Detailed record of all financial transactions

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | transactionId | string | Unique transaction ID | TXN-001 |
| B | programId | string | Program ID (FK) | PROG-001 |
| C | transactionDate | date | Transaction date | 2024-01-15 |
| D | postingDate | date | Posting date | 2024-01-16 |
| E | description | string | Description | Invoice payment |
| F | debit | number | Debit amount | 10000 |
| G | credit | number | Credit amount | 0 |
| H | amount | number | Net amount | 10000 |
| I | category | string | Budget category | subcontracts |
| J | costCenterId | string | Cost center ID (FK) | CC-001 |
| K | accountCode | string | GL account code | 6000-200 |
| L | budgetId | string | Budget ID (FK) | BUD-001 |
| M | invoiceId | string | Invoice ID (FK) | INV-001 |
| N | contractId | string | Contract ID (FK) | CONT-001 |
| O | isReconciled | boolean | Is reconciled | TRUE |
| P | reconciledDate | date | Reconciled date | 2024-01-20 |
| Q | reconciledBy | string | Reconciled by | finance@example.com |
| R | approvedBy | string | Approved by | director@example.com |
| S | approvedDate | date | Approved date | 2024-01-15 |
| T | enteredBy | string | Entered by | finance@example.com |
| U | enteredDate | date | Entered date | 2024-01-16 |
| V | currency | string | Currency | USD |
| W | notes | string | Notes | Regular payment |

### Data Validation

- **transactionId:** Must be unique, format TXN-XXX
- **programId:** Must exist in mcp-program server
- **category:** Same enum as Budgets.category
- **amount:** Must equal debit - credit
- **isReconciled:** Boolean
- **budgetId:** Must exist in Budgets sheet (if provided)
- **costCenterId:** Must exist in Cost Centers sheet (if provided)
- **invoiceId:** Must exist in mcp-subcontract.Invoices (if provided)
- **contractId:** Must exist in mcp-subcontract.Contracts (if provided)

### Cross-References

- programId → mcp-program.Programs.programId
- budgetId → Budgets.budgetId
- costCenterId → Cost Centers.costCenterId
- invoiceId → mcp-subcontract.Invoices.invoiceId
- contractId → mcp-subcontract.Contracts.contractId

---

## Sheet 7: Financial Reports

**Purpose:** Store generated financial reports

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | reportId | string | Unique report ID | REP-001 |
| B | programId | string | Program ID (FK) | PROG-001 |
| C | reportType | string | Report type | evm_analysis |
| D | title | string | Report title | Q1 2024 EVM Analysis |
| E | description | string | Report description | Comprehensive EVM... |
| F | periodStart | date | Period start | 2024-01-01 |
| G | periodEnd | date | Period end | 2024-03-31 |
| H | reportingDate | date | Reporting date | 2024-04-05 |
| I | status | string | Report status | published |
| J | data | string | Report data (JSON) | {...} |
| K | summaryTotalBudget | number | Summary: Total budget | 2000000 |
| L | summaryTotalSpent | number | Summary: Total spent | 500000 |
| M | summaryTotalVariance | number | Summary: Total variance | 1500000 |
| N | summaryCPI | number | Summary: CPI | 0.95 |
| O | summarySPI | number | Summary: SPI | 0.92 |
| P | summaryBurnRate | number | Summary: Burn rate | 166667 |
| Q | summaryRunway | number | Summary: Runway (months) | 9 |
| R | documentUrl | string | Document URL | https://drive.google... |
| S | chartUrls | string | Chart URLs (JSON array) | ["https://..."] |
| T | generatedBy | string | Generated by | system |
| U | generatedDate | date | Generated date | 2024-04-05 |
| V | reviewedBy | string | Reviewed by | pm@example.com |
| W | reviewedDate | date | Reviewed date | 2024-04-06 |
| X | approvedBy | string | Approved by | director@example.com |
| Y | approvedDate | date | Approved date | 2024-04-07 |
| Z | distributedTo | string | Distributed to (JSON) | ["user1@...","user2@..."] |
| AA | distributedDate | date | Distributed date | 2024-04-08 |
| AB | notes | string | Notes | Quarterly report |

### Data Validation

- **reportId:** Must be unique, format REP-XXX
- **programId:** Must exist in mcp-program server
- **reportType:** Enum [budget_vs_actual, evm_analysis, cash_flow_statement, variance_report, cost_center_report, executive_summary, forecast_report]
- **status:** Enum [draft, in_review, approved, published]

### Cross-References

- programId → mcp-program.Programs.programId

---

## Sheet 8: Burn Rate Analysis

**Purpose:** Track spending rate over time

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | analysisId | string | Unique analysis ID | BRA-001 |
| B | programId | string | Program ID (FK) | PROG-001 |
| C | periodStart | date | Period start | 2024-01-01 |
| D | periodEnd | date | Period end | 2024-03-31 |
| E | totalBudget | number | Total budget | 2000000 |
| F | totalSpent | number | Total spent | 500000 |
| G | averageDailyBurn | number | Avg daily burn | 5556 |
| H | averageWeeklyBurn | number | Avg weekly burn | 38889 |
| I | averageMonthlyBurn | number | Avg monthly burn | 166667 |
| J | projectedCompletionDate | date | Projected completion | 2025-12-31 |
| K | projectedFinalCost | number | Projected final cost | 2100000 |
| L | runwayMonths | number | Runway (months) | 9 |
| M | runwayWeeks | number | Runway (weeks) | 39 |
| N | trend | string | Trend | stable |
| O | trendPercentChange | number | Trend % change | -2.5 |
| P | recommendations | string | Recommendations (JSON) | ["Monitor closely"] |
| Q | warnings | string | Warnings (JSON array) | ["Accelerating burn"] |
| R | analyzedBy | string | Analyzed by | system |
| S | analyzedDate | date | Analyzed date | 2024-04-01 |

### Data Validation

- **analysisId:** Must be unique, format BRA-XXX
- **programId:** Must exist in mcp-program server
- **trend:** Enum [accelerating, stable, decelerating]
- **runwayMonths:** Calculated as remaining budget / average monthly burn

### Cross-References

- programId → mcp-program.Programs.programId

---

## Sheet 9: Variance Analysis

**Purpose:** Detailed analysis of budget variances

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | varianceId | string | Unique variance ID | VAR-001 |
| B | programId | string | Program ID (FK) | PROG-001 |
| C | budgetId | string | Budget ID (FK) | BUD-001 |
| D | periodStart | date | Period start | 2024-01-01 |
| E | periodEnd | date | Period end | 2024-03-31 |
| F | budgeted | number | Budgeted amount | 100000 |
| G | actual | number | Actual amount | 120000 |
| H | variance | number | Variance | -20000 |
| I | variancePercent | number | Variance % | -20.0 |
| J | varianceType | string | Variance type | unfavorable |
| K | category | string | Budget category | labor |
| L | rootCause | string | Root cause | Overtime required |
| M | explanation | string | Explanation | Schedule delays... |
| N | impact | string | Impact level | high |
| O | correctiveActions | string | Corrective actions (JSON) | ["Hire contractors"] |
| P | responsibleParty | string | Responsible party | pm@example.com |
| Q | dueDate | date | Due date | 2024-04-30 |
| R | status | string | Status | action_taken |
| S | identifiedBy | string | Identified by | finance@example.com |
| T | identifiedDate | date | Identified date | 2024-04-01 |
| U | resolvedDate | date | Resolved date | 2024-04-15 |

### Data Validation

- **varianceId:** Must be unique, format VAR-XXX
- **programId:** Must exist in mcp-program server
- **budgetId:** Must exist in Budgets sheet (if provided)
- **variance:** Must equal budgeted - actual
- **varianceType:** Enum [favorable, unfavorable]
- **category:** Same enum as Budgets.category
- **impact:** Enum [low, medium, high]
- **status:** Enum [identified, analyzing, action_taken, resolved]

### Cross-References

- programId → mcp-program.Programs.programId
- budgetId → Budgets.budgetId

---

## Sheet 10: Forecast Models

**Purpose:** Financial forecasting models and results

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | forecastId | string | Unique forecast ID | FCT-001 |
| B | programId | string | Program ID (FK) | PROG-001 |
| C | modelName | string | Model name | Q2 Forecast |
| D | modelType | string | Model type | linear |
| E | description | string | Description | Linear projection based... |
| F | forecastDate | date | Forecast date | 2024-04-01 |
| G | forecastHorizon | number | Forecast horizon (months) | 6 |
| H | baselineBudget | number | Baseline budget | 2000000 |
| I | currentSpent | number | Current spent | 500000 |
| J | currentCPI | number | Current CPI | 0.95 |
| K | currentSPI | number | Current SPI | 0.92 |
| L | forecastedEAC | number | Forecasted EAC | 2105263 |
| M | forecastedCompletionDate | date | Forecasted completion | 2025-12-31 |
| N | confidenceLevel | number | Confidence level (0-100) | 85 |
| O | optimisticCase | number | Optimistic EAC | 2000000 |
| P | pessimisticCase | number | Pessimistic EAC | 2300000 |
| Q | mostLikelyCase | number | Most likely EAC | 2105263 |
| R | assumptions | string | Assumptions (JSON array) | ["CPI remains stable"] |
| S | risks | string | Risks (JSON array) | ["Schedule delays"] |
| T | actualEAC | number | Actual EAC (if historical) | null |
| U | forecastAccuracy | number | Forecast accuracy % | null |
| V | createdBy | string | Created by | finance@example.com |
| W | createdDate | date | Created date | 2024-04-01 |
| X | lastUpdated | date | Last updated | 2024-04-01 |

### Data Validation

- **forecastId:** Must be unique, format FCT-XXX
- **programId:** Must exist in mcp-program server
- **modelType:** Enum [linear, monte_carlo, regression, manual]
- **confidenceLevel:** 0-100
- **forecastedEAC:** Typically calculated as baselineBudget / currentCPI

### Cross-References

- programId → mcp-program.Programs.programId

---

## Sheet 11: Payment Schedules

**Purpose:** Track expected payment schedules

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | scheduleId | string | Unique schedule ID | PS-001 |
| B | programId | string | Program ID (FK) | PROG-001 |
| C | entityType | string | Entity type | vendor |
| D | entityId | string | Entity ID | VEND-001 |
| E | contractId | string | Contract ID (FK) | CONT-001 |
| F | description | string | Description | Monthly payments |
| G | totalAmount | number | Total amount | 500000 |
| H | currency | string | Currency | USD |
| I | frequency | string | Frequency | monthly |
| J | startDate | date | Start date | 2024-01-01 |
| K | endDate | date | End date | 2024-12-31 |
| L | milestones | string | Milestones (JSON array) | [{...},{...}] |
| M | isActive | boolean | Is active | TRUE |
| N | totalPaid | number | Total paid | 100000 |
| O | totalRemaining | number | Total remaining | 400000 |
| P | createdBy | string | Created by | pm@example.com |
| Q | createdDate | date | Created date | 2024-01-01 |
| R | lastModified | date | Last modified | 2024-02-01 |
| S | notes | string | Notes | Net 30 terms |

### Data Validation

- **scheduleId:** Must be unique, format PS-XXX
- **programId:** Must exist in mcp-program server
- **entityType:** Enum [vendor, client, internal]
- **contractId:** Must exist in mcp-subcontract.Contracts (if provided)
- **frequency:** Enum [one_time, weekly, monthly, quarterly, milestone_based]
- **isActive:** Boolean
- **totalRemaining:** Must equal totalAmount - totalPaid

### Cross-References

- programId → mcp-program.Programs.programId
- entityId → Vendor ID, Client ID, etc. depending on entityType
- contractId → mcp-subcontract.Contracts.contractId

---

## Summary

### Spreadsheet Structure

```
FINANCIAL_SPREADSHEET_ID
├── Budgets                (10 entities)
├── Budget Line Items       (40 entities)
├── Cost Centers            (5 entities)
├── EVM Snapshots          (12 entities - monthly)
├── Cash Flow              (50 entities)
├── Financial Transactions (200 entities)
├── Financial Reports       (12 entities - monthly/quarterly)
├── Burn Rate Analysis      (4 entities - quarterly)
├── Variance Analysis       (8 entities)
├── Forecast Models         (3 entities)
└── Payment Schedules       (10 entities)
```

### ID Generation Patterns

- **Budgets:** BUD-001, BUD-002, BUD-003...
- **Budget Line Items:** BLI-001, BLI-002, BLI-003...
- **Cost Centers:** CC-001, CC-002, CC-003...
- **EVM Snapshots:** EVM-001, EVM-002, EVM-003...
- **Cash Flow:** CF-001, CF-002, CF-003...
- **Financial Transactions:** TXN-001, TXN-002, TXN-003...
- **Financial Reports:** REP-001, REP-002, REP-003...
- **Burn Rate Analysis:** BRA-001, BRA-002, BRA-003...
- **Variance Analysis:** VAR-001, VAR-002, VAR-003...
- **Forecast Models:** FCT-001, FCT-002, FCT-003...
- **Payment Schedules:** PS-001, PS-002, PS-003...

### Cross-Server References

**To Program Server (mcp-program):**
- All sheets.programId → Programs.programId
- EVM.pv calculation → Schedule baseline from Program server

**To Deliverables Server (mcp-deliverables):**
- EVM.ev calculation → % complete from Deliverables server

**To Subcontract Server (mcp-subcontract):**
- Cash Flow.invoiceId → Invoices.invoiceId
- Cash Flow.contractId → Contracts.contractId
- Financial Transactions.invoiceId → Invoices.invoiceId
- Financial Transactions.contractId → Contracts.contractId
- EVM.ac calculation → Invoice totals from Subcontract server
- Payment Schedules.contractId → Contracts.contractId

**To Compliance Server (mcp-compliance):**
- Risk financial impact → Budget allocation for contingency
- Variance Analysis → Risk assessment for budget overruns

### EVM Data Flow

**Calculating EVM Metrics (Cross-Server Integration):**

1. **PV (Planned Value):**
   - Source: mcp-program schedule baseline
   - Query: Get all scheduled activities with planned costs
   - Aggregate by period

2. **EV (Earned Value):**
   - Source: mcp-deliverables % complete
   - Query: Get all deliverables with % complete
   - Calculate: deliverable.budgetedCost × deliverable.percentComplete
   - Aggregate by period

3. **AC (Actual Cost):**
   - Source: mcp-subcontract invoices + Financial Transactions
   - Query: Get all approved/paid invoices
   - Aggregate by period

4. **Derived Metrics:**
   - SV = EV - PV
   - CV = EV - AC
   - SPI = EV / PV
   - CPI = EV / AC
   - EAC = BAC / CPI
   - ETC = EAC - AC
   - VAC = BAC - EAC

### Access Patterns

**Common Queries:**
1. Get budget status for a program
2. Get latest EVM snapshot
3. Get cash flow forecast for next 3 months
4. Get burn rate analysis
5. Get budget vs actual variance
6. Get all transactions for a budget
7. Get unpaid obligations
8. Generate monthly financial report

**Write Patterns:**
1. Create/allocate budget
2. Record financial transaction
3. Calculate and store EVM snapshot
4. Record cash flow event
5. Create variance analysis
6. Generate financial report
7. Update burn rate analysis

### Automated Calculations

**Daily:**
- Update remaining budget amounts
- Calculate daily burn rate
- Update cash runway

**Weekly:**
- EVM snapshot calculation
- Burn rate trend analysis
- Variance identification

**Monthly:**
- Comprehensive EVM analysis
- Monthly financial reports
- Forecast model updates
- Variance analysis reviews

**Quarterly:**
- Executive financial summaries
- Long-term forecast updates
- Performance trend analysis
