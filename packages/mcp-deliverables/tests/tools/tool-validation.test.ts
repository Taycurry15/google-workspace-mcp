/**
 * Deliverable Tool Validation Tests
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { DELIVERABLE_TOOLS, handleToolCall } from "../../src/tools.js";
import * as deliverablesModule from "../../src/deliverables/deliverables.js";
import * as submissionsModule from "../../src/deliverables/submissions.js";
import * as reviewModule from "../../src/deliverables/review.js";
import * as qualityModule from "../../src/deliverables/quality.js";
import * as trackingModule from "../../src/deliverables/tracking.js";
import * as reportingModule from "../../src/deliverables/reporting.js";

jest.mock("@gw-mcp/shared-core", () => {
  const sheets = { kind: "sheets" };
  const drive = { kind: "drive" };
  return {
    initializeAuth: jest.fn(async () => ({} as any)),
    createSheetsClient: jest.fn(() => sheets as any),
    createDriveClient: jest.fn(() => drive as any),
  };
});

jest.mock("../../src/deliverables/deliverables.js", () => ({
  createDeliverable: jest.fn(),
  readDeliverable: jest.fn(),
  listDeliverables: jest.fn(),
  updateDeliverable: jest.fn(),
  deleteDeliverable: jest.fn(),
}));

jest.mock("../../src/deliverables/submissions.js", () => ({
  submitDeliverable: jest.fn(),
  listSubmissionsForDeliverable: jest.fn(),
}));

jest.mock("../../src/deliverables/review.js", () => ({
  assignReviewer: jest.fn(),
  submitReview: jest.fn(),
  listReviewsForDeliverable: jest.fn(),
}));

jest.mock("../../src/deliverables/quality.js", () => ({
  evaluateDeliverable: jest.fn(),
}));

jest.mock("../../src/deliverables/tracking.js", () => ({
  trackStatus: jest.fn(),
  getTrackingHistory: jest.fn(),
}));

jest.mock("../../src/deliverables/reporting.js", () => ({
  generateQualityReport: jest.fn(),
  generateStatusReport: jest.fn(),
  generateOverdueReport: jest.fn(),
}));

const createDeliverableMock = deliverablesModule.createDeliverable as jest.Mock;
const readDeliverableMock = deliverablesModule.readDeliverable as jest.Mock;
const listDeliverablesMock = deliverablesModule.listDeliverables as jest.Mock;
const updateDeliverableMock = deliverablesModule.updateDeliverable as jest.Mock;
const deleteDeliverableMock = deliverablesModule.deleteDeliverable as jest.Mock;
const submitDeliverableMock = submissionsModule.submitDeliverable as jest.Mock;
const submissionHistoryMock = submissionsModule.listSubmissionsForDeliverable as jest.Mock;
const assignReviewerMock = reviewModule.assignReviewer as jest.Mock;
const submitReviewMock = reviewModule.submitReview as jest.Mock;
const listReviewsMock = reviewModule.listReviewsForDeliverable as jest.Mock;
const qualityAssessMock = qualityModule.evaluateDeliverable as jest.Mock;
const qualityReportMock = reportingModule.generateQualityReport as jest.Mock;
const trackStatusMock = trackingModule.trackStatus as jest.Mock;
const trackingHistoryMock = trackingModule.getTrackingHistory as jest.Mock;
const statusReportMock = reportingModule.generateStatusReport as jest.Mock;
const overdueReportMock = reportingModule.generateOverdueReport as jest.Mock;

describe("Deliverable Tool Definitions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ensures tool definitions have names, descriptions, and schemas", () => {
    expect(DELIVERABLE_TOOLS.length).toBeGreaterThan(0);
    const names = new Set<string>();
    for (const tool of DELIVERABLE_TOOLS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema?.type).toBe("object");
      expect(names.has(tool.name)).toBe(false);
      names.add(tool.name);
    }
  });

  it("routes deliverable CRUD tool calls", async () => {
    await handleToolCall("deliverable_create", {
      spreadsheetId: "sheet",
      deliverable: { name: "Spec" },
      createdBy: "user",
    });
    expect(createDeliverableMock).toHaveBeenCalledWith(
      expect.any(Object),
      "sheet",
      { name: "Spec" },
      "user"
    );

    await handleToolCall("deliverable_read", {
      spreadsheetId: "sheet",
      deliverableId: "DEL-1",
    });
    expect(readDeliverableMock).toHaveBeenCalled();

    await handleToolCall("deliverable_read", { spreadsheetId: "sheet" });
    expect(listDeliverablesMock).toHaveBeenCalled();

    await handleToolCall("deliverable_update", {
      spreadsheetId: "sheet",
      deliverableId: "DEL-1",
      updates: { status: "approved" },
      modifiedBy: "user",
    });
    expect(updateDeliverableMock).toHaveBeenCalledWith(
      expect.any(Object),
      "sheet",
      { status: "approved" },
      "user"
    );

    await handleToolCall("deliverable_delete", {
      spreadsheetId: "sheet",
      deliverableId: "DEL-9",
    });
    expect(deleteDeliverableMock).toHaveBeenCalled();
  });

  it("routes submission and review tools", async () => {
    await handleToolCall("deliverable_submit", {
      spreadsheetId: "sheet",
      deliverableId: "DEL-1",
      fileIds: ["file"],
      submittedBy: "user",
    });
    expect(submitDeliverableMock).toHaveBeenCalled();

    await handleToolCall("deliverable_submission_history", {
      spreadsheetId: "sheet",
      deliverableId: "DEL-1",
    });
    expect(submissionHistoryMock).toHaveBeenCalledWith(
      expect.any(Object),
      "sheet",
      "DEL-1"
    );

    await handleToolCall("deliverable_review_start", {
      spreadsheetId: "sheet",
      deliverableId: "DEL-1",
      reviewer: "reviewer",
    });
    expect(assignReviewerMock).toHaveBeenCalled();

    await handleToolCall("deliverable_review_submit", {
      spreadsheetId: "sheet",
      deliverableId: "DEL-1",
      reviewerId: "rev",
      decision: "approve",
    });
    expect(submitReviewMock).toHaveBeenCalled();

    await handleToolCall("deliverable_review_status", {
      spreadsheetId: "sheet",
      deliverableId: "DEL-1",
    });
    expect(listReviewsMock).toHaveBeenCalled();
  });

  it("routes quality, tracking, and reporting tools", async () => {
    await handleToolCall("deliverable_quality_assess", {
      spreadsheetId: "sheet",
      deliverableId: "DEL-1",
      checklistId: "CHK",
      results: [],
    });
    expect(qualityAssessMock).toHaveBeenCalled();

    await handleToolCall("deliverable_quality_report", {
      spreadsheetId: "sheet",
      programId: "PROG-1",
    });
    expect(qualityReportMock).toHaveBeenCalled();

    await handleToolCall("deliverable_tracking_update", {
      spreadsheetId: "sheet",
      deliverableId: "DEL-1",
      status: "in_progress",
    });
    expect(trackStatusMock).toHaveBeenCalled();

    await handleToolCall("deliverable_tracking_dashboard", {
      spreadsheetId: "sheet",
      deliverableId: "DEL-1",
    });
    expect(trackingHistoryMock).toHaveBeenCalled();

    await handleToolCall("deliverable_report_status", {
      spreadsheetId: "sheet",
      programId: "PROG-1",
    });
    expect(statusReportMock).toHaveBeenCalled();

    await handleToolCall("deliverable_report_overdue", {
      spreadsheetId: "sheet",
      programId: "PROG-1",
    });
    expect(overdueReportMock).toHaveBeenCalled();
  });
});
