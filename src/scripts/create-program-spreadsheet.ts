#!/usr/bin/env node

/**
 * Program Management Spreadsheet Creator
 * Creates a comprehensive spreadsheet with 12 tabs for program management
 *
 * Usage: node dist/scripts/create-program-spreadsheet.js [programName]
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN_PATH = path.join(__dirname, "..", "..", "token.json");
const CREDENTIALS_PATH = path.join(__dirname, "..", "..", "credentials.json");

async function authorize(): Promise<OAuth2Client> {
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, "utf-8"));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const token = JSON.parse(await fs.readFile(TOKEN_PATH, "utf-8"));
  oauth2Client.setCredentials(token);
  return oauth2Client;
}

async function createProgramSpreadsheet(
  sheets: any,
  programName: string = "Program Management"
) {
  console.log(`Creating Program Management Spreadsheet for: ${programName}...`);

  // Create spreadsheet with all 12 tabs
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `${programName} - Program Management`,
      },
      sheets: [
        { properties: { title: "Programs", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Workstreams", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Projects", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Milestones", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "WBS", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Schedule", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Change Log", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Issue Log", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Decision Log", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Lessons Learned", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Stakeholders", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Governance", gridProperties: { frozenRowCount: 1 } } },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;
  console.log(`Spreadsheet created: ${spreadsheet.data.spreadsheetUrl}`);

  // Tab 1: Programs
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Programs!A1:S1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Program ID", "Name", "Description", "Sponsor", "Program Manager",
        "Objective", "Start Date", "End Date", "Actual Start", "Actual End",
        "Status", "Priority", "Health", "% Complete", "Budget",
        "Stakeholders", "Tags", "Created Date", "Modified Date"
      ]],
    },
  });

  // Tab 2: Workstreams
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Workstreams!A1:L1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Workstream ID", "Program ID", "Name", "Description", "Lead",
        "Start Date", "End Date", "Status", "Health", "% Complete",
        "Dependencies", "Notes"
      ]],
    },
  });

  // Tab 3: Projects
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Projects!A1:N1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Project ID", "Program ID", "Workstream ID", "Name", "Description",
        "Project Manager", "Start Date", "End Date", "Status", "Health",
        "% Complete", "WBS Code", "Dependencies", "Notes"
      ]],
    },
  });

  // Tab 4: Milestones
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Milestones!A1:O1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Milestone ID", "Program ID", "Project ID", "WBS Code", "Name",
        "Description", "Target Date", "Forecast Date", "Actual Date",
        "Variance (Days)", "Status", "Owner", "Critical", "Deliverables", "Acceptance Criteria"
      ]],
    },
  });

  // Add Variance formula
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Milestones!J2:J1000",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 999 }, (_, i) => [
        `=IF(I${i+2}<>"", I${i+2}-G${i+2}, IF(H${i+2}<>"", H${i+2}-G${i+2}, ""))`
      ]),
    },
  });

  // Tab 5: WBS (Work Breakdown Structure)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "WBS!A1:I1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "WBS Code", "Program ID", "Parent Code", "Level", "Description",
        "Deliverables", "Responsible", "% Complete", "Status"
      ]],
    },
  });

  // Tab 6: Schedule
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Schedule!A1:N1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Activity ID", "Program ID", "WBS Code", "Name", "Description",
        "Start Date", "End Date", "Duration (Days)", "Actual Start", "Actual End",
        "% Complete", "Dependencies", "Critical Path", "Responsible"
      ]],
    },
  });

  // Tab 7: Change Log
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Change Log!A1:Q1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Change ID", "Program ID", "Title", "Description", "Requested By",
        "Request Date", "Category", "Priority", "Impact", "Justification",
        "Status", "Decision", "Decision Date", "Approver", "Comments",
        "Implementation Date", "Affected Items"
      ]],
    },
  });

  // Tab 8: Issue Log
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Issue Log!A1:O1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Issue ID", "Program ID", "Project ID", "Title", "Description",
        "Category", "Priority", "Severity", "Status", "Raised By",
        "Raised Date", "Assigned To", "Due Date", "Resolution", "Resolved Date"
      ]],
    },
  });

  // Tab 9: Decision Log
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Decision Log!A1:M1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Decision ID", "Program ID", "Decision", "Context", "Alternatives",
        "Rationale", "Decision Date", "Decision Maker", "Stakeholders",
        "Impacts", "Category", "Status", "Review Date"
      ]],
    },
  });

  // Tab 10: Lessons Learned
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Lessons Learned!A1:J1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Lesson ID", "Program ID", "Category", "Lesson", "Context",
        "Impact", "Recommendation", "Phase", "Recorded Date", "Positive"
      ]],
    },
  });

  // Tab 11: Stakeholders
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Stakeholders!A1:N1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Stakeholder ID", "Program ID", "Name", "Email", "Organization",
        "Role", "Type", "Influence", "Interest", "Strategy",
        "Contact Frequency", "Preferred Comms", "Notes", "Last Contact"
      ]],
    },
  });

  // Tab 12: Governance
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Governance!A1:J1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Meeting ID", "Program ID", "Type", "Title", "Date",
        "Duration (min)", "Chair", "Attendees", "Decisions Made", "Minutes File ID"
      ]],
    },
  });

  // Apply formatting to all sheets
  const sheets_list = [
    "Programs", "Workstreams", "Projects", "Milestones", "WBS",
    "Schedule", "Change Log", "Issue Log", "Decision Log",
    "Lessons Learned", "Stakeholders", "Governance"
  ];

  for (const sheetName of sheets_list) {
    // Get sheet ID
    const sheetInfo = spreadsheet.data.sheets?.find(
      (s: any) => s.properties?.title === sheetName
    );
    const sheetId = sheetInfo?.properties?.sheetId;

    if (sheetId !== undefined) {
      // Format header row (bold, background color)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.4, blue: 0.6 },
                    textFormat: {
                      bold: true,
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                    },
                    horizontalAlignment: "CENTER",
                  },
                },
                fields: "userEnteredFormat",
              },
            },
          ],
        },
      });
    }
  }

  // Add conditional formatting for Status columns
  const statusSheets = [
    { name: "Programs", column: 10 },
    { name: "Workstreams", column: 7 },
    { name: "Projects", column: 8 },
    { name: "Milestones", column: 10 },
    { name: "Issue Log", column: 8 },
  ];

  for (const { name, column } of statusSheets) {
    const sheetInfo = spreadsheet.data.sheets?.find(
      (s: any) => s.properties?.title === name
    );
    const sheetId = sheetInfo?.properties?.sheetId;

    if (sheetId !== undefined) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            // Green for completed/green
            {
              addConditionalFormatRule: {
                rule: {
                  ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: column, endColumnIndex: column + 1 }],
                  booleanRule: {
                    condition: {
                      type: "TEXT_CONTAINS",
                      values: [{ userEnteredValue: "completed" }],
                    },
                    format: {
                      backgroundColor: { red: 0.7, green: 1, blue: 0.7 },
                    },
                  },
                },
                index: 0,
              },
            },
            // Red for at risk/red
            {
              addConditionalFormatRule: {
                rule: {
                  ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: column, endColumnIndex: column + 1 }],
                  booleanRule: {
                    condition: {
                      type: "TEXT_CONTAINS",
                      values: [{ userEnteredValue: "risk" }],
                    },
                    format: {
                      backgroundColor: { red: 1, green: 0.7, blue: 0.7 },
                    },
                  },
                },
                index: 1,
              },
            },
          ],
        },
      });
    }
  }

  console.log("✓ All 12 tabs created and formatted");
  console.log(`✓ Spreadsheet ID: ${spreadsheetId}`);
  console.log(`✓ URL: ${spreadsheet.data.spreadsheetUrl}`);

  return { spreadsheetId, url: spreadsheet.data.spreadsheetUrl };
}

async function main() {
  try {
    const auth = await authorize();
    const sheets = google.sheets({ version: "v4", auth });

    const programName = process.argv[2] || "DRC Infrastructure";
    const result = await createProgramSpreadsheet(sheets, programName);

    console.log("\n===========================================");
    console.log("Program Management Spreadsheet Created!");
    console.log("===========================================");
    console.log(`Spreadsheet ID: ${result.spreadsheetId}`);
    console.log(`URL: ${result.url}`);
    console.log("\nAdd this to your .env file:");
    console.log(`PROGRAM_SPREADSHEET_ID=${result.spreadsheetId}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
