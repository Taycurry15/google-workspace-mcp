/**
 * Cash Flow CRUD Operations
 *
 * Provides create, read, update, delete, and list operations for cash flows
 * Integrates with Google Sheets for persistent storage
 */

import type { sheets_v4 } from "googleapis";
import type {
  CashFlow,
  CashFlowType,
  CashFlowStatus,
  CashFlowCategory,
} from "../types/financial.js";
import {
  readSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "@gw-mcp/shared-core";

/**
 * Column mapping for Cash Flow sheet
 * Based on financial-schema.md Sheet 5: Cash Flow
 */
export const CASHFLOW_COLUMNS = {
  flowId: "A",
  programId: "B",
  type: "C",
  category: "D",
  description: "E",
  amount: "F",
  currency: "G",
  forecastDate: "H",
  actualDate: "I",
  status: "J",
  invoiceId: "K",
  contractId: "L",
  budgetId: "M",
  paymentMethod: "N",
  paymentReference: "O",
  createdDate: "P",
  createdBy: "Q",
  lastModified: "R",
  notes: "S",
};

const CASHFLOW_SHEET = "Cash Flow";

/**
 * Create cash flow input
 */
export interface CreateCashFlowInput {
  programId: string;
  type: CashFlowType;
  category: CashFlowCategory;
  description: string;
  amount: number;
  currency?: string;
  forecastDate: Date;
  invoiceId?: string;
  contractId?: string;
  budgetId?: string;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
}

/**
 * Update cash flow input
 */
export interface UpdateCashFlowInput {
  flowId: string;
  programId?: string;
  type?: CashFlowType;
  category?: CashFlowCategory;
  description?: string;
  amount?: number;
  currency?: string;
  forecastDate?: Date;
  actualDate?: Date;
  status?: CashFlowStatus;
  invoiceId?: string;
  contractId?: string;
  budgetId?: string;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
}

/**
 * Parse a row from the sheet into a CashFlow object
 */
export function parseCashFlowRow(row: any[]): CashFlow | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  return {
    flowId: row[0] || "",
    programId: row[1] || "",
    type: (row[2] as CashFlowType) || "outflow",
    category: (row[3] as CashFlowCategory) || "other",
    description: row[4] || "",
    amount: row[5] ? parseFloat(row[5]) : 0,
    currency: row[6] || "USD",
    forecastDate: row[7] ? new Date(row[7]) : new Date(),
    actualDate: row[8] ? new Date(row[8]) : undefined,
    status: (row[9] as CashFlowStatus) || "forecasted",
    invoiceId: row[10] || undefined,
    contractId: row[11] || undefined,
    budgetId: row[12] || undefined,
    paymentMethod: row[13] || undefined,
    paymentReference: row[14] || undefined,
    createdDate: row[15] ? new Date(row[15]) : new Date(),
    createdBy: row[16] || "",
    lastModified: row[17] ? new Date(row[17]) : new Date(),
    notes: row[18] || undefined,
  };
}

/**
 * Convert a CashFlow object to a row array
 */
export function cashFlowToRow(cashFlow: CashFlow): any[] {
  return [
    cashFlow.flowId,
    cashFlow.programId,
    cashFlow.type,
    cashFlow.category,
    cashFlow.description,
    cashFlow.amount,
    cashFlow.currency,
    cashFlow.forecastDate.toISOString().split("T")[0],
    cashFlow.actualDate
      ? cashFlow.actualDate.toISOString().split("T")[0]
      : "",
    cashFlow.status,
    cashFlow.invoiceId || "",
    cashFlow.contractId || "",
    cashFlow.budgetId || "",
    cashFlow.paymentMethod || "",
    cashFlow.paymentReference || "",
    cashFlow.createdDate.toISOString(),
    cashFlow.createdBy,
    cashFlow.lastModified.toISOString(),
    cashFlow.notes || "",
  ];
}

/**
 * Create a new cash flow entry
 */
export async function createCashFlow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: CreateCashFlowInput,
  createdBy: string
): Promise<CashFlow> {
  try {
    // Generate next cash flow ID
    const flowId = await generateNextId(
      sheets,
      spreadsheetId,
      CASHFLOW_SHEET,
      "Flow ID",
      "CF"
    );

    const now = new Date();

    const cashFlow: CashFlow = {
      flowId,
      programId: input.programId,
      type: input.type,
      category: input.category,
      description: input.description,
      amount: input.amount,
      currency: input.currency || "USD",
      forecastDate: input.forecastDate,
      actualDate: undefined,
      status: "forecasted",
      invoiceId: input.invoiceId,
      contractId: input.contractId,
      budgetId: input.budgetId,
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference,
      notes: input.notes,
      createdDate: now,
      createdBy,
      lastModified: now,
    };

    // Append to sheet
    const row = cashFlowToRow(cashFlow);
    await appendRows(sheets, spreadsheetId, `${CASHFLOW_SHEET}!A:S`, [row]);

    return cashFlow;
  } catch (error) {
    throw new Error(
      `Failed to create cash flow: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Read a cash flow by ID
 */
export async function readCashFlow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  flowId: string
): Promise<CashFlow | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      CASHFLOW_SHEET,
      "Flow ID",
      flowId
    );

    if (!result) {
      return null;
    }

    return parseCashFlowRow(result.rowData);
  } catch (error) {
    throw new Error(
      `Failed to read cash flow: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update a cash flow entry
 */
export async function updateCashFlow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: UpdateCashFlowInput,
  modifiedBy: string
): Promise<CashFlow | null> {
  try {
    // First, read the existing cash flow
    const existing = await readCashFlow(sheets, spreadsheetId, input.flowId);

    if (!existing) {
      return null;
    }

    // Apply updates
    const updated: CashFlow = {
      ...existing,
      lastModified: new Date(),
    };

    // Apply individual updates
    if (input.programId !== undefined) updated.programId = input.programId;
    if (input.type !== undefined) updated.type = input.type;
    if (input.category !== undefined) updated.category = input.category;
    if (input.description !== undefined)
      updated.description = input.description;
    if (input.amount !== undefined) updated.amount = input.amount;
    if (input.currency !== undefined) updated.currency = input.currency;
    if (input.forecastDate !== undefined)
      updated.forecastDate = input.forecastDate;
    if (input.actualDate !== undefined) updated.actualDate = input.actualDate;
    if (input.status !== undefined) updated.status = input.status;
    if (input.invoiceId !== undefined) updated.invoiceId = input.invoiceId;
    if (input.contractId !== undefined) updated.contractId = input.contractId;
    if (input.budgetId !== undefined) updated.budgetId = input.budgetId;
    if (input.paymentMethod !== undefined)
      updated.paymentMethod = input.paymentMethod;
    if (input.paymentReference !== undefined)
      updated.paymentReference = input.paymentReference;
    if (input.notes !== undefined) updated.notes = input.notes;

    // Build update map
    const updates: Record<string, any> = {};

    if (input.programId !== undefined) updates.programId = input.programId;
    if (input.type !== undefined) updates.type = input.type;
    if (input.category !== undefined) updates.category = input.category;
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.amount !== undefined) updates.amount = input.amount;
    if (input.currency !== undefined) updates.currency = input.currency;
    if (input.forecastDate !== undefined)
      updates.forecastDate = input.forecastDate.toISOString().split("T")[0];
    if (input.actualDate !== undefined)
      updates.actualDate = input.actualDate
        ? input.actualDate.toISOString().split("T")[0]
        : "";
    if (input.status !== undefined) updates.status = input.status;
    if (input.invoiceId !== undefined)
      updates.invoiceId = input.invoiceId || "";
    if (input.contractId !== undefined)
      updates.contractId = input.contractId || "";
    if (input.budgetId !== undefined) updates.budgetId = input.budgetId || "";
    if (input.paymentMethod !== undefined)
      updates.paymentMethod = input.paymentMethod || "";
    if (input.paymentReference !== undefined)
      updates.paymentReference = input.paymentReference || "";
    if (input.notes !== undefined) updates.notes = input.notes || "";

    // Always update modified field
    updates.lastModified = updated.lastModified.toISOString();

    // Update the row
    await updateRow(
      sheets,
      spreadsheetId,
      CASHFLOW_SHEET,
      "Flow ID",
      input.flowId,
      updates,
      CASHFLOW_COLUMNS
    );

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to update cash flow: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List cash flows with optional filters
 */
export async function listCashFlows(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  filters?: {
    programId?: string;
    type?: CashFlowType;
    status?: CashFlowStatus;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<CashFlow[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${CASHFLOW_SHEET}!A:S`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const cashFlows: CashFlow[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const cashFlow = parseCashFlowRow(data[i]);
      if (!cashFlow) continue;

      // Apply filters
      if (filters) {
        if (filters.programId && cashFlow.programId !== filters.programId) {
          continue;
        }
        if (filters.type && cashFlow.type !== filters.type) {
          continue;
        }
        if (filters.status && cashFlow.status !== filters.status) {
          continue;
        }
        if (filters.startDate && cashFlow.forecastDate < filters.startDate) {
          continue;
        }
        if (filters.endDate && cashFlow.forecastDate > filters.endDate) {
          continue;
        }
      }

      cashFlows.push(cashFlow);
    }

    return cashFlows;
  } catch (error) {
    throw new Error(
      `Failed to list cash flows: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete a cash flow (soft delete by marking as cancelled)
 */
export async function deleteCashFlow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  flowId: string,
  deletedBy: string
): Promise<boolean> {
  try {
    // Mark cash flow as cancelled instead of deleting
    const result = await updateCashFlow(
      sheets,
      spreadsheetId,
      {
        flowId,
        status: "cancelled",
        notes: `Cancelled by ${deletedBy} on ${new Date().toISOString()}`,
      },
      deletedBy
    );

    return result !== null;
  } catch (error) {
    throw new Error(
      `Failed to delete cash flow: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Record actual cash flow
 * Updates a forecasted/scheduled cash flow with actual date and amount
 */
export async function recordActualCashFlow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  flowId: string,
  actualDate: Date,
  actualAmount: number,
  recordedBy: string
): Promise<CashFlow | null> {
  try {
    const existing = await readCashFlow(sheets, spreadsheetId, flowId);

    if (!existing) {
      return null;
    }

    // Validate status transition
    if (existing.status === "completed") {
      throw new Error(
        `Cash flow ${flowId} is already completed. Cannot record actual flow.`
      );
    }

    if (existing.status === "cancelled") {
      throw new Error(
        `Cash flow ${flowId} is cancelled. Cannot record actual flow.`
      );
    }

    // Update the cash flow with actual data
    const result = await updateCashFlow(
      sheets,
      spreadsheetId,
      {
        flowId,
        actualDate,
        amount: actualAmount,
        status: "completed",
        notes: existing.notes
          ? `${existing.notes}\nActual flow recorded by ${recordedBy} on ${new Date().toISOString()}`
          : `Actual flow recorded by ${recordedBy} on ${new Date().toISOString()}`,
      },
      recordedBy
    );

    return result;
  } catch (error) {
    throw new Error(
      `Failed to record actual cash flow: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get upcoming cash flows
 * Returns cash flows expected in the next N days (default 30)
 */
export async function getUpcomingCashFlows(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  daysAhead: number = 30
): Promise<CashFlow[]> {
  try {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const allFlows = await listCashFlows(sheets, spreadsheetId, {
      programId,
      startDate: now,
      endDate: futureDate,
    });

    // Filter to only expected flows (not yet actual)
    return allFlows.filter(
      (flow) =>
        (flow.status === "forecasted" ||
          flow.status === "scheduled" ||
          flow.status === "pending") &&
        !flow.actualDate
    );
  } catch (error) {
    throw new Error(
      `Failed to get upcoming cash flows: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get overdue cash flows
 * Returns expected cash flows past their forecast date but not yet actual
 */
export async function getOverdueCashFlows(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<CashFlow[]> {
  try {
    const now = new Date();

    const allFlows = await listCashFlows(sheets, spreadsheetId, {
      programId,
    });

    // Filter to only overdue flows
    return allFlows.filter(
      (flow) =>
        (flow.status === "forecasted" ||
          flow.status === "scheduled" ||
          flow.status === "pending") &&
        !flow.actualDate &&
        flow.forecastDate < now
    );
  } catch (error) {
    throw new Error(
      `Failed to get overdue cash flows: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get cash flow projection
 * Returns aggregated cash flow projections for a period
 */
export async function getCashFlowProjection(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalInflow: number;
  totalOutflow: number;
  netFlow: number;
  inflowByCategory: Record<string, number>;
  outflowByCategory: Record<string, number>;
}> {
  try {
    const flows = await listCashFlows(sheets, spreadsheetId, {
      programId,
      startDate,
      endDate,
    });

    let totalInflow = 0;
    let totalOutflow = 0;
    const inflowByCategory: Record<string, number> = {};
    const outflowByCategory: Record<string, number> = {};

    for (const flow of flows) {
      // Skip cancelled flows
      if (flow.status === "cancelled") {
        continue;
      }

      if (flow.type === "inflow") {
        totalInflow += flow.amount;
        inflowByCategory[flow.category] =
          (inflowByCategory[flow.category] || 0) + flow.amount;
      } else {
        totalOutflow += flow.amount;
        outflowByCategory[flow.category] =
          (outflowByCategory[flow.category] || 0) + flow.amount;
      }
    }

    return {
      totalInflow,
      totalOutflow,
      netFlow: totalInflow - totalOutflow,
      inflowByCategory,
      outflowByCategory,
    };
  } catch (error) {
    throw new Error(
      `Failed to get cash flow projection: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get cash flow status for a program
 * Returns summary of cash flows by status
 */
export async function getCashFlowStatus(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<{
  forecasted: number;
  scheduled: number;
  pending: number;
  completed: number;
  cancelled: number;
  total: number;
}> {
  try {
    const flows = await listCashFlows(sheets, spreadsheetId, { programId });

    const status = {
      forecasted: 0,
      scheduled: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
      total: flows.length,
    };

    for (const flow of flows) {
      status[flow.status]++;
    }

    return status;
  } catch (error) {
    throw new Error(
      `Failed to get cash flow status: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Reconcile cash flow
 * Marks a cash flow as reconciled after verification
 */
export async function reconcileCashFlow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  flowId: string,
  reconciledBy: string
): Promise<CashFlow | null> {
  try {
    const existing = await readCashFlow(sheets, spreadsheetId, flowId);

    if (!existing) {
      return null;
    }

    if (existing.status !== "completed") {
      throw new Error(
        `Cash flow ${flowId} must be completed before reconciliation`
      );
    }

    // Update notes to indicate reconciliation
    const result = await updateCashFlow(
      sheets,
      spreadsheetId,
      {
        flowId,
        notes: existing.notes
          ? `${existing.notes}\nReconciled by ${reconciledBy} on ${new Date().toISOString()}`
          : `Reconciled by ${reconciledBy} on ${new Date().toISOString()}`,
      },
      reconciledBy
    );

    return result;
  } catch (error) {
    throw new Error(
      `Failed to reconcile cash flow: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
