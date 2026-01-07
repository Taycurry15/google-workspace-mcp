#!/usr/bin/env node

/**
 * Create PMO Tracking Spreadsheet
 * Sets up a complete PMO tracking spreadsheet with sample data
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

async function createPMOSpreadsheet(auth) {
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('Creating PMO tracking spreadsheet...\n');

  // Create spreadsheet with all sheets
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: 'DRC PMO Tracking - Digital Transformation Initiative',
      },
      sheets: [
        {
          properties: {
            title: 'Deliverables',
            gridProperties: {
              frozenRowCount: 1,
              frozenColumnCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'Risks',
            gridProperties: {
              frozenRowCount: 1,
              frozenColumnCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'EVM',
            gridProperties: {
              frozenRowCount: 1,
              frozenColumnCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'Stakeholders',
            gridProperties: {
              frozenRowCount: 1,
              frozenColumnCount: 1,
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
        ['ID', 'Name', 'WBS', 'Week', 'Status', 'Quality', 'Budget', 'Responsible', 'Accountable', 'Priority'],
        ['D-01', 'Requirements Gathering', '1.1.1', '1', 'complete', '95', '50000', 'John Doe', 'Jane Smith', 'critical'],
        ['D-02', 'System Design', '1.1.2', '2', 'in-progress', '80', '75000', 'Alice Brown', 'Jane Smith', 'high'],
        ['D-03', 'Infrastructure Setup', '1.2.1', '3', 'not-started', '0', '100000', 'Bob Wilson', 'Tom Anderson', 'high'],
        ['D-04', 'Network Configuration', '1.2.2', '4', 'not-started', '0', '80000', 'Charlie Davis', 'Tom Anderson', 'medium'],
        ['D-05', 'Security Implementation', '1.3.1', '5', 'not-started', '0', '120000', 'Diana Evans', 'Jane Smith', 'critical'],
      ],
    },
    // Risks sheet
    {
      range: 'Risks!A1',
      values: [
        ['ID', 'Name', 'Category', 'Probability', 'Impact', 'Score', 'Status', 'Response', 'Owner', 'Mitigation'],
        ['R-01', 'Vendor Delays', 'Schedule', '4', '4', '16', 'active', 'Multi-vendor approach with backup suppliers', 'Tom Anderson', '60'],
        ['R-02', 'Budget Overrun', 'Financial', '3', '5', '15', 'active', 'Monthly budget reviews and cost controls', 'Jane Smith', '40'],
        ['R-03', 'Skill Gap', 'Resource', '3', '3', '9', 'monitoring', 'Training program and external consultants', 'Alice Brown', '75'],
        ['R-04', 'Political Instability', 'Political', '2', '5', '10', 'monitoring', 'Stakeholder engagement and contingency planning', 'Jane Smith', '30'],
        ['R-05', 'Technology Compatibility', 'Technical', '3', '4', '12', 'active', 'Comprehensive testing and POCs', 'Bob Wilson', '50'],
      ],
    },
    // EVM sheet
    {
      range: 'EVM!A1',
      values: [
        ['Week', 'PV', 'EV', 'AC', 'SPI', 'CPI', 'EAC', 'VAC'],
        ['1', '5000000', '4800000', '4700000', '0.96', '1.02', '138000000', '3000000'],
        ['2', '10000000', '9500000', '9300000', '0.95', '1.02', '138500000', '2500000'],
        ['3', '15000000', '14500000', '14200000', '0.97', '1.02', '138000000', '3000000'],
        ['4', '20000000', '19200000', '18900000', '0.96', '1.02', '138200000', '2800000'],
        ['5', '25000000', '24000000', '23500000', '0.96', '1.02', '138300000', '2700000'],
      ],
    },
    // Stakeholders sheet
    {
      range: 'Stakeholders!A1',
      values: [
        ['ID', 'Name', 'Role', 'Email', 'Influence', 'Interest', 'Engagement'],
        ['G-01', 'Minister of Digital Affairs', 'Program Sponsor', 'minister@mptntic.gov.cd', '5', '5', '5'],
        ['G-02', 'Director General Digital', 'Technical Review Committee', 'dg.digital@mptntic.gov.cd', '5', '5', '4'],
        ['G-03', 'PMO Lead', 'Project Manager', 'pmo@thebronzeshield.com', '4', '5', '5'],
        ['G-04', 'Finance Director', 'Budget Authority', 'finance@mptntic.gov.cd', '4', '4', '3'],
        ['G-05', 'IT Director', 'Technical Lead', 'it@mptntic.gov.cd', '4', '5', '4'],
      ],
    },
  ];

  // Write all data in batch
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: data,
    },
  });

  console.log('✓ Added sample data to all sheets\n');

  // Format headers (bold)
  const requests = [
    // Deliverables header
    {
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.2, green: 0.6, blue: 0.86 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
    // Risks header
    {
      repeatCell: {
        range: {
          sheetId: 1,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.95, green: 0.6, blue: 0.2 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
    // EVM header
    {
      repeatCell: {
        range: {
          sheetId: 2,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.3, green: 0.7, blue: 0.3 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
    // Stakeholders header
    {
      repeatCell: {
        range: {
          sheetId: 3,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.6, green: 0.4, blue: 0.8 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });

  console.log('✓ Applied formatting\n');

  return { spreadsheetId, spreadsheetUrl };
}

// Main execution
(async () => {
  try {
    const auth = await authorize();
    const { spreadsheetId, spreadsheetUrl } = await createPMOSpreadsheet(auth);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('PMO SPREADSHEET CREATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('Next steps:');
    console.log('1. Update your .env file with this spreadsheet ID:');
    console.log(`   PMO_SPREADSHEET_ID=${spreadsheetId}\n`);
    console.log('2. Rebuild the project:');
    console.log('   npm run build\n');
    console.log('3. Restart Claude Desktop\n');
    console.log('4. Test with: "Show me all deliverables"\n');
    console.log(`Open spreadsheet: ${spreadsheetUrl}`);
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('Error creating PMO spreadsheet:', error.message);
    process.exit(1);
  }
})();
