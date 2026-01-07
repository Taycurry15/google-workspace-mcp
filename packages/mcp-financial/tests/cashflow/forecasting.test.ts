/**
 * Cash Flow Forecasting Module Tests
 *
 * Tests cash flow forecasting functions including monthly/weekly forecasts,
 * shortfall identification, runway calculations, and scenario analysis.
 *
 * Coverage targets:
 * - forecastMonthlyCashFlow(): Monthly forecasting with mock data
 * - forecastWeeklyCashFlow(): Weekly forecasting
 * - identifyCashShortfalls(): Shortfall detection with recommendations
 * - calculateRunway(): Runway analysis based on burn rate
 * - forecastCashPosition(): Point-in-time forecast with confidence
 * - generateCashFlowScenarios(): Scenario planning (optimistic/baseline/pessimistic)
 *
 * Test patterns:
 * - Async tests with mock Google Sheets API
 * - Mock cash flow data creation
 * - Edge cases (negative balance, zero flows, infinite runway)
 * - Recommendation and confidence logic validation
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  forecastMonthlyCashFlow,
  forecastWeeklyCashFlow,
  identifyCashShortfalls,
  calculateRunway,
  forecastCashPosition,
  generateCashFlowScenarios,
} from "../../src/cashflow/forecasting.js";
import { createMockSheetsClient } from "@gw-mcp/shared-core/test-utils";
import type { CashFlow } from "../../src/types/financial.js";

const TEST_SPREADSHEET_ID = "test-spreadsheet-id";
const TEST_PROGRAM_ID = "PROG-TEST-001";

// Helper to create mock cash flow rows
const createMockCashFlowRows = (count: number, baseDate: Date = new Date()): any[][] => {
  const rows: any[][] = [];

  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i * 7); // Weekly spacing

    const type = i % 2 === 0 ? "inflow" : "outflow";
    const amount = type === "inflow" ? 50000 : 30000;

    rows.push([
      `CF-${String(i + 1).padStart(3, "0")}`,
      TEST_PROGRAM_ID,
      "", // projectId
      `Cash flow ${i + 1}`,
      type,
      amount,
      date.toISOString().split("T")[0], // forecastDate
      "", // actualDate
      "forecast", // status
      "operations", // category
      date.toISOString(),
      "system",
      date.toISOString(),
      "",
    ]);
  }

  return rows;
};

describe("Cash Flow Forecasting Module", () => {
  describe("forecastMonthlyCashFlow", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should forecast monthly cash flows", async () => {
      const now = new Date("2026-01-15");
      const cashFlowRows = [
        ["Flow ID", "Program ID", "..."], // Header
        // January inflow
        ["CF-001", TEST_PROGRAM_ID, "", "Payment", "inflow", 100000, "2026-01-20", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
        // January outflow
        ["CF-002", TEST_PROGRAM_ID, "", "Expense", "outflow", 60000, "2026-01-25", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
        // February inflow
        ["CF-003", TEST_PROGRAM_ID, "", "Payment", "inflow", 120000, "2026-02-15", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
        // February outflow
        ["CF-004", TEST_PROGRAM_ID, "", "Expense", "outflow", 70000, "2026-02-20", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: cashFlowRows },
      });

      const forecasts = await forecastMonthlyCashFlow(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        3 // 3 months ahead
      );

      expect(forecasts.length).toBe(3);

      // January forecast
      expect(forecasts[0].month).toBe("2026-01");
      expect(forecasts[0].totalInflows).toBe(100000);
      expect(forecasts[0].totalOutflows).toBe(60000);
      expect(forecasts[0].netCashFlow).toBe(40000); // 100K - 60K
      expect(forecasts[0].closingBalance).toBe(40000); // Starting from 0

      // February forecast
      expect(forecasts[1].month).toBe("2026-02");
      expect(forecasts[1].openingBalance).toBe(40000); // From Jan close
      expect(forecasts[1].totalInflows).toBe(120000);
      expect(forecasts[1].totalOutflows).toBe(70000);
      expect(forecasts[1].netCashFlow).toBe(50000);
      expect(forecasts[1].closingBalance).toBe(90000); // 40K + 50K
    });

    it("should handle no cash flows", async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Flow ID", "Program ID", "..."]] }, // Only header
      });

      const forecasts = await forecastMonthlyCashFlow(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        2
      );

      expect(forecasts.length).toBe(2);
      expect(forecasts[0].totalInflows).toBe(0);
      expect(forecasts[0].totalOutflows).toBe(0);
      expect(forecasts[0].netCashFlow).toBe(0);
    });

    it("should exclude cancelled cash flows", async () => {
      const now = new Date("2026-01-15");
      const cashFlowRows = [
        ["Flow ID", "Program ID", "..."],
        ["CF-001", TEST_PROGRAM_ID, "", "Payment", "inflow", 100000, "2026-01-20", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
        ["CF-002", TEST_PROGRAM_ID, "", "Cancelled", "outflow", 50000, "2026-01-22", "", "cancelled", "operations", now.toISOString(), "system", now.toISOString(), ""],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: cashFlowRows },
      });

      const forecasts = await forecastMonthlyCashFlow(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        1
      );

      expect(forecasts[0].totalInflows).toBe(100000);
      expect(forecasts[0].totalOutflows).toBe(0); // Cancelled excluded
    });
  });

  describe("forecastWeeklyCashFlow", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should forecast weekly cash flows", async () => {
      const now = new Date("2026-01-13"); // Monday
      const cashFlowRows = [
        ["Flow ID", "Program ID", "..."],
        // Week 1 inflow
        ["CF-001", TEST_PROGRAM_ID, "", "Payment", "inflow", 25000, "2026-01-14", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
        // Week 1 outflow
        ["CF-002", TEST_PROGRAM_ID, "", "Expense", "outflow", 15000, "2026-01-16", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
        // Week 2 inflow
        ["CF-003", TEST_PROGRAM_ID, "", "Payment", "inflow", 30000, "2026-01-21", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: cashFlowRows },
      });

      const forecasts = await forecastWeeklyCashFlow(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        3 // 3 weeks ahead
      );

      expect(forecasts.length).toBe(3);

      // Week 1
      expect(forecasts[0].week).toMatch(/2026-W\d{2}/);
      expect(forecasts[0].totalInflows).toBe(25000);
      expect(forecasts[0].totalOutflows).toBe(15000);
      expect(forecasts[0].netCashFlow).toBe(10000);
    });
  });

  describe("identifyCashShortfalls", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should identify months with negative cash balance", async () => {
      const now = new Date("2026-01-15");
      const cashFlowRows = [
        ["Flow ID", "Program ID", "..."],
        // January: outflows > inflows
        ["CF-001", TEST_PROGRAM_ID, "", "Payment", "inflow", 50000, "2026-01-20", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
        ["CF-002", TEST_PROGRAM_ID, "", "Expense", "outflow", 100000, "2026-01-25", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
        // February: positive
        ["CF-003", TEST_PROGRAM_ID, "", "Payment", "inflow", 80000, "2026-02-15", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
        ["CF-004", TEST_PROGRAM_ID, "", "Expense", "outflow", 40000, "2026-02-20", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
      ];

      // Mock the listCashFlows call
      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: cashFlowRows },
      });

      const shortfalls = await identifyCashShortfalls(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        3
      );

      expect(shortfalls.length).toBeGreaterThan(0);
      expect(shortfalls[0].month).toBe("2026-01");
      expect(shortfalls[0].shortfall).toBe(50000); // |closingBalance|
      expect(shortfalls[0].closingBalance).toBe(-50000);
      expect(shortfalls[0].recommendations.length).toBeGreaterThan(0);
    });

    it("should return empty array when no shortfalls", async () => {
      const now = new Date("2026-01-15");
      const cashFlowRows = [
        ["Flow ID", "Program ID", "..."],
        // All positive cash flows
        ["CF-001", TEST_PROGRAM_ID, "", "Payment", "inflow", 100000, "2026-01-20", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
        ["CF-002", TEST_PROGRAM_ID, "", "Expense", "outflow", 50000, "2026-01-25", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: cashFlowRows },
      });

      const shortfalls = await identifyCashShortfalls(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        2
      );

      expect(shortfalls.length).toBe(0);
    });

    it("should provide recommendations for large shortfalls", async () => {
      const now = new Date("2026-01-15");
      const cashFlowRows = [
        ["Flow ID", "Program ID", "..."],
        // Large shortfall (outflows >> inflows)
        ["CF-001", TEST_PROGRAM_ID, "", "Payment", "inflow", 10000, "2026-01-20", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
        ["CF-002", TEST_PROGRAM_ID, "", "Expense", "outflow", 200000, "2026-01-25", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: cashFlowRows },
      });

      const shortfalls = await identifyCashShortfalls(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        1
      );

      expect(shortfalls.length).toBeGreaterThan(0);
      expect(shortfalls[0].shortfall).toBe(190000);

      // Should include short-term financing recommendation for large shortfall
      const hasFinancingRec = shortfalls[0].recommendations.some(r =>
        r.includes("short-term financing")
      );
      expect(hasFinancingRec).toBe(true);
    });
  });

  describe("calculateRunway", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should calculate runway with positive burn rate", async () => {
      const now = new Date("2026-04-01");
      const threeMonthsAgo = new Date("2026-01-01");

      const historicalFlows = [
        ["Flow ID", "Program ID", "..."],
        // Month 1: burn 20K
        ["CF-001", TEST_PROGRAM_ID, "", "Revenue", "inflow", 80000, "2026-01-15", "2026-01-15", "completed", "operations", threeMonthsAgo.toISOString(), "system", threeMonthsAgo.toISOString(), ""],
        ["CF-002", TEST_PROGRAM_ID, "", "Expense", "outflow", 100000, "2026-01-20", "2026-01-20", "completed", "operations", threeMonthsAgo.toISOString(), "system", threeMonthsAgo.toISOString(), ""],
        // Month 2: burn 30K
        ["CF-003", TEST_PROGRAM_ID, "", "Revenue", "inflow", 70000, "2026-02-15", "2026-02-15", "completed", "operations", now.toISOString(), "system", now.toISOString(), ""],
        ["CF-004", TEST_PROGRAM_ID, "", "Expense", "outflow", 100000, "2026-02-20", "2026-02-20", "completed", "operations", now.toISOString(), "system", now.toISOString(), ""],
        // Month 3: burn 40K
        ["CF-005", TEST_PROGRAM_ID, "", "Revenue", "inflow", 60000, "2026-03-15", "2026-03-15", "completed", "operations", now.toISOString(), "system", now.toISOString(), ""],
        ["CF-006", TEST_PROGRAM_ID, "", "Expense", "outflow", 100000, "2026-03-20", "2026-03-20", "completed", "operations", now.toISOString(), "system", now.toISOString(), ""],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: historicalFlows },
      });

      const currentBalance = 300000;
      const runway = await calculateRunway(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        currentBalance
      );

      // Average monthly burn = (20K + 30K + 40K) / 3 = 30K
      expect(runway.averageMonthlyBurn).toBeCloseTo(30000, 0);

      // Runway = 300K / 30K = 10 months
      expect(runway.monthsRemaining).toBeCloseTo(10, 1);
      expect(runway.depletionDate).not.toBeNull();
      expect(runway.recommendation).toContain("months of runway");
    });

    it("should handle infinite runway when cash flow is positive", async () => {
      const now = new Date("2026-04-01");
      const historicalFlows = [
        ["Flow ID", "Program ID", "..."],
        // Positive cash flow
        ["CF-001", TEST_PROGRAM_ID, "", "Revenue", "inflow", 150000, "2026-01-15", "2026-01-15", "completed", "operations", now.toISOString(), "system", now.toISOString(), ""],
        ["CF-002", TEST_PROGRAM_ID, "", "Expense", "outflow", 100000, "2026-01-20", "2026-01-20", "completed", "operations", now.toISOString(), "system", now.toISOString(), ""],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: historicalFlows },
      });

      const runway = await calculateRunway(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        100000
      );

      expect(runway.monthsRemaining).toBe(Infinity);
      expect(runway.depletionDate).toBeNull();
      expect(runway.recommendation).toContain("positive");
    });

    it("should provide critical warning when runway < 3 months", async () => {
      const now = new Date("2026-04-01");
      const historicalFlows = [
        ["Flow ID", "Program ID", "..."],
        // High burn rate
        ["CF-001", TEST_PROGRAM_ID, "", "Revenue", "inflow", 50000, "2026-01-15", "2026-01-15", "completed", "operations", now.toISOString(), "system", now.toISOString(), ""],
        ["CF-002", TEST_PROGRAM_ID, "", "Expense", "outflow", 150000, "2026-01-20", "2026-01-20", "completed", "operations", now.toISOString(), "system", now.toISOString(), ""],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: historicalFlows },
      });

      // Low balance with high burn = short runway
      const runway = await calculateRunway(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        50000 // Only 50K remaining
      );

      expect(runway.monthsRemaining).toBeLessThan(3);
      expect(runway.recommendation).toContain("Critical");
    });
  });

  describe("forecastCashPosition", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should forecast cash position for a future date", async () => {
      const now = new Date("2026-01-15");
      const targetDate = new Date("2026-03-01");

      const futureFlows = [
        ["Flow ID", "Program ID", "..."],
        ["CF-001", TEST_PROGRAM_ID, "", "Payment", "inflow", 100000, "2026-02-01", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
        ["CF-002", TEST_PROGRAM_ID, "", "Expense", "outflow", 60000, "2026-02-15", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: futureFlows },
      });

      const currentBalance = 50000;
      const forecast = await forecastCashPosition(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        targetDate,
        currentBalance
      );

      expect(forecast.forecastBalance).toBe(90000); // 50K + 100K - 60K
      expect(forecast.inflows).toBe(100000);
      expect(forecast.outflows).toBe(60000);
      expect(forecast.assumptions.length).toBeGreaterThan(0);
      expect(forecast.confidence).toMatch(/high|medium|low/);
    });

    it("should assess high confidence for short-term forecast with completed flows", async () => {
      const now = new Date("2026-01-15");
      const targetDate = new Date("2026-01-25"); // 10 days out

      const futureFlows = [
        ["Flow ID", "Program ID", "..."],
        // Mostly completed flows
        ["CF-001", TEST_PROGRAM_ID, "", "Payment", "inflow", 50000, "2026-01-20", "2026-01-20", "completed", "operations", now.toISOString(), "system", now.toISOString(), ""],
        ["CF-002", TEST_PROGRAM_ID, "", "Expense", "outflow", 30000, "2026-01-22", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: futureFlows },
      });

      const forecast = await forecastCashPosition(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        targetDate,
        100000
      );

      // Short term + some completed flows = higher confidence
      expect(forecast.confidence).toMatch(/high|medium/);
    });

    it("should assess low confidence for long-term forecast", async () => {
      const now = new Date("2026-01-15");
      const targetDate = new Date("2026-12-31"); // ~1 year out

      const futureFlows = [
        ["Flow ID", "Program ID", "..."],
        ["CF-001", TEST_PROGRAM_ID, "", "Payment", "inflow", 100000, "2026-06-01", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: futureFlows },
      });

      const forecast = await forecastCashPosition(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        targetDate,
        100000
      );

      expect(forecast.confidence).toBe("low"); // Long-term = low confidence
    });

    it("should reject past target date", async () => {
      const now = new Date("2026-01-15");
      const pastDate = new Date("2025-12-01");

      await expect(
        forecastCashPosition(
          mockSheets,
          TEST_SPREADSHEET_ID,
          TEST_PROGRAM_ID,
          pastDate,
          100000
        )
      ).rejects.toThrow("Target date must be in the future");
    });
  });

  describe("generateCashFlowScenarios", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should generate three cash flow scenarios", async () => {
      const now = new Date("2026-01-15");
      const cashFlowRows = [
        ["Flow ID", "Program ID", "..."],
        ["CF-001", TEST_PROGRAM_ID, "", "Payment", "inflow", 100000, "2026-01-20", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
        ["CF-002", TEST_PROGRAM_ID, "", "Expense", "outflow", 60000, "2026-01-25", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
        ["CF-003", TEST_PROGRAM_ID, "", "Payment", "inflow", 120000, "2026-02-15", "", "forecast", "operations", now.toISOString(), "system", now.toISOString(), ""],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: cashFlowRows },
      });

      const scenarios = await generateCashFlowScenarios(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        3 // 3 months
      );

      expect(scenarios.baseline).toBeDefined();
      expect(scenarios.optimistic).toBeDefined();
      expect(scenarios.pessimistic).toBeDefined();

      expect(scenarios.baseline.length).toBe(3);
      expect(scenarios.optimistic.length).toBe(3);
      expect(scenarios.pessimistic.length).toBe(3);

      // Optimistic should have higher closing balances
      expect(scenarios.optimistic[0].closingBalance).toBeGreaterThan(
        scenarios.baseline[0].closingBalance
      );

      // Pessimistic should have lower closing balances
      expect(scenarios.pessimistic[0].closingBalance).toBeLessThan(
        scenarios.baseline[0].closingBalance
      );
    });
  });
});
