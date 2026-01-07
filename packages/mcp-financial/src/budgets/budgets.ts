/**
 * Budget CRUD Operations
 *
 * Provides create, read, update, delete, and list operations for budgets
 * Integrates with Google Sheets for persistent storage
 */

import type { sheets_v4 } from "googleapis";
import type {
  Budget,
  BudgetCategory,
  BudgetStatus,
} from "../types/financial.js";
import {
  readSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "@gw-mcp/shared-core";

/**
 * Column mapping for Budgets sheet
 */
export const BUDGET_COLUMNS = {
  budgetId: "A",
  programId: "B",
  projectId: "C",
  name: "D",
  description: "E",
  category: "F",
  status: "G",
  allocated: "H",
  committed: "I",
  spent: "J",
  remaining: "K",
  fiscalYear: "L",
  periodStart: "M",
  periodEnd: "N",
  variance: "O",
  variancePercent: "P",
  requestedBy: "Q",
  approvedBy: "R",
  approvedDate: "S",
  currency: "T",
  createdDate: "U",
  createdBy: "V",
  lastModified: "W",
  notes: "X",
};

const BUDGETS_SHEET = "Budgets";

/**
 * Create budget input
 */
export interface CreateBudgetInput {
  programId: string;
  projectId?: string;
  name: string;
  description: string;
  category: BudgetCategory;
  allocated: number;
  fiscalYear: string;
  periodStart: Date;
  periodEnd: Date;
  requestedBy: string;
  approvedBy?: string;
  approvedDate?: Date;
  currency?: string;
  notes?: string;
}

/**
 * Update budget input
 */
export interface UpdateBudgetInput {
  budgetId: string;
  programId?: string;
  projectId?: string;
  name?: string;
  description?: string;
  category?: BudgetCategory;
  status?: BudgetStatus;
  allocated?: number;
  committed?: number;
  spent?: number;
  fiscalYear?: string;
  periodStart?: Date;
  periodEnd?: Date;
  requestedBy?: string;
  approvedBy?: string;
  approvedDate?: Date;
  currency?: string;
  notes?: string;
}

/**
 * Parse a row from the sheet into a Budget object
 */
export function parseBudgetRow(row: any[]): Budget | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  const allocated = row[7] ? parseFloat(row[7]) : 0;
  const committed = row[8] ? parseFloat(row[8]) : 0;
  const spent = row[9] ? parseFloat(row[9]) : 0;
  const remaining = allocated - spent;
  const variance = allocated - spent;
  const variancePercent = allocated > 0 ? (variance / allocated) * 100 : 0;

  return {
    budgetId: row[0] || "",
    programId: row[1] || "",
    projectId: row[2] || undefined,
    name: row[3] || "",
    description: row[4] || "",
    category: (row[5] as BudgetCategory) || "other",
    status: (row[6] as BudgetStatus) || "draft",
    allocated,
    committed,
    spent,
    remaining,
    fiscalYear: row[11] || "",
    periodStart: row[12] ? new Date(row[12]) : new Date(),
    periodEnd: row[13] ? new Date(row[13]) : new Date(),
    variance,
    variancePercent,
    requestedBy: row[16] || "",
    approvedBy: row[17] || undefined,
    approvedDate: row[18] ? new Date(row[18]) : undefined,
    currency: row[19] || "USD",
    createdDate: row[20] ? new Date(row[20]) : new Date(),
    createdBy: row[21] || "",
    lastModified: row[22] ? new Date(row[22]) : new Date(),
    notes: row[23] || "",
  };
}

/**
 * Convert a Budget object to a row array
 */
export function budgetToRow(budget: Budget): any[] {
  return [
    budget.budgetId,
    budget.programId,
    budget.projectId || "",
    budget.name,
    budget.description,
    budget.category,
    budget.status,
    budget.allocated,
    budget.committed,
    budget.spent,
    budget.remaining,
    budget.fiscalYear,
    budget.periodStart.toISOString().split("T")[0],
    budget.periodEnd.toISOString().split("T")[0],
    budget.variance,
    budget.variancePercent,
    budget.requestedBy,
    budget.approvedBy || "",
    budget.approvedDate
      ? budget.approvedDate.toISOString().split("T")[0]
      : "",
    budget.currency,
    budget.createdDate.toISOString(),
    budget.createdBy,
    budget.lastModified.toISOString(),
    budget.notes,
  ];
}

/**
 * Create a new budget
 */
export async function createBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: CreateBudgetInput,
  createdBy: string
): Promise<Budget> {
  try {
    // Generate next budget ID
    const budgetId = await generateNextId(
      sheets,
      spreadsheetId,
      BUDGETS_SHEET,
      "Budget ID",
      "BUD"
    );

    const now = new Date();

    // Calculate initial values
    const allocated = input.allocated;
    const committed = 0;
    const spent = 0;
    const remaining = allocated - spent;
    const variance = allocated - spent;
    const variancePercent = allocated > 0 ? (variance / allocated) * 100 : 0;

    const budget: Budget = {
      budgetId,
      programId: input.programId,
      projectId: input.projectId,
      name: input.name,
      description: input.description,
      category: input.category,
      status: "draft",
      allocated,
      committed,
      spent,
      remaining,
      fiscalYear: input.fiscalYear,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      variance,
      variancePercent,
      requestedBy: input.requestedBy,
      approvedBy: input.approvedBy,
      approvedDate: input.approvedDate,
      currency: input.currency || "USD",
      createdDate: now,
      createdBy,
      lastModified: now,
      notes: input.notes || "",
    };

    // Append to sheet
    const row = budgetToRow(budget);
    await appendRows(sheets, spreadsheetId, `${BUDGETS_SHEET}!A:X`, [row]);

    return budget;
  } catch (error) {
    throw new Error(
      `Failed to create budget: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Read a budget by ID
 */
export async function readBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  budgetId: string
): Promise<Budget | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      BUDGETS_SHEET,
      "Budget ID",
      budgetId
    );

    if (!result) {
      return null;
    }

    return parseBudgetRow(result.rowData);
  } catch (error) {
    throw new Error(
      `Failed to read budget: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update a budget
 */
export async function updateBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: UpdateBudgetInput,
  modifiedBy: string
): Promise<Budget | null> {
  try {
    // First, read the existing budget
    const existing = await readBudget(sheets, spreadsheetId, input.budgetId);

    if (!existing) {
      return null;
    }

    // Apply updates
    const updated: Budget = {
      ...existing,
      lastModified: new Date(),
    };

    // Apply individual updates
    if (input.programId !== undefined) updated.programId = input.programId;
    if (input.projectId !== undefined) updated.projectId = input.projectId;
    if (input.name !== undefined) updated.name = input.name;
    if (input.description !== undefined)
      updated.description = input.description;
    if (input.category !== undefined) updated.category = input.category;
    if (input.status !== undefined) updated.status = input.status;
    if (input.allocated !== undefined) updated.allocated = input.allocated;
    if (input.committed !== undefined) updated.committed = input.committed;
    if (input.spent !== undefined) updated.spent = input.spent;
    if (input.fiscalYear !== undefined) updated.fiscalYear = input.fiscalYear;
    if (input.periodStart !== undefined)
      updated.periodStart = input.periodStart;
    if (input.periodEnd !== undefined) updated.periodEnd = input.periodEnd;
    if (input.requestedBy !== undefined)
      updated.requestedBy = input.requestedBy;
    if (input.approvedBy !== undefined) updated.approvedBy = input.approvedBy;
    if (input.approvedDate !== undefined)
      updated.approvedDate = input.approvedDate;
    if (input.currency !== undefined) updated.currency = input.currency;
    if (input.notes !== undefined) updated.notes = input.notes;

    // Recalculate derived fields
    updated.remaining = updated.allocated - updated.spent;
    updated.variance = updated.allocated - updated.spent;
    updated.variancePercent =
      updated.allocated > 0
        ? (updated.variance / updated.allocated) * 100
        : 0;

    // Build update map
    const updates: Record<string, any> = {};

    if (input.programId !== undefined) updates.programId = input.programId;
    if (input.projectId !== undefined)
      updates.projectId = input.projectId || "";
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.category !== undefined) updates.category = input.category;
    if (input.status !== undefined) updates.status = input.status;
    if (input.allocated !== undefined) updates.allocated = input.allocated;
    if (input.committed !== undefined) updates.committed = input.committed;
    if (input.spent !== undefined) updates.spent = input.spent;
    if (input.fiscalYear !== undefined) updates.fiscalYear = input.fiscalYear;
    if (input.periodStart !== undefined)
      updates.periodStart = input.periodStart.toISOString().split("T")[0];
    if (input.periodEnd !== undefined)
      updates.periodEnd = input.periodEnd.toISOString().split("T")[0];
    if (input.requestedBy !== undefined)
      updates.requestedBy = input.requestedBy;
    if (input.approvedBy !== undefined)
      updates.approvedBy = input.approvedBy || "";
    if (input.approvedDate !== undefined)
      updates.approvedDate = input.approvedDate
        ? input.approvedDate.toISOString().split("T")[0]
        : "";
    if (input.currency !== undefined) updates.currency = input.currency;
    if (input.notes !== undefined) updates.notes = input.notes;

    // Always update calculated fields
    updates.remaining = updated.remaining;
    updates.variance = updated.variance;
    updates.variancePercent = updated.variancePercent;
    updates.lastModified = updated.lastModified.toISOString();

    // Update the row
    await updateRow(
      sheets,
      spreadsheetId,
      BUDGETS_SHEET,
      "Budget ID",
      input.budgetId,
      updates,
      BUDGET_COLUMNS
    );

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to update budget: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List budgets with optional filters
 */
export async function listBudgets(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  filters?: {
    programId?: string;
    projectId?: string;
    fiscalYear?: string;
    category?: BudgetCategory;
    status?: BudgetStatus;
  }
): Promise<Budget[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${BUDGETS_SHEET}!A:X`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const budgets: Budget[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const budget = parseBudgetRow(data[i]);
      if (!budget) continue;

      // Apply filters
      if (filters) {
        if (filters.programId && budget.programId !== filters.programId) {
          continue;
        }
        if (filters.projectId && budget.projectId !== filters.projectId) {
          continue;
        }
        if (filters.fiscalYear && budget.fiscalYear !== filters.fiscalYear) {
          continue;
        }
        if (filters.category && budget.category !== filters.category) {
          continue;
        }
        if (filters.status && budget.status !== filters.status) {
          continue;
        }
      }

      budgets.push(budget);
    }

    return budgets;
  } catch (error) {
    throw new Error(
      `Failed to list budgets: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Allocate budget amount
 * Updates the allocated amount for a budget
 */
export async function allocateBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  budgetId: string,
  amount: number,
  allocatedBy: string
): Promise<Budget | null> {
  try {
    if (amount < 0) {
      throw new Error("Allocated amount must be non-negative");
    }

    const existing = await readBudget(sheets, spreadsheetId, budgetId);

    if (!existing) {
      return null;
    }

    // Update the budget with new allocated amount
    const result = await updateBudget(
      sheets,
      spreadsheetId,
      {
        budgetId,
        allocated: amount,
        notes: existing.notes
          ? `${existing.notes}\nAllocated ${amount} by ${allocatedBy} on ${new Date().toISOString()}`
          : `Allocated ${amount} by ${allocatedBy} on ${new Date().toISOString()}`,
      },
      allocatedBy
    );

    return result;
  } catch (error) {
    throw new Error(
      `Failed to allocate budget: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Commit budget amount
 * Reserves funds for a contract or obligation
 */
export async function commitBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  budgetId: string,
  amount: number,
  committedBy: string
): Promise<Budget | null> {
  try {
    if (amount < 0) {
      throw new Error("Committed amount must be non-negative");
    }

    const existing = await readBudget(sheets, spreadsheetId, budgetId);

    if (!existing) {
      return null;
    }

    // Check if we have enough remaining budget
    const newCommitted = existing.committed + amount;
    if (newCommitted > existing.allocated) {
      throw new Error(
        `Cannot commit ${amount}. Would exceed allocated budget of ${existing.allocated} (current committed: ${existing.committed})`
      );
    }

    // Update the budget with new committed amount
    const result = await updateBudget(
      sheets,
      spreadsheetId,
      {
        budgetId,
        committed: newCommitted,
        notes: existing.notes
          ? `${existing.notes}\nCommitted ${amount} by ${committedBy} on ${new Date().toISOString()}`
          : `Committed ${amount} by ${committedBy} on ${new Date().toISOString()}`,
      },
      committedBy
    );

    return result;
  } catch (error) {
    throw new Error(
      `Failed to commit budget: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Record expense against budget
 * Records actual expenditure
 */
export async function recordExpense(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  budgetId: string,
  amount: number,
  description: string,
  recordedBy: string
): Promise<Budget | null> {
  try {
    if (amount < 0) {
      throw new Error("Expense amount must be non-negative");
    }

    const existing = await readBudget(sheets, spreadsheetId, budgetId);

    if (!existing) {
      return null;
    }

    const newSpent = existing.spent + amount;

    // Warning if over budget, but don't prevent
    if (newSpent > existing.allocated) {
      console.warn(
        `Warning: Budget ${budgetId} will be over budget. Allocated: ${existing.allocated}, New spent: ${newSpent}`
      );
    }

    // Update the budget with new spent amount
    const result = await updateBudget(
      sheets,
      spreadsheetId,
      {
        budgetId,
        spent: newSpent,
        notes: existing.notes
          ? `${existing.notes}\nExpense ${amount} (${description}) by ${recordedBy} on ${new Date().toISOString()}`
          : `Expense ${amount} (${description}) by ${recordedBy} on ${new Date().toISOString()}`,
      },
      recordedBy
    );

    return result;
  } catch (error) {
    throw new Error(
      `Failed to record expense: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get budget status for a program
 * Returns aggregated budget totals across all budgets for a program
 */
export async function getBudgetStatus(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<{
  allocated: number;
  committed: number;
  spent: number;
  remaining: number;
}> {
  try {
    const budgets = await listBudgets(sheets, spreadsheetId, { programId });

    const totals = budgets.reduce(
      (acc, budget) => {
        acc.allocated += budget.allocated;
        acc.committed += budget.committed;
        acc.spent += budget.spent;
        acc.remaining += budget.remaining;
        return acc;
      },
      { allocated: 0, committed: 0, spent: 0, remaining: 0 }
    );

    return totals;
  } catch (error) {
    throw new Error(
      `Failed to get budget status: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete a budget (soft delete by marking status)
 */
export async function deleteBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  budgetId: string,
  deletedBy: string
): Promise<boolean> {
  try {
    // Mark budget as closed instead of deleting
    const result = await updateBudget(
      sheets,
      spreadsheetId,
      {
        budgetId,
        status: "closed",
        notes: `Deleted by ${deletedBy} on ${new Date().toISOString()}`,
      },
      deletedBy
    );

    return result !== null;
  } catch (error) {
    throw new Error(
      `Failed to delete budget: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get budgets over budget
 * Returns budgets where spent > allocated
 */
export async function getOverBudgetItems(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId?: string
): Promise<Budget[]> {
  try {
    const filters = programId ? { programId } : undefined;
    const budgets = await listBudgets(sheets, spreadsheetId, filters);

    return budgets.filter((b) => b.spent > b.allocated);
  } catch (error) {
    throw new Error(
      `Failed to get over budget items: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get budgets nearing limit
 * Returns budgets where spent is >= threshold% of allocated
 */
export async function getBudgetsNearingLimit(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  thresholdPercent: number = 80,
  programId?: string
): Promise<Budget[]> {
  try {
    if (thresholdPercent < 0 || thresholdPercent > 100) {
      throw new Error("Threshold must be between 0 and 100");
    }

    const filters = programId ? { programId } : undefined;
    const budgets = await listBudgets(sheets, spreadsheetId, filters);

    return budgets.filter((b) => {
      if (b.allocated === 0) return false;
      const percentUsed = (b.spent / b.allocated) * 100;
      return percentUsed >= thresholdPercent && b.spent <= b.allocated;
    });
  } catch (error) {
    throw new Error(
      `Failed to get budgets nearing limit: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Calculate burn rate for a budget
 * Returns average daily/weekly/monthly spending rate
 */
export async function calculateBurnRate(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  budgetId: string
): Promise<{
  dailyBurn: number;
  weeklyBurn: number;
  monthlyBurn: number;
  daysRemaining: number;
  projectedDepletionDate: Date | null;
} | null> {
  try {
    const budget = await readBudget(sheets, spreadsheetId, budgetId);

    if (!budget) {
      return null;
    }

    const now = new Date();
    const elapsed = now.getTime() - budget.periodStart.getTime();
    const elapsedDays = elapsed / (1000 * 60 * 60 * 24);

    if (elapsedDays <= 0) {
      return {
        dailyBurn: 0,
        weeklyBurn: 0,
        monthlyBurn: 0,
        daysRemaining: 0,
        projectedDepletionDate: null,
      };
    }

    const dailyBurn = budget.spent / elapsedDays;
    const weeklyBurn = dailyBurn * 7;
    const monthlyBurn = dailyBurn * 30;

    const daysRemaining =
      dailyBurn > 0 ? budget.remaining / dailyBurn : Infinity;
    const projectedDepletionDate =
      daysRemaining !== Infinity
        ? new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000)
        : null;

    return {
      dailyBurn,
      weeklyBurn,
      monthlyBurn,
      daysRemaining: Math.round(daysRemaining),
      projectedDepletionDate,
    };
  } catch (error) {
    throw new Error(
      `Failed to calculate burn rate: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
