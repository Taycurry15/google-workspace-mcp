/**
 * Google Calendar API client factory
 */

import { google, calendar_v3 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

/**
 * Create Google Calendar API client
 *
 * @param auth - Authenticated OAuth2Client
 * @returns Google Calendar API client
 */
export function createCalendarClient(auth: OAuth2Client): calendar_v3.Calendar {
  return google.calendar({ version: "v3", auth });
}

/**
 * Export the Calendar type for convenience
 */
export type { calendar_v3 };
