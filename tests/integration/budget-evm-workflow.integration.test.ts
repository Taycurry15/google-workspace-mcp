/**
 * Budget → EVM workflow integration test (Week 5).
 *
 * Uses an in-memory Sheets client to exercise multiple financial modules:
 *  - createBudget populates sheet rows
 *  - recordExpense updates spent amount
 *  - performEVMCalculation aggregates BAC/AC from the same sheet data
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import type { sheets_v4 } from "googleapis";
import {
  createBudget,
  recordExpense,
  readBudget,
} from "../../packages/mcp-financial/src/budgets/budgets.js";
import { performEVMCalculation } from "../../packages/mcp-financial/src/evm/calculations.js";

type SheetStore = Map<string, any[][]>;

function parseRange(range: string): { sheet: string; startRow?: number } {
  const [sheet, coords] = range.split("!");
  if (!coords) {
    return { sheet };
  }

  const rowMatch = coords.match(/([A-Z]+)(\d+)/);
  if (rowMatch) {
    return { sheet, startRow: parseInt(rowMatch[2], 10) };
  }

  return { sheet };
}

function createInMemorySheetsClient(
  store: SheetStore
): sheets_v4.Sheets {
  return {
    spreadsheets: {
      values: {
        get: async (params: any) => {
          const { sheet, startRow } = parseRange(params.range);
          const key = `${params.spreadsheetId}:${sheet}`;
          const rows = store.get(key) || [];
          const values =
            typeof startRow === "number" ? rows.slice(startRow - 1) : rows;
          return { data: { values } };
        },
        append: async (params: any) => {
          const { sheet } = parseRange(params.range);
          const key = `${params.spreadsheetId}:${sheet}`;
          const rows = store.get(key) || [];
          const nextRows = [...rows, ...params.requestBody.values];
          store.set(key, nextRows);
          return {
            data: {
              updates: {
                updatedRange: `${sheet}!A${rows.length + 1}`,
              },
            },
          };
        },
        update: async (params: any) => {
          const { sheet } = parseRange(params.range);
          const key = `${params.spreadsheetId}:${sheet}`;
          store.set(key, params.requestBody.values);
          return { data: { updatedRange: params.range } };
        },
        batchGet: async () => ({ data: { valueRanges: [] } }),
        batchUpdate: async () => ({ data: { totalUpdatedCells: 0 } }),
      },
      get: async () => ({
        data: {
          spreadsheetId: "integration",
          properties: { title: "Integration Sheet" },
          sheets: [{ properties: { sheetId: 0, title: "Budgets" } }],
        },
      }),
    },
  } as unknown as sheets_v4.Sheets;
}

const SPREADSHEET_ID = "INTEGRATION-SHEET";
const PROGRAM_ID = "PROG-INT-001";

describe("Budget → EVM workflow", () => {
  let store: SheetStore;
  let sheets: sheets_v4.Sheets;

  beforeEach(() => {
    store = new Map();
    sheets = createInMemorySheetsClient(store);

    store.set(`${SPREADSHEET_ID}:Budgets`, [
      [
        "Budget ID",
        "Program ID",
        "Project ID",
        "Name",
        "Description",
        "Category",
        "Status",
        "Allocated",
        "Committed",
        "Spent",
        "Remaining",
        "Fiscal Year",
        "Period Start",
        "Period End",
        "Variance",
        "Variance Percent",
        "Requested By",
        "Approved By",
        "Approved Date",
        "Currency",
        "Created Date",
        "Created By",
        "Last Modified",
        "Notes",
      ],
    ]);
  });

  it("creates budgets, records expenses, and feeds EVM calculation", async () => {
    const budget = await createBudget(
      sheets,
      SPREADSHEET_ID,
      {
        programId: PROGRAM_ID,
        name: "Infrastructure Buildout",
        description: "Network + hardware",
        category: "infrastructure",
        allocated: 250000,
        fiscalYear: "2026",
        periodStart: new Date("2026-01-01"),
        periodEnd: new Date("2026-12-31"),
        requestedBy: "cfo@example.com",
      },
      "finance.integration"
    );

    expect(budget.budgetId).toMatch(/^BUD-/);
    expect(budget.allocated).toBe(250000);

    const updated = await recordExpense(
      sheets,
      SPREADSHEET_ID,
      budget.budgetId,
      40000,
      "Initial hardware purchase",
      "finance.integration"
    );

    expect(updated?.spent).toBe(40000);
    const persisted = await readBudget(
      sheets,
      SPREADSHEET_ID,
      budget.budgetId
    );
    expect(persisted?.spent).toBe(40000);

    const evm = await performEVMCalculation(
      sheets,
      SPREADSHEET_ID,
      PROGRAM_ID
    );

    expect(evm.ac).toBe(40000);
    expect(evm.bac).toBe(250000);
    expect(evm.metrics).toMatchObject({
      cpi: expect.any(Number),
      spi: expect.any(Number),
    });
  });
});
