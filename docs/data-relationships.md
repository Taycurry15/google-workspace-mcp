# Multi-Server PMO Platform: Data Relationships & Dependencies

## Overview

This document maps all data relationships and dependencies across the 5-server PMO platform architecture.

**Purpose:**
- Define foreign key relationships between servers
- Document cross-server data dependencies
- Specify validation requirements
- Guide API integration patterns

---

## Server Architecture

```
┌─────────────────┐
│  mcp-program    │  Port 3001 - Program Management
│  PROG-XXX       │  (Programs, WBS, Milestones, Schedule, Governance)
└────────┬────────┘
         │
         ├──────────┬──────────┬──────────┬──────────┐
         │          │          │          │          │
         ▼          ▼          ▼          ▼          ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│mcp-         │ │mcp-         │ │mcp-         │ │mcp-         │
│deliverables │ │subcontract  │ │compliance   │ │financial    │
│Port 3002    │ │Port 3003    │ │Port 3004    │ │Port 3005    │
│D-XXX        │ │VEND-XXX     │ │RISK-XXX     │ │BUD-XXX      │
│             │ │CONT-XXX     │ │COMP-XXX     │ │EVM-XXX      │
└─────────────┘ └──────┬──────┘ └─────────────┘ └──────┬──────┘
                       │                                │
                       └────────────────────────────────┘
                            Cross-dependencies
```

---

## Core Entity Relationships

### 1. Program (mcp-program) → All Servers

**Program is the root entity** - all other entities must reference a valid programId.

```
Program (PROG-XXX)
    ├─→ Deliverable (D-XXX)         [mcp-deliverables]
    ├─→ Contract (CONT-XXX)         [mcp-subcontract]
    ├─→ Risk (RISK-XXX)             [mcp-compliance]
    ├─→ Budget (BUD-XXX)            [mcp-financial]
    ├─→ Milestone (MILE-XXX)        [mcp-program]
    ├─→ WBS Item (WBS-XXX)          [mcp-program]
    └─→ Issue (ISS-XXX)             [mcp-program]
```

**Validation Requirements:**
- All entities with programId field MUST validate against mcp-program
- Cross-server API call to verify program exists
- Reject operations if programId is invalid

**API Pattern:**
```typescript
// Before creating any entity
const program = await programClient.get(`/api/programs/${programId}`);
if (!program) throw new Error('Invalid programId');
```

---

## Detailed Relationship Mappings

### 2. mcp-program → mcp-deliverables

#### Relationships

| From Entity (mcp-program) | Relationship | To Entity (mcp-deliverables) |
|---------------------------|--------------|------------------------------|
| Program | 1:N | Deliverable |
| Milestone | 1:N | Deliverable |
| WBS Item | 1:N | Deliverable |

#### Foreign Keys

**Deliverable:**
- `programId` → Program.programId (required)
- `milestoneId` → Milestone.milestoneId (optional)
- `wbsId` → WBS.wbsId (optional)

#### Cross-Server Queries

**From mcp-program:**
- Get all deliverables for a program
- Get deliverable status for milestone completion check
- Get deliverable % complete for EVM calculations

**From mcp-deliverables:**
- Validate programId exists
- Validate milestoneId exists
- Update milestone progress when deliverable completed

#### API Endpoints

```typescript
// mcp-deliverables REST API
GET  /api/programs/:programId/deliverables
GET  /api/milestones/:milestoneId/deliverables
POST /api/deliverables (validate programId)
```

```typescript
// mcp-program REST API (called by deliverables)
GET  /api/programs/:programId
GET  /api/milestones/:milestoneId
PUT  /api/milestones/:milestoneId/progress
```

---

### 3. mcp-program → mcp-subcontract

#### Relationships

| From Entity (mcp-program) | Relationship | To Entity (mcp-subcontract) |
|---------------------------|--------------|------------------------------|
| Program | 1:N | Contract |
| Program | 1:N | Vendor (indirect) |

#### Foreign Keys

**Contract:**
- `programId` → Program.programId (required)

**SOW Deliverable:**
- `programId` → Program.programId (required)

**Invoice:**
- `programId` → Program.programId (required)

**Vendor Performance:**
- `programId` → Program.programId (required)

#### Cross-Server Queries

**From mcp-program:**
- Get all active contracts for a program
- Get vendor performance for program review
- Get contract financial commitments

**From mcp-subcontract:**
- Validate programId exists

#### API Endpoints

```typescript
// mcp-subcontract REST API
GET  /api/programs/:programId/contracts
GET  /api/programs/:programId/vendors
GET  /api/programs/:programId/invoices
POST /api/contracts (validate programId)
```

---

### 4. mcp-program → mcp-compliance

#### Relationships

| From Entity (mcp-program) | Relationship | To Entity (mcp-compliance) |
|---------------------------|--------------|------------------------------|
| Program | 1:N | Risk |
| Milestone | 1:N | Risk (optional link) |

#### Foreign Keys

**Risk:**
- `programId` → Program.programId (required)
- `relatedMilestoneId` → Milestone.milestoneId (optional)

**Compliance Requirement:**
- `programId` → Program.programId (required)

**Audit Log Entry:**
- `programId` → Program.programId (optional)

#### Cross-Server Queries

**From mcp-program:**
- Get critical risks for program
- Get compliance status
- Get audit trail for governance reviews

**From mcp-compliance:**
- Validate programId exists
- Link risks to milestones
- Alert on milestone risks

#### API Endpoints

```typescript
// mcp-compliance REST API
GET  /api/programs/:programId/risks
GET  /api/programs/:programId/compliance/status
GET  /api/programs/:programId/audit/trail
POST /api/risks (validate programId)
```

---

### 5. mcp-program → mcp-financial

#### Relationships

| From Entity (mcp-program) | Relationship | To Entity (mcp-financial) |
|---------------------------|--------------|------------------------------|
| Program | 1:N | Budget |
| Program | 1:N | EVM Snapshot |
| Program | 1:N | Cash Flow |

#### Foreign Keys

**Budget:**
- `programId` → Program.programId (required)

**EVM Snapshot:**
- `programId` → Program.programId (required)

**Cash Flow:**
- `programId` → Program.programId (required)

**Financial Transaction:**
- `programId` → Program.programId (required)

#### Cross-Server Queries

**From mcp-program:**
- Get budget status for program
- Get latest EVM metrics
- Get cash flow forecast

**From mcp-financial:**
- Validate programId exists
- Get schedule baseline for PV calculation

#### API Endpoints

```typescript
// mcp-financial REST API
GET  /api/programs/:programId/budgets
GET  /api/programs/:programId/evm/latest
GET  /api/programs/:programId/cashflow
POST /api/budgets (validate programId)
```

---

### 6. mcp-deliverables → mcp-subcontract

#### Relationships

| From Entity (mcp-subcontract) | Relationship | To Entity (mcp-deliverables) |
|-------------------------------|--------------|------------------------------|
| Contract | N:N | Deliverable (via SOW) |
| SOW Deliverable | N:1 | Deliverable |

#### Foreign Keys

**SOW Deliverable (mcp-subcontract):**
- `deliverableId` → Deliverable.deliverableId (required)

**Contract (mcp-subcontract):**
- `deliverables` (JSON array) → [Deliverable.deliverableId, ...]

#### Cross-Server Queries

**From mcp-subcontract:**
- Validate deliverableId exists
- Get deliverable status for SOW tracking
- Get deliverable acceptance for invoice validation

**From mcp-deliverables:**
- Get contract info for deliverable
- Update SOW deliverable status when deliverable submitted

#### Workflow Integration

**Event: `deliverable_submitted` (mcp-deliverables)**
1. Check if deliverable is linked to SOW (mcp-subcontract)
2. Update SOW Deliverable status to "submitted"
3. Trigger vendor performance tracking

**Event: `deliverable_accepted` (mcp-deliverables)**
1. Update SOW Deliverable status to "accepted"
2. Record quality score
3. Enable invoice submission for deliverable
4. Update vendor performance metrics

#### API Endpoints

```typescript
// mcp-subcontract REST API (called by deliverables)
GET  /api/deliverables/:deliverableId/sow
PUT  /api/sow-deliverables/:sowId/status
POST /api/sow-deliverables/:sowId/acceptance
```

```typescript
// mcp-deliverables REST API (called by subcontract)
GET  /api/deliverables/:deliverableId
GET  /api/deliverables/:deliverableId/status
```

---

### 7. mcp-subcontract → mcp-compliance

#### Relationships

| From Entity (mcp-subcontract) | Relationship | To Entity (mcp-compliance) |
|-------------------------------|--------------|------------------------------|
| Vendor | 1:1 | Due Diligence Check |
| Contract | 1:1 | FCPA Review (optional) |

#### Foreign Keys

**Contract (mcp-subcontract):**
- `fcpaReviewRequired` → triggers FCPA review in mcp-compliance
- `fcpaReviewCompleted` → status from mcp-compliance

#### Cross-Server Queries

**From mcp-subcontract:**
- Create FCPA review request for contract
- Check vendor due diligence status
- Get vendor compliance history

**From mcp-compliance:**
- Get vendor details for due diligence
- Get contract details for FCPA review

#### Workflow Integration

**Event: `contract_signed` (mcp-subcontract)**
1. If contract.fcpaReviewRequired = true
2. Create FCPA review request in mcp-compliance
3. Log audit trail entry
4. Wait for FCPA approval before activating contract

**Event: `vendor_onboarded` (mcp-subcontract)**
1. Trigger due diligence check in mcp-compliance
2. Create compliance requirement records
3. Track insurance and bonding requirements

#### API Endpoints

```typescript
// mcp-compliance REST API (called by subcontract)
POST /api/fcpa/reviews (create FCPA review request)
GET  /api/vendors/:vendorId/due-diligence
POST /api/vendors/:vendorId/due-diligence
```

```typescript
// mcp-subcontract REST API (called by compliance)
GET  /api/vendors/:vendorId
GET  /api/contracts/:contractId
PUT  /api/contracts/:contractId/fcpa-status
```

---

### 8. mcp-subcontract → mcp-financial

#### Relationships

| From Entity (mcp-subcontract) | Relationship | To Entity (mcp-financial) |
|-------------------------------|--------------|------------------------------|
| Contract | 1:1 | Budget Allocation |
| Invoice | 1:1 | Financial Transaction |
| Invoice | 1:1 | Cash Flow (outflow) |

#### Foreign Keys

**Cash Flow (mcp-financial):**
- `invoiceId` → Invoice.invoiceId (optional)
- `contractId` → Contract.contractId (optional)

**Financial Transaction (mcp-financial):**
- `invoiceId` → Invoice.invoiceId (optional)
- `contractId` → Contract.contractId (optional)

**Budget (mcp-financial):**
- Referenced by Contract.totalValue for allocation

#### Cross-Server Queries

**From mcp-subcontract:**
- Check budget availability for contract
- Record transaction when invoice paid
- Update cash flow forecast

**From mcp-financial:**
- Get invoice details for payment
- Get contract value for budget allocation
- Calculate AC (Actual Cost) from invoices

#### Workflow Integration

**Event: `contract_signed` (mcp-subcontract)**
1. Create budget allocation in mcp-financial
2. Reserve funds (committed amount)
3. Create payment schedule if milestone-based

**Event: `invoice_submitted` (mcp-subcontract)**
1. Validate against budget in mcp-financial
2. Check budget has sufficient remaining funds
3. Create cash flow forecast entry

**Event: `invoice_approved` (mcp-subcontract)**
1. Record financial transaction in mcp-financial
2. Update budget spent amount
3. Schedule cash outflow

**Event: `invoice_paid` (mcp-subcontract)**
1. Update transaction as completed in mcp-financial
2. Record actual cash outflow
3. Update EVM AC (Actual Cost)

#### API Endpoints

```typescript
// mcp-financial REST API (called by subcontract)
GET  /api/budgets/:budgetId/availability
POST /api/transactions (record invoice payment)
POST /api/cashflow (forecast payment)
PUT  /api/cashflow/:flowId/complete
```

```typescript
// mcp-subcontract REST API (called by financial)
GET  /api/invoices/:invoiceId
GET  /api/contracts/:contractId
GET  /api/programs/:programId/invoices/approved
```

---

### 9. mcp-deliverables → mcp-financial

#### Relationships

| From Entity (mcp-deliverables) | Relationship | To Entity (mcp-financial) |
|--------------------------------|--------------|------------------------------|
| Deliverable | 1:1 | Earned Value (EV) |
| Deliverable % Complete | → | EVM Calculation |

#### Cross-Server Queries

**From mcp-financial:**
- Get all deliverables for program (for EV calculation)
- Get deliverable % complete
- Get deliverable budgeted costs

**From mcp-deliverables:**
- No direct queries to financial

#### EVM Calculation Integration

**EV (Earned Value) Calculation:**
```typescript
// In mcp-financial EVM module
async function calculateEV(programId: string): Promise<number> {
  // Get all deliverables from mcp-deliverables
  const deliverables = await deliverablesClient.get(
    `/api/programs/${programId}/deliverables`
  );

  let totalEV = 0;
  for (const del of deliverables) {
    // EV = Budgeted Cost × % Complete
    totalEV += del.budgetedCost * (del.percentComplete / 100);
  }

  return totalEV;
}
```

**Event: `deliverable_accepted` (mcp-deliverables)**
1. Trigger EVM recalculation in mcp-financial
2. Update EV metric
3. Recalculate SPI, CPI, EAC

#### API Endpoints

```typescript
// mcp-deliverables REST API (called by financial)
GET  /api/programs/:programId/deliverables
GET  /api/deliverables/:deliverableId/progress
```

---

### 10. mcp-program → mcp-financial (Schedule Integration)

#### Relationships

| From Entity (mcp-program) | Relationship | To Entity (mcp-financial) |
|---------------------------|--------------|------------------------------|
| Schedule Activities | → | Planned Value (PV) |
| Schedule Baseline | → | EVM Baseline |

#### Cross-Server Queries

**From mcp-financial:**
- Get schedule baseline for PV calculation
- Get planned activities by period
- Get program timeline for burn rate projection

**From mcp-program:**
- No direct queries to financial

#### EVM PV Calculation Integration

**PV (Planned Value) Calculation:**
```typescript
// In mcp-financial EVM module
async function calculatePV(programId: string, asOfDate: Date): Promise<number> {
  // Get schedule baseline from mcp-program
  const schedule = await programClient.get(
    `/api/programs/${programId}/schedule/baseline`
  );

  let totalPV = 0;
  for (const activity of schedule.activities) {
    // If activity should be completed by asOfDate
    if (activity.plannedEndDate <= asOfDate) {
      totalPV += activity.budgetedCost;
    } else if (activity.plannedStartDate <= asOfDate) {
      // Partial PV for in-progress activities
      const duration = activity.plannedEndDate - activity.plannedStartDate;
      const elapsed = asOfDate - activity.plannedStartDate;
      const percentElapsed = elapsed / duration;
      totalPV += activity.budgetedCost * percentElapsed;
    }
  }

  return totalPV;
}
```

#### API Endpoints

```typescript
// mcp-program REST API (called by financial)
GET  /api/programs/:programId/schedule/baseline
GET  /api/programs/:programId/schedule/activities
```

---

## Cross-Server Validation Patterns

### 1. programId Validation (Universal)

**Pattern:** All servers must validate programId before creating entities

```typescript
// Shared validation function
async function validateProgramId(programId: string): Promise<boolean> {
  const programClient = new CrossServerClient('mcp-program');
  try {
    const program = await programClient.get(`/api/programs/${programId}`);
    return !!program;
  } catch (error) {
    return false;
  }
}

// Usage in any server
export async function createEntity(params: EntityParams): Promise<Entity> {
  if (!await validateProgramId(params.programId)) {
    throw new Error(`Invalid programId: ${params.programId}`);
  }
  // Proceed with creation...
}
```

### 2. Deliverable Validation (Subcontract)

**Pattern:** Validate deliverable exists before linking to SOW

```typescript
// In mcp-subcontract
async function linkSOWDeliverable(sowId: string, deliverableId: string) {
  const delClient = new CrossServerClient('mcp-deliverables');
  const deliverable = await delClient.get(`/api/deliverables/${deliverableId}`);

  if (!deliverable) {
    throw new Error(`Invalid deliverableId: ${deliverableId}`);
  }

  // Link SOW to deliverable...
}
```

### 3. Budget Validation (Subcontract → Financial)

**Pattern:** Check budget availability before approving contract/invoice

```typescript
// In mcp-subcontract
async function approveContract(contractId: string) {
  const contract = await getContract(contractId);

  // Check budget availability
  const finClient = new CrossServerClient('mcp-financial');
  const budget = await finClient.get(
    `/api/programs/${contract.programId}/budgets/availability`
  );

  if (budget.remaining < contract.totalValue) {
    throw new Error('Insufficient budget for contract');
  }

  // Approve contract...
  // Notify financial to commit funds
  await finClient.post('/api/budgets/commit', {
    programId: contract.programId,
    amount: contract.totalValue,
    contractId: contract.contractId
  });
}
```

---

## Event-Driven Integration Patterns

### Event Bus Architecture

All servers subscribe to cross-server events via shared-workflows event bus.

```typescript
// Event Publisher (any server)
import { EventBus } from '@gw-mcp/shared-workflows';

await EventBus.publish({
  eventType: 'deliverable_accepted',
  source: 'mcp-deliverables',
  data: {
    deliverableId: 'D-001',
    programId: 'PROG-001',
    acceptedDate: new Date()
  }
});

// Event Subscriber (any server)
EventBus.subscribe('deliverable_accepted', async (event) => {
  // Handle event in this server
  await updateSOWDeliverable(event.data.deliverableId);
});
```

### Key Cross-Server Events

| Event | Source | Subscribers | Action |
|-------|--------|-------------|--------|
| `program_created` | mcp-program | All | Initialize program context |
| `milestone_completed` | mcp-program | deliverables, financial | Update dependencies |
| `deliverable_submitted` | mcp-deliverables | subcontract, program | Update SOW, milestone |
| `deliverable_accepted` | mcp-deliverables | subcontract, financial | Enable invoice, update EV |
| `contract_signed` | mcp-subcontract | financial, compliance | Allocate budget, FCPA review |
| `invoice_approved` | mcp-subcontract | financial | Record transaction |
| `invoice_paid` | mcp-subcontract | financial | Update AC, cash flow |
| `risk_identified` | mcp-compliance | program, financial | Alert stakeholders |
| `budget_exceeded` | mcp-financial | program, compliance | Escalate variance |

---

## Data Consistency Guarantees

### 1. Referential Integrity

**Problem:** Foreign key references across servers

**Solution:**
- Validate all cross-server references before creating entities
- Use API calls to verify referenced entities exist
- Reject operations if validation fails

### 2. Eventual Consistency

**Problem:** Updates may not propagate immediately

**Solution:**
- Use event bus for asynchronous updates
- Implement idempotency keys for event handling
- Allow for brief inconsistency windows (< 1 second)

### 3. Reconciliation

**Problem:** Data may drift out of sync

**Solution:**
- Scheduled reconciliation jobs (daily)
- Compare cross-server data and flag discrepancies
- Manual or automated correction workflows

**Example Reconciliation:**
```typescript
// Daily reconciliation job in mcp-financial
async function reconcileEVM() {
  // Get all programs
  const programs = await programClient.get('/api/programs');

  for (const program of programs) {
    // Calculate PV from mcp-program schedule
    const pv = await calculatePVFromSchedule(program.programId);

    // Calculate EV from mcp-deliverables
    const ev = await calculateEVFromDeliverables(program.programId);

    // Calculate AC from mcp-subcontract invoices
    const ac = await calculateACFromInvoices(program.programId);

    // Store EVM snapshot
    await storeEVMSnapshot(program.programId, { pv, ev, ac });
  }
}
```

---

## API Design Guidelines

### 1. Consistent Response Format

All REST API endpoints use standardized response:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Success response
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00Z"
}

// Error response
{
  "success": false,
  "error": "Invalid programId",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Cross-Server Query Patterns

**Pattern A: Direct Entity Lookup**
```typescript
GET /api/programs/:programId
GET /api/deliverables/:deliverableId
GET /api/contracts/:contractId
```

**Pattern B: Collection by Foreign Key**
```typescript
GET /api/programs/:programId/deliverables
GET /api/programs/:programId/contracts
GET /api/programs/:programId/risks
```

**Pattern C: Validation**
```typescript
GET /api/programs/:programId/exists
GET /api/deliverables/:deliverableId/exists
```

### 3. Bulk Operations

For EVM and reporting, support bulk queries:

```typescript
POST /api/deliverables/bulk-status
{
  "deliverableIds": ["D-001", "D-002", "D-003"]
}

// Response
{
  "success": true,
  "data": {
    "D-001": { status: "accepted", percentComplete: 100 },
    "D-002": { status: "in_review", percentComplete: 90 },
    "D-003": { status: "in_progress", percentComplete: 50 }
  }
}
```

---

## Summary: Critical Dependencies

### Must Validate Before Creating

| Entity | Must Validate |
|--------|---------------|
| Any entity with programId | programId exists in mcp-program |
| SOW Deliverable | deliverableId exists in mcp-deliverables |
| Contract | programId exists, budget available in mcp-financial |
| Invoice | contractId exists, deliverable accepted (if linked) |
| Financial Transaction | programId and budgetId exist |

### Must Notify After Creating/Updating

| Event | Notify Servers |
|-------|----------------|
| deliverable_accepted | mcp-subcontract (update SOW), mcp-financial (update EV) |
| contract_signed | mcp-financial (allocate budget), mcp-compliance (FCPA) |
| invoice_approved | mcp-financial (record transaction) |
| invoice_paid | mcp-financial (update AC, cash flow) |
| budget_exceeded | mcp-program (alert PM), mcp-compliance (create risk) |

### Data Flow for EVM

1. **PV:** mcp-program (schedule) → mcp-financial (PV calculation)
2. **EV:** mcp-deliverables (% complete) → mcp-financial (EV calculation)
3. **AC:** mcp-subcontract (invoices) → mcp-financial (AC calculation)
4. **Result:** mcp-financial calculates SPI, CPI, EAC and stores snapshot

---

## Next Steps

1. Implement CrossServerClient in @gw-mcp/shared-routing
2. Add validation helpers for common patterns
3. Implement event bus in @gw-mcp/shared-workflows
4. Create reconciliation jobs
5. Add integration tests for cross-server scenarios
