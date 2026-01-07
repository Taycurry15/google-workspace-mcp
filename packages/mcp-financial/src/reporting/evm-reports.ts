/**
 * EVM Reports Module
 *
 * Generates comprehensive Earned Value Management (EVM) reports for project performance analysis.
 * Provides dashboards, trend analysis, health assessments, forecasting, and executive summaries
 * following PMI/PMBOK best practices.
 */

import type { sheets_v4 } from "googleapis";
import type { EVMMetrics, EVMSnapshot } from "../types/financial.js";
import {
  performEVMCalculation,
  calculateHealthIndex,
  type HealthStatus,
} from "../evm/calculations.js";
import {
  getSnapshotHistory,
} from "../evm/snapshots.js";
import {
  forecastCompletionDate,
  forecastBudgetAtCompletion,
} from "../evm/forecasting.js";
import {
  analyzePerformanceTrend,
  type PerformanceTrendAnalysis,
} from "../evm/trending.js";

/**
 * Completion Forecast
 * Combined budget and schedule forecast data
 */
export interface CompletionForecast {
  estimatedCompletionDate: Date;
  estimatedBudget: number;
  budgetVariance: number;
  scheduleVariance: number;
  confidenceLevel: number;
  method: string;
}

/**
 * EVM Dashboard Report
 * Comprehensive dashboard with all EVM metrics and visualizations
 */
export interface EVMDashboard {
  programId: string;
  reportDate: Date;
  baseMetrics: {
    pv: number;
    ev: number;
    ac: number;
    bac: number;
  };
  derivedMetrics: EVMMetrics;
  healthStatus: HealthStatus;
  performance: {
    costStatus: "under-budget" | "on-budget" | "over-budget";
    scheduleStatus: "ahead" | "on-schedule" | "behind";
    overallStatus: "healthy" | "warning" | "critical";
  };
  visualData: {
    percentComplete: number;
    percentSpent: number;
    costEfficiency: number;
    scheduleEfficiency: number;
  };
  summary: string;
}

/**
 * EVM Trend Report
 * Analysis of EVM metrics over time
 */
export interface EVMTrendReport {
  programId: string;
  reportDate: Date;
  period: {
    startDate: Date;
    endDate: Date;
    monthsAnalyzed: number;
  };
  trendAnalysis: PerformanceTrendAnalysis;
  snapshots: EVMSnapshot[];
  insights: string[];
  trends: {
    cpiTrend: "improving" | "stable" | "declining";
    spiTrend: "improving" | "stable" | "declining";
    overallTrend: "improving" | "stable" | "declining";
  };
  projections: {
    nextMonthCPI: number;
    nextMonthSPI: number;
    confidence: number;
  };
  summary: string;
}

/**
 * EVM Health Report
 * Project health assessment based on EVM indicators
 */
export interface EVMHealthReport {
  programId: string;
  reportDate: Date;
  healthScore: number;
  healthStatus: "healthy" | "warning" | "critical";
  indicators: string[];
  riskFactors: Array<{
    factor: string;
    severity: "low" | "medium" | "high" | "critical";
    impact: string;
    mitigation: string;
  }>;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  executiveAssessment: string;
}

/**
 * EVM Forecast Report
 * Forecasts completion date and final budget
 */
export interface EVMForecastReport {
  programId: string;
  reportDate: Date;
  currentStatus: {
    percentComplete: number;
    currentSpend: number;
    remainingBudget: number;
  };
  forecast: CompletionForecast;
  scenarios: {
    optimistic: {
      eac: number;
      completionDate: Date;
      probability: number;
    };
    realistic: {
      eac: number;
      completionDate: Date;
      probability: number;
    };
    pessimistic: {
      eac: number;
      completionDate: Date;
      probability: number;
    };
  };
  budgetImpact: {
    projectedOverrun: number;
    overrunPercent: number;
    additionalFundingRequired: number;
  };
  scheduleImpact: {
    projectedDelay: number;
    delayInWeeks: number;
    revisedCompletionDate: Date;
  };
  summary: string;
}

/**
 * EVM Executive Summary
 * High-level summary of project performance for executives
 */
export interface EVMExecutiveSummary {
  programId: string;
  reportDate: Date;
  executiveOverview: string;
  keyMetrics: {
    healthScore: number;
    cpi: number;
    spi: number;
    percentComplete: number;
    projectedOverrun: number;
    projectedDelay: number;
  };
  status: {
    overall: "on-track" | "at-risk" | "critical";
    cost: "under-budget" | "on-budget" | "over-budget";
    schedule: "ahead" | "on-schedule" | "behind";
  };
  criticalIssues: Array<{
    issue: string;
    severity: "high" | "critical";
    action: string;
  }>;
  achievements: string[];
  upcomingRisks: string[];
  executiveRecommendations: string[];
  actionItems: Array<{
    action: string;
    owner: string;
    dueDate: Date;
    priority: "low" | "medium" | "high" | "critical";
  }>;
}

/**
 * Generate EVM Dashboard
 * Comprehensive EVM dashboard with all metrics
 */
export async function generateEVMDashboard(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<EVMDashboard> {
  try {
    // Perform EVM calculation
    const evmData = await performEVMCalculation(sheets, spreadsheetId, programId);
    const { pv, ev, ac, bac, metrics } = evmData;

    // Calculate health status
    const healthStatus = calculateHealthIndex(metrics);

    // Determine performance status
    const costStatus: "under-budget" | "on-budget" | "over-budget" =
      metrics.cpi > 1.05 ? "under-budget" : metrics.cpi < 0.95 ? "over-budget" : "on-budget";

    const scheduleStatus: "ahead" | "on-schedule" | "behind" =
      metrics.spi > 1.05 ? "ahead" : metrics.spi < 0.95 ? "behind" : "on-schedule";

    const overallStatus: "healthy" | "warning" | "critical" = healthStatus.status;

    // Calculate visual data
    const percentComplete = bac > 0 ? (ev / bac) * 100 : 0;
    const percentSpent = bac > 0 ? (ac / bac) * 100 : 0;
    const costEfficiency = metrics.cpi;
    const scheduleEfficiency = metrics.spi;

    // Generate summary
    let summary = `EVM Dashboard for ${programId}\n\n`;
    summary += `Project Health: ${healthStatus.status.toUpperCase()} (Score: ${healthStatus.score}/100)\n\n`;
    summary += `Performance Metrics:\n`;
    summary += `- Cost Performance Index (CPI): ${metrics.cpi.toFixed(3)} (${costStatus})\n`;
    summary += `- Schedule Performance Index (SPI): ${metrics.spi.toFixed(3)} (${scheduleStatus})\n`;
    summary += `- Percent Complete: ${percentComplete.toFixed(1)}%\n`;
    summary += `- Percent Spent: ${percentSpent.toFixed(1)}%\n\n`;
    summary += `Financial Status:\n`;
    summary += `- Budget at Completion (BAC): $${bac.toLocaleString()}\n`;
    summary += `- Actual Cost (AC): $${ac.toLocaleString()}\n`;
    summary += `- Estimate at Completion (EAC): $${metrics.eac.toLocaleString()}\n`;
    summary += `- Variance at Completion (VAC): $${metrics.vac.toLocaleString()}\n\n`;
    summary += `Key Indicators:\n${healthStatus.indicators.map((i) => `- ${i}`).join("\n")}`;

    return {
      programId,
      reportDate: new Date(),
      baseMetrics: { pv, ev, ac, bac },
      derivedMetrics: metrics,
      healthStatus,
      performance: { costStatus, scheduleStatus, overallStatus },
      visualData: { percentComplete, percentSpent, costEfficiency, scheduleEfficiency },
      summary,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate EVM dashboard: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate EVM Trend Report
 * Analyzes EVM trends over time
 */
export async function generateEVMTrendReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  monthsBack: number = 6
): Promise<EVMTrendReport> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Get EVM snapshots
    const snapshots = await getSnapshotHistory(sheets, spreadsheetId, programId, monthsBack);

    if (snapshots.length < 2) {
      throw new Error("Insufficient data for trend analysis. Need at least 2 snapshots.");
    }

    // Analyze trends
    const trendAnalysis = await analyzePerformanceTrend(sheets, spreadsheetId, programId, monthsBack);

    // Determine trend directions
    const cpiSlope = trendAnalysis.cpiAnalysis.slope;
    const spiSlope = trendAnalysis.spiAnalysis.slope;
    const cpiTrend = cpiSlope > 0.01 ? "improving" : cpiSlope < -0.01 ? "declining" : "stable";
    const spiTrend = spiSlope > 0.01 ? "improving" : spiSlope < -0.01 ? "declining" : "stable";
    const overallTrend =
      cpiTrend === "improving" && spiTrend === "improving"
        ? "improving"
        : cpiTrend === "declining" || spiTrend === "declining"
          ? "declining"
          : "stable";

    // Generate insights
    const insights: string[] = [];

    if (cpiSlope > 0.01) {
      insights.push("Cost performance is improving over time");
    } else if (cpiSlope < -0.01) {
      insights.push("Cost performance is declining - immediate action required");
    }

    if (spiSlope > 0.01) {
      insights.push("Schedule performance is improving");
    } else if (spiSlope < -0.01) {
      insights.push("Schedule performance is declining - review project timeline");
    }

    const avgVolatility = (trendAnalysis.cpiAnalysis.volatility + trendAnalysis.spiAnalysis.volatility) / 2;
    if (avgVolatility > 0.15) {
      insights.push("High volatility detected in performance metrics - investigate causes");
    }

    // Simple projections (linear trend)
    const latestSnapshot = snapshots[snapshots.length - 1];
    const projections = {
      nextMonthCPI: latestSnapshot.cpi + cpiSlope,
      nextMonthSPI: latestSnapshot.spi + spiSlope,
      confidence: avgVolatility < 0.1 ? 0.8 : avgVolatility < 0.2 ? 0.6 : 0.4,
    };

    // Generate summary
    let summary = `EVM Trend Analysis for ${programId}\n\n`;
    summary += `Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n`;
    summary += `Snapshots Analyzed: ${snapshots.length}\n\n`;
    summary += `Trend Direction:\n`;
    summary += `- Cost Performance: ${cpiTrend.toUpperCase()}\n`;
    summary += `- Schedule Performance: ${spiTrend.toUpperCase()}\n`;
    summary += `- Overall Trend: ${overallTrend.toUpperCase()}\n\n`;
    summary += `Trend Statistics:\n`;
    summary += `- CPI Slope: ${cpiSlope > 0 ? "+" : ""}${cpiSlope.toFixed(4)}\n`;
    summary += `- SPI Slope: ${spiSlope > 0 ? "+" : ""}${spiSlope.toFixed(4)}\n`;
    summary += `- Volatility: ${(avgVolatility * 100).toFixed(1)}%\n\n`;
    if (insights.length > 0) {
      summary += `Key Insights:\n${insights.map((i) => `- ${i}`).join("\n")}`;
    }

    return {
      programId,
      reportDate: new Date(),
      period: {
        startDate,
        endDate,
        monthsAnalyzed: monthsBack,
      },
      trendAnalysis,
      snapshots,
      insights,
      trends: { cpiTrend, spiTrend, overallTrend },
      projections,
      summary,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate EVM trend report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate EVM Health Report
 * Comprehensive health assessment based on EVM
 */
export async function generateEVMHealthReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<EVMHealthReport> {
  try {
    // Get current EVM metrics
    const evmData = await performEVMCalculation(sheets, spreadsheetId, programId);
    const { metrics } = evmData;

    // Calculate health status
    const healthIndex = calculateHealthIndex(metrics);

    // Identify risk factors
    const riskFactors: Array<{
      factor: string;
      severity: "low" | "medium" | "high" | "critical";
      impact: string;
      mitigation: string;
    }> = [];

    if (metrics.cpi < 0.85) {
      riskFactors.push({
        factor: "Critical Cost Overrun",
        severity: "critical",
        impact: `Project is ${((1 - metrics.cpi) * 100).toFixed(1)}% over budget on work performed`,
        mitigation: "Implement immediate cost controls and review vendor contracts",
      });
    } else if (metrics.cpi < 0.95) {
      riskFactors.push({
        factor: "Cost Performance Issue",
        severity: "high",
        impact: "Work is costing more than planned",
        mitigation: "Review resource allocation and optimize team efficiency",
      });
    }

    if (metrics.spi < 0.85) {
      riskFactors.push({
        factor: "Critical Schedule Delay",
        severity: "critical",
        impact: `Project is ${((1 - metrics.spi) * 100).toFixed(1)}% behind schedule`,
        mitigation: "Fast-track critical path activities and add resources if needed",
      });
    } else if (metrics.spi < 0.95) {
      riskFactors.push({
        factor: "Schedule Performance Issue",
        severity: "high",
        impact: "Project is falling behind schedule",
        mitigation: "Review task dependencies and eliminate bottlenecks",
      });
    }

    if (metrics.tcpi > 1.15) {
      riskFactors.push({
        factor: "Unrealistic Performance Required",
        severity: "critical",
        impact: "Remaining work requires significantly better performance than achieved so far",
        mitigation: "Reassess project scope and seek additional budget if needed",
      });
    }

    if (metrics.vac < 0 && Math.abs(metrics.vac) > evmData.bac * 0.1) {
      riskFactors.push({
        factor: "Significant Budget Overrun Projected",
        severity: "critical",
        impact: `Expected to exceed budget by $${Math.abs(metrics.vac).toLocaleString()}`,
        mitigation: "Request budget increase or reduce project scope",
      });
    }

    // Identify strengths
    const strengths: string[] = [];
    if (metrics.cpi >= 1.05) {
      strengths.push("Excellent cost performance - delivering work under budget");
    }
    if (metrics.spi >= 1.05) {
      strengths.push("Strong schedule performance - ahead of planned timeline");
    }
    if (metrics.tcpi < 1.0) {
      strengths.push("Performance target is achievable with current efficiency");
    }

    // Identify weaknesses
    const weaknesses: string[] = [];
    if (metrics.cpi < 1.0) {
      weaknesses.push("Work is costing more than budgeted");
    }
    if (metrics.spi < 1.0) {
      weaknesses.push("Project is behind the planned schedule");
    }
    if (healthIndex.score < 70) {
      weaknesses.push("Overall project health requires attention");
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (healthIndex.status === "critical") {
      recommendations.push("URGENT: Schedule immediate executive review of project status");
      recommendations.push("Develop recovery plan with specific cost and schedule targets");
    } else if (healthIndex.status === "warning") {
      recommendations.push("Increase monitoring frequency to weekly EVM updates");
      recommendations.push("Identify root causes of performance issues");
    }

    if (metrics.cpi < 1.0 && metrics.spi < 1.0) {
      recommendations.push("Project is experiencing both cost and schedule issues - prioritize remediation");
    }

    if (riskFactors.length > 0) {
      recommendations.push("Address identified risk factors with specific action plans");
    }

    // Generate executive assessment
    let executiveAssessment = `PROJECT HEALTH ASSESSMENT - ${programId}\n\n`;
    executiveAssessment += `Overall Health: ${healthIndex.status.toUpperCase()} (${healthIndex.score}/100)\n\n`;
    executiveAssessment += `Performance Summary:\n`;
    executiveAssessment += `- Cost Performance Index: ${metrics.cpi.toFixed(3)} (${metrics.cpi >= 1.0 ? "Good" : "Needs Improvement"})\n`;
    executiveAssessment += `- Schedule Performance Index: ${metrics.spi.toFixed(3)} (${metrics.spi >= 1.0 ? "Good" : "Needs Improvement"})\n\n`;

    if (riskFactors.length > 0) {
      executiveAssessment += `Critical Risk Factors: ${riskFactors.length}\n`;
      executiveAssessment += `${riskFactors.filter((r) => r.severity === "critical").length} Critical\n`;
      executiveAssessment += `${riskFactors.filter((r) => r.severity === "high").length} High\n\n`;
    }

    if (recommendations.length > 0) {
      executiveAssessment += `Key Recommendations:\n${recommendations.map((r) => `- ${r}`).join("\n")}`;
    }

    return {
      programId,
      reportDate: new Date(),
      healthScore: healthIndex.score,
      healthStatus: healthIndex.status,
      indicators: healthIndex.indicators,
      riskFactors,
      strengths,
      weaknesses,
      recommendations,
      executiveAssessment,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate EVM health report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate EVM Forecast Report
 * Forecasts completion date and budget
 */
export async function generateEVMForecastReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<EVMForecastReport> {
  try {
    // Get current EVM data
    const evmData = await performEVMCalculation(sheets, spreadsheetId, programId);
    const { ev, ac, bac, metrics } = evmData;

    // Get budget forecast
    const budgetForecast = await forecastBudgetAtCompletion(sheets, spreadsheetId, programId);

    // Get completion date forecast (using a placeholder planned end date)
    const plannedEndDate = new Date();
    plannedEndDate.setMonth(plannedEndDate.getMonth() + 6); // Placeholder: 6 months from now
    const dateForecast = await forecastCompletionDate(sheets, spreadsheetId, programId, plannedEndDate);

    // Combine into CompletionForecast
    const forecast: CompletionForecast = {
      estimatedCompletionDate: dateForecast.forecastDate,
      estimatedBudget: budgetForecast.eac,
      budgetVariance: budgetForecast.vac,
      scheduleVariance: dateForecast.variance,
      confidenceLevel: budgetForecast.confidence === "high" ? 0.9 : budgetForecast.confidence === "medium" ? 0.7 : 0.5,
      method: budgetForecast.method,
    };

    // Current status
    const percentComplete = bac > 0 ? (ev / bac) * 100 : 0;
    const currentSpend = ac;
    const remainingBudget = bac - ac;

    // Scenario analysis
    const scenarios = {
      optimistic: {
        eac: bac * 0.95, // Assume 5% under budget
        completionDate: new Date(forecast.estimatedCompletionDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week early
        probability: 0.15,
      },
      realistic: {
        eac: metrics.eac,
        completionDate: forecast.estimatedCompletionDate,
        probability: 0.70,
      },
      pessimistic: {
        eac: metrics.eac * 1.1, // 10% worse than current forecast
        completionDate: new Date(forecast.estimatedCompletionDate.getTime() + 14 * 24 * 60 * 60 * 1000), // 2 weeks late
        probability: 0.15,
      },
    };

    // Budget impact
    const projectedOverrun = Math.max(0, metrics.eac - bac);
    const overrunPercent = bac > 0 ? (projectedOverrun / bac) * 100 : 0;
    const additionalFundingRequired = projectedOverrun;

    // Schedule impact (calculate from SPI)
    const plannedDuration = 365; // Placeholder - should come from project schedule
    const projectedDuration = metrics.spi > 0 ? plannedDuration / metrics.spi : plannedDuration;
    const projectedDelay = Math.max(0, projectedDuration - plannedDuration);
    const delayInWeeks = projectedDelay / 7;
    const revisedCompletionDate = forecast.estimatedCompletionDate;

    // Generate summary
    let summary = `EVM Forecast Report for ${programId}\n\n`;
    summary += `Current Status:\n`;
    summary += `- Percent Complete: ${percentComplete.toFixed(1)}%\n`;
    summary += `- Current Spend: $${currentSpend.toLocaleString()}\n`;
    summary += `- Remaining Budget: $${remainingBudget.toLocaleString()}\n\n`;
    summary += `Forecast:\n`;
    summary += `- Estimate at Completion (EAC): $${metrics.eac.toLocaleString()}\n`;
    summary += `- Variance at Completion (VAC): $${metrics.vac.toLocaleString()}\n`;
    summary += `- Estimated Completion: ${forecast.estimatedCompletionDate.toLocaleDateString()}\n`;
    summary += `- Confidence Level: ${(forecast.confidenceLevel * 100).toFixed(0)}%\n\n`;
    summary += `Scenarios:\n`;
    summary += `- Optimistic (15%): $${scenarios.optimistic.eac.toLocaleString()}\n`;
    summary += `- Realistic (70%): $${scenarios.realistic.eac.toLocaleString()}\n`;
    summary += `- Pessimistic (15%): $${scenarios.pessimistic.eac.toLocaleString()}\n\n`;

    if (projectedOverrun > 0) {
      summary += `⚠️  Budget Impact: Projected overrun of $${projectedOverrun.toLocaleString()} (${overrunPercent.toFixed(1)}%)`;
    }

    return {
      programId,
      reportDate: new Date(),
      currentStatus: { percentComplete, currentSpend, remainingBudget },
      forecast,
      scenarios,
      budgetImpact: { projectedOverrun, overrunPercent, additionalFundingRequired },
      scheduleImpact: { projectedDelay, delayInWeeks, revisedCompletionDate },
      summary,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate EVM forecast report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate EVM Executive Summary
 * High-level summary for executive review
 */
export async function generateEVMExecutiveSummary(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<EVMExecutiveSummary> {
  try {
    // Get EVM data
    const evmData = await performEVMCalculation(sheets, spreadsheetId, programId);
    const { ev, bac, metrics } = evmData;

    // Get health assessment
    const healthIndex = calculateHealthIndex(metrics);

    // Key metrics
    const percentComplete = bac > 0 ? (ev / bac) * 100 : 0;
    const projectedOverrun = Math.max(0, metrics.eac - bac);
    const projectedDelay = 0; // Placeholder - would need schedule baseline

    const keyMetrics = {
      healthScore: healthIndex.score,
      cpi: metrics.cpi,
      spi: metrics.spi,
      percentComplete,
      projectedOverrun,
      projectedDelay,
    };

    // Determine status
    const overall: "on-track" | "at-risk" | "critical" =
      healthIndex.status === "healthy" ? "on-track" : healthIndex.status === "warning" ? "at-risk" : "critical";

    const cost: "under-budget" | "on-budget" | "over-budget" =
      metrics.cpi > 1.05 ? "under-budget" : metrics.cpi < 0.95 ? "over-budget" : "on-budget";

    const schedule: "ahead" | "on-schedule" | "behind" =
      metrics.spi > 1.05 ? "ahead" : metrics.spi < 0.95 ? "behind" : "on-schedule";

    // Identify critical issues
    const criticalIssues: Array<{ issue: string; severity: "high" | "critical"; action: string }> = [];

    if (metrics.cpi < 0.85) {
      criticalIssues.push({
        issue: "Critical cost overrun",
        severity: "critical",
        action: "Implement immediate cost reduction measures",
      });
    }

    if (metrics.spi < 0.85) {
      criticalIssues.push({
        issue: "Critical schedule delay",
        severity: "critical",
        action: "Fast-track critical path and add resources",
      });
    }

    if (metrics.vac < -(bac * 0.1)) {
      criticalIssues.push({
        issue: "Significant budget overrun projected",
        severity: "critical",
        action: "Request additional funding or reduce scope",
      });
    }

    // Achievements
    const achievements: string[] = [];
    if (metrics.cpi > 1.05) {
      achievements.push(`Delivering work ${((metrics.cpi - 1) * 100).toFixed(1)}% under budget`);
    }
    if (metrics.spi > 1.05) {
      achievements.push(`Project is ${((metrics.spi - 1) * 100).toFixed(1)}% ahead of schedule`);
    }
    if (percentComplete > 50) {
      achievements.push(`Project is ${percentComplete.toFixed(1)}% complete`);
    }

    // Upcoming risks
    const upcomingRisks: string[] = [];
    if (metrics.tcpi > 1.1) {
      upcomingRisks.push("Achieving budget requires significantly improved performance");
    }
    if (metrics.cpi < 1.0 && metrics.spi < 1.0) {
      upcomingRisks.push("Both cost and schedule performance are declining");
    }

    // Executive recommendations
    const executiveRecommendations: string[] = [];
    if (overall === "critical") {
      executiveRecommendations.push("Immediate executive intervention required");
      executiveRecommendations.push("Consider project restructuring or scope reduction");
    } else if (overall === "at-risk") {
      executiveRecommendations.push("Increase oversight and monitoring frequency");
      executiveRecommendations.push("Develop recovery plan with specific milestones");
    } else {
      executiveRecommendations.push("Maintain current trajectory and controls");
      executiveRecommendations.push("Document best practices for replication");
    }

    // Action items
    const actionItems: Array<{
      action: string;
      owner: string;
      dueDate: Date;
      priority: "low" | "medium" | "high" | "critical";
    }> = [];

    if (criticalIssues.length > 0) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // 1 week
      actionItems.push({
        action: "Address critical issues identified in report",
        owner: "Program Manager",
        dueDate,
        priority: "critical",
      });
    }

    // Executive overview
    let executiveOverview = `EXECUTIVE SUMMARY - ${programId}\n\n`;
    executiveOverview += `PROJECT STATUS: ${overall.toUpperCase()}\n`;
    executiveOverview += `Health Score: ${healthIndex.score}/100 (${healthIndex.status})\n\n`;
    executiveOverview += `Performance at a Glance:\n`;
    executiveOverview += `- Progress: ${percentComplete.toFixed(1)}% complete\n`;
    executiveOverview += `- Cost: ${cost.toUpperCase()} (CPI: ${metrics.cpi.toFixed(2)})\n`;
    executiveOverview += `- Schedule: ${schedule.toUpperCase()} (SPI: ${metrics.spi.toFixed(2)})\n`;
    executiveOverview += `- Budget Forecast: $${metrics.eac.toLocaleString()} (${metrics.vac >= 0 ? "Under" : "Over"} by $${Math.abs(metrics.vac).toLocaleString()})\n\n`;

    if (criticalIssues.length > 0) {
      executiveOverview += `CRITICAL ISSUES: ${criticalIssues.length}\n`;
      executiveOverview += `${criticalIssues.map((i) => `- ${i.issue}`).join("\n")}\n\n`;
    }

    if (executiveRecommendations.length > 0) {
      executiveOverview += `Executive Recommendations:\n${executiveRecommendations.map((r) => `- ${r}`).join("\n")}`;
    }

    return {
      programId,
      reportDate: new Date(),
      executiveOverview,
      keyMetrics,
      status: { overall, cost, schedule },
      criticalIssues,
      achievements,
      upcomingRisks,
      executiveRecommendations,
      actionItems,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate EVM executive summary: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
