/**
 * Google API OAuth2 Scopes
 * Define all the scopes needed for Google Workspace APIs
 */

/**
 * Gmail API scopes
 */
export const GMAIL_SCOPES = {
  MODIFY: "https://www.googleapis.com/auth/gmail.modify",
  READONLY: "https://www.googleapis.com/auth/gmail.readonly",
  SEND: "https://www.googleapis.com/auth/gmail.send",
  COMPOSE: "https://www.googleapis.com/auth/gmail.compose",
} as const;

/**
 * Google Drive API scopes
 */
export const DRIVE_SCOPES = {
  FULL: "https://www.googleapis.com/auth/drive",
  FILE: "https://www.googleapis.com/auth/drive.file",
  READONLY: "https://www.googleapis.com/auth/drive.readonly",
  METADATA: "https://www.googleapis.com/auth/drive.metadata.readonly",
} as const;

/**
 * Google Sheets API scopes
 */
export const SHEETS_SCOPES = {
  FULL: "https://www.googleapis.com/auth/spreadsheets",
  READONLY: "https://www.googleapis.com/auth/spreadsheets.readonly",
} as const;

/**
 * Google Docs API scopes
 */
export const DOCS_SCOPES = {
  FULL: "https://www.googleapis.com/auth/documents",
  READONLY: "https://www.googleapis.com/auth/documents.readonly",
} as const;

/**
 * Google Calendar API scopes
 */
export const CALENDAR_SCOPES = {
  FULL: "https://www.googleapis.com/auth/calendar",
  READONLY: "https://www.googleapis.com/auth/calendar.readonly",
  EVENTS: "https://www.googleapis.com/auth/calendar.events",
} as const;

/**
 * Google Tasks API scopes
 */
export const TASKS_SCOPES = {
  FULL: "https://www.googleapis.com/auth/tasks",
  READONLY: "https://www.googleapis.com/auth/tasks.readonly",
} as const;

/**
 * Default scopes for full Google Workspace access
 * Used when initializing OAuth2 client for MCP servers
 */
export const DEFAULT_SCOPES = [
  GMAIL_SCOPES.MODIFY,
  DRIVE_SCOPES.FULL,
  SHEETS_SCOPES.FULL,
  DOCS_SCOPES.FULL,
  CALENDAR_SCOPES.FULL,
  TASKS_SCOPES.FULL,
] as const;

/**
 * All available scopes (for reference)
 */
export const ALL_SCOPES = {
  GMAIL: GMAIL_SCOPES,
  DRIVE: DRIVE_SCOPES,
  SHEETS: SHEETS_SCOPES,
  DOCS: DOCS_SCOPES,
  CALENDAR: CALENDAR_SCOPES,
  TASKS: TASKS_SCOPES,
} as const;

/**
 * Get scopes for specific services
 */
export function getScopesFor(services: Array<keyof typeof ALL_SCOPES>): string[] {
  const scopes: string[] = [];

  for (const service of services) {
    const serviceScopes = ALL_SCOPES[service];
    // Add the "FULL" scope if available, otherwise add all scopes
    if ('FULL' in serviceScopes) {
      scopes.push(serviceScopes.FULL);
    } else {
      scopes.push(...Object.values(serviceScopes));
    }
  }

  return scopes;
}
