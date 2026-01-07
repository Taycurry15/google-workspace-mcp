# CI/CD Testing Guide

Complete guide to the CI/CD pipeline and automated testing infrastructure.

## Table of Contents

1. [Overview](#overview)
2. [GitHub Actions Workflows](#github-actions-workflows)
3. [Test Pipeline](#test-pipeline)
4. [Deployment Pipeline](#deployment-pipeline)
5. [Secrets Configuration](#secrets-configuration)
6. [Running Tests in CI](#running-tests-in-ci)
7. [Troubleshooting CI Failures](#troubleshooting-ci-failures)

---

## Overview

The CI/CD pipeline automatically tests and deploys the Google Workspace MCP platform using GitHub Actions.

**Key Features:**
- ✅ Automated testing on every PR
- ✅ Multi-version Node.js testing (18.x, 20.x)
- ✅ Coverage reporting with Codecov
- ✅ Automated deployment to staging and production
- ✅ Docker image building and publishing
- ✅ Automatic rollback on failure

---

## GitHub Actions Workflows

### 1. Test Workflow (.github/workflows/test.yml)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs:**

**Lint (10 minutes)**
- Runs ESLint on all TypeScript files
- Checks Prettier formatting
- Fast feedback on code quality

**Build (15 minutes)**
- Builds all packages in monorepo
- Uploads artifacts for reuse in test jobs
- Catches compilation errors early

**Unit Tests (20 minutes)**
- Matrix: Node 18.x and 20.x
- Runs with coverage
- Uploads coverage to Codecov
- Ensures cross-version compatibility

**Integration Tests (30 minutes)**
- Tests cross-server communication
- Tests Google Sheets integration
- Validates workflow engine

**E2E Tests (30 minutes)**
- Spawns all 5 servers
- Runs complete workflow tests
- Uses 8GB heap for memory-intensive tests
- Validates production-like scenarios

**Coverage Report**
- Aggregates coverage from all jobs
- Posts summary to PR
- Enforces coverage thresholds

**Quality Gate**
- Final gate before merge
- Fails if any previous job failed
- Ensures all quality checks passed

---

### 2. Deploy Workflow (.github/workflows/deploy.yml)

**Triggers:**
- Push to `main` (deploys to staging)
- Version tags `v*.*.*` (deploys to production)
- Manual workflow dispatch

**Jobs:**

**Test (30 minutes)**
- Runs linting and unit tests
- Ensures code quality before deployment

**Build Docker (20 minutes per server)**
- Builds Docker images for all 5 servers
- Pushes to Docker Hub
- Tags with version and latest
- Uses layer caching for speed

**Deploy Staging (15 minutes)**
- Deploys to staging environment
- Runs smoke tests
- Notifies team

**Deploy Production (20 minutes)**
- Requires staging success
- Deploys to production
- Runs smoke tests
- Creates GitHub Release
- Notifies team

**Rollback (10 minutes)**
- Triggers on deployment failure
- Reverts to previous version
- Notifies team

---

## Test Pipeline

### Pipeline Flow

```
┌─────────────────────────────────────────────────┐
│ 1. Lint (5 min)                                 │
│    ├─ ESLint                                    │
│    └─ Prettier                                  │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│ 2. Build (10 min)                               │
│    ├─ TypeScript compilation                    │
│    ├─ All 5 servers + shared packages           │
│    └─ Upload artifacts                          │
└────┬────────┬────────┬─────────────────────────┘
     │        │        │
     ▼        ▼        ▼
┌────────┐ ┌──────────┐ ┌─────────────────────────┐
│ Unit   │ │ Integr.  │ │ E2E Tests (25 min)      │
│ Tests  │ │ Tests    │ │  ├─ Start 5 servers     │
│ (15m)  │ │ (20 min) │ │  ├─ Server startup      │
│        │ │          │ │  ├─ Workflow tests       │
│ Node   │ │          │ │  └─ Upload results      │
│ 18 & 20│ │          │ │                         │
└────┬───┘ └────┬─────┘ └────┬────────────────────┘
     │          │             │
     └──────────┴─────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│ Coverage Report                                 │
│    ├─ Aggregate coverage                        │
│    ├─ Post to PR                                │
│    └─ Upload to Codecov                         │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│ Quality Gate                                    │
│    ├─ Check all jobs passed                     │
│    └─ Block merge if failures                   │
└─────────────────────────────────────────────────┘
```

---

## Deployment Pipeline

### Staging Deployment

**Trigger:** Push to `main`

**Flow:**
```
Push to main
    │
    ▼
Run Tests
    │
    ▼
Build Docker Images (parallel)
    │
    ▼
Deploy to Staging
    │
    ▼
Run Smoke Tests
    │
    ▼
Notify Team
```

### Production Deployment

**Trigger:** Create tag `v1.0.0`

**Flow:**
```
Create tag v1.0.0
    │
    ▼
Run Tests
    │
    ▼
Build Docker Images (parallel)
    │
    ▼
Deploy to Staging
    │
    ▼
Verify Staging
    │
    ▼
Deploy to Production
    │
    ▼
Run Smoke Tests
    │
    ▼
Create GitHub Release
    │
    ▼
Notify Team
```

---

## Secrets Configuration

### Required Secrets

Configure in GitHub repository settings → Secrets and variables → Actions

**Coverage Reporting:**
```
CODECOV_TOKEN=<get from codecov.io>
```

**Google Sheets Integration:**
```
GOOGLE_CREDENTIALS=<contents of credentials.json>
GOOGLE_TOKEN=<contents of token.json>
PROGRAM_SPREADSHEET_ID=<spreadsheet-id>
DELIVERABLES_SPREADSHEET_ID=<spreadsheet-id>
SUBCONTRACT_SPREADSHEET_ID=<spreadsheet-id>
COMPLIANCE_SPREADSHEET_ID=<spreadsheet-id>
FINANCIAL_SPREADSHEET_ID=<spreadsheet-id>
```

**Docker Hub:**
```
DOCKER_USERNAME=<docker-hub-username>
DOCKER_PASSWORD=<docker-hub-token>
```

### Setting Up Secrets

**1. Google Credentials:**
```bash
# Get credentials content (remove newlines)
cat credentials.json | jq -c . | pbcopy

# Paste in GitHub secret: GOOGLE_CREDENTIALS
```

**2. Google Token:**
```bash
# Get token content (remove newlines)
cat token.json | jq -c . | pbcopy

# Paste in GitHub secret: GOOGLE_TOKEN
```

**3. Codecov Token:**
- Sign up at https://codecov.io
- Add repository
- Copy token from settings
- Add to GitHub secret: CODECOV_TOKEN

**4. Docker Hub Token:**
- Login to Docker Hub
- Account Settings → Security → New Access Token
- Add to GitHub secrets: DOCKER_USERNAME and DOCKER_PASSWORD

---

## Running Tests in CI

### Automatically

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request
- Version tag creation

### Manually

**Run test workflow:**
1. Go to Actions tab
2. Select "Tests" workflow
3. Click "Run workflow"
4. Choose branch
5. Click green "Run workflow" button

**Run deployment workflow:**
1. Go to Actions tab
2. Select "Deploy" workflow
3. Click "Run workflow"
4. Choose environment (staging/production)
5. Click green "Run workflow" button

---

## Troubleshooting CI Failures

### Lint Failures

**Error:** `ESLint found errors`

**Solution:**
```bash
# Run locally
npm run lint

# Auto-fix
npm run lint:fix

# Check formatting
npm run format:check

# Auto-format
npm run format
```

---

### Build Failures

**Error:** `TypeScript compilation failed`

**Solution:**
```bash
# Run locally
npm run build

# Check specific package
cd packages/mcp-program && npm run build

# Type check without emit
npm run typecheck
```

---

### Unit Test Failures

**Error:** `Tests failed`

**Solution:**
```bash
# Run locally
npm run test:unit

# Run specific test file
npm test -- path/to/test.test.ts

# Run with coverage
npm run test:coverage

# Watch mode for debugging
npm run test:watch
```

**Common issues:**
- Mock data out of sync
- Timezone differences
- Environment variables missing
- Node version mismatch

---

### Integration Test Failures

**Error:** `Integration tests timed out`

**Solution:**
- Check Google Sheets API connectivity
- Verify credentials are valid
- Increase timeout if needed
- Check rate limits

**Debug locally:**
```bash
npm run test:integration
```

---

### E2E Test Failures

**Error:** `Server startup failed`

**Possible causes:**
- Port conflicts
- Missing environment variables
- Invalid Google credentials
- Insufficient memory

**Debug steps:**

**1. Check server logs in CI:**
```
View job logs → Expand "Run E2E tests" step
```

**2. Run locally:**
```bash
# Set up .env files first
npm run test:e2e
```

**3. Increase memory if needed:**
```bash
NODE_OPTIONS=--max-old-space-size=8192 npm run test:e2e
```

**4. Run individual workflow:**
```bash
npm run test:e2e:startup
npm run test:e2e:workflows
```

---

### Docker Build Failures

**Error:** `Docker build failed`

**Solutions:**

**1. Test build locally:**
```bash
docker build -f docker/Dockerfile.mcp-program -t test .
```

**2. Check file paths:**
- Verify COPY paths in Dockerfile
- Ensure all referenced files exist

**3. Check dependencies:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

### Deployment Failures

**Error:** `Deployment to staging failed`

**Debug:**
1. Check deployment logs in Actions
2. Verify secrets are configured
3. Check target environment health
4. Review deployment script

**Manual deployment:**
```bash
# SSH to staging server
ssh staging-server

# Pull latest images
docker-compose pull

# Restart services
docker-compose up -d
```

---

### Coverage Below Threshold

**Error:** `Coverage is below 80%`

**Solution:**

**1. Check coverage report:**
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

**2. Find uncovered code:**
- Red lines = not covered
- Yellow lines = partially covered

**3. Add tests for uncovered code:**
```typescript
describe('Uncovered Function', () => {
  it('should handle edge case', () => {
    // Add test here
  });
});
```

**4. Verify improvement:**
```bash
npm run test:coverage
```

---

## Best Practices

### Writing CI-Friendly Tests

**1. Make tests deterministic:**
```typescript
// ❌ Bad - depends on current time
const dueDate = new Date(Date.now() + 86400000);

// ✅ Good - fixed date
const dueDate = new Date('2026-12-31');
```

**2. Clean up test data:**
```typescript
afterAll(async () => {
  // Clean up created entities
  await deleteTestData(createdIds);
});
```

**3. Handle flaky tests:**
```typescript
// Add retry logic for network calls
it('should fetch data', async () => {
  await retry(async () => {
    const data = await fetchData();
    expect(data).toBeDefined();
  }, 3);
});
```

**4. Use appropriate timeouts:**
```typescript
// Set longer timeout for E2E tests
jest.setTimeout(60000);
```

---

### Optimizing CI Performance

**1. Use caching:**
```yaml
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

**2. Run jobs in parallel:**
```yaml
jobs:
  unit-tests:
    strategy:
      matrix:
        node-version: [18.x, 20.x]
```

**3. Reuse artifacts:**
```yaml
- uses: actions/upload-artifact@v4
  with:
    name: build-artifacts

- uses: actions/download-artifact@v4
  with:
    name: build-artifacts
```

**4. Skip unnecessary jobs:**
```yaml
on:
  push:
    paths-ignore:
      - 'docs/**'
      - '**.md'
```

---

## Monitoring CI/CD

### GitHub Actions Dashboard

**View all workflows:**
- Go to Actions tab
- See status of recent runs
- Filter by workflow, branch, or actor

**View specific run:**
- Click on workflow run
- Expand jobs to see steps
- Download logs for debugging

### Codecov Dashboard

**View coverage trends:**
- Go to https://codecov.io
- Select repository
- See coverage over time
- View file-level coverage

### Docker Hub

**View built images:**
- Go to https://hub.docker.com
- See published images
- Check image sizes
- View pull statistics

---

## Emergency Procedures

### Bypass CI for Hotfix

**Only in emergencies:**

```bash
# Push directly to main (requires admin)
git push origin hotfix-branch:main

# Or merge with admin override
# (Not recommended)
```

**Better approach:**
```bash
# Create hotfix PR
# Request expedited review
# Let CI run (usually <30 min)
# Merge when green
```

### Disable Failing Tests Temporarily

**If blocking critical deployment:**

```typescript
// Mark as skipped
it.skip('flaky test', () => {
  // This test will be skipped
});
```

**Create ticket to fix:**
- Document why test was skipped
- Create issue to fix properly
- Link issue in code comment

---

*Last Updated: January 5, 2026*
*Pipeline Version: 1.0.0*
