/**
 * Risk Mitigation Module
 * Handles risk mitigation planning, tracking, and effectiveness
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import type { Risk } from "@gw-mcp/shared-core";
import { appendRows, generateNextId, readSheetRange, updateRow } from "@gw-mcp/shared-core";

const SPREADSHEET_ID = process.env.COMPLIANCE_SPREADSHEET_ID || "";

export interface MitigationAction {
  actionId: string;
  riskId: string;
  programId: string;
  description: string;
  owner: string;
  dueDate: Date;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  effectiveness: number; // 0-100
  cost?: number;
  completedDate?: Date;
  notes?: string;
}

/**
 * Create a mitigation action for a risk
 */
export async function createMitigationAction(
  auth: OAuth2Client,
  params: {
    riskId: string;
    programId: string;
    description: string;
    owner: string;
    dueDate: Date;
    cost?: number;
  }
): Promise<MitigationAction> {
  const sheets = google.sheets({ version: "v4", auth });

  const actionId = await generateNextId(
    sheets,
    SPREADSHEET_ID,
    "Risk Mitigations",
    "Action ID",
    "ACT"
  );

  const action: MitigationAction = {
    actionId,
    riskId: params.riskId,
    programId: params.programId,
    description: params.description,
    owner: params.owner,
    dueDate: params.dueDate,
    status: "planned",
    effectiveness: 0,
    cost: params.cost,
  };

  await appendRows(sheets, SPREADSHEET_ID, "Risk Mitigations!A:A", [
    [
      action.actionId,
      action.riskId,
      action.programId,
      action.description,
      action.owner,
      action.dueDate.toISOString().split("T")[0],
      action.status,
      action.effectiveness,
      action.cost || "",
      "",
      action.notes || "",
    ],
  ]);

  return action;
}

/**
 * Update mitigation action status and effectiveness
 */
export async function updateMitigationAction(
  auth: OAuth2Client,
  actionId: string,
  updates: {
    status?: MitigationAction["status"];
    effectiveness?: number;
    completedDate?: Date;
    notes?: string;
  }
): Promise<boolean> {
  const sheets = google.sheets({ version: "v4", auth });

  const columnMap: Record<string, string> = {
    status: "G",
    effectiveness: "H",
    completedDate: "J",
    notes: "K",
  };

  const updateData: Record<string, any> = {};
  if (updates.status) updateData.status = updates.status;
  if (updates.effectiveness !== undefined)
    updateData.effectiveness = updates.effectiveness;
  if (updates.completedDate)
    updateData.completedDate = updates.completedDate.toISOString().split("T")[0];
  if (updates.notes) updateData.notes = updates.notes;

  return await updateRow(
    sheets,
    SPREADSHEET_ID,
    "Risk Mitigations",
    "Action ID",
    actionId,
    updateData,
    columnMap
  );
}

/**
 * Get mitigation actions for a risk
 */
export async function getMitigationActions(
  auth: OAuth2Client,
  riskId: string
): Promise<MitigationAction[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const data = await readSheetRange(sheets, SPREADSHEET_ID, "Risk Mitigations!A:K");

  if (data.length <= 1) {
    return [];
  }

  const actions: MitigationAction[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] !== riskId) continue;

    actions.push({
      actionId: row[0],
      riskId: row[1],
      programId: row[2],
      description: row[3],
      owner: row[4],
      dueDate: new Date(row[5]),
      status: row[6] as any,
      effectiveness: parseInt(row[7]) || 0,
      cost: row[8] ? parseFloat(row[8]) : undefined,
      completedDate: row[9] ? new Date(row[9]) : undefined,
      notes: row[10] || undefined,
    });
  }

  return actions;
}

/**
 * Calculate overall mitigation effectiveness for a risk
 */
export async function calculateMitigationEffectiveness(
  auth: OAuth2Client,
  riskId: string
): Promise<number> {
  const actions = await getMitigationActions(auth, riskId);
  
  if (actions.length === 0) return 0;

  const completedActions = actions.filter((a) => a.status === "completed");
  if (completedActions.length === 0) return 0;

  const avgEffectiveness =
    completedActions.reduce((sum, a) => sum + a.effectiveness, 0) /
    completedActions.length;

  return Math.round(avgEffectiveness);
}
