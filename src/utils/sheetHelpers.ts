/**
 * Google Sheets Helper Utilities
 *
 * Provides reusable functions for Google Sheets operations including:
 * - Reading and writing ranges
 * - Appending and updating rows
 * - Batch operations
 * - Formatting and styling
 * - Data validation
 * - Conditional formatting
 */

import type { sheets_v4 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

/**
 * Read a range from a Google Sheet
 */
export async function readSheetRange(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string
): Promise<any[][]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  } catch (error) {
    throw new Error(
      `Failed to read range ${range}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Write values to a range in a Google Sheet
 */
export async function writeSheetRange(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values,
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to write range ${range}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Append rows to the end of a sheet
 */
export async function appendRows(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<number> {
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values,
      },
    });

    // Return the first row number that was appended
    const updatedRange = response.data.updates?.updatedRange;
    if (updatedRange) {
      const match = updatedRange.match(/!A(\d+):/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return -1;
  } catch (error) {
    throw new Error(
      `Failed to append rows: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update a specific row by matching criteria
 */
export async function updateRow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  idColumn: string,
  idValue: string,
  updates: Record<string, any>,
  columnMap: Record<string, string>
): Promise<boolean> {
  try {
    // Read all data to find the row
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${sheetName}!A:ZZ`
    );

    if (data.length === 0) {
      return false;
    }

    const headers = data[0];
    const idColIndex = headers.indexOf(idColumn);

    if (idColIndex === -1) {
      throw new Error(`Column ${idColumn} not found`);
    }

    // Find the row
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idColIndex] === idValue) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      return false;
    }

    // Prepare updates
    const rowNumber = rowIndex + 1;
    const row = data[rowIndex] || [];

    for (const [key, value] of Object.entries(updates)) {
      const columnLetter = columnMap[key];
      if (columnLetter) {
        await writeSheetRange(
          sheets,
          spreadsheetId,
          `${sheetName}!${columnLetter}${rowNumber}`,
          [[value]]
        );
      }
    }

    return true;
  } catch (error) {
    throw new Error(
      `Failed to update row: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Batch update multiple cells
 */
export async function batchUpdate(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  updates: Array<{ range: string; values: any[][] }>
): Promise<void> {
  try {
    const data = updates.map((update) => ({
      range: update.range,
      values: update.values,
    }));

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data,
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to batch update: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get sheet ID by name
 */
export async function getSheetIdByName(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string
): Promise<number> {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheet = response.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );

    if (!sheet || sheet.properties?.sheetId === undefined || sheet.properties.sheetId === null) {
      throw new Error(`Sheet ${sheetName} not found`);
    }

    return sheet.properties.sheetId;
  } catch (error) {
    throw new Error(
      `Failed to get sheet ID: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Format a range with specific styling
 */
export async function formatRange(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  format: {
    backgroundColor?: { red: number; green: number; blue: number };
    textFormat?: {
      bold?: boolean;
      italic?: boolean;
      fontSize?: number;
      foregroundColor?: { red: number; green: number; blue: number };
    };
    horizontalAlignment?: "LEFT" | "CENTER" | "RIGHT";
    verticalAlignment?: "TOP" | "MIDDLE" | "BOTTOM";
    numberFormat?: {
      type: string;
      pattern?: string;
    };
  }
): Promise<void> {
  try {
    const requests: sheets_v4.Schema$Request[] = [];

    const cellFormat: sheets_v4.Schema$CellFormat = {};

    if (format.backgroundColor) {
      cellFormat.backgroundColor = format.backgroundColor;
    }

    if (format.textFormat) {
      cellFormat.textFormat = format.textFormat;
    }

    if (format.horizontalAlignment) {
      cellFormat.horizontalAlignment = format.horizontalAlignment;
    }

    if (format.verticalAlignment) {
      cellFormat.verticalAlignment = format.verticalAlignment;
    }

    if (format.numberFormat) {
      cellFormat.numberFormat = format.numberFormat;
    }

    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: startRow,
          endRowIndex: endRow,
          startColumnIndex: startCol,
          endColumnIndex: endCol,
        },
        cell: {
          userEnteredFormat: cellFormat,
        },
        fields: "userEnteredFormat",
      },
    });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests,
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to format range: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Add data validation to a range
 */
export async function addDataValidation(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  validationType: "ONE_OF_LIST" | "ONE_OF_RANGE" | "NUMBER_GREATER" | "DATE_AFTER",
  values?: string[],
  formula?: string,
  strict: boolean = true,
  showCustomUi: boolean = true
): Promise<void> {
  try {
    const validation: sheets_v4.Schema$DataValidationRule = {
      condition: {},
      strict,
      showCustomUi,
    };

    switch (validationType) {
      case "ONE_OF_LIST":
        if (!values) {
          throw new Error("Values required for ONE_OF_LIST validation");
        }
        validation.condition = {
          type: "ONE_OF_LIST",
          values: values.map((v) => ({ userEnteredValue: v })),
        };
        break;

      case "ONE_OF_RANGE":
        if (!formula) {
          throw new Error("Formula required for ONE_OF_RANGE validation");
        }
        validation.condition = {
          type: "ONE_OF_RANGE",
          values: [{ userEnteredValue: formula }],
        };
        break;

      case "NUMBER_GREATER":
        if (!formula) {
          throw new Error("Formula required for NUMBER_GREATER validation");
        }
        validation.condition = {
          type: "NUMBER_GREATER",
          values: [{ userEnteredValue: formula }],
        };
        break;

      case "DATE_AFTER":
        if (!formula) {
          throw new Error("Formula required for DATE_AFTER validation");
        }
        validation.condition = {
          type: "DATE_AFTER",
          values: [{ userEnteredValue: formula }],
        };
        break;
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            setDataValidation: {
              range: {
                sheetId,
                startRowIndex: startRow,
                endRowIndex: endRow,
                startColumnIndex: startCol,
                endColumnIndex: endCol,
              },
              rule: validation,
            },
          },
        ],
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to add data validation: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Add conditional formatting (RAG colors based on status)
 */
export async function addConditionalFormatting(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetId: number,
  startRow: number,
  endRow: number,
  column: number,
  rules: Array<{
    condition: string;
    backgroundColor: { red: number; green: number; blue: number };
  }>
): Promise<void> {
  try {
    const requests: sheets_v4.Schema$Request[] = rules.map((rule) => ({
      addConditionalFormatRule: {
        rule: {
          ranges: [
            {
              sheetId,
              startRowIndex: startRow,
              endRowIndex: endRow,
              startColumnIndex: column,
              endColumnIndex: column + 1,
            },
          ],
          booleanRule: {
            condition: {
              type: "TEXT_EQ",
              values: [{ userEnteredValue: rule.condition }],
            },
            format: {
              backgroundColor: rule.backgroundColor,
            },
          },
        },
        index: 0,
      },
    }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests,
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to add conditional formatting: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create a new sheet in a spreadsheet
 */
export async function createSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  rowCount: number = 1000,
  columnCount: number = 26
): Promise<number> {
  try {
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
                gridProperties: {
                  rowCount,
                  columnCount,
                },
              },
            },
          },
        ],
      },
    });

    const sheetId = response.data.replies?.[0]?.addSheet?.properties?.sheetId;
    if (sheetId === undefined || sheetId === null) {
      throw new Error("Failed to get new sheet ID");
    }

    return sheetId;
  } catch (error) {
    throw new Error(
      `Failed to create sheet: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Freeze header row
 */
export async function freezeHeaderRow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetId: number,
  frozenRowCount: number = 1
): Promise<void> {
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId,
                gridProperties: {
                  frozenRowCount,
                },
              },
              fields: "gridProperties.frozenRowCount",
            },
          },
        ],
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to freeze header row: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Find row by ID
 */
export async function findRowById(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  idColumn: string,
  idValue: string
): Promise<{ rowIndex: number; rowData: any[] } | null> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${sheetName}!A:ZZ`
    );

    if (data.length === 0) {
      return null;
    }

    const headers = data[0];
    const idColIndex = headers.indexOf(idColumn);

    if (idColIndex === -1) {
      return null;
    }

    for (let i = 1; i < data.length; i++) {
      if (data[i][idColIndex] === idValue) {
        return {
          rowIndex: i,
          rowData: data[i],
        };
      }
    }

    return null;
  } catch (error) {
    throw new Error(
      `Failed to find row: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Convert column letter to index (A=0, B=1, etc.)
 */
export function columnLetterToIndex(letter: string): number {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * Convert column index to letter (0=A, 1=B, etc.)
 */
export function columnIndexToLetter(index: number): string {
  let letter = "";
  let num = index + 1;

  while (num > 0) {
    const remainder = (num - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    num = Math.floor((num - 1) / 26);
  }

  return letter;
}

/**
 * Generate next ID in sequence (e.g., DOC-001, DOC-002)
 */
export async function generateNextId(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  idColumn: string,
  prefix: string
): Promise<string> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${sheetName}!A:ZZ`
    );

    if (data.length === 0) {
      return `${prefix}-001`;
    }

    const headers = data[0];
    const idColIndex = headers.indexOf(idColumn);

    if (idColIndex === -1) {
      return `${prefix}-001`;
    }

    let maxNumber = 0;
    for (let i = 1; i < data.length; i++) {
      const id = data[i][idColIndex];
      if (typeof id === "string" && id.startsWith(prefix)) {
        const numberPart = id.substring(prefix.length + 1);
        const num = parseInt(numberPart, 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    const nextNumber = maxNumber + 1;
    return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
  } catch (error) {
    throw new Error(
      `Failed to generate next ID: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
