/**
 * Audit Trail Module
 * Logs all system actions for audit purposes
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { appendRows, readSheetRange } from "@gw-mcp/shared-core";

const SPREADSHEET_ID = process.env.COMPLIANCE_SPREADSHEET_ID || "";

export interface AuditLogEntry {
  timestamp: Date;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  programId?: string;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit trail entry
 */
export async function logAudit(
  auth: OAuth2Client,
  entry: Omit<AuditLogEntry, "timestamp">
): Promise<void> {
  const sheets = google.sheets({ version: "v4", auth });

  await appendRows(sheets, SPREADSHEET_ID, "Audit Trail!A:A", [
    [
      new Date().toISOString(),
      entry.userId,
      entry.action,
      entry.entityType,
      entry.entityId,
      entry.programId || "",
      entry.changes ? JSON.stringify(entry.changes) : "",
      entry.ipAddress || "",
      entry.userAgent || "",
    ],
  ]);
}

/**
 * Get audit trail for an entity
 */
export async function getAuditTrail(
  auth: OAuth2Client,
  entityId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    action?: string;
  }
): Promise<AuditLogEntry[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const data = await readSheetRange(sheets, SPREADSHEET_ID, "Audit Trail!A:I");

  if (data.length <= 1) {
    return [];
  }

  const entries: AuditLogEntry[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[4] !== entityId) continue;

    const entry: AuditLogEntry = {
      timestamp: new Date(row[0]),
      userId: row[1],
      action: row[2],
      entityType: row[3],
      entityId: row[4],
      programId: row[5] || undefined,
      changes: row[6] ? JSON.parse(row[6]) : undefined,
      ipAddress: row[7] || undefined,
      userAgent: row[8] || undefined,
    };

    if (options) {
      if (options.startDate && entry.timestamp < options.startDate) continue;
      if (options.endDate && entry.timestamp > options.endDate) continue;
      if (options.action && entry.action !== options.action) continue;
    }

    entries.push(entry);
  }

  return entries;
}

/**
 * Generate audit report for a program
 */
export async function generateAuditReport(
  auth: OAuth2Client,
  programId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  programId: string;
  totalActions: number;
  actionsByType: Record<string, number>;
  topUsers: Array<{ userId: string; actionCount: number }>;
}> {
  const sheets = google.sheets({ version: "v4", auth });
  const data = await readSheetRange(sheets, SPREADSHEET_ID, "Audit Trail!A:I");

  const actions: AuditLogEntry[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[5] !== programId) continue;

    const timestamp = new Date(row[0]);
    if (timestamp < startDate || timestamp > endDate) continue;

    actions.push({
      timestamp,
      userId: row[1],
      action: row[2],
      entityType: row[3],
      entityId: row[4],
      programId: row[5],
    });
  }

  const actionsByType: Record<string, number> = {};
  const userCounts: Record<string, number> = {};

  for (const action of actions) {
    actionsByType[action.action] = (actionsByType[action.action] || 0) + 1;
    userCounts[action.userId] = (userCounts[action.userId] || 0) + 1;
  }

  const topUsers = Object.entries(userCounts)
    .map(([userId, actionCount]) => ({ userId, actionCount }))
    .sort((a, b) => b.actionCount - a.actionCount)
    .slice(0, 10);

  return {
    programId,
    totalActions: actions.length,
    actionsByType,
    topUsers,
  };
}
