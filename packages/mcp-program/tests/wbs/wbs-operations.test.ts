/**
 * WBS Module Tests
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { OAuth2Client } from "google-auth-library";
import { createWBS, readWBS } from "../../src/program/wbs.js";
import { appendRows, readSheetRange } from "@gw-mcp/shared-core";
import { google } from "googleapis";

jest.mock("@gw-mcp/shared-core", () => ({
  appendRows: jest.fn(),
  readSheetRange: jest.fn(),
}));

jest.mock("googleapis", () => ({
  google: {
    sheets: jest.fn(() => ({})),
  },
}));

const appendRowsMock = appendRows as jest.MockedFunction<typeof appendRows>;
const readSheetRangeMock = readSheetRange as jest.MockedFunction<typeof readSheetRange>;
process.env.PROGRAM_SPREADSHEET_ID = "PROGRAM_SHEET";

describe("WBS Module", () => {
  const fakeAuth = {} as OAuth2Client;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create WBS entries and calculate level", async () => {
    appendRowsMock.mockResolvedValueOnce(undefined as any);

    const wbs = await createWBS(fakeAuth, {
      wbsCode: "1.2.3",
      programId: "PROG-1",
      parentCode: "1.2",
      description: "Integration",
      responsible: "owner@example.com",
      deliverables: ["DEL-1", "DEL-2"],
    });

    expect(wbs.level).toBe(3);
    const call = appendRowsMock.mock.calls[0];
    expect(call[2]).toBe("WBS!A:A");
    expect(call[3]).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          "1.2.3",
          "PROG-1",
          "1.2",
          3,
          "Integration",
          "DEL-1, DEL-2",
          "owner@example.com",
          0,
          "planning",
        ]),
      ])
    );
  });

  it("should read WBS rows, filter by program and level, and sort by code", async () => {
    readSheetRangeMock.mockResolvedValueOnce([
      ["header"],
      ["1", "PROG-1", "", "1", "Program init", "", "owner", "0", "planning"],
      ["1.2", "PROG-1", "1", "2", "Sub work", "DEL-1, DEL-2", "owner", "10", "in_progress"],
      ["1.1", "PROG-1", "1", "2", "Another sub", "", "owner", "20", "in_progress"],
      ["2", "PROG-2", "", "1", "Other program", "", "owner", "0", "planning"],
    ]);

    const wbs = await readWBS(fakeAuth, "PROG-1", 2);

    expect(wbs).toHaveLength(2);
    expect(wbs[0].wbsCode).toBe("1.1");
    expect(wbs[1].wbsCode).toBe("1.2");
    expect(wbs[0].deliverables).toEqual([]);
    expect(wbs[1].deliverables).toEqual(["DEL-1", "DEL-2"]);
  });
});
