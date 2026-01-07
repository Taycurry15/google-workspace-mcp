/**
 * Change Control Module
 * Handles change request submission, review, approval workflow, and impact analysis
 * Phase 4 - Week 4 Implementation
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import type { ChangeRequest, ProgramPriority } from "@gw-mcp/shared-core";
import { appendRows, generateNextId, readSheetRange, updateRow } from "@gw-mcp/shared-core";
import { getDefaultEventBus } from "@gw-mcp/shared-workflows";

const SPREADSHEET_ID = process.env.PROGRAM_SPREADSHEET_ID || "";
const SHEET_NAME = "Change Requests";

/**
 * Column mapping for Change Requests sheet
 */
const COLUMN_MAP = {
  changeId: 0,
  programId: 1,
  title: 2,
  description: 3,
  requestedBy: 4,
  requestDate: 5,
  category: 6,
  priority: 7,
  impact: 8,
  justification: 9,
  status: 10,
  decision: 11,
  decisionDate: 12,
  approver: 13,
  approverComments: 14,
  implementationDate: 15,
  affectedDeliverables: 16, // Comma-separated
  affectedMilestones: 17,   // Comma-separated
};

/**
 * Parse a row from the sheet into a ChangeRequest object
 */
function parseChangeRequest(row: any[]): ChangeRequest {
  return {
    changeId: row[COLUMN_MAP.changeId] || "",
    programId: row[COLUMN_MAP.programId] || "",
    title: row[COLUMN_MAP.title] || "",
    description: row[COLUMN_MAP.description] || "",
    requestedBy: row[COLUMN_MAP.requestedBy] || "",
    requestDate: row[COLUMN_MAP.requestDate] ? new Date(row[COLUMN_MAP.requestDate]) : new Date(),
    category: row[COLUMN_MAP.category] as any || "other",
    priority: (row[COLUMN_MAP.priority] as ProgramPriority) || "medium",
    impact: row[COLUMN_MAP.impact] || "",
    justification: row[COLUMN_MAP.justification] || "",
    status: row[COLUMN_MAP.status] as any || "submitted",
    decision: row[COLUMN_MAP.decision] as any || undefined,
    decisionDate: row[COLUMN_MAP.decisionDate] ? new Date(row[COLUMN_MAP.decisionDate]) : undefined,
    approver: row[COLUMN_MAP.approver] || undefined,
    approverComments: row[COLUMN_MAP.approverComments] || undefined,
    implementationDate: row[COLUMN_MAP.implementationDate]
      ? new Date(row[COLUMN_MAP.implementationDate])
      : undefined,
    affectedDeliverables: row[COLUMN_MAP.affectedDeliverables]
      ? row[COLUMN_MAP.affectedDeliverables].split(",").map((id: string) => id.trim()).filter(Boolean)
      : [],
    affectedMilestones: row[COLUMN_MAP.affectedMilestones]
      ? row[COLUMN_MAP.affectedMilestones].split(",").map((id: string) => id.trim()).filter(Boolean)
      : [],
  };
}

/**
 * Serialize a ChangeRequest object to a sheet row
 */
function serializeChangeRequest(request: ChangeRequest): any[] {
  const row = new Array(Object.keys(COLUMN_MAP).length).fill("");

  row[COLUMN_MAP.changeId] = request.changeId;
  row[COLUMN_MAP.programId] = request.programId;
  row[COLUMN_MAP.title] = request.title;
  row[COLUMN_MAP.description] = request.description;
  row[COLUMN_MAP.requestedBy] = request.requestedBy;
  row[COLUMN_MAP.requestDate] = request.requestDate.toISOString().split("T")[0];
  row[COLUMN_MAP.category] = request.category;
  row[COLUMN_MAP.priority] = request.priority;
  row[COLUMN_MAP.impact] = request.impact;
  row[COLUMN_MAP.justification] = request.justification;
  row[COLUMN_MAP.status] = request.status;
  row[COLUMN_MAP.decision] = request.decision || "";
  row[COLUMN_MAP.decisionDate] = request.decisionDate
    ? request.decisionDate.toISOString().split("T")[0]
    : "";
  row[COLUMN_MAP.approver] = request.approver || "";
  row[COLUMN_MAP.approverComments] = request.approverComments || "";
  row[COLUMN_MAP.implementationDate] = request.implementationDate
    ? request.implementationDate.toISOString().split("T")[0]
    : "";
  row[COLUMN_MAP.affectedDeliverables] = request.affectedDeliverables.join(", ");
  row[COLUMN_MAP.affectedMilestones] = request.affectedMilestones.join(", ");

  return row;
}

/**
 * Create a change request
 */
export async function createChangeRequest(
  auth: OAuth2Client,
  params: {
    programId: string;
    title: string;
    description: string;
    requestedBy: string;
    category: "scope" | "schedule" | "quality" | "resources" | "other";
    priority: ProgramPriority;
    impact: string;
    justification: string;
    affectedDeliverables?: string[];
    affectedMilestones?: string[];
  }
): Promise<ChangeRequest> {
  const sheets = google.sheets({ version: "v4", auth });

  const changeId = await generateNextId(sheets, SPREADSHEET_ID, SHEET_NAME, "Change ID", "CR");

  const request: ChangeRequest = {
    changeId,
    programId: params.programId,
    title: params.title,
    description: params.description,
    requestedBy: params.requestedBy,
    requestDate: new Date(),
    category: params.category,
    priority: params.priority,
    impact: params.impact,
    justification: params.justification,
    status: "submitted",
    affectedDeliverables: params.affectedDeliverables || [],
    affectedMilestones: params.affectedMilestones || [],
  };

  const row = serializeChangeRequest(request);
  await appendRows(sheets, SPREADSHEET_ID, SHEET_NAME, [row]);

  return request;
}

/**
 * Read a change request by ID
 */
export async function readChangeRequest(
  auth: OAuth2Client,
  changeId: string
): Promise<ChangeRequest | null> {
  const sheets = google.sheets({ version: "v4", auth });
  const range = `${SHEET_NAME}!A2:R`;

  const rows = await readSheetRange(sheets, SPREADSHEET_ID, range);

  const requestRow = rows.find((row) => row[COLUMN_MAP.changeId] === changeId);

  if (!requestRow) {
    return null;
  }

  return parseChangeRequest(requestRow);
}

/**
 * Update a change request
 */
export async function updateChangeRequest(
  auth: OAuth2Client,
  changeId: string,
  updates: Partial<ChangeRequest>
): Promise<ChangeRequest> {
  const sheets = google.sheets({ version: "v4", auth });

  // Column map for updates (field -> column letter)
  const columnMap: Record<string, string> = {
    title: "C",
    description: "D",
    category: "G",
    priority: "H",
    impact: "I",
    justification: "J",
    status: "K",
    decision: "L",
    decisionDate: "M",
    approver: "N",
    approverComments: "O",
    implementationDate: "P",
    affectedDeliverables: "Q",
    affectedMilestones: "R",
  };

  // Prepare update data (convert types as needed)
  const updateData: Record<string, any> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.impact !== undefined) updateData.impact = updates.impact;
  if (updates.justification !== undefined) updateData.justification = updates.justification;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.decision !== undefined) updateData.decision = updates.decision;
  if (updates.decisionDate) updateData.decisionDate = updates.decisionDate.toISOString().split("T")[0];
  if (updates.approver !== undefined) updateData.approver = updates.approver;
  if (updates.approverComments !== undefined) updateData.approverComments = updates.approverComments;
  if (updates.implementationDate) updateData.implementationDate = updates.implementationDate.toISOString().split("T")[0];
  if (updates.affectedDeliverables) updateData.affectedDeliverables = updates.affectedDeliverables.join(", ");
  if (updates.affectedMilestones) updateData.affectedMilestones = updates.affectedMilestones.join(", ");

  await updateRow(
    sheets,
    SPREADSHEET_ID,
    SHEET_NAME,
    "Change ID",
    changeId,
    updateData,
    columnMap
  );

  // Read and return the updated request
  const updatedRequest = await readChangeRequest(auth, changeId);
  if (!updatedRequest) {
    throw new Error(`Failed to read updated change request: ${changeId}`);
  }

  return updatedRequest;
}

/**
 * Review a change request (approve/reject/defer)
 */
export async function reviewChangeRequest(
  auth: OAuth2Client,
  changeId: string,
  decision: "approve" | "reject" | "defer",
  approver: string,
  comments?: string
): Promise<ChangeRequest> {
  const request = await readChangeRequest(auth, changeId);

  if (!request) {
    throw new Error(`Change request not found: ${changeId}`);
  }

  if (request.status !== "submitted" && request.status !== "under_review") {
    throw new Error(
      `Change request ${changeId} cannot be reviewed in status: ${request.status}`
    );
  }

  let newStatus: ChangeRequest["status"];
  switch (decision) {
    case "approve":
      newStatus = "approved";
      break;
    case "reject":
      newStatus = "rejected";
      break;
    case "defer":
      newStatus = "under_review";
      break;
  }

  const updatedRequest = await updateChangeRequest(auth, changeId, {
    status: newStatus,
    decision,
    decisionDate: new Date(),
    approver,
    approverComments: comments,
  });

  // Emit events based on decision
  const eventBus = getDefaultEventBus();

  if (decision === "approve") {
    await eventBus.publish({
      eventType: "change_request_approved",
      source: "program_change_control",
      timestamp: new Date(),
      programId: request.programId,
      data: {
        changeId: request.changeId,
        title: request.title,
        category: request.category,
        priority: request.priority,
        approver,
        affectedDeliverables: request.affectedDeliverables,
        affectedMilestones: request.affectedMilestones,
      },
    });
  } else if (decision === "reject") {
    await eventBus.publish({
      eventType: "change_request_rejected",
      source: "program_change_control",
      timestamp: new Date(),
      programId: request.programId,
      data: {
        changeId: request.changeId,
        title: request.title,
        requestedBy: request.requestedBy,
        approver,
        comments,
      },
    });
  }

  return updatedRequest;
}

/**
 * Mark a change request as implemented
 */
export async function implementChange(
  auth: OAuth2Client,
  changeId: string,
  implementationDate?: Date
): Promise<ChangeRequest> {
  const request = await readChangeRequest(auth, changeId);

  if (!request) {
    throw new Error(`Change request not found: ${changeId}`);
  }

  if (request.status !== "approved") {
    throw new Error(
      `Change request ${changeId} must be approved before implementation. Current status: ${request.status}`
    );
  }

  const updatedRequest = await updateChangeRequest(auth, changeId, {
    status: "implemented",
    implementationDate: implementationDate || new Date(),
  });

  // Emit change_implemented event
  const eventBus = getDefaultEventBus();
  await eventBus.publish({
    eventType: "change_implemented",
    source: "program_change_control",
    timestamp: new Date(),
    programId: request.programId,
    data: {
      changeId: request.changeId,
      title: request.title,
      category: request.category,
      implementationDate: implementationDate || new Date(),
      affectedDeliverables: request.affectedDeliverables,
      affectedMilestones: request.affectedMilestones,
    },
  });

  return updatedRequest;
}

/**
 * List change requests with optional filters
 */
export async function listChangeRequests(
  auth: OAuth2Client,
  filters?: {
    programId?: string;
    status?: ChangeRequest["status"];
    category?: ChangeRequest["category"];
    priority?: ProgramPriority;
    requestedBy?: string;
  }
): Promise<ChangeRequest[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const range = `${SHEET_NAME}!A2:R`;

  const rows = await readSheetRange(sheets, SPREADSHEET_ID, range);

  let requests = rows.map(parseChangeRequest);

  // Apply filters
  if (filters?.programId) {
    requests = requests.filter((r) => r.programId === filters.programId);
  }
  if (filters?.status) {
    requests = requests.filter((r) => r.status === filters.status);
  }
  if (filters?.category) {
    requests = requests.filter((r) => r.category === filters.category);
  }
  if (filters?.priority) {
    requests = requests.filter((r) => r.priority === filters.priority);
  }
  if (filters?.requestedBy) {
    requests = requests.filter((r) => r.requestedBy === filters.requestedBy);
  }

  return requests;
}

/**
 * Analyze impact of pending change requests on program
 */
export async function analyzeChangeImpact(
  auth: OAuth2Client,
  programId: string
): Promise<{
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  implementedRequests: number;
  categoryBreakdown: Record<ChangeRequest["category"], number>;
  priorityBreakdown: Record<ProgramPriority, number>;
  affectedDeliverablesCount: number;
  affectedMilestonesCount: number;
  criticalChanges: ChangeRequest[];
}> {
  const allRequests = await listChangeRequests(auth, { programId });

  const pendingRequests = allRequests.filter(
    (r) => r.status === "submitted" || r.status === "under_review"
  ).length;

  const approvedRequests = allRequests.filter((r) => r.status === "approved").length;
  const rejectedRequests = allRequests.filter((r) => r.status === "rejected").length;
  const implementedRequests = allRequests.filter((r) => r.status === "implemented").length;

  const categoryBreakdown: Record<string, number> = {
    scope: 0,
    schedule: 0,
    quality: 0,
    resources: 0,
    other: 0,
  };

  const priorityBreakdown: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const affectedDeliverables = new Set<string>();
  const affectedMilestones = new Set<string>();

  allRequests.forEach((request) => {
    categoryBreakdown[request.category]++;
    priorityBreakdown[request.priority]++;
    request.affectedDeliverables.forEach((id) => affectedDeliverables.add(id));
    request.affectedMilestones.forEach((id) => affectedMilestones.add(id));
  });

  const criticalChanges = allRequests.filter(
    (r) => (r.priority === "critical" || r.priority === "high") && r.status !== "implemented"
  );

  return {
    totalRequests: allRequests.length,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    implementedRequests,
    categoryBreakdown: categoryBreakdown as Record<ChangeRequest["category"], number>,
    priorityBreakdown: priorityBreakdown as Record<ProgramPriority, number>,
    affectedDeliverablesCount: affectedDeliverables.size,
    affectedMilestonesCount: affectedMilestones.size,
    criticalChanges,
  };
}

/**
 * Get change requests requiring action (submitted or under review)
 */
export async function getPendingChangeRequests(
  auth: OAuth2Client,
  programId: string
): Promise<ChangeRequest[]> {
  const allRequests = await listChangeRequests(auth, { programId });

  return allRequests.filter(
    (r) => r.status === "submitted" || r.status === "under_review"
  );
}

/**
 * Get change control summary for a program
 */
export async function getChangeControlSummary(
  auth: OAuth2Client,
  programId: string
): Promise<{
  totalRequests: number;
  pending: number;
  approved: number;
  rejected: number;
  implemented: number;
  approvalRate: number;
  averageDecisionTime?: number;
  health: "green" | "yellow" | "red";
}> {
  const impact = await analyzeChangeImpact(auth, programId);

  const approvalRate =
    impact.approvedRequests + impact.rejectedRequests > 0
      ? (impact.approvedRequests / (impact.approvedRequests + impact.rejectedRequests)) * 100
      : 0;

  // Calculate average decision time
  const allRequests = await listChangeRequests(auth, { programId });
  const decidedRequests = allRequests.filter((r) => r.decisionDate);

  let averageDecisionTime: number | undefined;
  if (decidedRequests.length > 0) {
    const totalDecisionTime = decidedRequests.reduce((sum, r) => {
      const days = Math.ceil(
        (r.decisionDate!.getTime() - r.requestDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0);
    averageDecisionTime = totalDecisionTime / decidedRequests.length;
  }

  // Determine health
  let health: "green" | "yellow" | "red" = "green";
  const pendingPercent = (impact.pendingRequests / Math.max(impact.totalRequests, 1)) * 100;

  if (pendingPercent > 40 || impact.criticalChanges.length > 5) {
    health = "red";
  } else if (pendingPercent > 20 || impact.criticalChanges.length > 2) {
    health = "yellow";
  }

  return {
    totalRequests: impact.totalRequests,
    pending: impact.pendingRequests,
    approved: impact.approvedRequests,
    rejected: impact.rejectedRequests,
    implemented: impact.implementedRequests,
    approvalRate,
    averageDecisionTime,
    health,
  };
}
