/**
 * Performance Metrics Tracking
 *
 * Records and retrieves vendor performance metrics including
 * delivery, quality, and cost performance
 */

import type { sheets_v4 } from "googleapis";
import {
  readSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "@gw-mcp/shared-core";

/**
 * Column mapping for PerformanceMetrics sheet (A-O, 15 columns)
 */
export const METRIC_COLUMNS = {
  metricId: "A",
  vendorId: "B",
  contractId: "C",
  programId: "D",
  metricType: "E",
  recordDate: "F",
  value: "G",
  target: "H",
  variance: "I",
  period: "J",
  deliverableId: "K",
  notes: "L",
  createdDate: "M",
  createdBy: "N",
  lastModified: "O",
};

const METRICS_SHEET = "PerformanceMetrics";

/**
 * Metric type
 */
export type MetricType = "delivery" | "quality" | "cost";

/**
 * Performance metric
 */
export interface PerformanceMetric {
  metricId: string;
  vendorId: string;
  contractId?: string;
  programId: string;
  metricType: MetricType;
  recordDate: Date;
  value: number;
  target: number;
  variance: number; // value - target
  period: string; // e.g., "2024-Q1", "2024-01", etc.
  deliverableId?: string;
  notes?: string;
  createdDate: Date;
  createdBy: string;
  lastModified: Date;
}

/**
 * Parse a row from the sheet into a PerformanceMetric object
 */
function parseMetricRow(row: any[]): PerformanceMetric | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  const value = row[6] ? parseFloat(row[6]) : 0;
  const target = row[7] ? parseFloat(row[7]) : 0;

  return {
    metricId: row[0] || "",
    vendorId: row[1] || "",
    contractId: row[2] || undefined,
    programId: row[3] || "",
    metricType: (row[4] as MetricType) || "quality",
    recordDate: row[5] ? new Date(row[5]) : new Date(),
    value,
    target,
    variance: value - target,
    period: row[9] || "",
    deliverableId: row[10] || undefined,
    notes: row[11] || undefined,
    createdDate: row[12] ? new Date(row[12]) : new Date(),
    createdBy: row[13] || "",
    lastModified: row[14] ? new Date(row[14]) : new Date(),
  };
}

/**
 * Convert a PerformanceMetric object to a row array
 */
function metricToRow(metric: PerformanceMetric): any[] {
  return [
    metric.metricId,
    metric.vendorId,
    metric.contractId || "",
    metric.programId,
    metric.metricType,
    metric.recordDate.toISOString().split("T")[0],
    metric.value,
    metric.target,
    metric.variance,
    metric.period,
    metric.deliverableId || "",
    metric.notes || "",
    metric.createdDate.toISOString(),
    metric.createdBy,
    metric.lastModified.toISOString(),
  ];
}

/**
 * Create metric input
 */
export interface CreateMetricInput {
  vendorId: string;
  contractId?: string;
  programId: string;
  metricType: MetricType;
  recordDate: Date;
  value: number;
  target: number;
  period?: string;
  deliverableId?: string;
  notes?: string;
}

/**
 * Record delivery metric
 */
export async function recordDeliveryMetric(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: {
    vendorId: string;
    contractId?: string;
    programId: string;
    deliverableId: string;
    dueDate: Date;
    actualDate: Date;
    target?: number; // Target is 0 days late (on-time)
  },
  recordedBy: string
): Promise<PerformanceMetric> {
  try {
    // Calculate days difference (negative = early, 0 = on-time, positive = late)
    const dueTime = input.dueDate.getTime();
    const actualTime = input.actualDate.getTime();
    const daysDiff = Math.floor((actualTime - dueTime) / (1000 * 60 * 60 * 24));

    const period = `${input.actualDate.getFullYear()}-${String(input.actualDate.getMonth() + 1).padStart(2, "0")}`;

    const metricInput: CreateMetricInput = {
      vendorId: input.vendorId,
      contractId: input.contractId,
      programId: input.programId,
      metricType: "delivery",
      recordDate: input.actualDate,
      value: daysDiff,
      target: input.target !== undefined ? input.target : 0,
      period,
      deliverableId: input.deliverableId,
      notes: daysDiff <= 0 ? "On-time or early delivery" : `Late by ${daysDiff} days`,
    };

    return createMetric(sheets, spreadsheetId, metricInput, recordedBy);
  } catch (error) {
    throw new Error(
      `Failed to record delivery metric: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Record quality metric
 */
export async function recordQualityMetric(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: {
    vendorId: string;
    contractId?: string;
    programId: string;
    deliverableId: string;
    score: number; // 0-100 scale
    target?: number; // Default target is 80
  },
  recordedBy: string
): Promise<PerformanceMetric> {
  try {
    if (input.score < 0 || input.score > 100) {
      throw new Error("Quality score must be between 0 and 100");
    }

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const metricInput: CreateMetricInput = {
      vendorId: input.vendorId,
      contractId: input.contractId,
      programId: input.programId,
      metricType: "quality",
      recordDate: now,
      value: input.score,
      target: input.target !== undefined ? input.target : 80,
      period,
      deliverableId: input.deliverableId,
      notes: `Quality score: ${input.score}/100`,
    };

    return createMetric(sheets, spreadsheetId, metricInput, recordedBy);
  } catch (error) {
    throw new Error(
      `Failed to record quality metric: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Record cost metric
 */
export async function recordCostMetric(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: {
    vendorId: string;
    contractId?: string;
    programId: string;
    deliverableId?: string;
    budgeted: number;
    actual: number;
  },
  recordedBy: string
): Promise<PerformanceMetric> {
  try {
    // Calculate cost variance as percentage
    const variance = input.budgeted > 0
      ? ((input.actual - input.budgeted) / input.budgeted) * 100
      : 0;

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const metricInput: CreateMetricInput = {
      vendorId: input.vendorId,
      contractId: input.contractId,
      programId: input.programId,
      metricType: "cost",
      recordDate: now,
      value: variance,
      target: 0, // Target is 0% variance (on budget)
      period,
      deliverableId: input.deliverableId,
      notes: variance > 0
        ? `Over budget by ${variance.toFixed(2)}%`
        : variance < 0
        ? `Under budget by ${Math.abs(variance).toFixed(2)}%`
        : "On budget",
    };

    return createMetric(sheets, spreadsheetId, metricInput, recordedBy);
  } catch (error) {
    throw new Error(
      `Failed to record cost metric: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create a new metric (internal helper)
 */
async function createMetric(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: CreateMetricInput,
  createdBy: string
): Promise<PerformanceMetric> {
  try {
    // Generate next metric ID
    const metricId = await generateNextId(
      sheets,
      spreadsheetId,
      METRICS_SHEET,
      "Metric ID",
      "METRIC"
    );

    const now = new Date();

    const metric: PerformanceMetric = {
      metricId,
      vendorId: input.vendorId,
      contractId: input.contractId,
      programId: input.programId,
      metricType: input.metricType,
      recordDate: input.recordDate,
      value: input.value,
      target: input.target,
      variance: input.value - input.target,
      period: input.period || `${input.recordDate.getFullYear()}-${String(input.recordDate.getMonth() + 1).padStart(2, "0")}`,
      deliverableId: input.deliverableId,
      notes: input.notes,
      createdDate: now,
      createdBy,
      lastModified: now,
    };

    // Append to sheet
    const row = metricToRow(metric);
    await appendRows(sheets, spreadsheetId, `${METRICS_SHEET}!A:O`, [row]);

    return metric;
  } catch (error) {
    throw new Error(
      `Failed to create metric: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get all metrics for a vendor
 */
export async function getVendorMetrics(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId: string,
  filters?: {
    metricType?: MetricType;
    contractId?: string;
    programId?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<PerformanceMetric[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${METRICS_SHEET}!A:O`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const metrics: PerformanceMetric[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const metric = parseMetricRow(data[i]);
      if (!metric) continue;

      // Filter by vendor ID
      if (metric.vendorId !== vendorId) {
        continue;
      }

      // Apply additional filters
      if (filters) {
        if (filters.metricType && metric.metricType !== filters.metricType) {
          continue;
        }
        if (filters.contractId && metric.contractId !== filters.contractId) {
          continue;
        }
        if (filters.programId && metric.programId !== filters.programId) {
          continue;
        }
        if (filters.startDate && metric.recordDate < filters.startDate) {
          continue;
        }
        if (filters.endDate && metric.recordDate > filters.endDate) {
          continue;
        }
      }

      metrics.push(metric);
    }

    // Sort by record date (newest first)
    metrics.sort((a, b) => b.recordDate.getTime() - a.recordDate.getTime());

    return metrics;
  } catch (error) {
    throw new Error(
      `Failed to get vendor metrics: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Calculate on-time delivery rate for a vendor
 */
export async function calculateOnTimeDeliveryRate(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId: string,
  periodMonths: number = 12
): Promise<{
  rate: number; // Percentage 0-100
  onTimeCount: number;
  totalCount: number;
}> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    const metrics = await getVendorMetrics(sheets, spreadsheetId, vendorId, {
      metricType: "delivery",
      startDate,
      endDate,
    });

    if (metrics.length === 0) {
      return { rate: 0, onTimeCount: 0, totalCount: 0 };
    }

    // Count on-time deliveries (value <= 0 means on-time or early)
    const onTimeCount = metrics.filter((m) => m.value <= 0).length;
    const totalCount = metrics.length;
    const rate = (onTimeCount / totalCount) * 100;

    return {
      rate,
      onTimeCount,
      totalCount,
    };
  } catch (error) {
    throw new Error(
      `Failed to calculate on-time delivery rate: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Calculate average quality score for a vendor
 */
export async function calculateQualityAverage(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId: string,
  periodMonths: number = 12
): Promise<{
  average: number;
  count: number;
  min: number;
  max: number;
}> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    const metrics = await getVendorMetrics(sheets, spreadsheetId, vendorId, {
      metricType: "quality",
      startDate,
      endDate,
    });

    if (metrics.length === 0) {
      return { average: 0, count: 0, min: 0, max: 0 };
    }

    const values = metrics.map((m) => m.value);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      average,
      count: values.length,
      min,
      max,
    };
  } catch (error) {
    throw new Error(
      `Failed to calculate quality average: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Calculate average cost variance for a vendor
 */
export async function calculateCostVariance(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId: string,
  periodMonths: number = 12
): Promise<{
  averageVariance: number; // Percentage
  count: number;
  overBudgetCount: number;
  underBudgetCount: number;
  onBudgetCount: number;
}> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    const metrics = await getVendorMetrics(sheets, spreadsheetId, vendorId, {
      metricType: "cost",
      startDate,
      endDate,
    });

    if (metrics.length === 0) {
      return {
        averageVariance: 0,
        count: 0,
        overBudgetCount: 0,
        underBudgetCount: 0,
        onBudgetCount: 0,
      };
    }

    const values = metrics.map((m) => m.value);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const averageVariance = sum / values.length;

    const overBudgetCount = metrics.filter((m) => m.value > 1).length; // More than 1% over
    const underBudgetCount = metrics.filter((m) => m.value < -1).length; // More than 1% under
    const onBudgetCount = metrics.filter((m) => Math.abs(m.value) <= 1).length; // Within 1%

    return {
      averageVariance,
      count: values.length,
      overBudgetCount,
      underBudgetCount,
      onBudgetCount,
    };
  } catch (error) {
    throw new Error(
      `Failed to calculate cost variance: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
