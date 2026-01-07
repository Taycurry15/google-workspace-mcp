/**
 * Cash Flow Forecasting Module
 *
 * Provides advanced forecasting capabilities for cash flow management
 * including monthly/weekly projections, shortfall identification,
 * runway calculations, and scenario planning.
 */

import type { sheets_v4 } from "googleapis";
import type { CashFlow, CashFlowType } from "../types/financial.js";
import { listCashFlows, getUpcomingCashFlows } from "./cashflow.js";

/**
 * Monthly cash flow forecast
 */
export interface MonthlyCashFlowForecast {
  month: string; // Format: "2026-01"
  openingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  closingBalance: number;
}

/**
 * Weekly cash flow forecast
 */
export interface WeeklyCashFlowForecast {
  week: string; // Format: "2026-W01"
  openingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  closingBalance: number;
}

/**
 * Cash shortfall identification
 */
export interface CashShortfall {
  month: string;
  shortfall: number;
  closingBalance: number;
  recommendations: string[];
}

/**
 * Runway analysis result
 */
export interface RunwayAnalysis {
  monthsRemaining: number;
  depletionDate: Date | null;
  averageMonthlyBurn: number;
  recommendation: string;
}

/**
 * Cash position forecast
 */
export interface CashPositionForecast {
  forecastBalance: number;
  confidence: "high" | "medium" | "low";
  inflows: number;
  outflows: number;
  assumptions: string[];
}

/**
 * Cash flow scenarios
 */
export interface CashFlowScenarios {
  optimistic: MonthlyCashFlowForecast[];
  baseline: MonthlyCashFlowForecast[];
  pessimistic: MonthlyCashFlowForecast[];
}

/**
 * Seasonal trend
 */
export interface SeasonalTrend {
  month: number; // 1-12
  averageInflows: number;
  averageOutflows: number;
  netCashFlow: number;
}

/**
 * Seasonal trends analysis
 */
export interface SeasonalTrendsAnalysis {
  trends: SeasonalTrend[];
  interpretation: string;
}

/**
 * Helper function to format month as "YYYY-MM"
 */
function formatMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Helper function to format week as "YYYY-WNN"
 */
function formatWeek(date: Date): string {
  const year = date.getFullYear();
  const weekNum = getWeekNumber(date);
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * Get ISO week number for a date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return weekNum;
}

/**
 * Get start of month
 */
function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get end of month
 */
function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Get start of week (Monday)
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get end of week (Sunday)
 */
function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

/**
 * Add months to a date
 */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Add weeks to a date
 */
function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Aggregate cash flows by period
 */
function aggregateCashFlowsByPeriod(
  flows: CashFlow[],
  startDate: Date,
  endDate: Date
): { inflows: number; outflows: number } {
  let inflows = 0;
  let outflows = 0;

  for (const flow of flows) {
    // Skip cancelled flows
    if (flow.status === "cancelled") {
      continue;
    }

    // Check if flow is within period
    const flowDate = flow.actualDate || flow.forecastDate;
    if (flowDate >= startDate && flowDate <= endDate) {
      if (flow.type === "inflow") {
        inflows += flow.amount;
      } else {
        outflows += flow.amount;
      }
    }
  }

  return { inflows, outflows };
}

/**
 * Forecast monthly cash flow for next N months
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @param monthsAhead - Number of months to forecast (default: 12)
 * @returns Monthly cash flow projections
 */
export async function forecastMonthlyCashFlow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  monthsAhead: number = 12
): Promise<MonthlyCashFlowForecast[]> {
  try {
    const now = new Date();
    const futureDate = addMonths(now, monthsAhead);

    // Get all cash flows in the forecast period
    const allFlows = await listCashFlows(sheets, spreadsheetId, {
      programId,
      startDate: now,
      endDate: futureDate,
    });

    const forecasts: MonthlyCashFlowForecast[] = [];
    let currentBalance = 0; // Assumes current cash balance = 0

    for (let i = 0; i < monthsAhead; i++) {
      const monthStart = getMonthStart(addMonths(now, i));
      const monthEnd = getMonthEnd(monthStart);
      const monthKey = formatMonth(monthStart);

      const { inflows, outflows } = aggregateCashFlowsByPeriod(
        allFlows,
        monthStart,
        monthEnd
      );

      const netCashFlow = inflows - outflows;
      const closingBalance = currentBalance + netCashFlow;

      forecasts.push({
        month: monthKey,
        openingBalance: currentBalance,
        totalInflows: inflows,
        totalOutflows: outflows,
        netCashFlow,
        closingBalance,
      });

      currentBalance = closingBalance;
    }

    return forecasts;
  } catch (error) {
    throw new Error(
      `Failed to forecast monthly cash flow: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Forecast weekly cash flow for next N weeks
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @param weeksAhead - Number of weeks to forecast (default: 12)
 * @returns Weekly cash flow projections
 */
export async function forecastWeeklyCashFlow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  weeksAhead: number = 12
): Promise<WeeklyCashFlowForecast[]> {
  try {
    const now = new Date();
    const futureDate = addWeeks(now, weeksAhead);

    // Get all cash flows in the forecast period
    const allFlows = await listCashFlows(sheets, spreadsheetId, {
      programId,
      startDate: now,
      endDate: futureDate,
    });

    const forecasts: WeeklyCashFlowForecast[] = [];
    let currentBalance = 0; // Assumes current cash balance = 0

    for (let i = 0; i < weeksAhead; i++) {
      const weekStart = getWeekStart(addWeeks(now, i));
      const weekEnd = getWeekEnd(weekStart);
      const weekKey = formatWeek(weekStart);

      const { inflows, outflows } = aggregateCashFlowsByPeriod(
        allFlows,
        weekStart,
        weekEnd
      );

      const netCashFlow = inflows - outflows;
      const closingBalance = currentBalance + netCashFlow;

      forecasts.push({
        week: weekKey,
        openingBalance: currentBalance,
        totalInflows: inflows,
        totalOutflows: outflows,
        netCashFlow,
        closingBalance,
      });

      currentBalance = closingBalance;
    }

    return forecasts;
  } catch (error) {
    throw new Error(
      `Failed to forecast weekly cash flow: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Identify months where cash balance goes negative
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @param monthsAhead - Number of months to analyze (default: 12)
 * @returns List of months with cash shortfalls and recommendations
 */
export async function identifyCashShortfalls(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  monthsAhead: number = 12
): Promise<CashShortfall[]> {
  try {
    const forecasts = await forecastMonthlyCashFlow(
      sheets,
      spreadsheetId,
      programId,
      monthsAhead
    );

    const shortfalls: CashShortfall[] = [];

    for (const forecast of forecasts) {
      if (forecast.closingBalance < 0) {
        const shortfall = Math.abs(forecast.closingBalance);
        const recommendations: string[] = [];

        // Generate recommendations based on the severity of shortfall
        if (shortfall > 0) {
          // Recommendation 1: Delay payments
          const delayAmount = Math.min(shortfall, forecast.totalOutflows * 0.3);
          recommendations.push(
            `Delay $${delayAmount.toFixed(2)} in non-critical payments`
          );

          // Recommendation 2: Accelerate invoicing
          const accelerateAmount = Math.min(
            shortfall,
            forecast.totalInflows * 0.2
          );
          recommendations.push(
            `Accelerate invoicing by $${accelerateAmount.toFixed(2)}`
          );

          // Recommendation 3: Consider short-term financing
          if (shortfall > forecast.totalOutflows * 0.5) {
            recommendations.push(
              `Consider short-term financing of $${shortfall.toFixed(2)}`
            );
          }

          // Recommendation 4: Review and reduce discretionary spending
          const discretionaryAmount = forecast.totalOutflows * 0.15;
          recommendations.push(
            `Review and reduce discretionary spending by $${discretionaryAmount.toFixed(2)}`
          );

          // Recommendation 5: Negotiate payment terms
          if (forecast.totalOutflows > 0) {
            recommendations.push(
              "Negotiate extended payment terms with vendors"
            );
          }
        }

        shortfalls.push({
          month: forecast.month,
          shortfall,
          closingBalance: forecast.closingBalance,
          recommendations,
        });
      }
    }

    return shortfalls;
  } catch (error) {
    throw new Error(
      `Failed to identify cash shortfalls: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Calculate how long cash will last at current burn rate
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @param currentBalance - Current cash balance
 * @returns Runway metrics with recommendation
 */
export async function calculateRunway(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  currentBalance: number
): Promise<RunwayAnalysis> {
  try {
    const now = new Date();
    const threeMonthsAgo = addMonths(now, -3);

    // Get cash flows from last 3 months to calculate average burn
    const historicalFlows = await listCashFlows(sheets, spreadsheetId, {
      programId,
      startDate: threeMonthsAgo,
      endDate: now,
    });

    let totalInflows = 0;
    let totalOutflows = 0;

    for (const flow of historicalFlows) {
      // Only count completed flows for historical analysis
      if (flow.status === "completed" && flow.actualDate) {
        if (flow.type === "inflow") {
          totalInflows += flow.amount;
        } else {
          totalOutflows += flow.amount;
        }
      }
    }

    // Calculate average monthly inflows and outflows
    const monthsOfData = 3;
    const averageMonthlyInflow = totalInflows / monthsOfData;
    const averageMonthlyOutflow = totalOutflows / monthsOfData;
    const averageMonthlyBurn = averageMonthlyOutflow - averageMonthlyInflow;

    let monthsRemaining = 0;
    let depletionDate: Date | null = null;
    let recommendation = "";

    if (averageMonthlyBurn <= 0) {
      // Positive cash flow - runway is infinite
      monthsRemaining = Infinity;
      depletionDate = null;
      recommendation =
        "Cash flow is positive. Continue monitoring to maintain healthy financial position.";
    } else {
      // Calculate months remaining
      monthsRemaining = currentBalance / averageMonthlyBurn;

      if (monthsRemaining > 0) {
        depletionDate = addMonths(now, Math.floor(monthsRemaining));
      }

      // Generate recommendation based on runway
      if (monthsRemaining < 3) {
        recommendation = `Critical: Only ${monthsRemaining.toFixed(1)} months of runway remaining. Immediate action required to reduce burn rate or secure additional funding.`;
      } else if (monthsRemaining < 6) {
        recommendation = `Warning: ${monthsRemaining.toFixed(1)} months of runway remaining. Begin planning to reduce expenses or increase revenue.`;
      } else if (monthsRemaining < 12) {
        recommendation = `Caution: ${monthsRemaining.toFixed(1)} months of runway remaining. Monitor closely and consider strategies to extend runway.`;
      } else {
        recommendation = `Healthy: ${monthsRemaining.toFixed(1)} months of runway remaining. Continue current financial management practices.`;
      }
    }

    return {
      monthsRemaining:
        monthsRemaining === Infinity ? Infinity : parseFloat(monthsRemaining.toFixed(2)),
      depletionDate,
      averageMonthlyBurn: parseFloat(averageMonthlyBurn.toFixed(2)),
      recommendation,
    };
  } catch (error) {
    throw new Error(
      `Failed to calculate runway: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Forecast cash balance on a specific future date
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @param targetDate - Future date to forecast
 * @param currentBalance - Current cash balance
 * @returns Forecast position with confidence level
 */
export async function forecastCashPosition(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  targetDate: Date,
  currentBalance: number
): Promise<CashPositionForecast> {
  try {
    const now = new Date();

    if (targetDate <= now) {
      throw new Error("Target date must be in the future");
    }

    // Get all cash flows between now and target date
    const futureFlows = await listCashFlows(sheets, spreadsheetId, {
      programId,
      startDate: now,
      endDate: targetDate,
    });

    let totalInflows = 0;
    let totalOutflows = 0;
    let completedFlows = 0;
    let forecastedFlows = 0;

    for (const flow of futureFlows) {
      if (flow.status === "cancelled") {
        continue;
      }

      if (flow.type === "inflow") {
        totalInflows += flow.amount;
      } else {
        totalOutflows += flow.amount;
      }

      // Track completion status for confidence assessment
      if (flow.status === "completed") {
        completedFlows++;
      } else {
        forecastedFlows++;
      }
    }

    const forecastBalance = currentBalance + totalInflows - totalOutflows;

    // Assess confidence based on ratio of actual to forecast
    let confidence: "high" | "medium" | "low";
    const totalFlows = completedFlows + forecastedFlows;

    if (totalFlows === 0) {
      confidence = "low";
    } else {
      const completionRatio = completedFlows / totalFlows;
      if (completionRatio > 0.7) {
        confidence = "high";
      } else if (completionRatio > 0.3) {
        confidence = "medium";
      } else {
        confidence = "low";
      }
    }

    // Also consider time horizon - further out = lower confidence
    const daysAhead = Math.floor(
      (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysAhead > 90 && confidence === "high") {
      confidence = "medium";
    } else if (daysAhead > 180) {
      confidence = "low";
    }

    // Generate assumptions
    const assumptions: string[] = [];

    if (forecastedFlows > 0) {
      assumptions.push("All forecasted cash flows will occur as scheduled");
    }

    if (totalInflows > 0) {
      assumptions.push("All invoices will be paid on time");
    }

    if (totalOutflows > 0) {
      assumptions.push("No unexpected expenses will occur");
    }

    assumptions.push("No changes to current business operations");
    assumptions.push("Economic conditions remain stable");

    if (daysAhead > 90) {
      assumptions.push(
        "Long-term forecast - higher uncertainty due to time horizon"
      );
    }

    return {
      forecastBalance: parseFloat(forecastBalance.toFixed(2)),
      confidence,
      inflows: parseFloat(totalInflows.toFixed(2)),
      outflows: parseFloat(totalOutflows.toFixed(2)),
      assumptions,
    };
  } catch (error) {
    throw new Error(
      `Failed to forecast cash position: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate three cash flow scenarios (optimistic, baseline, pessimistic)
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @param monthsAhead - Number of months to forecast (default: 12)
 * @returns Three scenarios for risk planning
 */
export async function generateCashFlowScenarios(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  monthsAhead: number = 12
): Promise<CashFlowScenarios> {
  try {
    const now = new Date();
    const futureDate = addMonths(now, monthsAhead);

    // Get all cash flows in the forecast period
    const allFlows = await listCashFlows(sheets, spreadsheetId, {
      programId,
      startDate: now,
      endDate: futureDate,
    });

    // Generate baseline scenario (as-is)
    const baseline = await forecastMonthlyCashFlow(
      sheets,
      spreadsheetId,
      programId,
      monthsAhead
    );

    // Generate optimistic scenario
    // Inflows arrive 5 days early, outflows delayed 5 days, amounts +10%
    const optimisticFlows = allFlows.map((flow) => {
      const adjustedDate = new Date(flow.forecastDate);
      if (flow.type === "inflow") {
        adjustedDate.setDate(adjustedDate.getDate() - 5);
      } else {
        adjustedDate.setDate(adjustedDate.getDate() + 5);
      }

      return {
        ...flow,
        forecastDate: adjustedDate,
        amount: flow.amount * 1.1,
      };
    });

    const optimistic: MonthlyCashFlowForecast[] = [];
    let currentBalance = 0;

    for (let i = 0; i < monthsAhead; i++) {
      const monthStart = getMonthStart(addMonths(now, i));
      const monthEnd = getMonthEnd(monthStart);
      const monthKey = formatMonth(monthStart);

      const { inflows, outflows } = aggregateCashFlowsByPeriod(
        optimisticFlows,
        monthStart,
        monthEnd
      );

      const netCashFlow = inflows - outflows;
      const closingBalance = currentBalance + netCashFlow;

      optimistic.push({
        month: monthKey,
        openingBalance: currentBalance,
        totalInflows: inflows,
        totalOutflows: outflows,
        netCashFlow,
        closingBalance,
      });

      currentBalance = closingBalance;
    }

    // Generate pessimistic scenario
    // Inflows delayed 10 days, outflows accelerated 5 days, amounts +15%
    const pessimisticFlows = allFlows.map((flow) => {
      const adjustedDate = new Date(flow.forecastDate);
      if (flow.type === "inflow") {
        adjustedDate.setDate(adjustedDate.getDate() + 10);
      } else {
        adjustedDate.setDate(adjustedDate.getDate() - 5);
      }

      return {
        ...flow,
        forecastDate: adjustedDate,
        amount: flow.type === "outflow" ? flow.amount * 1.15 : flow.amount,
      };
    });

    const pessimistic: MonthlyCashFlowForecast[] = [];
    currentBalance = 0;

    for (let i = 0; i < monthsAhead; i++) {
      const monthStart = getMonthStart(addMonths(now, i));
      const monthEnd = getMonthEnd(monthStart);
      const monthKey = formatMonth(monthStart);

      const { inflows, outflows } = aggregateCashFlowsByPeriod(
        pessimisticFlows,
        monthStart,
        monthEnd
      );

      const netCashFlow = inflows - outflows;
      const closingBalance = currentBalance + netCashFlow;

      pessimistic.push({
        month: monthKey,
        openingBalance: currentBalance,
        totalInflows: inflows,
        totalOutflows: outflows,
        netCashFlow,
        closingBalance,
      });

      currentBalance = closingBalance;
    }

    return {
      optimistic,
      baseline,
      pessimistic,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate cash flow scenarios: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Analyze historical cash flows for seasonal patterns
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @returns Seasonal trends and interpretation
 */
export async function identifySeasonalTrends(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<SeasonalTrendsAnalysis> {
  try {
    const now = new Date();
    const oneYearAgo = addMonths(now, -12);

    // Get historical cash flows from last 12+ months
    const historicalFlows = await listCashFlows(sheets, spreadsheetId, {
      programId,
      startDate: oneYearAgo,
      endDate: now,
    });

    // Group by month (1-12) and calculate averages
    const monthlyData: Record<
      number,
      { inflows: number[]; outflows: number[] }
    > = {};

    for (let i = 1; i <= 12; i++) {
      monthlyData[i] = { inflows: [], outflows: [] };
    }

    // Aggregate flows by month
    for (const flow of historicalFlows) {
      // Only use completed flows for historical analysis
      if (flow.status !== "completed" || !flow.actualDate) {
        continue;
      }

      const month = flow.actualDate.getMonth() + 1; // 1-12

      if (flow.type === "inflow") {
        monthlyData[month].inflows.push(flow.amount);
      } else {
        monthlyData[month].outflows.push(flow.amount);
      }
    }

    // Calculate averages for each month
    const trends: SeasonalTrend[] = [];

    for (let month = 1; month <= 12; month++) {
      const inflowsArray = monthlyData[month].inflows;
      const outflowsArray = monthlyData[month].outflows;

      const averageInflows =
        inflowsArray.length > 0
          ? inflowsArray.reduce((sum, val) => sum + val, 0) / inflowsArray.length
          : 0;

      const averageOutflows =
        outflowsArray.length > 0
          ? outflowsArray.reduce((sum, val) => sum + val, 0) /
            outflowsArray.length
          : 0;

      const netCashFlow = averageInflows - averageOutflows;

      trends.push({
        month,
        averageInflows: parseFloat(averageInflows.toFixed(2)),
        averageOutflows: parseFloat(averageOutflows.toFixed(2)),
        netCashFlow: parseFloat(netCashFlow.toFixed(2)),
      });
    }

    // Generate interpretation
    let interpretation = "Seasonal analysis of cash flow patterns:\n\n";

    // Identify highest/lowest months
    const sortedByNetFlow = [...trends].sort(
      (a, b) => b.netCashFlow - a.netCashFlow
    );
    const bestMonth = sortedByNetFlow[0];
    const worstMonth = sortedByNetFlow[sortedByNetFlow.length - 1];

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    if (bestMonth && worstMonth) {
      interpretation += `- Best month: ${monthNames[bestMonth.month - 1]} (avg net flow: $${bestMonth.netCashFlow.toFixed(2)})\n`;
      interpretation += `- Worst month: ${monthNames[worstMonth.month - 1]} (avg net flow: $${worstMonth.netCashFlow.toFixed(2)})\n\n`;
    }

    // Identify quarters
    const q1 = trends.slice(0, 3);
    const q2 = trends.slice(3, 6);
    const q3 = trends.slice(6, 9);
    const q4 = trends.slice(9, 12);

    const q1Avg = q1.reduce((sum, t) => sum + t.netCashFlow, 0) / 3;
    const q2Avg = q2.reduce((sum, t) => sum + t.netCashFlow, 0) / 3;
    const q3Avg = q3.reduce((sum, t) => sum + t.netCashFlow, 0) / 3;
    const q4Avg = q4.reduce((sum, t) => sum + t.netCashFlow, 0) / 3;

    interpretation += "Quarterly patterns:\n";
    interpretation += `- Q1: $${q1Avg.toFixed(2)} avg net flow\n`;
    interpretation += `- Q2: $${q2Avg.toFixed(2)} avg net flow\n`;
    interpretation += `- Q3: $${q3Avg.toFixed(2)} avg net flow\n`;
    interpretation += `- Q4: $${q4Avg.toFixed(2)} avg net flow\n\n`;

    // Identify patterns
    const quarterAvgs = [q1Avg, q2Avg, q3Avg, q4Avg];
    const maxQ = Math.max(...quarterAvgs);
    const minQ = Math.min(...quarterAvgs);
    const quarterNames = ["Q1", "Q2", "Q3", "Q4"];

    interpretation += "Key insights:\n";

    if (maxQ > 0 && minQ < 0) {
      const strongQuarter = quarterNames[quarterAvgs.indexOf(maxQ)];
      const weakQuarter = quarterNames[quarterAvgs.indexOf(minQ)];
      interpretation += `- Strongest performance in ${strongQuarter}, weakest in ${weakQuarter}\n`;
    }

    // Check for year-end patterns
    if (q4Avg < q1Avg * 0.7) {
      interpretation +=
        "- Higher outflows in Q4 may indicate year-end bonuses or budget spending\n";
    }

    // Check for summer patterns
    if (q3Avg < (q2Avg + q4Avg) / 2) {
      interpretation += "- Lower activity in Q3 may indicate summer slowdown\n";
    }

    // Overall trend
    const totalInflows = trends.reduce((sum, t) => sum + t.averageInflows, 0);
    const totalOutflows = trends.reduce((sum, t) => sum + t.averageOutflows, 0);

    if (totalInflows > totalOutflows) {
      interpretation +=
        "- Overall positive cash flow trend across the year\n";
    } else if (totalOutflows > totalInflows) {
      interpretation +=
        "- Overall negative cash flow trend - monitor burn rate closely\n";
    } else {
      interpretation += "- Balanced cash flow throughout the year\n";
    }

    return {
      trends,
      interpretation,
    };
  } catch (error) {
    throw new Error(
      `Failed to identify seasonal trends: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
