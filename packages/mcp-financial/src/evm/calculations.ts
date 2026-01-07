/**
 * EVM (Earned Value Management) Calculations Module
 *
 * This module implements standard EVM calculations per PMI/PMBOK guidelines.
 * All formulas follow the Project Management Body of Knowledge (PMBOK) standard.
 *
 * Core EVM Metrics:
 * - PV (Planned Value): Budgeted cost of work scheduled
 * - EV (Earned Value): Budgeted cost of work performed
 * - AC (Actual Cost): Actual cost of work performed
 * - BAC (Budget at Completion): Total planned budget
 *
 * Derived Metrics:
 * - CV (Cost Variance): EV - AC (positive is good)
 * - SV (Schedule Variance): EV - PV (positive is good)
 * - CPI (Cost Performance Index): EV / AC (> 1.0 is good)
 * - SPI (Schedule Performance Index): EV / PV (> 1.0 is good)
 * - EAC (Estimate at Completion): BAC / CPI
 * - ETC (Estimate to Complete): EAC - AC
 * - VAC (Variance at Completion): BAC - EAC (positive is good)
 * - TCPI (To-Complete Performance Index): (BAC - EV) / (BAC - AC)
 */

import type { sheets_v4 } from "googleapis";
import type { EVMSnapshot, EVMMetrics } from "../types/financial.js";
import {
  readSheetRange,
  findRowById,
} from "@gw-mcp/shared-core";

/**
 * Health status for project health assessment
 */
export interface HealthStatus {
  score: number;                          // 0-100 health score
  status: "healthy" | "warning" | "critical";
  indicators: string[];                   // List of health indicators
}

/**
 * Calculate Planned Value (PV)
 *
 * PV represents the authorized budget assigned to scheduled work.
 * Also known as BCWS (Budgeted Cost of Work Scheduled).
 *
 * Formula: Sum of budgeted costs for all work scheduled to be complete by asOfDate
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID containing program data
 * @param programId - Program identifier
 * @param asOfDate - Date to calculate PV (defaults to today)
 * @returns Planned Value as of the specified date
 *
 * Note: This is a placeholder implementation. In Phase 5 (Week 17), this will
 * integrate with the Program server to query scheduled activities and their
 * budgeted costs up to the asOfDate.
 */
export async function calculatePV(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  asOfDate?: Date
): Promise<number> {
  const targetDate = asOfDate || new Date();

  // TODO: Phase 5 - Cross-server integration with Program server
  // This will query the Program server for:
  // 1. All scheduled activities/tasks for the program
  // 2. Filter activities with planned completion <= asOfDate
  // 3. Sum the budgeted cost for each scheduled activity
  //
  // Example pseudo-code:
  // const scheduledWork = await programServer.getScheduledWork({
  //   programId,
  //   endDate: targetDate
  // });
  // const pv = scheduledWork.reduce((sum, work) => sum + work.budgetedCost, 0);

  // Placeholder: Return mock data for testing
  // In production, this would calculate from actual schedule baseline
  console.warn(`calculatePV: Using mock data. Integration with Program server pending.`);

  // Mock calculation: Assume 100K budget with linear planned spend over 12 months
  const mockBudget = 100000;
  const programStartDate = new Date(targetDate);
  programStartDate.setMonth(programStartDate.getMonth() - 6); // Started 6 months ago

  const monthsElapsed = Math.max(0,
    (targetDate.getTime() - programStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  const plannedMonthlyBurn = mockBudget / 12;
  const pv = Math.min(mockBudget, monthsElapsed * plannedMonthlyBurn);

  return Math.round(pv * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate Earned Value (EV)
 *
 * EV represents the budgeted amount for work actually completed.
 * Also known as BCWP (Budgeted Cost of Work Performed).
 *
 * Formula: Sum of (Budgeted Cost × Percent Complete) for each deliverable
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID containing deliverables data
 * @param programId - Program identifier
 * @param asOfDate - Date to calculate EV (defaults to today)
 * @returns Earned Value as of the specified date
 *
 * Note: This is a placeholder implementation. In Phase 5 (Week 17), this will
 * integrate with the Deliverables server to query actual progress.
 */
export async function calculateEV(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  asOfDate?: Date
): Promise<number> {
  const targetDate = asOfDate || new Date();

  // TODO: Phase 5 - Cross-server integration with Deliverables server
  // This will query the Deliverables server for:
  // 1. All deliverables for the program
  // 2. Get percent complete for each deliverable as of asOfDate
  // 3. Sum (budgeted cost × percent complete) for all deliverables
  //
  // Example pseudo-code:
  // const deliverables = await deliverablesServer.getDeliverables({
  //   programId,
  //   asOfDate: targetDate
  // });
  // const ev = deliverables.reduce((sum, del) =>
  //   sum + (del.budgetedCost * del.percentComplete / 100), 0
  // );

  // Placeholder: Return mock data for testing
  console.warn(`calculateEV: Using mock data. Integration with Deliverables server pending.`);

  // Mock calculation: Assume 80% of planned work is complete
  const pv = await calculatePV(sheets, spreadsheetId, programId, targetDate);
  const ev = pv * 0.80; // 80% completion rate

  return Math.round(ev * 100) / 100;
}

/**
 * Calculate Actual Cost (AC)
 *
 * AC represents the realized cost incurred for work performed.
 * Also known as ACWP (Actual Cost of Work Performed).
 *
 * Formula: Sum of all actual expenses recorded up to asOfDate
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID containing budget data
 * @param programId - Program identifier
 * @param asOfDate - Date to calculate AC (defaults to today)
 * @returns Actual Cost as of the specified date
 */
export async function calculateAC(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  asOfDate?: Date
): Promise<number> {
  const targetDate = asOfDate || new Date();

  try {
    // Query the Budgets sheet for all budgets belonging to this program
    const budgetsData = await readSheetRange(
      sheets,
      spreadsheetId,
      "Budgets!A2:J1000" // budgetId, programId, ..., spent
    );

    if (!budgetsData || budgetsData.length === 0) {
      return 0;
    }

    // Sum all 'spent' amounts for budgets matching the programId
    // Column J (index 9) contains the 'spent' amount
    // Column B (index 1) contains the programId
    let totalAC = 0;

    for (const row of budgetsData) {
      const rowProgramId = row[1]?.toString() || "";
      const spent = parseFloat(row[9]?.toString() || "0");

      if (rowProgramId === programId) {
        totalAC += spent;
      }
    }

    return Math.round(totalAC * 100) / 100;
  } catch (error) {
    console.error(`Error calculating AC for program ${programId}:`, error);
    throw new Error(`Failed to calculate Actual Cost: ${error}`);
  }
}

/**
 * Calculate Budget at Completion (BAC)
 *
 * BAC represents the total planned budget for the entire program.
 * This is the baseline budget that was approved at project initiation.
 *
 * Formula: Sum of all allocated budget for the program
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID containing budget data
 * @param programId - Program identifier
 * @returns Budget at Completion (total planned budget)
 */
export async function calculateBAC(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<number> {
  try {
    // Query the Budgets sheet for all budgets belonging to this program
    const budgetsData = await readSheetRange(
      sheets,
      spreadsheetId,
      "Budgets!A2:H1000" // budgetId, programId, ..., allocated
    );

    if (!budgetsData || budgetsData.length === 0) {
      return 0;
    }

    // Sum all 'allocated' amounts for budgets matching the programId
    // Column H (index 7) contains the 'allocated' amount
    // Column B (index 1) contains the programId
    let totalBAC = 0;

    for (const row of budgetsData) {
      const rowProgramId = row[1]?.toString() || "";
      const allocated = parseFloat(row[7]?.toString() || "0");

      if (rowProgramId === programId) {
        totalBAC += allocated;
      }
    }

    return Math.round(totalBAC * 100) / 100;
  } catch (error) {
    console.error(`Error calculating BAC for program ${programId}:`, error);
    throw new Error(`Failed to calculate Budget at Completion: ${error}`);
  }
}

/**
 * Calculate EVM Metrics
 *
 * Calculates all derived EVM metrics from base values (PV, EV, AC, BAC).
 * This is a pure calculation function with no external dependencies.
 *
 * Formulas (per PMBOK):
 * - CV (Cost Variance) = EV - AC
 * - SV (Schedule Variance) = EV - PV
 * - CPI (Cost Performance Index) = EV / AC
 * - SPI (Schedule Performance Index) = EV / PV
 * - EAC (Estimate at Completion) = BAC / CPI
 * - ETC (Estimate to Complete) = EAC - AC
 * - VAC (Variance at Completion) = BAC - EAC
 * - TCPI (To-Complete Performance Index) = (BAC - EV) / (BAC - AC)
 *
 * @param pv - Planned Value
 * @param ev - Earned Value
 * @param ac - Actual Cost
 * @param bac - Budget at Completion
 * @returns Complete set of EVM metrics
 */
export function calculateEVMMetrics(
  pv: number,
  ev: number,
  ac: number,
  bac: number
): EVMMetrics {
  // Variance Metrics
  const cv = ev - ac;  // Cost Variance (positive = under budget, good)
  const sv = ev - pv;  // Schedule Variance (positive = ahead of schedule, good)

  // Performance Indices
  // Handle division by zero - if AC or PV is 0, index is undefined
  const cpi = ac > 0 ? ev / ac : 0;  // Cost Performance Index (>1.0 is good)
  const spi = pv > 0 ? ev / pv : 0;  // Schedule Performance Index (>1.0 is good)

  // Percentage Variances
  const cvPercent = ac > 0 ? (cv / ac) * 100 : 0;
  const svPercent = pv > 0 ? (sv / pv) * 100 : 0;

  // Forecasting Metrics
  // EAC: Estimate at Completion - projected total cost at completion
  // If CPI <= 0, project is in serious trouble; use BAC + current overrun
  const eac = cpi > 0 ? bac / cpi : bac + Math.abs(cv);

  // ETC: Estimate to Complete - how much more we expect to spend
  const etc = eac - ac;

  // VAC: Variance at Completion - expected over/under budget at completion
  // Positive VAC means under budget (good), negative means over budget (bad)
  const vac = bac - eac;

  // TCPI: To-Complete Performance Index
  // Performance level needed to achieve BAC with remaining funds
  // TCPI > 1.0 means we need to improve performance to meet budget
  // Handle division by zero - if (BAC - AC) <= 0, we've spent all the budget
  const remainingBudget = bac - ac;
  const remainingWork = bac - ev;
  const tcpi = remainingBudget > 0 ? remainingWork / remainingBudget : 0;

  // Round all values to 4 decimal places for precision
  return {
    cv: Math.round(cv * 100) / 100,
    sv: Math.round(sv * 100) / 100,
    cvPercent: Math.round(cvPercent * 100) / 100,
    svPercent: Math.round(svPercent * 100) / 100,
    cpi: Math.round(cpi * 10000) / 10000,
    spi: Math.round(spi * 10000) / 10000,
    eac: Math.round(eac * 100) / 100,
    etc: Math.round(etc * 100) / 100,
    vac: Math.round(vac * 100) / 100,
    tcpi: Math.round(tcpi * 10000) / 10000,
  };
}

/**
 * Perform comprehensive EVM calculation
 *
 * Calculates all EVM metrics for a program at a specific point in time.
 * This is the main entry point for EVM analysis, combining all individual
 * calculations into a complete snapshot.
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID containing program data
 * @param programId - Program identifier
 * @param asOfDate - Date to calculate metrics (defaults to today)
 * @returns Complete EVM calculation including base values and all derived metrics
 */
export async function performEVMCalculation(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  asOfDate?: Date
): Promise<{
  pv: number;
  ev: number;
  ac: number;
  bac: number;
  metrics: EVMMetrics;
}> {
  try {
    const targetDate = asOfDate || new Date();

    // Calculate base EVM values in parallel for efficiency
    const [pv, ev, ac, bac] = await Promise.all([
      calculatePV(sheets, spreadsheetId, programId, targetDate),
      calculateEV(sheets, spreadsheetId, programId, targetDate),
      calculateAC(sheets, spreadsheetId, programId, targetDate),
      calculateBAC(sheets, spreadsheetId, programId),
    ]);

    // Calculate all derived metrics
    const metrics = calculateEVMMetrics(pv, ev, ac, bac);

    return {
      pv,
      ev,
      ac,
      bac,
      metrics,
    };
  } catch (error) {
    console.error(`Error performing EVM calculation for program ${programId}:`, error);
    throw new Error(`Failed to perform EVM calculation: ${error}`);
  }
}

/**
 * Calculate Project Health Index
 *
 * Analyzes EVM metrics to determine overall project health.
 * Returns a health score (0-100) and status classification.
 *
 * Health Scoring Algorithm:
 * - Base score: 100 points
 * - CPI penalties: -30 points if CPI < 0.85, -15 points if CPI < 0.95
 * - SPI penalties: -30 points if SPI < 0.85, -15 points if SPI < 0.95
 * - TCPI penalties: -20 points if TCPI > 1.15 (difficult to achieve)
 * - VAC penalties: -20 points if VAC < -10% of BAC (significant overrun)
 *
 * Status Classification:
 * - Healthy (70-100): CPI >= 0.95, SPI >= 0.95
 * - Warning (50-69): CPI 0.85-0.94 or SPI 0.85-0.94
 * - Critical (<50): CPI < 0.85 or SPI < 0.85
 *
 * @param metrics - Calculated EVM metrics
 * @returns Health assessment with score, status, and indicators
 */
export function calculateHealthIndex(metrics: EVMMetrics): HealthStatus {
  let score = 100;
  const indicators: string[] = [];

  // Cost Performance Analysis
  if (metrics.cpi < 0.85) {
    score -= 30;
    indicators.push(`Critical cost overrun (CPI: ${metrics.cpi.toFixed(2)})`);
  } else if (metrics.cpi < 0.95) {
    score -= 15;
    indicators.push(`Moderate cost overrun (CPI: ${metrics.cpi.toFixed(2)})`);
  } else if (metrics.cpi >= 1.05) {
    indicators.push(`Under budget (CPI: ${metrics.cpi.toFixed(2)})`);
  }

  // Schedule Performance Analysis
  if (metrics.spi < 0.85) {
    score -= 30;
    indicators.push(`Critically behind schedule (SPI: ${metrics.spi.toFixed(2)})`);
  } else if (metrics.spi < 0.95) {
    score -= 15;
    indicators.push(`Moderately behind schedule (SPI: ${metrics.spi.toFixed(2)})`);
  } else if (metrics.spi >= 1.05) {
    indicators.push(`Ahead of schedule (SPI: ${metrics.spi.toFixed(2)})`);
  }

  // To-Complete Performance Index Analysis
  // TCPI > 1.0 means we need to improve efficiency to meet budget
  if (metrics.tcpi > 1.15) {
    score -= 20;
    indicators.push(
      `Difficult target performance required (TCPI: ${metrics.tcpi.toFixed(2)})`
    );
  } else if (metrics.tcpi > 1.05) {
    score -= 10;
    indicators.push(
      `Improved performance needed (TCPI: ${metrics.tcpi.toFixed(2)})`
    );
  }

  // Variance at Completion Analysis
  // Negative VAC means we expect to exceed budget
  if (metrics.vac < 0) {
    const vacPercent = Math.abs(metrics.cvPercent);
    if (vacPercent > 10) {
      score -= 20;
      indicators.push(
        `Significant budget overrun expected (VAC: ${metrics.vac.toFixed(0)})`
      );
    } else if (vacPercent > 5) {
      score -= 10;
      indicators.push(
        `Moderate budget overrun expected (VAC: ${metrics.vac.toFixed(0)})`
      );
    }
  } else if (metrics.vac > 0) {
    indicators.push(`Under budget at completion (VAC: ${metrics.vac.toFixed(0)})`);
  }

  // Ensure score stays within bounds
  score = Math.max(0, Math.min(100, score));

  // Determine status based on score and key metrics
  let status: "healthy" | "warning" | "critical";
  if (score >= 70 && metrics.cpi >= 0.95 && metrics.spi >= 0.95) {
    status = "healthy";
  } else if (score >= 50 || (metrics.cpi >= 0.85 && metrics.spi >= 0.85)) {
    status = "warning";
  } else {
    status = "critical";
  }

  // Add overall status indicator
  if (status === "healthy") {
    indicators.unshift("Project is performing well");
  } else if (status === "warning") {
    indicators.unshift("Project requires attention");
  } else {
    indicators.unshift("Project requires immediate action");
  }

  return {
    score: Math.round(score),
    status,
    indicators,
  };
}
