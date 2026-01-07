/**
 * Unit Tests for Google Drive Helper Utilities
 *
 * Tests the driveHelpers module which provides utilities for:
 * - Binary file handling (base64 conversions)
 * - Folder operations and hierarchy management
 * - Document content extraction
 * - File metadata operations
 *
 * Test Coverage:
 * - Pure function tests (base64 conversions, MIME type detection)
 * - Async function tests with mock Google Drive API
 * - Error handling
 * - Edge cases
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import type { drive_v3 } from "googleapis";
import {
  base64ToBuffer,
  bufferToBase64,
  isBinaryMimeType,
  createFolder,
  createFolderHierarchy,
  findFolderByName,
  moveToFolder,
  copyToFolder,
  getFolderPath,
  ensureFolderExists,
  extractDocumentContent,
  getFileMetadata,
  listFilesInFolder,
} from "../../src/utils/driveHelpers.js";

// ============================================================================
// Mock Setup
// ============================================================================

const TEST_FILE_ID = "test-file-123";
const TEST_FOLDER_ID = "test-folder-456";

/**
 * Create a mock Google Drive API client
 */
function createMockDriveClient(): drive_v3.Drive {
  return {
    files: {
      create: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
      copy: jest.fn(),
      export: jest.fn(),
    } as any,
  } as drive_v3.Drive;
}

let mockDrive: drive_v3.Drive;

beforeEach(() => {
  mockDrive = createMockDriveClient();
  jest.clearAllMocks();
});

// ============================================================================
// Pure Function Tests - Base64 Conversions
// ============================================================================

describe("base64ToBuffer", () => {
  it("should convert base64 string to Buffer", () => {
    const base64 = "SGVsbG8gV29ybGQ="; // "Hello World"
    const buffer = base64ToBuffer(base64);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.toString("utf-8")).toBe("Hello World");
  });

  it("should handle base64 with whitespace", () => {
    const base64 = "SGVs bG8g V29y bGQ="; // With spaces
    const buffer = base64ToBuffer(base64);

    expect(buffer.toString("utf-8")).toBe("Hello World");
  });

  it("should handle data URL prefix", () => {
    const base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA";
    const buffer = base64ToBuffer(base64);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should handle empty base64 string", () => {
    const buffer = base64ToBuffer("");

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBe(0);
  });
});

describe("bufferToBase64", () => {
  it("should convert Buffer to base64 string", () => {
    const buffer = Buffer.from("Hello World", "utf-8");
    const base64 = bufferToBase64(buffer);

    expect(base64).toBe("SGVsbG8gV29ybGQ=");
  });

  it("should convert empty Buffer", () => {
    const buffer = Buffer.from("", "utf-8");
    const base64 = bufferToBase64(buffer);

    expect(base64).toBe("");
  });

  it("should be inverse of base64ToBuffer", () => {
    const originalText = "The quick brown fox jumps over the lazy dog";
    const buffer = Buffer.from(originalText, "utf-8");
    const base64 = bufferToBase64(buffer);
    const decodedBuffer = base64ToBuffer(base64);

    expect(decodedBuffer.toString("utf-8")).toBe(originalText);
  });
});

// ============================================================================
// Pure Function Tests - MIME Type Detection
// ============================================================================

describe("isBinaryMimeType", () => {
  it("should return false for text MIME types", () => {
    expect(isBinaryMimeType("text/plain")).toBe(false);
    expect(isBinaryMimeType("text/html")).toBe(false);
    expect(isBinaryMimeType("text/css")).toBe(false);
    expect(isBinaryMimeType("text/javascript")).toBe(false);
  });

  it("should return false for JSON and XML", () => {
    expect(isBinaryMimeType("application/json")).toBe(false);
    expect(isBinaryMimeType("application/xml")).toBe(false);
  });

  it("should return false for JavaScript MIME types", () => {
    expect(isBinaryMimeType("application/javascript")).toBe(false);
    expect(isBinaryMimeType("application/x-javascript")).toBe(false);
    expect(isBinaryMimeType("application/ecmascript")).toBe(false);
  });

  it("should return true for binary MIME types", () => {
    expect(isBinaryMimeType("image/png")).toBe(true);
    expect(isBinaryMimeType("image/jpeg")).toBe(true);
    expect(isBinaryMimeType("application/pdf")).toBe(true);
    expect(isBinaryMimeType("application/octet-stream")).toBe(true);
    expect(isBinaryMimeType("video/mp4")).toBe(true);
    expect(isBinaryMimeType("audio/mpeg")).toBe(true);
  });

  it("should be case-insensitive", () => {
    expect(isBinaryMimeType("TEXT/PLAIN")).toBe(false);
    expect(isBinaryMimeType("IMAGE/PNG")).toBe(true);
  });
});

// ============================================================================
// Folder Creation Operations
// ============================================================================

describe("createFolder", () => {
  it("should create a folder without parent", async () => {
    (mockDrive.files.create as jest.Mock).mockResolvedValueOnce({
      data: { id: "new-folder-123" },
    });

    const folderId = await createFolder(mockDrive, "My Folder");

    expect(folderId).toBe("new-folder-123");
    expect(mockDrive.files.create).toHaveBeenCalledWith({
      requestBody: {
        name: "My Folder",
        mimeType: "application/vnd.google-apps.folder",
        parents: undefined,
      },
      fields: "id",
    });
  });

  it("should create a folder with parent", async () => {
    (mockDrive.files.create as jest.Mock).mockResolvedValueOnce({
      data: { id: "child-folder-456" },
    });

    const folderId = await createFolder(mockDrive, "Child Folder", "parent-123");

    expect(folderId).toBe("child-folder-456");
    const call = (mockDrive.files.create as jest.Mock).mock.calls[0][0];
    expect(call.requestBody.parents).toEqual(["parent-123"]);
  });

  it("should throw error if folder ID not returned", async () => {
    (mockDrive.files.create as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    await expect(createFolder(mockDrive, "Test")).rejects.toThrow(
      "Failed to get folder ID"
    );
  });

  it("should throw error on API failure", async () => {
    (mockDrive.files.create as jest.Mock).mockRejectedValueOnce(
      new Error("API Error")
    );

    await expect(createFolder(mockDrive, "Test")).rejects.toThrow(
      "Failed to create folder Test: API Error"
    );
  });
});

describe("findFolderByName", () => {
  it("should find folder by name", async () => {
    (mockDrive.files.list as jest.Mock).mockResolvedValueOnce({
      data: {
        files: [{ id: "found-folder-789", name: "Found Folder" }],
      },
    });

    const folderId = await findFolderByName(mockDrive, "Found Folder");

    expect(folderId).toBe("found-folder-789");
    expect(mockDrive.files.list).toHaveBeenCalledWith({
      q: "name='Found Folder' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: "files(id, name)",
      pageSize: 1,
    });
  });

  it("should find folder by name with parent", async () => {
    (mockDrive.files.list as jest.Mock).mockResolvedValueOnce({
      data: {
        files: [{ id: "child-folder-999", name: "Child" }],
      },
    });

    const folderId = await findFolderByName(mockDrive, "Child", "parent-123");

    expect(folderId).toBe("child-folder-999");
    const call = (mockDrive.files.list as jest.Mock).mock.calls[0][0];
    expect(call.q).toContain("'parent-123' in parents");
  });

  it("should return null if folder not found", async () => {
    (mockDrive.files.list as jest.Mock).mockResolvedValueOnce({
      data: {
        files: [],
      },
    });

    const folderId = await findFolderByName(mockDrive, "NonExistent");

    expect(folderId).toBeNull();
  });

  it("should return null if files array is undefined", async () => {
    (mockDrive.files.list as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    const folderId = await findFolderByName(mockDrive, "Test");

    expect(folderId).toBeNull();
  });
});

describe("createFolderHierarchy", () => {
  it("should create a multi-level folder hierarchy", async () => {
    // Mock findFolderByName to return null (folders don't exist)
    (mockDrive.files.list as jest.Mock).mockResolvedValue({
      data: { files: [] },
    });

    // Mock createFolder for each level
    (mockDrive.files.create as jest.Mock)
      .mockResolvedValueOnce({ data: { id: "level1-id" } })
      .mockResolvedValueOnce({ data: { id: "level2-id" } })
      .mockResolvedValueOnce({ data: { id: "level3-id" } });

    const result = await createFolderHierarchy(
      mockDrive,
      "Level1/Level2/Level3"
    );

    expect(result.folderId).toBe("level3-id");
    expect(result.folderMap).toEqual({
      Level1: "level1-id",
      "Level1/Level2": "level2-id",
      "Level1/Level2/Level3": "level3-id",
    });
    expect(mockDrive.files.create).toHaveBeenCalledTimes(3);
  });

  it("should reuse existing folders in hierarchy", async () => {
    // Mock findFolderByName: Level1 exists, others don't
    (mockDrive.files.list as jest.Mock)
      .mockResolvedValueOnce({
        data: { files: [{ id: "existing-level1" }] },
      })
      .mockResolvedValue({ data: { files: [] } });

    // Mock createFolder for non-existing levels
    (mockDrive.files.create as jest.Mock)
      .mockResolvedValueOnce({ data: { id: "new-level2" } })
      .mockResolvedValueOnce({ data: { id: "new-level3" } });

    const result = await createFolderHierarchy(
      mockDrive,
      "Level1/Level2/Level3"
    );

    expect(result.folderId).toBe("new-level3");
    expect(result.folderMap).toEqual({
      Level1: "existing-level1",
      "Level1/Level2": "new-level2",
      "Level1/Level2/Level3": "new-level3",
    });
    expect(mockDrive.files.create).toHaveBeenCalledTimes(2); // Only created 2
  });

  it("should handle single folder path", async () => {
    (mockDrive.files.list as jest.Mock).mockResolvedValueOnce({
      data: { files: [] },
    });

    (mockDrive.files.create as jest.Mock).mockResolvedValueOnce({
      data: { id: "single-folder" },
    });

    const result = await createFolderHierarchy(mockDrive, "SingleFolder");

    expect(result.folderId).toBe("single-folder");
    expect(result.folderMap).toEqual({
      SingleFolder: "single-folder",
    });
  });

  it("should handle paths with leading/trailing slashes", async () => {
    (mockDrive.files.list as jest.Mock).mockResolvedValue({
      data: { files: [] },
    });

    (mockDrive.files.create as jest.Mock)
      .mockResolvedValueOnce({ data: { id: "folder1" } })
      .mockResolvedValueOnce({ data: { id: "folder2" } });

    const result = await createFolderHierarchy(mockDrive, "/Folder1/Folder2/");

    expect(Object.keys(result.folderMap)).toHaveLength(2);
    expect(result.folderId).toBe("folder2");
  });
});

describe("ensureFolderExists", () => {
  it("should return existing folder ID if it exists", async () => {
    (mockDrive.files.list as jest.Mock).mockResolvedValueOnce({
      data: { files: [{ id: "existing-folder" }] },
    });

    const folderId = await ensureFolderExists(mockDrive, "ExistingFolder");

    expect(folderId).toBe("existing-folder");
    expect(mockDrive.files.create).not.toHaveBeenCalled();
  });

  it("should create folder if it doesn't exist", async () => {
    (mockDrive.files.list as jest.Mock).mockResolvedValueOnce({
      data: { files: [] },
    });

    (mockDrive.files.create as jest.Mock).mockResolvedValueOnce({
      data: { id: "new-folder" },
    });

    const folderId = await ensureFolderExists(mockDrive, "NewFolder");

    expect(folderId).toBe("new-folder");
    expect(mockDrive.files.create).toHaveBeenCalledTimes(1);
  });

  it("should handle multi-level paths with mixed existence", async () => {
    // Level1 exists, Level2 doesn't
    (mockDrive.files.list as jest.Mock)
      .mockResolvedValueOnce({ data: { files: [{ id: "level1-exists" }] } })
      .mockResolvedValueOnce({ data: { files: [] } });

    (mockDrive.files.create as jest.Mock).mockResolvedValueOnce({
      data: { id: "level2-created" },
    });

    const folderId = await ensureFolderExists(mockDrive, "Level1/Level2");

    expect(folderId).toBe("level2-created");
    expect(mockDrive.files.create).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// File Move/Copy Operations
// ============================================================================

describe("moveToFolder", () => {
  it("should move file to target folder", async () => {
    (mockDrive.files.get as jest.Mock).mockResolvedValueOnce({
      data: { parents: ["old-parent-1", "old-parent-2"] },
    });

    (mockDrive.files.update as jest.Mock).mockResolvedValueOnce({
      data: { id: TEST_FILE_ID },
    });

    await moveToFolder(mockDrive, TEST_FILE_ID, "new-parent");

    expect(mockDrive.files.update).toHaveBeenCalledWith({
      fileId: TEST_FILE_ID,
      addParents: "new-parent",
      removeParents: "old-parent-1,old-parent-2",
      fields: "id, parents",
    });
  });

  it("should handle file with no previous parents", async () => {
    (mockDrive.files.get as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    (mockDrive.files.update as jest.Mock).mockResolvedValueOnce({
      data: { id: TEST_FILE_ID },
    });

    await moveToFolder(mockDrive, TEST_FILE_ID, "new-parent");

    const call = (mockDrive.files.update as jest.Mock).mock.calls[0][0];
    expect(call.removeParents).toBe("");
  });

  it("should throw error on API failure", async () => {
    (mockDrive.files.get as jest.Mock).mockRejectedValueOnce(
      new Error("Get failed")
    );

    await expect(
      moveToFolder(mockDrive, TEST_FILE_ID, "target")
    ).rejects.toThrow("Failed to move file: Get failed");
  });
});

describe("copyToFolder", () => {
  it("should copy file to target folder", async () => {
    (mockDrive.files.copy as jest.Mock).mockResolvedValueOnce({
      data: { id: "copied-file-id" },
    });

    const copiedId = await copyToFolder(mockDrive, TEST_FILE_ID, TEST_FOLDER_ID);

    expect(copiedId).toBe("copied-file-id");
    expect(mockDrive.files.copy).toHaveBeenCalledWith({
      fileId: TEST_FILE_ID,
      requestBody: {
        parents: [TEST_FOLDER_ID],
      },
      fields: "id",
    });
  });

  it("should copy file with new name", async () => {
    (mockDrive.files.copy as jest.Mock).mockResolvedValueOnce({
      data: { id: "copied-renamed-id" },
    });

    const copiedId = await copyToFolder(
      mockDrive,
      TEST_FILE_ID,
      TEST_FOLDER_ID,
      "New Name.pdf"
    );

    expect(copiedId).toBe("copied-renamed-id");
    const call = (mockDrive.files.copy as jest.Mock).mock.calls[0][0];
    expect(call.requestBody.name).toBe("New Name.pdf");
  });

  it("should throw error if copied file ID not returned", async () => {
    (mockDrive.files.copy as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    await expect(
      copyToFolder(mockDrive, TEST_FILE_ID, TEST_FOLDER_ID)
    ).rejects.toThrow("Failed to get copied file ID");
  });
});

// ============================================================================
// Path and Metadata Operations
// ============================================================================

describe("getFolderPath", () => {
  it("should get folder path for file", async () => {
    (mockDrive.files.get as jest.Mock)
      .mockResolvedValueOnce({
        data: { name: "file.pdf", parents: ["level2-id"] },
      })
      .mockResolvedValueOnce({
        data: { name: "Level2", parents: ["level1-id"] },
      })
      .mockResolvedValueOnce({
        data: { name: "Level1", parents: [] },
      });

    const path = await getFolderPath(mockDrive, TEST_FILE_ID);

    expect(path).toBe("Level1/Level2");
  });

  it("should stop at root folder if specified", async () => {
    (mockDrive.files.get as jest.Mock)
      .mockResolvedValueOnce({
        data: { name: "file.pdf", parents: ["level2-id"] },
      })
      .mockResolvedValueOnce({
        data: { name: "Level2", parents: ["root-id"] },
      });

    const path = await getFolderPath(mockDrive, TEST_FILE_ID, "root-id");

    expect(path).toBe("Level2");
  });

  it("should handle file at root with no parents", async () => {
    (mockDrive.files.get as jest.Mock).mockResolvedValueOnce({
      data: { name: "file.pdf", parents: [] },
    });

    const path = await getFolderPath(mockDrive, TEST_FILE_ID);

    expect(path).toBe("");
  });

  it("should prevent infinite loops with depth limit", async () => {
    (mockDrive.files.get as jest.Mock).mockResolvedValue({
      data: { name: "Folder", parents: ["circular-parent"] },
    });

    const path = await getFolderPath(mockDrive, TEST_FILE_ID);

    expect(mockDrive.files.get).toHaveBeenCalled();
    expect(path).toBeTruthy(); // Should return some path
  });
});

// ============================================================================
// Document Content Extraction
// ============================================================================

describe("extractDocumentContent", () => {
  it("should extract content from Google Doc", async () => {
    (mockDrive.files.get as jest.Mock).mockResolvedValueOnce({
      data: {
        mimeType: "application/vnd.google-apps.document",
        name: "Test Doc",
      },
    });

    (mockDrive.files.export as jest.Mock).mockResolvedValueOnce({
      data: "This is the document content",
    });

    const result = await extractDocumentContent(mockDrive, TEST_FILE_ID);

    expect(result.content).toBe("This is the document content");
    expect(result.mimeType).toBe("application/vnd.google-apps.document");
    expect(mockDrive.files.export).toHaveBeenCalledWith({
      fileId: TEST_FILE_ID,
      mimeType: "text/plain",
    });
  });

  it("should extract content from plain text file", async () => {
    (mockDrive.files.get as jest.Mock)
      .mockResolvedValueOnce({
        data: { mimeType: "text/plain", name: "test.txt" },
      })
      .mockResolvedValueOnce({
        data: "Plain text content",
      });

    const result = await extractDocumentContent(mockDrive, TEST_FILE_ID);

    expect(result.content).toBe("Plain text content");
    expect(result.mimeType).toBe("text/plain");
  });

  it("should return placeholder for PDF files", async () => {
    (mockDrive.files.get as jest.Mock).mockResolvedValueOnce({
      data: { mimeType: "application/pdf", name: "document.pdf" },
    });

    const result = await extractDocumentContent(mockDrive, TEST_FILE_ID);

    expect(result.content).toContain("PDF content extraction requires additional processing");
    expect(result.mimeType).toBe("application/pdf");
  });

  it("should return placeholder for binary files", async () => {
    (mockDrive.files.get as jest.Mock).mockResolvedValueOnce({
      data: { mimeType: "image/png", name: "image.png" },
    });

    const result = await extractDocumentContent(mockDrive, TEST_FILE_ID);

    expect(result.content).toContain("Binary file: image/png");
    expect(result.mimeType).toBe("image/png");
  });

  it("should handle Google Workspace files that can be exported", async () => {
    (mockDrive.files.get as jest.Mock).mockResolvedValueOnce({
      data: {
        mimeType: "application/vnd.google-apps.spreadsheet",
        name: "sheet",
      },
    });

    (mockDrive.files.export as jest.Mock).mockResolvedValueOnce({
      data: "Exported spreadsheet content",
    });

    const result = await extractDocumentContent(mockDrive, TEST_FILE_ID);

    expect(result.content).toBe("Exported spreadsheet content");
  });

  it("should handle Google Workspace files that cannot be exported", async () => {
    (mockDrive.files.get as jest.Mock).mockResolvedValueOnce({
      data: {
        mimeType: "application/vnd.google-apps.form",
        name: "form",
      },
    });

    (mockDrive.files.export as jest.Mock).mockRejectedValueOnce(
      new Error("Export not supported")
    );

    const result = await extractDocumentContent(mockDrive, TEST_FILE_ID);

    expect(result.content).toContain("Content extraction not supported");
  });
});

// ============================================================================
// Metadata Operations
// ============================================================================

describe("getFileMetadata", () => {
  it("should get complete file metadata", async () => {
    (mockDrive.files.get as jest.Mock).mockResolvedValueOnce({
      data: {
        name: "test-file.pdf",
        mimeType: "application/pdf",
        size: "1024000",
        createdTime: "2026-01-01T00:00:00.000Z",
        modifiedTime: "2026-01-05T12:00:00.000Z",
        owners: [
          {
            emailAddress: "owner@example.com",
            displayName: "File Owner",
          },
        ],
      },
    });

    const metadata = await getFileMetadata(mockDrive, TEST_FILE_ID);

    expect(metadata.name).toBe("test-file.pdf");
    expect(metadata.mimeType).toBe("application/pdf");
    expect(metadata.size).toBe(1024000);
    expect(metadata.createdTime).toBe("2026-01-01T00:00:00.000Z");
    expect(metadata.modifiedTime).toBe("2026-01-05T12:00:00.000Z");
    expect(metadata.owners).toHaveLength(1);
    expect(metadata.owners?.[0].emailAddress).toBe("owner@example.com");
  });

  it("should handle missing optional fields", async () => {
    (mockDrive.files.get as jest.Mock).mockResolvedValueOnce({
      data: {
        name: "minimal-file",
      },
    });

    const metadata = await getFileMetadata(mockDrive, TEST_FILE_ID);

    expect(metadata.name).toBe("minimal-file");
    expect(metadata.mimeType).toBe("application/octet-stream");
    expect(metadata.size).toBeUndefined();
    expect(metadata.createdTime).toBeUndefined();
    expect(metadata.modifiedTime).toBeUndefined();
  });

  it("should default name to 'Unknown' if missing", async () => {
    (mockDrive.files.get as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    const metadata = await getFileMetadata(mockDrive, TEST_FILE_ID);

    expect(metadata.name).toBe("Unknown");
  });
});

describe("listFilesInFolder", () => {
  it("should list files in folder", async () => {
    (mockDrive.files.list as jest.Mock).mockResolvedValueOnce({
      data: {
        files: [
          { id: "file1", name: "document.pdf", mimeType: "application/pdf" },
          { id: "file2", name: "image.png", mimeType: "image/png" },
          { id: "file3", name: "text.txt", mimeType: "text/plain" },
        ],
      },
    });

    const files = await listFilesInFolder(mockDrive, TEST_FOLDER_ID);

    expect(files).toHaveLength(3);
    expect(files[0]).toEqual({
      id: "file1",
      name: "document.pdf",
      mimeType: "application/pdf",
    });
    expect(files[1].name).toBe("image.png");
    expect(files[2].mimeType).toBe("text/plain");
  });

  it("should use custom page size", async () => {
    (mockDrive.files.list as jest.Mock).mockResolvedValueOnce({
      data: { files: [] },
    });

    await listFilesInFolder(mockDrive, TEST_FOLDER_ID, 50);

    expect(mockDrive.files.list).toHaveBeenCalledWith({
      q: `'${TEST_FOLDER_ID}' in parents and trashed=false`,
      fields: "files(id, name, mimeType)",
      pageSize: 50,
    });
  });

  it("should return empty array if no files", async () => {
    (mockDrive.files.list as jest.Mock).mockResolvedValueOnce({
      data: { files: [] },
    });

    const files = await listFilesInFolder(mockDrive, TEST_FOLDER_ID);

    expect(files).toEqual([]);
  });

  it("should return empty array if files is undefined", async () => {
    (mockDrive.files.list as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    const files = await listFilesInFolder(mockDrive, TEST_FOLDER_ID);

    expect(files).toEqual([]);
  });

  it("should handle files with missing fields", async () => {
    (mockDrive.files.list as jest.Mock).mockResolvedValueOnce({
      data: {
        files: [
          { id: undefined, name: undefined, mimeType: undefined },
        ],
      },
    });

    const files = await listFilesInFolder(mockDrive, TEST_FOLDER_ID);

    expect(files).toHaveLength(1);
    expect(files[0]).toEqual({ id: "", name: "", mimeType: "" });
  });
});
