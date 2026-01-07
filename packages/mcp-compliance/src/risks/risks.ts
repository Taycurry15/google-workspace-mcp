/**
 * PMO Risks Module
 * Operations for project risk register
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { Risk, RiskStatus } from "@gw-mcp/shared-core";
import { getDefaultEventBus } from "@gw-mcp/shared-workflows";

/**
 * Read risks from PMO risk register spreadsheet
 */
export async function readRisks(
  auth: OAuth2Client,
  spreadsheetId: string,
  options: {
    statusFilter?: string;
    minScore?: number;
  } = {}
): Promise<Risk[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const range = process.env.PMO_RISKS_RANGE || "Risks!A2:J100";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values || [];
  const risks: Risk[] = [];

  for (const row of rows) {
    // Skip empty rows
    if (!row[0] || row[0].trim() === "") {
      continue;
    }

    const [
      id,
      name,
      category,
      probability,
      impact,
      score,
      status,
      response,
      owner,
      mitigation,
    ] = row;

    const riskScore = score ? parseFloat(score) : 0;

    // Apply filters
    if (
      options.statusFilter &&
      options.statusFilter !== "all" &&
      status !== options.statusFilter
    ) {
      continue;
    }
    if (options.minScore && riskScore < options.minScore) {
      continue;
    }

    const risk: Risk = {
      id,
      name: name || "",
      category: category || "Unknown",
      probability: probability ? parseInt(probability) : 1,
      impact: impact ? parseInt(impact) : 1,
      score: riskScore,
      status: (status as RiskStatus) || "active",
      response: response || "",
      owner: owner || "",
      mitigation: mitigation ? parseFloat(mitigation) : 0,
    };

    risks.push(risk);
  }

  // Sort by score descending (highest risk first)
  risks.sort((a, b) => b.score - a.score);

  return risks;
}

/**
 * Get critical risks (score > 15) that need immediate attention
 */
export async function getCriticalRisks(
  auth: OAuth2Client,
  spreadsheetId: string
): Promise<Risk[]> {
  return readRisks(auth, spreadsheetId, {
    statusFilter: "active",
    minScore: 16, // Critical threshold
  });
}

/**
 * Update risk mitigation progress
 */
export async function updateRiskMitigation(
  auth: OAuth2Client,
  spreadsheetId: string,
  riskId: string,
  mitigationPercent: number
): Promise<void> {
  const sheets = google.sheets({ version: "v4", auth });

  // Find row by risk ID
  const range = process.env.PMO_RISKS_RANGE || "Risks!A2:J100";
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values || [];
  let rowIndex = -1;

  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === riskId) {
      rowIndex = i + 2; // +2 because A2 is first data row
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`Risk ${riskId} not found`);
  }

  // Update mitigation column (J)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Risks!J${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[mitigationPercent]],
    },
  });
}

/**
 * Close a risk (mark as closed with 100% mitigation)
 */
export async function closeRisk(
  auth: OAuth2Client,
  spreadsheetId: string,
  riskId: string
): Promise<void> {
  const sheets = google.sheets({ version: "v4", auth });

  // Find row by risk ID
  const range = process.env.PMO_RISKS_RANGE || "Risks!A2:J100";
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values || [];
  let rowIndex = -1;

  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === riskId) {
      rowIndex = i + 2; // +2 because A2 is first data row
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`Risk ${riskId} not found`);
  }

  // Update status (G) and mitigation (J) columns
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        {
          range: `Risks!G${rowIndex}`,
          values: [["closed"]],
        },
        {
          range: `Risks!J${rowIndex}`,
          values: [[100]],
        },
      ],
    },
  });

  // Get risk details for event
  const risk = rows[rowIndex - 2];
  const eventBus = getDefaultEventBus();
  await eventBus.publish({
    eventType: "risk_closed",
    source: "pmo_risks",
    timestamp: new Date(),
    data: {
      riskId,
      name: risk[1],
      category: risk[2],
      owner: risk[8],
    },
  });
}

/**
 * Get next sequential risk ID
 */
export async function getNextRiskId(
  auth: OAuth2Client,
  spreadsheetId: string
): Promise<string> {
  const existing = await readRisks(auth, spreadsheetId);

  if (existing.length === 0) {
    return "R-01";
  }

  // Extract numeric IDs and find max
  const maxId = existing
    .map((r) => {
      const match = r.id.match(/R-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .reduce((max, n) => Math.max(max, n), 0);

  // Return next ID with zero-padding
  const nextNum = maxId + 1;
  return `R-${String(nextNum).padStart(2, "0")}`;
}

/**
 * Create a new risk in the PMO risk register
 */
export async function createRisk(
  auth: OAuth2Client,
  spreadsheetId: string,
  risk: Omit<Risk, "id" | "score">
): Promise<string> {
  const sheets = google.sheets({ version: "v4", auth });
  const nextId = await getNextRiskId(auth, spreadsheetId);

  // Calculate risk score (probability × impact)
  const score = risk.probability * risk.impact;

  const range = process.env.PMO_RISKS_RANGE || "Risks!A2:J100";

  // Build row values
  const values = [[
    nextId,
    risk.name,
    risk.category,
    risk.probability,
    risk.impact,
    score,
    risk.status,
    risk.response,
    risk.owner,
    risk.mitigation,
  ]];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values,
    },
  });

  console.log(`Created risk ${nextId}: ${risk.name} (score: ${score})`);

  // Emit event for high-severity risks (score >= 15)
  if (score >= 15) {
    const eventBus = getDefaultEventBus();
    await eventBus.publish({
      eventType: "risk_identified",
      source: "pmo_risks",
      timestamp: new Date(),
      data: {
        riskId: nextId,
        name: risk.name,
        category: risk.category,
        probability: risk.probability,
        impact: risk.impact,
        score,
        owner: risk.owner,
      },
    });
  }

  return nextId;
}

/**
 * Batch create multiple risks
 */
export async function batchCreateRisks(
  auth: OAuth2Client,
  spreadsheetId: string,
  risks: Omit<Risk, "id" | "score">[]
): Promise<string[]> {
  if (risks.length === 0) {
    return [];
  }

  const sheets = google.sheets({ version: "v4", auth });
  const startId = await getNextRiskId(auth, spreadsheetId);
  const startNum = parseInt(startId.match(/R-(\d+)/)![1], 10);

  const range = process.env.PMO_RISKS_RANGE || "Risks!A2:J100";

  // Build rows
  const ids: string[] = [];
  const values: any[][] = [];

  for (let i = 0; i < risks.length; i++) {
    const risk = risks[i];
    const id = `R-${String(startNum + i).padStart(2, "0")}`;
    const score = risk.probability * risk.impact;

    ids.push(id);

    values.push([
      id,
      risk.name,
      risk.category,
      risk.probability,
      risk.impact,
      score,
      risk.status,
      risk.response,
      risk.owner,
      risk.mitigation,
    ]);
  }

  // Batch append
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values,
    },
  });

  console.log(`Batch created ${ids.length} risks: ${ids.join(", ")}`);

  return ids;
}
