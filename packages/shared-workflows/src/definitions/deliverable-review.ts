/**
 * Deliverable Review Workflow Definition
 *
 * Automatically triggered when a deliverable is submitted
 * Workflow steps:
 * 1. Validate deliverable submission
 * 2. Route documents to review folder
 * 3. Assign reviewer
 * 4. Create review record
 * 5. Send notifications to reviewer
 * 6. Schedule reminder
 *
 * Phase 5 Implementation
 */

import type { WorkflowDefinition } from "../types/workflows.js";

export const deliverableReviewWorkflow: WorkflowDefinition = {
  workflowId: "deliverable_review",
  name: "Deliverable Review Workflow",
  description:
    "Automatically route deliverable documents for review, assign reviewers, and send notifications",
  version: "1.0.0",
  trigger: {
    type: "event",
    event: {
      eventType: "deliverable_submitted",
      source: "deliverable_submit_tool",
    },
  },
  actions: [
    {
      actionId: "update_status",
      type: "update_spreadsheet",
      name: "Update Deliverable Status",
      description: "Mark deliverable as submitted in tracking spreadsheet",
      config: {
        module: "./actions/update-spreadsheet.js",
        function: "updateSpreadsheetAction",
        parameters: {
          spreadsheetId: "{{env.DELIVERABLE_SPREADSHEET_ID}}",
          sheet: "Deliverables",
          operation: "update",
          criteria: {
            "Deliverable ID": "{{event.deliverableId}}",
          },
          values: [["Submitted", "{{now}}", "{{event.userId}}"]],
        },
      },
      retryOnFailure: true,
      continueOnFailure: false,
      order: 1,
    },
    {
      actionId: "route_documents",
      type: "route_document",
      name: "Route Documents to Review Folder",
      description: "Move submitted documents to review folder",
      config: {
        module: "./actions/route-document.js",
        function: "routeDocumentAction",
        parameters: {
          fileId: "{{event.fileIds[0]}}",
          programId: "{{event.programId}}",
          documentType: "deliverable",
          phase: "review",
          operation: "move",
          createFolderIfMissing: true,
        },
      },
      retryOnFailure: true,
      continueOnFailure: false,
      order: 2,
    },
    {
      actionId: "create_review_record",
      type: "update_spreadsheet",
      name: "Create Review Record",
      description: "Create review tracking record in Reviews sheet",
      config: {
        module: "./actions/update-spreadsheet.js",
        function: "updateSpreadsheetAction",
        parameters: {
          spreadsheetId: "{{env.DELIVERABLE_SPREADSHEET_ID}}",
          sheet: "Reviews",
          operation: "append",
          values: [
            [
              "REV-{{event.deliverableId}}-{{now}}",
              "{{event.deliverableId}}",
              "{{env.REVIEWERS}}",
              "Pending",
              "{{now}}",
              "",
              "",
              "",
              "{{event.submitterNotes}}",
            ],
          ],
        },
      },
      retryOnFailure: true,
      continueOnFailure: false,
      order: 3,
    },
    {
      actionId: "notify_reviewer",
      type: "send_notification",
      name: "Notify Reviewer",
      description: "Send email notification to assigned reviewer",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{env.REVIEWERS}}"],
          subject: "Deliverable Ready for Review: {{event.deliverableId}}",
          body: `A deliverable has been submitted and is ready for your review:

Deliverable ID: {{event.deliverableId}}
Submitted by: {{event.userId}}
Submission Date: {{now}}

Documents: {{event.fileIds}}

Submitter Notes:
{{event.submitterNotes}}

Please review and provide feedback within 5 business days.

Access the deliverable here: [Link to folder]`,
          priority: "high",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 4,
    },
    {
      actionId: "create_calendar_event",
      type: "send_notification",
      name: "Create Review Deadline Calendar Event",
      description: "Add calendar event for review deadline",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "calendar",
          recipients: ["{{env.REVIEWERS}}"],
          summary: "Review Due: {{event.deliverableId}}",
          description: `Deliverable review deadline for {{event.deliverableId}}`,
          startTime: "{{add_days(now, 5)}}",
          endTime: "{{add_days(now, 5, 1)}}",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 5,
    },
    {
      actionId: "create_review_task",
      type: "send_notification",
      name: "Create Review Task",
      description: "Create Google Task for reviewer",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "task",
          title: "Review Deliverable: {{event.deliverableId}}",
          notes: `Review and provide feedback on deliverable {{event.deliverableId}}\n\nSubmitted by: {{event.userId}}\nDue: {{add_days(now, 5)}}`,
          dueDate: "{{add_days(now, 5)}}",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 6,
    },
  ],
  roles: [
    {
      role: "team_member",
      action: "execute",
      required: false,
    },
    {
      role: "reviewer",
      action: "approve",
      required: true,
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
    category: "deliverable_management",
    tags: ["automation", "deliverable", "review", "notification"],
    documentation: "https://github.com/example/workflows/deliverable-review",
  },
  createdBy: "system",
  createdDate: new Date(),
  modifiedDate: new Date(),
  executionCount: 0,
};
