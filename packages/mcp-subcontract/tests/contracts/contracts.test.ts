/**
 * Contract management tests for the Subcontract server.
 *
 * Covers CRUD helpers, filtering logic, and renewal detection.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import type { sheets_v4 } from "googleapis";
import {
  createContract,
  readContract,
  updateContract,
  listContracts,
  deleteContract,
  getActiveContracts,
  getExpiringContracts,
} from "../../src/contracts/contracts.js";
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

const SHEET_ID = "SUBCONTRACT-SHEET";
const sheets = {} as sheets_v4.Sheets;

function createContractRow(overrides: Partial<Record<number, any>> = {}): any[] {
  const row = [
    "CONT-001",
    "C-1001",
    "VEND-001",
    "PROG-001",
    "Network Upgrade",
    "Upgrade routers",
    "time_and_materials",
    "active",
    "500000",
    "USD",
    "CAPEX",
    "2026-01-01",
    "2026-12-31",
    "2026-01-05",
    "Pat Program",
    "Vendor Signer",
    "Client Signer",
    "Net 30",
    "Deliver as scoped",
    "None",
    "TRUE",
    "10000",
    "12",
    "Scope statement",
    "DEL-001, DEL-002",
    "TRUE",
    "FALSE",
    "2025-01-01T00:00:00.000Z",
    "creator@example.com",
    "2025-02-01T00:00:00.000Z",
    "https://docs/contracts/1",
    "notes",
  ];

  for (const [index, value] of Object.entries(overrides)) {
    row[Number(index)] = value;
  }
  return row;
}

describe("Subcontract contract module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("creates contracts with IDs and formatted sheet rows", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-15T00:00:00.000Z"));
    generateNextIdMock.mockResolvedValueOnce("CONT-055");
    appendRowsMock.mockResolvedValueOnce(undefined as unknown as void);

    const contract = await createContract(
      sheets,
      SHEET_ID,
      {
        contractNumber: "C-2000",
        vendorId: "VEND-001",
        programId: "PROG-5",
        title: "Security Upgrade",
        description: "Modernize SOC tooling",
        type: "fixed_price",
        totalValue: 750000,
        currency: "USD",
        fundingSource: "CAPEX",
        startDate: new Date("2026-02-01"),
        endDate: new Date("2027-01-31"),
        contractManager: "Marty Manager",
        vendorSignatory: "Vendor Exec",
        clientSignatory: "Client Exec",
        paymentTerms: "Net 30",
        deliveryTerms: "Delivery at milestone",
        scopeOfWork: "Full SOC",
        fcpaReviewRequired: true,
      },
      "author@example.com"
    );

    expect(contract.contractId).toBe("CONT-055");
    expect(contract.status).toBe("draft");
    expect(appendRowsMock).toHaveBeenCalledTimes(1);
    const appendedRow = appendRowsMock.mock.calls[0][3][0];
    expect(appendedRow[0]).toBe("CONT-055");
    expect(appendedRow[11]).toBe("2026-02-01");
    expect(appendedRow[27]).toBe("2026-01-15T00:00:00.000Z");
  });

  it("reads contracts by ID and parses sheet values", async () => {
    const row = createContractRow({ 0: "CONT-500", 7: "draft", 26: "TRUE" });
    findRowByIdMock.mockResolvedValueOnce({ rowData: row, rowIndex: 3 });

    const contract = await readContract(sheets, SHEET_ID, "CONT-500");

    expect(contract?.contractId).toBe("CONT-500");
    expect(contract?.fcpaReviewCompleted).toBe(true);
    expect(contract?.deliverables).toEqual(["DEL-001", "DEL-002"]);
  });

  it("updates contracts and formats changed dates", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-04-01T00:00:00.000Z"));
    findRowByIdMock.mockResolvedValueOnce({ rowData: createContractRow(), rowIndex: 2 });
    updateRowMock.mockResolvedValueOnce(undefined as unknown as void);

    const updated = await updateContract(
      sheets,
      SHEET_ID,
      {
        contractId: "CONT-001",
        status: "active",
        startDate: new Date("2026-02-15"),
        endDate: new Date("2027-02-15"),
        signedDate: new Date("2026-02-01"),
        deliverables: ["DEL-010"],
        notes: "Counter-signed",
      },
      "user@example.com"
    );

    expect(updated?.status).toBe("active");
    expect(updated?.deliverables).toEqual(["DEL-010"]);
    expect(updateRowMock).toHaveBeenCalledWith(
      sheets,
      SHEET_ID,
      "Contracts",
      "Contract ID",
      "CONT-001",
      expect.objectContaining({
        status: "active",
        startDate: "2026-02-15",
        endDate: "2027-02-15",
        signedDate: "2026-02-01",
        deliverables: "DEL-010",
        notes: "Counter-signed",
        lastModified: "2026-04-01T00:00:00.000Z",
      }),
      expect.any(Object)
    );
  });

  it("lists contracts with vendor/status filters", async () => {
    const header = Array(32).fill("");
    const row1 = createContractRow({
      0: "CONT-100",
      2: "VEND-123",
      7: "active",
      6: "fixed_price",
    });
    const row2 = createContractRow({
      0: "CONT-101",
      2: "VEND-999",
      7: "draft",
      6: "time_and_materials",
    });
    readSheetRangeMock.mockResolvedValueOnce([header, row1, row2]);

    const contracts = await listContracts(sheets, SHEET_ID, {
      vendorId: "VEND-123",
      status: "active",
    });

    expect(contracts).toHaveLength(1);
    expect(contracts[0].contractId).toBe("CONT-100");
  });

  it("marks contracts terminated when deleting", async () => {
    findRowByIdMock.mockResolvedValueOnce({ rowData: createContractRow(), rowIndex: 1 });
    updateRowMock.mockResolvedValueOnce(undefined as unknown as void);

    const deleted = await deleteContract(sheets, SHEET_ID, "CONT-001", "tester");
    expect(deleted).toBe(true);
    const updates = updateRowMock.mock.calls[0][5];
    expect(updates.status).toBe("terminated");
    expect(updates.notes).toMatch(/Deleted by tester/);
  });

  it("returns active contracts for a vendor", async () => {
    const header = Array(32).fill("");
    const row1 = createContractRow({ 0: "CONT-400", 2: "VEND-321", 7: "active" });
    const row2 = createContractRow({ 0: "CONT-401", 2: "VEND-321", 7: "completed" });
    readSheetRangeMock.mockResolvedValueOnce([header, row1, row2]);

    const contracts = await getActiveContracts(sheets, SHEET_ID, "VEND-321");
    expect(contracts).toHaveLength(1);
    expect(contracts[0].contractId).toBe("CONT-400");
  });

  it("finds contracts expiring within the provided window", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const header = Array(32).fill("");
    const nearExpiry = createContractRow({
      0: "CONT-900",
      7: "active",
      12: "2026-02-15",
    });
    const farExpiry = createContractRow({
      0: "CONT-901",
      7: "active",
      12: "2026-09-01",
    });
    readSheetRangeMock.mockResolvedValueOnce([header, nearExpiry, farExpiry]);

    const contracts = await getExpiringContracts(sheets, SHEET_ID, 90);

    expect(contracts).toHaveLength(1);
    expect(contracts[0].contractId).toBe("CONT-900");
  });
});
