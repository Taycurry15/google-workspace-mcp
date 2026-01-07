/**
 * Deliverable Submission Workflow Tests
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { sheets_v4, drive_v3 } from "googleapis";
import * as submissionsModule from "../../src/deliverables/submissions.js";
import {
  validateSubmission,
  determineReviewer,
  getDeliverableFolderPath,
  submitDeliverable,
  listSubmissionsForDeliverable,
  updateSubmissionStatus,
  getPendingSubmissions,
  getOverdueSubmissions,
} from "../../src/deliverables/submissions.js";
import {
  readSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "@gw-mcp/shared-core";
import {
  readDeliverable,
  updateDeliverable,
} from "../../src/deliverables/deliverables.js";

jest.mock("@gw-mcp/shared-core", () => ({
  readSheetRange: jest.fn(),
  appendRows: jest.fn(),
  updateRow: jest.fn(),
  findRowById: jest.fn(),
  generateNextId: jest.fn(),
}));

jest.mock("../../src/deliverables/deliverables.js", () => ({
  readDeliverable: jest.fn(),
  updateDeliverable: jest.fn(),
}));

const readSheetRangeMock = readSheetRange as jest.MockedFunction<typeof readSheetRange>;
const appendRowsMock = appendRows as jest.MockedFunction<typeof appendRows>;
const updateRowMock = updateRow as jest.MockedFunction<typeof updateRow>;
const findRowByIdMock = findRowById as jest.MockedFunction<typeof findRowById>;
const generateNextIdMock = generateNextId as jest.MockedFunction<typeof generateNextId>;
const readDeliverableMock = readDeliverable as jest.MockedFunction<typeof readDeliverable>;
const updateDeliverableMock = updateDeliverable as jest.MockedFunction<typeof updateDeliverable>;

const sheets = {} as sheets_v4.Sheets;
const drive = {} as drive_v3.Drive;

describe("Submission helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("validates submissions and lists missing items", () => {
    const result = validateSubmission([], "", "  ");
    expect(result.complete).toBe(false);
    expect(result.missingItems).toEqual(
      expect.arrayContaining([
        "No documents attached",
        "Acceptance criteria not defined",
        "Submitter notes required",
      ])
    );
  });

  it("determines reviewer with fallbacks", () => {
    process.env.DESIGN_REVIEWER = "design@example.com";
    const assignment = determineReviewer("design");
    expect(assignment.reviewerId).toBe("design@example.com");
    expect(assignment.reviewDueDate.getTime()).toBeGreaterThan(Date.now());
  });

  it("builds deliverable folder path", () => {
    expect(getDeliverableFolderPath("PROG-1", "DEL-1", "review")).toBe(
      "03-Execution/Deliverables/DEL-1/Review"
    );
  });
});

describe("Submission workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits deliverables and updates status", async () => {
    readDeliverableMock.mockResolvedValueOnce({
      deliverableId: "DEL-1",
      acceptanceCriteria: "Criteria",
      type: "document",
      programId: "PROG-1",
    } as any);
    generateNextIdMock.mockResolvedValueOnce("SUB-10");
    readSheetRangeMock.mockResolvedValueOnce([["header"]]); // listSubmissionsForDeliverable
    appendRowsMock.mockResolvedValueOnce(undefined as any);
    updateDeliverableMock.mockResolvedValueOnce(undefined as any);

    const result = await submitDeliverable(
      sheets,
      drive,
      "SHEET-1",
      {
        deliverableId: "DEL-1",
        fileIds: ["file-1"],
        submitterNotes: "Ready",
      },
      "submitter@example.com"
    );

    expect(result.submission.submissionId).toBe("SUB-10");
    expect(result.submission.version).toBe("1.0");
    expect(appendRowsMock).toHaveBeenCalledTimes(1);
    expect(updateDeliverableMock).toHaveBeenCalledWith(
      sheets,
      "SHEET-1",
      expect.objectContaining({ deliverableId: "DEL-1", status: "submitted" }),
      "submitter@example.com"
    );
  });

  it("lists submissions for a deliverable sorted by date", async () => {
    const now = new Date();
    readSheetRangeMock.mockResolvedValueOnce([
      ["header"],
      [
        "SUB-1",
        "DEL-1",
        "user",
        new Date(now.getTime() - 1 * 86400000).toISOString(),
        "1.0",
        "a",
        "",
        "pending",
        "",
        "",
        "TRUE",
        "",
        "",
      ],
      [
        "SUB-2",
        "DEL-1",
        "user",
        now.toISOString(),
        "2.0",
        "a",
        "",
        "pending",
        "",
        "",
        "TRUE",
        "",
        "",
      ],
    ]);

    const submissions = await listSubmissionsForDeliverable(
      sheets,
      "SHEET-1",
      "DEL-1"
    );

    expect(submissions.map((s) => s.submissionId)).toEqual(["SUB-2", "SUB-1"]);
  });

  it("updates submission status when record exists", async () => {
    findRowByIdMock.mockResolvedValueOnce({
      rowData: [
        "SUB-1",
        "DEL-1",
        "user",
        new Date().toISOString(),
        "1.0",
        "a",
        "",
        "pending",
        "",
        "",
        "TRUE",
        "",
        "",
      ],
      rowIndex: 3,
    });

    await updateSubmissionStatus(
      sheets,
      "SHEET-1",
      "SUB-1",
      "approved" as any
    );

    expect(updateRowMock).toHaveBeenCalledWith(
      sheets,
      "SHEET-1",
      "Submissions",
      "Submission ID",
      "SUB-1",
      { status: "approved" },
      expect.any(Object)
    );
  });

  it("returns pending submissions filtered by reviewer", async () => {
    readSheetRangeMock.mockResolvedValueOnce([
      ["header"],
      ["SUB-1", "DEL-1", "user", new Date().toISOString(), "1.0", "f", "", "pending", "rev-a", new Date().toISOString(), "TRUE", "", ""],
      ["SUB-2", "DEL-1", "user", new Date().toISOString(), "1.0", "f", "", "approved", "rev-a", "", "TRUE", "", ""],
      ["SUB-3", "DEL-1", "user", new Date().toISOString(), "1.0", "f", "", "in_review", "rev-b", "", "TRUE", "", ""],
    ]);

    const queue = await getPendingSubmissions(sheets, "SHEET-1", "rev-b");
    expect(queue).toHaveLength(1);
    expect(queue[0].submissionId).toBe("SUB-3");
  });

  it("returns overdue submissions from pending list", async () => {
    readSheetRangeMock.mockResolvedValueOnce([
      ["header"],
      [
        "SUB-10",
        "DEL-1",
        "user",
        new Date().toISOString(),
        "1.0",
        "",
        "",
        "pending",
        "rev",
        new Date(Date.now() - 2 * 86400000).toISOString(),
        "TRUE",
        "",
        "",
      ],
      [
        "SUB-11",
        "DEL-1",
        "user",
        new Date().toISOString(),
        "1.0",
        "",
        "",
        "pending",
        "rev",
        new Date(Date.now() + 2 * 86400000).toISOString(),
        "TRUE",
        "",
        "",
      ],
    ]);

    const results = await getOverdueSubmissions(sheets, "SHEET-1");
    expect(results).toHaveLength(1);
    expect(results[0].submissionId).toBe("SUB-10");
  });
});
