/**
 * Compliance Requirements Module
 * Manages compliance requirements tracking
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { appendRows, generateNextId, readSheetRange, updateRow } from "@gw-mcp/shared-core";

const SPREADSHEET_ID = process.env.COMPLIANCE_SPREADSHEET_ID || "";

export interface ComplianceRequirement {
  requirementId: string;
  programId: string;
  category: "regulatory" | "contractual" | "internal" | "industry";
  framework: string; // e.g., "FAR", "DFARS", "NIST", "ISO"
  requirement: string;
  description: string;
  applicability: string;
  owner: string;
  dueDate: Date;
  status: "not_started" | "in_progress" | "compliant" | "non_compliant" | "not_applicable";
  evidenceRequired: string[];
  lastReviewDate?: Date;
  nextReviewDate?: Date;
  notes?: string;
}

/**
 * Create a compliance requirement
 */
export async function createComplianceRequirement(
  auth: OAuth2Client,
  params: {
    programId: string;
    category: ComplianceRequirement["category"];
    framework: string;
    requirement: string;
    description: string;
    applicability: string;
    owner: string;
    dueDate: Date;
    evidenceRequired: string[];
  }
): Promise<ComplianceRequirement> {
  const sheets = google.sheets({ version: "v4", auth });

  const requirementId = await generateNextId(
    sheets,
    SPREADSHEET_ID,
    "Compliance Requirements",
    "Requirement ID",
    "REQ"
  );

  const requirement: ComplianceRequirement = {
    requirementId,
    programId: params.programId,
    category: params.category,
    framework: params.framework,
    requirement: params.requirement,
    description: params.description,
    applicability: params.applicability,
    owner: params.owner,
    dueDate: params.dueDate,
    status: "not_started",
    evidenceRequired: params.evidenceRequired,
  };

  await appendRows(sheets, SPREADSHEET_ID, "Compliance Requirements!A:A", [
    [
      requirement.requirementId,
      requirement.programId,
      requirement.category,
      requirement.framework,
      requirement.requirement,
      requirement.description,
      requirement.applicability,
      requirement.owner,
      requirement.dueDate.toISOString().split("T")[0],
      requirement.status,
      requirement.evidenceRequired.join(", "),
      "",
      "",
      requirement.notes || "",
    ],
  ]);

  return requirement;
}

/**
 * Update requirement status
 */
export async function updateRequirementStatus(
  auth: OAuth2Client,
  requirementId: string,
  status: ComplianceRequirement["status"],
  notes?: string
): Promise<boolean> {
  const sheets = google.sheets({ version: "v4", auth });

  return await updateRow(
    sheets,
    SPREADSHEET_ID,
    "Compliance Requirements",
    "Requirement ID",
    requirementId,
    {
      status,
      lastReviewDate: new Date().toISOString().split("T")[0],
      notes: notes || "",
    },
    {
      status: "J",
      lastReviewDate: "L",
      notes: "N",
    }
  );
}

/**
 * Get compliance requirements for a program
 */
export async function getComplianceRequirements(
  auth: OAuth2Client,
  programId: string,
  filters?: {
    category?: ComplianceRequirement["category"];
    framework?: string;
    status?: ComplianceRequirement["status"];
  }
): Promise<ComplianceRequirement[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const data = await readSheetRange(sheets, SPREADSHEET_ID, "Compliance Requirements!A:N");

  if (data.length <= 1) {
    return [];
  }

  const requirements: ComplianceRequirement[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] !== programId) continue;

    const req: ComplianceRequirement = {
      requirementId: row[0],
      programId: row[1],
      category: row[2] as any,
      framework: row[3],
      requirement: row[4],
      description: row[5],
      applicability: row[6],
      owner: row[7],
      dueDate: new Date(row[8]),
      status: row[9] as any,
      evidenceRequired: row[10] ? row[10].split(", ") : [],
      lastReviewDate: row[11] ? new Date(row[11]) : undefined,
      nextReviewDate: row[12] ? new Date(row[12]) : undefined,
      notes: row[13] || undefined,
    };

    if (filters) {
      if (filters.category && req.category !== filters.category) continue;
      if (filters.framework && req.framework !== filters.framework) continue;
      if (filters.status && req.status !== filters.status) continue;
    }

    requirements.push(req);
  }

  return requirements;
}

/**
 * Generate compliance status report
 */
export async function generateComplianceStatusReport(
  auth: OAuth2Client,
  programId: string
): Promise<{
  totalRequirements: number;
  compliant: number;
  nonCompliant: number;
  inProgress: number;
  complianceRate: number;
}> {
  const requirements = await getComplianceRequirements(auth, programId);

  const compliant = requirements.filter((r) => r.status === "compliant").length;
  const nonCompliant = requirements.filter((r) => r.status === "non_compliant").length;
  const inProgress = requirements.filter((r) => r.status === "in_progress").length;

  return {
    totalRequirements: requirements.length,
    compliant,
    nonCompliant,
    inProgress,
    complianceRate:
      requirements.length > 0
        ? Math.round((compliant / requirements.length) * 100)
        : 0,
  };
}
