/**
 * Weekly Status Report Workflow Definition
 *
 * Automatically triggered every Monday at 9:00 AM
 * Workflow steps:
 * 1. Gather program data from spreadsheets
 * 2. Generate status report using LLM
 * 3. Store report in Drive
 * 4. Send notifications to stakeholders
 *
 * Phase 5 Implementation
 */

import type { WorkflowDefinition } from "../types/workflows.js";

export const weeklyStatusWorkflow: WorkflowDefinition = {
  workflowId: "weekly_status_report",
  name: "Weekly Status Report Workflow",
  description:
    "Automatically generate and distribute weekly status reports for all active programs",
  version: "1.0.0",
  trigger: {
    type: "schedule",
    schedule: {
      cron: "0 9 * * 1", // Every Monday at 9:00 AM
      timezone: "America/New_York",
    },
  },
  actions: [
    {
      actionId: "generate_report",
      type: "generate_report",
      name: "Generate Weekly Status Report",
      description: "Create comprehensive weekly status report from program data",
      config: {
        module: "./actions/generate-report.js",
        function: "generateReportAction",
        parameters: {
          reportType: "weekly_status",
          programId: "{{programId}}",
          outputFormat: "docx",
          outputFolder: "{{env.PROGRAM_ROOT_FOLDER_ID}}",
        },
      },
      retryOnFailure: true,
      continueOnFailure: false,
      order: 1,
    },
    {
      actionId: "update_tracking",
      type: "update_spreadsheet",
      name: "Update Report Tracking",
      description: "Record report generation in tracking spreadsheet",
      config: {
        module: "./actions/update-spreadsheet.js",
        function: "updateSpreadsheetAction",
        parameters: {
          spreadsheetId: "{{env.DOCUMENT_SPREADSHEET_ID}}",
          sheet: "Document Register",
          operation: "append",
          values: [
            [
              "RPT-{{now}}",
              "{{generate_report.output.documentId}}",
              "Weekly Status Report - {{date_format(now, 'YYYY-MM-DD')}}",
              "report",
              "Weekly Status",
              "system",
              "{{now}}",
              "{{now}}",
              "Final",
              "{{generate_report.output.documentUrl}}",
              "weekly,status,automated",
              "",
              "{{programId}}",
              "1.0",
              "100",
            ],
          ],
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 2,
    },
    {
      actionId: "notify_program_managers",
      type: "send_notification",
      name: "Notify Program Managers",
      description: "Send weekly status report to program managers",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{env.PROGRAM_MANAGERS}}"],
          subject: "Weekly Status Report - {{date_format(now, 'YYYY-MM-DD')}}",
          body: `The weekly status report has been generated and is available for review:

Report Date: {{date_format(now, 'YYYY-MM-DD')}}
Program: {{programId}}

View Report: {{generate_report.output.documentUrl}}

This report includes:
- Executive Summary
- Milestone Progress
- Deliverable Status
- Open Issues and Risks
- Action Items

Please review and provide any feedback.`,
          priority: "normal",
          attachments: ["{{generate_report.output.documentId}}"],
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 3,
    },
    {
      actionId: "notify_stakeholders",
      type: "send_notification",
      name: "Notify Stakeholders",
      description: "Send read-only link to stakeholders",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{env.WEEKLY_REPORT_RECIPIENTS}}"],
          subject: "Weekly Program Update - {{date_format(now, 'YYYY-MM-DD')}}",
          body: `The weekly program status update is now available:

Report Date: {{date_format(now, 'YYYY-MM-DD')}}

View Report: {{generate_report.output.documentUrl}}

Key Highlights:
- Program is on track
- All critical milestones are green
- No major risks or issues

For detailed information, please refer to the full report.`,
          priority: "normal",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 4,
    },
  ],
  roles: [
    {
      role: "system",
      action: "execute",
      required: true,
    },
  ],
  status: "active",
  enabled: true,
  priority: 5,
  timeout: 600,
  retryPolicy: {
    maxRetries: 2,
    retryDelay: 60,
    backoffMultiplier: 2,
  },
  errorHandling: {
    onError: "notify",
    notifyOnError: true,
    errorRecipients: ["{{env.PROGRAM_MANAGERS}}"],
  },
  metadata: {
    category: "reporting",
    tags: ["automation", "report", "weekly", "status", "scheduled"],
    documentation: "https://github.com/example/workflows/weekly-status",
  },
  createdBy: "system",
  createdDate: new Date(),
  modifiedDate: new Date(),
  executionCount: 0,
};
