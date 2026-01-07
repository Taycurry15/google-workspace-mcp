/**
 * Budget Allocation Management
 *
 * Manages budget allocation and reallocation operations across programs and categories.
 * Provides functions for transferring budgets, validating allocations, and distributing
 * remaining funds across categories.
 */

import type { sheets_v4 } from "googleapis";
import type { Budget, BudgetCategory } from "../types/financial.js";
import { readBudget, updateBudget, listBudgets } from "./budgets.js";
import { listCategories } from "./categories.js";

/**
 * Budget Allocation Summary Interface
 * Provides a comprehensive view of budget allocations by category
 */
export interface BudgetAllocationSummary {
  totalAllocated: number;
  totalCommitted: number;
  totalSpent: number;
  totalRemaining: number;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    allocated: number;
    committed: number;
    spent: number;
    remaining: number;
  }>;
}

/**
 * Validation Result Interface
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Reallocate budget between two budgets
 *
 * Transfers budget amount from one budget to another, validating sufficient
 * funds and maintaining an audit trail of the reallocation.
 *
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - Spreadsheet ID
 * @param fromBudgetId - Source budget ID
 * @param toBudgetId - Destination budget ID
 * @param amount - Amount to transfer
 * @param reason - Reason for reallocation
 * @param approvedBy - Person approving the reallocation
 * @returns Both updated budgets
 */
export async function reallocateBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  fromBudgetId: string,
  toBudgetId: string,
  amount: number,
  reason: string,
  approvedBy: string
): Promise<{ from: Budget; to: Budget }> {
  try {
    // Validate input
    if (amount <= 0) {
      throw new Error("Reallocation amount must be positive");
    }

    if (fromBudgetId === toBudgetId) {
      throw new Error("Cannot reallocate budget to itself");
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error("Reason for reallocation is required");
    }

    // Read both budgets
    const fromBudget = await readBudget(sheets, spreadsheetId, fromBudgetId);
    const toBudget = await readBudget(sheets, spreadsheetId, toBudgetId);

    if (!fromBudget) {
      throw new Error(`Source budget ${fromBudgetId} not found`);
    }

    if (!toBudget) {
      throw new Error(`Destination budget ${toBudgetId} not found`);
    }

    // Validate source budget has sufficient allocated amount
    if (fromBudget.allocated < amount) {
      throw new Error(
        `Insufficient allocated amount in source budget. Available: ${fromBudget.allocated}, Requested: ${amount}`
      );
    }

    // Check if source budget status allows reallocation
    if (fromBudget.status === "closed") {
      throw new Error(
        `Cannot reallocate from closed budget ${fromBudgetId}`
      );
    }

    // Check if destination budget status allows reallocation
    if (toBudget.status === "closed") {
      throw new Error(`Cannot reallocate to closed budget ${toBudgetId}`);
    }

    // Calculate new allocated amounts
    const newFromAllocated = fromBudget.allocated - amount;
    const newToAllocated = toBudget.allocated + amount;

    const timestamp = new Date().toISOString();
    const reallocationNote = `Reallocated ${amount} ${fromBudget.currency} to ${toBudgetId} on ${timestamp}. Reason: ${reason}. Approved by: ${approvedBy}`;
    const receiveNote = `Received ${amount} ${fromBudget.currency} from ${fromBudgetId} on ${timestamp}. Reason: ${reason}. Approved by: ${approvedBy}`;

    // Update both budgets atomically (in sequence to maintain consistency)
    // Update source budget first
    const updatedFrom = await updateBudget(
      sheets,
      spreadsheetId,
      {
        budgetId: fromBudgetId,
        allocated: newFromAllocated,
        notes: fromBudget.notes
          ? `${fromBudget.notes}\n${reallocationNote}`
          : reallocationNote,
      },
      approvedBy
    );

    if (!updatedFrom) {
      throw new Error("Failed to update source budget");
    }

    // Update destination budget
    const updatedTo = await updateBudget(
      sheets,
      spreadsheetId,
      {
        budgetId: toBudgetId,
        allocated: newToAllocated,
        notes: toBudget.notes
          ? `${toBudget.notes}\n${receiveNote}`
          : receiveNote,
      },
      approvedBy
    );

    if (!updatedTo) {
      // Attempt to rollback the source budget update
      await updateBudget(
        sheets,
        spreadsheetId,
        {
          budgetId: fromBudgetId,
          allocated: fromBudget.allocated,
          notes: fromBudget.notes
            ? `${fromBudget.notes}\n${reallocationNote}\nROLLBACK: Destination update failed on ${timestamp}`
            : `${reallocationNote}\nROLLBACK: Destination update failed on ${timestamp}`,
        },
        approvedBy
      );
      throw new Error("Failed to update destination budget (rolled back source)");
    }

    return {
      from: updatedFrom,
      to: updatedTo,
    };
  } catch (error) {
    throw new Error(
      `Failed to reallocate budget: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Allocate budget to a specific category
 *
 * Creates or updates budget allocation for a specific category within a program.
 * If a budget already exists for the programId + categoryId + fiscalYear combination,
 * the amount is added to the existing allocation. Otherwise, a new budget is created.
 *
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @param categoryId - Category ID (e.g., "labor", "materials")
 * @param amount - Amount to allocate
 * @param fiscalYear - Fiscal year (e.g., "FY2024")
 * @param allocatedBy - Person making the allocation
 * @returns Updated or created budget
 */
export async function allocateBudgetToCategory(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  categoryId: string,
  amount: number,
  fiscalYear: number,
  allocatedBy: string
): Promise<Budget> {
  try {
    // Validate input
    if (amount <= 0) {
      throw new Error("Allocation amount must be positive");
    }

    // Validate category exists and is active
    const categories = await listCategories(sheets, spreadsheetId, {
      active: true,
    });

    const category = categories.find((c) => c.code === categoryId);
    if (!category) {
      throw new Error(`Category ${categoryId} not found or is inactive`);
    }

    // Check if budget exists for this program + category + fiscal year
    const fiscalYearString = `FY${fiscalYear}`;
    const existingBudgets = await listBudgets(sheets, spreadsheetId, {
      programId,
      category: categoryId as BudgetCategory,
      fiscalYear: fiscalYearString,
    });

    const timestamp = new Date().toISOString();

    // If budget exists, update it
    if (existingBudgets.length > 0) {
      const existingBudget = existingBudgets[0]; // Take the first match

      // Check if budget is closed
      if (existingBudget.status === "closed") {
        throw new Error(
          `Cannot allocate to closed budget ${existingBudget.budgetId}`
        );
      }

      const newAllocated = existingBudget.allocated + amount;
      const allocationNote = `Added allocation of ${amount} ${existingBudget.currency} on ${timestamp}. Allocated by: ${allocatedBy}`;

      const updated = await updateBudget(
        sheets,
        spreadsheetId,
        {
          budgetId: existingBudget.budgetId,
          allocated: newAllocated,
          notes: existingBudget.notes
            ? `${existingBudget.notes}\n${allocationNote}`
            : allocationNote,
        },
        allocatedBy
      );

      if (!updated) {
        throw new Error("Failed to update existing budget");
      }

      return updated;
    }

    // Otherwise, create a new budget
    // Import createBudget at runtime to avoid circular dependency
    const { createBudget } = await import("./budgets.js");

    // Calculate period dates (start of fiscal year to end of fiscal year)
    const periodStart = new Date(fiscalYear, 9, 1); // Oct 1 of fiscal year
    const periodEnd = new Date(fiscalYear + 1, 8, 30); // Sep 30 of next year

    const newBudget = await createBudget(
      sheets,
      spreadsheetId,
      {
        programId,
        name: `${category.name} - ${fiscalYearString}`,
        description: `Budget allocation for ${category.name} category`,
        category: categoryId as BudgetCategory,
        allocated: amount,
        fiscalYear: fiscalYearString,
        periodStart,
        periodEnd,
        requestedBy: allocatedBy,
        approvedBy: allocatedBy,
        approvedDate: new Date(),
        currency: "USD",
        notes: `Initial allocation of ${amount} USD on ${timestamp}. Allocated by: ${allocatedBy}`,
      },
      allocatedBy
    );

    return newBudget;
  } catch (error) {
    throw new Error(
      `Failed to allocate budget to category: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get budget allocation summary for a program
 *
 * Provides a comprehensive summary of budget allocations, grouping by category
 * and calculating totals across all categories.
 *
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @param fiscalYear - Optional fiscal year filter
 * @returns Budget allocation summary
 */
export async function getBudgetAllocationSummary(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  fiscalYear?: number
): Promise<BudgetAllocationSummary> {
  try {
    // Build filters
    const filters: any = { programId };
    if (fiscalYear !== undefined) {
      filters.fiscalYear = `FY${fiscalYear}`;
    }

    // Get all budgets for the program
    const budgets = await listBudgets(sheets, spreadsheetId, filters);

    // Get all categories for name mapping
    const categories = await listCategories(sheets, spreadsheetId);
    const categoryMap = new Map(categories.map((c) => [c.code, c.name]));

    // Group by category
    const categoryTotals = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        allocated: number;
        committed: number;
        spent: number;
        remaining: number;
      }
    >();

    let totalAllocated = 0;
    let totalCommitted = 0;
    let totalSpent = 0;
    let totalRemaining = 0;

    for (const budget of budgets) {
      const categoryId = budget.category;
      const categoryName = categoryMap.get(categoryId) || categoryId;

      if (!categoryTotals.has(categoryId)) {
        categoryTotals.set(categoryId, {
          categoryId,
          categoryName,
          allocated: 0,
          committed: 0,
          spent: 0,
          remaining: 0,
        });
      }

      const categoryTotal = categoryTotals.get(categoryId)!;
      categoryTotal.allocated += budget.allocated;
      categoryTotal.committed += budget.committed;
      categoryTotal.spent += budget.spent;
      categoryTotal.remaining += budget.remaining;

      totalAllocated += budget.allocated;
      totalCommitted += budget.committed;
      totalSpent += budget.spent;
      totalRemaining += budget.remaining;
    }

    return {
      totalAllocated,
      totalCommitted,
      totalSpent,
      totalRemaining,
      byCategory: Array.from(categoryTotals.values()),
    };
  } catch (error) {
    throw new Error(
      `Failed to get budget allocation summary: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate budget allocation
 *
 * Checks whether a budget allocation is feasible based on various constraints
 * such as program-level limits, fiscal year constraints, and existing allocations.
 *
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - Spreadsheet ID
 * @param budgetId - Budget ID to validate
 * @param amountToAllocate - Amount to allocate
 * @returns Validation result with reason if invalid
 */
export async function validateBudgetAllocation(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  budgetId: string,
  amountToAllocate: number
): Promise<ValidationResult> {
  try {
    // Validate input
    if (amountToAllocate <= 0) {
      return {
        valid: false,
        reason: "Allocation amount must be positive",
      };
    }

    // Read the budget
    const budget = await readBudget(sheets, spreadsheetId, budgetId);

    if (!budget) {
      return {
        valid: false,
        reason: `Budget ${budgetId} not found`,
      };
    }

    // Check budget status
    if (budget.status === "closed") {
      return {
        valid: false,
        reason: `Budget ${budgetId} is closed and cannot accept new allocations`,
      };
    }

    // Check if budget period is valid
    const now = new Date();
    if (now > budget.periodEnd) {
      return {
        valid: false,
        reason: `Budget period has ended (${budget.periodEnd.toISOString().split("T")[0]})`,
      };
    }

    // Get program-level summary to check overall constraints
    const summary = await getBudgetAllocationSummary(
      sheets,
      spreadsheetId,
      budget.programId,
      parseInt(budget.fiscalYear.replace("FY", ""))
    );

    // Calculate new total if this allocation goes through
    const newProgramTotal = summary.totalAllocated + amountToAllocate;

    // Check for program-level constraints
    // This is a simplified check - you may want to add more sophisticated
    // validation based on program-level budget caps stored elsewhere
    const PROGRAM_BUDGET_WARNING_THRESHOLD = 10000000; // $10M example threshold

    if (newProgramTotal > PROGRAM_BUDGET_WARNING_THRESHOLD) {
      return {
        valid: false,
        reason: `Program-level budget allocation would exceed warning threshold of ${PROGRAM_BUDGET_WARNING_THRESHOLD}. Current total: ${summary.totalAllocated}, Requested: ${amountToAllocate}`,
      };
    }

    // Check for over-allocation warnings within the budget itself
    const newBudgetAllocated = budget.allocated + amountToAllocate;
    if (budget.spent > 0) {
      const utilizationRate = (budget.spent / budget.allocated) * 100;

      // If current utilization is very low, warn about over-allocation
      if (utilizationRate < 10 && newBudgetAllocated > budget.allocated * 2) {
        return {
          valid: false,
          reason: `Budget utilization is very low (${utilizationRate.toFixed(2)}%). Adding ${amountToAllocate} would more than double allocation. Consider reallocating from this budget instead.`,
        };
      }
    }

    // All validations passed
    return {
      valid: true,
    };
  } catch (error) {
    return {
      valid: false,
      reason: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Distribute remaining budget
 *
 * Takes the remaining budget from one budget item and distributes it proportionally
 * to other under-budget categories in the same program. Only distributes to categories
 * with negative variance (under budget).
 *
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @param budgetId - Source budget ID to distribute from
 * @param fiscalYear - Fiscal year
 * @param distributedBy - Person performing the distribution
 * @returns List of updated budgets
 */
export async function distributeRemainingBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  budgetId: string,
  fiscalYear: number,
  distributedBy: string
): Promise<Budget[]> {
  try {
    // Read source budget
    const sourceBudget = await readBudget(sheets, spreadsheetId, budgetId);

    if (!sourceBudget) {
      throw new Error(`Source budget ${budgetId} not found`);
    }

    if (sourceBudget.remaining <= 0) {
      throw new Error(
        `Source budget ${budgetId} has no remaining funds to distribute. Remaining: ${sourceBudget.remaining}`
      );
    }

    if (sourceBudget.status === "closed") {
      throw new Error(`Cannot distribute from closed budget ${budgetId}`);
    }

    // Get all budgets for the program in the same fiscal year
    const fiscalYearString = `FY${fiscalYear}`;
    const allBudgets = await listBudgets(sheets, spreadsheetId, {
      programId,
      fiscalYear: fiscalYearString,
    });

    // Filter for under-budget categories (variance < 0 means over budget, variance > 0 means under budget)
    // We want to distribute to categories that are spending less than allocated
    const underBudgetItems = allBudgets.filter(
      (b) =>
        b.budgetId !== budgetId && // Exclude source budget
        b.status !== "closed" && // Exclude closed budgets
        b.variance > 0 && // Has positive variance (under budget)
        b.allocated > 0 // Has some allocation
    );

    if (underBudgetItems.length === 0) {
      throw new Error(
        "No eligible under-budget categories found for distribution"
      );
    }

    // Calculate total variance of under-budget items for proportional distribution
    const totalVariance = underBudgetItems.reduce(
      (sum, b) => sum + b.variance,
      0
    );

    const amountToDistribute = sourceBudget.remaining;
    const timestamp = new Date().toISOString();
    const updatedBudgets: Budget[] = [];

    // Distribute proportionally based on variance
    for (const targetBudget of underBudgetItems) {
      // Calculate proportion
      const proportion = targetBudget.variance / totalVariance;
      const distributionAmount = Math.round(amountToDistribute * proportion * 100) / 100; // Round to 2 decimals

      if (distributionAmount <= 0) continue; // Skip if distribution amount is negligible

      // Update target budget
      const newAllocated = targetBudget.allocated + distributionAmount;
      const distributionNote = `Received ${distributionAmount} ${targetBudget.currency} distributed from ${budgetId} on ${timestamp}. Distributed by: ${distributedBy}`;

      const updated = await updateBudget(
        sheets,
        spreadsheetId,
        {
          budgetId: targetBudget.budgetId,
          allocated: newAllocated,
          notes: targetBudget.notes
            ? `${targetBudget.notes}\n${distributionNote}`
            : distributionNote,
        },
        distributedBy
      );

      if (updated) {
        updatedBudgets.push(updated);
      }
    }

    // Update source budget to set remaining to 0
    const sourceNote = `Distributed ${amountToDistribute} ${sourceBudget.currency} to ${updatedBudgets.length} budget(s) on ${timestamp}. Distributed by: ${distributedBy}`;

    const updatedSource = await updateBudget(
      sheets,
      spreadsheetId,
      {
        budgetId: sourceBudget.budgetId,
        allocated: sourceBudget.spent, // Set allocated to spent, making remaining = 0
        notes: sourceBudget.notes
          ? `${sourceBudget.notes}\n${sourceNote}`
          : sourceNote,
      },
      distributedBy
    );

    if (updatedSource) {
      updatedBudgets.unshift(updatedSource); // Add source budget to the front
    }

    return updatedBudgets;
  } catch (error) {
    throw new Error(
      `Failed to distribute remaining budget: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Freeze budget
 *
 * Marks a budget as "frozen" by changing its status to "closed".
 * This prevents further allocations or expenses against the budget.
 *
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - Spreadsheet ID
 * @param budgetId - Budget ID to freeze
 * @param frozenBy - Person freezing the budget
 * @returns Updated budget or null if not found
 */
export async function freezeBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  budgetId: string,
  frozenBy: string
): Promise<Budget | null> {
  try {
    const budget = await readBudget(sheets, spreadsheetId, budgetId);

    if (!budget) {
      return null;
    }

    if (budget.status === "closed") {
      // Already frozen
      return budget;
    }

    const timestamp = new Date().toISOString();
    const freezeNote = `Budget frozen on ${timestamp}. Frozen by: ${frozenBy}`;

    const updated = await updateBudget(
      sheets,
      spreadsheetId,
      {
        budgetId,
        status: "closed",
        notes: budget.notes ? `${budget.notes}\n${freezeNote}` : freezeNote,
      },
      frozenBy
    );

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to freeze budget: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Unfreeze budget
 *
 * Changes budget status from "closed" back to "active", allowing
 * further allocations or expenses.
 *
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - Spreadsheet ID
 * @param budgetId - Budget ID to unfreeze
 * @param unfrozenBy - Person unfreezing the budget
 * @returns Updated budget or null if not found
 */
export async function unfreezeBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  budgetId: string,
  unfrozenBy: string
): Promise<Budget | null> {
  try {
    const budget = await readBudget(sheets, spreadsheetId, budgetId);

    if (!budget) {
      return null;
    }

    if (budget.status !== "closed") {
      // Not frozen, return as is
      return budget;
    }

    const timestamp = new Date().toISOString();
    const unfreezeNote = `Budget unfrozen on ${timestamp}. Unfrozen by: ${unfrozenBy}`;

    const updated = await updateBudget(
      sheets,
      spreadsheetId,
      {
        budgetId,
        status: "active",
        notes: budget.notes ? `${budget.notes}\n${unfreezeNote}` : unfreezeNote,
      },
      unfrozenBy
    );

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to unfreeze budget: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
