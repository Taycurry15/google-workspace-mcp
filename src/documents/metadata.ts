/**
 * Document Metadata Management
 *
 * Handles document registration, metadata updates, and tracking
 * in the Document Management Spreadsheet.
 */

import type { sheets_v4 } from "googleapis";
import type {
  Document,
  DocumentMetadata,
  DocumentSearchCriteria,
  DocumentSearchResult,
  CategorizationResult,
  DocumentStatus,
  DocumentType,
  ClassificationLevel,
  ProjectPhase,
} from "../types/document.js";
import {
  appendRows,
  readSheetRange,
  updateRow,
  findRowById,
  generateNextId,
} from "../utils/sheetHelpers.js";

const DOCUMENT_REGISTER_SHEET = "Document Register";

/**
 * Column mapping for Document Register sheet
 */
const COLUMN_MAP: Record<string, string> = {
  docId: "A",
  driveFileId: "B",
  title: "C",
  type: "D",
  category: "E",
  subcategory: "F",
  programId: "G",
  projectId: "H",
  deliverableId: "I",
  owner: "J",
  createdDate: "K",
  modifiedDate: "L",
  status: "M",
  version: "N",
  phase: "O",
  folderPath: "P",
  folderId: "Q",
  tags: "R",
  classification: "S",
  confidence: "T",
  description: "U",
};

/**
 * Register a new document in the tracking sheet
 * Returns the assigned document ID
 */
export async function registerDocument(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  document: Partial<Document> & {
    driveFileId: string;
    title: string;
    programId: string;
  }
): Promise<string> {
  try {
    // Generate document ID
    const docId = await generateNextId(
      sheets,
      spreadsheetId,
      DOCUMENT_REGISTER_SHEET,
      "Doc ID",
      "DOC"
    );

    // Prepare row data
    const row = [
      docId, // A
      document.driveFileId, // B
      document.title, // C
      document.type || "other", // D
      document.category || "Uncategorized", // E
      document.subcategory || "", // F
      document.programId, // G
      document.projectId || "", // H
      document.deliverableId || "", // I
      document.owner || "unknown@example.com", // J
      document.createdDate
        ? document.createdDate.toISOString()
        : new Date().toISOString(), // K
      document.modifiedDate
        ? document.modifiedDate.toISOString()
        : new Date().toISOString(), // L
      document.status || "draft", // M
      document.version || "1.0", // N
      document.phase || "", // O
      document.folderPath || "", // P
      document.folderId || "", // Q
      document.tags ? document.tags.join(", ") : "", // R
      document.classification || "internal", // S
      document.categorization?.confidence
        ? (document.categorization.confidence * 100).toFixed(1)
        : "", // T
      document.metadata?.description || "", // U
    ];

    // Append to sheet
    await appendRows(
      sheets,
      spreadsheetId,
      `${DOCUMENT_REGISTER_SHEET}!A:U`,
      [row]
    );

    return docId;
  } catch (error) {
    throw new Error(
      `Failed to register document: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Update document metadata
 */
export async function updateDocumentMetadata(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  docId: string,
  updates: Partial<Document>
): Promise<boolean> {
  try {
    const updateData: Record<string, any> = {};

    // Map updates to column letters
    if (updates.title) updateData.title = updates.title;
    if (updates.type) updateData.type = updates.type;
    if (updates.category) updateData.category = updates.category;
    if (updates.subcategory) updateData.subcategory = updates.subcategory;
    if (updates.owner) updateData.owner = updates.owner;
    if (updates.status) updateData.status = updates.status;
    if (updates.version) updateData.version = updates.version;
    if (updates.phase) updateData.phase = updates.phase;
    if (updates.folderPath) updateData.folderPath = updates.folderPath;
    if (updates.folderId) updateData.folderId = updates.folderId;
    if (updates.classification)
      updateData.classification = updates.classification;
    if (updates.tags) updateData.tags = updates.tags.join(", ");

    // Always update modified date
    updateData.modifiedDate = new Date().toISOString();

    const success = await updateRow(
      sheets,
      spreadsheetId,
      DOCUMENT_REGISTER_SHEET,
      "Doc ID",
      docId,
      updateData,
      COLUMN_MAP
    );

    return success;
  } catch (error) {
    throw new Error(
      `Failed to update document metadata: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get document by ID
 */
export async function getDocumentById(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  docId: string
): Promise<Document | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      DOCUMENT_REGISTER_SHEET,
      "Doc ID",
      docId
    );

    if (!result) {
      return null;
    }

    return parseDocumentRow(result.rowData);
  } catch (error) {
    throw new Error(
      `Failed to get document: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get document by Drive file ID
 */
export async function getDocumentByFileId(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  fileId: string
): Promise<Document | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      DOCUMENT_REGISTER_SHEET,
      "Drive File ID",
      fileId
    );

    if (!result) {
      return null;
    }

    return parseDocumentRow(result.rowData);
  } catch (error) {
    throw new Error(
      `Failed to get document by file ID: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Search documents by criteria
 */
export async function searchDocuments(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  criteria: DocumentSearchCriteria
): Promise<Document[]> {
  try {
    // Read all documents
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${DOCUMENT_REGISTER_SHEET}!A:U`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const documents: Document[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const doc = parseDocumentRow(row);

      if (matchesCriteria(doc, criteria)) {
        documents.push(doc);
      }
    }

    // Sort if specified
    if (criteria.sortBy) {
      documents.sort((a, b) => {
        let comparison = 0;

        switch (criteria.sortBy) {
          case "createdDate":
            comparison =
              a.createdDate.getTime() - b.createdDate.getTime();
            break;
          case "modifiedDate":
            comparison =
              a.modifiedDate.getTime() - b.modifiedDate.getTime();
            break;
          case "title":
            comparison = a.title.localeCompare(b.title);
            break;
          case "confidence":
            comparison =
              (a.categorization?.confidence || 0) -
              (b.categorization?.confidence || 0);
            break;
        }

        return criteria.sortOrder === "desc" ? -comparison : comparison;
      });
    }

    // Apply limit and offset
    const offset = criteria.offset || 0;
    const limit = criteria.limit || documents.length;

    return documents.slice(offset, offset + limit);
  } catch (error) {
    throw new Error(
      `Failed to search documents: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Parse a row from the sheet into a Document object
 */
function parseDocumentRow(row: any[]): Document {
  const tags =
    typeof row[17] === "string" && row[17]
      ? row[17].split(",").map((t: string) => t.trim())
      : [];

  return {
    docId: row[0] || "",
    driveFileId: row[1] || "",
    title: row[2] || "",
    type: (row[3] as DocumentType) || "other",
    category: row[4] || "Uncategorized",
    subcategory: row[5] || undefined,
    programId: row[6] || "",
    projectId: row[7] || undefined,
    deliverableId: row[8] || undefined,
    owner: row[9] || "unknown@example.com",
    createdDate: row[10] ? new Date(row[10]) : new Date(),
    modifiedDate: row[11] ? new Date(row[11]) : new Date(),
    status: (row[12] as DocumentStatus) || "draft",
    version: row[13] || "1.0",
    phase: (row[14] as ProjectPhase) || undefined,
    folderPath: row[15] || "",
    folderId: row[16] || "",
    tags,
    classification: (row[18] as ClassificationLevel) || "internal",
    metadata: {
      description: row[20] || undefined,
    },
    categorization: row[19]
      ? {
          documentType: row[3] as DocumentType,
          category: row[4] || "Uncategorized",
          subcategory: row[5],
          phase: row[14] as ProjectPhase | undefined,
          keywords: [],
          suggestedTags: tags,
          suggestedFolderPath: row[15] || "",
          confidence: parseFloat(row[19]) / 100 || 0,
          reasoning: "",
          timestamp: new Date(),
        }
      : undefined,
  };
}

/**
 * Check if document matches search criteria
 */
function matchesCriteria(
  doc: Document,
  criteria: DocumentSearchCriteria
): boolean {
  // Query (full-text search)
  if (criteria.query) {
    const query = criteria.query.toLowerCase();
    const searchText = [
      doc.title,
      doc.category,
      doc.subcategory,
      ...doc.tags,
    ]
      .join(" ")
      .toLowerCase();

    if (!searchText.includes(query)) {
      return false;
    }
  }

  // Document type filter
  if (criteria.documentType && criteria.documentType.length > 0) {
    if (!criteria.documentType.includes(doc.type)) {
      return false;
    }
  }

  // Program ID filter
  if (criteria.programId && doc.programId !== criteria.programId) {
    return false;
  }

  // Project ID filter
  if (criteria.projectId && doc.projectId !== criteria.projectId) {
    return false;
  }

  // Deliverable ID filter
  if (
    criteria.deliverableId &&
    doc.deliverableId !== criteria.deliverableId
  ) {
    return false;
  }

  // Owner filter
  if (criteria.owner && criteria.owner.length > 0) {
    if (!criteria.owner.includes(doc.owner)) {
      return false;
    }
  }

  // Status filter
  if (criteria.status && criteria.status.length > 0) {
    if (!criteria.status.includes(doc.status)) {
      return false;
    }
  }

  // Phase filter
  if (criteria.phase && criteria.phase.length > 0 && doc.phase) {
    if (!criteria.phase.includes(doc.phase)) {
      return false;
    }
  }

  // Tags filter
  if (criteria.tags && criteria.tags.length > 0) {
    const hasTags = criteria.tags.some((tag) => doc.tags.includes(tag));
    if (!hasTags) {
      return false;
    }
  }

  // Category filter
  if (criteria.category && criteria.category.length > 0) {
    if (!doc.category || !criteria.category.includes(doc.category)) {
      return false;
    }
  }

  // Classification filter
  if (
    criteria.classification &&
    criteria.classification.length > 0
  ) {
    if (!criteria.classification.includes(doc.classification)) {
      return false;
    }
  }

  // Date range filter
  if (criteria.dateRange) {
    const field =
      criteria.dateRange.field === "createdDate"
        ? doc.createdDate
        : doc.modifiedDate;

    if (criteria.dateRange.from && field < criteria.dateRange.from) {
      return false;
    }

    if (criteria.dateRange.to && field > criteria.dateRange.to) {
      return false;
    }
  }

  // Folder path filter
  if (criteria.folderPath && !doc.folderPath.includes(criteria.folderPath)) {
    return false;
  }

  // Min confidence filter
  if (
    criteria.minConfidence &&
    doc.categorization &&
    doc.categorization.confidence < criteria.minConfidence
  ) {
    return false;
  }

  return true;
}

/**
 * List all documents for a program
 */
export async function listDocumentsByProgram(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<Document[]> {
  return searchDocuments(sheets, spreadsheetId, { programId });
}

/**
 * List all documents for a deliverable
 */
export async function listDocumentsByDeliverable(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  deliverableId: string
): Promise<Document[]> {
  return searchDocuments(sheets, spreadsheetId, { deliverableId });
}

/**
 * Get document statistics
 */
export async function getDocumentStatistics(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId?: string
): Promise<{
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byPhase: Record<string, number>;
}> {
  try {
    const criteria: DocumentSearchCriteria = programId ? { programId } : {};
    const documents = await searchDocuments(sheets, spreadsheetId, criteria);

    const stats = {
      total: documents.length,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byPhase: {} as Record<string, number>,
    };

    for (const doc of documents) {
      // Count by type
      stats.byType[doc.type] = (stats.byType[doc.type] || 0) + 1;

      // Count by status
      stats.byStatus[doc.status] = (stats.byStatus[doc.status] || 0) + 1;

      // Count by phase
      if (doc.phase) {
        stats.byPhase[doc.phase] = (stats.byPhase[doc.phase] || 0) + 1;
      }
    }

    return stats;
  } catch (error) {
    throw new Error(
      `Failed to get document statistics: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
