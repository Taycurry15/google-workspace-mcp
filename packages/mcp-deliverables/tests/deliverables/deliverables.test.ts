/**
 * Deliverable CRUD Tests
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import type { sheets_v4 } from "googleapis";
import {
  createDeliverable,
  readDeliverable,
  updateDeliverable,
  listDeliverables,
} from "../../src/deliverables/deliverables.js";
import {
  appendRows,
  generateNextId,
  readSheetRange,
  updateRow,
  findRowById,
} from "@gw-mcp/shared-core";

jest.mock("@gw-mcp/shared-core", () => ({
  appendRows: jest.fn(),
  generateNextId: jest.fn(),
  readSheetRange: jest.fn(),
  updateRow: jest.fn(),
  findRowById: jest.fn(),
}));

const appendRowsMock = appendRows as jest.MockedFunction<typeof appendRows>;
const generateNextIdMock = generateNextId as jest.MockedFunction<typeof generateNextId>;
const readSheetRangeMock = readSheetRange as jest.MockedFunction<typeof readSheetRange>;
const updateRowMock = updateRow as jest.MockedFunction<typeof updateRow>;
const findRowByIdMock = findRowById as jest.MockedFunction<typeof findRowById>;

describe("Deliverables Module", () => {
  const sheets = {} as sheets_v4.Sheets;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates deliverables with generated IDs and sheet append", async () => {
    generateNextIdMock.mockResolvedValueOnce("DEL-100");
    appendRowsMock.mockResolvedValueOnce(undefined as any);

    const deliverable = await createDeliverable(
      sheets,
      "SHEET-1",
      {
        programId: "PROG-1",
        wbsCode: "1.2.3",
        name: "Interface Spec",
        description: "Define interface contract",
        type: "document",
        owner: "owner@example.com",
        dueDate: new Date("2026-03-01"),
        priority: "high",
        acceptanceCriteria: ["Meets template", "Signed by architect"],
        notes: "Initial draft",
      },
      "author@example.com"
    );

    expect(deliverable.deliverableId).toBe("DEL-100");
    expect(deliverable.acceptanceCriteria).toContain("Meets template");
    expect(appendRowsMock).toHaveBeenCalledTimes(1);
    expect(appendRowsMock.mock.calls[0][1]).toBe("SHEET-1");
  });

  it("parses deliverable rows when reading by ID", async () => {
    const row = [
      "DEL-200",
      "PROG-9",
      "",
      "",
      "",
      "Data Migration",
      "Plan data move",
      "software",
      "lead@example.com",
      "2026-05-01",
      "",
      "",
      "",
      "in_progress",
      "pending",
      "45",
      "3",
      "Acceptance text",
      "DEP-1, DEP-2",
      "DOC-1",
      "MS-1",
      "tag1, tag2",
      "notes",
      "2025-12-01T00:00:00.000Z",
      "creator",
      "2025-12-02T00:00:00.000Z",
      "editor",
    ];
    findRowByIdMock.mockResolvedValueOnce({ rowData: row, rowIndex: 10 });

    const deliverable = await readDeliverable(sheets, "SHEET-1", "DEL-200");

    expect(deliverable?.name).toBe("Data Migration");
    expect(deliverable?.dependencies).toEqual(["DEP-1", "DEP-2"]);
  });

  it("updates deliverables and writes formatted fields", async () => {
    const baseRow = [
      "DEL-300",
      "PROG-1",
      "",
      "",
      "",
      "Spec",
      "desc",
      "document",
      "owner",
      "2026-01-10",
      "",
      "",
      "",
      "not_started",
      "pending",
      "0",
      "",
      "Criteria",
      "",
      "",
      "",
      "",
      "",
      "2025-12-01T00:00:00.000Z",
      "creator",
      "2025-12-01T00:00:00.000Z",
      "creator",
    ];
    findRowByIdMock.mockResolvedValueOnce({ rowData: baseRow, rowIndex: 2 });

    await updateDeliverable(
      sheets,
      "SHEET-1",
      {
        deliverableId: "DEL-300",
        name: "Updated Spec",
        owner: "new-owner@example.com",
        actualDate: new Date("2026-01-11"),
        dueDate: new Date("2026-01-10"),
        relatedDocuments: ["DOC-9"],
      },
      "updater"
    );

    expect(updateRowMock).toHaveBeenCalledTimes(1);
    const updateArgs = updateRowMock.mock.calls[0];
    expect(updateArgs[5]).toMatchObject({
      name: "Updated Spec",
      owner: "new-owner@example.com",
      actualDate: "2026-01-11",
      relatedDocuments: "DOC-9",
      variance: 1,
      modifiedBy: "updater",
    });
  });

  it("lists deliverables with filters applied", async () => {
    readSheetRangeMock.mockResolvedValueOnce([
      ["header"],
      ["DEL-1", "PROG-1", "", "", "", "First", "", "document", "owner", "2026-02-01", "", "", "", "in_progress", "pending", "10", "", "", "", "", "", "", "", "", "", ""],
      ["DEL-2", "PROG-2", "", "", "", "Second", "", "software", "owner2", "2026-03-01", "", "", "", "not_started", "pending", "0", "", "", "", "", "", "", "", "", "", ""],
    ]);

    const items = await listDeliverables(sheets, "SHEET-1", {
      programId: "PROG-1",
    });

    expect(items).toHaveLength(1);
    expect(items[0].deliverableId).toBe("DEL-1");
  });
});
