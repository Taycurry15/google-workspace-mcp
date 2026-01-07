/**
 * Vendor CRUD Operations
 *
 * Provides create, read, update, delete, and list operations for vendors
 * Integrates with Google Sheets for persistent storage
 */

import type { sheets_v4 } from "googleapis";
import type {
  Vendor,
  VendorStatus,
  VendorCategory,
} from "../types/subcontract.js";
import {
  readSheetRange,
  writeSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "@gw-mcp/shared-core";

/**
 * Column mapping for Vendors sheet
 */
export const VENDOR_COLUMNS = {
  vendorId: "A",
  name: "B",
  legalName: "C",
  taxId: "D",
  dunsNumber: "E",
  category: "F",
  status: "G",
  primaryContact: "H",
  email: "I",
  phone: "J",
  addressStreet: "K",
  addressCity: "L",
  addressState: "M",
  addressZip: "N",
  addressCountry: "O",
  cageCode: "P",
  smallBusiness: "Q",
  womanOwned: "R",
  minorityOwned: "S",
  veteranOwned: "T",
  paymentTerms: "U",
  currency: "V",
  dueDiligenceCompleted: "W",
  dueDiligenceDate: "X",
  insuranceCurrent: "Y",
  insuranceExpiry: "Z",
  performanceRating: "AA",
  totalContractValue: "AB",
  activeContracts: "AC",
  createdDate: "AD",
  createdBy: "AE",
  lastModified: "AF",
  notes: "AG",
};

const VENDORS_SHEET = "Vendors";

/**
 * Parse a row from the sheet into a Vendor object
 */
function parseVendorRow(row: any[]): Vendor | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  return {
    vendorId: row[0] || "",
    name: row[1] || "",
    legalName: row[2] || "",
    taxId: row[3] || "",
    dunsNumber: row[4] || undefined,
    category: (row[5] as VendorCategory) || "other",
    status: (row[6] as VendorStatus) || "prospective",
    primaryContact: row[7] || "",
    email: row[8] || "",
    phone: row[9] || "",
    address: {
      street: row[10] || "",
      city: row[11] || "",
      state: row[12] || "",
      zip: row[13] || "",
      country: row[14] || "",
    },
    cageCode: row[15] || undefined,
    smallBusiness: row[16] === "TRUE" || row[16] === true,
    womanOwned: row[17] === "TRUE" || row[17] === true,
    minorityOwned: row[18] === "TRUE" || row[18] === true,
    veteranOwned: row[19] === "TRUE" || row[19] === true,
    paymentTerms: row[20] || "",
    currency: row[21] || "USD",
    dueDiligenceCompleted: row[22] === "TRUE" || row[22] === true,
    dueDiligenceDate: row[23] ? new Date(row[23]) : undefined,
    insuranceCurrent: row[24] === "TRUE" || row[24] === true,
    insuranceExpiry: row[25] ? new Date(row[25]) : undefined,
    performanceRating: row[26] ? parseFloat(row[26]) : undefined,
    totalContractValue: row[27] ? parseFloat(row[27]) : 0,
    activeContracts: row[28] ? parseInt(row[28], 10) : 0,
    createdDate: row[29] ? new Date(row[29]) : new Date(),
    createdBy: row[30] || "",
    lastModified: row[31] ? new Date(row[31]) : new Date(),
    notes: row[32] || "",
  };
}

/**
 * Convert a Vendor object to a row array
 */
function vendorToRow(vendor: Vendor): any[] {
  return [
    vendor.vendorId,
    vendor.name,
    vendor.legalName,
    vendor.taxId,
    vendor.dunsNumber || "",
    vendor.category,
    vendor.status,
    vendor.primaryContact,
    vendor.email,
    vendor.phone,
    vendor.address.street,
    vendor.address.city,
    vendor.address.state,
    vendor.address.zip,
    vendor.address.country,
    vendor.cageCode || "",
    vendor.smallBusiness,
    vendor.womanOwned,
    vendor.minorityOwned,
    vendor.veteranOwned,
    vendor.paymentTerms,
    vendor.currency,
    vendor.dueDiligenceCompleted,
    vendor.dueDiligenceDate
      ? vendor.dueDiligenceDate.toISOString().split("T")[0]
      : "",
    vendor.insuranceCurrent,
    vendor.insuranceExpiry
      ? vendor.insuranceExpiry.toISOString().split("T")[0]
      : "",
    vendor.performanceRating || "",
    vendor.totalContractValue,
    vendor.activeContracts,
    vendor.createdDate.toISOString(),
    vendor.createdBy,
    vendor.lastModified.toISOString(),
    vendor.notes,
  ];
}

/**
 * Create vendor input
 */
export interface CreateVendorInput {
  name: string;
  legalName: string;
  taxId: string;
  dunsNumber?: string;
  category: VendorCategory;
  primaryContact: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  cageCode?: string;
  smallBusiness?: boolean;
  womanOwned?: boolean;
  minorityOwned?: boolean;
  veteranOwned?: boolean;
  paymentTerms: string;
  currency?: string;
  notes?: string;
}

/**
 * Update vendor input
 */
export interface UpdateVendorInput {
  vendorId: string;
  name?: string;
  legalName?: string;
  taxId?: string;
  dunsNumber?: string;
  category?: VendorCategory;
  status?: VendorStatus;
  primaryContact?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  cageCode?: string;
  smallBusiness?: boolean;
  womanOwned?: boolean;
  minorityOwned?: boolean;
  veteranOwned?: boolean;
  paymentTerms?: string;
  currency?: string;
  dueDiligenceCompleted?: boolean;
  dueDiligenceDate?: Date;
  insuranceCurrent?: boolean;
  insuranceExpiry?: Date;
  performanceRating?: number;
  notes?: string;
}

/**
 * Create a new vendor
 */
export async function createVendor(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: CreateVendorInput,
  createdBy: string
): Promise<Vendor> {
  try {
    // Generate next vendor ID
    const vendorId = await generateNextId(
      sheets,
      spreadsheetId,
      VENDORS_SHEET,
      "Vendor ID",
      "VEND"
    );

    const now = new Date();

    const vendor: Vendor = {
      vendorId,
      name: input.name,
      legalName: input.legalName,
      taxId: input.taxId,
      dunsNumber: input.dunsNumber,
      category: input.category,
      status: "prospective",
      primaryContact: input.primaryContact,
      email: input.email,
      phone: input.phone,
      address: input.address,
      cageCode: input.cageCode,
      smallBusiness: input.smallBusiness || false,
      womanOwned: input.womanOwned || false,
      minorityOwned: input.minorityOwned || false,
      veteranOwned: input.veteranOwned || false,
      paymentTerms: input.paymentTerms,
      currency: input.currency || "USD",
      dueDiligenceCompleted: false,
      insuranceCurrent: false,
      totalContractValue: 0,
      activeContracts: 0,
      createdDate: now,
      createdBy,
      lastModified: now,
      notes: input.notes || "",
    };

    // Append to sheet
    const row = vendorToRow(vendor);
    await appendRows(sheets, spreadsheetId, `${VENDORS_SHEET}!A:AG`, [row]);

    return vendor;
  } catch (error) {
    throw new Error(
      `Failed to create vendor: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Read a vendor by ID
 */
export async function readVendor(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId: string
): Promise<Vendor | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      VENDORS_SHEET,
      "Vendor ID",
      vendorId
    );

    if (!result) {
      return null;
    }

    return parseVendorRow(result.rowData);
  } catch (error) {
    throw new Error(
      `Failed to read vendor: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update a vendor
 */
export async function updateVendor(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: UpdateVendorInput,
  modifiedBy: string
): Promise<Vendor | null> {
  try {
    // First, read the existing vendor
    const existing = await readVendor(sheets, spreadsheetId, input.vendorId);

    if (!existing) {
      return null;
    }

    // Apply updates
    const updated: Vendor = {
      ...existing,
      lastModified: new Date(),
    };

    // Apply individual updates
    if (input.name !== undefined) updated.name = input.name;
    if (input.legalName !== undefined) updated.legalName = input.legalName;
    if (input.taxId !== undefined) updated.taxId = input.taxId;
    if (input.dunsNumber !== undefined) updated.dunsNumber = input.dunsNumber;
    if (input.category !== undefined) updated.category = input.category;
    if (input.status !== undefined) updated.status = input.status;
    if (input.primaryContact !== undefined)
      updated.primaryContact = input.primaryContact;
    if (input.email !== undefined) updated.email = input.email;
    if (input.phone !== undefined) updated.phone = input.phone;
    if (input.address !== undefined) {
      updated.address = {
        ...existing.address,
        ...input.address,
      };
    }
    if (input.cageCode !== undefined) updated.cageCode = input.cageCode;
    if (input.smallBusiness !== undefined)
      updated.smallBusiness = input.smallBusiness;
    if (input.womanOwned !== undefined) updated.womanOwned = input.womanOwned;
    if (input.minorityOwned !== undefined)
      updated.minorityOwned = input.minorityOwned;
    if (input.veteranOwned !== undefined)
      updated.veteranOwned = input.veteranOwned;
    if (input.paymentTerms !== undefined)
      updated.paymentTerms = input.paymentTerms;
    if (input.currency !== undefined) updated.currency = input.currency;
    if (input.dueDiligenceCompleted !== undefined)
      updated.dueDiligenceCompleted = input.dueDiligenceCompleted;
    if (input.dueDiligenceDate !== undefined)
      updated.dueDiligenceDate = input.dueDiligenceDate;
    if (input.insuranceCurrent !== undefined)
      updated.insuranceCurrent = input.insuranceCurrent;
    if (input.insuranceExpiry !== undefined)
      updated.insuranceExpiry = input.insuranceExpiry;
    if (input.performanceRating !== undefined)
      updated.performanceRating = input.performanceRating;
    if (input.notes !== undefined) updated.notes = input.notes;

    // Build update map
    const updates: Record<string, any> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.legalName !== undefined) updates.legalName = input.legalName;
    if (input.taxId !== undefined) updates.taxId = input.taxId;
    if (input.dunsNumber !== undefined)
      updates.dunsNumber = input.dunsNumber || "";
    if (input.category !== undefined) updates.category = input.category;
    if (input.status !== undefined) updates.status = input.status;
    if (input.primaryContact !== undefined)
      updates.primaryContact = input.primaryContact;
    if (input.email !== undefined) updates.email = input.email;
    if (input.phone !== undefined) updates.phone = input.phone;
    if (input.address !== undefined) {
      if (input.address.street !== undefined)
        updates.addressStreet = input.address.street;
      if (input.address.city !== undefined)
        updates.addressCity = input.address.city;
      if (input.address.state !== undefined)
        updates.addressState = input.address.state;
      if (input.address.zip !== undefined)
        updates.addressZip = input.address.zip;
      if (input.address.country !== undefined)
        updates.addressCountry = input.address.country;
    }
    if (input.cageCode !== undefined) updates.cageCode = input.cageCode || "";
    if (input.smallBusiness !== undefined)
      updates.smallBusiness = input.smallBusiness;
    if (input.womanOwned !== undefined) updates.womanOwned = input.womanOwned;
    if (input.minorityOwned !== undefined)
      updates.minorityOwned = input.minorityOwned;
    if (input.veteranOwned !== undefined)
      updates.veteranOwned = input.veteranOwned;
    if (input.paymentTerms !== undefined)
      updates.paymentTerms = input.paymentTerms;
    if (input.currency !== undefined) updates.currency = input.currency;
    if (input.dueDiligenceCompleted !== undefined)
      updates.dueDiligenceCompleted = input.dueDiligenceCompleted;
    if (input.dueDiligenceDate !== undefined)
      updates.dueDiligenceDate = input.dueDiligenceDate
        ? input.dueDiligenceDate.toISOString().split("T")[0]
        : "";
    if (input.insuranceCurrent !== undefined)
      updates.insuranceCurrent = input.insuranceCurrent;
    if (input.insuranceExpiry !== undefined)
      updates.insuranceExpiry = input.insuranceExpiry
        ? input.insuranceExpiry.toISOString().split("T")[0]
        : "";
    if (input.performanceRating !== undefined)
      updates.performanceRating = input.performanceRating || "";
    if (input.notes !== undefined) updates.notes = input.notes;

    updates.lastModified = updated.lastModified.toISOString();

    // Update the row
    await updateRow(
      sheets,
      spreadsheetId,
      VENDORS_SHEET,
      "Vendor ID",
      input.vendorId,
      updates,
      VENDOR_COLUMNS
    );

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to update vendor: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List vendors with optional filters
 */
export async function listVendors(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  filters?: {
    status?: VendorStatus;
    category?: VendorCategory;
    smallBusiness?: boolean;
  }
): Promise<Vendor[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${VENDORS_SHEET}!A:AG`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const vendors: Vendor[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const vendor = parseVendorRow(data[i]);
      if (!vendor) continue;

      // Apply filters
      if (filters) {
        if (filters.status && vendor.status !== filters.status) {
          continue;
        }
        if (filters.category && vendor.category !== filters.category) {
          continue;
        }
        if (
          filters.smallBusiness !== undefined &&
          vendor.smallBusiness !== filters.smallBusiness
        ) {
          continue;
        }
      }

      vendors.push(vendor);
    }

    return vendors;
  } catch (error) {
    throw new Error(
      `Failed to list vendors: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete a vendor (soft delete by marking status)
 */
export async function deleteVendor(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId: string,
  deletedBy: string
): Promise<boolean> {
  try {
    // Mark vendor as inactive instead of deleting
    const result = await updateVendor(
      sheets,
      spreadsheetId,
      {
        vendorId,
        status: "inactive",
        notes: `Deleted by ${deletedBy} on ${new Date().toISOString()}`,
      },
      deletedBy
    );

    return result !== null;
  } catch (error) {
    throw new Error(
      `Failed to delete vendor: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get vendors needing due diligence renewal
 */
export async function getVendorsNeedingDueDiligence(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  daysAhead: number = 90
): Promise<Vendor[]> {
  try {
    const vendors = await listVendors(sheets, spreadsheetId, {
      status: "active",
    });

    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return vendors.filter((v) => {
      // Not completed
      if (!v.dueDiligenceCompleted) {
        return true;
      }

      // Completed but expiring soon (1 year renewal)
      if (v.dueDiligenceDate) {
        const renewalDate = new Date(v.dueDiligenceDate);
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        return renewalDate <= futureDate;
      }

      return false;
    });
  } catch (error) {
    throw new Error(
      `Failed to get vendors needing due diligence: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get top performing vendors
 */
export async function getTopPerformers(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  limit: number = 10,
  minRating: number = 80
): Promise<Vendor[]> {
  try {
    const vendors = await listVendors(sheets, spreadsheetId, {
      status: "active",
    });

    // Filter by minimum rating and sort by performance rating
    const topVendors = vendors
      .filter(
        (v) => v.performanceRating !== undefined && v.performanceRating >= minRating
      )
      .sort((a, b) => {
        const ratingA = a.performanceRating || 0;
        const ratingB = b.performanceRating || 0;
        return ratingB - ratingA;
      })
      .slice(0, limit);

    return topVendors;
  } catch (error) {
    throw new Error(
      `Failed to get top performers: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
