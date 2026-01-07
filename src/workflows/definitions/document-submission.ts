/**
 * Document Submission Workflow Definition
 *
 * Automatically triggered when a document is submitted via document_submit tool
 * Workflow steps:
 * 1. Categorize document using LLM
 * 2. Route document to appropriate folder
 * 3. Update document register
 * 4. Send notification to stakeholders
 *
 * Phase 5 Implementation
 */

import type { WorkflowDefinition } from "../../types/workflows.js";

export const documentSubmissionWorkflow: WorkflowDefinition = {
  workflowId: "document_submission",
  name: "Document Submission Workflow",
  description:
    "Automatically categorize and route documents when submitted, update tracking, and notify stakeholders",
  version: "1.0.0",
  trigger: {
    type: "event",
    event: {
      eventType: "document_submitted",
      source: "document_submit_tool",
    },
  },
  actions: [
    {
      actionId: "categorize_doc",
      type: "categorize_document",
      name: "Categorize Document",
      description: "Analyze document content and determine type, phase, keywords",
      config: {
        module: "./actions/categorize-document.js",
        function: "categorizeDocumentAction",
        parameters: {
          fileId: "{{event.fileId}}",
          forceRecategorize: false,
        },
      },
      retryOnFailure: true,
      continueOnFailure: false,
      order: 1,
    },
    {
      actionId: "route_doc",
      type: "route_document",
      name: "Route Document to Folder",
      description: "Move document to appropriate folder based on categorization",
      config: {
        module: "./actions/route-document.js",
        function: "routeDocumentAction",
        parameters: {
          fileId: "{{event.fileId}}",
          programId: "{{event.programId}}",
          documentType: "{{categorize_doc.output.categorization.documentType}}",
          phase: "{{categorize_doc.output.categorization.phase}}",
          operation: "move",
          createFolderIfMissing: true,
        },
      },
      retryOnFailure: true,
      continueOnFailure: false,
      order: 2,
    },
    {
      actionId: "update_register",
      type: "update_spreadsheet",
      name: "Update Document Register",
      description: "Record document in document management spreadsheet",
      config: {
        module: "./actions/update-spreadsheet.js",
        function: "updateSpreadsheetAction",
        parameters: {
          spreadsheetId: "{{env.DOCUMENT_SPREADSHEET_ID}}",
          sheet: "Document Register",
          operation: "append",
          values: [
            [
              "{{event.docId}}",
              "{{event.fileId}}",
              "{{categorize_doc.output.fileName}}",
              "{{categorize_doc.output.categorization.documentType}}",
              "{{categorize_doc.output.categorization.category}}",
              "{{event.userId}}",
              "{{now}}",
              "{{now}}",
              "Draft",
              "{{route_doc.output.targetFolderId}}",
              "{{categorize_doc.output.categorization.keywords}}",
              "{{event.deliverableId}}",
              "{{event.programId}}",
              "1.0",
              "{{categorize_doc.output.categorization.confidence}}",
            ],
          ],
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
      description: "Send email notification about document submission",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{env.PROGRAM_MANAGERS}}"],
          subject: "Document Submitted: {{categorize_doc.output.fileName}}",
          body: `A new document has been submitted and categorized:

Document: {{categorize_doc.output.fileName}}
Type: {{categorize_doc.output.categorization.documentType}}
Phase: {{categorize_doc.output.categorization.phase}}
Category: {{categorize_doc.output.categorization.category}}
Folder: {{route_doc.output.targetFolderId}}
Submitted by: {{event.userId}}

Keywords: {{categorize_doc.output.categorization.keywords}}

Reasoning: {{categorize_doc.output.categorization.reasoning}}

Confidence: {{categorize_doc.output.categorization.confidence}}`,
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
      role: "team_member",
      action: "execute",
      required: false,
    },
    {
      role: "system",
      action: "execute",
      required: false,
    },
  ],
  status: "active",
  enabled: true,
  priority: 5,
  timeout: 300,
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 5,
    backoffMultiplier: 2,
    retryOn: ["EXECUTION_ERROR", "NETWORK_ERROR"],
  },
  errorHandling: {
    onError: "notify",
    notifyOnError: true,
    errorRecipients: ["{{env.PROGRAM_MANAGERS}}"],
  },
  metadata: {
    category: "document_management",
    tags: ["automation", "document", "categorization", "routing"],
    documentation: "https://github.com/example/workflows/document-submission",
  },
  createdBy: "system",
  createdDate: new Date(),
  modifiedDate: new Date(),
  executionCount: 0,
};
