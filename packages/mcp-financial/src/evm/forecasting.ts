/**
 * EVM Forecasting Module
 *
 * This module implements PMBOK-standard forecasting methods for predicting
 * project completion dates and budgets using Earned Value Management metrics.
 *
 * Forecasting Methods (per PMI/PMBOK):
 * - EAC using CPI: Assumes current cost performance continues
 * - EAC using CPI and SPI: Considers both cost and schedule performance
 * - EAC using bottom-up: Detailed re-estimate based on actual remaining work
 * - Completion Date: Forecasted end date based on schedule performance
 * - TCPI: To-Complete Performance Index for performance targets
 *
 * All formulas follow the Project Management Body of Knowledge (PMBOK) standard.
 */

import type { sheets_v4 } from "googleapis";
import type { EVMSnapshot, EVMMetrics } from "../types/financial.js";
import { performEVMCalculation, calculateEVMMetrics } from "./calculations.js";
import { getSnapshotHistory, getLatestSnapshot } from "./snapshots.js";

/**
 * Confidence level for forecast accuracy
 * Based on historical CPI stability
 */
export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Forecast methods for EAC calculation
 */
export type ForecastMethod = "cpi" | "cpi-spi" | "bottom-up";

/**
 * Forecast EAC using CPI (Cost Performance Index)
 *
 * This is the most common forecasting method, assuming that future work
 * will be performed at the same cost efficiency as past work.
 *
 * Formula: EAC = BAC / CPI
 *
 * Use when:
 * - Past performance is a reliable predictor of future performance
 * - No significant changes expected in work conditions
 * - CPI has been relatively stable (variance < 0.05)
 *
 * @param bac - Budget at Completion (total planned budget)
 * @param ac - Actual Cost (spent to date)
 * @param cpi - Cost Performance Index (efficiency ratio)
 * @returns Estimate at Completion
 *
 * @example
 * // Project with $100K budget, 0.9 CPI (10% over budget)
 * const eac = forecastEACUsingCPI(100000, 45000, 0.9);
 * // Returns: 111111.11 (project will exceed budget by ~$11K)
 */
export function forecastEACUsingCPI(bac: number, ac: number, cpi: number): number {
  // Handle edge cases
  if (bac <= 0) {
    return 0;
  }

  if (cpi <= 0) {
    // If CPI is 0 or negative, project is in critical state
    // Return BAC + current overrun as worst-case estimate
    return bac + Math.abs(ac);
  }

  // Standard PMBOK formula: EAC = BAC / CPI
  const eac = bac / cpi;

  return Math.round(eac * 100) / 100;
}

/**
 * Forecast EAC using both CPI and SPI
 *
 * This method considers both cost and schedule performance, providing
 * a more comprehensive (and often more pessimistic) forecast.
 *
 * Formula: EAC = AC + [(BAC - EV) / (CPI × SPI)]
 *
 * Use when:
 * - Both cost and schedule variances are significant
 * - Schedule delays impact remaining work costs
 * - Project is behind schedule and over budget
 * - You need a more conservative estimate
 *
 * The combined factor (CPI × SPI) represents overall project efficiency.
 * If project is both over budget (CPI < 1) and behind schedule (SPI < 1),
 * the denominator becomes very small, resulting in a higher EAC.
 *
 * @param bac - Budget at Completion
 * @param ac - Actual Cost
 * @param ev - Earned Value
 * @param cpi - Cost Performance Index
 * @param spi - Schedule Performance Index
 * @returns Estimate at Completion
 *
 * @example
 * // Project behind schedule and over budget
 * const eac = forecastEACUsingCPIAndSPI(100000, 45000, 40000, 0.89, 0.85);
 * // Returns higher EAC than CPI-only method due to schedule factor
 */
export function forecastEACUsingCPIAndSPI(
  bac: number,
  ac: number,
  ev: number,
  cpi: number,
  spi: number
): number {
  // Handle edge cases
  if (bac <= 0) {
    return 0;
  }

  // Calculate remaining work
  const remainingWork = bac - ev;

  // Calculate combined performance factor
  const performanceFactor = cpi * spi;

  if (performanceFactor <= 0) {
    // Critical state: return worst-case estimate
    // Assume remaining work costs at least as much as planned, plus current overrun
    return ac + remainingWork + Math.abs(bac - ac);
  }

  // PMBOK formula: EAC = AC + [(BAC - EV) / (CPI × SPI)]
  const eac = ac + (remainingWork / performanceFactor);

  return Math.round(eac * 100) / 100;
}

/**
 * Calculate Estimate to Complete (ETC)
 *
 * ETC represents the expected cost to finish all remaining work.
 *
 * Formula: ETC = EAC - AC
 *
 * This is a derived metric that tells you how much more money you need
 * to spend to complete the project, based on the EAC forecast.
 *
 * @param eac - Estimate at Completion
 * @param ac - Actual Cost (spent to date)
 * @returns Estimate to Complete (remaining budget needed)
 *
 * @example
 * const etc = forecastETC(110000, 45000);
 * // Returns: 65000 (need $65K more to complete)
 */
export function forecastETC(eac: number, ac: number): number {
  const etc = eac - ac;

  // ETC cannot be negative (can't "unspend" money)
  return Math.max(0, Math.round(etc * 100) / 100);
}

/**
 * Forecast completion date based on schedule performance
 *
 * Calculates when the project will actually complete based on current
 * schedule performance (SPI).
 *
 * Formula: Forecast Date = Today + [(Planned End - Today) / SPI]
 *
 * Logic:
 * - If SPI = 1.0: On schedule, forecast = planned end date
 * - If SPI < 1.0: Behind schedule, forecast date is later than planned
 * - If SPI > 1.0: Ahead of schedule, forecast date is earlier than planned
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program identifier
 * @param plannedEndDate - Originally planned completion date
 * @returns Forecasted completion date, variance in days, and on-time status
 *
 * @example
 * const forecast = await forecastCompletionDate(
 *   sheets,
 *   spreadsheetId,
 *   "PROG-001",
 *   new Date("2024-12-31")
 * );
 * // Returns: {
 * //   forecastDate: new Date("2025-02-15"),
 * //   variance: 46,  // 46 days late
 * //   onTime: false
 * // }
 */
export async function forecastCompletionDate(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  plannedEndDate: Date
): Promise<{
  forecastDate: Date;
  variance: number;
  onTime: boolean;
}> {
  try {
    // Get latest snapshot to obtain current SPI
    const latestSnapshot = await getLatestSnapshot(sheets, spreadsheetId, programId);

    if (!latestSnapshot) {
      throw new Error(`No EVM snapshots found for program ${programId}`);
    }

    const spi = latestSnapshot.spi;
    const today = new Date();

    // Calculate remaining planned days
    const remainingDays = Math.max(
      0,
      (plannedEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If SPI is 0 or negative, project is not making progress
    if (spi <= 0) {
      // Return a date far in the future to indicate severe delay
      const forecastDate = new Date(plannedEndDate);
      forecastDate.setFullYear(forecastDate.getFullYear() + 1);

      return {
        forecastDate,
        variance: 365,
        onTime: false,
      };
    }

    // Calculate forecasted remaining days based on SPI
    // Lower SPI means slower progress, thus more days needed
    const forecastedRemainingDays = remainingDays / spi;

    // Calculate forecast completion date
    const forecastDate = new Date(today);
    forecastDate.setDate(forecastDate.getDate() + forecastedRemainingDays);

    // Calculate variance in days (negative = early, positive = late)
    const varianceDays = Math.round(
      (forecastDate.getTime() - plannedEndDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Consider "on time" if within ±7 days (1 week tolerance)
    const onTime = varianceDays <= 7;

    return {
      forecastDate,
      variance: varianceDays,
      onTime,
    };
  } catch (error) {
    throw new Error(
      `Failed to forecast completion date: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Forecast Budget at Completion using specified method
 *
 * Calculates EAC, ETC, and VAC using the specified forecasting method,
 * and assesses confidence level based on historical CPI stability.
 *
 * Confidence Assessment:
 * - High: CPI variance < 0.05 over last 3 months (stable performance)
 * - Medium: CPI variance 0.05-0.15 (moderate volatility)
 * - Low: CPI variance > 0.15 (high volatility, unreliable forecast)
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program identifier
 * @param method - Forecasting method to use (default: 'cpi')
 * @returns EAC, ETC, VAC, method used, and confidence level
 *
 * @example
 * const forecast = await forecastBudgetAtCompletion(
 *   sheets,
 *   spreadsheetId,
 *   "PROG-001",
 *   "cpi-spi"
 * );
 * // Returns: {
 * //   eac: 110500,
 * //   etc: 65500,
 * //   vac: -10500,
 * //   method: "cpi-spi",
 * //   confidence: "medium"
 * // }
 */
export async function forecastBudgetAtCompletion(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  method: ForecastMethod = "cpi"
): Promise<{
  eac: number;
  etc: number;
  vac: number;
  method: string;
  confidence: ConfidenceLevel;
}> {
  try {
    // Get current EVM metrics
    const latestSnapshot = await getLatestSnapshot(sheets, spreadsheetId, programId);

    if (!latestSnapshot) {
      throw new Error(`No EVM snapshots found for program ${programId}`);
    }

    const { bac, ac, ev, cpi, spi } = latestSnapshot;

    // Calculate EAC based on method
    let eac: number;

    switch (method) {
      case "cpi":
        eac = forecastEACUsingCPI(bac, ac, cpi);
        break;

      case "cpi-spi":
        eac = forecastEACUsingCPIAndSPI(bac, ac, ev, cpi, spi);
        break;

      case "bottom-up":
        // For bottom-up, we use current AC plus remaining work at original budget
        // This assumes we've learned from past performance and will manage better
        const remainingBudget = bac - ev;
        eac = ac + remainingBudget;
        break;

      default:
        throw new Error(`Unknown forecasting method: ${method}`);
    }

    // Calculate ETC and VAC
    const etc = forecastETC(eac, ac);
    const vac = bac - eac; // Positive = under budget, negative = over budget

    // Assess confidence based on historical CPI stability
    const confidence = await assessForecastConfidence(sheets, spreadsheetId, programId);

    return {
      eac: Math.round(eac * 100) / 100,
      etc: Math.round(etc * 100) / 100,
      vac: Math.round(vac * 100) / 100,
      method,
      confidence,
    };
  } catch (error) {
    throw new Error(
      `Failed to forecast budget at completion: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Assess forecast confidence based on historical CPI stability
 *
 * Analyzes the last 3 months of snapshots to determine CPI variance.
 * More stable CPI indicates more reliable forecasts.
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program identifier
 * @returns Confidence level (high, medium, or low)
 */
async function assessForecastConfidence(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<ConfidenceLevel> {
  try {
    // Get last 3 months of snapshots
    const history = await getSnapshotHistory(sheets, spreadsheetId, programId, 3);

    if (history.length < 2) {
      // Not enough history to assess confidence
      return "low";
    }

    // Calculate CPI variance (standard deviation)
    const cpiValues = history.map((s) => s.cpi);
    const meanCPI = cpiValues.reduce((sum, val) => sum + val, 0) / cpiValues.length;

    const variance =
      cpiValues.reduce((sum, val) => sum + Math.pow(val - meanCPI, 2), 0) / cpiValues.length;

    const stdDev = Math.sqrt(variance);

    // Classify confidence based on standard deviation
    if (stdDev < 0.05) {
      return "high"; // Very stable CPI
    } else if (stdDev < 0.15) {
      return "medium"; // Moderate stability
    } else {
      return "low"; // High volatility
    }
  } catch (error) {
    // If we can't assess confidence, default to low
    return "low";
  }
}

/**
 * Generate three forecast scenarios for risk planning
 *
 * Creates optimistic, baseline, and pessimistic forecasts to help
 * with risk management and decision-making.
 *
 * Scenarios:
 * - Optimistic: Assumes CPI and SPI improve by 10%
 * - Baseline: Assumes current performance continues (CPI method)
 * - Pessimistic: Assumes CPI and SPI degrade by 10%
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program identifier
 * @returns Three scenarios with EAC and completion date forecasts
 *
 * @example
 * const scenarios = await generateForecastScenarios(
 *   sheets,
 *   spreadsheetId,
 *   "PROG-001"
 * );
 * // Use scenarios.optimistic, scenarios.baseline, scenarios.pessimistic
 * // for risk planning and management presentations
 */
export async function generateForecastScenarios(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<{
  optimistic: { eac: number; completionDate: Date };
  baseline: { eac: number; completionDate: Date };
  pessimistic: { eac: number; completionDate: Date };
}> {
  try {
    // Get current metrics
    const latestSnapshot = await getLatestSnapshot(sheets, spreadsheetId, programId);

    if (!latestSnapshot) {
      throw new Error(`No EVM snapshots found for program ${programId}`);
    }

    const { bac, ac, ev, cpi, spi } = latestSnapshot;

    // Baseline scenario: Current performance continues
    const baselineEAC = forecastEACUsingCPI(bac, ac, cpi);

    // Optimistic scenario: 10% improvement in both CPI and SPI
    const optimisticCPI = cpi * 1.1;
    const optimisticSPI = spi * 1.1;
    const optimisticEAC = forecastEACUsingCPI(bac, ac, optimisticCPI);

    // Pessimistic scenario: 10% degradation in both CPI and SPI
    const pessimisticCPI = cpi * 0.9;
    const pessimisticSPI = spi * 0.9;
    const pessimisticEAC = forecastEACUsingCPIAndSPI(bac, ac, ev, pessimisticCPI, pessimisticSPI);

    // For completion dates, we need a planned end date
    // We'll estimate it based on current date and remaining work
    const today = new Date();
    const percentComplete = ev / bac;
    const elapsedDays = 180; // Assume 6 months elapsed (placeholder)
    const totalDays = elapsedDays / percentComplete;
    const remainingDays = totalDays - elapsedDays;

    // Calculate completion dates for each scenario
    const baselineDate = new Date(today);
    baselineDate.setDate(baselineDate.getDate() + remainingDays / spi);

    const optimisticDate = new Date(today);
    optimisticDate.setDate(optimisticDate.getDate() + remainingDays / optimisticSPI);

    const pessimisticDate = new Date(today);
    pessimisticDate.setDate(pessimisticDate.getDate() + remainingDays / pessimisticSPI);

    return {
      optimistic: {
        eac: Math.round(optimisticEAC * 100) / 100,
        completionDate: optimisticDate,
      },
      baseline: {
        eac: Math.round(baselineEAC * 100) / 100,
        completionDate: baselineDate,
      },
      pessimistic: {
        eac: Math.round(pessimisticEAC * 100) / 100,
        completionDate: pessimisticDate,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to generate forecast scenarios: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Calculate To-Complete Performance Index (TCPI) for target achievement
 *
 * TCPI indicates the cost performance efficiency required on remaining work
 * to achieve a specific target (either BAC or a custom EAC).
 *
 * Formulas:
 * - TCPI(BAC) = (BAC - EV) / (BAC - AC)
 * - TCPI(EAC) = (BAC - EV) / (targetEAC - AC)
 *
 * Interpretation:
 * - TCPI = 1.0: Need to maintain current efficiency
 * - TCPI < 1.0: Can afford to be less efficient (project is ahead/under budget)
 * - TCPI > 1.0: Must improve efficiency to meet target
 * - TCPI > 1.1: Difficult but achievable with focused effort
 * - TCPI > 1.2: Very challenging, may need scope/budget adjustments
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program identifier
 * @param targetEAC - Target EAC to achieve (optional, defaults to BAC)
 * @returns TCPI values, feasibility assessment, and required improvement
 *
 * @example
 * const tcpiAnalysis = await calculateRequiredPerformance(
 *   sheets,
 *   spreadsheetId,
 *   "PROG-001",
 *   105000  // Want to complete for $105K instead of forecasted $110K
 * );
 * // Returns: {
 * //   tcpiBAC: 1.05,
 * //   tcpiEAC: 1.15,
 * //   feasible: true,
 * //   requiredImprovement: "15% improvement in cost efficiency needed"
 * // }
 */
export async function calculateRequiredPerformance(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  targetEAC?: number
): Promise<{
  tcpiBAC: number;
  tcpiEAC: number;
  feasible: boolean;
  requiredImprovement: string;
}> {
  try {
    // Get current metrics
    const latestSnapshot = await getLatestSnapshot(sheets, spreadsheetId, programId);

    if (!latestSnapshot) {
      throw new Error(`No EVM snapshots found for program ${programId}`);
    }

    const { bac, ac, ev, cpi } = latestSnapshot;

    // Calculate remaining work and budget
    const remainingWork = bac - ev;
    const remainingBudgetBAC = bac - ac;

    // TCPI to achieve BAC (original budget)
    // Formula: (BAC - EV) / (BAC - AC)
    let tcpiBAC = 0;
    if (remainingBudgetBAC > 0) {
      tcpiBAC = remainingWork / remainingBudgetBAC;
    } else {
      // Budget exhausted, impossible to meet BAC
      tcpiBAC = Infinity;
    }

    // TCPI to achieve target EAC (if provided)
    let tcpiEAC = tcpiBAC; // Default to same as BAC
    const eacTarget = targetEAC || bac;

    const remainingBudgetEAC = eacTarget - ac;

    if (remainingBudgetEAC > 0) {
      tcpiEAC = remainingWork / remainingBudgetEAC;
    } else {
      // Target budget exhausted, impossible to achieve
      tcpiEAC = Infinity;
    }

    // Assess feasibility
    // TCPI <= 1.1 is achievable with effort
    const feasible = tcpiEAC <= 1.1 && tcpiEAC !== Infinity;

    // Calculate required improvement
    let requiredImprovement: string;

    if (tcpiEAC === Infinity) {
      requiredImprovement = "Target is impossible - budget already exhausted";
    } else if (tcpiEAC <= 1.0) {
      const margin = ((1.0 - tcpiEAC) * 100).toFixed(1);
      requiredImprovement = `No improvement needed - ${margin}% margin available`;
    } else {
      const improvement = ((tcpiEAC - 1.0) * 100).toFixed(1);
      requiredImprovement = `${improvement}% improvement in cost efficiency needed`;

      if (tcpiEAC > 1.2) {
        requiredImprovement += " (very challenging - consider scope/budget adjustment)";
      } else if (tcpiEAC > 1.1) {
        requiredImprovement += " (challenging but achievable with focused effort)";
      } else {
        requiredImprovement += " (achievable with improved efficiency)";
      }
    }

    return {
      tcpiBAC: tcpiBAC === Infinity ? 0 : Math.round(tcpiBAC * 10000) / 10000,
      tcpiEAC: tcpiEAC === Infinity ? 0 : Math.round(tcpiEAC * 10000) / 10000,
      feasible,
      requiredImprovement,
    };
  } catch (error) {
    throw new Error(
      `Failed to calculate required performance: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
