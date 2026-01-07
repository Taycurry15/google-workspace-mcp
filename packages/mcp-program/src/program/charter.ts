/**
 * Program Charter Module
 * Handles creation and management of program charters
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import type { Program } from "@gw-mcp/shared-core";
import { appendRows, generateNextId, readSheetRange, updateRow } from "@gw-mcp/shared-core";

const SPREADSHEET_ID = process.env.PROGRAM_SPREADSHEET_ID || "";

/**
 * Create a new program charter
 */
export async function createCharter(
  auth: OAuth2Client,
  params: {
    name: string;
    description: string;
    sponsor: string;
    programManager: string;
    objective: string;
    startDate: Date;
    endDate: Date;
    priority?: "critical" | "high" | "medium" | "low";
    budget?: number;
    stakeholders?: string[];
    tags?: string[];
  }
): Promise<Program> {
  const sheets = google.sheets({ version: "v4", auth });

  // Generate program ID
  const programId = await generateNextId(sheets, SPREADSHEET_ID, "Programs", "Program ID", "PROG");

  const program: Program = {
    programId,
    name: params.name,
    description: params.description,
    sponsor: params.sponsor,
    programManager: params.programManager,
    objective: params.objective,
    startDate: params.startDate,
    endDate: params.endDate,
    status: "initiation",
    priority: params.priority || "medium",
    health: "green",
    percentComplete: 0,
    budget: params.budget,
    spreadsheetId: SPREADSHEET_ID,
    rootFolderId: "", // Will be set when folder structure is created
    stakeholders: params.stakeholders || [],
    tags: params.tags || [],
    createdDate: new Date(),
    modifiedDate: new Date(),
    createdBy: "system",
  };

  // Append to Programs sheet
  await appendRows(sheets, SPREADSHEET_ID, "Programs!A:A", [
    [
      program.programId,
      program.name,
      program.description,
      program.sponsor,
      program.programManager,
      program.objective,
      program.startDate.toISOString().split("T")[0],
      program.endDate.toISOString().split("T")[0],
      "", // Actual start
      "", // Actual end
      program.status,
      program.priority,
      program.health,
      program.percentComplete,
      program.budget || "",
      program.stakeholders.join(", "),
      program.tags.join(", "),
      program.createdDate.toISOString().split("T")[0],
      program.modifiedDate.toISOString().split("T")[0],
    ],
  ]);

  return program;
}

/**
 * Read a program charter
 */
export async function readCharter(
  auth: OAuth2Client,
  programId: string
): Promise<Program | null> {
  const sheets = google.sheets({ version: "v4", auth });

  const data = await readSheetRange(sheets, SPREADSHEET_ID, "Programs!A:S");

  if (data.length === 0) {
    return null;
  }

  const headers = data[0];
  const row = data.find((r) => r[0] === programId);

  if (!row) {
    return null;
  }

  return {
    programId: row[0],
    name: row[1],
    description: row[2],
    sponsor: row[3],
    programManager: row[4],
    objective: row[5],
    startDate: new Date(row[6]),
    endDate: new Date(row[7]),
    actualStartDate: row[8] ? new Date(row[8]) : undefined,
    actualEndDate: row[9] ? new Date(row[9]) : undefined,
    status: row[10] as any,
    priority: row[11] as any,
    health: row[12] as any,
    percentComplete: parseFloat(row[13]) || 0,
    budget: row[14] ? parseFloat(row[14]) : undefined,
    spreadsheetId: SPREADSHEET_ID,
    rootFolderId: "",
    stakeholders: row[15] ? row[15].split(", ") : [],
    tags: row[16] ? row[16].split(", ") : [],
    createdDate: new Date(row[17]),
    modifiedDate: new Date(row[18]),
    createdBy: "system",
  };
}

/**
 * Update a program charter
 */
export async function updateCharter(
  auth: OAuth2Client,
  programId: string,
  updates: Partial<Omit<Program, "programId" | "createdDate" | "createdBy">>
): Promise<boolean> {
  const sheets = google.sheets({ version: "v4", auth });

  const columnMap: Record<string, string> = {
    name: "B",
    description: "C",
    sponsor: "D",
    programManager: "E",
    objective: "F",
    startDate: "G",
    endDate: "H",
    actualStartDate: "I",
    actualEndDate: "J",
    status: "K",
    priority: "L",
    health: "M",
    percentComplete: "N",
    budget: "O",
    stakeholders: "P",
    tags: "Q",
    modifiedDate: "S",
  };

  // Always update modified date
  const updateData: Record<string, any> = {
    ...updates,
    modifiedDate: new Date().toISOString().split("T")[0],
  };

  // Convert arrays to comma-separated strings
  if (updates.stakeholders) {
    updateData.stakeholders = updates.stakeholders.join(", ");
  }
  if (updates.tags) {
    updateData.tags = updates.tags.join(", ");
  }

  // Convert dates to ISO strings
  if (updates.startDate) {
    updateData.startDate = updates.startDate.toISOString().split("T")[0];
  }
  if (updates.endDate) {
    updateData.endDate = updates.endDate.toISOString().split("T")[0];
  }
  if (updates.actualStartDate) {
    updateData.actualStartDate = updates.actualStartDate.toISOString().split("T")[0];
  }
  if (updates.actualEndDate) {
    updateData.actualEndDate = updates.actualEndDate.toISOString().split("T")[0];
  }

  return await updateRow(
    sheets,
    SPREADSHEET_ID,
    "Programs",
    "Program ID",
    programId,
    updateData,
    columnMap
  );
}

/**
 * List all programs
 */
export async function listCharters(
  auth: OAuth2Client,
  filters?: {
    status?: string;
    priority?: string;
    health?: string;
  }
): Promise<Program[]> {
  const sheets = google.sheets({ version: "v4", auth });

  const data = await readSheetRange(sheets, SPREADSHEET_ID, "Programs!A:S");

  if (data.length <= 1) {
    return [];
  }

  const programs: Program[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const program: Program = {
      programId: row[0],
      name: row[1],
      description: row[2],
      sponsor: row[3],
      programManager: row[4],
      objective: row[5],
      startDate: new Date(row[6]),
      endDate: new Date(row[7]),
      actualStartDate: row[8] ? new Date(row[8]) : undefined,
      actualEndDate: row[9] ? new Date(row[9]) : undefined,
      status: row[10] as any,
      priority: row[11] as any,
      health: row[12] as any,
      percentComplete: parseFloat(row[13]) || 0,
      budget: row[14] ? parseFloat(row[14]) : undefined,
      spreadsheetId: SPREADSHEET_ID,
      rootFolderId: "",
      stakeholders: row[15] ? row[15].split(", ") : [],
      tags: row[16] ? row[16].split(", ") : [],
      createdDate: new Date(row[17]),
      modifiedDate: new Date(row[18]),
      createdBy: "system",
    };

    // Apply filters
    if (filters) {
      if (filters.status && program.status !== filters.status) continue;
      if (filters.priority && program.priority !== filters.priority) continue;
      if (filters.health && program.health !== filters.health) continue;
    }

    programs.push(program);
  }

  return programs;
}
