/**
 * MCP Tool Definitions for Compliance & Risk Server
 */

import type { OAuth2Client } from "google-auth-library";
import { initializeAuth } from "@gw-mcp/shared-core";
import * as risks from "./risks/index.js";
import * as compliance from "./compliance/index.js";
import * as fcpa from "./fcpa/index.js";
import * as audit from "./audit/index.js";

// Global auth client
let authClient: OAuth2Client | null = null;

async function getAuth(): Promise<OAuth2Client> {
  if (!authClient) {
    authClient = await initializeAuth();
  }
  return authClient;
}

/**
 * Tool definitions for Compliance & Risk Management
 */
export const COMPLIANCE_TOOLS = [
  // Risk Management Tools
  {
    name: "risk_create",
    description: "Create a new risk",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string" },
        category: { type: "string", enum: ["technical", "schedule", "budget", "resource", "quality", "external", "other"] },
        title: { type: "string" },
        description: { type: "string" },
        probability: { type: "number", minimum: 1, maximum: 5 },
        impact: { type: "number", minimum: 1, maximum: 5 },
        owner: { type: "string" },
      },
      required: ["programId", "category", "title", "description", "probability", "impact", "owner"],
    },
  },
  {
    name: "risk_list",
    description: "List risks for a program",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string" },
        status: { type: "string" },
        severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
      },
      required: ["programId"],
    },
  },
  {
    name: "risk_mitigation_create",
    description: "Create a mitigation action for a risk",
    inputSchema: {
      type: "object",
      properties: {
        riskId: { type: "string" },
        programId: { type: "string" },
        description: { type: "string" },
        owner: { type: "string" },
        dueDate: { type: "string" },
        cost: { type: "number" },
      },
      required: ["riskId", "programId", "description", "owner", "dueDate"],
    },
  },
  {
    name: "risk_summary_generate",
    description: "Generate risk summary for a program",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string" },
      },
      required: ["programId"],
    },
  },

  // Compliance Tools
  {
    name: "compliance_requirement_create",
    description: "Create a compliance requirement",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string" },
        category: { type: "string", enum: ["regulatory", "contractual", "internal", "industry"] },
        framework: { type: "string" },
        requirement: { type: "string" },
        description: { type: "string" },
        applicability: { type: "string" },
        owner: { type: "string" },
        dueDate: { type: "string" },
        evidenceRequired: { type: "array", items: { type: "string" } },
      },
      required: ["programId", "category", "framework", "requirement", "description", "applicability", "owner", "dueDate", "evidenceRequired"],
    },
  },
  {
    name: "compliance_requirement_update",
    description: "Update compliance requirement status",
    inputSchema: {
      type: "object",
      properties: {
        requirementId: { type: "string" },
        status: { type: "string", enum: ["not_started", "in_progress", "compliant", "non_compliant", "not_applicable"] },
        notes: { type: "string" },
      },
      required: ["requirementId", "status"],
    },
  },
  {
    name: "compliance_requirements_list",
    description: "List compliance requirements for a program",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string" },
        category: { type: "string" },
        framework: { type: "string" },
        status: { type: "string" },
      },
      required: ["programId"],
    },
  },
  {
    name: "compliance_status_report",
    description: "Generate compliance status report",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string" },
      },
      required: ["programId"],
    },
  },

  // FCPA Tools
  {
    name: "fcpa_transaction_log",
    description: "Log an FCPA transaction for monitoring",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string" },
        vendorId: { type: "string" },
        vendorName: { type: "string" },
        transactionType: { type: "string", enum: ["payment", "gift", "entertainment", "travel", "other"] },
        amount: { type: "number" },
        currency: { type: "string" },
        date: { type: "string" },
        purpose: { type: "string" },
        recipient: { type: "string" },
        recipientTitle: { type: "string" },
        country: { type: "string" },
        approver: { type: "string" },
      },
      required: ["programId", "vendorId", "vendorName", "transactionType", "amount", "currency", "date", "purpose", "recipient", "country", "approver"],
    },
  },
  {
    name: "fcpa_transactions_review",
    description: "Get FCPA transactions pending review",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string" },
      },
    },
  },

  // Audit Tools
  {
    name: "audit_log",
    description: "Log an audit trail entry",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: "string" },
        action: { type: "string" },
        entityType: { type: "string" },
        entityId: { type: "string" },
        programId: { type: "string" },
        changes: { type: "object" },
      },
      required: ["userId", "action", "entityType", "entityId"],
    },
  },
  {
    name: "audit_trail_get",
    description: "Get audit trail for an entity",
    inputSchema: {
      type: "object",
      properties: {
        entityId: { type: "string" },
        startDate: { type: "string" },
        endDate: { type: "string" },
        action: { type: "string" },
      },
      required: ["entityId"],
    },
  },
  {
    name: "audit_report_generate",
    description: "Generate audit report for a program",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string" },
        startDate: { type: "string" },
        endDate: { type: "string" },
      },
      required: ["programId", "startDate", "endDate"],
    },
  },
];

/**
 * Tool handlers
 */
export async function handleToolCall(name: string, args: any): Promise<any> {
  const auth = await getAuth();

  switch (name) {
    // Risk Management
    case "risk_create":
      return await risks.createRisk(auth, process.env.COMPLIANCE_SPREADSHEET_ID || "", args);
    case "risk_list":
      return await risks.readRisks(auth, args.programId, args);
    case "risk_mitigation_create":
      return await risks.createMitigationAction(auth, {
        ...args,
        dueDate: new Date(args.dueDate),
      });
    case "risk_summary_generate":
      return await risks.generateRiskSummary(auth, args.programId);

    // Compliance
    case "compliance_requirement_create":
      return await compliance.createComplianceRequirement(auth, {
        ...args,
        dueDate: new Date(args.dueDate),
      });
    case "compliance_requirement_update":
      return await compliance.updateRequirementStatus(
        auth,
        args.requirementId,
        args.status,
        args.notes
      );
    case "compliance_requirements_list":
      return await compliance.getComplianceRequirements(auth, args.programId, args);
    case "compliance_status_report":
      return await compliance.generateComplianceStatusReport(auth, args.programId);

    // FCPA
    case "fcpa_transaction_log":
      return await fcpa.logFCPATransaction(auth, {
        ...args,
        date: new Date(args.date),
      });
    case "fcpa_transactions_review":
      return await fcpa.getFCPATransactionsForReview(auth, args.programId);

    // Audit
    case "audit_log":
      return await audit.logAudit(auth, args);
    case "audit_trail_get":
      return await audit.getAuditTrail(auth, args.entityId, {
        startDate: args.startDate ? new Date(args.startDate) : undefined,
        endDate: args.endDate ? new Date(args.endDate) : undefined,
        action: args.action,
      });
    case "audit_report_generate":
      return await audit.generateAuditReport(
        auth,
        args.programId,
        new Date(args.startDate),
        new Date(args.endDate)
      );

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
