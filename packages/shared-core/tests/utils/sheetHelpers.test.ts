/**
 * Unit Tests for Google Sheets Helper Utilities
 *
 * Tests the sheetHelpers module which provides reusable functions for:
 * - Reading and writing ranges
 * - Appending and updating rows
 * - Batch operations
 * - Formatting and styling
 * - Data validation
 * - ID generation
 *
 * Test Coverage:
 * - Pure function tests (columnLetterToIndex, columnIndexToLetter)
 * - Async function tests with mock Google Sheets API
 * - Error handling
 * - Edge cases
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import type { sheets_v4 } from "googleapis";
import {
  readSheetRange,
  writeSheetRange,
  appendRows,
  updateRow,
  batchUpdate,
  getSheetIdByName,
  formatRange,
  addDataValidation,
  addConditionalFormatting,
  createSheet,
  freezeHeaderRow,
  findRowById,
  columnLetterToIndex,
  columnIndexToLetter,
  generateNextId,
} from "../../src/utils/sheetHelpers.js";

// ============================================================================
// Mock Setup
// ============================================================================

const TEST_SPREADSHEET_ID = "test-spreadsheet-123";
const TEST_SHEET_NAME = "Test Sheet";
const TEST_SHEET_ID = 0;

/**
 * Create a mock Google Sheets API client
 */
function createMockSheetsClient(): sheets_v4.Sheets {
  return {
    spreadsheets: {
      values: {
        get: jest.fn(),
        update: jest.fn(),
        append: jest.fn(),
        batchUpdate: jest.fn(),
      } as any,
      get: jest.fn(),
      batchUpdate: jest.fn(),
    } as any,
  } as sheets_v4.Sheets;
}

let mockSheets: sheets_v4.Sheets;

beforeEach(() => {
  mockSheets = createMockSheetsClient();
  jest.clearAllMocks();
});

// ============================================================================
// Pure Function Tests (No Mocks Needed)
// ============================================================================

describe("columnLetterToIndex", () => {
  it("should convert single letter columns correctly", () => {
    expect(columnLetterToIndex("A")).toBe(0);
    expect(columnLetterToIndex("B")).toBe(1);
    expect(columnLetterToIndex("C")).toBe(2);
    expect(columnLetterToIndex("Z")).toBe(25);
  });

  it("should convert double letter columns correctly", () => {
    expect(columnLetterToIndex("AA")).toBe(26);
    expect(columnLetterToIndex("AB")).toBe(27);
    expect(columnLetterToIndex("AZ")).toBe(51);
    expect(columnLetterToIndex("BA")).toBe(52);
    expect(columnLetterToIndex("ZZ")).toBe(701);
  });

  it("should convert triple letter columns correctly", () => {
    expect(columnLetterToIndex("AAA")).toBe(702);
    expect(columnLetterToIndex("AAB")).toBe(703);
  });
});

describe("columnIndexToLetter", () => {
  it("should convert single digit indices correctly", () => {
    expect(columnIndexToLetter(0)).toBe("A");
    expect(columnIndexToLetter(1)).toBe("B");
    expect(columnIndexToLetter(2)).toBe("C");
    expect(columnIndexToLetter(25)).toBe("Z");
  });

  it("should convert double digit indices correctly", () => {
    expect(columnIndexToLetter(26)).toBe("AA");
    expect(columnIndexToLetter(27)).toBe("AB");
    expect(columnIndexToLetter(51)).toBe("AZ");
    expect(columnIndexToLetter(52)).toBe("BA");
    expect(columnIndexToLetter(701)).toBe("ZZ");
  });

  it("should convert triple digit indices correctly", () => {
    expect(columnIndexToLetter(702)).toBe("AAA");
    expect(columnIndexToLetter(703)).toBe("AAB");
  });

  it("should be inverse of columnLetterToIndex", () => {
    for (let i = 0; i < 1000; i++) {
      const letter = columnIndexToLetter(i);
      const index = columnLetterToIndex(letter);
      expect(index).toBe(i);
    }
  });
});

// ============================================================================
// Read/Write Operations
// ============================================================================

describe("readSheetRange", () => {
  it("should read values from a range", async () => {
    const mockData = [
      ["Header1", "Header2", "Header3"],
      ["Row1Col1", "Row1Col2", "Row1Col3"],
      ["Row2Col1", "Row2Col2", "Row2Col3"],
    ];

    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: { values: mockData },
    });

    const result = await readSheetRange(mockSheets, TEST_SPREADSHEET_ID, "Sheet1!A1:C3");

    expect(result).toEqual(mockData);
    expect(mockSheets.spreadsheets.values.get).toHaveBeenCalledWith({
      spreadsheetId: TEST_SPREADSHEET_ID,
      range: "Sheet1!A1:C3",
    });
  });

  it("should return empty array when no values", async () => {
    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    const result = await readSheetRange(mockSheets, TEST_SPREADSHEET_ID, "Sheet1!A1:C3");

    expect(result).toEqual([]);
  });

  it("should throw error on API failure", async () => {
    (mockSheets.spreadsheets.values.get as jest.Mock).mockRejectedValueOnce(
      new Error("API Error")
    );

    await expect(
      readSheetRange(mockSheets, TEST_SPREADSHEET_ID, "Sheet1!A1:C3")
    ).rejects.toThrow("Failed to read range Sheet1!A1:C3: API Error");
  });
});

describe("writeSheetRange", () => {
  it("should write values to a range", async () => {
    const values = [
      ["Value1", "Value2"],
      ["Value3", "Value4"],
    ];

    (mockSheets.spreadsheets.values.update as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    await writeSheetRange(mockSheets, TEST_SPREADSHEET_ID, "Sheet1!A1:B2", values);

    expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith({
      spreadsheetId: TEST_SPREADSHEET_ID,
      range: "Sheet1!A1:B2",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values,
      },
    });
  });

  it("should throw error on API failure", async () => {
    (mockSheets.spreadsheets.values.update as jest.Mock).mockRejectedValueOnce(
      new Error("Write failed")
    );

    await expect(
      writeSheetRange(mockSheets, TEST_SPREADSHEET_ID, "Sheet1!A1:B2", [["test"]])
    ).rejects.toThrow("Failed to write range Sheet1!A1:B2: Write failed");
  });
});

describe("appendRows", () => {
  it("should append rows and return first row number", async () => {
    const values = [
      ["New1", "New2"],
      ["New3", "New4"],
    ];

    (mockSheets.spreadsheets.values.append as jest.Mock).mockResolvedValueOnce({
      data: {
        updates: {
          updatedRange: "Sheet1!A5:B6",
        },
      },
    });

    const rowNumber = await appendRows(mockSheets, TEST_SPREADSHEET_ID, "Sheet1!A:B", values);

    expect(rowNumber).toBe(5);
    expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith({
      spreadsheetId: TEST_SPREADSHEET_ID,
      range: "Sheet1!A:B",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values,
      },
    });
  });

  it("should return -1 if updatedRange is missing", async () => {
    (mockSheets.spreadsheets.values.append as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    const rowNumber = await appendRows(mockSheets, TEST_SPREADSHEET_ID, "Sheet1!A:B", [["test"]]);

    expect(rowNumber).toBe(-1);
  });

  it("should throw error on API failure", async () => {
    (mockSheets.spreadsheets.values.append as jest.Mock).mockRejectedValueOnce(
      new Error("Append failed")
    );

    await expect(
      appendRows(mockSheets, TEST_SPREADSHEET_ID, "Sheet1!A:B", [["test"]])
    ).rejects.toThrow("Failed to append rows: Append failed");
  });
});

// ============================================================================
// Update and Find Operations
// ============================================================================

describe("updateRow", () => {
  it("should update row matching ID", async () => {
    const existingData = [
      ["ID", "Name", "Status"],
      ["BUD-001", "Budget 1", "active"],
      ["BUD-002", "Budget 2", "inactive"],
    ];

    // Mock reading the sheet
    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: { values: existingData },
    });

    // Mock writing updates
    (mockSheets.spreadsheets.values.update as jest.Mock).mockResolvedValue({
      data: {},
    });

    const columnMap = {
      name: "B",
      status: "C",
    };

    const updated = await updateRow(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_NAME,
      "ID",
      "BUD-001",
      { name: "Updated Budget", status: "completed" },
      columnMap
    );

    expect(updated).toBe(true);
    expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledTimes(2); // name and status
  });

  it("should return false if ID not found", async () => {
    const existingData = [
      ["ID", "Name", "Status"],
      ["BUD-001", "Budget 1", "active"],
    ];

    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: { values: existingData },
    });

    const updated = await updateRow(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_NAME,
      "ID",
      "BUD-999",
      { name: "Test" },
      { name: "B" }
    );

    expect(updated).toBe(false);
  });

  it("should throw error if ID column not found", async () => {
    const existingData = [["Name", "Status"]];

    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: { values: existingData },
    });

    await expect(
      updateRow(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_SHEET_NAME,
        "ID",
        "BUD-001",
        { name: "Test" },
        { name: "B" }
      )
    ).rejects.toThrow("Column ID not found");
  });

  it("should return false if sheet is empty", async () => {
    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: { values: [] },
    });

    const updated = await updateRow(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_NAME,
      "ID",
      "BUD-001",
      { name: "Test" },
      { name: "B" }
    );

    expect(updated).toBe(false);
  });
});

describe("findRowById", () => {
  it("should find row by ID", async () => {
    const existingData = [
      ["ID", "Name", "Amount"],
      ["BUD-001", "Budget 1", 100000],
      ["BUD-002", "Budget 2", 200000],
      ["BUD-003", "Budget 3", 300000],
    ];

    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: { values: existingData },
    });

    const result = await findRowById(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_NAME,
      "ID",
      "BUD-002"
    );

    expect(result).toEqual({
      rowIndex: 2,
      rowData: ["BUD-002", "Budget 2", 200000],
    });
  });

  it("should return null if ID not found", async () => {
    const existingData = [
      ["ID", "Name"],
      ["BUD-001", "Budget 1"],
    ];

    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: { values: existingData },
    });

    const result = await findRowById(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_NAME,
      "ID",
      "BUD-999"
    );

    expect(result).toBeNull();
  });

  it("should return null if sheet is empty", async () => {
    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: { values: [] },
    });

    const result = await findRowById(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_NAME,
      "ID",
      "BUD-001"
    );

    expect(result).toBeNull();
  });

  it("should return null if ID column not found", async () => {
    const existingData = [["Name", "Amount"]];

    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: { values: existingData },
    });

    const result = await findRowById(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_NAME,
      "ID",
      "BUD-001"
    );

    expect(result).toBeNull();
  });
});

// ============================================================================
// Batch Operations
// ============================================================================

describe("batchUpdate", () => {
  it("should perform batch update on multiple ranges", async () => {
    const updates = [
      { range: "Sheet1!A1:A2", values: [["Value1"], ["Value2"]] },
      { range: "Sheet1!B1:B2", values: [["Value3"], ["Value4"]] },
    ];

    (mockSheets.spreadsheets.values.batchUpdate as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    await batchUpdate(mockSheets, TEST_SPREADSHEET_ID, updates);

    expect(mockSheets.spreadsheets.values.batchUpdate).toHaveBeenCalledWith({
      spreadsheetId: TEST_SPREADSHEET_ID,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: updates,
      },
    });
  });

  it("should throw error on API failure", async () => {
    (mockSheets.spreadsheets.values.batchUpdate as jest.Mock).mockRejectedValueOnce(
      new Error("Batch update failed")
    );

    await expect(
      batchUpdate(mockSheets, TEST_SPREADSHEET_ID, [
        { range: "A1", values: [["test"]] },
      ])
    ).rejects.toThrow("Failed to batch update: Batch update failed");
  });
});

// ============================================================================
// Sheet Metadata Operations
// ============================================================================

describe("getSheetIdByName", () => {
  it("should return sheet ID for given name", async () => {
    (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValueOnce({
      data: {
        sheets: [
          { properties: { title: "Sheet1", sheetId: 0 } },
          { properties: { title: "Sheet2", sheetId: 123 } },
          { properties: { title: "Sheet3", sheetId: 456 } },
        ],
      },
    });

    const sheetId = await getSheetIdByName(mockSheets, TEST_SPREADSHEET_ID, "Sheet2");

    expect(sheetId).toBe(123);
  });

  it("should throw error if sheet not found", async () => {
    (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValueOnce({
      data: {
        sheets: [{ properties: { title: "Sheet1", sheetId: 0 } }],
      },
    });

    await expect(
      getSheetIdByName(mockSheets, TEST_SPREADSHEET_ID, "NonExistent")
    ).rejects.toThrow("Sheet NonExistent not found");
  });

  it("should throw error if sheetId is undefined", async () => {
    (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValueOnce({
      data: {
        sheets: [{ properties: { title: "Sheet1", sheetId: undefined } }],
      },
    });

    await expect(
      getSheetIdByName(mockSheets, TEST_SPREADSHEET_ID, "Sheet1")
    ).rejects.toThrow("Sheet Sheet1 not found");
  });
});

describe("createSheet", () => {
  it("should create a new sheet with default dimensions", async () => {
    (mockSheets.spreadsheets.batchUpdate as jest.Mock).mockResolvedValueOnce({
      data: {
        replies: [
          {
            addSheet: {
              properties: {
                sheetId: 789,
              },
            },
          },
        ],
      },
    });

    const sheetId = await createSheet(mockSheets, TEST_SPREADSHEET_ID, "New Sheet");

    expect(sheetId).toBe(789);
    expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
      spreadsheetId: TEST_SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: "New Sheet",
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 26,
                },
              },
            },
          },
        ],
      },
    });
  });

  it("should create a new sheet with custom dimensions", async () => {
    (mockSheets.spreadsheets.batchUpdate as jest.Mock).mockResolvedValueOnce({
      data: {
        replies: [
          {
            addSheet: {
              properties: {
                sheetId: 999,
              },
            },
          },
        ],
      },
    });

    const sheetId = await createSheet(mockSheets, TEST_SPREADSHEET_ID, "Custom Sheet", 500, 50);

    expect(sheetId).toBe(999);
    const call = (mockSheets.spreadsheets.batchUpdate as jest.Mock).mock.calls[0][0];
    expect(call.requestBody.requests[0].addSheet.properties.gridProperties).toEqual({
      rowCount: 500,
      columnCount: 50,
    });
  });

  it("should throw error if sheetId is undefined in response", async () => {
    (mockSheets.spreadsheets.batchUpdate as jest.Mock).mockResolvedValueOnce({
      data: {
        replies: [{}],
      },
    });

    await expect(
      createSheet(mockSheets, TEST_SPREADSHEET_ID, "New Sheet")
    ).rejects.toThrow("Failed to get new sheet ID");
  });
});

// ============================================================================
// Formatting Operations
// ============================================================================

describe("freezeHeaderRow", () => {
  it("should freeze header row with default count", async () => {
    (mockSheets.spreadsheets.batchUpdate as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    await freezeHeaderRow(mockSheets, TEST_SPREADSHEET_ID, TEST_SHEET_ID);

    expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalledWith({
      spreadsheetId: TEST_SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: TEST_SHEET_ID,
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
              fields: "gridProperties.frozenRowCount",
            },
          },
        ],
      },
    });
  });

  it("should freeze multiple header rows", async () => {
    (mockSheets.spreadsheets.batchUpdate as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    await freezeHeaderRow(mockSheets, TEST_SPREADSHEET_ID, TEST_SHEET_ID, 3);

    const call = (mockSheets.spreadsheets.batchUpdate as jest.Mock).mock.calls[0][0];
    expect(call.requestBody.requests[0].updateSheetProperties.properties.gridProperties.frozenRowCount).toBe(3);
  });
});

describe("formatRange", () => {
  it("should format range with background color", async () => {
    (mockSheets.spreadsheets.batchUpdate as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    await formatRange(mockSheets, TEST_SPREADSHEET_ID, TEST_SHEET_ID, 0, 1, 0, 3, {
      backgroundColor: { red: 1, green: 0, blue: 0 },
    });

    expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalled();
    const call = (mockSheets.spreadsheets.batchUpdate as jest.Mock).mock.calls[0][0];
    expect(call.requestBody.requests[0].repeatCell.cell.userEnteredFormat.backgroundColor).toEqual({
      red: 1,
      green: 0,
      blue: 0,
    });
  });

  it("should format range with text formatting", async () => {
    (mockSheets.spreadsheets.batchUpdate as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    await formatRange(mockSheets, TEST_SPREADSHEET_ID, TEST_SHEET_ID, 0, 1, 0, 3, {
      textFormat: {
        bold: true,
        fontSize: 12,
      },
    });

    const call = (mockSheets.spreadsheets.batchUpdate as jest.Mock).mock.calls[0][0];
    expect(call.requestBody.requests[0].repeatCell.cell.userEnteredFormat.textFormat).toEqual({
      bold: true,
      fontSize: 12,
    });
  });

  it("should format range with alignment", async () => {
    (mockSheets.spreadsheets.batchUpdate as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    await formatRange(mockSheets, TEST_SPREADSHEET_ID, TEST_SHEET_ID, 0, 1, 0, 3, {
      horizontalAlignment: "CENTER",
      verticalAlignment: "MIDDLE",
    });

    const call = (mockSheets.spreadsheets.batchUpdate as jest.Mock).mock.calls[0][0];
    expect(call.requestBody.requests[0].repeatCell.cell.userEnteredFormat.horizontalAlignment).toBe("CENTER");
    expect(call.requestBody.requests[0].repeatCell.cell.userEnteredFormat.verticalAlignment).toBe("MIDDLE");
  });
});

describe("addDataValidation", () => {
  it("should add ONE_OF_LIST validation", async () => {
    (mockSheets.spreadsheets.batchUpdate as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    await addDataValidation(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_ID,
      1,
      10,
      2,
      3,
      "ONE_OF_LIST",
      ["active", "inactive", "completed"]
    );

    expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalled();
    const call = (mockSheets.spreadsheets.batchUpdate as jest.Mock).mock.calls[0][0];
    expect(call.requestBody.requests[0].setDataValidation.rule.condition.type).toBe("ONE_OF_LIST");
  });

  it("should throw error if values missing for ONE_OF_LIST", async () => {
    await expect(
      addDataValidation(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_SHEET_ID,
        1,
        10,
        2,
        3,
        "ONE_OF_LIST"
      )
    ).rejects.toThrow("Values required for ONE_OF_LIST validation");
  });

  it("should add NUMBER_GREATER validation", async () => {
    (mockSheets.spreadsheets.batchUpdate as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    await addDataValidation(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_ID,
      1,
      10,
      2,
      3,
      "NUMBER_GREATER",
      undefined,
      "0"
    );

    const call = (mockSheets.spreadsheets.batchUpdate as jest.Mock).mock.calls[0][0];
    expect(call.requestBody.requests[0].setDataValidation.rule.condition.type).toBe("NUMBER_GREATER");
  });

  it("should throw error if formula missing for NUMBER_GREATER", async () => {
    await expect(
      addDataValidation(
        mockSheets,
        TEST_SPREADSHEET_ID,
        TEST_SHEET_ID,
        1,
        10,
        2,
        3,
        "NUMBER_GREATER"
      )
    ).rejects.toThrow("Formula required for NUMBER_GREATER validation");
  });
});

describe("addConditionalFormatting", () => {
  it("should add RAG status conditional formatting", async () => {
    (mockSheets.spreadsheets.batchUpdate as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    const rules = [
      {
        condition: "at-risk",
        backgroundColor: { red: 1, green: 1, blue: 0 },
      },
      {
        condition: "critical",
        backgroundColor: { red: 1, green: 0, blue: 0 },
      },
    ];

    await addConditionalFormatting(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_ID,
      1,
      100,
      3,
      rules
    );

    expect(mockSheets.spreadsheets.batchUpdate).toHaveBeenCalled();
    const call = (mockSheets.spreadsheets.batchUpdate as jest.Mock).mock.calls[0][0];
    expect(call.requestBody.requests).toHaveLength(2);
    expect(call.requestBody.requests[0].addConditionalFormatRule.rule.booleanRule.condition.values[0].userEnteredValue).toBe("at-risk");
  });
});

// ============================================================================
// ID Generation
// ============================================================================

describe("generateNextId", () => {
  it("should generate first ID when sheet is empty", async () => {
    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: { values: [] },
    });

    const nextId = await generateNextId(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_NAME,
      "Budget ID",
      "BUD"
    );

    expect(nextId).toBe("BUD-001");
  });

  it("should generate first ID when ID column not found", async () => {
    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: {
        values: [["Name", "Amount"]],
      },
    });

    const nextId = await generateNextId(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_NAME,
      "Budget ID",
      "BUD"
    );

    expect(nextId).toBe("BUD-001");
  });

  it("should generate next sequential ID", async () => {
    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: {
        values: [
          ["Budget ID", "Name"],
          ["BUD-001", "Budget 1"],
          ["BUD-002", "Budget 2"],
          ["BUD-003", "Budget 3"],
        ],
      },
    });

    const nextId = await generateNextId(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_NAME,
      "Budget ID",
      "BUD"
    );

    expect(nextId).toBe("BUD-004");
  });

  it("should handle non-sequential IDs and find max", async () => {
    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: {
        values: [
          ["Budget ID", "Name"],
          ["BUD-001", "Budget 1"],
          ["BUD-005", "Budget 5"],
          ["BUD-003", "Budget 3"],
        ],
      },
    });

    const nextId = await generateNextId(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_NAME,
      "Budget ID",
      "BUD"
    );

    expect(nextId).toBe("BUD-006"); // Next after max (005)
  });

  it("should ignore IDs with different prefix", async () => {
    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: {
        values: [
          ["ID", "Name"],
          ["BUD-001", "Budget 1"],
          ["PROG-999", "Program 999"],
          ["BUD-002", "Budget 2"],
        ],
      },
    });

    const nextId = await generateNextId(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_NAME,
      "ID",
      "BUD"
    );

    expect(nextId).toBe("BUD-003"); // Ignores PROG-999
  });

  it("should pad numbers to 3 digits", async () => {
    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: {
        values: [
          ["ID", "Name"],
          ["BUD-099", "Budget 99"],
        ],
      },
    });

    const nextId = await generateNextId(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_NAME,
      "ID",
      "BUD"
    );

    expect(nextId).toBe("BUD-100");
  });

  it("should handle very large ID numbers", async () => {
    (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
      data: {
        values: [
          ["ID", "Name"],
          ["BUD-9999", "Budget 9999"],
        ],
      },
    });

    const nextId = await generateNextId(
      mockSheets,
      TEST_SPREADSHEET_ID,
      TEST_SHEET_NAME,
      "ID",
      "BUD"
    );

    expect(nextId).toBe("BUD-10000");
  });
});
