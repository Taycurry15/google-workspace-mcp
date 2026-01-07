/**
 * Transaction Reconciliation Module Tests
 *
 * Tests transaction/cash flow reconciliation, auto-matching,
 * budget reconciliation, discrepancy detection, and bulk workflows.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  reconcileTransactionWithCashFlow,
  autoReconcileTransactions,
  reconcileTransactionWithBudget,
  identifyReconciliationDiscrepancies,
  generateReconciliationReport,
  reconcileBudgetAllocations,
  bulkReconcile,
} from "../../src/transactions/reconciliation.js";
import * as reconciliationModule from "../../src/transactions/reconciliation.js";
import * as transactionsModule from "../../src/transactions/transactions.js";
import * as cashflowModule from "../../src/cashflow/cashflow.js";
import * as budgetsModule from "../../src/budgets/budgets.js";
import { createMockSheetsClient } from "@gw-mcp/shared-core/test-utils";
import type {
  FinancialTransaction,
  TransactionType,
} from "../../src/transactions/transactions.js";
import type { CashFlow } from "../../src/types/financial.js";
import type { Budget } from "../../src/types/financial.js";

jest
  .spyOn(console, "error")
  .mockImplementation(() => undefined as unknown as void);

const TEST_SPREADSHEET_ID = "test-spreadsheet-id";
const TEST_PROGRAM_ID = "PROG-TEST-001";
const TEST_USER = "tester@example.com";

const createTransaction = (
  overrides: Partial<FinancialTransaction> = {}
): FinancialTransaction => ({
  transactionId: "TXN-001",
  programId: TEST_PROGRAM_ID,
  projectId: "PROJ-001",
  type: "expense" as TransactionType,
  category: "labor",
  amount: 1000,
  currency: "USD",
  transactionDate: new Date("2026-01-10T00:00:00.000Z"),
  description: "Test transaction",
  budgetId: "BUD-001",
  invoiceId: "INV-001",
  contractId: "CON-001",
  vendorId: "VEND-001",
  paymentMethod: "wire",
  reference: "REF-001",
  reconciled: false,
  reconciledDate: undefined,
  reconciledBy: undefined,
  notes: "",
  createdDate: new Date("2026-01-01T00:00:00.000Z"),
  createdBy: "tester",
  modifiedDate: new Date("2026-01-02T00:00:00.000Z"),
  modifiedBy: "tester",
  ...overrides,
});

const createCashFlow = (
  overrides: Partial<CashFlow> = {}
): CashFlow => ({
  flowId: "CF-001",
  programId: TEST_PROGRAM_ID,
  type: "outflow",
  category: "vendor_payment",
  description: "Test cash flow",
  amount: 1000,
  currency: "USD",
  forecastDate: new Date("2026-01-11T00:00:00.000Z"),
  actualDate: undefined,
  status: "scheduled",
  invoiceId: "INV-001",
  contractId: "CON-001",
  budgetId: "BUD-001",
  paymentMethod: "wire",
  paymentReference: "PAY-001",
  createdDate: new Date("2026-01-01T00:00:00.000Z"),
  createdBy: "tester",
  lastModified: new Date("2026-01-02T00:00:00.000Z"),
  notes: "",
  ...overrides,
});

const createBudget = (overrides: Partial<Budget> = {}): Budget => ({
  budgetId: "BUD-001",
  programId: TEST_PROGRAM_ID,
  name: "Labor Budget",
  description: "Budget for testing",
  category: "labor",
  status: "active",
  allocated: 10000,
  committed: 4000,
  spent: 3500,
  remaining: 6500,
  fiscalYear: "2026",
  periodStart: new Date("2026-01-01T00:00:00.000Z"),
  periodEnd: new Date("2026-12-31T00:00:00.000Z"),
  variance: 6500,
  variancePercent: 65,
  requestedBy: "requester",
  approvedBy: "approver",
  approvedDate: new Date("2026-01-05T00:00:00.000Z"),
  currency: "USD",
  createdDate: new Date("2026-01-01T00:00:00.000Z"),
  createdBy: "tester",
  lastModified: new Date("2026-01-02T00:00:00.000Z"),
  notes: "",
  ...overrides,
});

describe("Transaction Reconciliation Module", () => {
  let mockSheets: ReturnType<typeof createMockSheetsClient>;
  let listTransactionsMock: jest.SpiedFunction<typeof transactionsModule.listTransactions>;
  let reconcileTransactionMock: jest.SpiedFunction<typeof transactionsModule.reconcileTransaction>;
  let getUnreconciledTransactionsMock: jest.SpiedFunction<typeof transactionsModule.getUnreconciledTransactions>;
  let listCashFlowsMock: jest.SpiedFunction<typeof cashflowModule.listCashFlows>;
  let readCashFlowMock: jest.SpiedFunction<typeof cashflowModule.readCashFlow>;
  let updateCashFlowMock: jest.SpiedFunction<typeof cashflowModule.updateCashFlow>;
  let readBudgetMock: jest.SpiedFunction<typeof budgetsModule.readBudget>;

  beforeEach(() => {
    mockSheets = createMockSheetsClient();

    listTransactionsMock = jest
      .spyOn(transactionsModule, "listTransactions")
      .mockResolvedValue([]);
    reconcileTransactionMock = jest
      .spyOn(transactionsModule, "reconcileTransaction")
      .mockResolvedValue(null);
    getUnreconciledTransactionsMock = jest
      .spyOn(transactionsModule, "getUnreconciledTransactions")
      .mockResolvedValue([]);
    listCashFlowsMock = jest
      .spyOn(cashflowModule, "listCashFlows")
      .mockResolvedValue([]);
    readCashFlowMock = jest
      .spyOn(cashflowModule, "readCashFlow")
      .mockResolvedValue(null);
    updateCashFlowMock = jest
      .spyOn(cashflowModule, "updateCashFlow")
      .mockResolvedValue(null);
    readBudgetMock = jest
      .spyOn(budgetsModule, "readBudget")
      .mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("reconcileTransactionWithCashFlow", () => {
    it("should reconcile matching transaction and cash flow pairs", async () => {
      const transaction = createTransaction();
      const cashFlow = createCashFlow();

      listTransactionsMock.mockResolvedValueOnce([transaction]);
      readCashFlowMock.mockResolvedValueOnce(cashFlow);

      const result = await reconcileTransactionWithCashFlow(
        mockSheets,
        TEST_SPREADSHEET_ID,
        transaction.transactionId,
        cashFlow.flowId,
        TEST_USER
      );

      expect(result.matched).toBe(true);
      expect(result.variance).toBe(0);
      expect(reconcileTransactionMock).toHaveBeenCalledWith(
        mockSheets,
        TEST_SPREADSHEET_ID,
        transaction.transactionId,
        TEST_USER
      );
      expect(updateCashFlowMock).toHaveBeenCalled();
      const updateArgs = updateCashFlowMock.mock.calls[0][2];
      expect(updateArgs.notes).toContain(transaction.transactionId);
    });

    it("should throw when transaction does not exist", async () => {
      listTransactionsMock.mockResolvedValueOnce([]);

      await expect(
        reconcileTransactionWithCashFlow(
          mockSheets,
          TEST_SPREADSHEET_ID,
          "TXN-404",
          "CF-001",
          TEST_USER
        )
      ).rejects.toThrow("Transaction TXN-404 not found");
    });
  });

  describe("autoReconcileTransactions", () => {
    it("should match transactions when tolerance criteria are met", async () => {
      const transaction = createTransaction({
        transactionId: "TXN-555",
        transactionDate: new Date("2026-01-10T00:00:00.000Z"),
      });
      const cashFlow = createCashFlow({
        flowId: "CF-555",
        amount: transaction.amount - 2,
        forecastDate: new Date("2026-01-11T00:00:00.000Z"),
      });

      getUnreconciledTransactionsMock.mockResolvedValueOnce([transaction]);
      listCashFlowsMock.mockResolvedValueOnce([cashFlow]);

      listTransactionsMock.mockResolvedValueOnce([transaction]);
      readCashFlowMock.mockResolvedValueOnce(cashFlow);

      const report = await autoReconcileTransactions(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        TEST_USER
      );

      expect(report.reconciledCount).toBe(1);
      expect(report.unmatchedTransactions).toHaveLength(0);
      expect(report.unmatchedCashFlows).toHaveLength(0);
    });

    it("should return unmatched items when no pairs satisfy criteria", async () => {
      const transaction = createTransaction({
        transactionId: "TXN-777",
        type: "expense",
      });
      const cashFlow = createCashFlow({
        type: "inflow",
      });

      getUnreconciledTransactionsMock.mockResolvedValueOnce([transaction]);
      listCashFlowsMock.mockResolvedValueOnce([cashFlow]);

      const reconcileSpy = jest.spyOn(
        reconciliationModule,
        "reconcileTransactionWithCashFlow"
      );

      const report = await autoReconcileTransactions(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        TEST_USER
      );

      expect(report.reconciledCount).toBe(0);
      expect(report.unmatchedTransactions).toHaveLength(1);
      expect(report.unmatchedCashFlows).toHaveLength(1);
      expect(reconcileSpy).not.toHaveBeenCalled();
      reconcileSpy.mockRestore();
    });
  });

  describe("reconcileTransactionWithBudget", () => {
    it("should note when no budget allocation exists", async () => {
      const transaction = createTransaction({
        transactionId: "TXN-200",
        budgetId: undefined,
      });
      listTransactionsMock.mockResolvedValueOnce([transaction]);

      const result = await reconcileTransactionWithBudget(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "TXN-200",
        TEST_USER
      );

      expect(result.budgetMatch).toBe(false);
      expect(result.notes).toContain("no budget allocation");
      expect(readBudgetMock).not.toHaveBeenCalled();
    });

    it("should compare totals and include variance warning", async () => {
      const transaction = createTransaction({
        transactionId: "TXN-201",
        budgetId: "BUD-001",
      });
      listTransactionsMock
        .mockResolvedValueOnce([transaction])
        .mockResolvedValueOnce([
          transaction,
          createTransaction({
            transactionId: "TXN-202",
            budgetId: "BUD-001",
            amount: 6000,
          }),
        ]);
      readBudgetMock.mockResolvedValueOnce(
        createBudget({ spent: 2000, allocated: 10000 })
      );

      const result = await reconcileTransactionWithBudget(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "TXN-201",
        TEST_USER
      );

      expect(result.budgetMatch).toBe(true);
      expect(result.variance).toBe(5000);
      expect(result.notes).toContain("Warning");
    });
  });

  describe("identifyReconciliationDiscrepancies", () => {
    it("should identify duplicates, orphaned transactions, and mismatches", async () => {
      const duplicateA = createTransaction({
        transactionId: "TXN-300",
        amount: 500,
        description: "Duplicate entry",
        transactionDate: new Date("2026-01-05"),
      });
      const duplicateB = createTransaction({
        transactionId: "TXN-301",
        amount: 500,
        description: "Duplicate entry",
        transactionDate: new Date("2026-01-05"),
      });
      const orphan = createTransaction({
        transactionId: "TXN-302",
        budgetId: undefined,
        description: "No budget",
      });
      const reconciled = createTransaction({
        transactionId: "TXN-303",
        reconciled: true,
        amount: 800,
        description: "Mismatched",
      });

      listTransactionsMock.mockResolvedValueOnce([
        duplicateA,
        duplicateB,
        orphan,
        reconciled,
      ]);
      readBudgetMock.mockImplementation(async (_s, _id, budgetId) => {
        if (budgetId === "BUD-001") {
          return createBudget();
        }
        return null;
      });
      listCashFlowsMock.mockResolvedValueOnce([
        createCashFlow({
          flowId: "CF-800",
          amount: 700,
          notes: `Reconciled with transaction ${reconciled.transactionId}`,
        }),
      ]);

      const report = await identifyReconciliationDiscrepancies(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID
      );

      expect(report.duplicateTransactions).toHaveLength(1);
      expect(report.orphanedTransactions).toHaveLength(1);
      expect(report.mismatchedAmounts).toHaveLength(1);
      expect(report.summary).toContain("Reconciliation Discrepancy Report");
    });
  });

  describe("generateReconciliationReport", () => {
    it("should summarize reconciliation health and recommendations", async () => {
      const reconciled = createTransaction({
        transactionId: "TXN-400",
        reconciled: true,
      });
      const unreconciled = createTransaction({
        transactionId: "TXN-401",
        reconciled: false,
      });

      listTransactionsMock.mockResolvedValueOnce([reconciled, unreconciled]);

      const discrepancySpy = jest
        .spyOn(reconciliationModule, "identifyReconciliationDiscrepancies")
        .mockResolvedValue({
          duplicateTransactions: [[reconciled, unreconciled]],
          orphanedTransactions: [unreconciled],
          mismatchedAmounts: [],
          summary: "Test summary",
        });

      const report = await generateReconciliationReport(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        new Date("2026-01-01"),
        new Date("2026-01-31")
      );

      expect(report.totalTransactions).toBe(2);
      expect(report.reconciledTransactions).toBe(1);
      expect(report.status).toBe("action_required");
      expect(report.recommendations.length).toBeGreaterThanOrEqual(2);
      discrepancySpy.mockRestore();
    });
  });

  describe("reconcileBudgetAllocations", () => {
    it("should identify issues when spent totals diverge from transactions", async () => {
      const budget = createBudget({ spent: 9000, allocated: 8000 });
      const budgetTransactions = [
        createTransaction({
          transactionId: "TXN-500",
          amount: 4000,
          reconciled: true,
        }),
        createTransaction({
          transactionId: "TXN-501",
          amount: 3000,
          reconciled: false,
        }),
        createTransaction({
          transactionId: "TXN-502",
          amount: 0,
          reconciled: false,
        }),
      ];

      readBudgetMock.mockResolvedValueOnce(budget);
      listTransactionsMock.mockResolvedValueOnce(budgetTransactions);

      const result = await reconcileBudgetAllocations(
        mockSheets,
        TEST_SPREADSHEET_ID,
        budget.budgetId,
        TEST_USER
      );

      expect(result.reconciled).toBe(false);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.stringContaining("differs"),
          expect.stringContaining("Budget overspent"),
          expect.stringContaining("zero or negative amounts"),
          expect.stringContaining("not reconciled"),
        ])
      );
    });
  });

  describe("bulkReconcile", () => {
    it("should track successes and failures per transaction", async () => {
      reconcileTransactionMock
        .mockResolvedValueOnce(
          createTransaction({ transactionId: "TXN-600", reconciled: true })
        )
        .mockRejectedValueOnce(new Error("Failure"));

      const result = await bulkReconcile(
        mockSheets,
        TEST_SPREADSHEET_ID,
        ["TXN-600", "TXN-601"],
        TEST_USER
      );

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.errors[0].transactionId).toBe("TXN-601");
      expect(reconcileTransactionMock).toHaveBeenCalledTimes(2);
    });
  });
});
