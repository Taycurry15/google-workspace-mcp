#!/usr/bin/env node

/**
 * Google Sheets Template Generator
 * Creates pre-configured spreadsheets with formulas for business operations
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables with fallback to defaults
const TOKEN_PATH = process.env.TOKEN_PATH || path.join(__dirname, "..", "token.json");
const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH || path.join(__dirname, "..", "credentials.json");

async function authorize(): Promise<OAuth2Client> {
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, "utf-8"));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const token = JSON.parse(await fs.readFile(TOKEN_PATH, "utf-8"));
  oauth2Client.setCredentials(token);
  return oauth2Client;
}

// TEMPLATE: Deal Tracker
async function createDealTracker(sheets: any, drive: any) {
  console.log("Creating Deal Tracker...");

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "Deal Pipeline Tracker",
      },
      sheets: [
        { properties: { title: "Pipeline", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Won Deals" } },
        { properties: { title: "Lost Deals" } },
        { properties: { title: "Dashboard" } },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  // Pipeline sheet headers and data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Pipeline!A1:O1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Deal Name", "Client/Country", "Value ($)", "Probability (%)", 
        "Weighted Value", "Stage", "Owner", "Next Action", 
        "Action Date", "Created Date", "Expected Close", "Days Open",
        "Status", "Notes", "Last Updated"
      ]],
    },
  });

  // Add formulas for weighted value and days open
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Pipeline!E2:E100",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 99 }, (_, i) => [`=C${i+2}*D${i+2}/100`]),
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Pipeline!L2:L100",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 99 }, (_, i) => [`=TODAY()-J${i+2}`]),
    },
  });

  // Dashboard with summary formulas
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Dashboard!A1:B10",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["DEAL PIPELINE SUMMARY", ""],
        ["", ""],
        ["Total Deals", "=COUNTA(Pipeline!A2:A100)"],
        ["Total Pipeline Value", "=SUM(Pipeline!C2:C100)"],
        ["Total Weighted Value", "=SUM(Pipeline!E2:E100)"],
        ["Average Deal Size", "=AVERAGE(Pipeline!C2:C100)"],
        ["Deals by Stage:", ""],
        ["  Prospect", "=COUNTIF(Pipeline!F2:F100,\"Prospect\")"],
        ["  Proposal", "=COUNTIF(Pipeline!F2:F100,\"Proposal\")"],
        ["  Negotiation", "=COUNTIF(Pipeline!F2:F100,\"Negotiation\")"],
      ],
    },
  });

  // Format headers
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat)",
          },
        },
      ],
    },
  });

  console.log(`✓ Deal Tracker created: ${spreadsheet.data.spreadsheetUrl}`);
  return spreadsheetId;
}

// TEMPLATE: Proposal Tracker
async function createProposalTracker(sheets: any) {
  console.log("Creating Proposal Tracker...");

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "Proposal Management Tracker",
      },
      sheets: [
        { properties: { title: "Active Proposals", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Submitted" } },
        { properties: { title: "Won" } },
        { properties: { title: "Lost" } },
        { properties: { title: "Metrics" } },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  // Active Proposals headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Active Proposals!A1:N1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "RFP/Opportunity", "Client", "Due Date", "Days Until Due",
        "Bid/No Bid", "Capture Manager", "Proposal Manager", "Technical Lead",
        "Value ($)", "Win Probability (%)", "Weighted Value", "Status",
        "Key Dates", "Notes"
      ]],
    },
  });

  // Formula for days until due
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Active Proposals!D2:D100",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 99 }, (_, i) => [`=C${i+2}-TODAY()`]),
    },
  });

  // Formula for weighted value
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Active Proposals!K2:K100",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 99 }, (_, i) => [`=I${i+2}*J${i+2}/100`]),
    },
  });

  // Metrics dashboard
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Metrics!A1:B15",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["PROPOSAL METRICS", ""],
        ["", ""],
        ["Active Proposals", "=COUNTA('Active Proposals'!A2:A100)"],
        ["Submitted Awaiting Decision", "=COUNTA(Submitted!A2:A100)"],
        ["Total Won", "=COUNTA(Won!A2:A100)"],
        ["Total Lost", "=COUNTA(Lost!A2:A100)"],
        ["", ""],
        ["Win Rate", "=IF(COUNTA(Won!A2:A100)+COUNTA(Lost!A2:A100)>0, COUNTA(Won!A2:A100)/(COUNTA(Won!A2:A100)+COUNTA(Lost!A2:A100)), 0)"],
        ["Total Won Value", "=SUM(Won!I2:I100)"],
        ["Total Lost Value", "=SUM(Lost!I2:I100)"],
        ["", ""],
        ["Active Pipeline Value", "=SUM('Active Proposals'!I2:I100)"],
        ["Active Weighted Value", "=SUM('Active Proposals'!K2:K100)"],
        ["Average Deal Size", "=AVERAGE('Active Proposals'!I2:I100)"],
      ],
    },
  });

  // Format headers
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.8, green: 0.4, blue: 0.2 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat)",
          },
        },
      ],
    },
  });

  console.log(`✓ Proposal Tracker created: ${spreadsheet.data.spreadsheetUrl}`);
  return spreadsheetId;
}

// TEMPLATE: Time Tracking
async function createTimeTracker(sheets: any) {
  console.log("Creating Time Tracker...");

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "Project Time Tracker",
      },
      sheets: [
        { properties: { title: "Time Entries", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Projects" } },
        { properties: { title: "Summary" } },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  // Time Entries headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Time Entries!A1:I1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Date", "Project", "Task", "Hours", "Billable?", 
        "Rate ($/hr)", "Value", "Notes", "Week"
      ]],
    },
  });

  // Formula for value
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Time Entries!G2:G1000",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 999 }, (_, i) => [`=D${i+2}*F${i+2}`]),
    },
  });

  // Formula for week number
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Time Entries!I2:I1000",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 999 }, (_, i) => [`=WEEKNUM(A${i+2})`]),
    },
  });

  // Summary dashboard
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Summary!A1:B12",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["TIME TRACKING SUMMARY", ""],
        ["", ""],
        ["Total Hours Logged", "=SUM('Time Entries'!D2:D1000)"],
        ["Billable Hours", "=SUMIF('Time Entries'!E2:E1000,\"Yes\",'Time Entries'!D2:D1000)"],
        ["Non-Billable Hours", "=SUMIF('Time Entries'!E2:E1000,\"No\",'Time Entries'!D2:D1000)"],
        ["", ""],
        ["Total Revenue", "=SUMIF('Time Entries'!E2:E1000,\"Yes\",'Time Entries'!G2:G1000)"],
        ["Average Hourly Rate", "=AVERAGE('Time Entries'!F2:F1000)"],
        ["", ""],
        ["This Week Hours", "=SUMIF('Time Entries'!I2:I1000,WEEKNUM(TODAY()),'Time Entries'!D2:D1000)"],
        ["This Month Hours", "=SUMIFS('Time Entries'!D2:D1000,'Time Entries'!A2:A1000,\">=\"&DATE(YEAR(TODAY()),MONTH(TODAY()),1),'Time Entries'!A2:A1000,\"<=\"&EOMONTH(TODAY(),0))"],
      ],
    },
  });

  // Format headers
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.6, blue: 0.4 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat)",
          },
        },
      ],
    },
  });

  console.log(`✓ Time Tracker created: ${spreadsheet.data.spreadsheetUrl}`);
  return spreadsheetId;
}

// TEMPLATE: Client Tracker
async function createClientTracker(sheets: any) {
  console.log("Creating Client Tracker...");

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "Client Relationship Tracker",
      },
      sheets: [
        { properties: { title: "Active Clients", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Prospective" } },
        { properties: { title: "Past Clients" } },
        { properties: { title: "Touchpoints" } },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  // Active Clients headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Active Clients!A1:N1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Client Name", "Primary Contact", "Email", "Phone",
        "Contract Value", "Start Date", "End Date", "Renewal Date",
        "Account Manager", "Health Score", "Last Contact", "Days Since Contact",
        "Next Action", "Notes"
      ]],
    },
  });

  // Formula for days since contact
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Active Clients!L2:L100",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 99 }, (_, i) => [`=TODAY()-K${i+2}`]),
    },
  });

  // Touchpoints log
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Touchpoints!A1:F1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Date", "Client", "Type", "Summary", "Next Steps", "Follow-up Date"
      ]],
    },
  });

  console.log(`✓ Client Tracker created: ${spreadsheet.data.spreadsheetUrl}`);
  return spreadsheetId;
}

// TEMPLATE: Financial Dashboard
async function createFinancialDashboard(sheets: any) {
  console.log("Creating Financial Dashboard...");

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "Financial Dashboard",
      },
      sheets: [
        { properties: { title: "Income", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Expenses", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Dashboard" } },
        { properties: { title: "Monthly Summary" } },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  // Income headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Income!A1:G1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Date", "Client/Source", "Description", "Amount", 
        "Category", "Invoice #", "Status"
      ]],
    },
  });

  // Expenses headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Expenses!A1:G1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Date", "Vendor", "Description", "Amount", 
        "Category", "Receipt #", "Tax Deductible?"
      ]],
    },
  });

  // Dashboard with financial formulas
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Dashboard!A1:B15",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["FINANCIAL DASHBOARD", ""],
        ["", ""],
        ["Total Income", "=SUM(Income!D2:D1000)"],
        ["Total Expenses", "=SUM(Expenses!D2:D1000)"],
        ["Net Profit/Loss", "=SUM(Income!D2:D1000)-SUM(Expenses!D2:D1000)"],
        ["Profit Margin", "=IF(SUM(Income!D2:D1000)>0,(SUM(Income!D2:D1000)-SUM(Expenses!D2:D1000))/SUM(Income!D2:D1000),0)"],
        ["", ""],
        ["This Month Income", "=SUMIFS(Income!D2:D1000,Income!A2:A1000,\">=\"&DATE(YEAR(TODAY()),MONTH(TODAY()),1),Income!A2:A1000,\"<=\"&EOMONTH(TODAY(),0))"],
        ["This Month Expenses", "=SUMIFS(Expenses!D2:D1000,Expenses!A2:A1000,\">=\"&DATE(YEAR(TODAY()),MONTH(TODAY()),1),Expenses!A2:A1000,\"<=\"&EOMONTH(TODAY(),0))"],
        ["This Month Net", "=SUMIFS(Income!D2:D1000,Income!A2:A1000,\">=\"&DATE(YEAR(TODAY()),MONTH(TODAY()),1),Income!A2:A1000,\"<=\"&EOMONTH(TODAY(),0))-SUMIFS(Expenses!D2:D1000,Expenses!A2:A1000,\">=\"&DATE(YEAR(TODAY()),MONTH(TODAY()),1),Expenses!A2:A1000,\"<=\"&EOMONTH(TODAY(),0))"],
        ["", ""],
        ["YTD Income", "=SUMIFS(Income!D2:D1000,Income!A2:A1000,\">=\"&DATE(YEAR(TODAY()),1,1))"],
        ["YTD Expenses", "=SUMIFS(Expenses!D2:D1000,Expenses!A2:A1000,\">=\"&DATE(YEAR(TODAY()),1,1))"],
        ["YTD Net", "=SUMIFS(Income!D2:D1000,Income!A2:A1000,\">=\"&DATE(YEAR(TODAY()),1,1))-SUMIFS(Expenses!D2:D1000,Expenses!A2:A1000,\">=\"&DATE(YEAR(TODAY()),1,1))"],
      ],
    },
  });

  // Format headers
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.2, green: 0.6, blue: 0.2 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat)",
          },
        },
      ],
    },
  });

  console.log(`✓ Financial Dashboard created: ${spreadsheet.data.spreadsheetUrl}`);
  return spreadsheetId;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("\n📊 Google Sheets Template Generator");
    console.log("\nAvailable templates:");
    console.log("  deal         - Deal pipeline tracker with weighted values");
    console.log("  proposal     - Proposal management with win/loss tracking");
    console.log("  time         - Time tracking with billable hours");
    console.log("  client       - Client relationship tracker");
    console.log("  financial    - Income/expense dashboard");
    console.log("  all          - Create all templates");
    console.log("\nUsage: npm run create-sheets <template>");
    console.log("Example: npm run create-sheets deal");
    process.exit(0);
  }

  const templateType = args[0];
  
  const auth = await authorize();
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  console.log("\n🚀 Creating spreadsheet template...\n");

  const templates: { [key: string]: () => Promise<string> } = {
    deal: () => createDealTracker(sheets, drive),
    proposal: () => createProposalTracker(sheets),
    time: () => createTimeTracker(sheets),
    client: () => createClientTracker(sheets),
    financial: () => createFinancialDashboard(sheets),
  };

  if (templateType === "all") {
    for (const [name, creator] of Object.entries(templates)) {
      await creator();
      console.log("");
    }
  } else if (templates[templateType]) {
    await templates[templateType]();
  } else {
    console.error(`\n❌ Unknown template: ${templateType}`);
    console.log("Available: deal, proposal, time, client, financial, all");
    process.exit(1);
  }

  console.log("\n✅ Spreadsheet template(s) created successfully!\n");
}

main().catch(console.error);
