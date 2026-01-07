/**
 * Contract CRUD Operations
 *
 * Provides create, read, update, delete, and list operations for contracts
 * Integrates with Google Sheets for persistent storage
 */

import type { sheets_v4 } from "googleapis";
import type {
  Contract,
  ContractStatus,
  ContractType,
} from "../types/subcontract.js";
import {
  readSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "@gw-mcp/shared-core";

/**
 * Column mapping for Contracts sheet
 */
export const CONTRACT_COLUMNS = {
  contractId: "A",
  contractNumber: "B",
  vendorId: "C",
  programId: "D",
  title: "E",
  description: "F",
  type: "G",
  status: "H",
  totalValue: "I",
  currency: "J",
  fundingSource: "K",
  startDate: "L",
  endDate: "M",
  signedDate: "N",
  contractManager: "O",
  vendorSignatory: "P",
  clientSignatory: "Q",
  paymentTerms: "R",
  deliveryTerms: "S",
  penaltyClause: "T",
  performanceBond: "U",
  bondAmount: "V",
  warrantyPeriod: "W",
  scopeOfWork: "X",
  deliverables: "Y",
  fcpaReviewRequired: "Z",
  fcpaReviewCompleted: "AA",
  createdDate: "AB",
  createdBy: "AC",
  lastModified: "AD",
  documentUrl: "AE",
  notes: "AF",
};

const CONTRACTS_SHEET = "Contracts";

/**
 * Parse a row from the sheet into a Contract object
 */
function parseContractRow(row: any[]): Contract | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  return {
    contractId: row[0] || "",
    contractNumber: row[1] || "",
    vendorId: row[2] || "",
    programId: row[3] || "",
    title: row[4] || "",
    description: row[5] || "",
    type: (row[6] as ContractType) || "other",
    status: (row[7] as ContractStatus) || "draft",
    totalValue: row[8] ? parseFloat(row[8]) : 0,
    currency: row[9] || "USD",
    fundingSource: row[10] || "",
    startDate: row[11] ? new Date(row[11]) : new Date(),
    endDate: row[12] ? new Date(row[12]) : new Date(),
    signedDate: row[13] ? new Date(row[13]) : undefined,
    contractManager: row[14] || "",
    vendorSignatory: row[15] || "",
    clientSignatory: row[16] || "",
    paymentTerms: row[17] || "",
    deliveryTerms: row[18] || "",
    penaltyClause: row[19] || undefined,
    performanceBond: row[20] === "TRUE" || row[20] === true,
    bondAmount: row[21] ? parseFloat(row[21]) : undefined,
    warrantyPeriod: row[22] ? parseInt(row[22], 10) : undefined,
    scopeOfWork: row[23] || "",
    deliverables: row[24]
      ? row[24].split(",").map((d: string) => d.trim())
      : [],
    fcpaReviewRequired: row[25] === "TRUE" || row[25] === true,
    fcpaReviewCompleted: row[26] === "TRUE" || row[26] === true,
    createdDate: row[27] ? new Date(row[27]) : new Date(),
    createdBy: row[28] || "",
    lastModified: row[29] ? new Date(row[29]) : new Date(),
    documentUrl: row[30] || undefined,
    notes: row[31] || undefined,
  };
}

/**
 * Convert a Contract object to a row array
 */
function contractToRow(contract: Contract): any[] {
  return [
    contract.contractId,
    contract.contractNumber,
    contract.vendorId,
    contract.programId,
    contract.title,
    contract.description,
    contract.type,
    contract.status,
    contract.totalValue,
    contract.currency,
    contract.fundingSource,
    contract.startDate.toISOString().split("T")[0],
    contract.endDate.toISOString().split("T")[0],
    contract.signedDate
      ? contract.signedDate.toISOString().split("T")[0]
      : "",
    contract.contractManager,
    contract.vendorSignatory,
    contract.clientSignatory,
    contract.paymentTerms,
    contract.deliveryTerms,
    contract.penaltyClause || "",
    contract.performanceBond,
    contract.bondAmount || "",
    contract.warrantyPeriod || "",
    contract.scopeOfWork,
    contract.deliverables.join(", "),
    contract.fcpaReviewRequired,
    contract.fcpaReviewCompleted,
    contract.createdDate.toISOString(),
    contract.createdBy,
    contract.lastModified.toISOString(),
    contract.documentUrl || "",
    contract.notes || "",
  ];
}

/**
 * Create contract input
 */
export interface CreateContractInput {
  contractNumber: string;
  vendorId: string;
  programId: string;
  title: string;
  description: string;
  type: ContractType;
  totalValue: number;
  currency?: string;
  fundingSource: string;
  startDate: Date;
  endDate: Date;
  contractManager: string;
  vendorSignatory: string;
  clientSignatory: string;
  paymentTerms: string;
  deliveryTerms: string;
  penaltyClause?: string;
  performanceBond?: boolean;
  bondAmount?: number;
  warrantyPeriod?: number;
  scopeOfWork: string;
  fcpaReviewRequired?: boolean;
  documentUrl?: string;
  notes?: string;
}

/**
 * Update contract input
 */
export interface UpdateContractInput {
  contractId: string;
  contractNumber?: string;
  title?: string;
  description?: string;
  type?: ContractType;
  status?: ContractStatus;
  totalValue?: number;
  currency?: string;
  fundingSource?: string;
  startDate?: Date;
  endDate?: Date;
  signedDate?: Date;
  contractManager?: string;
  vendorSignatory?: string;
  clientSignatory?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  penaltyClause?: string;
  performanceBond?: boolean;
  bondAmount?: number;
  warrantyPeriod?: number;
  scopeOfWork?: string;
  deliverables?: string[];
  fcpaReviewRequired?: boolean;
  fcpaReviewCompleted?: boolean;
  documentUrl?: string;
  notes?: string;
}

/**
 * Create a new contract
 */
export async function createContract(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: CreateContractInput,
  createdBy: string
): Promise<Contract> {
  try {
    // Generate next contract ID
    const contractId = await generateNextId(
      sheets,
      spreadsheetId,
      CONTRACTS_SHEET,
      "Contract ID",
      "CONT"
    );

    const now = new Date();

    const contract: Contract = {
      contractId,
      contractNumber: input.contractNumber,
      vendorId: input.vendorId,
      programId: input.programId,
      title: input.title,
      description: input.description,
      type: input.type,
      status: "draft",
      totalValue: input.totalValue,
      currency: input.currency || "USD",
      fundingSource: input.fundingSource,
      startDate: input.startDate,
      endDate: input.endDate,
      contractManager: input.contractManager,
      vendorSignatory: input.vendorSignatory,
      clientSignatory: input.clientSignatory,
      paymentTerms: input.paymentTerms,
      deliveryTerms: input.deliveryTerms,
      penaltyClause: input.penaltyClause,
      performanceBond: input.performanceBond || false,
      bondAmount: input.bondAmount,
      warrantyPeriod: input.warrantyPeriod,
      scopeOfWork: input.scopeOfWork,
      deliverables: [],
      fcpaReviewRequired: input.fcpaReviewRequired || false,
      fcpaReviewCompleted: false,
      createdDate: now,
      createdBy,
      lastModified: now,
      documentUrl: input.documentUrl,
      notes: input.notes,
    };

    // Append to sheet
    const row = contractToRow(contract);
    await appendRows(sheets, spreadsheetId, `${CONTRACTS_SHEET}!A:AF`, [row]);

    return contract;
  } catch (error) {
    throw new Error(
      `Failed to create contract: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Read a contract by ID
 */
export async function readContract(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  contractId: string
): Promise<Contract | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      CONTRACTS_SHEET,
      "Contract ID",
      contractId
    );

    if (!result) {
      return null;
    }

    return parseContractRow(result.rowData);
  } catch (error) {
    throw new Error(
      `Failed to read contract: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update a contract
 */
export async function updateContract(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: UpdateContractInput,
  modifiedBy: string
): Promise<Contract | null> {
  try {
    // First, read the existing contract
    const existing = await readContract(sheets, spreadsheetId, input.contractId);

    if (!existing) {
      return null;
    }

    // Apply updates
    const updated: Contract = {
      ...existing,
      lastModified: new Date(),
    };

    if (input.contractNumber !== undefined)
      updated.contractNumber = input.contractNumber;
    if (input.title !== undefined) updated.title = input.title;
    if (input.description !== undefined)
      updated.description = input.description;
    if (input.type !== undefined) updated.type = input.type;
    if (input.status !== undefined) updated.status = input.status;
    if (input.totalValue !== undefined) updated.totalValue = input.totalValue;
    if (input.currency !== undefined) updated.currency = input.currency;
    if (input.fundingSource !== undefined)
      updated.fundingSource = input.fundingSource;
    if (input.startDate !== undefined) updated.startDate = input.startDate;
    if (input.endDate !== undefined) updated.endDate = input.endDate;
    if (input.signedDate !== undefined) updated.signedDate = input.signedDate;
    if (input.contractManager !== undefined)
      updated.contractManager = input.contractManager;
    if (input.vendorSignatory !== undefined)
      updated.vendorSignatory = input.vendorSignatory;
    if (input.clientSignatory !== undefined)
      updated.clientSignatory = input.clientSignatory;
    if (input.paymentTerms !== undefined)
      updated.paymentTerms = input.paymentTerms;
    if (input.deliveryTerms !== undefined)
      updated.deliveryTerms = input.deliveryTerms;
    if (input.penaltyClause !== undefined)
      updated.penaltyClause = input.penaltyClause;
    if (input.performanceBond !== undefined)
      updated.performanceBond = input.performanceBond;
    if (input.bondAmount !== undefined) updated.bondAmount = input.bondAmount;
    if (input.warrantyPeriod !== undefined)
      updated.warrantyPeriod = input.warrantyPeriod;
    if (input.scopeOfWork !== undefined)
      updated.scopeOfWork = input.scopeOfWork;
    if (input.deliverables !== undefined)
      updated.deliverables = input.deliverables;
    if (input.fcpaReviewRequired !== undefined)
      updated.fcpaReviewRequired = input.fcpaReviewRequired;
    if (input.fcpaReviewCompleted !== undefined)
      updated.fcpaReviewCompleted = input.fcpaReviewCompleted;
    if (input.documentUrl !== undefined)
      updated.documentUrl = input.documentUrl;
    if (input.notes !== undefined) updated.notes = input.notes;

    // Build update map
    const updates: Record<string, any> = {};

    if (input.contractNumber !== undefined)
      updates.contractNumber = input.contractNumber;
    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.type !== undefined) updates.type = input.type;
    if (input.status !== undefined) updates.status = input.status;
    if (input.totalValue !== undefined) updates.totalValue = input.totalValue;
    if (input.currency !== undefined) updates.currency = input.currency;
    if (input.fundingSource !== undefined)
      updates.fundingSource = input.fundingSource;
    if (input.startDate !== undefined)
      updates.startDate = input.startDate.toISOString().split("T")[0];
    if (input.endDate !== undefined)
      updates.endDate = input.endDate.toISOString().split("T")[0];
    if (input.signedDate !== undefined)
      updates.signedDate = input.signedDate
        ? input.signedDate.toISOString().split("T")[0]
        : "";
    if (input.contractManager !== undefined)
      updates.contractManager = input.contractManager;
    if (input.vendorSignatory !== undefined)
      updates.vendorSignatory = input.vendorSignatory;
    if (input.clientSignatory !== undefined)
      updates.clientSignatory = input.clientSignatory;
    if (input.paymentTerms !== undefined)
      updates.paymentTerms = input.paymentTerms;
    if (input.deliveryTerms !== undefined)
      updates.deliveryTerms = input.deliveryTerms;
    if (input.penaltyClause !== undefined)
      updates.penaltyClause = input.penaltyClause || "";
    if (input.performanceBond !== undefined)
      updates.performanceBond = input.performanceBond;
    if (input.bondAmount !== undefined)
      updates.bondAmount = input.bondAmount || "";
    if (input.warrantyPeriod !== undefined)
      updates.warrantyPeriod = input.warrantyPeriod || "";
    if (input.scopeOfWork !== undefined)
      updates.scopeOfWork = input.scopeOfWork;
    if (input.deliverables !== undefined)
      updates.deliverables = input.deliverables.join(", ");
    if (input.fcpaReviewRequired !== undefined)
      updates.fcpaReviewRequired = input.fcpaReviewRequired;
    if (input.fcpaReviewCompleted !== undefined)
      updates.fcpaReviewCompleted = input.fcpaReviewCompleted;
    if (input.documentUrl !== undefined)
      updates.documentUrl = input.documentUrl || "";
    if (input.notes !== undefined) updates.notes = input.notes || "";

    updates.lastModified = updated.lastModified.toISOString();

    // Update the row
    await updateRow(
      sheets,
      spreadsheetId,
      CONTRACTS_SHEET,
      "Contract ID",
      input.contractId,
      updates,
      CONTRACT_COLUMNS
    );

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to update contract: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List contracts with optional filters
 */
export async function listContracts(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  filters?: {
    vendorId?: string;
    programId?: string;
    status?: ContractStatus;
    type?: ContractType;
  }
): Promise<Contract[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${CONTRACTS_SHEET}!A:AF`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const contracts: Contract[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const contract = parseContractRow(data[i]);
      if (!contract) continue;

      // Apply filters
      if (filters) {
        if (filters.vendorId && contract.vendorId !== filters.vendorId) {
          continue;
        }
        if (filters.programId && contract.programId !== filters.programId) {
          continue;
        }
        if (filters.status && contract.status !== filters.status) {
          continue;
        }
        if (filters.type && contract.type !== filters.type) {
          continue;
        }
      }

      contracts.push(contract);
    }

    return contracts;
  } catch (error) {
    throw new Error(
      `Failed to list contracts: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete a contract (soft delete by marking status)
 */
export async function deleteContract(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  contractId: string,
  deletedBy: string
): Promise<boolean> {
  try {
    // Mark contract as terminated instead of deleting
    const result = await updateContract(
      sheets,
      spreadsheetId,
      {
        contractId,
        status: "terminated",
        notes: `Deleted by ${deletedBy} on ${new Date().toISOString()}`,
      },
      deletedBy
    );

    return result !== null;
  } catch (error) {
    throw new Error(
      `Failed to delete contract: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get active contracts
 */
export async function getActiveContracts(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId?: string
): Promise<Contract[]> {
  try {
    const contracts = await listContracts(sheets, spreadsheetId, {
      status: "active",
      vendorId,
    });

    return contracts;
  } catch (error) {
    throw new Error(
      `Failed to get active contracts: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get expiring contracts (within next N days)
 */
export async function getExpiringContracts(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  daysAhead: number = 90
): Promise<Contract[]> {
  try {
    const contracts = await listContracts(sheets, spreadsheetId, {
      status: "active",
    });

    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return contracts.filter((c) => {
      const endDate = new Date(c.endDate);
      return endDate >= now && endDate <= futureDate;
    });
  } catch (error) {
    throw new Error(
      `Failed to get expiring contracts: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
