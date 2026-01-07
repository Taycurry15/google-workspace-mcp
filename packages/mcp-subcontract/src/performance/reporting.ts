/**
 * Vendor Performance Reporting
 *
 * Generates comprehensive vendor scorecards, performance comparisons,
 * and top/underperformer reports
 */

import type { sheets_v4 } from "googleapis";
import type { PerformanceScore, TrendDirection } from "./scoring.js";
import {
  calculatePerformanceScore,
  getPerformanceHistory,
  identifyTrends,
} from "./scoring.js";
import { readVendor, listVendors } from "../vendors/vendors.js";
import { listContracts } from "../contracts/contracts.js";

/**
 * Vendor scorecard
 */
export interface VendorScorecard {
  vendorId: string;
  vendorName: string;
  category: string;
  generatedDate: Date;
  periodMonths: number;

  // Overall performance
  overallScore: number;
  performanceCategory: "Excellent" | "Good" | "Satisfactory" | "Needs Improvement";
  trend: TrendDirection;

  // Score breakdown
  deliveryScore: number;
  qualityScore: number;
  costScore: number;

  // Detailed metrics
  delivery: {
    onTimeRate: number;
    totalDeliveries: number;
    lateDeliveries: number;
  };

  quality: {
    averageScore: number;
    totalReviews: number;
    minScore: number;
    maxScore: number;
  };

  cost: {
    averageVariance: number;
    overBudgetCount: number;
    underBudgetCount: number;
    onBudgetCount: number;
  };

  // Contract summary
  contracts: {
    total: number;
    active: number;
    totalValue: number;
  };

  // Recommendations
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

/**
 * Performance comparison
 */
export interface PerformanceComparison {
  category: string;
  generatedDate: Date;
  vendors: Array<{
    vendorId: string;
    vendorName: string;
    overallScore: number;
    rank: number;
    deliveryScore: number;
    qualityScore: number;
    costScore: number;
  }>;
  categoryAverage: number;
  topPerformer: string;
  bottomPerformer: string;
}

/**
 * Top performers report
 */
export interface TopPerformersReport {
  generatedDate: Date;
  periodMonths: number;
  minScore: number;
  topPerformers: Array<{
    rank: number;
    vendorId: string;
    vendorName: string;
    category: string;
    overallScore: number;
    trend: TrendDirection;
    activeContracts: number;
    totalContractValue: number;
  }>;
}

/**
 * Underperformers report
 */
export interface UnderperformersReport {
  generatedDate: Date;
  periodMonths: number;
  maxScore: number;
  underperformers: Array<{
    vendorId: string;
    vendorName: string;
    category: string;
    overallScore: number;
    trend: TrendDirection;
    primaryIssues: string[];
    activeContracts: number;
    recommendedActions: string[];
  }>;
}

/**
 * Generate comprehensive vendor scorecard
 */
export async function generateVendorScorecard(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId: string,
  periodMonths: number = 12
): Promise<VendorScorecard> {
  try {
    // Get vendor details
    const vendor = await readVendor(sheets, spreadsheetId, vendorId);
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Calculate performance score
    const score = await calculatePerformanceScore(
      sheets,
      spreadsheetId,
      vendorId,
      periodMonths
    );

    // Get performance trend
    const trendData = await identifyTrends(
      sheets,
      spreadsheetId,
      vendorId,
      3
    );

    // Get contracts
    const contracts = await listContracts(sheets, spreadsheetId, {
      vendorId,
    });

    const activeContracts = contracts.filter((c) => c.status === "active");
    const totalContractValue = contracts.reduce(
      (sum, c) => sum + c.totalValue,
      0
    );

    // Determine performance category
    let performanceCategory: "Excellent" | "Good" | "Satisfactory" | "Needs Improvement";
    if (score.overallScore >= 90) {
      performanceCategory = "Excellent";
    } else if (score.overallScore >= 75) {
      performanceCategory = "Good";
    } else if (score.overallScore >= 60) {
      performanceCategory = "Satisfactory";
    } else {
      performanceCategory = "Needs Improvement";
    }

    // Generate strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (score.deliveryScore >= 90) {
      strengths.push(
        `Excellent on-time delivery (${score.breakdown.delivery.onTimeRate.toFixed(1)}%)`
      );
    } else if (score.deliveryScore < 70) {
      weaknesses.push(
        `Poor on-time delivery (${score.breakdown.delivery.onTimeRate.toFixed(1)}%)`
      );
    }

    if (score.qualityScore >= 85) {
      strengths.push(
        `High quality deliverables (avg ${score.breakdown.quality.averageScore.toFixed(1)}/100)`
      );
    } else if (score.qualityScore < 70) {
      weaknesses.push(
        `Quality concerns (avg ${score.breakdown.quality.averageScore.toFixed(1)}/100)`
      );
    }

    if (score.costScore >= 90) {
      strengths.push(
        `Excellent cost control (avg variance ${score.breakdown.cost.averageVariance.toFixed(1)}%)`
      );
    } else if (score.costScore < 70) {
      weaknesses.push(
        `Cost overruns (avg variance ${score.breakdown.cost.averageVariance.toFixed(1)}%)`
      );
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (score.overallScore >= 90) {
      recommendations.push("Maintain current performance standards");
      recommendations.push("Consider for preferred vendor status");
      recommendations.push("Potential candidate for additional contracts");
    } else if (score.overallScore >= 75) {
      recommendations.push("Continue current partnership");
      if (score.deliveryScore < 80) {
        recommendations.push("Focus on improving delivery timeliness");
      }
      if (score.qualityScore < 80) {
        recommendations.push("Provide quality improvement feedback");
      }
    } else if (score.overallScore >= 60) {
      recommendations.push("Schedule performance review meeting");
      recommendations.push("Develop performance improvement plan");
      if (weaknesses.length > 0) {
        recommendations.push(`Address: ${weaknesses[0]}`);
      }
    } else {
      recommendations.push("URGENT: Schedule immediate performance review");
      recommendations.push("Consider contract review or termination");
      recommendations.push("Do not award new contracts until improvement shown");
    }

    if (trendData.trend === "declining") {
      recommendations.push("Address declining performance trend immediately");
    }

    return {
      vendorId,
      vendorName: vendor.name,
      category: vendor.category,
      generatedDate: new Date(),
      periodMonths,
      overallScore: score.overallScore,
      performanceCategory,
      trend: trendData.trend,
      deliveryScore: score.deliveryScore,
      qualityScore: score.qualityScore,
      costScore: score.costScore,
      delivery: {
        onTimeRate: score.breakdown.delivery.onTimeRate,
        totalDeliveries: score.breakdown.delivery.totalDeliveries,
        lateDeliveries:
          score.breakdown.delivery.totalDeliveries -
          Math.round(
            (score.breakdown.delivery.onTimeRate / 100) *
              score.breakdown.delivery.totalDeliveries
          ),
      },
      quality: {
        averageScore: score.breakdown.quality.averageScore,
        totalReviews: score.breakdown.quality.totalReviews,
        minScore: 0, // Would need to track min/max separately
        maxScore: 100,
      },
      cost: {
        averageVariance: score.breakdown.cost.averageVariance,
        overBudgetCount: score.breakdown.cost.totalMetrics, // Simplified
        underBudgetCount: 0,
        onBudgetCount: 0,
      },
      contracts: {
        total: contracts.length,
        active: activeContracts.length,
        totalValue: totalContractValue,
      },
      strengths,
      weaknesses,
      recommendations,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate vendor scorecard: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate performance comparison for vendors in a category
 */
export async function generatePerformanceComparison(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  category: string,
  periodMonths: number = 12
): Promise<PerformanceComparison> {
  try {
    // Get all vendors in category
    const vendors = await listVendors(sheets, spreadsheetId, {
      category: category as any,
    });

    const vendorScores: Array<{
      vendorId: string;
      vendorName: string;
      overallScore: number;
      rank: number;
      deliveryScore: number;
      qualityScore: number;
      costScore: number;
    }> = [];

    // Calculate scores for each vendor
    for (const vendor of vendors) {
      try {
        const score = await calculatePerformanceScore(
          sheets,
          spreadsheetId,
          vendor.vendorId,
          periodMonths
        );

        vendorScores.push({
          vendorId: vendor.vendorId,
          vendorName: vendor.name,
          overallScore: score.overallScore,
          rank: 0, // Will be set after sorting
          deliveryScore: score.deliveryScore,
          qualityScore: score.qualityScore,
          costScore: score.costScore,
        });
      } catch (error) {
        // Skip vendors with no metrics
        continue;
      }
    }

    // Sort by overall score (descending)
    vendorScores.sort((a, b) => b.overallScore - a.overallScore);

    // Assign ranks
    vendorScores.forEach((v, i) => {
      v.rank = i + 1;
    });

    // Calculate category average
    const categoryAverage =
      vendorScores.length > 0
        ? vendorScores.reduce((sum, v) => sum + v.overallScore, 0) /
          vendorScores.length
        : 0;

    const topPerformer =
      vendorScores.length > 0 ? vendorScores[0].vendorName : "N/A";
    const bottomPerformer =
      vendorScores.length > 0
        ? vendorScores[vendorScores.length - 1].vendorName
        : "N/A";

    return {
      category,
      generatedDate: new Date(),
      vendors: vendorScores,
      categoryAverage: Math.round(categoryAverage * 100) / 100,
      topPerformer,
      bottomPerformer,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate performance comparison: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate top performers report
 */
export async function generateTopPerformersReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  limit: number = 10,
  minScore: number = 80,
  periodMonths: number = 12
): Promise<TopPerformersReport> {
  try {
    // Get all active vendors
    const vendors = await listVendors(sheets, spreadsheetId, {
      status: "active",
    });

    const topPerformers: Array<{
      rank: number;
      vendorId: string;
      vendorName: string;
      category: string;
      overallScore: number;
      trend: TrendDirection;
      activeContracts: number;
      totalContractValue: number;
    }> = [];

    // Calculate scores for each vendor
    for (const vendor of vendors) {
      try {
        const score = await calculatePerformanceScore(
          sheets,
          spreadsheetId,
          vendor.vendorId,
          periodMonths
        );

        if (score.overallScore >= minScore) {
          const trendData = await identifyTrends(
            sheets,
            spreadsheetId,
            vendor.vendorId,
            3
          );

          topPerformers.push({
            rank: 0, // Will be set after sorting
            vendorId: vendor.vendorId,
            vendorName: vendor.name,
            category: vendor.category,
            overallScore: score.overallScore,
            trend: trendData.trend,
            activeContracts: vendor.activeContracts,
            totalContractValue: vendor.totalContractValue,
          });
        }
      } catch (error) {
        // Skip vendors with no metrics
        continue;
      }
    }

    // Sort by overall score (descending)
    topPerformers.sort((a, b) => b.overallScore - a.overallScore);

    // Limit to top N and assign ranks
    const limitedPerformers = topPerformers.slice(0, limit);
    limitedPerformers.forEach((v, i) => {
      v.rank = i + 1;
    });

    return {
      generatedDate: new Date(),
      periodMonths,
      minScore,
      topPerformers: limitedPerformers,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate top performers report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate underperformers report
 */
export async function generateUnderperformersReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  maxScore: number = 60,
  periodMonths: number = 12
): Promise<UnderperformersReport> {
  try {
    // Get all active vendors
    const vendors = await listVendors(sheets, spreadsheetId, {
      status: "active",
    });

    const underperformers: Array<{
      vendorId: string;
      vendorName: string;
      category: string;
      overallScore: number;
      trend: TrendDirection;
      primaryIssues: string[];
      activeContracts: number;
      recommendedActions: string[];
    }> = [];

    // Calculate scores for each vendor
    for (const vendor of vendors) {
      try {
        const score = await calculatePerformanceScore(
          sheets,
          spreadsheetId,
          vendor.vendorId,
          periodMonths
        );

        if (score.overallScore <= maxScore) {
          const trendData = await identifyTrends(
            sheets,
            spreadsheetId,
            vendor.vendorId,
            3
          );

          // Identify primary issues
          const primaryIssues: string[] = [];
          if (score.deliveryScore < 70) {
            primaryIssues.push(
              `Poor on-time delivery (${score.deliveryScore.toFixed(1)}%)`
            );
          }
          if (score.qualityScore < 70) {
            primaryIssues.push(
              `Quality issues (${score.qualityScore.toFixed(1)}/100)`
            );
          }
          if (score.costScore < 70) {
            primaryIssues.push(
              `Cost overruns (score: ${score.costScore.toFixed(1)})`
            );
          }

          // Recommended actions
          const recommendedActions: string[] = [];
          if (score.overallScore < 50) {
            recommendedActions.push("URGENT: Immediate performance review required");
            recommendedActions.push("Consider contract termination");
            recommendedActions.push("Suspend new contract awards");
          } else {
            recommendedActions.push("Schedule performance review meeting");
            recommendedActions.push("Develop 90-day improvement plan");
            recommendedActions.push("Increase monitoring frequency");
          }

          if (trendData.trend === "declining") {
            recommendedActions.push("Address declining trend immediately");
          } else if (trendData.trend === "improving") {
            recommendedActions.push("Monitor improvement trend closely");
          }

          underperformers.push({
            vendorId: vendor.vendorId,
            vendorName: vendor.name,
            category: vendor.category,
            overallScore: score.overallScore,
            trend: trendData.trend,
            primaryIssues,
            activeContracts: vendor.activeContracts,
            recommendedActions,
          });
        }
      } catch (error) {
        // Skip vendors with no metrics
        continue;
      }
    }

    // Sort by overall score (ascending - worst first)
    underperformers.sort((a, b) => a.overallScore - b.overallScore);

    return {
      generatedDate: new Date(),
      periodMonths,
      maxScore,
      underperformers,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate underperformers report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Export scorecard as formatted text
 */
export function exportScorecardAsText(scorecard: VendorScorecard): string {
  const lines: string[] = [];

  lines.push("=".repeat(80));
  lines.push("VENDOR PERFORMANCE SCORECARD");
  lines.push("=".repeat(80));
  lines.push("");

  lines.push(`Vendor: ${scorecard.vendorName}`);
  lines.push(`Vendor ID: ${scorecard.vendorId}`);
  lines.push(`Category: ${scorecard.category}`);
  lines.push(`Generated: ${scorecard.generatedDate.toISOString().split("T")[0]}`);
  lines.push(`Period: Last ${scorecard.periodMonths} months`);
  lines.push("");

  lines.push("-".repeat(80));
  lines.push("OVERALL PERFORMANCE");
  lines.push("-".repeat(80));
  lines.push(`Score: ${scorecard.overallScore.toFixed(1)}/100`);
  lines.push(`Rating: ${scorecard.performanceCategory}`);
  lines.push(`Trend: ${scorecard.trend.toUpperCase()}`);
  lines.push("");

  lines.push("-".repeat(80));
  lines.push("SCORE BREAKDOWN");
  lines.push("-".repeat(80));
  lines.push(`Delivery Score:  ${scorecard.deliveryScore.toFixed(1)}/100  (40% weight)`);
  lines.push(`Quality Score:   ${scorecard.qualityScore.toFixed(1)}/100  (40% weight)`);
  lines.push(`Cost Score:      ${scorecard.costScore.toFixed(1)}/100  (20% weight)`);
  lines.push("");

  lines.push("-".repeat(80));
  lines.push("DETAILED METRICS");
  lines.push("-".repeat(80));
  lines.push("Delivery:");
  lines.push(`  On-time Rate: ${scorecard.delivery.onTimeRate.toFixed(1)}%`);
  lines.push(`  Total Deliveries: ${scorecard.delivery.totalDeliveries}`);
  lines.push(`  Late Deliveries: ${scorecard.delivery.lateDeliveries}`);
  lines.push("");
  lines.push("Quality:");
  lines.push(`  Average Score: ${scorecard.quality.averageScore.toFixed(1)}/100`);
  lines.push(`  Total Reviews: ${scorecard.quality.totalReviews}`);
  lines.push("");
  lines.push("Cost:");
  lines.push(`  Average Variance: ${scorecard.cost.averageVariance.toFixed(2)}%`);
  lines.push(`  Over Budget: ${scorecard.cost.overBudgetCount}`);
  lines.push(`  Under Budget: ${scorecard.cost.underBudgetCount}`);
  lines.push(`  On Budget: ${scorecard.cost.onBudgetCount}`);
  lines.push("");

  lines.push("-".repeat(80));
  lines.push("CONTRACT SUMMARY");
  lines.push("-".repeat(80));
  lines.push(`Total Contracts: ${scorecard.contracts.total}`);
  lines.push(`Active Contracts: ${scorecard.contracts.active}`);
  lines.push(`Total Contract Value: $${scorecard.contracts.totalValue.toLocaleString()}`);
  lines.push("");

  if (scorecard.strengths.length > 0) {
    lines.push("-".repeat(80));
    lines.push("STRENGTHS");
    lines.push("-".repeat(80));
    scorecard.strengths.forEach((s) => {
      lines.push(`  - ${s}`);
    });
    lines.push("");
  }

  if (scorecard.weaknesses.length > 0) {
    lines.push("-".repeat(80));
    lines.push("WEAKNESSES");
    lines.push("-".repeat(80));
    scorecard.weaknesses.forEach((w) => {
      lines.push(`  - ${w}`);
    });
    lines.push("");
  }

  if (scorecard.recommendations.length > 0) {
    lines.push("-".repeat(80));
    lines.push("RECOMMENDATIONS");
    lines.push("-".repeat(80));
    scorecard.recommendations.forEach((r) => {
      lines.push(`  - ${r}`);
    });
    lines.push("");
  }

  lines.push("=".repeat(80));

  return lines.join("\n");
}
