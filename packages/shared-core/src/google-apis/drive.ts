/**
 * Google Drive API client factory
 */

import { google, drive_v3 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

/**
 * Create Google Drive API client
 *
 * @param auth - Authenticated OAuth2Client
 * @returns Google Drive API client
 */
export function createDriveClient(auth: OAuth2Client): drive_v3.Drive {
  return google.drive({ version: "v3", auth });
}

/**
 * Export the Drive type for convenience
 */
export type { drive_v3 };
