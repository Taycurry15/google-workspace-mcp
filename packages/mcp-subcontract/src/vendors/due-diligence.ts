/**
 * Due Diligence Workflow
 *
 * Provides operations for vendor due diligence management
 * Integrates with Google Sheets for persistent storage
 */

import type { sheets_v4 } from "googleapis";
import type { Vendor } from "../types/subcontract.js";
import { readVendor, updateVendor } from "./vendors.js";

/**
 * Due diligence status result
 */
export interface DueDiligenceStatus {
  vendorId: string;
  vendorName: string;
  dueDiligenceCompleted: boolean;
  dueDiligenceDate?: Date;
  insuranceCurrent: boolean;
  insuranceExpiry?: Date;
  daysUntilRenewal?: number;
  requiresAction: boolean;
  actionItems: string[];
}

/**
 * Initiate due diligence for a vendor
 */
export async function initiateDueDiligence(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId: string,
  initiatedBy: string
): Promise<Vendor | null> {
  try {
    const vendor = await readVendor(sheets, spreadsheetId, vendorId);

    if (!vendor) {
      return null;
    }

    // Update vendor to mark due diligence as in progress
    const updated = await updateVendor(
      sheets,
      spreadsheetId,
      {
        vendorId,
        dueDiligenceCompleted: false,
        notes: `Due diligence initiated by ${initiatedBy} on ${new Date().toISOString()}\n${vendor.notes || ""}`,
      },
      initiatedBy
    );

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to initiate due diligence: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Complete due diligence for a vendor
 */
export async function completeDueDiligence(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId: string,
  completedBy: string,
  insuranceCurrent: boolean = true,
  insuranceExpiry?: Date,
  performanceRating?: number
): Promise<Vendor | null> {
  try {
    const vendor = await readVendor(sheets, spreadsheetId, vendorId);

    if (!vendor) {
      return null;
    }

    const now = new Date();

    // Update vendor with due diligence completion
    const updated = await updateVendor(
      sheets,
      spreadsheetId,
      {
        vendorId,
        dueDiligenceCompleted: true,
        dueDiligenceDate: now,
        insuranceCurrent,
        insuranceExpiry,
        performanceRating:
          performanceRating !== undefined
            ? performanceRating
            : vendor.performanceRating,
        status: "approved", // Approve vendor after due diligence
        notes: `Due diligence completed by ${completedBy} on ${now.toISOString()}\n${vendor.notes || ""}`,
      },
      completedBy
    );

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to complete due diligence: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Request due diligence renewal
 */
export async function requestDueDiligenceRenewal(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId: string,
  requestedBy: string
): Promise<Vendor | null> {
  try {
    const vendor = await readVendor(sheets, spreadsheetId, vendorId);

    if (!vendor) {
      return null;
    }

    // Mark due diligence as needing renewal
    const updated = await updateVendor(
      sheets,
      spreadsheetId,
      {
        vendorId,
        dueDiligenceCompleted: false,
        notes: `Due diligence renewal requested by ${requestedBy} on ${new Date().toISOString()}\nPrevious completion: ${vendor.dueDiligenceDate?.toISOString() || "N/A"}\n${vendor.notes || ""}`,
      },
      requestedBy
    );

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to request due diligence renewal: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get due diligence status for a vendor
 */
export async function getDueDiligenceStatus(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId: string
): Promise<DueDiligenceStatus | null> {
  try {
    const vendor = await readVendor(sheets, spreadsheetId, vendorId);

    if (!vendor) {
      return null;
    }

    const now = new Date();
    const actionItems: string[] = [];
    let requiresAction = false;
    let daysUntilRenewal: number | undefined;

    // Check if due diligence is not completed
    if (!vendor.dueDiligenceCompleted) {
      actionItems.push("Complete due diligence process");
      requiresAction = true;
    } else if (vendor.dueDiligenceDate) {
      // Check if renewal is needed (1 year cycle)
      const renewalDate = new Date(vendor.dueDiligenceDate);
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);

      const daysUntil = Math.floor(
        (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      daysUntilRenewal = daysUntil;

      if (daysUntil <= 0) {
        actionItems.push("Due diligence has expired - renewal required");
        requiresAction = true;
      } else if (daysUntil <= 90) {
        actionItems.push(
          `Due diligence renewal needed in ${daysUntil} days`
        );
        requiresAction = true;
      }
    }

    // Check insurance status
    if (!vendor.insuranceCurrent) {
      actionItems.push("Insurance verification required");
      requiresAction = true;
    } else if (vendor.insuranceExpiry) {
      const daysUntilExpiry = Math.floor(
        (vendor.insuranceExpiry.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 0) {
        actionItems.push("Insurance has expired");
        requiresAction = true;
      } else if (daysUntilExpiry <= 30) {
        actionItems.push(
          `Insurance expires in ${daysUntilExpiry} days`
        );
        requiresAction = true;
      }
    }

    // Check if vendor is active but not approved
    if (vendor.status === "active" && !vendor.dueDiligenceCompleted) {
      actionItems.push(
        "Vendor is active but due diligence not completed"
      );
      requiresAction = true;
    }

    return {
      vendorId: vendor.vendorId,
      vendorName: vendor.name,
      dueDiligenceCompleted: vendor.dueDiligenceCompleted,
      dueDiligenceDate: vendor.dueDiligenceDate,
      insuranceCurrent: vendor.insuranceCurrent,
      insuranceExpiry: vendor.insuranceExpiry,
      daysUntilRenewal,
      requiresAction,
      actionItems,
    };
  } catch (error) {
    throw new Error(
      `Failed to get due diligence status: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
