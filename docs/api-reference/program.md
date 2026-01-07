# Program Management Tools

Enterprise program governance with charter, WBS, milestones, issues, and decision tracking.

**Last Updated:** 2026-01-05

---

## Overview

The Program Management module provides comprehensive tools for enterprise program governance following PMI (Project Management Institute) best practices. Manage program charters, work breakdown structures, milestones, issues, and decisions with full lifecycle tracking.

**Tool Categories:**
- **Charter Tools (4)**: Create and manage program charters
- **WBS Tools (2)**: Work Breakdown Structure management
- **Milestone Tools (3)**: Track program milestones
- **Issue Log Tools (3)**: Track and resolve issues
- **Decision Log Tools (2)**: Document program decisions

**Total: 16 tools**

---

## Charter Tools

### program_create_charter

**Description**: Create a new program charter with objectives, timeline, stakeholders, and governance structure.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | Yes | Program name |
| description | string | Yes | Program description and purpose |
| sponsor | string | Yes | Executive sponsor email address |
| programManager | string | Yes | Program manager email address |
| objective | string | Yes | Primary program objective |
| startDate | string | Yes | Start date (YYYY-MM-DD) |
| endDate | string | Yes | End date (YYYY-MM-DD) |
| priority | string | Yes | Priority: critical/high/medium/low |
| stakeholders | array of strings | No | Stakeholder email addresses |
| tags | array of strings | No | Tags for categorization |

**Returns:**

```typescript
{
  programId: "PROG-001",
  name: "Digital Transformation Initiative",
  description: "Modernize legacy systems and improve digital capabilities",
  sponsor: "ceo@example.com",
  programManager: "pm@example.com",
  objective: "Achieve 50% reduction in manual processes by Q4 2026",
  startDate: "2026-02-01",
  endDate: "2026-12-31",
  priority: "critical",
  status: "planning",
  health: "green",
  percentComplete: 0,
  stakeholders: ["cto@example.com", "cfo@example.com", "ops@example.com"],
  tags: ["digital", "transformation", "enterprise"],
  createdDate: "2026-01-05T10:30:00Z",
  createdBy: "pm@example.com"
}
```

**Example:**

```typescript
const charter = await program_create_charter({
  name: "Digital Transformation Initiative",
  description: "Modernize legacy systems across the organization",
  sponsor: "ceo@example.com",
  programManager: "pm@example.com",
  objective: "Achieve 50% reduction in manual processes",
  startDate: "2026-02-01",
  endDate: "2026-12-31",
  priority: "critical",
  stakeholders: ["cto@example.com", "cfo@example.com"],
  tags: ["digital", "transformation"]
});

console.log(`Program created: ${charter.programId}`);
```

**Errors:**
- `INVALID_DATE_RANGE`: End date before start date
- `INVALID_EMAIL`: Email format invalid
- `INVALID_PRIORITY`: Priority value invalid

**See Also:** [program_read_charter](#program_read_charter), [program_update_charter](#program_update_charter)

---

### program_read_charter

**Description**: Read a program charter by ID with all details.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID (e.g., PROG-001) |

**Returns:**

```typescript
{
  programId: "PROG-001",
  name: "Digital Transformation Initiative",
  description: "Modernize legacy systems and improve digital capabilities",
  sponsor: "ceo@example.com",
  programManager: "pm@example.com",
  objective: "Achieve 50% reduction in manual processes by Q4 2026",
  startDate: "2026-02-01",
  endDate: "2026-12-31",
  priority: "critical",
  status: "in_progress",
  health: "yellow",
  percentComplete: 35,
  stakeholders: ["cto@example.com", "cfo@example.com", "ops@example.com"],
  tags: ["digital", "transformation", "enterprise"],
  createdDate: "2026-01-05T10:30:00Z",
  createdBy: "pm@example.com",
  lastUpdated: "2026-01-15T14:20:00Z",
  metrics: {
    totalMilestones: 12,
    completedMilestones: 4,
    totalIssues: 8,
    openIssues: 3,
    totalDecisions: 15
  }
}
```

**Example:**

```typescript
const charter = await program_read_charter({
  programId: "PROG-001"
});

console.log(`Program: ${charter.name}`);
console.log(`Status: ${charter.status} (${charter.health})`);
console.log(`Progress: ${charter.percentComplete}%`);
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist

**See Also:** [program_create_charter](#program_create_charter), [program_list_charters](#program_list_charters)

---

### program_update_charter

**Description**: Update a program charter's status, health, progress, or other fields.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID to update |
| updates | object | Yes | Fields to update |

**Updatable Fields:**
```typescript
updates: {
  status?: "planning" | "in_progress" | "on_hold" | "completed" | "cancelled",
  health?: "green" | "yellow" | "red",
  percentComplete?: number,  // 0-100
  description?: string,
  objective?: string,
  endDate?: string,
  priority?: "critical" | "high" | "medium" | "low",
  stakeholders?: string[],
  tags?: string[]
}
```

**Returns:**

```typescript
{
  programId: "PROG-001",
  updated: true,
  changes: {
    status: { old: "planning", new: "in_progress" },
    health: { old: "green", new: "yellow" },
    percentComplete: { old: 0, new: 35 }
  },
  charter: {
    // Full updated charter object
  }
}
```

**Example:**

```typescript
// Update status and progress
await program_update_charter({
  programId: "PROG-001",
  updates: {
    status: "in_progress",
    percentComplete: 35,
    health: "yellow"
  }
});

// Update end date
await program_update_charter({
  programId: "PROG-001",
  updates: {
    endDate: "2027-03-31",
    health: "yellow"  // Delayed
  }
});
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist
- `INVALID_STATUS`: Status value invalid
- `INVALID_HEALTH`: Health value invalid
- `INVALID_PERCENT`: Percent not in range 0-100

**See Also:** [program_read_charter](#program_read_charter)

---

### program_list_charters

**Description**: List all program charters with optional filters.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| status | string | No | Filter by status (planning/in_progress/on_hold/completed/cancelled) |
| priority | string | No | Filter by priority (critical/high/medium/low) |
| health | string | No | Filter by health (green/yellow/red) |

**Returns:**

```typescript
{
  programs: [
    {
      programId: "PROG-001",
      name: "Digital Transformation Initiative",
      status: "in_progress",
      health: "yellow",
      priority: "critical",
      percentComplete: 35,
      startDate: "2026-02-01",
      endDate: "2026-12-31",
      programManager: "pm@example.com"
    },
    {
      programId: "PROG-002",
      name: "Infrastructure Upgrade",
      status: "planning",
      health: "green",
      priority: "high",
      percentComplete: 5,
      startDate: "2026-03-01",
      endDate: "2026-09-30",
      programManager: "infra-pm@example.com"
    }
  ],
  total: 12,
  filtered: 2
}
```

**Example:**

```typescript
// Get all active programs
const active = await program_list_charters({
  status: "in_progress"
});

// Get critical priority programs
const critical = await program_list_charters({
  priority: "critical"
});

// Get at-risk programs
const atRisk = await program_list_charters({
  health: "red"
});
```

**See Also:** [program_read_charter](#program_read_charter)

---

## WBS Tools

### program_create_wbs

**Description**: Create a Work Breakdown Structure element for organizing program work.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| wbsCode | string | Yes | WBS code (e.g., 1.2.3) |
| programId | string | Yes | Program ID |
| parentCode | string | No | Parent WBS code (for hierarchy) |
| description | string | Yes | WBS element description |
| responsible | string | Yes | Responsible person email |
| deliverables | array of strings | No | Associated deliverable IDs |

**WBS Code Format:**
```
1              Level 1 (Program)
1.1            Level 2 (Phase/Workstream)
1.1.1          Level 3 (Work Package)
1.1.1.1        Level 4 (Activity)
```

**Returns:**

```typescript
{
  wbsId: "WBS-001",
  wbsCode: "1.2.3",
  programId: "PROG-001",
  parentCode: "1.2",
  level: 3,
  description: "Security Assessment Activities",
  responsible: "security@example.com",
  deliverables: ["D-01", "D-02"],
  children: [],
  createdDate: "2026-01-05T10:30:00Z"
}
```

**Example:**

```typescript
// Create level 1 WBS (Phase)
const phase = await program_create_wbs({
  wbsCode: "1.2",
  programId: "PROG-001",
  parentCode: "1",
  description: "Assessment Phase",
  responsible: "pm@example.com"
});

// Create level 2 WBS (Work Package)
const workPackage = await program_create_wbs({
  wbsCode: "1.2.1",
  programId: "PROG-001",
  parentCode: "1.2",
  description: "Security Assessment",
  responsible: "security@example.com",
  deliverables: ["D-01", "D-02"]
});
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist
- `PARENT_NOT_FOUND`: Parent WBS code not found
- `INVALID_WBS_CODE`: WBS code format invalid
- `DUPLICATE_WBS_CODE`: WBS code already exists

**See Also:** [program_read_wbs](#program_read_wbs)

---

### program_read_wbs

**Description**: Read WBS hierarchy for a program with optional level filtering.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID |
| level | number | No | Filter by WBS level (1-5) |

**Returns:**

```typescript
{
  programId: "PROG-001",
  wbsElements: [
    {
      wbsId: "WBS-001",
      wbsCode: "1",
      level: 1,
      description: "Digital Transformation Program",
      responsible: "pm@example.com",
      children: ["1.1", "1.2", "1.3"]
    },
    {
      wbsId: "WBS-002",
      wbsCode: "1.1",
      level: 2,
      parentCode: "1",
      description: "Planning Phase",
      responsible: "planning-lead@example.com",
      deliverables: [],
      children: ["1.1.1", "1.1.2"]
    },
    {
      wbsId: "WBS-003",
      wbsCode: "1.2",
      level: 2,
      parentCode: "1",
      description: "Assessment Phase",
      responsible: "assessment-lead@example.com",
      deliverables: ["D-01", "D-02"],
      children: ["1.2.1", "1.2.2", "1.2.3"]
    }
  ],
  hierarchy: {
    "1": {
      code: "1",
      description: "Digital Transformation Program",
      children: {
        "1.1": { /* ... */ },
        "1.2": { /* ... */ },
        "1.3": { /* ... */ }
      }
    }
  }
}
```

**Example:**

```typescript
// Get full WBS hierarchy
const wbs = await program_read_wbs({
  programId: "PROG-001"
});

console.log(`Total WBS elements: ${wbs.wbsElements.length}`);

// Get only level 2 elements
const level2 = await program_read_wbs({
  programId: "PROG-001",
  level: 2
});
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist

**See Also:** [program_create_wbs](#program_create_wbs)

---

## Milestone Tools

### program_create_milestone

**Description**: Create a program milestone with acceptance criteria and ownership.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID |
| projectId | string | No | Associated project ID |
| wbsCode | string | No | Associated WBS code |
| name | string | Yes | Milestone name |
| description | string | Yes | Milestone description |
| targetDate | string | Yes | Target completion date (YYYY-MM-DD) |
| owner | string | Yes | Milestone owner email |
| acceptanceCriteria | string | Yes | What defines completion |
| critical | boolean | No | Is this critical path? (default: false) |

**Returns:**

```typescript
{
  milestoneId: "M-001",
  programId: "PROG-001",
  projectId: "PROJ-05",
  wbsCode: "1.2",
  name: "Assessment Complete",
  description: "Security assessment completed and report delivered",
  targetDate: "2026-03-31",
  forecastDate: "2026-03-31",
  actualDate: null,
  owner: "security@example.com",
  acceptanceCriteria: "Assessment report delivered and approved by stakeholders",
  critical: true,
  status: "not_started",
  createdDate: "2026-01-05T10:30:00Z"
}
```

**Example:**

```typescript
const milestone = await program_create_milestone({
  programId: "PROG-001",
  wbsCode: "1.2",
  name: "Assessment Complete",
  description: "Security assessment completed and report delivered",
  targetDate: "2026-03-31",
  owner: "security@example.com",
  acceptanceCriteria: "Assessment report delivered and approved by stakeholders",
  critical: true
});

console.log(`Milestone created: ${milestone.milestoneId}`);
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist
- `PROJECT_NOT_FOUND`: Project ID does not exist
- `INVALID_DATE`: Date format invalid

**See Also:** [program_track_milestone](#program_track_milestone), [program_get_milestones](#program_get_milestones)

---

### program_track_milestone

**Description**: Update milestone status, dates, and progress.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| milestoneId | string | Yes | Milestone ID (e.g., M-001) |
| status | string | No | Status: not_started/in_progress/at_risk/achieved/missed |
| actualDate | string | No | Actual completion date (YYYY-MM-DD) |
| forecastDate | string | No | Forecasted completion date (YYYY-MM-DD) |

**Status Values:**
- `not_started`: Work not yet begun
- `in_progress`: Work in progress, on track
- `at_risk`: At risk of missing target date
- `achieved`: Milestone achieved on or before target
- `missed`: Milestone missed (actual > target)

**Returns:**

```typescript
{
  milestoneId: "M-001",
  updated: true,
  changes: {
    status: { old: "not_started", new: "in_progress" },
    forecastDate: { old: "2026-03-31", new: "2026-04-07" }
  },
  milestone: {
    milestoneId: "M-001",
    programId: "PROG-001",
    name: "Assessment Complete",
    targetDate: "2026-03-31",
    forecastDate: "2026-04-07",
    actualDate: null,
    status: "at_risk",  // Automatically set due to forecast > target
    variance: 7,  // Days late
    owner: "security@example.com",
    lastUpdated: "2026-01-15T14:20:00Z"
  }
}
```

**Example:**

```typescript
// Update to in-progress
await program_track_milestone({
  milestoneId: "M-001",
  status: "in_progress"
});

// Update forecast (at risk)
await program_track_milestone({
  milestoneId: "M-001",
  forecastDate: "2026-04-07"  // 7 days late
});

// Mark as achieved
await program_track_milestone({
  milestoneId: "M-001",
  status: "achieved",
  actualDate: "2026-03-29"  // 2 days early
});
```

**Errors:**
- `MILESTONE_NOT_FOUND`: Milestone ID does not exist
- `INVALID_STATUS`: Status value invalid
- `INVALID_DATE`: Date format invalid

**See Also:** [program_create_milestone](#program_create_milestone)

---

### program_get_milestones

**Description**: Get milestones for a program with optional filtering.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID |
| status | string | No | Filter by status (not_started/in_progress/at_risk/achieved/missed) |
| critical | boolean | No | Filter critical milestones only |
| upcoming | boolean | No | Show upcoming only (next 30 days) |

**Returns:**

```typescript
{
  programId: "PROG-001",
  milestones: [
    {
      milestoneId: "M-001",
      name: "Assessment Complete",
      targetDate: "2026-03-31",
      forecastDate: "2026-04-07",
      status: "at_risk",
      critical: true,
      owner: "security@example.com",
      variance: 7
    },
    {
      milestoneId: "M-002",
      name: "Planning Approved",
      targetDate: "2026-04-15",
      forecastDate: "2026-04-15",
      status: "not_started",
      critical: true,
      owner: "pm@example.com",
      variance: 0
    }
  ],
  total: 12,
  filtered: 2,
  summary: {
    byStatus: {
      not_started: 5,
      in_progress: 3,
      at_risk: 2,
      achieved: 1,
      missed: 1
    },
    criticalCount: 6,
    atRiskCount: 2
  }
}
```

**Example:**

```typescript
// Get all milestones
const all = await program_get_milestones({
  programId: "PROG-001"
});

// Get critical milestones only
const critical = await program_get_milestones({
  programId: "PROG-001",
  critical: true
});

// Get at-risk milestones
const atRisk = await program_get_milestones({
  programId: "PROG-001",
  status: "at_risk"
});

// Get upcoming milestones
const upcoming = await program_get_milestones({
  programId: "PROG-001",
  upcoming: true
});
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist

**See Also:** [program_create_milestone](#program_create_milestone)

---

## Issue Log Tools

### program_log_issue

**Description**: Log a new program issue with category, priority, and severity.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID |
| title | string | Yes | Issue title |
| description | string | Yes | Detailed issue description |
| category | string | Yes | Category: technical/resource/schedule/quality/stakeholder/other |
| priority | string | Yes | Priority: critical/high/medium/low |
| severity | string | Yes | Severity: critical/major/minor |
| raisedBy | string | Yes | Who raised the issue (email) |
| impact | string | Yes | Impact assessment |

**Categories:**
- `technical`: Technical/architectural issues
- `resource`: Resource availability or capability issues
- `schedule`: Timeline or dependency issues
- `quality`: Quality or acceptance criteria issues
- `stakeholder`: Stakeholder management issues
- `other`: Other issues

**Priority vs Severity:**
- **Priority**: Urgency of resolution (when)
- **Severity**: Impact magnitude (how bad)

**Returns:**

```typescript
{
  issueId: "ISS-001",
  programId: "PROG-001",
  title: "Key security architect unavailable",
  description: "Lead security architect on medical leave for 4 weeks",
  category: "resource",
  priority: "high",
  severity: "major",
  status: "open",
  raisedBy: "pm@example.com",
  raisedDate: "2026-01-15",
  impact: "Security assessment delayed by 2-3 weeks",
  assignedTo: null,
  resolution: null,
  resolvedDate: null
}
```

**Example:**

```typescript
const issue = await program_log_issue({
  programId: "PROG-001",
  title: "Key security architect unavailable",
  description: "Lead security architect on medical leave for 4 weeks",
  category: "resource",
  priority: "high",
  severity: "major",
  raisedBy: "pm@example.com",
  impact: "Security assessment delayed by 2-3 weeks"
});

console.log(`Issue logged: ${issue.issueId}`);
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist
- `INVALID_CATEGORY`: Category value invalid
- `INVALID_PRIORITY`: Priority value invalid
- `INVALID_SEVERITY`: Severity value invalid

**See Also:** [program_track_issue](#program_track_issue), [program_get_issues](#program_get_issues)

---

### program_track_issue

**Description**: Update issue status, assignment, and resolution.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| issueId | string | Yes | Issue ID (e.g., ISS-001) |
| status | string | No | Status: open/in_progress/resolved/closed/escalated |
| assignedTo | string | No | Assigned to (email) |
| resolution | string | No | Resolution description |
| resolvedDate | string | No | Resolution date (YYYY-MM-DD) |

**Status Values:**
- `open`: Issue logged, not yet assigned
- `in_progress`: Work in progress to resolve
- `resolved`: Issue resolved, pending verification
- `closed`: Issue closed and verified
- `escalated`: Issue escalated to higher authority

**Returns:**

```typescript
{
  issueId: "ISS-001",
  updated: true,
  changes: {
    status: { old: "open", new: "in_progress" },
    assignedTo: { old: null, new: "hr@example.com" }
  },
  issue: {
    issueId: "ISS-001",
    programId: "PROG-001",
    title: "Key security architect unavailable",
    status: "in_progress",
    assignedTo: "hr@example.com",
    resolution: null,
    daysOpen: 5,
    lastUpdated: "2026-01-20T10:30:00Z"
  }
}
```

**Example:**

```typescript
// Assign issue
await program_track_issue({
  issueId: "ISS-001",
  status: "in_progress",
  assignedTo: "hr@example.com"
});

// Resolve issue
await program_track_issue({
  issueId: "ISS-001",
  status: "resolved",
  resolution: "Temporary contractor hired, knowledge transfer in progress",
  resolvedDate: "2026-01-25"
});

// Close issue
await program_track_issue({
  issueId: "ISS-001",
  status: "closed"
});
```

**Errors:**
- `ISSUE_NOT_FOUND`: Issue ID does not exist
- `INVALID_STATUS`: Status value invalid

**See Also:** [program_log_issue](#program_log_issue)

---

### program_get_issues

**Description**: Get issues for a program with filtering.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID |
| status | string | No | Filter by status (open/in_progress/resolved/closed/escalated) |
| priority | string | No | Filter by priority (critical/high/medium/low) |
| severity | string | No | Filter by severity (critical/major/minor) |

**Returns:**

```typescript
{
  programId: "PROG-001",
  issues: [
    {
      issueId: "ISS-001",
      title: "Key security architect unavailable",
      category: "resource",
      priority: "high",
      severity: "major",
      status: "in_progress",
      raisedBy: "pm@example.com",
      raisedDate: "2026-01-15",
      assignedTo: "hr@example.com",
      daysOpen: 5
    },
    {
      issueId: "ISS-002",
      title: "Budget approval delayed",
      category: "stakeholder",
      priority: "critical",
      severity: "critical",
      status: "open",
      raisedBy: "pm@example.com",
      raisedDate: "2026-01-18",
      assignedTo: null,
      daysOpen: 2
    }
  ],
  total: 8,
  filtered: 2,
  summary: {
    byStatus: {
      open: 3,
      in_progress: 2,
      resolved: 1,
      closed: 2,
      escalated: 0
    },
    byPriority: {
      critical: 2,
      high: 3,
      medium: 2,
      low: 1
    }
  }
}
```

**Example:**

```typescript
// Get open issues
const open = await program_get_issues({
  programId: "PROG-001",
  status: "open"
});

// Get critical priority issues
const critical = await program_get_issues({
  programId: "PROG-001",
  priority: "critical"
});

// Get all issues
const all = await program_get_issues({
  programId: "PROG-001"
});
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist

**See Also:** [program_log_issue](#program_log_issue), [pmo_read_risks](pmo.md#pmo_read_risks)

---

## Decision Log Tools

### program_log_decision

**Description**: Log a program decision with context, alternatives, and rationale.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID |
| decision | string | Yes | The decision made |
| context | string | Yes | Decision context/background |
| alternatives | array of strings | Yes | Alternatives considered |
| rationale | string | Yes | Why this decision was made |
| decisionMaker | string | Yes | Who made the decision (email) |
| stakeholders | array of strings | No | Involved stakeholders (emails) |
| impacts | array of strings | No | Expected impacts |
| category | string | No | Category: strategic/technical/operational/financial/other |

**Returns:**

```typescript
{
  decisionId: "DEC-001",
  programId: "PROG-001",
  decision: "Adopt cloud-first architecture",
  context: "Legacy on-premise infrastructure reaching end-of-life, need scalability",
  alternatives: [
    "Continue with on-premise infrastructure",
    "Hybrid cloud approach",
    "Full cloud migration"
  ],
  rationale: "Cloud-first provides best scalability, cost-efficiency, and aligns with enterprise strategy",
  decisionMaker: "cto@example.com",
  stakeholders: ["ceo@example.com", "cfo@example.com", "pm@example.com"],
  impacts: [
    "Require cloud skills training",
    "20% cost reduction over 3 years",
    "Improved scalability and disaster recovery"
  ],
  category: "strategic",
  decisionDate: "2026-01-15",
  createdBy: "pm@example.com"
}
```

**Example:**

```typescript
const decision = await program_log_decision({
  programId: "PROG-001",
  decision: "Adopt cloud-first architecture",
  context: "Legacy infrastructure reaching end-of-life, need scalability",
  alternatives: [
    "Continue with on-premise",
    "Hybrid cloud",
    "Full cloud migration"
  ],
  rationale: "Cloud-first provides best scalability and cost-efficiency",
  decisionMaker: "cto@example.com",
  stakeholders: ["ceo@example.com", "cfo@example.com"],
  impacts: [
    "Require cloud skills training",
    "20% cost reduction over 3 years"
  ],
  category: "strategic"
});

console.log(`Decision logged: ${decision.decisionId}`);
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist
- `INVALID_CATEGORY`: Category value invalid
- `INSUFFICIENT_ALTERNATIVES`: Must provide at least 2 alternatives

**See Also:** [program_get_decisions](#program_get_decisions)

---

### program_get_decisions

**Description**: Get decisions for a program with filtering.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID |
| category | string | No | Filter by category (strategic/technical/operational/financial/other) |
| decisionMaker | string | No | Filter by decision maker email |

**Returns:**

```typescript
{
  programId: "PROG-001",
  decisions: [
    {
      decisionId: "DEC-001",
      decision: "Adopt cloud-first architecture",
      category: "strategic",
      decisionMaker: "cto@example.com",
      decisionDate: "2026-01-15",
      stakeholders: ["ceo@example.com", "cfo@example.com", "pm@example.com"],
      impacts: [
        "Require cloud skills training",
        "20% cost reduction over 3 years"
      ]
    },
    {
      decisionId: "DEC-002",
      decision: "Implement phased rollout approach",
      category: "operational",
      decisionMaker: "pm@example.com",
      decisionDate: "2026-01-20",
      stakeholders: ["ops@example.com", "qa@example.com"],
      impacts: [
        "Reduced risk of widespread issues",
        "Extended timeline by 2 months"
      ]
    }
  ],
  total: 15,
  filtered: 2
}
```

**Example:**

```typescript
// Get all decisions
const all = await program_get_decisions({
  programId: "PROG-001"
});

// Get strategic decisions
const strategic = await program_get_decisions({
  programId: "PROG-001",
  category: "strategic"
});

// Get decisions by specific decision maker
const ctoDecisions = await program_get_decisions({
  programId: "PROG-001",
  decisionMaker: "cto@example.com"
});
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist

**See Also:** [program_log_decision](#program_log_decision)

---

## Program Management Best Practices

### Charter Management
1. **Define clear objectives**: Use SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound)
2. **Identify stakeholders early**: Include all key stakeholders in charter
3. **Update health regularly**: Review status and health at least weekly
4. **Track metrics**: Monitor completion percentage and key performance indicators

### WBS Development
1. **Use consistent numbering**: Follow standard WBS numbering conventions
2. **Decompose to manageable size**: Work packages should be 40-80 hours
3. **Assign clear ownership**: Every WBS element has one responsible person
4. **Link to deliverables**: Connect WBS elements to specific deliverables

### Milestone Tracking
1. **Make milestones measurable**: Clear acceptance criteria for completion
2. **Mark critical path**: Identify and track critical milestones closely
3. **Update forecasts regularly**: Review and update forecast dates weekly
4. **Communicate variance**: Alert stakeholders when milestones are at risk

### Issue Management
1. **Log issues promptly**: Don't delay logging issues
2. **Assign ownership**: Every issue needs an owner
3. **Track resolution time**: Monitor days open and escalate if needed
4. **Close properly**: Verify resolution before closing

### Decision Documentation
1. **Document context**: Explain why the decision was needed
2. **List alternatives**: Show what options were considered
3. **Explain rationale**: Clear reasoning for the decision
4. **Track impacts**: Monitor expected vs actual impacts

---

## Related Documentation

- [Deliverable Tracking Tools](deliverables.md) - Link deliverables to WBS and milestones
- [PMO Tools](pmo.md) - PMO-level tracking and analysis
- [Document Organization Tools](documents.md) - Program document management
- [Workflow Automation](workflows.md) - Automated program workflows

---

**Next:** [Document Organization Tools](documents.md) →
