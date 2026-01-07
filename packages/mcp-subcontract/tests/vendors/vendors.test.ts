/**
 * Vendor management tests for the Subcontract server.
 *
 * Exercises create/read/update/list flows plus renewal helpers so the server
 * logic is covered without touching Google Sheets.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import type { sheets_v4 } from "googleapis";
import {
  createVendor,
  readVendor,
  updateVendor,
  listVendors,
  deleteVendor,
  getVendorsNeedingDueDiligence,
  getTopPerformers,
} from "../../src/vendors/vendors.js";
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

function createVendorRow(overrides: Partial<Record<number, any>> = {}): any[] {
  const row = [
    "VEND-001",
    "Prime Vendor",
    "Prime Vendor LLC",
    "99-000",
    "DUNS-01",
    "consulting",
    "active",
    "Alex PM",
    "vendor@example.com",
    "+1-555-0100",
    "123 First St",
    "Austin",
    "TX",
    "73301",
    "USA",
    "CAGE-01",
    "TRUE",
    "FALSE",
    "FALSE",
    "FALSE",
    "Net 30",
    "USD",
    "FALSE",
    "2025-01-01",
    "TRUE",
    "2025-12-31",
    "95",
    "1000000",
    "3",
    "2025-01-01T00:00:00.000Z",
    "creator@example.com",
    "2025-06-01T00:00:00.000Z",
    "Good standing",
  ];

  for (const [index, value] of Object.entries(overrides)) {
    row[Number(index)] = value;
  }
  return row;
}

describe("Subcontract vendor module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("creates vendors with generated IDs and persists formatted rows", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-02-01T12:00:00.000Z"));
    generateNextIdMock.mockResolvedValueOnce("VEND-101");
    appendRowsMock.mockResolvedValueOnce(undefined as unknown as void);

    const vendor = await createVendor(
      sheets,
      SHEET_ID,
      {
        name: "NextGen Systems",
        legalName: "NextGen Systems LLC",
        taxId: "22-222",
        category: "it_services",
        primaryContact: "Jamie Ops",
        email: "jamie@example.com",
        phone: "555-1234",
        address: {
          street: "1 Loop Road",
          city: "Austin",
          state: "TX",
          zip: "78701",
          country: "USA",
        },
        paymentTerms: "Net 15",
        currency: "USD",
        notes: "Initial onboarding",
      },
      "tester@example.com"
    );

    expect(vendor.vendorId).toBe("VEND-101");
    expect(vendor.status).toBe("prospective");
    expect(vendor.currency).toBe("USD");
    expect(appendRowsMock).toHaveBeenCalledTimes(1);
    const appendedRow = appendRowsMock.mock.calls[0][3][0];
    expect(appendedRow[0]).toBe("VEND-101");
    expect(appendedRow[6]).toBe("prospective");
    expect(appendedRow[29]).toBe("2026-02-01T12:00:00.000Z");
    expect(appendedRow[31]).toBe("2026-02-01T12:00:00.000Z");
  });

  it("parses sheet rows when reading vendors", async () => {
    const row = createVendorRow({
      0: "VEND-222",
      6: "approved",
      22: "TRUE",
      26: "85",
    });
    findRowByIdMock.mockResolvedValueOnce({
      rowData: row,
      rowIndex: 10,
    });

    const vendor = await readVendor(sheets, SHEET_ID, "VEND-222");

    expect(findRowByIdMock).toHaveBeenCalledWith(
      sheets,
      SHEET_ID,
      "Vendors",
      "Vendor ID",
      "VEND-222"
    );
    expect(vendor?.vendorId).toBe("VEND-222");
    expect(vendor?.status).toBe("approved");
    expect(vendor?.dueDiligenceCompleted).toBe(true);
    expect(vendor?.performanceRating).toBe(85);
  });

  it("updates vendor fields and writes only mapped columns", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-10T10:00:00.000Z"));
    findRowByIdMock.mockResolvedValueOnce({
      rowData: createVendorRow({ 6: "active", 31: "2026-01-01T00:00:00.000Z" }),
      rowIndex: 2,
    });
    updateRowMock.mockResolvedValueOnce(undefined as unknown as void);

    const updated = await updateVendor(
      sheets,
      SHEET_ID,
      {
        vendorId: "VEND-001",
        status: "active",
        email: "new@mail.com",
        address: { city: "Denver" },
        dueDiligenceDate: new Date("2026-02-15T00:00:00.000Z"),
        insuranceExpiry: new Date("2027-01-01T00:00:00.000Z"),
        notes: "Renewed",
      },
      "auditor"
    );

    expect(updated?.email).toBe("new@mail.com");
    expect(updated?.address.city).toBe("Denver");
    expect(updateRowMock).toHaveBeenCalledWith(
      sheets,
      SHEET_ID,
      "Vendors",
      "Vendor ID",
      "VEND-001",
      expect.objectContaining({
        status: "active",
        email: "new@mail.com",
        addressCity: "Denver",
        dueDiligenceDate: "2026-02-15",
        insuranceExpiry: "2027-01-01",
        notes: "Renewed",
        lastModified: "2026-03-10T10:00:00.000Z",
      }),
      expect.any(Object)
    );
  });

  it("lists vendors and applies filters", async () => {
    const header = Array(33).fill("");
    const activeSmallBusiness = createVendorRow({
      0: "VEND-010",
      6: "active",
      16: "TRUE",
      5: "professional_services",
    });
    const inactiveVendor = createVendorRow({
      0: "VEND-011",
      6: "inactive",
      16: "FALSE",
      5: "consulting",
    });
    readSheetRangeMock.mockResolvedValueOnce([header, activeSmallBusiness, inactiveVendor]);

    const vendors = await listVendors(sheets, SHEET_ID, {
      status: "active",
      category: "professional_services",
      smallBusiness: true,
    });

    expect(readSheetRangeMock).toHaveBeenCalledWith(
      sheets,
      SHEET_ID,
      "Vendors!A:AG"
    );
    expect(vendors).toHaveLength(1);
    expect(vendors[0].vendorId).toBe("VEND-010");
  });

  it("marks vendors inactive on delete requests", async () => {
    findRowByIdMock.mockResolvedValueOnce({
      rowData: createVendorRow({ 6: "active" }),
      rowIndex: 5,
    });
    updateRowMock.mockResolvedValueOnce(undefined as unknown as void);

    const removed = await deleteVendor(sheets, SHEET_ID, "VEND-001", "tester");
    expect(removed).toBe(true);
    const updateArgs = updateRowMock.mock.calls[0][5];
    expect(updateArgs).toMatchObject({
      status: "inactive",
    });
  });

  it("identifies vendors that need due diligence renewal", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const header = Array(33).fill("");
    const incompleteVendor = createVendorRow({
      0: "VEND-301",
      22: "FALSE",
      6: "active",
    });
    const expiringSoon = createVendorRow({
      0: "VEND-302",
      22: "TRUE",
      23: "2025-02-01",
      6: "active",
    });
    readSheetRangeMock.mockResolvedValueOnce([header, incompleteVendor, expiringSoon]);

    const vendors = await getVendorsNeedingDueDiligence(sheets, SHEET_ID, 120);

    expect(vendors.map((v) => v.vendorId)).toEqual(["VEND-301", "VEND-302"]);
  });

  it("returns the top performers sorted by rating", async () => {
    const header = Array(33).fill("");
    const top = createVendorRow({
      0: "VEND-700",
      6: "active",
      26: "95",
    });
    const mid = createVendorRow({
      0: "VEND-701",
      6: "active",
      26: "81",
    });
    const low = createVendorRow({
      0: "VEND-702",
      6: "active",
      26: "70",
    });
    readSheetRangeMock.mockResolvedValueOnce([header, top, mid, low]);

    const vendors = await getTopPerformers(sheets, SHEET_ID, 2, 85);

    expect(vendors).toHaveLength(1);
    expect(vendors[0].vendorId).toBe("VEND-700");
  });
});
