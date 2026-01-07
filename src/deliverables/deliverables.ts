/**
 * Deliverable CRUD Operations
 *
 * Provides create, read, update, delete, and list operations for deliverables
 * Integrates with Google Sheets for persistent storage
 */

import type { sheets_v4 } from "googleapis";
import type {
  Deliverable,
  DeliverableStatus,
  DeliverableType,
  ReviewStatus,
  CreateDeliverableInput,
  UpdateDeliverableInput,
} from "../types/deliverable.js";
import {
  readSheetRange,
  writeSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "../utils/sheetHelpers.js";

/**
 * Column mapping for Deliverables sheet
 */
export const DELIVERABLE_COLUMNS = {
  deliverableId: "A",
  programId: "B",
  projectId: "C",
  workstreamId: "D",
  wbsCode: "E",
  name: "F",
  description: "G",
  type: "H",
  owner: "I",
  dueDate: "J",
  forecastDate: "K",
  actualDate: "L",
  variance: "M",
  status: "N",
  reviewStatus: "O",
  percentComplete: "P",
  qualityScore: "Q",
  acceptanceCriteria: "R",
  dependencies: "S",
  relatedDocuments: "T",
  relatedMilestones: "U",
  tags: "V",
  notes: "W",
  createdDate: "X",
  createdBy: "Y",
  modifiedDate: "Z",
  modifiedBy: "AA",
};

const DELIVERABLES_SHEET = "Deliverables";

/**
 * Parse a row from the sheet into a Deliverable object
 */
function parseDeliverableRow(row: any[]): Deliverable | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  return {
    deliverableId: row[0] || "",
    programId: row[1] || "",
    projectId: row[2] || undefined,
    workstreamId: row[3] || undefined,
    wbsCode: row[4] || undefined,
    name: row[5] || "",
    description: row[6] || "",
    type: (row[7] as DeliverableType) || "other",
    owner: row[8] || "",
    dueDate: row[9] ? new Date(row[9]) : new Date(),
    forecastDate: row[10] ? new Date(row[10]) : undefined,
    actualDate: row[11] ? new Date(row[11]) : undefined,
    variance: row[12] ? parseFloat(row[12]) : undefined,
    status: (row[13] as DeliverableStatus) || "not_started",
    reviewStatus: (row[14] as ReviewStatus) || "pending",
    percentComplete: row[15] ? parseFloat(row[15]) : 0,
    qualityScore: row[16] ? parseFloat(row[16]) : undefined,
    acceptanceCriteria: row[17] || "",
    dependencies: row[18] ? row[18].split(",").map((d: string) => d.trim()) : [],
    relatedDocuments: row[19] ? row[19].split(",").map((d: string) => d.trim()) : [],
    relatedMilestones: row[20] ? row[20].split(",").map((m: string) => m.trim()) : [],
    tags: row[21] ? row[21].split(",").map((t: string) => t.trim()) : [],
    notes: row[22] || "",
    createdDate: row[23] ? new Date(row[23]) : new Date(),
    createdBy: row[24] || "",
    modifiedDate: row[25] ? new Date(row[25]) : new Date(),
    modifiedBy: row[26] || "",
  };
}

/**
 * Convert a Deliverable object to a row array
 */
function deliverableToRow(deliverable: Deliverable): any[] {
  return [
    deliverable.deliverableId,
    deliverable.programId,
    deliverable.projectId || "",
    deliverable.workstreamId || "",
    deliverable.wbsCode || "",
    deliverable.name,
    deliverable.description,
    deliverable.type,
    deliverable.owner,
    deliverable.dueDate.toISOString().split("T")[0],
    deliverable.forecastDate
      ? deliverable.forecastDate.toISOString().split("T")[0]
      : "",
    deliverable.actualDate
      ? deliverable.actualDate.toISOString().split("T")[0]
      : "",
    deliverable.variance || "",
    deliverable.status,
    deliverable.reviewStatus,
    deliverable.percentComplete,
    deliverable.qualityScore || "",
    deliverable.acceptanceCriteria,
    deliverable.dependencies.join(", "),
    deliverable.relatedDocuments.join(", "),
    deliverable.relatedMilestones.join(", "),
    deliverable.tags.join(", "),
    deliverable.notes,
    deliverable.createdDate.toISOString(),
    deliverable.createdBy,
    deliverable.modifiedDate.toISOString(),
    deliverable.modifiedBy,
  ];
}

/**
 * Calculate variance in days
 */
function calculateVariance(
  dueDate: Date,
  actualDate?: Date,
  forecastDate?: Date
): number | undefined {
  if (actualDate) {
    return Math.floor(
      (actualDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  } else if (forecastDate) {
    return Math.floor(
      (forecastDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }
  return undefined;
}

/**
 * Create a new deliverable
 */
export async function createDeliverable(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: CreateDeliverableInput,
  createdBy: string
): Promise<Deliverable> {
  try {
    // Generate next deliverable ID
    const deliverableId = await generateNextId(
      sheets,
      spreadsheetId,
      DELIVERABLES_SHEET,
      "Deliverable ID",
      "D"
    );

    const now = new Date();

    const deliverable: Deliverable = {
      deliverableId,
      programId: input.programId,
      projectId: undefined,
      workstreamId: undefined,
      wbsCode: input.wbsCode,
      name: input.name,
      description: input.description,
      type: input.type,
      owner: input.owner,
      dueDate: input.dueDate,
      forecastDate: undefined,
      actualDate: undefined,
      variance: undefined,
      status: "not_started",
      reviewStatus: "pending",
      percentComplete: 0,
      qualityScore: undefined,
      acceptanceCriteria: input.acceptanceCriteria.join("\n"),
      dependencies: [],
      relatedDocuments: [],
      relatedMilestones: [],
      tags: [],
      notes: input.notes || "",
      createdDate: now,
      createdBy,
      modifiedDate: now,
      modifiedBy: createdBy,
    };

    // Append to sheet
    const row = deliverableToRow(deliverable);
    await appendRows(sheets, spreadsheetId, `${DELIVERABLES_SHEET}!A:AA`, [
      row,
    ]);

    return deliverable;
  } catch (error) {
    throw new Error(
      `Failed to create deliverable: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Read a deliverable by ID
 */
export async function readDeliverable(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  deliverableId: string
): Promise<Deliverable | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      DELIVERABLES_SHEET,
      "Deliverable ID",
      deliverableId
    );

    if (!result) {
      return null;
    }

    return parseDeliverableRow(result.rowData);
  } catch (error) {
    throw new Error(
      `Failed to read deliverable: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update a deliverable
 */
export async function updateDeliverable(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: UpdateDeliverableInput,
  modifiedBy: string
): Promise<Deliverable | null> {
  try {
    // First, read the existing deliverable
    const existing = await readDeliverable(
      sheets,
      spreadsheetId,
      input.deliverableId
    );

    if (!existing) {
      return null;
    }

    // Apply updates
    const updated: Deliverable = {
      ...existing,
      modifiedDate: new Date(),
      modifiedBy,
    };

    // Apply individual updates
    if (input.name !== undefined) updated.name = input.name;
    if (input.description !== undefined) updated.description = input.description;
    if (input.type !== undefined) updated.type = input.type;
    if (input.wbsCode !== undefined) updated.wbsCode = input.wbsCode;
    if (input.owner !== undefined) updated.owner = input.owner;
    if (input.dueDate !== undefined) updated.dueDate = input.dueDate;
    if (input.forecastDate !== undefined) updated.forecastDate = input.forecastDate;
    if (input.actualDate !== undefined) updated.actualDate = input.actualDate;
    if (input.status !== undefined) updated.status = input.status;
    if (input.reviewStatus !== undefined) updated.reviewStatus = input.reviewStatus;
    if (input.qualityScore !== undefined) updated.qualityScore = input.qualityScore;
    if (input.notes !== undefined) updated.notes = input.notes;
    if (input.acceptanceCriteria !== undefined) {
      updated.acceptanceCriteria = Array.isArray(input.acceptanceCriteria)
        ? input.acceptanceCriteria.join("\n")
        : input.acceptanceCriteria;
    }
    if (input.relatedDocuments !== undefined) {
      updated.relatedDocuments = input.relatedDocuments;
    }

    // Recalculate variance if dates changed
    if (input.actualDate || input.forecastDate || input.dueDate) {
      updated.variance = calculateVariance(
        updated.dueDate,
        updated.actualDate,
        updated.forecastDate
      );
    }

    // Build update map
    const updates: Record<string, any> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.type !== undefined) updates.type = input.type;
    if (input.wbsCode !== undefined) updates.wbsCode = input.wbsCode;
    if (input.owner !== undefined) updates.owner = input.owner;
    if (input.dueDate !== undefined)
      updates.dueDate = input.dueDate.toISOString().split("T")[0];
    if (input.forecastDate !== undefined)
      updates.forecastDate = input.forecastDate
        ? input.forecastDate.toISOString().split("T")[0]
        : "";
    if (input.actualDate !== undefined)
      updates.actualDate = input.actualDate
        ? input.actualDate.toISOString().split("T")[0]
        : "";
    if (updated.variance !== undefined) updates.variance = updated.variance;
    if (input.status !== undefined) updates.status = input.status;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.qualityScore !== undefined)
      updates.qualityScore = input.qualityScore;
    if (input.reviewStatus !== undefined)
      updates.reviewStatus = input.reviewStatus;
    if (input.acceptanceCriteria !== undefined)
      updates.acceptanceCriteria = Array.isArray(input.acceptanceCriteria)
        ? input.acceptanceCriteria.join("\n")
        : input.acceptanceCriteria;
    if (input.relatedDocuments !== undefined)
      updates.relatedDocuments = input.relatedDocuments.join(", ");
    if (input.notes !== undefined) updates.notes = input.notes;

    updates.modifiedDate = updated.modifiedDate.toISOString();
    updates.modifiedBy = modifiedBy;

    // Update the row
    await updateRow(
      sheets,
      spreadsheetId,
      DELIVERABLES_SHEET,
      "Deliverable ID",
      input.deliverableId,
      updates,
      DELIVERABLE_COLUMNS
    );

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to update deliverable: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List deliverables with optional filters
 */
export async function listDeliverables(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  filters?: {
    programId?: string;
    status?: DeliverableStatus;
    owner?: string;
    type?: DeliverableType;
  }
): Promise<Deliverable[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${DELIVERABLES_SHEET}!A:AA`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const deliverables: Deliverable[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const deliverable = parseDeliverableRow(data[i]);
      if (!deliverable) continue;

      // Apply filters
      if (filters) {
        if (filters.programId && deliverable.programId !== filters.programId) {
          continue;
        }
        if (filters.status && deliverable.status !== filters.status) {
          continue;
        }
        if (filters.owner && deliverable.owner !== filters.owner) {
          continue;
        }
        if (filters.type && deliverable.type !== filters.type) {
          continue;
        }
      }

      deliverables.push(deliverable);
    }

    return deliverables;
  } catch (error) {
    throw new Error(
      `Failed to list deliverables: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get overdue deliverables for a program
 */
export async function getOverdueDeliverables(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<Deliverable[]> {
  try {
    const deliverables = await listDeliverables(sheets, spreadsheetId, {
      programId,
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return deliverables.filter((d) => {
      // Not overdue if already completed
      if (d.status === "completed" || d.status === "approved") {
        return false;
      }

      // Check if due date is in the past
      const dueDate = new Date(d.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      return dueDate < now;
    });
  } catch (error) {
    throw new Error(
      `Failed to get overdue deliverables: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get at-risk deliverables (forecast date > due date)
 */
export async function getAtRiskDeliverables(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<Deliverable[]> {
  try {
    const deliverables = await listDeliverables(sheets, spreadsheetId, {
      programId,
    });

    return deliverables.filter((d) => {
      // Not at risk if already completed
      if (d.status === "completed" || d.status === "approved") {
        return false;
      }

      // Check if forecast is later than due date
      if (d.forecastDate) {
        return d.forecastDate > d.dueDate;
      }

      return false;
    });
  } catch (error) {
    throw new Error(
      `Failed to get at-risk deliverables: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get upcoming deliverables (due within next N days)
 */
export async function getUpcomingDeliverables(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  daysAhead: number = 30
): Promise<Deliverable[]> {
  try {
    const deliverables = await listDeliverables(sheets, spreadsheetId, {
      programId,
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return deliverables.filter((d) => {
      // Skip completed deliverables
      if (d.status === "completed" || d.status === "approved") {
        return false;
      }

      const dueDate = new Date(d.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      return dueDate >= now && dueDate <= futureDate;
    });
  } catch (error) {
    throw new Error(
      `Failed to get upcoming deliverables: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete a deliverable (soft delete by marking status)
 */
export async function deleteDeliverable(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  deliverableId: string,
  deletedBy: string
): Promise<boolean> {
  try {
    // Instead of actually deleting, we mark as rejected/cancelled
    // This preserves the audit trail
    const result = await updateDeliverable(
      sheets,
      spreadsheetId,
      {
        deliverableId,
        status: "rejected",
        notes: `Deleted by ${deletedBy} on ${new Date().toISOString()}`,
      },
      deletedBy
    );

    return result !== null;
  } catch (error) {
    throw new Error(
      `Failed to delete deliverable: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
