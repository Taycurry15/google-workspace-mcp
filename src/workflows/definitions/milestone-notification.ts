/**
 * Milestone Notification Workflow Definition
 *
 * Automatically triggered when a milestone is completed
 * Workflow steps:
 * 1. Validate milestone completion
 * 2. Update related items (projects, schedule)
 * 3. Check dependencies
 * 4. Send congratulations
 * 5. Update dashboard metrics
 *
 * Phase 5 Implementation
 */

import type { WorkflowDefinition } from "../../types/workflows.js";

export const milestoneNotificationWorkflow: WorkflowDefinition = {
  workflowId: "milestone_notification",
  name: "Milestone Achievement Notification Workflow",
  description:
    "Automatically notify stakeholders and update tracking when milestones are achieved",
  version: "1.0.0",
  trigger: {
    type: "event",
    event: {
      eventType: "milestone_completed",
      source: "program_track_milestone_tool",
    },
  },
  actions: [
    {
      actionId: "update_milestone_status",
      type: "update_spreadsheet",
      name: "Update Milestone Status",
      description: "Mark milestone as completed in tracking spreadsheet",
      config: {
        module: "./actions/update-spreadsheet.js",
        function: "updateSpreadsheetAction",
        parameters: {
          spreadsheetId: "{{env.PROGRAM_SPREADSHEET_ID}}",
          sheet: "Milestones",
          operation: "update",
          criteria: {
            "Milestone ID": "{{event.milestoneId}}",
          },
          values: [["Completed", "{{now}}", "100%"]],
        },
      },
      retryOnFailure: true,
      continueOnFailure: false,
      order: 1,
    },
    {
      actionId: "update_schedule",
      type: "update_spreadsheet",
      name: "Update Program Schedule",
      description: "Mark milestone complete in master schedule",
      config: {
        module: "./actions/update-spreadsheet.js",
        function: "updateSpreadsheetAction",
        parameters: {
          spreadsheetId: "{{env.PROGRAM_SPREADSHEET_ID}}",
          sheet: "Schedule",
          operation: "update",
          criteria: {
            "Milestone ID": "{{event.milestoneId}}",
          },
          values: [["Completed", "{{now}}"]],
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 2,
    },
    {
      actionId: "read_dependencies",
      type: "update_spreadsheet",
      name: "Read Dependent Milestones",
      description: "Find milestones that depend on this one",
      config: {
        module: "./actions/update-spreadsheet.js",
        function: "updateSpreadsheetAction",
        parameters: {
          spreadsheetId: "{{env.PROGRAM_SPREADSHEET_ID}}",
          sheet: "Milestones",
          operation: "read",
          range: "Milestones!A:Z",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 3,
    },
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
          recipients: ["{{event.milestoneOwner}}"],
          subject: "Milestone Achieved: {{event.milestoneName}}",
          body: `Congratulations! Milestone "{{event.milestoneName}}" has been successfully completed.

Milestone ID: {{event.milestoneId}}
Completion Date: {{now}}
Program: {{event.programId}}

This is a significant achievement for the program. Thank you for your hard work and dedication!

Next Steps:
- Dependent milestones are now ready to start
- Continue monitoring progress on upcoming milestones
- Share lessons learned with the team

Great job!`,
          priority: "normal",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 4,
    },
    {
      actionId: "notify_program_manager",
      type: "send_notification",
      name: "Notify Program Manager",
      description: "Inform program manager of milestone completion",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{env.PROGRAM_MANAGERS}}"],
          subject: "Milestone Completed: {{event.milestoneName}}",
          body: `A program milestone has been achieved:

Milestone: {{event.milestoneName}}
ID: {{event.milestoneId}}
Owner: {{event.milestoneOwner}}
Completion Date: {{now}}
Program: {{event.programId}}

Impact:
- Program progress: Updated
- Dependent milestones: Ready to start
- Schedule status: On track

Please review and update stakeholders as needed.`,
          priority: "high",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 5,
    },
    {
      actionId: "notify_team",
      type: "send_notification",
      name: "Notify Team",
      description: "Announce milestone achievement to team",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{env.WEEKLY_REPORT_RECIPIENTS}}"],
          subject: "Team Update: Milestone {{event.milestoneName}} Achieved!",
          body: `Great news! We've achieved a major milestone:

🎉 {{event.milestoneName}} - COMPLETED

This milestone represents significant progress on our program. Thank you to everyone who contributed to this success!

Keep up the excellent work as we move forward to our next milestones.`,
          priority: "normal",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 6,
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
    tags: ["automation", "milestone", "notification", "tracking"],
    documentation: "https://github.com/example/workflows/milestone-notification",
  },
  createdBy: "system",
  createdDate: new Date(),
  modifiedDate: new Date(),
  executionCount: 0,
};
