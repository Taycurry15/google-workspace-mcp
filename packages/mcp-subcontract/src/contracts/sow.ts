/**
 * SOW Deliverable Linking
 *
 * Provides operations for linking deliverables to contracts
 * Integrates with Google Sheets for persistent storage
 */

import type { sheets_v4 } from "googleapis";
import type { SOWDeliverable } from "../types/subcontract.js";
import { readContract, updateContract } from "./contracts.js";
import {
  readSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "@gw-mcp/shared-core";

/**
 * Column mapping for SOW Deliverables sheet
 */
export const SOW_DELIVERABLE_COLUMNS = {
  sowDeliverableId: "A",
  contractId: "B",
  deliverableId: "C",
  programId: "D",
  description: "E",
  dueDate: "F",
  acceptanceCriteria: "G",
  status: "H",
  submittedDate: "I",
  acceptedDate: "J",
  qualityScore: "K",
  reviewNotes: "L",
};

const SOW_DELIVERABLES_SHEET = "SOW Deliverables";

/**
 * Parse a row from the sheet into a SOWDeliverable object
 */
function parseSOWDeliverableRow(row: any[]): SOWDeliverable | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  return {
    sowDeliverableId: row[0] || "",
    contractId: row[1] || "",
    deliverableId: row[2] || "",
    programId: row[3] || "",
    description: row[4] || "",
    dueDate: row[5] ? new Date(row[5]) : new Date(),
    acceptanceCriteria: row[6] || "",
    status: (row[7] as SOWDeliverable["status"]) || "pending",
    submittedDate: row[8] ? new Date(row[8]) : undefined,
    acceptedDate: row[9] ? new Date(row[9]) : undefined,
    qualityScore: row[10] ? parseFloat(row[10]) : undefined,
    reviewNotes: row[11] || undefined,
  };
}

/**
 * Convert a SOWDeliverable object to a row array
 */
function sowDeliverableToRow(sowDeliverable: SOWDeliverable): any[] {
  return [
    sowDeliverable.sowDeliverableId,
    sowDeliverable.contractId,
    sowDeliverable.deliverableId,
    sowDeliverable.programId,
    sowDeliverable.description,
    sowDeliverable.dueDate.toISOString().split("T")[0],
    sowDeliverable.acceptanceCriteria,
    sowDeliverable.status,
    sowDeliverable.submittedDate
      ? sowDeliverable.submittedDate.toISOString().split("T")[0]
      : "",
    sowDeliverable.acceptedDate
      ? sowDeliverable.acceptedDate.toISOString().split("T")[0]
      : "",
    sowDeliverable.qualityScore || "",
    sowDeliverable.reviewNotes || "",
  ];
}

/**
 * Link a deliverable to a contract
 */
export async function linkDeliverableToContract(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  contractId: string,
  deliverableId: string,
  programId: string,
  description: string,
  dueDate: Date,
  acceptanceCriteria: string
): Promise<SOWDeliverable> {
  try {
    // Verify contract exists
    const contract = await readContract(sheets, spreadsheetId, contractId);
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }

    // Generate next SOW deliverable ID
    const sowDeliverableId = await generateNextId(
      sheets,
      spreadsheetId,
      SOW_DELIVERABLES_SHEET,
      "SOW Deliverable ID",
      "SOW"
    );

    const sowDeliverable: SOWDeliverable = {
      sowDeliverableId,
      contractId,
      deliverableId,
      programId,
      description,
      dueDate,
      acceptanceCriteria,
      status: "pending",
    };

    // Append to sheet
    const row = sowDeliverableToRow(sowDeliverable);
    await appendRows(sheets, spreadsheetId, `${SOW_DELIVERABLES_SHEET}!A:L`, [
      row,
    ]);

    // Update contract deliverables list
    const updatedDeliverables = [...contract.deliverables, deliverableId];
    await updateContract(
      sheets,
      spreadsheetId,
      {
        contractId,
        deliverables: updatedDeliverables,
      },
      "system"
    );

    return sowDeliverable;
  } catch (error) {
    throw new Error(
      `Failed to link deliverable to contract: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Unlink a deliverable from a contract
 */
export async function unlinkDeliverable(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sowDeliverableId: string
): Promise<boolean> {
  try {
    // Find the SOW deliverable
    const result = await findRowById(
      sheets,
      spreadsheetId,
      SOW_DELIVERABLES_SHEET,
      "SOW Deliverable ID",
      sowDeliverableId
    );

    if (!result) {
      return false;
    }

    const sowDeliverable = parseSOWDeliverableRow(result.rowData);
    if (!sowDeliverable) {
      return false;
    }

    // Update the contract to remove this deliverable
    const contract = await readContract(
      sheets,
      spreadsheetId,
      sowDeliverable.contractId
    );
    if (contract) {
      const updatedDeliverables = contract.deliverables.filter(
        (d) => d !== sowDeliverable.deliverableId
      );
      await updateContract(
        sheets,
        spreadsheetId,
        {
          contractId: sowDeliverable.contractId,
          deliverables: updatedDeliverables,
        },
        "system"
      );
    }

    // Mark the SOW deliverable as deleted (soft delete)
    await updateRow(
      sheets,
      spreadsheetId,
      SOW_DELIVERABLES_SHEET,
      "SOW Deliverable ID",
      sowDeliverableId,
      {
        status: "rejected",
        reviewNotes: `Unlinked on ${new Date().toISOString()}`,
      },
      SOW_DELIVERABLE_COLUMNS
    );

    return true;
  } catch (error) {
    throw new Error(
      `Failed to unlink deliverable: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get all deliverables for a contract
 */
export async function getContractDeliverables(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  contractId: string
): Promise<SOWDeliverable[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${SOW_DELIVERABLES_SHEET}!A:L`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const deliverables: SOWDeliverable[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const deliverable = parseSOWDeliverableRow(data[i]);
      if (!deliverable) continue;

      if (
        deliverable.contractId === contractId &&
        deliverable.status !== "rejected"
      ) {
        deliverables.push(deliverable);
      }
    }

    return deliverables;
  } catch (error) {
    throw new Error(
      `Failed to get contract deliverables: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update SOW deliverable status
 */
export async function updateSOWDeliverable(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sowDeliverableId: string,
  status: SOWDeliverable["status"],
  qualityScore?: number,
  reviewNotes?: string
): Promise<SOWDeliverable | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      SOW_DELIVERABLES_SHEET,
      "SOW Deliverable ID",
      sowDeliverableId
    );

    if (!result) {
      return null;
    }

    const existing = parseSOWDeliverableRow(result.rowData);
    if (!existing) {
      return null;
    }

    const updates: Record<string, any> = {
      status,
    };

    const now = new Date();

    if (status === "submitted") {
      updates.submittedDate = now.toISOString().split("T")[0];
    } else if (status === "accepted") {
      updates.acceptedDate = now.toISOString().split("T")[0];
    }

    if (qualityScore !== undefined) {
      updates.qualityScore = qualityScore;
    }

    if (reviewNotes !== undefined) {
      updates.reviewNotes = reviewNotes;
    }

    await updateRow(
      sheets,
      spreadsheetId,
      SOW_DELIVERABLES_SHEET,
      "SOW Deliverable ID",
      sowDeliverableId,
      updates,
      SOW_DELIVERABLE_COLUMNS
    );

    return {
      ...existing,
      status,
      submittedDate:
        status === "submitted" ? now : existing.submittedDate,
      acceptedDate: status === "accepted" ? now : existing.acceptedDate,
      qualityScore: qualityScore !== undefined ? qualityScore : existing.qualityScore,
      reviewNotes: reviewNotes !== undefined ? reviewNotes : existing.reviewNotes,
    };
  } catch (error) {
    throw new Error(
      `Failed to update SOW deliverable: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
