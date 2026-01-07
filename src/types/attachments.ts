/**
 * File attachment type definitions for Gmail and Drive
 */

export interface FileAttachment {
  filename: string;
  mimeType: string;
  data: string; // base64-encoded file content
}

export interface MimeMessageOptions {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  attachments: FileAttachment[];
}

export interface ValidationOptions {
  maxTotalSize?: number; // in bytes, default: 25MB
  maxFileSize?: number; // in bytes, default: 25MB
  allowedMimeTypes?: string[];
  maxFileCount?: number; // default: 10
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  totalSize: number;
}
