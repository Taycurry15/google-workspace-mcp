/**
 * Deliverable Workflow Definitions
 * Week 7 Implementation
 *
 * Workflows:
 * 1. Deliverable Completion - Update program metrics when deliverable completes
 * 2. Milestone Deliverable Tracking - Link deliverables to milestone progress
 */

import type { WorkflowDefinition } from "../../types/workflows.js";

/**
 * Deliverable Completion Workflow
 *
 * Triggered when: deliverable_completed event
 * Actions:
 * 1. Congratulate responsible party
 * 2. Update milestone progress if linked
 * 3. Trigger EVM recalculation
 * 4. Archive to PARA if enabled
 * 5. Update stakeholder dashboard
 */
export const deliverableCompletion: WorkflowDefinition = {
  workflowId: "deliverable_completion",
  name: "Deliverable Completion Workflow",
  description:
    "When a deliverable is completed, update program metrics and notify stakeholders",
  version: "1.0.0",
  trigger: {
    type: "event",
    event: {
      eventType: "deliverable_completed",
      source: "pmo_deliverables",
    },
  },
  actions: [
    {
      actionId: "congratulate_responsible",
      type: "send_notification",
      name: "Congratulate Responsible Party",
      description: "Send congratulations to deliverable owner",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{event.data.responsible}}"],
          subject: "Deliverable Completed: {{event.data.name}}",
          body: `Congratulations! Your deliverable has been completed and accepted.

Deliverable: {{event.data.name}}
ID: {{event.data.deliverableId}}
WBS: {{event.data.wbs}}
Quality Score: {{event.data.qualityScore}}/100

Your work contributes directly to program success. Great job!

The deliverable has been archived and program metrics have been updated.

Keep up the excellent work!`,
          priority: "normal",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 1,
    },
    {
      actionId: "update_milestone_progress",
      type: "custom",
      name: "Update Linked Milestone Progress",
      description: "Update progress on any milestones linked to this deliverable",
      config: {
        module: "./actions/custom.js",
        function: "updateMilestoneProgress",
        parameters: {
          deliverableId: "{{event.data.deliverableId}}",
          wbs: "{{event.data.wbs}}",
          programId: "{{event.programId}}",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 2,
    },
    {
      actionId: "trigger_evm_recalc",
      type: "custom",
      name: "Trigger EVM Recalculation",
      description: "Update EV based on deliverable completion",
      config: {
        module: "./actions/custom.js",
        function: "triggerEVMCalculation",
        parameters: {
          programId: "{{event.programId}}",
          reason: "Deliverable {{event.data.deliverableId}} completed",
          deliverableId: "{{event.data.deliverableId}}",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 3,
    },
    {
      actionId: "archive_to_para",
      type: "custom",
      name: "Archive to PARA (if enabled)",
      description: "Archive completed deliverable to PARA system",
      config: {
        module: "./actions/custom.js",
        function: "archiveDeliverableToPARA",
        parameters: {
          deliverableId: "{{event.data.deliverableId}}",
          deliverableName: "{{event.data.name}}",
          wbs: "{{event.data.wbs}}",
          responsible: "{{event.data.responsible}}",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 4,
    },
    {
      actionId: "update_dashboard",
      type: "update_spreadsheet",
      name: "Update Stakeholder Dashboard",
      description: "Update program dashboard with completion metrics",
      config: {
        module: "./actions/update-spreadsheet.js",
        function: "updateSpreadsheetAction",
        parameters: {
          spreadsheetId: "{{env.PMO_SPREADSHEET_ID}}",
          sheet: "Dashboard",
          operation: "update_metrics",
          deliverableId: "{{event.data.deliverableId}}",
          status: "complete",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 5,
    },
  ],
  roles: [
    {
      role: "team_member",
      action: "execute",
      required: false,
    },
    {
      role: "system",
      action: "execute",
      required: true,
    },
  ],
  status: "active",
  enabled: true,
  priority: 6,
  timeout: 300,
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 5,
    backoffMultiplier: 2,
  },
  errorHandling: {
    onError: "continue",
    notifyOnError: false,
    errorRecipients: [],
  },
  metadata: {
    category: "deliverable_tracking",
    tags: ["automation", "deliverable", "completion", "metrics"],
    documentation: "https://github.com/example/workflows/deliverable-completion",
  },
  createdBy: "system",
  createdDate: new Date(),
  modifiedDate: new Date(),
  executionCount: 0,
};

/**
 * Milestone Deliverable Tracking Workflow
 *
 * Triggered when: milestone_at_risk event
 * Actions:
 * 1. Identify linked deliverables
 * 2. Check deliverable status
 * 3. Notify owners of at-risk deliverables
 * 4. Create urgency tasks
 * 5. Escalate if critical
 */
export const milestoneDeliverableTracking: WorkflowDefinition = {
  workflowId: "milestone_deliverable_tracking",
  name: "Milestone Deliverable Tracking Workflow",
  description:
    "When a milestone is at risk, check and escalate linked deliverables",
  version: "1.0.0",
  trigger: {
    type: "event",
    event: {
      eventType: "milestone_at_risk",
      source: "program_milestones",
    },
  },
  actions: [
    {
      actionId: "identify_linked_deliverables",
      type: "custom",
      name: "Identify Linked Deliverables",
      description: "Find all deliverables linked to this at-risk milestone",
      config: {
        module: "./actions/custom.js",
        function: "findLinkedDeliverables",
        parameters: {
          milestoneId: "{{event.data.milestoneId}}",
          programId: "{{event.programId}}",
        },
      },
      retryOnFailure: true,
      continueOnFailure: false,
      order: 1,
    },
    {
      actionId: "check_deliverable_status",
      type: "custom",
      name: "Check Deliverable Status",
      description: "Assess completion status of linked deliverables",
      config: {
        module: "./actions/custom.js",
        function: "assessDeliverableStatus",
        parameters: {
          milestoneId: "{{event.data.milestoneId}}",
          linkedDeliverables: "{{action.identify_linked_deliverables.result}}",
        },
      },
      retryOnFailure: true,
      continueOnFailure: false,
      order: 2,
    },
    {
      actionId: "notify_deliverable_owners",
      type: "send_notification",
      name: "Notify Deliverable Owners",
      description: "Alert owners of deliverables blocking the milestone",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{action.check_deliverable_status.owners}}"],
          subject: "URGENT: Deliverable Required for At-Risk Milestone",
          body: `Your deliverable is required for a milestone that is currently at risk:

Milestone: {{event.data.name}}
ID: {{event.data.milestoneId}}
Target Date: {{event.data.targetDate}}
Owner: {{event.data.owner}}
Status: AT RISK

Your deliverable is blocking this milestone.

IMMEDIATE ACTIONS REQUIRED:
1. Review your deliverable status
2. Provide updated completion estimate
3. Identify any blockers
4. Escalate if you need resources

This milestone is on the critical path: {{event.data.critical}}

Please respond within 24 hours with status update.`,
          priority: "urgent",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 3,
    },
    {
      actionId: "create_urgency_tasks",
      type: "custom",
      name: "Create Urgency Tasks",
      description: "Create follow-up tasks to track deliverable completion",
      config: {
        module: "./actions/custom.js",
        function: "createUrgencyTasks",
        parameters: {
          milestoneId: "{{event.data.milestoneId}}",
          milestoneName: "{{event.data.name}}",
          blockedDeliverables: "{{action.check_deliverable_status.blocked}}",
          critical: "{{event.data.critical}}",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 4,
    },
    {
      actionId: "escalate_if_critical",
      type: "send_notification",
      name: "Escalate to PM if Critical",
      description: "Notify program manager if milestone is on critical path",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{env.PROGRAM_MANAGERS}}"],
          subject: "CRITICAL MILESTONE AT RISK: {{event.data.name}}",
          body: `A critical path milestone is at risk:

Milestone: {{event.data.name}}
ID: {{event.data.milestoneId}}
Target Date: {{event.data.targetDate}}
Owner: {{event.data.owner}}
Critical Path: YES

Blocking Deliverables:
{{action.check_deliverable_status.blocked_summary}}

Impact:
- Schedule may be delayed
- Dependent milestones will be impacted
- Program completion at risk

REQUIRED PM ACTIONS:
1. Review blocking deliverables
2. Allocate additional resources if needed
3. Remove blockers
4. Adjust schedule if necessary
5. Communicate impact to stakeholders

This requires immediate attention.`,
          priority: "critical",
          condition: "{{event.data.critical == true}}",
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
      role: "approver",
      action: "approve",
      required: true,
    },
  ],
  status: "active",
  enabled: true,
  priority: 9,
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
    category: "milestone_tracking",
    tags: ["automation", "milestone", "deliverables", "escalation", "critical"],
    documentation: "https://github.com/example/workflows/milestone-deliverable-tracking",
  },
  createdBy: "system",
  createdDate: new Date(),
  modifiedDate: new Date(),
  executionCount: 0,
};
