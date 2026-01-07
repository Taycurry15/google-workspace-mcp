/**
 * Document Routing System
 *
 * Automatically routes documents to appropriate folders based on:
 * - LLM categorization results
 * - Document type and phase
 * - Program/project/deliverable associations
 * - Custom routing rules
 *
 * PRIORITY #1: Automated document routing
 */

import type { drive_v3, sheets_v4 } from "googleapis";
import type {
  DocumentRoutingRequest,
  DocumentRoutingResult,
  NotificationSent,
  CategorizationResult,
  DocumentType,
  ProjectPhase,
} from "../types/document.js";
import { categorizeDocument } from "./categorizer.js";
import {
  findFolderIdByPath,
  getTargetFolderPath,
  createDeliverableFolderStructure,
} from "./folder-structure.js";
import { moveToFolder, getFileMetadata } from "../utils/driveHelpers.js";
import { registerDocument } from "./metadata.js";

/**
 * Route a document to the appropriate folder
 *
 * This is the main entry point for document routing.
 * It orchestrates:
 * 1. Document categorization (LLM)
 * 2. Folder path determination
 * 3. File movement to target folder
 * 4. Metadata registration
 * 5. Notification triggering
 */
export async function routeDocument(
  drive: drive_v3.Drive,
  sheets: sheets_v4.Sheets,
  request: DocumentRoutingRequest,
  documentSpreadsheetId: string,
  programRootFolderId: string
): Promise<DocumentRoutingResult> {
  try {
    const {
      fileId,
      programId,
      documentType,
      deliverableId,
      phase,
      autoRoute,
      forceCategorize,
    } = request;

    // Get file metadata
    const fileMetadata = await getFileMetadata(drive, fileId);

    // Step 1: Categorize document (if autoRoute or forceCategorize)
    let categorization: CategorizationResult;

    if (autoRoute || forceCategorize) {
      categorization = await categorizeDocument(
        drive,
        fileId,
        fileMetadata.name,
        documentType
      );
    } else {
      // Use manual categorization
      categorization = {
        documentType: documentType || "other",
        category: "Manual",
        keywords: [],
        suggestedTags: [],
        suggestedFolderPath: "",
        confidence: 1.0,
        reasoning: "Manually specified",
        timestamp: new Date(),
      };

      if (phase) {
        categorization.phase = phase;
      }
    }

    // Step 2: Determine target folder
    const { folderPath, folderId } = await determineTargetFolder(
      drive,
      programRootFolderId,
      categorization,
      deliverableId,
      programId
    );

    categorization.suggestedFolderPath = folderPath;

    // Step 3: Move file to folder (if autoRoute)
    let moved = false;
    if (autoRoute) {
      await moveToFolder(drive, fileId, folderId);
      moved = true;
    }

    // Step 4: Register document in tracking sheet
    const docId = await registerDocument(
      sheets,
      documentSpreadsheetId,
      {
        driveFileId: fileId,
        title: fileMetadata.name,
        type: categorization.documentType,
        category: categorization.category,
        subcategory: categorization.subcategory,
        programId,
        deliverableId,
        owner:
          fileMetadata.owners?.[0]?.emailAddress ||
          "unknown@example.com",
        createdDate: new Date(fileMetadata.createdTime || Date.now()),
        modifiedDate: new Date(fileMetadata.modifiedTime || Date.now()),
        status: "draft",
        version: "1.0",
        phase: categorization.phase,
        folderPath,
        folderId,
        tags: categorization.suggestedTags,
        classification: "internal",
        categorization,
      }
    );

    // Step 5: Send notifications (if configured)
    const notifications: NotificationSent[] = [];
    // Notification logic would go here (email, calendar, etc.)

    return {
      docId,
      driveFileId: fileId,
      categorization,
      folderPath,
      folderId,
      moved,
      registered: true,
      notifications,
    };
  } catch (error) {
    throw new Error(
      `Failed to route document: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Determine target folder for a document
 */
async function determineTargetFolder(
  drive: drive_v3.Drive,
  programRootFolderId: string,
  categorization: CategorizationResult,
  deliverableId?: string,
  programId?: string
): Promise<{ folderPath: string; folderId: string }> {
  // Special case: Deliverable documents
  if (
    categorization.documentType === "deliverable" &&
    deliverableId &&
    programId
  ) {
    // Create deliverable folder structure if needed
    const deliverableFolders = await createDeliverableFolderStructure(
      drive,
      programRootFolderId,
      deliverableId,
      deliverableId // Using ID as name for now; could be enhanced
    );

    // Default to draft folder
    return {
      folderPath: `03-Execution/Deliverables/${deliverableId}/Draft`,
      folderId: deliverableFolders.draftFolderId,
    };
  }

  // Get suggested folder path from categorization
  let folderPath =
    categorization.suggestedFolderPath ||
    getTargetFolderPath(categorization.documentType, categorization.phase);

  // Find folder ID by path
  let folderId = await findFolderIdByPath(
    drive,
    programRootFolderId,
    folderPath
  );

  // If folder doesn't exist, fall back to root or a default folder
  if (!folderId) {
    console.warn(`Folder not found: ${folderPath}, using program root`);
    folderPath = "Program Root";
    folderId = programRootFolderId;
  }

  return { folderPath, folderId };
}

/**
 * Route deliverable document to specific phase folder
 * (Draft, Review, or Final)
 */
export async function routeDeliverableDocument(
  drive: drive_v3.Drive,
  sheets: sheets_v4.Sheets,
  documentSpreadsheetId: string,
  programRootFolderId: string,
  programId: string,
  fileId: string,
  deliverableId: string,
  deliverableName: string,
  phase: "draft" | "review" | "final"
): Promise<string> {
  try {
    // Create/find deliverable folder structure
    const folders = await createDeliverableFolderStructure(
      drive,
      programRootFolderId,
      deliverableId,
      deliverableName
    );

    // Determine target folder based on phase
    const targetFolderId =
      phase === "draft"
        ? folders.draftFolderId
        : phase === "review"
          ? folders.reviewFolderId
          : folders.finalFolderId;

    const folderPath = `03-Execution/Deliverables/${deliverableId}/${
      phase.charAt(0).toUpperCase() + phase.slice(1)
    }`;

    // Move file
    await moveToFolder(drive, fileId, targetFolderId);

    // Register in tracking sheet
    const fileMetadata = await getFileMetadata(drive, fileId);
    await registerDocument(sheets, documentSpreadsheetId, {
      driveFileId: fileId,
      title: fileMetadata.name,
      type: "deliverable",
      category: "Deliverable",
      programId,
      deliverableId,
      owner:
        fileMetadata.owners?.[0]?.emailAddress || "unknown@example.com",
      createdDate: new Date(fileMetadata.createdTime || Date.now()),
      modifiedDate: new Date(fileMetadata.modifiedTime || Date.now()),
      status: phase === "final" ? "final" : "review",
      version: "1.0",
      phase: "execution",
      folderPath,
      folderId: targetFolderId,
      tags: [deliverableId, phase],
      classification: "internal",
    });

    return targetFolderId;
  } catch (error) {
    throw new Error(
      `Failed to route deliverable document: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Batch route multiple documents
 */
export async function routeDocumentsBatch(
  drive: drive_v3.Drive,
  sheets: sheets_v4.Sheets,
  requests: DocumentRoutingRequest[],
  documentSpreadsheetId: string,
  programRootFolderId: string
): Promise<Map<string, DocumentRoutingResult>> {
  const results = new Map<string, DocumentRoutingResult>();

  // Process with concurrency limit
  const BATCH_SIZE = 3;
  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    const batch = requests.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (request) => {
      try {
        const result = await routeDocument(
          drive,
          sheets,
          request,
          documentSpreadsheetId,
          programRootFolderId
        );
        return { fileId: request.fileId, result };
      } catch (error) {
        console.error(`Failed to route ${request.fileId}:`, error);
        return null;
      }
    });

    const batchResults = await Promise.all(promises);
    for (const item of batchResults) {
      if (item) {
        results.set(item.fileId, item.result);
      }
    }
  }

  return results;
}

/**
 * Preview routing without actually moving files
 * Useful for showing users where documents will go
 */
export async function previewRouting(
  drive: drive_v3.Drive,
  fileId: string,
  programRootFolderId: string,
  documentType?: DocumentType,
  phase?: ProjectPhase,
  deliverableId?: string
): Promise<{
  categorization: CategorizationResult;
  targetFolderPath: string;
  confidence: number;
}> {
  try {
    // Get file metadata
    const fileMetadata = await getFileMetadata(drive, fileId);

    // Categorize
    const categorization = await categorizeDocument(
      drive,
      fileId,
      fileMetadata.name,
      documentType
    );

    // Determine target folder
    const targetFolderPath = getTargetFolderPath(
      categorization.documentType,
      categorization.phase || phase,
      deliverableId
    );

    return {
      categorization,
      targetFolderPath,
      confidence: categorization.confidence,
    };
  } catch (error) {
    throw new Error(
      `Failed to preview routing: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
