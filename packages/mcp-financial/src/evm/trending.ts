/**
 * EVM Trending and Analysis Module
 *
 * Provides statistical analysis of historical EVM snapshots to identify trends,
 * patterns, and anomalies in program performance over time.
 *
 * Uses statistical methods including:
 * - Linear regression for trend detection
 * - Moving averages for smoothing
 * - Standard deviation for variance analysis
 * - Z-score based anomaly detection
 *
 * Functions return visualization-ready data with actionable insights.
 */

import type { sheets_v4 } from "googleapis";
import type { EVMSnapshot } from "../types/financial.js";
import { getSnapshotHistory } from "./snapshots.js";

/**
 * Data point for regression analysis
 */
export interface DataPoint {
  x: number;
  y: number;
}

/**
 * Linear regression result
 */
export interface LinearRegression {
  slope: number;          // Trend direction (positive = improving, negative = declining)
  intercept: number;      // Y-axis intercept
  r2: number;            // Correlation coefficient (0-1, higher = better fit)
}

/**
 * Trend direction enumeration
 */
export type TrendDirection = "improving" | "stable" | "declining";

/**
 * Performance index trend analysis
 */
export interface IndexTrendAnalysis {
  trend: TrendDirection;
  slope: number;
  r2: number;
  currentValue: number;
  averageValue: number;
  volatility: number;      // Standard deviation
}

/**
 * CPI trend analysis result
 */
export interface CPITrendAnalysis extends IndexTrendAnalysis {
  currentCPI: number;
  averageCPI: number;
}

/**
 * SPI trend analysis result
 */
export interface SPITrendAnalysis extends IndexTrendAnalysis {
  currentSPI: number;
  averageSPI: number;
}

/**
 * Anomaly detection result
 */
export interface Anomaly {
  snapshotId: string;
  date: Date;
  value: number;
  zScore: number;
  deviation: "high" | "low";
}

/**
 * Risk level assessment
 */
export type RiskLevel = "low" | "medium" | "high";

/**
 * Comprehensive performance trend analysis
 */
export interface PerformanceTrendAnalysis {
  overallTrend: TrendDirection;
  cpiAnalysis: CPITrendAnalysis;
  spiAnalysis: SPITrendAnalysis;
  healthTrend: {
    slope: number;
    forecast3Months: number;
  };
  riskLevel: RiskLevel;
  recommendations: string[];
}

/**
 * Baseline comparison result
 */
export interface BaselineComparison {
  costVariance: number;
  scheduleVariance: number;
  cpiChange: number;
  spiChange: number;
  daysVariance: number;
  summary: string;
}

/**
 * Calculate linear regression using least squares method
 *
 * This function fits a straight line y = mx + b to a set of data points
 * where m is the slope and b is the y-intercept.
 *
 * The coefficient of determination (r²) measures how well the line fits
 * the data, ranging from 0 (no correlation) to 1 (perfect correlation).
 *
 * @param dataPoints - Array of {x, y} coordinate pairs
 * @returns Regression parameters: slope, intercept, and r²
 *
 * @example
 * const points = [{x: 1, y: 2}, {x: 2, y: 4}, {x: 3, y: 6}];
 * const regression = calculateLinearRegression(points);
 * // regression.slope ≈ 2.0 (perfect linear trend)
 * // regression.r2 ≈ 1.0 (perfect fit)
 */
export function calculateLinearRegression(
  dataPoints: DataPoint[]
): LinearRegression {
  const n = dataPoints.length;

  if (n === 0) {
    return { slope: 0, intercept: 0, r2: 0 };
  }

  if (n === 1) {
    return { slope: 0, intercept: dataPoints[0].y, r2: 0 };
  }

  // Calculate means
  const meanX = dataPoints.reduce((sum, p) => sum + p.x, 0) / n;
  const meanY = dataPoints.reduce((sum, p) => sum + p.y, 0) / n;

  // Calculate slope (m) and intercept (b)
  // m = Σ[(xi - x̄)(yi - ȳ)] / Σ[(xi - x̄)²]
  let numerator = 0;
  let denominator = 0;

  for (const point of dataPoints) {
    const dx = point.x - meanX;
    const dy = point.y - meanY;
    numerator += dx * dy;
    denominator += dx * dx;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;

  // Calculate r² (coefficient of determination)
  // r² = 1 - (SSres / SStot)
  // SSres = Σ(yi - ŷi)² (residual sum of squares)
  // SStot = Σ(yi - ȳ)² (total sum of squares)
  let ssRes = 0;
  let ssTot = 0;

  for (const point of dataPoints) {
    const yPred = slope * point.x + intercept;
    const residual = point.y - yPred;
    const deviation = point.y - meanY;

    ssRes += residual * residual;
    ssTot += deviation * deviation;
  }

  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return {
    slope: Math.round(slope * 10000) / 10000,
    intercept: Math.round(intercept * 10000) / 10000,
    r2: Math.round(Math.max(0, Math.min(1, r2)) * 10000) / 10000,
  };
}

/**
 * Analyze CPI (Cost Performance Index) trend over time
 *
 * Examines historical CPI values to determine if cost performance is
 * improving, stable, or declining. Uses linear regression to detect trends
 * and standard deviation to measure volatility.
 *
 * Trend Classification:
 * - Improving: slope > 0.01 (CPI increasing, better cost performance)
 * - Declining: slope < -0.01 (CPI decreasing, worse cost performance)
 * - Stable: -0.01 ≤ slope ≤ 0.01 (minimal change)
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID containing snapshots
 * @param programId - Program identifier
 * @param periodMonths - Number of months to analyze (default 12)
 * @returns CPI trend analysis with statistics and classification
 */
export async function analyzeCPITrend(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  periodMonths: number = 12
): Promise<CPITrendAnalysis> {
  try {
    // Get historical snapshots
    const snapshots = await getSnapshotHistory(
      sheets,
      spreadsheetId,
      programId,
      periodMonths
    );

    if (snapshots.length === 0) {
      return {
        trend: "stable",
        slope: 0,
        r2: 0,
        currentCPI: 0,
        averageCPI: 0,
        currentValue: 0,
        averageValue: 0,
        volatility: 0,
      };
    }

    // Extract CPI values and create data points
    const dataPoints: DataPoint[] = snapshots.map((snapshot, index) => ({
      x: index,
      y: snapshot.cpi,
    }));

    // Calculate linear regression
    const regression = calculateLinearRegression(dataPoints);

    // Calculate current and average CPI
    const currentCPI = snapshots[snapshots.length - 1].cpi;
    const averageCPI =
      snapshots.reduce((sum, s) => sum + s.cpi, 0) / snapshots.length;

    // Calculate volatility (standard deviation)
    const variance =
      snapshots.reduce((sum, s) => sum + Math.pow(s.cpi - averageCPI, 2), 0) /
      snapshots.length;
    const volatility = Math.sqrt(variance);

    // Determine trend direction
    let trend: TrendDirection = "stable";
    if (regression.slope > 0.01) {
      trend = "improving";
    } else if (regression.slope < -0.01) {
      trend = "declining";
    }

    return {
      trend,
      slope: regression.slope,
      r2: regression.r2,
      currentCPI: Math.round(currentCPI * 10000) / 10000,
      averageCPI: Math.round(averageCPI * 10000) / 10000,
      currentValue: Math.round(currentCPI * 10000) / 10000,
      averageValue: Math.round(averageCPI * 10000) / 10000,
      volatility: Math.round(volatility * 10000) / 10000,
    };
  } catch (error) {
    throw new Error(
      `Failed to analyze CPI trend: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Analyze SPI (Schedule Performance Index) trend over time
 *
 * Examines historical SPI values to determine if schedule performance is
 * improving, stable, or declining. Uses linear regression to detect trends
 * and standard deviation to measure volatility.
 *
 * Trend Classification:
 * - Improving: slope > 0.01 (SPI increasing, better schedule performance)
 * - Declining: slope < -0.01 (SPI decreasing, worse schedule performance)
 * - Stable: -0.01 ≤ slope ≤ 0.01 (minimal change)
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID containing snapshots
 * @param programId - Program identifier
 * @param periodMonths - Number of months to analyze (default 12)
 * @returns SPI trend analysis with statistics and classification
 */
export async function analyzeSPITrend(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  periodMonths: number = 12
): Promise<SPITrendAnalysis> {
  try {
    // Get historical snapshots
    const snapshots = await getSnapshotHistory(
      sheets,
      spreadsheetId,
      programId,
      periodMonths
    );

    if (snapshots.length === 0) {
      return {
        trend: "stable",
        slope: 0,
        r2: 0,
        currentSPI: 0,
        averageSPI: 0,
        currentValue: 0,
        averageValue: 0,
        volatility: 0,
      };
    }

    // Extract SPI values and create data points
    const dataPoints: DataPoint[] = snapshots.map((snapshot, index) => ({
      x: index,
      y: snapshot.spi,
    }));

    // Calculate linear regression
    const regression = calculateLinearRegression(dataPoints);

    // Calculate current and average SPI
    const currentSPI = snapshots[snapshots.length - 1].spi;
    const averageSPI =
      snapshots.reduce((sum, s) => sum + s.spi, 0) / snapshots.length;

    // Calculate volatility (standard deviation)
    const variance =
      snapshots.reduce((sum, s) => sum + Math.pow(s.spi - averageSPI, 2), 0) /
      snapshots.length;
    const volatility = Math.sqrt(variance);

    // Determine trend direction
    let trend: TrendDirection = "stable";
    if (regression.slope > 0.01) {
      trend = "improving";
    } else if (regression.slope < -0.01) {
      trend = "declining";
    }

    return {
      trend,
      slope: regression.slope,
      r2: regression.r2,
      currentSPI: Math.round(currentSPI * 10000) / 10000,
      averageSPI: Math.round(averageSPI * 10000) / 10000,
      currentValue: Math.round(currentSPI * 10000) / 10000,
      averageValue: Math.round(averageSPI * 10000) / 10000,
      volatility: Math.round(volatility * 10000) / 10000,
    };
  } catch (error) {
    throw new Error(
      `Failed to analyze SPI trend: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Calculate simple moving average for smoothing time series data
 *
 * Moving averages reduce noise and highlight underlying trends by
 * averaging values over a sliding window.
 *
 * For a window size of 3 and values [1, 2, 3, 4, 5]:
 * - MA[0] = 1 (not enough data)
 * - MA[1] = 1.5 (avg of 1, 2)
 * - MA[2] = 2 (avg of 1, 2, 3)
 * - MA[3] = 3 (avg of 2, 3, 4)
 * - MA[4] = 4 (avg of 3, 4, 5)
 *
 * @param values - Array of numeric values
 * @param windowSize - Number of periods to average (default 3)
 * @returns Array of smoothed values (same length as input)
 */
export function calculateMovingAverage(
  values: number[],
  windowSize: number = 3
): number[] {
  if (values.length === 0) {
    return [];
  }

  if (windowSize <= 0) {
    windowSize = 1;
  }

  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    const average = window.reduce((sum, val) => sum + val, 0) / window.length;
    result.push(Math.round(average * 10000) / 10000);
  }

  return result;
}

/**
 * Detect statistical anomalies in EVM metrics using z-score analysis
 *
 * Identifies snapshots where a metric deviates significantly from the mean.
 * Uses the z-score (number of standard deviations from mean) to flag outliers.
 *
 * Z-Score Formula: z = (x - μ) / σ
 * where x = value, μ = mean, σ = standard deviation
 *
 * Typical thresholds:
 * - 1.0: ~68% of data (1 std dev)
 * - 2.0: ~95% of data (2 std dev) - recommended default
 * - 3.0: ~99.7% of data (3 std dev) - strict outliers
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID containing snapshots
 * @param programId - Program identifier
 * @param metric - Metric to analyze: 'cpi', 'spi', 'cv', or 'sv'
 * @param threshold - Z-score threshold for anomaly detection (default 2.0)
 * @returns Array of detected anomalies with z-scores and deviation direction
 */
export async function detectAnomalies(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  metric: "cpi" | "spi" | "cv" | "sv",
  threshold: number = 2.0
): Promise<Anomaly[]> {
  try {
    // Get historical snapshots (12 months for good statistical sample)
    const snapshots = await getSnapshotHistory(
      sheets,
      spreadsheetId,
      programId,
      12
    );

    if (snapshots.length < 3) {
      return []; // Need at least 3 data points for meaningful analysis
    }

    // Extract metric values
    const values = snapshots.map((s) => s[metric]);

    // Calculate mean and standard deviation
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    // Detect anomalies
    const anomalies: Anomaly[] = [];

    for (let i = 0; i < snapshots.length; i++) {
      const value = values[i];
      const zScore = stdDev === 0 ? 0 : (value - mean) / stdDev;

      if (Math.abs(zScore) > threshold) {
        anomalies.push({
          snapshotId: snapshots[i].snapshotId,
          date: snapshots[i].snapshotDate,
          value: Math.round(value * 10000) / 10000,
          zScore: Math.round(zScore * 100) / 100,
          deviation: zScore > 0 ? "high" : "low",
        });
      }
    }

    return anomalies;
  } catch (error) {
    throw new Error(
      `Failed to detect anomalies: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Perform comprehensive performance trend analysis
 *
 * Analyzes multiple performance dimensions to provide a holistic view
 * of program health and trajectory:
 * 1. Cost performance (CPI) trend
 * 2. Schedule performance (SPI) trend
 * 3. Overall health score trend
 * 4. 3-month health forecast
 * 5. Risk level assessment
 * 6. Actionable recommendations
 *
 * Overall trend is determined by combining CPI and SPI trends:
 * - Improving: Both improving, or one improving and one stable
 * - Declining: Both declining, or one declining and one stable
 * - Stable: Both stable, or mixed improving/declining
 *
 * Risk level considers:
 * - Current performance indices (CPI, SPI < 0.9 = high risk)
 * - Trend direction (declining = higher risk)
 * - Volatility (high volatility = higher risk)
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID containing snapshots
 * @param programId - Program identifier
 * @param periodMonths - Number of months to analyze (default 12)
 * @returns Comprehensive performance analysis with forecasts and recommendations
 */
export async function analyzePerformanceTrend(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  periodMonths: number = 12
): Promise<PerformanceTrendAnalysis> {
  try {
    // Get historical snapshots
    const snapshots = await getSnapshotHistory(
      sheets,
      spreadsheetId,
      programId,
      periodMonths
    );

    // Analyze CPI and SPI trends
    const cpiAnalysis = await analyzeCPITrend(
      sheets,
      spreadsheetId,
      programId,
      periodMonths
    );
    const spiAnalysis = await analyzeSPITrend(
      sheets,
      spreadsheetId,
      programId,
      periodMonths
    );

    // Analyze health score trend
    const healthScores = snapshots.map((snapshot) => {
      // Extract health score from notes (format: "Health: status (score: 75)")
      const match = snapshot.notes?.match(/score:\s*(\d+)/);
      return match ? parseInt(match[1], 10) : 50; // Default to 50 if not found
    });

    const healthDataPoints: DataPoint[] = healthScores.map((score, index) => ({
      x: index,
      y: score,
    }));

    const healthRegression = calculateLinearRegression(healthDataPoints);

    // Forecast health score 3 months out
    // Assuming monthly snapshots, forecast = current + (3 * slope)
    const currentHealthIndex = snapshots.length - 1;
    const forecast3Months =
      healthRegression.slope * (currentHealthIndex + 3) +
      healthRegression.intercept;

    // Determine overall trend
    let overallTrend: TrendDirection = "stable";
    if (
      cpiAnalysis.trend === "improving" &&
      (spiAnalysis.trend === "improving" || spiAnalysis.trend === "stable")
    ) {
      overallTrend = "improving";
    } else if (
      spiAnalysis.trend === "improving" &&
      (cpiAnalysis.trend === "improving" || cpiAnalysis.trend === "stable")
    ) {
      overallTrend = "improving";
    } else if (
      cpiAnalysis.trend === "declining" ||
      spiAnalysis.trend === "declining"
    ) {
      overallTrend = "declining";
    }

    // Assess risk level
    let riskLevel: RiskLevel = "low";
    const currentCPI = cpiAnalysis.currentCPI;
    const currentSPI = spiAnalysis.currentSPI;

    if (
      currentCPI < 0.85 ||
      currentSPI < 0.85 ||
      (overallTrend === "declining" && (currentCPI < 0.9 || currentSPI < 0.9))
    ) {
      riskLevel = "high";
    } else if (
      currentCPI < 0.95 ||
      currentSPI < 0.95 ||
      overallTrend === "declining" ||
      cpiAnalysis.volatility > 0.15 ||
      spiAnalysis.volatility > 0.15
    ) {
      riskLevel = "medium";
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (cpiAnalysis.trend === "declining") {
      recommendations.push(
        "Cost performance is declining. Review budget allocation and cost controls."
      );
      if (cpiAnalysis.currentCPI < 0.9) {
        recommendations.push(
          "Critical: CPI below 0.9 indicates significant cost overruns. Immediate corrective action required."
        );
      }
    }

    if (spiAnalysis.trend === "declining") {
      recommendations.push(
        "Schedule performance is declining. Review project timeline and resource allocation."
      );
      if (spiAnalysis.currentSPI < 0.9) {
        recommendations.push(
          "Critical: SPI below 0.9 indicates significant schedule delays. Re-baseline may be necessary."
        );
      }
    }

    if (cpiAnalysis.volatility > 0.2 || spiAnalysis.volatility > 0.2) {
      recommendations.push(
        "High performance volatility detected. Implement more consistent tracking and control processes."
      );
    }

    if (forecast3Months < 60) {
      recommendations.push(
        "Health score forecast indicates deteriorating conditions. Proactive intervention recommended."
      );
    }

    if (overallTrend === "improving") {
      recommendations.push(
        "Performance is improving. Continue current management practices and monitor for sustainability."
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Performance is stable. Maintain current tracking and control processes."
      );
    }

    return {
      overallTrend,
      cpiAnalysis,
      spiAnalysis,
      healthTrend: {
        slope: healthRegression.slope,
        forecast3Months: Math.round(Math.max(0, Math.min(100, forecast3Months))),
      },
      riskLevel,
      recommendations,
    };
  } catch (error) {
    throw new Error(
      `Failed to analyze performance trend: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Compare current performance to a baseline snapshot
 *
 * Calculates deltas between a baseline (typically project start or re-baseline)
 * and current performance to quantify performance changes over time.
 *
 * Key metrics compared:
 * - Cost Variance (CV): Change in cost variance
 * - Schedule Variance (SV): Change in schedule variance
 * - CPI Change: Percentage point change in cost efficiency
 * - SPI Change: Percentage point change in schedule efficiency
 * - Days Variance: Estimated schedule slip in calendar days
 *
 * Days variance calculation assumes:
 * - Linear project timeline
 * - Schedule variance translates proportionally to days
 * - Based on BAC and current completion percentage
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID containing snapshots
 * @param programId - Program identifier
 * @param baselineSnapshotId - Snapshot ID to use as baseline (e.g., "SNAP-001")
 * @returns Comparison report with deltas and summary
 */
export async function compareToBaseline(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  baselineSnapshotId: string
): Promise<BaselineComparison> {
  try {
    // Get baseline snapshot
    const snapshots = await getSnapshotHistory(sheets, spreadsheetId, programId, 24);
    const baseline = snapshots.find((s) => s.snapshotId === baselineSnapshotId);

    if (!baseline) {
      throw new Error(`Baseline snapshot ${baselineSnapshotId} not found`);
    }

    // Get current snapshot (most recent)
    const current = snapshots[snapshots.length - 1];

    if (!current) {
      throw new Error("No current snapshot found");
    }

    // Calculate deltas
    const costVariance = current.cv - baseline.cv;
    const scheduleVariance = current.sv - baseline.sv;
    const cpiChange = current.cpi - baseline.cpi;
    const spiChange = current.spi - baseline.spi;

    // Calculate days variance
    // Estimate based on schedule variance and project duration
    // Assumes SV is in dollars; convert to time using planned value rate
    // daysVariance ≈ (SV / (PV / days elapsed)) for rough estimate
    // Simplified: use SPI change to estimate % schedule slip
    const scheduleSlipPercent = (1 - current.spi) * 100;
    const baselineSlipPercent = (1 - baseline.spi) * 100;
    const slipChange = scheduleSlipPercent - baselineSlipPercent;

    // Estimate days based on percentage slip (assume 365-day project year)
    // This is a rough estimate - actual calculation would need project end date
    const daysVariance = Math.round((slipChange / 100) * 365);

    // Generate summary
    let summary = "";

    if (cpiChange > 0.05) {
      summary += "Cost performance has improved significantly. ";
    } else if (cpiChange < -0.05) {
      summary += "Cost performance has declined significantly. ";
    } else {
      summary += "Cost performance is relatively stable. ";
    }

    if (spiChange > 0.05) {
      summary += "Schedule performance has improved significantly. ";
    } else if (spiChange < -0.05) {
      summary += "Schedule performance has declined significantly. ";
    } else {
      summary += "Schedule performance is relatively stable. ";
    }

    if (Math.abs(daysVariance) > 30) {
      summary += `Estimated schedule variance of ${Math.abs(daysVariance)} days ${daysVariance > 0 ? "behind" : "ahead"} of baseline.`;
    } else {
      summary += "Schedule is tracking close to baseline.";
    }

    return {
      costVariance: Math.round(costVariance * 100) / 100,
      scheduleVariance: Math.round(scheduleVariance * 100) / 100,
      cpiChange: Math.round(cpiChange * 10000) / 10000,
      spiChange: Math.round(spiChange * 10000) / 10000,
      daysVariance,
      summary: summary.trim(),
    };
  } catch (error) {
    throw new Error(
      `Failed to compare to baseline: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
