/**
 * Governance Module
 * Handles governance meetings, action items, and meeting minutes
 * Phase 4 - Week 5 Implementation
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import type { GovernanceMeeting, ActionItem } from "../types/program.js";
import { appendRows, generateNextId, readSheetRange, updateRow } from "../utils/sheetHelpers.js";

const SPREADSHEET_ID = process.env.PROGRAM_SPREADSHEET_ID || "";
const MEETINGS_SHEET = "Governance Meetings";
const ACTIONS_SHEET = "Action Items";

/**
 * Column mapping for Governance Meetings sheet
 */
const MEETING_COLUMN_MAP = {
  meetingId: 0,
  programId: 1,
  meetingType: 2,
  title: 3,
  date: 4,
  duration: 5,
  attendees: 6,    // Comma-separated
  chair: 7,
  agenda: 8,       // Comma-separated
  decisions: 9,    // Comma-separated decision IDs
  minutesFileId: 10,
  status: 11,
};

/**
 * Column mapping for Action Items sheet
 */
const ACTION_COLUMN_MAP = {
  actionId: 0,
  meetingId: 1,    // Parent meeting
  programId: 2,    // For easy filtering
  description: 3,
  owner: 4,
  dueDate: 5,
  status: 6,
  completedDate: 7,
};

/**
 * Parse a row from the sheet into a GovernanceMeeting object
 */
function parseGovernanceMeeting(row: any[]): GovernanceMeeting {
  return {
    meetingId: row[MEETING_COLUMN_MAP.meetingId] || "",
    programId: row[MEETING_COLUMN_MAP.programId] || "",
    meetingType: row[MEETING_COLUMN_MAP.meetingType] as any || "other",
    title: row[MEETING_COLUMN_MAP.title] || "",
    date: row[MEETING_COLUMN_MAP.date] ? new Date(row[MEETING_COLUMN_MAP.date]) : new Date(),
    duration: parseInt(row[MEETING_COLUMN_MAP.duration]) || 60,
    attendees: row[MEETING_COLUMN_MAP.attendees]
      ? row[MEETING_COLUMN_MAP.attendees].split(",").map((a: string) => a.trim()).filter(Boolean)
      : [],
    chair: row[MEETING_COLUMN_MAP.chair] || "",
    agenda: row[MEETING_COLUMN_MAP.agenda]
      ? row[MEETING_COLUMN_MAP.agenda].split(",").map((a: string) => a.trim()).filter(Boolean)
      : [],
    decisions: row[MEETING_COLUMN_MAP.decisions]
      ? row[MEETING_COLUMN_MAP.decisions].split(",").map((d: string) => d.trim()).filter(Boolean)
      : [],
    actionItems: [], // Will be loaded separately
    minutesFileId: row[MEETING_COLUMN_MAP.minutesFileId] || undefined,
    status: row[MEETING_COLUMN_MAP.status] as any || "scheduled",
  };
}

/**
 * Serialize a GovernanceMeeting object to a sheet row
 */
function serializeGovernanceMeeting(meeting: GovernanceMeeting): any[] {
  const row = new Array(Object.keys(MEETING_COLUMN_MAP).length).fill("");

  row[MEETING_COLUMN_MAP.meetingId] = meeting.meetingId;
  row[MEETING_COLUMN_MAP.programId] = meeting.programId;
  row[MEETING_COLUMN_MAP.meetingType] = meeting.meetingType;
  row[MEETING_COLUMN_MAP.title] = meeting.title;
  row[MEETING_COLUMN_MAP.date] = meeting.date.toISOString().split("T")[0];
  row[MEETING_COLUMN_MAP.duration] = meeting.duration;
  row[MEETING_COLUMN_MAP.attendees] = meeting.attendees.join(", ");
  row[MEETING_COLUMN_MAP.chair] = meeting.chair;
  row[MEETING_COLUMN_MAP.agenda] = meeting.agenda.join(", ");
  row[MEETING_COLUMN_MAP.decisions] = meeting.decisions.join(", ");
  row[MEETING_COLUMN_MAP.minutesFileId] = meeting.minutesFileId || "";
  row[MEETING_COLUMN_MAP.status] = meeting.status;

  return row;
}

/**
 * Parse a row from the sheet into an ActionItem object
 */
function parseActionItem(row: any[]): ActionItem {
  return {
    actionId: row[ACTION_COLUMN_MAP.actionId] || "",
    description: row[ACTION_COLUMN_MAP.description] || "",
    owner: row[ACTION_COLUMN_MAP.owner] || "",
    dueDate: row[ACTION_COLUMN_MAP.dueDate]
      ? new Date(row[ACTION_COLUMN_MAP.dueDate])
      : new Date(),
    status: row[ACTION_COLUMN_MAP.status] as any || "open",
    completedDate: row[ACTION_COLUMN_MAP.completedDate]
      ? new Date(row[ACTION_COLUMN_MAP.completedDate])
      : undefined,
  };
}

/**
 * Serialize an ActionItem object to a sheet row
 */
function serializeActionItem(
  action: ActionItem,
  meetingId: string,
  programId: string
): any[] {
  const row = new Array(Object.keys(ACTION_COLUMN_MAP).length).fill("");

  row[ACTION_COLUMN_MAP.actionId] = action.actionId;
  row[ACTION_COLUMN_MAP.meetingId] = meetingId;
  row[ACTION_COLUMN_MAP.programId] = programId;
  row[ACTION_COLUMN_MAP.description] = action.description;
  row[ACTION_COLUMN_MAP.owner] = action.owner;
  row[ACTION_COLUMN_MAP.dueDate] = action.dueDate.toISOString().split("T")[0];
  row[ACTION_COLUMN_MAP.status] = action.status;
  row[ACTION_COLUMN_MAP.completedDate] = action.completedDate
    ? action.completedDate.toISOString().split("T")[0]
    : "";

  return row;
}

/**
 * Schedule a governance meeting
 */
export async function scheduleGovernanceMeeting(
  auth: OAuth2Client,
  params: {
    programId: string;
    meetingType: "steering_committee" | "board" | "review" | "status" | "other";
    title: string;
    date: Date;
    duration?: number;
    attendees: string[];
    chair: string;
    agenda?: string[];
  }
): Promise<GovernanceMeeting> {
  const sheets = google.sheets({ version: "v4", auth });

  const meetingId = await generateNextId(
    sheets,
    SPREADSHEET_ID,
    MEETINGS_SHEET,
    "Meeting ID",
    "GM"
  );

  const meeting: GovernanceMeeting = {
    meetingId,
    programId: params.programId,
    meetingType: params.meetingType,
    title: params.title,
    date: params.date,
    duration: params.duration || 60,
    attendees: params.attendees,
    chair: params.chair,
    agenda: params.agenda || [],
    decisions: [],
    actionItems: [],
    status: "scheduled",
  };

  const row = serializeGovernanceMeeting(meeting);
  await appendRows(sheets, SPREADSHEET_ID, MEETINGS_SHEET, [row]);

  return meeting;
}

/**
 * Read a governance meeting by ID (with action items)
 */
export async function readGovernanceMeeting(
  auth: OAuth2Client,
  meetingId: string
): Promise<GovernanceMeeting | null> {
  const sheets = google.sheets({ version: "v4", auth });
  const range = `${MEETINGS_SHEET}!A2:L`;

  const rows = await readSheetRange(sheets, SPREADSHEET_ID, range);

  const meetingRow = rows.find((row) => row[MEETING_COLUMN_MAP.meetingId] === meetingId);

  if (!meetingRow) {
    return null;
  }

  const meeting = parseGovernanceMeeting(meetingRow);

  // Load action items
  meeting.actionItems = await getActionItemsByMeeting(auth, meetingId);

  return meeting;
}

/**
 * Update a governance meeting
 */
export async function updateGovernanceMeeting(
  auth: OAuth2Client,
  meetingId: string,
  updates: Partial<GovernanceMeeting>
): Promise<GovernanceMeeting> {
  const sheets = google.sheets({ version: "v4", auth });

  // Column map for updates (field -> column letter)
  const columnMap: Record<string, string> = {
    meetingType: "C",
    title: "D",
    date: "E",
    duration: "F",
    attendees: "G",
    chair: "H",
    agenda: "I",
    decisions: "J",
    minutesFileId: "K",
    status: "L",
  };

  // Prepare update data (convert types as needed)
  const updateData: Record<string, any> = {};
  if (updates.meetingType !== undefined) updateData.meetingType = updates.meetingType;
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.date) updateData.date = updates.date.toISOString().split("T")[0];
  if (updates.duration !== undefined) updateData.duration = updates.duration;
  if (updates.attendees) updateData.attendees = updates.attendees.join(", ");
  if (updates.chair !== undefined) updateData.chair = updates.chair;
  if (updates.agenda) updateData.agenda = updates.agenda.join(", ");
  if (updates.decisions) updateData.decisions = updates.decisions.join(", ");
  if (updates.minutesFileId !== undefined) updateData.minutesFileId = updates.minutesFileId;
  if (updates.status !== undefined) updateData.status = updates.status;

  await updateRow(
    sheets,
    SPREADSHEET_ID,
    MEETINGS_SHEET,
    "Meeting ID",
    meetingId,
    updateData,
    columnMap
  );

  // Read and return the updated meeting
  const updatedMeeting = await readGovernanceMeeting(auth, meetingId);
  if (!updatedMeeting) {
    throw new Error(`Failed to read updated meeting: ${meetingId}`);
  }

  return updatedMeeting;
}

/**
 * Record governance meeting minutes (mark as completed)
 */
export async function recordGovernanceMinutes(
  auth: OAuth2Client,
  meetingId: string,
  params: {
    decisions?: string[];      // Decision IDs made during meeting
    minutesFileId?: string;    // Google Docs file ID
    actionItems?: Array<{
      description: string;
      owner: string;
      dueDate: Date;
    }>;
  }
): Promise<GovernanceMeeting> {
  const sheets = google.sheets({ version: "v4", auth });

  // Update meeting status and add decisions/minutes
  const updates: Partial<GovernanceMeeting> = {
    status: "completed",
  };

  if (params.decisions) {
    updates.decisions = params.decisions;
  }

  if (params.minutesFileId) {
    updates.minutesFileId = params.minutesFileId;
  }

  await updateGovernanceMeeting(auth, meetingId, updates);

  // Create action items if provided
  if (params.actionItems && params.actionItems.length > 0) {
    const meeting = await readGovernanceMeeting(auth, meetingId);
    if (meeting) {
      for (const actionParams of params.actionItems) {
        await createActionItem(auth, meetingId, meeting.programId, actionParams);
      }
    }
  }

  // Return updated meeting with action items
  const updatedMeeting = await readGovernanceMeeting(auth, meetingId);
  if (!updatedMeeting) {
    throw new Error(`Failed to read meeting after recording minutes: ${meetingId}`);
  }

  return updatedMeeting;
}

/**
 * List governance meetings with filters
 */
export async function listGovernanceMeetings(
  auth: OAuth2Client,
  filters?: {
    programId?: string;
    meetingType?: GovernanceMeeting["meetingType"];
    status?: GovernanceMeeting["status"];
    upcoming?: boolean; // Next 30 days
    past?: boolean;     // Last 90 days
  }
): Promise<GovernanceMeeting[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const range = `${MEETINGS_SHEET}!A2:L`;

  const rows = await readSheetRange(sheets, SPREADSHEET_ID, range);

  let meetings = rows.map(parseGovernanceMeeting);

  // Apply filters
  if (filters?.programId) {
    meetings = meetings.filter((m) => m.programId === filters.programId);
  }
  if (filters?.meetingType) {
    meetings = meetings.filter((m) => m.meetingType === filters.meetingType);
  }
  if (filters?.status) {
    meetings = meetings.filter((m) => m.status === filters.status);
  }
  if (filters?.upcoming) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    meetings = meetings.filter((m) => m.date >= now && m.date <= futureDate);
  }
  if (filters?.past) {
    const now = new Date();
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 90);
    meetings = meetings.filter((m) => m.date >= pastDate && m.date <= now);
  }

  return meetings;
}

/**
 * Create an action item from a governance meeting
 */
export async function createActionItem(
  auth: OAuth2Client,
  meetingId: string,
  programId: string,
  params: {
    description: string;
    owner: string;
    dueDate: Date;
  }
): Promise<ActionItem> {
  const sheets = google.sheets({ version: "v4", auth });

  const actionId = await generateNextId(
    sheets,
    SPREADSHEET_ID,
    ACTIONS_SHEET,
    "Action ID",
    "AI"
  );

  const action: ActionItem = {
    actionId,
    description: params.description,
    owner: params.owner,
    dueDate: params.dueDate,
    status: "open",
  };

  const row = serializeActionItem(action, meetingId, programId);
  await appendRows(sheets, SPREADSHEET_ID, ACTIONS_SHEET, [row]);

  return action;
}

/**
 * Update an action item
 */
export async function updateActionItem(
  auth: OAuth2Client,
  actionId: string,
  updates: Partial<ActionItem>
): Promise<ActionItem> {
  const sheets = google.sheets({ version: "v4", auth });

  // Column map for updates (field -> column letter)
  const columnMap: Record<string, string> = {
    description: "D",
    owner: "E",
    dueDate: "F",
    status: "G",
    completedDate: "H",
  };

  // Prepare update data
  const updateData: Record<string, any> = {};
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.owner !== undefined) updateData.owner = updates.owner;
  if (updates.dueDate) updateData.dueDate = updates.dueDate.toISOString().split("T")[0];
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.completedDate)
    updateData.completedDate = updates.completedDate.toISOString().split("T")[0];

  // Auto-set completed date when marking as completed
  if (updates.status === "completed" && !updates.completedDate) {
    updateData.completedDate = new Date().toISOString().split("T")[0];
  }

  await updateRow(
    sheets,
    SPREADSHEET_ID,
    ACTIONS_SHEET,
    "Action ID",
    actionId,
    updateData,
    columnMap
  );

  // Read and return the updated action
  const range = `${ACTIONS_SHEET}!A2:H`;
  const rows = await readSheetRange(sheets, SPREADSHEET_ID, range);
  const actionRow = rows.find((row) => row[ACTION_COLUMN_MAP.actionId] === actionId);

  if (!actionRow) {
    throw new Error(`Failed to read updated action item: ${actionId}`);
  }

  return parseActionItem(actionRow);
}

/**
 * Get action items by meeting ID
 */
async function getActionItemsByMeeting(
  auth: OAuth2Client,
  meetingId: string
): Promise<ActionItem[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const range = `${ACTIONS_SHEET}!A2:H`;

  const rows = await readSheetRange(sheets, SPREADSHEET_ID, range);

  return rows
    .filter((row) => row[ACTION_COLUMN_MAP.meetingId] === meetingId)
    .map(parseActionItem);
}

/**
 * Track action items (list with filters)
 */
export async function trackActionItems(
  auth: OAuth2Client,
  filters?: {
    programId?: string;
    meetingId?: string;
    owner?: string;
    status?: ActionItem["status"];
    overdue?: boolean;
  }
): Promise<ActionItem[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const range = `${ACTIONS_SHEET}!A2:H`;

  const rows = await readSheetRange(sheets, SPREADSHEET_ID, range);

  let actions = rows.map(parseActionItem);

  // Apply filters
  if (filters?.programId) {
    actions = actions.filter(
      (a, index) => rows[index][ACTION_COLUMN_MAP.programId] === filters.programId
    );
  }
  if (filters?.meetingId) {
    actions = actions.filter(
      (a, index) => rows[index][ACTION_COLUMN_MAP.meetingId] === filters.meetingId
    );
  }
  if (filters?.owner) {
    actions = actions.filter((a) => a.owner === filters.owner);
  }
  if (filters?.status) {
    actions = actions.filter((a) => a.status === filters.status);
  }
  if (filters?.overdue) {
    const now = new Date();
    actions = actions.filter(
      (a) => a.status !== "completed" && a.status !== "cancelled" && a.dueDate < now
    );
  }

  return actions;
}

/**
 * Generate governance report for a program
 */
export async function generateGovernanceReport(
  auth: OAuth2Client,
  programId: string
): Promise<{
  totalMeetings: number;
  scheduledMeetings: number;
  completedMeetings: number;
  cancelledMeetings: number;
  upcomingMeetings: GovernanceMeeting[];
  totalActionItems: number;
  openActionItems: number;
  completedActionItems: number;
  overdueActionItems: number;
  actionItemCompletionRate: number;
  recentDecisions: string[];
}> {
  const allMeetings = await listGovernanceMeetings(auth, { programId });
  const upcomingMeetings = await listGovernanceMeetings(auth, { programId, upcoming: true });
  const allActions = await trackActionItems(auth, { programId });

  const scheduledMeetings = allMeetings.filter((m) => m.status === "scheduled").length;
  const completedMeetings = allMeetings.filter((m) => m.status === "completed").length;
  const cancelledMeetings = allMeetings.filter((m) => m.status === "cancelled").length;

  const openActions = allActions.filter((a) => a.status === "open" || a.status === "in_progress")
    .length;
  const completedActions = allActions.filter((a) => a.status === "completed").length;
  const overdueActions = await trackActionItems(auth, { programId, overdue: true });

  const actionItemCompletionRate =
    allActions.length > 0 ? (completedActions / allActions.length) * 100 : 0;

  // Get recent decisions (from last 5 completed meetings)
  const recentMeetings = allMeetings
    .filter((m) => m.status === "completed")
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  const recentDecisions = recentMeetings.flatMap((m) => m.decisions).filter(Boolean);

  return {
    totalMeetings: allMeetings.length,
    scheduledMeetings,
    completedMeetings,
    cancelledMeetings,
    upcomingMeetings,
    totalActionItems: allActions.length,
    openActionItems: openActions,
    completedActionItems: completedActions,
    overdueActionItems: overdueActions.length,
    actionItemCompletionRate,
    recentDecisions,
  };
}
