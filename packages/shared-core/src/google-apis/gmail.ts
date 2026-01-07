/**
 * Gmail API client factory
 */

import { google, gmail_v1 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

/**
 * Create Gmail API client
 *
 * @param auth - Authenticated OAuth2Client
 * @returns Gmail API client
 */
export function createGmailClient(auth: OAuth2Client): gmail_v1.Gmail {
  return google.gmail({ version: "v1", auth });
}

/**
 * Export the Gmail type for convenience
 */
export type { gmail_v1 };
