# End-to-End (E2E) Testing Guide

## Overview

The E2E tests validate complete workflows across all 5 MCP servers, ensuring they work together correctly in real-world scenarios.

## Test Files

### 1. server-startup.e2e.test.ts
**Purpose:** Verify all 5 servers start successfully and are healthy

**Tests:**
- Server process startup
- Health check endpoints
- Service registry integration
- Port availability
- Basic API functionality
- Server logs validation

**Test Count:** ~20 tests

---

### 2. workflows.e2e.test.ts
**Purpose:** Test complete business workflows across multiple servers

**Workflows Tested:**
1. **Program Setup** (Program → Financial → Deliverables)
   - Create program charter
   - Create budget
   - Create milestone
   - Create deliverable
   - Calculate EVM baseline

2. **Deliverable Lifecycle** (Deliverables → Financial)
   - Create deliverable with budgeted value
   - Update percent complete
   - Verify EVM updates (Earned Value increases)
   - Submit for review
   - Accept/complete deliverable

3. **Subcontract Lifecycle** (Subcontract → Financial → Compliance)
   - Onboard vendor
   - Create contract
   - Submit invoice
   - Validate invoice
   - Approve invoice
   - Record payment
   - Track vendor performance

4. **Risk Management** (Compliance → Financial → Program)
   - Identify risk
   - Calculate risk score
   - Assess financial impact
   - Create contingency budget
   - Create mitigation action
   - Update risk status
   - Verify in program dashboard

5. **Event Propagation** (All servers)
   - Verify cross-server communication

**Test Count:** ~30 tests

---

## Prerequisites

### 1. Build All Servers

```bash
# From project root
npm run build

# Or build individually
cd packages/mcp-program && npm run build
cd packages/mcp-deliverables && npm run build
cd packages/mcp-subcontract && npm run build
cd packages/mcp-compliance && npm run build
cd packages/mcp-financial && npm run build
```

### 2. Environment Configuration

Create `.env` files for each server:

**packages/mcp-program/.env**
```env
PORT=3001
PROGRAM_SPREADSHEET_ID=your-program-spreadsheet-id
CREDENTIALS_PATH=../../credentials.json
TOKEN_PATH=../../token.json
NODE_ENV=test
```

**packages/mcp-deliverables/.env**
```env
PORT=3002
DELIVERABLES_SPREADSHEET_ID=your-deliverables-spreadsheet-id
CREDENTIALS_PATH=../../credentials.json
TOKEN_PATH=../../token.json
NODE_ENV=test
```

**packages/mcp-subcontract/.env**
```env
PORT=3003
SUBCONTRACT_SPREADSHEET_ID=your-subcontract-spreadsheet-id
CREDENTIALS_PATH=../../credentials.json
TOKEN_PATH=../../token.json
NODE_ENV=test
```

**packages/mcp-compliance/.env**
```env
PORT=3004
COMPLIANCE_SPREADSHEET_ID=your-compliance-spreadsheet-id
CREDENTIALS_PATH=../../credentials.json
TOKEN_PATH=../../token.json
NODE_ENV=test
```

**packages/mcp-financial/.env**
```env
PORT=3005
FINANCIAL_SPREADSHEET_ID=your-financial-spreadsheet-id
CREDENTIALS_PATH=../../credentials.json
TOKEN_PATH=../../token.json
NODE_ENV=test
```

### 3. Google Sheets Setup

Create test spreadsheets for each server:

1. **Program Spreadsheet** - with sheets: Programs, WBS, Milestones, Schedule, etc.
2. **Deliverables Spreadsheet** - with sheets: Deliverables, Submissions, Reviews, etc.
3. **Subcontract Spreadsheet** - with sheets: Vendors, Contracts, Invoices, etc.
4. **Compliance Spreadsheet** - with sheets: Risks, Mitigation Actions, etc.
5. **Financial Spreadsheet** - with sheets: Budgets, EVM Snapshots, Transactions, etc.

Or use the setup script:
```bash
npm run setup-test-sheets
```

### 4. Google API Credentials

Ensure you have:
- `credentials.json` in project root
- `token.json` generated (run any server once to generate)

---

## Running E2E Tests

### Option 1: Run All E2E Tests

```bash
# From project root
npm run test:e2e
```

This will:
1. Start all 5 servers in parallel
2. Wait for health checks to pass
3. Run all E2E test suites
4. Stop all servers when complete

**Expected runtime:** 2-5 minutes

---

### Option 2: Run Individual E2E Test Files

**Server Startup Tests:**
```bash
npm run test:e2e:startup
```

**Workflow Tests:**
```bash
npm run test:e2e:workflows
```

---

### Option 3: Run with Manual Server Control

If you want to start/stop servers manually:

**Terminal 1-5: Start Servers**
```bash
# Terminal 1
cd packages/mcp-program && npm start

# Terminal 2
cd packages/mcp-deliverables && npm start

# Terminal 3
cd packages/mcp-subcontract && npm start

# Terminal 4
cd packages/mcp-compliance && npm start

# Terminal 5
cd packages/mcp-financial && npm start
```

**Terminal 6: Run Tests**
```bash
# Run tests against running servers
jest tests/e2e --testTimeout=60000
```

---

## Test Configuration

### package.json Scripts

Add these scripts to your root `package.json`:

```json
{
  "scripts": {
    "test:e2e": "jest tests/e2e --testTimeout=60000 --runInBand",
    "test:e2e:startup": "jest tests/e2e/server-startup.e2e.test.ts --testTimeout=60000",
    "test:e2e:workflows": "jest tests/e2e/workflows.e2e.test.ts --testTimeout=60000 --runInBand"
  }
}
```

### Jest Configuration

Ensure your `jest.config.js` includes:

```javascript
module.exports = {
  // ... other config
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/?(*.)+(spec|test).ts",
    "**/tests/e2e/**/*.e2e.test.ts"
  ],
  testTimeout: 60000, // 60 seconds for E2E tests
};
```

---

## Expected Test Output

### Successful Run

```
[E2E] ========================================
[E2E] Starting all 5 MCP servers...
[E2E] ========================================

[E2E] Starting Program Management on port 3001...
[E2E] Starting Deliverable Tracking on port 3002...
[E2E] Starting Subcontract Management on port 3003...
[E2E] Starting Compliance & Risk on port 3004...
[E2E] Starting Financial Management on port 3005...

[E2E] Program Management started successfully
[E2E] Deliverable Tracking started successfully
[E2E] Subcontract Management started successfully
[E2E] Compliance & Risk started successfully
[E2E] Financial Management started successfully

[E2E] All servers started, waiting for health checks...

[E2E] Program Management health check passed
[E2E] Deliverable Tracking health check passed
[E2E] Subcontract Management health check passed
[E2E] Compliance & Risk health check passed
[E2E] Financial Management health check passed

 PASS  tests/e2e/server-startup.e2e.test.ts (45.2 s)
  E2E: Server Startup
    Server Processes
      ✓ should start all 5 servers without errors (15 ms)
      ✓ should have stdout/stderr captured for all servers (3 ms)
    Health Check Endpoints
      ✓ should respond to health check: Program Management (port 3001) (125 ms)
      ✓ should respond to health check: Deliverable Tracking (port 3002) (98 ms)
      ✓ should respond to health check: Subcontract Management (port 3003) (102 ms)
      ✓ should respond to health check: Compliance & Risk (port 3004) (95 ms)
      ✓ should respond to health check: Financial Management (port 3005) (110 ms)
      ...

 PASS  tests/e2e/workflows.e2e.test.ts (78.5 s)
  E2E Workflow: Program Setup
    ✓ Step 1: Create program charter (450 ms)
    ✓ Step 2: Create program budget (380 ms)
    ✓ Step 3: Verify budget appears in program financial summary (210 ms)
    ✓ Step 4: Create program milestone (420 ms)
    ✓ Step 5: Create deliverable linked to milestone (390 ms)
    ✓ Step 6: Verify program has deliverables (180 ms)
    ✓ Step 7: Calculate initial EVM baseline (520 ms)
  ...

Test Suites: 2 passed, 2 total
Tests:       50 passed, 50 total
Snapshots:   0 total
Time:        123.7 s
```

---

## Troubleshooting

### Problem: Servers fail to start

**Solution:**
1. Check that all servers are built: `npm run build`
2. Verify environment variables are set correctly
3. Check Google Sheets credentials are valid
4. Ensure ports 3001-3005 are not in use: `lsof -i :3001-3005`

---

### Problem: Health checks fail

**Solution:**
1. Increase health check timeout in test file
2. Check server logs for errors
3. Verify Google Sheets API access
4. Try starting servers manually to see error messages

---

### Problem: Tests timeout

**Solution:**
1. Increase Jest timeout: `--testTimeout=120000` (120 seconds)
2. Run tests with `--runInBand` to avoid parallel execution
3. Check network connectivity to Google APIs
4. Reduce number of tests per run

---

### Problem: Cross-server API calls fail

**Solution:**
1. Verify service registry is working
2. Check that all servers are registered
3. Verify baseUrls are correct (localhost:3001-3005)
4. Check for CORS issues (should not apply to localhost)

---

### Problem: Tests leave data in spreadsheets

**Solution:**
1. Use dedicated test spreadsheets (separate from production)
2. Implement cleanup in `afterAll` hooks
3. Use test data prefixes (e.g., `TEST-PROG-`)
4. Manually clear test data between runs

---

## Test Data Cleanup

The E2E tests create real data in Google Sheets. To clean up:

### Automatic Cleanup (Recommended)

Tests track created entities and log them:
```
[E2E Workflows] Created entities:
  Programs: 1
  Deliverables: 2
  Budgets: 2
  Vendors: 1
  Risks: 1
```

Future implementation will delete these automatically.

### Manual Cleanup

Delete rows in Google Sheets where IDs start with `TEST-`:
- Programs: Filter by programId contains "TEST-"
- Deliverables: Filter by deliverableId contains "TEST-"
- Budgets: Filter by budgetId contains "TEST-"
- Vendors: Filter by vendorId contains "TEST-"
- Risks: Filter by riskId contains "TEST-"

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build all servers
        run: npm run build

      - name: Setup Google credentials
        run: |
          echo "$GOOGLE_CREDENTIALS" > credentials.json
          echo "$GOOGLE_TOKEN" > token.json
        env:
          GOOGLE_CREDENTIALS: ${{ secrets.GOOGLE_CREDENTIALS }}
          GOOGLE_TOKEN: ${{ secrets.GOOGLE_TOKEN }}

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          PROGRAM_SPREADSHEET_ID: ${{ secrets.PROGRAM_SPREADSHEET_ID }}
          DELIVERABLES_SPREADSHEET_ID: ${{ secrets.DELIVERABLES_SPREADSHEET_ID }}
          SUBCONTRACT_SPREADSHEET_ID: ${{ secrets.SUBCONTRACT_SPREADSHEET_ID }}
          COMPLIANCE_SPREADSHEET_ID: ${{ secrets.COMPLIANCE_SPREADSHEET_ID }}
          FINANCIAL_SPREADSHEET_ID: ${{ secrets.FINANCIAL_SPREADSHEET_ID }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-test-results
          path: |
            coverage/
            test-results/
```

---

## Performance Expectations

### Test Duration

- **Server Startup Tests:** ~30-45 seconds
- **Workflow Tests:** ~60-90 seconds per workflow
- **Total E2E Suite:** ~2-5 minutes

### Resource Usage

- **Memory:** ~500MB per server (2.5GB total)
- **CPU:** Moderate during startup, low during steady state
- **Network:** Google Sheets API calls (~10-20 per test)

---

## Next Steps

After E2E tests pass:

1. ✅ **Week 7: CI/CD Integration** - Automate E2E tests in GitHub Actions
2. ✅ **Performance Optimization** - Reduce test execution time
3. ✅ **Test Data Fixtures** - Create reusable test data sets
4. ✅ **Parallel Execution** - Run independent workflow tests in parallel
5. ✅ **Production Deployment** - Deploy with confidence

---

## Support

For issues or questions:
- Check server logs: `serverLogs.get(serverId)`
- Review Google Sheets for data
- Check health endpoints manually: `curl http://localhost:3001/health`
- Open an issue in the repository

---

*Last Updated: January 5, 2026*
*E2E Test Framework Version: 1.0.0*
