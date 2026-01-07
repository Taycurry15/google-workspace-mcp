/**
 * Cash Flow Reports Module
 *
 * Generates comprehensive cash flow reports for liquidity analysis and management.
 * Provides cash flow statements, position tracking, forecasting, burn analysis,
 * and executive summaries for financial planning.
 */

import type { sheets_v4 } from "googleapis";
import type { CashFlow, CashFlowCategory } from "../types/financial.js";
import {
  listCashFlows,
  getCashFlowProjection,
  getUpcomingCashFlows,
} from "../cashflow/cashflow.js";
import {
  forecastMonthlyCashFlow,
  type MonthlyCashFlowForecast,
} from "../cashflow/forecasting.js";
import {
  calculateBurnRate,
  type BurnRateResult,
} from "../cashflow/analysis.js";

/**
 * Cash Flow Statement Report
 * Standard cash flow statement showing inflows and outflows
 */
export interface CashFlowStatement {
  programId: string;
  period: {
    startDate: Date;
    endDate: Date;
    periodMonths: number;
  };
  reportDate: Date;
  operatingActivities: {
    inflows: Array<{
      category: CashFlowCategory;
      description: string;
      amount: number;
    }>;
    outflows: Array<{
      category: CashFlowCategory;
      description: string;
      amount: number;
    }>;
    totalInflows: number;
    totalOutflows: number;
    netOperatingCash: number;
  };
  summary: {
    openingBalance: number;
    totalInflows: number;
    totalOutflows: number;
    netCashFlow: number;
    closingBalance: number;
  };
  statementText: string;
}

/**
 * Cash Position Report
 * Current and forecasted cash position
 */
export interface CashPositionReport {
  programId: string;
  reportDate: Date;
  currentPosition: {
    cashOnHand: number;
    accountsReceivable: number;
    accountsPayable: number;
    netPosition: number;
  };
  forecastedPosition: {
    next30Days: number;
    next60Days: number;
    next90Days: number;
  };
  positionTrend: "improving" | "stable" | "declining";
  warnings: string[];
  recommendations: string[];
  summary: string;
}

/**
 * Cash Flow Forecast Report
 * Multi-month cash flow forecast
 */
export interface CashFlowForecastReport {
  programId: string;
  reportDate: Date;
  forecastPeriod: {
    startDate: Date;
    endDate: Date;
    monthsAhead: number;
  };
  monthlyForecasts: Array<{
    month: string;
    forecastedInflows: number;
    forecastedOutflows: number;
    netCashFlow: number;
    cumulativeCashFlow: number;
    endingBalance: number;
  }>;
  scenarios: {
    conservative: {
      inflowAssumption: number;
      outflowAssumption: number;
      endingBalance: number;
    };
    realistic: {
      inflowAssumption: number;
      outflowAssumption: number;
      endingBalance: number;
    };
    optimistic: {
      inflowAssumption: number;
      outflowAssumption: number;
      endingBalance: number;
    };
  };
  riskAssessment: {
    liquidityRisk: "low" | "medium" | "high" | "critical";
    riskFactors: string[];
    mitigationStrategies: string[];
  };
  summary: string;
}

/**
 * Cash Burn Report
 * Burn rate and runway analysis
 */
export interface CashBurnReport {
  programId: string;
  reportDate: Date;
  burnMetrics: {
    dailyBurnRate: number;
    weeklyBurnRate: number;
    monthlyBurnRate: number;
    averageBurnRate: number;
  };
  runway: {
    currentBalance: number;
    runwayDays: number;
    runwayWeeks: number;
    runwayMonths: number;
    depletionDate: Date | null;
  };
  burnTrend: {
    trend: "increasing" | "stable" | "decreasing";
    trendPercent: number;
    lastMonthBurn: number;
    thisMonthBurn: number;
  };
  alerts: Array<{
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    recommendation: string;
  }>;
  summary: string;
}

/**
 * Cash Flow Executive Summary
 * High-level cash health summary for executives
 */
export interface CashFlowExecutiveSummary {
  programId: string;
  reportDate: Date;
  executiveOverview: string;
  cashHealthScore: number;
  healthStatus: "healthy" | "stable" | "concerning" | "critical";
  keyMetrics: {
    currentCash: number;
    monthlyBurnRate: number;
    runwayMonths: number;
    cashFlowTrend: "positive" | "neutral" | "negative";
    liquidityRatio: number;
  };
  criticalFindings: string[];
  opportunities: string[];
  executiveRecommendations: string[];
  actionItems: Array<{
    action: string;
    owner: string;
    priority: "low" | "medium" | "high" | "critical";
    dueDate: Date;
  }>;
}

/**
 * Generate Cash Flow Statement
 * Standard cash flow statement for a period
 */
export async function generateCashFlowStatement(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  periodMonths: number = 1
): Promise<CashFlowStatement> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    // Get all cash flows for the period
    const cashFlows = await listCashFlows(sheets, spreadsheetId, {
      programId,
      startDate,
      endDate,
    });

    // Separate into inflows and outflows
    const inflowMap = new Map<CashFlowCategory, number>();
    const outflowMap = new Map<CashFlowCategory, number>();

    for (const flow of cashFlows) {
      if (flow.status === "cancelled") continue;

      if (flow.type === "inflow") {
        inflowMap.set(flow.category, (inflowMap.get(flow.category) || 0) + flow.amount);
      } else {
        outflowMap.set(flow.category, (outflowMap.get(flow.category) || 0) + flow.amount);
      }
    }

    // Build inflows array
    const inflows = Array.from(inflowMap.entries()).map(([category, amount]) => ({
      category,
      description: category.replace(/_/g, " ").toUpperCase(),
      amount,
    }));

    // Build outflows array
    const outflows = Array.from(outflowMap.entries()).map(([category, amount]) => ({
      category,
      description: category.replace(/_/g, " ").toUpperCase(),
      amount,
    }));

    const totalInflows = inflows.reduce((sum, i) => sum + i.amount, 0);
    const totalOutflows = outflows.reduce((sum, o) => sum + o.amount, 0);
    const netOperatingCash = totalInflows - totalOutflows;

    // Calculate balances (simplified - would need actual bank balance in production)
    const openingBalance = 100000; // Placeholder
    const closingBalance = openingBalance + netOperatingCash;

    // Generate statement text
    let statementText = `CASH FLOW STATEMENT - ${programId}\n`;
    statementText += `Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n\n`;
    statementText += `Operating Activities:\n`;
    statementText += `Cash Inflows:\n`;
    inflows.forEach((i) => {
      statementText += `  ${i.description}: $${i.amount.toLocaleString()}\n`;
    });
    statementText += `  Total Inflows: $${totalInflows.toLocaleString()}\n\n`;
    statementText += `Cash Outflows:\n`;
    outflows.forEach((o) => {
      statementText += `  ${o.description}: $${o.amount.toLocaleString()}\n`;
    });
    statementText += `  Total Outflows: ($${totalOutflows.toLocaleString()})\n\n`;
    statementText += `Net Operating Cash Flow: $${netOperatingCash.toLocaleString()}\n\n`;
    statementText += `Summary:\n`;
    statementText += `Opening Balance: $${openingBalance.toLocaleString()}\n`;
    statementText += `Net Cash Flow: $${netOperatingCash.toLocaleString()}\n`;
    statementText += `Closing Balance: $${closingBalance.toLocaleString()}`;

    return {
      programId,
      period: {
        startDate,
        endDate,
        periodMonths,
      },
      reportDate: new Date(),
      operatingActivities: {
        inflows,
        outflows,
        totalInflows,
        totalOutflows,
        netOperatingCash,
      },
      summary: {
        openingBalance,
        totalInflows,
        totalOutflows,
        netCashFlow: netOperatingCash,
        closingBalance,
      },
      statementText,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate cash flow statement: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate Cash Position Report
 * Current and forecast cash position
 */
export async function generateCashPositionReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<CashPositionReport> {
  try {
    // Get upcoming cash flows (next 90 days)
    const upcomingFlows = await getUpcomingCashFlows(sheets, spreadsheetId, programId, 90);

    // Calculate expected inflows and outflows
    let expectedInflows = 0;
    let expectedOutflows = 0;

    for (const flow of upcomingFlows) {
      if (flow.type === "inflow") {
        expectedInflows += flow.amount;
      } else {
        expectedOutflows += flow.amount;
      }
    }

    // Current position (simplified - would integrate with accounting system)
    const cashOnHand = 100000; // Placeholder
    const accountsReceivable = expectedInflows;
    const accountsPayable = expectedOutflows;
    const netPosition = cashOnHand + accountsReceivable - accountsPayable;

    // Get forecasted positions
    const now = new Date();
    const date30 = new Date(now);
    date30.setDate(date30.getDate() + 30);
    const date60 = new Date(now);
    date60.setDate(date60.getDate() + 60);
    const date90 = new Date(now);
    date90.setDate(date90.getDate() + 90);

    const projection30 = await getCashFlowProjection(sheets, spreadsheetId, programId, now, date30);
    const projection60 = await getCashFlowProjection(sheets, spreadsheetId, programId, now, date60);
    const projection90 = await getCashFlowProjection(sheets, spreadsheetId, programId, now, date90);

    const forecastedPosition = {
      next30Days: cashOnHand + projection30.netFlow,
      next60Days: cashOnHand + projection60.netFlow,
      next90Days: cashOnHand + projection90.netFlow,
    };

    // Determine trend
    let positionTrend: "improving" | "stable" | "declining";
    if (forecastedPosition.next90Days > forecastedPosition.next30Days * 1.1) {
      positionTrend = "improving";
    } else if (forecastedPosition.next90Days < forecastedPosition.next30Days * 0.9) {
      positionTrend = "declining";
    } else {
      positionTrend = "stable";
    }

    // Generate warnings
    const warnings: string[] = [];
    if (netPosition < 50000) {
      warnings.push("Low cash position - consider accelerating receivables");
    }
    if (forecastedPosition.next30Days < 0) {
      warnings.push("CRITICAL: Negative cash position forecasted within 30 days");
    }
    if (positionTrend === "declining") {
      warnings.push("Cash position is declining over the next 90 days");
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (positionTrend === "declining") {
      recommendations.push("Review and reduce discretionary spending");
      recommendations.push("Accelerate collection of accounts receivable");
    }
    if (accountsPayable > cashOnHand) {
      recommendations.push("Negotiate payment terms with vendors");
    }
    if (warnings.length > 0) {
      recommendations.push("Develop cash preservation plan");
    }

    // Generate summary
    let summary = `Cash Position Report for ${programId}\n\n`;
    summary += `Current Position:\n`;
    summary += `- Cash on Hand: $${cashOnHand.toLocaleString()}\n`;
    summary += `- Accounts Receivable: $${accountsReceivable.toLocaleString()}\n`;
    summary += `- Accounts Payable: $${accountsPayable.toLocaleString()}\n`;
    summary += `- Net Position: $${netPosition.toLocaleString()}\n\n`;
    summary += `Forecasted Position:\n`;
    summary += `- 30 Days: $${forecastedPosition.next30Days.toLocaleString()}\n`;
    summary += `- 60 Days: $${forecastedPosition.next60Days.toLocaleString()}\n`;
    summary += `- 90 Days: $${forecastedPosition.next90Days.toLocaleString()}\n`;
    summary += `- Trend: ${positionTrend.toUpperCase()}\n\n`;

    if (warnings.length > 0) {
      summary += `Warnings:\n${warnings.map((w) => `⚠️  ${w}`).join("\n")}`;
    }

    return {
      programId,
      reportDate: new Date(),
      currentPosition: {
        cashOnHand,
        accountsReceivable,
        accountsPayable,
        netPosition,
      },
      forecastedPosition,
      positionTrend,
      warnings,
      recommendations,
      summary,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate cash position report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate Cash Flow Forecast Report
 * Multi-month forecast with scenarios
 */
export async function generateCashFlowForecastReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  monthsAhead: number = 6
): Promise<CashFlowForecastReport> {
  try {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + monthsAhead);

    // Get forecast data
    const monthlyForecastData = await forecastMonthlyCashFlow(sheets, spreadsheetId, programId, monthsAhead);

    // Build monthly forecasts from the forecast data
    const monthlyForecasts: Array<{
      month: string;
      forecastedInflows: number;
      forecastedOutflows: number;
      netCashFlow: number;
      cumulativeCashFlow: number;
      endingBalance: number;
    }> = monthlyForecastData.map((forecast) => ({
      month: forecast.month,
      forecastedInflows: forecast.totalInflows,
      forecastedOutflows: forecast.totalOutflows,
      netCashFlow: forecast.netCashFlow,
      cumulativeCashFlow: forecast.closingBalance - 100000, // Assuming starting balance of 100000
      endingBalance: forecast.closingBalance,
    }));

    // Calculate total projected inflows and outflows
    const totalProjectedInflows = monthlyForecasts.reduce((sum, m) => sum + m.forecastedInflows, 0);
    const totalProjectedOutflows = monthlyForecasts.reduce((sum, m) => sum + m.forecastedOutflows, 0);
    const projectedBalance = monthlyForecasts.length > 0 ? monthlyForecasts[monthlyForecasts.length - 1].endingBalance : 0;
    const startingBalance = 100000; // Placeholder
    const netProjectedFlow = totalProjectedInflows - totalProjectedOutflows;

    // Scenario analysis
    const scenarios = {
      conservative: {
        inflowAssumption: 0.7, // 70% of forecasted inflows
        outflowAssumption: 1.1, // 110% of forecasted outflows
        endingBalance: startingBalance + netProjectedFlow * 0.5,
      },
      realistic: {
        inflowAssumption: 1.0,
        outflowAssumption: 1.0,
        endingBalance: projectedBalance,
      },
      optimistic: {
        inflowAssumption: 1.2, // 120% of forecasted inflows
        outflowAssumption: 0.9, // 90% of forecasted outflows
        endingBalance: startingBalance + netProjectedFlow * 1.5,
      },
    };

    // Risk assessment
    let liquidityRisk: "low" | "medium" | "high" | "critical";
    if (scenarios.conservative.endingBalance < 0) {
      liquidityRisk = "critical";
    } else if (scenarios.conservative.endingBalance < 50000) {
      liquidityRisk = "high";
    } else if (scenarios.realistic.endingBalance < 100000) {
      liquidityRisk = "medium";
    } else {
      liquidityRisk = "low";
    }

    const riskFactors: string[] = [];
    const mitigationStrategies: string[] = [];

    if (liquidityRisk === "critical" || liquidityRisk === "high") {
      riskFactors.push("Insufficient cash reserves for conservative scenario");
      riskFactors.push("High dependency on forecasted inflows");
      mitigationStrategies.push("Establish line of credit");
      mitigationStrategies.push("Defer non-essential expenditures");
    }

    if (totalProjectedOutflows > totalProjectedInflows) {
      riskFactors.push("Negative cash flow projected");
      mitigationStrategies.push("Accelerate revenue collection");
      mitigationStrategies.push("Negotiate extended payment terms");
    }

    // Generate summary
    let summary = `Cash Flow Forecast for ${programId}\n\n`;
    summary += `Forecast Period: ${monthsAhead} months\n`;
    summary += `Liquidity Risk: ${liquidityRisk.toUpperCase()}\n\n`;
    summary += `Scenarios:\n`;
    summary += `- Conservative: $${scenarios.conservative.endingBalance.toLocaleString()}\n`;
    summary += `- Realistic: $${scenarios.realistic.endingBalance.toLocaleString()}\n`;
    summary += `- Optimistic: $${scenarios.optimistic.endingBalance.toLocaleString()}\n\n`;

    if (riskFactors.length > 0) {
      summary += `Risk Factors:\n${riskFactors.map((r) => `- ${r}`).join("\n")}\n\n`;
      summary += `Mitigation Strategies:\n${mitigationStrategies.map((m) => `- ${m}`).join("\n")}`;
    }

    return {
      programId,
      reportDate: new Date(),
      forecastPeriod: {
        startDate,
        endDate,
        monthsAhead,
      },
      monthlyForecasts,
      scenarios,
      riskAssessment: {
        liquidityRisk,
        riskFactors,
        mitigationStrategies,
      },
      summary,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate cash flow forecast report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate Cash Burn Report
 * Burn rate and runway analysis
 */
export async function generateCashBurnReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<CashBurnReport> {
  try {
    // Get burn rate analysis
    const burnRateAnalysis = await calculateBurnRate(sheets, spreadsheetId, programId, 3);

    // Burn metrics
    const dailyBurnRate = burnRateAnalysis.dailyBurn;
    const weeklyBurnRate = burnRateAnalysis.weeklyBurn;
    const monthlyBurnRate = burnRateAnalysis.monthlyBurn;
    const averageBurnRate = monthlyBurnRate;

    // Runway calculation
    const currentBalance = 100000; // Placeholder
    const runwayDays = dailyBurnRate > 0 ? currentBalance / dailyBurnRate : Infinity;
    const runwayWeeks = runwayDays / 7;
    const runwayMonths = runwayDays / 30;

    const depletionDate =
      runwayDays !== Infinity
        ? new Date(Date.now() + runwayDays * 24 * 60 * 60 * 1000)
        : null;

    // Calculate burn trend
    const thisMonthBurn = monthlyBurnRate;
    const lastMonthBurn = monthlyBurnRate * 0.9; // Placeholder calculation

    const trendPercent = lastMonthBurn > 0 ? ((thisMonthBurn - lastMonthBurn) / lastMonthBurn) * 100 : 0;

    let trend: "increasing" | "stable" | "decreasing";
    if (trendPercent > 10) {
      trend = "increasing";
    } else if (trendPercent < -10) {
      trend = "decreasing";
    } else {
      trend = "stable";
    }

    // Generate alerts
    const alerts: Array<{
      severity: "low" | "medium" | "high" | "critical";
      message: string;
      recommendation: string;
    }> = [];

    if (runwayMonths < 3) {
      alerts.push({
        severity: "critical",
        message: `Critical: Only ${runwayMonths.toFixed(1)} months of runway remaining`,
        recommendation: "Immediate action required - secure funding or reduce burn",
      });
    } else if (runwayMonths < 6) {
      alerts.push({
        severity: "high",
        message: `Warning: ${runwayMonths.toFixed(1)} months of runway remaining`,
        recommendation: "Begin fundraising or cost reduction initiatives",
      });
    }

    if (trend === "increasing") {
      alerts.push({
        severity: "medium",
        message: `Burn rate increasing by ${trendPercent.toFixed(1)}%`,
        recommendation: "Review spending and identify cost reduction opportunities",
      });
    }

    // Generate summary
    let summary = `Cash Burn Analysis for ${programId}\n\n`;
    summary += `Burn Metrics:\n`;
    summary += `- Daily Burn: $${dailyBurnRate.toLocaleString()}\n`;
    summary += `- Weekly Burn: $${weeklyBurnRate.toLocaleString()}\n`;
    summary += `- Monthly Burn: $${monthlyBurnRate.toLocaleString()}\n\n`;
    summary += `Runway:\n`;
    summary += `- Current Balance: $${currentBalance.toLocaleString()}\n`;
    summary += `- Runway: ${runwayMonths.toFixed(1)} months (${Math.round(runwayDays)} days)\n`;
    if (depletionDate) {
      summary += `- Depletion Date: ${depletionDate.toLocaleDateString()}\n`;
    }
    summary += `\nBurn Trend: ${trend.toUpperCase()} (${trendPercent > 0 ? "+" : ""}${trendPercent.toFixed(1)}%)\n\n`;

    if (alerts.length > 0) {
      summary += `Alerts:\n${alerts.map((a) => `[${a.severity.toUpperCase()}] ${a.message}`).join("\n")}`;
    }

    return {
      programId,
      reportDate: new Date(),
      burnMetrics: {
        dailyBurnRate,
        weeklyBurnRate,
        monthlyBurnRate,
        averageBurnRate,
      },
      runway: {
        currentBalance,
        runwayDays: Math.round(runwayDays),
        runwayWeeks,
        runwayMonths,
        depletionDate,
      },
      burnTrend: {
        trend,
        trendPercent,
        lastMonthBurn,
        thisMonthBurn,
      },
      alerts,
      summary,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate cash burn report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate Cash Flow Executive Summary
 * High-level cash health summary
 */
export async function generateCashFlowExecutiveSummary(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<CashFlowExecutiveSummary> {
  try {
    // Get upcoming cash flows (next 90 days)
    const upcomingFlows = await getUpcomingCashFlows(sheets, spreadsheetId, programId, 90);
    const burnReport = await generateCashBurnReport(sheets, spreadsheetId, programId);

    // Calculate expected inflows and outflows
    let expectedInflows = 0;
    let expectedOutflows = 0;

    for (const flow of upcomingFlows) {
      if (flow.type === "inflow") {
        expectedInflows += flow.amount;
      } else {
        expectedOutflows += flow.amount;
      }
    }

    // Key metrics
    const currentCash = burnReport.runway.currentBalance;
    const monthlyBurnRate = burnReport.burnMetrics.monthlyBurnRate;
    const runwayMonths = burnReport.runway.runwayMonths;
    const cashFlowTrend: "positive" | "neutral" | "negative" =
      expectedInflows > expectedOutflows
        ? "positive"
        : expectedInflows < expectedOutflows
          ? "negative"
          : "neutral";
    const liquidityRatio = expectedOutflows > 0 ? currentCash / expectedOutflows : 0;

    // Calculate health score (0-100)
    let cashHealthScore = 100;
    if (runwayMonths < 3) cashHealthScore -= 40;
    else if (runwayMonths < 6) cashHealthScore -= 20;
    else if (runwayMonths < 12) cashHealthScore -= 10;

    if (cashFlowTrend === "negative") cashHealthScore -= 20;
    if (liquidityRatio < 0.5) cashHealthScore -= 20;
    else if (liquidityRatio < 1.0) cashHealthScore -= 10;

    cashHealthScore = Math.max(0, cashHealthScore);

    // Determine health status
    let healthStatus: "healthy" | "stable" | "concerning" | "critical";
    if (cashHealthScore >= 80) {
      healthStatus = "healthy";
    } else if (cashHealthScore >= 60) {
      healthStatus = "stable";
    } else if (cashHealthScore >= 40) {
      healthStatus = "concerning";
    } else {
      healthStatus = "critical";
    }

    // Critical findings
    const criticalFindings: string[] = [];
    if (runwayMonths < 6) {
      criticalFindings.push(`Limited runway: ${runwayMonths.toFixed(1)} months remaining`);
    }
    if (cashFlowTrend === "negative") {
      criticalFindings.push("Negative cash flow trend - outflows exceeding inflows");
    }
    if (burnReport.burnTrend.trend === "increasing") {
      criticalFindings.push("Burn rate is increasing");
    }

    // Opportunities
    const opportunities: string[] = [];
    if (expectedInflows > monthlyBurnRate * 2) {
      opportunities.push("Strong expected inflows - consider strategic investments");
    }
    if (runwayMonths > 12) {
      opportunities.push("Healthy runway provides stability for growth initiatives");
    }

    // Executive recommendations
    const executiveRecommendations: string[] = [];
    if (healthStatus === "critical") {
      executiveRecommendations.push("URGENT: Implement immediate cash preservation measures");
      executiveRecommendations.push("Secure emergency funding or bridge financing");
    } else if (healthStatus === "concerning") {
      executiveRecommendations.push("Develop cash management plan");
      executiveRecommendations.push("Review and optimize spending");
    } else {
      executiveRecommendations.push("Maintain disciplined cash management");
      executiveRecommendations.push("Continue monitoring cash position weekly");
    }

    // Action items
    const actionItems: Array<{
      action: string;
      owner: string;
      priority: "low" | "medium" | "high" | "critical";
      dueDate: Date;
    }> = [];

    if (runwayMonths < 6) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      actionItems.push({
        action: "Develop cash preservation plan",
        owner: "CFO",
        priority: "critical",
        dueDate,
      });
    }

    // Executive overview
    let executiveOverview = `CASH FLOW EXECUTIVE SUMMARY - ${programId}\n\n`;
    executiveOverview += `Cash Health Status: ${healthStatus.toUpperCase()} (Score: ${cashHealthScore}/100)\n\n`;
    executiveOverview += `Key Metrics:\n`;
    executiveOverview += `- Current Cash: $${currentCash.toLocaleString()}\n`;
    executiveOverview += `- Monthly Burn: $${monthlyBurnRate.toLocaleString()}\n`;
    executiveOverview += `- Runway: ${runwayMonths.toFixed(1)} months\n`;
    executiveOverview += `- Cash Flow Trend: ${cashFlowTrend.toUpperCase()}\n`;
    executiveOverview += `- Liquidity Ratio: ${liquidityRatio.toFixed(2)}\n\n`;

    if (criticalFindings.length > 0) {
      executiveOverview += `Critical Findings:\n${criticalFindings.map((f) => `- ${f}`).join("\n")}\n\n`;
    }

    if (executiveRecommendations.length > 0) {
      executiveOverview += `Executive Recommendations:\n${executiveRecommendations.map((r) => `- ${r}`).join("\n")}`;
    }

    return {
      programId,
      reportDate: new Date(),
      executiveOverview,
      cashHealthScore,
      healthStatus,
      keyMetrics: {
        currentCash,
        monthlyBurnRate,
        runwayMonths,
        cashFlowTrend,
        liquidityRatio,
      },
      criticalFindings,
      opportunities,
      executiveRecommendations,
      actionItems,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate cash flow executive summary: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
