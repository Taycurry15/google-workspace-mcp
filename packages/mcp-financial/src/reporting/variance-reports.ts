/**
 * Variance Reports Module
 *
 * Generates comprehensive variance analysis reports for financial control and management.
 * Provides cost variance, schedule variance, budget variance by category, forecast variance,
 * and comprehensive executive summaries following PMI/PMBOK variance analysis practices.
 */

import type { sheets_v4 } from "googleapis";
import type { Budget, BudgetCategory, EVMMetrics } from "../types/financial.js";
import { listBudgets } from "../budgets/budgets.js";
import { performEVMCalculation } from "../evm/calculations.js";
import { listTransactions } from "../transactions/transactions.js";

/**
 * Cost Variance Report
 * Detailed EVM cost variance analysis
 */
export interface CostVarianceReport {
  programId: string;
  reportDate: Date;
  evmMetrics: {
    ev: number;
    ac: number;
    cv: number;
    cvPercent: number;
    cpi: number;
  };
  varianceAnalysis: {
    status: "favorable" | "unfavorable";
    severity: "low" | "medium" | "high" | "critical";
    impact: string;
    rootCauses: string[];
  };
  categoryBreakdown: Array<{
    category: BudgetCategory;
    planned: number;
    actual: number;
    variance: number;
    variancePercent: number;
  }>;
  trends: {
    lastPeriodCV: number;
    currentPeriodCV: number;
    trend: "improving" | "stable" | "worsening";
  };
  recommendations: string[];
  summary: string;
}

/**
 * Schedule Variance Report
 * Detailed EVM schedule variance analysis
 */
export interface ScheduleVarianceReport {
  programId: string;
  reportDate: Date;
  evmMetrics: {
    pv: number;
    ev: number;
    sv: number;
    svPercent: number;
    spi: number;
  };
  varianceAnalysis: {
    status: "ahead" | "on-schedule" | "behind";
    severity: "low" | "medium" | "high" | "critical";
    scheduleImpact: string;
    delayEstimate: number; // days
  };
  milestoneAnalysis: Array<{
    milestone: string;
    plannedDate: Date;
    forecastDate: Date;
    variance: number; // days
    status: "on-time" | "at-risk" | "delayed";
  }>;
  contributingFactors: string[];
  recoveryActions: string[];
  summary: string;
}

/**
 * Budget Variance by Category Report
 * Detailed variance breakdown by budget category
 */
export interface BudgetVarianceByCategoryReport {
  programId: string;
  reportDate: Date;
  categoryVariances: Array<{
    category: BudgetCategory;
    budgetCount: number;
    totalAllocated: number;
    totalSpent: number;
    totalCommitted: number;
    totalRemaining: number;
    variance: number;
    variancePercent: number;
    utilizationPercent: number;
    status: "under-budget" | "on-budget" | "over-budget";
    topVariances: Array<{
      budgetId: string;
      budgetName: string;
      variance: number;
      variancePercent: number;
    }>;
  }>;
  summary: {
    totalAllocated: number;
    totalSpent: number;
    totalVariance: number;
    favorableVariance: number;
    unfavorableVariance: number;
    categoriesOnBudget: number;
    categoriesOverBudget: number;
  };
  insights: string[];
  recommendations: string[];
  summaryText: string;
}

/**
 * Forecast Variance Report
 * Actual vs forecast variance analysis
 */
export interface ForecastVarianceReport {
  programId: string;
  reportDate: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  forecastAccuracy: {
    forecastedSpend: number;
    actualSpend: number;
    variance: number;
    variancePercent: number;
    accuracyScore: number; // 0-100
  };
  monthlyVariances: Array<{
    month: string;
    forecasted: number;
    actual: number;
    variance: number;
    variancePercent: number;
  }>;
  categoryAccuracy: Array<{
    category: BudgetCategory;
    forecastAccuracy: number;
    variance: number;
  }>;
  forecastQuality: {
    averageVariance: number;
    standardDeviation: number;
    reliability: "excellent" | "good" | "fair" | "poor";
  };
  adjustments: string[];
  summary: string;
}

/**
 * Variance Executive Summary
 * Comprehensive variance summary for executives
 */
export interface VarianceExecutiveSummary {
  programId: string;
  reportDate: Date;
  executiveOverview: string;
  keyVariances: {
    costVariance: number;
    scheduleVariance: number;
    budgetVariance: number;
    forecastVariance: number;
  };
  performanceIndicators: {
    cpi: number;
    spi: number;
    overallPerformance: "excellent" | "good" | "needs-improvement" | "poor";
  };
  criticalVariances: Array<{
    type: "cost" | "schedule" | "budget" | "forecast";
    description: string;
    impact: string;
    severity: "low" | "medium" | "high" | "critical";
    action: string;
  }>;
  varianceTrends: {
    costTrend: "improving" | "stable" | "worsening";
    scheduleTrend: "improving" | "stable" | "worsening";
    budgetTrend: "improving" | "stable" | "worsening";
  };
  executiveRecommendations: string[];
  actionPlan: Array<{
    action: string;
    owner: string;
    priority: "low" | "medium" | "high" | "critical";
    dueDate: Date;
  }>;
}

/**
 * Generate Cost Variance Report
 * Detailed EVM cost variance analysis
 */
export async function generateCostVarianceReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<CostVarianceReport> {
  try {
    // Get EVM metrics
    const evmData = await performEVMCalculation(sheets, spreadsheetId, programId);
    const { ev, ac, metrics } = evmData;

    // Determine variance status
    const status: "favorable" | "unfavorable" = metrics.cv >= 0 ? "favorable" : "unfavorable";

    let severity: "low" | "medium" | "high" | "critical";
    const absCVPercent = Math.abs(metrics.cvPercent);
    if (absCVPercent < 5) {
      severity = "low";
    } else if (absCVPercent < 10) {
      severity = "medium";
    } else if (absCVPercent < 20) {
      severity = "high";
    } else {
      severity = "critical";
    }

    // Impact assessment
    let impact = "";
    if (status === "favorable") {
      impact = `Project is ${metrics.cvPercent.toFixed(1)}% under budget on work performed`;
    } else {
      impact = `Project is ${Math.abs(metrics.cvPercent).toFixed(1)}% over budget - additional $${Math.abs(metrics.cv).toLocaleString()} spent`;
    }

    // Identify root causes
    const rootCauses: string[] = [];
    if (status === "unfavorable") {
      rootCauses.push("Actual costs exceeding planned costs for work performed");
      if (metrics.cpi < 0.9) {
        rootCauses.push("Significant cost inefficiency in project execution");
      }
    }

    // Get budget breakdown by category
    const budgets = await listBudgets(sheets, spreadsheetId, { programId });
    const categoryMap = new Map<BudgetCategory, { planned: number; actual: number }>();

    for (const budget of budgets) {
      const existing = categoryMap.get(budget.category) || { planned: 0, actual: 0 };
      categoryMap.set(budget.category, {
        planned: existing.planned + budget.allocated,
        actual: existing.actual + budget.spent,
      });
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => {
      const variance = data.planned - data.actual;
      const variancePercent = data.planned > 0 ? (variance / data.planned) * 100 : 0;
      return {
        category,
        planned: data.planned,
        actual: data.actual,
        variance,
        variancePercent,
      };
    });

    // Trend analysis (simplified - would need historical data)
    const lastPeriodCV = metrics.cv * 0.9; // Placeholder
    const currentPeriodCV = metrics.cv;
    const trend: "improving" | "stable" | "worsening" =
      currentPeriodCV > lastPeriodCV
        ? "improving"
        : currentPeriodCV < lastPeriodCV * 0.95
          ? "worsening"
          : "stable";

    // Generate recommendations
    const recommendations: string[] = [];
    if (status === "unfavorable") {
      if (severity === "critical") {
        recommendations.push("URGENT: Implement immediate cost control measures");
        recommendations.push("Conduct detailed cost analysis to identify overspending sources");
      }
      recommendations.push("Review vendor contracts and renegotiate where possible");
      recommendations.push("Optimize resource allocation to improve cost efficiency");
      if (metrics.cpi < 0.9) {
        recommendations.push("Consider value engineering to reduce costs without sacrificing quality");
      }
    }

    // Generate summary
    let summary = `Cost Variance Analysis for ${programId}\n\n`;
    summary += `EVM Cost Metrics:\n`;
    summary += `- Earned Value (EV): $${ev.toLocaleString()}\n`;
    summary += `- Actual Cost (AC): $${ac.toLocaleString()}\n`;
    summary += `- Cost Variance (CV): $${metrics.cv.toLocaleString()} (${metrics.cvPercent.toFixed(1)}%)\n`;
    summary += `- Cost Performance Index (CPI): ${metrics.cpi.toFixed(3)}\n\n`;
    summary += `Status: ${status.toUpperCase()} (Severity: ${severity})\n`;
    summary += `Impact: ${impact}\n\n`;
    summary += `Trend: ${trend.toUpperCase()}\n\n`;

    if (recommendations.length > 0) {
      summary += `Recommendations:\n${recommendations.map((r) => `- ${r}`).join("\n")}`;
    }

    return {
      programId,
      reportDate: new Date(),
      evmMetrics: {
        ev,
        ac,
        cv: metrics.cv,
        cvPercent: metrics.cvPercent,
        cpi: metrics.cpi,
      },
      varianceAnalysis: {
        status,
        severity,
        impact,
        rootCauses,
      },
      categoryBreakdown,
      trends: {
        lastPeriodCV,
        currentPeriodCV,
        trend,
      },
      recommendations,
      summary,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate cost variance report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate Schedule Variance Report
 * Detailed EVM schedule variance analysis
 */
export async function generateScheduleVarianceReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<ScheduleVarianceReport> {
  try {
    // Get EVM metrics
    const evmData = await performEVMCalculation(sheets, spreadsheetId, programId);
    const { pv, ev, metrics } = evmData;

    // Determine schedule status
    const status: "ahead" | "on-schedule" | "behind" =
      metrics.spi > 1.05 ? "ahead" : metrics.spi < 0.95 ? "behind" : "on-schedule";

    let severity: "low" | "medium" | "high" | "critical";
    const absSVPercent = Math.abs(metrics.svPercent);
    if (absSVPercent < 5) {
      severity = "low";
    } else if (absSVPercent < 10) {
      severity = "medium";
    } else if (absSVPercent < 20) {
      severity = "high";
    } else {
      severity = "critical";
    }

    // Schedule impact
    let scheduleImpact = "";
    if (status === "ahead") {
      scheduleImpact = `Project is ${metrics.svPercent.toFixed(1)}% ahead of schedule`;
    } else if (status === "behind") {
      scheduleImpact = `Project is ${Math.abs(metrics.svPercent).toFixed(1)}% behind schedule`;
    } else {
      scheduleImpact = "Project is on schedule";
    }

    // Estimate delay in days (simplified calculation)
    const baselineDuration = 365; // Placeholder - would come from project plan
    const delayEstimate = status === "behind" ? (baselineDuration * Math.abs(metrics.svPercent)) / 100 : 0;

    // Milestone analysis (placeholder - would integrate with program/deliverables data)
    const milestoneAnalysis: Array<{
      milestone: string;
      plannedDate: Date;
      forecastDate: Date;
      variance: number;
      status: "on-time" | "at-risk" | "delayed";
    }> = [];

    // Would populate with actual milestone data in production
    // For now, create sample data based on SPI
    if (metrics.spi < 1.0) {
      const plannedDate = new Date();
      plannedDate.setDate(plannedDate.getDate() + 30);
      const forecastDate = new Date(plannedDate);
      forecastDate.setDate(forecastDate.getDate() + delayEstimate);

      milestoneAnalysis.push({
        milestone: "Next Major Milestone",
        plannedDate,
        forecastDate,
        variance: delayEstimate,
        status: severity === "critical" ? "delayed" : severity === "high" ? "at-risk" : "on-time",
      });
    }

    // Contributing factors
    const contributingFactors: string[] = [];
    if (status === "behind") {
      contributingFactors.push("Earned value is lower than planned value");
      if (metrics.spi < 0.9) {
        contributingFactors.push("Significant schedule inefficiency in project execution");
      }
      contributingFactors.push("Work is being completed slower than planned");
    }

    // Recovery actions
    const recoveryActions: string[] = [];
    if (status === "behind") {
      if (severity === "critical") {
        recoveryActions.push("URGENT: Fast-track critical path activities");
        recoveryActions.push("Add resources to critical tasks");
      }
      recoveryActions.push("Crash schedule by overlapping activities where possible");
      recoveryActions.push("Re-baseline schedule if delays are unavoidable");
      recoveryActions.push("Identify and remove bottlenecks");
    }

    // Generate summary
    let summary = `Schedule Variance Analysis for ${programId}\n\n`;
    summary += `EVM Schedule Metrics:\n`;
    summary += `- Planned Value (PV): $${pv.toLocaleString()}\n`;
    summary += `- Earned Value (EV): $${ev.toLocaleString()}\n`;
    summary += `- Schedule Variance (SV): $${metrics.sv.toLocaleString()} (${metrics.svPercent.toFixed(1)}%)\n`;
    summary += `- Schedule Performance Index (SPI): ${metrics.spi.toFixed(3)}\n\n`;
    summary += `Status: ${status.toUpperCase()} (Severity: ${severity})\n`;
    summary += `Impact: ${scheduleImpact}\n`;
    if (delayEstimate > 0) {
      summary += `Estimated Delay: ${Math.round(delayEstimate)} days\n`;
    }
    summary += `\n`;

    if (recoveryActions.length > 0) {
      summary += `Recovery Actions:\n${recoveryActions.map((a) => `- ${a}`).join("\n")}`;
    }

    return {
      programId,
      reportDate: new Date(),
      evmMetrics: {
        pv,
        ev,
        sv: metrics.sv,
        svPercent: metrics.svPercent,
        spi: metrics.spi,
      },
      varianceAnalysis: {
        status,
        severity,
        scheduleImpact,
        delayEstimate,
      },
      milestoneAnalysis,
      contributingFactors,
      recoveryActions,
      summary,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate schedule variance report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate Budget Variance by Category Report
 * Variance breakdown by budget category
 */
export async function generateBudgetVarianceByCategory(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<BudgetVarianceByCategoryReport> {
  try {
    const budgets = await listBudgets(sheets, spreadsheetId, { programId });

    if (budgets.length === 0) {
      throw new Error(`No budgets found for program ${programId}`);
    }

    // Group by category
    const categoryMap = new Map<
      BudgetCategory,
      {
        budgets: Budget[];
        allocated: number;
        spent: number;
        committed: number;
        remaining: number;
      }
    >();

    for (const budget of budgets) {
      const existing = categoryMap.get(budget.category) || {
        budgets: [],
        allocated: 0,
        spent: 0,
        committed: 0,
        remaining: 0,
      };

      categoryMap.set(budget.category, {
        budgets: [...existing.budgets, budget],
        allocated: existing.allocated + budget.allocated,
        spent: existing.spent + budget.spent,
        committed: existing.committed + budget.committed,
        remaining: existing.remaining + budget.remaining,
      });
    }

    // Calculate category variances
    const categoryVariances = Array.from(categoryMap.entries()).map(([category, data]) => {
      const variance = data.allocated - data.spent;
      const variancePercent = data.allocated > 0 ? (variance / data.allocated) * 100 : 0;
      const utilizationPercent = data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0;

      let status: "under-budget" | "on-budget" | "over-budget";
      if (data.spent > data.allocated) {
        status = "over-budget";
      } else if (utilizationPercent > 90) {
        status = "on-budget";
      } else {
        status = "under-budget";
      }

      // Get top variances in this category
      const topVariances = data.budgets
        .map((b) => ({
          budgetId: b.budgetId,
          budgetName: b.name,
          variance: b.allocated - b.spent,
          variancePercent: b.allocated > 0 ? ((b.allocated - b.spent) / b.allocated) * 100 : 0,
        }))
        .sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent))
        .slice(0, 3);

      return {
        category,
        budgetCount: data.budgets.length,
        totalAllocated: data.allocated,
        totalSpent: data.spent,
        totalCommitted: data.committed,
        totalRemaining: data.remaining,
        variance,
        variancePercent,
        utilizationPercent,
        status,
        topVariances,
      };
    });

    // Calculate summary
    const summary = categoryVariances.reduce(
      (acc, cat) => ({
        totalAllocated: acc.totalAllocated + cat.totalAllocated,
        totalSpent: acc.totalSpent + cat.totalSpent,
        totalVariance: acc.totalVariance + cat.variance,
        favorableVariance:
          acc.favorableVariance + (cat.variance > 0 ? cat.variance : 0),
        unfavorableVariance:
          acc.unfavorableVariance + (cat.variance < 0 ? Math.abs(cat.variance) : 0),
        categoriesOnBudget:
          acc.categoriesOnBudget + (cat.status === "on-budget" ? 1 : 0),
        categoriesOverBudget:
          acc.categoriesOverBudget + (cat.status === "over-budget" ? 1 : 0),
      }),
      {
        totalAllocated: 0,
        totalSpent: 0,
        totalVariance: 0,
        favorableVariance: 0,
        unfavorableVariance: 0,
        categoriesOnBudget: 0,
        categoriesOverBudget: 0,
      }
    );

    // Generate insights
    const insights: string[] = [];
    const overBudgetCategories = categoryVariances.filter((c) => c.status === "over-budget");
    const underBudgetCategories = categoryVariances.filter((c) => c.status === "under-budget");

    if (overBudgetCategories.length > 0) {
      insights.push(
        `${overBudgetCategories.length} categories are over budget: ${overBudgetCategories.map((c) => c.category).join(", ")}`
      );
    }

    if (summary.unfavorableVariance > summary.favorableVariance) {
      insights.push(
        `Net unfavorable variance of $${(summary.unfavorableVariance - summary.favorableVariance).toLocaleString()}`
      );
    }

    const highestVariance = categoryVariances.reduce((max, cat) =>
      Math.abs(cat.variancePercent) > Math.abs(max.variancePercent) ? cat : max
    );
    insights.push(
      `Highest variance in ${highestVariance.category}: ${highestVariance.variancePercent.toFixed(1)}%`
    );

    // Generate recommendations
    const recommendations: string[] = [];
    if (overBudgetCategories.length > 0) {
      recommendations.push("Focus cost reduction efforts on over-budget categories");
      overBudgetCategories.forEach((cat) => {
        recommendations.push(
          `- ${cat.category}: Over by $${Math.abs(cat.variance).toLocaleString()}`
        );
      });
    }

    if (underBudgetCategories.length > 3) {
      recommendations.push("Consider reallocating budget from under-utilized categories");
    }

    // Generate summary text
    let summaryText = `Budget Variance by Category for ${programId}\n\n`;
    summaryText += `Overall Summary:\n`;
    summaryText += `- Total Allocated: $${summary.totalAllocated.toLocaleString()}\n`;
    summaryText += `- Total Spent: $${summary.totalSpent.toLocaleString()}\n`;
    summaryText += `- Net Variance: $${summary.totalVariance.toLocaleString()}\n`;
    summaryText += `- Categories Over Budget: ${summary.categoriesOverBudget}\n`;
    summaryText += `- Categories On Budget: ${summary.categoriesOnBudget}\n\n`;

    if (insights.length > 0) {
      summaryText += `Key Insights:\n${insights.map((i) => `- ${i}`).join("\n")}\n\n`;
    }

    if (recommendations.length > 0) {
      summaryText += `Recommendations:\n${recommendations.map((r) => `${r}`).join("\n")}`;
    }

    return {
      programId,
      reportDate: new Date(),
      categoryVariances,
      summary,
      insights,
      recommendations,
      summaryText,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate budget variance by category report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate Forecast Variance Report
 * Actual vs forecast variance analysis
 */
export async function generateForecastVarianceReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<ForecastVarianceReport> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    // Get actual spending
    const transactions = await listTransactions(sheets, spreadsheetId, {
      programId,
      startDate,
      endDate,
    });

    const actualSpend = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Get forecasted spend (would come from forecasting module in production)
    // For now, use budget allocated as proxy for forecast
    const budgets = await listBudgets(sheets, spreadsheetId, { programId });
    const forecastedSpend = budgets.reduce((sum, b) => sum + b.allocated, 0) * 0.5; // Assume 50% for 6-month period

    const variance = forecastedSpend - actualSpend;
    const variancePercent = forecastedSpend > 0 ? (variance / forecastedSpend) * 100 : 0;

    // Calculate accuracy score (0-100)
    const accuracyScore = Math.max(0, 100 - Math.abs(variancePercent));

    // Monthly variances (simplified - would need detailed historical forecasts)
    const monthlyVariances: Array<{
      month: string;
      forecasted: number;
      actual: number;
      variance: number;
      variancePercent: number;
    }> = [];

    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(startDate);
      monthDate.setMonth(monthDate.getMonth() + i);
      const monthName = monthDate.toLocaleDateString("en-US", { year: "numeric", month: "long" });

      const monthForecasted = forecastedSpend / 6;
      const monthActual = actualSpend / 6; // Simplified - would need actual monthly data
      const monthVariance = monthForecasted - monthActual;
      const monthVariancePercent = monthForecasted > 0 ? (monthVariance / monthForecasted) * 100 : 0;

      monthlyVariances.push({
        month: monthName,
        forecasted: monthForecasted,
        actual: monthActual,
        variance: monthVariance,
        variancePercent: monthVariancePercent,
      });
    }

    // Category accuracy
    const categoryMap = new Map<BudgetCategory, { forecasted: number; actual: number }>();

    for (const budget of budgets) {
      const existing = categoryMap.get(budget.category) || { forecasted: 0, actual: 0 };
      categoryMap.set(budget.category, {
        forecasted: existing.forecasted + budget.allocated * 0.5,
        actual: existing.actual + budget.spent,
      });
    }

    const categoryAccuracy = Array.from(categoryMap.entries()).map(([category, data]) => {
      const catVariance = data.forecasted - data.actual;
      const catVariancePercent = data.forecasted > 0 ? Math.abs((catVariance / data.forecasted) * 100) : 0;
      const forecastAccuracy = Math.max(0, 100 - catVariancePercent);

      return {
        category,
        forecastAccuracy,
        variance: catVariance,
      };
    });

    // Forecast quality assessment
    const averageVariance = Math.abs(variancePercent);
    const standardDeviation = monthlyVariances.reduce((sum, m) => sum + Math.abs(m.variancePercent), 0) / 6;

    let reliability: "excellent" | "good" | "fair" | "poor";
    if (averageVariance < 5) {
      reliability = "excellent";
    } else if (averageVariance < 10) {
      reliability = "good";
    } else if (averageVariance < 20) {
      reliability = "fair";
    } else {
      reliability = "poor";
    }

    // Generate adjustments
    const adjustments: string[] = [];
    if (variancePercent > 10) {
      adjustments.push("Forecasting model overestimating spend - adjust downward");
    } else if (variancePercent < -10) {
      adjustments.push("Forecasting model underestimating spend - adjust upward");
    }

    if (standardDeviation > 15) {
      adjustments.push("High variability in monthly forecasts - improve model stability");
    }

    // Generate summary
    let summary = `Forecast Variance Report for ${programId}\n\n`;
    summary += `Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n\n`;
    summary += `Forecast Accuracy:\n`;
    summary += `- Forecasted Spend: $${forecastedSpend.toLocaleString()}\n`;
    summary += `- Actual Spend: $${actualSpend.toLocaleString()}\n`;
    summary += `- Variance: $${variance.toLocaleString()} (${variancePercent.toFixed(1)}%)\n`;
    summary += `- Accuracy Score: ${accuracyScore.toFixed(0)}/100\n`;
    summary += `- Forecast Quality: ${reliability.toUpperCase()}\n\n`;

    if (adjustments.length > 0) {
      summary += `Recommended Adjustments:\n${adjustments.map((a) => `- ${a}`).join("\n")}`;
    }

    return {
      programId,
      reportDate: new Date(),
      period: {
        startDate,
        endDate,
      },
      forecastAccuracy: {
        forecastedSpend,
        actualSpend,
        variance,
        variancePercent,
        accuracyScore,
      },
      monthlyVariances,
      categoryAccuracy,
      forecastQuality: {
        averageVariance,
        standardDeviation,
        reliability,
      },
      adjustments,
      summary,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate forecast variance report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate Variance Executive Summary
 * Comprehensive variance summary for executives
 */
export async function generateVarianceExecutiveSummary(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<VarianceExecutiveSummary> {
  try {
    // Get all variance reports
    const costVarianceReport = await generateCostVarianceReport(sheets, spreadsheetId, programId);
    const scheduleVarianceReport = await generateScheduleVarianceReport(
      sheets,
      spreadsheetId,
      programId
    );
    const budgetVarianceReport = await generateBudgetVarianceByCategory(
      sheets,
      spreadsheetId,
      programId
    );

    // Key variances
    const keyVariances = {
      costVariance: costVarianceReport.evmMetrics.cv,
      scheduleVariance: scheduleVarianceReport.evmMetrics.sv,
      budgetVariance: budgetVarianceReport.summary.totalVariance,
      forecastVariance: 0, // Would come from forecast variance report
    };

    // Performance indicators
    const cpi = costVarianceReport.evmMetrics.cpi;
    const spi = scheduleVarianceReport.evmMetrics.spi;

    let overallPerformance: "excellent" | "good" | "needs-improvement" | "poor";
    if (cpi >= 1.0 && spi >= 1.0) {
      overallPerformance = "excellent";
    } else if (cpi >= 0.95 && spi >= 0.95) {
      overallPerformance = "good";
    } else if (cpi >= 0.85 && spi >= 0.85) {
      overallPerformance = "needs-improvement";
    } else {
      overallPerformance = "poor";
    }

    // Critical variances
    const criticalVariances: Array<{
      type: "cost" | "schedule" | "budget" | "forecast";
      description: string;
      impact: string;
      severity: "low" | "medium" | "high" | "critical";
      action: string;
    }> = [];

    if (costVarianceReport.varianceAnalysis.severity === "critical") {
      criticalVariances.push({
        type: "cost",
        description: "Critical cost variance detected",
        impact: costVarianceReport.varianceAnalysis.impact,
        severity: "critical",
        action: "Immediate cost control implementation required",
      });
    }

    if (scheduleVarianceReport.varianceAnalysis.severity === "critical") {
      criticalVariances.push({
        type: "schedule",
        description: "Critical schedule variance detected",
        impact: scheduleVarianceReport.varianceAnalysis.scheduleImpact,
        severity: "critical",
        action: "Fast-track critical activities and add resources",
      });
    }

    if (budgetVarianceReport.summary.categoriesOverBudget > 0) {
      criticalVariances.push({
        type: "budget",
        description: `${budgetVarianceReport.summary.categoriesOverBudget} budget categories over allocation`,
        impact: `Unfavorable variance of $${budgetVarianceReport.summary.unfavorableVariance.toLocaleString()}`,
        severity: budgetVarianceReport.summary.categoriesOverBudget > 2 ? "high" : "medium",
        action: "Review and address over-budget categories",
      });
    }

    // Variance trends
    const costTrend = costVarianceReport.trends.trend;
    const scheduleTrend: "improving" | "stable" | "worsening" =
      scheduleVarianceReport.evmMetrics.spi > 0.95 ? "improving" : "worsening";
    const budgetTrend: "improving" | "stable" | "worsening" =
      budgetVarianceReport.summary.totalVariance > 0 ? "improving" : "worsening";

    // Executive recommendations
    const executiveRecommendations: string[] = [];
    if (overallPerformance === "poor") {
      executiveRecommendations.push("URGENT: Project requires immediate executive intervention");
      executiveRecommendations.push("Consider project restructuring or scope reduction");
    } else if (overallPerformance === "needs-improvement") {
      executiveRecommendations.push("Implement corrective actions to improve performance");
      executiveRecommendations.push("Increase monitoring frequency and oversight");
    }

    if (criticalVariances.length > 0) {
      executiveRecommendations.push("Address critical variances with dedicated action plans");
    }

    // Action plan
    const actionPlan: Array<{
      action: string;
      owner: string;
      priority: "low" | "medium" | "high" | "critical";
      dueDate: Date;
    }> = [];

    if (criticalVariances.length > 0) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      actionPlan.push({
        action: "Develop variance recovery plan",
        owner: "Program Manager",
        priority: "critical",
        dueDate,
      });
    }

    // Executive overview
    let executiveOverview = `VARIANCE EXECUTIVE SUMMARY - ${programId}\n\n`;
    executiveOverview += `Overall Performance: ${overallPerformance.toUpperCase()}\n\n`;
    executiveOverview += `Key Performance Indicators:\n`;
    executiveOverview += `- Cost Performance Index (CPI): ${cpi.toFixed(3)}\n`;
    executiveOverview += `- Schedule Performance Index (SPI): ${spi.toFixed(3)}\n\n`;
    executiveOverview += `Variance Summary:\n`;
    executiveOverview += `- Cost Variance: $${keyVariances.costVariance.toLocaleString()}\n`;
    executiveOverview += `- Schedule Variance: $${keyVariances.scheduleVariance.toLocaleString()}\n`;
    executiveOverview += `- Budget Variance: $${keyVariances.budgetVariance.toLocaleString()}\n\n`;
    executiveOverview += `Trends:\n`;
    executiveOverview += `- Cost: ${costTrend.toUpperCase()}\n`;
    executiveOverview += `- Schedule: ${scheduleTrend.toUpperCase()}\n`;
    executiveOverview += `- Budget: ${budgetTrend.toUpperCase()}\n\n`;

    if (criticalVariances.length > 0) {
      executiveOverview += `Critical Issues: ${criticalVariances.length}\n`;
      executiveOverview += `${criticalVariances.map((v) => `- [${v.severity.toUpperCase()}] ${v.description}`).join("\n")}\n\n`;
    }

    if (executiveRecommendations.length > 0) {
      executiveOverview += `Executive Recommendations:\n${executiveRecommendations.map((r) => `- ${r}`).join("\n")}`;
    }

    return {
      programId,
      reportDate: new Date(),
      executiveOverview,
      keyVariances,
      performanceIndicators: {
        cpi,
        spi,
        overallPerformance,
      },
      criticalVariances,
      varianceTrends: {
        costTrend,
        scheduleTrend,
        budgetTrend,
      },
      executiveRecommendations,
      actionPlan,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate variance executive summary: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
