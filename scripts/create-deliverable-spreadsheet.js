#!/usr/bin/env node

/**
 * Create Deliverable Tracking Spreadsheet
 * Sets up a complete deliverable tracking spreadsheet with 7 tabs for Phase 4
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TOKEN_PATH = process.env.TOKEN_PATH || path.join(__dirname, '..', 'token.json');
const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH || path.join(__dirname, '..', 'credentials.json');

async function authorize() {
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf-8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const token = JSON.parse(await fs.readFile(TOKEN_PATH, 'utf-8'));
  oauth2Client.setCredentials(token);

  return oauth2Client;
}

async function createDeliverableSpreadsheet(auth) {
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('Creating Deliverable Tracking spreadsheet...\n');

  // Create spreadsheet with all 7 sheets
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: 'Deliverable Tracking - DRC Infrastructure Program',
      },
      sheets: [
        {
          properties: {
            title: 'Deliverables',
            gridProperties: {
              frozenRowCount: 1,
              frozenColumnCount: 2,
              rowCount: 1000,
              columnCount: 27,
            },
          },
        },
        {
          properties: {
            title: 'Submissions',
            gridProperties: {
              frozenRowCount: 1,
              frozenColumnCount: 1,
              rowCount: 1000,
              columnCount: 13,
            },
          },
        },
        {
          properties: {
            title: 'Reviews',
            gridProperties: {
              frozenRowCount: 1,
              frozenColumnCount: 1,
              rowCount: 1000,
              columnCount: 13,
            },
          },
        },
        {
          properties: {
            title: 'Quality Checklists',
            gridProperties: {
              frozenRowCount: 1,
              frozenColumnCount: 1,
              rowCount: 500,
              columnCount: 7,
            },
          },
        },
        {
          properties: {
            title: 'Quality Checklist Results',
            gridProperties: {
              frozenRowCount: 1,
              frozenColumnCount: 1,
              rowCount: 1000,
              columnCount: 9,
            },
          },
        },
        {
          properties: {
            title: 'Approvals',
            gridProperties: {
              frozenRowCount: 1,
              frozenColumnCount: 1,
              rowCount: 1000,
              columnCount: 12,
            },
          },
        },
        {
          properties: {
            title: 'Notifications',
            gridProperties: {
              frozenRowCount: 1,
              frozenColumnCount: 1,
              rowCount: 1000,
              columnCount: 11,
            },
          },
        },
        {
          properties: {
            title: 'Deliverable Tracking',
            gridProperties: {
              frozenRowCount: 1,
              frozenColumnCount: 1,
              rowCount: 2000,
              columnCount: 8,
            },
          },
        },
        {
          properties: {
            title: 'Reports',
            gridProperties: {
              frozenRowCount: 1,
              frozenColumnCount: 1,
              rowCount: 500,
              columnCount: 10,
            },
          },
        },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId;
  const spreadsheetUrl = spreadsheet.data.spreadsheetUrl;

  console.log(`✓ Spreadsheet created!`);
  console.log(`  ID: ${spreadsheetId}`);
  console.log(`  URL: ${spreadsheetUrl}\n`);

  // Prepare all data
  const data = [
    // Deliverables sheet
    {
      range: 'Deliverables!A1',
      values: [
        [
          'Deliverable ID',
          'Program ID',
          'Project ID',
          'Workstream ID',
          'WBS Code',
          'Name',
          'Description',
          'Type',
          'Owner',
          'Due Date',
          'Forecast Date',
          'Actual Date',
          'Variance (Days)',
          'Status',
          'Review Status',
          '% Complete',
          'Quality Score',
          'Acceptance Criteria',
          'Dependencies',
          'Related Documents',
          'Related Milestones',
          'Tags',
          'Notes',
          'Created Date',
          'Created By',
          'Modified Date',
          'Modified By',
        ],
      ],
    },

    // Submissions sheet
    {
      range: 'Submissions!A1',
      values: [
        [
          'Submission ID',
          'Deliverable ID',
          'Submitted By',
          'Submitted Date',
          'Version',
          'File IDs',
          'Submitter Notes',
          'Status',
          'Reviewer ID',
          'Review Due Date',
          'Completeness',
          'Missing Items',
          'Notifications Sent',
        ],
      ],
    },

    // Reviews sheet
    {
      range: 'Reviews!A1',
      values: [
        [
          'Review ID',
          'Deliverable ID',
          'Submission ID',
          'Reviewer ID',
          'Assigned Date',
          'Due Date',
          'Started Date',
          'Completed Date',
          'Status',
          'Decision',
          'Quality Score',
          'Recommendation',
          'Notifications Sent',
        ],
      ],
    },

    // Quality Checklists sheet
    {
      range: 'Quality Checklists!A1',
      values: [
        [
          'Checklist ID',
          'Name',
          'Description',
          'Deliverable Type',
          'Created By',
          'Created Date',
          'Active',
        ],
        // Add default checklist
        [
          'QC-001',
          'Standard Document Checklist',
          'Default quality checklist for documents',
          'document',
          'system',
          new Date().toISOString(),
          'TRUE',
        ],
      ],
    },

    // Quality Checklist Results sheet
    {
      range: 'Quality Checklist Results!A1',
      values: [
        [
          'Result ID',
          'Checklist ID',
          'Deliverable ID',
          'Review ID',
          'Evaluated By',
          'Evaluated Date',
          'Overall Score',
          'Passed',
          'Comments',
        ],
      ],
    },

    // Approvals sheet
    {
      range: 'Approvals!A1',
      values: [
        [
          'Approval ID',
          'Deliverable ID',
          'Review ID',
          'Approver ID',
          'Approver Role',
          'Requested Date',
          'Approved Date',
          'Status',
          'Decision',
          'Conditions',
          'Comments',
          'Notifications Sent',
        ],
      ],
    },

    // Notifications sheet
    {
      range: 'Notifications!A1',
      values: [
        [
          'Notification ID',
          'Deliverable ID',
          'Type',
          'Recipient',
          'Subject',
          'Message',
          'Priority',
          'Status',
          'Scheduled Date',
          'Sent Date',
          'Method',
        ],
      ],
    },

    // Deliverable Tracking sheet
    {
      range: 'Deliverable Tracking!A1',
      values: [
        [
          'Tracking ID',
          'Deliverable ID',
          'Timestamp',
          'Status',
          '% Complete',
          'Forecast Date',
          'Notes',
          'Recorded By',
        ],
      ],
    },

    // Reports sheet
    {
      range: 'Reports!A1',
      values: [
        [
          'Report ID',
          'Report Type',
          'Program ID',
          'Generated Date',
          'Generated By',
          'Total Deliverables',
          'Completion Rate',
          'Overdue Count',
          'At Risk Count',
          'File ID',
        ],
      ],
    },
  ];

  console.log('Adding headers and sample data...\n');
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data,
    },
  });

  // Get sheet IDs for formatting
  const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetIds = {};
  sheetInfo.data.sheets.forEach((sheet) => {
    sheetIds[sheet.properties.title] = sheet.properties.sheetId;
  });

  console.log('Applying formatting...\n');

  // Format headers for all sheets
  const requests = [];

  // Helper to format header row
  const formatHeader = (sheetId) => ({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: 1,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.2, green: 0.3, blue: 0.5 },
          textFormat: {
            foregroundColor: { red: 1, green: 1, blue: 1 },
            bold: true,
          },
          horizontalAlignment: 'CENTER',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
    },
  });

  // Apply header formatting to all sheets
  Object.values(sheetIds).forEach((sheetId) => {
    requests.push(formatHeader(sheetId));
  });

  // Add status color coding to Deliverables sheet
  const statusColors = [
    { value: 'not_started', color: { red: 0.9, green: 0.9, blue: 0.9 } },
    { value: 'in_progress', color: { red: 1, green: 0.9, blue: 0.6 } },
    { value: 'submitted', color: { red: 0.6, green: 0.8, blue: 1 } },
    { value: 'in_review', color: { red: 1, green: 0.8, blue: 0.4 } },
    { value: 'approved', color: { red: 0.7, green: 0.9, blue: 0.7 } },
    { value: 'rejected', color: { red: 1, green: 0.6, blue: 0.6 } },
    { value: 'completed', color: { red: 0.4, green: 0.8, blue: 0.4 } },
  ];

  statusColors.forEach((status) => {
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [
            {
              sheetId: sheetIds['Deliverables'],
              startRowIndex: 1,
              endRowIndex: 1000,
              startColumnIndex: 13, // Status column (N)
              endColumnIndex: 14,
            },
          ],
          booleanRule: {
            condition: {
              type: 'TEXT_EQ',
              values: [{ userEnteredValue: status.value }],
            },
            format: {
              backgroundColor: status.color,
            },
          },
        },
        index: 0,
      },
    });
  });

  // Add data validation for Status column in Deliverables
  requests.push({
    setDataValidation: {
      range: {
        sheetId: sheetIds['Deliverables'],
        startRowIndex: 1,
        endRowIndex: 1000,
        startColumnIndex: 13, // Status column
        endColumnIndex: 14,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: [
            { userEnteredValue: 'not_started' },
            { userEnteredValue: 'in_progress' },
            { userEnteredValue: 'submitted' },
            { userEnteredValue: 'in_review' },
            { userEnteredValue: 'approved' },
            { userEnteredValue: 'rejected' },
            { userEnteredValue: 'completed' },
          ],
        },
        showCustomUi: true,
        strict: true,
      },
    },
  });

  // Add data validation for Type column in Deliverables
  requests.push({
    setDataValidation: {
      range: {
        sheetId: sheetIds['Deliverables'],
        startRowIndex: 1,
        endRowIndex: 1000,
        startColumnIndex: 7, // Type column
        endColumnIndex: 8,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: [
            { userEnteredValue: 'document' },
            { userEnteredValue: 'design' },
            { userEnteredValue: 'software' },
            { userEnteredValue: 'hardware' },
            { userEnteredValue: 'training' },
            { userEnteredValue: 'report' },
            { userEnteredValue: 'presentation' },
            { userEnteredValue: 'prototype' },
            { userEnteredValue: 'data' },
            { userEnteredValue: 'other' },
          ],
        },
        showCustomUi: true,
        strict: true,
      },
    },
  });

  // Execute all formatting requests
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });

  console.log('✓ Formatting applied\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Deliverable Tracking Spreadsheet created successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Spreadsheet Details:');
  console.log(`  ID:  ${spreadsheetId}`);
  console.log(`  URL: ${spreadsheetUrl}\n`);
  console.log('Sheets created:');
  console.log('  1. Deliverables - Master deliverable register');
  console.log('  2. Submissions - Deliverable submissions');
  console.log('  3. Reviews - Review assignments and feedback');
  console.log('  4. Quality Checklists - Quality criteria templates');
  console.log('  5. Quality Checklist Results - Evaluation results');
  console.log('  6. Approvals - Approval workflow tracking');
  console.log('  7. Notifications - Notification queue');
  console.log('  8. Deliverable Tracking - Status change audit trail');
  console.log('  9. Reports - Generated reports metadata\n');
  console.log('Next steps:');
  console.log(`  1. Add this to your .env file:`);
  console.log(`     DELIVERABLE_SPREADSHEET_ID=${spreadsheetId}`);
  console.log(`  2. The spreadsheet is ready to use with the MCP server`);
  console.log(`  3. Use deliverable_* tools to interact with this spreadsheet\n`);

  return { spreadsheetId, spreadsheetUrl };
}

// Run the script
authorize()
  .then(createDeliverableSpreadsheet)
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
