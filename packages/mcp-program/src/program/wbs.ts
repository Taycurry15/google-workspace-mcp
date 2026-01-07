/**
 * Work Breakdown Structure (WBS) Module
 * Handles hierarchical work breakdown structure management
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import type { WBS } from "@gw-mcp/shared-core";
import { appendRows, readSheetRange } from "@gw-mcp/shared-core";

const SPREADSHEET_ID = process.env.PROGRAM_SPREADSHEET_ID || "";

/**
 * Create a WBS element
 */
export async function createWBS(
  auth: OAuth2Client,
  params: {
    wbsCode: string;
    programId: string;
    parentCode?: string;
    description: string;
    responsible: string;
    deliverables?: string[];
  }
): Promise<WBS> {
  const sheets = google.sheets({ version: "v4", auth });

  // Calculate level from WBS code (e.g., "1.2.3" = level 3)
  const level = params.wbsCode.split(".").length;

  const wbs: WBS = {
    wbsCode: params.wbsCode,
    programId: params.programId,
    parentCode: params.parentCode,
    level,
    description: params.description,
    deliverables: params.deliverables || [],
    responsible: params.responsible,
    status: "planning",
    percentComplete: 0,
  };

  await appendRows(sheets, SPREADSHEET_ID, "WBS!A:A", [
    [
      wbs.wbsCode,
      wbs.programId,
      wbs.parentCode || "",
      wbs.level,
      wbs.description,
      wbs.deliverables.join(", "),
      wbs.responsible,
      wbs.percentComplete,
      wbs.status,
    ],
  ]);

  return wbs;
}

/**
 * Read WBS hierarchy for a program
 */
export async function readWBS(
  auth: OAuth2Client,
  programId: string,
  level?: number
): Promise<WBS[]> {
  const sheets = google.sheets({ version: "v4", auth });

  const data = await readSheetRange(sheets, SPREADSHEET_ID, "WBS!A:I");

  if (data.length <= 1) {
    return [];
  }

  const wbsElements: WBS[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] || row[1] !== programId) continue;

    const wbsLevel = parseInt(row[3]) || 1;
    if (level !== undefined && wbsLevel !== level) continue;

    wbsElements.push({
      wbsCode: row[0],
      programId: row[1],
      parentCode: row[2] || undefined,
      level: wbsLevel,
      description: row[4],
      deliverables: row[5] ? row[5].split(", ") : [],
      responsible: row[6],
      percentComplete: parseFloat(row[7]) || 0,
      status: row[8] as any,
    });
  }

  // Sort by WBS code
  wbsElements.sort((a, b) => {
    const aParts = a.wbsCode.split(".").map(Number);
    const bParts = b.wbsCode.split(".").map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0;
      const bVal = bParts[i] || 0;
      if (aVal !== bVal) return aVal - bVal;
    }

    return 0;
  });

  return wbsElements;
}
