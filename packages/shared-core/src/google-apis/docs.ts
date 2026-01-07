/**
 * Google Docs API client factory
 */

import { google, docs_v1 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

/**
 * Create Google Docs API client
 *
 * @param auth - Authenticated OAuth2Client
 * @returns Google Docs API client
 */
export function createDocsClient(auth: OAuth2Client): docs_v1.Docs {
  return google.docs({ version: "v1", auth });
}

/**
 * Export the Docs type for convenience
 */
export type { docs_v1 };
