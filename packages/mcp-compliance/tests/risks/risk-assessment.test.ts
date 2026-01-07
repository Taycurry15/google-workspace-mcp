/**
 * Compliance risk module tests.
 *
 * Validates spreadsheet interactions, filtering, ID generation, and event
 * publishing for the remaining Compliance server.
 */

import { describe, it, expect, beforeEach, afterAll, jest } from "@jest/globals";
import type { OAuth2Client } from "google-auth-library";
import * as risksModule from "../../src/risks/risks.js";
import {
  readRisks,
  getCriticalRisks,
  updateRiskMitigation,
  closeRisk,
  getNextRiskId,
  createRisk,
  batchCreateRisks,
} from "../../src/risks/risks.js";

const valuesGetMock = jest.fn();
const valuesUpdateMock = jest.fn();
const valuesAppendMock = jest.fn();
const valuesBatchUpdateMock = jest.fn();

jest.mock("googleapis", () => ({
  google: {
    sheets: jest.fn(() => ({
      spreadsheets: {
        values: {
          get: valuesGetMock,
          update: valuesUpdateMock,
          append: valuesAppendMock,
          batchUpdate: valuesBatchUpdateMock,
        },
      },
    })),
  },
}));

const publishMock = jest.fn();
jest.mock("@gw-mcp/shared-workflows", () => ({
  getDefaultEventBus: jest.fn(() => ({
    publish: publishMock,
  })),
}));

const consoleLogSpy = jest
  .spyOn(console, "log")
  .mockImplementation(() => undefined as unknown as void);

const auth = {} as OAuth2Client;
const SHEET = "RISK-SHEET";

describe("Compliance risk management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    valuesGetMock.mockReset();
    valuesUpdateMock.mockReset();
    valuesAppendMock.mockReset();
    valuesBatchUpdateMock.mockReset();
    publishMock.mockReset();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it("reads risks, filters rows, and sorts by score", async () => {
    valuesGetMock.mockResolvedValueOnce({
      data: {
        values: [
          ["ID", "Name", "Category", "Prob", "Impact", "Score", "Status", "Response", "Owner", "Mitigation"],
          ["R-01", "Risk A", "schedule", "5", "4", "20", "active", "", "Alice", "50"],
          ["R-02", "Risk B", "budget", "2", "5", "10", "closed", "", "Bob", "30"],
          ["R-03", "Risk C", "technical", "4", "5", "0", "active", "", "Chris", "40"],
        ],
      },
    });

    const risks = await readRisks(auth, SHEET, { statusFilter: "active", minScore: 15 });

    expect(valuesGetMock).toHaveBeenCalledWith({
      spreadsheetId: SHEET,
      range: "Risks!A2:J100",
    });
    expect(risks).toHaveLength(1);
    expect(risks[0].id).toBe("R-01");
    expect(risks[0].score).toBe(20);
  });

  it("passes severity filter when requesting critical risks", async () => {
    const readSpy = jest
      .spyOn(risksModule, "readRisks")
      .mockResolvedValueOnce([]);

    await getCriticalRisks(auth, SHEET);

    expect(readSpy).toHaveBeenCalledWith(auth, SHEET, {
      statusFilter: "active",
      minScore: 16,
    });
    readSpy.mockRestore();
  });

  it("updates risk mitigation percentage in the sheet", async () => {
    valuesGetMock.mockResolvedValueOnce({
      data: { values: [["R-01"], ["R-99"], ["R-02"]] },
    });
    valuesUpdateMock.mockResolvedValueOnce({});

    await updateRiskMitigation(auth, SHEET, "R-02", 75);

    expect(valuesUpdateMock).toHaveBeenCalledWith({
      spreadsheetId: SHEET,
      range: "Risks!J4",
      valueInputOption: "RAW",
      requestBody: { values: [[75]] },
    });
  });

  it("closes risks, updates sheet values, and emits events", async () => {
    valuesGetMock.mockResolvedValueOnce({
      data: {
        values: [
          ["R-77", "Legacy risk", "technical", "3", "4", "12", "active", "", "Owner", "30"],
        ],
      },
    });
    valuesBatchUpdateMock.mockResolvedValueOnce({});

    await closeRisk(auth, SHEET, "R-77");

    expect(valuesBatchUpdateMock).toHaveBeenCalledWith({
      spreadsheetId: SHEET,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          { range: "Risks!G2", values: [["closed"]] },
          { range: "Risks!J2", values: [[100]] },
        ],
      },
    });
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "risk_closed",
        data: expect.objectContaining({ riskId: "R-77", owner: "Owner" }),
      })
    );
  });

  it("generates sequential risk IDs", async () => {
    const readSpy = jest
      .spyOn(risksModule, "readRisks")
      .mockResolvedValueOnce([
        { id: "R-01", score: 10, name: "A", category: "technical", probability: 2, impact: 5, status: "active", response: "", owner: "", mitigation: 0 },
        { id: "R-12", score: 20, name: "B", category: "schedule", probability: 4, impact: 5, status: "active", response: "", owner: "", mitigation: 0 },
      ] as any);

    const nextId = await getNextRiskId(auth, SHEET);

    expect(nextId).toBe("R-13");
    readSpy.mockRestore();
  });

  it("creates risks, appends rows, and emits events for high severity", async () => {
    jest.spyOn(risksModule, "getNextRiskId").mockResolvedValueOnce("R-21");
    valuesAppendMock.mockResolvedValueOnce({});

    const newId = await createRisk(auth, SHEET, {
      name: "Critical integration risk",
      category: "technical",
      probability: 5,
      impact: 4,
      status: "active",
      response: "Mitigate",
      owner: "Risk Owner",
      mitigation: 0,
    });

    expect(newId).toBe("R-21");
    expect(valuesAppendMock).toHaveBeenCalledWith({
      spreadsheetId: SHEET,
      range: "Risks!A2:J100",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          ["R-21", "Critical integration risk", "technical", 5, 4, 20, "active", "Mitigate", "Risk Owner", 0],
        ],
      },
    });
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "risk_identified",
        data: expect.objectContaining({ riskId: "R-21", score: 20 }),
      })
    );
    (risksModule.getNextRiskId as jest.Mock).mockRestore();
  });

  it("creates multiple risks in batch with sequential IDs", async () => {
    jest.spyOn(risksModule, "getNextRiskId").mockResolvedValueOnce("R-05");
    valuesAppendMock.mockResolvedValueOnce({});

    const ids = await batchCreateRisks(auth, SHEET, [
      {
        name: "Risk 1",
        category: "schedule",
        probability: 2,
        impact: 3,
        status: "active",
        response: "",
        owner: "Owner",
        mitigation: 0,
      },
      {
        name: "Risk 2",
        category: "budget",
        probability: 3,
        impact: 4,
        status: "active",
        response: "",
        owner: "Owner",
        mitigation: 0,
      },
    ]);

    expect(ids).toEqual(["R-05", "R-06"]);
    expect(valuesAppendMock).toHaveBeenCalledWith({
      spreadsheetId: SHEET,
      range: "Risks!A2:J100",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          ["R-05", "Risk 1", "schedule", 2, 3, 6, "active", "", "Owner", 0],
          ["R-06", "Risk 2", "budget", 3, 4, 12, "active", "", "Owner", 0],
        ],
      },
    });
    (risksModule.getNextRiskId as jest.Mock).mockRestore();
  });
});
