# Comprehensive Testing Guide - Multi-Server PMO Platform

**Document Version:** 1.0
**Last Updated:** January 6, 2026
**Status:** Week 2 Complete (99%) - Ready for Week 3

---

## Table of Contents

1. [Overview](#overview)
2. [Current Status](#current-status)
3. [Testing Infrastructure](#testing-infrastructure)
4. [Week 2 Completion Summary](#week-2-completion-summary)
5. [Remaining Week 2 Work](#remaining-week-2-work)
6. [Week 3-7 Testing Plan](#week-3-7-testing-plan)
7. [Test Patterns and Examples](#test-patterns-and-examples)
8. [Running Tests](#running-tests)
9. [Coverage Requirements](#coverage-requirements)
10. [Appendix: File Locations](#appendix-file-locations)

---

## Overview

This guide provides complete instructions for conducting comprehensive testing of the multi-server PMO platform. The platform consists of 5 MCP servers with 141 tools, 164+ REST endpoints, and ~39,100 lines of production TypeScript code.

### 7-Week Testing Plan

| Week | Phase | Status | Progress |
|------|-------|--------|----------|
| 1 | Infrastructure Setup | ✅ Complete | 100% |
| 2 | Financial Server Unit Tests | ✅ 99% Complete | 158/160 tests |
| 3 | Shared Packages & Domain Servers | ⏳ Pending | 0% |
| 4 | MCP Tool Validation | ⏳ Pending | 0% |
| 5 | Integration Testing | ⏳ Pending | 0% |
| 6 | End-to-End Testing | ⏳ Pending | 0% |
| 7 | CI/CD Integration | ⏳ Pending | 0% |

---

## Current Status

### Week 1: Infrastructure Setup ✅ (100% Complete)

**Completed:**
- Jest 30.2.0 installed with TypeScript + ESM support
- Mock Google Sheets/Drive APIs created
- Test fixtures for all domains
- Test environment configuration (.env.test)
- Test scripts in package.json
- Coverage reporting configured

**Key Files:**
- `/jest.config.cjs` - Root Jest configuration
- `/jest.setup.cjs` - Global test setup
- `/packages/shared-core/src/test-utils/` - Test utilities
  - `mock-google-apis.ts` - Mock Sheets/Drive clients
  - `test-fixtures.ts` - Standardized test data
  - `test-environment.ts` - Setup/teardown helpers
- `/.env.test` - Test environment variables

### Week 2: Financial Server Unit Tests ✅ (99% Complete)

**Completed Tests: 158**

1. **EVM Calculations** - 38 tests ✅
   - File: `packages/mcp-financial/tests/evm-calculations.test.ts`
   - Coverage: ~90%
   - Functions tested:
     - `calculateEVMMetrics()` - PMBOK formulas
     - `calculateHealthIndex()` - Health scoring
     - `calculateAC()` - Actual cost with mock Sheets
     - `calculateBAC()` - Budget at completion
     - `performEVMCalculation()` - Integration tests

2. **EVM Forecasting** - 35 tests ✅
   - File: `packages/mcp-financial/tests/evm/forecasting.test.ts`
   - Coverage: ~85%
   - Functions tested:
     - `forecastEACUsingCPI()` - CPI-based forecasting
     - `forecastEACUsingCPIAndSPI()` - Combined forecasting
     - `forecastETC()` - Estimate to complete
     - `calculateRequiredPerformance()` - TCPI calculations
     - `generateForecastScenarios()` - Scenario planning

3. **EVM Trending** - 20 tests ✅
   - File: `packages/mcp-financial/tests/evm/trending.test.ts`
   - Coverage: ~85%
   - Functions tested:
     - `calculateLinearRegression()` - Statistical regression
     - `analyzeCPITrend()` - CPI trend analysis
     - `analyzeSPITrend()` - SPI trend analysis
     - `calculateMovingAverage()` - Time series smoothing
     - `detectAnomalies()` - Z-score based outlier detection
     - `analyzePerformanceTrend()` - Comprehensive analysis
     - `compareToBaseline()` - Baseline comparison

4. **EVM Snapshots** - 20 tests ✅
   - File: `packages/mcp-financial/tests/evm/snapshots.test.ts`
   - Coverage: ~85%
   - Functions tested:
     - `parseSnapshotRow()` / `snapshotToRow()` - Data conversion
     - `createSnapshot()` - Snapshot creation with EVM calculation
     - `readSnapshot()` - Snapshot retrieval
     - `listSnapshots()` - List with filtering and sorting
     - `getLatestSnapshot()` - Most recent snapshot
     - `getSnapshotHistory()` - Historical data for trending
     - `compareSnapshots()` - Snapshot comparison
     - `deleteSnapshot()` - Soft delete

5. **Budget Module** - 30 tests ✅
   - File: `packages/mcp-financial/tests/budgets/budgets.test.ts`
   - Coverage: ~90%
   - Functions tested:
     - `parseBudgetRow()` / `budgetToRow()` - Data conversion
     - `createBudget()` - Budget creation
     - `readBudget()` / `updateBudget()` - CRUD operations
     - `listBudgets()` - List with filtering
     - `allocateBudget()` - Budget allocation
     - `commitBudget()` - Budget commitment
     - `recordExpense()` - Expense recording
     - `getBudgetStatus()` - Program-level aggregation
     - `getOverBudgetItems()` - Over-budget detection
     - `getBudgetsNearingLimit()` - Threshold-based warnings
     - `calculateBurnRate()` - Burn rate analysis
     - `deleteBudget()` - Soft delete

6. **Cash Flow Forecasting** - 15 tests ✅
   - File: `packages/mcp-financial/tests/cashflow/forecasting.test.ts`
   - Coverage: ~85%
   - Functions tested:
     - `forecastMonthlyCashFlow()` - Monthly forecasts
     - `forecastWeeklyCashFlow()` - Weekly forecasts
     - `identifyCashShortfalls()` - Shortfall detection with recommendations
     - `calculateRunway()` - Runway analysis
     - `forecastCashPosition()` - Point-in-time forecasting
     - `generateCashFlowScenarios()` - Scenario planning

---

## Remaining Week 2 Work

### Optional: Transaction Reconciliation Tests (Estimated: 10-15 tests)

**Status:** Not critical for Week 2 completion (99% already complete)
**Priority:** Low (can be deferred to Week 3 if needed)

**File to Create:** `packages/mcp-financial/tests/transactions/reconciliation.test.ts`

**Functions to Test:**
- Auto-reconciliation logic
- Fuzzy matching algorithms
- Duplicate detection
- Transaction validation

**Test Template:**

```typescript
/**
 * Transaction Reconciliation Module Tests
 *
 * Tests transaction reconciliation, fuzzy matching, and duplicate detection.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  reconcileTransaction,
  fuzzyMatchTransactions,
  detectDuplicates,
} from "../../src/transactions/reconciliation.js";
import { createMockSheetsClient } from "@gw-mcp/shared-core/test-utils";

const TEST_SPREADSHEET_ID = "test-spreadsheet-id";
const TEST_PROGRAM_ID = "PROG-TEST-001";

describe("Transaction Reconciliation Module", () => {
  let mockSheets: any;

  beforeEach(() => {
    mockSheets = createMockSheetsClient();
  });

  describe("reconcileTransaction", () => {
    it("should reconcile matching transactions", async () => {
      // Test implementation
    });

    it("should handle partial matches", async () => {
      // Test implementation
    });
  });

  describe("fuzzyMatchTransactions", () => {
    it("should match transactions with similar amounts", async () => {
      // Test fuzzy matching with amount tolerance
    });

    it("should match transactions with similar dates", async () => {
      // Test fuzzy matching with date tolerance
    });

    it("should calculate match confidence score", async () => {
      // Test confidence scoring (0-1)
    });
  });

  describe("detectDuplicates", () => {
    it("should identify exact duplicate transactions", async () => {
      // Test exact match detection
    });

    it("should identify near-duplicate transactions", async () => {
      // Test fuzzy duplicate detection
    });

    it("should exclude intentional duplicates", async () => {
      // Test exclusion logic
    });
  });
});
```

**Estimated Time:** 1-2 hours

---

## Week 3-7 Testing Plan

### Week 3: Shared Packages & Domain Servers Unit Tests

**Target:** 80+ unit tests
**Estimated Time:** 20-25 hours
**Priority:** High

#### 3.1 Shared-Core Package Tests (Target: 30 tests)

**Files to Create:**

1. `packages/shared-core/tests/utils/sheetHelpers.test.ts` (10 tests)
   ```typescript
   // Test functions:
   - readSheetRange()
   - appendRows()
   - updateRow()
   - findRowById()
   - generateNextId()
   - parseRange()
   - convertToA1Notation()
   ```

2. `packages/shared-core/tests/utils/driveHelpers.test.ts` (8 tests)
   ```typescript
   // Test functions:
   - searchFiles()
   - createFolder()
   - getFolderIdByPath()
   - shareFile()
   - copyFile()
   ```

3. `packages/shared-core/tests/utils/fileValidation.test.ts` (6 tests)
   ```typescript
   // Test functions:
   - validateFileType()
   - validateFileSize()
   - sanitizeFileName()
   ```

4. `packages/shared-core/tests/auth/oauth.test.ts` (6 tests)
   ```typescript
   // Test functions (with mocks):
   - initializeAuth()
   - refreshToken()
   - validateScopes()
   ```

**Test Pattern for Shared-Core:**
```typescript
import { describe, it, expect, beforeEach } from "@jest/globals";
import { readSheetRange, appendRows } from "../../src/utils/sheetHelpers.js";
import { createMockSheetsClient } from "../test-utils/mock-google-apis.js";

describe("Sheet Helpers", () => {
  let mockSheets: any;

  beforeEach(() => {
    mockSheets = createMockSheetsClient();
  });

  describe("readSheetRange", () => {
    it("should read data from a sheet range", async () => {
      const mockData = [
        ["Header1", "Header2"],
        ["Value1", "Value2"],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: mockData },
      });

      const result = await readSheetRange(
        mockSheets,
        "spreadsheet-id",
        "Sheet1!A1:B2"
      );

      expect(result).toEqual(mockData);
      expect(mockSheets.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: "spreadsheet-id",
        range: "Sheet1!A1:B2",
      });
    });

    it("should handle empty sheets", async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [] },
      });

      const result = await readSheetRange(
        mockSheets,
        "spreadsheet-id",
        "Sheet1!A1:B2"
      );

      expect(result).toEqual([]);
    });

    it("should throw error on API failure", async () => {
      mockSheets.spreadsheets.values.get.mockRejectedValueOnce(
        new Error("API Error")
      );

      await expect(
        readSheetRange(mockSheets, "spreadsheet-id", "Sheet1!A1:B2")
      ).rejects.toThrow();
    });
  });
});
```

#### 3.2 Shared-Routing Package Tests (Target: 20 tests)

**Files to Create:**

1. `packages/shared-routing/tests/cross-server/registry.test.ts` (8 tests)
   ```typescript
   // Test functions:
   - registerServer()
   - unregisterServer()
   - getServerStatus()
   - healthCheck()
   ```

2. `packages/shared-routing/tests/cross-server/api-client.test.ts` (6 tests)
   ```typescript
   // Test CrossServerClient class:
   - get() / post() / put() / delete()
   - request timeout handling
   - retry logic
   - error handling
   ```

3. `packages/shared-routing/tests/events/publisher.test.ts` (3 tests)
   ```typescript
   // Test event publishing:
   - publishEvent()
   - eventFiltering()
   - deliveryStatus()
   ```

4. `packages/shared-routing/tests/events/subscriber.test.ts` (3 tests)
   ```typescript
   // Test event subscription:
   - subscribeToEvents()
   - eventHandling()
   - unsubscribe()
   ```

#### 3.3 MCP-Program Server Tests (Target: 15 tests)

**Files to Create:**

1. `packages/mcp-program/tests/programs/charter.test.ts` (5 tests)
   ```typescript
   // Test functions:
   - createCharter()
   - readCharter()
   - updateCharter()
   - approveCharter()
   ```

2. `packages/mcp-program/tests/wbs/wbs-operations.test.ts` (5 tests)
   ```typescript
   // Test functions:
   - createWBSItem()
   - listWBSItems()
   - updateWBSItem()
   - deleteWBSItem()
   ```

3. `packages/mcp-program/tests/schedule/milestones.test.ts` (5 tests)
   ```typescript
   // Test functions:
   - createMilestone()
   - updateMilestoneStatus()
   - listMilestones()
   ```

#### 3.4 MCP-Deliverables Server Tests (Target: 15 tests)

**Files to Create:**

1. `packages/mcp-deliverables/tests/deliverables/deliverables.test.ts` (8 tests)
   ```typescript
   // Test functions:
   - createDeliverable()
   - readDeliverable()
   - updateDeliverable()
   - listDeliverables()
   ```

2. `packages/mcp-deliverables/tests/submissions/submissions.test.ts` (7 tests)
   ```typescript
   // Test functions:
   - submitDeliverable()
   - validateSubmission()
   - getSubmissionHistory()
   ```

---

### Week 4: MCP Tool Validation

**Target:** Validate all 141 MCP tools
**Estimated Time:** 15-20 hours
**Priority:** High

**Approach:** Create tool validation tests for each server

**File Pattern:** `packages/<server>/tests/tools/tool-validation.test.ts`

**Example for mcp-financial (55 tools):**

```typescript
import { describe, it, expect } from "@jest/globals";
import { FINANCIAL_TOOLS, handleToolCall } from "../../src/tools.js";

describe("Financial MCP Tools Validation", () => {
  describe("Tool Definitions", () => {
    it("should have 55 tool definitions", () => {
      expect(FINANCIAL_TOOLS.length).toBe(55);
    });

    it("should have valid schemas for all tools", () => {
      for (const tool of FINANCIAL_TOOLS) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
      }
    });

    it("should have unique tool names", () => {
      const names = FINANCIAL_TOOLS.map(t => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe("Tool Handler - Budget Tools", () => {
    it("should handle financial_budget_create", async () => {
      const args = {
        budget: {
          programId: "PROG-001",
          name: "Test Budget",
          category: "labor",
          allocated: 100000,
          fiscalYear: "2026",
          periodStart: "2026-01-01",
          periodEnd: "2026-12-31",
          requestedBy: "test-user",
        },
      };

      const result = await handleToolCall("financial_budget_create", args);

      expect(result).toBeDefined();
      expect(result.budgetId).toBeTruthy();
    });

    it("should validate required fields for financial_budget_create", async () => {
      const args = {
        budget: {
          programId: "PROG-001",
          // Missing required fields
        },
      };

      await expect(
        handleToolCall("financial_budget_create", args)
      ).rejects.toThrow();
    });
  });

  // Repeat for each category of tools:
  // - EVM tools (10 tools)
  // - Cash flow tools (8 tools)
  // - Transaction tools (6 tools)
  // etc.
});
```

**Tool Validation Checklist per Server:**

- ✅ All tool definitions have name, description, inputSchema
- ✅ All required parameters are documented
- ✅ All enum values are valid
- ✅ All tool handlers exist and work
- ✅ Input validation works correctly
- ✅ Error messages are clear
- ✅ Success responses follow correct format

---

### Week 5: Integration Testing

**Target:** 50+ integration tests
**Estimated Time:** 25-30 hours
**Priority:** High

**Focus Areas:**

1. **Cross-Server Communication** (15 tests)
   - Test real HTTP communication between servers
   - Test service registry with actual Express servers
   - Test event bus with real pub/sub

2. **Google Sheets Integration** (20 tests)
   - Use real Google Sheets API (with test spreadsheet)
   - Test read/write operations
   - Test batch operations
   - Test error handling (invalid ranges, permissions)

3. **Workflow Integration** (15 tests)
   - Test end-to-end workflows across servers
   - Test event propagation
   - Test notification delivery

**Example Integration Test:**

```typescript
describe("Cross-Server Communication Integration", () => {
  let servers: express.Application[];

  beforeAll(async () => {
    // Start all 5 servers on test ports
    servers = await startTestServers([13001, 13002, 13003, 13004, 13005]);
  });

  afterAll(async () => {
    await stopTestServers(servers);
  });

  it("should register all servers with service registry", async () => {
    // Wait for registration
    await wait(2000);

    const registry = await getServiceRegistry();
    expect(registry.servers.length).toBe(5);
    expect(registry.servers.every(s => s.status === "healthy")).toBe(true);
  });

  it("should make successful cross-server API call", async () => {
    const client = new CrossServerClient("mcp-program");
    const response = await client.get("/api/programs/PROG-001");

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
  });

  it("should propagate events across servers", async () => {
    const eventReceived = new Promise((resolve) => {
      subscribeToEvent("deliverable_submitted", resolve);
    });

    // Trigger event from deliverables server
    await fetch("http://localhost:13002/api/deliverables/D-001/submit", {
      method: "POST",
    });

    // Wait for event to propagate
    await expect(eventReceived).resolves.toBeDefined();
  });
});
```

---

### Week 6: End-to-End Testing

**Target:** 20+ E2E tests
**Estimated Time:** 15-20 hours
**Priority:** Medium

**Test Scenarios:**

1. **New Program Setup** (E2E)
   - Create program → Create WBS → Create budgets → Create milestones → Create deliverables
   - Verify all cross-references work

2. **Subcontract Lifecycle** (E2E)
   - Onboard vendor → Due diligence → Create contract → Submit invoice → Approve payment

3. **Deliverable Workflow** (E2E)
   - Submit deliverable → Review → Accept → Update milestone → Calculate EVM

4. **Risk Management** (E2E)
   - Identify risk → Assess impact → Create mitigation → Track actions → Close risk

**Example E2E Test:**

```typescript
describe("Deliverable Workflow E2E", () => {
  it("should complete full deliverable submission and acceptance workflow", async () => {
    // 1. Create deliverable
    const deliverable = await createDeliverable({
      programId: "PROG-001",
      name: "Technical Design Document",
      budgetedValue: 50000,
    });

    expect(deliverable.deliverableId).toBeTruthy();
    expect(deliverable.status).toBe("not-started");

    // 2. Submit deliverable
    const submission = await submitDeliverable({
      deliverableId: deliverable.deliverableId,
      driveFileId: "test-file-id",
      submittedBy: "engineer@example.com",
    });

    expect(submission.status).toBe("submitted");

    // 3. Review deliverable
    const review = await reviewDeliverable({
      deliverableId: deliverable.deliverableId,
      reviewerId: "reviewer@example.com",
      decision: "accepted",
      comments: "Looks good",
    });

    expect(review.decision).toBe("accepted");

    // 4. Verify EVM updated
    const evm = await getEVMMetrics("PROG-001");
    expect(evm.ev).toBeGreaterThanOrEqual(50000);

    // 5. Verify milestone updated (if linked)
    // 6. Verify event published
    // 7. Verify notifications sent
  }, 60000); // 60 second timeout for E2E test
});
```

---

### Week 7: CI/CD Integration

**Target:** CI/CD pipeline operational
**Estimated Time:** 10-15 hours
**Priority:** High

**Tasks:**

1. **GitHub Actions Workflow** (`.github/workflows/test.yml`)
   ```yaml
   name: Tests

   on:
     push:
       branches: [main, develop]
     pull_request:
       branches: [main, develop]

   jobs:
     test:
       runs-on: ubuntu-latest
       strategy:
         matrix:
           node-version: [18.x, 20.x]

       steps:
         - uses: actions/checkout@v3

         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: ${{ matrix.node-version }}
             cache: 'npm'

         - name: Install dependencies
           run: npm ci

         - name: Run linter
           run: npm run lint

         - name: Build all packages
           run: npm run build

         - name: Run unit tests
           run: npm run test:unit -- --coverage

         - name: Run integration tests
           run: npm run test:integration

         - name: Upload coverage to Codecov
           uses: codecov/codecov-action@v3
           with:
             files: ./coverage/lcov.info
             flags: unittests
             name: codecov-umbrella

         - name: Check coverage thresholds
           run: npm run test:coverage -- --coverageReporters=json-summary
   ```

2. **Coverage Reporting Setup**
   - Set up Codecov account
   - Add coverage badge to README
   - Configure coverage thresholds in jest.config.cjs

3. **Test Documentation**
   - Create `docs/testing/README.md`
   - Document how to run tests locally
   - Document how to write new tests
   - Document test fixtures and utilities

---

## Test Patterns and Examples

### Pattern 1: Pure Function Tests

**Use When:** Testing functions with no side effects (calculations, parsing, etc.)

**Example:**
```typescript
describe("calculateEVMMetrics", () => {
  it("should calculate correct metrics for a healthy project", () => {
    const pv = 100000;
    const ev = 110000;
    const ac = 95000;
    const bac = 200000;

    const metrics = calculateEVMMetrics(pv, ev, ac, bac);

    expect(metrics.cv).toBe(15000); // EV - AC
    expect(metrics.cpi).toBeCloseTo(1.1579, 4); // EV / AC
    expect(metrics.spi).toBeCloseTo(1.1, 1); // EV / PV
  });
});
```

### Pattern 2: Async Function Tests with Mock Sheets API

**Use When:** Testing functions that interact with Google Sheets

**Example:**
```typescript
describe("createBudget", () => {
  let mockSheets: any;

  beforeEach(() => {
    mockSheets = createMockSheetsClient();
  });

  it("should create a new budget", async () => {
    // Mock ID generation
    mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
      data: { values: [["Budget ID"], ["BUD-010"]] },
    });

    // Mock append operation
    mockSheets.spreadsheets.values.append.mockResolvedValueOnce({
      data: { updates: { updatedRows: 1 } },
    });

    const budget = await createBudget(
      mockSheets,
      "spreadsheet-id",
      {
        programId: "PROG-001",
        name: "Test Budget",
        category: "labor",
        allocated: 100000,
        fiscalYear: "2026",
        periodStart: new Date("2026-01-01"),
        periodEnd: new Date("2026-12-31"),
        requestedBy: "user",
      },
      "test-user"
    );

    expect(budget.budgetId).toBe("BUD-011");
    expect(budget.allocated).toBe(100000);
  });
});
```

### Pattern 3: Integration Tests

**Use When:** Testing interaction between multiple modules/servers

**Example:**
```typescript
describe("Budget → EVM Integration", () => {
  let mockSheets: any;

  beforeEach(() => {
    mockSheets = createMockSheetsClient();
  });

  it("should update EVM when budget spending changes", async () => {
    // 1. Create budget
    const budget = await createBudget(/* ... */);

    // 2. Record expense
    await recordExpense(
      mockSheets,
      "spreadsheet-id",
      budget.budgetId,
      50000,
      "Labor costs",
      "user"
    );

    // 3. Calculate EVM
    const evm = await performEVMCalculation(
      mockSheets,
      "spreadsheet-id",
      "PROG-001"
    );

    // 4. Verify AC includes the expense
    expect(evm.ac).toBeGreaterThanOrEqual(50000);
  });
});
```

### Pattern 4: Edge Case Tests

**Use When:** Testing boundary conditions and error handling

**Example:**
```typescript
describe("Edge Cases", () => {
  it("should handle zero budget", () => {
    const metrics = calculateEVMMetrics(0, 0, 0, 0);

    expect(metrics.cpi).toBe(0); // Avoid division by zero
    expect(metrics.spi).toBe(0);
  });

  it("should handle negative values gracefully", () => {
    const metrics = calculateEVMMetrics(100000, -10000, 120000, 200000);

    expect(metrics.cv).toBeLessThan(0);
    expect(metrics.eac).toBeGreaterThan(0); // Fallback used
  });

  it("should reject invalid input", async () => {
    await expect(
      allocateBudget(mockSheets, "id", "BUD-001", -1000, "user")
    ).rejects.toThrow("amount must be non-negative");
  });
});
```

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Specific file
npm test -- packages/mcp-financial/tests/budgets/budgets.test.ts

# Watch mode (for development)
npm run test:watch

# With coverage report
npm run test:coverage
```

### Run Tests for Specific Server
```bash
# Financial server tests
cd packages/mcp-financial && npm test

# Program server tests
cd packages/mcp-program && npm test
```

### CI Mode (GitHub Actions)
```bash
npm run test:ci
```

---

## Coverage Requirements

### Global Targets

| Category | Target | Current |
|----------|--------|---------|
| Overall Code | 80% lines | ~7% |
| Critical Modules (EVM, Budgets) | 90% lines | ~90% |
| Shared Packages | 85% lines | 0% |
| Domain Servers | 80% lines | 5% |
| MCP Tools | 100% handlers | 0% |

### Per-Module Targets

**mcp-financial:**
- ✅ EVM calculations: 90% (Complete)
- ✅ EVM forecasting: 85% (Complete)
- ✅ EVM trending: 85% (Complete)
- ✅ EVM snapshots: 85% (Complete)
- ✅ Budgets: 90% (Complete)
- ✅ Cash Flow: 85% (Complete)
- ⏳ Transactions: 85% (Pending)

**shared-core:**
- ⏳ sheetHelpers: 90%
- ⏳ driveHelpers: 85%
- ⏳ fileValidation: 90%
- ⏳ auth: 80%

**shared-routing:**
- ⏳ registry: 90%
- ⏳ api-client: 90%
- ⏳ events: 85%

**mcp-program:**
- ⏳ Programs: 80%
- ⏳ WBS: 80%
- ⏳ Milestones: 80%

**mcp-deliverables:**
- ⏳ Deliverables: 80%
- ⏳ Submissions: 80%
- ⏳ Reviews: 80%

---

## Appendix: File Locations

### Test Files Created (Week 1-2)

```
packages/
├── shared-core/
│   └── src/test-utils/
│       ├── index.ts ✅
│       ├── mock-google-apis.ts ✅
│       ├── test-fixtures.ts ✅
│       └── test-environment.ts ✅
│
└── mcp-financial/
    └── tests/
        ├── evm-calculations.test.ts ✅ (38 tests)
        ├── evm/
        │   ├── forecasting.test.ts ✅ (35 tests)
        │   ├── trending.test.ts ✅ (20 tests)
        │   └── snapshots.test.ts ✅ (20 tests)
        ├── budgets/
        │   └── budgets.test.ts ✅ (30 tests)
        └── cashflow/
            └── forecasting.test.ts ✅ (15 tests)
```

### Test Files to Create (Week 3+)

```
packages/
├── shared-core/
│   └── tests/
│       ├── utils/
│       │   ├── sheetHelpers.test.ts ⏳
│       │   ├── driveHelpers.test.ts ⏳
│       │   └── fileValidation.test.ts ⏳
│       └── auth/
│           └── oauth.test.ts ⏳
│
├── shared-routing/
│   └── tests/
│       ├── cross-server/
│       │   ├── registry.test.ts ⏳
│       │   └── api-client.test.ts ⏳
│       └── events/
│           ├── publisher.test.ts ⏳
│           └── subscriber.test.ts ⏳
│
├── mcp-program/
│   └── tests/
│       ├── programs/
│       │   └── charter.test.ts ⏳
│       ├── wbs/
│       │   └── wbs-operations.test.ts ⏳
│       ├── schedule/
│       │   └── milestones.test.ts ⏳
│       └── tools/
│           └── tool-validation.test.ts ⏳
│
├── mcp-deliverables/
│   └── tests/
│       ├── deliverables/
│       │   └── deliverables.test.ts ⏳
│       ├── submissions/
│       │   └── submissions.test.ts ⏳
│       └── tools/
│           └── tool-validation.test.ts ⏳
│
├── mcp-subcontract/
│   └── tests/
│       ├── vendors/
│       │   └── vendors.test.ts ⏳
│       ├── contracts/
│       │   └── contracts.test.ts ⏳
│       └── tools/
│           └── tool-validation.test.ts ⏳
│
├── mcp-compliance/
│   └── tests/
│       ├── risks/
│       │   └── risk-assessment.test.ts ⏳
│       └── tools/
│           └── tool-validation.test.ts ⏳
│
└── mcp-financial/
    └── tests/
        ├── transactions/
        │   └── reconciliation.test.ts ⏳ (Optional Week 2)
        └── tools/
            └── tool-validation.test.ts ⏳
```

### Integration Test Files (Week 5)

```
tests/
└── integration/
    ├── cross-server.integration.test.ts ⏳
    ├── event-bus.integration.test.ts ⏳
    ├── sheets-api.integration.test.ts ⏳
    ├── budget-evm-workflow.integration.test.ts ⏳
    └── deliverable-workflow.integration.test.ts ⏳
```

### E2E Test Files (Week 6)

```
tests/
└── e2e/
    ├── server-startup.e2e.test.ts ⏳
    ├── health-checks.e2e.test.ts ⏳
    ├── deliverable-evm-workflow.e2e.test.ts ⏳
    ├── program-setup.e2e.test.ts ⏳
    └── subcontract-lifecycle.e2e.test.ts ⏳
```

---

## Quick Start for Codex

### To Continue Week 2 (Optional Transaction Tests):

1. Read the transaction reconciliation module:
   ```bash
   packages/mcp-financial/src/transactions/reconciliation.ts
   ```

2. Create test file using the template above:
   ```bash
   packages/mcp-financial/tests/transactions/reconciliation.test.ts
   ```

3. Write 10-15 tests following the patterns established in Week 2

### To Start Week 3:

1. Begin with shared-core tests (highest priority)
2. Use the test patterns from Week 2 as reference
3. Follow the file structure outlined in Appendix
4. Target 30 tests for shared-core package
5. Then move to shared-routing (20 tests)
6. Then domain servers (15 tests each)

### Key Commands:

```bash
# Run tests as you write them
npm run test:watch

# Check coverage
npm run test:coverage

# Build before testing (if needed)
npm run build
```

---

**Document End**

*For questions or clarifications, refer to:*
- Week 1 completion: `docs/testing-week1-infrastructure-setup.md`
- Week 2 progress: `docs/testing-week2-progress.md`
- Testing plan overview: `docs/comprehensive-testing-status.md`
