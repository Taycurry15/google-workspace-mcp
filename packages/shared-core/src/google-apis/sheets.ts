/**
 * Google Sheets API client factory
 */

import { google, sheets_v4 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

/**
 * Create Google Sheets API client
 *
 * @param auth - Authenticated OAuth2Client
 * @returns Google Sheets API client
 */
export function createSheetsClient(auth: OAuth2Client): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth });
}

/**
 * Export the Sheets type for convenience
 */
export type { sheets_v4 };
