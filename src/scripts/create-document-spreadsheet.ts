#!/usr/bin/env node

/**
 * Document Management Spreadsheet Creator
 * Creates a comprehensive spreadsheet for document tracking and organization
 *
 * Usage: node dist/scripts/create-document-spreadsheet.js [programName]
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

async function createDocumentSpreadsheet(sheets: any, programName: string = "Document Management") {
  console.log(`Creating Document Management Spreadsheet for: ${programName}...`);

  // Create spreadsheet with 8 tabs
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `${programName} - Document Management`,
      },
      sheets: [
        {
          properties: {
            title: "Document Register",
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: "Document Types",
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: "Folder Structure",
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: "Templates",
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: "Document Workflows",
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: "Version History",
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: "Access Log",
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: "Metadata",
            gridProperties: { frozenRowCount: 1 },
          },
        },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;
  console.log(`Spreadsheet created: ${spreadsheet.data.spreadsheetUrl}`);

  // Tab 1: Document Register
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Document Register!A1:U1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          "Doc ID",
          "Drive File ID",
          "Title",
          "Type",
          "Category",
          "Subcategory",
          "Program ID",
          "Project ID",
          "Deliverable ID",
          "Owner",
          "Created Date",
          "Modified Date",
          "Status",
          "Version",
          "Phase",
          "Folder Path",
          "Folder ID",
          "Tags",
          "Classification",
          "Confidence",
          "Description",
        ],
      ],
    },
  });

  // Tab 2: Document Types
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Document Types!A1:F1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["Type", "Description", "Default Phase", "Default Folder", "Required Tags", "Template ID"],
      ],
    },
  });

  // Add sample document types
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Document Types!A2:F15",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["charter", "Program/Project Charter", "initiation", "01-Initiation/Charter", "", ""],
        ["plan", "Planning Documents", "planning", "02-Planning/Project Plans", "", ""],
        [
          "report",
          "Status and Performance Reports",
          "execution",
          "03-Execution/Status Reports",
          "",
          "",
        ],
        ["deliverable", "Project Deliverables", "execution", "03-Execution/Deliverables", "", ""],
        [
          "meeting_notes",
          "Meeting Minutes and Notes",
          "execution",
          "03-Execution/Meetings",
          "",
          "",
        ],
        [
          "presentation",
          "Presentations and Slide Decks",
          "execution",
          "03-Execution/Meetings",
          "",
          "",
        ],
        ["template", "Document Templates", "support", "06-Support/Templates", "", ""],
        ["contract", "Contracts and Agreements", "initiation", "01-Initiation", "", ""],
        ["specification", "Technical Specifications", "planning", "02-Planning", "", ""],
        ["design", "Design Documents", "planning", "02-Planning", "", ""],
        [
          "test_plan",
          "Testing Documents",
          "execution",
          "04-Monitoring-Control/Quality Assurance",
          "",
          "",
        ],
        ["training", "Training Materials", "support", "06-Support/Training Materials", "", ""],
        [
          "reference",
          "Reference Documentation",
          "support",
          "06-Support/Reference Documents",
          "",
          "",
        ],
        ["other", "Other Documents", "support", "06-Support", "", ""],
      ],
    },
  });

  // Tab 3: Folder Structure
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Folder Structure!A1:F1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["Folder Path", "Folder ID", "Program ID", "Description", "Phase", "Document Types"],
      ],
    },
  });

  // Tab 4: Templates
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Templates!A1:M1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          "Template ID",
          "Name",
          "Description",
          "Type",
          "Drive File ID",
          "Category",
          "Variables",
          "Tags",
          "Active",
          "Created By",
          "Created Date",
          "Last Used",
          "Usage Count",
        ],
      ],
    },
  });

  // Tab 5: Document Workflows
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Document Workflows!A1:J1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          "Workflow ID",
          "Doc ID",
          "Drive File ID",
          "Workflow Type",
          "Status",
          "Assigned To",
          "Due Date",
          "Completed Date",
          "Completed By",
          "Notes",
        ],
      ],
    },
  });

  // Tab 6: Version History
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Version History!A1:M1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          "Version ID",
          "Doc ID",
          "Drive File ID",
          "Version",
          "Major",
          "Minor",
          "Patch",
          "Created Date",
          "Created By",
          "Comment",
          "Change Type",
          "File Size",
          "Checksum",
        ],
      ],
    },
  });

  // Tab 7: Access Log
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Access Log!A1:H1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          "Log ID",
          "Doc ID",
          "Drive File ID",
          "Action",
          "User",
          "Timestamp",
          "IP Address",
          "User Agent",
        ],
      ],
    },
  });

  // Tab 8: Metadata
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Metadata!A1:E1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [["Field Name", "Field Type", "Description", "Validation", "Required"]],
    },
  });

  console.log("\n✅ Document Management Spreadsheet created successfully!");
  console.log(`📊 Spreadsheet ID: ${spreadsheetId}`);
  console.log(`🔗 URL: ${spreadsheet.data.spreadsheetUrl}`);
  console.log(`\n💡 Add this to your .env file:\nDOCUMENT_SPREADSHEET_ID=${spreadsheetId}`);

  return spreadsheetId;
}

async function main() {
  try {
    const programName = process.argv[2] || "Default Program";
    const auth = await authorize();
    const sheets = google.sheets({ version: "v4", auth });

    await createDocumentSpreadsheet(sheets, programName);
  } catch (error) {
    console.error("Error creating spreadsheet:", error);
    process.exit(1);
  }
}

main();
