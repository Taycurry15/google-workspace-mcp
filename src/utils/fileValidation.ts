/**
 * File attachment validation utilities
 */

import type { FileAttachment, ValidationOptions, ValidationResult } from "../types/attachments.js";

// Gmail's actual limit is 25MB for the entire message
const DEFAULT_MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25MB
const DEFAULT_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const DEFAULT_MAX_FILE_COUNT = 10;

/**
 * Validate base64 string format
 */
export function validateBase64(data: string): boolean {
  if (!data || typeof data !== "string") {
    return false;
  }

  // Check if it's valid base64
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(data.replace(/\s/g, ""));
}

/**
 * Calculate the decoded size from base64 string
 * Base64 encoding increases size by ~33%
 */
export function getDecodedSize(base64: string): number {
  // Remove padding
  const padding = (base64.match(/=/g) || []).length;
  const base64Length = base64.length;

  // Decoded size = (base64Length * 3) / 4 - padding
  return Math.floor((base64Length * 3) / 4) - padding;
}

/**
 * Sanitize filename to prevent path traversal and remove dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators
  let sanitized = filename.replace(/[/\\]/g, "_");

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Remove control characters
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split(".").pop() || "";
    const nameLimit = 255 - ext.length - 1;
    sanitized = sanitized.substring(0, nameLimit) + "." + ext;
  }

  return sanitized || "attachment";
}

/**
 * Check if file type is blocked for security reasons
 */
export function isBlockedFileType(filename: string, mimeType: string): boolean {
  const blockedExtensions = [".exe", ".bat", ".cmd", ".com", ".scr", ".pif", ".vbs", ".js", ".jar"];

  const blockedMimeTypes = [
    "application/x-msdownload",
    "application/x-executable",
    "application/x-bat",
    "application/x-sh",
  ];

  const lowerFilename = filename.toLowerCase();
  const hasBlockedExtension = blockedExtensions.some((ext) => lowerFilename.endsWith(ext));

  const hasBlockedMimeType = blockedMimeTypes.includes(mimeType.toLowerCase());

  return hasBlockedExtension || hasBlockedMimeType;
}

/**
 * Validate array of file attachments
 */
export function validateAttachments(
  attachments: FileAttachment[],
  options?: ValidationOptions
): ValidationResult {
  const maxTotalSize = options?.maxTotalSize || DEFAULT_MAX_TOTAL_SIZE;
  const maxFileSize = options?.maxFileSize || DEFAULT_MAX_FILE_SIZE;
  const maxFileCount = options?.maxFileCount || DEFAULT_MAX_FILE_COUNT;

  const errors: string[] = [];
  const warnings: string[] = [];
  let totalSize = 0;

  // Check file count
  if (!attachments || !Array.isArray(attachments)) {
    errors.push("Attachments must be an array");
    return { valid: false, errors, warnings, totalSize: 0 };
  }

  if (attachments.length === 0) {
    errors.push("At least one attachment is required");
    return { valid: false, errors, warnings, totalSize: 0 };
  }

  if (attachments.length > maxFileCount) {
    errors.push(`Too many attachments (${attachments.length}). Maximum is ${maxFileCount}`);
  }

  // Validate each attachment
  for (let i = 0; i < attachments.length; i++) {
    const attachment = attachments[i];
    const prefix = `Attachment ${i + 1}`;

    // Check required fields
    if (!attachment.filename) {
      errors.push(`${prefix}: filename is required`);
      continue;
    }

    if (!attachment.mimeType) {
      errors.push(`${prefix} (${attachment.filename}): mimeType is required`);
      continue;
    }

    if (!attachment.data) {
      errors.push(`${prefix} (${attachment.filename}): data is required`);
      continue;
    }

    // Sanitize filename
    const sanitized = sanitizeFilename(attachment.filename);
    if (sanitized !== attachment.filename) {
      warnings.push(
        `${prefix}: filename was sanitized from "${attachment.filename}" to "${sanitized}"`
      );
      attachment.filename = sanitized;
    }

    // Check for blocked file types
    if (isBlockedFileType(attachment.filename, attachment.mimeType)) {
      warnings.push(`${prefix} (${attachment.filename}): potentially dangerous file type detected`);
    }

    // Validate base64 encoding
    if (!validateBase64(attachment.data)) {
      errors.push(`${prefix} (${attachment.filename}): invalid base64 encoding`);
      continue;
    }

    // Calculate file size
    const fileSize = getDecodedSize(attachment.data);
    totalSize += fileSize;

    // Check individual file size
    if (fileSize > maxFileSize) {
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(2);
      errors.push(
        `${prefix} (${attachment.filename}): file too large (${fileSizeMB}MB). Maximum is ${maxSizeMB}MB`
      );
    }

    // Check allowed MIME types if specified
    if (options?.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
      if (!options.allowedMimeTypes.includes(attachment.mimeType)) {
        errors.push(
          `${prefix} (${attachment.filename}): MIME type ${attachment.mimeType} is not allowed`
        );
      }
    }
  }

  // Check total size (accounting for base64 overhead and email headers)
  // Add ~20% overhead for headers and MIME boundaries
  const totalSizeWithOverhead = totalSize * 1.2;

  if (totalSizeWithOverhead > maxTotalSize) {
    const totalSizeMB = (totalSizeWithOverhead / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (maxTotalSize / (1024 * 1024)).toFixed(2);
    errors.push(
      `Total attachment size too large (${totalSizeMB}MB including overhead). Gmail limit is ${maxSizeMB}MB`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalSize: Math.floor(totalSizeWithOverhead),
  };
}
