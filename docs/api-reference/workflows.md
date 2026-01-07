# Workflow Automation Tools

Event-driven and scheduled workflow automation with role-based access control.

**Last Updated:** 2026-01-05

---

## Overview

The Workflow Automation module provides enterprise workflow orchestration with event-driven triggers, scheduled execution, and role-based access control. Automate repetitive tasks, coordinate multi-step processes, and integrate across Google Workspace and program management modules.

**Key Features:**
- Event-driven workflows triggered by system events
- Scheduled workflows with cron-like syntax
- Role-based access control with 7 permission levels
- Workflow execution history and monitoring
- Retry logic with exponential backoff
- Action library with 20+ built-in actions

**Total: 10 tools**

---

## Workflow Concepts

### Workflow Types

**Event-Driven Workflows**
Triggered automatically when specific events occur:
- `document_submitted`: When document submitted for routing
- `deliverable_submitted`: When deliverable submitted for review
- `deliverable_overdue`: When deliverable becomes overdue
- `milestone_achieved`: When milestone completed
- `issue_escalated`: When issue escalated

**Scheduled Workflows**
Run on a schedule using cron-like syntax:
- Daily reports at specific time
- Weekly status updates
- Monthly archival processes
- Custom schedules (every N hours/days)

### Workflow Execution States

```
┌──────────────────────────────────────────────────┐
│          WORKFLOW EXECUTION STATES                │
├──────────────────────────────────────────────────┤
│                                                   │
│  PENDING  ──► RUNNING  ──► SUCCESS               │
│                  │                                │
│                  ├──► FAILED                      │
│                  │      │                         │
│                  │      ▼                         │
│                  ├──► RETRY (3x)                  │
│                  │      │                         │
│                  │      ▼                         │
│                  └──► FAILED_FINAL                │
│                                                   │
└──────────────────────────────────────────────────┘
```

### Role Hierarchy

```
SYSTEM      ─► Full system access, workflow management
  │
ADMIN       ─► Workflow creation, all program access
  │
PROGRAM_MANAGER ─► Manage programs, approve deliverables
  │
PROJECT_MANAGER ─► Manage projects, submit deliverables
  │
TEAM_MEMBER ─► Create/update deliverables
  │
REVIEWER    ─► Review deliverables
  │
VIEWER      ─► Read-only access
```

---

## Tools

### workflow_list

**Description**: List all registered workflows with their status and configuration.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| enabled | boolean | No | Filter by enabled status |
| category | string | No | Filter by workflow category |

**Returns:**

```typescript
{
  workflows: [
    {
      workflowId: "wf_overdue_notification",
      name: "Overdue Deliverable Notifications",
      description: "Send notifications for overdue deliverables",
      type: "scheduled",
      schedule: "0 9 * * *",  // Daily at 9 AM
      enabled: true,
      category: "notifications",
      lastRun: "2026-03-28T09:00:00Z",
      lastStatus: "success",
      totalExecutions: 42,
      successRate: 0.95
    },
    {
      workflowId: "wf_document_routing",
      name: "Automatic Document Routing",
      description: "Route documents when submitted",
      type: "event",
      eventType: "document_submitted",
      enabled: true,
      category: "automation",
      lastRun: "2026-03-28T14:30:00Z",
      lastStatus: "success",
      totalExecutions: 128,
      successRate: 0.98
    }
  ],
  total: 15,
  enabled: 12,
  disabled: 3
}
```

**Example:**

```typescript
// List all workflows
const all = await workflow_list();

// List enabled workflows only
const enabled = await workflow_list({
  enabled: true
});

// List notification workflows
const notifications = await workflow_list({
  category: "notifications"
});

console.log(`Total workflows: ${all.total}`);
console.log(`Enabled: ${all.enabled}`);
```

**See Also:** [workflow_execute](#workflow_execute), [workflow_get_execution](#workflow_get_execution)

---

### workflow_execute

**Description**: Manually execute a workflow by ID with optional context variables.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| workflowId | string | Yes | Unique workflow ID to execute |
| context | object | No | Execution context with variables |

**Context Variables:**
```typescript
context: {
  programId?: string,
  deliverableId?: string,
  documentId?: string,
  userId?: string,
  customData?: any
}
```

**Returns:**

```typescript
{
  executionId: "exec_1a2b3c4d5e6f",
  workflowId: "wf_overdue_notification",
  status: "running",
  startTime: "2026-03-28T10:00:00Z",
  context: {
    programId: "PROG-001",
    triggeredBy: "manual"
  },
  actions: [
    {
      actionId: "action_1",
      name: "Get overdue deliverables",
      status: "pending"
    },
    {
      actionId: "action_2",
      name: "Send notifications",
      status: "pending"
    }
  ]
}
```

**Example:**

```typescript
// Execute workflow manually
const execution = await workflow_execute({
  workflowId: "wf_overdue_notification",
  context: {
    programId: "PROG-001"
  }
});

console.log(`Execution ID: ${execution.executionId}`);
console.log(`Status: ${execution.status}`);

// Wait for completion (using workflow_get_execution)
const result = await workflow_get_execution({
  executionId: execution.executionId
});
```

**Errors:**
- `WORKFLOW_NOT_FOUND`: Workflow ID does not exist
- `WORKFLOW_DISABLED`: Workflow is disabled
- `INVALID_CONTEXT`: Context data invalid

**See Also:** [workflow_get_execution](#workflow_get_execution), [workflow_list_executions](#workflow_list_executions)

---

### workflow_get_execution

**Description**: Get details of a workflow execution by ID including action results.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| executionId | string | Yes | Unique execution ID |

**Returns:**

```typescript
{
  executionId: "exec_1a2b3c4d5e6f",
  workflowId: "wf_overdue_notification",
  status: "success",
  startTime: "2026-03-28T10:00:00Z",
  endTime: "2026-03-28T10:00:45Z",
  duration: 45000,  // Milliseconds
  context: {
    programId: "PROG-001",
    triggeredBy: "manual"
  },
  actions: [
    {
      actionId: "action_1",
      name: "Get overdue deliverables",
      status: "success",
      startTime: "2026-03-28T10:00:00Z",
      endTime: "2026-03-28T10:00:15Z",
      result: {
        deliverables: ["D-005", "D-012", "D-018"],
        count: 3
      }
    },
    {
      actionId: "action_2",
      name: "Send notifications",
      status: "success",
      startTime: "2026-03-28T10:00:15Z",
      endTime: "2026-03-28T10:00:45Z",
      result: {
        sent: 3,
        failed: 0
      }
    }
  ],
  output: {
    notificationsSent: 3,
    deliverables: ["D-005", "D-012", "D-018"]
  }
}
```

**Execution Status:**
- `pending`: Waiting to start
- `running`: Currently executing
- `success`: Completed successfully
- `failed`: Failed with error
- `retry`: Retrying after failure
- `failed_final`: Failed after max retries

**Example:**

```typescript
const execution = await workflow_get_execution({
  executionId: "exec_1a2b3c4d5e6f"
});

console.log(`Status: ${execution.status}`);
console.log(`Duration: ${execution.duration}ms`);

if (execution.status === "success") {
  console.log(`Output: ${JSON.stringify(execution.output)}`);
} else if (execution.status === "failed") {
  console.log(`Error: ${execution.error}`);
}
```

**Errors:**
- `EXECUTION_NOT_FOUND`: Execution ID does not exist

**See Also:** [workflow_execute](#workflow_execute), [workflow_list_executions](#workflow_list_executions)

---

### workflow_list_executions

**Description**: List recent workflow executions with filtering.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| workflowId | string | No | Filter by workflow ID |
| limit | number | No | Max executions to return (default: 100, max: 500) |

**Returns:**

```typescript
{
  executions: [
    {
      executionId: "exec_1a2b3c4d5e6f",
      workflowId: "wf_overdue_notification",
      status: "success",
      startTime: "2026-03-28T10:00:00Z",
      endTime: "2026-03-28T10:00:45Z",
      duration: 45000,
      triggeredBy: "manual"
    },
    {
      executionId: "exec_9z8y7x6w5v4u",
      workflowId: "wf_document_routing",
      status: "success",
      startTime: "2026-03-28T09:30:00Z",
      endTime: "2026-03-28T09:30:12Z",
      duration: 12000,
      triggeredBy: "event:document_submitted"
    },
    {
      executionId: "exec_3t2s1r0q9p8o",
      workflowId: "wf_overdue_notification",
      status: "failed",
      startTime: "2026-03-27T10:00:00Z",
      endTime: "2026-03-27T10:00:30Z",
      duration: 30000,
      triggeredBy: "schedule",
      error: "Failed to send email: SMTP connection timeout"
    }
  ],
  total: 256,
  returned: 100
}
```

**Example:**

```typescript
// List all recent executions
const all = await workflow_list_executions({
  limit: 50
});

// List executions for specific workflow
const workflowExecs = await workflow_list_executions({
  workflowId: "wf_overdue_notification",
  limit: 20
});

console.log(`Total executions: ${workflowExecs.total}`);

// Find failed executions
const failed = workflowExecs.executions.filter(e => e.status === "failed");
console.log(`Failed: ${failed.length}`);
```

**See Also:** [workflow_get_execution](#workflow_get_execution)

---

### workflow_enable

**Description**: Enable a workflow to allow automatic execution.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| workflowId | string | Yes | Workflow ID to enable |

**Returns:**

```typescript
{
  workflowId: "wf_overdue_notification",
  enabled: true,
  updatedBy: "admin@example.com",
  updatedDate: "2026-03-28T10:00:00Z"
}
```

**Example:**

```typescript
// Enable workflow
await workflow_enable({
  workflowId: "wf_overdue_notification"
});

console.log("Workflow enabled");
```

**Errors:**
- `WORKFLOW_NOT_FOUND`: Workflow ID does not exist
- `ALREADY_ENABLED`: Workflow already enabled

**See Also:** [workflow_disable](#workflow_disable), [workflow_list](#workflow_list)

---

### workflow_disable

**Description**: Disable a workflow to prevent automatic execution.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| workflowId | string | Yes | Workflow ID to disable |

**Returns:**

```typescript
{
  workflowId: "wf_overdue_notification",
  enabled: false,
  updatedBy: "admin@example.com",
  updatedDate: "2026-03-28T10:00:00Z",
  reason: "Maintenance"
}
```

**Example:**

```typescript
// Disable workflow
await workflow_disable({
  workflowId: "wf_overdue_notification"
});

console.log("Workflow disabled");
```

**Errors:**
- `WORKFLOW_NOT_FOUND`: Workflow ID does not exist
- `ALREADY_DISABLED`: Workflow already disabled

**See Also:** [workflow_enable](#workflow_enable), [workflow_list](#workflow_list)

---

### workflow_get_schedule

**Description**: Get schedule information for a scheduled workflow.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| workflowId | string | Yes | Workflow ID |

**Returns:**

```typescript
{
  workflowId: "wf_overdue_notification",
  schedule: "0 9 * * *",
  scheduleType: "cron",
  timezone: "America/Los_Angeles",
  nextRun: "2026-03-29T09:00:00Z",
  lastRun: "2026-03-28T09:00:00Z",
  enabled: true,
  humanReadable: "Daily at 9:00 AM Pacific"
}
```

**Cron Schedule Format:**
```
┌─────────── minute (0-59)
│ ┌────────── hour (0-23)
│ │ ┌──────── day of month (1-31)
│ │ │ ┌────── month (1-12)
│ │ │ │ ┌──── day of week (0-6, Sunday=0)
│ │ │ │ │
* * * * *

Examples:
"0 9 * * *"      Daily at 9 AM
"0 9 * * 1"      Every Monday at 9 AM
"*/30 * * * *"   Every 30 minutes
"0 0 1 * *"      First day of month at midnight
```

**Example:**

```typescript
const schedule = await workflow_get_schedule({
  workflowId: "wf_overdue_notification"
});

console.log(`Schedule: ${schedule.humanReadable}`);
console.log(`Next run: ${schedule.nextRun}`);
```

**Errors:**
- `WORKFLOW_NOT_FOUND`: Workflow ID does not exist
- `NOT_SCHEDULED_WORKFLOW`: Workflow is not scheduled type

**See Also:** [workflow_get_upcoming_runs](#workflow_get_upcoming_runs)

---

### workflow_get_upcoming_runs

**Description**: Get upcoming scheduled workflow runs across all workflows.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| limit | number | No | Max upcoming runs (default: 10, max: 50) |

**Returns:**

```typescript
{
  upcomingRuns: [
    {
      workflowId: "wf_overdue_notification",
      workflowName: "Overdue Deliverable Notifications",
      scheduledTime: "2026-03-29T09:00:00Z",
      schedule: "0 9 * * *",
      humanReadable: "Tomorrow at 9:00 AM"
    },
    {
      workflowId: "wf_weekly_status",
      workflowName: "Weekly Status Report",
      scheduledTime: "2026-03-31T17:00:00Z",
      schedule: "0 17 * * 5",
      humanReadable: "Friday at 5:00 PM"
    }
  ],
  total: 5
}
```

**Example:**

```typescript
const upcoming = await workflow_get_upcoming_runs({
  limit: 20
});

console.log("Upcoming workflow runs:");
upcoming.upcomingRuns.forEach(run => {
  console.log(`  ${run.workflowName}: ${run.humanReadable}`);
});
```

**See Also:** [workflow_get_schedule](#workflow_get_schedule), [workflow_list](#workflow_list)

---

### workflow_emit_event

**Description**: Manually emit an event to trigger event-based workflows for testing or manual triggering.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| eventType | string | Yes | Event type (e.g., 'document_submitted') |
| source | string | Yes | Event source identifier |
| data | object | Yes | Event data payload |
| userId | string | No | User ID who triggered the event |

**Event Types:**
- `document_submitted`: Document submitted for routing
- `deliverable_submitted`: Deliverable submitted for review
- `deliverable_overdue`: Deliverable became overdue
- `deliverable_completed`: Deliverable completed
- `milestone_achieved`: Milestone achieved
- `milestone_at_risk`: Milestone at risk
- `issue_created`: Issue logged
- `issue_escalated`: Issue escalated
- `decision_logged`: Decision logged
- `review_completed`: Review completed

**Returns:**

```typescript
{
  eventId: "evt_1a2b3c4d5e6f",
  eventType: "document_submitted",
  source: "manual_trigger",
  timestamp: "2026-03-28T10:00:00Z",
  data: {
    documentId: "DOC-001",
    programId: "PROG-001",
    userId: "pm@example.com"
  },
  triggeredWorkflows: [
    {
      workflowId: "wf_document_routing",
      executionId: "exec_1a2b3c4d5e6f",
      status: "pending"
    }
  ],
  totalTriggered: 1
}
```

**Example:**

```typescript
// Emit document submitted event
const event = await workflow_emit_event({
  eventType: "document_submitted",
  source: "manual_trigger",
  data: {
    documentId: "DOC-001",
    programId: "PROG-001",
    fileId: "1a2b3c4d5e6f7g8h9i0j"
  },
  userId: "pm@example.com"
});

console.log(`Triggered ${event.totalTriggered} workflows`);

// Emit deliverable overdue event
await workflow_emit_event({
  eventType: "deliverable_overdue",
  source: "manual_check",
  data: {
    deliverableId: "D-005",
    programId: "PROG-001",
    daysOverdue: 5
  }
});
```

**Errors:**
- `INVALID_EVENT_TYPE`: Event type not recognized
- `INVALID_DATA`: Event data format invalid
- `NO_WORKFLOWS_REGISTERED`: No workflows listening for this event

**See Also:** [workflow_list](#workflow_list), [workflow_execute](#workflow_execute)

---

### workflow_assign_role

**Description**: Assign roles to a user for workflow access control with optional expiry.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| userId | string | Yes | User email address |
| roles | array | Yes | Roles to assign (see role hierarchy above) |
| programId | string | No | Program ID for scoped roles |
| permissions | array of strings | No | Additional permissions |
| expiryDate | string | No | Role expiry date (ISO 8601) |

**Roles:**
- `SYSTEM`: Full system access, workflow management
- `ADMIN`: Workflow creation, all program access
- `PROGRAM_MANAGER`: Manage programs, approve deliverables
- `PROJECT_MANAGER`: Manage projects, submit deliverables
- `TEAM_MEMBER`: Create/update deliverables
- `REVIEWER`: Review deliverables
- `APPROVER`: Approve deliverables
- `STAKEHOLDER`: View program information
- `VIEWER`: Read-only access

**Returns:**

```typescript
{
  userId: "pm@example.com",
  roles: [
    {
      role: "PROGRAM_MANAGER",
      programId: "PROG-001",
      assignedDate: "2026-03-28T10:00:00Z",
      expiryDate: null,
      permissions: [
        "create_deliverables",
        "update_deliverables",
        "submit_deliverables",
        "assign_reviewers",
        "view_reports"
      ]
    },
    {
      role: "REVIEWER",
      programId: null,  // Global
      assignedDate: "2026-03-28T10:00:00Z",
      expiryDate: "2026-12-31T00:00:00Z",
      permissions: [
        "review_deliverables",
        "comment_on_deliverables"
      ]
    }
  ]
}
```

**Example:**

```typescript
// Assign program manager role
await workflow_assign_role({
  userId: "pm@example.com",
  roles: ["PROGRAM_MANAGER"],
  programId: "PROG-001"
});

// Assign multiple roles with expiry
await workflow_assign_role({
  userId: "contractor@example.com",
  roles: ["REVIEWER", "TEAM_MEMBER"],
  programId: "PROG-001",
  expiryDate: "2026-12-31"
});

// Assign global admin role
await workflow_assign_role({
  userId: "admin@example.com",
  roles: ["ADMIN"]
});
```

**Errors:**
- `INVALID_EMAIL`: User email invalid
- `INVALID_ROLE`: Role value invalid
- `PROGRAM_NOT_FOUND`: Program ID does not exist (for scoped roles)
- `INVALID_DATE`: Expiry date format invalid

**See Also:** [workflow_list](#workflow_list)

---

## Workflow Best Practices

### Workflow Design
1. **Single responsibility**: Each workflow should do one thing well
2. **Idempotent actions**: Actions should be safe to retry
3. **Clear naming**: Use descriptive workflow and action names
4. **Error handling**: Handle errors gracefully with retry logic
5. **Logging**: Log important steps for debugging

### Event-Driven Workflows
1. **Event specificity**: Use specific event types
2. **Data validation**: Validate event data before processing
3. **Fast execution**: Keep event handlers fast (< 30 seconds)
4. **Async processing**: For long operations, queue for async processing

### Scheduled Workflows
1. **Appropriate frequency**: Don't over-schedule
2. **Timezone awareness**: Consider user timezones
3. **Off-peak execution**: Run heavy workflows during off-peak hours
4. **Monitoring**: Monitor scheduled workflow success rates

### Role Management
1. **Least privilege**: Assign minimum necessary roles
2. **Scope appropriately**: Use program-scoped roles when possible
3. **Audit regularly**: Review role assignments quarterly
4. **Expire temporary access**: Set expiry dates for contractors

---

## Built-in Actions

The workflow engine includes 20+ built-in actions:

**Google Workspace Actions**
- Send email
- Create Drive folder
- Upload file to Drive
- Create spreadsheet
- Append to spreadsheet
- Create document
- Create calendar event

**Program Management Actions**
- Create deliverable
- Update deliverable status
- Assign reviewer
- Send notification
- Log issue
- Create milestone
- Update program status

**Document Management Actions**
- Route document
- Categorize document
- Update metadata
- Create version

**Utility Actions**
- Conditional logic
- Loop/iterate
- Wait/delay
- HTTP request
- Data transformation

---

## Related Documentation

- [Program Management Tools](program.md) - Link workflows to programs
- [Deliverable Tracking Tools](deliverables.md) - Automate deliverable workflows
- [Document Organization Tools](documents.md) - Automate document routing
- [LLM Configuration](../guides/llm-configuration.md) - AI-powered workflow actions

---

**🎉 Complete!** You've reached the end of the API Reference. All 115 tools documented.

**Return to:** [API Reference Index](index.md)
