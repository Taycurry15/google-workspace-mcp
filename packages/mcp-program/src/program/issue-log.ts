/**
 * Issue Log Module
 * Handles issue tracking and management
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import type { Issue } from "@gw-mcp/shared-core";
import { appendRows, generateNextId, readSheetRange, updateRow } from "@gw-mcp/shared-core";

const SPREADSHEET_ID = process.env.PROGRAM_SPREADSHEET_ID || "";

/**
 * Log a new issue
 */
export async function logIssue(
  auth: OAuth2Client,
  params: {
    programId: string;
    projectId?: string;
    title: string;
    description: string;
    category: "technical" | "resource" | "schedule" | "quality" | "stakeholder" | "other";
    priority: "critical" | "high" | "medium" | "low";
    severity: "critical" | "major" | "minor";
    raisedBy: string;
    impact: string;
  }
): Promise<Issue> {
  const sheets = google.sheets({ version: "v4", auth });

  const issueId = await generateNextId(sheets, SPREADSHEET_ID, "Issue Log", "Issue ID", "ISS");

  const issue: Issue = {
    issueId,
    programId: params.programId,
    projectId: params.projectId,
    title: params.title,
    description: params.description,
    category: params.category,
    priority: params.priority,
    severity: params.severity,
    status: "open",
    raisedBy: params.raisedBy,
    raisedDate: new Date(),
    relatedIssues: [],
    relatedRisks: [],
    escalated: false,
    impact: params.impact,
  };

  await appendRows(sheets, SPREADSHEET_ID, "Issue Log!A:A", [
    [
      issue.issueId,
      issue.programId,
      issue.projectId || "",
      issue.title,
      issue.description,
      issue.category,
      issue.priority,
      issue.severity,
      issue.status,
      issue.raisedBy,
      issue.raisedDate.toISOString().split("T")[0],
      "", // Assigned to
      "", // Due date
      "", // Resolution
      "", // Resolved date
    ],
  ]);

  return issue;
}

/**
 * Track issue resolution
 */
export async function trackIssue(
  auth: OAuth2Client,
  issueId: string,
  params: {
    status?: "open" | "in_progress" | "resolved" | "closed" | "escalated";
    assignedTo?: string;
    resolution?: string;
    resolvedDate?: Date;
  }
): Promise<boolean> {
  const sheets = google.sheets({ version: "v4", auth });

  const columnMap: Record<string, string> = {
    status: "I",
    assignedTo: "L",
    resolution: "N",
    resolvedDate: "O",
  };

  const updateData: Record<string, any> = {};

  if (params.status) updateData.status = params.status;
  if (params.assignedTo) updateData.assignedTo = params.assignedTo;
  if (params.resolution) updateData.resolution = params.resolution;
  if (params.resolvedDate)
    updateData.resolvedDate = params.resolvedDate.toISOString().split("T")[0];

  return await updateRow(
    sheets,
    SPREADSHEET_ID,
    "Issue Log",
    "Issue ID",
    issueId,
    updateData,
    columnMap
  );
}

/**
 * Get issues for a program
 */
export async function getIssues(
  auth: OAuth2Client,
  programId: string,
  filters?: {
    status?: string;
    priority?: string;
    severity?: string;
  }
): Promise<Issue[]> {
  const sheets = google.sheets({ version: "v4", auth });

  const data = await readSheetRange(sheets, SPREADSHEET_ID, "Issue Log!A:O");

  if (data.length <= 1) {
    return [];
  }

  const issues: Issue[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] || row[1] !== programId) continue;

    const issue: Issue = {
      issueId: row[0],
      programId: row[1],
      projectId: row[2] || undefined,
      title: row[3],
      description: row[4],
      category: row[5] as any,
      priority: row[6] as any,
      severity: row[7] as any,
      status: row[8] as any,
      raisedBy: row[9],
      raisedDate: new Date(row[10]),
      assignedTo: row[11] || undefined,
      dueDate: row[12] ? new Date(row[12]) : undefined,
      resolution: row[13] || undefined,
      resolvedDate: row[14] ? new Date(row[14]) : undefined,
      relatedIssues: [],
      relatedRisks: [],
      escalated: false,
      impact: row[4], // Using description as impact
    };

    // Apply filters
    if (filters) {
      if (filters.status && issue.status !== filters.status) continue;
      if (filters.priority && issue.priority !== filters.priority) continue;
      if (filters.severity && issue.severity !== filters.severity) continue;
    }

    issues.push(issue);
  }

  return issues;
}
