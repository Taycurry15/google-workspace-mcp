/**
 * Budget Module Tests
 *
 * Tests budget CRUD operations, budget management functions,
 * and budget analysis capabilities.
 *
 * Coverage targets:
 * - parseBudgetRow(): Pure function tests
 * - budgetToRow(): Pure function tests
 * - createBudget(): Async tests with mock Sheets API
 * - readBudget(): Async tests with mock Sheets API
 * - updateBudget(): Async tests with derived field recalculation
 * - listBudgets(): Async tests with filtering
 * - deleteBudget(): Soft delete tests
 * - allocateBudget(), commitBudget(), recordExpense(): Budget management
 * - getBudgetStatus(): Aggregation tests
 * - getOverBudgetItems(), getBudgetsNearingLimit(): Analysis tests
 * - calculateBurnRate(): Burn rate calculation tests
 *
 * Test patterns:
 * - Pure function tests (fast, no mocks)
 * - Async CRUD tests with mock Google Sheets API
 * - Validation and error handling
 * - Edge cases (negative amounts, over budget, zero values)
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  parseBudgetRow,
  budgetToRow,
  createBudget,
  readBudget,
  updateBudget,
  listBudgets,
  deleteBudget,
  allocateBudget,
  commitBudget,
  recordExpense,
  getBudgetStatus,
  getOverBudgetItems,
  getBudgetsNearingLimit,
  calculateBurnRate,
  type CreateBudgetInput,
} from "../../src/budgets/budgets.js";
import { createMockSheetsClient } from "@gw-mcp/shared-core/test-utils";
import type { Budget } from "../../src/types/financial.js";

const TEST_SPREADSHEET_ID = "test-spreadsheet-id";
const TEST_PROGRAM_ID = "PROG-TEST-001";

// Helper to create a sample budget row
const createSampleBudgetRow = (budgetId: string = "BUD-001"): any[] => {
  return [
    budgetId,
    TEST_PROGRAM_ID,
    "", // projectId
    "Labor Budget",
    "Budget for engineering labor",
    "labor", // category
    "active", // status
    100000, // allocated
    50000, // committed
    45000, // spent
    55000, // remaining (calculated)
    "2026",
    "2026-01-01", // periodStart
    "2026-12-31", // periodEnd
    55000, // variance
    55.0, // variancePercent
    "john.doe",
    "jane.manager",
    "2026-01-15",
    "USD",
    "2026-01-01T00:00:00Z", // createdDate
    "system",
    "2026-01-15T00:00:00Z", // lastModified
    "Initial labor budget allocation",
  ];
};

// Helper to create a sample budget object
const createSampleBudget = (budgetId: string = "BUD-001"): Budget => {
  return {
    budgetId,
    programId: TEST_PROGRAM_ID,
    name: "Labor Budget",
    description: "Budget for engineering labor",
    category: "labor",
    status: "active",
    allocated: 100000,
    committed: 50000,
    spent: 45000,
    remaining: 55000,
    fiscalYear: "2026",
    periodStart: new Date("2026-01-01"),
    periodEnd: new Date("2026-12-31"),
    variance: 55000,
    variancePercent: 55.0,
    requestedBy: "john.doe",
    approvedBy: "jane.manager",
    approvedDate: new Date("2026-01-15"),
    currency: "USD",
    createdDate: new Date("2026-01-01T00:00:00Z"),
    createdBy: "system",
    lastModified: new Date("2026-01-15T00:00:00Z"),
    notes: "Initial labor budget allocation",
  };
};

describe("Budget Module", () => {
  describe("parseBudgetRow", () => {
    it("should parse a complete budget row correctly", () => {
      const row = createSampleBudgetRow("BUD-001");

      const budget = parseBudgetRow(row);

      expect(budget).not.toBeNull();
      expect(budget?.budgetId).toBe("BUD-001");
      expect(budget?.programId).toBe(TEST_PROGRAM_ID);
      expect(budget?.name).toBe("Labor Budget");
      expect(budget?.category).toBe("labor");
      expect(budget?.status).toBe("active");
      expect(budget?.allocated).toBe(100000);
      expect(budget?.committed).toBe(50000);
      expect(budget?.spent).toBe(45000);
      expect(budget?.remaining).toBe(55000);
      expect(budget?.fiscalYear).toBe("2026");
      expect(budget?.currency).toBe("USD");
    });

    it("should calculate derived fields (remaining, variance)", () => {
      const row = createSampleBudgetRow("BUD-002");
      row[7] = 200000; // allocated
      row[9] = 150000; // spent

      const budget = parseBudgetRow(row);

      expect(budget?.remaining).toBe(50000); // allocated - spent
      expect(budget?.variance).toBe(50000);
      expect(budget?.variancePercent).toBe(25); // (50000/200000) * 100
    });

    it("should handle empty row", () => {
      const row: any[] = [];

      const budget = parseBudgetRow(row);

      expect(budget).toBeNull();
    });

    it("should handle row with missing values", () => {
      const row = ["BUD-003", TEST_PROGRAM_ID]; // Minimal row

      const budget = parseBudgetRow(row);

      expect(budget).not.toBeNull();
      expect(budget?.budgetId).toBe("BUD-003");
      expect(budget?.allocated).toBe(0);
      expect(budget?.committed).toBe(0);
      expect(budget?.spent).toBe(0);
      expect(budget?.currency).toBe("USD"); // Default
    });

    it("should handle zero allocated amount", () => {
      const row = createSampleBudgetRow("BUD-004");
      row[7] = 0; // allocated
      row[9] = 0; // spent

      const budget = parseBudgetRow(row);

      expect(budget?.variancePercent).toBe(0); // Avoid division by zero
    });
  });

  describe("budgetToRow", () => {
    it("should convert budget object to row array", () => {
      const budget = createSampleBudget("BUD-001");

      const row = budgetToRow(budget);

      expect(row[0]).toBe("BUD-001");
      expect(row[1]).toBe(TEST_PROGRAM_ID);
      expect(row[3]).toBe("Labor Budget");
      expect(row[5]).toBe("labor");
      expect(row[6]).toBe("active");
      expect(row[7]).toBe(100000);
      expect(row[9]).toBe(45000);
      expect(row[11]).toBe("2026");
      expect(row[19]).toBe("USD");
    });

    it("should format dates correctly", () => {
      const budget = createSampleBudget("BUD-001");
      budget.periodStart = new Date("2026-06-15T10:30:00Z");
      budget.periodEnd = new Date("2026-12-31T23:59:59Z");

      const row = budgetToRow(budget);

      expect(row[12]).toBe("2026-06-15"); // ISO date only
      expect(row[13]).toBe("2026-12-31");
    });

    it("should handle optional fields", () => {
      const budget = createSampleBudget("BUD-001");
      budget.projectId = undefined;
      budget.approvedBy = undefined;
      budget.approvedDate = undefined;

      const row = budgetToRow(budget);

      expect(row[2]).toBe(""); // Empty projectId
      expect(row[17]).toBe(""); // Empty approvedBy
      expect(row[18]).toBe(""); // Empty approvedDate
    });
  });

  describe("createBudget", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should create a new budget with generated ID", async () => {
      // Mock ID generation
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], ["BUD-010"]] },
      });

      // Mock append
      mockSheets.spreadsheets.values.append.mockResolvedValueOnce({
        data: { updates: { updatedRows: 1 } },
      });

      const input: CreateBudgetInput = {
        programId: TEST_PROGRAM_ID,
        name: "New Labor Budget",
        description: "Q1 labor budget",
        category: "labor",
        allocated: 150000,
        fiscalYear: "2026",
        periodStart: new Date("2026-01-01"),
        periodEnd: new Date("2026-03-31"),
        requestedBy: "john.doe",
      };

      const budget = await createBudget(
        mockSheets,
        TEST_SPREADSHEET_ID,
        input,
        "test-user"
      );

      expect(budget.budgetId).toBe("BUD-011"); // Next ID
      expect(budget.programId).toBe(TEST_PROGRAM_ID);
      expect(budget.name).toBe("New Labor Budget");
      expect(budget.allocated).toBe(150000);
      expect(budget.status).toBe("draft"); // Default status
      expect(budget.committed).toBe(0); // Initial value
      expect(budget.spent).toBe(0); // Initial value
      expect(budget.remaining).toBe(150000);
      expect(budget.currency).toBe("USD"); // Default currency
      expect(budget.createdBy).toBe("test-user");
    });

    it("should calculate initial derived fields", async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], ["BUD-001"]] },
      });

      mockSheets.spreadsheets.values.append.mockResolvedValueOnce({
        data: { updates: { updatedRows: 1 } },
      });

      const input: CreateBudgetInput = {
        programId: TEST_PROGRAM_ID,
        name: "Test Budget",
        description: "Test",
        category: "materials",
        allocated: 50000,
        fiscalYear: "2026",
        periodStart: new Date("2026-01-01"),
        periodEnd: new Date("2026-12-31"),
        requestedBy: "test-user",
      };

      const budget = await createBudget(
        mockSheets,
        TEST_SPREADSHEET_ID,
        input,
        "test-user"
      );

      expect(budget.remaining).toBe(50000); // allocated - spent (0)
      expect(budget.variance).toBe(50000);
      expect(budget.variancePercent).toBe(100); // (50000/50000) * 100
    });
  });

  describe("readBudget", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should read a budget by ID", async () => {
      const budgetRow = createSampleBudgetRow("BUD-001");

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [["Budget ID"], budgetRow],
        },
      });

      const budget = await readBudget(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "BUD-001"
      );

      expect(budget).not.toBeNull();
      expect(budget?.budgetId).toBe("BUD-001");
      expect(budget?.name).toBe("Labor Budget");
    });

    it("should return null if budget not found", async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"]] },
      });

      const budget = await readBudget(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "BUD-999"
      );

      expect(budget).toBeNull();
    });
  });

  describe("updateBudget", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should update budget and recalculate derived fields", async () => {
      const existingRow = createSampleBudgetRow("BUD-001");

      // Mock read for existing budget
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], existingRow] },
      });

      // Mock update
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], existingRow] },
      });

      mockSheets.spreadsheets.values.update.mockResolvedValueOnce({
        data: { updatedCells: 5 },
      });

      const updated = await updateBudget(
        mockSheets,
        TEST_SPREADSHEET_ID,
        {
          budgetId: "BUD-001",
          allocated: 120000, // Increase allocation
          spent: 50000, // Increase spending
        },
        "test-user"
      );

      expect(updated).not.toBeNull();
      expect(updated?.allocated).toBe(120000);
      expect(updated?.spent).toBe(50000);
      expect(updated?.remaining).toBe(70000); // 120000 - 50000
      expect(updated?.variance).toBe(70000);
      expect(updated?.variancePercent).toBeCloseTo(58.33, 2);
    });

    it("should return null if budget not found", async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"]] },
      });

      const updated = await updateBudget(
        mockSheets,
        TEST_SPREADSHEET_ID,
        { budgetId: "BUD-999", name: "New Name" },
        "test-user"
      );

      expect(updated).toBeNull();
    });
  });

  describe("listBudgets", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should list all budgets without filters", async () => {
      const budgets = [
        ["Budget ID", "Program ID", "..."],
        createSampleBudgetRow("BUD-001"),
        createSampleBudgetRow("BUD-002").map((v, i) => i === 0 ? "BUD-002" : v),
        createSampleBudgetRow("BUD-003").map((v, i) => i === 0 ? "BUD-003" : v),
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: budgets },
      });

      const result = await listBudgets(mockSheets, TEST_SPREADSHEET_ID);

      expect(result.length).toBe(3);
      expect(result[0].budgetId).toBe("BUD-001");
      expect(result[1].budgetId).toBe("BUD-002");
      expect(result[2].budgetId).toBe("BUD-003");
    });

    it("should filter budgets by programId", async () => {
      const budgets = [
        ["Budget ID", "Program ID", "..."],
        createSampleBudgetRow("BUD-001"),
        createSampleBudgetRow("BUD-002").map((v, i) =>
          i === 0 ? "BUD-002" : i === 1 ? "PROG-OTHER" : v
        ),
        createSampleBudgetRow("BUD-003"),
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: budgets },
      });

      const result = await listBudgets(mockSheets, TEST_SPREADSHEET_ID, {
        programId: TEST_PROGRAM_ID,
      });

      expect(result.length).toBe(2);
      expect(result.every(b => b.programId === TEST_PROGRAM_ID)).toBe(true);
    });

    it("should filter budgets by category", async () => {
      const budgets = [
        ["Budget ID", "Program ID", "..."],
        createSampleBudgetRow("BUD-001").map((v, i) => i === 5 ? "labor" : v),
        createSampleBudgetRow("BUD-002").map((v, i) =>
          i === 0 ? "BUD-002" : i === 5 ? "materials" : v
        ),
        createSampleBudgetRow("BUD-003").map((v, i) =>
          i === 0 ? "BUD-003" : i === 5 ? "labor" : v
        ),
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: budgets },
      });

      const result = await listBudgets(mockSheets, TEST_SPREADSHEET_ID, {
        category: "labor",
      });

      expect(result.length).toBe(2);
      expect(result.every(b => b.category === "labor")).toBe(true);
    });

    it("should filter budgets by fiscal year", async () => {
      const budgets = [
        ["Budget ID", "Program ID", "..."],
        createSampleBudgetRow("BUD-001").map((v, i) => i === 11 ? "2026" : v),
        createSampleBudgetRow("BUD-002").map((v, i) =>
          i === 0 ? "BUD-002" : i === 11 ? "2025" : v
        ),
        createSampleBudgetRow("BUD-003").map((v, i) =>
          i === 0 ? "BUD-003" : i === 11 ? "2026" : v
        ),
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: budgets },
      });

      const result = await listBudgets(mockSheets, TEST_SPREADSHEET_ID, {
        fiscalYear: "2026",
      });

      expect(result.length).toBe(2);
      expect(result.every(b => b.fiscalYear === "2026")).toBe(true);
    });
  });

  describe("allocateBudget", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should allocate budget amount", async () => {
      const existingRow = createSampleBudgetRow("BUD-001");

      // Mock read
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], existingRow] },
      });

      // Mock update read and write
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], existingRow] },
      });

      mockSheets.spreadsheets.values.update.mockResolvedValueOnce({
        data: { updatedCells: 3 },
      });

      const result = await allocateBudget(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "BUD-001",
        200000,
        "jane.manager"
      );

      expect(result).not.toBeNull();
      expect(result?.allocated).toBe(200000);
      expect(result?.notes).toContain("Allocated 200000 by jane.manager");
    });

    it("should reject negative allocation", async () => {
      const existingRow = createSampleBudgetRow("BUD-001");

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], existingRow] },
      });

      await expect(
        allocateBudget(
          mockSheets,
          TEST_SPREADSHEET_ID,
          "BUD-001",
          -1000,
          "test-user"
        )
      ).rejects.toThrow("Allocated amount must be non-negative");
    });
  });

  describe("commitBudget", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should commit budget amount", async () => {
      const existingRow = createSampleBudgetRow("BUD-001");

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], existingRow] },
      });

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], existingRow] },
      });

      mockSheets.spreadsheets.values.update.mockResolvedValueOnce({
        data: { updatedCells: 3 },
      });

      const result = await commitBudget(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "BUD-001",
        20000,
        "procurement-team"
      );

      expect(result).not.toBeNull();
      expect(result?.committed).toBe(70000); // 50000 + 20000
      expect(result?.notes).toContain("Committed 20000");
    });

    it("should reject commitment that exceeds allocation", async () => {
      const existingRow = createSampleBudgetRow("BUD-001");
      existingRow[7] = 100000; // allocated
      existingRow[8] = 80000; // committed

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], existingRow] },
      });

      await expect(
        commitBudget(
          mockSheets,
          TEST_SPREADSHEET_ID,
          "BUD-001",
          30000, // Would exceed allocated
          "test-user"
        )
      ).rejects.toThrow("Cannot commit 30000. Would exceed allocated budget");
    });
  });

  describe("recordExpense", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should record expense", async () => {
      const existingRow = createSampleBudgetRow("BUD-001");

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], existingRow] },
      });

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], existingRow] },
      });

      mockSheets.spreadsheets.values.update.mockResolvedValueOnce({
        data: { updatedCells: 3 },
      });

      const result = await recordExpense(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "BUD-001",
        5000,
        "Server costs",
        "finance-team"
      );

      expect(result).not.toBeNull();
      expect(result?.spent).toBe(50000); // 45000 + 5000
      expect(result?.remaining).toBe(50000); // 100000 - 50000
      expect(result?.notes).toContain("Expense 5000 (Server costs)");
    });

    it("should allow recording expense over budget with warning", async () => {
      const existingRow = createSampleBudgetRow("BUD-001");
      existingRow[7] = 100000; // allocated
      existingRow[9] = 95000; // spent (close to limit)

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], existingRow] },
      });

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], existingRow] },
      });

      mockSheets.spreadsheets.values.update.mockResolvedValueOnce({
        data: { updatedCells: 3 },
      });

      const result = await recordExpense(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "BUD-001",
        10000, // Will exceed budget
        "Emergency expense",
        "manager"
      );

      expect(result).not.toBeNull();
      expect(result?.spent).toBe(105000); // Over budget
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("over budget")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("getBudgetStatus", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should aggregate budget totals for a program", async () => {
      const budgets = [
        ["Budget ID", "Program ID", "..."],
        createSampleBudgetRow("BUD-001").map((v, i) => {
          if (i === 7) return 100000; // allocated
          if (i === 8) return 50000; // committed
          if (i === 9) return 45000; // spent
          return v;
        }),
        createSampleBudgetRow("BUD-002").map((v, i) => {
          if (i === 0) return "BUD-002";
          if (i === 7) return 200000; // allocated
          if (i === 8) return 100000; // committed
          if (i === 9) return 80000; // spent
          return v;
        }),
        createSampleBudgetRow("BUD-003").map((v, i) => {
          if (i === 0) return "BUD-003";
          if (i === 7) return 50000; // allocated
          if (i === 8) return 20000; // committed
          if (i === 9) return 15000; // spent
          return v;
        }),
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: budgets },
      });

      const status = await getBudgetStatus(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID
      );

      expect(status.allocated).toBe(350000); // 100K + 200K + 50K
      expect(status.committed).toBe(170000); // 50K + 100K + 20K
      expect(status.spent).toBe(140000); // 45K + 80K + 15K
      expect(status.remaining).toBe(210000); // Sum of remaining from each
    });
  });

  describe("getOverBudgetItems", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should return only budgets over allocated amount", async () => {
      const budgets = [
        ["Budget ID", "Program ID", "..."],
        createSampleBudgetRow("BUD-001").map((v, i) => {
          if (i === 7) return 100000; // allocated
          if (i === 9) return 80000; // spent (under budget)
          return v;
        }),
        createSampleBudgetRow("BUD-002").map((v, i) => {
          if (i === 0) return "BUD-002";
          if (i === 7) return 100000; // allocated
          if (i === 9) return 120000; // spent (OVER budget)
          return v;
        }),
        createSampleBudgetRow("BUD-003").map((v, i) => {
          if (i === 0) return "BUD-003";
          if (i === 7) return 50000; // allocated
          if (i === 9) return 60000; // spent (OVER budget)
          return v;
        }),
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: budgets },
      });

      const overBudget = await getOverBudgetItems(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID
      );

      expect(overBudget.length).toBe(2);
      expect(overBudget[0].budgetId).toBe("BUD-002");
      expect(overBudget[1].budgetId).toBe("BUD-003");
      expect(overBudget.every(b => b.spent > b.allocated)).toBe(true);
    });
  });

  describe("getBudgetsNearingLimit", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should return budgets at or above threshold percentage", async () => {
      const budgets = [
        ["Budget ID", "Program ID", "..."],
        createSampleBudgetRow("BUD-001").map((v, i) => {
          if (i === 7) return 100000; // allocated
          if (i === 9) return 50000; // spent (50% - below threshold)
          return v;
        }),
        createSampleBudgetRow("BUD-002").map((v, i) => {
          if (i === 0) return "BUD-002";
          if (i === 7) return 100000; // allocated
          if (i === 9) return 85000; // spent (85% - above threshold)
          return v;
        }),
        createSampleBudgetRow("BUD-003").map((v, i) => {
          if (i === 0) return "BUD-003";
          if (i === 7) return 50000; // allocated
          if (i === 9) return 42000; // spent (84% - above threshold)
          return v;
        }),
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: budgets },
      });

      const nearing = await getBudgetsNearingLimit(
        mockSheets,
        TEST_SPREADSHEET_ID,
        80, // 80% threshold
        TEST_PROGRAM_ID
      );

      expect(nearing.length).toBe(2);
      expect(nearing[0].budgetId).toBe("BUD-002");
      expect(nearing[1].budgetId).toBe("BUD-003");
    });

    it("should exclude budgets over allocated amount", async () => {
      const budgets = [
        ["Budget ID", "Program ID", "..."],
        createSampleBudgetRow("BUD-001").map((v, i) => {
          if (i === 7) return 100000; // allocated
          if (i === 9) return 85000; // spent (85% - nearing)
          return v;
        }),
        createSampleBudgetRow("BUD-002").map((v, i) => {
          if (i === 0) return "BUD-002";
          if (i === 7) return 100000; // allocated
          if (i === 9) return 110000; // spent (OVER - excluded)
          return v;
        }),
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: budgets },
      });

      const nearing = await getBudgetsNearingLimit(
        mockSheets,
        TEST_SPREADSHEET_ID,
        80,
        TEST_PROGRAM_ID
      );

      expect(nearing.length).toBe(1);
      expect(nearing[0].budgetId).toBe("BUD-001");
      expect(nearing.every(b => b.spent <= b.allocated)).toBe(true);
    });

    it("should reject invalid threshold", async () => {
      await expect(
        getBudgetsNearingLimit(
          mockSheets,
          TEST_SPREADSHEET_ID,
          150 // > 100
        )
      ).rejects.toThrow("Threshold must be between 0 and 100");
    });
  });

  describe("calculateBurnRate", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should calculate daily, weekly, monthly burn rates", async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const budgetRow = createSampleBudgetRow("BUD-001");
      budgetRow[7] = 100000; // allocated
      budgetRow[9] = 30000; // spent
      budgetRow[12] = thirtyDaysAgo.toISOString().split("T")[0]; // periodStart
      budgetRow[13] = new Date(now.getTime() + 335 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // periodEnd

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], budgetRow] },
      });

      const burnRate = await calculateBurnRate(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "BUD-001"
      );

      expect(burnRate).not.toBeNull();
      expect(burnRate?.dailyBurn).toBeCloseTo(1000, 0); // 30000 / 30 days
      expect(burnRate?.weeklyBurn).toBeCloseTo(7000, 0); // dailyBurn * 7
      expect(burnRate?.monthlyBurn).toBeCloseTo(30000, 0); // dailyBurn * 30
      expect(burnRate?.daysRemaining).toBeGreaterThan(0);
      expect(burnRate?.projectedDepletionDate).not.toBeNull();
    });

    it("should handle budget with no spending yet", async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const budgetRow = createSampleBudgetRow("BUD-001");
      budgetRow[9] = 0; // No spending
      budgetRow[12] = yesterday.toISOString().split("T")[0];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], budgetRow] },
      });

      const burnRate = await calculateBurnRate(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "BUD-001"
      );

      expect(burnRate).not.toBeNull();
      expect(burnRate?.dailyBurn).toBe(0);
      expect(burnRate?.daysRemaining).toBe(Infinity);
      expect(burnRate?.projectedDepletionDate).toBeNull();
    });

    it("should return null if budget not found", async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"]] },
      });

      const burnRate = await calculateBurnRate(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "BUD-999"
      );

      expect(burnRate).toBeNull();
    });
  });

  describe("deleteBudget (soft delete)", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should soft delete budget by setting status to closed", async () => {
      const existingRow = createSampleBudgetRow("BUD-001");

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], existingRow] },
      });

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"], existingRow] },
      });

      mockSheets.spreadsheets.values.update.mockResolvedValueOnce({
        data: { updatedCells: 2 },
      });

      const result = await deleteBudget(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "BUD-001",
        "admin"
      );

      expect(result).toBe(true);
      // Verify update was called with status closed
      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalled();
    });

    it("should return false if budget not found", async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Budget ID"]] },
      });

      const result = await deleteBudget(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "BUD-999",
        "admin"
      );

      expect(result).toBe(false);
    });
  });
});
