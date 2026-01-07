/**
 * Update Spreadsheet Action
 *
 * Workflow action for updating Google Sheets:
 * - Append rows
 * - Update existing rows
 * - Delete rows
 * - Batch operations
 *
 * Phase 5 Implementation
 */

import type { ExecutionContext } from "../types/workflows.js";
import type { SpreadsheetActionConfig } from "../types/workflows.js";
import { google } from "googleapis";

/**
 * Update Spreadsheet Action Handler
 */
export async function updateSpreadsheetAction(
  auth: any,
  config: SpreadsheetActionConfig,
  context: ExecutionContext
): Promise<any> {
  const sheets = google.sheets({ version: "v4", auth });

  switch (config.operation) {
    case "append":
      return appendRows(sheets, config, context);

    case "update":
      return updateRows(sheets, config, context);

    case "read":
      return readRows(sheets, config, context);

    case "delete":
      return deleteRows(sheets, config, context);

    default:
      throw new Error(`Unsupported spreadsheet operation: ${config.operation}`);
  }
}

/**
 * Append rows to sheet
 */
async function appendRows(
  sheets: any,
  config: SpreadsheetActionConfig,
  context: ExecutionContext
): Promise<any> {
  if (!config.values || config.values.length === 0) {
    throw new Error("values are required for append operation");
  }

  const range = config.range || `${config.sheet}!A:Z`;

  const result = await sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: config.values,
    },
  });

  return {
    updatedRange: result.data.updates?.updatedRange,
    updatedRows: result.data.updates?.updatedRows,
    updatedColumns: result.data.updates?.updatedColumns,
    updatedCells: result.data.updates?.updatedCells,
  };
}

/**
 * Update existing rows
 */
async function updateRows(
  sheets: any,
  config: SpreadsheetActionConfig,
  context: ExecutionContext
): Promise<any> {
  if (!config.values || config.values.length === 0) {
    throw new Error("values are required for update operation");
  }

  let range = config.range;

  // If rowId is provided, find the row first
  if (config.rowId && config.criteria) {
    range = await findRowRange(sheets, config);
  }

  if (!range) {
    throw new Error("range is required for update operation");
  }

  const result = await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: config.values,
    },
  });

  return {
    updatedRange: result.data.updatedRange,
    updatedRows: result.data.updatedRows,
    updatedColumns: result.data.updatedColumns,
    updatedCells: result.data.updatedCells,
  };
}

/**
 * Read rows from sheet
 */
async function readRows(
  sheets: any,
  config: SpreadsheetActionConfig,
  context: ExecutionContext
): Promise<any> {
  const range = config.range || `${config.sheet}!A:Z`;

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range,
  });

  return {
    range: result.data.range,
    values: result.data.values || [],
    rowCount: result.data.values?.length || 0,
  };
}

/**
 * Delete rows from sheet
 */
async function deleteRows(
  sheets: any,
  config: SpreadsheetActionConfig,
  context: ExecutionContext
): Promise<any> {
  // Find rows matching criteria
  const rowIndices = await findRowIndices(sheets, config);

  if (rowIndices.length === 0) {
    return {
      deletedRows: 0,
      message: "No rows matched criteria",
    };
  }

  // Get sheet ID
  const sheetId = await getSheetId(sheets, config.spreadsheetId, config.sheet);

  // Build delete requests (in reverse order to maintain indices)
  const requests = rowIndices
    .sort((a, b) => b - a)
    .map((rowIndex) => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: rowIndex,
          endIndex: rowIndex + 1,
        },
      },
    }));

  // Execute batch update
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.spreadsheetId,
    requestBody: {
      requests,
    },
  });

  return {
    deletedRows: rowIndices.length,
    indices: rowIndices,
  };
}

/**
 * Find row range based on criteria
 */
async function findRowRange(
  sheets: any,
  config: SpreadsheetActionConfig
): Promise<string | undefined> {
  const indices = await findRowIndices(sheets, config);

  if (indices.length === 0) {
    return undefined;
  }

  // Return range for first matching row
  const rowNumber = indices[0] + 1; // Convert 0-based to 1-based
  return `${config.sheet}!A${rowNumber}:Z${rowNumber}`;
}

/**
 * Find row indices matching criteria
 */
async function findRowIndices(
  sheets: any,
  config: SpreadsheetActionConfig
): Promise<number[]> {
  if (!config.criteria) {
    return [];
  }

  // Read all rows
  const range = `${config.sheet}!A:Z`;
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range,
  });

  const rows = result.data.values || [];
  const indices: number[] = [];

  // Get header row (assumes first row is header)
  const headers = rows[0] || [];

  // Find matching rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    let matches = true;

    for (const [key, value] of Object.entries(config.criteria)) {
      const colIndex = headers.indexOf(key);
      if (colIndex === -1 || row[colIndex] !== value) {
        matches = false;
        break;
      }
    }

    if (matches) {
      indices.push(i);
    }
  }

  return indices;
}

/**
 * Get sheet ID by name
 */
async function getSheetId(
  sheets: any,
  spreadsheetId: string,
  sheetName: string
): Promise<number> {
  const result = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });

  const sheet = result.data.sheets?.find(
    (s: any) => s.properties?.title === sheetName
  );

  if (!sheet || sheet.properties?.sheetId === undefined) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }

  return sheet.properties.sheetId;
}

/**
 * Action metadata for registration
 */
export const actionMetadata = {
  type: "update_spreadsheet",
  name: "Update Spreadsheet",
  description: "Append, update, read, or delete rows in Google Sheets",
  handler: updateSpreadsheetAction,
};
