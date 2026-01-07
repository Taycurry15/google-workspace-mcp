/**
 * EVM Trending Module Tests
 *
 * Tests statistical analysis functions for EVM trend detection,
 * moving averages, linear regression, and anomaly detection.
 *
 * Coverage targets:
 * - calculateLinearRegression(): Pure function tests
 * - analyzeCPITrend(): Async tests with mock Sheets API
 * - analyzeSPITrend(): Async tests with mock Sheets API
 * - calculateMovingAverage(): Pure function tests
 * - detectAnomalies(): Async tests with mock Sheets API
 * - analyzePerformanceTrend(): Integration tests
 * - compareToBaseline(): Async tests with mock Sheets API
 *
 * Test patterns:
 * - Pure function tests (fast, no mocks needed)
 * - Edge case coverage (empty data, single point, zero std dev)
 * - Statistical validation (r², z-scores, trend classification)
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  calculateLinearRegression,
  calculateMovingAverage,
  analyzeCPITrend,
  analyzeSPITrend,
  detectAnomalies,
  analyzePerformanceTrend,
  compareToBaseline,
  type DataPoint,
} from "../../src/evm/trending.js";
import { createMockSheetsClient } from "@gw-mcp/shared-core/test-utils";
import type { EVMSnapshot } from "../../src/types/financial.js";

const TEST_SPREADSHEET_ID = "test-spreadsheet-id";
const TEST_PROGRAM_ID = "PROG-TEST-001";

// Mock snapshot data for testing
const createMockSnapshots = (count: number, baseDate: Date = new Date("2026-01-01")): any[][] => {
  const snapshots: any[][] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setMonth(date.getMonth() + i);

    // Create realistic EVM progression
    const progress = (i + 1) / count; // 0 to 1
    const pv = 100000 * progress;
    const ev = 100000 * progress * (0.95 + Math.random() * 0.1); // Slight variation
    const ac = 100000 * progress * (0.95 + Math.random() * 0.15);
    const cpi = ev / (ac || 1);
    const spi = ev / (pv || 1);
    const cv = ev - ac;
    const sv = ev - pv;

    snapshots.push([
      `SNAP-${String(i + 1).padStart(3, "0")}`,
      TEST_PROGRAM_ID,
      date.toISOString(),
      Math.round(pv),
      Math.round(ev),
      Math.round(ac),
      100000, // BAC
      Math.round(cpi * 10000) / 10000,
      Math.round(spi * 10000) / 10000,
      Math.round(cv),
      Math.round(sv),
      Math.round(100000 / cpi), // EAC
      "active",
      `Health: healthy (score: 75)`,
      "system",
      date.toISOString(),
    ]);
  }
  return snapshots;
};

describe("EVM Trending Module", () => {
  describe("calculateLinearRegression", () => {
    it("should calculate perfect linear regression for linear data", () => {
      const dataPoints: DataPoint[] = [
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 6 },
        { x: 4, y: 8 },
      ];

      const regression = calculateLinearRegression(dataPoints);

      // For perfect linear relationship y = 2x:
      // slope = 2, intercept = 0, r² = 1 (perfect fit)
      expect(regression.slope).toBeCloseTo(2.0, 4);
      expect(regression.intercept).toBeCloseTo(0.0, 4);
      expect(regression.r2).toBeCloseTo(1.0, 4);
    });

    it("should calculate regression for data with some scatter", () => {
      const dataPoints: DataPoint[] = [
        { x: 1, y: 2.1 },
        { x: 2, y: 3.9 },
        { x: 3, y: 6.2 },
        { x: 4, y: 7.8 },
      ];

      const regression = calculateLinearRegression(dataPoints);

      // Approximate linear relationship with some noise
      expect(regression.slope).toBeGreaterThan(1.8);
      expect(regression.slope).toBeLessThan(2.2);
      expect(regression.r2).toBeGreaterThan(0.9); // High but not perfect
      expect(regression.r2).toBeLessThanOrEqual(1.0);
    });

    it("should return zero slope for horizontal line", () => {
      const dataPoints: DataPoint[] = [
        { x: 1, y: 5 },
        { x: 2, y: 5 },
        { x: 3, y: 5 },
        { x: 4, y: 5 },
      ];

      const regression = calculateLinearRegression(dataPoints);

      // Horizontal line: slope = 0, intercept = 5
      expect(regression.slope).toBeCloseTo(0.0, 4);
      expect(regression.intercept).toBeCloseTo(5.0, 4);
      expect(regression.r2).toBeCloseTo(0.0, 4); // No variation explained
    });

    it("should handle single data point", () => {
      const dataPoints: DataPoint[] = [{ x: 5, y: 10 }];

      const regression = calculateLinearRegression(dataPoints);

      // Single point: slope = 0, intercept = y value
      expect(regression.slope).toBe(0);
      expect(regression.intercept).toBe(10);
      expect(regression.r2).toBe(0);
    });

    it("should handle empty array", () => {
      const dataPoints: DataPoint[] = [];

      const regression = calculateLinearRegression(dataPoints);

      // Empty data: all zeros
      expect(regression.slope).toBe(0);
      expect(regression.intercept).toBe(0);
      expect(regression.r2).toBe(0);
    });

    it("should calculate negative slope for declining trend", () => {
      const dataPoints: DataPoint[] = [
        { x: 1, y: 10 },
        { x: 2, y: 8 },
        { x: 3, y: 6 },
        { x: 4, y: 4 },
      ];

      const regression = calculateLinearRegression(dataPoints);

      // Declining linear trend y = -2x + 12
      expect(regression.slope).toBeCloseTo(-2.0, 4);
      expect(regression.r2).toBeCloseTo(1.0, 4);
    });
  });

  describe("calculateMovingAverage", () => {
    it("should calculate 3-period moving average", () => {
      const values = [1, 2, 3, 4, 5];

      const ma = calculateMovingAverage(values, 3);

      // Expected moving averages:
      // MA[0] = 1 (only 1 value)
      // MA[1] = (1+2)/2 = 1.5
      // MA[2] = (1+2+3)/3 = 2
      // MA[3] = (2+3+4)/3 = 3
      // MA[4] = (3+4+5)/3 = 4
      expect(ma).toEqual([1, 1.5, 2, 3, 4]);
    });

    it("should handle window size larger than data", () => {
      const values = [10, 20, 30];

      const ma = calculateMovingAverage(values, 5);

      // Window size larger than data: each point averages all previous points
      expect(ma[0]).toBe(10);
      expect(ma[1]).toBe(15); // (10+20)/2
      expect(ma[2]).toBeCloseTo(20, 4); // (10+20+30)/3
    });

    it("should handle window size of 1", () => {
      const values = [5, 10, 15, 20];

      const ma = calculateMovingAverage(values, 1);

      // Window of 1 = original values
      expect(ma).toEqual([5, 10, 15, 20]);
    });

    it("should handle empty array", () => {
      const values: number[] = [];

      const ma = calculateMovingAverage(values, 3);

      expect(ma).toEqual([]);
    });

    it("should handle negative window size (treated as 1)", () => {
      const values = [1, 2, 3];

      const ma = calculateMovingAverage(values, -5);

      // Negative window size defaults to 1
      expect(ma).toEqual([1, 2, 3]);
    });
  });

  describe("analyzeCPITrend", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should detect improving CPI trend", async () => {
      // Create snapshots with improving CPI (0.85 → 1.05)
      const snapshots: any[][] = [];
      for (let i = 0; i < 6; i++) {
        const date = new Date("2026-01-01");
        date.setMonth(date.getMonth() + i);
        const cpi = 0.85 + i * 0.04; // Improving from 0.85 to 1.05

        snapshots.push([
          `SNAP-${String(i + 1).padStart(3, "0")}`,
          TEST_PROGRAM_ID,
          date.toISOString(),
          50000 * (i + 1), // PV
          50000 * (i + 1) * cpi, // EV
          50000 * (i + 1), // AC
          300000, // BAC
          cpi,
          0.95, // SPI
          0, 0, 0, // CV, SV, EAC (not used in trend)
          "active",
          "Health: healthy (score: 75)",
          "system",
          date.toISOString(),
        ]);
      }

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const analysis = await analyzeCPITrend(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        12
      );

      expect(analysis.trend).toBe("improving");
      expect(analysis.slope).toBeGreaterThan(0.01); // Positive slope threshold
      expect(analysis.currentCPI).toBeCloseTo(1.05, 2);
      expect(analysis.averageCPI).toBeGreaterThan(0.9);
      expect(analysis.volatility).toBeGreaterThan(0); // Some variation
    });

    it("should detect declining CPI trend", async () => {
      // Create snapshots with declining CPI (1.1 → 0.8)
      const snapshots: any[][] = [];
      for (let i = 0; i < 6; i++) {
        const date = new Date("2026-01-01");
        date.setMonth(date.getMonth() + i);
        const cpi = 1.1 - i * 0.05; // Declining from 1.1 to 0.8

        snapshots.push([
          `SNAP-${String(i + 1).padStart(3, "0")}`,
          TEST_PROGRAM_ID,
          date.toISOString(),
          50000 * (i + 1),
          50000 * (i + 1) * cpi,
          50000 * (i + 1),
          300000,
          cpi,
          0.95,
          0, 0, 0,
          "active",
          "Health: healthy (score: 75)",
          "system",
          date.toISOString(),
        ]);
      }

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const analysis = await analyzeCPITrend(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        12
      );

      expect(analysis.trend).toBe("declining");
      expect(analysis.slope).toBeLessThan(-0.01); // Negative slope threshold
      expect(analysis.currentCPI).toBeCloseTo(0.8, 2);
    });

    it("should detect stable CPI trend", async () => {
      // Create snapshots with stable CPI (around 1.0)
      const snapshots: any[][] = [];
      for (let i = 0; i < 6; i++) {
        const date = new Date("2026-01-01");
        date.setMonth(date.getMonth() + i);
        const cpi = 1.0 + (Math.random() - 0.5) * 0.01; // Stable with minimal noise

        snapshots.push([
          `SNAP-${String(i + 1).padStart(3, "0")}`,
          TEST_PROGRAM_ID,
          date.toISOString(),
          50000 * (i + 1),
          50000 * (i + 1) * cpi,
          50000 * (i + 1),
          300000,
          cpi,
          0.95,
          0, 0, 0,
          "active",
          "Health: healthy (score: 75)",
          "system",
          date.toISOString(),
        ]);
      }

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const analysis = await analyzeCPITrend(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        12
      );

      expect(analysis.trend).toBe("stable");
      expect(analysis.slope).toBeGreaterThanOrEqual(-0.01);
      expect(analysis.slope).toBeLessThanOrEqual(0.01);
      expect(analysis.volatility).toBeLessThan(0.1); // Low volatility
    });

    it("should handle no snapshots", async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [] },
      });

      const analysis = await analyzeCPITrend(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        12
      );

      expect(analysis.trend).toBe("stable");
      expect(analysis.currentCPI).toBe(0);
      expect(analysis.averageCPI).toBe(0);
      expect(analysis.volatility).toBe(0);
    });
  });

  describe("analyzeSPITrend", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should detect improving SPI trend", async () => {
      const snapshots: any[][] = [];
      for (let i = 0; i < 6; i++) {
        const date = new Date("2026-01-01");
        date.setMonth(date.getMonth() + i);
        const spi = 0.8 + i * 0.05; // Improving from 0.8 to 1.05

        snapshots.push([
          `SNAP-${String(i + 1).padStart(3, "0")}`,
          TEST_PROGRAM_ID,
          date.toISOString(),
          50000 * (i + 1),
          50000 * (i + 1) * spi,
          50000 * (i + 1),
          300000,
          1.0, // CPI
          spi,
          0, 0, 0,
          "active",
          "Health: healthy (score: 75)",
          "system",
          date.toISOString(),
        ]);
      }

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const analysis = await analyzeSPITrend(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        12
      );

      expect(analysis.trend).toBe("improving");
      expect(analysis.slope).toBeGreaterThan(0.01);
      expect(analysis.currentSPI).toBeCloseTo(1.05, 2);
    });

    it("should detect declining SPI trend", async () => {
      const snapshots: any[][] = [];
      for (let i = 0; i < 6; i++) {
        const date = new Date("2026-01-01");
        date.setMonth(date.getMonth() + i);
        const spi = 1.05 - i * 0.05; // Declining from 1.05 to 0.8

        snapshots.push([
          `SNAP-${String(i + 1).padStart(3, "0")}`,
          TEST_PROGRAM_ID,
          date.toISOString(),
          50000 * (i + 1),
          50000 * (i + 1) * spi,
          50000 * (i + 1),
          300000,
          1.0,
          spi,
          0, 0, 0,
          "active",
          "Health: healthy (score: 75)",
          "system",
          date.toISOString(),
        ]);
      }

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const analysis = await analyzeSPITrend(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        12
      );

      expect(analysis.trend).toBe("declining");
      expect(analysis.slope).toBeLessThan(-0.01);
    });
  });

  describe("detectAnomalies", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should detect high CPI outlier", async () => {
      // Create snapshots with mostly stable CPI and one high outlier
      const snapshots: any[][] = [];
      for (let i = 0; i < 10; i++) {
        const date = new Date("2026-01-01");
        date.setMonth(date.getMonth() + i);
        const cpi = i === 5 ? 1.5 : 1.0; // Outlier at index 5

        snapshots.push([
          `SNAP-${String(i + 1).padStart(3, "0")}`,
          TEST_PROGRAM_ID,
          date.toISOString(),
          50000 * (i + 1),
          50000 * (i + 1) * cpi,
          50000 * (i + 1),
          300000,
          cpi,
          1.0, // SPI
          0, 0, 0,
          "active",
          "Health: healthy (score: 75)",
          "system",
          date.toISOString(),
        ]);
      }

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const anomalies = await detectAnomalies(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        "cpi",
        2.0 // 2 standard deviations
      );

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].snapshotId).toBe("SNAP-006");
      expect(anomalies[0].deviation).toBe("high");
      expect(anomalies[0].zScore).toBeGreaterThan(2.0);
    });

    it("should detect low SV outlier", async () => {
      const snapshots: any[][] = [];
      for (let i = 0; i < 10; i++) {
        const date = new Date("2026-01-01");
        date.setMonth(date.getMonth() + i);
        const sv = i === 7 ? -50000 : 0; // Large negative outlier

        snapshots.push([
          `SNAP-${String(i + 1).padStart(3, "0")}`,
          TEST_PROGRAM_ID,
          date.toISOString(),
          50000 * (i + 1),
          50000 * (i + 1),
          50000 * (i + 1),
          300000,
          1.0, // CPI
          1.0, // SPI
          0,
          sv, // SV
          0,
          "active",
          "Health: healthy (score: 75)",
          "system",
          date.toISOString(),
        ]);
      }

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const anomalies = await detectAnomalies(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        "sv",
        2.0
      );

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].deviation).toBe("low");
      expect(anomalies[0].zScore).toBeLessThan(-2.0);
    });

    it("should return empty array with insufficient data", async () => {
      const snapshots: any[][] = [
        [
          "SNAP-001",
          TEST_PROGRAM_ID,
          new Date("2026-01-01").toISOString(),
          50000, 50000, 50000, 300000, 1.0, 1.0, 0, 0, 0,
          "active",
          "Health: healthy (score: 75)",
          "system",
          new Date("2026-01-01").toISOString(),
        ],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const anomalies = await detectAnomalies(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        "cpi",
        2.0
      );

      // Need at least 3 data points
      expect(anomalies).toEqual([]);
    });

    it("should handle different threshold values", async () => {
      const snapshots: any[][] = [];
      for (let i = 0; i < 10; i++) {
        const date = new Date("2026-01-01");
        date.setMonth(date.getMonth() + i);
        const cpi = i === 5 ? 1.3 : 1.0; // Moderate outlier

        snapshots.push([
          `SNAP-${String(i + 1).padStart(3, "0")}`,
          TEST_PROGRAM_ID,
          date.toISOString(),
          50000 * (i + 1),
          50000 * (i + 1) * cpi,
          50000 * (i + 1),
          300000,
          cpi,
          1.0,
          0, 0, 0,
          "active",
          "Health: healthy (score: 75)",
          "system",
          date.toISOString(),
        ]);
      }

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      // Stricter threshold (3 std dev)
      const anomaliesStrict = await detectAnomalies(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        "cpi",
        3.0
      );

      expect(anomaliesStrict.length).toBe(0); // Moderate outlier not caught
    });
  });

  describe("analyzePerformanceTrend", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should identify improving overall trend", async () => {
      // Create snapshots with improving CPI and SPI
      const snapshots: any[][] = [];
      for (let i = 0; i < 6; i++) {
        const date = new Date("2026-01-01");
        date.setMonth(date.getMonth() + i);
        const cpi = 0.9 + i * 0.03; // Improving
        const spi = 0.85 + i * 0.04; // Improving
        const healthScore = 60 + i * 5; // Improving

        snapshots.push([
          `SNAP-${String(i + 1).padStart(3, "0")}`,
          TEST_PROGRAM_ID,
          date.toISOString(),
          50000 * (i + 1),
          50000 * (i + 1),
          50000 * (i + 1),
          300000,
          cpi,
          spi,
          0, 0, 0,
          "active",
          `Health: healthy (score: ${healthScore})`,
          "system",
          date.toISOString(),
        ]);
      }

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: snapshots },
      });

      const analysis = await analyzePerformanceTrend(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        12
      );

      expect(analysis.overallTrend).toBe("improving");
      expect(analysis.cpiAnalysis.trend).toBe("improving");
      expect(analysis.spiAnalysis.trend).toBe("improving");
      expect(analysis.healthTrend.slope).toBeGreaterThan(0);
      expect(analysis.recommendations).toContain(
        expect.stringMatching(/improving/i)
      );
    });

    it("should identify high risk level for poor performance", async () => {
      const snapshots: any[][] = [];
      for (let i = 0; i < 6; i++) {
        const date = new Date("2026-01-01");
        date.setMonth(date.getMonth() + i);
        const cpi = 0.9 - i * 0.03; // Declining, ending below 0.85
        const spi = 0.85 - i * 0.02; // Declining
        const healthScore = 70 - i * 5; // Declining

        snapshots.push([
          `SNAP-${String(i + 1).padStart(3, "0")}`,
          TEST_PROGRAM_ID,
          date.toISOString(),
          50000 * (i + 1),
          50000 * (i + 1),
          50000 * (i + 1),
          300000,
          cpi,
          spi,
          0, 0, 0,
          "active",
          `Health: warning (score: ${healthScore})`,
          "system",
          date.toISOString(),
        ]);
      }

      mockSheets.spreadsheets.values.get.mockResolvedValue({
        data: { values: snapshots },
      });

      const analysis = await analyzePerformanceTrend(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        12
      );

      expect(analysis.riskLevel).toBe("high");
      expect(analysis.cpiAnalysis.trend).toBe("declining");
      expect(analysis.spiAnalysis.trend).toBe("declining");
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.recommendations.some(r => r.includes("declining"))).toBe(true);
    });
  });

  describe("compareToBaseline", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should calculate positive deltas for improved performance", async () => {
      const snapshots: any[][] = [
        // Baseline snapshot
        [
          "SNAP-001",
          TEST_PROGRAM_ID,
          new Date("2026-01-01").toISOString(),
          100000, // PV
          95000, // EV
          100000, // AC
          300000, // BAC
          0.95, // CPI
          0.95, // SPI
          -5000, // CV
          -5000, // SV
          315789, // EAC
          "active",
          "Health: warning (score: 65)",
          "system",
          new Date("2026-01-01").toISOString(),
        ],
        // Current snapshot (improved)
        [
          "SNAP-006",
          TEST_PROGRAM_ID,
          new Date("2026-06-01").toISOString(),
          200000,
          210000, // Improved EV
          200000,
          300000,
          1.05, // Improved CPI
          1.05, // Improved SPI
          10000, // Positive CV
          10000, // Positive SV
          285714, // Better EAC
          "active",
          "Health: healthy (score: 85)",
          "system",
          new Date("2026-06-01").toISOString(),
        ],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const comparison = await compareToBaseline(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        "SNAP-001"
      );

      expect(comparison.cpiChange).toBeGreaterThan(0); // 1.05 - 0.95 = 0.1
      expect(comparison.spiChange).toBeGreaterThan(0);
      expect(comparison.costVariance).toBeGreaterThan(0); // 10000 - (-5000) = 15000
      expect(comparison.summary).toContain("improved");
    });

    it("should calculate negative deltas for declined performance", async () => {
      const snapshots: any[][] = [
        // Baseline snapshot (healthy)
        [
          "SNAP-001",
          TEST_PROGRAM_ID,
          new Date("2026-01-01").toISOString(),
          100000,
          105000,
          100000,
          300000,
          1.05, // Good CPI
          1.05, // Good SPI
          5000,
          5000,
          285714,
          "active",
          "Health: healthy (score: 85)",
          "system",
          new Date("2026-01-01").toISOString(),
        ],
        // Current snapshot (declined)
        [
          "SNAP-006",
          TEST_PROGRAM_ID,
          new Date("2026-06-01").toISOString(),
          200000,
          180000,
          210000,
          300000,
          0.86, // Declined CPI
          0.90, // Declined SPI
          -30000,
          -20000,
          348837,
          "active",
          "Health: critical (score: 45)",
          "system",
          new Date("2026-06-01").toISOString(),
        ],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const comparison = await compareToBaseline(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        "SNAP-001"
      );

      expect(comparison.cpiChange).toBeLessThan(0); // 0.86 - 1.05 = -0.19
      expect(comparison.spiChange).toBeLessThan(0);
      expect(comparison.summary).toContain("declined");
    });

    it("should throw error if baseline snapshot not found", async () => {
      const snapshots: any[][] = [
        [
          "SNAP-002",
          TEST_PROGRAM_ID,
          new Date("2026-01-01").toISOString(),
          100000, 100000, 100000, 300000, 1.0, 1.0, 0, 0, 0,
          "active",
          "Health: healthy (score: 75)",
          "system",
          new Date("2026-01-01").toISOString(),
        ],
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      await expect(
        compareToBaseline(
          mockSheets,
          TEST_SPREADSHEET_ID,
          TEST_PROGRAM_ID,
          "SNAP-001" // Not in snapshots
        )
      ).rejects.toThrow("Baseline snapshot SNAP-001 not found");
    });
  });
});
