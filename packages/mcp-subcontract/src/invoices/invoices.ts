/**
 * Invoice CRUD Operations
 *
 * Provides create, read, update, delete, and list operations for invoices
 * Integrates with Google Sheets for persistent storage
 */

import type { sheets_v4 } from "googleapis";
import type { Invoice } from "../types/subcontract.js";
import {
  readSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "@gw-mcp/shared-core";
import { readContract } from "../contracts/contracts.js";

/**
 * Column mapping for Invoices sheet (A-V, 22 columns)
 */
export const INVOICE_COLUMNS = {
  invoiceId: "A",
  invoiceNumber: "B",
  contractId: "C",
  vendorId: "D",
  programId: "E",
  invoiceDate: "F",
  dueDate: "G",
  total: "H",
  subtotal: "I",
  tax: "J",
  status: "K",
  paymentDate: "L",
  lineItemCount: "M",
  attachments: "N",
  submittedBy: "O",
  submittedDate: "P",
  approvedBy: "Q",
  approvedDate: "R",
  rejectedBy: "S",
  rejectionReason: "T",
  notes: "U",
  createdDate: "V",
};

const INVOICES_SHEET = "Invoices";

/**
 * Invoice status type
 */
export type InvoiceStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "paid"
  | "cancelled";

/**
 * Extended invoice interface for sheet storage
 */
export interface InvoiceRecord {
  invoiceId: string;
  invoiceNumber: string;
  contractId: string;
  vendorId: string;
  programId: string;
  invoiceDate: Date;
  dueDate: Date;
  total: number;
  subtotal: number;
  tax: number;
  status: InvoiceStatus;
  paymentDate?: Date;
  lineItemCount: number;
  attachments?: string;
  submittedBy: string;
  submittedDate: Date;
  approvedBy?: string;
  approvedDate?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  notes?: string;
  createdDate: Date;
}

/**
 * Parse a row from the sheet into an InvoiceRecord object
 */
function parseInvoiceRow(row: any[]): InvoiceRecord | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  return {
    invoiceId: row[0] || "",
    invoiceNumber: row[1] || "",
    contractId: row[2] || "",
    vendorId: row[3] || "",
    programId: row[4] || "",
    invoiceDate: row[5] ? new Date(row[5]) : new Date(),
    dueDate: row[6] ? new Date(row[6]) : new Date(),
    total: row[7] ? parseFloat(row[7]) : 0,
    subtotal: row[8] ? parseFloat(row[8]) : 0,
    tax: row[9] ? parseFloat(row[9]) : 0,
    status: (row[10] as InvoiceStatus) || "pending",
    paymentDate: row[11] ? new Date(row[11]) : undefined,
    lineItemCount: row[12] ? parseInt(row[12], 10) : 0,
    attachments: row[13] || undefined,
    submittedBy: row[14] || "",
    submittedDate: row[15] ? new Date(row[15]) : new Date(),
    approvedBy: row[16] || undefined,
    approvedDate: row[17] ? new Date(row[17]) : undefined,
    rejectedBy: row[18] || undefined,
    rejectionReason: row[19] || undefined,
    notes: row[20] || undefined,
    createdDate: row[21] ? new Date(row[21]) : new Date(),
  };
}

/**
 * Convert an InvoiceRecord object to a row array
 */
function invoiceToRow(invoice: InvoiceRecord): any[] {
  return [
    invoice.invoiceId,
    invoice.invoiceNumber,
    invoice.contractId,
    invoice.vendorId,
    invoice.programId,
    invoice.invoiceDate.toISOString().split("T")[0],
    invoice.dueDate.toISOString().split("T")[0],
    invoice.total,
    invoice.subtotal,
    invoice.tax,
    invoice.status,
    invoice.paymentDate
      ? invoice.paymentDate.toISOString().split("T")[0]
      : "",
    invoice.lineItemCount,
    invoice.attachments || "",
    invoice.submittedBy,
    invoice.submittedDate.toISOString(),
    invoice.approvedBy || "",
    invoice.approvedDate ? invoice.approvedDate.toISOString() : "",
    invoice.rejectedBy || "",
    invoice.rejectionReason || "",
    invoice.notes || "",
    invoice.createdDate.toISOString(),
  ];
}

/**
 * Create invoice input
 */
export interface CreateInvoiceInput {
  invoiceNumber: string;
  contractId: string;
  vendorId: string;
  programId: string;
  invoiceDate: Date;
  dueDate: Date;
  subtotal: number;
  tax: number;
  attachments?: string;
  notes?: string;
}

/**
 * Update invoice input
 */
export interface UpdateInvoiceInput {
  invoiceId: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  subtotal?: number;
  tax?: number;
  status?: InvoiceStatus;
  paymentDate?: Date;
  lineItemCount?: number;
  attachments?: string;
  approvedBy?: string;
  approvedDate?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  notes?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Create a new invoice
 */
export async function createInvoice(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: CreateInvoiceInput,
  submittedBy: string
): Promise<InvoiceRecord> {
  try {
    // Generate next invoice ID
    const invoiceId = await generateNextId(
      sheets,
      spreadsheetId,
      INVOICES_SHEET,
      "Invoice ID",
      "INV"
    );

    const now = new Date();
    const total = input.subtotal + input.tax;

    const invoice: InvoiceRecord = {
      invoiceId,
      invoiceNumber: input.invoiceNumber,
      contractId: input.contractId,
      vendorId: input.vendorId,
      programId: input.programId,
      invoiceDate: input.invoiceDate,
      dueDate: input.dueDate,
      total,
      subtotal: input.subtotal,
      tax: input.tax,
      status: "pending",
      lineItemCount: 0,
      attachments: input.attachments,
      submittedBy,
      submittedDate: now,
      notes: input.notes,
      createdDate: now,
    };

    // Append to sheet
    const row = invoiceToRow(invoice);
    await appendRows(sheets, spreadsheetId, `${INVOICES_SHEET}!A:V`, [row]);

    return invoice;
  } catch (error) {
    throw new Error(
      `Failed to create invoice: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Read an invoice by ID
 */
export async function readInvoice(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  invoiceId: string
): Promise<InvoiceRecord | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      INVOICES_SHEET,
      "Invoice ID",
      invoiceId
    );

    if (!result) {
      return null;
    }

    return parseInvoiceRow(result.rowData);
  } catch (error) {
    throw new Error(
      `Failed to read invoice: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update an invoice
 */
export async function updateInvoice(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: UpdateInvoiceInput
): Promise<InvoiceRecord | null> {
  try {
    // First, read the existing invoice
    const existing = await readInvoice(sheets, spreadsheetId, input.invoiceId);

    if (!existing) {
      return null;
    }

    // Apply updates
    const updated: InvoiceRecord = { ...existing };

    if (input.invoiceNumber !== undefined)
      updated.invoiceNumber = input.invoiceNumber;
    if (input.invoiceDate !== undefined)
      updated.invoiceDate = input.invoiceDate;
    if (input.dueDate !== undefined) updated.dueDate = input.dueDate;
    if (input.subtotal !== undefined) updated.subtotal = input.subtotal;
    if (input.tax !== undefined) updated.tax = input.tax;
    if (input.status !== undefined) updated.status = input.status;
    if (input.paymentDate !== undefined)
      updated.paymentDate = input.paymentDate;
    if (input.lineItemCount !== undefined)
      updated.lineItemCount = input.lineItemCount;
    if (input.attachments !== undefined) updated.attachments = input.attachments;
    if (input.approvedBy !== undefined) updated.approvedBy = input.approvedBy;
    if (input.approvedDate !== undefined)
      updated.approvedDate = input.approvedDate;
    if (input.rejectedBy !== undefined) updated.rejectedBy = input.rejectedBy;
    if (input.rejectionReason !== undefined)
      updated.rejectionReason = input.rejectionReason;
    if (input.notes !== undefined) updated.notes = input.notes;

    // Recalculate total
    updated.total = updated.subtotal + updated.tax;

    // Build update map
    const updates: Record<string, any> = {};

    if (input.invoiceNumber !== undefined)
      updates.invoiceNumber = input.invoiceNumber;
    if (input.invoiceDate !== undefined)
      updates.invoiceDate = input.invoiceDate.toISOString().split("T")[0];
    if (input.dueDate !== undefined)
      updates.dueDate = input.dueDate.toISOString().split("T")[0];
    if (input.subtotal !== undefined || input.tax !== undefined)
      updates.total = updated.total;
    if (input.subtotal !== undefined) updates.subtotal = input.subtotal;
    if (input.tax !== undefined) updates.tax = input.tax;
    if (input.status !== undefined) updates.status = input.status;
    if (input.paymentDate !== undefined)
      updates.paymentDate = input.paymentDate
        ? input.paymentDate.toISOString().split("T")[0]
        : "";
    if (input.lineItemCount !== undefined)
      updates.lineItemCount = input.lineItemCount;
    if (input.attachments !== undefined)
      updates.attachments = input.attachments || "";
    if (input.approvedBy !== undefined)
      updates.approvedBy = input.approvedBy || "";
    if (input.approvedDate !== undefined)
      updates.approvedDate = input.approvedDate
        ? input.approvedDate.toISOString()
        : "";
    if (input.rejectedBy !== undefined)
      updates.rejectedBy = input.rejectedBy || "";
    if (input.rejectionReason !== undefined)
      updates.rejectionReason = input.rejectionReason || "";
    if (input.notes !== undefined) updates.notes = input.notes || "";

    // Update the row
    await updateRow(
      sheets,
      spreadsheetId,
      INVOICES_SHEET,
      "Invoice ID",
      input.invoiceId,
      updates,
      INVOICE_COLUMNS
    );

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to update invoice: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List invoices with optional filters
 */
export async function listInvoices(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  filters?: {
    contractId?: string;
    vendorId?: string;
    programId?: string;
    status?: InvoiceStatus;
  }
): Promise<InvoiceRecord[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${INVOICES_SHEET}!A:V`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const invoices: InvoiceRecord[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const invoice = parseInvoiceRow(data[i]);
      if (!invoice) continue;

      // Apply filters
      if (filters) {
        if (filters.contractId && invoice.contractId !== filters.contractId) {
          continue;
        }
        if (filters.vendorId && invoice.vendorId !== filters.vendorId) {
          continue;
        }
        if (filters.programId && invoice.programId !== filters.programId) {
          continue;
        }
        if (filters.status && invoice.status !== filters.status) {
          continue;
        }
      }

      invoices.push(invoice);
    }

    return invoices;
  } catch (error) {
    throw new Error(
      `Failed to list invoices: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete an invoice (soft delete by marking as cancelled)
 */
export async function deleteInvoice(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  invoiceId: string,
  deletedBy: string
): Promise<boolean> {
  try {
    // Mark invoice as cancelled instead of deleting
    const result = await updateInvoice(sheets, spreadsheetId, {
      invoiceId,
      status: "cancelled",
      notes: `Cancelled by ${deletedBy} on ${new Date().toISOString()}`,
    });

    return result !== null;
  } catch (error) {
    throw new Error(
      `Failed to delete invoice: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate invoice against contract terms
 */
export async function validateInvoice(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  invoiceId: string
): Promise<ValidationResult> {
  try {
    const invoice = await readInvoice(sheets, spreadsheetId, invoiceId);

    if (!invoice) {
      return {
        isValid: false,
        errors: ["Invoice not found"],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Read contract for validation
    const contract = await readContract(
      sheets,
      spreadsheetId,
      invoice.contractId
    );

    if (!contract) {
      errors.push("Contract not found");
      return { isValid: false, errors, warnings };
    }

    // Validate contract is active
    if (contract.status !== "active") {
      errors.push(
        `Contract is not active (status: ${contract.status})`
      );
    }

    // Validate invoice date is within contract period
    const invoiceDate = new Date(invoice.invoiceDate);
    const contractStart = new Date(contract.startDate);
    const contractEnd = new Date(contract.endDate);

    if (invoiceDate < contractStart || invoiceDate > contractEnd) {
      errors.push(
        `Invoice date ${invoiceDate.toISOString().split("T")[0]} is outside contract period (${contractStart.toISOString().split("T")[0]} to ${contractEnd.toISOString().split("T")[0]})`
      );
    }

    // Validate currency matches
    if (contract.currency && contract.currency !== "USD") {
      warnings.push(
        `Contract currency is ${contract.currency}, ensure invoice amounts are in correct currency`
      );
    }

    // Validate payment terms
    const invoiceDay = invoice.invoiceDate.getTime();
    const dueDay = invoice.dueDate.getTime();
    const daysDiff = Math.floor((dueDay - invoiceDay) / (1000 * 60 * 60 * 24));

    if (contract.paymentTerms) {
      const match = contract.paymentTerms.match(/Net (\d+)/i);
      if (match) {
        const expectedDays = parseInt(match[1], 10);
        if (daysDiff !== expectedDays) {
          warnings.push(
            `Due date is ${daysDiff} days from invoice date, but contract specifies ${contract.paymentTerms}`
          );
        }
      }
    }

    // Validate total is positive
    if (invoice.total <= 0) {
      errors.push("Invoice total must be greater than zero");
    }

    // Validate subtotal + tax = total
    const calculatedTotal = invoice.subtotal + invoice.tax;
    if (Math.abs(calculatedTotal - invoice.total) > 0.01) {
      errors.push(
        `Invoice total (${invoice.total}) does not match subtotal + tax (${calculatedTotal})`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    throw new Error(
      `Failed to validate invoice: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get invoices pending approval
 */
export async function getInvoicesForApproval(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  filters?: {
    contractId?: string;
    vendorId?: string;
    programId?: string;
  }
): Promise<InvoiceRecord[]> {
  try {
    const invoices = await listInvoices(sheets, spreadsheetId, {
      ...filters,
      status: "pending",
    });

    // Sort by invoice date (oldest first)
    return invoices.sort((a, b) => {
      return new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime();
    });
  } catch (error) {
    throw new Error(
      `Failed to get invoices for approval: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
