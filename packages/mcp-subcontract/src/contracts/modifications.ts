/**
 * Contract Modifications
 *
 * Provides operations for managing contract modifications
 * Integrates with Google Sheets for persistent storage
 */

import type { sheets_v4 } from "googleapis";
import type { ContractModification } from "../types/subcontract.js";
import { readContract, updateContract } from "./contracts.js";
import {
  readSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "@gw-mcp/shared-core";

/**
 * Column mapping for Contract Modifications sheet
 */
export const MODIFICATION_COLUMNS = {
  modificationId: "A",
  contractId: "B",
  modificationNumber: "C",
  title: "D",
  description: "E",
  reason: "F",
  valueChange: "G",
  newTotalValue: "H",
  oldEndDate: "I",
  newEndDate: "J",
  requestedBy: "K",
  requestedDate: "L",
  approvedBy: "M",
  approvedDate: "N",
  status: "O",
  effectiveDate: "P",
  documentUrl: "Q",
};

const MODIFICATIONS_SHEET = "Contract Modifications";

/**
 * Parse a row from the sheet into a ContractModification object
 */
function parseModificationRow(row: any[]): ContractModification | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  return {
    modificationId: row[0] || "",
    contractId: row[1] || "",
    modificationNumber: row[2] ? parseInt(row[2], 10) : 1,
    title: row[3] || "",
    description: row[4] || "",
    reason: row[5] || "",
    valueChange: row[6] ? parseFloat(row[6]) : 0,
    newTotalValue: row[7] ? parseFloat(row[7]) : 0,
    dateChange:
      row[8] && row[9]
        ? {
            oldEndDate: new Date(row[8]),
            newEndDate: new Date(row[9]),
          }
        : undefined,
    requestedBy: row[10] || "",
    requestedDate: row[11] ? new Date(row[11]) : new Date(),
    approvedBy: row[12] || undefined,
    approvedDate: row[13] ? new Date(row[13]) : undefined,
    status: (row[14] as ContractModification["status"]) || "pending",
    effectiveDate: row[15] ? new Date(row[15]) : undefined,
    documentUrl: row[16] || undefined,
  };
}

/**
 * Convert a ContractModification object to a row array
 */
function modificationToRow(modification: ContractModification): any[] {
  return [
    modification.modificationId,
    modification.contractId,
    modification.modificationNumber,
    modification.title,
    modification.description,
    modification.reason,
    modification.valueChange,
    modification.newTotalValue,
    modification.dateChange
      ? modification.dateChange.oldEndDate.toISOString().split("T")[0]
      : "",
    modification.dateChange
      ? modification.dateChange.newEndDate.toISOString().split("T")[0]
      : "",
    modification.requestedBy,
    modification.requestedDate.toISOString(),
    modification.approvedBy || "",
    modification.approvedDate
      ? modification.approvedDate.toISOString()
      : "",
    modification.status,
    modification.effectiveDate
      ? modification.effectiveDate.toISOString().split("T")[0]
      : "",
    modification.documentUrl || "",
  ];
}

/**
 * Create modification input
 */
export interface CreateModificationInput {
  contractId: string;
  title: string;
  description: string;
  reason: string;
  valueChange?: number;
  dateChange?: {
    newEndDate: Date;
  };
  documentUrl?: string;
}

/**
 * Create a new contract modification
 */
export async function createModification(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: CreateModificationInput,
  requestedBy: string
): Promise<ContractModification> {
  try {
    // Verify contract exists
    const contract = await readContract(sheets, spreadsheetId, input.contractId);
    if (!contract) {
      throw new Error(`Contract ${input.contractId} not found`);
    }

    // Generate next modification ID
    const modificationId = await generateNextId(
      sheets,
      spreadsheetId,
      MODIFICATIONS_SHEET,
      "Modification ID",
      "MOD"
    );

    // Get the next modification number for this contract
    const existingModifications = await listModifications(
      sheets,
      spreadsheetId,
      input.contractId
    );
    const modificationNumber = existingModifications.length + 1;

    // Calculate new total value
    const valueChange = input.valueChange || 0;
    const newTotalValue = contract.totalValue + valueChange;

    const now = new Date();

    const modification: ContractModification = {
      modificationId,
      contractId: input.contractId,
      modificationNumber,
      title: input.title,
      description: input.description,
      reason: input.reason,
      valueChange,
      newTotalValue,
      dateChange: input.dateChange
        ? {
            oldEndDate: contract.endDate,
            newEndDate: input.dateChange.newEndDate,
          }
        : undefined,
      requestedBy,
      requestedDate: now,
      status: "pending",
      documentUrl: input.documentUrl,
    };

    // Append to sheet
    const row = modificationToRow(modification);
    await appendRows(sheets, spreadsheetId, `${MODIFICATIONS_SHEET}!A:Q`, [
      row,
    ]);

    return modification;
  } catch (error) {
    throw new Error(
      `Failed to create modification: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List modifications for a contract
 */
export async function listModifications(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  contractId: string
): Promise<ContractModification[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${MODIFICATIONS_SHEET}!A:Q`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const modifications: ContractModification[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const modification = parseModificationRow(data[i]);
      if (!modification) continue;

      if (modification.contractId === contractId) {
        modifications.push(modification);
      }
    }

    // Sort by modification number
    modifications.sort((a, b) => a.modificationNumber - b.modificationNumber);

    return modifications;
  } catch (error) {
    throw new Error(
      `Failed to list modifications: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Approve a modification
 */
export async function approveModification(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  modificationId: string,
  approvedBy: string,
  effectiveDate?: Date
): Promise<ContractModification | null> {
  try {
    // Find the modification
    const result = await findRowById(
      sheets,
      spreadsheetId,
      MODIFICATIONS_SHEET,
      "Modification ID",
      modificationId
    );

    if (!result) {
      return null;
    }

    const modification = parseModificationRow(result.rowData);
    if (!modification) {
      return null;
    }

    if (modification.status !== "pending") {
      throw new Error(
        `Modification ${modificationId} is not pending (status: ${modification.status})`
      );
    }

    const now = new Date();
    const effective = effectiveDate || now;

    // Update modification status
    const updates: Record<string, any> = {
      status: "approved",
      approvedBy,
      approvedDate: now.toISOString(),
      effectiveDate: effective.toISOString().split("T")[0],
    };

    await updateRow(
      sheets,
      spreadsheetId,
      MODIFICATIONS_SHEET,
      "Modification ID",
      modificationId,
      updates,
      MODIFICATION_COLUMNS
    );

    // Apply changes to the contract
    const contract = await readContract(
      sheets,
      spreadsheetId,
      modification.contractId
    );

    if (contract) {
      const contractUpdates: any = {
        contractId: modification.contractId,
        totalValue: modification.newTotalValue,
      };

      if (modification.dateChange) {
        contractUpdates.endDate = modification.dateChange.newEndDate;
      }

      await updateContract(
        sheets,
        spreadsheetId,
        contractUpdates,
        approvedBy
      );
    }

    return {
      ...modification,
      status: "approved",
      approvedBy,
      approvedDate: now,
      effectiveDate: effective,
    };
  } catch (error) {
    throw new Error(
      `Failed to approve modification: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Reject a modification
 */
export async function rejectModification(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  modificationId: string,
  rejectedBy: string
): Promise<ContractModification | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      MODIFICATIONS_SHEET,
      "Modification ID",
      modificationId
    );

    if (!result) {
      return null;
    }

    const modification = parseModificationRow(result.rowData);
    if (!modification) {
      return null;
    }

    if (modification.status !== "pending") {
      throw new Error(
        `Modification ${modificationId} is not pending (status: ${modification.status})`
      );
    }

    const now = new Date();

    // Update modification status
    const updates: Record<string, any> = {
      status: "rejected",
      approvedBy: rejectedBy,
      approvedDate: now.toISOString(),
    };

    await updateRow(
      sheets,
      spreadsheetId,
      MODIFICATIONS_SHEET,
      "Modification ID",
      modificationId,
      updates,
      MODIFICATION_COLUMNS
    );

    return {
      ...modification,
      status: "rejected",
      approvedBy: rejectedBy,
      approvedDate: now,
    };
  } catch (error) {
    throw new Error(
      `Failed to reject modification: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
