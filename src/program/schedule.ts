/**
 * Schedule Management Module
 * Handles schedule activities, critical path analysis, and variance detection
 * Phase 4 - Week 4 Implementation
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import type { ScheduleActivity, ProgramStatus } from "../types/program.js";
import { appendRows, generateNextId, readSheetRange, updateRow } from "../utils/sheetHelpers.js";

const SPREADSHEET_ID = process.env.PROGRAM_SPREADSHEET_ID || "";
const SHEET_NAME = "Schedule Activities";

/**
 * Column mapping for Schedule Activities sheet
 */
const COLUMN_MAP = {
  activityId: 0,
  programId: 1,
  wbsCode: 2,
  name: 3,
  description: 4,
  startDate: 5,
  endDate: 6,
  duration: 7,
  actualStart: 8,
  actualEnd: 9,
  percentComplete: 10,
  dependencies: 11, // Comma-separated activity IDs
  responsible: 12,
  status: 13,
  critical: 14,
};

/**
 * Parse a row from the sheet into a ScheduleActivity object
 */
function parseScheduleActivity(row: any[]): ScheduleActivity {
  return {
    activityId: row[COLUMN_MAP.activityId] || "",
    programId: row[COLUMN_MAP.programId] || "",
    wbsCode: row[COLUMN_MAP.wbsCode] || undefined,
    name: row[COLUMN_MAP.name] || "",
    description: row[COLUMN_MAP.description] || "",
    startDate: row[COLUMN_MAP.startDate] ? new Date(row[COLUMN_MAP.startDate]) : new Date(),
    endDate: row[COLUMN_MAP.endDate] ? new Date(row[COLUMN_MAP.endDate]) : new Date(),
    duration: parseInt(row[COLUMN_MAP.duration]) || 0,
    actualStart: row[COLUMN_MAP.actualStart] ? new Date(row[COLUMN_MAP.actualStart]) : undefined,
    actualEnd: row[COLUMN_MAP.actualEnd] ? new Date(row[COLUMN_MAP.actualEnd]) : undefined,
    percentComplete: parseInt(row[COLUMN_MAP.percentComplete]) || 0,
    dependencies: row[COLUMN_MAP.dependencies]
      ? row[COLUMN_MAP.dependencies].split(",").map((id: string) => id.trim()).filter(Boolean)
      : [],
    responsible: row[COLUMN_MAP.responsible] || "",
    status: (row[COLUMN_MAP.status] as ProgramStatus) || "planning",
    critical: row[COLUMN_MAP.critical] === "TRUE" || row[COLUMN_MAP.critical] === true,
  };
}

/**
 * Serialize a ScheduleActivity object to a sheet row
 */
function serializeScheduleActivity(activity: ScheduleActivity): any[] {
  const row = new Array(Object.keys(COLUMN_MAP).length).fill("");

  row[COLUMN_MAP.activityId] = activity.activityId;
  row[COLUMN_MAP.programId] = activity.programId;
  row[COLUMN_MAP.wbsCode] = activity.wbsCode || "";
  row[COLUMN_MAP.name] = activity.name;
  row[COLUMN_MAP.description] = activity.description;
  row[COLUMN_MAP.startDate] = activity.startDate.toISOString().split("T")[0];
  row[COLUMN_MAP.endDate] = activity.endDate.toISOString().split("T")[0];
  row[COLUMN_MAP.duration] = activity.duration;
  row[COLUMN_MAP.actualStart] = activity.actualStart
    ? activity.actualStart.toISOString().split("T")[0]
    : "";
  row[COLUMN_MAP.actualEnd] = activity.actualEnd
    ? activity.actualEnd.toISOString().split("T")[0]
    : "";
  row[COLUMN_MAP.percentComplete] = activity.percentComplete;
  row[COLUMN_MAP.dependencies] = activity.dependencies.join(", ");
  row[COLUMN_MAP.responsible] = activity.responsible;
  row[COLUMN_MAP.status] = activity.status;
  row[COLUMN_MAP.critical] = activity.critical;

  return row;
}

/**
 * Create a schedule activity
 */
export async function createScheduleActivity(
  auth: OAuth2Client,
  params: {
    programId: string;
    wbsCode?: string;
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    duration: number;
    dependencies?: string[];
    responsible: string;
    status?: ProgramStatus;
  }
): Promise<ScheduleActivity> {
  const sheets = google.sheets({ version: "v4", auth });

  const activityId = await generateNextId(
    sheets,
    SPREADSHEET_ID,
    SHEET_NAME,
    "Activity ID",
    "SA"
  );

  const activity: ScheduleActivity = {
    activityId,
    programId: params.programId,
    wbsCode: params.wbsCode,
    name: params.name,
    description: params.description,
    startDate: params.startDate,
    endDate: params.endDate,
    duration: params.duration,
    percentComplete: 0,
    dependencies: params.dependencies || [],
    responsible: params.responsible,
    status: params.status || "planning",
    critical: false, // Will be calculated by critical path analysis
  };

  const row = serializeScheduleActivity(activity);
  await appendRows(sheets, SPREADSHEET_ID, SHEET_NAME, [row]);

  return activity;
}

/**
 * Read a schedule activity by ID
 */
export async function readScheduleActivity(
  auth: OAuth2Client,
  activityId: string
): Promise<ScheduleActivity | null> {
  const sheets = google.sheets({ version: "v4", auth });
  const range = `${SHEET_NAME}!A2:O`;

  const rows = await readSheetRange(sheets, SPREADSHEET_ID, range);

  const activityRow = rows.find((row) => row[COLUMN_MAP.activityId] === activityId);

  if (!activityRow) {
    return null;
  }

  return parseScheduleActivity(activityRow);
}

/**
 * Update a schedule activity
 */
export async function updateScheduleActivity(
  auth: OAuth2Client,
  activityId: string,
  updates: Partial<ScheduleActivity>
): Promise<ScheduleActivity> {
  const sheets = google.sheets({ version: "v4", auth });

  // Column map for updates (field -> column letter)
  const columnMap: Record<string, string> = {
    wbsCode: "C",
    name: "D",
    description: "E",
    startDate: "F",
    endDate: "G",
    duration: "H",
    actualStart: "I",
    actualEnd: "J",
    percentComplete: "K",
    dependencies: "L",
    responsible: "M",
    status: "N",
    critical: "O",
  };

  // Prepare update data (convert types as needed)
  const updateData: Record<string, any> = {};
  if (updates.wbsCode !== undefined) updateData.wbsCode = updates.wbsCode;
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.startDate) updateData.startDate = updates.startDate.toISOString().split("T")[0];
  if (updates.endDate) updateData.endDate = updates.endDate.toISOString().split("T")[0];
  if (updates.duration !== undefined) updateData.duration = updates.duration;
  if (updates.actualStart) updateData.actualStart = updates.actualStart.toISOString().split("T")[0];
  if (updates.actualEnd) updateData.actualEnd = updates.actualEnd.toISOString().split("T")[0];
  if (updates.percentComplete !== undefined) updateData.percentComplete = updates.percentComplete;
  if (updates.dependencies) updateData.dependencies = updates.dependencies.join(", ");
  if (updates.responsible !== undefined) updateData.responsible = updates.responsible;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.critical !== undefined) updateData.critical = updates.critical;

  await updateRow(
    sheets,
    SPREADSHEET_ID,
    SHEET_NAME,
    "Activity ID",
    activityId,
    updateData,
    columnMap
  );

  // Read and return the updated activity
  const updatedActivity = await readScheduleActivity(auth, activityId);
  if (!updatedActivity) {
    throw new Error(`Failed to read updated activity: ${activityId}`);
  }

  return updatedActivity;
}

/**
 * List schedule activities with optional filters
 */
export async function listScheduleActivities(
  auth: OAuth2Client,
  filters?: {
    programId?: string;
    wbsCode?: string;
    status?: ProgramStatus;
    critical?: boolean;
    responsible?: string;
  }
): Promise<ScheduleActivity[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const range = `${SHEET_NAME}!A2:O`;

  const rows = await readSheetRange(sheets, SPREADSHEET_ID, range);

  let activities = rows.map(parseScheduleActivity);

  // Apply filters
  if (filters?.programId) {
    activities = activities.filter((a) => a.programId === filters.programId);
  }
  if (filters?.wbsCode) {
    activities = activities.filter((a) => a.wbsCode === filters.wbsCode);
  }
  if (filters?.status) {
    activities = activities.filter((a) => a.status === filters.status);
  }
  if (filters?.critical !== undefined) {
    activities = activities.filter((a) => a.critical === filters.critical);
  }
  if (filters?.responsible) {
    activities = activities.filter((a) => a.responsible === filters.responsible);
  }

  return activities;
}

/**
 * Calculate critical path for a program's schedule
 * Uses Critical Path Method (CPM) algorithm
 */
export async function calculateCriticalPath(
  auth: OAuth2Client,
  programId: string
): Promise<{
  criticalPath: string[];
  criticalActivities: ScheduleActivity[];
  totalDuration: number;
}> {
  const activities = await listScheduleActivities(auth, { programId });

  if (activities.length === 0) {
    return {
      criticalPath: [],
      criticalActivities: [],
      totalDuration: 0,
    };
  }

  // Build activity map
  const activityMap = new Map(activities.map((a) => [a.activityId, a]));

  // Calculate Early Start (ES) and Early Finish (EF) - Forward Pass
  const ES = new Map<string, number>();
  const EF = new Map<string, number>();

  function calculateEarlyTimes(activityId: string): void {
    if (ES.has(activityId)) return; // Already calculated

    const activity = activityMap.get(activityId)!;

    if (activity.dependencies.length === 0) {
      ES.set(activityId, 0);
      EF.set(activityId, activity.duration);
    } else {
      // Calculate ES as max EF of all predecessors
      let maxEF = 0;
      for (const depId of activity.dependencies) {
        if (activityMap.has(depId)) {
          calculateEarlyTimes(depId);
          maxEF = Math.max(maxEF, EF.get(depId) || 0);
        }
      }
      ES.set(activityId, maxEF);
      EF.set(activityId, maxEF + activity.duration);
    }
  }

  // Calculate early times for all activities
  activities.forEach((activity) => calculateEarlyTimes(activity.activityId));

  // Find project completion time (max EF)
  const projectDuration = Math.max(...Array.from(EF.values()));

  // Calculate Late Start (LS) and Late Finish (LF) - Backward Pass
  const LS = new Map<string, number>();
  const LF = new Map<string, number>();

  // Find activities with no successors (end activities)
  const hasSuccessor = new Set<string>();
  activities.forEach((activity) => {
    activity.dependencies.forEach((depId) => hasSuccessor.add(depId));
  });

  const endActivities = activities.filter((a) => !hasSuccessor.has(a.activityId));

  // Set LF for end activities to project duration
  endActivities.forEach((activity) => {
    LF.set(activity.activityId, projectDuration);
    LS.set(activity.activityId, projectDuration - activity.duration);
  });

  // Calculate late times for remaining activities
  function calculateLateTimes(activityId: string): void {
    if (LS.has(activityId)) return; // Already calculated

    const activity = activityMap.get(activityId)!;

    // Find all successors (activities that depend on this one)
    const successors = activities.filter((a) => a.dependencies.includes(activityId));

    if (successors.length === 0) {
      // End activity
      LF.set(activityId, projectDuration);
      LS.set(activityId, projectDuration - activity.duration);
    } else {
      // Calculate LF as min LS of all successors
      let minLS = Infinity;
      for (const successor of successors) {
        calculateLateTimes(successor.activityId);
        minLS = Math.min(minLS, LS.get(successor.activityId) || Infinity);
      }
      LF.set(activityId, minLS);
      LS.set(activityId, minLS - activity.duration);
    }
  }

  activities.forEach((activity) => calculateLateTimes(activity.activityId));

  // Calculate slack/float and identify critical path
  const slack = new Map<string, number>();
  const criticalActivityIds: string[] = [];

  activities.forEach((activity) => {
    const activitySlack = (LS.get(activity.activityId) || 0) - (ES.get(activity.activityId) || 0);
    slack.set(activity.activityId, activitySlack);

    if (activitySlack === 0) {
      criticalActivityIds.push(activity.activityId);
    }
  });

  const criticalActivities = criticalActivityIds
    .map((id) => activityMap.get(id)!)
    .filter(Boolean);

  // Update critical flag in sheet
  const sheets = google.sheets({ version: "v4", auth });
  for (const activity of activities) {
    const isCritical = criticalActivityIds.includes(activity.activityId);
    if (activity.critical !== isCritical) {
      await updateScheduleActivity(auth, activity.activityId, { critical: isCritical });
    }
  }

  return {
    criticalPath: criticalActivityIds,
    criticalActivities,
    totalDuration: projectDuration,
  };
}

/**
 * Detect schedule variance for activities
 * Compares actual vs planned dates and calculates variance
 */
export async function detectScheduleVariance(
  auth: OAuth2Client,
  programId: string
): Promise<{
  totalActivities: number;
  onTrack: number;
  ahead: number;
  behind: number;
  variances: Array<{
    activityId: string;
    activityName: string;
    plannedDuration: number;
    actualDuration?: number;
    varianceDays: number;
    percentVariance: number;
    status: "on_track" | "ahead" | "behind" | "not_started";
  }>;
}> {
  const activities = await listScheduleActivities(auth, { programId });
  const now = new Date();

  let onTrack = 0;
  let ahead = 0;
  let behind = 0;

  const variances = activities.map((activity) => {
    const plannedDuration = activity.duration;
    let actualDuration: number | undefined;
    let varianceDays = 0;
    let status: "on_track" | "ahead" | "behind" | "not_started" = "not_started";

    if (activity.actualStart && activity.actualEnd) {
      // Activity completed
      actualDuration = Math.ceil(
        (activity.actualEnd.getTime() - activity.actualStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      varianceDays = actualDuration - plannedDuration;

      if (varianceDays < 0) {
        status = "ahead";
        ahead++;
      } else if (varianceDays > 0) {
        status = "behind";
        behind++;
      } else {
        status = "on_track";
        onTrack++;
      }
    } else if (activity.actualStart) {
      // Activity in progress
      const daysElapsed = Math.ceil(
        (now.getTime() - activity.actualStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const expectedProgress = (daysElapsed / plannedDuration) * 100;

      if (activity.percentComplete >= expectedProgress) {
        status = "on_track";
        onTrack++;
      } else if (activity.percentComplete < expectedProgress - 10) {
        status = "behind";
        behind++;
        varianceDays = Math.ceil((expectedProgress - activity.percentComplete) / 100 * plannedDuration);
      } else {
        status = "on_track";
        onTrack++;
      }
    } else if (now > activity.startDate) {
      // Should have started but hasn't
      status = "behind";
      behind++;
      varianceDays = Math.ceil((now.getTime() - activity.startDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    const percentVariance = plannedDuration > 0 ? (varianceDays / plannedDuration) * 100 : 0;

    return {
      activityId: activity.activityId,
      activityName: activity.name,
      plannedDuration,
      actualDuration,
      varianceDays,
      percentVariance,
      status,
    };
  });

  return {
    totalActivities: activities.length,
    onTrack,
    ahead,
    behind,
    variances,
  };
}

/**
 * Get schedule summary for a program
 */
export async function getScheduleSummary(
  auth: OAuth2Client,
  programId: string
): Promise<{
  totalActivities: number;
  statusBreakdown: Record<ProgramStatus, number>;
  criticalActivities: number;
  overallProgress: number;
  health: "green" | "yellow" | "red";
}> {
  const activities = await listScheduleActivities(auth, { programId });

  const statusBreakdown: Record<string, number> = {};
  let totalProgress = 0;
  let criticalCount = 0;

  activities.forEach((activity) => {
    statusBreakdown[activity.status] = (statusBreakdown[activity.status] || 0) + 1;
    totalProgress += activity.percentComplete;
    if (activity.critical) criticalCount++;
  });

  const overallProgress = activities.length > 0 ? totalProgress / activities.length : 0;

  // Determine health based on variance
  const variance = await detectScheduleVariance(auth, programId);
  let health: "green" | "yellow" | "red" = "green";

  const behindPercent = (variance.behind / variance.totalActivities) * 100;
  if (behindPercent > 30) {
    health = "red";
  } else if (behindPercent > 15) {
    health = "yellow";
  }

  return {
    totalActivities: activities.length,
    statusBreakdown: statusBreakdown as Record<ProgramStatus, number>,
    criticalActivities: criticalCount,
    overallProgress,
    health,
  };
}
