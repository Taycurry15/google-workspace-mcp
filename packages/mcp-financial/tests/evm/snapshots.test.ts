/**
 * EVM Snapshots Module Tests
 *
 * Tests CRUD operations for EVM snapshots - point-in-time captures
 * of Earned Value Management metrics for historical analysis.
 *
 * Coverage targets:
 * - parseSnapshotRow(): Pure function tests
 * - snapshotToRow(): Pure function tests
 * - createSnapshot(): Async tests with mock Sheets API
 * - readSnapshot(): Async tests with mock Sheets API
 * - listSnapshots(): Async tests with filtering and sorting
 * - getLatestSnapshot(): Async tests
 * - getSnapshotHistory(): Async tests for trending
 * - compareSnapshots(): Pure function comparison tests
 * - deleteSnapshot(): Async tests with mock Sheets API
 *
 * Test patterns:
 * - Pure function tests (fast, no mocks)
 * - Async CRUD tests with mock Google Sheets API
 * - Date filtering and sorting validation
 * - Edge cases (empty data, not found, invalid input)
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  parseSnapshotRow,
  snapshotToRow,
  createSnapshot,
  readSnapshot,
  listSnapshots,
  getLatestSnapshot,
  getSnapshotHistory,
  compareSnapshots,
  deleteSnapshot,
} from "../../src/evm/snapshots.js";
import { createMockSheetsClient } from "@gw-mcp/shared-core/test-utils";
import type { EVMSnapshot } from "../../src/types/financial.js";

const TEST_SPREADSHEET_ID = "test-spreadsheet-id";
const TEST_PROGRAM_ID = "PROG-TEST-001";

// Sample complete snapshot row
const createSampleSnapshotRow = (snapshotId: string = "SNAP-001"): any[] => {
  return [
    snapshotId,
    TEST_PROGRAM_ID,
    "", // projectId (optional)
    "2026-01-15",
    "2026-Q1",
    100000, // PV
    95000, // EV
    100000, // AC
    -5000, // SV
    -5000, // CV
    -5.0, // SV%
    -5.0, // CV%
    0.95, // SPI
    0.95, // CPI
    300000, // BAC
    315789, // EAC
    215789, // ETC
    -15789, // VAC
    1.05, // TCPI
    31.67, // % Complete
    33.33, // % Schedule Complete
    "stable",
    "test-user",
    "2026-01-15T10:30:00Z",
    "Health: warning (score: 70)",
  ];
};

// Sample complete snapshot object
const createSampleSnapshot = (snapshotId: string = "SNAP-001"): EVMSnapshot => {
  return {
    snapshotId,
    programId: TEST_PROGRAM_ID,
    snapshotDate: new Date("2026-01-15"),
    reportingPeriod: "2026-Q1",
    pv: 100000,
    ev: 95000,
    ac: 100000,
    sv: -5000,
    cv: -5000,
    svPercent: -5.0,
    cvPercent: -5.0,
    spi: 0.95,
    cpi: 0.95,
    bac: 300000,
    eac: 315789,
    etc: 215789,
    vac: -15789,
    tcpi: 1.05,
    percentComplete: 31.67,
    percentScheduleComplete: 33.33,
    trend: "stable",
    calculatedBy: "test-user",
    calculatedDate: new Date("2026-01-15T10:30:00Z"),
    notes: "Health: warning (score: 70)",
  };
};

describe("EVM Snapshots Module", () => {
  describe("parseSnapshotRow", () => {
    it("should parse a complete snapshot row correctly", () => {
      const row = createSampleSnapshotRow("SNAP-001");

      const snapshot = parseSnapshotRow(row);

      expect(snapshot).not.toBeNull();
      expect(snapshot?.snapshotId).toBe("SNAP-001");
      expect(snapshot?.programId).toBe(TEST_PROGRAM_ID);
      expect(snapshot?.pv).toBe(100000);
      expect(snapshot?.ev).toBe(95000);
      expect(snapshot?.ac).toBe(100000);
      expect(snapshot?.cpi).toBe(0.95);
      expect(snapshot?.spi).toBe(0.95);
      expect(snapshot?.bac).toBe(300000);
      expect(snapshot?.trend).toBe("stable");
      expect(snapshot?.notes).toBe("Health: warning (score: 70)");
    });

    it("should handle empty row", () => {
      const row: any[] = [];

      const snapshot = parseSnapshotRow(row);

      expect(snapshot).toBeNull();
    });

    it("should handle row with missing values", () => {
      const row = ["SNAP-002", TEST_PROGRAM_ID]; // Minimal row

      const snapshot = parseSnapshotRow(row);

      expect(snapshot).not.toBeNull();
      expect(snapshot?.snapshotId).toBe("SNAP-002");
      expect(snapshot?.programId).toBe(TEST_PROGRAM_ID);
      expect(snapshot?.pv).toBe(0); // Default values
      expect(snapshot?.ev).toBe(0);
      expect(snapshot?.ac).toBe(0);
    });

    it("should parse numeric string values", () => {
      const row = [
        "SNAP-003",
        TEST_PROGRAM_ID,
        "",
        "2026-01-15",
        "2026-Q1",
        "100000.50", // String number
        "95000.75",
        "100000.00",
        "-5000.25",
        "-4999.75",
        "-5.0",
        "-5.0",
        "0.9500",
        "0.9500",
        "300000",
        "315789",
        "215789",
        "-15789",
        "1.0526",
        "31.67",
        "33.33",
        "improving",
        "system",
        "2026-01-15T10:30:00Z",
        "Notes",
      ];

      const snapshot = parseSnapshotRow(row);

      expect(snapshot?.pv).toBe(100000.5);
      expect(snapshot?.ev).toBe(95000.75);
      expect(snapshot?.trend).toBe("improving");
    });
  });

  describe("snapshotToRow", () => {
    it("should convert snapshot object to row array", () => {
      const snapshot = createSampleSnapshot("SNAP-001");

      const row = snapshotToRow(snapshot);

      expect(row[0]).toBe("SNAP-001");
      expect(row[1]).toBe(TEST_PROGRAM_ID);
      expect(row[3]).toBe("2026-01-15"); // Date formatted
      expect(row[4]).toBe("2026-Q1");
      expect(row[5]).toBe(100000); // PV
      expect(row[6]).toBe(95000); // EV
      expect(row[12]).toBe(0.95); // SPI
      expect(row[13]).toBe(0.95); // CPI
      expect(row[21]).toBe("stable");
      expect(row[24]).toBe("Health: warning (score: 70)");
    });

    it("should round numeric values appropriately", () => {
      const snapshot: EVMSnapshot = {
        ...createSampleSnapshot(),
        pv: 100000.123456,
        ev: 95000.987654,
        cpi: 0.95001234,
        spi: 0.95004321,
      };

      const row = snapshotToRow(snapshot);

      expect(row[5]).toBe(100000.12); // PV rounded to 2 decimals
      expect(row[6]).toBe(95000.99); // EV rounded to 2 decimals
      expect(row[12]).toBe(0.95); // SPI rounded to 4 decimals
      expect(row[13]).toBe(0.95); // CPI rounded to 4 decimals
    });
  });

  describe("createSnapshot", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should create a new snapshot with calculated EVM data", async () => {
      // Mock the ID generation
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Snapshot ID"], ["SNAP-001"]] }, // Last ID
      });

      // Mock budget data for AC calculation
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [
            ["Budget ID", "Program ID", "Name", "Status", "Year", "Allocated", "Committed", "Spent", "Remaining", "Reserved"],
            ["BUD-001", TEST_PROGRAM_ID, "Labor", "active", "2026", 100000, 50000, 45000, 55000, 5000],
          ],
        },
      });

      // Mock deliverable data for EV calculation
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [
            ["Deliverable ID", "Program ID", "Name", "Budgeted Value", "Status", "Percent Complete"],
            ["D-001", TEST_PROGRAM_ID, "Deliverable 1", 50000, "in-progress", 90],
          ],
        },
      });

      // Mock schedule data for PV calculation
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [
            ["Milestone ID", "Program ID", "Name", "Planned Date", "Budgeted Value"],
            ["M-001", TEST_PROGRAM_ID, "Milestone 1", "2026-01-01", 50000], // Past date
          ],
        },
      });

      // Mock append operation
      mockSheets.spreadsheets.values.append.mockResolvedValueOnce({
        data: { updates: { updatedRows: 1 } },
      });

      const snapshot = await createSnapshot(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        new Date("2026-01-15"),
        "test-user"
      );

      expect(snapshot.snapshotId).toBe("SNAP-002"); // Next ID
      expect(snapshot.programId).toBe(TEST_PROGRAM_ID);
      expect(snapshot.snapshotDate.toISOString()).toContain("2026-01-15");
      expect(snapshot.reportingPeriod).toBe("2026-Q1");
      expect(snapshot.calculatedBy).toBe("test-user");
      expect(snapshot.trend).toMatch(/improving|stable|declining/);
      expect(snapshot.notes).toContain("Health:");
    });

    it("should set trend based on health and performance", async () => {
      // Mock ID generation
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Snapshot ID"], ["SNAP-010"]] },
      });

      // Mock budget data (high spending)
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [
            ["Budget ID", "Program ID", "Name", "Status", "Year", "Allocated", "Committed", "Spent", "Remaining", "Reserved"],
            ["BUD-001", TEST_PROGRAM_ID, "Labor", "active", "2026", 100000, 90000, 85000, 15000, 5000],
          ],
        },
      });

      // Mock deliverable data (low completion)
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [
            ["Deliverable ID", "Program ID", "Name", "Budgeted Value", "Status", "Percent Complete"],
            ["D-001", TEST_PROGRAM_ID, "Deliverable 1", 100000, "in-progress", 80],
          ],
        },
      });

      // Mock schedule data
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [
            ["Milestone ID", "Program ID", "Name", "Planned Date", "Budgeted Value"],
            ["M-001", TEST_PROGRAM_ID, "Milestone 1", "2026-01-01", 100000],
          ],
        },
      });

      mockSheets.spreadsheets.values.append.mockResolvedValueOnce({
        data: { updates: { updatedRows: 1 } },
      });

      const snapshot = await createSnapshot(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        new Date("2026-01-15"),
        "system"
      );

      // With CPI = 80000/85000 = 0.94, SPI = 80000/100000 = 0.80
      // Both below 0.9, should be declining
      expect(snapshot.trend).toBe("declining");
    });
  });

  describe("readSnapshot", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should read a snapshot by ID", async () => {
      const snapshotRow = createSampleSnapshotRow("SNAP-001");

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [
            ["Snapshot ID"], // Header
            snapshotRow,
          ],
        },
      });

      const snapshot = await readSnapshot(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "SNAP-001"
      );

      expect(snapshot).not.toBeNull();
      expect(snapshot?.snapshotId).toBe("SNAP-001");
      expect(snapshot?.programId).toBe(TEST_PROGRAM_ID);
    });

    it("should return null if snapshot not found", async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [["Snapshot ID"]], // Only header
        },
      });

      const snapshot = await readSnapshot(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "SNAP-999"
      );

      expect(snapshot).toBeNull();
    });
  });

  describe("listSnapshots", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should list snapshots for a program sorted by date descending", async () => {
      const snapshots = [
        ["Snapshot ID", "Program ID", "..."], // Header
        createSampleSnapshotRow("SNAP-001").map((v, i) => i === 3 ? "2026-01-15" : v),
        createSampleSnapshotRow("SNAP-002").map((v, i) => i === 3 ? "2026-02-15" : i === 0 ? "SNAP-002" : v),
        createSampleSnapshotRow("SNAP-003").map((v, i) => i === 3 ? "2026-03-15" : i === 0 ? "SNAP-003" : v),
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const result = await listSnapshots(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID
      );

      expect(result.length).toBe(3);
      expect(result[0].snapshotId).toBe("SNAP-003"); // Newest first
      expect(result[1].snapshotId).toBe("SNAP-002");
      expect(result[2].snapshotId).toBe("SNAP-001"); // Oldest last
    });

    it("should filter snapshots by date range", async () => {
      const snapshots = [
        ["Snapshot ID", "Program ID", "..."],
        createSampleSnapshotRow("SNAP-001").map((v, i) => i === 3 ? "2026-01-15" : v),
        createSampleSnapshotRow("SNAP-002").map((v, i) => i === 3 ? "2026-02-15" : i === 0 ? "SNAP-002" : v),
        createSampleSnapshotRow("SNAP-003").map((v, i) => i === 3 ? "2026-03-15" : i === 0 ? "SNAP-003" : v),
        createSampleSnapshotRow("SNAP-004").map((v, i) => i === 3 ? "2026-04-15" : i === 0 ? "SNAP-004" : v),
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const result = await listSnapshots(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        {
          startDate: new Date("2026-02-01"),
          endDate: new Date("2026-03-31"),
        }
      );

      expect(result.length).toBe(2);
      expect(result.some(s => s.snapshotId === "SNAP-002")).toBe(true);
      expect(result.some(s => s.snapshotId === "SNAP-003")).toBe(true);
      expect(result.some(s => s.snapshotId === "SNAP-001")).toBe(false);
    });

    it("should apply limit to results", async () => {
      const snapshots = [["Snapshot ID", "Program ID", "..."]];
      for (let i = 1; i <= 10; i++) {
        snapshots.push(
          createSampleSnapshotRow(`SNAP-${String(i).padStart(3, "0")}`).map((v, idx) =>
            idx === 0 ? `SNAP-${String(i).padStart(3, "0")}` : v
          )
        );
      }

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const result = await listSnapshots(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        { limit: 5 }
      );

      expect(result.length).toBe(5);
    });

    it("should filter by program ID", async () => {
      const snapshots = [
        ["Snapshot ID", "Program ID", "..."],
        createSampleSnapshotRow("SNAP-001"), // PROG-TEST-001
        createSampleSnapshotRow("SNAP-002").map((v, i) => i === 1 ? "PROG-OTHER-001" : i === 0 ? "SNAP-002" : v),
        createSampleSnapshotRow("SNAP-003"), // PROG-TEST-001
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const result = await listSnapshots(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID
      );

      expect(result.length).toBe(2);
      expect(result.every(s => s.programId === TEST_PROGRAM_ID)).toBe(true);
    });
  });

  describe("getLatestSnapshot", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should return the most recent snapshot", async () => {
      const snapshots = [
        ["Snapshot ID", "Program ID", "..."],
        createSampleSnapshotRow("SNAP-001").map((v, i) => i === 3 ? "2026-01-15" : v),
        createSampleSnapshotRow("SNAP-002").map((v, i) => i === 3 ? "2026-02-15" : i === 0 ? "SNAP-002" : v),
      ];

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const latest = await getLatestSnapshot(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID
      );

      expect(latest).not.toBeNull();
      expect(latest?.snapshotId).toBe("SNAP-002"); // Most recent
    });

    it("should return null if no snapshots exist", async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: [["Snapshot ID", "Program ID", "..."]] },
      });

      const latest = await getLatestSnapshot(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID
      );

      expect(latest).toBeNull();
    });
  });

  describe("getSnapshotHistory", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should return snapshots sorted ascending for trending", async () => {
      const now = new Date();
      const snapshots = [["Snapshot ID", "Program ID", "..."]];

      for (let i = 0; i < 6; i++) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - (6 - i));
        snapshots.push(
          createSampleSnapshotRow(`SNAP-${String(i + 1).padStart(3, "0")}`).map((v, idx) =>
            idx === 0 ? `SNAP-${String(i + 1).padStart(3, "0")}` :
            idx === 3 ? date.toISOString().split("T")[0] :
            v
          )
        );
      }

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const history = await getSnapshotHistory(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        12
      );

      expect(history.length).toBe(6);
      expect(history[0].snapshotId).toBe("SNAP-001"); // Oldest first
      expect(history[5].snapshotId).toBe("SNAP-006"); // Newest last

      // Verify ascending date order
      for (let i = 1; i < history.length; i++) {
        expect(history[i].snapshotDate.getTime()).toBeGreaterThanOrEqual(
          history[i - 1].snapshotDate.getTime()
        );
      }
    });

    it("should filter by period months", async () => {
      const now = new Date();
      const snapshots = [["Snapshot ID", "Program ID", "..."]];

      // Create 12 monthly snapshots
      for (let i = 0; i < 12; i++) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - (12 - i));
        snapshots.push(
          createSampleSnapshotRow(`SNAP-${String(i + 1).padStart(3, "0")}`).map((v, idx) =>
            idx === 0 ? `SNAP-${String(i + 1).padStart(3, "0")}` :
            idx === 3 ? date.toISOString().split("T")[0] :
            v
          )
        );
      }

      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: { values: snapshots },
      });

      const history = await getSnapshotHistory(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_PROGRAM_ID,
        6 // Last 6 months only
      );

      // Should return approximately 6-7 months (depending on exact dates)
      expect(history.length).toBeGreaterThanOrEqual(6);
      expect(history.length).toBeLessThanOrEqual(7);
    });
  });

  describe("compareSnapshots", () => {
    it("should detect improving trend", () => {
      const baseline = createSampleSnapshot("SNAP-001");
      baseline.cpi = 0.90;
      baseline.spi = 0.85;
      baseline.cv = -10000;
      baseline.sv = -15000;
      baseline.notes = "Health: warning (score: 60)";

      const current = createSampleSnapshot("SNAP-002");
      current.cpi = 0.98; // +0.08 (> 0.02 threshold)
      current.spi = 0.95; // +0.10 (> 0.02 threshold)
      current.cv = -2000;
      current.sv = -5000;
      current.notes = "Health: healthy (score: 75)";

      const comparison = compareSnapshots(baseline, current);

      expect(comparison.cpiTrend).toBe("improving");
      expect(comparison.spiTrend).toBe("improving");
      expect(comparison.costDelta).toBe(8000); // -2000 - (-10000)
      expect(comparison.scheduleDelta).toBe(10000); // -5000 - (-15000)
      expect(comparison.healthDelta).toBe(15); // 75 - 60
    });

    it("should detect declining trend", () => {
      const baseline = createSampleSnapshot("SNAP-001");
      baseline.cpi = 1.05;
      baseline.spi = 1.00;
      baseline.cv = 5000;
      baseline.sv = 0;
      baseline.notes = "Health: healthy (score: 85)";

      const current = createSampleSnapshot("SNAP-002");
      current.cpi = 0.92; // -0.13 (< -0.02 threshold)
      current.spi = 0.85; // -0.15 (< -0.02 threshold)
      current.cv = -8000;
      current.sv = -15000;
      current.notes = "Health: warning (score: 65)";

      const comparison = compareSnapshots(baseline, current);

      expect(comparison.cpiTrend).toBe("declining");
      expect(comparison.spiTrend).toBe("declining");
      expect(comparison.costDelta).toBe(-13000); // -8000 - 5000
      expect(comparison.scheduleDelta).toBe(-15000); // -15000 - 0
      expect(comparison.healthDelta).toBe(-20); // 65 - 85
    });

    it("should detect stable trend", () => {
      const baseline = createSampleSnapshot("SNAP-001");
      baseline.cpi = 0.95;
      baseline.spi = 0.97;
      baseline.cv = -5000;
      baseline.sv = -3000;
      baseline.notes = "Health: warning (score: 70)";

      const current = createSampleSnapshot("SNAP-002");
      current.cpi = 0.96; // +0.01 (within ±0.02)
      current.spi = 0.975; // +0.005 (within ±0.02)
      current.cv = -4500;
      current.sv = -2800;
      current.notes = "Health: warning (score: 72)";

      const comparison = compareSnapshots(baseline, current);

      expect(comparison.cpiTrend).toBe("stable");
      expect(comparison.spiTrend).toBe("stable");
      expect(comparison.healthDelta).toBe(2);
    });
  });

  describe("deleteSnapshot", () => {
    let mockSheets: any;

    beforeEach(() => {
      mockSheets = createMockSheetsClient();
    });

    it("should delete a snapshot by ID", async () => {
      // Mock finding the snapshot
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [
            ["Snapshot ID"],
            createSampleSnapshotRow("SNAP-001"),
          ],
        },
      });

      // Mock getting sheet info
      mockSheets.spreadsheets.get.mockResolvedValueOnce({
        data: {
          sheets: [
            {
              properties: {
                sheetId: 123,
                title: "EVM Snapshots",
              },
            },
          ],
        },
      });

      // Mock batch update
      mockSheets.spreadsheets.batchUpdate.mockResolvedValueOnce({
        data: { replies: [{}] },
      });

      const result = await deleteSnapshot(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "SNAP-001"
      );

      expect(result).toBe(true);
      expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          spreadsheetId: TEST_SPREADSHEET_ID,
          requestBody: expect.objectContaining({
            requests: expect.arrayContaining([
              expect.objectContaining({
                deleteDimension: expect.any(Object),
              }),
            ]),
          }),
        })
      );
    });

    it("should return false if snapshot not found", async () => {
      mockSheets.spreadsheets.values.get.mockResolvedValueOnce({
        data: {
          values: [["Snapshot ID"]], // No snapshots
        },
      });

      const result = await deleteSnapshot(
        mockSheets,
        TEST_SPREADSHEET_ID,
        "SNAP-999"
      );

      expect(result).toBe(false);
      expect(mockSheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    });
  });
});
