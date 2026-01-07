# Workflow Automation Architecture

Complete guide to the event-driven workflow automation system with scheduling, role-based access, and reusable actions.

**Last Updated:** 2026-01-05

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Workflow Engine](#workflow-engine)
4. [Scheduler](#scheduler)
5. [Event Handler](#event-handler)
6. [Role Manager](#role-manager)
7. [Predefined Workflows](#predefined-workflows)
8. [Reusable Actions](#reusable-actions)

---

## Overview

The Workflow Automation system provides enterprise-grade automation capabilities with:
- **Event-Driven Execution** - Trigger workflows from document uploads, deliverable submissions, etc.
- **Scheduled Execution** - Cron-like scheduling for recurring tasks
- **Role-Based Access Control** - Granular permissions for workflow execution
- **Retry Logic** - Automatic retries with exponential backoff
- **Action Reusability** - Library of reusable workflow actions

### Key Features

- ⚡ **Event-Driven** - React to system events in real-time
- 🕐 **Scheduled** - Cron-like scheduling for recurring workflows
- 🔄 **Retry Logic** - Automatic retries with configurable policies
- 🎯 **Role-Based** - Fine-grained access control
- 📊 **Execution Tracking** - Complete execution history
- 🔗 **Action Library** - Reusable workflow components

---

## Architecture

### Component Overview

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                            TRIGGER SOURCES                                    │
│                                                                               │
│     ┌──────────┐         ┌──────────┐         ┌──────────┐                    │
│     │  System  │         │Scheduled │         │  Manual  │                    │
│     │  Events  │         │   Time   │         │Execution │                    │
│     └────┬─────┘         └────┬─────┘         └────┬─────┘                    │
└──────────┼────────────────────┼────────────────────┼──────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         SUPPORT SERVICES                                      │
│                                                                               │
│   ┌──────────┐        ┌──────────┐        ┌──────────┐     ┌──────────┐       │
│   │  Event   │        │Scheduler │        │Workflow  │     │   Role   │       │
│   │ Handler  │        │          │        │ Registry │     │ Manager  │       │
│   └────┬─────┘        └────┬─────┘        └────┬─────┘     └────┬─────┘       │
└────────┼───────────────────┼───────────────────┼────────────────┼─────────────┘
         │                   │                   │                │
         └───────────────────┴───────────────────┘                │
                             │                                    │
                             ▼                                    │
┌───────────────────────────────────────────────────────────────────────────────┐
│                         WORKFLOW ENGINE                                       │
│                                                                               │
│                      ┌─────────────────┐                                      │
│                      │    Workflow     │ ◄── Central orchestrator             │
│                      │    Executor     │                                      │
│                      └────────┬────────┘                                      │
│                               │                                               │
│                               ▼                                               │
│                      ┌─────────────────┐                                      │
│                      │   Execution     │ ◄── Context & state                  │
│                      │    Context      │                                      │
│                      └────────┬────────┘                                      │
└───────────────────────────────┼───────────────────────────────────────────────┘
                                │
                                └──────────────┐
                                               │
                                               ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         EXECUTION LAYER                                       │
│                                                                               │
│      ┌──────────┐          ┌──────────┐          ┌──────────┐                 │
│      │ Action 1 │          │ Action 2 │          │ Action 3 │                 │
│      └────┬─────┘          └────┬─────┘          └────┬─────┘                 │
│           │                     │                     │                       │
│      ┌────┴────┐           ┌────┴────┐           ┌───┴────┐                   │
│      │         │           │         │           │        │                   │
│      ✓         ✗           ✓         ✗           ✓        │                   │
│   Success   Error      Success   Error      Success       │                   │
│      │         │           │         │           │        │                   │
│      └────┬────┘           └────┬────┘           └────┬───┘                   │
│           │                     │                     │                       │
└───────────┼─────────────────────┼─────────────────────┼───────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         ACTION LIBRARY                                        │
│                                                                               │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│   │   Send   │  │  Route   │  │  Update  │  │Categorize│  │ Generate │        │
│   │   Notif  │  │Document  │  │ Spreadsh.│  │Document  │  │  Report  │        │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
            │                     │                     │
            └─────────────────────┴─────────────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │   Execution     │
                         │     Logger      │
                         └─────────────────┘

EXECUTION FLOW:
1. Trigger Source fires (Event/Schedule/Manual)
2. Support Services route to Executor
3. Executor creates Execution Context
4. Role Manager validates permissions
5. Actions execute sequentially
6. Each action can succeed or error
7. Actions use Action Library for operations
8. All results logged to Execution Logger
```

---

## Workflow Engine

### Core Architecture

**File:** `src/workflows/engine.ts`

```typescript
class WorkflowEngine {
  // Workflow registration
  registerWorkflow(definition: WorkflowDefinition): void

  // Manual execution
  executeWorkflow(workflowId: string, context: Context): Promise<ExecutionResult>

  // Status management
  enableWorkflow(workflowId: string): void
  disableWorkflow(workflowId: string): void

  // Execution history
  getExecution(executionId: string): ExecutionRecord
  listExecutions(workflowId: string): ExecutionRecord[]
}
```

### Workflow Lifecycle

```
                             ┌──────────────┐
                             │   Register   │
                             │   Workflow   │
                             └──────┬───────┘
                                    │
                                    ▼
                             ┌──────────────┐
                      ┌─────►│  Registered  │
                      │      └──┬───────┬───┘
                      │         │       │
                      │  Enable │       │ Disable
                      │         │       │
                      │         ▼       ▼
                 ┌────┴────┐  ┌──────────────┐
                 │ Enabled │  │   Disabled   │
                 └────┬────┘  └──────────────┘
                      │              │
       Event/Schedule/│              │ Enable
           Manual     │              │
                      │              │
                      ▼              │
               ┌──────────────┐      │
               │  Triggered   │      │
               └──────┬───────┘      │
                      │              │
                      ▼              │
               ┌──────────────┐      │
               │  Validating  │      │
               └──┬───────┬───┘      │
                  │       │          │
              Valid│       │Invalid  │
                  │       │          │
                  ▼       ▼          │
           ┌──────────┐ ┌────────┐   │
           │Executing │ │ Failed │   │
           └────┬─────┘ └────┬───┘   │
                │            │       │
                ▼            │       │
         ┌─────────────┐     │       │
         │Running      │     │       │
         │Action 1     │     │       │
         └──┬──────┬───┘     │       │
            │      │         │       │
      Success│     │Error    │       │
            │      │         │       │
            ▼      ▼         │       │
     ┌──────────┐ ┌─────────┴┐       │
     │Running   │ │ Retrying  │      │
     │Action 2  │ │ (Transient│      │
     └──┬───┬───┘ │  Error)   │      │
        │   │     └─────┬─────┘      │
  Success│  │Error      │            │
        │   │           │ Retry      │
        ▼   │           │ < Max      │
 ┌──────────┴─┐         │            │
 │Running     │         └────────────┘
 │Action 3    │
 └──┬─────────┘
    │
    │ Success
    ▼
┌───────────┐      ┌─────────┐
│ Completed │      │ Failed  │
└─────┬─────┘      └────┬────┘
      │                 │
      │ Log & Notify    │ Log & Alert
      │                 │
      └────────┬────────┘
               │
               ▼
             END

RETRY STRATEGY (Exponential Backoff):
┌────────────┬──────────────┬──────────────┐
│ Attempt    │ Wait Time    │ Action       │
├────────────┼──────────────┼──────────────┤
│ 1st retry  │ 1 second     │ Re-execute   │
│ 2nd retry  │ 2 seconds    │ Re-execute   │
│ 3rd retry  │ 4 seconds    │ Re-execute   │
│ Max retries│ -            │ Mark Failed  │
└────────────┴──────────────┴──────────────┘

STATES:
• Registered: Workflow definition stored
• Enabled/Disabled: Workflow activation status
• Triggered: Workflow initiated by event/schedule/manual
• Validating: Context and permissions checked
• Executing: Actions running sequentially
• Retrying: Transient error, attempting retry
• Completed: All actions successful
• Failed: Permanent error or max retries exceeded
```

### Workflow Definition

```typescript
interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  enabled: boolean;

  // Triggers
  triggers: {
    events?: string[];      // Event names to listen for
    schedule?: string;      // Cron expression
    manual?: boolean;       // Allow manual execution
  };

  // Access control
  roles?: string[];         // Required roles

  // Execution
  actions: Action[];        // Sequential actions
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
  };

  // Context
  requiredContext?: string[];  // Required context fields
}
```

### Example Workflow

```typescript
const documentSubmissionWorkflow: WorkflowDefinition = {
  id: "document-submission",
  name: "Document Submission Workflow",
  description: "Automatically categorize and route submitted documents",
  enabled: true,

  triggers: {
    events: ["document.submitted"],
    manual: true
  },

  roles: ["system", "admin", "program_manager"],

  actions: [
    {
      id: "categorize",
      type: "categorize-document",
      params: {
        documentId: "{{context.documentId}}",
        programId: "{{context.programId}}"
      },
      retryable: true
    },
    {
      id: "route",
      type: "route-document",
      params: {
        documentId: "{{context.documentId}}",
        category: "{{actions.categorize.result.category}}"
      },
      retryable: true
    },
    {
      id: "update-register",
      type: "update-spreadsheet",
      params: {
        spreadsheetId: "{{env.DOCUMENT_SPREADSHEET_ID}}",
        data: {
          documentId: "{{context.documentId}}",
          category: "{{actions.categorize.result.category}}",
          folder: "{{actions.route.result.folderId}}"
        }
      },
      retryable: false
    },
    {
      id: "notify",
      type: "send-notification",
      params: {
        to: "{{context.submitter}}",
        subject: "Document Processed",
        body: "Your document has been categorized and routed."
      },
      retryable: true
    }
  ],

  retryPolicy: {
    maxAttempts: 3,
    backoffMs: 1000
  },

  requiredContext: ["documentId", "programId", "submitter"]
};
```

---

## Scheduler

### Cron-Like Scheduling

**File:** `src/workflows/scheduler.ts`

```typescript
class WorkflowScheduler {
  // Schedule workflow
  scheduleWorkflow(
    workflowId: string,
    schedule: string | ScheduleOptions
  ): void

  // Unschedule
  unscheduleWorkflow(workflowId: string): void

  // Get schedule info
  getSchedule(workflowId: string): ScheduleInfo

  // Get upcoming runs
  getUpcomingRuns(workflowId: string, count: number): Date[]
}
```

### Schedule Formats

#### Cron Expressions

```typescript
// Standard cron format: minute hour dayOfMonth month dayOfWeek
"0 9 * * 1"      // Every Monday at 9:00 AM
"0 0 1 * *"      // First day of every month at midnight
"*/15 * * * *"   // Every 15 minutes
"0 9-17 * * 1-5" // Every hour from 9am-5pm, Monday-Friday
```

#### Interval Scheduling

```typescript
{
  type: "interval",
  interval: 3600000,     // Every hour (in milliseconds)
  startTime: new Date()  // Optional start time
}

{
  type: "daily",
  time: "09:00",         // Daily at 9:00 AM
  timezone: "America/New_York"
}

{
  type: "weekly",
  dayOfWeek: 1,          // Monday (0=Sunday, 1=Monday, etc.)
  time: "14:00"
}
```

### Scheduling Algorithm

```
           ┌──────────────────┐
           │ Scheduler Start  │
           └────────┬─────────┘
                    │
                    ▼
           ┌──────────────────┐
           │  Load Scheduled  │
           │    Workflows     │
           └────────┬─────────┘
                    │
                    ▼
           ┌──────────────────┐
           │   Calculate      │
           │ Next Run Time    │
           └────────┬─────────┘
                    │
                    ▼
           ┌──────────────────┐
           │  Time Until      │
      ┌────┤  Next Run?       ├────┐
      │    └──────────────────┘    │
      │                            │
      │ > 32-bit max        <= 32-bit max
      │                            │
      ▼                            ▼
┌─────────────┐           ┌──────────────┐
│ Split into  │           │  setTimeout  │
│   Chunks    │           │              │
└──────┬──────┘           └──────┬───────┘
       │                         │
       └────────────┬────────────┘
                    │
                    ▼
           ┌──────────────────┐
           │ Trigger Time     │
           │    Reached       │
           └────────┬─────────┘
                    │
                    ▼
           ┌──────────────────┐
           │ ✓ Execute        │
           │   Workflow       │
           └────────┬─────────┘
                    │
                    ▼
           ┌──────────────────┐
           │  Recalculate     │
           │   Next Run       │
           └────────┬─────────┘
                    │
                    └─────────┐
                              │
                              │ Loop back
                              │
                              └──► (Back to "Time Until Next Run?")

SCHEDULING NOTES:
• JavaScript setTimeout max: 2,147,483,647ms (~24.8 days)
• Schedules beyond this are split into chunks
• After execution, next run time is recalculated
• Scheduler continuously loops for all active workflows
```

### Example Scheduled Workflows

```typescript
// Weekly status report - Monday 9am
scheduler.scheduleWorkflow("weekly-status", "0 9 * * 1");

// Daily backup - Every night at 2am
scheduler.scheduleWorkflow("daily-backup", "0 2 * * *");

// Quarterly review - First day of Jan/Apr/Jul/Oct
scheduler.scheduleWorkflow("quarterly-review", "0 9 1 1,4,7,10 *");

// Every 30 minutes during business hours
scheduler.scheduleWorkflow("health-check", "*/30 9-17 * * 1-5");
```

---

## Event Handler

### Event-Driven Architecture

**File:** `src/workflows/event-handler.ts`

```typescript
class WorkflowEventHandler {
  // Subscribe workflow to events
  subscribe(workflowId: string, eventPattern: EventPattern): void

  // Emit event to trigger workflows
  emit(eventName: string, eventData: any): void

  // Unsubscribe
  unsubscribe(workflowId: string, eventName: string): void
}
```

### Event Patterns

```typescript
interface EventPattern {
  name: string;           // Event name
  filters?: {             // Optional filters
    field: string;
    operator: "equals" | "contains" | "greater_than" | "less_than";
    value: any;
  }[];
}
```

### Built-In Events

#### Document Events
```typescript
"document.submitted"     // Document uploaded and submitted
"document.categorized"   // Document categorized by LLM
"document.routed"        // Document moved to folder
"document.version_created" // New version created
```

#### Deliverable Events
```typescript
"deliverable.created"    // New deliverable
"deliverable.submitted"  // Submitted for review
"deliverable.reviewed"   // Review completed
"deliverable.approved"   // Final approval
"deliverable.rejected"   // Rejected
```

#### Program Events
```typescript
"program.created"        // New program
"milestone.completed"    // Milestone reached
"milestone.overdue"      // Milestone missed
"issue.logged"           // New issue
"decision.logged"        // New decision
```

#### PMO Events
```typescript
"proposal.analyzed"      // Proposal analysis complete
"risk.identified"        // New risk
"risk.escalated"         // Risk escalated
```

### Event Flow Diagram

```
 System        Event         Event       Subscribed      Workflow
 Action       Handler       Filters      Workflows        Engine
   │             │             │              │              │
   │ emit("document.submitted", data)         │              │
   ├────────────►│             │              │              │
   │             │             │              │              │
   │             │ Apply filters              │              │
   │             ├────────────►│              │              │
   │             │             │              │              │
   │             │             │ Matches?     │              │
   │             │             ├──────┐       │              │
   │             │             │      │       │              │
   │             │             │◄─────┘       │              │
   │             │             │              │              │
   │             │             │ Notify Workflow 1           │
   │             │             ├─────────────►│              │
   │             │             │              │              │
   │             │             │ Notify Workflow 2           │
   │             │             ├─────────────►│              │
   │             │             │              │              │
   │             │             │              │ Execute with │
   │             │             │              │ event context│
   │             │             │              ├─────────────►│
   │             │             │              │              │
   │             │             │              │  Run workflow│
   │             │             │              │  actions     │
   │             │             │              │     ┌────┐   │
   │             │             │              │     │    │   │
   │             │             │              │     └────┘   │
   │             │             │              │              │
   │ Execution complete                       │              │
   │◄─────────────────────────────────────────┴──────────────┤
   │             │             │              │              │
   ▼             ▼             ▼              ▼              ▼

FLOW STEPS:
1. System action emits event (e.g., "document.submitted")
2. Event Handler receives event
3. Event Filters check subscription criteria
4. Matching workflows are notified
5. Each workflow executes with event data as context
6. Workflow Engine runs the workflow actions
7. Results returned to original caller
```

### Example Event-Driven Workflow

```typescript
// Workflow triggered when document is submitted
eventHandler.subscribe("document-processing", {
  name: "document.submitted",
  filters: [
    {
      field: "documentType",
      operator: "equals",
      value: "deliverable"
    },
    {
      field: "program",
      operator: "equals",
      value: "Alpha Program"
    }
  ]
});

// When event is emitted...
eventHandler.emit("document.submitted", {
  documentId: "DOC-123",
  documentType: "deliverable",
  program: "Alpha Program",
  submitter: "user@example.com"
});

// Workflow automatically executes with event data as context
```

---

## Role Manager

### Role-Based Access Control

**File:** `src/workflows/role-manager.ts`

```typescript
class WorkflowRoleManager {
  // Assign role to user
  assignRole(userId: string, role: string, programId?: string): void

  // Check permission
  hasPermission(userId: string, workflowId: string): boolean

  // List user roles
  getUserRoles(userId: string): string[]

  // Revoke role
  revokeRole(userId: string, role: string): void
}
```

### Built-In Roles

| Role | Permissions | Use Cases |
|------|-------------|-----------|
| `system` | All workflows | Automated system processes |
| `admin` | All workflows | System administrators |
| `program_manager` | Program workflows | Program/project managers |
| `team_member` | Limited workflows | Team contributors |
| `reviewer` | Review workflows | Document/deliverable reviewers |
| `stakeholder` | Read-only workflows | External stakeholders |
| `guest` | No workflows | View-only access |

### Role Hierarchy

```
                    ┌─────────────────────┐
                    │       SYSTEM        │
                    │  All Permissions    │
                    │  (Superuser)        │
                    └──────────┬──────────┘
                               │ Inherits all
                               ▼
                    ┌─────────────────────┐
                    │       ADMIN         │
                    │   All Workflows     │
                    │ (Full Management)   │
                    └──────────┬──────────┘
                               │ Inherits
                               ▼
                    ┌─────────────────────┐
                    │  PROGRAM MANAGER    │
                    │ Program Workflows   │
                    │ (Program Scope)     │
                    └──────────┬──────────┘
                               │ Inherits
                               ▼
                    ┌─────────────────────┐
                    │   TEAM MEMBER       │
                    │  Basic Workflows    │
                    │   (Standard User)   │
                    └──────────┬──────────┘
                               │ Inherits
                               ▼
                    ┌─────────────────────┐
                    │     REVIEWER        │
                    │  Review Workflows   │
                    │  (Review Access)    │
                    └──────────┬──────────┘
                               │ Inherits
                               ▼
                    ┌─────────────────────┐
                    │   STAKEHOLDER       │
                    │    Read-Only        │
                    │  (View Access)      │
                    └──────────┬──────────┘
                               │ Inherits
                               ▼
                    ┌─────────────────────┐
                    │       GUEST         │
                    │     No Access       │
                    │   (No Permissions)  │
                    └─────────────────────┘

ROLE PERMISSIONS:
┌─────────────────┬──────────────────┬──────────────────────────────┐
│ Role            │ Workflow Access  │ Permissions                  │
├─────────────────┼──────────────────┼──────────────────────────────┤
│ system          │ ALL              │ Full system control          │
│ admin           │ ALL              │ Manage all workflows         │
│ program_manager │ Program-specific │ Manage program workflows     │
│ team_member     │ Basic            │ Execute standard workflows   │
│ reviewer        │ Review workflows │ Review & approve submissions │
│ stakeholder     │ Read-only        │ View workflow status         │
│ guest           │ None             │ No workflow access           │
└─────────────────┴──────────────────┴──────────────────────────────┘

INHERITANCE:
• Each role inherits all permissions from roles below it
• Higher roles can execute all workflows of lower roles
• Roles can be program-scoped (e.g., PM for "Alpha Program" only)
```

### Example Role Assignment

```typescript
// Assign roles
roleManager.assignRole("user@example.com", "program_manager", "PROG-001");
roleManager.assignRole("reviewer@example.com", "reviewer");

// Check permissions
const canExecute = roleManager.hasPermission("user@example.com", "weekly-status");

// Workflow with role restrictions
const workflow: WorkflowDefinition = {
  id: "sensitive-operation",
  roles: ["admin", "program_manager"],  // Only these roles can execute
  // ... rest of definition
};
```

---

## Predefined Workflows

### 1. Document Submission Workflow

**Trigger:** `document.submitted` event
**Purpose:** Automatically categorize and route documents

```typescript
Actions:
1. Categorize document with LLM
2. Route to appropriate PMI folder
3. Update document register
4. Notify stakeholders
```

### 2. Deliverable Review Workflow

**Trigger:** `deliverable.submitted` event
**Purpose:** Manage review and approval process

```typescript
Actions:
1. Assign reviewer based on deliverable type
2. Send review request notification
3. Track review status
4. Notify on approval/rejection
```

### 3. Weekly Status Report

**Trigger:** Schedule (Monday 9am)
**Purpose:** Generate and distribute weekly reports

```typescript
Actions:
1. Generate report from program data
2. Update tracking spreadsheet
3. Notify program managers
4. Email stakeholders with attachment
```

### 4. Milestone Notification

**Trigger:** `milestone.completed` or `milestone.overdue` events
**Purpose:** Alert stakeholders of milestone status

```typescript
Actions:
1. Check milestone status
2. Generate notification message
3. Send to stakeholders
4. Log in milestone tracker
```

---

## Reusable Actions

### Action Library

**Location:** `src/workflows/actions/`

#### 1. Send Notification

**File:** `send-notification.ts`

```typescript
{
  type: "send-notification",
  params: {
    to: string | string[],
    subject: string,
    body: string,
    attachments?: Attachment[]
  }
}
```

#### 2. Route Document

**File:** `route-document.ts`

```typescript
{
  type: "route-document",
  params: {
    documentId: string,
    category: string,
    targetFolderId?: string
  }
}
```

#### 3. Update Spreadsheet

**File:** `update-spreadsheet.ts`

```typescript
{
  type: "update-spreadsheet",
  params: {
    spreadsheetId: string,
    sheetName: string,
    data: Record<string, any>,
    operation: "append" | "update" | "insert"
  }
}
```

#### 4. Categorize Document

**File:** `categorize-document.ts`

```typescript
{
  type: "categorize-document",
  params: {
    documentId: string,
    programId: string,
    useCache?: boolean
  }
}
```

#### 5. Generate Report

**File:** `generate-report.ts`

```typescript
{
  type: "generate-report",
  params: {
    reportType: string,
    programId: string,
    outputFormat: "pdf" | "docx" | "html",
    recipients?: string[]
  }
}
```

### Creating Custom Actions

```typescript
// src/workflows/actions/my-custom-action.ts
export async function myCustomAction(
  params: ActionParams,
  context: ExecutionContext
): Promise<ActionResult> {
  // 1. Validate params
  if (!params.requiredField) {
    throw new Error("Missing required field");
  }

  // 2. Perform action
  const result = await doSomething(params);

  // 3. Return result
  return {
    success: true,
    data: result,
    metadata: {
      executedAt: new Date(),
      duration: 1500
    }
  };
}

// Register action
actionRegistry.register("my-custom-action", myCustomAction);
```

---

## Workflow Tools (MCP)

### Available Tools

#### 1. workflow_list
List all registered workflows

#### 2. workflow_execute
Execute workflow manually

#### 3. workflow_get_execution
Get execution details by ID

#### 4. workflow_list_executions
List execution history for workflow

#### 5. workflow_enable / workflow_disable
Enable or disable workflows

#### 6. workflow_get_schedule
Get schedule information

#### 7. workflow_get_upcoming_runs
Preview upcoming scheduled runs

#### 8. workflow_emit_event
Manually emit event to trigger workflows

#### 9. workflow_assign_role
Assign user role for access control

---

## Performance Considerations

### Execution Optimization

- **Parallel Actions:** Execute independent actions concurrently
- **Caching:** Cache LLM results, folder IDs, metadata
- **Batch Operations:** Group API calls when possible
- **Async Execution:** Fire-and-forget for non-critical notifications

### Scaling

- **Rate Limiting:** Respect Google API limits
- **Queue Management:** Use execution queues for high volume
- **Retry Backoff:** Exponential backoff prevents thundering herd
- **Resource Limits:** Cap concurrent workflow executions

---

## Related Documentation

- **[Architecture Overview](overview.md)** - System architecture
- **[Data Flow](data-flow.md)** - Processing pipelines
- **[Workflow Examples](../guides/workflows.md)** - Real-world use cases
- **[API Reference - Workflows](../api-reference/workflows.md)** - Tool documentation

---

**The Workflow Automation system provides enterprise-grade automation with event-driven execution, scheduling, and role-based access control.**
