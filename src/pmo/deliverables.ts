/**
 * PMO Deliverables Module
 * CRUD operations for project deliverables
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import {
  Deliverable,
  DeliverableStatus,
  DeliverablePriority,
} from "../types/pmo.js";
import { ActionabilityLevel } from "../types/para.js";
import { getDefaultEventBus } from "@gw-mcp/shared-workflows";

/**
 * Read deliverables from PMO tracking spreadsheet
 */
export async function readDeliverables(
  auth: OAuth2Client,
  spreadsheetId: string,
  options: {
    statusFilter?: string;
    priorityFilter?: string;
  } = {}
): Promise<Deliverable[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const range = process.env.PMO_DELIVERABLES_RANGE || "Deliverables!A2:J100";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values || [];
  const deliverables: Deliverable[] = [];

  for (const row of rows) {
    // Skip empty rows
    if (!row[0] || row[0].trim() === "") {
      continue;
    }

    const [
      id,
      name,
      wbs,
      week,
      status,
      quality,
      budget,
      responsible,
      accountable,
      priority,
    ] = row;

    // Apply filters
    if (
      options.statusFilter &&
      options.statusFilter !== "all" &&
      status !== options.statusFilter
    ) {
      continue;
    }
    if (options.priorityFilter && priority !== options.priorityFilter) {
      continue;
    }

    deliverables.push({
      id,
      name: name || "",
      wbs: wbs || "",
      week: week ? parseInt(week) : 0,
      status: (status as DeliverableStatus) || "not-started",
      quality: quality ? parseFloat(quality) : 0,
      budget: budget ? parseFloat(budget) : 0,
      responsible: responsible || "",
      accountable: accountable || "",
      priority: (priority as DeliverablePriority) || "medium",
      // PARA integration
      para_category: "PROJECT",
      para_actionability: priorityToActionability(priority),
      para_tags: wbsToTags(wbs),
    });
  }

  return deliverables;
}

/**
 * Update a deliverable in the PMO tracking spreadsheet
 */
export async function updateDeliverable(
  auth: OAuth2Client,
  spreadsheetId: string,
  deliverableId: string,
  updates: {
    status?: DeliverableStatus;
    qualityScore?: number;
    actualHours?: number;
    notes?: string;
  }
): Promise<void> {
  const sheets = google.sheets({ version: "v4", auth });

  // Find row by deliverable ID
  const range = process.env.PMO_DELIVERABLES_RANGE || "Deliverables!A2:J100";
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = response.data.values || [];
  let rowIndex = -1;

  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === deliverableId) {
      rowIndex = i + 2; // +2 because A2 is first data row
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`Deliverable ${deliverableId} not found`);
  }

  // Update specific cells
  if (updates.status) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Deliverables!E${rowIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[updates.status]],
      },
    });
  }

  if (updates.qualityScore !== undefined) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Deliverables!F${rowIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[updates.qualityScore]],
      },
    });
  }

  // Emit events based on status updates
  const eventBus = getDefaultEventBus();

  if (updates.status === "complete") {
    // Read deliverable details for event payload
    const deliverables = await readDeliverables(auth, spreadsheetId);
    const deliverable = deliverables.find((d) => d.id === deliverableId);

    if (deliverable) {
      await eventBus.publish({
        eventType: "deliverable_completed",
        source: "pmo_deliverables",
        timestamp: new Date(),
        data: {
          deliverableId,
          name: deliverable.name,
          wbs: deliverable.wbs,
          responsible: deliverable.responsible,
          qualityScore: updates.qualityScore,
        },
      });
    }
  }

  // Emit event if deliverable quality is poor (score < 50)
  if (updates.qualityScore !== undefined && updates.qualityScore < 50) {
    const deliverables = await readDeliverables(auth, spreadsheetId);
    const deliverable = deliverables.find((d) => d.id === deliverableId);

    if (deliverable) {
      await eventBus.publish({
        eventType: "deliverable_quality_issue",
        source: "pmo_deliverables",
        timestamp: new Date(),
        data: {
          deliverableId,
          name: deliverable.name,
          responsible: deliverable.responsible,
          qualityScore: updates.qualityScore,
          notes: updates.notes,
        },
      });
    }
  }
}

/**
 * Convert PMO priority to PARA actionability level
 */
export function priorityToActionability(
  priority: string
): ActionabilityLevel {
  if (!priority) return "medium";

  switch (priority.toLowerCase()) {
    case "critical":
      return "high";
    case "high":
    case "medium":
      return "medium";
    case "low":
      return "low";
    default:
      return "medium";
  }
}

/**
 * Convert WBS code to PARA tags
 * Example: "1.2.3" → ["phase-1", "workstream-2", "task-3"]
 */
export function wbsToTags(wbs: string): string[] {
  if (!wbs) return [];

  const parts = wbs.split(".");
  const tags: string[] = [];

  if (parts[0]) tags.push(`phase-${parts[0]}`);
  if (parts[1]) tags.push(`workstream-${parts[1]}`);
  if (parts[2]) tags.push(`task-${parts[2]}`);

  return tags;
}

/**
 * Get next sequential deliverable ID
 */
export async function getNextDeliverableId(
  auth: OAuth2Client,
  spreadsheetId: string
): Promise<string> {
  const existing = await readDeliverables(auth, spreadsheetId);

  if (existing.length === 0) {
    return "D-01";
  }

  // Extract numeric IDs and find max
  const maxId = existing
    .map((d) => {
      const match = d.id.match(/D-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .reduce((max, n) => Math.max(max, n), 0);

  // Return next ID with zero-padding
  const nextNum = maxId + 1;
  return `D-${String(nextNum).padStart(2, "0")}`;
}

/**
 * Create a new deliverable in the PMO spreadsheet
 */
export async function createDeliverable(
  auth: OAuth2Client,
  spreadsheetId: string,
  deliverable: Omit<Deliverable, "id" | "para_category" | "para_actionability" | "para_tags">
): Promise<string> {
  const sheets = google.sheets({ version: "v4", auth });
  const nextId = await getNextDeliverableId(auth, spreadsheetId);

  const range = process.env.PMO_DELIVERABLES_RANGE || "Deliverables!A2:J100";

  // Build row values
  const values = [[
    nextId,
    deliverable.name,
    deliverable.wbs,
    deliverable.week,
    deliverable.status,
    deliverable.quality,
    deliverable.budget,
    deliverable.responsible,
    deliverable.accountable,
    deliverable.priority,
  ]];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values,
    },
  });

  console.log(`Created deliverable ${nextId}: ${deliverable.name}`);

  return nextId;
}

/**
 * Batch create multiple deliverables
 */
export async function batchCreateDeliverables(
  auth: OAuth2Client,
  spreadsheetId: string,
  deliverables: Omit<Deliverable, "id" | "para_category" | "para_actionability" | "para_tags">[]
): Promise<string[]> {
  if (deliverables.length === 0) {
    return [];
  }

  const sheets = google.sheets({ version: "v4", auth });
  const startId = await getNextDeliverableId(auth, spreadsheetId);
  const startNum = parseInt(startId.match(/D-(\d+)/)![1], 10);

  const range = process.env.PMO_DELIVERABLES_RANGE || "Deliverables!A2:J100";

  // Build rows
  const ids: string[] = [];
  const values: any[][] = [];

  for (let i = 0; i < deliverables.length; i++) {
    const deliverable = deliverables[i];
    const id = `D-${String(startNum + i).padStart(2, "0")}`;
    ids.push(id);

    values.push([
      id,
      deliverable.name,
      deliverable.wbs,
      deliverable.week,
      deliverable.status,
      deliverable.quality,
      deliverable.budget,
      deliverable.responsible,
      deliverable.accountable,
      deliverable.priority,
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

  console.log(`Batch created ${ids.length} deliverables: ${ids.join(", ")}`);

  return ids;
}
