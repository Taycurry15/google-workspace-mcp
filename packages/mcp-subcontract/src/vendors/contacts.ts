/**
 * Vendor Contact Management
 *
 * Provides operations for managing vendor contacts
 * Integrates with Google Sheets for persistent storage
 */

import type { sheets_v4 } from "googleapis";
import type { VendorContact } from "../types/subcontract.js";
import {
  readSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "@gw-mcp/shared-core";

/**
 * Column mapping for Vendor Contacts sheet
 */
export const VENDOR_CONTACT_COLUMNS = {
  contactId: "A",
  vendorId: "B",
  name: "C",
  title: "D",
  email: "E",
  phone: "F",
  isPrimary: "G",
  department: "H",
  notes: "I",
};

const VENDOR_CONTACTS_SHEET = "Vendor Contacts";

/**
 * Parse a row from the sheet into a VendorContact object
 */
function parseContactRow(row: any[]): VendorContact | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  return {
    contactId: row[0] || "",
    vendorId: row[1] || "",
    name: row[2] || "",
    title: row[3] || "",
    email: row[4] || "",
    phone: row[5] || "",
    isPrimary: row[6] === "TRUE" || row[6] === true,
    department: row[7] || undefined,
    notes: row[8] || undefined,
  };
}

/**
 * Convert a VendorContact object to a row array
 */
function contactToRow(contact: VendorContact): any[] {
  return [
    contact.contactId,
    contact.vendorId,
    contact.name,
    contact.title,
    contact.email,
    contact.phone,
    contact.isPrimary,
    contact.department || "",
    contact.notes || "",
  ];
}

/**
 * Create contact input
 */
export interface CreateContactInput {
  vendorId: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  department?: string;
  notes?: string;
}

/**
 * Update contact input
 */
export interface UpdateContactInput {
  contactId: string;
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  department?: string;
  notes?: string;
}

/**
 * Create a new vendor contact
 */
export async function createContact(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: CreateContactInput
): Promise<VendorContact> {
  try {
    // Generate next contact ID
    const contactId = await generateNextId(
      sheets,
      spreadsheetId,
      VENDOR_CONTACTS_SHEET,
      "Contact ID",
      "VC"
    );

    const contact: VendorContact = {
      contactId,
      vendorId: input.vendorId,
      name: input.name,
      title: input.title,
      email: input.email,
      phone: input.phone,
      isPrimary: false,
      department: input.department,
      notes: input.notes,
    };

    // Append to sheet
    const row = contactToRow(contact);
    await appendRows(sheets, spreadsheetId, `${VENDOR_CONTACTS_SHEET}!A:I`, [
      row,
    ]);

    return contact;
  } catch (error) {
    throw new Error(
      `Failed to create contact: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Read a contact by ID
 */
export async function readContact(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  contactId: string
): Promise<VendorContact | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      VENDOR_CONTACTS_SHEET,
      "Contact ID",
      contactId
    );

    if (!result) {
      return null;
    }

    return parseContactRow(result.rowData);
  } catch (error) {
    throw new Error(
      `Failed to read contact: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List contacts for a vendor
 */
export async function listContactsForVendor(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  vendorId: string
): Promise<VendorContact[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${VENDOR_CONTACTS_SHEET}!A:I`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const contacts: VendorContact[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const contact = parseContactRow(data[i]);
      if (!contact) continue;

      if (contact.vendorId === vendorId) {
        contacts.push(contact);
      }
    }

    return contacts;
  } catch (error) {
    throw new Error(
      `Failed to list contacts: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update a contact
 */
export async function updateContact(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: UpdateContactInput
): Promise<VendorContact | null> {
  try {
    // First, read the existing contact
    const existing = await readContact(sheets, spreadsheetId, input.contactId);

    if (!existing) {
      return null;
    }

    // Apply updates
    const updated: VendorContact = {
      ...existing,
    };

    if (input.name !== undefined) updated.name = input.name;
    if (input.title !== undefined) updated.title = input.title;
    if (input.email !== undefined) updated.email = input.email;
    if (input.phone !== undefined) updated.phone = input.phone;
    if (input.department !== undefined) updated.department = input.department;
    if (input.notes !== undefined) updated.notes = input.notes;

    // Build update map
    const updates: Record<string, any> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.title !== undefined) updates.title = input.title;
    if (input.email !== undefined) updates.email = input.email;
    if (input.phone !== undefined) updates.phone = input.phone;
    if (input.department !== undefined)
      updates.department = input.department || "";
    if (input.notes !== undefined) updates.notes = input.notes || "";

    // Update the row
    await updateRow(
      sheets,
      spreadsheetId,
      VENDOR_CONTACTS_SHEET,
      "Contact ID",
      input.contactId,
      updates,
      VENDOR_CONTACT_COLUMNS
    );

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to update contact: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete a contact
 */
export async function deleteContact(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  contactId: string
): Promise<boolean> {
  try {
    const contact = await readContact(sheets, spreadsheetId, contactId);

    if (!contact) {
      return false;
    }

    // Cannot delete primary contact
    if (contact.isPrimary) {
      throw new Error(
        "Cannot delete primary contact. Set another contact as primary first."
      );
    }

    // Find and delete the row by updating it with a special marker
    // In production, you might want to actually delete the row or move it to an archive
    const result = await findRowById(
      sheets,
      spreadsheetId,
      VENDOR_CONTACTS_SHEET,
      "Contact ID",
      contactId
    );

    if (!result) {
      return false;
    }

    // Mark as deleted in notes
    await updateRow(
      sheets,
      spreadsheetId,
      VENDOR_CONTACTS_SHEET,
      "Contact ID",
      contactId,
      {
        notes: `DELETED: ${new Date().toISOString()}`,
      },
      VENDOR_CONTACT_COLUMNS
    );

    return true;
  } catch (error) {
    throw new Error(
      `Failed to delete contact: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Set a contact as primary
 */
export async function setPrimaryContact(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  contactId: string
): Promise<VendorContact | null> {
  try {
    const contact = await readContact(sheets, spreadsheetId, contactId);

    if (!contact) {
      return null;
    }

    // First, unset all other primary contacts for this vendor
    const allContacts = await listContactsForVendor(
      sheets,
      spreadsheetId,
      contact.vendorId
    );

    for (const c of allContacts) {
      if (c.isPrimary && c.contactId !== contactId) {
        await updateRow(
          sheets,
          spreadsheetId,
          VENDOR_CONTACTS_SHEET,
          "Contact ID",
          c.contactId,
          { isPrimary: false },
          VENDOR_CONTACT_COLUMNS
        );
      }
    }

    // Set this contact as primary
    await updateRow(
      sheets,
      spreadsheetId,
      VENDOR_CONTACTS_SHEET,
      "Contact ID",
      contactId,
      { isPrimary: true },
      VENDOR_CONTACT_COLUMNS
    );

    return {
      ...contact,
      isPrimary: true,
    };
  } catch (error) {
    throw new Error(
      `Failed to set primary contact: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
