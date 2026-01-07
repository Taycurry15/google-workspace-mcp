/**
 * Route Document Action
 *
 * Workflow action for routing documents to appropriate folders:
 * - Determine target folder based on document type and phase
 * - Create folder structure if missing
 * - Move/copy document to target location
 * - Update document register
 *
 * Phase 5 Implementation
 */

import type { ExecutionContext } from "../../types/workflows.js";
import type { DocumentActionConfig } from "../../types/workflows.js";
import { google } from "googleapis";

/**
 * Route Document Action Handler
 */
export async function routeDocumentAction(
  auth: any,
  config: DocumentActionConfig,
  context: ExecutionContext
): Promise<any> {
  const drive = google.drive({ version: "v3", auth });

  if (!config.fileId) {
    throw new Error("fileId is required for route_document action");
  }

  // Get file metadata
  const file = await drive.files.get({
    fileId: config.fileId,
    fields: "id,name,mimeType,parents",
  });

  const fileName = file.data.name || "Unknown";
  const currentParents = file.data.parents || [];

  // Determine target folder
  let targetFolderId = config.targetFolderId;

  if (!targetFolderId) {
    // Auto-determine folder based on document type and phase
    targetFolderId = await determineTargetFolder(
      auth,
      context,
      config
    );
  }

  // Create folder if missing
  if (config.createFolderIfMissing && targetFolderId) {
    await ensureFolderExists(auth, targetFolderId);
  }

  // Move or copy file
  if (config.operation === "move") {
    // Move file to target folder
    await drive.files.update({
      fileId: config.fileId,
      addParents: targetFolderId,
      removeParents: currentParents.join(","),
      fields: "id,parents",
    });
  } else if (config.operation === "copy") {
    // Copy file to target folder
    await drive.files.copy({
      fileId: config.fileId,
      requestBody: {
        name: fileName,
        parents: [targetFolderId!],
      },
    });
  }

  return {
    fileId: config.fileId,
    fileName,
    targetFolderId,
    operation: config.operation,
    success: true,
  };
}

/**
 * Determine target folder based on context
 */
async function determineTargetFolder(
  auth: any,
  context: ExecutionContext,
  config: DocumentActionConfig
): Promise<string | undefined> {
  const programId = context.programId;

  if (!programId) {
    throw new Error("programId is required in context for auto-routing");
  }

  // Build folder path based on document type and phase
  const folderPath = buildFolderPath(
    programId,
    config.operation || "route",
    context.variables?.phase || "execution"
  );

  // Find or create folder
  return findOrCreateFolder(auth, folderPath);
}

/**
 * Build folder path for document routing
 */
function buildFolderPath(
  programId: string,
  documentType: string,
  phase: string
): string {
  // Map phase to PMI folder structure
  const phaseFolder = mapPhaseToFolder(phase);

  // Build path based on document type
  switch (documentType) {
    case "deliverable":
      return `${programId}/${phaseFolder}/Deliverables`;
    case "report":
      return `${programId}/${phaseFolder}/Status Reports`;
    case "meeting_notes":
      return `${programId}/${phaseFolder}/Meetings`;
    case "charter":
      return `${programId}/01-Initiation/Charter`;
    case "plan":
      return `${programId}/02-Planning/Project Plans`;
    default:
      return `${programId}/${phaseFolder}`;
  }
}

/**
 * Map phase to PMI folder structure
 */
function mapPhaseToFolder(phase: string): string {
  const mapping: Record<string, string> = {
    initiation: "01-Initiation",
    planning: "02-Planning",
    execution: "03-Execution",
    monitoring: "04-Monitoring-Control",
    closing: "05-Closing",
    support: "06-Support",
  };

  return mapping[phase.toLowerCase()] || "03-Execution";
}

/**
 * Find or create folder by path
 */
async function findOrCreateFolder(
  auth: any,
  folderPath: string
): Promise<string> {
  const drive = google.drive({ version: "v3", auth });
  const parts = folderPath.split("/");
  let parentId = "root";

  // Traverse/create folder hierarchy
  for (const folderName of parts) {
    // Search for folder
    const query = `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

    const response = await drive.files.list({
      q: query,
      fields: "files(id, name)",
      spaces: "drive",
    });

    if (response.data.files && response.data.files.length > 0) {
      // Folder exists
      parentId = response.data.files[0].id!;
    } else {
      // Create folder
      const folder = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId],
        },
        fields: "id",
      });

      parentId = folder.data.id!;
    }
  }

  return parentId;
}

/**
 * Ensure folder exists
 */
async function ensureFolderExists(auth: any, folderId: string): Promise<void> {
  const drive = google.drive({ version: "v3", auth });

  try {
    await drive.files.get({
      fileId: folderId,
      fields: "id",
    });
  } catch (error: any) {
    if (error.code === 404) {
      throw new Error(`Folder ${folderId} does not exist`);
    }
    throw error;
  }
}

/**
 * Action metadata for registration
 */
export const actionMetadata = {
  type: "route_document",
  name: "Route Document",
  description: "Route document to appropriate folder based on type and phase",
  handler: routeDocumentAction,
};
