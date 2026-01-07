#!/usr/bin/env node

/**
 * PMI-Aligned Spreadsheet Templates
 * Creates PMBOK-compliant tracking sheets with formulas
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN_PATH = path.join(__dirname, "..", "token.json");
const CREDENTIALS_PATH = path.join(__dirname, "..", "credentials.json");

async function authorize(): Promise<OAuth2Client> {
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, "utf-8"));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const token = JSON.parse(await fs.readFile(TOKEN_PATH, "utf-8"));
  oauth2Client.setCredentials(token);
  return oauth2Client;
}

// TEMPLATE 1: Stakeholder Register
async function createStakeholderRegister(sheets: any) {
  console.log("Creating Stakeholder Register...");

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "Stakeholder Register - PMI",
      },
      sheets: [
        { properties: { title: "Stakeholder Register", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Power-Interest Matrix" } },
        { properties: { title: "Engagement Plan" } },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  // Stakeholder Register headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Stakeholder Register!A1:N1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "ID", "Name", "Organization", "Role", "Email", "Phone",
        "Interest Level (1-5)", "Influence Level (1-5)", "Power Score",
        "Current Engagement", "Target Engagement", "Engagement Strategy",
        "Communication Frequency", "Notes"
      ]],
    },
  });

  // Formula for Power Score (Interest × Influence)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Stakeholder Register!I2:I100",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 99 }, (_, i) => [`=G${i+2}*H${i+2}`]),
    },
  });

  // Power-Interest Matrix
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Power-Interest Matrix!A1:E1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [["Stakeholder", "Interest", "Influence", "Quadrant", "Strategy"]],
    },
  });

  // Engagement Plan
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Engagement Plan!A1:H1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [["Stakeholder", "Current State", "Desired State", "Gap", "Actions", "Owner", "Due Date", "Status"]],
    },
  });

  console.log(`✓ Stakeholder Register created: ${spreadsheet.data.spreadsheetUrl}`);
  return spreadsheetId;
}

// TEMPLATE 2: Risk Register with PMI Analysis
async function createRiskRegister(sheets: any) {
  console.log("Creating Risk Register...");

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "Risk Register - PMI",
      },
      sheets: [
        { properties: { title: "Risk Register", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Risk Matrix" } },
        { properties: { title: "Risk Trends" } },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  // Risk Register headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Risk Register!A1:S1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Risk ID", "Date Identified", "Risk Description", "Category",
        "Probability (1-5)", "Impact (1-5)", "Risk Score", "Risk Level",
        "Response Strategy", "Response Actions", "Owner", "Secondary Owner",
        "Contingency Plan", "Trigger Conditions", "Status",
        "Residual Probability", "Residual Impact", "Residual Score", "Review Date"
      ]],
    },
  });

  // Formulas
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Risk Register!G2:G500",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 499 }, (_, i) => [`=E${i+2}*F${i+2}`]),
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Risk Register!H2:H500",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 499 }, (_, i) => [
        `=IF(G${i+2}>=20,"Critical",IF(G${i+2}>=12,"High",IF(G${i+2}>=6,"Medium","Low")))`
      ]),
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Risk Register!R2:R500",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 499 }, (_, i) => [`=P${i+2}*Q${i+2}`]),
    },
  });

  // Risk Matrix summary
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Risk Matrix!A1:B10",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["RISK SUMMARY", ""],
        ["", ""],
        ["Total Active Risks", "=COUNTIF('Risk Register'!O2:O500,\"Open\")"],
        ["Critical Risks", "=COUNTIFS('Risk Register'!H2:H500,\"Critical\",'Risk Register'!O2:O500,\"Open\")"],
        ["High Risks", "=COUNTIFS('Risk Register'!H2:H500,\"High\",'Risk Register'!O2:O500,\"Open\")"],
        ["Medium Risks", "=COUNTIFS('Risk Register'!H2:H500,\"Medium\",'Risk Register'!O2:O500,\"Open\")"],
        ["Low Risks", "=COUNTIFS('Risk Register'!H2:H500,\"Low\",'Risk Register'!O2:O500,\"Open\")"],
        ["", ""],
        ["Total Risk Exposure", "=SUMIF('Risk Register'!O2:O500,\"Open\",'Risk Register'!G2:G500)"],
      ],
    },
  });

  console.log(`✓ Risk Register created: ${spreadsheet.data.spreadsheetUrl}`);
  return spreadsheetId;
}

// TEMPLATE 3: WBS with Schedule
async function createWBSSchedule(sheets: any) {
  console.log("Creating WBS & Schedule...");

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "WBS & Schedule - PMI",
      },
      sheets: [
        { properties: { title: "WBS", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Schedule", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Milestones" } },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  // WBS headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "WBS!A1:M1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "WBS Code", "Level", "Description", "Owner", "Type",
        "Budget ($)", "Start Date", "End Date", "Duration (Days)",
        "Predecessors", "% Complete", "Status", "Notes"
      ]],
    },
  });

  // Duration formula
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "WBS!I2:I500",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 499 }, (_, i) => [`=IF(AND(G${i+2}<>"",H${i+2}<>""),H${i+2}-G${i+2},"")`]),
    },
  });

  // Schedule with EVM
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Schedule!A1:P1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "WBS Code", "Activity", "Planned Start", "Planned Finish", "Planned Duration",
        "Actual Start", "Actual Finish", "Actual Duration", "Variance (Days)",
        "% Complete", "Budget (PV)", "Earned Value (EV)", "Actual Cost (AC)",
        "Cost Variance (CV)", "Schedule Variance (SV)", "Status"
      ]],
    },
  });

  // Schedule formulas
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Schedule!E2:E500",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 499 }, (_, i) => [`=D${i+2}-C${i+2}`]),
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Schedule!H2:H500",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 499 }, (_, i) => [`=IF(AND(F${i+2}<>"",G${i+2}<>""),G${i+2}-F${i+2},"")`]),
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Schedule!I2:I500",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 499 }, (_, i) => [`=IF(H${i+2}<>"",H${i+2}-E${i+2},"")`]),
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Schedule!L2:L500",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 499 }, (_, i) => [`=K${i+2}*J${i+2}/100`]),
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Schedule!N2:N500",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 499 }, (_, i) => [`=L${i+2}-M${i+2}`]),
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Schedule!O2:O500",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 499 }, (_, i) => [`=L${i+2}-K${i+2}`]),
    },
  });

  console.log(`✓ WBS & Schedule created: ${spreadsheet.data.spreadsheetUrl}`);
  return spreadsheetId;
}

// TEMPLATE 4: EVM Dashboard
async function createEVMDashboard(sheets: any) {
  console.log("Creating EVM Dashboard...");

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "EVM Dashboard - PMI",
      },
      sheets: [
        { properties: { title: "Summary" } },
        { properties: { title: "Monthly EVM Data" } },
        { properties: { title: "Forecasts" } },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  // Summary Dashboard
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Summary!A1:B20",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["EARNED VALUE MANAGEMENT DASHBOARD", ""],
        ["As of Date:", "=TODAY()"],
        ["", ""],
        ["BUDGET", ""],
        ["Budget at Completion (BAC)", "$1,410,000,000"],
        ["", ""],
        ["CURRENT PERIOD", ""],
        ["Planned Value (PV)", "=SUM('Monthly EVM Data'!B:B)"],
        ["Earned Value (EV)", "=SUM('Monthly EVM Data'!C:C)"],
        ["Actual Cost (AC)", "=SUM('Monthly EVM Data'!D:D)"],
        ["", ""],
        ["VARIANCES", ""],
        ["Cost Variance (CV)", "=B9-B10"],
        ["Schedule Variance (SV)", "=B9-B8"],
        ["", ""],
        ["PERFORMANCE INDICES", ""],
        ["Cost Performance Index (CPI)", "=B9/B10"],
        ["Schedule Performance Index (SPI)", "=B9/B8"],
        ["", ""],
        ["FORECASTS", ""],
      ],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Summary!A21:B30",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["Estimate at Completion (EAC)", "=B5/B17"],
        ["Estimate to Complete (ETC)", "=B21-B10"],
        ["Variance at Completion (VAC)", "=B5-B21"],
        ["To-Complete Performance Index (TCPI)", "=(B5-B9)/(B5-B10)"],
        ["", ""],
        ["STATUS INDICATORS", ""],
        ["CPI Status", "=IF(B17>=1,\"On Budget\",\"Over Budget\")"],
        ["SPI Status", "=IF(B18>=1,\"On Schedule\",\"Behind Schedule\")"],
        ["Overall Health", "=IF(AND(B17>=0.95,B18>=0.95),\"GREEN\",IF(OR(B17<0.9,B18<0.9),\"RED\",\"YELLOW\"))"],
      ],
    },
  });

  // Monthly EVM Data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Monthly EVM Data!A1:H1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [["Month", "PV ($)", "EV ($)", "AC ($)", "CV ($)", "SV ($)", "CPI", "SPI"]],
    },
  });

  // Formulas for monthly data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Monthly EVM Data!E2:E100",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 99 }, (_, i) => [`=C${i+2}-D${i+2}`]),
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Monthly EVM Data!F2:F100",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 99 }, (_, i) => [`=C${i+2}-B${i+2}`]),
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Monthly EVM Data!G2:G100",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 99 }, (_, i) => [`=IF(D${i+2}>0,C${i+2}/D${i+2},0)`]),
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Monthly EVM Data!H2:H100",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 99 }, (_, i) => [`=IF(B${i+2}>0,C${i+2}/B${i+2},0)`]),
    },
  });

  console.log(`✓ EVM Dashboard created: ${spreadsheet.data.spreadsheetUrl}`);
  return spreadsheetId;
}

// TEMPLATE 5: Change Log
async function createChangeLog(sheets: any) {
  console.log("Creating Change Log...");

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "Change Log - PMI",
      },
      sheets: [
        { properties: { title: "Change Requests", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Change Summary" } },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Change Requests!A1:R1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Change ID", "Date Submitted", "Requested By", "Change Description",
        "Reason/Justification", "Impact: Scope", "Impact: Schedule (Days)",
        "Impact: Budget ($)", "Impact: Risk", "Priority",
        "Status", "CCB Review Date", "Decision", "Approver",
        "Approval Date", "Implementation Date", "Actual Impact", "Notes"
      ]],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Change Summary!A1:B10",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["CHANGE CONTROL SUMMARY", ""],
        ["", ""],
        ["Total Changes Submitted", "=COUNTA('Change Requests'!A2:A1000)"],
        ["Approved", "=COUNTIF('Change Requests'!K2:K1000,\"Approved\")"],
        ["Rejected", "=COUNTIF('Change Requests'!K2:K1000,\"Rejected\")"],
        ["Pending", "=COUNTIF('Change Requests'!K2:K1000,\"Pending\")"],
        ["", ""],
        ["Total Schedule Impact (Days)", "=SUMIF('Change Requests'!K2:K1000,\"Approved\",'Change Requests'!G2:G1000)"],
        ["Total Budget Impact ($)", "=SUMIF('Change Requests'!K2:K1000,\"Approved\",'Change Requests'!H2:H1000)"],
      ],
    },
  });

  console.log(`✓ Change Log created: ${spreadsheet.data.spreadsheetUrl}`);
  return spreadsheetId;
}

// TEMPLATE 6: Issue Log
async function createIssueLog(sheets: any) {
  console.log("Creating Issue Log...");

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "Issue Log - PMI",
      },
      sheets: [
        { properties: { title: "Issues", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Issue Summary" } },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Issues!A1:N1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Issue ID", "Date Identified", "Identified By", "Issue Description",
        "Category", "Priority", "Impact", "Owner", "Status",
        "Resolution", "Date Resolved", "Days to Resolve", "Escalated?", "Notes"
      ]],
    },
  });

  // Formula for days to resolve
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Issues!L2:L1000",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: Array.from({ length: 999 }, (_, i) => [
        `=IF(K${i+2}<>"",K${i+2}-B${i+2},IF(I${i+2}="Open",TODAY()-B${i+2},""))`
      ]),
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Issue Summary!A1:B12",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["ISSUE SUMMARY", ""],
        ["", ""],
        ["Total Issues", "=COUNTA(Issues!A2:A1000)"],
        ["Open Issues", "=COUNTIF(Issues!I2:I1000,\"Open\")"],
        ["Resolved Issues", "=COUNTIF(Issues!I2:I1000,\"Resolved\")"],
        ["", ""],
        ["By Priority:", ""],
        ["Critical", "=COUNTIFS(Issues!F2:F1000,\"Critical\",Issues!I2:I1000,\"Open\")"],
        ["High", "=COUNTIFS(Issues!F2:F1000,\"High\",Issues!I2:I1000,\"Open\")"],
        ["Medium", "=COUNTIFS(Issues!F2:F1000,\"Medium\",Issues!I2:I1000,\"Open\")"],
        ["", ""],
        ["Avg Resolution Time (Days)", "=AVERAGE(Issues!L2:L1000)"],
      ],
    },
  });

  console.log(`✓ Issue Log created: ${spreadsheet.data.spreadsheetUrl}`);
  return spreadsheetId;
}

// TEMPLATE 7: Lessons Learned
async function createLessonsLearned(sheets: any) {
  console.log("Creating Lessons Learned Register...");

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "Lessons Learned - PMI",
      },
      sheets: [
        { properties: { title: "Lessons Learned", gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: "Categories" } },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Lessons Learned!A1:L1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "LL ID", "Date", "Phase/Stage", "Category", "What Happened",
        "What Worked Well", "What Didn't Work", "Root Cause",
        "Recommendation", "Applicable To", "Submitted By", "Status"
      ]],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Categories!A1:B10",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["LESSONS BY CATEGORY", "Count"],
        ["Technical", "=COUNTIF('Lessons Learned'!D2:D1000,\"Technical\")"],
        ["Management", "=COUNTIF('Lessons Learned'!D2:D1000,\"Management\")"],
        ["Procurement", "=COUNTIF('Lessons Learned'!D2:D1000,\"Procurement\")"],
        ["Stakeholder", "=COUNTIF('Lessons Learned'!D2:D1000,\"Stakeholder\")"],
        ["Financial", "=COUNTIF('Lessons Learned'!D2:D1000,\"Financial\")"],
        ["Quality", "=COUNTIF('Lessons Learned'!D2:D1000,\"Quality\")"],
        ["Communication", "=COUNTIF('Lessons Learned'!D2:D1000,\"Communication\")"],
        ["Other", "=COUNTIF('Lessons Learned'!D2:D1000,\"Other\")"],
      ],
    },
  });

  console.log(`✓ Lessons Learned created: ${spreadsheet.data.spreadsheetUrl}`);
  return spreadsheetId;
}

// TEMPLATE 8: Decision Log
async function createDecisionLog(sheets: any) {
  console.log("Creating Decision Log...");

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "Decision Log - PMI",
      },
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId!;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Sheet1!A1:M1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        "Decision ID", "Date", "Decision", "Options Considered",
        "Rationale", "Decision Maker", "Approver", "Impact: Scope",
        "Impact: Schedule", "Impact: Budget", "Implementation Date",
        "Status", "Notes"
      ]],
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: 0,
              title: "Decision Log",
            },
            fields: "title",
          },
        },
      ],
    },
  });

  console.log(`✓ Decision Log created: ${spreadsheet.data.spreadsheetUrl}`);
  return spreadsheetId;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("\n📋 PMI-Aligned Spreadsheet Templates");
    console.log("\nAvailable templates:");
    console.log("  stakeholders - Stakeholder register with power/interest matrix");
    console.log("  risks        - Risk register with P×I analysis");
    console.log("  wbs          - WBS & schedule with EVM");
    console.log("  evm          - Earned Value Management dashboard");
    console.log("  changes      - Change control log");
    console.log("  issues       - Issue tracking log");
    console.log("  lessons      - Lessons learned register");
    console.log("  decisions    - Decision log");
    console.log("  all          - Create all PMI templates");
    console.log("\nUsage: npm run create-pmi-sheets <template>");
    console.log("Example: npm run create-pmi-sheets risks");
    process.exit(0);
  }

  const templateType = args[0];
  
  const auth = await authorize();
  const sheets = google.sheets({ version: "v4", auth });

  console.log("\n🚀 Creating PMI template(s)...\n");

  const templates: { [key: string]: () => Promise<string> } = {
    stakeholders: () => createStakeholderRegister(sheets),
    risks: () => createRiskRegister(sheets),
    wbs: () => createWBSSchedule(sheets),
    evm: () => createEVMDashboard(sheets),
    changes: () => createChangeLog(sheets),
    issues: () => createIssueLog(sheets),
    lessons: () => createLessonsLearned(sheets),
    decisions: () => createDecisionLog(sheets),
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
    console.log("Available: stakeholders, risks, wbs, evm, changes, issues, lessons, decisions, all");
    process.exit(1);
  }

  console.log("\n✅ PMI template(s) created successfully!\n");
}

main().catch(console.error);
