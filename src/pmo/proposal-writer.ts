/**
 * Proposal Writer
 * Orchestrates writing extracted proposal data to PMO spreadsheets
 */

import { OAuth2Client } from "google-auth-library";
import {
  ProposalSession,
  ProposedDeliverable,
  ProposedRisk,
  ProposedStakeholder,
  Deliverable,
  Risk,
  StakeholderInfo,
} from "../types/pmo.js";
import { batchCreateDeliverables } from "./deliverables.js";
import { batchCreateRisks } from "./risks.js";
import { batchCreateStakeholders } from "./stakeholders.js";

/**
 * Convert ProposedDeliverable to Deliverable
 */
function proposedToDeliverable(
  proposed: ProposedDeliverable
): Omit<Deliverable, "id" | "para_category" | "para_actionability" | "para_tags"> {
  return {
    name: proposed.name,
    wbs: proposed.wbs || "1.1.1",
    week: proposed.week || 1,
    status: "not-started",
    quality: 0,
    budget: proposed.estimatedBudget || 0,
    responsible: proposed.responsible || "TBD",
    accountable: proposed.accountable || "TBD",
    priority: proposed.priority,
  };
}

/**
 * Convert ProposedRisk to Risk
 */
function proposedToRisk(
  proposed: ProposedRisk
): Omit<Risk, "id" | "score" | "para_needs_review"> {
  return {
    name: proposed.name,
    category: proposed.category,
    probability: proposed.estimatedProbability || 3,
    impact: proposed.estimatedImpact || 3,
    status: "active",
    response: proposed.suggestedResponse || "",
    owner: proposed.owner || "TBD",
    mitigation: 0,
  };
}

/**
 * Convert ProposedStakeholder to StakeholderInfo
 */
function proposedToStakeholder(
  proposed: ProposedStakeholder
): Omit<StakeholderInfo, "id"> {
  return {
    name: proposed.name,
    role: proposed.role,
    email: proposed.email || "",
    influence: proposed.influence || 3,
    interest: proposed.interest || 3,
    engagement: Math.min(proposed.influence || 3, proposed.interest || 3), // Initial engagement = min(influence, interest)
  };
}

/**
 * Create deliverables from proposal analysis
 */
export async function createDeliverablesFromProposal(
  auth: OAuth2Client,
  spreadsheetId: string,
  proposedDeliverables: ProposedDeliverable[]
): Promise<string[]> {
  if (proposedDeliverables.length === 0) {
    console.log("No deliverables to create");
    return [];
  }

  const deliverables = proposedDeliverables.map(proposedToDeliverable);
  const ids = await batchCreateDeliverables(auth, spreadsheetId, deliverables);

  console.log(
    `Created ${ids.length} deliverables from proposal: ${ids.join(", ")}`
  );

  return ids;
}

/**
 * Create risks from proposal analysis
 */
export async function createRisksFromProposal(
  auth: OAuth2Client,
  spreadsheetId: string,
  proposedRisks: ProposedRisk[]
): Promise<string[]> {
  if (proposedRisks.length === 0) {
    console.log("No risks to create");
    return [];
  }

  const risks = proposedRisks.map(proposedToRisk);
  const ids = await batchCreateRisks(auth, spreadsheetId, risks);

  console.log(`Created ${ids.length} risks from proposal: ${ids.join(", ")}`);

  return ids;
}

/**
 * Create stakeholders from proposal analysis
 */
export async function createStakeholdersFromProposal(
  auth: OAuth2Client,
  spreadsheetId: string,
  proposedStakeholders: ProposedStakeholder[]
): Promise<string[]> {
  if (proposedStakeholders.length === 0) {
    console.log("No stakeholders to create");
    return [];
  }

  const stakeholders = proposedStakeholders.map(proposedToStakeholder);
  const ids = await batchCreateStakeholders(auth, spreadsheetId, stakeholders);

  console.log(
    `Created ${ids.length} stakeholders from proposal: ${ids.join(", ")}`
  );

  return ids;
}

/**
 * Create all PMO items from a proposal session
 * @param auth OAuth2 client
 * @param spreadsheetId PMO spreadsheet ID
 * @param session Proposal session with analysis data
 * @param options Optional flags to control what gets created
 * @returns Summary of created items
 */
export async function createFullProposal(
  auth: OAuth2Client,
  spreadsheetId: string,
  session: ProposalSession,
  options: {
    createDeliverables?: boolean;
    createRisks?: boolean;
    createStakeholders?: boolean;
  } = {}
): Promise<{
  success: boolean;
  created: {
    deliverables: string[];
    risks: string[];
    stakeholders: string[];
  };
  summary: string;
  spreadsheetUrl: string;
  errors?: string[];
}> {
  const {
    createDeliverables = true,
    createRisks = true,
    createStakeholders = true,
  } = options;

  // Use refined data if available, otherwise use original analysis
  const analysis = session.refinedData || session.analysis;

  const created = {
    deliverables: [] as string[],
    risks: [] as string[],
    stakeholders: [] as string[],
  };

  const errors: string[] = [];

  // Create deliverables
  if (createDeliverables) {
    try {
      created.deliverables = await createDeliverablesFromProposal(
        auth,
        spreadsheetId,
        analysis.deliverables
      );
    } catch (error) {
      const errorMsg = `Failed to create deliverables: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }
  }

  // Create risks
  if (createRisks) {
    try {
      created.risks = await createRisksFromProposal(
        auth,
        spreadsheetId,
        analysis.risks
      );
    } catch (error) {
      const errorMsg = `Failed to create risks: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }
  }

  // Create stakeholders
  if (createStakeholders) {
    try {
      created.stakeholders = await createStakeholdersFromProposal(
        auth,
        spreadsheetId,
        analysis.stakeholders
      );
    } catch (error) {
      const errorMsg = `Failed to create stakeholders: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }
  }

  // Build summary
  const parts: string[] = [];
  if (created.deliverables.length > 0) {
    parts.push(`${created.deliverables.length} deliverables`);
  }
  if (created.risks.length > 0) {
    parts.push(`${created.risks.length} risks`);
  }
  if (created.stakeholders.length > 0) {
    parts.push(`${created.stakeholders.length} stakeholders`);
  }

  const summary =
    parts.length > 0
      ? `Created ${parts.join(", ")} from proposal: ${analysis.projectMetadata.projectName}`
      : "No items were created";

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  const success = errors.length === 0;

  return {
    success,
    created,
    summary,
    spreadsheetUrl,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Get creation statistics from a proposal
 */
export function getProposalStats(session: ProposalSession): {
  deliverableCount: number;
  riskCount: number;
  stakeholderCount: number;
  criticalRiskCount: number;
  highPriorityCount: number;
  totalBudget: number;
} {
  const analysis = session.refinedData || session.analysis;

  const criticalRiskCount = analysis.risks.filter(
    (r) =>
      (r.estimatedProbability || 0) * (r.estimatedImpact || 0) > 15
  ).length;

  const highPriorityCount = analysis.deliverables.filter(
    (d) => d.priority === "critical" || d.priority === "high"
  ).length;

  const totalBudget =
    analysis.deliverables.reduce(
      (sum, d) => sum + (d.estimatedBudget || 0),
      0
    ) || analysis.projectMetadata.totalBudget || 0;

  return {
    deliverableCount: analysis.deliverables.length,
    riskCount: analysis.risks.length,
    stakeholderCount: analysis.stakeholders.length,
    criticalRiskCount,
    highPriorityCount,
    totalBudget,
  };
}
