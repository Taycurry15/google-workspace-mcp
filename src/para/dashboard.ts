/**
 * PARA Dashboard Creation
 * Creates and manages PARA tracking dashboard spreadsheet
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { DashboardMetrics } from "../types/para.js";

/**
 * Create PARA dashboard spreadsheet
 */
export async function createDashboard(
  auth: OAuth2Client,
  folderId?: string
): Promise<{ spreadsheetId: string; url: string }> {
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  console.log("Creating PARA Dashboard...");

  // Create spreadsheet
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "PARA System Dashboard",
      },
      sheets: [
        {
          properties: {
            title: "Overview",
            gridProperties: { frozenRowCount: 2 },
          },
        },
        {
          properties: {
            title: "Projects",
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: "Areas",
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: "Resources",
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: "Archives",
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: "Review Queue",
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: "Categorization Log",
            gridProperties: { frozenRowCount: 1 },
          },
        },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  // Move to folder if specified
  if (folderId) {
    await drive.files.update({
      fileId: spreadsheetId,
      addParents: folderId,
      fields: "id, parents",
    });
  }

  // Populate Overview sheet
  await populateOverviewSheet(sheets, spreadsheetId);

  // Populate other sheets with headers
  await populateProjectsSheet(sheets, spreadsheetId);
  await populateAreasSheet(sheets, spreadsheetId);
  await populateResourcesSheet(sheets, spreadsheetId);
  await populateArchivesSheet(sheets, spreadsheetId);
  await populateReviewQueueSheet(sheets, spreadsheetId);
  await populateCategorizationLogSheet(sheets, spreadsheetId);

  // Apply formatting
  await applyDashboardFormatting(sheets, spreadsheetId);

  console.log("✓ Dashboard created successfully!");

  return {
    spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

/**
 * Populate Overview sheet
 */
async function populateOverviewSheet(
  sheets: any,
  spreadsheetId: string
): Promise<void> {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Overview!A1:B25",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["PARA SYSTEM DASHBOARD", ""],
        ["Last Updated", "=NOW()"],
        ["", ""],
        ["CATEGORY BREAKDOWN", "COUNT"],
        ["Active Projects", '=COUNTIF(Projects!F:F,"active")'],
        ["Total Areas", "=COUNTA(Areas!A2:A)"],
        ["Total Resources", "=COUNTA(Resources!A2:A)"],
        ["Archived This Year", `=COUNTIFS(Archives!C:C,">="&DATE(YEAR(TODAY()),1,1))`],
        ["", ""],
        ["HEALTH METRICS", "VALUE"],
        ["Categorized Files", "=COUNTA(Categorization_Log!A2:A)"],
        ["Avg Confidence Score", "=AVERAGE(Categorization_Log!D2:D)"],
        ["Items Needing Review", '=COUNTIF(Review_Queue!F:F,"Pending")'],
        ["Low Confidence Items (<0.7)", '=COUNTIF(Categorization_Log!D:D,"<0.7")'],
        ["", ""],
        ["RECENT ACTIVITY (Last 7 Days)", "COUNT"],
        ["New Categorizations", `=COUNTIFS(Categorization_Log!H:H,">="&TODAY()-7)`],
        ["Files Archived", `=COUNTIFS(Archives!C:C,">="&TODAY()-7)`],
        ["", ""],
        ["ACTIONABILITY BREAKDOWN", "COUNT"],
        ["High Priority", '=COUNTIF(Categorization_Log!E:E,"high")'],
        ["Medium Priority", '=COUNTIF(Categorization_Log!E:E,"medium")'],
        ["Low Priority", '=COUNTIF(Categorization_Log!E:E,"low")'],
        ["", ""],
        ["Quick Links", ""],
      ],
    },
  });
}

/**
 * Populate Projects sheet
 */
async function populateProjectsSheet(
  sheets: any,
  spreadsheetId: string
): Promise<void> {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Projects!A1:J1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          "Project Name",
          "File Link",
          "Domain",
          "Tags",
          "Deadline",
          "Status",
          "Actionability",
          "Confidence",
          "Created Date",
          "Last Modified",
        ],
      ],
    },
  });
}

/**
 * Populate Areas sheet
 */
async function populateAreasSheet(
  sheets: any,
  spreadsheetId: string
): Promise<void> {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Areas!A1:G1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          "Area Name",
          "File Link",
          "Domain",
          "Tags",
          "Actionability",
          "Confidence",
          "Last Modified",
        ],
      ],
    },
  });
}

/**
 * Populate Resources sheet
 */
async function populateResourcesSheet(
  sheets: any,
  spreadsheetId: string
): Promise<void> {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Resources!A1:H1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          "Resource Name",
          "File Link",
          "Type",
          "Domain",
          "Tags",
          "Confidence",
          "Created Date",
          "Last Modified",
        ],
      ],
    },
  });
}

/**
 * Populate Archives sheet
 */
async function populateArchivesSheet(
  sheets: any,
  spreadsheetId: string
): Promise<void> {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Archives!A1:G1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          "Project Name",
          "File Link",
          "Archived Date",
          "Quarter",
          "Reason",
          "Domain",
          "Tags",
        ],
      ],
    },
  });
}

/**
 * Populate Review Queue sheet
 */
async function populateReviewQueueSheet(
  sheets: any,
  spreadsheetId: string
): Promise<void> {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Review Queue!A1:G1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          "File Name",
          "File Link",
          "Issue",
          "Suggested Action",
          "Priority",
          "Status",
          "Added Date",
        ],
      ],
    },
  });
}

/**
 * Populate Categorization Log sheet
 */
async function populateCategorizationLogSheet(
  sheets: any,
  spreadsheetId: string
): Promise<void> {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Categorization_Log!A1:H1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          "File Name",
          "File Link",
          "Category",
          "Confidence",
          "Actionability",
          "Tags",
          "Domain",
          "Timestamp",
        ],
      ],
    },
  });
}

/**
 * Apply formatting to dashboard
 */
async function applyDashboardFormatting(
  sheets: any,
  spreadsheetId: string
): Promise<void> {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        // Format Overview headers
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 2,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.6, blue: 0.86 },
                textFormat: { bold: true, fontSize: 14 },
                horizontalAlignment: "CENTER",
              },
            },
            fields: "userEnteredFormat",
          },
        },
        // Format all sheet headers
        ...Array.from({ length: 7 }, (_, i) => ({
          repeatCell: {
            range: {
              sheetId: i,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.85, green: 0.85, blue: 0.85 },
                textFormat: { bold: true },
                horizontalAlignment: "CENTER",
              },
            },
            fields: "userEnteredFormat",
          },
        })),
      ],
    },
  });
}

/**
 * Log categorization event
 */
export async function logCategorization(
  auth: OAuth2Client,
  spreadsheetId: string,
  data: {
    fileName: string;
    fileLink: string;
    category: string;
    confidence: number;
    actionability: string;
    tags: string[];
    domain?: string;
  }
): Promise<void> {
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Categorization_Log!A:H",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          data.fileName,
          `=HYPERLINK("${data.fileLink}", "View")`,
          data.category,
          data.confidence,
          data.actionability,
          data.tags.join(", "),
          data.domain || "",
          new Date().toISOString(),
        ],
      ],
    },
  });
}

/**
 * Get dashboard metrics
 */
export async function getDashboardMetrics(
  auth: OAuth2Client
): Promise<DashboardMetrics> {
  const { getCategorizationSummary } = await import("./categorizer.js");
  const summary = await getCategorizationSummary(auth);

  return {
    categoryBreakdown: {
      projects: summary.byCategory.PROJECT || 0,
      areas: summary.byCategory.AREA || 0,
      resources: summary.byCategory.RESOURCE || 0,
      archives: summary.byCategory.ARCHIVE || 0,
    },
    health: {
      categorizedFiles: summary.categorized,
      uncategorizedFiles: summary.uncategorized,
      avgConfidence: summary.avgConfidence,
      itemsNeedingReview: 0, // Would need separate query
    },
    recentActivity: {
      newCategorizations7d: 0, // Would need date-based query
      filesArchived7d: 0,
      projectsCompleted7d: 0,
    },
    actionability: {
      high: summary.byActionability.high || 0,
      medium: summary.byActionability.medium || 0,
      low: summary.byActionability.low || 0,
    },
  };
}
