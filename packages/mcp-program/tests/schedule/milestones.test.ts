/**
 * Milestones Module Tests
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import type { OAuth2Client } from "google-auth-library";
import {
  createMilestone,
  trackMilestone,
  getMilestones,
} from "../../src/program/milestones.js";
import {
  appendRows,
  generateNextId,
  readSheetRange,
  updateRow,
  getDefaultEventBus,
} from "@gw-mcp/shared-core";
import { google } from "googleapis";

jest.mock("@gw-mcp/shared-core", () => ({
  appendRows: jest.fn(),
  generateNextId: jest.fn(),
  readSheetRange: jest.fn(),
  updateRow: jest.fn(),
  getDefaultEventBus: jest.fn(),
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
const eventBusMock = { publish: jest.fn(async () => undefined) };
(getDefaultEventBus as jest.Mock).mockReturnValue(eventBusMock);

process.env.PROGRAM_SPREADSHEET_ID = "PROGRAM_SHEET";
const getPublishCalls = () => eventBusMock.publish.mock.calls as Array<any[]>;

describe("Milestones Module", () => {
  const fakeAuth = {} as OAuth2Client;

  beforeEach(() => {
    jest.clearAllMocks();
    eventBusMock.publish.mockClear();
  });

  it("should create milestone and emit creation event", async () => {
    generateNextIdMock.mockResolvedValueOnce("M-100");
    appendRowsMock.mockResolvedValueOnce(undefined as any);

    const milestone = await createMilestone(fakeAuth, {
      programId: "PROG-1",
      name: "Design Complete",
      description: "Finish design",
      targetDate: new Date("2026-03-01"),
      owner: "designer@example.com",
      acceptanceCriteria: "Board approval",
      critical: true,
      deliverables: ["DES-001"],
    });

    expect(milestone.milestoneId).toBe("M-100");
    const publishCalls = getPublishCalls();
    expect(publishCalls.length).toBeGreaterThan(0);
    const eventPayload = publishCalls[0][0];
    expect(eventPayload).toBeDefined();
    expect(eventPayload.eventType).toBe("milestone_created");
    expect(eventPayload.programId).toBe("PROG-1");
  });

  it("should track milestone achievements and emit events", async () => {
    readSheetRangeMock.mockResolvedValueOnce([
      ["header"],
      [
        "M-1",
        "PROG-1",
        "",
        "",
        "Kickoff",
        "",
        "2026-01-15",
        "",
        "",
        "",
        "in_progress",
        "owner@example.com",
        "No",
        "",
        "",
      ],
    ]);
    updateRowMock.mockResolvedValueOnce(true);

    await trackMilestone(fakeAuth, "M-1", {
      status: "achieved",
      actualDate: new Date("2026-01-16"),
    });

    const updateCall = updateRowMock.mock.calls[0];
    expect(updateCall[2]).toBe("Milestones");
    expect(updateCall[4]).toBe("M-1");
    expect(updateCall[5]).toMatchObject({ status: "achieved" });
    const calls = getPublishCalls();
    const achievedPayload = (calls.find(
      ([event]) => (event as any).eventType === "milestone_achieved"
    ) ?? [undefined])[0] as any;
    expect(achievedPayload?.data?.milestoneId).toBe("M-1");
    expect(achievedPayload?.data?.owner).toBe("owner@example.com");
  });

  it("should mark milestone at risk and emit warning event", async () => {
    readSheetRangeMock.mockResolvedValueOnce([
      ["header"],
      [
        "M-2",
        "PROG-1",
        "",
        "",
        "Testing",
        "",
        "2026-04-01",
        "",
        "",
        "",
        "in_progress",
        "qa@example.com",
        "Yes",
        "",
        "",
      ],
    ]);
    updateRowMock.mockResolvedValueOnce(true);

    await trackMilestone(fakeAuth, "M-2", {
      status: "at_risk",
    });

    const calls = getPublishCalls();
    const riskPayload = (calls.find(
      ([event]) => (event as any).eventType === "milestone_at_risk"
    ) ?? [undefined])[0] as any;
    expect(riskPayload?.data?.milestoneId).toBe("M-2");
    expect(riskPayload?.data?.critical).toBe(true);
  });

  it("should fetch milestones with filters", async () => {
    readSheetRangeMock.mockResolvedValueOnce([
      ["header"],
      [
        "M-1",
        "PROG-1",
        "",
        "",
        "Kickoff",
        "",
        new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        "",
        "",
        "",
        "not_started",
        "owner",
        "No",
        "",
        "",
      ],
      [
        "M-2",
        "PROG-1",
        "",
        "",
        "Implementation",
        "",
        new Date(Date.now() + 40 * 24 * 3600 * 1000).toISOString().split("T")[0],
        "",
        "",
        "",
        "in_progress",
        "owner",
        "Yes",
        "",
        "",
      ],
    ]);

    const milestones = await getMilestones(fakeAuth, "PROG-1", {
      upcoming: true,
      critical: false,
    });

    expect(milestones).toHaveLength(1);
    expect(milestones[0].milestoneId).toBe("M-1");
  });
});
