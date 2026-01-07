/**
 * Google Drive Helper Utilities
 *
 * Provides utilities for:
 * - Binary file handling
 * - Folder operations and hierarchy management
 * - Document content extraction
 * - File metadata operations
 */

import type { drive_v3 } from "googleapis";

/**
 * Convert base64 string to Buffer for upload
 */
export function base64ToBuffer(base64: string): Buffer {
  // Remove any whitespace and data URL prefix if present
  const cleanBase64 = base64.replace(/\s/g, "").replace(/^data:[^;]+;base64,/, "");
  return Buffer.from(cleanBase64, "base64");
}

/**
 * Convert Buffer to base64 string for download
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

/**
 * Determine if a MIME type represents binary content
 */
export function isBinaryMimeType(mimeType: string): boolean {
  const textMimeTypes = [
    "text/",
    "application/json",
    "application/xml",
    "application/javascript",
    "application/x-javascript",
    "application/ecmascript",
  ];

  // Check if it starts with any text MIME type
  const isText = textMimeTypes.some((prefix) => mimeType.toLowerCase().startsWith(prefix));

  // If it's text, return false (not binary)
  // Otherwise, return true (is binary)
  return !isText;
}

// ============================================================================
// FOLDER OPERATIONS
// ============================================================================

/**
 * Create a folder in Google Drive
 */
export async function createFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string
): Promise<string> {
  try {
    const fileMetadata: drive_v3.Schema$File = {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });

    if (!response.data.id) {
      throw new Error("Failed to get folder ID");
    }

    return response.data.id;
  } catch (error) {
    throw new Error(
      `Failed to create folder ${name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create a hierarchical folder structure
 */
export async function createFolderHierarchy(
  drive: drive_v3.Drive,
  folderPath: string,
  rootParentId?: string
): Promise<{ folderId: string; folderMap: Record<string, string> }> {
  try {
    const parts = folderPath.split("/").filter((p) => p.length > 0);
    const folderMap: Record<string, string> = {};
    let currentParentId = rootParentId;
    let currentPath = "";

    for (const folderName of parts) {
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

      // Check if folder already exists
      const existingId = await findFolderByName(
        drive,
        folderName,
        currentParentId
      );

      if (existingId) {
        folderMap[currentPath] = existingId;
        currentParentId = existingId;
      } else {
        const folderId = await createFolder(drive, folderName, currentParentId);
        folderMap[currentPath] = folderId;
        currentParentId = folderId;
      }
    }

    return {
      folderId: currentParentId!,
      folderMap,
    };
  } catch (error) {
    throw new Error(
      `Failed to create folder hierarchy: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Find a folder by name within a parent
 */
export async function findFolderByName(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string
): Promise<string | null> {
  try {
    let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const response = await drive.files.list({
      q: query,
      fields: "files(id, name)",
      pageSize: 1,
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id || null;
    }

    return null;
  } catch (error) {
    throw new Error(
      `Failed to find folder: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Move a file to a folder
 */
export async function moveToFolder(
  drive: drive_v3.Drive,
  fileId: string,
  targetFolderId: string
): Promise<void> {
  try {
    // Get current parents
    const file = await drive.files.get({
      fileId,
      fields: "parents",
    });

    const previousParents = file.data.parents?.join(",") || "";

    // Move the file
    await drive.files.update({
      fileId,
      addParents: targetFolderId,
      removeParents: previousParents,
      fields: "id, parents",
    });
  } catch (error) {
    throw new Error(
      `Failed to move file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Copy a file to a folder
 */
export async function copyToFolder(
  drive: drive_v3.Drive,
  fileId: string,
  targetFolderId: string,
  newName?: string
): Promise<string> {
  try {
    const requestBody: drive_v3.Schema$File = {
      parents: [targetFolderId],
    };

    if (newName) {
      requestBody.name = newName;
    }

    const response = await drive.files.copy({
      fileId,
      requestBody,
      fields: "id",
    });

    if (!response.data.id) {
      throw new Error("Failed to get copied file ID");
    }

    return response.data.id;
  } catch (error) {
    throw new Error(
      `Failed to copy file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get the full folder path for a file
 */
export async function getFolderPath(
  drive: drive_v3.Drive,
  fileId: string,
  rootFolderId?: string
): Promise<string> {
  try {
    const pathParts: string[] = [];
    let currentId = fileId;

    while (currentId && currentId !== rootFolderId) {
      const file = await drive.files.get({
        fileId: currentId,
        fields: "name, parents",
      });

      if (file.data.name && currentId !== fileId) {
        pathParts.unshift(file.data.name);
      }

      // Move to parent
      if (file.data.parents && file.data.parents.length > 0) {
        currentId = file.data.parents[0];
      } else {
        break;
      }

      // Safety: prevent infinite loops
      if (pathParts.length > 20) {
        break;
      }
    }

    return pathParts.join("/");
  } catch (error) {
    throw new Error(
      `Failed to get folder path: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Ensure a folder exists, creating it if necessary
 */
export async function ensureFolderExists(
  drive: drive_v3.Drive,
  folderPath: string,
  rootParentId?: string
): Promise<string> {
  try {
    const parts = folderPath.split("/").filter((p) => p.length > 0);
    let currentParentId = rootParentId;

    for (const folderName of parts) {
      const existingId = await findFolderByName(
        drive,
        folderName,
        currentParentId
      );

      if (existingId) {
        currentParentId = existingId;
      } else {
        currentParentId = await createFolder(drive, folderName, currentParentId);
      }
    }

    return currentParentId!;
  } catch (error) {
    throw new Error(
      `Failed to ensure folder exists: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ============================================================================
// DOCUMENT CONTENT EXTRACTION
// ============================================================================

/**
 * Extract text content from a Google Drive file
 * Supports: Google Docs, plain text, and exported formats
 */
export async function extractDocumentContent(
  drive: drive_v3.Drive,
  fileId: string
): Promise<{ content: string; mimeType: string }> {
  try {
    // Get file metadata
    const file = await drive.files.get({
      fileId,
      fields: "mimeType, name",
    });

    const mimeType = file.data.mimeType || "application/octet-stream";

    let content = "";

    // Handle Google Docs
    if (mimeType === "application/vnd.google-apps.document") {
      const response = await drive.files.export({
        fileId,
        mimeType: "text/plain",
      });
      content = response.data as string;
    }
    // Handle plain text
    else if (mimeType.startsWith("text/")) {
      const response = await drive.files.get({
        fileId,
        alt: "media",
      });
      content = response.data as string;
    }
    // Handle PDF (note: requires external library for full extraction)
    else if (mimeType === "application/pdf") {
      // For now, return a placeholder
      // Full PDF extraction would require pdf-parse or similar
      content = "[PDF content extraction requires additional processing]";
    }
    // Handle other Google Workspace files
    else if (mimeType.startsWith("application/vnd.google-apps.")) {
      // Try to export as plain text
      try {
        const response = await drive.files.export({
          fileId,
          mimeType: "text/plain",
        });
        content = response.data as string;
      } catch (exportError) {
        content = `[Content extraction not supported for ${mimeType}]`;
      }
    }
    // Binary files
    else {
      content = `[Binary file: ${mimeType}]`;
    }

    return { content, mimeType };
  } catch (error) {
    throw new Error(
      `Failed to extract document content: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get file metadata including size, dates, etc.
 */
export async function getFileMetadata(
  drive: drive_v3.Drive,
  fileId: string
): Promise<{
  name: string;
  mimeType: string;
  size?: number;
  createdTime?: string;
  modifiedTime?: string;
  owners?: Array<{ emailAddress?: string; displayName?: string }>;
}> {
  try {
    const response = await drive.files.get({
      fileId,
      fields: "name, mimeType, size, createdTime, modifiedTime, owners",
    });

    return {
      name: response.data.name || "Unknown",
      mimeType: response.data.mimeType || "application/octet-stream",
      size: response.data.size ? parseInt(response.data.size, 10) : undefined,
      createdTime: response.data.createdTime || undefined,
      modifiedTime: response.data.modifiedTime || undefined,
      owners: response.data.owners?.map((owner) => ({
        emailAddress: owner.emailAddress || undefined,
        displayName: owner.displayName || undefined,
      })),
    };
  } catch (error) {
    throw new Error(
      `Failed to get file metadata: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List files in a folder
 */
export async function listFilesInFolder(
  drive: drive_v3.Drive,
  folderId: string,
  pageSize: number = 100
): Promise<Array<{ id: string; name: string; mimeType: string }>> {
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id, name, mimeType)",
      pageSize,
    });

    return (
      response.data.files?.map((file) => ({
        id: file.id || "",
        name: file.name || "",
        mimeType: file.mimeType || "",
      })) || []
    );
  } catch (error) {
    throw new Error(
      `Failed to list files in folder: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
