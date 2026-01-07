/**
 * Transaction Reconciliation Module
 *
 * Reconciles transactions with cash flows and budgets to ensure data integrity and accuracy.
 * Provides automated matching, discrepancy detection, and comprehensive reporting.
 */

import type { sheets_v4 } from "googleapis";
import type { FinancialTransaction, TransactionType } from "./transactions.js";
import type { CashFlow } from "../types/financial.js";
import type { Budget } from "../types/financial.js";
import {
  listTransactions,
  reconcileTransaction,
  getUnreconciledTransactions,
} from "./transactions.js";
import {
  listCashFlows,
  recordActualCashFlow,
  readCashFlow,
  updateCashFlow,
} from "../cashflow/cashflow.js";
import { readBudget, listBudgets } from "../budgets/budgets.js";

/**
 * Reconciliation Result for Transaction-CashFlow Match
 */
export interface ReconciliationResult {
  transaction: FinancialTransaction;
  cashFlow: CashFlow;
  matched: boolean;
  variance: number;
}

/**
 * Auto-Reconciliation Report
 */
export interface AutoReconciliationReport {
  reconciledCount: number;
  unmatchedTransactions: FinancialTransaction[];
  unmatchedCashFlows: CashFlow[];
  report: string;
}

/**
 * Budget Reconciliation Result
 */
export interface BudgetReconciliationResult {
  transaction: FinancialTransaction;
  budgetMatch: boolean;
  budgetId: string | null;
  variance: number;
  notes: string;
}

/**
 * Discrepancy Report
 */
export interface DiscrepancyReport {
  duplicateTransactions: FinancialTransaction[][];
  orphanedTransactions: FinancialTransaction[];
  mismatchedAmounts: Array<{
    transaction: FinancialTransaction;
    cashFlow: CashFlow;
    variance: number;
  }>;
  summary: string;
}

/**
 * Reconciliation Report
 */
export interface ReconciliationReport {
  period: {
    start: Date;
    end: Date;
  };
  totalTransactions: number;
  reconciledTransactions: number;
  unreconciledTransactions: number;
  reconciliationRate: number;
  discrepancies: number;
  status: "clean" | "review_needed" | "action_required";
  recommendations: string[];
}

/**
 * Budget Allocation Reconciliation Result
 */
export interface BudgetAllocationReconciliationResult {
  budgetId: string;
  allocatedAmount: number;
  committedAmount: number;
  transactionTotal: number;
  variance: number;
  reconciled: boolean;
  issues: string[];
}

/**
 * Bulk Reconciliation Result
 */
export interface BulkReconciliationResult {
  successCount: number;
  failureCount: number;
  errors: Array<{
    transactionId: string;
    error: string;
  }>;
}

/**
 * Reconcile a transaction with a cash flow entry
 * Matches transaction to cash flow and calculates variance
 *
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - ID of the financial spreadsheet
 * @param transactionId - ID of the transaction to reconcile
 * @param flowId - ID of the cash flow to match against
 * @param reconciledBy - User performing the reconciliation
 * @returns Reconciliation result with variance and match status
 */
export async function reconcileTransactionWithCashFlow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  transactionId: string,
  flowId: string,
  reconciledBy: string
): Promise<ReconciliationResult> {
  try {
    // Read transaction
    const transactions = await listTransactions(sheets, spreadsheetId, {});
    const transaction = transactions.find((t) => t.transactionId === transactionId);

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Read cash flow
    const cashFlow = await readCashFlow(sheets, spreadsheetId, flowId);

    if (!cashFlow) {
      throw new Error(`Cash flow ${flowId} not found`);
    }

    // Calculate variance between transaction and cash flow
    const variance = Math.abs(transaction.amount - cashFlow.amount);

    // Consider matched if variance < $1.00
    const matched = variance < 1.0;

    // If matched, reconcile both
    if (matched) {
      // Reconcile transaction
      await reconcileTransaction(
        sheets,
        spreadsheetId,
        transactionId,
        reconciledBy
      );

      // Update cash flow to mark as reconciled
      await updateCashFlow(
        sheets,
        spreadsheetId,
        {
          flowId,
          notes: cashFlow.notes
            ? `${cashFlow.notes}\nReconciled with transaction ${transactionId} by ${reconciledBy} on ${new Date().toISOString()}`
            : `Reconciled with transaction ${transactionId} by ${reconciledBy} on ${new Date().toISOString()}`,
        },
        reconciledBy
      );

      // Update transaction with reconciled status
      const reconciledTransaction = {
        ...transaction,
        reconciled: true,
        reconciledDate: new Date(),
        reconciledBy,
      };

      return {
        transaction: reconciledTransaction,
        cashFlow,
        matched: true,
        variance,
      };
    }

    return {
      transaction,
      cashFlow,
      matched: false,
      variance,
    };
  } catch (error) {
    throw new Error(
      `Failed to reconcile transaction with cash flow: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Automatically reconcile transactions with cash flows
 * Uses fuzzy matching: date within 3 days, amount within $10, type match
 *
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - ID of the financial spreadsheet
 * @param programId - Program ID to reconcile
 * @param reconciledBy - User performing the reconciliation
 * @returns Auto-reconciliation report with counts and unmatched items
 */
export async function autoReconcileTransactions(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  reconciledBy: string
): Promise<AutoReconciliationReport> {
  try {
    // Get unreconciled transactions for the program
    const unreconciledTransactions = await getUnreconciledTransactions(
      sheets,
      spreadsheetId,
      programId
    );

    // Get all cash flows for the program (not completed)
    const allCashFlows = await listCashFlows(sheets, spreadsheetId, {
      programId,
    });

    // Filter to unreconciled cash flows (no "Reconciled with" in notes)
    const unreconciledCashFlows = allCashFlows.filter(
      (cf) =>
        cf.status !== "cancelled" &&
        (!cf.notes || !cf.notes.includes("Reconciled with transaction"))
    );

    let reconciledCount = 0;
    const matchedTransactionIds = new Set<string>();
    const matchedCashFlowIds = new Set<string>();

    // Try to match each transaction to a cash flow
    for (const transaction of unreconciledTransactions) {
      if (matchedTransactionIds.has(transaction.transactionId)) {
        continue;
      }

      for (const cashFlow of unreconciledCashFlows) {
        if (matchedCashFlowIds.has(cashFlow.flowId)) {
          continue;
        }

        // Check type match: expense=outflow, revenue=inflow
        const typeMatch =
          (transaction.type === "expense" && cashFlow.type === "outflow") ||
          (transaction.type === "revenue" && cashFlow.type === "inflow");

        if (!typeMatch) {
          continue;
        }

        // Check date within 3 days
        const dateDiff = Math.abs(
          transaction.transactionDate.getTime() -
            cashFlow.forecastDate.getTime()
        );
        const daysDiff = dateDiff / (1000 * 60 * 60 * 24);

        if (daysDiff > 3) {
          continue;
        }

        // Check amount within $10
        const amountDiff = Math.abs(transaction.amount - cashFlow.amount);

        if (amountDiff > 10) {
          continue;
        }

        // Match found - reconcile both
        try {
          await reconcileTransactionWithCashFlow(
            sheets,
            spreadsheetId,
            transaction.transactionId,
            cashFlow.flowId,
            reconciledBy
          );

          reconciledCount++;
          matchedTransactionIds.add(transaction.transactionId);
          matchedCashFlowIds.add(cashFlow.flowId);
          break; // Move to next transaction
        } catch (error) {
          // Log error but continue with other matches
          console.error(
            `Error reconciling ${transaction.transactionId} with ${cashFlow.flowId}:`,
            error
          );
        }
      }
    }

    // Calculate unmatched items
    const unmatchedTransactions = unreconciledTransactions.filter(
      (t) => !matchedTransactionIds.has(t.transactionId)
    );

    const unmatchedCashFlows = unreconciledCashFlows.filter(
      (cf) => !matchedCashFlowIds.has(cf.flowId)
    );

    // Generate report
    const report = `Auto-Reconciliation Report for Program ${programId}
=============================================================

Summary:
- Reconciled: ${reconciledCount} transaction-cashflow pairs
- Unmatched Transactions: ${unmatchedTransactions.length}
- Unmatched Cash Flows: ${unmatchedCashFlows.length}

Matching Criteria:
- Date variance: ±3 days
- Amount variance: ±$10
- Type match: expense↔outflow, revenue↔inflow

Unmatched Transactions:
${unmatchedTransactions.map((t) => `  - ${t.transactionId}: ${t.description} ($${t.amount}) on ${t.transactionDate.toISOString().split("T")[0]}`).join("\n") || "  None"}

Unmatched Cash Flows:
${unmatchedCashFlows.map((cf) => `  - ${cf.flowId}: ${cf.description} ($${cf.amount}) on ${cf.forecastDate.toISOString().split("T")[0]}`).join("\n") || "  None"}

Next Steps:
${unmatchedTransactions.length > 0 ? "- Review unmatched transactions for manual reconciliation" : ""}
${unmatchedCashFlows.length > 0 ? "- Review unmatched cash flows for manual reconciliation" : ""}
${reconciledCount === 0 ? "- No automatic matches found - manual review required" : ""}
`;

    return {
      reconciledCount,
      unmatchedTransactions,
      unmatchedCashFlows,
      report,
    };
  } catch (error) {
    throw new Error(
      `Failed to auto-reconcile transactions: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Reconcile a transaction with its budget allocation
 * Verifies transaction is properly allocated and budget has sufficient funds
 *
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - ID of the financial spreadsheet
 * @param transactionId - ID of the transaction to reconcile
 * @param reconciledBy - User performing the reconciliation
 * @returns Budget reconciliation result with variance and notes
 */
export async function reconcileTransactionWithBudget(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  transactionId: string,
  reconciledBy: string
): Promise<BudgetReconciliationResult> {
  try {
    // Read transaction
    const transactions = await listTransactions(sheets, spreadsheetId, {});
    const transaction = transactions.find((t) => t.transactionId === transactionId);

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Check if budget ID exists on transaction
    if (!transaction.budgetId) {
      return {
        transaction,
        budgetMatch: false,
        budgetId: null,
        variance: 0,
        notes: "Transaction has no budget allocation",
      };
    }

    // Read budget
    const budget = await readBudget(
      sheets,
      spreadsheetId,
      transaction.budgetId
    );

    if (!budget) {
      return {
        transaction,
        budgetMatch: false,
        budgetId: transaction.budgetId,
        variance: 0,
        notes: `Budget ${transaction.budgetId} not found - invalid budget reference`,
      };
    }

    // Get all transactions for this budget
    const budgetTransactions = await listTransactions(sheets, spreadsheetId, {
      budgetId: budget.budgetId,
    });

    // Calculate total of all transactions for this budget
    const transactionTotal = budgetTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );

    // Calculate variance between budget.spent and transaction total
    const variance = Math.abs(budget.spent - transactionTotal);

    // Check if budget has sufficient allocated amount
    const hasCapacity = budget.allocated >= transactionTotal;

    const notes = hasCapacity
      ? `Budget has sufficient allocation. Total transactions: $${transactionTotal.toFixed(2)}, Allocated: $${budget.allocated.toFixed(2)}, Remaining: $${(budget.allocated - transactionTotal).toFixed(2)}`
      : `Budget exceeded! Total transactions: $${transactionTotal.toFixed(2)}, Allocated: $${budget.allocated.toFixed(2)}, Over by: $${(transactionTotal - budget.allocated).toFixed(2)}`;

    return {
      transaction,
      budgetMatch: true,
      budgetId: budget.budgetId,
      variance,
      notes:
        variance > 1.0
          ? `${notes}. Warning: Budget.spent ($${budget.spent.toFixed(2)}) differs from transaction total by $${variance.toFixed(2)}`
          : notes,
    };
  } catch (error) {
    throw new Error(
      `Failed to reconcile transaction with budget: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Identify reconciliation discrepancies
 * Finds duplicates, orphaned transactions, and amount mismatches
 *
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - ID of the financial spreadsheet
 * @param programId - Program ID to analyze
 * @returns Comprehensive discrepancy report
 */
export async function identifyReconciliationDiscrepancies(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<DiscrepancyReport> {
  try {
    // Get all transactions for the program
    const allTransactions = await listTransactions(sheets, spreadsheetId, {
      programId,
    });

    // Get all cash flows for the program
    const allCashFlows = await listCashFlows(sheets, spreadsheetId, {
      programId,
    });

    // Find duplicate transactions (same amount, date, description)
    const duplicateTransactions: FinancialTransaction[][] = [];
    const processedIds = new Set<string>();

    for (let i = 0; i < allTransactions.length; i++) {
      const t1 = allTransactions[i];
      if (processedIds.has(t1.transactionId)) continue;

      const duplicates: FinancialTransaction[] = [t1];

      for (let j = i + 1; j < allTransactions.length; j++) {
        const t2 = allTransactions[j];
        if (processedIds.has(t2.transactionId)) continue;

        // Check if duplicate
        if (
          Math.abs(t1.amount - t2.amount) < 0.01 &&
          t1.transactionDate.toISOString().split("T")[0] ===
            t2.transactionDate.toISOString().split("T")[0] &&
          t1.description === t2.description
        ) {
          duplicates.push(t2);
          processedIds.add(t2.transactionId);
        }
      }

      if (duplicates.length > 1) {
        duplicateTransactions.push(duplicates);
        processedIds.add(t1.transactionId);
      }
    }

    // Find orphaned transactions (no budgetId or invalid budgetId)
    const orphanedTransactions: FinancialTransaction[] = [];

    for (const transaction of allTransactions) {
      if (!transaction.budgetId) {
        orphanedTransactions.push(transaction);
        continue;
      }

      // Check if budget exists
      const budget = await readBudget(
        sheets,
        spreadsheetId,
        transaction.budgetId
      );

      if (!budget) {
        orphanedTransactions.push(transaction);
      }
    }

    // Find mismatched amounts between reconciled transactions and cash flows
    const mismatchedAmounts: Array<{
      transaction: FinancialTransaction;
      cashFlow: CashFlow;
      variance: number;
    }> = [];

    for (const transaction of allTransactions) {
      if (!transaction.reconciled) continue;

      // Try to find matching cash flow
      for (const cashFlow of allCashFlows) {
        // Check if this cash flow is linked to this transaction
        if (
          cashFlow.notes &&
          cashFlow.notes.includes(`Reconciled with transaction ${transaction.transactionId}`)
        ) {
          const variance = Math.abs(transaction.amount - cashFlow.amount);

          // Report if variance > $1.00
          if (variance > 1.0) {
            mismatchedAmounts.push({
              transaction,
              cashFlow,
              variance,
            });
          }
          break;
        }
      }
    }

    // Generate summary
    const summary = `Reconciliation Discrepancy Report for Program ${programId}
================================================================

Duplicate Transactions: ${duplicateTransactions.length} sets (${duplicateTransactions.reduce((sum, group) => sum + group.length, 0)} transactions total)
${duplicateTransactions.map((group, idx) => `  Set ${idx + 1}: ${group.map((t) => t.transactionId).join(", ")} - ${group[0].description} ($${group[0].amount})`).join("\n") || "  None"}

Orphaned Transactions: ${orphanedTransactions.length}
${orphanedTransactions.map((t) => `  - ${t.transactionId}: ${t.description} ($${t.amount}) - ${!t.budgetId ? "No budget assigned" : "Invalid budget reference"}`).join("\n") || "  None"}

Mismatched Amounts: ${mismatchedAmounts.length}
${mismatchedAmounts.map((m) => `  - ${m.transaction.transactionId} ↔ ${m.cashFlow.flowId}: Variance $${m.variance.toFixed(2)}`).join("\n") || "  None"}

Total Discrepancies: ${duplicateTransactions.reduce((sum, group) => sum + group.length, 0) + orphanedTransactions.length + mismatchedAmounts.length}
`;

    return {
      duplicateTransactions,
      orphanedTransactions,
      mismatchedAmounts,
      summary,
    };
  } catch (error) {
    throw new Error(
      `Failed to identify reconciliation discrepancies: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate comprehensive reconciliation report for a period
 * Analyzes reconciliation status and provides recommendations
 *
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - ID of the financial spreadsheet
 * @param programId - Program ID to report on
 * @param periodStart - Optional start date for the period
 * @param periodEnd - Optional end date for the period
 * @returns Detailed reconciliation report
 */
export async function generateReconciliationReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  periodStart?: Date,
  periodEnd?: Date
): Promise<ReconciliationReport> {
  try {
    // Default to last 30 days if no period specified
    const end = periodEnd || new Date();
    const start =
      periodStart ||
      new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all transactions for the period
    const allTransactions = await listTransactions(sheets, spreadsheetId, {
      programId,
      startDate: start,
      endDate: end,
    });

    const totalTransactions = allTransactions.length;
    const reconciledTransactions = allTransactions.filter(
      (t) => t.reconciled
    ).length;
    const unreconciledTransactions = totalTransactions - reconciledTransactions;

    // Calculate reconciliation rate
    const reconciliationRate =
      totalTransactions > 0
        ? (reconciledTransactions / totalTransactions) * 100
        : 100;

    // Identify discrepancies
    const discrepancies = await identifyReconciliationDiscrepancies(
      sheets,
      spreadsheetId,
      programId
    );

    const discrepancyCount =
      discrepancies.duplicateTransactions.reduce(
        (sum, group) => sum + group.length,
        0
      ) +
      discrepancies.orphanedTransactions.length +
      discrepancies.mismatchedAmounts.length;

    // Determine status
    let status: "clean" | "review_needed" | "action_required";
    if (reconciliationRate >= 95 && discrepancyCount === 0) {
      status = "clean";
    } else if (reconciliationRate >= 80 && discrepancyCount <= 5) {
      status = "review_needed";
    } else {
      status = "action_required";
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (unreconciledTransactions > 0) {
      recommendations.push(
        `Reconcile ${unreconciledTransactions} outstanding transactions`
      );
    }

    if (discrepancies.duplicateTransactions.length > 0) {
      recommendations.push(
        `Review and resolve ${discrepancies.duplicateTransactions.length} sets of duplicate transactions`
      );
    }

    if (discrepancies.orphanedTransactions.length > 0) {
      recommendations.push(
        `Assign budgets to ${discrepancies.orphanedTransactions.length} orphaned transactions`
      );
    }

    if (discrepancies.mismatchedAmounts.length > 0) {
      recommendations.push(
        `Investigate ${discrepancies.mismatchedAmounts.length} amount mismatches between transactions and cash flows`
      );
    }

    if (reconciliationRate < 80) {
      recommendations.push(
        "Implement daily reconciliation process to maintain >95% reconciliation rate"
      );
    }

    if (reconciliationRate >= 95 && discrepancyCount === 0) {
      recommendations.push("Maintain current reconciliation practices");
    }

    if (totalTransactions > 100 && reconciliationRate < 90) {
      recommendations.push(
        "Consider using auto-reconciliation to improve efficiency"
      );
    }

    return {
      period: {
        start,
        end,
      },
      totalTransactions,
      reconciledTransactions,
      unreconciledTransactions,
      reconciliationRate,
      discrepancies: discrepancyCount,
      status,
      recommendations,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate reconciliation report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Reconcile all transactions for a specific budget
 * Verifies budget totals match transaction totals
 *
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - ID of the financial spreadsheet
 * @param budgetId - Budget ID to reconcile
 * @param reconciledBy - User performing the reconciliation
 * @returns Budget allocation reconciliation result
 */
export async function reconcileBudgetAllocations(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  budgetId: string,
  reconciledBy: string
): Promise<BudgetAllocationReconciliationResult> {
  try {
    // Read budget
    const budget = await readBudget(sheets, spreadsheetId, budgetId);

    if (!budget) {
      throw new Error(`Budget ${budgetId} not found`);
    }

    // Get all transactions for this budget
    const transactions = await listTransactions(sheets, spreadsheetId, {
      budgetId,
    });

    // Calculate total of all transactions
    const transactionTotal = transactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );

    // Calculate variance
    const variance = Math.abs(budget.spent - transactionTotal);

    // Check if reconciled (variance < $1.00)
    const reconciled = variance < 1.0;

    // Identify issues
    const issues: string[] = [];

    if (!reconciled) {
      issues.push(
        `Budget.spent ($${budget.spent.toFixed(2)}) differs from transaction total ($${transactionTotal.toFixed(2)}) by $${variance.toFixed(2)}`
      );
    }

    if (budget.spent > budget.allocated) {
      issues.push(
        `Budget overspent: Spent $${budget.spent.toFixed(2)} exceeds allocated $${budget.allocated.toFixed(2)}`
      );
    }

    if (transactionTotal > budget.allocated) {
      issues.push(
        `Transaction total ($${transactionTotal.toFixed(2)}) exceeds allocated amount ($${budget.allocated.toFixed(2)})`
      );
    }

    // Check for transactions with zero or negative amounts
    const invalidTransactions = transactions.filter(
      (t) => t.amount <= 0 && t.type !== "adjustment"
    );

    if (invalidTransactions.length > 0) {
      issues.push(
        `Found ${invalidTransactions.length} transactions with zero or negative amounts`
      );
    }

    // Check for unreconciled transactions
    const unreconciledCount = transactions.filter((t) => !t.reconciled).length;

    if (unreconciledCount > 0) {
      issues.push(
        `${unreconciledCount} of ${transactions.length} transactions are not reconciled`
      );
    }

    return {
      budgetId,
      allocatedAmount: budget.allocated,
      committedAmount: budget.committed,
      transactionTotal,
      variance,
      reconciled,
      issues,
    };
  } catch (error) {
    throw new Error(
      `Failed to reconcile budget allocations: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Bulk reconcile multiple transactions
 * Attempts to reconcile each transaction and tracks successes/failures
 *
 * @param sheets - Google Sheets API client
 * @param spreadsheetId - ID of the financial spreadsheet
 * @param transactionIds - Array of transaction IDs to reconcile
 * @param reconciledBy - User performing the reconciliation
 * @returns Bulk reconciliation result with success/failure counts
 */
export async function bulkReconcile(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  transactionIds: string[],
  reconciledBy: string
): Promise<BulkReconciliationResult> {
  let successCount = 0;
  let failureCount = 0;
  const errors: Array<{ transactionId: string; error: string }> = [];

  for (const transactionId of transactionIds) {
    try {
      await reconcileTransaction(
        sheets,
        spreadsheetId,
        transactionId,
        reconciledBy
      );
      successCount++;
    } catch (error) {
      failureCount++;
      errors.push({
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    successCount,
    failureCount,
    errors,
  };
}
