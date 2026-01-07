/**
 * Performance Scoring
 *
 * Calculates weighted performance scores and identifies performance trends
 * Updates vendor ratings based on performance metrics
 */

import type { sheets_v4 } from "googleapis";
import type { PerformanceMetric, MetricType } from "./tracking.js";
import {
  getVendorMetrics,
  calculateOnTimeDeliveryRate,
  calculateQualityAverage,
  calculateCostVariance,
} from "./tracking.js";
import { readVendor, updateVendor } from "../vendors/vendors.js";

/**
 * Performance score weights
 */
export const SCORE_WEIGHTS = {
  delivery: 0.4, // 40%
  quality: 0.4, // 40%
  cost: 0.2, // 20%
};

/**
 * Performance score breakdown
 */
export interface PerformanceScore {
  vendorId: string;
  overallScore: number; // 0-100
  deliveryScore: number; // 0-100
  qualityScore: number; // 0-100
  costScore: number; // 0-100
  periodMonths: number;
  calculatedDate: Date;
  breakdown: {
    delivery: {
      weight: number;
      score: number;
      weightedScore: number;
      onTimeRate: number;
      totalDeliveries: number;
    };
    quality: {
      weight: number;
      score: number;
      weightedScore: number;
      averageScore: number;
      totalReviews: number;
    };
    cost: {
      weight: number;
      score: number;
      weightedScore: number;
      averageVariance: number;
      totalMetrics: number;
    };
  };
}

/**
 * Performance trend
 */
export type TrendDirection = "improving" | "stable" | "declining";

/**
 * Performance history
 */
export interface PerformanceHistory {
  vendorId: string;
  dataPoints: Array<{
    period: string;
    score: number;
    date: Date;
  }>;
  currentScore: number;
  previousScore: number;
  trend: TrendDirection;
}

/**
 * Calculate performance score for a vendor
 */
export async function calculatePerformanceScore(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId: string,
  periodMonths: number = 12
): Promise<PerformanceScore> {
  try {
    // Get delivery metrics
    const deliveryData = await calculateOnTimeDeliveryRate(
      sheets,
      spreadsheetId,
      vendorId,
      periodMonths
    );

    // Get quality metrics
    const qualityData = await calculateQualityAverage(
      sheets,
      spreadsheetId,
      vendorId,
      periodMonths
    );

    // Get cost metrics
    const costData = await calculateCostVariance(
      sheets,
      spreadsheetId,
      vendorId,
      periodMonths
    );

    // Calculate delivery score (0-100)
    // 100% on-time = 100 score, 0% on-time = 0 score
    const deliveryScore = deliveryData.rate;

    // Calculate quality score (0-100)
    // Already on 0-100 scale from quality average
    const qualityScore = qualityData.average;

    // Calculate cost score (0-100)
    // 0% variance = 100 score
    // Positive variance (over budget) reduces score more than negative (under budget)
    let costScore = 100;
    if (costData.averageVariance > 0) {
      // Over budget: reduce by 2 points per 1% over
      costScore = Math.max(0, 100 - costData.averageVariance * 2);
    } else if (costData.averageVariance < 0) {
      // Under budget: reduce by 1 point per 1% under (less penalty)
      costScore = Math.max(0, 100 + costData.averageVariance);
    }

    // Calculate weighted scores
    const weightedDelivery = deliveryScore * SCORE_WEIGHTS.delivery;
    const weightedQuality = qualityScore * SCORE_WEIGHTS.quality;
    const weightedCost = costScore * SCORE_WEIGHTS.cost;

    // Calculate overall score
    const overallScore = weightedDelivery + weightedQuality + weightedCost;

    return {
      vendorId,
      overallScore: Math.round(overallScore * 100) / 100, // Round to 2 decimals
      deliveryScore: Math.round(deliveryScore * 100) / 100,
      qualityScore: Math.round(qualityScore * 100) / 100,
      costScore: Math.round(costScore * 100) / 100,
      periodMonths,
      calculatedDate: new Date(),
      breakdown: {
        delivery: {
          weight: SCORE_WEIGHTS.delivery,
          score: deliveryScore,
          weightedScore: weightedDelivery,
          onTimeRate: deliveryData.rate,
          totalDeliveries: deliveryData.totalCount,
        },
        quality: {
          weight: SCORE_WEIGHTS.quality,
          score: qualityScore,
          weightedScore: weightedQuality,
          averageScore: qualityData.average,
          totalReviews: qualityData.count,
        },
        cost: {
          weight: SCORE_WEIGHTS.cost,
          score: costScore,
          weightedScore: weightedCost,
          averageVariance: costData.averageVariance,
          totalMetrics: costData.count,
        },
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to calculate performance score: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update vendor rating based on performance score
 */
export async function updateVendorRating(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId: string,
  periodMonths: number = 12
): Promise<{
  vendorId: string;
  previousRating?: number;
  newRating: number;
  updated: boolean;
}> {
  try {
    // Calculate current performance score
    const score = await calculatePerformanceScore(
      sheets,
      spreadsheetId,
      vendorId,
      periodMonths
    );

    // Get current vendor
    const vendor = await readVendor(sheets, spreadsheetId, vendorId);
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    const previousRating = vendor.performanceRating;
    const newRating = score.overallScore;

    // Update vendor rating
    await updateVendor(
      sheets,
      spreadsheetId,
      {
        vendorId,
        performanceRating: newRating,
      },
      "system"
    );

    return {
      vendorId,
      previousRating,
      newRating,
      updated: true,
    };
  } catch (error) {
    throw new Error(
      `Failed to update vendor rating: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get performance history over time
 */
export async function getPerformanceHistory(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId: string,
  historyMonths: number = 12
): Promise<PerformanceHistory> {
  try {
    const dataPoints: Array<{
      period: string;
      score: number;
      date: Date;
    }> = [];

    // Calculate scores for each month going back
    const now = new Date();
    for (let i = 0; i < historyMonths; i++) {
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() - i);

      const periodStart = new Date(periodEnd);
      periodStart.setMonth(periodStart.getMonth() - 3); // 3-month rolling average

      // Get metrics for this period
      const metrics = await getVendorMetrics(sheets, spreadsheetId, vendorId, {
        startDate: periodStart,
        endDate: periodEnd,
      });

      if (metrics.length === 0) {
        continue; // Skip periods with no data
      }

      // Calculate score for this period
      const score = await calculatePerformanceScore(
        sheets,
        spreadsheetId,
        vendorId,
        3 // 3-month window
      );

      const period = `${periodEnd.getFullYear()}-${String(periodEnd.getMonth() + 1).padStart(2, "0")}`;

      dataPoints.push({
        period,
        score: score.overallScore,
        date: periodEnd,
      });
    }

    // Sort by date (oldest first)
    dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());

    const currentScore = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].score : 0;
    const previousScore = dataPoints.length > 1 ? dataPoints[dataPoints.length - 2].score : 0;

    // Determine trend
    const trend = identifyTrend(dataPoints);

    return {
      vendorId,
      dataPoints,
      currentScore,
      previousScore,
      trend,
    };
  } catch (error) {
    throw new Error(
      `Failed to get performance history: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Identify performance trends
 */
export async function identifyTrends(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId: string,
  periodMonths: number = 3
): Promise<{
  trend: TrendDirection;
  trendStrength: number; // 0-100, how strong the trend is
  recentScores: number[];
  averageChange: number;
}> {
  try {
    const history = await getPerformanceHistory(
      sheets,
      spreadsheetId,
      vendorId,
      periodMonths
    );

    if (history.dataPoints.length < 2) {
      return {
        trend: "stable",
        trendStrength: 0,
        recentScores: history.dataPoints.map((d) => d.score),
        averageChange: 0,
      };
    }

    const trend = identifyTrend(history.dataPoints);
    const recentScores = history.dataPoints.map((d) => d.score);

    // Calculate average change between consecutive periods
    const changes: number[] = [];
    for (let i = 1; i < recentScores.length; i++) {
      changes.push(recentScores[i] - recentScores[i - 1]);
    }

    const averageChange =
      changes.length > 0
        ? changes.reduce((sum, c) => sum + c, 0) / changes.length
        : 0;

    // Calculate trend strength (0-100)
    const trendStrength = Math.min(100, Math.abs(averageChange) * 10);

    return {
      trend,
      trendStrength: Math.round(trendStrength * 100) / 100,
      recentScores,
      averageChange: Math.round(averageChange * 100) / 100,
    };
  } catch (error) {
    throw new Error(
      `Failed to identify trends: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Internal helper to identify trend from data points
 */
function identifyTrend(
  dataPoints: Array<{ period: string; score: number; date: Date }>
): TrendDirection {
  if (dataPoints.length < 2) {
    return "stable";
  }

  // Take last 3 data points
  const recentPoints = dataPoints.slice(-3);

  if (recentPoints.length < 2) {
    return "stable";
  }

  // Calculate trend using linear regression
  const n = recentPoints.length;
  const sumX = recentPoints.reduce((sum, _, i) => sum + i, 0);
  const sumY = recentPoints.reduce((sum, p) => sum + p.score, 0);
  const sumXY = recentPoints.reduce((sum, p, i) => sum + i * p.score, 0);
  const sumXX = recentPoints.reduce((sum, _, i) => sum + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  // Threshold for trend detection
  const TREND_THRESHOLD = 2; // Points per period

  if (slope > TREND_THRESHOLD) {
    return "improving";
  } else if (slope < -TREND_THRESHOLD) {
    return "declining";
  } else {
    return "stable";
  }
}

/**
 * Get vendors by performance category
 */
export async function getVendorsByPerformance(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorIds: string[]
): Promise<{
  excellent: string[]; // 90+
  good: string[]; // 75-89
  satisfactory: string[]; // 60-74
  needsImprovement: string[]; // <60
}> {
  try {
    const excellent: string[] = [];
    const good: string[] = [];
    const satisfactory: string[] = [];
    const needsImprovement: string[] = [];

    for (const vendorId of vendorIds) {
      try {
        const score = await calculatePerformanceScore(
          sheets,
          spreadsheetId,
          vendorId
        );

        if (score.overallScore >= 90) {
          excellent.push(vendorId);
        } else if (score.overallScore >= 75) {
          good.push(vendorId);
        } else if (score.overallScore >= 60) {
          satisfactory.push(vendorId);
        } else {
          needsImprovement.push(vendorId);
        }
      } catch (error) {
        // Skip vendors with no metrics
        continue;
      }
    }

    return {
      excellent,
      good,
      satisfactory,
      needsImprovement,
    };
  } catch (error) {
    throw new Error(
      `Failed to get vendors by performance: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
