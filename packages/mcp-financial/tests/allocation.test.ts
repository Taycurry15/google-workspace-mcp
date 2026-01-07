/**
 * Budget Allocation Module Tests
 *
 * Demonstrates usage patterns for the budget allocation management functions
 */

import type { sheets_v4 } from "googleapis";
import {
  reallocateBudget,
  allocateBudgetToCategory,
  getBudgetAllocationSummary,
  validateBudgetAllocation,
  distributeRemainingBudget,
  freezeBudget,
  unfreezeBudget,
} from "../src/budgets/allocation.js";

/**
 * Example: Reallocate budget between two budgets
 */
async function exampleReallocateBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
) {
  try {
    const result = await reallocateBudget(
      sheets,
      spreadsheetId,
      "BUD-001", // From budget
      "BUD-002", // To budget
      50000, // Amount
      "Increased priority for materials procurement", // Reason
      "john.smith@example.com" // Approved by
    );

    console.log("Reallocation successful:");
    console.log(`From budget: ${result.from.budgetId} - New allocated: ${result.from.allocated}`);
    console.log(`To budget: ${result.to.budgetId} - New allocated: ${result.to.allocated}`);
  } catch (error) {
    console.error("Reallocation failed:", error);
  }
}

/**
 * Example: Allocate budget to a category
 */
async function exampleAllocateBudgetToCategory(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
) {
  try {
    const budget = await allocateBudgetToCategory(
      sheets,
      spreadsheetId,
      "PROG-001", // Program ID
      "labor", // Category ID
      250000, // Amount
      2024, // Fiscal year
      "jane.doe@example.com" // Allocated by
    );

    console.log("Budget allocation successful:");
    console.log(`Budget ID: ${budget.budgetId}`);
    console.log(`Allocated: ${budget.allocated}`);
    console.log(`Category: ${budget.category}`);
  } catch (error) {
    console.error("Allocation failed:", error);
  }
}

/**
 * Example: Get budget allocation summary
 */
async function exampleGetBudgetAllocationSummary(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
) {
  try {
    const summary = await getBudgetAllocationSummary(
      sheets,
      spreadsheetId,
      "PROG-001", // Program ID
      2024 // Fiscal year (optional)
    );

    console.log("Budget Allocation Summary:");
    console.log(`Total Allocated: $${summary.totalAllocated.toLocaleString()}`);
    console.log(`Total Committed: $${summary.totalCommitted.toLocaleString()}`);
    console.log(`Total Spent: $${summary.totalSpent.toLocaleString()}`);
    console.log(`Total Remaining: $${summary.totalRemaining.toLocaleString()}`);
    console.log("\nBy Category:");

    for (const category of summary.byCategory) {
      console.log(`\n${category.categoryName}:`);
      console.log(`  Allocated: $${category.allocated.toLocaleString()}`);
      console.log(`  Spent: $${category.spent.toLocaleString()}`);
      console.log(`  Remaining: $${category.remaining.toLocaleString()}`);
    }
  } catch (error) {
    console.error("Failed to get summary:", error);
  }
}

/**
 * Example: Validate budget allocation
 */
async function exampleValidateBudgetAllocation(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
) {
  try {
    const validation = await validateBudgetAllocation(
      sheets,
      spreadsheetId,
      "BUD-001", // Budget ID
      100000 // Amount to allocate
    );

    if (validation.valid) {
      console.log("Budget allocation is valid and can proceed");
    } else {
      console.log("Budget allocation is invalid:");
      console.log(`Reason: ${validation.reason}`);
    }
  } catch (error) {
    console.error("Validation failed:", error);
  }
}

/**
 * Example: Distribute remaining budget
 */
async function exampleDistributeRemainingBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
) {
  try {
    const updatedBudgets = await distributeRemainingBudget(
      sheets,
      spreadsheetId,
      "PROG-001", // Program ID
      "BUD-001", // Source budget ID
      2024, // Fiscal year
      "admin@example.com" // Distributed by
    );

    console.log(`Successfully distributed budget to ${updatedBudgets.length} budgets:`);
    for (const budget of updatedBudgets) {
      console.log(`- ${budget.budgetId}: ${budget.name} - Allocated: $${budget.allocated}`);
    }
  } catch (error) {
    console.error("Distribution failed:", error);
  }
}

/**
 * Example: Freeze and unfreeze budget
 */
async function exampleFreezeBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
) {
  try {
    // Freeze budget
    const frozenBudget = await freezeBudget(
      sheets,
      spreadsheetId,
      "BUD-001",
      "manager@example.com"
    );

    if (frozenBudget) {
      console.log(`Budget ${frozenBudget.budgetId} frozen. Status: ${frozenBudget.status}`);
    }

    // Unfreeze budget
    const unfrozenBudget = await unfreezeBudget(
      sheets,
      spreadsheetId,
      "BUD-001",
      "manager@example.com"
    );

    if (unfrozenBudget) {
      console.log(`Budget ${unfrozenBudget.budgetId} unfrozen. Status: ${unfrozenBudget.status}`);
    }
  } catch (error) {
    console.error("Freeze/unfreeze failed:", error);
  }
}

/**
 * Example: Complete budget allocation workflow
 */
async function exampleCompleteWorkflow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
) {
  try {
    console.log("=== Budget Allocation Workflow Example ===\n");

    // Step 1: Allocate budget to categories
    console.log("Step 1: Allocating budgets to categories...");
    const laborBudget = await allocateBudgetToCategory(
      sheets,
      spreadsheetId,
      "PROG-001",
      "labor",
      500000,
      2024,
      "cfo@example.com"
    );
    console.log(`✓ Labor budget allocated: ${laborBudget.budgetId}\n`);

    // Step 2: Get allocation summary
    console.log("Step 2: Getting allocation summary...");
    const summary = await getBudgetAllocationSummary(
      sheets,
      spreadsheetId,
      "PROG-001",
      2024
    );
    console.log(`✓ Total allocated: $${summary.totalAllocated.toLocaleString()}\n`);

    // Step 3: Validate allocation
    console.log("Step 3: Validating new allocation...");
    const validation = await validateBudgetAllocation(
      sheets,
      spreadsheetId,
      laborBudget.budgetId,
      50000
    );
    console.log(`✓ Validation result: ${validation.valid ? "Valid" : "Invalid"}\n`);

    // Step 4: Reallocate funds if needed
    if (validation.valid) {
      console.log("Step 4: Reallocating funds between budgets...");
      // Note: Assumes BUD-002 exists
      const reallocation = await reallocateBudget(
        sheets,
        spreadsheetId,
        laborBudget.budgetId,
        "BUD-002",
        25000,
        "Balancing budget across categories",
        "cfo@example.com"
      );
      console.log(`✓ Reallocated $25,000 from ${reallocation.from.budgetId} to ${reallocation.to.budgetId}\n`);
    }

    console.log("=== Workflow Complete ===");
  } catch (error) {
    console.error("Workflow failed:", error);
  }
}

export {
  exampleReallocateBudget,
  exampleAllocateBudgetToCategory,
  exampleGetBudgetAllocationSummary,
  exampleValidateBudgetAllocation,
  exampleDistributeRemainingBudget,
  exampleFreezeBudget,
  exampleCompleteWorkflow,
};
