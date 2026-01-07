/**
 * PMO Stakeholders Module
 * CRUD operations for project stakeholder register
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { StakeholderInfo } from "../types/pmo.js";

/**
 * Read stakeholders from PMO stakeholder register spreadsheet
 */
export async function readStakeholders(
  auth: OAuth2Client,
  spreadsheetId: string,
  options: {
    minInfluence?: number;
    minInterest?: number;
  } = {}
): Promise<StakeholderInfo[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const range = process.env.PMO_STAKEHOLDERS_RANGE || "Stakeholders!A2:G100";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values || [];
  const stakeholders: StakeholderInfo[] = [];

  for (const row of rows) {
    // Skip empty rows
    if (!row[0] || row[0].trim() === "") {
      continue;
    }

    const [id, name, role, email, influence, interest, engagement] = row;

    const influenceNum = influence ? parseInt(influence) : 3;
    const interestNum = interest ? parseInt(interest) : 3;

    // Apply filters
    if (options.minInfluence && influenceNum < options.minInfluence) {
      continue;
    }
    if (options.minInterest && interestNum < options.minInterest) {
      continue;
    }

    stakeholders.push({
      id,
      name: name || "",
      role: role || "",
      email: email || "",
      influence: influenceNum,
      interest: interestNum,
      engagement: engagement ? parseInt(engagement) : 3,
    });
  }

  return stakeholders;
}

/**
 * Get high-influence stakeholders (influence >= 4)
 */
export async function getKeyStakeholders(
  auth: OAuth2Client,
  spreadsheetId: string
): Promise<StakeholderInfo[]> {
  return readStakeholders(auth, spreadsheetId, {
    minInfluence: 4,
  });
}

/**
 * Get high-interest stakeholders (interest >= 4)
 */
export async function getEngagedStakeholders(
  auth: OAuth2Client,
  spreadsheetId: string
): Promise<StakeholderInfo[]> {
  return readStakeholders(auth, spreadsheetId, {
    minInterest: 4,
  });
}

/**
 * Get next sequential stakeholder ID
 */
export async function getNextStakeholderId(
  auth: OAuth2Client,
  spreadsheetId: string
): Promise<string> {
  const existing = await readStakeholders(auth, spreadsheetId);

  if (existing.length === 0) {
    return "G-01";
  }

  // Extract numeric IDs and find max
  const maxId = existing
    .map((s) => {
      const match = s.id.match(/G-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .reduce((max, n) => Math.max(max, n), 0);

  // Return next ID with zero-padding
  const nextNum = maxId + 1;
  return `G-${String(nextNum).padStart(2, "0")}`;
}

/**
 * Create a new stakeholder in the PMO stakeholder register
 */
export async function createStakeholder(
  auth: OAuth2Client,
  spreadsheetId: string,
  stakeholder: Omit<StakeholderInfo, "id">
): Promise<string> {
  const sheets = google.sheets({ version: "v4", auth });
  const nextId = await getNextStakeholderId(auth, spreadsheetId);

  const range = process.env.PMO_STAKEHOLDERS_RANGE || "Stakeholders!A2:G100";

  // Build row values
  const values = [[
    nextId,
    stakeholder.name,
    stakeholder.role,
    stakeholder.email,
    stakeholder.influence,
    stakeholder.interest,
    stakeholder.engagement,
  ]];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values,
    },
  });

  console.log(
    `Created stakeholder ${nextId}: ${stakeholder.name} (Influence: ${stakeholder.influence}, Interest: ${stakeholder.interest})`
  );

  return nextId;
}

/**
 * Batch create multiple stakeholders
 */
export async function batchCreateStakeholders(
  auth: OAuth2Client,
  spreadsheetId: string,
  stakeholders: Omit<StakeholderInfo, "id">[]
): Promise<string[]> {
  if (stakeholders.length === 0) {
    return [];
  }

  const sheets = google.sheets({ version: "v4", auth });
  const startId = await getNextStakeholderId(auth, spreadsheetId);
  const startNum = parseInt(startId.match(/G-(\d+)/)![1], 10);

  const range = process.env.PMO_STAKEHOLDERS_RANGE || "Stakeholders!A2:G100";

  // Build rows
  const ids: string[] = [];
  const values: any[][] = [];

  for (let i = 0; i < stakeholders.length; i++) {
    const stakeholder = stakeholders[i];
    const id = `G-${String(startNum + i).padStart(2, "0")}`;

    ids.push(id);

    values.push([
      id,
      stakeholder.name,
      stakeholder.role,
      stakeholder.email,
      stakeholder.influence,
      stakeholder.interest,
      stakeholder.engagement,
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

  console.log(`Batch created ${ids.length} stakeholders: ${ids.join(", ")}`);

  return ids;
}

/**
 * Update stakeholder engagement level
 */
export async function updateStakeholderEngagement(
  auth: OAuth2Client,
  spreadsheetId: string,
  stakeholderId: string,
  engagementLevel: number
): Promise<void> {
  const sheets = google.sheets({ version: "v4", auth });

  // Find row by stakeholder ID
  const range = process.env.PMO_STAKEHOLDERS_RANGE || "Stakeholders!A2:G100";
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values || [];
  let rowIndex = -1;

  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === stakeholderId) {
      rowIndex = i + 2; // +2 because A2 is first data row
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`Stakeholder ${stakeholderId} not found`);
  }

  // Update engagement column (G)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Stakeholders!G${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[engagementLevel]],
    },
  });
}
