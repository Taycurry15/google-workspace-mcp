/**
 * EVM Calculations Unit Tests
 *
 * Tests all EVM calculation functions to verify PMBOK formula compliance
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  calculateEVMMetrics,
  calculateHealthIndex,
  calculateAC,
  calculateBAC,
  performEVMCalculation,
} from "../src/evm/calculations.js";
import { createMockSheetsClient } from "@gw-mcp/shared-core/test-utils";

describe("EVM Calculations", () => {
  describe("calculateEVMMetrics", () => {
    it("should calculate correct metrics for a healthy project", () => {
      // Scenario: Project is under budget and ahead of schedule
      const pv = 100000;  // Planned to spend 100K
      const ev = 110000;  // Earned 110K worth of value
      const ac = 95000;   // Actually spent 95K
      const bac = 200000; // Total budget 200K

      const metrics = calculateEVMMetrics(pv, ev, ac, bac);

      // Cost Variance: EV - AC = 110K - 95K = 15K (positive, under budget)
      expect(metrics.cv).toBe(15000);

      // Schedule Variance: EV - PV = 110K - 100K = 10K (positive, ahead)
      expect(metrics.sv).toBe(10000);

      // CPI: EV / AC = 110K / 95K = 1.1579 (>1, good)
      expect(metrics.cpi).toBeCloseTo(1.1579, 4);

      // SPI: EV / PV = 110K / 100K = 1.1 (>1, good)
      expect(metrics.spi).toBe(1.1);

      // EAC: BAC / CPI = 200K / 1.1579 = 172,727
      expect(metrics.eac).toBeCloseTo(172727.27, 2);

      // ETC: EAC - AC = 172,727 - 95K = 77,727
      expect(metrics.etc).toBeCloseTo(77727.27, 2);

      // VAC: BAC - EAC = 200K - 172,727 = 27,273 (positive, under budget)
      expect(metrics.vac).toBeCloseTo(27272.73, 2);

      // TCPI: (BAC - EV) / (BAC - AC) = (200K - 110K) / (200K - 95K) = 90K / 105K = 0.8571
      expect(metrics.tcpi).toBeCloseTo(0.8571, 4);
    });

    it("should calculate correct metrics for a troubled project", () => {
      // Scenario: Project is over budget and behind schedule
      const pv = 100000;  // Planned to spend 100K
      const ev = 80000;   // Only earned 80K worth of value
      const ac = 110000;  // Actually spent 110K
      const bac = 200000; // Total budget 200K

      const metrics = calculateEVMMetrics(pv, ev, ac, bac);

      // Cost Variance: EV - AC = 80K - 110K = -30K (negative, over budget)
      expect(metrics.cv).toBe(-30000);

      // Schedule Variance: EV - PV = 80K - 100K = -20K (negative, behind)
      expect(metrics.sv).toBe(-20000);

      // CPI: EV / AC = 80K / 110K = 0.7273 (<1, bad)
      expect(metrics.cpi).toBeCloseTo(0.7273, 4);

      // SPI: EV / PV = 80K / 100K = 0.8 (<1, bad)
      expect(metrics.spi).toBe(0.8);

      // EAC: BAC / CPI = 200K / 0.7273 = 275,000
      expect(metrics.eac).toBeCloseTo(275000, 0);

      // VAC: BAC - EAC = 200K - 275K = -75K (negative, over budget)
      expect(metrics.vac).toBeCloseTo(-75000, 0);

      // TCPI: (BAC - EV) / (BAC - AC) = (200K - 80K) / (200K - 110K) = 120K / 90K = 1.3333
      expect(metrics.tcpi).toBeCloseTo(1.3333, 4);
    });

    it("should handle zero AC gracefully", () => {
      const pv = 100000;
      const ev = 50000;
      const ac = 0;  // No costs yet
      const bac = 200000;

      const metrics = calculateEVMMetrics(pv, ev, ac, bac);

      expect(metrics.cpi).toBe(0);
      expect(metrics.cv).toBe(50000);
      expect(metrics.cvPercent).toBe(0);
    });

    it("should handle zero PV gracefully", () => {
      const pv = 0;  // No work planned yet
      const ev = 0;
      const ac = 10000;
      const bac = 200000;

      const metrics = calculateEVMMetrics(pv, ev, ac, bac);

      expect(metrics.spi).toBe(0);
      expect(metrics.sv).toBe(0);
      expect(metrics.svPercent).toBe(0);
    });

    it("should handle exhausted budget scenario", () => {
      const pv = 100000;
      const ev = 80000;
      const ac = 200000;  // Already spent entire BAC
      const bac = 200000;

      const metrics = calculateEVMMetrics(pv, ev, ac, bac);

      // TCPI should be 0 when remaining budget is 0
      expect(metrics.tcpi).toBe(0);

      // EAC should account for current overrun
      expect(metrics.eac).toBeGreaterThan(bac);
    });
  });

  describe("calculateHealthIndex", () => {
    it("should return healthy status for good performance", () => {
      const metrics = calculateEVMMetrics(100000, 110000, 95000, 200000);
      const health = calculateHealthIndex(metrics);

      expect(health.status).toBe("healthy");
      expect(health.score).toBeGreaterThanOrEqual(70);
      expect(health.indicators).toContain("Project is performing well");
    });

    it("should return warning status for moderate issues", () => {
      const metrics = calculateEVMMetrics(100000, 90000, 100000, 200000);
      const health = calculateHealthIndex(metrics);

      expect(health.status).toBe("warning");
      expect(health.score).toBeGreaterThanOrEqual(50);
      expect(health.score).toBeLessThan(70);
    });

    it("should return critical status for severe issues", () => {
      const metrics = calculateEVMMetrics(100000, 60000, 110000, 200000);
      const health = calculateHealthIndex(metrics);

      expect(health.status).toBe("critical");
      expect(health.score).toBeLessThan(50);
      expect(health.indicators[0]).toBe("Project requires immediate action");
    });

    it("should identify cost overrun issues", () => {
      const metrics = calculateEVMMetrics(100000, 95000, 120000, 200000);
      const health = calculateHealthIndex(metrics);

      const hasCostIndicator = health.indicators.some((ind) =>
        ind.includes("cost overrun")
      );
      expect(hasCostIndicator).toBe(true);
    });

    it("should identify schedule issues", () => {
      const metrics = calculateEVMMetrics(100000, 70000, 70000, 200000);
      const health = calculateHealthIndex(metrics);

      const hasScheduleIndicator = health.indicators.some((ind) =>
        ind.includes("behind schedule")
      );
      expect(hasScheduleIndicator).toBe(true);
    });

    it("should identify difficult TCPI targets", () => {
      // Setup scenario where TCPI > 1.15 (need very high performance to meet budget)
      const metrics = calculateEVMMetrics(150000, 100000, 160000, 200000);
      const health = calculateHealthIndex(metrics);

      const hasTCPIIndicator = health.indicators.some((ind) =>
        ind.includes("performance required") || ind.includes("performance needed")
      );
      expect(hasTCPIIndicator).toBe(true);
    });

    it("should cap health score at 100", () => {
      // Perfect performance scenario
      const metrics = calculateEVMMetrics(100000, 120000, 90000, 200000);
      const health = calculateHealthIndex(metrics);

      expect(health.score).toBeLessThanOrEqual(100);
      expect(health.score).toBeGreaterThanOrEqual(0);
    });

    it("should identify under budget scenario", () => {
      const metrics = calculateEVMMetrics(100000, 105000, 95000, 200000);
      const health = calculateHealthIndex(metrics);

      const hasUnderBudgetIndicator = health.indicators.some((ind) =>
        ind.includes("Under budget")
      );
      expect(hasUnderBudgetIndicator).toBe(true);
    });

    it("should identify ahead of schedule scenario", () => {
      const metrics = calculateEVMMetrics(100000, 110000, 105000, 200000);
      const health = calculateHealthIndex(metrics);

      const hasAheadIndicator = health.indicators.some((ind) =>
        ind.includes("Ahead of schedule")
      );
      expect(hasAheadIndicator).toBe(true);
    });
  });

  describe("calculateAC (Actual Cost)", () => {
    let mockSheets: any;
    const TEST_SPREADSHEET_ID = "test-spreadsheet-id";
    const TEST_PROGRAM_ID = "PROG-TEST-001";

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should calculate AC from budget spent amounts", async () => {
      // Mock budget data: 3 budgets with spent amounts
      const budgetData = [
        ["BUD-001", "PROG-TEST-001", "Labor", "active", "2026", 100000, 50000, 45000, 55000, 5000], // spent: 45000
        ["BUD-002", "PROG-TEST-001", "Materials", "active", "2026", 50000, 20000, 15000, 35000, 5000], // spent: 15000
        ["BUD-003", "PROG-TEST-001", "Travel", "active", "2026", 25000, 10000, 8000, 17000, 2000], // spent: 8000
      ];

      // Set up mock to return budget data
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: budgetData },
      });

      const ac = await calculateAC(mockSheets, TEST_SPREADSHEET_ID, TEST_PROGRAM_ID);

      // Total spent: 45000 + 15000 + 8000 = 68000
      expect(ac).toBe(68000);
      expect(mockSheets.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: TEST_SPREADSHEET_ID,
        range: "Budgets!A2:J1000",
      });
    });

    it("should return 0 when no budgets exist", async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [] },
      });

      const ac = await calculateAC(mockSheets, TEST_SPREADSHEET_ID, TEST_PROGRAM_ID);
      expect(ac).toBe(0);
    });

    it("should filter budgets by program ID", async () => {
      const budgetData = [
        ["BUD-001", "PROG-TEST-001", "Labor", "active", "2026", 100000, 50000, 45000, 55000, 5000], // Match: 45000
        ["BUD-002", "PROG-OTHER", "Materials", "active", "2026", 50000, 20000, 15000, 35000, 5000], // No match
        ["BUD-003", "PROG-TEST-001", "Travel", "active", "2026", 25000, 10000, 8000, 17000, 2000], // Match: 8000
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: budgetData },
      });

      const ac = await calculateAC(mockSheets, TEST_SPREADSHEET_ID, TEST_PROGRAM_ID);

      // Only budgets for PROG-TEST-001: 45000 + 8000 = 53000
      expect(ac).toBe(53000);
    });

    it("should handle invalid spent values gracefully", async () => {
      const budgetData = [
        ["BUD-001", "PROG-TEST-001", "Labor", "active", "2026", 100000, 50000, 45000, 55000, 5000],
        ["BUD-002", "PROG-TEST-001", "Materials", "active", "2026", 50000, 20000, "", 35000, 5000], // Empty spent
        ["BUD-003", "PROG-TEST-001", "Travel", "active", "2026", 25000, 10000, null, 17000, 2000], // Null spent
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: budgetData },
      });

      const ac = await calculateAC(mockSheets, TEST_SPREADSHEET_ID, TEST_PROGRAM_ID);

      // Only valid spent value: 45000
      expect(ac).toBe(45000);
    });

    it("should throw error on API failure", async () => {
      mockSheets.spreadsheets.values.get.mockRejectedValueOnce(
        new Error("API Error")
      );

      await expect(
        calculateAC(mockSheets, TEST_SPREADSHEET_ID, TEST_PROGRAM_ID)
      ).rejects.toThrow("Failed to calculate Actual Cost");
    });
  });

  describe("calculateBAC (Budget at Completion)", () => {
    let mockSheets: any;
    const TEST_SPREADSHEET_ID = "test-spreadsheet-id";
    const TEST_PROGRAM_ID = "PROG-TEST-001";

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should calculate BAC from budget allocated amounts", async () => {
      // Mock budget data: 3 budgets with allocated amounts
      const budgetData = [
        ["BUD-001", "PROG-TEST-001", "Labor", "active", "2026", 100000, 50000, 100000], // allocated: 100000
        ["BUD-002", "PROG-TEST-001", "Materials", "active", "2026", 50000, 20000, 50000], // allocated: 50000
        ["BUD-003", "PROG-TEST-001", "Travel", "active", "2026", 25000, 10000, 25000], // allocated: 25000
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: budgetData },
      });

      const bac = await calculateBAC(mockSheets, TEST_SPREADSHEET_ID, TEST_PROGRAM_ID);

      // Total allocated: 100000 + 50000 + 25000 = 175000
      expect(bac).toBe(175000);
      expect(mockSheets.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: TEST_SPREADSHEET_ID,
        range: "Budgets!A2:H1000",
      });
    });

    it("should return 0 when no budgets exist", async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [] },
      });

      const bac = await calculateBAC(mockSheets, TEST_SPREADSHEET_ID, TEST_PROGRAM_ID);
      expect(bac).toBe(0);
    });

    it("should filter budgets by program ID", async () => {
      const budgetData = [
        ["BUD-001", "PROG-TEST-001", "Labor", "active", "2026", 100000, 50000, 100000], // Match: 100000
        ["BUD-002", "PROG-OTHER", "Materials", "active", "2026", 50000, 20000, 50000], // No match
        ["BUD-003", "PROG-TEST-001", "Travel", "active", "2026", 25000, 10000, 25000], // Match: 25000
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: budgetData },
      });

      const bac = await calculateBAC(mockSheets, TEST_SPREADSHEET_ID, TEST_PROGRAM_ID);

      // Only budgets for PROG-TEST-001: 100000 + 25000 = 125000
      expect(bac).toBe(125000);
    });

    it("should handle invalid allocated values gracefully", async () => {
      const budgetData = [
        ["BUD-001", "PROG-TEST-001", "Labor", "active", "2026", 100000, 50000, 100000],
        ["BUD-002", "PROG-TEST-001", "Materials", "active", "2026", 50000, 20000, ""], // Empty
        ["BUD-003", "PROG-TEST-001", "Travel", "active", "2026", 25000, 10000, null], // Null
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: budgetData },
      });

      const bac = await calculateBAC(mockSheets, TEST_SPREADSHEET_ID, TEST_PROGRAM_ID);

      // Only valid allocated value: 100000
      expect(bac).toBe(100000);
    });

    it("should throw error on API failure", async () => {
      mockSheets.spreadsheets.values.get.mockRejectedValueOnce(
        new Error("API Error")
      );

      await expect(
        calculateBAC(mockSheets, TEST_SPREADSHEET_ID, TEST_PROGRAM_ID)
      ).rejects.toThrow("Failed to calculate Budget at Completion");
    });
  });

  describe("performEVMCalculation (Integration)", () => {
    let mockSheets: any;
    const TEST_SPREADSHEET_ID = "test-spreadsheet-id";
    const TEST_PROGRAM_ID = "PROG-TEST-001";

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should perform complete EVM calculation", async () => {
      // Mock budget data for AC and BAC calculations
      const budgetData = [
        ["BUD-001", "PROG-TEST-001", "Labor", "active", "2026", 100000, 50000, 45000, 55000, 5000],
        ["BUD-002", "PROG-TEST-001", "Materials", "active", "2026", 50000, 20000, 15000, 35000, 5000],
      ];

      // Set up mocks for both calculateAC and calculateBAC calls
      mockSheets.spreadsheets.values.get
        .mockResolvedValueOnce({ data: { values: budgetData } }) // For AC (range A2:J1000)
        .mockResolvedValueOnce({ data: { values: budgetData } }); // For BAC (range A2:H1000)

      const result = await performEVMCalculation(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID
      );

      // Verify we got all base values
      expect(result.pv).toBeGreaterThan(0); // Mock PV calculation
      expect(result.ev).toBeGreaterThan(0); // Mock EV calculation
      expect(result.ac).toBe(60000); // 45000 + 15000
      expect(result.bac).toBe(150000); // 100000 + 50000

      // Verify metrics were calculated
      expect(result.metrics).toBeDefined();
      expect(result.metrics.cv).toBeDefined();
      expect(result.metrics.sv).toBeDefined();
      expect(result.metrics.cpi).toBeDefined();
      expect(result.metrics.spi).toBeDefined();
      expect(result.metrics.eac).toBeDefined();
      expect(result.metrics.etc).toBeDefined();
      expect(result.metrics.vac).toBeDefined();
      expect(result.metrics.tcpi).toBeDefined();
    });

    it("should handle program with no budgets", async () => {
      mockSheets.spreadsheets.values.get
        .mockResolvedValueOnce({ data: { values: [] } }) // No budgets for AC
        .mockResolvedValueOnce({ data: { values: [] } }); // No budgets for BAC

      const result = await performEVMCalculation(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID
      );

      expect(result.ac).toBe(0);
      expect(result.bac).toBe(0);
      expect(result.metrics.cpi).toBe(0); // Division by zero handled
    });

    it("should throw error when calculation fails", async () => {
      mockSheets.spreadsheets.values.get.mockRejectedValueOnce(
        new Error("Sheets API failure")
      );

      await expect(
        performEVMCalculation(mockSheets, TEST_SPREADSHEET_ID, TEST_PROGRAM_ID)
      ).rejects.toThrow("Failed to perform EVM calculation");
    });

    it("should accept custom asOfDate parameter", async () => {
      const budgetData = [
        ["BUD-001", "PROG-TEST-001", "Labor", "active", "2026", 100000, 50000, 45000, 55000, 5000],
      ];

      mockSheets.spreadsheets.values.get
        .mockResolvedValueOnce({ data: { values: budgetData } })
        .mockResolvedValueOnce({ data: { values: budgetData } });

      const customDate = new Date("2026-06-01");
      const result = await performEVMCalculation(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        customDate
      );

      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    it("should handle negative CPI (project in severe trouble)", () => {
      // Scenario: EV < 0 (theoretical worst case)
      const metrics = calculateEVMMetrics(100000, -10000, 120000, 200000);

      expect(metrics.cv).toBeLessThan(0);
      expect(metrics.cpi).toBeLessThan(0);
      expect(metrics.eac).toBeGreaterThan(0); // Fallback calculation used
    });

    it("should handle very large budget values", () => {
      const pv = 1000000000; // 1 billion
      const ev = 1100000000; // 1.1 billion
      const ac = 950000000;  // 950 million
      const bac = 2000000000; // 2 billion

      const metrics = calculateEVMMetrics(pv, ev, ac, bac);

      expect(metrics.cv).toBe(150000000);
      expect(metrics.cpi).toBeCloseTo(1.1579, 4);
      expect(metrics.vac).toBeGreaterThan(0);
    });

    it("should handle very small budget values", () => {
      const pv = 100; // $100
      const ev = 110;
      const ac = 95;
      const bac = 200;

      const metrics = calculateEVMMetrics(pv, ev, ac, bac);

      expect(metrics.cv).toBe(15);
      expect(metrics.cpi).toBeCloseTo(1.1579, 4);
    });

    it("should handle project at exactly 100% complete", () => {
      const bac = 200000;
      const metrics = calculateEVMMetrics(bac, bac, bac, bac);

      expect(metrics.spi).toBe(1.0);
      expect(metrics.cpi).toBe(1.0);
      expect(metrics.eac).toBe(bac);
      expect(metrics.vac).toBe(0);
      expect(metrics.tcpi).toBe(0); // No remaining work
    });

    it("should handle percentage variance calculations", () => {
      const metrics = calculateEVMMetrics(100000, 90000, 110000, 200000);

      // CV% = (CV / AC) * 100 = (-20000 / 110000) * 100 = -18.18%
      expect(metrics.cvPercent).toBeCloseTo(-18.18, 2);

      // SV% = (SV / PV) * 100 = (-10000 / 100000) * 100 = -10%
      expect(metrics.svPercent).toBe(-10);
    });
  });
});
