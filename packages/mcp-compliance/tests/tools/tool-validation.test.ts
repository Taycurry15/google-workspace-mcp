/**
 * Compliance MCP tool validation tests.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { COMPLIANCE_TOOLS, handleToolCall } from "../../src/tools.js";
import * as risksModule from "../../src/risks/index.js";
import * as complianceModule from "../../src/compliance/index.js";
import * as fcpaModule from "../../src/fcpa/index.js";
import * as auditModule from "../../src/audit/index.js";

jest.mock("@gw-mcp/shared-core", () => ({
  initializeAuth: jest.fn(async () => ({ client: "auth" }) as any),
}));

jest.mock("../../src/risks/index.js", () => ({
  createRisk: jest.fn(),
  readRisks: jest.fn(),
  createMitigationAction: jest.fn(),
  generateRiskSummary: jest.fn(),
}));

jest.mock("../../src/compliance/index.js", () => ({
  createComplianceRequirement: jest.fn(),
  updateRequirementStatus: jest.fn(),
  getComplianceRequirements: jest.fn(),
  generateComplianceStatusReport: jest.fn(),
}));

jest.mock("../../src/fcpa/index.js", () => ({
  logFCPATransaction: jest.fn(),
  getFCPATransactionsForReview: jest.fn(),
}));

jest.mock("../../src/audit/index.js", () => ({
  logAudit: jest.fn(),
  getAuditTrail: jest.fn(),
  generateAuditReport: jest.fn(),
}));

const createRiskMock = risksModule.createRisk as jest.Mock;
const readRisksMock = risksModule.readRisks as jest.Mock;
const createMitigationMock = risksModule.createMitigationAction as jest.Mock;
const riskSummaryMock = risksModule.generateRiskSummary as jest.Mock;

const createRequirementMock = complianceModule.createComplianceRequirement as jest.Mock;
const updateRequirementMock = complianceModule.updateRequirementStatus as jest.Mock;
const listRequirementsMock = complianceModule.getComplianceRequirements as jest.Mock;
const statusReportMock = complianceModule.generateComplianceStatusReport as jest.Mock;

const logFCPATransactionMock = fcpaModule.logFCPATransaction as jest.Mock;
const fcpaReviewMock = fcpaModule.getFCPATransactionsForReview as jest.Mock;

const logAuditMock = auditModule.logAudit as jest.Mock;
const getAuditTrailMock = auditModule.getAuditTrail as jest.Mock;
const auditReportMock = auditModule.generateAuditReport as jest.Mock;

describe("Compliance tool definitions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.COMPLIANCE_SPREADSHEET_ID = "RISK-SHEET";
  });

  it("ensures tool metadata is complete", () => {
    expect(COMPLIANCE_TOOLS.length).toBeGreaterThan(0);
    const names = new Set<string>();
    for (const tool of COMPLIANCE_TOOLS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema?.type).toBe("object");
      expect(names.has(tool.name)).toBe(false);
      names.add(tool.name);
    }
  });

  it("routes risk tools and converts dates", async () => {
    await handleToolCall("risk_create", {
      programId: "PROG-1",
      category: "technical",
      title: "Integration risk",
      description: "API instability",
      probability: 4,
      impact: 5,
      owner: "Owner",
    });
    expect(createRiskMock).toHaveBeenCalledWith(
      expect.any(Object),
      "RISK-SHEET",
      expect.objectContaining({ title: "Integration risk" })
    );

    await handleToolCall("risk_list", {
      programId: "RISK-SHEET",
      status: "active",
      severity: "high",
    });
    expect(readRisksMock).toHaveBeenCalledWith(
      expect.any(Object),
      "RISK-SHEET",
      expect.objectContaining({ status: "active" })
    );

    await handleToolCall("risk_mitigation_create", {
      riskId: "R-1",
      programId: "PROG-1",
      description: "Add redundancy",
      owner: "Owner",
      dueDate: "2026-03-01",
      cost: 1000,
    });
    expect(createMitigationMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        dueDate: expect.any(Date),
      })
    );

    await handleToolCall("risk_summary_generate", { programId: "PROG-1" });
    expect(riskSummaryMock).toHaveBeenCalledWith(expect.any(Object), "PROG-1");
  });

  it("routes compliance requirement tools", async () => {
    await handleToolCall("compliance_requirement_create", {
      programId: "PROG-1",
      category: "regulatory",
      framework: "NIST",
      requirement: "Access control",
      description: "Implement RBAC",
      applicability: "global",
      owner: "Compliance Lead",
      dueDate: "2026-06-01",
      evidenceRequired: ["Policy"],
    });
    expect(createRequirementMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ dueDate: expect.any(Date) })
    );

    await handleToolCall("compliance_requirement_update", {
      requirementId: "REQ-1",
      status: "in_progress",
      notes: "Started",
    });
    expect(updateRequirementMock).toHaveBeenCalledWith(
      expect.any(Object),
      "REQ-1",
      "in_progress",
      "Started"
    );

    await handleToolCall("compliance_requirements_list", {
      programId: "PROG-1",
      category: "regulatory",
    });
    expect(listRequirementsMock).toHaveBeenCalledWith(
      expect.any(Object),
      "PROG-1",
      expect.objectContaining({ category: "regulatory" })
    );

    await handleToolCall("compliance_status_report", {
      programId: "PROG-1",
    });
    expect(statusReportMock).toHaveBeenCalledWith(expect.any(Object), "PROG-1");
  });

  it("routes FCPA and audit tools with date coercion", async () => {
    await handleToolCall("fcpa_transaction_log", {
      programId: "PROG-1",
      vendorId: "VEND-1",
      vendorName: "Vendor",
      transactionType: "payment",
      amount: 5000,
      currency: "USD",
      date: "2026-02-01",
      purpose: "Hosting",
      recipient: "Agency",
      recipientTitle: "Director",
      country: "US",
      approver: "CO",
    });
    expect(logFCPATransactionMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ date: expect.any(Date) })
    );

    await handleToolCall("fcpa_transactions_review", { programId: "PROG-1" });
    expect(fcpaReviewMock).toHaveBeenCalledWith(expect.any(Object), "PROG-1");

    await handleToolCall("audit_log", {
      userId: "user",
      action: "update",
      entityType: "contract",
      entityId: "CONT-1",
      programId: "PROG-1",
      changes: { status: "active" },
    });
    expect(logAuditMock).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ action: "update" }));

    await handleToolCall("audit_trail_get", {
      entityId: "CONT-1",
      startDate: "2026-01-01",
      endDate: "2026-02-01",
      action: "update",
    });
    expect(getAuditTrailMock).toHaveBeenCalledWith(
      expect.any(Object),
      "CONT-1",
      expect.objectContaining({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        action: "update",
      })
    );

    await handleToolCall("audit_report_generate", {
      programId: "PROG-1",
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    });
    expect(auditReportMock).toHaveBeenCalledWith(
      expect.any(Object),
      "PROG-1",
      expect.any(Date),
      expect.any(Date)
    );
  });
});
