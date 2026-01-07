/**
 * Unit Tests for File Validation Utilities
 *
 * Tests the fileValidation module which validates file attachments for Gmail:
 * - Base64 encoding validation
 * - File size calculations
 * - Filename sanitization
 * - Blocked file type detection
 * - Complete attachment array validation
 *
 * Test Coverage:
 * - Pure function tests (all functions are pure)
 * - Edge cases and boundary conditions
 * - Security validations (path traversal, dangerous file types)
 * - Gmail size limits
 */

import { describe, it, expect } from "@jest/globals";
import type { FileAttachment, ValidationOptions } from "../../src/types/attachments.js";
import {
  validateBase64,
  getDecodedSize,
  sanitizeFilename,
  isBlockedFileType,
  validateAttachments,
} from "../../src/utils/fileValidation.js";

// ============================================================================
// Base64 Validation Tests
// ============================================================================

describe("validateBase64", () => {
  it("should validate correct base64 strings", () => {
    expect(validateBase64("SGVsbG8gV29ybGQ=")).toBe(true);
    expect(validateBase64("YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo=")).toBe(true);
    expect(validateBase64("MTIzNDU2Nzg5MA==")).toBe(true);
  });

  it("should validate base64 without padding", () => {
    expect(validateBase64("SGVsbG8gV29ybGQ")).toBe(true);
    expect(validateBase64("YWJj")).toBe(true);
  });

  it("should validate base64 with whitespace", () => {
    expect(validateBase64("SGVs bG8g V29y bGQ=")).toBe(true);
    expect(validateBase64("SGVsbG8gV29ybGQ=\n")).toBe(true);
  });

  it("should reject invalid base64 strings", () => {
    expect(validateBase64("not@valid#base64!")).toBe(false);
    expect(validateBase64("SGVsbG8gV29ybGQ===")).toBe(false); // Too many padding
    expect(validateBase64("Hello World")).toBe(false); // Plain text
  });

  it("should reject empty or null values", () => {
    expect(validateBase64("")).toBe(false);
    expect(validateBase64(null as any)).toBe(false);
    expect(validateBase64(undefined as any)).toBe(false);
  });

  it("should reject non-string values", () => {
    expect(validateBase64(123 as any)).toBe(false);
    expect(validateBase64({} as any)).toBe(false);
    expect(validateBase64([] as any)).toBe(false);
  });
});

// ============================================================================
// File Size Calculation Tests
// ============================================================================

describe("getDecodedSize", () => {
  it("should calculate decoded size correctly", () => {
    // "Hello World" in base64 is "SGVsbG8gV29ybGQ="
    // Original: 11 bytes
    // Base64: 16 characters
    // Decoded: (16 * 3) / 4 - 1 padding = 11 bytes
    const base64 = "SGVsbG8gV29ybGQ=";
    expect(getDecodedSize(base64)).toBe(11);
  });

  it("should handle base64 with no padding", () => {
    // "abc" in base64 is "YWJj" (no padding)
    // Original: 3 bytes
    // Base64: 4 characters
    // Decoded: (4 * 3) / 4 - 0 padding = 3 bytes
    const base64 = "YWJj";
    expect(getDecodedSize(base64)).toBe(3);
  });

  it("should handle base64 with double padding", () => {
    // "a" in base64 is "YQ=="
    // Original: 1 byte
    // Base64: 4 characters
    // Decoded: (4 * 3) / 4 - 2 padding = 1 byte
    const base64 = "YQ==";
    expect(getDecodedSize(base64)).toBe(1);
  });

  it("should handle large base64 strings", () => {
    // 1MB of 'A' characters in base64
    const base64 = "A".repeat(1024 * 1024);
    const size = getDecodedSize(base64);

    // Should be approximately 768KB (1MB * 3/4)
    expect(size).toBeGreaterThan(750000);
    expect(size).toBeLessThan(800000);
  });

  it("should return 0 for empty string", () => {
    expect(getDecodedSize("")).toBe(0);
  });
});

// ============================================================================
// Filename Sanitization Tests
// ============================================================================

describe("sanitizeFilename", () => {
  it("should keep valid filenames unchanged", () => {
    expect(sanitizeFilename("document.pdf")).toBe("document.pdf");
    expect(sanitizeFilename("My File 2024.docx")).toBe("My File 2024.docx");
    expect(sanitizeFilename("report-final.xlsx")).toBe("report-final.xlsx");
  });

  it("should replace path separators with underscores", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("__..__etc_passwd");
    expect(sanitizeFilename("folder/file.txt")).toBe("folder_file.txt");
    expect(sanitizeFilename("C:\\Users\\file.txt")).toBe("C:_Users_file.txt");
  });

  it("should remove null bytes", () => {
    expect(sanitizeFilename("file\0.txt")).toBe("file.txt");
    expect(sanitizeFilename("malicious\0\0.pdf")).toBe("malicious.pdf");
  });

  it("should remove control characters", () => {
    expect(sanitizeFilename("file\x00\x01\x02.txt")).toBe("file.txt");
    expect(sanitizeFilename("file\x1F.pdf")).toBe("file.pdf");
    expect(sanitizeFilename("file\x7F.doc")).toBe("file.doc");
  });

  it("should limit filename length to 255 characters", () => {
    const longName = "a".repeat(300) + ".pdf";
    const sanitized = sanitizeFilename(longName);

    expect(sanitized.length).toBe(255);
    expect(sanitized.endsWith(".pdf")).toBe(true);
  });

  it("should preserve extension when truncating", () => {
    const longName = "a".repeat(300) + ".xlsx";
    const sanitized = sanitizeFilename(longName);

    expect(sanitized.length).toBe(255);
    expect(sanitized.endsWith(".xlsx")).toBe(true);
    expect(sanitized).not.toContain(".."); // Should only have one extension
  });

  it("should return 'attachment' for completely invalid filename", () => {
    expect(sanitizeFilename("\x00\x01\x02")).toBe("attachment");
    expect(sanitizeFilename("///")).toBe("attachment");
  });

  it("should handle filenames with multiple extensions", () => {
    expect(sanitizeFilename("archive.tar.gz")).toBe("archive.tar.gz");
  });
});

// ============================================================================
// Blocked File Type Detection Tests
// ============================================================================

describe("isBlockedFileType", () => {
  it("should block executable file extensions", () => {
    expect(isBlockedFileType("virus.exe", "application/octet-stream")).toBe(true);
    expect(isBlockedFileType("script.bat", "text/plain")).toBe(true);
    expect(isBlockedFileType("command.cmd", "text/plain")).toBe(true);
    expect(isBlockedFileType("program.com", "application/octet-stream")).toBe(true);
    expect(isBlockedFileType("screensaver.scr", "application/octet-stream")).toBe(true);
  });

  it("should block script file extensions", () => {
    expect(isBlockedFileType("script.vbs", "text/plain")).toBe(true);
    expect(isBlockedFileType("code.js", "application/javascript")).toBe(true);
    expect(isBlockedFileType("app.jar", "application/java-archive")).toBe(true);
  });

  it("should block dangerous MIME types", () => {
    expect(isBlockedFileType("file.bin", "application/x-msdownload")).toBe(true);
    expect(isBlockedFileType("file.bin", "application/x-executable")).toBe(true);
    expect(isBlockedFileType("file.bin", "application/x-bat")).toBe(true);
    expect(isBlockedFileType("file.sh", "application/x-sh")).toBe(true);
  });

  it("should be case-insensitive for extensions", () => {
    expect(isBlockedFileType("VIRUS.EXE", "application/octet-stream")).toBe(true);
    expect(isBlockedFileType("Script.BAT", "text/plain")).toBe(true);
    expect(isBlockedFileType("Code.JS", "text/plain")).toBe(true);
  });

  it("should be case-insensitive for MIME types", () => {
    expect(isBlockedFileType("file.bin", "APPLICATION/X-MSDOWNLOAD")).toBe(true);
  });

  it("should allow safe file types", () => {
    expect(isBlockedFileType("document.pdf", "application/pdf")).toBe(false);
    expect(isBlockedFileType("image.png", "image/png")).toBe(false);
    expect(isBlockedFileType("spreadsheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe(false);
    expect(isBlockedFileType("text.txt", "text/plain")).toBe(false);
  });

  it("should allow files with safe extensions but similar names", () => {
    // "executor" contains "exe" but doesn't end with ".exe"
    expect(isBlockedFileType("executor.pdf", "application/pdf")).toBe(false);
    expect(isBlockedFileType("combat.pdf", "application/pdf")).toBe(false);
  });
});

// ============================================================================
// Complete Attachment Validation Tests
// ============================================================================

describe("validateAttachments", () => {
  it("should validate valid attachments", () => {
    const attachments: FileAttachment[] = [
      {
        filename: "document.pdf",
        mimeType: "application/pdf",
        data: "SGVsbG8gV29ybGQ=", // "Hello World" in base64
      },
    ];

    const result = validateAttachments(attachments);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.totalSize).toBeGreaterThan(0);
  });

  it("should reject empty attachment array", () => {
    const result = validateAttachments([]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("At least one attachment is required");
  });

  it("should reject non-array attachments", () => {
    const result = validateAttachments(null as any);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Attachments must be an array");
  });

  it("should reject too many attachments", () => {
    const attachments: FileAttachment[] = Array(15).fill({
      filename: "file.txt",
      mimeType: "text/plain",
      data: "YWJj",
    });

    const result = validateAttachments(attachments);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Too many attachments"))).toBe(true);
  });

  it("should reject attachments without filename", () => {
    const attachments: FileAttachment[] = [
      {
        filename: "",
        mimeType: "text/plain",
        data: "YWJj",
      },
    ];

    const result = validateAttachments(attachments);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("filename is required"))).toBe(true);
  });

  it("should reject attachments without mimeType", () => {
    const attachments: FileAttachment[] = [
      {
        filename: "file.txt",
        mimeType: "",
        data: "YWJj",
      },
    ];

    const result = validateAttachments(attachments);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("mimeType is required"))).toBe(true);
  });

  it("should reject attachments without data", () => {
    const attachments: FileAttachment[] = [
      {
        filename: "file.txt",
        mimeType: "text/plain",
        data: "",
      },
    ];

    const result = validateAttachments(attachments);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("data is required"))).toBe(true);
  });

  it("should reject invalid base64 data", () => {
    const attachments: FileAttachment[] = [
      {
        filename: "file.txt",
        mimeType: "text/plain",
        data: "not!valid@base64#data",
      },
    ];

    const result = validateAttachments(attachments);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("invalid base64 encoding"))).toBe(true);
  });

  it("should warn about sanitized filenames", () => {
    const attachments: FileAttachment[] = [
      {
        filename: "../../etc/passwd",
        mimeType: "text/plain",
        data: "YWJj",
      },
    ];

    const result = validateAttachments(attachments);

    expect(result.warnings.some((w) => w.includes("filename was sanitized"))).toBe(true);
    expect(attachments[0].filename).toBe("__..__etc_passwd"); // Should be mutated
  });

  it("should warn about dangerous file types", () => {
    const attachments: FileAttachment[] = [
      {
        filename: "virus.exe",
        mimeType: "application/octet-stream",
        data: "YWJj",
      },
    ];

    const result = validateAttachments(attachments);

    expect(result.warnings.some((w) => w.includes("potentially dangerous file type"))).toBe(true);
  });

  it("should reject file exceeding size limit", () => {
    // Create a base64 string representing ~30MB file
    const largData = "A".repeat(40 * 1024 * 1024); // 40MB in base64

    const attachments: FileAttachment[] = [
      {
        filename: "large.bin",
        mimeType: "application/octet-stream",
        data: largData,
      },
    ];

    const result = validateAttachments(attachments);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("file too large"))).toBe(true);
  });

  it("should reject total size exceeding limit", () => {
    // Create multiple files that together exceed 25MB
    const mediumData = "A".repeat(20 * 1024 * 1024); // 20MB each

    const attachments: FileAttachment[] = [
      {
        filename: "file1.bin",
        mimeType: "application/octet-stream",
        data: mediumData,
      },
      {
        filename: "file2.bin",
        mimeType: "application/octet-stream",
        data: mediumData,
      },
    ];

    const result = validateAttachments(attachments);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Total attachment size too large"))).toBe(true);
  });

  it("should use custom validation options", () => {
    const attachments: FileAttachment[] = [
      {
        filename: "file.txt",
        mimeType: "text/plain",
        data: "YWJj",
      },
      {
        filename: "file.pdf",
        mimeType: "application/pdf",
        data: "YWJj",
      },
    ];

    const options: ValidationOptions = {
      allowedMimeTypes: ["text/plain"],
      maxFileCount: 1,
      maxFileSize: 1024,
      maxTotalSize: 2048,
    };

    const result = validateAttachments(attachments, options);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Too many attachments"))).toBe(true);
    expect(result.errors.some((e) => e.includes("MIME type application/pdf is not allowed"))).toBe(true);
  });

  it("should calculate total size with overhead", () => {
    const attachments: FileAttachment[] = [
      {
        filename: "file.txt",
        mimeType: "text/plain",
        data: "SGVsbG8gV29ybGQ=", // 11 bytes decoded
      },
    ];

    const result = validateAttachments(attachments);

    // Total size should include 20% overhead
    // 11 bytes * 1.2 = 13.2 bytes (floored to 13)
    expect(result.totalSize).toBeGreaterThanOrEqual(13);
    expect(result.totalSize).toBeLessThan(20);
  });

  it("should validate multiple valid attachments", () => {
    const attachments: FileAttachment[] = [
      {
        filename: "document.pdf",
        mimeType: "application/pdf",
        data: "YWJj",
      },
      {
        filename: "image.png",
        mimeType: "image/png",
        data: "ZGVm",
      },
      {
        filename: "spreadsheet.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        data: "Z2hp",
      },
    ];

    const result = validateAttachments(attachments);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should collect multiple errors for single attachment", () => {
    const attachments: FileAttachment[] = [
      {
        filename: "",
        mimeType: "",
        data: "",
      },
    ];

    const result = validateAttachments(attachments);

    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.errors.some((e) => e.includes("filename is required"))).toBe(true);
  });

  it("should handle edge case with exactly max file count", () => {
    const attachments: FileAttachment[] = Array(10).fill(null).map((_, i) => ({
      filename: `file${i}.txt`,
      mimeType: "text/plain",
      data: "YWJj",
    }));

    const result = validateAttachments(attachments);

    expect(result.valid).toBe(true);
    expect(result.errors.some((e) => e.includes("Too many attachments"))).toBe(false);
  });
});
