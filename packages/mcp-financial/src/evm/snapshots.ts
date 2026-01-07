/**
 * EVM Snapshots Storage Module
 *
 * Provides CRUD operations for EVM snapshots - periodic captures of
 * Earned Value Management metrics for trending and historical analysis.
 *
 * Snapshots are immutable point-in-time records, allowing programs to
 * track performance trends over time. Each snapshot captures the complete
 * EVM calculation at a specific date.
 */

import type { sheets_v4 } from "googleapis";
import type { EVMSnapshot } from "../types/financial.js";
import {
  readSheetRange,
  appendRows,
  findRowById,
  generateNextId,
} from "@gw-mcp/shared-core";
import { performEVMCalculation, calculateHealthIndex } from "./calculations.js";

/**
 * Column mapping for EVM Snapshots sheet
 * Based on financial-schema.md specification
 */
export const SNAPSHOT_COLUMNS = {
  snapshotId: "A",
  programId: "B",
  projectId: "C",
  snapshotDate: "D",
  reportingPeriod: "E",
  pv: "F",
  ev: "G",
  ac: "H",
  sv: "I",
  cv: "J",
  svPercent: "K",
  cvPercent: "L",
  spi: "M",
  cpi: "N",
  bac: "O",
  eac: "P",
  etc: "Q",
  vac: "R",
  tcpi: "S",
  percentComplete: "T",
  percentScheduleComplete: "U",
  trend: "V",
  calculatedBy: "W",
  calculatedDate: "X",
  notes: "Y",
};

const SNAPSHOTS_SHEET = "EVM Snapshots";

/**
 * Parse a row from the sheet into an EVMSnapshot object
 *
 * @param row - Array of cell values from the sheet
 * @returns Parsed EVMSnapshot object or null if row is invalid
 */
export function parseSnapshotRow(row: any[]): EVMSnapshot | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  return {
    snapshotId: row[0] || "",
    programId: row[1] || "",
    projectId: row[2] || undefined,
    snapshotDate: row[3] ? new Date(row[3]) : new Date(),
    reportingPeriod: row[4] || "",
    pv: row[5] ? parseFloat(row[5]) : 0,
    ev: row[6] ? parseFloat(row[6]) : 0,
    ac: row[7] ? parseFloat(row[7]) : 0,
    sv: row[8] ? parseFloat(row[8]) : 0,
    cv: row[9] ? parseFloat(row[9]) : 0,
    svPercent: row[10] ? parseFloat(row[10]) : 0,
    cvPercent: row[11] ? parseFloat(row[11]) : 0,
    spi: row[12] ? parseFloat(row[12]) : 0,
    cpi: row[13] ? parseFloat(row[13]) : 0,
    bac: row[14] ? parseFloat(row[14]) : 0,
    eac: row[15] ? parseFloat(row[15]) : 0,
    etc: row[16] ? parseFloat(row[16]) : 0,
    vac: row[17] ? parseFloat(row[17]) : 0,
    tcpi: row[18] ? parseFloat(row[18]) : 0,
    percentComplete: row[19] ? parseFloat(row[19]) : 0,
    percentScheduleComplete: row[20] ? parseFloat(row[20]) : 0,
    trend: (row[21] as "improving" | "stable" | "declining") || "stable",
    calculatedBy: row[22] || "",
    calculatedDate: row[23] ? new Date(row[23]) : new Date(),
    notes: row[24] || "",
  };
}

/**
 * Convert an EVMSnapshot object to a row array for sheet storage
 *
 * @param snapshot - EVMSnapshot object to convert
 * @returns Array of cell values matching the sheet schema
 */
export function snapshotToRow(snapshot: EVMSnapshot): any[] {
  return [
    snapshot.snapshotId,
    snapshot.programId,
    snapshot.projectId || "",
    snapshot.snapshotDate.toISOString().split("T")[0],
    snapshot.reportingPeriod,
    Math.round(snapshot.pv * 100) / 100,
    Math.round(snapshot.ev * 100) / 100,
    Math.round(snapshot.ac * 100) / 100,
    Math.round(snapshot.sv * 100) / 100,
    Math.round(snapshot.cv * 100) / 100,
    Math.round(snapshot.svPercent * 100) / 100,
    Math.round(snapshot.cvPercent * 100) / 100,
    Math.round(snapshot.spi * 10000) / 10000,
    Math.round(snapshot.cpi * 10000) / 10000,
    Math.round(snapshot.bac * 100) / 100,
    Math.round(snapshot.eac * 100) / 100,
    Math.round(snapshot.etc * 100) / 100,
    Math.round(snapshot.vac * 100) / 100,
    Math.round(snapshot.tcpi * 10000) / 10000,
    Math.round(snapshot.percentComplete * 100) / 100,
    Math.round(snapshot.percentScheduleComplete * 100) / 100,
    snapshot.trend,
    snapshot.calculatedBy,
    snapshot.calculatedDate.toISOString(),
    snapshot.notes || "",
  ];
}

/**
 * Create a new EVM snapshot for a program
 *
 * This function performs a complete EVM calculation and stores the results
 * as a point-in-time snapshot. Snapshots are immutable once created.
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID containing financial data
 * @param programId - Program identifier
 * @param snapshotDate - Date for the snapshot (defaults to now)
 * @param createdBy - User creating the snapshot (defaults to "system")
 * @returns Created EVMSnapshot object
 *
 * @throws Error if EVM calculation fails or snapshot cannot be created
 */
export async function createSnapshot(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  snapshotDate?: Date,
  createdBy: string = "system"
): Promise<EVMSnapshot> {
  try {
    const targetDate = snapshotDate || new Date();

    // Generate next snapshot ID
    const snapshotId = await generateNextId(
      sheets,
      spreadsheetId,
      SNAPSHOTS_SHEET,
      "Snapshot ID",
      "SNAP"
    );

    // Perform EVM calculation
    const evmResult = await performEVMCalculation(
      sheets,
      spreadsheetId,
      programId,
      targetDate
    );

    // Calculate health index
    const health = calculateHealthIndex(evmResult.metrics);

    // Determine trend based on health indicators
    let trend: "improving" | "stable" | "declining" = "stable";
    if (health.status === "healthy" && (evmResult.metrics.cpi >= 1.05 || evmResult.metrics.spi >= 1.05)) {
      trend = "improving";
    } else if (health.status === "critical" || (evmResult.metrics.cpi < 0.9 && evmResult.metrics.spi < 0.9)) {
      trend = "declining";
    }

    // Calculate percent complete metrics
    const percentComplete = evmResult.bac > 0 ? (evmResult.ev / evmResult.bac) * 100 : 0;
    const percentScheduleComplete = evmResult.bac > 0 ? (evmResult.pv / evmResult.bac) * 100 : 0;

    // Generate reporting period (e.g., "2024-Q1", "2024-W42")
    const year = targetDate.getFullYear();
    const quarter = Math.floor(targetDate.getMonth() / 3) + 1;
    const reportingPeriod = `${year}-Q${quarter}`;

    // Create snapshot object
    const snapshot: EVMSnapshot = {
      snapshotId,
      programId,
      snapshotDate: targetDate,
      reportingPeriod,
      pv: evmResult.pv,
      ev: evmResult.ev,
      ac: evmResult.ac,
      sv: evmResult.metrics.sv,
      cv: evmResult.metrics.cv,
      svPercent: evmResult.metrics.svPercent,
      cvPercent: evmResult.metrics.cvPercent,
      spi: evmResult.metrics.spi,
      cpi: evmResult.metrics.cpi,
      bac: evmResult.bac,
      eac: evmResult.metrics.eac,
      etc: evmResult.metrics.etc,
      vac: evmResult.metrics.vac,
      tcpi: evmResult.metrics.tcpi,
      percentComplete,
      percentScheduleComplete,
      trend,
      calculatedBy: createdBy,
      calculatedDate: new Date(),
      notes: `Health: ${health.status} (score: ${health.score})`,
    };

    // Append to sheet
    const row = snapshotToRow(snapshot);
    await appendRows(sheets, spreadsheetId, `${SNAPSHOTS_SHEET}!A:Y`, [row]);

    return snapshot;
  } catch (error) {
    throw new Error(
      `Failed to create snapshot: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Read a snapshot by ID
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param snapshotId - Snapshot identifier (e.g., "SNAP-001")
 * @returns EVMSnapshot object or null if not found
 */
export async function readSnapshot(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  snapshotId: string
): Promise<EVMSnapshot | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      SNAPSHOTS_SHEET,
      "Snapshot ID",
      snapshotId
    );

    if (!result) {
      return null;
    }

    return parseSnapshotRow(result.rowData);
  } catch (error) {
    throw new Error(
      `Failed to read snapshot: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List snapshots for a program with optional filters
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program identifier
 * @param filters - Optional filters for date range and limit
 * @returns Array of EVMSnapshot objects sorted by date (newest first)
 */
export async function listSnapshots(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<EVMSnapshot[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${SNAPSHOTS_SHEET}!A:Y`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const snapshots: EVMSnapshot[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const snapshot = parseSnapshotRow(data[i]);
      if (!snapshot) continue;

      // Filter by program ID
      if (snapshot.programId !== programId) {
        continue;
      }

      // Apply date filters
      if (filters?.startDate && snapshot.snapshotDate < filters.startDate) {
        continue;
      }
      if (filters?.endDate && snapshot.snapshotDate > filters.endDate) {
        continue;
      }

      snapshots.push(snapshot);
    }

    // Sort by snapshot date descending (newest first)
    snapshots.sort((a, b) => b.snapshotDate.getTime() - a.snapshotDate.getTime());

    // Apply limit (default 100, max 1000)
    const limit = Math.min(filters?.limit || 100, 1000);
    return snapshots.slice(0, limit);
  } catch (error) {
    throw new Error(
      `Failed to list snapshots: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get the latest snapshot for a program
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program identifier
 * @returns Most recent EVMSnapshot or null if no snapshots exist
 */
export async function getLatestSnapshot(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<EVMSnapshot | null> {
  try {
    const snapshots = await listSnapshots(sheets, spreadsheetId, programId, {
      limit: 1,
    });

    return snapshots.length > 0 ? snapshots[0] : null;
  } catch (error) {
    throw new Error(
      `Failed to get latest snapshot: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get snapshot history for trending analysis
 *
 * Returns snapshots for the last N months, sorted chronologically
 * (oldest first) for time-series analysis.
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param programId - Program identifier
 * @param periodMonths - Number of months to look back (default 12)
 * @returns Array of EVMSnapshot objects sorted ascending by date
 */
export async function getSnapshotHistory(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string,
  periodMonths: number = 12
): Promise<EVMSnapshot[]> {
  try {
    // Calculate start date (N months ago)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    // Get snapshots in date range
    const snapshots = await listSnapshots(sheets, spreadsheetId, programId, {
      startDate,
      endDate,
      limit: 1000,
    });

    // Sort ascending by date (oldest first) for trending
    snapshots.sort((a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime());

    return snapshots;
  } catch (error) {
    throw new Error(
      `Failed to get snapshot history: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Trend direction type
 */
type TrendDirection = "improving" | "stable" | "declining";

/**
 * Snapshot comparison result
 */
export interface SnapshotComparison {
  cpiTrend: TrendDirection;
  spiTrend: TrendDirection;
  costDelta: number;
  scheduleDelta: number;
  healthDelta: number;
}

/**
 * Compare two snapshots to identify performance trends
 *
 * Analyzes the difference between a baseline snapshot and a current snapshot
 * to determine if performance is improving, stable, or declining.
 *
 * Trend Logic:
 * - Improving: Index increased by > 0.02 (2%)
 * - Declining: Index decreased by > 0.02 (2%)
 * - Stable: Change within ±0.02 (±2%)
 *
 * @param baseline - Earlier snapshot for comparison
 * @param current - More recent snapshot
 * @returns Comparison analysis with trends and deltas
 */
export function compareSnapshots(
  baseline: EVMSnapshot,
  current: EVMSnapshot
): SnapshotComparison {
  // Calculate CPI trend
  let cpiTrend: TrendDirection = "stable";
  const cpiDelta = current.cpi - baseline.cpi;
  if (cpiDelta > 0.02) {
    cpiTrend = "improving";
  } else if (cpiDelta < -0.02) {
    cpiTrend = "declining";
  }

  // Calculate SPI trend
  let spiTrend: TrendDirection = "stable";
  const spiDelta = current.spi - baseline.spi;
  if (spiDelta > 0.02) {
    spiTrend = "improving";
  } else if (spiDelta < -0.02) {
    spiTrend = "declining";
  }

  // Calculate absolute deltas
  const costDelta = current.cv - baseline.cv; // Change in cost variance
  const scheduleDelta = current.sv - baseline.sv; // Change in schedule variance

  // Calculate health delta (extract score from notes if possible)
  // Notes format: "Health: healthy (score: 85)"
  const extractScore = (notes: string): number => {
    const match = notes.match(/score:\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 50; // Default to 50 if not found
  };

  const baselineScore = extractScore(baseline.notes || "");
  const currentScore = extractScore(current.notes || "");
  const healthDelta = currentScore - baselineScore;

  return {
    cpiTrend,
    spiTrend,
    costDelta: Math.round(costDelta * 100) / 100,
    scheduleDelta: Math.round(scheduleDelta * 100) / 100,
    healthDelta,
  };
}

/**
 * Delete a snapshot by ID
 *
 * Hard delete - snapshots are point-in-time records, not audit trail entities.
 * Use with caution as this operation is irreversible.
 *
 * @param sheets - Google Sheets API instance
 * @param spreadsheetId - Spreadsheet ID
 * @param snapshotId - Snapshot identifier to delete
 * @returns True if deleted successfully, false if not found
 */
export async function deleteSnapshot(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  snapshotId: string
): Promise<boolean> {
  try {
    // Find the snapshot row
    const result = await findRowById(
      sheets,
      spreadsheetId,
      SNAPSHOTS_SHEET,
      "Snapshot ID",
      snapshotId
    );

    if (!result) {
      return false;
    }

    // Get sheet ID
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheet = response.data.sheets?.find(
      (s) => s.properties?.title === SNAPSHOTS_SHEET
    );

    if (!sheet || sheet.properties?.sheetId === undefined || sheet.properties.sheetId === null) {
      throw new Error(`Sheet ${SNAPSHOTS_SHEET} not found`);
    }

    const sheetId = sheet.properties.sheetId;

    // Delete the row
    // rowIndex is 0-based, but we need to add 1 for the actual row number
    const rowNumber = result.rowIndex + 1;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: result.rowIndex,
                endIndex: result.rowIndex + 1,
              },
            },
          },
        ],
      },
    });

    return true;
  } catch (error) {
    throw new Error(
      `Failed to delete snapshot: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
