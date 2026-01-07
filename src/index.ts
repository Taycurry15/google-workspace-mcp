#!/usr/bin/env node

/**
 * Google Workspace MCP Server
 * Production-ready server with 30+ tools for complete workspace automation
 *
 * Features:
 * - Gmail: Send, search, manage emails and drafts
 * - Drive: Files, folders, permissions, sharing
 * - Sheets: Create, update, format, formulas
 * - Docs: Create, edit, format documents
 * - Calendar: Events, scheduling, attendees
 * - Tasks: Task lists and management
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// PARA imports
import * as PARA from "./para/index.js";

// PMO imports
import * as PMO from "./pmo/index.js";

// New domain imports (Phase 2-5)
import * as ProgramDomain from "./program/index.js";
import * as DocumentsDomain from "./documents/index.js";
import * as DeliverablesDomain from "./deliverables/index.js";
import * as WorkflowsDomain from "./workflows/index.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OAuth2 Configuration
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/tasks",
];

// Environment variables with fallback to defaults
const TOKEN_PATH = process.env.TOKEN_PATH || path.join(__dirname, "..", "token.json");
const CREDENTIALS_PATH =
  process.env.CREDENTIALS_PATH || path.join(__dirname, "..", "credentials.json");

class GoogleWorkspaceMCP {
  private server: Server;
  private oauth2Client: OAuth2Client | null = null;

  constructor() {
    this.server = new Server(
      {
        name: "google-workspace-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
  }

  private async authorize(): Promise<OAuth2Client> {
    if (this.oauth2Client) return this.oauth2Client;

    const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, "utf-8"));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    this.oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    try {
      const token = JSON.parse(await fs.readFile(TOKEN_PATH, "utf-8"));
      this.oauth2Client.setCredentials(token);
    } catch (error) {
      throw new Error("No token found. Run setup-auth.ts first.");
    }

    return this.oauth2Client;
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // MODULAR DOMAIN TOOLS (Phase 2-5)
        // These will be populated as domains are implemented
        ...ProgramDomain.getToolDefinitions(),
        ...DocumentsDomain.getToolDefinitions(),
        ...DeliverablesDomain.getToolDefinitions(),
        ...WorkflowsDomain.getToolDefinitions(),

        // EXISTING INLINE TOOLS
        // GMAIL TOOLS (10 tools)
        {
          name: "gmail_send",
          description: "Send an email via Gmail with optional file attachments",
          inputSchema: {
            type: "object",
            properties: {
              to: { type: "string", description: "Recipient email address" },
              subject: { type: "string", description: "Email subject" },
              body: { type: "string", description: "Email body (plain text or HTML)" },
              cc: { type: "string", description: "CC recipients (comma-separated)" },
              bcc: { type: "string", description: "BCC recipients (comma-separated)" },
              attachments: {
                type: "array",
                description: "File attachments (max 25MB total including overhead)",
                items: {
                  type: "object",
                  properties: {
                    filename: { type: "string", description: "Attachment filename" },
                    mimeType: {
                      type: "string",
                      description: "MIME type (e.g., 'application/pdf', 'image/jpeg')",
                    },
                    data: { type: "string", description: "Base64-encoded file content" },
                  },
                  required: ["filename", "mimeType", "data"],
                },
              },
            },
            required: ["to", "subject", "body"],
          },
        },
        {
          name: "gmail_search",
          description: "Search Gmail messages",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Gmail search query (e.g., 'from:user@example.com subject:proposal')",
              },
              maxResults: {
                type: "number",
                description: "Maximum results to return (default: 10)",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "gmail_get_message",
          description: "Get full message details by ID",
          inputSchema: {
            type: "object",
            properties: {
              messageId: { type: "string", description: "Message ID" },
            },
            required: ["messageId"],
          },
        },
        {
          name: "gmail_create_draft",
          description: "Create a draft email with optional file attachments",
          inputSchema: {
            type: "object",
            properties: {
              to: { type: "string", description: "Recipient email address" },
              subject: { type: "string", description: "Email subject" },
              body: { type: "string", description: "Email body" },
              attachments: {
                type: "array",
                description: "File attachments (max 25MB total including overhead)",
                items: {
                  type: "object",
                  properties: {
                    filename: { type: "string", description: "Attachment filename" },
                    mimeType: {
                      type: "string",
                      description: "MIME type (e.g., 'application/pdf', 'image/jpeg')",
                    },
                    data: { type: "string", description: "Base64-encoded file content" },
                  },
                  required: ["filename", "mimeType", "data"],
                },
              },
            },
            required: ["to", "subject", "body"],
          },
        },
        {
          name: "gmail_list_labels",
          description: "List all Gmail labels",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "gmail_add_label",
          description: "Add label to message",
          inputSchema: {
            type: "object",
            properties: {
              messageId: { type: "string", description: "Message ID" },
              labelId: { type: "string", description: "Label ID to add" },
            },
            required: ["messageId", "labelId"],
          },
        },
        {
          name: "gmail_mark_read",
          description: "Mark message as read",
          inputSchema: {
            type: "object",
            properties: {
              messageId: { type: "string", description: "Message ID" },
            },
            required: ["messageId"],
          },
        },
        {
          name: "gmail_archive",
          description: "Archive a message",
          inputSchema: {
            type: "object",
            properties: {
              messageId: { type: "string", description: "Message ID" },
            },
            required: ["messageId"],
          },
        },
        {
          name: "gmail_get_attachments",
          description: "Get attachment metadata and content from an email message",
          inputSchema: {
            type: "object",
            properties: {
              messageId: { type: "string", description: "Message ID" },
              includeContent: {
                type: "boolean",
                description: "Include attachment content as base64 (default: true)",
              },
            },
            required: ["messageId"],
          },
        },
        {
          name: "gmail_save_attachment_to_drive",
          description: "Extract email attachment and save directly to Google Drive",
          inputSchema: {
            type: "object",
            properties: {
              messageId: { type: "string", description: "Email message ID" },
              attachmentId: { type: "string", description: "Attachment ID from the email" },
              folderId: {
                type: "string",
                description: "Drive folder ID to save to (optional, defaults to root)",
              },
              newFilename: {
                type: "string",
                description: "New filename for the file (optional, uses original name)",
              },
            },
            required: ["messageId", "attachmentId"],
          },
        },

        // GOOGLE DRIVE TOOLS (10 tools)
        {
          name: "drive_list_files",
          description: "List files and folders in Drive",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query (optional)" },
              folderId: { type: "string", description: "Parent folder ID (optional)" },
              pageSize: { type: "number", description: "Number of results (default: 100)" },
            },
          },
        },
        {
          name: "drive_create_folder",
          description: "Create a new folder in Drive",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Folder name" },
              parentId: {
                type: "string",
                description: "Parent folder ID (optional, defaults to root)",
              },
            },
            required: ["name"],
          },
        },
        {
          name: "drive_upload_file",
          description: "Upload a file to Drive (supports text and binary files via base64)",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "File name" },
              content: { type: "string", description: "File content (text or base64-encoded)" },
              mimeType: {
                type: "string",
                description: "MIME type (e.g., 'text/plain', 'application/pdf')",
              },
              folderId: { type: "string", description: "Parent folder ID (optional)" },
              encoding: {
                type: "string",
                description:
                  "Content encoding: 'base64' for binary files, 'text' for plain text (default: 'base64')",
                enum: ["base64", "text"],
              },
            },
            required: ["name", "content", "mimeType"],
          },
        },
        {
          name: "drive_get_file",
          description: "Get file metadata and content",
          inputSchema: {
            type: "object",
            properties: {
              fileId: { type: "string", description: "File ID" },
              includeContent: {
                type: "boolean",
                description: "Include file content (default: true)",
              },
            },
            required: ["fileId"],
          },
        },
        {
          name: "drive_delete_file",
          description: "Delete a file or folder",
          inputSchema: {
            type: "object",
            properties: {
              fileId: { type: "string", description: "File ID to delete" },
            },
            required: ["fileId"],
          },
        },
        {
          name: "drive_share_file",
          description: "Share a file with specific permissions",
          inputSchema: {
            type: "object",
            properties: {
              fileId: { type: "string", description: "File ID" },
              email: { type: "string", description: "Email address to share with" },
              role: { type: "string", description: "Role: 'reader', 'writer', or 'commenter'" },
              sendNotification: {
                type: "boolean",
                description: "Send notification email (default: true)",
              },
            },
            required: ["fileId", "email", "role"],
          },
        },
        {
          name: "drive_get_permissions",
          description: "List all permissions for a file",
          inputSchema: {
            type: "object",
            properties: {
              fileId: { type: "string", description: "File ID" },
            },
            required: ["fileId"],
          },
        },
        {
          name: "drive_copy_file",
          description: "Create a copy of a file",
          inputSchema: {
            type: "object",
            properties: {
              fileId: { type: "string", description: "Source file ID" },
              name: { type: "string", description: "New file name" },
              folderId: { type: "string", description: "Destination folder ID (optional)" },
            },
            required: ["fileId", "name"],
          },
        },
        {
          name: "drive_move_file",
          description: "Move a file to a different folder",
          inputSchema: {
            type: "object",
            properties: {
              fileId: { type: "string", description: "File ID" },
              newParentId: { type: "string", description: "New parent folder ID" },
            },
            required: ["fileId", "newParentId"],
          },
        },
        {
          name: "drive_search_content",
          description: "Search file contents (full-text search)",
          inputSchema: {
            type: "object",
            properties: {
              searchText: { type: "string", description: "Text to search for" },
              mimeType: { type: "string", description: "Filter by MIME type (optional)" },
            },
            required: ["searchText"],
          },
        },

        // GOOGLE SHEETS TOOLS (8 tools)
        {
          name: "sheets_create",
          description: "Create a new spreadsheet",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Spreadsheet title" },
              sheetNames: {
                type: "array",
                items: { type: "string" },
                description: "Sheet names (optional)",
              },
            },
            required: ["title"],
          },
        },
        {
          name: "sheets_read",
          description: "Read data from a spreadsheet range",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: { type: "string", description: "Spreadsheet ID" },
              range: { type: "string", description: "A1 notation range (e.g., 'Sheet1!A1:D10')" },
            },
            required: ["spreadsheetId", "range"],
          },
        },
        {
          name: "sheets_write",
          description: "Write data to a spreadsheet range",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: { type: "string", description: "Spreadsheet ID" },
              range: { type: "string", description: "A1 notation range" },
              values: { type: "array", description: "2D array of values to write" },
            },
            required: ["spreadsheetId", "range", "values"],
          },
        },
        {
          name: "sheets_append",
          description: "Append data to the end of a sheet",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: { type: "string", description: "Spreadsheet ID" },
              range: { type: "string", description: "Sheet name or range" },
              values: { type: "array", description: "2D array of values to append" },
            },
            required: ["spreadsheetId", "range", "values"],
          },
        },
        {
          name: "sheets_format",
          description: "Apply formatting to a range",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: { type: "string", description: "Spreadsheet ID" },
              sheetId: { type: "number", description: "Sheet ID (0 for first sheet)" },
              startRow: { type: "number", description: "Start row index (0-based)" },
              endRow: { type: "number", description: "End row index" },
              startColumn: { type: "number", description: "Start column index (0-based)" },
              endColumn: { type: "number", description: "End column index" },
              bold: { type: "boolean", description: "Make text bold" },
              backgroundColor: { type: "object", description: "Background color RGB (0-1)" },
            },
            required: [
              "spreadsheetId",
              "sheetId",
              "startRow",
              "endRow",
              "startColumn",
              "endColumn",
            ],
          },
        },
        {
          name: "sheets_create_sheet",
          description: "Add a new sheet to existing spreadsheet",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: { type: "string", description: "Spreadsheet ID" },
              title: { type: "string", description: "New sheet title" },
            },
            required: ["spreadsheetId", "title"],
          },
        },
        {
          name: "sheets_get_info",
          description: "Get spreadsheet metadata and sheet information",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: { type: "string", description: "Spreadsheet ID" },
            },
            required: ["spreadsheetId"],
          },
        },
        {
          name: "sheets_batch_update",
          description: "Execute multiple sheet operations in one request",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: { type: "string", description: "Spreadsheet ID" },
              requests: { type: "array", description: "Array of update requests" },
            },
            required: ["spreadsheetId", "requests"],
          },
        },

        // GOOGLE DOCS TOOLS (4 tools)
        {
          name: "docs_create",
          description: "Create a new Google Doc",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Document title" },
              content: { type: "string", description: "Initial content (optional)" },
            },
            required: ["title"],
          },
        },
        {
          name: "docs_read",
          description: "Read document content",
          inputSchema: {
            type: "object",
            properties: {
              documentId: { type: "string", description: "Document ID" },
            },
            required: ["documentId"],
          },
        },
        {
          name: "docs_append",
          description: "Append text to end of document",
          inputSchema: {
            type: "object",
            properties: {
              documentId: { type: "string", description: "Document ID" },
              text: { type: "string", description: "Text to append" },
            },
            required: ["documentId", "text"],
          },
        },
        {
          name: "docs_batch_update",
          description: "Execute multiple document operations",
          inputSchema: {
            type: "object",
            properties: {
              documentId: { type: "string", description: "Document ID" },
              requests: { type: "array", description: "Array of update requests" },
            },
            required: ["documentId", "requests"],
          },
        },

        // GOOGLE CALENDAR TOOLS (5 tools)
        {
          name: "calendar_create_event",
          description: "Create a calendar event",
          inputSchema: {
            type: "object",
            properties: {
              summary: { type: "string", description: "Event title" },
              description: { type: "string", description: "Event description" },
              startDateTime: { type: "string", description: "Start time (ISO 8601)" },
              endDateTime: { type: "string", description: "End time (ISO 8601)" },
              attendees: {
                type: "array",
                items: { type: "string" },
                description: "Attendee emails",
              },
              location: { type: "string", description: "Event location" },
            },
            required: ["summary", "startDateTime", "endDateTime"],
          },
        },
        {
          name: "calendar_list_events",
          description: "List upcoming calendar events",
          inputSchema: {
            type: "object",
            properties: {
              timeMin: { type: "string", description: "Start time filter (ISO 8601)" },
              timeMax: { type: "string", description: "End time filter (ISO 8601)" },
              maxResults: { type: "number", description: "Maximum results (default: 10)" },
            },
          },
        },
        {
          name: "calendar_update_event",
          description: "Update an existing event",
          inputSchema: {
            type: "object",
            properties: {
              eventId: { type: "string", description: "Event ID" },
              summary: { type: "string", description: "New title" },
              description: { type: "string", description: "New description" },
              startDateTime: { type: "string", description: "New start time" },
              endDateTime: { type: "string", description: "New end time" },
            },
            required: ["eventId"],
          },
        },
        {
          name: "calendar_delete_event",
          description: "Delete a calendar event",
          inputSchema: {
            type: "object",
            properties: {
              eventId: { type: "string", description: "Event ID" },
            },
            required: ["eventId"],
          },
        },
        {
          name: "calendar_find_slots",
          description: "Find available time slots for meeting",
          inputSchema: {
            type: "object",
            properties: {
              durationMinutes: { type: "number", description: "Meeting duration in minutes" },
              daysAhead: {
                type: "number",
                description: "Number of days to look ahead (default: 7)",
              },
              workingHoursOnly: {
                type: "boolean",
                description: "Only business hours (default: true)",
              },
            },
            required: ["durationMinutes"],
          },
        },

        // GOOGLE TASKS TOOLS (4 tools)
        {
          name: "tasks_create",
          description: "Create a new task",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Task title" },
              notes: { type: "string", description: "Task notes" },
              due: { type: "string", description: "Due date (ISO 8601)" },
              listId: { type: "string", description: "Task list ID (optional)" },
            },
            required: ["title"],
          },
        },
        {
          name: "tasks_list",
          description: "List tasks",
          inputSchema: {
            type: "object",
            properties: {
              listId: { type: "string", description: "Task list ID (optional)" },
              showCompleted: {
                type: "boolean",
                description: "Include completed tasks (default: false)",
              },
            },
          },
        },
        {
          name: "tasks_update",
          description: "Update a task",
          inputSchema: {
            type: "object",
            properties: {
              taskId: { type: "string", description: "Task ID" },
              title: { type: "string", description: "New title" },
              notes: { type: "string", description: "New notes" },
              status: { type: "string", description: "'needsAction' or 'completed'" },
              listId: { type: "string", description: "Task list ID" },
            },
            required: ["taskId"],
          },
        },
        {
          name: "tasks_list_all",
          description: "List all task lists",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },

        // PARA TOOLS (8 tools)
        {
          name: "para_setup_structure",
          description: "Create PARA folder structure (Projects, Areas, Resources, Archives) in Google Drive",
          inputSchema: {
            type: "object",
            properties: {
              parentFolderId: {
                type: "string",
                description: "Parent folder ID (optional, defaults to root)",
              },
              includeSubfolders: {
                type: "boolean",
                description: "Create suggested subfolders (default: true)",
              },
            },
          },
        },
        {
          name: "para_categorize_file",
          description: "Analyze a file and automatically assign PARA category (Project/Area/Resource/Archive) using AI",
          inputSchema: {
            type: "object",
            properties: {
              fileId: {
                type: "string",
                description: "Google Drive file ID to categorize",
              },
              forceRecategorize: {
                type: "boolean",
                description: "Re-analyze even if already categorized (default: false)",
              },
              applyToFolder: {
                type: "boolean",
                description: "Apply metadata to file (default: true)",
              },
              createShortcut: {
                type: "boolean",
                description: "Create shortcut in PARA folder (default: true)",
              },
            },
            required: ["fileId"],
          },
        },
        {
          name: "para_batch_categorize",
          description: "Batch categorize multiple files with AI analysis",
          inputSchema: {
            type: "object",
            properties: {
              fileIds: {
                type: "array",
                items: { type: "string" },
                description: "Array of file IDs to categorize",
              },
              folderId: {
                type: "string",
                description: "Categorize all files in this folder (alternative to fileIds)",
              },
              maxFiles: {
                type: "number",
                description: "Maximum files to process (default: 50)",
              },
              forceRecategorize: {
                type: "boolean",
                description: "Re-categorize already categorized files (default: false)",
              },
            },
          },
        },
        {
          name: "para_search",
          description: "Search files by PARA category, actionability, tags, and other metadata",
          inputSchema: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: ["PROJECT", "AREA", "RESOURCE", "ARCHIVE"],
                description: "Filter by PARA category",
              },
              actionability: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "Filter by actionability level",
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Filter by tags (any match)",
              },
              domain: {
                type: "string",
                enum: ["govcon", "international", "cybersec", "business"],
                description: "Filter by domain",
              },
              needsReview: {
                type: "boolean",
                description: "Only show files needing review",
              },
              projectName: {
                type: "string",
                description: "Filter by project name",
              },
              maxResults: {
                type: "number",
                description: "Maximum results (default: 100)",
              },
            },
          },
        },
        {
          name: "para_auto_archive",
          description: "Automatically archive completed projects to Archives folder",
          inputSchema: {
            type: "object",
            properties: {
              fileId: {
                type: "string",
                description: "Specific file ID to archive (optional)",
              },
              projectName: {
                type: "string",
                description: "Project name to archive (optional)",
              },
              completionDate: {
                type: "string",
                description: "Project completion date (default: today)",
              },
              archiveReason: {
                type: "string",
                description: "Reason for archival (e.g., 'Project completed', 'Deal closed')",
              },
              scanForCompletedProjects: {
                type: "boolean",
                description: "Scan and identify completed projects (default: false)",
              },
            },
          },
        },
        {
          name: "para_review_prompt",
          description: "Identify files needing PARA categorization or review and generate action prompts",
          inputSchema: {
            type: "object",
            properties: {
              scanScope: {
                type: "string",
                enum: ["all", "uncategorized", "stale", "lowConfidence"],
                description: "What to scan for review (default: all)",
              },
              staleDays: {
                type: "number",
                description: "Days since last review to consider stale (default: 90)",
              },
              sendNotification: {
                type: "boolean",
                description: "Send email notification with review list (default: false)",
              },
              emailTo: {
                type: "string",
                description: "Email address for notification (required if sendNotification is true)",
              },
            },
          },
        },
        {
          name: "para_create_dashboard",
          description: "Create PARA tracking dashboard spreadsheet with live metrics and categorization log",
          inputSchema: {
            type: "object",
            properties: {
              folderId: {
                type: "string",
                description: "Folder to create dashboard in (optional)",
              },
            },
          },
        },
        {
          name: "para_update_category",
          description: "Manually update PARA category and metadata for a file",
          inputSchema: {
            type: "object",
            properties: {
              fileId: {
                type: "string",
                description: "File ID",
              },
              category: {
                type: "string",
                enum: ["PROJECT", "AREA", "RESOURCE", "ARCHIVE"],
                description: "PARA category",
              },
              metadata: {
                type: "object",
                description: "Additional PARA metadata to update",
              },
              createShortcut: {
                type: "boolean",
                description: "Create/move shortcut to PARA folder (default: true)",
              },
            },
            required: ["fileId", "category"],
          },
        },

        // PMO TOOLS (6 tools - Phase 1: 3 tools)
        {
          name: "pmo_read_deliverables",
          description: "Read project deliverables from PMO tracking spreadsheet with optional filters",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: {
                type: "string",
                description: "PMO spreadsheet ID (defaults to PMO_SPREADSHEET_ID env var)",
              },
              status_filter: {
                type: "string",
                enum: ["all", "not-started", "in-progress", "in-review", "complete"],
                description: "Filter by deliverable status (default: all)",
              },
              priority_filter: {
                type: "string",
                enum: ["critical", "high", "medium", "low"],
                description: "Filter by priority level",
              },
            },
          },
        },
        {
          name: "pmo_update_deliverable",
          description: "Update a deliverable's status, quality score, or hours in PMO tracking spreadsheet",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: {
                type: "string",
                description: "PMO spreadsheet ID (defaults to PMO_SPREADSHEET_ID env var)",
              },
              deliverable_id: {
                type: "string",
                description: "Deliverable ID (e.g., D-01, D-02)",
              },
              status: {
                type: "string",
                enum: ["not-started", "in-progress", "in-review", "complete"],
                description: "Update deliverable status",
              },
              quality_score: {
                type: "number",
                description: "Quality score 0-100",
              },
              actual_hours: {
                type: "number",
                description: "Actual hours spent",
              },
              notes: {
                type: "string",
                description: "Additional notes",
              },
            },
            required: ["deliverable_id"],
          },
        },
        {
          name: "pmo_read_risks",
          description: "Read project risks from risk register with optional filters for status and minimum score",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: {
                type: "string",
                description: "PMO spreadsheet ID (defaults to PMO_SPREADSHEET_ID env var)",
              },
              status_filter: {
                type: "string",
                enum: ["all", "active", "closed", "monitoring"],
                description: "Filter by risk status (default: all)",
              },
              min_score: {
                type: "number",
                description: "Minimum risk score (1-25). Use 16 for critical risks only",
              },
            },
          },
        },

        // PMO PROPOSAL PROCESSING TOOLS (4 tools)
        {
          name: "pmo_analyze_proposal",
          description: "Analyze a project proposal document (Google Doc or Word) and extract PMO tracking information (deliverables, risks, stakeholders) using AI",
          inputSchema: {
            type: "object",
            properties: {
              fileId: {
                type: "string",
                description: "Google Drive file ID of the proposal document",
              },
              projectName: {
                type: "string",
                description: "Optional project name override. If not provided, will be inferred from document",
              },
            },
            required: ["fileId"],
          },
        },
        {
          name: "pmo_ask_clarifications",
          description: "Generate clarifying questions for a proposal analysis to identify gaps in scope, risks, stakeholders, or resources",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: {
                type: "string",
                description: "Session ID returned from pmo_analyze_proposal",
              },
            },
            required: ["sessionId"],
          },
        },
        {
          name: "pmo_apply_answers",
          description: "Apply user answers to clarification questions and refine the proposal analysis with additional context",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: {
                type: "string",
                description: "Session ID from pmo_analyze_proposal",
              },
              answers: {
                type: "array",
                description: "Array of question-answer pairs",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string", description: "The clarification question" },
                    answer: { type: "string", description: "Your answer to the question" },
                  },
                  required: ["question", "answer"],
                },
              },
            },
            required: ["sessionId", "answers"],
          },
        },
        {
          name: "pmo_create_from_proposal",
          description: "Create deliverables, risks, and stakeholders in PMO spreadsheet from an analyzed proposal. This writes all extracted data to the tracking sheets",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: {
                type: "string",
                description: "Session ID from pmo_analyze_proposal or pmo_apply_answers",
              },
              spreadsheetId: {
                type: "string",
                description: "PMO spreadsheet ID (defaults to PMO_SPREADSHEET_ID env var)",
              },
              options: {
                type: "object",
                description: "Optional flags to control what gets created",
                properties: {
                  createDeliverables: {
                    type: "boolean",
                    description: "Create deliverables (default: true)",
                  },
                  createRisks: {
                    type: "boolean",
                    description: "Create risks (default: true)",
                  },
                  createStakeholders: {
                    type: "boolean",
                    description: "Create stakeholders (default: true)",
                  },
                },
              },
            },
            required: ["sessionId"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const auth = await this.authorize();

      switch (request.params.name) {
        // GMAIL IMPLEMENTATIONS
        case "gmail_send":
          return await this.gmailSend(auth, request.params.arguments);
        case "gmail_search":
          return await this.gmailSearch(auth, request.params.arguments);
        case "gmail_get_message":
          return await this.gmailGetMessage(auth, request.params.arguments);
        case "gmail_create_draft":
          return await this.gmailCreateDraft(auth, request.params.arguments);
        case "gmail_list_labels":
          return await this.gmailListLabels(auth);
        case "gmail_add_label":
          return await this.gmailAddLabel(auth, request.params.arguments);
        case "gmail_mark_read":
          return await this.gmailMarkRead(auth, request.params.arguments);
        case "gmail_archive":
          return await this.gmailArchive(auth, request.params.arguments);
        case "gmail_get_attachments":
          return await this.gmailGetAttachments(auth, request.params.arguments);
        case "gmail_save_attachment_to_drive":
          return await this.gmailSaveAttachmentToDrive(auth, request.params.arguments);

        // DRIVE IMPLEMENTATIONS
        case "drive_list_files":
          return await this.driveListFiles(auth, request.params.arguments);
        case "drive_create_folder":
          return await this.driveCreateFolder(auth, request.params.arguments);
        case "drive_upload_file":
          return await this.driveUploadFile(auth, request.params.arguments);
        case "drive_get_file":
          return await this.driveGetFile(auth, request.params.arguments);
        case "drive_delete_file":
          return await this.driveDeleteFile(auth, request.params.arguments);
        case "drive_share_file":
          return await this.driveShareFile(auth, request.params.arguments);
        case "drive_get_permissions":
          return await this.driveGetPermissions(auth, request.params.arguments);
        case "drive_copy_file":
          return await this.driveCopyFile(auth, request.params.arguments);
        case "drive_move_file":
          return await this.driveMoveFile(auth, request.params.arguments);
        case "drive_search_content":
          return await this.driveSearchContent(auth, request.params.arguments);

        // SHEETS IMPLEMENTATIONS
        case "sheets_create":
          return await this.sheetsCreate(auth, request.params.arguments);
        case "sheets_read":
          return await this.sheetsRead(auth, request.params.arguments);
        case "sheets_write":
          return await this.sheetsWrite(auth, request.params.arguments);
        case "sheets_append":
          return await this.sheetsAppend(auth, request.params.arguments);
        case "sheets_format":
          return await this.sheetsFormat(auth, request.params.arguments);
        case "sheets_create_sheet":
          return await this.sheetsCreateSheet(auth, request.params.arguments);
        case "sheets_get_info":
          return await this.sheetsGetInfo(auth, request.params.arguments);
        case "sheets_batch_update":
          return await this.sheetsBatchUpdate(auth, request.params.arguments);

        // DOCS IMPLEMENTATIONS
        case "docs_create":
          return await this.docsCreate(auth, request.params.arguments);
        case "docs_read":
          return await this.docsRead(auth, request.params.arguments);
        case "docs_append":
          return await this.docsAppend(auth, request.params.arguments);
        case "docs_batch_update":
          return await this.docsBatchUpdate(auth, request.params.arguments);

        // CALENDAR IMPLEMENTATIONS
        case "calendar_create_event":
          return await this.calendarCreateEvent(auth, request.params.arguments);
        case "calendar_list_events":
          return await this.calendarListEvents(auth, request.params.arguments);
        case "calendar_update_event":
          return await this.calendarUpdateEvent(auth, request.params.arguments);
        case "calendar_delete_event":
          return await this.calendarDeleteEvent(auth, request.params.arguments);
        case "calendar_find_slots":
          return await this.calendarFindSlots(auth, request.params.arguments);

        // TASKS IMPLEMENTATIONS
        case "tasks_create":
          return await this.tasksCreate(auth, request.params.arguments);
        case "tasks_list":
          return await this.tasksList(auth, request.params.arguments);
        case "tasks_update":
          return await this.tasksUpdate(auth, request.params.arguments);
        case "tasks_list_all":
          return await this.tasksListAll(auth);

        // PARA IMPLEMENTATIONS
        case "para_setup_structure":
          return await this.paraSetupStructure(auth, request.params.arguments);
        case "para_categorize_file":
          return await this.paraCategorizeFile(auth, request.params.arguments);
        case "para_batch_categorize":
          return await this.paraBatchCategorize(auth, request.params.arguments);
        case "para_search":
          return await this.paraSearch(auth, request.params.arguments);
        case "para_auto_archive":
          return await this.paraAutoArchive(auth, request.params.arguments);
        case "para_review_prompt":
          return await this.paraReviewPrompt(auth, request.params.arguments);
        case "para_create_dashboard":
          return await this.paraCreateDashboard(auth, request.params.arguments);
        case "para_update_category":
          return await this.paraUpdateCategory(auth, request.params.arguments);

        // PMO IMPLEMENTATIONS (Phase 1: 3 tools)
        case "pmo_read_deliverables":
          return await this.pmoReadDeliverables(auth, request.params.arguments);
        case "pmo_update_deliverable":
          return await this.pmoUpdateDeliverable(auth, request.params.arguments);
        case "pmo_read_risks":
          return await this.pmoReadRisks(auth, request.params.arguments);

        // PMO PROPOSAL PROCESSING IMPLEMENTATIONS (4 tools)
        case "pmo_analyze_proposal":
          return await this.pmoAnalyzeProposal(auth, request.params.arguments);
        case "pmo_ask_clarifications":
          return await this.pmoAskClarifications(auth, request.params.arguments);
        case "pmo_apply_answers":
          return await this.pmoApplyAnswers(auth, request.params.arguments);
        case "pmo_create_from_proposal":
          return await this.pmoCreateFromProposal(auth, request.params.arguments);

        // DOCUMENT ORGANIZATION IMPLEMENTATIONS (Phase 3: 13 tools)
        case "document_submit":
          return await this.documentSubmit(auth, request.params.arguments);
        case "document_categorize":
          return await this.documentCategorize(auth, request.params.arguments);
        case "document_create_folder_structure":
          return await this.documentCreateFolderStructure(auth, request.params.arguments);
        case "document_get_metadata":
          return await this.documentGetMetadata(auth, request.params.arguments);
        case "document_update_metadata":
          return await this.documentUpdateMetadata(auth, request.params.arguments);
        case "document_search":
          return await this.documentSearch(auth, request.params.arguments);
        case "document_create_from_template":
          return await this.documentCreateFromTemplate(auth, request.params.arguments);
        case "document_list_templates":
          return await this.documentListTemplates(auth, request.params.arguments);
        case "document_create_version":
          return await this.documentCreateVersion(auth, request.params.arguments);
        case "document_get_version_history":
          return await this.documentGetVersionHistory(auth, request.params.arguments);
        case "document_get_statistics":
          return await this.documentGetStatistics(auth, request.params.arguments);
        case "document_find_similar":
          return await this.documentFindSimilar(auth, request.params.arguments);

        // DELIVERABLE TRACKING IMPLEMENTATIONS (Phase 4: 20 tools)
        case "deliverable_create":
          return await this.deliverableCreate(auth, request.params.arguments);
        case "deliverable_read":
          return await this.deliverableRead(auth, request.params.arguments);
        case "deliverable_update":
          return await this.deliverableUpdate(auth, request.params.arguments);
        case "deliverable_list":
          return await this.deliverableList(auth, request.params.arguments);
        case "deliverable_get_overdue":
          return await this.deliverableGetOverdue(auth, request.params.arguments);
        case "deliverable_get_at_risk":
          return await this.deliverableGetAtRisk(auth, request.params.arguments);
        case "deliverable_get_upcoming":
          return await this.deliverableGetUpcoming(auth, request.params.arguments);
        case "deliverable_submit":
          return await this.deliverableSubmit(auth, request.params.arguments);
        case "deliverable_get_pending_submissions":
          return await this.deliverableGetPendingSubmissions(auth, request.params.arguments);
        case "deliverable_assign_reviewer":
          return await this.deliverableAssignReviewer(auth, request.params.arguments);
        case "deliverable_submit_review":
          return await this.deliverableSubmitReview(auth, request.params.arguments);
        case "deliverable_approve":
          return await this.deliverableApprove(auth, request.params.arguments);
        case "deliverable_list_pending_reviews":
          return await this.deliverableListPendingReviews(auth, request.params.arguments);
        case "deliverable_list_pending_approvals":
          return await this.deliverableListPendingApprovals(auth, request.params.arguments);
        case "deliverable_create_checklist":
          return await this.deliverableCreateChecklist(auth, request.params.arguments);
        case "deliverable_evaluate_quality":
          return await this.deliverableEvaluateQuality(auth, request.params.arguments);
        case "deliverable_generate_status_report":
          return await this.deliverableGenerateStatusReport(auth, request.params.arguments);
        case "deliverable_generate_quality_report":
          return await this.deliverableGenerateQualityReport(auth, request.params.arguments);
        case "deliverable_generate_schedule_report":
          return await this.deliverableGenerateScheduleReport(auth, request.params.arguments);
        case "deliverable_generate_summary":
          return await this.deliverableGenerateSummary(auth, request.params.arguments);
        case "deliverable_track_status":
          return await this.deliverableTrackStatus(auth, request.params.arguments);
        case "deliverable_update_forecast":
          return await this.deliverableUpdateForecast(auth, request.params.arguments);
        case "deliverable_check_notifications":
          return await this.deliverableCheckNotifications(auth, request.params.arguments);

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });

    // Resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: "drive://recent",
            name: "Recent Drive Files",
            description: "Lists recently modified files in Google Drive",
            mimeType: "application/json",
          },
          {
            uri: "gmail://attachments/recent",
            name: "Recent Email Attachments",
            description: "Lists attachments from recent emails",
            mimeType: "application/json",
          },
        ],
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const auth = await this.authorize();
      const uri = request.params.uri;

      if (uri.startsWith("drive://")) {
        return await this.readDriveResource(auth, uri);
      } else if (uri.startsWith("gmail://")) {
        return await this.readGmailResource(auth, uri);
      }

      throw new Error(`Unsupported resource URI: ${uri}`);
    });
  }

  // GMAIL TOOL IMPLEMENTATIONS
  private async gmailSend(auth: OAuth2Client, args: any) {
    const gmail = google.gmail({ version: "v1", auth });

    let encodedEmail: string;

    if (args.attachments && args.attachments.length > 0) {
      // Validate attachments
      const { validateAttachments } = await import("./utils/fileValidation.js");
      const validation = validateAttachments(args.attachments);

      if (!validation.valid) {
        throw new Error(`Attachment validation failed: ${validation.errors.join(", ")}`);
      }

      // Build MIME message
      const { buildMimeMessage } = await import("./utils/mime.js");
      const mimeMessage = buildMimeMessage({
        to: args.to,
        subject: args.subject,
        body: args.body,
        cc: args.cc,
        bcc: args.bcc,
        attachments: args.attachments,
      });

      encodedEmail = Buffer.from(mimeMessage).toString("base64url");
    } else {
      // Original simple email (backward compatible)
      const email = [
        `To: ${args.to}`,
        args.cc ? `Cc: ${args.cc}` : "",
        args.bcc ? `Bcc: ${args.bcc}` : "",
        `Subject: ${args.subject}`,
        "",
        args.body,
      ]
        .filter(Boolean)
        .join("\n");

      encodedEmail = Buffer.from(email).toString("base64url");
    }

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedEmail },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              messageId: result.data.id,
              attachmentCount: args.attachments?.length || 0,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async gmailSearch(auth: OAuth2Client, args: any) {
    const gmail = google.gmail({ version: "v1", auth });

    const result = await gmail.users.messages.list({
      userId: "me",
      q: args.query,
      maxResults: args.maxResults || 10,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }

  private async gmailGetMessage(auth: OAuth2Client, args: any) {
    const gmail = google.gmail({ version: "v1", auth });

    const result = await gmail.users.messages.get({
      userId: "me",
      id: args.messageId,
      format: "full",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }

  private async gmailCreateDraft(auth: OAuth2Client, args: any) {
    const gmail = google.gmail({ version: "v1", auth });

    let encodedEmail: string;

    if (args.attachments && args.attachments.length > 0) {
      // Validate attachments
      const { validateAttachments } = await import("./utils/fileValidation.js");
      const validation = validateAttachments(args.attachments);

      if (!validation.valid) {
        throw new Error(`Attachment validation failed: ${validation.errors.join(", ")}`);
      }

      // Build MIME message
      const { buildMimeMessage } = await import("./utils/mime.js");
      const mimeMessage = buildMimeMessage({
        to: args.to,
        subject: args.subject,
        body: args.body,
        attachments: args.attachments,
      });

      encodedEmail = Buffer.from(mimeMessage).toString("base64url");
    } else {
      // Original simple email (backward compatible)
      const email = [`To: ${args.to}`, `Subject: ${args.subject}`, "", args.body].join("\n");
      encodedEmail = Buffer.from(email).toString("base64url");
    }

    const result = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: { raw: encodedEmail },
      },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              draftId: result.data.id,
              attachmentCount: args.attachments?.length || 0,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async gmailListLabels(auth: OAuth2Client) {
    const gmail = google.gmail({ version: "v1", auth });
    const result = await gmail.users.labels.list({ userId: "me" });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data.labels, null, 2),
        },
      ],
    };
  }

  private async gmailAddLabel(auth: OAuth2Client, args: any) {
    const gmail = google.gmail({ version: "v1", auth });

    await gmail.users.messages.modify({
      userId: "me",
      id: args.messageId,
      requestBody: {
        addLabelIds: [args.labelId],
      },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true }, null, 2),
        },
      ],
    };
  }

  private async gmailMarkRead(auth: OAuth2Client, args: any) {
    const gmail = google.gmail({ version: "v1", auth });

    await gmail.users.messages.modify({
      userId: "me",
      id: args.messageId,
      requestBody: {
        removeLabelIds: ["UNREAD"],
      },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true }, null, 2),
        },
      ],
    };
  }

  private async gmailArchive(auth: OAuth2Client, args: any) {
    const gmail = google.gmail({ version: "v1", auth });

    await gmail.users.messages.modify({
      userId: "me",
      id: args.messageId,
      requestBody: {
        removeLabelIds: ["INBOX"],
      },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true }, null, 2),
        },
      ],
    };
  }

  private async gmailGetAttachments(auth: OAuth2Client, args: any) {
    const gmail = google.gmail({ version: "v1", auth });

    // Get the full message
    const message = await gmail.users.messages.get({
      userId: "me",
      id: args.messageId,
      format: "full",
    });

    const attachments: any[] = [];

    // Recursive function to find all attachments in message parts
    const findAttachments = (parts: any[] | undefined) => {
      if (!parts) return;

      for (const part of parts) {
        // Check if this part is an attachment
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            attachmentId: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size,
          });
        }

        // Recursively check nested parts
        if (part.parts) {
          findAttachments(part.parts);
        }
      }
    };

    // Start searching from the message payload
    findAttachments(message.data.payload?.parts);

    // If the payload itself is an attachment (rare case)
    if (message.data.payload?.filename && message.data.payload?.body?.attachmentId) {
      attachments.push({
        attachmentId: message.data.payload.body.attachmentId,
        filename: message.data.payload.filename,
        mimeType: message.data.payload.mimeType,
        size: message.data.payload.body.size,
      });
    }

    // Fetch content if requested (default: true)
    if (args.includeContent !== false) {
      for (const attachment of attachments) {
        try {
          const result = await gmail.users.messages.attachments.get({
            userId: "me",
            messageId: args.messageId,
            id: attachment.attachmentId,
          });

          // Gmail returns base64url encoded data
          attachment.data = result.data.data;
          attachment.encoding = "base64url";
        } catch (e) {
          attachment.error = "Failed to fetch attachment content";
        }
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              messageId: args.messageId,
              attachmentCount: attachments.length,
              attachments,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async gmailSaveAttachmentToDrive(auth: OAuth2Client, args: any) {
    const gmail = google.gmail({ version: "v1", auth });
    const drive = google.drive({ version: "v3", auth });

    // First, get the attachment metadata to get the filename
    const message = await gmail.users.messages.get({
      userId: "me",
      id: args.messageId,
      format: "full",
    });

    // Find the specific attachment
    let attachmentFilename = "";
    let attachmentMimeType = "";

    const findAttachment = (parts: any[] | undefined): boolean => {
      if (!parts) return false;

      for (const part of parts) {
        if (part.body?.attachmentId === args.attachmentId) {
          attachmentFilename = part.filename;
          attachmentMimeType = part.mimeType;
          return true;
        }
        if (part.parts && findAttachment(part.parts)) {
          return true;
        }
      }
      return false;
    };

    findAttachment(message.data.payload?.parts);

    if (!attachmentFilename) {
      throw new Error(`Attachment ${args.attachmentId} not found in message ${args.messageId}`);
    }

    // Get the attachment content
    const attachmentData = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId: args.messageId,
      id: args.attachmentId,
    });

    // Convert base64url to base64 then to Buffer
    const base64Data = (attachmentData.data.data || "").replace(/-/g, "+").replace(/_/g, "/");
    const { base64ToBuffer } = await import("./utils/driveHelpers.js");
    const buffer = base64ToBuffer(base64Data);

    // Upload to Drive
    const filename = args.newFilename || attachmentFilename;
    const fileMetadata: any = {
      name: filename,
      parents: args.folderId ? [args.folderId] : undefined,
    };

    const media = {
      mimeType: attachmentMimeType,
      body: buffer,
    };

    const result = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name, webViewLink",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              messageId: args.messageId,
              attachmentId: args.attachmentId,
              driveFile: result.data,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // DRIVE TOOL IMPLEMENTATIONS
  private async driveListFiles(auth: OAuth2Client, args: any) {
    const drive = google.drive({ version: "v3", auth });

    let query = args.folderId ? `'${args.folderId}' in parents` : "";
    if (args.query) {
      query += query ? ` and ${args.query}` : args.query;
    }

    const result = await drive.files.list({
      q: query || undefined,
      pageSize: args.pageSize || 100,
      fields: "files(id, name, mimeType, createdTime, modifiedTime, size, webViewLink)",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data.files, null, 2),
        },
      ],
    };
  }

  private async driveCreateFolder(auth: OAuth2Client, args: any) {
    const drive = google.drive({ version: "v3", auth });

    const fileMetadata: any = {
      name: args.name,
      mimeType: "application/vnd.google-apps.folder",
    };

    if (args.parentId) {
      fileMetadata.parents = [args.parentId];
    }

    const result = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id, name, webViewLink",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }

  private async driveUploadFile(auth: OAuth2Client, args: any) {
    const drive = google.drive({ version: "v3", auth });

    const fileMetadata: any = {
      name: args.name,
      parents: args.folderId ? [args.folderId] : undefined,
    };

    // Determine encoding (default to base64 for binary files)
    const encoding = args.encoding || "base64";
    let body: Buffer | string;

    if (encoding === "base64") {
      // Convert base64 to Buffer for binary file upload
      const { base64ToBuffer } = await import("./utils/driveHelpers.js");
      body = base64ToBuffer(args.content);
    } else {
      // Use content directly for text files
      body = args.content;
    }

    const media = {
      mimeType: args.mimeType,
      body: body,
    };

    const result = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name, webViewLink",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }

  private async driveGetFile(auth: OAuth2Client, args: any) {
    const drive = google.drive({ version: "v3", auth });

    const result = await drive.files.get({
      fileId: args.fileId,
      fields: "id, name, mimeType, createdTime, modifiedTime, size, webViewLink",
    });

    const content = result.data;

    if (args.includeContent !== false) {
      try {
        const { bufferToBase64, isBinaryMimeType } = await import("./utils/driveHelpers.js");

        // Determine if file is binary based on MIME type
        const isBinary = isBinaryMimeType(result.data.mimeType || "");

        const fileContent = await drive.files.get(
          {
            fileId: args.fileId,
            alt: "media",
          },
          { responseType: isBinary ? "arraybuffer" : "text" }
        );

        if (isBinary) {
          // Convert binary data to base64
          (content as any).contentBase64 = bufferToBase64(
            Buffer.from(fileContent.data as ArrayBuffer)
          );
          (content as any).encoding = "base64";
        } else {
          // Keep text data as-is
          (content as any).content = fileContent.data;
          (content as any).encoding = "text";
        }
      } catch (e) {
        (content as any).contentError = "Unable to fetch content";
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(content, null, 2),
        },
      ],
    };
  }

  private async driveDeleteFile(auth: OAuth2Client, args: any) {
    const drive = google.drive({ version: "v3", auth });
    await drive.files.delete({ fileId: args.fileId });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true }, null, 2),
        },
      ],
    };
  }

  private async driveShareFile(auth: OAuth2Client, args: any) {
    const drive = google.drive({ version: "v3", auth });

    const permission = {
      type: "user",
      role: args.role,
      emailAddress: args.email,
    };

    await drive.permissions.create({
      fileId: args.fileId,
      requestBody: permission,
      sendNotificationEmail: args.sendNotification !== false,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true }, null, 2),
        },
      ],
    };
  }

  private async driveGetPermissions(auth: OAuth2Client, args: any) {
    const drive = google.drive({ version: "v3", auth });

    const result = await drive.permissions.list({
      fileId: args.fileId,
      fields: "permissions(id, type, emailAddress, role)",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data.permissions, null, 2),
        },
      ],
    };
  }

  private async driveCopyFile(auth: OAuth2Client, args: any) {
    const drive = google.drive({ version: "v3", auth });

    const result = await drive.files.copy({
      fileId: args.fileId,
      requestBody: {
        name: args.name,
        parents: args.folderId ? [args.folderId] : undefined,
      },
      fields: "id, name, webViewLink",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }

  private async driveMoveFile(auth: OAuth2Client, args: any) {
    const drive = google.drive({ version: "v3", auth });

    // Get current parents
    const file = await drive.files.get({
      fileId: args.fileId,
      fields: "parents",
    });

    const previousParents = file.data.parents?.join(",");

    const result = await drive.files.update({
      fileId: args.fileId,
      addParents: args.newParentId,
      removeParents: previousParents,
      fields: "id, name, webViewLink",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }

  private async driveSearchContent(auth: OAuth2Client, args: any) {
    const drive = google.drive({ version: "v3", auth });

    let query = `fullText contains '${args.searchText}'`;
    if (args.mimeType) {
      query += ` and mimeType='${args.mimeType}'`;
    }

    const result = await drive.files.list({
      q: query,
      pageSize: 20,
      fields: "files(id, name, mimeType, modifiedTime, webViewLink)",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data.files, null, 2),
        },
      ],
    };
  }

  // SHEETS TOOL IMPLEMENTATIONS
  private async sheetsCreate(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });

    const requestBody: any = {
      properties: {
        title: args.title,
      },
    };

    if (args.sheetNames && args.sheetNames.length > 0) {
      requestBody.sheets = args.sheetNames.map((name: string) => ({
        properties: { title: name },
      }));
    }

    const result = await sheets.spreadsheets.create({
      requestBody,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              spreadsheetId: result.data.spreadsheetId,
              spreadsheetUrl: result.data.spreadsheetUrl,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async sheetsRead(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: args.spreadsheetId,
      range: args.range,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data.values, null, 2),
        },
      ],
    };
  }

  private async sheetsWrite(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.update({
      spreadsheetId: args.spreadsheetId,
      range: args.range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: args.values,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true }, null, 2),
        },
      ],
    };
  }

  private async sheetsAppend(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });

    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: args.spreadsheetId,
      range: args.range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: args.values,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data.updates, null, 2),
        },
      ],
    };
  }

  private async sheetsFormat(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });

    const requests: any[] = [];

    if (args.bold !== undefined || args.backgroundColor) {
      const format: any = {};

      if (args.bold !== undefined) {
        format.textFormat = { bold: args.bold };
      }

      if (args.backgroundColor) {
        format.backgroundColor = args.backgroundColor;
      }

      requests.push({
        repeatCell: {
          range: {
            sheetId: args.sheetId,
            startRowIndex: args.startRow,
            endRowIndex: args.endRow,
            startColumnIndex: args.startColumn,
            endColumnIndex: args.endColumn,
          },
          cell: {
            userEnteredFormat: format,
          },
          fields: args.bold
            ? "userEnteredFormat(textFormat,backgroundColor)"
            : "userEnteredFormat.backgroundColor",
        },
      });
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: args.spreadsheetId,
      requestBody: { requests },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true }, null, 2),
        },
      ],
    };
  }

  private async sheetsCreateSheet(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });

    const result = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: args.spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: args.title,
              },
            },
          },
        ],
      },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data.replies, null, 2),
        },
      ],
    };
  }

  private async sheetsGetInfo(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });

    const result = await sheets.spreadsheets.get({
      spreadsheetId: args.spreadsheetId,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              spreadsheetId: result.data.spreadsheetId,
              title: result.data.properties?.title,
              sheets: result.data.sheets?.map((s) => ({
                sheetId: s.properties?.sheetId,
                title: s.properties?.title,
                index: s.properties?.index,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async sheetsBatchUpdate(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });

    const result = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: args.spreadsheetId,
      requestBody: {
        requests: args.requests,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }

  // DOCS TOOL IMPLEMENTATIONS
  private async docsCreate(auth: OAuth2Client, args: any) {
    const docs = google.docs({ version: "v1", auth });

    const result = await docs.documents.create({
      requestBody: {
        title: args.title,
      },
    });

    if (args.content) {
      await docs.documents.batchUpdate({
        documentId: result.data.documentId!,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: args.content,
              },
            },
          ],
        },
      });
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              documentId: result.data.documentId,
              title: result.data.title,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async docsRead(auth: OAuth2Client, args: any) {
    const docs = google.docs({ version: "v1", auth });

    const result = await docs.documents.get({
      documentId: args.documentId,
    });

    // Extract text content
    let content = "";
    result.data.body?.content?.forEach((element: any) => {
      if (element.paragraph) {
        element.paragraph.elements?.forEach((el: any) => {
          if (el.textRun) {
            content += el.textRun.content;
          }
        });
      }
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              title: result.data.title,
              content: content,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async docsAppend(auth: OAuth2Client, args: any) {
    const docs = google.docs({ version: "v1", auth });

    // Get document to find end index
    const doc = await docs.documents.get({
      documentId: args.documentId,
    });

    const endIndex = doc.data.body?.content?.[doc.data.body.content.length - 1]?.endIndex || 1;

    await docs.documents.batchUpdate({
      documentId: args.documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: endIndex - 1 },
              text: args.text,
            },
          },
        ],
      },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true }, null, 2),
        },
      ],
    };
  }

  private async docsBatchUpdate(auth: OAuth2Client, args: any) {
    const docs = google.docs({ version: "v1", auth });

    const result = await docs.documents.batchUpdate({
      documentId: args.documentId,
      requestBody: {
        requests: args.requests,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }

  // CALENDAR TOOL IMPLEMENTATIONS
  private async calendarCreateEvent(auth: OAuth2Client, args: any) {
    const calendar = google.calendar({ version: "v3", auth });

    const event: any = {
      summary: args.summary,
      description: args.description,
      location: args.location,
      start: {
        dateTime: args.startDateTime,
        timeZone: "America/New_York",
      },
      end: {
        dateTime: args.endDateTime,
        timeZone: "America/New_York",
      },
    };

    if (args.attendees && args.attendees.length > 0) {
      event.attendees = args.attendees.map((email: string) => ({ email }));
    }

    const result = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              eventId: result.data.id,
              htmlLink: result.data.htmlLink,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async calendarListEvents(auth: OAuth2Client, args: any) {
    const calendar = google.calendar({ version: "v3", auth });

    const result = await calendar.events.list({
      calendarId: "primary",
      timeMin: args.timeMin || new Date().toISOString(),
      timeMax: args.timeMax,
      maxResults: args.maxResults || 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data.items, null, 2),
        },
      ],
    };
  }

  private async calendarUpdateEvent(auth: OAuth2Client, args: any) {
    const calendar = google.calendar({ version: "v3", auth });

    const event: any = {};
    if (args.summary) event.summary = args.summary;
    if (args.description) event.description = args.description;
    if (args.startDateTime) {
      event.start = {
        dateTime: args.startDateTime,
        timeZone: "America/New_York",
      };
    }
    if (args.endDateTime) {
      event.end = {
        dateTime: args.endDateTime,
        timeZone: "America/New_York",
      };
    }

    const result = await calendar.events.patch({
      calendarId: "primary",
      eventId: args.eventId,
      requestBody: event,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, eventId: result.data.id }, null, 2),
        },
      ],
    };
  }

  private async calendarDeleteEvent(auth: OAuth2Client, args: any) {
    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.delete({
      calendarId: "primary",
      eventId: args.eventId,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true }, null, 2),
        },
      ],
    };
  }

  private async calendarFindSlots(auth: OAuth2Client, args: any) {
    const calendar = google.calendar({ version: "v3", auth });

    const now = new Date();
    const daysAhead = args.daysAhead || 7;
    const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const events = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    // Simple slot finder - looks for gaps
    const slots: any[] = [];
    const duration = args.durationMinutes;

    // This is simplified - in production, you'd want more sophisticated logic
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              message:
                "Use existing events to find gaps manually or implement sophisticated slot finding",
              events: events.data.items,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // TASKS TOOL IMPLEMENTATIONS
  private async tasksCreate(auth: OAuth2Client, args: any) {
    const tasks = google.tasks({ version: "v1", auth });

    const listId = args.listId || "@default";

    const task: any = {
      title: args.title,
      notes: args.notes,
      due: args.due,
    };

    const result = await tasks.tasks.insert({
      tasklist: listId,
      requestBody: task,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }

  private async tasksList(auth: OAuth2Client, args: any) {
    const tasks = google.tasks({ version: "v1", auth });

    const listId = args.listId || "@default";

    const result = await tasks.tasks.list({
      tasklist: listId,
      showCompleted: args.showCompleted || false,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data.items, null, 2),
        },
      ],
    };
  }

  private async tasksUpdate(auth: OAuth2Client, args: any) {
    const tasks = google.tasks({ version: "v1", auth });

    const listId = args.listId || "@default";

    const task: any = {};
    if (args.title) task.title = args.title;
    if (args.notes) task.notes = args.notes;
    if (args.status) task.status = args.status;

    const result = await tasks.tasks.patch({
      tasklist: listId,
      task: args.taskId,
      requestBody: task,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }

  private async tasksListAll(auth: OAuth2Client) {
    const tasks = google.tasks({ version: "v1", auth });

    const result = await tasks.tasklists.list();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data.items, null, 2),
        },
      ],
    };
  }

  // PARA IMPLEMENTATIONS
  private async paraSetupStructure(auth: OAuth2Client, args: any) {
    const result = await PARA.setupPARAStructure(
      auth,
      args.parentFolderId,
      args.includeSubfolders !== false
    );

    return {
      content: [
        {
          type: "text",
          text: `PARA folder structure created successfully!\n\nRoot folder ID: ${result.rootId}\nView at: https://drive.google.com/drive/folders/${result.rootId}\n\nStructure:\n- Projects: ${result.projectsId}\n- Areas: ${result.areasId}\n- Resources: ${result.resourcesId}\n- Archives: ${result.archivesId}`,
        },
      ],
    };
  }

  private async paraCategorizeFile(auth: OAuth2Client, args: any) {
    const result = await PARA.categorizeFile(auth, args.fileId, {
      forceRecategorize: args.forceRecategorize || false,
      applyToFolder: args.applyToFolder !== false,
      createShortcut: args.createShortcut !== false,
    });

    return {
      content: [
        {
          type: "text",
          text: `File categorized successfully!\n\nCategory: ${result.category}\nConfidence: ${result.confidence}\nActionability: ${result.actionability}\nReasoning: ${result.reasoning}\nTags: ${result.suggestedTags.join(", ")}${result.suggestedProject ? `\nProject: ${result.suggestedProject}` : ""}`,
        },
      ],
    };
  }

  private async paraBatchCategorize(auth: OAuth2Client, args: any) {
    let results: Map<string, any>;

    if (args.folderId) {
      results = await PARA.categorizeFolderFiles(auth, args.folderId, {
        maxFiles: args.maxFiles || 50,
        forceRecategorize: args.forceRecategorize || false,
      });
    } else if (args.fileIds) {
      results = await PARA.batchCategorizeFiles(auth, args.fileIds, {
        forceRecategorize: args.forceRecategorize || false,
      });
    } else {
      throw new Error("Either fileIds or folderId must be provided");
    }

    const summary: Record<string, number> = {
      PROJECT: 0,
      AREA: 0,
      RESOURCE: 0,
      ARCHIVE: 0,
    };

    for (const result of results.values()) {
      summary[result.category]++;
    }

    return {
      content: [
        {
          type: "text",
          text: `Batch categorization complete!\n\nProcessed: ${results.size} files\n\nBreakdown:\n- Projects: ${summary.PROJECT}\n- Areas: ${summary.AREA}\n- Resources: ${summary.RESOURCE}\n- Archives: ${summary.ARCHIVE}`,
        },
      ],
    };
  }

  private async paraSearch(auth: OAuth2Client, args: any) {
    const criteria: any = {};

    if (args.category) criteria.category = args.category;
    if (args.actionability) criteria.actionability = args.actionability;
    if (args.tags) criteria.tags = args.tags;
    if (args.domain) criteria.domain = args.domain;
    if (args.needsReview !== undefined)
      criteria.needsReview = args.needsReview;
    if (args.projectName) criteria.projectName = args.projectName;
    if (args.maxResults) criteria.maxResults = args.maxResults;

    const results = await PARA.search(auth, criteria);

    const filesList = results
      .map(
        (r) =>
          `- ${r.file.name} (${r.file.mimeType})\n  Link: ${r.file.webViewLink || "N/A"}\n  Match: ${r.matchReason}`
      )
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${results.length} files matching criteria:\n\n${filesList || "No files found"}`,
        },
      ],
    };
  }

  private async paraAutoArchive(auth: OAuth2Client, args: any) {
    if (args.scanForCompletedProjects) {
      const candidates = await PARA.findArchivalCandidates(auth);

      const candidatesList = candidates
        .map(
          (c) =>
            `- ${c.fileName}\n  Reason: ${c.reason}\n  Confidence: ${c.confidence}${c.needsConfirmation ? " (needs confirmation)" : ""}`
        )
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${candidates.length} archival candidates:\n\n${candidatesList}`,
          },
        ],
      };
    } else if (args.fileId) {
      const result = await PARA.archiveProject(auth, args.fileId, {
        reason: args.archiveReason,
        completionDate: args.completionDate,
      });

      return {
        content: [
          {
            type: "text",
            text: `Project archived successfully!\n\nFile: ${result.fileName}\nArchive Location: ${result.archiveFolderPath}\nArchive Date: ${result.archiveDate}`,
          },
        ],
      };
    } else {
      throw new Error(
        "Either fileId or scanForCompletedProjects must be provided"
      );
    }
  }

  private async paraReviewPrompt(auth: OAuth2Client, args: any) {
    const result = await PARA.generateReviewPrompt(auth, {
      scanScope: args.scanScope || "all",
      staleDays: args.staleDays || 90,
    });

    if (args.sendNotification && args.emailTo) {
      await PARA.sendReviewEmail(auth, args.emailTo, result);
      return {
        content: [
          {
            type: "text",
            text: `Review notification sent to ${args.emailTo}\n\n${result.summary.totalItems} items need review`,
          },
        ],
      };
    }

    const itemsList = result.items
      .slice(0, 20)
      .map(
        (item) =>
          `- ${item.file.name}\n  Issue: ${item.issueDetails}\n  Action: ${item.suggestedAction}\n  Priority: ${item.priority}`
      )
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `PARA Review Items:\n\nTotal: ${result.summary.totalItems}\nHigh Priority: ${result.summary.highPriority}\nMedium Priority: ${result.summary.mediumPriority}\nLow Priority: ${result.summary.lowPriority}\nEstimated Time: ${result.summary.estimatedReviewTime}\n\nTop items:\n\n${itemsList}${result.items.length > 20 ? `\n\n... and ${result.items.length - 20} more items` : ""}`,
        },
      ],
    };
  }

  private async paraCreateDashboard(auth: OAuth2Client, args: any) {
    const result = await PARA.createDashboard(auth, args.folderId);

    return {
      content: [
        {
          type: "text",
          text: `PARA Dashboard created successfully!\n\nSpreadsheet ID: ${result.spreadsheetId}\nView at: ${result.url}\n\nThe dashboard includes:\n- Overview with summary metrics\n- Projects tracking\n- Areas management\n- Resources catalog\n- Archives log\n- Review queue\n- Categorization log`,
        },
      ],
    };
  }

  private async paraUpdateCategory(auth: OAuth2Client, args: any) {
    const metadata: any = {
      para_category: args.category,
      para_reviewed_date: new Date().toISOString(),
    };

    if (args.metadata) {
      Object.assign(metadata, args.metadata);
    }

    await PARA.updateFileMetadata(auth, args.fileId, metadata);

    if (args.createShortcut !== false) {
      const drive = google.drive({ version: "v3", auth });
      const file = await drive.files.get({
        fileId: args.fileId,
        fields: "name",
      });

      await PARA.createShortcutInPARAFolder(
        auth,
        args.fileId,
        file.data.name!,
        args.category,
        undefined
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `File category updated successfully!\n\nNew category: ${args.category}${args.createShortcut !== false ? "\nShortcut created in PARA folder" : ""}`,
        },
      ],
    };
  }

  // PMO IMPLEMENTATIONS (Phase 1: 3 tools)
  private async pmoReadDeliverables(auth: OAuth2Client, args: any) {
    const spreadsheetId = args.spreadsheetId || process.env.PMO_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error(
        "PMO_SPREADSHEET_ID not found. Please set it in .env or pass spreadsheetId parameter."
      );
    }

    const deliverables = await PMO.readDeliverables(auth, spreadsheetId, {
      statusFilter: args.status_filter,
      priorityFilter: args.priority_filter,
    });

    // Format output
    let output = `📋 **PMO Deliverables** (${deliverables.length} found)\n\n`;

    if (deliverables.length === 0) {
      output += "No deliverables found matching the filters.\n";
    } else {
      deliverables.forEach((d) => {
        output += `**${d.id}: ${d.name}**\n`;
        output += `├─ WBS: ${d.wbs}\n`;
        output += `├─ Status: ${d.status}\n`;
        output += `├─ Priority: ${d.priority}\n`;
        output += `├─ Quality: ${d.quality}%\n`;
        output += `├─ Week: ${d.week}\n`;
        output += `├─ Responsible: ${d.responsible}\n`;
        output += `└─ Budget: $${d.budget.toLocaleString()}\n\n`;
      });

      // Summary statistics
      const statusCounts = deliverables.reduce(
        (acc, d) => {
          acc[d.status] = (acc[d.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      output += `\n**Summary:**\n`;
      Object.entries(statusCounts).forEach(([status, count]) => {
        output += `- ${status}: ${count}\n`;
      });
    }

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  }

  private async pmoUpdateDeliverable(auth: OAuth2Client, args: any) {
    const spreadsheetId = args.spreadsheetId || process.env.PMO_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error(
        "PMO_SPREADSHEET_ID not found. Please set it in .env or pass spreadsheetId parameter."
      );
    }

    const updates: any = {};
    if (args.status) updates.status = args.status;
    if (args.quality_score !== undefined)
      updates.qualityScore = args.quality_score;
    if (args.actual_hours !== undefined)
      updates.actualHours = args.actual_hours;
    if (args.notes) updates.notes = args.notes;

    await PMO.updateDeliverable(
      auth,
      spreadsheetId,
      args.deliverable_id,
      updates
    );

    let output = `✅ **Deliverable ${args.deliverable_id} Updated Successfully**\n\n`;
    output += `Updated fields:\n`;
    if (args.status) output += `- Status: ${args.status}\n`;
    if (args.quality_score !== undefined)
      output += `- Quality Score: ${args.quality_score}%\n`;
    if (args.actual_hours !== undefined)
      output += `- Actual Hours: ${args.actual_hours}\n`;
    if (args.notes) output += `- Notes: ${args.notes}\n`;

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  }

  private async pmoReadRisks(auth: OAuth2Client, args: any) {
    const spreadsheetId = args.spreadsheetId || process.env.PMO_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error(
        "PMO_SPREADSHEET_ID not found. Please set it in .env or pass spreadsheetId parameter."
      );
    }

    const risks = await PMO.readRisks(auth, spreadsheetId, {
      statusFilter: args.status_filter,
      minScore: args.min_score,
    });

    // Format output
    let output = `⚠️ **PMO Risk Register** (${risks.length} risks found)\n\n`;

    if (risks.length === 0) {
      output += "No risks found matching the filters.\n";
    } else {
      // Group risks by severity
      const critical = risks.filter((r) => r.score > 15);
      const high = risks.filter((r) => r.score >= 12 && r.score <= 15);
      const medium = risks.filter((r) => r.score >= 8 && r.score < 12);
      const low = risks.filter((r) => r.score < 8);

      if (critical.length > 0) {
        output += `🔴 **CRITICAL RISKS** (${critical.length}):\n`;
        critical.forEach((r) => {
          output += `**${r.id}: ${r.name}**\n`;
          output += `├─ Category: ${r.category}\n`;
          output += `├─ Score: ${r.score} (P:${r.probability} × I:${r.impact})\n`;
          output += `├─ Status: ${r.status}\n`;
          output += `├─ Owner: ${r.owner}\n`;
          output += `├─ Mitigation: ${r.mitigation}%\n`;
          output += `└─ Response: ${r.response}\n\n`;
        });
      }

      if (high.length > 0) {
        output += `🟠 **HIGH RISKS** (${high.length}):\n`;
        high.forEach((r) => {
          output += `**${r.id}: ${r.name}** | Score: ${r.score} | Mitigation: ${r.mitigation}%\n`;
        });
        output += `\n`;
      }

      if (medium.length > 0) {
        output += `🟡 **MEDIUM RISKS** (${medium.length}):\n`;
        medium.forEach((r) => {
          output += `${r.id}: ${r.name} (Score: ${r.score})\n`;
        });
        output += `\n`;
      }

      if (low.length > 0) {
        output += `🟢 **LOW RISKS** (${low.length})\n`;
      }

      // Summary statistics
      output += `\n**Summary:**\n`;
      output += `- Total Risks: ${risks.length}\n`;
      output += `- Critical (>15): ${critical.length}\n`;
      output += `- High (12-15): ${high.length}\n`;
      output += `- Medium (8-11): ${medium.length}\n`;
      output += `- Low (<8): ${low.length}\n`;
      output += `- Active: ${risks.filter((r) => r.status === "active").length}\n`;
      output += `- Closed: ${risks.filter((r) => r.status === "closed").length}\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  }

  // PMO PROPOSAL PROCESSING IMPLEMENTATIONS

  private async pmoAnalyzeProposal(auth: OAuth2Client, args: any) {
    const { fileId, projectName } = args;

    if (!fileId) {
      throw new Error("fileId is required");
    }

    try {
      // Analyze the proposal
      const analysis = await PMO.analyzeProposal(auth, fileId, projectName);

      // Create session
      const sessionId = PMO.createSession(analysis);

      // Format output
      let output = `✅ **Proposal Analysis Complete**\n\n`;
      output += `📄 **Document:** ${analysis.documentInfo.fileName}\n`;
      output += `🔑 **Session ID:** \`${sessionId}\`\n\n`;
      output += `**Project Metadata:**\n`;
      output += `├─ Name: ${analysis.projectMetadata.projectName}\n`;
      output += `├─ Objective: ${analysis.projectMetadata.projectObjective}\n`;
      output += `├─ Duration: ${analysis.projectMetadata.estimatedDuration || "Not specified"}\n`;
      output += `├─ Budget: ${analysis.projectMetadata.totalBudget ? "$" + analysis.projectMetadata.totalBudget.toLocaleString() : "Not specified"}\n`;
      output += `└─ Confidence: ${Math.round(analysis.projectMetadata.confidence * 100)}%\n\n`;

      output += `📦 **Extracted Items:**\n`;
      output += `├─ Deliverables: ${analysis.deliverables.length}\n`;
      output += `├─ Risks: ${analysis.risks.length}\n`;
      output += `└─ Stakeholders: ${analysis.stakeholders.length}\n\n`;

      // Show sample deliverables (top 5)
      if (analysis.deliverables.length > 0) {
        output += `**Sample Deliverables:**\n`;
        analysis.deliverables.slice(0, 5).forEach((d) => {
          output += `├─ ${d.wbs || "?"} ${d.name} (${d.priority}, Week ${d.week || "?"}, ${Math.round(d.confidence * 100)}% conf)\n`;
        });
        if (analysis.deliverables.length > 5) {
          output += `└─ ... and ${analysis.deliverables.length - 5} more\n`;
        }
        output += `\n`;
      }

      // Show critical risks
      const criticalRisks = analysis.risks.filter(
        (r) => (r.estimatedProbability || 0) * (r.estimatedImpact || 0) > 15
      );
      if (criticalRisks.length > 0) {
        output += `🔴 **Critical Risks:**\n`;
        criticalRisks.forEach((r) => {
          output += `├─ ${r.name} (P:${r.estimatedProbability} × I:${r.estimatedImpact} = ${(r.estimatedProbability || 0) * (r.estimatedImpact || 0)})\n`;
        });
        output += `\n`;
      }

      // Show key stakeholders
      const keyStakeholders = analysis.stakeholders.filter(
        (s) => (s.influence || 0) >= 4 || (s.interest || 0) >= 4
      );
      if (keyStakeholders.length > 0) {
        output += `👥 **Key Stakeholders:**\n`;
        keyStakeholders.slice(0, 5).forEach((s) => {
          output += `├─ ${s.name} (${s.role}) - Influence: ${s.influence || "?"}, Interest: ${s.interest || "?"}\n`;
        });
        output += `\n`;
      }

      // Show clarifications needed
      const totalClarifications =
        analysis.clarificationNeeded.scope.length +
        analysis.clarificationNeeded.risks.length +
        analysis.clarificationNeeded.stakeholders.length +
        analysis.clarificationNeeded.resources.length;

      if (totalClarifications > 0) {
        output += `❓ **Clarifications Recommended:** ${totalClarifications} questions\n`;
        output += `Use \`pmo_ask_clarifications\` with session ID: \`${sessionId}\`\n\n`;
      }

      output += `**Next Steps:**\n`;
      output += `1. Review the analysis above\n`;
      output += `2. Call \`pmo_ask_clarifications\` to see recommended questions\n`;
      output += `3. Answer questions with \`pmo_apply_answers\` to refine analysis\n`;
      output += `4. Create PMO items with \`pmo_create_from_proposal\`\n`;

      return {
        content: [{ type: "text", text: output }],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to analyze proposal: ${errorMsg}`);
    }
  }

  private async pmoAskClarifications(auth: OAuth2Client, args: any) {
    const { sessionId } = args;

    if (!sessionId) {
      throw new Error("sessionId is required");
    }

    const session = PMO.getSession(sessionId);

    if (!session) {
      throw new Error(
        `Session ${sessionId} not found or expired. Please re-run pmo_analyze_proposal.`
      );
    }

    // Generate clarification questions
    const questions = PMO.generateClarifications(session.analysis);

    // Format output
    let output = `❓ **Clarification Questions** (Session: \`${sessionId}\`)\n\n`;

    if (questions.length === 0) {
      output += `✅ No clarifications needed! The analysis is complete.\n\n`;
      output += `You can proceed to create PMO items with \`pmo_create_from_proposal\`.\n`;
    } else {
      output += `Found ${questions.length} questions to improve the analysis:\n\n`;

      // Group by category
      const byCategory: Record<string, typeof questions> = {};
      for (const q of questions) {
        if (!byCategory[q.category]) {
          byCategory[q.category] = [];
        }
        byCategory[q.category].push(q);
      }

      for (const [category, categoryQuestions] of Object.entries(byCategory)) {
        output += `**${category.toUpperCase()}:**\n`;
        categoryQuestions.forEach((q, i) => {
          const priority = q.priority === "high" ? "🔴" : q.priority === "medium" ? "🟡" : "🟢";
          output += `${i + 1}. ${priority} ${q.question}\n`;
        });
        output += `\n`;
      }

      output += `**To answer these questions:**\n`;
      output += `Call \`pmo_apply_answers\` with session ID and your answers in this format:\n`;
      output += `\`\`\`json\n`;
      output += `{\n`;
      output += `  "sessionId": "${sessionId}",\n`;
      output += `  "answers": [\n`;
      output += `    {"question": "First question?", "answer": "Your answer"},\n`;
      output += `    {"question": "Second question?", "answer": "Your answer"}\n`;
      output += `  ]\n`;
      output += `}\n`;
      output += `\`\`\`\n`;
    }

    return {
      content: [{ type: "text", text: output }],
    };
  }

  private async pmoApplyAnswers(auth: OAuth2Client, args: any) {
    const { sessionId, answers } = args;

    if (!sessionId) {
      throw new Error("sessionId is required");
    }

    if (!answers || !Array.isArray(answers)) {
      throw new Error("answers must be an array of question-answer pairs");
    }

    const session = PMO.getSession(sessionId);

    if (!session) {
      throw new Error(
        `Session ${sessionId} not found or expired. Please re-run pmo_analyze_proposal.`
      );
    }

    try {
      // Convert answers array to record
      const answersRecord: Record<string, string> = {};
      for (const item of answers) {
        answersRecord[item.question] = item.answer;
      }

      // Apply answers and refine analysis
      const refinedAnalysis = await PMO.applyAnswersToAnalysis(
        auth,
        session,
        answersRecord
      );

      // Add sessionId to refined analysis
      const refinedAnalysisWithId: any = {
        ...refinedAnalysis,
        sessionId,
      };

      // Update session
      PMO.updateSession(sessionId, {
        refinedData: refinedAnalysisWithId,
        answers: answersRecord,
      });

      // Calculate changes
      const originalCount = {
        deliverables: session.analysis.deliverables.length,
        risks: session.analysis.risks.length,
        stakeholders: session.analysis.stakeholders.length,
      };

      const refinedCount = {
        deliverables: refinedAnalysis.deliverables.length,
        risks: refinedAnalysis.risks.length,
        stakeholders: refinedAnalysis.stakeholders.length,
      };

      // Format output
      let output = `✅ **Analysis Refined** (Session: \`${sessionId}\`)\n\n`;
      output += `Applied ${answers.length} answer(s) to improve the analysis.\n\n`;

      output += `**Changes:**\n`;
      output += `├─ Deliverables: ${originalCount.deliverables} → ${refinedCount.deliverables} (${refinedCount.deliverables >= originalCount.deliverables ? "+" : ""}${refinedCount.deliverables - originalCount.deliverables})\n`;
      output += `├─ Risks: ${originalCount.risks} → ${refinedCount.risks} (${refinedCount.risks >= originalCount.risks ? "+" : ""}${refinedCount.risks - originalCount.risks})\n`;
      output += `└─ Stakeholders: ${originalCount.stakeholders} → ${refinedCount.stakeholders} (${refinedCount.stakeholders >= originalCount.stakeholders ? "+" : ""}${refinedCount.stakeholders - originalCount.stakeholders})\n\n`;

      output += `**Next Steps:**\n`;
      output += `1. Review the refined analysis\n`;
      output += `2. Call \`pmo_ask_clarifications\` again if you want to provide more input\n`;
      output += `3. Call \`pmo_create_from_proposal\` to create PMO items in your spreadsheet\n`;

      return {
        content: [{ type: "text", text: output }],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to apply answers: ${errorMsg}`);
    }
  }

  private async pmoCreateFromProposal(auth: OAuth2Client, args: any) {
    const { sessionId, spreadsheetId: argSpreadsheetId, options } = args;

    if (!sessionId) {
      throw new Error("sessionId is required");
    }

    const session = PMO.getSession(sessionId);

    if (!session) {
      throw new Error(
        `Session ${sessionId} not found or expired. Please re-run pmo_analyze_proposal.`
      );
    }

    const spreadsheetId = argSpreadsheetId || process.env.PMO_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error(
        "PMO_SPREADSHEET_ID not found. Please set it in .env or pass spreadsheetId parameter."
      );
    }

    try {
      // Create PMO items
      const result = await PMO.createFullProposal(auth, spreadsheetId, session, options);

      // Get stats
      const stats = PMO.getProposalStats(session);

      // Format output
      let output = `✅ **PMO Items Created** (Session: \`${sessionId}\`)\n\n`;
      output += `${result.summary}\n\n`;

      if (result.created.deliverables.length > 0) {
        output += `📦 **Deliverables Created:** ${result.created.deliverables.join(", ")}\n`;
      }

      if (result.created.risks.length > 0) {
        output += `⚠️  **Risks Created:** ${result.created.risks.join(", ")}\n`;
      }

      if (result.created.stakeholders.length > 0) {
        output += `👥 **Stakeholders Created:** ${result.created.stakeholders.join(", ")}\n`;
      }

      output += `\n**Statistics:**\n`;
      output += `├─ High-Priority Items: ${stats.highPriorityCount}\n`;
      output += `├─ Critical Risks: ${stats.criticalRiskCount}\n`;
      output += `└─ Estimated Budget: $${stats.totalBudget.toLocaleString()}\n\n`;

      if (result.errors && result.errors.length > 0) {
        output += `⚠️  **Warnings:**\n`;
        result.errors.forEach((e) => {
          output += `- ${e}\n`;
        });
        output += `\n`;
      }

      output += `📊 **View your PMO spreadsheet:**\n${result.spreadsheetUrl}\n\n`;
      output += `Session \`${sessionId}\` completed successfully.\n`;

      return {
        content: [{ type: "text", text: output }],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create PMO items: ${errorMsg}`);
    }
  }

  // DOCUMENT ORGANIZATION IMPLEMENTATIONS (Phase 3)

  /**
   * Submit a document for intelligent categorization and routing
   */
  private async documentSubmit(auth: OAuth2Client, args: any) {
    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.DOCUMENT_SPREADSHEET_ID;
    const rootFolderId = process.env.PROGRAM_ROOT_FOLDER_ID;

    if (!spreadsheetId) {
      throw new Error(
        "DOCUMENT_SPREADSHEET_ID not configured. Please set it in .env or run create-document-spreadsheet script."
      );
    }

    if (!rootFolderId) {
      throw new Error(
        "PROGRAM_ROOT_FOLDER_ID not configured. Please set it in .env with your Drive folder ID."
      );
    }

    const request: DocumentsDomain.DocumentRoutingRequest = {
      fileId: args.fileId,
      programId: args.programId,
      documentType: args.documentType,
      deliverableId: args.deliverableId,
      phase: args.phase,
      autoRoute: args.autoRoute !== false,
      forceCategorize: false,
    };

    const result = await DocumentsDomain.routeDocument(
      drive,
      sheets,
      request,
      spreadsheetId,
      rootFolderId
    );

    // Get file name from Drive
    const fileMetadata = await drive.files.get({
      fileId: args.fileId,
      fields: "name",
    });
    const fileName = fileMetadata.data.name || "Unknown";

    let output = `📄 **Document Submitted**\n\n`;
    output += `**Document ID:** ${result.docId}\n`;
    output += `**File:** ${fileName}\n`;
    output += `**Type:** ${result.categorization.documentType}\n`;
    if (result.categorization.category) {
      output += `**Category:** ${result.categorization.category}\n`;
    }
    if (result.categorization.phase) {
      output += `**Phase:** ${result.categorization.phase}\n`;
    }
    output += `**Confidence:** ${(result.categorization.confidence * 100).toFixed(1)}%\n`;
    output += `**Target Folder:** ${result.folderPath}\n`;
    output += `**Routed:** ${result.moved ? "✅ Yes" : "⏸️  Pending manual approval"}\n`;
    output += `**Registered:** ${result.registered ? "✅ Yes" : "❌ No"}\n`;

    if (result.categorization.keywords.length > 0) {
      output += `\n**Keywords:** ${result.categorization.keywords.join(", ")}\n`;
    }

    if (result.categorization.suggestedTags.length > 0) {
      output += `**Tags:** ${result.categorization.suggestedTags.join(", ")}\n`;
    }

    if (result.categorization.reasoning) {
      output += `\n**Reasoning:** ${result.categorization.reasoning}\n`;
    }

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Categorize a document without moving it
   */
  private async documentCategorize(auth: OAuth2Client, args: any) {
    const drive = google.drive({ version: "v3", auth });

    // Get file name from Drive
    const fileMetadata = await drive.files.get({
      fileId: args.fileId,
      fields: "name",
    });
    const fileName = fileMetadata.data.name || "Unknown";

    const result = await DocumentsDomain.categorizeDocument(
      drive,
      args.fileId,
      fileName,
      args.documentType
    );

    let output = `🔍 **Document Categorization**\n\n`;
    output += `**File:** ${fileName}\n`;
    output += `**Type:** ${result.documentType}\n`;
    if (result.category) {
      output += `**Category:** ${result.category}\n`;
    }
    if (result.phase) {
      output += `**Phase:** ${result.phase}\n`;
    }
    output += `**Confidence:** ${(result.confidence * 100).toFixed(1)}%\n`;

    if (result.keywords.length > 0) {
      output += `\n**Keywords:** ${result.keywords.join(", ")}\n`;
    }

    if (result.suggestedTags.length > 0) {
      output += `**Suggested Tags:** ${result.suggestedTags.join(", ")}\n`;
    }

    if (result.reasoning) {
      output += `\n**Analysis:**\n${result.reasoning}\n`;
    }

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Create PMI-standard folder structure for a program
   */
  private async documentCreateFolderStructure(auth: OAuth2Client, args: any) {
    const drive = google.drive({ version: "v3", auth });

    const rootFolderId =
      args.parentFolderId || process.env.PROGRAM_ROOT_FOLDER_ID;

    if (!rootFolderId) {
      throw new Error(
        "PROGRAM_ROOT_FOLDER_ID not configured. Please set it in .env or pass parentFolderId parameter."
      );
    }

    const request: DocumentsDomain.FolderCreationRequest = {
      programId: args.programId,
      templateId: args.template || "pmi",
      rootFolderId: rootFolderId,
    };

    const result = await DocumentsDomain.createProgramFolderStructure(
      drive,
      request
    );

    let output = `📁 **Folder Structure Created**\n\n`;
    output += `**Program:** ${args.programId}\n`;
    output += `**Root Folder:** ${result.rootFolderId}\n`;
    output += `**Structure:** ${args.template || "PMI PMBOK Standard"}\n`;
    output += `**Folders Created:** ${result.foldersCreated}\n\n`;

    output += `**Folder Hierarchy:**\n`;
    Object.entries(result.folderMapping).forEach(([path, id]) => {
      const depth = path.split("/").length - 1;
      const indent = "  ".repeat(depth);
      const name = path.split("/").pop();
      output += `${indent}├─ ${name}\n`;
    });

    output += `\n**View in Drive:**\nhttps://drive.google.com/drive/folders/${result.rootFolderId}\n`;

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Get document metadata
   */
  private async documentGetMetadata(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.DOCUMENT_SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error("DOCUMENT_SPREADSHEET_ID not configured in .env");
    }

    const doc = args.docId
      ? await DocumentsDomain.getDocumentById(sheets, spreadsheetId, args.docId)
      : await DocumentsDomain.getDocumentByFileId(sheets, spreadsheetId, args.fileId);

    if (!doc) {
      return {
        content: [
          {
            type: "text",
            text: `Document not found: ${args.docId || args.fileId}`,
          },
        ],
      };
    }

    let output = `📄 **Document Metadata**\n\n`;
    output += `**ID:** ${doc.docId}\n`;
    output += `**Title:** ${doc.title}\n`;
    output += `**Type:** ${doc.type}\n`;
    if (doc.category) output += `**Category:** ${doc.category}\n`;
    if (doc.phase) output += `**Phase:** ${doc.phase}\n`;
    output += `**Status:** ${doc.status}\n`;
    output += `**Owner:** ${doc.owner}\n`;
    output += `**Created:** ${doc.createdDate.toLocaleDateString()}\n`;
    output += `**Modified:** ${doc.modifiedDate.toLocaleDateString()}\n`;
    output += `**Version:** ${doc.version}\n`;

    if (doc.programId) output += `**Program:** ${doc.programId}\n`;
    if (doc.deliverableId)
      output += `**Deliverable:** ${doc.deliverableId}\n`;

    if (doc.tags.length > 0) {
      output += `\n**Tags:** ${doc.tags.join(", ")}\n`;
    }

    if (doc.categorization) {
      output += `\n**Categorization Confidence:** ${(doc.categorization.confidence * 100).toFixed(1)}%\n`;
    }

    output += `\n**Drive Link:**\nhttps://drive.google.com/file/d/${doc.driveFileId}\n`;

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Update document metadata
   */
  private async documentUpdateMetadata(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.DOCUMENT_SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error("DOCUMENT_SPREADSHEET_ID not configured in .env");
    }

    await DocumentsDomain.updateDocumentMetadata(
      sheets,
      spreadsheetId,
      args.docId,
      args.updates
    );

    let output = `✅ **Document Updated**\n\n`;
    output += `**Document ID:** ${args.docId}\n`;
    output += `**Updated Fields:**\n`;

    Object.entries(args.updates).forEach(([key, value]) => {
      output += `  - ${key}: ${value}\n`;
    });

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Search documents
   */
  private async documentSearch(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.DOCUMENT_SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error("DOCUMENT_SPREADSHEET_ID not configured in .env");
    }

    const criteria: DocumentsDomain.DocumentSearchCriteria = {
      query: args.query,
      programId: args.programId,
      documentType: args.documentType,
      status: args.status,
      phase: args.phase,
      tags: args.tags,
      owner: args.owner,
      deliverableId: args.deliverableId,
      limit: args.limit || 50,
      offset: args.offset || 0,
    };

    const result = await DocumentsDomain.advancedSearch(
      sheets,
      spreadsheetId,
      criteria
    );

    let output = `🔍 **Document Search Results**\n\n`;
    output += `**Query:** ${args.query || "(all documents)"}\n`;
    output += `**Found:** ${result.totalCount} documents\n`;
    output += `**Showing:** ${result.results.length} results\n`;
    output += `**Search Time:** ${result.searchTimeMs}ms\n\n`;

    if (result.results.length === 0) {
      output += "No documents found matching criteria.\n";
    } else {
      result.results.forEach((r, i) => {
        output += `${i + 1}. **${r.document.title}**\n`;
        output += `   ID: ${r.document.docId} | Type: ${r.document.type} | Status: ${r.document.status}\n`;
        output += `   Score: ${r.score.toFixed(1)} | Modified: ${r.document.modifiedDate.toLocaleDateString()}\n`;
        if (r.highlights && r.highlights.length > 0) {
          output += `   Matches: ${r.highlights.join(", ")}\n`;
        }
        output += `\n`;
      });
    }

    if (result.hasMore) {
      output += `\n_More results available. Use offset=${(args.offset || 0) + result.pageSize} to see next page._\n`;
    }

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Create document from template
   */
  private async documentCreateFromTemplate(auth: OAuth2Client, args: any) {
    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.DOCUMENT_SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error("DOCUMENT_SPREADSHEET_ID not configured in .env");
    }

    const fileId = await DocumentsDomain.createFromTemplate(
      drive,
      sheets,
      spreadsheetId,
      args.templateId,
      args.targetFolderId,
      args.fileName,
      args.variables || {}
    );

    let output = `✅ **Document Created from Template**\n\n`;
    output += `**Template:** ${args.templateId}\n`;
    output += `**File Name:** ${args.fileName}\n`;
    output += `**Drive File ID:** ${fileId}\n\n`;
    output += `**View Document:**\nhttps://drive.google.com/file/d/${fileId}\n`;

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * List available templates
   */
  private async documentListTemplates(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.DOCUMENT_SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error("DOCUMENT_SPREADSHEET_ID not configured in .env");
    }

    const templates = await DocumentsDomain.listTemplates(
      sheets,
      spreadsheetId,
      args.documentType,
      args.category
    );

    let output = `📋 **Document Templates**\n\n`;
    output += `**Found:** ${templates.length} templates\n\n`;

    if (templates.length === 0) {
      output += "No templates found matching criteria.\n";
    } else {
      templates.forEach((t, i) => {
        output += `${i + 1}. **${t.name}**\n`;
        output += `   ID: ${t.templateId}\n`;
        output += `   Type: ${t.type}`;
        if (t.category) output += ` | Category: ${t.category}`;
        output += `\n`;
        if (t.description) output += `   ${t.description}\n`;
        if (t.variables.length > 0) {
          const varNames = t.variables.map(v => v.name);
          output += `   Variables: ${varNames.join(", ")}\n`;
        }
        output += `\n`;
      });
    }

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Create a new version record
   */
  private async documentCreateVersion(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const drive = google.drive({ version: "v3", auth });

    const spreadsheetId = process.env.DOCUMENT_SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error("DOCUMENT_SPREADSHEET_ID not configured in .env");
    }

    // Get document to retrieve driveFileId
    const doc = await DocumentsDomain.getDocumentById(
      sheets,
      spreadsheetId,
      args.docId
    );

    if (!doc) {
      throw new Error(`Document ${args.docId} not found`);
    }

    // Get current user email from Drive
    const about = await drive.about.get({ fields: "user" });
    const createdBy = about.data.user?.emailAddress || "unknown";

    // Get file size from Drive
    const fileData = await drive.files.get({
      fileId: doc.driveFileId,
      fields: "size",
    });
    const fileSize = parseInt(fileData.data.size || "0");

    const versionId = await DocumentsDomain.createVersion(
      sheets,
      spreadsheetId,
      args.docId,
      doc.driveFileId,
      args.version,
      createdBy,
      args.comment,
      args.major || false,
      fileSize
    );

    let output = `✅ **Version Created**\n\n`;
    output += `**Document:** ${args.docId}\n`;
    output += `**Version:** ${args.version}\n`;
    output += `**Version ID:** ${versionId}\n`;
    output += `**Type:** ${args.major ? "Major" : "Minor"} release\n`;
    output += `**Comment:** ${args.comment}\n`;

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Get version history for a document
   */
  private async documentGetVersionHistory(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.DOCUMENT_SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error("DOCUMENT_SPREADSHEET_ID not configured in .env");
    }

    const versions = await DocumentsDomain.getVersionHistory(
      sheets,
      spreadsheetId,
      args.docId
    );

    let output = `📜 **Version History**\n\n`;
    output += `**Document:** ${args.docId}\n`;
    output += `**Versions:** ${versions.length}\n\n`;

    if (versions.length === 0) {
      output += "No version history found.\n";
    } else {
      versions.forEach((v, i) => {
        output += `${versions.length - i}. **v${v.version}** (${v.changeType})\n`;
        output += `   Created: ${v.createdDate.toLocaleDateString()} by ${v.createdBy}\n`;
        output += `   Comment: ${v.comment}\n`;
        if (v.changeLog) output += `   Changes: ${v.changeLog}\n`;
        output += `\n`;
      });
    }

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Get document statistics
   */
  private async documentGetStatistics(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.DOCUMENT_SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error("DOCUMENT_SPREADSHEET_ID not configured in .env");
    }

    const stats = await DocumentsDomain.getDocumentStatistics(
      sheets,
      spreadsheetId,
      args.programId
    );

    let output = `📊 **Document Statistics**\n\n`;
    if (args.programId) {
      output += `**Program:** ${args.programId}\n`;
    }
    output += `**Total Documents:** ${stats.total}\n\n`;

    output += `**By Type:**\n`;
    Object.entries(stats.byType).forEach(([type, count]) => {
      output += `  - ${type}: ${count}\n`;
    });

    output += `\n**By Status:**\n`;
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      output += `  - ${status}: ${count}\n`;
    });

    if (Object.keys(stats.byPhase).length > 0) {
      output += `\n**By Phase:**\n`;
      Object.entries(stats.byPhase).forEach(([phase, count]) => {
        output += `  - ${phase}: ${count}\n`;
      });
    }

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Find similar documents
   */
  private async documentFindSimilar(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = process.env.DOCUMENT_SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error("DOCUMENT_SPREADSHEET_ID not configured in .env");
    }

    const similar = await DocumentsDomain.findSimilarDocuments(
      sheets,
      spreadsheetId,
      args.docId,
      args.limit || 5
    );

    let output = `🔗 **Similar Documents**\n\n`;
    output += `**Reference:** ${args.docId}\n`;
    output += `**Found:** ${similar.length} similar documents\n\n`;

    if (similar.length === 0) {
      output += "No similar documents found.\n";
    } else {
      similar.forEach((doc, i) => {
        output += `${i + 1}. **${doc.title}**\n`;
        output += `   ID: ${doc.docId}\n`;
        output += `   Type: ${doc.type}`;
        if (doc.category) output += ` | Category: ${doc.category}`;
        if (doc.phase) output += ` | Phase: ${doc.phase}`;
        output += `\n`;
        if (doc.tags.length > 0) {
          output += `   Tags: ${doc.tags.join(", ")}\n`;
        }
        output += `\n`;
      });
    }

    return {
      content: [{ type: "text", text: output }],
    };
  }

  // DELIVERABLE TRACKING IMPLEMENTATIONS (Phase 4: 23 methods)

  /**
   * Create a new deliverable
   */
  private async deliverableCreate(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const input = {
      name: args.name,
      description: args.description,
      type: args.type,
      programId: args.programId,
      wbsCode: args.wbsCode,
      owner: args.owner,
      dueDate: new Date(args.dueDate),
      priority: args.priority,
      acceptanceCriteria: args.acceptanceCriteria,
      notes: args.notes,
    };

    const deliverable = await DeliverablesDomain.createDeliverable(
      sheets,
      spreadsheetId,
      input,
      args.owner
    );

    return {
      content: [
        {
          type: "text",
          text: `✅ Deliverable created successfully!\n\n**ID:** ${deliverable.deliverableId}\n**Name:** ${deliverable.name}\n**Owner:** ${deliverable.owner}\n**Due Date:** ${deliverable.dueDate.toISOString().split("T")[0]}\n**Status:** ${deliverable.status}`,
        },
      ],
    };
  }

  /**
   * Read a deliverable
   */
  private async deliverableRead(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const deliverable = await DeliverablesDomain.readDeliverable(
      sheets,
      spreadsheetId,
      args.deliverableId
    );

    if (!deliverable) {
      throw new Error(`Deliverable ${args.deliverableId} not found`);
    }

    let output = `📋 **Deliverable Details**\n\n`;
    output += `**ID:** ${deliverable.deliverableId}\n`;
    output += `**Name:** ${deliverable.name}\n`;
    output += `**Description:** ${deliverable.description}\n`;
    output += `**Type:** ${deliverable.type}\n`;
    output += `**Owner:** ${deliverable.owner}\n`;
    output += `**Program ID:** ${deliverable.programId}\n\n`;
    output += `**Status:** ${deliverable.status}\n`;
    output += `**Review Status:** ${deliverable.reviewStatus}\n`;
    output += `**Progress:** ${deliverable.percentComplete}%\n\n`;
    output += `**Due Date:** ${deliverable.dueDate.toISOString().split("T")[0]}\n`;
    if (deliverable.forecastDate) {
      output += `**Forecast Date:** ${deliverable.forecastDate.toISOString().split("T")[0]}\n`;
    }
    if (deliverable.actualDate) {
      output += `**Actual Date:** ${deliverable.actualDate.toISOString().split("T")[0]}\n`;
    }
    if (deliverable.variance) {
      output += `**Variance:** ${deliverable.variance} days\n`;
    }
    if (deliverable.qualityScore) {
      output += `**Quality Score:** ${deliverable.qualityScore}/5\n`;
    }

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Update a deliverable
   */
  private async deliverableUpdate(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const input: any = { deliverableId: args.deliverableId };
    if (args.name) input.name = args.name;
    if (args.description) input.description = args.description;
    if (args.owner) input.owner = args.owner;
    if (args.dueDate) input.dueDate = new Date(args.dueDate);
    if (args.forecastDate) input.forecastDate = new Date(args.forecastDate);
    if (args.actualDate) input.actualDate = new Date(args.actualDate);
    if (args.status) input.status = args.status;
    if (args.reviewStatus) input.reviewStatus = args.reviewStatus;
    if (args.qualityScore) input.qualityScore = args.qualityScore;
    if (args.notes) input.notes = args.notes;

    const deliverable = await DeliverablesDomain.updateDeliverable(
      sheets,
      spreadsheetId,
      input,
      "system"
    );

    if (!deliverable) {
      throw new Error(`Deliverable ${args.deliverableId} not found`);
    }

    return {
      content: [
        {
          type: "text",
          text: `✅ Deliverable updated successfully!\n\n**ID:** ${deliverable.deliverableId}\n**Status:** ${deliverable.status}\n**Updated:** ${deliverable.modifiedDate.toISOString()}`,
        },
      ],
    };
  }

  /**
   * List deliverables
   */
  private async deliverableList(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const filters: any = {};
    if (args.programId) filters.programId = args.programId;
    if (args.status) filters.status = args.status;
    if (args.owner) filters.owner = args.owner;
    if (args.type) filters.type = args.type;

    const deliverables = await DeliverablesDomain.listDeliverables(
      sheets,
      spreadsheetId,
      filters
    );

    let output = `📋 **Deliverables List**\n\n`;
    output += `**Total:** ${deliverables.length}\n\n`;

    deliverables.forEach((d) => {
      output += `**${d.deliverableId}** - ${d.name}\n`;
      output += `  Owner: ${d.owner} | Status: ${d.status} | Due: ${d.dueDate.toISOString().split("T")[0]}\n`;
      output += `  Progress: ${d.percentComplete}%\n\n`;
    });

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Get overdue deliverables
   */
  private async deliverableGetOverdue(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const overdue = await DeliverablesDomain.getOverdueDeliverables(
      sheets,
      spreadsheetId,
      args.programId
    );

    let output = `🚨 **Overdue Deliverables**\n\n`;
    output += `**Total Overdue:** ${overdue.length}\n\n`;

    overdue.forEach((d) => {
      const daysOverdue = Math.floor(
        (new Date().getTime() - d.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      output += `**${d.deliverableId}** - ${d.name}\n`;
      output += `  Owner: ${d.owner} | Status: ${d.status}\n`;
      output += `  Due: ${d.dueDate.toISOString().split("T")[0]} (${daysOverdue} days overdue)\n\n`;
    });

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Get at-risk deliverables
   */
  private async deliverableGetAtRisk(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const atRisk = await DeliverablesDomain.getAtRiskDeliverables(
      sheets,
      spreadsheetId,
      args.programId
    );

    let output = `⚠️ **At-Risk Deliverables**\n\n`;
    output += `**Total At Risk:** ${atRisk.length}\n\n`;

    atRisk.forEach((d) => {
      output += `**${d.deliverableId}** - ${d.name}\n`;
      output += `  Owner: ${d.owner} | Status: ${d.status}\n`;
      output += `  Due: ${d.dueDate.toISOString().split("T")[0]}`;
      if (d.forecastDate) {
        output += ` | Forecast: ${d.forecastDate.toISOString().split("T")[0]}`;
      }
      output += `\n\n`;
    });

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Get upcoming deliverables
   */
  private async deliverableGetUpcoming(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const upcoming = await DeliverablesDomain.getUpcomingDeliverables(
      sheets,
      spreadsheetId,
      args.programId,
      args.daysAhead || 30
    );

    let output = `📅 **Upcoming Deliverables (Next ${args.daysAhead || 30} Days)**\n\n`;
    output += `**Total:** ${upcoming.length}\n\n`;

    upcoming.forEach((d) => {
      output += `**${d.deliverableId}** - ${d.name}\n`;
      output += `  Owner: ${d.owner} | Status: ${d.status}\n`;
      output += `  Due: ${d.dueDate.toISOString().split("T")[0]}\n\n`;
    });

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Submit a deliverable
   */
  private async deliverableSubmit(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const drive = google.drive({ version: "v3", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const input = {
      deliverableId: args.deliverableId,
      fileIds: args.fileIds,
      submitterNotes: args.submitterNotes,
    };

    const result = await DeliverablesDomain.submitDeliverable(
      sheets,
      drive,
      spreadsheetId,
      input,
      "system"
    );

    let output = `✅ **Deliverable Submitted**\n\n`;
    output += `**Deliverable ID:** ${args.deliverableId}\n`;
    output += `**Submission ID:** ${result.submission.submissionId}\n`;
    output += `**Version:** ${result.submission.version}\n`;
    output += `**Files:** ${result.submission.fileIds.length}\n`;
    output += `**Reviewer:** ${result.submission.reviewerId}\n`;
    output += `**Review Due:** ${result.submission.reviewDueDate?.toISOString().split("T")[0]}\n`;

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Get pending submissions
   */
  private async deliverableGetPendingSubmissions(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const submissions = await DeliverablesDomain.getPendingSubmissions(
      sheets,
      spreadsheetId,
      args.reviewerId
    );

    let output = `📬 **Pending Submissions**\n\n`;
    output += `**Total:** ${submissions.length}\n\n`;

    submissions.forEach((s) => {
      output += `**${s.submissionId}** - Deliverable: ${s.deliverableId}\n`;
      output += `  Submitted by: ${s.submittedBy}\n`;
      output += `  Review Due: ${s.reviewDueDate?.toISOString().split("T")[0] || "Not set"}\n`;
      output += `  Status: ${s.status}\n\n`;
    });

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Assign reviewer
   */
  private async deliverableAssignReviewer(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    // Find the latest submission for this deliverable
    const submissions = await DeliverablesDomain.listSubmissionsForDeliverable(
      sheets,
      spreadsheetId,
      args.deliverableId
    );

    if (submissions.length === 0) {
      throw new Error("No submissions found for this deliverable");
    }

    const input = {
      deliverableId: args.deliverableId,
      reviewerId: args.reviewerId,
      dueDate: new Date(args.dueDate),
    };

    const review = await DeliverablesDomain.assignReviewer(
      sheets,
      spreadsheetId,
      input,
      submissions[0].submissionId
    );

    return {
      content: [
        {
          type: "text",
          text: `✅ Reviewer assigned!\n\n**Review ID:** ${review.reviewId}\n**Reviewer:** ${review.reviewerId}\n**Due Date:** ${review.dueDate.toISOString().split("T")[0]}`,
        },
      ],
    };
  }

  /**
   * Submit review
   */
  private async deliverableSubmitReview(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const input = {
      deliverableId: args.deliverableId,
      submissionId: args.submissionId,
      decision: args.decision,
      comments: args.comments,
      qualityScore: args.qualityScore,
    };

    const result = await DeliverablesDomain.submitReview(
      sheets,
      spreadsheetId,
      input,
      "system"
    );

    let output = `✅ **Review Submitted**\n\n`;
    output += `**Review ID:** ${result.review.reviewId}\n`;
    output += `**Decision:** ${result.review.decision}\n`;
    output += `**Status:** ${result.review.status}\n`;
    if (result.review.qualityScore) {
      output += `**Quality Score:** ${result.review.qualityScore}/5\n`;
    }
    if (result.approvalNeeded) {
      output += `\n⚠️ Approval required from program manager\n`;
    }

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Approve deliverable
   */
  private async deliverableApprove(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const approval = await DeliverablesDomain.approveDeliverable(
      sheets,
      spreadsheetId,
      args.approvalId,
      args.decision,
      args.comments,
      args.conditions
    );

    if (!approval) {
      throw new Error(`Approval ${args.approvalId} not found`);
    }

    return {
      content: [
        {
          type: "text",
          text: `✅ **Approval Recorded**\n\n**Approval ID:** ${approval.approvalId}\n**Decision:** ${approval.decision}\n**Status:** ${approval.status}`,
        },
      ],
    };
  }

  /**
   * List pending reviews
   */
  private async deliverableListPendingReviews(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const reviews = await DeliverablesDomain.listPendingReviews(
      sheets,
      spreadsheetId,
      args.reviewerId
    );

    let output = `📝 **Pending Reviews**\n\n`;
    output += `**Total:** ${reviews.length}\n\n`;

    reviews.forEach((r) => {
      output += `**${r.reviewId}** - Deliverable: ${r.deliverableId}\n`;
      output += `  Due: ${r.dueDate.toISOString().split("T")[0]}\n`;
      output += `  Status: ${r.status}\n\n`;
    });

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * List pending approvals
   */
  private async deliverableListPendingApprovals(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const approvals = await DeliverablesDomain.listPendingApprovals(
      sheets,
      spreadsheetId,
      args.approverId
    );

    let output = `✅ **Pending Approvals**\n\n`;
    output += `**Total:** ${approvals.length}\n\n`;

    approvals.forEach((a) => {
      output += `**${a.approvalId}** - Deliverable: ${a.deliverableId}\n`;
      output += `  Requested: ${a.requestedDate.toISOString().split("T")[0]}\n`;
      output += `  Status: ${a.status}\n\n`;
    });

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Create quality checklist
   */
  private async deliverableCreateChecklist(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const deliverableType = args.deliverableType === "all" ? null : args.deliverableType;

    // Get default criteria for this type
    const criteria =
      deliverableType && (deliverableType as any) in DeliverablesDomain.DEFAULT_QUALITY_CRITERIA
        ? DeliverablesDomain.DEFAULT_QUALITY_CRITERIA[deliverableType as keyof typeof DeliverablesDomain.DEFAULT_QUALITY_CRITERIA]
        : [];

    const checklist = await DeliverablesDomain.createQualityChecklist(
      sheets,
      spreadsheetId,
      args.name,
      args.description,
      deliverableType,
      criteria,
      "system"
    );

    return {
      content: [
        {
          type: "text",
          text: `✅ Quality checklist created!\n\n**ID:** ${checklist.checklistId}\n**Name:** ${checklist.name}\n**Criteria:** ${checklist.criteria.length} items`,
        },
      ],
    };
  }

  /**
   * Evaluate deliverable quality
   */
  private async deliverableEvaluateQuality(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const result = await DeliverablesDomain.evaluateDeliverable(
      sheets,
      spreadsheetId,
      args.deliverableId,
      args.checklistId,
      args.results,
      "system",
      args.reviewId
    );

    return {
      content: [
        {
          type: "text",
          text: `✅ Quality evaluation complete!\n\n**Result ID:** ${result.resultId}\n**Overall Score:** ${result.overallScore}%\n**Passed:** ${result.passed ? "Yes" : "No"}`,
        },
      ],
    };
  }

  /**
   * Generate status report
   */
  private async deliverableGenerateStatusReport(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const config = {
      reportType: "status" as const,
      programId: args.programId,
      includeCharts: args.includeCharts !== false,
      includeDetails: true,
    };

    const report = await DeliverablesDomain.generateStatusReport(
      sheets,
      spreadsheetId,
      config
    );

    const output = DeliverablesDomain.formatReportAsText(report);

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Generate quality report
   */
  private async deliverableGenerateQualityReport(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const report = await DeliverablesDomain.generateQualityReport(
      sheets,
      spreadsheetId,
      args.programId
    );

    const output = DeliverablesDomain.formatReportAsText(report);

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Generate schedule report
   */
  private async deliverableGenerateScheduleReport(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const report = await DeliverablesDomain.generateScheduleReport(
      sheets,
      spreadsheetId,
      args.programId
    );

    const output = DeliverablesDomain.formatReportAsText(report);

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Generate summary dashboard
   */
  private async deliverableGenerateSummary(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const summary = await DeliverablesDomain.generateSummary(
      sheets,
      spreadsheetId,
      args.programId
    );

    let output = `📊 **Deliverables Summary Dashboard**\n\n`;
    output += `**Program ID:** ${args.programId}\n\n`;
    output += `**Total Deliverables:** ${summary.total}\n`;
    output += `**Completion Rate:** ${summary.completionRate.toFixed(1)}%\n`;
    output += `**Overdue:** ${summary.overdue}\n`;
    output += `**At Risk:** ${summary.atRisk}\n`;
    output += `**On Track:** ${summary.onTrack}\n`;

    if (summary.avgQualityScore) {
      output += `**Avg Quality Score:** ${summary.avgQualityScore.toFixed(1)}/5\n`;
    }

    if (summary.avgVariance) {
      output += `**Avg Variance:** ${summary.avgVariance.toFixed(1)} days\n`;
    }

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Track status change
   */
  private async deliverableTrackStatus(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const entry = await DeliverablesDomain.trackStatus(
      sheets,
      spreadsheetId,
      args.deliverableId,
      args.status,
      args.percentComplete,
      args.forecastDate ? new Date(args.forecastDate) : undefined,
      args.notes,
      "system"
    );

    return {
      content: [
        {
          type: "text",
          text: `✅ Status tracked!\n\n**Tracking ID:** ${entry.trackingId}\n**Status:** ${entry.status}\n**Progress:** ${entry.percentComplete}%`,
        },
      ],
    };
  }

  /**
   * Update forecast
   */
  private async deliverableUpdateForecast(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const forecast = await DeliverablesDomain.updateForecast(
      sheets,
      spreadsheetId,
      args.deliverableId,
      new Date(args.forecastDate),
      args.confidence,
      args.factors,
      "system"
    );

    let output = `📅 **Forecast Updated**\n\n`;
    output += `**Deliverable ID:** ${forecast.deliverableId}\n`;
    output += `**New Forecast:** ${forecast.currentForecast.toISOString().split("T")[0]}\n`;
    output += `**Variance:** ${forecast.variance} days\n`;
    output += `**Trend:** ${forecast.trend}\n`;
    output += `**Confidence:** ${forecast.confidence}%\n`;

    return {
      content: [{ type: "text", text: output }],
    };
  }

  /**
   * Check and queue notifications
   */
  private async deliverableCheckNotifications(auth: OAuth2Client, args: any) {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.DELIVERABLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("DELIVERABLE_SPREADSHEET_ID not configured in .env");
    }

    const result = await DeliverablesDomain.checkAndQueueNotifications(
      sheets,
      spreadsheetId,
      args.programId
    );

    let output = `📬 **Notifications Queued**\n\n`;
    output += `**Overdue Notifications:** ${result.overdueNotifications}\n`;
    output += `**Reminder Notifications:** ${result.reminderNotifications}\n`;

    return {
      content: [{ type: "text", text: output }],
    };
  }

  // RESOURCE IMPLEMENTATIONS
  private async readDriveResource(auth: OAuth2Client, uri: string) {
    const drive = google.drive({ version: "v3", auth });

    if (uri === "drive://recent") {
      // Get recently modified files (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await drive.files.list({
        q: `modifiedTime > '${thirtyDaysAgo.toISOString()}' and trashed = false`,
        orderBy: "modifiedTime desc",
        pageSize: 50,
        fields: "files(id, name, mimeType, modifiedTime, size, webViewLink)",
      });

      return {
        contents: [
          {
            uri: uri,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                files: result.data.files,
                count: result.data.files?.length || 0,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    throw new Error(`Unsupported Drive resource: ${uri}`);
  }

  private async readGmailResource(auth: OAuth2Client, uri: string) {
    const gmail = google.gmail({ version: "v1", auth });

    if (uri === "gmail://attachments/recent") {
      // Get recent messages with attachments (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const messages = await gmail.users.messages.list({
        userId: "me",
        q: `has:attachment after:${Math.floor(sevenDaysAgo.getTime() / 1000)}`,
        maxResults: 20,
      });

      const attachments: any[] = [];

      if (messages.data.messages) {
        for (const msg of messages.data.messages) {
          try {
            const message = await gmail.users.messages.get({
              userId: "me",
              id: msg.id!,
              format: "full",
            });

            // Find attachments in this message
            const findAttachments = (parts: any[] | undefined) => {
              if (!parts) return;

              for (const part of parts) {
                if (part.filename && part.body?.attachmentId) {
                  attachments.push({
                    messageId: msg.id,
                    attachmentId: part.body.attachmentId,
                    filename: part.filename,
                    mimeType: part.mimeType,
                    size: part.body.size,
                  });
                }
                if (part.parts) findAttachments(part.parts);
              }
            };

            findAttachments(message.data.payload?.parts);
          } catch (e) {
            // Skip messages that can't be fetched
            continue;
          }
        }
      }

      return {
        contents: [
          {
            uri: uri,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                attachments,
                count: attachments.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    throw new Error(`Unsupported Gmail resource: ${uri}`);
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Google Workspace MCP Server running on stdio");
  }
}

const server = new GoogleWorkspaceMCP();
server.run().catch(console.error);
