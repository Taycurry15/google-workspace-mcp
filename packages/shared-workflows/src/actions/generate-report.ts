/**
 * Generate Report Action
 *
 * Workflow action for generating program reports:
 * - Weekly status reports
 * - Deliverable summaries
 * - Milestone forecasts
 * - Performance dashboards
 *
 * Phase 5 Implementation
 */

import type { ExecutionContext } from "../types/workflows.js";
import type { ReportActionConfig } from "../types/workflows.js";
import { google } from "googleapis";
import { LLMOrchestrator } from "@gw-mcp/shared-llm";

/**
 * Generate Report Action Handler
 */
export async function generateReportAction(
  auth: any,
  config: ReportActionConfig,
  context: ExecutionContext
): Promise<any> {
  switch (config.reportType) {
    case "weekly_status":
      return generateWeeklyStatusReport(auth, config, context);

    case "deliverable_summary":
      return generateDeliverableSummaryReport(auth, config, context);

    case "milestone_forecast":
      return generateMilestoneForecastReport(auth, config, context);

    default:
      throw new Error(`Unsupported report type: ${config.reportType}`);
  }
}

/**
 * Generate weekly status report
 */
async function generateWeeklyStatusReport(
  auth: any,
  config: ReportActionConfig,
  context: ExecutionContext
): Promise<any> {
  const programId = config.programId || context.programId;

  if (!programId) {
    throw new Error("programId is required for weekly status report");
  }

  // Gather data from spreadsheets
  const data = await gatherProgramData(auth, programId);

  // Generate report content using LLM
  const reportContent = await generateReportContent(data, "weekly_status");

  // Create report document
  const doc = await createReportDocument(
    auth,
    `Weekly Status Report - ${programId} - ${new Date().toISOString().split("T")[0]}`,
    reportContent,
    config.outputFolder
  );

  return {
    reportType: "weekly_status",
    programId,
    documentId: doc.documentId,
    documentUrl: doc.documentUrl,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate deliverable summary report
 */
async function generateDeliverableSummaryReport(
  auth: any,
  config: ReportActionConfig,
  context: ExecutionContext
): Promise<any> {
  const programId = config.programId || context.programId;

  if (!programId) {
    throw new Error("programId is required for deliverable summary report");
  }

  // Gather deliverable data
  const data = await gatherDeliverableData(auth, programId);

  // Generate report content
  const reportContent = await generateReportContent(data, "deliverable_summary");

  // Create report document
  const doc = await createReportDocument(
    auth,
    `Deliverable Summary - ${programId} - ${new Date().toISOString().split("T")[0]}`,
    reportContent,
    config.outputFolder
  );

  return {
    reportType: "deliverable_summary",
    programId,
    documentId: doc.documentId,
    documentUrl: doc.documentUrl,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate milestone forecast report
 */
async function generateMilestoneForecastReport(
  auth: any,
  config: ReportActionConfig,
  context: ExecutionContext
): Promise<any> {
  const programId = config.programId || context.programId;

  if (!programId) {
    throw new Error("programId is required for milestone forecast report");
  }

  // Gather milestone data
  const data = await gatherMilestoneData(auth, programId);

  // Generate report content
  const reportContent = await generateReportContent(data, "milestone_forecast");

  // Create report document
  const doc = await createReportDocument(
    auth,
    `Milestone Forecast - ${programId} - ${new Date().toISOString().split("T")[0]}`,
    reportContent,
    config.outputFolder
  );

  return {
    reportType: "milestone_forecast",
    programId,
    documentId: doc.documentId,
    documentUrl: doc.documentUrl,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Gather program data from spreadsheets
 */
async function gatherProgramData(auth: any, programId: string): Promise<any> {
  const sheets = google.sheets({ version: "v4", auth });

  // Get spreadsheet IDs from env
  const programSpreadsheetId = process.env.PROGRAM_SPREADSHEET_ID;
  const deliverableSpreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

  if (!programSpreadsheetId || !deliverableSpreadsheetId) {
    throw new Error("Spreadsheet IDs not configured in environment");
  }

  // Read program data
  const [programs, milestones, issues, deliverables] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: programSpreadsheetId,
      range: "Programs!A:Z",
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: programSpreadsheetId,
      range: "Milestones!A:Z",
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: programSpreadsheetId,
      range: "Issue Log!A:Z",
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: deliverableSpreadsheetId,
      range: "Deliverables!A:Z",
    }),
  ]);

  return {
    programs: programs.data.values || [],
    milestones: milestones.data.values || [],
    issues: issues.data.values || [],
    deliverables: deliverables.data.values || [],
  };
}

/**
 * Gather deliverable data
 */
async function gatherDeliverableData(auth: any, programId: string): Promise<any> {
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error("DELIVERABLE_SPREADSHEET_ID not configured");
  }

  const [deliverables, submissions, reviews] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Deliverables!A:Z",
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Submissions!A:Z",
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Reviews!A:Z",
    }),
  ]);

  return {
    deliverables: deliverables.data.values || [],
    submissions: submissions.data.values || [],
    reviews: reviews.data.values || [],
  };
}

/**
 * Gather milestone data
 */
async function gatherMilestoneData(auth: any, programId: string): Promise<any> {
  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = process.env.PROGRAM_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error("PROGRAM_SPREADSHEET_ID not configured");
  }

  const [milestones, schedule] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Milestones!A:Z",
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Schedule!A:Z",
    }),
  ]);

  return {
    milestones: milestones.data.values || [],
    schedule: schedule.data.values || [],
  };
}

/**
 * Generate report content using LLM
 */
async function generateReportContent(data: any, reportType: string): Promise<string> {
  const orchestrator = new LLMOrchestrator();
  const response = await orchestrator.generate({
    taskType: "analysis",
    priority: "normal",
    messages: [
      {
        role: "system",
        content:
          "You are a professional project management report writer. Create concise, actionable reports with clear structure and professional language.",
      },
      {
        role: "user",
        content: `Generate a professional ${reportType.replace("_", " ")} report based on this data:

${JSON.stringify(data, null, 2)}

Format the report with:
1. Executive Summary
2. Key Highlights
3. Detailed Analysis
4. Action Items
5. Risks and Issues

Use clear markdown formatting with headers, bullet points, and tables where appropriate.`,
      },
    ],
  });

  return response.outputText;
}

/**
 * Create report document in Google Docs
 */
async function createReportDocument(
  auth: any,
  title: string,
  content: string,
  folderId: string
): Promise<{ documentId: string; documentUrl: string }> {
  const docs = google.docs({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });

  // Create document
  const doc = await docs.documents.create({
    requestBody: {
      title,
    },
  });

  const documentId = doc.data.documentId!;

  // Insert content
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: {
              index: 1,
            },
            text: content,
          },
        },
      ],
    },
  });

  // Move to folder
  if (folderId) {
    await drive.files.update({
      fileId: documentId,
      addParents: folderId,
      fields: "id,parents",
    });
  }

  return {
    documentId,
    documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

/**
 * Action metadata for registration
 */
export const actionMetadata = {
  type: "generate_report",
  name: "Generate Report",
  description: "Generate program reports (weekly status, deliverable summary, etc.)",
  handler: generateReportAction,
};
