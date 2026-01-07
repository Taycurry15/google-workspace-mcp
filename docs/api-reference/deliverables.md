# Deliverable Tracking Tools

Complete deliverable lifecycle management from creation through submission, review, and approval.

**Last Updated:** 2026-01-05

---

## Overview

The Deliverable Tracking module provides comprehensive lifecycle management for program deliverables following enterprise PMO best practices. Track deliverables from creation through submission, multi-stage review, quality evaluation, and final approval with automated notifications and reporting.

**Tool Categories:**
- **CRUD Tools (7)**: Create, read, update, list, and filter deliverables
- **Submission Tools (2)**: Submit deliverables for review
- **Review Tools (5)**: Assign reviewers, submit reviews, approve deliverables
- **Quality Tools (2)**: Quality checklists and evaluation
- **Reporting Tools (4)**: Status, quality, schedule, and summary reports
- **Tracking Tools (3)**: Status tracking, forecast updates, notifications

**Total: 28 tools**

---

## Deliverable Lifecycle

```
┌────────────────────────────────────────────────────────────┐
│              DELIVERABLE LIFECYCLE                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  NOT STARTED  ──► IN PROGRESS  ──► SUBMITTED  ──► IN REVIEW│
│                                         │                   │
│                                         │                   │
│                                    CHANGES                  │
│                                    REQUESTED                │
│                                         │                   │
│                                         ▼                   │
│                                   IN PROGRESS               │
│                                         │                   │
│                                         ▼                   │
│  COMPLETE  ◄──  APPROVED  ◄──  IN APPROVAL                 │
│                                                             │
└────────────────────────────────────────────────────────────┘

Status Transitions:
1. NOT_STARTED    → Work not yet begun
2. IN_PROGRESS    → Actively being worked on
3. SUBMITTED      → Submitted for review
4. IN_REVIEW      → Under review by reviewers
5. CHANGES_REQUESTED → Review complete, changes needed
6. IN_APPROVAL    → Review approved, awaiting final approval
7. APPROVED       → Final approval received
8. COMPLETE       → Deliverable accepted and closed
```

---

## CRUD Tools

### deliverable_create

**Description**: Create a new deliverable for a program with acceptance criteria and ownership.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | Yes | Deliverable name |
| description | string | Yes | Detailed description |
| type | string | Yes | Type: document/design/software/hardware/training/report/presentation/prototype/data/other |
| programId | string | Yes | Program ID |
| wbsCode | string | No | Work Breakdown Structure code |
| owner | string | Yes | Owner email address |
| dueDate | string | Yes | Due date (ISO 8601) |
| priority | string | Yes | Priority: critical/high/medium/low |
| acceptanceCriteria | array of strings | Yes | Acceptance criteria (min 1) |
| notes | string | No | Additional notes |

**Returns:**

```typescript
{
  deliverableId: "D-001",
  name: "Security Assessment Report",
  description: "Comprehensive security assessment with findings and remediation plan",
  type: "report",
  programId: "PROG-001",
  wbsCode: "1.2.3",
  owner: "security@example.com",
  dueDate: "2026-03-31T00:00:00Z",
  forecastDate: "2026-03-31T00:00:00Z",
  actualDate: null,
  priority: "critical",
  status: "not_started",
  reviewStatus: "pending",
  qualityScore: null,
  percentComplete: 0,
  acceptanceCriteria: [
    "All systems assessed for vulnerabilities",
    "Findings documented with severity ratings",
    "Remediation plan with timelines included",
    "Executive summary provided"
  ],
  notes: "",
  createdDate: "2026-01-05T10:30:00Z",
  createdBy: "pm@example.com"
}
```

**Example:**

```typescript
const deliverable = await deliverable_create({
  name: "Security Assessment Report",
  description: "Comprehensive security assessment with findings and remediation plan",
  type: "report",
  programId: "PROG-001",
  wbsCode: "1.2.3",
  owner: "security@example.com",
  dueDate: "2026-03-31",
  priority: "critical",
  acceptanceCriteria: [
    "All systems assessed for vulnerabilities",
    "Findings documented with severity ratings",
    "Remediation plan with timelines included"
  ],
  notes: "Critical for security compliance audit"
});

console.log(`Deliverable created: ${deliverable.deliverableId}`);
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist
- `INVALID_TYPE`: Type value invalid
- `INVALID_PRIORITY`: Priority value invalid
- `INVALID_DATE`: Date format invalid
- `INVALID_ACCEPTANCE_CRITERIA`: At least one criterion required

**See Also:** [deliverable_read](#deliverable_read), [deliverable_update](#deliverable_update)

---

### deliverable_read

**Description**: Read a deliverable by ID with complete details and metadata.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| deliverableId | string | Yes | Deliverable ID (e.g., D-001) |

**Returns:**

```typescript
{
  deliverableId: "D-001",
  name: "Security Assessment Report",
  description: "Comprehensive security assessment with findings and remediation plan",
  type: "report",
  programId: "PROG-001",
  wbsCode: "1.2.3",
  owner: "security@example.com",
  dueDate: "2026-03-31T00:00:00Z",
  forecastDate: "2026-04-07T00:00:00Z",
  actualDate: null,
  priority: "critical",
  status: "in_progress",
  reviewStatus: "pending",
  qualityScore: null,
  percentComplete: 65,
  acceptanceCriteria: [
    "All systems assessed for vulnerabilities",
    "Findings documented with severity ratings",
    "Remediation plan with timelines included",
    "Executive summary provided"
  ],
  notes: "Assessment phase 80% complete",
  createdDate: "2026-01-05T10:30:00Z",
  createdBy: "pm@example.com",
  lastUpdated: "2026-03-15T14:20:00Z",
  daysUntilDue: 16,
  daysLate: 0,
  variance: 7,  // Days difference between forecast and due
  atRisk: true,
  submissions: [
    {
      submissionId: "SUB-001",
      submitDate: "2026-03-10T10:00:00Z",
      status: "changes_requested"
    }
  ],
  reviews: [],
  approvals: []
}
```

**Example:**

```typescript
const deliverable = await deliverable_read({
  deliverableId: "D-001"
});

console.log(`Status: ${deliverable.status}`);
console.log(`Progress: ${deliverable.percentComplete}%`);
console.log(`Days until due: ${deliverable.daysUntilDue}`);

if (deliverable.atRisk) {
  console.log(`WARNING: Deliverable at risk (${deliverable.variance} days variance)`);
}
```

**Errors:**
- `DELIVERABLE_NOT_FOUND`: Deliverable ID does not exist

**See Also:** [deliverable_create](#deliverable_create), [deliverable_list](#deliverable_list)

---

### deliverable_update

**Description**: Update a deliverable's details, status, dates, or progress.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| deliverableId | string | Yes | Deliverable ID |
| (plus optional update fields) | | No | Fields to update |

**Updatable Fields:**
```typescript
{
  name?: string,
  description?: string,
  owner?: string,
  dueDate?: string,  // ISO 8601
  forecastDate?: string,  // ISO 8601
  actualDate?: string,  // ISO 8601
  status?: "not_started" | "in_progress" | "submitted" | "in_review" | "changes_requested" | "in_approval" | "approved" | "complete",
  reviewStatus?: "pending" | "in_review" | "approved" | "rejected",
  qualityScore?: number,  // 0-100
  percentComplete?: number,  // 0-100
  notes?: string
}
```

**Returns:**

```typescript
{
  deliverableId: "D-001",
  updated: true,
  changes: {
    status: { old: "not_started", new: "in_progress" },
    percentComplete: { old: 0, new: 35 },
    forecastDate: { old: "2026-03-31", new: "2026-04-07" }
  },
  deliverable: {
    // Full updated deliverable object
  }
}
```

**Example:**

```typescript
// Update status and progress
await deliverable_update({
  deliverableId: "D-001",
  status: "in_progress",
  percentComplete: 35,
  notes: "Assessment phase in progress"
});

// Update forecast (at risk)
await deliverable_update({
  deliverableId: "D-001",
  forecastDate: "2026-04-07",
  notes: "Delayed due to resource constraints"
});

// Mark complete
await deliverable_update({
  deliverableId: "D-001",
  status: "complete",
  actualDate: "2026-03-29",
  percentComplete: 100,
  qualityScore: 92
});
```

**Errors:**
- `DELIVERABLE_NOT_FOUND`: Deliverable ID does not exist
- `INVALID_STATUS`: Status value invalid
- `INVALID_DATE`: Date format invalid
- `INVALID_PERCENT`: Percent not in range 0-100
- `INVALID_QUALITY_SCORE`: Quality score not in range 0-100

**See Also:** [deliverable_read](#deliverable_read), [deliverable_track_status](#deliverable_track_status)

---

### deliverable_list

**Description**: List deliverables with optional filtering by program, status, owner, or type.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | No | Filter by program ID |
| status | string | No | Filter by status |
| owner | string | No | Filter by owner email |
| type | string | No | Filter by type |

**Returns:**

```typescript
{
  deliverables: [
    {
      deliverableId: "D-001",
      name: "Security Assessment Report",
      type: "report",
      owner: "security@example.com",
      dueDate: "2026-03-31",
      status: "in_progress",
      priority: "critical",
      percentComplete: 65,
      atRisk: true
    },
    {
      deliverableId: "D-002",
      name: "Implementation Plan",
      type: "document",
      owner: "pm@example.com",
      dueDate: "2026-04-15",
      status: "not_started",
      priority: "high",
      percentComplete: 0,
      atRisk: false
    }
  ],
  total: 42,
  filtered: 2
}
```

**Example:**

```typescript
// Get all deliverables for a program
const all = await deliverable_list({
  programId: "PROG-001"
});

// Get in-progress deliverables
const inProgress = await deliverable_list({
  programId: "PROG-001",
  status: "in_progress"
});

// Get deliverables by owner
const myDeliverables = await deliverable_list({
  owner: "security@example.com"
});

// Get report-type deliverables
const reports = await deliverable_list({
  type: "report"
});
```

**See Also:** [deliverable_get_overdue](#deliverable_get_overdue), [deliverable_get_at_risk](#deliverable_get_at_risk)

---

### deliverable_get_overdue

**Description**: Get all overdue deliverables for a program (actual date > due date or forecast > due date + no actual).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID |

**Returns:**

```typescript
{
  programId: "PROG-001",
  overdue: [
    {
      deliverableId: "D-005",
      name: "Design Document",
      owner: "architect@example.com",
      dueDate: "2026-02-28",
      forecastDate: "2026-03-15",
      actualDate: null,
      status: "in_progress",
      daysOverdue: 5,
      priority: "high"
    }
  ],
  total: 3
}
```

**Example:**

```typescript
const overdue = await deliverable_get_overdue({
  programId: "PROG-001"
});

if (overdue.total > 0) {
  console.log(`WARNING: ${overdue.total} overdue deliverables`);
  overdue.overdue.forEach(d => {
    console.log(`  ${d.name}: ${d.daysOverdue} days overdue`);
  });
}
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist

**See Also:** [deliverable_get_at_risk](#deliverable_get_at_risk), [deliverable_get_upcoming](#deliverable_get_upcoming)

---

### deliverable_get_at_risk

**Description**: Get deliverables at risk of missing their due date (forecast > due + status not complete).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID |

**Returns:**

```typescript
{
  programId: "PROG-001",
  atRisk: [
    {
      deliverableId: "D-001",
      name: "Security Assessment Report",
      owner: "security@example.com",
      dueDate: "2026-03-31",
      forecastDate: "2026-04-07",
      status: "in_progress",
      variance: 7,  // Days late
      priority: "critical",
      riskFactors: [
        "7 days behind schedule",
        "Critical priority",
        "Resource constraints"
      ]
    }
  ],
  total: 5
}
```

**Example:**

```typescript
const atRisk = await deliverable_get_at_risk({
  programId: "PROG-001"
});

console.log(`${atRisk.total} deliverables at risk`);

atRisk.atRisk.forEach(d => {
  console.log(`${d.name}: ${d.variance} days variance`);
  console.log(`  Risk factors: ${d.riskFactors.join(", ")}`);
});
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist

**See Also:** [deliverable_get_overdue](#deliverable_get_overdue), [deliverable_update_forecast](#deliverable_update_forecast)

---

### deliverable_get_upcoming

**Description**: Get upcoming deliverables due within the next N days.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID |
| daysAhead | number | No | Days to look ahead (default: 30, max: 90) |

**Returns:**

```typescript
{
  programId: "PROG-001",
  daysAhead: 30,
  upcoming: [
    {
      deliverableId: "D-008",
      name: "Test Plan",
      owner: "qa@example.com",
      dueDate: "2026-03-20",
      forecastDate: "2026-03-20",
      status: "not_started",
      daysUntilDue: 15,
      priority: "high"
    },
    {
      deliverableId: "D-001",
      name: "Security Assessment Report",
      owner: "security@example.com",
      dueDate: "2026-03-31",
      forecastDate: "2026-04-07",
      status: "in_progress",
      daysUntilDue: 26,
      priority: "critical",
      atRisk: true
    }
  ],
  total: 8
}
```

**Example:**

```typescript
// Get deliverables due in next 30 days
const upcoming = await deliverable_get_upcoming({
  programId: "PROG-001",
  daysAhead: 30
});

// Get deliverables due in next 7 days (this week)
const thisWeek = await deliverable_get_upcoming({
  programId: "PROG-001",
  daysAhead: 7
});

console.log(`${thisWeek.total} deliverables due this week`);
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist
- `INVALID_DAYS_AHEAD`: Days ahead exceeds maximum

**See Also:** [deliverable_list](#deliverable_list)

---

## Submission Tools

### deliverable_submit

**Description**: Submit a deliverable for review with file attachments and submitter notes.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| deliverableId | string | Yes | Deliverable ID |
| fileIds | array of strings | Yes | Google Drive file IDs (min 1) |
| submitterNotes | string | No | Submission notes for reviewers |

**Returns:**

```typescript
{
  submissionId: "SUB-001",
  deliverableId: "D-001",
  submitDate: "2026-03-25T10:30:00Z",
  submittedBy: "security@example.com",
  files: [
    {
      fileId: "1a2b3c4d5e6f7g8h9i0j",
      fileName: "Security-Assessment-Report-v2.1.docx",
      fileSize: 1048576,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }
  ],
  submitterNotes: "Assessment complete. All findings documented with remediation plans.",
  status: "pending_review",
  reviewers: [
    {
      reviewerId: "cto@example.com",
      assignedDate: "2026-03-25T10:35:00Z",
      status: "pending"
    }
  ]
}
```

**Example:**

```typescript
// Submit deliverable for review
const submission = await deliverable_submit({
  deliverableId: "D-001",
  fileIds: [
    "1a2b3c4d5e6f7g8h9i0j",  // Main document
    "1b2c3d4e5f6g7h8i9j0k"   // Supporting data
  ],
  submitterNotes: "Assessment complete. All findings documented with remediation plans."
});

console.log(`Submission ID: ${submission.submissionId}`);
console.log(`Assigned to ${submission.reviewers.length} reviewers`);
```

**Errors:**
- `DELIVERABLE_NOT_FOUND`: Deliverable ID does not exist
- `INVALID_STATUS`: Deliverable not in submittable status
- `FILE_NOT_FOUND`: One or more file IDs not found
- `NO_FILES`: At least one file required

**See Also:** [deliverable_assign_reviewer](#deliverable_assign_reviewer), [deliverable_get_pending_submissions](#deliverable_get_pending_submissions)

---

### deliverable_get_pending_submissions

**Description**: Get submissions pending review, optionally filtered by reviewer.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| reviewerId | string | No | Filter by reviewer email |

**Returns:**

```typescript
{
  pendingSubmissions: [
    {
      submissionId: "SUB-001",
      deliverableId: "D-001",
      deliverableName: "Security Assessment Report",
      programId: "PROG-001",
      submitDate: "2026-03-25T10:30:00Z",
      submittedBy: "security@example.com",
      fileCount: 2,
      reviewDueDate: "2026-04-01T00:00:00Z",
      daysUntilDue: 7,
      assignedReviewer: "cto@example.com"
    }
  ],
  total: 5
}
```

**Example:**

```typescript
// Get all pending submissions
const all = await deliverable_get_pending_submissions();

// Get submissions for specific reviewer
const myReviews = await deliverable_get_pending_submissions({
  reviewerId: "cto@example.com"
});

console.log(`You have ${myReviews.total} pending reviews`);
```

**See Also:** [deliverable_submit](#deliverable_submit), [deliverable_submit_review](#deliverable_submit_review)

---

## Review Tools

### deliverable_assign_reviewer

**Description**: Manually assign a reviewer to a deliverable with review due date.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| deliverableId | string | Yes | Deliverable ID |
| reviewerId | string | Yes | Reviewer email address |
| dueDate | string | Yes | Review due date (ISO 8601) |

**Returns:**

```typescript
{
  reviewAssignmentId: "REV-001",
  deliverableId: "D-001",
  reviewerId: "cto@example.com",
  assignedDate: "2026-03-25T10:35:00Z",
  dueDate: "2026-04-01T00:00:00Z",
  status: "pending",
  notificationSent: true
}
```

**Example:**

```typescript
// Assign reviewer
const assignment = await deliverable_assign_reviewer({
  deliverableId: "D-001",
  reviewerId: "cto@example.com",
  dueDate: "2026-04-01"
});

console.log(`Review assigned to ${assignment.reviewerId}`);
```

**Errors:**
- `DELIVERABLE_NOT_FOUND`: Deliverable ID does not exist
- `INVALID_EMAIL`: Reviewer email invalid
- `INVALID_DATE`: Date format invalid

**See Also:** [deliverable_submit](#deliverable_submit), [deliverable_list_pending_reviews](#deliverable_list_pending_reviews)

---

### deliverable_submit_review

**Description**: Submit a review with decision (approve/reject/request changes) and comments.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| deliverableId | string | Yes | Deliverable ID |
| submissionId | string | Yes | Submission ID being reviewed |
| decision | string | Yes | Decision: approve/reject/request_changes |
| comments | string | No | Review comments |
| qualityScore | number | No | Quality score 1-5 |

**Review Decisions:**
- `approve`: Meets all criteria, approved for next stage
- `reject`: Does not meet criteria, major issues
- `request_changes`: Minor issues, changes needed

**Returns:**

```typescript
{
  reviewId: "REV-001",
  deliverableId: "D-001",
  submissionId: "SUB-001",
  reviewerId: "cto@example.com",
  reviewDate: "2026-03-28T14:30:00Z",
  decision: "request_changes",
  comments: "Remediation plan needs more detail on high-severity findings. Timeline for critical issues should be accelerated.",
  qualityScore: 3,
  nextSteps: "Submitter to address comments and resubmit"
}
```

**Example:**

```typescript
// Approve review
await deliverable_submit_review({
  deliverableId: "D-001",
  submissionId: "SUB-001",
  decision: "approve",
  comments: "Excellent work. All findings documented thoroughly.",
  qualityScore: 5
});

// Request changes
await deliverable_submit_review({
  deliverableId: "D-001",
  submissionId: "SUB-001",
  decision: "request_changes",
  comments: "Need more detail on high-severity findings and accelerated timeline.",
  qualityScore: 3
});
```

**Errors:**
- `DELIVERABLE_NOT_FOUND`: Deliverable ID does not exist
- `SUBMISSION_NOT_FOUND`: Submission ID does not exist
- `INVALID_DECISION`: Decision value invalid
- `INVALID_QUALITY_SCORE`: Quality score not in range 1-5

**See Also:** [deliverable_assign_reviewer](#deliverable_assign_reviewer), [deliverable_approve](#deliverable_approve)

---

### deliverable_approve

**Description**: Final approval of a deliverable after review (executive/stakeholder approval).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| approvalId | string | Yes | Approval ID |
| decision | string | Yes | Decision: approve/reject/conditional |
| comments | string | Yes | Approval comments |
| conditions | array of strings | No | Conditions for conditional approval |

**Approval Decisions:**
- `approve`: Final approval, deliverable complete
- `reject`: Rejected, back to review
- `conditional`: Approved with conditions to be met

**Returns:**

```typescript
{
  approvalId: "APP-001",
  deliverableId: "D-001",
  approverId: "ceo@example.com",
  approvalDate: "2026-03-30T10:00:00Z",
  decision: "approve",
  comments: "Approved for implementation. Excellent assessment work.",
  conditions: [],
  deliverableStatus: "complete"
}
```

**Example:**

```typescript
// Full approval
await deliverable_approve({
  approvalId: "APP-001",
  decision: "approve",
  comments: "Approved for implementation. Excellent assessment work."
});

// Conditional approval
await deliverable_approve({
  approvalId: "APP-001",
  decision: "conditional",
  comments: "Approved pending verification of budget allocation",
  conditions: [
    "CFO approval of remediation budget",
    "Timeline confirmed with infrastructure team"
  ]
});
```

**Errors:**
- `APPROVAL_NOT_FOUND`: Approval ID does not exist
- `INVALID_DECISION`: Decision value invalid
- `CONDITIONS_REQUIRED`: Conditions required for conditional approval

**See Also:** [deliverable_submit_review](#deliverable_submit_review), [deliverable_list_pending_approvals](#deliverable_list_pending_approvals)

---

### deliverable_list_pending_reviews

**Description**: List pending reviews for a reviewer.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| reviewerId | string | Yes | Reviewer email address |

**Returns:**

```typescript
{
  reviewerId: "cto@example.com",
  pendingReviews: [
    {
      reviewAssignmentId: "REV-001",
      deliverableId: "D-001",
      deliverableName: "Security Assessment Report",
      submissionId: "SUB-001",
      assignedDate: "2026-03-25T10:35:00Z",
      dueDate: "2026-04-01T00:00:00Z",
      daysUntilDue: 3,
      submittedBy: "security@example.com",
      fileCount: 2
    }
  ],
  total: 4
}
```

**Example:**

```typescript
const reviews = await deliverable_list_pending_reviews({
  reviewerId: "cto@example.com"
});

console.log(`${reviews.total} pending reviews`);

reviews.pendingReviews.forEach(r => {
  console.log(`${r.deliverableName}: due in ${r.daysUntilDue} days`);
});
```

**Errors:**
- `INVALID_EMAIL`: Reviewer email invalid

**See Also:** [deliverable_submit_review](#deliverable_submit_review)

---

### deliverable_list_pending_approvals

**Description**: List pending approvals for an approver.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| approverId | string | Yes | Approver email address |

**Returns:**

```typescript
{
  approverId: "ceo@example.com",
  pendingApprovals: [
    {
      approvalId: "APP-001",
      deliverableId: "D-001",
      deliverableName: "Security Assessment Report",
      submissionId: "SUB-001",
      reviewId: "REV-001",
      reviewDecision: "approve",
      reviewDate: "2026-03-28T14:30:00Z",
      reviewComments: "Excellent work. All findings documented thoroughly.",
      submittedBy: "security@example.com",
      reviewedBy: "cto@example.com"
    }
  ],
  total: 2
}
```

**Example:**

```typescript
const approvals = await deliverable_list_pending_approvals({
  approverId: "ceo@example.com"
});

console.log(`${approvals.total} pending approvals`);

approvals.pendingApprovals.forEach(a => {
  console.log(`${a.deliverableName}: reviewed by ${a.reviewedBy}`);
});
```

**Errors:**
- `INVALID_EMAIL`: Approver email invalid

**See Also:** [deliverable_approve](#deliverable_approve)

---

## Quality Tools

### deliverable_create_checklist

**Description**: Create a quality checklist template for a deliverable type or all types.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | Yes | Checklist name |
| description | string | Yes | Checklist description |
| deliverableType | string | Yes | Deliverable type or 'all' for universal |

**Returns:**

```typescript
{
  checklistId: "CHK-001",
  name: "Security Report Quality Checklist",
  description: "Quality criteria for security assessment reports",
  deliverableType: "report",
  criteria: [
    {
      criterionId: "C-001",
      criterion: "Executive summary provided",
      weight: 1,
      critical: true
    },
    {
      criterionId: "C-002",
      criterion: "All findings have severity ratings",
      weight: 2,
      critical: true
    },
    {
      criterionId: "C-003",
      criterion: "Remediation plan with timelines",
      weight: 2,
      critical: true
    },
    {
      criterionId: "C-004",
      criterion: "Supporting evidence included",
      weight: 1,
      critical: false
    }
  ],
  totalWeight: 6,
  createdDate: "2026-01-05T10:00:00Z"
}
```

**Example:**

```typescript
const checklist = await deliverable_create_checklist({
  name: "Security Report Quality Checklist",
  description: "Quality criteria for security assessment reports",
  deliverableType: "report"
});

console.log(`Created checklist: ${checklist.checklistId}`);
console.log(`${checklist.criteria.length} criteria`);
```

**Errors:**
- `INVALID_TYPE`: Deliverable type invalid

**See Also:** [deliverable_evaluate_quality](#deliverable_evaluate_quality)

---

### deliverable_evaluate_quality

**Description**: Evaluate a deliverable against a quality checklist with scoring.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| deliverableId | string | Yes | Deliverable ID |
| checklistId | string | Yes | Quality checklist ID |
| results | array | Yes | Evaluation results for each criterion |
| reviewId | string | No | Associated review ID |

**Results Format:**
```typescript
results: [
  {
    criterionId: "C-001",
    passed: true,
    comments: "Executive summary clear and comprehensive"
  },
  {
    criterionId: "C-002",
    passed: true,
    comments: "All findings properly categorized"
  },
  {
    criterionId: "C-003",
    passed: false,
    comments: "Timeline needs more detail for high-severity items"
  }
]
```

**Returns:**

```typescript
{
  evaluationId: "EVAL-001",
  deliverableId: "D-001",
  checklistId: "CHK-001",
  evaluatedBy: "qa@example.com",
  evaluationDate: "2026-03-28T10:00:00Z",
  results: [
    {
      criterionId: "C-001",
      criterion: "Executive summary provided",
      passed: true,
      weight: 1,
      critical: true,
      comments: "Executive summary clear and comprehensive"
    },
    {
      criterionId: "C-002",
      criterion: "All findings have severity ratings",
      passed: true,
      weight: 2,
      critical: true,
      comments: "All findings properly categorized"
    },
    {
      criterionId: "C-003",
      criterion: "Remediation plan with timelines",
      passed: false,
      weight: 2,
      critical: true,
      comments: "Timeline needs more detail for high-severity items"
    }
  ],
  score: {
    pointsEarned: 3,
    pointsPossible: 6,
    percentage: 50,
    criticalFailures: 1,
    passed: false  // Has critical failures
  }
}
```

**Example:**

```typescript
const evaluation = await deliverable_evaluate_quality({
  deliverableId: "D-001",
  checklistId: "CHK-001",
  results: [
    { criterionId: "C-001", passed: true, comments: "Executive summary clear" },
    { criterionId: "C-002", passed: true, comments: "Findings categorized" },
    { criterionId: "C-003", passed: false, comments: "Timeline needs detail" }
  ]
});

console.log(`Quality score: ${evaluation.score.percentage}%`);

if (!evaluation.score.passed) {
  console.log(`Critical failures: ${evaluation.score.criticalFailures}`);
}
```

**Errors:**
- `DELIVERABLE_NOT_FOUND`: Deliverable ID does not exist
- `CHECKLIST_NOT_FOUND`: Checklist ID does not exist
- `MISSING_CRITERIA`: Not all criteria evaluated

**See Also:** [deliverable_create_checklist](#deliverable_create_checklist)

---

## Reporting Tools

### deliverable_generate_status_report

**Description**: Generate a comprehensive status report for deliverables in a program.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID |
| includeCharts | boolean | No | Include visualization data (default: true) |

**Returns:**

```typescript
{
  programId: "PROG-001",
  reportDate: "2026-03-28T10:00:00Z",
  summary: {
    totalDeliverables: 42,
    byStatus: {
      not_started: 8,
      in_progress: 15,
      submitted: 3,
      in_review: 4,
      changes_requested: 2,
      in_approval: 2,
      approved: 3,
      complete: 5
    },
    byPriority: {
      critical: 8,
      high: 12,
      medium: 15,
      low: 7
    },
    overdue: 3,
    atRisk: 5,
    onTrack: 29
  },
  charts: {
    statusDistribution: {
      labels: ["Not Started", "In Progress", "Submitted", ...],
      values: [8, 15, 3, ...],
      percentages: [19, 36, 7, ...]
    },
    priorityDistribution: { /* ... */ },
    completionTrend: {
      dates: ["2026-01", "2026-02", "2026-03"],
      completed: [2, 3, 5],
      cumulative: [2, 5, 10]
    }
  },
  highlights: [
    "5 deliverables completed in March",
    "3 overdue deliverables require immediate attention",
    "87% of critical deliverables on track"
  ],
  concerns: [
    "D-005: Design Document 5 days overdue",
    "D-001: Security Assessment 7 days behind forecast"
  ]
}
```

**Example:**

```typescript
const report = await deliverable_generate_status_report({
  programId: "PROG-001",
  includeCharts: true
});

console.log(`Total deliverables: ${report.summary.totalDeliverables}`);
console.log(`Overdue: ${report.summary.overdue}`);
console.log(`At risk: ${report.summary.atRisk}`);

console.log("\nHighlights:");
report.highlights.forEach(h => console.log(`  - ${h}`));

console.log("\nConcerns:");
report.concerns.forEach(c => console.log(`  - ${c}`));
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist

**See Also:** [deliverable_generate_summary](#deliverable_generate_summary)

---

### deliverable_generate_quality_report

**Description**: Generate a quality report showing quality scores and trends.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID |

**Returns:**

```typescript
{
  programId: "PROG-001",
  reportDate: "2026-03-28T10:00:00Z",
  summary: {
    deliverablesWithScores: 8,
    averageQualityScore: 87,
    scoreDistribution: {
      excellent: 3,    // 90-100
      good: 3,         // 80-89
      acceptable: 2,   // 70-79
      poor: 0          // < 70
    }
  },
  topQuality: [
    { deliverableId: "D-003", name: "Architecture Design", score: 95 },
    { deliverableId: "D-007", name: "Test Plan", score: 92 }
  ],
  needsImprovement: [
    { deliverableId: "D-012", name: "User Guide", score: 72 }
  ],
  trend: {
    months: ["Jan", "Feb", "Mar"],
    averageScores: [82, 85, 87]
  }
}
```

**Example:**

```typescript
const report = await deliverable_generate_quality_report({
  programId: "PROG-001"
});

console.log(`Average quality: ${report.summary.averageQualityScore}%`);
console.log(`Top performers:`);
report.topQuality.forEach(d => {
  console.log(`  ${d.name}: ${d.score}%`);
});
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist

**See Also:** [deliverable_evaluate_quality](#deliverable_evaluate_quality)

---

### deliverable_generate_schedule_report

**Description**: Generate a schedule variance report showing on-time vs late deliverables.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID |

**Returns:**

```typescript
{
  programId: "PROG-001",
  reportDate: "2026-03-28T10:00:00Z",
  summary: {
    totalCompleted: 10,
    onTime: 7,
    late: 3,
    averageVariance: 2.3,  // Days
    onTimePercentage: 70
  },
  lateDeliverables: [
    {
      deliverableId: "D-004",
      name: "Requirements Document",
      dueDate: "2026-02-28",
      actualDate: "2026-03-05",
      daysLate: 5
    }
  ],
  upcomingRisks: [
    {
      deliverableId: "D-001",
      name: "Security Assessment Report",
      dueDate: "2026-03-31",
      forecastDate: "2026-04-07",
      variance: 7
    }
  ]
}
```

**Example:**

```typescript
const report = await deliverable_generate_schedule_report({
  programId: "PROG-001"
});

console.log(`On-time delivery: ${report.summary.onTimePercentage}%`);
console.log(`Average variance: ${report.summary.averageVariance} days`);
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist

**See Also:** [deliverable_get_overdue](#deliverable_get_overdue), [deliverable_get_at_risk](#deliverable_get_at_risk)

---

### deliverable_generate_summary

**Description**: Generate a summary dashboard with key metrics across all dimensions.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID |

**Returns:**

```typescript
{
  programId: "PROG-001",
  programName: "Digital Transformation Initiative",
  reportDate: "2026-03-28T10:00:00Z",
  overview: {
    totalDeliverables: 42,
    completed: 10,
    inProgress: 18,
    notStarted: 8,
    overdue: 3,
    atRisk: 5,
    percentComplete: 24
  },
  schedule: {
    onTimeDelivery: 70,
    averageVariance: 2.3
  },
  quality: {
    averageScore: 87,
    deliverablesScored: 8
  },
  priorities: {
    critical: { total: 8, completed: 2, atRisk: 2 },
    high: { total: 12, completed: 3, atRisk: 2 }
  },
  alerts: [
    "3 overdue deliverables require immediate attention",
    "5 deliverables at risk of missing deadlines",
    "2 critical deliverables behind schedule"
  ],
  trends: {
    completionRate: "improving",
    qualityTrend: "stable",
    schedulePerformance: "declining"
  }
}
```

**Example:**

```typescript
const summary = await deliverable_generate_summary({
  programId: "PROG-001"
});

console.log(`Program: ${summary.programName}`);
console.log(`Completion: ${summary.overview.percentComplete}%`);
console.log(`Quality: ${summary.quality.averageScore}%`);
console.log(`On-time delivery: ${summary.schedule.onTimeDelivery}%`);

console.log("\nAlerts:");
summary.alerts.forEach(a => console.log(`  ⚠ ${a}`));
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist

**See Also:** [deliverable_generate_status_report](#deliverable_generate_status_report)

---

## Tracking Tools

### deliverable_track_status

**Description**: Record a status update/change for a deliverable with notes.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| deliverableId | string | Yes | Deliverable ID |
| status | string | Yes | New status |
| percentComplete | number | Yes | Completion percentage (0-100) |
| forecastDate | string | No | Updated forecast date (ISO 8601) |
| notes | string | Yes | Status update notes |

**Returns:**

```typescript
{
  trackingId: "TRK-001",
  deliverableId: "D-001",
  timestamp: "2026-03-20T10:00:00Z",
  updatedBy: "security@example.com",
  status: "in_progress",
  percentComplete: 65,
  forecastDate: "2026-04-07",
  notes: "Assessment phase 65% complete. Delayed due to resource constraints.",
  variance: 7
}
```

**Example:**

```typescript
// Record status update
await deliverable_track_status({
  deliverableId: "D-001",
  status: "in_progress",
  percentComplete: 65,
  forecastDate: "2026-04-07",
  notes: "Assessment phase 65% complete. Delayed due to resource constraints."
});
```

**Errors:**
- `DELIVERABLE_NOT_FOUND`: Deliverable ID does not exist
- `INVALID_STATUS`: Status value invalid
- `INVALID_PERCENT`: Percent not in range 0-100

**See Also:** [deliverable_update](#deliverable_update)

---

### deliverable_update_forecast

**Description**: Update the forecast completion date for a deliverable with confidence and factors.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| deliverableId | string | Yes | Deliverable ID |
| forecastDate | string | Yes | New forecast date (ISO 8601) |
| confidence | number | Yes | Confidence level (0-100) |
| factors | array of strings | Yes | Factors affecting the forecast |

**Returns:**

```typescript
{
  deliverableId: "D-001",
  previousForecast: "2026-03-31",
  newForecast: "2026-04-07",
  variance: 7,
  confidence: 75,
  factors: [
    "Resource constraints - security lead unavailable",
    "Additional findings requiring investigation",
    "Dependencies on external vendor"
  ],
  updatedBy: "pm@example.com",
  updatedDate: "2026-03-20T10:00:00Z"
}
```

**Example:**

```typescript
await deliverable_update_forecast({
  deliverableId: "D-001",
  forecastDate: "2026-04-07",
  confidence: 75,
  factors: [
    "Resource constraints - security lead unavailable",
    "Additional findings requiring investigation",
    "Dependencies on external vendor"
  ]
});
```

**Errors:**
- `DELIVERABLE_NOT_FOUND`: Deliverable ID does not exist
- `INVALID_DATE`: Date format invalid
- `INVALID_CONFIDENCE`: Confidence not in range 0-100
- `MISSING_FACTORS`: At least one factor required

**See Also:** [deliverable_track_status](#deliverable_track_status)

---

### deliverable_check_notifications

**Description**: Check for deliverables needing notifications (due soon, overdue, at risk) and queue notifications.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID to check |

**Returns:**

```typescript
{
  programId: "PROG-001",
  checkDate: "2026-03-28T10:00:00Z",
  notifications: {
    dueSoon: [
      {
        deliverableId: "D-008",
        recipient: "qa@example.com",
        type: "due_soon",
        daysUntilDue: 3,
        sent: true
      }
    ],
    overdue: [
      {
        deliverableId: "D-005",
        recipient: "architect@example.com",
        type: "overdue",
        daysOverdue: 5,
        sent: true
      }
    ],
    atRisk: [
      {
        deliverableId: "D-001",
        recipient: "security@example.com",
        type: "at_risk",
        variance: 7,
        sent: true
      }
    ]
  },
  totalNotifications: 8
}
```

**Example:**

```typescript
// Check and queue notifications
const result = await deliverable_check_notifications({
  programId: "PROG-001"
});

console.log(`Sent ${result.totalNotifications} notifications`);
console.log(`  Due soon: ${result.notifications.dueSoon.length}`);
console.log(`  Overdue: ${result.notifications.overdue.length}`);
console.log(`  At risk: ${result.notifications.atRisk.length}`);
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist

**See Also:** [deliverable_get_upcoming](#deliverable_get_upcoming), [deliverable_get_overdue](#deliverable_get_overdue)

---

## Deliverable Management Best Practices

### Creation
1. **Define clear acceptance criteria**: Minimum 3-5 specific, measurable criteria
2. **Set realistic due dates**: Consider dependencies and resource availability
3. **Assign single owner**: One person accountable for delivery
4. **Link to WBS**: Connect deliverables to work breakdown structure

### Progress Tracking
1. **Update status weekly**: Keep status and percent complete current
2. **Update forecasts promptly**: Change forecast as soon as delays identified
3. **Document reasons**: Always provide notes with status updates
4. **Track variance**: Monitor difference between forecast and due date

### Submission and Review
1. **Submit complete work**: Ensure all acceptance criteria met
2. **Provide context**: Add submitter notes explaining the deliverable
3. **Timely reviews**: Complete reviews within assigned timeframe
4. **Constructive feedback**: Provide specific, actionable comments

### Quality Management
1. **Use checklists**: Create standard checklists by deliverable type
2. **Score objectively**: Follow checklist criteria consistently
3. **Track trends**: Monitor quality scores over time
4. **Learn from feedback**: Apply lessons to future deliverables

---

## Related Documentation

- [Program Management Tools](program.md) - Link deliverables to programs and WBS
- [PMO Tools](pmo.md) - PMO-level deliverable tracking
- [Document Organization Tools](documents.md) - Link documents to deliverables
- [Workflow Automation](workflows.md) - Automated deliverable workflows

---

**Next:** [Workflow Automation Tools](workflows.md) →
