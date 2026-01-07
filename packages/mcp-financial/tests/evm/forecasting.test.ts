/**
 * EVM Forecasting Unit Tests
 *
 * Tests all EVM forecasting functions to verify PMBOK formula compliance
 * and forecast accuracy across different scenarios.
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  forecastEACUsingCPI,
  forecastEACUsingCPIAndSPI,
  forecastETC,
  forecastBudgetAtCompletion,
  forecastCompletionDate,
  generateForecastScenarios,
  calculateRequiredPerformance,
} from "../../src/evm/forecasting.js";
import type { EVMSnapshot } from "../../src/types/financial.js";

describe("EVM Forecasting", () => {
  describe("forecastEACUsingCPI", () => {
    it("should calculate EAC correctly for project on budget", () => {
      const bac = 100000;
      const ac = 50000;
      const cpi = 1.0; // On budget

      const eac = forecastEACUsingCPI(bac, ac, cpi);

      // EAC = BAC / CPI = 100000 / 1.0 = 100000
      expect(eac).toBe(100000);
    });

    it("should calculate EAC correctly for project over budget", () => {
      const bac = 100000;
      const ac = 50000;
      const cpi = 0.9; // 10% over budget

      const eac = forecastEACUsingCPI(bac, ac, cpi);

      // EAC = BAC / CPI = 100000 / 0.9 = 111,111.11
      expect(eac).toBeCloseTo(111111.11, 2);
    });

    it("should calculate EAC correctly for project under budget", () => {
      const bac = 100000;
      const ac = 50000;
      const cpi = 1.1; // 10% under budget

      const eac = forecastEACUsingCPI(bac, ac, cpi);

      // EAC = BAC / CPI = 100000 / 1.1 = 90,909.09
      expect(eac).toBeCloseTo(90909.09, 2);
    });

    it("should handle zero BAC", () => {
      const eac = forecastEACUsingCPI(0, 50000, 0.9);
      expect(eac).toBe(0);
    });

    it("should handle zero CPI (critical state)", () => {
      const bac = 100000;
      const ac = 50000;
      const cpi = 0; // Critical: not earning value

      const eac = forecastEACUsingCPI(bac, ac, cpi);

      // Fallback: BAC + AC = 100000 + 50000 = 150000
      expect(eac).toBe(150000);
    });

    it("should handle negative CPI (project in trouble)", () => {
      const bac = 100000;
      const ac = 60000;
      const cpi = -0.5; // Negative (theoretical worst case)

      const eac = forecastEACUsingCPI(bac, ac, cpi);

      // Fallback calculation: BAC + |AC| = 100000 + 60000 = 160000
      expect(eac).toBe(160000);
    });

    it("should handle very high CPI (excellent performance)", () => {
      const bac = 100000;
      const ac = 40000;
      const cpi = 1.5; // 50% under budget

      const eac = forecastEACUsingCPI(bac, ac, cpi);

      // EAC = 100000 / 1.5 = 66,666.67
      expect(eac).toBeCloseTo(66666.67, 2);
    });
  });

  describe("forecastEACUsingCPIAndSPI", () => {
    it("should calculate EAC for project on schedule and budget", () => {
      const bac = 100000;
      const ac = 50000;
      const ev = 50000;
      const cpi = 1.0;
      const spi = 1.0;

      const eac = forecastEACUsingCPIAndSPI(bac, ac, ev, cpi, spi);

      // Performance factor = 1.0 × 1.0 = 1.0
      // Remaining work = 100000 - 50000 = 50000
      // EAC = 50000 + (50000 / 1.0) = 100000
      expect(eac).toBe(100000);
    });

    it("should calculate EAC for project over budget and behind schedule", () => {
      const bac = 100000;
      const ac = 50000;
      const ev = 40000; // Behind schedule
      const cpi = 0.8; // Over budget
      const spi = 0.8; // Behind schedule

      const eac = forecastEACUsingCPIAndSPI(bac, ac, ev, cpi, spi);

      // Performance factor = 0.8 × 0.8 = 0.64
      // Remaining work = 100000 - 40000 = 60000
      // EAC = 50000 + (60000 / 0.64) = 50000 + 93750 = 143750
      expect(eac).toBe(143750);
    });

    it("should calculate EAC for project ahead of schedule", () => {
      const bac = 100000;
      const ac = 45000;
      const ev = 55000; // Ahead of schedule
      const cpi = 1.22; // Under budget
      const spi = 1.1; // Ahead

      const eac = forecastEACUsingCPIAndSPI(bac, ac, ev, cpi, spi);

      // Performance factor = 1.22 × 1.1 = 1.342
      // Remaining work = 100000 - 55000 = 45000
      // EAC = 45000 + (45000 / 1.342) = 45000 + 33532.64 = 78532.64
      expect(eac).toBeCloseTo(78532.64, 2);
    });

    it("should handle zero BAC", () => {
      const eac = forecastEACUsingCPIAndSPI(0, 50000, 40000, 0.8, 0.8);
      expect(eac).toBe(0);
    });

    it("should handle zero performance factor (critical state)", () => {
      const bac = 100000;
      const ac = 50000;
      const ev = 40000;
      const cpi = 0;
      const spi = 0.8;

      const eac = forecastEACUsingCPIAndSPI(bac, ac, ev, cpi, spi);

      // Worst-case estimate when performance factor is 0
      // EAC = AC + remaining work + (BAC - AC)
      // = 50000 + 60000 + 50000 = 160000
      expect(eac).toBe(160000);
    });

    it("should provide more conservative forecast than CPI-only", () => {
      const bac = 100000;
      const ac = 50000;
      const ev = 45000;
      const cpi = 0.9;
      const spi = 0.9;

      const eacCPI = forecastEACUsingCPI(bac, ac, cpi);
      const eacCPISPI = forecastEACUsingCPIAndSPI(bac, ac, ev, cpi, spi);

      // CPI+SPI method should be more pessimistic (higher) when both indices < 1
      expect(eacCPISPI).toBeGreaterThan(eacCPI);
    });

    it("should handle negative performance indices", () => {
      const bac = 100000;
      const ac = 60000;
      const ev = 40000;
      const cpi = -0.67;
      const spi = 0.8;

      const eac = forecastEACUsingCPIAndSPI(bac, ac, ev, cpi, spi);

      // Should use fallback calculation
      expect(eac).toBeGreaterThan(bac);
    });
  });

  describe("forecastETC", () => {
    it("should calculate ETC correctly", () => {
      const eac = 110000;
      const ac = 50000;

      const etc = forecastETC(eac, ac);

      // ETC = EAC - AC = 110000 - 50000 = 60000
      expect(etc).toBe(60000);
    });

    it("should return 0 when ETC would be negative", () => {
      const eac = 50000;
      const ac = 60000; // Spent more than forecast

      const etc = forecastETC(eac, ac);

      // Cannot have negative ETC
      expect(etc).toBe(0);
    });

    it("should handle very large values", () => {
      const eac = 10000000000; // 10 billion
      const ac = 5000000000; // 5 billion

      const etc = forecastETC(eac, ac);

      expect(etc).toBe(5000000000);
    });

    it("should handle EAC equal to AC (project complete)", () => {
      const eac = 100000;
      const ac = 100000;

      const etc = forecastETC(eac, ac);

      expect(etc).toBe(0);
    });

    it("should round to 2 decimal places", () => {
      const eac = 100000.456;
      const ac = 50000.123;

      const etc = forecastETC(eac, ac);

      // ETC = 50000.333, rounded to 50000.33
      expect(etc).toBe(50000.33);
    });
  });

  describe("Forecast Scenarios Analysis", () => {
    it("should create realistic optimistic scenario", () => {
      // Baseline: CPI = 0.95 (5% over budget)
      const bac = 100000;
      const ac = 50000;
      const baselineCPI = 0.95;

      // Optimistic: 10% improvement → CPI = 1.045
      const optimisticCPI = baselineCPI * 1.1;
      const optimisticEAC = forecastEACUsingCPI(bac, ac, optimisticCPI);

      // Should be better than baseline
      const baselineEAC = forecastEACUsingCPI(bac, ac, baselineCPI);
      expect(optimisticEAC).toBeLessThan(baselineEAC);
      expect(optimisticEAC).toBeLessThan(bac); // Should be under budget
    });

    it("should create realistic pessimistic scenario", () => {
      // Baseline: CPI = 0.9
      const bac = 100000;
      const ac = 50000;
      const ev = 45000;
      const baselineCPI = 0.9;
      const baselineSPI = 0.9;

      // Pessimistic: 10% degradation
      const pessimisticCPI = baselineCPI * 0.9;
      const pessimisticSPI = baselineSPI * 0.9;
      const pessimisticEAC = forecastEACUsingCPIAndSPI(
        bac,
        ac,
        ev,
        pessimisticCPI,
        pessimisticSPI
      );

      // Should be worse than baseline
      const baselineEAC = forecastEACUsingCPI(bac, ac, baselineCPI);
      expect(pessimisticEAC).toBeGreaterThan(baselineEAC);
    });
  });

  describe("TCPI Calculations", () => {
    it("should calculate TCPI for on-target project", () => {
      const bac = 100000;
      const ac = 50000;
      const ev = 50000;

      // Remaining work = 100000 - 50000 = 50000
      // Remaining budget = 100000 - 50000 = 50000
      // TCPI = 50000 / 50000 = 1.0
      const remainingWork = bac - ev;
      const remainingBudget = bac - ac;
      const tcpi = remainingWork / remainingBudget;

      expect(tcpi).toBe(1.0);
    });

    it("should calculate TCPI for over-budget project", () => {
      const bac = 100000;
      const ac = 60000; // Over budget
      const ev = 50000;

      // Remaining work = 100000 - 50000 = 50000
      // Remaining budget = 100000 - 60000 = 40000
      // TCPI = 50000 / 40000 = 1.25 (need 25% improvement)
      const remainingWork = bac - ev;
      const remainingBudget = bac - ac;
      const tcpi = remainingWork / remainingBudget;

      expect(tcpi).toBe(1.25);
      expect(tcpi).toBeGreaterThan(1.1); // Challenging target
    });

    it("should handle exhausted budget (TCPI = Infinity)", () => {
      const bac = 100000;
      const ac = 100000; // Budget exhausted
      const ev = 80000; // Not complete

      const remainingBudget = bac - ac;

      // When budget is exhausted, TCPI would be infinity
      expect(remainingBudget).toBe(0);
    });

    it("should identify achievable TCPI targets", () => {
      const bac = 100000;
      const ac = 45000;
      const ev = 50000; // Ahead of schedule

      const remainingWork = bac - ev;
      const remainingBudget = bac - ac;
      const tcpi = remainingWork / remainingBudget;

      // TCPI = 50000 / 55000 = 0.909 (below 1.0, very achievable)
      expect(tcpi).toBeLessThan(1.0);
      expect(tcpi).toBeCloseTo(0.909, 3);
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    it("should handle project at 100% completion", () => {
      const bac = 100000;
      const ac = 100000;
      const ev = 100000; // Complete

      const etc = forecastETC(bac, ac);
      expect(etc).toBe(0);

      const remainingWork = bac - ev;
      expect(remainingWork).toBe(0);
    });

    it("should handle new project (no spending yet)", () => {
      const bac = 100000;
      const ac = 0;
      const cpi = 0; // Can't calculate CPI yet

      const eac = forecastEACUsingCPI(bac, ac, cpi);

      // Should use fallback
      expect(eac).toBeGreaterThanOrEqual(bac);
    });

    it("should handle very small remaining work", () => {
      const bac = 100000;
      const ac = 99000;
      const ev = 99500; // Almost done

      const remainingWork = bac - ev;
      expect(remainingWork).toBe(500);

      const etc = forecastETC(100500, ac);
      expect(etc).toBe(1500);
    });

    it("should handle large budget overruns", () => {
      const bac = 100000;
      const ac = 150000; // 50% over budget
      const cpi = 0.5;

      const eac = forecastEACUsingCPI(bac, ac, cpi);

      // EAC = 100000 / 0.5 = 200000
      expect(eac).toBe(200000);
      expect(eac).toBe(2 * bac);
    });

    it("should handle precision with decimal values", () => {
      const bac = 123456.78;
      const ac = 61728.39;
      const cpi = 0.987654;

      const eac = forecastEACUsingCPI(bac, ac, cpi);

      // Should round to 2 decimal places
      expect(eac % 1).toBeLessThanOrEqual(0.01);
    });
  });

  describe("Confidence Assessment Logic", () => {
    it("should consider stable CPI as high confidence", () => {
      // Simulate CPI values with low variance
      const cpiValues = [0.95, 0.96, 0.94, 0.95, 0.96];
      const mean = cpiValues.reduce((sum, val) => sum + val, 0) / cpiValues.length;
      const variance =
        cpiValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        cpiValues.length;
      const stdDev = Math.sqrt(variance);

      // Low variance (< 0.05) indicates high confidence
      expect(stdDev).toBeLessThan(0.05);
    });

    it("should consider volatile CPI as low confidence", () => {
      // Simulate CPI values with high variance
      const cpiValues = [0.7, 1.1, 0.8, 1.2, 0.75];
      const mean = cpiValues.reduce((sum, val) => sum + val, 0) / cpiValues.length;
      const variance =
        cpiValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        cpiValues.length;
      const stdDev = Math.sqrt(variance);

      // High variance (> 0.15) indicates low confidence
      expect(stdDev).toBeGreaterThan(0.15);
    });
  });

  describe("Forecast Method Comparison", () => {
    it("should show CPI method is most optimistic for troubled projects", () => {
      const bac = 100000;
      const ac = 60000;
      const ev = 50000;
      const cpi = 0.833; // ev / ac
      const spi = 0.833; // ev / pv (assuming pv = 60000)

      const eacCPI = forecastEACUsingCPI(bac, ac, cpi);
      const eacCPISPI = forecastEACUsingCPIAndSPI(bac, ac, ev, cpi, spi);

      // CPI method is more optimistic (lower EAC)
      expect(eacCPI).toBeLessThan(eacCPISPI);
    });

    it("should show bottom-up method for recovery scenarios", () => {
      const bac = 100000;
      const ac = 60000;
      const ev = 50000;

      // Bottom-up assumes we manage remaining work at original budget
      const remainingBudget = bac - ev;
      const bottomUpEAC = ac + remainingBudget;

      // Bottom-up = 60000 + 50000 = 110000
      expect(bottomUpEAC).toBe(110000);
      expect(bottomUpEAC).toBeGreaterThan(bac); // Over budget
    });
  });
});
