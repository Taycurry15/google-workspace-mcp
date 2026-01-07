/**
 * Program Management Workflow Definitions
 * Week 7 Implementation
 *
 * Workflows:
 * 1. Milestone Completion Cascade - Unblock dependent milestones
 * 2. Change Request Approval - Multi-level approval routing
 */

import type { WorkflowDefinition } from "../../types/workflows.js";

/**
 * Milestone Completion Cascade Workflow
 *
 * Triggered when: milestone_achieved event
 * Actions:
 * 1. Notify milestone owner
 * 2. Check for dependent milestones
 * 3. Unblock/update dependent milestones
 * 4. Notify program manager
 * 5. Update EVM calculations
 */
export const milestoneCompletionCascade: WorkflowDefinition = {
  workflowId: "milestone_completion_cascade",
  name: "Milestone Completion Cascade",
  description:
    "When a milestone is achieved, unblock dependent milestones and update program status",
  version: "1.0.0",
  trigger: {
    type: "event",
    event: {
      eventType: "milestone_achieved",
      source: "program_milestones",
    },
  },
  actions: [
    {
      actionId: "notify_milestone_owner",
      type: "send_notification",
      name: "Congratulate Milestone Owner",
      description: "Send congratulations email to milestone owner",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{event.data.owner}}"],
          subject: "Milestone Achieved: {{event.data.name}}",
          body: `Congratulations! Milestone "{{event.data.name}}" has been successfully completed.

Milestone ID: {{event.data.milestoneId}}
Completion Date: {{event.data.actualDate}}
Program: {{event.programId}}

This is a significant achievement for the program. Thank you for your hard work and dedication!

Next Steps:
- Dependent milestones are now unblocked
- Continue monitoring progress on upcoming milestones
- Document lessons learned

Great job!`,
          priority: "high",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 1,
    },
    {
      actionId: "check_dependencies",
      type: "custom",
      name: "Check Milestone Dependencies",
      description: "Find and update milestones that depend on this one",
      config: {
        module: "./actions/update-spreadsheet.js",
        function: "updateSpreadsheetAction",
        parameters: {
          spreadsheetId: "{{env.PROGRAM_SPREADSHEET_ID}}",
          sheet: "Milestones",
          operation: "read",
          range: "Milestones!A:O",
        },
      },
      retryOnFailure: true,
      continueOnFailure: false,
      order: 2,
    },
    {
      actionId: "unblock_dependents",
      type: "custom",
      name: "Unblock Dependent Milestones",
      description: "Update status of dependent milestones to in_progress",
      config: {
        module: "./actions/update-spreadsheet.js",
        function: "updateSpreadsheetAction",
        parameters: {
          spreadsheetId: "{{env.PROGRAM_SPREADSHEET_ID}}",
          sheet: "Milestones",
          operation: "update",
          note: "Automated unblocking based on {{event.data.milestoneId}} completion",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 3,
    },
    {
      actionId: "notify_program_manager",
      type: "send_notification",
      name: "Notify Program Manager",
      description: "Inform program manager of milestone completion and dependencies",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{env.PROGRAM_MANAGERS}}"],
          subject: "Milestone Completed: {{event.data.name}}",
          body: `A program milestone has been achieved:

Milestone: {{event.data.name}}
ID: {{event.data.milestoneId}}
Owner: {{event.data.owner}}
Completion Date: {{event.data.actualDate}}
Program: {{event.programId}}
Critical Path: {{event.data.critical}}

Impact:
- Program progress updated
- Dependent milestones unblocked
- EVM calculations will be updated

Deliverables: {{event.data.deliverables}}

Please review and update stakeholders as needed.`,
          priority: "high",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 4,
    },
    {
      actionId: "trigger_evm_update",
      type: "custom",
      name: "Trigger EVM Recalculation",
      description: "Trigger EVM snapshot for updated progress",
      config: {
        module: "./actions/custom.js",
        function: "triggerEVMCalculation",
        parameters: {
          programId: "{{event.programId}}",
          reason: "Milestone {{event.data.milestoneId}} completed",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 5,
    },
  ],
  roles: [
    {
      role: "program_manager",
      action: "execute",
      required: true,
    },
    {
      role: "system",
      action: "execute",
      required: false,
    },
  ],
  status: "active",
  enabled: true,
  priority: 8,
  timeout: 300,
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 5,
    backoffMultiplier: 2,
  },
  errorHandling: {
    onError: "notify",
    notifyOnError: true,
    errorRecipients: ["{{env.PROGRAM_MANAGERS}}"],
  },
  metadata: {
    category: "program_management",
    tags: ["automation", "milestone", "dependencies", "cascade"],
    documentation: "https://github.com/example/workflows/milestone-cascade",
  },
  createdBy: "system",
  createdDate: new Date(),
  modifiedDate: new Date(),
  executionCount: 0,
};

/**
 * Change Request Approval Workflow
 *
 * Triggered when: change_request_approved event
 * Actions:
 * 1. Notify requestor of approval
 * 2. Assess impact on affected deliverables and milestones
 * 3. Update schedule if schedule change
 * 4. Create follow-up tasks
 * 5. Notify affected stakeholders
 */
export const changeRequestApproval: WorkflowDefinition = {
  workflowId: "change_request_approval",
  name: "Change Request Approval Workflow",
  description:
    "When a change request is approved, notify stakeholders and update affected items",
  version: "1.0.0",
  trigger: {
    type: "event",
    event: {
      eventType: "change_request_approved",
      source: "program_change_control",
    },
  },
  actions: [
    {
      actionId: "notify_requestor",
      type: "send_notification",
      name: "Notify Requestor of Approval",
      description: "Inform the person who submitted the change request",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{event.data.requestedBy}}"],
          subject: "Change Request Approved: {{event.data.title}}",
          body: `Your change request has been approved!

Change Request: {{event.data.title}}
ID: {{event.data.changeId}}
Category: {{event.data.category}}
Priority: {{event.data.priority}}
Approved By: {{event.data.approver}}

Affected Items:
- Deliverables: {{event.data.affectedDeliverables}}
- Milestones: {{event.data.affectedMilestones}}

Next Steps:
1. Review implementation plan
2. Coordinate with affected teams
3. Begin implementation
4. Update change request with progress

Please proceed with implementation and keep the change request updated.`,
          priority: "high",
        },
      },
      retryOnFailure: true,
      continueOnFailure: false,
      order: 1,
    },
    {
      actionId: "assess_impact",
      type: "custom",
      name: "Assess Impact on Deliverables",
      description: "Check which deliverables and milestones are affected",
      config: {
        module: "./actions/custom.js",
        function: "assessChangeImpact",
        parameters: {
          changeId: "{{event.data.changeId}}",
          programId: "{{event.programId}}",
          affectedDeliverables: "{{event.data.affectedDeliverables}}",
          affectedMilestones: "{{event.data.affectedMilestones}}",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 2,
    },
    {
      actionId: "update_schedule",
      type: "update_spreadsheet",
      name: "Update Schedule (if Schedule Change)",
      description: "Update master schedule if this is a schedule change",
      config: {
        module: "./actions/update-spreadsheet.js",
        function: "updateSpreadsheetAction",
        parameters: {
          spreadsheetId: "{{env.PROGRAM_SPREADSHEET_ID}}",
          sheet: "Schedule Activities",
          operation: "update_if_schedule_change",
          changeId: "{{event.data.changeId}}",
          category: "{{event.data.category}}",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 3,
    },
    {
      actionId: "create_implementation_tasks",
      type: "custom",
      name: "Create Implementation Tasks",
      description: "Create follow-up tasks for change implementation",
      config: {
        module: "./actions/custom.js",
        function: "createImplementationTasks",
        parameters: {
          changeId: "{{event.data.changeId}}",
          title: "{{event.data.title}}",
          programId: "{{event.programId}}",
          priority: "{{event.data.priority}}",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 4,
    },
    {
      actionId: "notify_stakeholders",
      type: "send_notification",
      name: "Notify Affected Stakeholders",
      description: "Inform stakeholders of approved change",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{env.PROGRAM_STAKEHOLDERS}}"],
          subject: "Approved Change: {{event.data.title}}",
          body: `A change request has been approved for program {{event.programId}}:

Change: {{event.data.title}}
ID: {{event.data.changeId}}
Category: {{event.data.category}}
Priority: {{event.data.priority}}

Impact:
- Affected Deliverables: {{event.data.affectedDeliverables}}
- Affected Milestones: {{event.data.affectedMilestones}}

This change has been reviewed and approved. Implementation will begin shortly.

For questions, contact the program manager.`,
          priority: "normal",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 5,
    },
  ],
  roles: [
    {
      role: "program_manager",
      action: "execute",
      required: true,
    },
    {
      role: "system",
      action: "execute",
      required: false,
    },
  ],
  status: "active",
  enabled: true,
  priority: 7,
  timeout: 300,
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 5,
    backoffMultiplier: 2,
  },
  errorHandling: {
    onError: "notify",
    notifyOnError: true,
    errorRecipients: ["{{env.PROGRAM_MANAGERS}}"],
  },
  metadata: {
    category: "program_management",
    tags: ["automation", "change_control", "approval", "notification"],
    documentation: "https://github.com/example/workflows/change-approval",
  },
  createdBy: "system",
  createdDate: new Date(),
  modifiedDate: new Date(),
  executionCount: 0,
};
