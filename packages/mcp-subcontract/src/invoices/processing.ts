/**
 * Invoice Approval Workflow
 *
 * Handles invoice submission, approval, rejection, and duplicate detection
 * Implements multi-level approval workflow based on amount thresholds
 */

import type { sheets_v4 } from "googleapis";
import type { InvoiceRecord, InvoiceStatus } from "./invoices.js";
import { readInvoice, updateInvoice, listInvoices } from "./invoices.js";
import { readContract } from "../contracts/contracts.js";
import { readVendor } from "../vendors/vendors.js";

/**
 * Approval threshold configuration
 */
export const APPROVAL_THRESHOLDS = {
  STANDARD: 10000, // Invoices over $10k require additional approval
  EXECUTIVE: 50000, // Invoices over $50k require executive approval
};

/**
 * Approval workflow status
 */
export interface ApprovalWorkflow {
  invoiceId: string;
  currentStatus: InvoiceStatus;
  requiresAdditionalApproval: boolean;
  requiresExecutiveApproval: boolean;
  approvalHistory: ApprovalEvent[];
  canApprove: boolean;
  canReject: boolean;
}

/**
 * Approval event
 */
export interface ApprovalEvent {
  timestamp: Date;
  action: "submitted" | "approved" | "rejected" | "cancelled";
  by: string;
  reason?: string;
  notes?: string;
}

/**
 * Duplicate invoice detection result
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  potentialDuplicates: Array<{
    invoiceId: string;
    invoiceNumber: string;
    similarity: string;
    matchedFields: string[];
  }>;
}

/**
 * Submit invoice for approval
 */
export async function submitForApproval(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  invoiceId: string,
  submittedBy: string
): Promise<ApprovalWorkflow> {
  try {
    const invoice = await readInvoice(sheets, spreadsheetId, invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status !== "pending") {
      throw new Error(
        `Invoice cannot be submitted - current status: ${invoice.status}`
      );
    }

    // Check for duplicates before submitting
    const duplicateCheck = await checkInvoiceDuplicates(
      sheets,
      spreadsheetId,
      invoiceId
    );

    if (duplicateCheck.isDuplicate) {
      throw new Error(
        `Potential duplicate invoice detected. Similar invoices: ${duplicateCheck.potentialDuplicates.map((d) => d.invoiceNumber).join(", ")}`
      );
    }

    // Update invoice notes to log submission
    await updateInvoice(sheets, spreadsheetId, {
      invoiceId,
      notes: `Submitted for approval by ${submittedBy} on ${new Date().toISOString()}${invoice.notes ? `\n${invoice.notes}` : ""}`,
    });

    // Return approval workflow
    return getApprovalWorkflow(sheets, spreadsheetId, invoiceId);
  } catch (error) {
    throw new Error(
      `Failed to submit invoice for approval: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Approve invoice
 */
export async function approveInvoice(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  invoiceId: string,
  approvedBy: string,
  notes?: string
): Promise<InvoiceRecord> {
  try {
    const invoice = await readInvoice(sheets, spreadsheetId, invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status !== "pending") {
      throw new Error(
        `Invoice cannot be approved - current status: ${invoice.status}`
      );
    }

    const now = new Date();

    // Update invoice to approved status
    const updated = await updateInvoice(sheets, spreadsheetId, {
      invoiceId,
      status: "approved",
      approvedBy,
      approvedDate: now,
      notes: `Approved by ${approvedBy} on ${now.toISOString()}${notes ? `\nApproval notes: ${notes}` : ""}${invoice.notes ? `\n${invoice.notes}` : ""}`,
    });

    if (!updated) {
      throw new Error("Failed to update invoice");
    }

    // TODO: Queue notification to financial system
    // This would integrate with a notification/queue system

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to approve invoice: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Reject invoice
 */
export async function rejectInvoice(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  invoiceId: string,
  rejectedBy: string,
  reason: string
): Promise<InvoiceRecord> {
  try {
    const invoice = await readInvoice(sheets, spreadsheetId, invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status !== "pending") {
      throw new Error(
        `Invoice cannot be rejected - current status: ${invoice.status}`
      );
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error("Rejection reason is required");
    }

    const now = new Date();

    // Update invoice to rejected status
    const updated = await updateInvoice(sheets, spreadsheetId, {
      invoiceId,
      status: "rejected",
      rejectedBy,
      rejectionReason: reason,
      notes: `Rejected by ${rejectedBy} on ${now.toISOString()}\nReason: ${reason}${invoice.notes ? `\n${invoice.notes}` : ""}`,
    });

    if (!updated) {
      throw new Error("Failed to update invoice");
    }

    // TODO: Queue notification to vendor
    // This would integrate with a notification system

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to reject invoice: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get approval workflow status and history
 */
export async function getApprovalWorkflow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  invoiceId: string
): Promise<ApprovalWorkflow> {
  try {
    const invoice = await readInvoice(sheets, spreadsheetId, invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Determine approval requirements based on amount
    const requiresAdditionalApproval =
      invoice.total > APPROVAL_THRESHOLDS.STANDARD;
    const requiresExecutiveApproval =
      invoice.total > APPROVAL_THRESHOLDS.EXECUTIVE;

    // Build approval history from invoice fields
    const approvalHistory: ApprovalEvent[] = [];

    // Submitted event
    approvalHistory.push({
      timestamp: invoice.submittedDate,
      action: "submitted",
      by: invoice.submittedBy,
    });

    // Approved event
    if (invoice.approvedBy && invoice.approvedDate) {
      approvalHistory.push({
        timestamp: invoice.approvedDate,
        action: "approved",
        by: invoice.approvedBy,
      });
    }

    // Rejected event
    if (invoice.rejectedBy) {
      approvalHistory.push({
        timestamp: invoice.createdDate, // Use created date as fallback
        action: "rejected",
        by: invoice.rejectedBy,
        reason: invoice.rejectionReason,
      });
    }

    // Cancelled event
    if (invoice.status === "cancelled") {
      approvalHistory.push({
        timestamp: invoice.createdDate,
        action: "cancelled",
        by: "system", // Could be parsed from notes
      });
    }

    // Sort history by timestamp
    approvalHistory.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Determine if can approve/reject based on current status
    const canApprove = invoice.status === "pending";
    const canReject = invoice.status === "pending";

    return {
      invoiceId: invoice.invoiceId,
      currentStatus: invoice.status,
      requiresAdditionalApproval,
      requiresExecutiveApproval,
      approvalHistory,
      canApprove,
      canReject,
    };
  } catch (error) {
    throw new Error(
      `Failed to get approval workflow: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Check for duplicate invoices
 */
export async function checkInvoiceDuplicates(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  invoiceId: string
): Promise<DuplicateCheckResult> {
  try {
    const invoice = await readInvoice(sheets, spreadsheetId, invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Get all invoices for the same vendor
    const vendorInvoices = await listInvoices(sheets, spreadsheetId, {
      vendorId: invoice.vendorId,
    });

    const potentialDuplicates: Array<{
      invoiceId: string;
      invoiceNumber: string;
      similarity: string;
      matchedFields: string[];
    }> = [];

    for (const other of vendorInvoices) {
      // Skip self and cancelled invoices
      if (
        other.invoiceId === invoice.invoiceId ||
        other.status === "cancelled"
      ) {
        continue;
      }

      const matchedFields: string[] = [];
      let matchScore = 0;

      // Check invoice number match
      if (
        other.invoiceNumber.toLowerCase() ===
        invoice.invoiceNumber.toLowerCase()
      ) {
        matchedFields.push("invoice number");
        matchScore += 3; // High weight
      }

      // Check amount match (within $0.01)
      if (Math.abs(other.total - invoice.total) < 0.01) {
        matchedFields.push("amount");
        matchScore += 2;
      }

      // Check date match (same day)
      const otherDate = new Date(other.invoiceDate).toISOString().split("T")[0];
      const invoiceDate = new Date(invoice.invoiceDate)
        .toISOString()
        .split("T")[0];

      if (otherDate === invoiceDate) {
        matchedFields.push("date");
        matchScore += 1;
      }

      // Check contract match
      if (other.contractId === invoice.contractId) {
        matchedFields.push("contract");
        matchScore += 1;
      }

      // If match score is 3 or higher, consider it a potential duplicate
      if (matchScore >= 3) {
        let similarity = "low";
        if (matchScore >= 5) similarity = "high";
        else if (matchScore >= 4) similarity = "medium";

        potentialDuplicates.push({
          invoiceId: other.invoiceId,
          invoiceNumber: other.invoiceNumber,
          similarity,
          matchedFields,
        });
      }
    }

    // Sort by similarity (high to low)
    potentialDuplicates.sort((a, b) => {
      const order = { high: 3, medium: 2, low: 1 };
      return order[b.similarity as keyof typeof order] - order[a.similarity as keyof typeof order];
    });

    return {
      isDuplicate: potentialDuplicates.some((d) => d.similarity === "high"),
      potentialDuplicates,
    };
  } catch (error) {
    throw new Error(
      `Failed to check invoice duplicates: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get invoices requiring additional approval
 */
export async function getInvoicesRequiringAdditionalApproval(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<InvoiceRecord[]> {
  try {
    const pendingInvoices = await listInvoices(sheets, spreadsheetId, {
      status: "pending",
    });

    // Filter for invoices over the threshold
    return pendingInvoices.filter(
      (invoice) => invoice.total > APPROVAL_THRESHOLDS.STANDARD
    );
  } catch (error) {
    throw new Error(
      `Failed to get invoices requiring additional approval: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get invoices requiring executive approval
 */
export async function getInvoicesRequiringExecutiveApproval(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<InvoiceRecord[]> {
  try {
    const pendingInvoices = await listInvoices(sheets, spreadsheetId, {
      status: "pending",
    });

    // Filter for invoices over the executive threshold
    return pendingInvoices.filter(
      (invoice) => invoice.total > APPROVAL_THRESHOLDS.EXECUTIVE
    );
  } catch (error) {
    throw new Error(
      `Failed to get invoices requiring executive approval: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
