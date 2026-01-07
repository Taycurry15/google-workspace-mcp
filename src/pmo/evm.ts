/**
 * Earned Value Management (EVM) Module
 * Handles EVM calculations, snapshots, trending, and forecasting
 * Phase 4 - Week 6 Implementation
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { appendRows, readSheetRange } from "../utils/sheetHelpers.js";

const SPREADSHEET_ID = process.env.PMO_SPREADSHEET_ID || "";
const SHEET_NAME = "EVM Snapshots";

/**
 * EVM Snapshot Interface
 */
export interface EVMSnapshot {
  snapshotId: string;         // Unique identifier (EVM-001)
  programId: string;          // Parent program
  snapshotDate: Date;         // When snapshot was taken
  pv: number;                 // Planned Value (budgeted cost of work scheduled)
  ev: number;                 // Earned Value (budgeted cost of work performed)
  ac: number;                 // Actual Cost (actual cost of work performed)
  bac: number;                // Budget at Completion (total planned budget)
  spi: number;                // Schedule Performance Index (EV/PV)
  cpi: number;                // Cost Performance Index (EV/AC)
  cv: number;                 // Cost Variance (EV - AC)
  sv: number;                 // Schedule Variance (EV - PV)
  eac: number;                // Estimate at Completion
  etc: number;                // Estimate to Complete
  vac: number;                // Variance at Completion (BAC - EAC)
  tcpi: number;               // To-Complete Performance Index
  percentComplete: number;    // Overall % complete (EV/BAC * 100)
}

/**
 * Column mapping for EVM Snapshots sheet
 */
const COLUMN_MAP = {
  snapshotId: 0,
  programId: 1,
  snapshotDate: 2,
  pv: 3,
  ev: 4,
  ac: 5,
  bac: 6,
  spi: 7,
  cpi: 8,
  cv: 9,
  sv: 10,
  eac: 11,
  etc: 12,
  vac: 13,
  tcpi: 14,
  percentComplete: 15,
};

/**
 * Parse a row from the sheet into an EVMSnapshot object
 */
function parseEVMSnapshot(row: any[]): EVMSnapshot {
  return {
    snapshotId: row[COLUMN_MAP.snapshotId] || "",
    programId: row[COLUMN_MAP.programId] || "",
    snapshotDate: row[COLUMN_MAP.snapshotDate]
      ? new Date(row[COLUMN_MAP.snapshotDate])
      : new Date(),
    pv: parseFloat(row[COLUMN_MAP.pv]) || 0,
    ev: parseFloat(row[COLUMN_MAP.ev]) || 0,
    ac: parseFloat(row[COLUMN_MAP.ac]) || 0,
    bac: parseFloat(row[COLUMN_MAP.bac]) || 0,
    spi: parseFloat(row[COLUMN_MAP.spi]) || 0,
    cpi: parseFloat(row[COLUMN_MAP.cpi]) || 0,
    cv: parseFloat(row[COLUMN_MAP.cv]) || 0,
    sv: parseFloat(row[COLUMN_MAP.sv]) || 0,
    eac: parseFloat(row[COLUMN_MAP.eac]) || 0,
    etc: parseFloat(row[COLUMN_MAP.etc]) || 0,
    vac: parseFloat(row[COLUMN_MAP.vac]) || 0,
    tcpi: parseFloat(row[COLUMN_MAP.tcpi]) || 0,
    percentComplete: parseFloat(row[COLUMN_MAP.percentComplete]) || 0,
  };
}

/**
 * Serialize an EVMSnapshot object to a sheet row
 */
function serializeEVMSnapshot(snapshot: EVMSnapshot): any[] {
  const row = new Array(Object.keys(COLUMN_MAP).length).fill("");

  row[COLUMN_MAP.snapshotId] = snapshot.snapshotId;
  row[COLUMN_MAP.programId] = snapshot.programId;
  row[COLUMN_MAP.snapshotDate] = snapshot.snapshotDate.toISOString().split("T")[0];
  row[COLUMN_MAP.pv] = snapshot.pv;
  row[COLUMN_MAP.ev] = snapshot.ev;
  row[COLUMN_MAP.ac] = snapshot.ac;
  row[COLUMN_MAP.bac] = snapshot.bac;
  row[COLUMN_MAP.spi] = snapshot.spi;
  row[COLUMN_MAP.cpi] = snapshot.cpi;
  row[COLUMN_MAP.cv] = snapshot.cv;
  row[COLUMN_MAP.sv] = snapshot.sv;
  row[COLUMN_MAP.eac] = snapshot.eac;
  row[COLUMN_MAP.etc] = snapshot.etc;
  row[COLUMN_MAP.vac] = snapshot.vac;
  row[COLUMN_MAP.tcpi] = snapshot.tcpi;
  row[COLUMN_MAP.percentComplete] = snapshot.percentComplete;

  return row;
}

/**
 * Calculate EVM metrics for a program
 *
 * Standard EVM formulas:
 * - SPI = EV / PV (>1 ahead of schedule, <1 behind schedule)
 * - CPI = EV / AC (>1 under budget, <1 over budget)
 * - CV = EV - AC (positive is under budget, negative is over budget)
 * - SV = EV - PV (positive is ahead of schedule, negative is behind)
 * - EAC = BAC / CPI (Estimate at Completion, assuming current performance continues)
 * - ETC = EAC - AC (Estimate to Complete)
 * - VAC = BAC - EAC (Variance at Completion)
 * - TCPI = (BAC - EV) / (BAC - AC) (To-Complete Performance Index)
 */
export async function calculateEVM(
  auth: OAuth2Client,
  programId: string,
  params: {
    pv: number;   // Planned Value (from schedule baseline)
    ev: number;   // Earned Value (from actual % complete)
    ac: number;   // Actual Cost (from invoices/transactions)
    bac: number;  // Budget at Completion (total budget)
  }
): Promise<EVMSnapshot> {
  const sheets = google.sheets({ version: "v4", auth });

  // Calculate derived metrics
  const spi = params.pv > 0 ? params.ev / params.pv : 0;
  const cpi = params.ac > 0 ? params.ev / params.ac : 0;
  const cv = params.ev - params.ac;
  const sv = params.ev - params.pv;

  // Forecast metrics (using CPI method - assumes current cost performance continues)
  const eac = cpi > 0 ? params.bac / cpi : params.bac;
  const etc = eac - params.ac;
  const vac = params.bac - eac;

  // To-Complete Performance Index (performance needed to meet BAC)
  const tcpi = (params.bac - params.ac) > 0
    ? (params.bac - params.ev) / (params.bac - params.ac)
    : 0;

  const percentComplete = params.bac > 0 ? (params.ev / params.bac) * 100 : 0;

  // Generate snapshot ID
  const range = `${SHEET_NAME}!A2:A`;
  const rows = await readSheetRange(sheets, SPREADSHEET_ID, range);
  const nextId = `EVM-${String(rows.length + 1).padStart(3, "0")}`;

  const snapshot: EVMSnapshot = {
    snapshotId: nextId,
    programId,
    snapshotDate: new Date(),
    pv: params.pv,
    ev: params.ev,
    ac: params.ac,
    bac: params.bac,
    spi,
    cpi,
    cv,
    sv,
    eac,
    etc,
    vac,
    tcpi,
    percentComplete,
  };

  return snapshot;
}

/**
 * Store an EVM snapshot in Google Sheets
 */
export async function storeEVMSnapshot(
  auth: OAuth2Client,
  snapshot: EVMSnapshot
): Promise<EVMSnapshot> {
  const sheets = google.sheets({ version: "v4", auth });

  const row = serializeEVMSnapshot(snapshot);
  await appendRows(sheets, SPREADSHEET_ID, SHEET_NAME, [row]);

  return snapshot;
}

/**
 * Get EVM snapshots for a program
 */
export async function getEVMSnapshots(
  auth: OAuth2Client,
  programId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<EVMSnapshot[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const range = `${SHEET_NAME}!A2:P`;

  const rows = await readSheetRange(sheets, SPREADSHEET_ID, range);

  let snapshots = rows
    .map(parseEVMSnapshot)
    .filter((s) => s.programId === programId);

  // Apply date filters
  if (options?.startDate) {
    snapshots = snapshots.filter((s) => s.snapshotDate >= options.startDate!);
  }
  if (options?.endDate) {
    snapshots = snapshots.filter((s) => s.snapshotDate <= options.endDate!);
  }

  // Sort by date (newest first)
  snapshots.sort((a, b) => b.snapshotDate.getTime() - a.snapshotDate.getTime());

  // Apply limit
  if (options?.limit) {
    snapshots = snapshots.slice(0, options.limit);
  }

  return snapshots;
}

/**
 * Get EVM trend analysis
 */
export async function getEVMTrend(
  auth: OAuth2Client,
  programId: string,
  periods: number = 10
): Promise<{
  snapshots: EVMSnapshot[];
  spiTrend: "improving" | "stable" | "declining";
  cpiTrend: "improving" | "stable" | "declining";
  averageSPI: number;
  averageCPI: number;
  latestSPI: number;
  latestCPI: number;
}> {
  const snapshots = await getEVMSnapshots(auth, programId, { limit: periods });

  if (snapshots.length === 0) {
    return {
      snapshots: [],
      spiTrend: "stable",
      cpiTrend: "stable",
      averageSPI: 0,
      averageCPI: 0,
      latestSPI: 0,
      latestCPI: 0,
    };
  }

  // Calculate averages
  const avgSPI = snapshots.reduce((sum, s) => sum + s.spi, 0) / snapshots.length;
  const avgCPI = snapshots.reduce((sum, s) => sum + s.cpi, 0) / snapshots.length;

  // Get latest values
  const latest = snapshots[0];

  // Determine trends (compare recent half vs older half)
  const midpoint = Math.floor(snapshots.length / 2);
  const recentSnapshots = snapshots.slice(0, midpoint);
  const olderSnapshots = snapshots.slice(midpoint);

  const recentAvgSPI =
    recentSnapshots.reduce((sum, s) => sum + s.spi, 0) / recentSnapshots.length;
  const olderAvgSPI =
    olderSnapshots.reduce((sum, s) => sum + s.spi, 0) / olderSnapshots.length;

  const recentAvgCPI =
    recentSnapshots.reduce((sum, s) => sum + s.cpi, 0) / recentSnapshots.length;
  const olderAvgCPI =
    olderSnapshots.reduce((sum, s) => sum + s.cpi, 0) / olderSnapshots.length;

  // Trend determination (>5% change = improving/declining, else stable)
  const spiChange = ((recentAvgSPI - olderAvgSPI) / olderAvgSPI) * 100;
  const cpiChange = ((recentAvgCPI - olderAvgCPI) / olderAvgCPI) * 100;

  const spiTrend = spiChange > 5 ? "improving" : spiChange < -5 ? "declining" : "stable";
  const cpiTrend = cpiChange > 5 ? "improving" : cpiChange < -5 ? "declining" : "stable";

  return {
    snapshots,
    spiTrend,
    cpiTrend,
    averageSPI: avgSPI,
    averageCPI: avgCPI,
    latestSPI: latest.spi,
    latestCPI: latest.cpi,
  };
}

/**
 * Forecast project completion based on EVM
 */
export async function forecastCompletion(
  auth: OAuth2Client,
  programId: string,
  plannedEndDate: Date
): Promise<{
  forecastedEndDate: Date;
  forecastedCost: number;
  scheduleVarianceDays: number;
  costVariance: number;
  onTrack: boolean;
  recommendations: string[];
}> {
  const snapshots = await getEVMSnapshots(auth, programId, { limit: 1 });

  if (snapshots.length === 0) {
    throw new Error(`No EVM snapshots found for program ${programId}`);
  }

  const latest = snapshots[0];

  // Calculate forecasted end date based on SPI
  // If SPI < 1, we're behind schedule
  // Forecasted duration = Planned duration / SPI
  const today = new Date();
  const plannedDurationDays = Math.ceil(
    (plannedEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const forecastedDurationDays = latest.spi > 0
    ? Math.ceil(plannedDurationDays / latest.spi)
    : plannedDurationDays;

  const forecastedEndDate = new Date(today);
  forecastedEndDate.setDate(forecastedEndDate.getDate() + forecastedDurationDays);

  const scheduleVarianceDays = Math.ceil(
    (forecastedEndDate.getTime() - plannedEndDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Forecasted cost is EAC
  const forecastedCost = latest.eac;
  const costVariance = latest.vac;

  // Determine if on track (SPI > 0.9 and CPI > 0.9)
  const onTrack = latest.spi >= 0.9 && latest.cpi >= 0.9;

  // Generate recommendations
  const recommendations: string[] = [];

  if (latest.spi < 0.9) {
    recommendations.push(
      `Schedule performance is concerning (SPI: ${latest.spi.toFixed(2)}). Consider accelerating critical path activities or adding resources.`
    );
  }

  if (latest.cpi < 0.9) {
    recommendations.push(
      `Cost performance is over budget (CPI: ${latest.cpi.toFixed(2)}). Review spending and identify cost reduction opportunities.`
    );
  }

  if (latest.tcpi > 1.1) {
    recommendations.push(
      `To-Complete Performance Index is ${latest.tcpi.toFixed(2)}, indicating significant improvement needed to meet budget. Consider scope reduction or budget increase.`
    );
  }

  if (latest.spi >= 1.1 && latest.cpi >= 1.1) {
    recommendations.push(
      "Project is performing well ahead of schedule and under budget. Consider opportunities to accelerate delivery or enhance scope."
    );
  }

  return {
    forecastedEndDate,
    forecastedCost,
    scheduleVarianceDays,
    costVariance,
    onTrack,
    recommendations,
  };
}

/**
 * Generate EVM report
 */
export async function generateEVMReport(
  auth: OAuth2Client,
  programId: string
): Promise<{
  currentSnapshot: EVMSnapshot;
  trend: ReturnType<typeof getEVMTrend> extends Promise<infer T> ? T : never;
  forecast: ReturnType<typeof forecastCompletion> extends Promise<infer T> ? T : never;
  health: "green" | "yellow" | "red";
  summary: string;
}> {
  const snapshots = await getEVMSnapshots(auth, programId, { limit: 1 });

  if (snapshots.length === 0) {
    throw new Error(`No EVM snapshots found for program ${programId}`);
  }

  const currentSnapshot = snapshots[0];
  const trend = await getEVMTrend(auth, programId);

  // Use a placeholder date for forecast (replace with actual program end date)
  const plannedEndDate = new Date();
  plannedEndDate.setMonth(plannedEndDate.getMonth() + 6);
  const forecast = await forecastCompletion(auth, programId, plannedEndDate);

  // Determine health
  let health: "green" | "yellow" | "red";
  if (currentSnapshot.spi >= 0.95 && currentSnapshot.cpi >= 0.95) {
    health = "green";
  } else if (currentSnapshot.spi >= 0.85 && currentSnapshot.cpi >= 0.85) {
    health = "yellow";
  } else {
    health = "red";
  }

  // Generate summary
  const summaryParts: string[] = [];
  summaryParts.push(`Program is ${currentSnapshot.percentComplete.toFixed(1)}% complete.`);
  summaryParts.push(
    `Schedule Performance: SPI = ${currentSnapshot.spi.toFixed(2)} (${currentSnapshot.spi >= 1 ? "ahead" : "behind"} schedule).`
  );
  summaryParts.push(
    `Cost Performance: CPI = ${currentSnapshot.cpi.toFixed(2)} (${currentSnapshot.cpi >= 1 ? "under" : "over"} budget).`
  );
  summaryParts.push(
    `Forecasted completion cost: $${currentSnapshot.eac.toLocaleString()} (${currentSnapshot.vac >= 0 ? "under" : "over"} budget by $${Math.abs(currentSnapshot.vac).toLocaleString()}).`
  );

  return {
    currentSnapshot,
    trend,
    forecast,
    health,
    summary: summaryParts.join(" "),
  };
}
