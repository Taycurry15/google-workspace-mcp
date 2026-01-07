/**
 * MIME message construction for Gmail attachments
 * Builds RFC 2822 compliant multipart/mixed messages without external dependencies
 */

import * as crypto from "crypto";
import type { MimeMessageOptions } from "../types/attachments.js";

/**
 * Generate a unique boundary string for MIME multipart messages
 */
export function generateBoundary(): string {
  return `----=_Part_${crypto.randomBytes(16).toString("hex")}`;
}

/**
 * Encode header value for RFC 2047 (handles non-ASCII characters)
 */
export function encodeEmailHeader(value: string): string {
  // Check if encoding is needed (contains non-ASCII)
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(value)) {
    return value;
  }

  // RFC 2047 encoded-word format: =?UTF-8?B?<base64>?=
  const encoded = Buffer.from(value, "utf-8").toString("base64");
  return `=?UTF-8?B?${encoded}?=`;
}

/**
 * Build a MIME multipart/mixed message with attachments
 */
export function buildMimeMessage(options: MimeMessageOptions): string {
  const { to, subject, body, cc, bcc, attachments } = options;

  const boundary = generateBoundary();
  const lines: string[] = [];

  // Email headers
  lines.push(`To: ${to}`);
  if (cc) lines.push(`Cc: ${cc}`);
  if (bcc) lines.push(`Bcc: ${bcc}`);
  lines.push(`Subject: ${encodeEmailHeader(subject)}`);
  lines.push("MIME-Version: 1.0");
  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  lines.push("");

  // Body part
  lines.push(`--${boundary}`);
  lines.push("Content-Type: text/plain; charset=UTF-8");
  lines.push("Content-Transfer-Encoding: 7bit");
  lines.push("");
  lines.push(body);
  lines.push("");

  // Attachment parts
  for (const attachment of attachments) {
    lines.push(`--${boundary}`);
    lines.push(
      `Content-Type: ${attachment.mimeType}; name="${encodeEmailHeader(attachment.filename)}"`
    );
    lines.push("Content-Transfer-Encoding: base64");
    lines.push(
      `Content-Disposition: attachment; filename="${encodeEmailHeader(attachment.filename)}"`
    );
    lines.push("");

    // Split base64 data into 76-character lines (RFC 2045)
    const base64Data = attachment.data.replace(/\s/g, ""); // Remove any whitespace
    for (let i = 0; i < base64Data.length; i += 76) {
      lines.push(base64Data.substring(i, i + 76));
    }

    lines.push("");
  }

  // Final boundary
  lines.push(`--${boundary}--`);

  return lines.join("\r\n");
}
