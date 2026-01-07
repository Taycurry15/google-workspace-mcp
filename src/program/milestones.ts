/**
 * Milestones Module
 * Handles milestone tracking and management
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import type { Milestone } from "../types/program.js";
import { appendRows, generateNextId, readSheetRange, updateRow } from "../utils/sheetHelpers.js";
import { getDefaultEventBus } from "@gw-mcp/shared-workflows";

const SPREADSHEET_ID = process.env.PROGRAM_SPREADSHEET_ID || "";

/**
 * Create a milestone
 */
export async function createMilestone(
  auth: OAuth2Client,
  params: {
    programId: string;
    projectId?: string;
    wbsCode?: string;
    name: string;
    description: string;
    targetDate: Date;
    owner: string;
    acceptanceCriteria: string;
    critical?: boolean;
    deliverables?: string[];
  }
): Promise<Milestone> {
  const sheets = google.sheets({ version: "v4", auth });

  const milestoneId = await generateNextId(sheets, SPREADSHEET_ID, "Milestones", "Milestone ID", "M");

  const milestone: Milestone = {
    milestoneId,
    programId: params.programId,
    projectId: params.projectId,
    wbsCode: params.wbsCode,
    name: params.name,
    description: params.description,
    targetDate: params.targetDate,
    status: "not_started",
    owner: params.owner,
    dependencies: [],
    deliverables: params.deliverables || [],
    acceptanceCriteria: params.acceptanceCriteria,
    health: "green",
    critical: params.critical || false,
  };

  await appendRows(sheets, SPREADSHEET_ID, "Milestones!A:A", [
    [
      milestone.milestoneId,
      milestone.programId,
      milestone.projectId || "",
      milestone.wbsCode || "",
      milestone.name,
      milestone.description,
      milestone.targetDate.toISOString().split("T")[0],
      "", // Forecast date
      "", // Actual date
      "", // Variance (formula)
      milestone.status,
      milestone.owner,
      milestone.critical ? "Yes" : "No",
      milestone.deliverables.join(", "),
      milestone.acceptanceCriteria,
    ],
  ]);

  // Emit milestone_created event
  const eventBus = getDefaultEventBus();
  await eventBus.publish({
    eventType: "milestone_created",
    source: "program_milestones",
    timestamp: new Date(),
    programId: milestone.programId,
    data: {
      milestoneId: milestone.milestoneId,
      name: milestone.name,
      targetDate: milestone.targetDate,
      owner: milestone.owner,
      critical: milestone.critical,
    },
  });

  return milestone;
}

/**
 * Track milestone status
 */
export async function trackMilestone(
  auth: OAuth2Client,
  milestoneId: string,
  params: {
    status?: "not_started" | "in_progress" | "at_risk" | "achieved" | "missed";
    actualDate?: Date;
    forecastDate?: Date;
    health?: "green" | "amber" | "red";
  }
): Promise<boolean> {
  const sheets = google.sheets({ version: "v4", auth });

  const columnMap: Record<string, string> = {
    status: "K",
    forecastDate: "H",
    actualDate: "I",
    health: "M", // Not in original schema but useful
  };

  const updateData: Record<string, any> = {};

  if (params.status) updateData.status = params.status;
  if (params.forecastDate)
    updateData.forecastDate = params.forecastDate.toISOString().split("T")[0];
  if (params.actualDate) updateData.actualDate = params.actualDate.toISOString().split("T")[0];

  const result = await updateRow(
    sheets,
    SPREADSHEET_ID,
    "Milestones",
    "Milestone ID",
    milestoneId,
    updateData,
    columnMap
  );

  // Emit event if milestone was achieved
  if (params.status === "achieved") {
    // Read milestone details for event payload
    // TODO: Fix - getMilestones needs programId parameter
    const milestones = await getMilestones(auth, ""); // Temporary workaround
    if (milestones.length > 0) {
      const milestone = milestones[0];

      const eventBus = getDefaultEventBus();
      await eventBus.publish({
        eventType: "milestone_achieved",
        source: "program_milestones",
        timestamp: new Date(),
        programId: milestone.programId,
        data: {
          milestoneId: milestone.milestoneId,
          name: milestone.name,
          owner: milestone.owner,
          actualDate: params.actualDate || new Date(),
          critical: milestone.critical,
          deliverables: milestone.deliverables,
        },
      });
    }
  }

  // Emit event if milestone is at risk
  if (params.status === "at_risk") {
    // TODO: Fix - getMilestones needs programId parameter
    const milestones = await getMilestones(auth, ""); // Temporary workaround
    if (milestones.length > 0) {
      const milestone = milestones[0];

      const eventBus = getDefaultEventBus();
      await eventBus.publish({
        eventType: "milestone_at_risk",
        source: "program_milestones",
        timestamp: new Date(),
        programId: milestone.programId,
        data: {
          milestoneId: milestone.milestoneId,
          name: milestone.name,
          owner: milestone.owner,
          targetDate: milestone.targetDate,
          critical: milestone.critical,
        },
      });
    }
  }

  return result;
}

/**
 * Get milestones for a program
 */
export async function getMilestones(
  auth: OAuth2Client,
  programId: string,
  filters?: {
    status?: string;
    critical?: boolean;
    upcoming?: boolean; // Next 30 days
  }
): Promise<Milestone[]> {
  const sheets = google.sheets({ version: "v4", auth });

  const data = await readSheetRange(sheets, SPREADSHEET_ID, "Milestones!A:O");

  if (data.length <= 1) {
    return [];
  }

  const milestones: Milestone[] = [];
  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] || row[1] !== programId) continue;

    const targetDate = new Date(row[6]);

    const milestone: Milestone = {
      milestoneId: row[0],
      programId: row[1],
      projectId: row[2] || undefined,
      wbsCode: row[3] || undefined,
      name: row[4],
      description: row[5],
      targetDate,
      forecastDate: row[7] ? new Date(row[7]) : undefined,
      actualDate: row[8] ? new Date(row[8]) : undefined,
      status: row[10] as any,
      owner: row[11],
      dependencies: [],
      deliverables: row[13] ? row[13].split(", ") : [],
      acceptanceCriteria: row[14],
      health: "green",
      critical: row[12] === "Yes",
    };

    // Apply filters
    if (filters) {
      if (filters.status && milestone.status !== filters.status) continue;
      if (filters.critical !== undefined && milestone.critical !== filters.critical) continue;
      if (filters.upcoming && (targetDate < now || targetDate > thirtyDaysOut)) continue;
    }

    milestones.push(milestone);
  }

  // Sort by target date
  milestones.sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime());

  return milestones;
}
