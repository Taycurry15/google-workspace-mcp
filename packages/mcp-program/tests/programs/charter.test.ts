/**
 * Program Charter Module Tests
 *
 * Validates charter creation, retrieval, updating, and listing.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { OAuth2Client } from "google-auth-library";
import {
  appendRows,
  generateNextId,
  readSheetRange,
  updateRow,
} from "@gw-mcp/shared-core";
import { google } from "googleapis";

jest.mock("@gw-mcp/shared-core", () => ({
  appendRows: jest.fn(),
  generateNextId: jest.fn(),
  readSheetRange: jest.fn(),
  updateRow: jest.fn(),
}));

jest.mock("googleapis", () => ({
  google: {
    sheets: jest.fn(() => ({})),
  },
}));

const appendRowsMock = appendRows as jest.MockedFunction<typeof appendRows>;
const generateNextIdMock = generateNextId as jest.MockedFunction<typeof generateNextId>;
const readSheetRangeMock = readSheetRange as jest.MockedFunction<typeof readSheetRange>;
const updateRowMock = updateRow as jest.MockedFunction<typeof updateRow>;
const sheetsMock = google.sheets as jest.Mock;

const TEST_SPREADSHEET_ID = "PROGRAM_SHEET";

let createCharter: typeof import("../../src/program/charter.js").createCharter;
let readCharter: typeof import("../../src/program/charter.js").readCharter;
let updateCharter: typeof import("../../src/program/charter.js").updateCharter;
let listCharters: typeof import("../../src/program/charter.js").listCharters;

describe("Program Charter Module", () => {
  const fakeAuth = {} as OAuth2Client;

  beforeAll(async () => {
    process.env.PROGRAM_SPREADSHEET_ID = TEST_SPREADSHEET_ID;
    ({
      createCharter,
      readCharter,
      updateCharter,
      listCharters,
    } = await import("../../src/program/charter.js"));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a charter and append to sheet", async () => {
    generateNextIdMock.mockResolvedValueOnce("PROG-001");
    appendRowsMock.mockResolvedValueOnce(undefined as any);

    const charter = await createCharter(fakeAuth, {
      name: "Modernization",
      description: "Upgrade systems",
      sponsor: "VP Delivery",
      programManager: "pm@example.com",
      objective: "Modernize core platforms",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-06-30"),
      priority: "high",
      budget: 1000000,
      stakeholders: ["cto@example.com", "ops@example.com"],
      tags: ["transformation"],
    });

    expect(charter.programId).toBe("PROG-001");
    expect(appendRowsMock).toHaveBeenCalledWith(
      expect.any(Object),
      TEST_SPREADSHEET_ID,
      "Programs!A:A",
      expect.any(Array)
    );
  });

  it("should read an existing charter row", async () => {
    readSheetRangeMock.mockResolvedValueOnce([
      ["Program ID"],
      [
        "PROG-100",
        "Test Program",
        "desc",
        "sponsor",
        "pm",
        "objective",
        "2026-01-01",
        "2026-12-31",
        "2026-01-05",
        "",
        "execution",
        "high",
        "green",
        "50",
        "250000",
        "stake1, stake2",
        "tag1, tag2",
        "2025-12-01",
        "2025-12-15",
      ],
    ]);

    const charter = await readCharter(fakeAuth, "PROG-100");

    expect(charter?.name).toBe("Test Program");
    expect(charter?.priority).toBe("high");
    expect(charter?.stakeholders).toEqual(["stake1", "stake2"]);
  });

  it("should return null when charter not found", async () => {
    readSheetRangeMock.mockResolvedValueOnce([["Program ID"]]);
    const result = await readCharter(fakeAuth, "unknown");
    expect(result).toBeNull();
  });

  it("should update a charter and format arrays/dates", async () => {
    updateRowMock.mockResolvedValueOnce(true);

    const success = await updateCharter(fakeAuth, "PROG-200", {
      sponsor: "new sponsor",
      stakeholders: ["a", "b"],
      startDate: new Date("2026-02-01"),
    });

    expect(success).toBe(true);
    expect(updateRowMock).toHaveBeenCalledWith(
      expect.any(Object),
      TEST_SPREADSHEET_ID,
      "Programs",
      "Program ID",
      "PROG-200",
      expect.objectContaining({
        sponsor: "new sponsor",
        stakeholders: "a, b",
        startDate: "2026-02-01",
      }),
      expect.any(Object)
    );
  });

  it("should list charters with filters applied", async () => {
    readSheetRangeMock.mockResolvedValueOnce([
      ["Program ID"],
      ["PROG-1", "Name1", "desc", "", "", "", "2026-01-01", "2026-02-01", "", "", "execution", "high", "green", "0", "100", "", "", "2025-12-01", "2025-12-01"],
      ["PROG-2", "Name2", "desc", "", "", "", "2026-01-01", "2026-02-01", "", "", "initiation", "medium", "amber", "0", "100", "", "", "2025-12-01", "2025-12-01"],
    ]);

    const programs = await listCharters(fakeAuth, { status: "execution", priority: "high" });

    expect(programs).toHaveLength(1);
    expect(programs[0].programId).toBe("PROG-1");
  });
});
