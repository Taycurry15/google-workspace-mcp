/**
 * Google Tasks API client factory
 */

import { google, tasks_v1 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

/**
 * Create Google Tasks API client
 *
 * @param auth - Authenticated OAuth2Client
 * @returns Google Tasks API client
 */
export function createTasksClient(auth: OAuth2Client): tasks_v1.Tasks {
  return google.tasks({ version: "v1", auth });
}

/**
 * Export the Tasks type for convenience
 */
export type { tasks_v1 };
