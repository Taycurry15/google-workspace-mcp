/**
 * Budget Reports Module
 *
 * Generates comprehensive budget reports for financial analysis and management.
 * Provides detailed comparisons of budgeted vs actual spending, utilization tracking,
 * variance analysis, forecasting, and executive summaries.
 */

import type { sheets_v4 } from "googleapis";
import type { Budget, BudgetCategory } from "../types/financial.js";
import { listBudgets, calculateBurnRate } from "../budgets/budgets.js";

/**
 * Budget vs Actual Report
 * Detailed comparison of budgeted amounts vs actual spending
 */
export interface BudgetVsActualReport {
  programId: string;
  fiscalYear?: number;
  generatedDate: Date;
  categories: Array<{
    category: BudgetCategory;
    budgeted: number;
    actual: number;
    variance: number;
    variancePercent: number;
    status: "under" | "on-track" | "over";
  }>;
  totals: {
    totalBudgeted: number;
    totalActual: number;
    totalVariance: number;
    variancePercent: number;
  };
  summary: string;
}

/**
 * Budget Utilization Report
 * Shows percentage utilization of budget by category
 */
export interface BudgetUtilizationReport {
  programId: string;
  generatedDate: Date;
  categories: Array<{
    category: BudgetCategory;
    allocated: number;
    spent: number;
    remaining: number;
    utilizationPercent: number;
    status: "low" | "moderate" | "high" | "critical";
  }>;
  overall: {
    totalAllocated: number;
    totalSpent: number;
    totalRemaining: number;
    overallUtilization: number;
  };
  warnings: string[];
  summary: string;
}

/**
 * Budget Variance Report
 * Detailed variance analysis showing over/under budget by category
 */
export interface BudgetVarianceReport {
  programId: string;
  generatedDate: Date;
  variances: Array<{
    category: BudgetCategory;
    budgetId: string;
    budgetName: string;
    allocated: number;
    spent: number;
    variance: number;
    variancePercent: number;
    varianceType: "favorable" | "unfavorable";
    severity: "low" | "medium" | "high" | "critical";
  }>;
  summary: {
    favorableCount: number;
    unfavorableCount: number;
    totalFavorableVariance: number;
    totalUnfavorableVariance: number;
    netVariance: number;
  };
  recommendations: string[];
  summaryText: string;
}

/**
 * Budget Forecast Report
 * Forecasts budget depletion based on current burn rate
 */
export interface BudgetForecastReport {
  programId: string;
  generatedDate: Date;
  forecasts: Array<{
    category: BudgetCategory;
    budgetId: string;
    budgetName: string;
    allocated: number;
    spent: number;
    remaining: number;
    dailyBurnRate: number;
    weeklyBurnRate: number;
    monthlyBurnRate: number;
    estimatedDepletionDate: Date | null;
    daysRemaining: number;
    status: "healthy" | "warning" | "critical" | "depleted";
  }>;
  overall: {
    totalAllocated: number;
    totalSpent: number;
    totalRemaining: number;
    averageDailyBurn: number;
    estimatedRunwayDays: number;
  };
  alerts: string[];
  summary: string;
}

/**
 * Budget Executive Summary
 * High-level executive summary with key KPIs
 */
export interface BudgetExecutiveSummary {
  programId: string;
  generatedDate: Date;
  period: {
    start: Date;
    end: Date;
  };
  kpis: {
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    utilizationRate: number;
    burnRate: number;
    projectedOverrun: number;
    budgetsOnTrack: number;
    budgetsAtRisk: number;
    budgetsOverBudget: number;
  };
  topIssues: Array<{
    category: BudgetCategory;
    budgetName: string;
    issue: string;
    severity: "low" | "medium" | "high" | "critical";
  }>;
  keyInsights: string[];
  recommendations: string[];
  executiveSummary: string;
}

/**
 * Generate Budget vs Actual Report
 * Compares budgeted vs actual spending by category
 */
export async function generateBudgetVsActualReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  fiscalYear?: number
): Promise<BudgetVsActualReport> {
  try {
    // Fetch all budgets for the program
    const filters: any = { programId };
    if (fiscalYear) {
      filters.fiscalYear = `FY${fiscalYear}`;
    }

    const budgets = await listBudgets(sheets, spreadsheetId, filters);

    if (budgets.length === 0) {
      throw new Error(`No budgets found for program ${programId}`);
    }

    // Aggregate by category
    const categoryMap = new Map<BudgetCategory, { budgeted: number; actual: number }>();

    for (const budget of budgets) {
      const existing = categoryMap.get(budget.category) || { budgeted: 0, actual: 0 };
      categoryMap.set(budget.category, {
        budgeted: existing.budgeted + budget.allocated,
        actual: existing.actual + budget.spent,
      });
    }

    // Calculate variances
    const categories = Array.from(categoryMap.entries()).map(([category, data]) => {
      const variance = data.budgeted - data.actual;
      const variancePercent = data.budgeted > 0 ? (variance / data.budgeted) * 100 : 0;

      let status: "under" | "on-track" | "over";
      if (data.actual > data.budgeted * 1.05) {
        status = "over";
      } else if (data.actual < data.budgeted * 0.95) {
        status = "under";
      } else {
        status = "on-track";
      }

      return {
        category,
        budgeted: data.budgeted,
        actual: data.actual,
        variance,
        variancePercent,
        status,
      };
    });

    // Calculate totals
    const totals = categories.reduce(
      (acc, cat) => ({
        totalBudgeted: acc.totalBudgeted + cat.budgeted,
        totalActual: acc.totalActual + cat.actual,
        totalVariance: acc.totalVariance + cat.variance,
        variancePercent: 0, // Will calculate after
      }),
      { totalBudgeted: 0, totalActual: 0, totalVariance: 0, variancePercent: 0 }
    );

    totals.variancePercent =
      totals.totalBudgeted > 0 ? (totals.totalVariance / totals.totalBudgeted) * 100 : 0;

    // Generate summary
    const overBudgetCategories = categories.filter((c) => c.status === "over");
    const underBudgetCategories = categories.filter((c) => c.status === "under");

    let summary = `Budget vs Actual Analysis for ${programId}:\n`;
    summary += `Total Budget: $${totals.totalBudgeted.toLocaleString()}\n`;
    summary += `Total Spent: $${totals.totalActual.toLocaleString()}\n`;
    summary += `Overall Variance: $${totals.totalVariance.toLocaleString()} (${totals.variancePercent.toFixed(1)}%)\n\n`;

    if (overBudgetCategories.length > 0) {
      summary += `⚠️  Categories Over Budget: ${overBudgetCategories.map((c) => c.category).join(", ")}\n`;
    }

    if (underBudgetCategories.length > 0) {
      summary += `✓ Categories Under Budget: ${underBudgetCategories.map((c) => c.category).join(", ")}\n`;
    }

    return {
      programId,
      fiscalYear,
      generatedDate: new Date(),
      categories,
      totals,
      summary,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate budget vs actual report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate Budget Utilization Report
 * Shows budget utilization percentage by category
 */
export async function generateBudgetUtilizationReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<BudgetUtilizationReport> {
  try {
    const budgets = await listBudgets(sheets, spreadsheetId, { programId });

    if (budgets.length === 0) {
      throw new Error(`No budgets found for program ${programId}`);
    }

    // Aggregate by category
    const categoryMap = new Map<
      BudgetCategory,
      { allocated: number; spent: number; remaining: number }
    >();

    for (const budget of budgets) {
      const existing = categoryMap.get(budget.category) || {
        allocated: 0,
        spent: 0,
        remaining: 0,
      };
      categoryMap.set(budget.category, {
        allocated: existing.allocated + budget.allocated,
        spent: existing.spent + budget.spent,
        remaining: existing.remaining + budget.remaining,
      });
    }

    // Calculate utilization percentages
    const categories = Array.from(categoryMap.entries()).map(([category, data]) => {
      const utilizationPercent = data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0;

      let status: "low" | "moderate" | "high" | "critical";
      if (utilizationPercent < 50) {
        status = "low";
      } else if (utilizationPercent < 80) {
        status = "moderate";
      } else if (utilizationPercent < 100) {
        status = "high";
      } else {
        status = "critical";
      }

      return {
        category,
        allocated: data.allocated,
        spent: data.spent,
        remaining: data.remaining,
        utilizationPercent,
        status,
      };
    });

    // Calculate overall utilization
    const overall = categories.reduce(
      (acc, cat) => ({
        totalAllocated: acc.totalAllocated + cat.allocated,
        totalSpent: acc.totalSpent + cat.spent,
        totalRemaining: acc.totalRemaining + cat.remaining,
        overallUtilization: 0,
      }),
      { totalAllocated: 0, totalSpent: 0, totalRemaining: 0, overallUtilization: 0 }
    );

    overall.overallUtilization =
      overall.totalAllocated > 0 ? (overall.totalSpent / overall.totalAllocated) * 100 : 0;

    // Generate warnings
    const warnings: string[] = [];
    const criticalCategories = categories.filter((c) => c.status === "critical");
    const highCategories = categories.filter((c) => c.status === "high");

    if (criticalCategories.length > 0) {
      warnings.push(
        `${criticalCategories.length} categories have exceeded budget: ${criticalCategories.map((c) => c.category).join(", ")}`
      );
    }

    if (highCategories.length > 0) {
      warnings.push(
        `${highCategories.length} categories are at high utilization (>80%): ${highCategories.map((c) => c.category).join(", ")}`
      );
    }

    // Generate summary
    let summary = `Budget Utilization Report for ${programId}:\n`;
    summary += `Overall Utilization: ${overall.overallUtilization.toFixed(1)}%\n`;
    summary += `Total Allocated: $${overall.totalAllocated.toLocaleString()}\n`;
    summary += `Total Spent: $${overall.totalSpent.toLocaleString()}\n`;
    summary += `Total Remaining: $${overall.totalRemaining.toLocaleString()}\n\n`;

    if (warnings.length > 0) {
      summary += `Warnings:\n${warnings.map((w) => `⚠️  ${w}`).join("\n")}`;
    }

    return {
      programId,
      generatedDate: new Date(),
      categories,
      overall,
      warnings,
      summary,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate budget utilization report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate Budget Variance Report
 * Detailed variance analysis showing over/under budget
 */
export async function generateBudgetVarianceReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<BudgetVarianceReport> {
  try {
    const budgets = await listBudgets(sheets, spreadsheetId, { programId });

    if (budgets.length === 0) {
      throw new Error(`No budgets found for program ${programId}`);
    }

    // Calculate variance for each budget
    const variances = budgets.map((budget) => {
      const variance = budget.allocated - budget.spent;
      const variancePercent = budget.allocated > 0 ? (variance / budget.allocated) * 100 : 0;
      const varianceType: "favorable" | "unfavorable" =
        variance >= 0 ? "favorable" : "unfavorable";

      let severity: "low" | "medium" | "high" | "critical";
      const absVariancePercent = Math.abs(variancePercent);
      if (absVariancePercent < 5) {
        severity = "low";
      } else if (absVariancePercent < 10) {
        severity = "medium";
      } else if (absVariancePercent < 20) {
        severity = "high";
      } else {
        severity = "critical";
      }

      return {
        category: budget.category,
        budgetId: budget.budgetId,
        budgetName: budget.name,
        allocated: budget.allocated,
        spent: budget.spent,
        variance,
        variancePercent,
        varianceType,
        severity,
      };
    });

    // Calculate summary
    const summary = {
      favorableCount: variances.filter((v) => v.varianceType === "favorable").length,
      unfavorableCount: variances.filter((v) => v.varianceType === "unfavorable").length,
      totalFavorableVariance: variances
        .filter((v) => v.varianceType === "favorable")
        .reduce((sum, v) => sum + v.variance, 0),
      totalUnfavorableVariance: variances
        .filter((v) => v.varianceType === "unfavorable")
        .reduce((sum, v) => sum + Math.abs(v.variance), 0),
      netVariance: variances.reduce((sum, v) => sum + v.variance, 0),
    };

    // Generate recommendations
    const recommendations: string[] = [];
    const criticalVariances = variances.filter((v) => v.severity === "critical");

    if (criticalVariances.length > 0) {
      recommendations.push(
        `Immediate action required for ${criticalVariances.length} budgets with critical variance (>20%)`
      );
      criticalVariances.forEach((v) => {
        recommendations.push(
          `- ${v.budgetName} (${v.category}): ${v.varianceType === "favorable" ? "Under" : "Over"} budget by ${Math.abs(v.variancePercent).toFixed(1)}%`
        );
      });
    }

    if (summary.totalUnfavorableVariance > summary.totalFavorableVariance) {
      recommendations.push(
        `Overall unfavorable variance of $${(summary.totalUnfavorableVariance - summary.totalFavorableVariance).toLocaleString()}. Review spending controls.`
      );
    }

    // Generate summary text
    let summaryText = `Budget Variance Analysis for ${programId}:\n`;
    summaryText += `Net Variance: $${summary.netVariance.toLocaleString()}\n`;
    summaryText += `Favorable Variances: ${summary.favorableCount} ($${summary.totalFavorableVariance.toLocaleString()})\n`;
    summaryText += `Unfavorable Variances: ${summary.unfavorableCount} ($${summary.totalUnfavorableVariance.toLocaleString()})\n\n`;

    if (recommendations.length > 0) {
      summaryText += `Recommendations:\n${recommendations.join("\n")}`;
    }

    return {
      programId,
      generatedDate: new Date(),
      variances,
      summary,
      recommendations,
      summaryText,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate budget variance report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate Budget Forecast Report
 * Forecasts budget depletion based on burn rate
 */
export async function generateBudgetForecastReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<BudgetForecastReport> {
  try {
    const budgets = await listBudgets(sheets, spreadsheetId, { programId });

    if (budgets.length === 0) {
      throw new Error(`No budgets found for program ${programId}`);
    }

    // Calculate burn rates and forecasts
    const forecasts = await Promise.all(
      budgets.map(async (budget) => {
        const burnRate = await calculateBurnRate(sheets, spreadsheetId, budget.budgetId);

        let status: "healthy" | "warning" | "critical" | "depleted";
        if (budget.remaining <= 0) {
          status = "depleted";
        } else if (burnRate && burnRate.daysRemaining < 30) {
          status = "critical";
        } else if (burnRate && burnRate.daysRemaining < 60) {
          status = "warning";
        } else {
          status = "healthy";
        }

        return {
          category: budget.category,
          budgetId: budget.budgetId,
          budgetName: budget.name,
          allocated: budget.allocated,
          spent: budget.spent,
          remaining: budget.remaining,
          dailyBurnRate: burnRate?.dailyBurn || 0,
          weeklyBurnRate: burnRate?.weeklyBurn || 0,
          monthlyBurnRate: burnRate?.monthlyBurn || 0,
          estimatedDepletionDate: burnRate?.projectedDepletionDate || null,
          daysRemaining: burnRate?.daysRemaining || 0,
          status,
        };
      })
    );

    // Calculate overall metrics
    const overall = forecasts.reduce(
      (acc, f) => ({
        totalAllocated: acc.totalAllocated + f.allocated,
        totalSpent: acc.totalSpent + f.spent,
        totalRemaining: acc.totalRemaining + f.remaining,
        averageDailyBurn: acc.averageDailyBurn + f.dailyBurnRate,
        estimatedRunwayDays: 0,
      }),
      {
        totalAllocated: 0,
        totalSpent: 0,
        totalRemaining: 0,
        averageDailyBurn: 0,
        estimatedRunwayDays: 0,
      }
    );

    overall.estimatedRunwayDays =
      overall.averageDailyBurn > 0 ? overall.totalRemaining / overall.averageDailyBurn : 0;

    // Generate alerts
    const alerts: string[] = [];
    const criticalForecasts = forecasts.filter((f) => f.status === "critical");
    const depletedForecasts = forecasts.filter((f) => f.status === "depleted");

    if (depletedForecasts.length > 0) {
      alerts.push(
        `🔴 ${depletedForecasts.length} budgets are depleted: ${depletedForecasts.map((f) => f.budgetName).join(", ")}`
      );
    }

    if (criticalForecasts.length > 0) {
      alerts.push(
        `⚠️  ${criticalForecasts.length} budgets will deplete within 30 days: ${criticalForecasts.map((f) => f.budgetName).join(", ")}`
      );
    }

    // Generate summary
    let summary = `Budget Forecast Report for ${programId}:\n`;
    summary += `Estimated Runway: ${Math.round(overall.estimatedRunwayDays)} days\n`;
    summary += `Average Daily Burn: $${overall.averageDailyBurn.toLocaleString()}\n`;
    summary += `Total Remaining: $${overall.totalRemaining.toLocaleString()}\n\n`;

    if (alerts.length > 0) {
      summary += `Alerts:\n${alerts.join("\n")}`;
    }

    return {
      programId,
      generatedDate: new Date(),
      forecasts,
      overall,
      alerts,
      summary,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate budget forecast report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate Budget Executive Summary
 * High-level executive summary with KPIs and insights
 */
export async function generateBudgetExecutiveSummary(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<BudgetExecutiveSummary> {
  try {
    const budgets = await listBudgets(sheets, spreadsheetId, { programId });

    if (budgets.length === 0) {
      throw new Error(`No budgets found for program ${programId}`);
    }

    // Determine period
    const period = {
      start: budgets.reduce(
        (earliest, b) => (b.periodStart < earliest ? b.periodStart : earliest),
        budgets[0].periodStart
      ),
      end: budgets.reduce(
        (latest, b) => (b.periodEnd > latest ? b.periodEnd : latest),
        budgets[0].periodEnd
      ),
    };

    // Calculate KPIs
    const totalBudget = budgets.reduce((sum, b) => sum + b.allocated, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = budgets.reduce((sum, b) => sum + b.remaining, 0);
    const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    // Calculate burn rate
    const now = new Date();
    const elapsedDays = (now.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24);
    const burnRate = elapsedDays > 0 ? totalSpent / elapsedDays : 0;

    // Categorize budgets
    const budgetsOnTrack = budgets.filter(
      (b) => b.spent <= b.allocated && b.spent >= b.allocated * 0.8
    ).length;
    const budgetsAtRisk = budgets.filter(
      (b) => b.spent > b.allocated * 0.9 && b.spent <= b.allocated
    ).length;
    const budgetsOverBudget = budgets.filter((b) => b.spent > b.allocated).length;

    const projectedOverrun = budgets
      .filter((b) => b.spent > b.allocated)
      .reduce((sum, b) => sum + (b.spent - b.allocated), 0);

    const kpis = {
      totalBudget,
      totalSpent,
      totalRemaining,
      utilizationRate,
      burnRate,
      projectedOverrun,
      budgetsOnTrack,
      budgetsAtRisk,
      budgetsOverBudget,
    };

    // Identify top issues
    const topIssues: Array<{
      category: BudgetCategory;
      budgetName: string;
      issue: string;
      severity: "low" | "medium" | "high" | "critical";
    }> = [];

    budgets
      .filter((b) => b.spent > b.allocated)
      .sort((a, b) => b.spent - b.allocated - (a.spent - a.allocated))
      .slice(0, 5)
      .forEach((budget) => {
        const overrun = budget.spent - budget.allocated;
        const overrunPercent = ((overrun / budget.allocated) * 100).toFixed(1);
        topIssues.push({
          category: budget.category,
          budgetName: budget.name,
          issue: `Over budget by $${overrun.toLocaleString()} (${overrunPercent}%)`,
          severity: overrun > budget.allocated * 0.2 ? "critical" : "high",
        });
      });

    // Generate key insights
    const keyInsights: string[] = [];

    if (utilizationRate > 90) {
      keyInsights.push(`High budget utilization at ${utilizationRate.toFixed(1)}%`);
    }

    if (budgetsOverBudget > 0) {
      keyInsights.push(`${budgetsOverBudget} budgets have exceeded their allocation`);
    }

    if (burnRate > 0) {
      const estimatedRunwayDays = totalRemaining / burnRate;
      keyInsights.push(
        `Current burn rate suggests ${Math.round(estimatedRunwayDays)} days of runway remaining`
      );
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (budgetsOverBudget > 0) {
      recommendations.push(
        "Review and address budgets that have exceeded allocation to prevent further overruns"
      );
    }

    if (budgetsAtRisk > 0) {
      recommendations.push(
        `Monitor ${budgetsAtRisk} budgets at risk of exceeding allocation (>90% utilized)`
      );
    }

    if (utilizationRate < 50 && budgets.length > 0) {
      recommendations.push("Consider reallocating underutilized budget to high-priority areas");
    }

    if (projectedOverrun > totalBudget * 0.1) {
      recommendations.push("Implement spending controls - projected overrun exceeds 10% of budget");
    }

    // Generate executive summary
    let executiveSummary = `BUDGET EXECUTIVE SUMMARY - ${programId}\n\n`;
    executiveSummary += `Financial Health: `;
    if (budgetsOverBudget === 0 && utilizationRate < 90) {
      executiveSummary += "HEALTHY ✓\n\n";
    } else if (budgetsOverBudget === 0) {
      executiveSummary += "AT RISK ⚠️\n\n";
    } else {
      executiveSummary += "CRITICAL 🔴\n\n";
    }

    executiveSummary += `Key Metrics:\n`;
    executiveSummary += `- Total Budget: $${totalBudget.toLocaleString()}\n`;
    executiveSummary += `- Total Spent: $${totalSpent.toLocaleString()}\n`;
    executiveSummary += `- Utilization Rate: ${utilizationRate.toFixed(1)}%\n`;
    executiveSummary += `- Daily Burn Rate: $${burnRate.toLocaleString()}\n`;
    executiveSummary += `- Budgets On Track: ${budgetsOnTrack}\n`;
    executiveSummary += `- Budgets At Risk: ${budgetsAtRisk}\n`;
    executiveSummary += `- Budgets Over Budget: ${budgetsOverBudget}\n\n`;

    if (keyInsights.length > 0) {
      executiveSummary += `Key Insights:\n${keyInsights.map((i) => `- ${i}`).join("\n")}\n\n`;
    }

    if (recommendations.length > 0) {
      executiveSummary += `Recommendations:\n${recommendations.map((r) => `- ${r}`).join("\n")}`;
    }

    return {
      programId,
      generatedDate: new Date(),
      period,
      kpis,
      topIssues,
      keyInsights,
      recommendations,
      executiveSummary,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate budget executive summary: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
