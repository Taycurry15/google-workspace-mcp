/**
 * Decision Log Module
 * Handles decision tracking and documentation
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import type { Decision } from "@gw-mcp/shared-core";
import { appendRows, generateNextId, readSheetRange } from "@gw-mcp/shared-core";

const SPREADSHEET_ID = process.env.PROGRAM_SPREADSHEET_ID || "";

/**
 * Log a decision
 */
export async function logDecision(
  auth: OAuth2Client,
  params: {
    programId: string;
    decision: string;
    context: string;
    alternatives: string[];
    rationale: string;
    decisionMaker: string;
    stakeholders?: string[];
    impacts?: string[];
    category?: "strategic" | "technical" | "operational" | "financial" | "other";
  }
): Promise<Decision> {
  const sheets = google.sheets({ version: "v4", auth });

  const decisionId = await generateNextId(sheets, SPREADSHEET_ID, "Decision Log", "Decision ID", "DEC");

  const decision: Decision = {
    decisionId,
    programId: params.programId,
    decision: params.decision,
    context: params.context,
    alternatives: params.alternatives,
    rationale: params.rationale,
    decisionDate: new Date(),
    decisionMaker: params.decisionMaker,
    stakeholders: params.stakeholders || [],
    impacts: params.impacts || [],
    category: params.category || "operational",
    status: "approved",
    relatedDecisions: [],
  };

  await appendRows(sheets, SPREADSHEET_ID, "Decision Log!A:A", [
    [
      decision.decisionId,
      decision.programId,
      decision.decision,
      decision.context,
      decision.alternatives.join("; "),
      decision.rationale,
      decision.decisionDate.toISOString().split("T")[0],
      decision.decisionMaker,
      decision.stakeholders.join(", "),
      decision.impacts.join("; "),
      decision.category,
      decision.status,
      "", // Review date
    ],
  ]);

  return decision;
}

/**
 * Get decisions for a program
 */
export async function getDecisions(
  auth: OAuth2Client,
  programId: string,
  filters?: {
    category?: string;
    decisionMaker?: string;
  }
): Promise<Decision[]> {
  const sheets = google.sheets({ version: "v4", auth });

  const data = await readSheetRange(sheets, SPREADSHEET_ID, "Decision Log!A:M");

  if (data.length <= 1) {
    return [];
  }

  const decisions: Decision[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] || row[1] !== programId) continue;

    const decision: Decision = {
      decisionId: row[0],
      programId: row[1],
      decision: row[2],
      context: row[3],
      alternatives: row[4] ? row[4].split("; ") : [],
      rationale: row[5],
      decisionDate: new Date(row[6]),
      decisionMaker: row[7],
      stakeholders: row[8] ? row[8].split(", ") : [],
      impacts: row[9] ? row[9].split("; ") : [],
      category: row[10] as any,
      status: row[11] as any,
      reviewDate: row[12] ? new Date(row[12]) : undefined,
      relatedDecisions: [],
    };

    // Apply filters
    if (filters) {
      if (filters.category && decision.category !== filters.category) continue;
      if (filters.decisionMaker && decision.decisionMaker !== filters.decisionMaker) continue;
    }

    decisions.push(decision);
  }

  // Sort by decision date descending
  decisions.sort((a, b) => b.decisionDate.getTime() - a.decisionDate.getTime());

  return decisions;
}
