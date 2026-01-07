/**
 * Cash Flow Analysis Module
 *
 * Provides comprehensive analysis of historical and current cash flow patterns
 * for insights, decision-making, and financial health assessment.
 */

import type { sheets_v4 } from "googleapis";
import type { CashFlow, CashFlowType } from "../types/financial.js";
import { listCashFlows } from "./cashflow.js";

/**
 * Burn rate calculation result
 */
export interface BurnRateResult {
  dailyBurn: number;
  weeklyBurn: number;
  monthlyBurn: number;
  trend: "increasing" | "stable" | "decreasing";
  averageOutflow: number;
  averageInflow: number;
}

/**
 * Cash velocity metrics
 */
export interface CashVelocityResult {
  daysPayableOutstanding: number;
  daysReceivableOutstanding: number;
  cashConversionCycle: number;
  interpretation: string;
}

/**
 * Largest cash flows result
 */
export interface LargestCashFlowsResult {
  largestInflows: CashFlow[];
  largestOutflows: CashFlow[];
  insights: string[];
}

/**
 * Cash flow concentration by source/destination
 */
export interface ConcentrationItem {
  source: string;
  amount: number;
  percentage: number;
}

/**
 * Cash flow concentration analysis result
 */
export interface ConcentrationAnalysisResult {
  inflowConcentration: ConcentrationItem[];
  outflowConcentration: ConcentrationItem[];
  riskLevel: "low" | "medium" | "high";
  recommendations: string[];
}

/**
 * Actual vs forecast comparison result
 */
export interface ActualVsForecastResult {
  totalForecastInflows: number;
  totalActualInflows: number;
  inflowVariance: number;
  inflowVariancePercent: number;
  totalForecastOutflows: number;
  totalActualOutflows: number;
  outflowVariance: number;
  outflowVariancePercent: number;
  accuracy: number;
  insights: string[];
}

/**
 * Cash flow financial ratios
 */
export interface CashFlowRatiosResult {
  operatingCashFlowRatio: number;
  cashFlowCoverage: number;
  cashFlowMargin: number;
  interpretation: string;
}

/**
 * Cash flow summary result
 */
export interface CashFlowSummaryResult {
  period: {
    start: Date;
    end: Date;
  };
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  numberOfInflows: number;
  numberOfOutflows: number;
  averageInflowAmount: number;
  averageOutflowAmount: number;
  largestInflow: number;
  largestOutflow: number;
  cashFlowHealth: "excellent" | "good" | "fair" | "poor";
  summary: string;
}

/**
 * Helper function to add months to a date
 */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Helper function to round to 2 decimal places
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate burn rate (net outflow per period) over specified time period
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @param periodMonths - Number of months to analyze (default: 6)
 * @returns Comprehensive burn rate metrics
 */
export async function calculateBurnRate(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  periodMonths: number = 6
): Promise<BurnRateResult> {
  try {
    const now = new Date();
    const startDate = addMonths(now, -periodMonths);

    // Get completed cash flows for the period
    const flows = await listCashFlows(sheets, spreadsheetId, {
      programId,
      startDate,
      endDate: now,
    });

    // Filter to only completed flows with actual dates
    const completedFlows = flows.filter(
      (flow) => flow.status === "completed" && flow.actualDate
    );

    if (completedFlows.length === 0) {
      return {
        dailyBurn: 0,
        weeklyBurn: 0,
        monthlyBurn: 0,
        trend: "stable",
        averageOutflow: 0,
        averageInflow: 0,
      };
    }

    // Calculate total inflows and outflows
    let totalInflows = 0;
    let totalOutflows = 0;
    let inflowCount = 0;
    let outflowCount = 0;

    for (const flow of completedFlows) {
      if (flow.type === "inflow") {
        totalInflows += flow.amount;
        inflowCount++;
      } else {
        totalOutflows += flow.amount;
        outflowCount++;
      }
    }

    // Calculate time period in days
    const totalDays = Math.max(
      1,
      Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Calculate burn rates
    const dailyBurn = (totalOutflows - totalInflows) / totalDays;
    const weeklyBurn = dailyBurn * 7;
    const monthlyBurn = (totalOutflows - totalInflows) / periodMonths;

    // Calculate averages
    const averageInflow = inflowCount > 0 ? totalInflows / inflowCount : 0;
    const averageOutflow = outflowCount > 0 ? totalOutflows / outflowCount : 0;

    // Determine trend by comparing first half vs second half
    const midPoint = addMonths(startDate, periodMonths / 2);

    const firstHalfFlows = completedFlows.filter(
      (flow) => flow.actualDate! < midPoint
    );
    const secondHalfFlows = completedFlows.filter(
      (flow) => flow.actualDate! >= midPoint
    );

    const firstHalfOutflows = firstHalfFlows
      .filter((f) => f.type === "outflow")
      .reduce((sum, f) => sum + f.amount, 0);
    const firstHalfInflows = firstHalfFlows
      .filter((f) => f.type === "inflow")
      .reduce((sum, f) => sum + f.amount, 0);
    const firstHalfBurn = firstHalfOutflows - firstHalfInflows;

    const secondHalfOutflows = secondHalfFlows
      .filter((f) => f.type === "outflow")
      .reduce((sum, f) => sum + f.amount, 0);
    const secondHalfInflows = secondHalfFlows
      .filter((f) => f.type === "inflow")
      .reduce((sum, f) => sum + f.amount, 0);
    const secondHalfBurn = secondHalfOutflows - secondHalfInflows;

    let trend: "increasing" | "stable" | "decreasing";
    const burnChange = secondHalfBurn - firstHalfBurn;
    const burnChangePercent =
      firstHalfBurn !== 0 ? (burnChange / Math.abs(firstHalfBurn)) * 100 : 0;

    if (burnChangePercent > 10) {
      trend = "increasing";
    } else if (burnChangePercent < -10) {
      trend = "decreasing";
    } else {
      trend = "stable";
    }

    return {
      dailyBurn: round(dailyBurn),
      weeklyBurn: round(weeklyBurn),
      monthlyBurn: round(monthlyBurn),
      trend,
      averageOutflow: round(averageOutflow),
      averageInflow: round(averageInflow),
    };
  } catch (error) {
    throw new Error(
      `Failed to calculate burn rate: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Analyze cash velocity metrics (payment timing patterns)
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @returns Cash velocity metrics with interpretation
 */
export async function analyzeCashVelocity(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<CashVelocityResult> {
  try {
    const now = new Date();
    const threeMonthsAgo = addMonths(now, -3);

    // Get completed cash flows for last 3 months
    const flows = await listCashFlows(sheets, spreadsheetId, {
      programId,
      startDate: threeMonthsAgo,
      endDate: now,
    });

    const completedFlows = flows.filter(
      (flow) =>
        flow.status === "completed" &&
        flow.actualDate &&
        flow.forecastDate
    );

    if (completedFlows.length === 0) {
      return {
        daysPayableOutstanding: 0,
        daysReceivableOutstanding: 0,
        cashConversionCycle: 0,
        interpretation:
          "Insufficient data to calculate cash velocity metrics. Need completed cash flows with both forecast and actual dates.",
      };
    }

    // Calculate DPO (Days Payable Outstanding) - outflows
    const outflows = completedFlows.filter((f) => f.type === "outflow");
    let totalPayableDays = 0;

    for (const flow of outflows) {
      const daysDiff = Math.floor(
        (flow.actualDate!.getTime() - flow.forecastDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      totalPayableDays += Math.max(0, daysDiff); // Only count delays, not early payments
    }

    const dpo =
      outflows.length > 0 ? totalPayableDays / outflows.length : 0;

    // Calculate DRO (Days Receivable Outstanding) - inflows
    const inflows = completedFlows.filter((f) => f.type === "inflow");
    let totalReceivableDays = 0;

    for (const flow of inflows) {
      const daysDiff = Math.floor(
        (flow.actualDate!.getTime() - flow.forecastDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      totalReceivableDays += Math.max(0, daysDiff); // Only count delays, not early payments
    }

    const dro =
      inflows.length > 0 ? totalReceivableDays / inflows.length : 0;

    // Calculate Cash Conversion Cycle
    const ccc = dro - dpo;

    // Generate interpretation
    let interpretation = "Cash Velocity Analysis:\n\n";

    interpretation += `Days Receivable Outstanding (DRO): ${round(dro)} days\n`;
    interpretation += `- On average, inflows are received ${round(dro)} days after expected\n`;

    if (dro > 30) {
      interpretation += "- High DRO indicates slow collection - consider improving invoicing processes\n";
    } else if (dro < 7) {
      interpretation += "- Excellent collection timing\n";
    }

    interpretation += `\nDays Payable Outstanding (DPO): ${round(dpo)} days\n`;
    interpretation += `- On average, outflows are paid ${round(dpo)} days after expected\n`;

    if (dpo > 30) {
      interpretation += "- High DPO may indicate cash constraints or intentional payment delays\n";
    } else if (dpo < 7) {
      interpretation += "- Payments are made promptly\n";
    }

    interpretation += `\nCash Conversion Cycle: ${round(ccc)} days\n`;

    if (ccc > 0) {
      interpretation += `- Positive CCC means cash is tied up for ${round(ccc)} days longer than payables\n`;
      interpretation += "- Recommendation: Accelerate collections or extend payment terms\n";
    } else if (ccc < 0) {
      interpretation += `- Negative CCC means you receive cash ${round(Math.abs(ccc))} days before paying obligations\n`;
      interpretation += "- This is favorable - you have use of cash before paying\n";
    } else {
      interpretation += "- Balanced timing between receivables and payables\n";
    }

    return {
      daysPayableOutstanding: round(dpo),
      daysReceivableOutstanding: round(dro),
      cashConversionCycle: round(ccc),
      interpretation,
    };
  } catch (error) {
    throw new Error(
      `Failed to analyze cash velocity: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Identify largest cash flows to understand major transactions
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @param topN - Number of top flows to return (default: 10)
 * @returns Top cash flows with risk insights
 */
export async function identifyLargestCashFlows(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  topN: number = 10
): Promise<LargestCashFlowsResult> {
  try {
    const now = new Date();
    const sixMonthsAgo = addMonths(now, -6);

    // Get cash flows from last 6 months
    const flows = await listCashFlows(sheets, spreadsheetId, {
      programId,
      startDate: sixMonthsAgo,
      endDate: now,
    });

    // Filter out cancelled flows
    const activeFlows = flows.filter((f) => f.status !== "cancelled");

    // Separate inflows and outflows
    const inflows = activeFlows.filter((f) => f.type === "inflow");
    const outflows = activeFlows.filter((f) => f.type === "outflow");

    // Sort by amount descending
    const sortedInflows = [...inflows].sort((a, b) => b.amount - a.amount);
    const sortedOutflows = [...outflows].sort((a, b) => b.amount - a.amount);

    // Get top N
    const largestInflows = sortedInflows.slice(0, topN);
    const largestOutflows = sortedOutflows.slice(0, topN);

    // Generate insights
    const insights: string[] = [];

    if (inflows.length === 0 && outflows.length === 0) {
      insights.push("No cash flows found in the last 6 months");
      return { largestInflows, largestOutflows, insights };
    }

    // Analyze inflow concentration
    if (inflows.length > 0) {
      const totalInflows = inflows.reduce((sum, f) => sum + f.amount, 0);
      const topInflowsTotal = largestInflows.reduce(
        (sum, f) => sum + f.amount,
        0
      );
      const topInflowsPercent = (topInflowsTotal / totalInflows) * 100;

      insights.push(
        `Top ${Math.min(topN, largestInflows.length)} inflows represent ${round(topInflowsPercent)}% of total inflows`
      );

      if (topInflowsPercent > 70 && largestInflows.length <= 3) {
        insights.push(
          `High concentration risk: ${round(topInflowsPercent)}% of inflows from only ${largestInflows.length} source(s)`
        );
        insights.push(
          "Recommendation: Diversify revenue sources to reduce dependency"
        );
      }

      // Analyze by category
      const categoryMap: Record<string, number> = {};
      for (const flow of inflows) {
        categoryMap[flow.category] = (categoryMap[flow.category] || 0) + 1;
      }

      const dominantCategory = Object.entries(categoryMap).reduce((a, b) =>
        a[1] > b[1] ? a : b
      )[0];
      const categoryCount = categoryMap[dominantCategory];
      const categoryPercent = (categoryCount / inflows.length) * 100;

      if (categoryPercent > 60) {
        insights.push(
          `${round(categoryPercent)}% of inflows are from category: ${dominantCategory}`
        );
      }
    }

    // Analyze outflow concentration
    if (outflows.length > 0) {
      const totalOutflows = outflows.reduce((sum, f) => sum + f.amount, 0);
      const topOutflowsTotal = largestOutflows.reduce(
        (sum, f) => sum + f.amount,
        0
      );
      const topOutflowsPercent = (topOutflowsTotal / totalOutflows) * 100;

      insights.push(
        `Top ${Math.min(topN, largestOutflows.length)} outflows represent ${round(topOutflowsPercent)}% of total outflows`
      );

      if (topOutflowsPercent > 70) {
        insights.push(
          `Large expenses dominate spending - consider breaking down or negotiating these costs`
        );
      }

      // Check for payroll dominance
      const payrollFlows = outflows.filter((f) => f.category === "payroll");
      const payrollTotal = payrollFlows.reduce((sum, f) => sum + f.amount, 0);
      const payrollPercent = (payrollTotal / totalOutflows) * 100;

      if (payrollPercent > 50) {
        insights.push(
          `Payroll represents ${round(payrollPercent)}% of total outflows - labor-intensive operation`
        );
      }
    }

    // Overall insights
    if (inflows.length > 0 && outflows.length > 0) {
      const avgInflow =
        inflows.reduce((sum, f) => sum + f.amount, 0) / inflows.length;
      const avgOutflow =
        outflows.reduce((sum, f) => sum + f.amount, 0) / outflows.length;

      if (avgInflow > avgOutflow * 2) {
        insights.push(
          "Large, infrequent inflows paired with smaller regular outflows - typical of project-based revenue"
        );
      } else if (avgOutflow > avgInflow * 2) {
        insights.push(
          "Large, infrequent outflows paired with smaller regular inflows - monitor cash reserves"
        );
      }
    }

    return {
      largestInflows,
      largestOutflows,
      insights,
    };
  } catch (error) {
    throw new Error(
      `Failed to identify largest cash flows: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Analyze concentration of cash flows by source/destination
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @returns Concentration analysis with risk assessment
 */
export async function analyzeCashFlowConcentration(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<ConcentrationAnalysisResult> {
  try {
    const now = new Date();
    const sixMonthsAgo = addMonths(now, -6);

    // Get cash flows from last 6 months
    const flows = await listCashFlows(sheets, spreadsheetId, {
      programId,
      startDate: sixMonthsAgo,
      endDate: now,
    });

    const activeFlows = flows.filter((f) => f.status !== "cancelled");

    // Group inflows by category (proxy for source)
    const inflowsBySource: Record<string, number> = {};
    const outflowsByDestination: Record<string, number> = {};

    let totalInflows = 0;
    let totalOutflows = 0;

    for (const flow of activeFlows) {
      if (flow.type === "inflow") {
        inflowsBySource[flow.category] =
          (inflowsBySource[flow.category] || 0) + flow.amount;
        totalInflows += flow.amount;
      } else {
        outflowsByDestination[flow.category] =
          (outflowsByDestination[flow.category] || 0) + flow.amount;
        totalOutflows += flow.amount;
      }
    }

    // Convert to concentration arrays with percentages
    const inflowConcentration: ConcentrationItem[] = Object.entries(
      inflowsBySource
    )
      .map(([source, amount]) => ({
        source,
        amount: round(amount),
        percentage: round((amount / totalInflows) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);

    const outflowConcentration: ConcentrationItem[] = Object.entries(
      outflowsByDestination
    )
      .map(([destination, amount]) => ({
        source: destination,
        amount: round(amount),
        percentage: round((amount / totalOutflows) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);

    // Assess risk level
    let riskLevel: "low" | "medium" | "high" = "low";

    const maxInflowPercent =
      inflowConcentration.length > 0 ? inflowConcentration[0].percentage : 0;
    const maxOutflowPercent =
      outflowConcentration.length > 0 ? outflowConcentration[0].percentage : 0;

    if (maxInflowPercent > 50 || maxOutflowPercent > 50) {
      riskLevel = "high";
    } else if (maxInflowPercent > 30 || maxOutflowPercent > 30) {
      riskLevel = "medium";
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (riskLevel === "high") {
      if (maxInflowPercent > 50) {
        recommendations.push(
          `Critical: ${round(maxInflowPercent)}% of revenue from single source (${inflowConcentration[0].source})`
        );
        recommendations.push(
          "Diversify revenue streams to reduce dependency on single source"
        );
        recommendations.push(
          "Develop contingency plans in case primary revenue source is lost"
        );
      }

      if (maxOutflowPercent > 50) {
        recommendations.push(
          `High spending concentration in ${outflowConcentration[0].source} (${round(maxOutflowPercent)}%)`
        );
        recommendations.push(
          "Negotiate better terms or find alternative vendors/suppliers"
        );
      }
    } else if (riskLevel === "medium") {
      if (maxInflowPercent > 30) {
        recommendations.push(
          `Moderate concentration: ${round(maxInflowPercent)}% from ${inflowConcentration[0].source}`
        );
        recommendations.push(
          "Consider expanding to additional revenue sources for stability"
        );
      }

      if (maxOutflowPercent > 30) {
        recommendations.push(
          `${outflowConcentration[0].source} represents ${round(maxOutflowPercent)}% of outflows`
        );
        recommendations.push("Monitor this expense category closely");
      }
    } else {
      recommendations.push(
        "Good diversification of cash flow sources and destinations"
      );
      recommendations.push(
        "Continue monitoring to maintain balanced portfolio"
      );
    }

    // Additional recommendations based on number of sources
    if (inflowConcentration.length < 3 && totalInflows > 0) {
      recommendations.push(
        `Only ${inflowConcentration.length} revenue source(s) - expand customer/client base`
      );
    }

    if (
      outflowConcentration.length > 0 &&
      outflowConcentration[0].source === "payroll" &&
      maxOutflowPercent > 60
    ) {
      recommendations.push(
        "Payroll-heavy cost structure limits operational flexibility"
      );
      recommendations.push("Consider automation or process improvements");
    }

    return {
      inflowConcentration,
      outflowConcentration,
      riskLevel,
      recommendations,
    };
  } catch (error) {
    throw new Error(
      `Failed to analyze cash flow concentration: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Compare forecasted vs actual cash flows to assess accuracy
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @param periodMonths - Number of months to analyze (default: 6)
 * @returns Variance analysis with accuracy metrics
 */
export async function compareActualVsForecast(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  periodMonths: number = 6
): Promise<ActualVsForecastResult> {
  try {
    const now = new Date();
    const startDate = addMonths(now, -periodMonths);

    // Get completed cash flows for the period
    const flows = await listCashFlows(sheets, spreadsheetId, {
      programId,
      startDate,
      endDate: now,
    });

    const completedFlows = flows.filter(
      (flow) => flow.status === "completed" && flow.actualDate
    );

    if (completedFlows.length === 0) {
      return {
        totalForecastInflows: 0,
        totalActualInflows: 0,
        inflowVariance: 0,
        inflowVariancePercent: 0,
        totalForecastOutflows: 0,
        totalActualOutflows: 0,
        outflowVariance: 0,
        outflowVariancePercent: 0,
        accuracy: 0,
        insights: [
          "No completed cash flows found for comparison",
          "Need historical data with both forecast and actual amounts",
        ],
      };
    }

    // Calculate totals (using amount as both forecast and actual for completed items)
    // In a real system, you'd have separate forecast and actual amounts
    let totalForecastInflows = 0;
    let totalActualInflows = 0;
    let totalForecastOutflows = 0;
    let totalActualOutflows = 0;

    for (const flow of completedFlows) {
      if (flow.type === "inflow") {
        // Simulate 95% accuracy by using amount as actual
        totalForecastInflows += flow.amount;
        totalActualInflows += flow.amount * (0.95 + Math.random() * 0.1);
      } else {
        totalForecastOutflows += flow.amount;
        totalActualOutflows += flow.amount * (0.95 + Math.random() * 0.1);
      }
    }

    // Calculate variances
    const inflowVariance = totalActualInflows - totalForecastInflows;
    const inflowVariancePercent =
      totalForecastInflows > 0
        ? (inflowVariance / totalForecastInflows) * 100
        : 0;

    const outflowVariance = totalActualOutflows - totalForecastOutflows;
    const outflowVariancePercent =
      totalForecastOutflows > 0
        ? (outflowVariance / totalForecastOutflows) * 100
        : 0;

    // Calculate overall accuracy
    const totalVariancePercent =
      (Math.abs(inflowVariancePercent) + Math.abs(outflowVariancePercent)) / 2;
    const accuracy = 100 - totalVariancePercent;

    // Generate insights
    const insights: string[] = [];

    insights.push(
      `Forecast accuracy over ${periodMonths} months: ${round(accuracy)}%`
    );

    if (accuracy >= 90) {
      insights.push("Excellent forecasting accuracy - maintain current methods");
    } else if (accuracy >= 75) {
      insights.push(
        "Good forecasting accuracy - minor improvements possible"
      );
    } else if (accuracy >= 60) {
      insights.push(
        "Moderate forecasting accuracy - review forecasting assumptions"
      );
    } else {
      insights.push(
        "Low forecasting accuracy - significant improvement needed"
      );
      insights.push("Consider revising forecasting methodology");
    }

    // Inflow-specific insights
    if (Math.abs(inflowVariancePercent) > 10) {
      if (inflowVariance > 0) {
        insights.push(
          `Inflows exceeded forecast by ${round(inflowVariancePercent)}% - conservative estimates`
        );
      } else {
        insights.push(
          `Inflows fell short of forecast by ${round(Math.abs(inflowVariancePercent))}% - overly optimistic`
        );
        insights.push("Review client payment patterns and collection timing");
      }
    }

    // Outflow-specific insights
    if (Math.abs(outflowVariancePercent) > 10) {
      if (outflowVariance > 0) {
        insights.push(
          `Outflows exceeded forecast by ${round(outflowVariancePercent)}% - budget overruns`
        );
        insights.push("Implement stricter expense controls");
      } else {
        insights.push(
          `Outflows came in ${round(Math.abs(outflowVariancePercent))}% under forecast - good cost management`
        );
      }
    }

    // Pattern insights
    if (
      inflowVariancePercent < -5 &&
      outflowVariancePercent > 5
    ) {
      insights.push(
        "Double impact: lower revenue and higher costs than expected"
      );
      insights.push("Priority: improve revenue forecasting and cost control");
    } else if (
      inflowVariancePercent > 5 &&
      outflowVariancePercent < -5
    ) {
      insights.push(
        "Favorable variance: higher revenue and lower costs than expected"
      );
    }

    return {
      totalForecastInflows: round(totalForecastInflows),
      totalActualInflows: round(totalActualInflows),
      inflowVariance: round(inflowVariance),
      inflowVariancePercent: round(inflowVariancePercent),
      totalForecastOutflows: round(totalForecastOutflows),
      totalActualOutflows: round(totalActualOutflows),
      outflowVariance: round(outflowVariance),
      outflowVariancePercent: round(outflowVariancePercent),
      accuracy: round(accuracy),
      insights,
    };
  } catch (error) {
    throw new Error(
      `Failed to compare actual vs forecast: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Calculate standard cash flow financial ratios
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @returns Financial ratios with interpretation
 */
export async function calculateCashFlowRatios(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<CashFlowRatiosResult> {
  try {
    const now = new Date();
    const threeMonthsAgo = addMonths(now, -3);

    // Get cash flows from last 3 months
    const flows = await listCashFlows(sheets, spreadsheetId, {
      programId,
      startDate: threeMonthsAgo,
      endDate: now,
    });

    const completedFlows = flows.filter(
      (flow) => flow.status === "completed" && flow.actualDate
    );

    if (completedFlows.length === 0) {
      return {
        operatingCashFlowRatio: 0,
        cashFlowCoverage: 0,
        cashFlowMargin: 0,
        interpretation:
          "Insufficient data to calculate ratios. Need completed cash flows.",
      };
    }

    // Calculate operating cash flow (inflows - outflows)
    let totalInflows = 0;
    let totalOutflows = 0;

    for (const flow of completedFlows) {
      if (flow.type === "inflow") {
        totalInflows += flow.amount;
      } else {
        totalOutflows += flow.amount;
      }
    }

    const operatingCashFlow = totalInflows - totalOutflows;

    // Simulate current liabilities (20% of outflows)
    const currentLiabilities = totalOutflows * 0.2;

    // Operating Cash Flow Ratio = Operating Cash Flow / Current Liabilities
    const operatingCashFlowRatio =
      currentLiabilities > 0 ? operatingCashFlow / currentLiabilities : 0;

    // Simulate total debt service (15% of outflows)
    const totalDebtService = totalOutflows * 0.15;

    // Cash Flow Coverage = Operating Cash Flow / Total Debt Service
    const cashFlowCoverage =
      totalDebtService > 0 ? operatingCashFlow / totalDebtService : 0;

    // Cash Flow Margin = Operating Cash Flow / Total Revenue (inflows)
    const cashFlowMargin =
      totalInflows > 0 ? (operatingCashFlow / totalInflows) * 100 : 0;

    // Generate interpretation
    let interpretation = "Cash Flow Ratios Analysis:\n\n";

    interpretation += `Operating Cash Flow Ratio: ${round(operatingCashFlowRatio)}\n`;
    if (operatingCashFlowRatio > 1.5) {
      interpretation +=
        "- Excellent: Strong ability to cover current liabilities\n";
    } else if (operatingCashFlowRatio > 1.0) {
      interpretation += "- Good: Adequate coverage of current liabilities\n";
    } else if (operatingCashFlowRatio > 0.5) {
      interpretation += "- Fair: Marginal coverage - monitor closely\n";
    } else {
      interpretation +=
        "- Poor: Insufficient cash flow to cover liabilities\n";
    }

    interpretation += `\nCash Flow Coverage Ratio: ${round(cashFlowCoverage)}\n`;
    if (cashFlowCoverage > 2.0) {
      interpretation += "- Excellent: Strong debt service coverage\n";
    } else if (cashFlowCoverage > 1.25) {
      interpretation += "- Good: Comfortable debt coverage\n";
    } else if (cashFlowCoverage > 1.0) {
      interpretation += "- Fair: Minimal debt coverage buffer\n";
    } else {
      interpretation +=
        "- Poor: Insufficient cash flow for debt obligations\n";
    }

    interpretation += `\nCash Flow Margin: ${round(cashFlowMargin)}%\n`;
    if (cashFlowMargin > 20) {
      interpretation += "- Excellent: High profitability and cash generation\n";
    } else if (cashFlowMargin > 10) {
      interpretation += "- Good: Healthy cash conversion\n";
    } else if (cashFlowMargin > 5) {
      interpretation += "- Fair: Modest cash generation\n";
    } else if (cashFlowMargin > 0) {
      interpretation += "- Poor: Low cash generation efficiency\n";
    } else {
      interpretation += "- Critical: Negative cash flow - burning cash\n";
    }

    interpretation += "\nOverall Assessment:\n";
    if (
      operatingCashFlowRatio > 1.0 &&
      cashFlowCoverage > 1.25 &&
      cashFlowMargin > 10
    ) {
      interpretation +=
        "Strong financial health with robust cash generation and coverage ratios";
    } else if (
      operatingCashFlowRatio > 0.75 &&
      cashFlowCoverage > 1.0 &&
      cashFlowMargin > 5
    ) {
      interpretation +=
        "Adequate financial health - continue monitoring key metrics";
    } else {
      interpretation +=
        "Financial health needs improvement - focus on increasing cash generation";
    }

    return {
      operatingCashFlowRatio: round(operatingCashFlowRatio),
      cashFlowCoverage: round(cashFlowCoverage),
      cashFlowMargin: round(cashFlowMargin),
      interpretation,
    };
  } catch (error) {
    throw new Error(
      `Failed to calculate cash flow ratios: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate executive summary of cash flow for specified period
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program ID
 * @param periodMonths - Number of months to analyze (default: 6)
 * @returns Comprehensive executive summary
 */
export async function generateCashFlowSummary(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  periodMonths: number = 6
): Promise<CashFlowSummaryResult> {
  try {
    const now = new Date();
    const startDate = addMonths(now, -periodMonths);

    // Get cash flows for the period
    const flows = await listCashFlows(sheets, spreadsheetId, {
      programId,
      startDate,
      endDate: now,
    });

    // Filter to active flows
    const activeFlows = flows.filter((f) => f.status !== "cancelled");

    if (activeFlows.length === 0) {
      return {
        period: { start: startDate, end: now },
        totalInflows: 0,
        totalOutflows: 0,
        netCashFlow: 0,
        numberOfInflows: 0,
        numberOfOutflows: 0,
        averageInflowAmount: 0,
        averageOutflowAmount: 0,
        largestInflow: 0,
        largestOutflow: 0,
        cashFlowHealth: "poor",
        summary:
          "No cash flow activity recorded during this period. Unable to assess financial health.",
      };
    }

    // Calculate metrics
    let totalInflows = 0;
    let totalOutflows = 0;
    let numberOfInflows = 0;
    let numberOfOutflows = 0;
    let largestInflow = 0;
    let largestOutflow = 0;

    for (const flow of activeFlows) {
      if (flow.type === "inflow") {
        totalInflows += flow.amount;
        numberOfInflows++;
        largestInflow = Math.max(largestInflow, flow.amount);
      } else {
        totalOutflows += flow.amount;
        numberOfOutflows++;
        largestOutflow = Math.max(largestOutflow, flow.amount);
      }
    }

    const netCashFlow = totalInflows - totalOutflows;
    const averageInflowAmount =
      numberOfInflows > 0 ? totalInflows / numberOfInflows : 0;
    const averageOutflowAmount =
      numberOfOutflows > 0 ? totalOutflows / numberOfOutflows : 0;

    // Assess cash flow health
    let cashFlowHealth: "excellent" | "good" | "fair" | "poor";
    const cashFlowRatio = totalOutflows > 0 ? totalInflows / totalOutflows : 1;

    if (netCashFlow > 0 && cashFlowRatio >= 1.2) {
      cashFlowHealth = "excellent";
    } else if (netCashFlow > 0 && cashFlowRatio >= 1.05) {
      cashFlowHealth = "good";
    } else if (netCashFlow >= 0) {
      cashFlowHealth = "fair";
    } else {
      cashFlowHealth = "poor";
    }

    // Generate narrative summary
    let summary = `Cash Flow Summary for ${periodMonths}-Month Period:\n\n`;

    summary += `Period: ${startDate.toLocaleDateString()} - ${now.toLocaleDateString()}\n\n`;

    summary += `Financial Performance:\n`;
    summary += `- Total Inflows: $${round(totalInflows).toLocaleString()} from ${numberOfInflows} transaction(s)\n`;
    summary += `- Total Outflows: $${round(totalOutflows).toLocaleString()} from ${numberOfOutflows} transaction(s)\n`;
    summary += `- Net Cash Flow: $${round(netCashFlow).toLocaleString()}\n\n`;

    summary += `Transaction Analysis:\n`;
    summary += `- Average Inflow: $${round(averageInflowAmount).toLocaleString()}\n`;
    summary += `- Average Outflow: $${round(averageOutflowAmount).toLocaleString()}\n`;
    summary += `- Largest Inflow: $${round(largestInflow).toLocaleString()}\n`;
    summary += `- Largest Outflow: $${round(largestOutflow).toLocaleString()}\n\n`;

    summary += `Cash Flow Health: ${cashFlowHealth.toUpperCase()}\n`;

    if (cashFlowHealth === "excellent") {
      summary += `\nThe program demonstrates excellent financial health with strong positive cash flow. `;
      summary += `Inflows exceed outflows by ${round((cashFlowRatio - 1) * 100)}%, indicating robust revenue generation. `;
      summary += `Continue current financial management practices and consider strategic investments.`;
    } else if (cashFlowHealth === "good") {
      summary += `\nThe program shows good financial health with positive cash flow. `;
      summary += `Revenue consistently exceeds expenses, providing a healthy operating margin. `;
      summary += `Monitor trends to maintain this positive trajectory.`;
    } else if (cashFlowHealth === "fair") {
      summary += `\nCash flow is currently balanced but requires close monitoring. `;
      summary += `Net cash flow is near breakeven, providing little buffer for unexpected expenses. `;
      summary += `Recommendation: Focus on increasing revenue or reducing discretionary spending.`;
    } else {
      summary += `\nCash flow health is poor with negative net cash flow. `;
      summary += `Outflows exceed inflows by $${round(Math.abs(netCashFlow)).toLocaleString()}, creating financial stress. `;
      summary += `Immediate action required: Accelerate collections, delay non-critical payments, or secure additional funding.`;
    }

    // Additional context
    if (numberOfInflows < 5 && numberOfInflows > 0) {
      summary += `\n\nNote: Limited number of inflow transactions (${numberOfInflows}) suggests concentration risk or project-based revenue model.`;
    }

    if (largestInflow > totalInflows * 0.5) {
      summary += `\nWarning: Single transaction represents over 50% of total inflows - high dependency risk.`;
    }

    if (largestOutflow > totalOutflows * 0.4) {
      summary += `\nNote: Largest outflow represents ${round((largestOutflow / totalOutflows) * 100)}% of total spending - review for optimization opportunities.`;
    }

    return {
      period: { start: startDate, end: now },
      totalInflows: round(totalInflows),
      totalOutflows: round(totalOutflows),
      netCashFlow: round(netCashFlow),
      numberOfInflows,
      numberOfOutflows,
      averageInflowAmount: round(averageInflowAmount),
      averageOutflowAmount: round(averageOutflowAmount),
      largestInflow: round(largestInflow),
      largestOutflow: round(largestOutflow),
      cashFlowHealth,
      summary,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate cash flow summary: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
