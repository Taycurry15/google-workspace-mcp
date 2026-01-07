/**
 * Invoice Line Item Management
 *
 * Handles creation, reading, updating, and deletion of invoice line items
 * Manages line item calculations and invoice total updates
 */

import type { sheets_v4 } from "googleapis";
import {
  readSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "@gw-mcp/shared-core";
import { readInvoice, updateInvoice } from "./invoices.js";

/**
 * Column mapping for InvoiceLineItems sheet (A-M, 13 columns)
 */
export const LINE_ITEM_COLUMNS = {
  lineItemId: "A",
  invoiceId: "B",
  description: "C",
  quantity: "D",
  unitPrice: "E",
  total: "F",
  deliverableId: "G",
  category: "H",
  taxable: "I",
  notes: "J",
  createdDate: "K",
  createdBy: "L",
  lastModified: "M",
};

const LINE_ITEMS_SHEET = "InvoiceLineItems";

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  lineItemId: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  deliverableId?: string;
  category?: string;
  taxable: boolean;
  notes?: string;
  createdDate: Date;
  createdBy: string;
  lastModified: Date;
}

/**
 * Parse a row from the sheet into an InvoiceLineItem object
 */
function parseLineItemRow(row: any[]): InvoiceLineItem | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  return {
    lineItemId: row[0] || "",
    invoiceId: row[1] || "",
    description: row[2] || "",
    quantity: row[3] ? parseFloat(row[3]) : 0,
    unitPrice: row[4] ? parseFloat(row[4]) : 0,
    total: row[5] ? parseFloat(row[5]) : 0,
    deliverableId: row[6] || undefined,
    category: row[7] || undefined,
    taxable: row[8] === "TRUE" || row[8] === true,
    notes: row[9] || undefined,
    createdDate: row[10] ? new Date(row[10]) : new Date(),
    createdBy: row[11] || "",
    lastModified: row[12] ? new Date(row[12]) : new Date(),
  };
}

/**
 * Convert an InvoiceLineItem object to a row array
 */
function lineItemToRow(lineItem: InvoiceLineItem): any[] {
  return [
    lineItem.lineItemId,
    lineItem.invoiceId,
    lineItem.description,
    lineItem.quantity,
    lineItem.unitPrice,
    lineItem.total,
    lineItem.deliverableId || "",
    lineItem.category || "",
    lineItem.taxable,
    lineItem.notes || "",
    lineItem.createdDate.toISOString(),
    lineItem.createdBy,
    lineItem.lastModified.toISOString(),
  ];
}

/**
 * Create line item input
 */
export interface CreateLineItemInput {
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  deliverableId?: string;
  category?: string;
  taxable?: boolean;
  notes?: string;
}

/**
 * Update line item input
 */
export interface UpdateLineItemInput {
  lineItemId: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  deliverableId?: string;
  category?: string;
  taxable?: boolean;
  notes?: string;
}

/**
 * Create a new line item
 */
export async function createLineItem(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: CreateLineItemInput,
  createdBy: string
): Promise<InvoiceLineItem> {
  try {
    // Verify invoice exists
    const invoice = await readInvoice(sheets, spreadsheetId, input.invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Generate next line item ID
    const lineItemId = await generateNextId(
      sheets,
      spreadsheetId,
      LINE_ITEMS_SHEET,
      "Line Item ID",
      "LI"
    );

    const now = new Date();
    const total = input.quantity * input.unitPrice;

    const lineItem: InvoiceLineItem = {
      lineItemId,
      invoiceId: input.invoiceId,
      description: input.description,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      total,
      deliverableId: input.deliverableId,
      category: input.category,
      taxable: input.taxable !== undefined ? input.taxable : true,
      notes: input.notes,
      createdDate: now,
      createdBy,
      lastModified: now,
    };

    // Append to sheet
    const row = lineItemToRow(lineItem);
    await appendRows(sheets, spreadsheetId, `${LINE_ITEMS_SHEET}!A:M`, [row]);

    // Update invoice totals
    await recalculateInvoiceTotal(sheets, spreadsheetId, input.invoiceId);

    return lineItem;
  } catch (error) {
    throw new Error(
      `Failed to create line item: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List line items for an invoice
 */
export async function listLineItemsForInvoice(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  invoiceId: string
): Promise<InvoiceLineItem[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${LINE_ITEMS_SHEET}!A:M`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const lineItems: InvoiceLineItem[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const lineItem = parseLineItemRow(data[i]);
      if (!lineItem) continue;

      // Filter by invoice ID
      if (lineItem.invoiceId === invoiceId) {
        lineItems.push(lineItem);
      }
    }

    return lineItems;
  } catch (error) {
    throw new Error(
      `Failed to list line items: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update a line item
 */
export async function updateLineItem(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: UpdateLineItemInput
): Promise<InvoiceLineItem | null> {
  try {
    // First, read the existing line item
    const result = await findRowById(
      sheets,
      spreadsheetId,
      LINE_ITEMS_SHEET,
      "Line Item ID",
      input.lineItemId
    );

    if (!result) {
      return null;
    }

    const existing = parseLineItemRow(result.rowData);
    if (!existing) {
      return null;
    }

    // Apply updates
    const updated: InvoiceLineItem = {
      ...existing,
      lastModified: new Date(),
    };

    if (input.description !== undefined)
      updated.description = input.description;
    if (input.quantity !== undefined) updated.quantity = input.quantity;
    if (input.unitPrice !== undefined) updated.unitPrice = input.unitPrice;
    if (input.deliverableId !== undefined)
      updated.deliverableId = input.deliverableId;
    if (input.category !== undefined) updated.category = input.category;
    if (input.taxable !== undefined) updated.taxable = input.taxable;
    if (input.notes !== undefined) updated.notes = input.notes;

    // Recalculate total
    updated.total = updated.quantity * updated.unitPrice;

    // Build update map
    const updates: Record<string, any> = {};

    if (input.description !== undefined)
      updates.description = input.description;
    if (input.quantity !== undefined) updates.quantity = input.quantity;
    if (input.unitPrice !== undefined) updates.unitPrice = input.unitPrice;
    if (input.quantity !== undefined || input.unitPrice !== undefined)
      updates.total = updated.total;
    if (input.deliverableId !== undefined)
      updates.deliverableId = input.deliverableId || "";
    if (input.category !== undefined) updates.category = input.category || "";
    if (input.taxable !== undefined) updates.taxable = input.taxable;
    if (input.notes !== undefined) updates.notes = input.notes || "";

    updates.lastModified = updated.lastModified.toISOString();

    // Update the row
    await updateRow(
      sheets,
      spreadsheetId,
      LINE_ITEMS_SHEET,
      "Line Item ID",
      input.lineItemId,
      updates,
      LINE_ITEM_COLUMNS
    );

    // Update invoice totals
    await recalculateInvoiceTotal(sheets, spreadsheetId, existing.invoiceId);

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to update line item: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete a line item
 */
export async function deleteLineItem(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  lineItemId: string
): Promise<boolean> {
  try {
    // First, get the line item to find its invoice
    const result = await findRowById(
      sheets,
      spreadsheetId,
      LINE_ITEMS_SHEET,
      "Line Item ID",
      lineItemId
    );

    if (!result) {
      return false;
    }

    const lineItem = parseLineItemRow(result.rowData);
    if (!lineItem) {
      return false;
    }

    const invoiceId = lineItem.invoiceId;

    // Delete the row by setting all values to empty
    // (In a real implementation, you might want to use the Sheets API to delete the row)
    const updates: Record<string, any> = {};
    Object.keys(LINE_ITEM_COLUMNS).forEach((key) => {
      updates[key] = "";
    });

    await updateRow(
      sheets,
      spreadsheetId,
      LINE_ITEMS_SHEET,
      "Line Item ID",
      lineItemId,
      updates,
      LINE_ITEM_COLUMNS
    );

    // Update invoice totals
    await recalculateInvoiceTotal(sheets, spreadsheetId, invoiceId);

    return true;
  } catch (error) {
    throw new Error(
      `Failed to delete line item: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Calculate invoice total from line items
 */
export async function calculateInvoiceTotal(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  invoiceId: string,
  taxRate: number = 0
): Promise<{
  subtotal: number;
  tax: number;
  total: number;
  lineItemCount: number;
}> {
  try {
    const lineItems = await listLineItemsForInvoice(
      sheets,
      spreadsheetId,
      invoiceId
    );

    let subtotal = 0;
    let taxableAmount = 0;

    for (const item of lineItems) {
      subtotal += item.total;
      if (item.taxable) {
        taxableAmount += item.total;
      }
    }

    const tax = taxableAmount * taxRate;
    const total = subtotal + tax;

    return {
      subtotal,
      tax,
      total,
      lineItemCount: lineItems.length,
    };
  } catch (error) {
    throw new Error(
      `Failed to calculate invoice total: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Recalculate and update invoice total
 * Internal helper function
 */
async function recalculateInvoiceTotal(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  invoiceId: string
): Promise<void> {
  try {
    const invoice = await readInvoice(sheets, spreadsheetId, invoiceId);
    if (!invoice) {
      return;
    }

    // Calculate tax rate from existing invoice
    const taxRate = invoice.subtotal > 0 ? invoice.tax / invoice.subtotal : 0;

    // Calculate new totals
    const totals = await calculateInvoiceTotal(
      sheets,
      spreadsheetId,
      invoiceId,
      taxRate
    );

    // Update invoice
    await updateInvoice(sheets, spreadsheetId, {
      invoiceId,
      subtotal: totals.subtotal,
      tax: totals.tax,
      lineItemCount: totals.lineItemCount,
    });
  } catch (error) {
    // Don't throw error here to avoid cascading failures
    console.error("Failed to recalculate invoice total:", error);
  }
}
