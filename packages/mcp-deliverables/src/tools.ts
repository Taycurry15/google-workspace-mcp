/**
 * MCP Tool Definitions for Deliverables Server
 *
 * Defines all tools exposed via the MCP protocol
 */

import type { OAuth2Client } from "google-auth-library";
import type { sheets_v4, drive_v3 } from "googleapis";
import { initializeAuth, createSheetsClient, createDriveClient } from "@gw-mcp/shared-core";
import * as deliverables from "./deliverables/deliverables.js";
import * as submissions from "./deliverables/submissions.js";
import * as review from "./deliverables/review.js";
import * as quality from "./deliverables/quality.js";
import * as tracking from "./deliverables/tracking.js";
import * as reporting from "./deliverables/reporting.js";

// Global auth client and API clients
let authClient: OAuth2Client | null = null;
let sheetsClient: sheets_v4.Sheets | null = null;
let driveClient: drive_v3.Drive | null = null;

async function getAuth(): Promise<OAuth2Client> {
  if (!authClient) {
    authClient = await initializeAuth();
  }
  return authClient;
}

async function getSheets(): Promise<sheets_v4.Sheets> {
  if (!sheetsClient) {
    const auth = await getAuth();
    sheetsClient = createSheetsClient(auth);
  }
  return sheetsClient!;
}

async function getDrive(): Promise<drive_v3.Drive> {
  if (!driveClient) {
    const auth = await getAuth();
    driveClient = createDriveClient(auth);
  }
  return driveClient!;
}

/**
 * Tool definitions for Deliverables
 */
export const DELIVERABLE_TOOLS = [
  // Core Deliverable Tools
  {
    name: "deliverable_create",
    description: "Create a new deliverable",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID" },
        deliverable: {
          type: "object",
          description: "Deliverable data",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            wbs: { type: "string" },
            responsible: { type: "string" },
            accountable: { type: "string" },
            dueDate: { type: "string" },
            description: { type: "string" },
          },
        },
      },
      required: ["spreadsheetId", "deliverable"],
    },
  },
  {
    name: "deliverable_read",
    description: "Read deliverable(s) from spreadsheet",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        deliverableId: { type: "string", description: "Optional specific deliverable ID" },
      },
      required: ["spreadsheetId"],
    },
  },
  {
    name: "deliverable_update",
    description: "Update a deliverable",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        deliverableId: { type: "string" },
        updates: { type: "object" },
      },
      required: ["spreadsheetId", "deliverableId", "updates"],
    },
  },
  {
    name: "deliverable_delete",
    description: "Delete a deliverable",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        deliverableId: { type: "string" },
      },
      required: ["spreadsheetId", "deliverableId"],
    },
  },

  // Submission Tools
  {
    name: "deliverable_submit",
    description: "Submit a deliverable for review",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        deliverableId: { type: "string" },
        fileId: { type: "string", description: "Google Drive file ID" },
        submittedBy: { type: "string" },
        notes: { type: "string" },
      },
      required: ["spreadsheetId", "deliverableId", "fileId", "submittedBy"],
    },
  },
  {
    name: "deliverable_submission_history",
    description: "Get submission history for a deliverable",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        deliverableId: { type: "string" },
      },
      required: ["spreadsheetId", "deliverableId"],
    },
  },

  // Review Tools
  {
    name: "deliverable_review_start",
    description: "Start review process for a deliverable",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        deliverableId: { type: "string" },
        reviewers: { type: "array", items: { type: "string" } },
        dueDate: { type: "string" },
      },
      required: ["spreadsheetId", "deliverableId", "reviewers"],
    },
  },
  {
    name: "deliverable_review_submit",
    description: "Submit a review for a deliverable",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        deliverableId: { type: "string" },
        reviewerId: { type: "string" },
        decision: { type: "string", enum: ["approve", "reject", "needs_revision"] },
        comments: { type: "string" },
        feedback: { type: "array", items: { type: "object" } },
      },
      required: ["spreadsheetId", "deliverableId", "reviewerId", "decision"],
    },
  },
  {
    name: "deliverable_review_status",
    description: "Get review status for a deliverable",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        deliverableId: { type: "string" },
      },
      required: ["spreadsheetId", "deliverableId"],
    },
  },

  // Quality Tools
  {
    name: "deliverable_quality_assess",
    description: "Assess quality of a deliverable",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        deliverableId: { type: "string" },
        assessedBy: { type: "string" },
        scores: { type: "object", description: "Quality scores by criteria" },
        notes: { type: "string" },
      },
      required: ["spreadsheetId", "deliverableId", "assessedBy", "scores"],
    },
  },
  {
    name: "deliverable_quality_report",
    description: "Generate quality report for deliverables",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        filters: { type: "object", description: "Optional filters" },
      },
      required: ["spreadsheetId"],
    },
  },

  // Tracking Tools
  {
    name: "deliverable_tracking_update",
    description: "Update deliverable tracking information",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        deliverableId: { type: "string" },
        status: { type: "string" },
        percentComplete: { type: "number" },
        notes: { type: "string" },
      },
      required: ["spreadsheetId", "deliverableId"],
    },
  },
  {
    name: "deliverable_tracking_dashboard",
    description: "Get tracking dashboard data",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        filters: { type: "object" },
      },
      required: ["spreadsheetId"],
    },
  },

  // Reporting Tools
  {
    name: "deliverable_report_status",
    description: "Generate status report for deliverables",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        filters: { type: "object" },
      },
      required: ["spreadsheetId"],
    },
  },
  {
    name: "deliverable_report_overdue",
    description: "Get overdue deliverables report",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
      },
      required: ["spreadsheetId"],
    },
  },
];

/**
 * Tool handlers
 */
export async function handleToolCall(name: string, args: any): Promise<any> {
  const sheets = await getSheets();
  const spreadsheetId = args.spreadsheetId || process.env.DELIVERABLES_SPREADSHEET_ID || "";

  switch (name) {
    // Core Deliverable
    case "deliverable_create":
      return await deliverables.createDeliverable(sheets, spreadsheetId, args.deliverable, args.createdBy || "system");
    case "deliverable_read":
      if (args.deliverableId) {
        return await deliverables.readDeliverable(sheets, spreadsheetId, args.deliverableId);
      }
      return await deliverables.listDeliverables(sheets, spreadsheetId, args.filters);
    case "deliverable_update":
      return await deliverables.updateDeliverable(sheets, spreadsheetId, args.updates, args.modifiedBy || "system");
    case "deliverable_delete":
      return await deliverables.deleteDeliverable(sheets, spreadsheetId, args.deliverableId, args.deletedBy || "system");

    // Submissions
    case "deliverable_submit":
      const drive = await getDrive();
      return await submissions.submitDeliverable(sheets, drive, spreadsheetId, {
        deliverableId: args.deliverableId,
        fileIds: args.fileIds || [],
        submitterNotes: args.notes
      }, args.submittedBy || "system");
    case "deliverable_submission_history":
      return await submissions.listSubmissionsForDeliverable(sheets, spreadsheetId, args.deliverableId);

    // Review
    case "deliverable_review_start":
      return await review.assignReviewer(sheets, spreadsheetId, {
        deliverableId: args.deliverableId,
        reviewerId: args.reviewer,
        dueDate: args.dueDate ? new Date(args.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }, args.submissionId);
    case "deliverable_review_submit":
      return await review.submitReview(sheets, spreadsheetId, {
        deliverableId: args.deliverableId,
        submissionId: args.submissionId,
        decision: args.decision,
        comments: args.comments,
        qualityScore: args.qualityScore,
        feedbackItems: args.feedbackItems
      }, args.reviewerId || "system");
    case "deliverable_review_status":
      return await review.listReviewsForDeliverable(sheets, spreadsheetId, args.deliverableId);

    // Quality
    case "deliverable_quality_assess":
      return await quality.evaluateDeliverable(
        sheets,
        spreadsheetId,
        args.deliverableId,
        args.checklistId,
        args.results || [],
        args.assessor || "system",
        args.reviewId
      );
    case "deliverable_quality_report":
      return await reporting.generateQualityReport(
        sheets,
        spreadsheetId,
        args.programId
      );

    // Tracking
    case "deliverable_tracking_update":
      return await tracking.trackStatus(
        sheets,
        spreadsheetId,
        args.deliverableId,
        args.status,
        args.percentComplete || 0,
        args.forecastDate ? new Date(args.forecastDate) : undefined,
        args.notes || "",
        args.recordedBy || "system"
      );
    case "deliverable_tracking_dashboard":
      return await tracking.getTrackingHistory(sheets, spreadsheetId, args.deliverableId);

    // Reporting
    case "deliverable_report_status":
      return await reporting.generateStatusReport(sheets, spreadsheetId, {
        reportType: "status",
        programId: args.programId,
        filters: args.filters,
        groupBy: args.groupBy,
        sortBy: args.sortBy,
        includeCharts: args.includeCharts || false,
        includeDetails: true
      });
    case "deliverable_report_overdue":
      return await reporting.generateOverdueReport(
        sheets,
        spreadsheetId,
        args.programId
      );

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
