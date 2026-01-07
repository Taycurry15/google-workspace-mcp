/**
 * Financial Transactions CRUD Operations
 *
 * Provides create, read, update, delete, and list operations for financial transactions
 * Tracks all monetary movements with comprehensive reconciliation and audit trail
 * Integrates with Google Sheets for persistent storage
 */

import type { sheets_v4 } from "googleapis";
import {
  readSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "@gw-mcp/shared-core";

/**
 * Transaction Type
 * Defines the nature of the financial transaction
 */
export type TransactionType =
  | "expense"      // Expenditure against budget
  | "revenue"      // Income/reimbursement
  | "transfer"     // Budget reallocation
  | "adjustment";  // Correction/adjustment

/**
 * Financial Transaction Interface
 * Represents a detailed financial transaction record
 */
export interface FinancialTransaction {
  transactionId: string;         // TXN-001
  programId: string;
  projectId?: string;

  // Transaction Details
  type: TransactionType;
  category: string;              // Budget category
  amount: number;
  currency: string;
  transactionDate: Date;
  description: string;

  // References
  budgetId?: string;
  invoiceId?: string;
  contractId?: string;
  vendorId?: string;

  // Payment Details
  paymentMethod?: string;
  reference?: string;

  // Reconciliation
  reconciled: boolean;
  reconciledDate?: Date;
  reconciledBy?: string;

  // Audit Trail
  notes?: string;
  createdDate: Date;
  createdBy: string;
  modifiedDate: Date;
  modifiedBy: string;
}

/**
 * Create Transaction Input
 */
export interface CreateTransactionInput {
  programId: string;
  projectId?: string;
  type: TransactionType;
  category: string;
  amount: number;
  currency?: string;
  transactionDate: Date;
  description: string;
  budgetId?: string;
  invoiceId?: string;
  contractId?: string;
  vendorId?: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}

/**
 * Update Transaction Input
 */
export interface UpdateTransactionInput {
  transactionId: string;
  programId?: string;
  projectId?: string;
  type?: TransactionType;
  category?: string;
  amount?: number;
  currency?: string;
  transactionDate?: Date;
  description?: string;
  budgetId?: string;
  invoiceId?: string;
  contractId?: string;
  vendorId?: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}

/**
 * Column mapping for Transactions sheet
 * Based on financial-schema.md Sheet 6: Financial Transactions
 */
export const TRANSACTION_COLUMNS = {
  transactionId: "A",
  programId: "B",
  projectId: "C",
  type: "D",
  category: "E",
  amount: "F",
  currency: "G",
  transactionDate: "H",
  description: "I",
  budgetId: "J",
  invoiceId: "K",
  contractId: "L",
  vendorId: "M",
  paymentMethod: "N",
  reference: "O",
  reconciled: "P",
  reconciledDate: "Q",
  reconciledBy: "R",
  notes: "S",
  createdDate: "T",
  createdBy: "U",
  modifiedDate: "V",
  modifiedBy: "W",
};

const TRANSACTIONS_SHEET = "Transactions";

/**
 * Parse a row from the sheet into a FinancialTransaction object
 */
export function parseTransactionRow(row: any[]): FinancialTransaction | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  return {
    transactionId: row[0] || "",
    programId: row[1] || "",
    projectId: row[2] || undefined,
    type: (row[3] as TransactionType) || "expense",
    category: row[4] || "",
    amount: row[5] ? parseFloat(row[5]) : 0,
    currency: row[6] || "USD",
    transactionDate: row[7] ? new Date(row[7]) : new Date(),
    description: row[8] || "",
    budgetId: row[9] || undefined,
    invoiceId: row[10] || undefined,
    contractId: row[11] || undefined,
    vendorId: row[12] || undefined,
    paymentMethod: row[13] || undefined,
    reference: row[14] || undefined,
    reconciled: row[15] === "TRUE" || row[15] === true,
    reconciledDate: row[16] ? new Date(row[16]) : undefined,
    reconciledBy: row[17] || undefined,
    notes: row[18] || undefined,
    createdDate: row[19] ? new Date(row[19]) : new Date(),
    createdBy: row[20] || "",
    modifiedDate: row[21] ? new Date(row[21]) : new Date(),
    modifiedBy: row[22] || "",
  };
}

/**
 * Convert a FinancialTransaction object to a row array
 */
export function transactionToRow(transaction: FinancialTransaction): any[] {
  return [
    transaction.transactionId,
    transaction.programId,
    transaction.projectId || "",
    transaction.type,
    transaction.category,
    transaction.amount,
    transaction.currency,
    transaction.transactionDate.toISOString().split("T")[0],
    transaction.description,
    transaction.budgetId || "",
    transaction.invoiceId || "",
    transaction.contractId || "",
    transaction.vendorId || "",
    transaction.paymentMethod || "",
    transaction.reference || "",
    transaction.reconciled ? "TRUE" : "FALSE",
    transaction.reconciledDate
      ? transaction.reconciledDate.toISOString().split("T")[0]
      : "",
    transaction.reconciledBy || "",
    transaction.notes || "",
    transaction.createdDate.toISOString(),
    transaction.createdBy,
    transaction.modifiedDate.toISOString(),
    transaction.modifiedBy,
  ];
}

/**
 * Create a new financial transaction
 */
export async function createTransaction(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: CreateTransactionInput,
  createdBy: string
): Promise<FinancialTransaction> {
  try {
    // Validate amount for non-adjustment transactions
    if (input.type !== "adjustment" && input.amount < 0) {
      throw new Error(
        "Amount must be positive for non-adjustment transactions"
      );
    }

    // Generate next transaction ID
    const transactionId = await generateNextId(
      sheets,
      spreadsheetId,
      TRANSACTIONS_SHEET,
      "Transaction ID",
      "TXN"
    );

    const now = new Date();

    const transaction: FinancialTransaction = {
      transactionId,
      programId: input.programId,
      projectId: input.projectId,
      type: input.type,
      category: input.category,
      amount: input.amount,
      currency: input.currency || "USD",
      transactionDate: input.transactionDate,
      description: input.description,
      budgetId: input.budgetId,
      invoiceId: input.invoiceId,
      contractId: input.contractId,
      vendorId: input.vendorId,
      paymentMethod: input.paymentMethod,
      reference: input.reference,
      reconciled: false,
      reconciledDate: undefined,
      reconciledBy: undefined,
      notes: input.notes,
      createdDate: now,
      createdBy,
      modifiedDate: now,
      modifiedBy: createdBy,
    };

    // Append to sheet
    const row = transactionToRow(transaction);
    await appendRows(sheets, spreadsheetId, `${TRANSACTIONS_SHEET}!A:W`, [
      row,
    ]);

    return transaction;
  } catch (error) {
    throw new Error(
      `Failed to create transaction: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Read a transaction by ID
 */
export async function readTransaction(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  transactionId: string
): Promise<FinancialTransaction | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      TRANSACTIONS_SHEET,
      "Transaction ID",
      transactionId
    );

    if (!result) {
      return null;
    }

    return parseTransactionRow(result.rowData);
  } catch (error) {
    throw new Error(
      `Failed to read transaction: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update a transaction
 */
export async function updateTransaction(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: UpdateTransactionInput,
  modifiedBy: string
): Promise<FinancialTransaction | null> {
  try {
    // First, read the existing transaction
    const existing = await readTransaction(
      sheets,
      spreadsheetId,
      input.transactionId
    );

    if (!existing) {
      return null;
    }

    // Prevent updating reconciled transactions without proper authorization
    if (existing.reconciled) {
      throw new Error(
        `Transaction ${input.transactionId} is reconciled and cannot be modified. Contact finance team to unreoncile first.`
      );
    }

    // Validate amount if being updated
    if (
      input.amount !== undefined &&
      input.type !== "adjustment" &&
      existing.type !== "adjustment" &&
      input.amount < 0
    ) {
      throw new Error(
        "Amount must be positive for non-adjustment transactions"
      );
    }

    // Apply updates
    const updated: FinancialTransaction = {
      ...existing,
      modifiedDate: new Date(),
      modifiedBy,
    };

    // Apply individual updates
    if (input.programId !== undefined) updated.programId = input.programId;
    if (input.projectId !== undefined) updated.projectId = input.projectId;
    if (input.type !== undefined) updated.type = input.type;
    if (input.category !== undefined) updated.category = input.category;
    if (input.amount !== undefined) updated.amount = input.amount;
    if (input.currency !== undefined) updated.currency = input.currency;
    if (input.transactionDate !== undefined)
      updated.transactionDate = input.transactionDate;
    if (input.description !== undefined)
      updated.description = input.description;
    if (input.budgetId !== undefined) updated.budgetId = input.budgetId;
    if (input.invoiceId !== undefined) updated.invoiceId = input.invoiceId;
    if (input.contractId !== undefined) updated.contractId = input.contractId;
    if (input.vendorId !== undefined) updated.vendorId = input.vendorId;
    if (input.paymentMethod !== undefined)
      updated.paymentMethod = input.paymentMethod;
    if (input.reference !== undefined) updated.reference = input.reference;
    if (input.notes !== undefined) updated.notes = input.notes;

    // Build update map
    const updates: Record<string, any> = {};

    if (input.programId !== undefined) updates.programId = input.programId;
    if (input.projectId !== undefined)
      updates.projectId = input.projectId || "";
    if (input.type !== undefined) updates.type = input.type;
    if (input.category !== undefined) updates.category = input.category;
    if (input.amount !== undefined) updates.amount = input.amount;
    if (input.currency !== undefined) updates.currency = input.currency;
    if (input.transactionDate !== undefined)
      updates.transactionDate = input.transactionDate
        .toISOString()
        .split("T")[0];
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.budgetId !== undefined)
      updates.budgetId = input.budgetId || "";
    if (input.invoiceId !== undefined)
      updates.invoiceId = input.invoiceId || "";
    if (input.contractId !== undefined)
      updates.contractId = input.contractId || "";
    if (input.vendorId !== undefined) updates.vendorId = input.vendorId || "";
    if (input.paymentMethod !== undefined)
      updates.paymentMethod = input.paymentMethod || "";
    if (input.reference !== undefined) updates.reference = input.reference || "";
    if (input.notes !== undefined) updates.notes = input.notes || "";

    // Always update modified fields
    updates.modifiedDate = updated.modifiedDate.toISOString();
    updates.modifiedBy = modifiedBy;

    // Update the row
    await updateRow(
      sheets,
      spreadsheetId,
      TRANSACTIONS_SHEET,
      "Transaction ID",
      input.transactionId,
      updates,
      TRANSACTION_COLUMNS
    );

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to update transaction: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List transactions with optional filters
 */
export async function listTransactions(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  filters?: {
    programId?: string;
    budgetId?: string;
    type?: TransactionType;
    startDate?: Date;
    endDate?: Date;
    reconciled?: boolean;
  }
): Promise<FinancialTransaction[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${TRANSACTIONS_SHEET}!A:W`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const transactions: FinancialTransaction[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const transaction = parseTransactionRow(data[i]);
      if (!transaction) continue;

      // Apply filters
      if (filters) {
        if (filters.programId && transaction.programId !== filters.programId) {
          continue;
        }
        if (filters.budgetId && transaction.budgetId !== filters.budgetId) {
          continue;
        }
        if (filters.type && transaction.type !== filters.type) {
          continue;
        }
        if (
          filters.startDate &&
          transaction.transactionDate < filters.startDate
        ) {
          continue;
        }
        if (filters.endDate && transaction.transactionDate > filters.endDate) {
          continue;
        }
        if (
          filters.reconciled !== undefined &&
          transaction.reconciled !== filters.reconciled
        ) {
          continue;
        }
      }

      transactions.push(transaction);
    }

    return transactions;
  } catch (error) {
    throw new Error(
      `Failed to list transactions: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete a transaction (soft delete by marking as void)
 */
export async function deleteTransaction(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  transactionId: string,
  deletedBy: string
): Promise<boolean> {
  try {
    const existing = await readTransaction(
      sheets,
      spreadsheetId,
      transactionId
    );

    if (!existing) {
      return false;
    }

    // Prevent deleting reconciled transactions
    if (existing.reconciled) {
      throw new Error(
        `Transaction ${transactionId} is reconciled and cannot be deleted. Contact finance team to unreoncile first.`
      );
    }

    // Mark as void by updating notes and type
    const result = await updateTransaction(
      sheets,
      spreadsheetId,
      {
        transactionId,
        type: "adjustment",
        amount: 0,
        notes: `VOIDED by ${deletedBy} on ${new Date().toISOString()}. Original: ${existing.notes || ""}`,
      },
      deletedBy
    );

    return result !== null;
  } catch (error) {
    throw new Error(
      `Failed to delete transaction: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get all transactions for a specific budget
 */
export async function getTransactionsByBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  budgetId: string
): Promise<FinancialTransaction[]> {
  try {
    return await listTransactions(sheets, spreadsheetId, { budgetId });
  } catch (error) {
    throw new Error(
      `Failed to get transactions by budget: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Calculate total expenses for a period
 */
export async function getTotalExpenses(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  try {
    const transactions = await listTransactions(sheets, spreadsheetId, {
      programId,
      type: "expense",
      startDate,
      endDate,
    });

    return transactions.reduce((total, txn) => {
      // Only count non-voided, reconciled or pending transactions
      if (txn.amount > 0) {
        return total + txn.amount;
      }
      return total;
    }, 0);
  } catch (error) {
    throw new Error(
      `Failed to get total expenses: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Calculate total revenue for a period
 */
export async function getTotalRevenue(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  try {
    const transactions = await listTransactions(sheets, spreadsheetId, {
      programId,
      type: "revenue",
      startDate,
      endDate,
    });

    return transactions.reduce((total, txn) => {
      // Only count non-voided, reconciled or pending transactions
      if (txn.amount > 0) {
        return total + txn.amount;
      }
      return total;
    }, 0);
  } catch (error) {
    throw new Error(
      `Failed to get total revenue: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Reconcile a transaction
 * Marks transaction as reconciled after verification
 */
export async function reconcileTransaction(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  transactionId: string,
  reconciledBy: string
): Promise<FinancialTransaction | null> {
  try {
    const existing = await readTransaction(
      sheets,
      spreadsheetId,
      transactionId
    );

    if (!existing) {
      return null;
    }

    if (existing.reconciled) {
      throw new Error(
        `Transaction ${transactionId} is already reconciled on ${existing.reconciledDate?.toISOString()}`
      );
    }

    // Validate transaction before reconciliation
    if (existing.amount === 0 && existing.type !== "adjustment") {
      throw new Error(
        `Transaction ${transactionId} has zero amount and cannot be reconciled`
      );
    }

    const now = new Date();

    // Update reconciliation fields directly in the sheet
    const updates: Record<string, any> = {
      reconciled: "TRUE",
      reconciledDate: now.toISOString().split("T")[0],
      reconciledBy,
      modifiedDate: now.toISOString(),
      modifiedBy: reconciledBy,
      notes: existing.notes
        ? `${existing.notes}\nReconciled by ${reconciledBy} on ${now.toISOString()}`
        : `Reconciled by ${reconciledBy} on ${now.toISOString()}`,
    };

    await updateRow(
      sheets,
      spreadsheetId,
      TRANSACTIONS_SHEET,
      "Transaction ID",
      transactionId,
      updates,
      TRANSACTION_COLUMNS
    );

    // Return updated transaction
    const updated: FinancialTransaction = {
      ...existing,
      reconciled: true,
      reconciledDate: now,
      reconciledBy,
      modifiedDate: now,
      modifiedBy: reconciledBy,
      notes: updates.notes,
    };

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to reconcile transaction: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get unreconciled transactions
 * Returns all transactions that have not been reconciled
 */
export async function getUnreconciledTransactions(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId?: string
): Promise<FinancialTransaction[]> {
  try {
    return await listTransactions(sheets, spreadsheetId, {
      programId,
      reconciled: false,
    });
  } catch (error) {
    throw new Error(
      `Failed to get unreconciled transactions: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get reconciled transactions for a period
 * Useful for generating reconciliation reports
 */
export async function getReconciledTransactions(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  startDate?: Date,
  endDate?: Date
): Promise<FinancialTransaction[]> {
  try {
    return await listTransactions(sheets, spreadsheetId, {
      programId,
      reconciled: true,
      startDate,
      endDate,
    });
  } catch (error) {
    throw new Error(
      `Failed to get reconciled transactions: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get transaction summary by category
 * Returns aggregated totals by transaction category
 */
export async function getTransactionSummaryByCategory(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Record<string, { count: number; total: number }>> {
  try {
    const transactions = await listTransactions(sheets, spreadsheetId, {
      programId,
      startDate,
      endDate,
    });

    const summary: Record<string, { count: number; total: number }> = {};

    for (const txn of transactions) {
      if (!summary[txn.category]) {
        summary[txn.category] = { count: 0, total: 0 };
      }

      summary[txn.category].count++;
      summary[txn.category].total += txn.amount;
    }

    return summary;
  } catch (error) {
    throw new Error(
      `Failed to get transaction summary by category: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get transaction summary by type
 * Returns aggregated totals by transaction type (expense, revenue, etc.)
 */
export async function getTransactionSummaryByType(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  startDate?: Date,
  endDate?: Date
): Promise<
  Record<TransactionType, { count: number; total: number; reconciled: number }>
> {
  try {
    const transactions = await listTransactions(sheets, spreadsheetId, {
      programId,
      startDate,
      endDate,
    });

    const summary: Record<
      TransactionType,
      { count: number; total: number; reconciled: number }
    > = {
      expense: { count: 0, total: 0, reconciled: 0 },
      revenue: { count: 0, total: 0, reconciled: 0 },
      transfer: { count: 0, total: 0, reconciled: 0 },
      adjustment: { count: 0, total: 0, reconciled: 0 },
    };

    for (const txn of transactions) {
      summary[txn.type].count++;
      summary[txn.type].total += txn.amount;
      if (txn.reconciled) {
        summary[txn.type].reconciled++;
      }
    }

    return summary;
  } catch (error) {
    throw new Error(
      `Failed to get transaction summary by type: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Batch reconcile transactions
 * Reconciles multiple transactions at once
 */
export async function batchReconcileTransactions(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  transactionIds: string[],
  reconciledBy: string
): Promise<{
  succeeded: string[];
  failed: Array<{ transactionId: string; error: string }>;
}> {
  const succeeded: string[] = [];
  const failed: Array<{ transactionId: string; error: string }> = [];

  for (const transactionId of transactionIds) {
    try {
      await reconcileTransaction(
        sheets,
        spreadsheetId,
        transactionId,
        reconciledBy
      );
      succeeded.push(transactionId);
    } catch (error) {
      failed.push({
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { succeeded, failed };
}

/**
 * Get transactions requiring reconciliation
 * Returns transactions older than a specified number of days that are not reconciled
 */
export async function getTransactionsRequiringReconciliation(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  daysOld: number = 30
): Promise<FinancialTransaction[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const unreconciled = await getUnreconciledTransactions(
      sheets,
      spreadsheetId,
      programId
    );

    return unreconciled.filter((txn) => txn.transactionDate <= cutoffDate);
  } catch (error) {
    throw new Error(
      `Failed to get transactions requiring reconciliation: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
