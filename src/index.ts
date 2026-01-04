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
} from "@modelcontextprotocol/sdk/types.js";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

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
const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH || path.join(__dirname, "..", "credentials.json");

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
        // GMAIL TOOLS (8 tools)
        {
          name: "gmail_send",
          description: "Send an email via Gmail",
          inputSchema: {
            type: "object",
            properties: {
              to: { type: "string", description: "Recipient email address" },
              subject: { type: "string", description: "Email subject" },
              body: { type: "string", description: "Email body (plain text or HTML)" },
              cc: { type: "string", description: "CC recipients (comma-separated)" },
              bcc: { type: "string", description: "BCC recipients (comma-separated)" },
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
              query: { type: "string", description: "Gmail search query (e.g., 'from:user@example.com subject:proposal')" },
              maxResults: { type: "number", description: "Maximum results to return (default: 10)" },
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
          description: "Create a draft email",
          inputSchema: {
            type: "object",
            properties: {
              to: { type: "string", description: "Recipient email address" },
              subject: { type: "string", description: "Email subject" },
              body: { type: "string", description: "Email body" },
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
              parentId: { type: "string", description: "Parent folder ID (optional, defaults to root)" },
            },
            required: ["name"],
          },
        },
        {
          name: "drive_upload_file",
          description: "Upload a file to Drive",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "File name" },
              content: { type: "string", description: "File content (text or base64)" },
              mimeType: { type: "string", description: "MIME type (e.g., 'text/plain', 'application/pdf')" },
              folderId: { type: "string", description: "Parent folder ID (optional)" },
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
              includeContent: { type: "boolean", description: "Include file content (default: true)" },
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
              sendNotification: { type: "boolean", description: "Send notification email (default: true)" },
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
              sheetNames: { type: "array", items: { type: "string" }, description: "Sheet names (optional)" },
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
            required: ["spreadsheetId", "sheetId", "startRow", "endRow", "startColumn", "endColumn"],
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
              attendees: { type: "array", items: { type: "string" }, description: "Attendee emails" },
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
              daysAhead: { type: "number", description: "Number of days to look ahead (default: 7)" },
              workingHoursOnly: { type: "boolean", description: "Only business hours (default: true)" },
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
              showCompleted: { type: "boolean", description: "Include completed tasks (default: false)" },
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

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  // GMAIL TOOL IMPLEMENTATIONS
  private async gmailSend(auth: OAuth2Client, args: any) {
    const gmail = google.gmail({ version: "v1", auth });
    
    const email = [
      `To: ${args.to}`,
      args.cc ? `Cc: ${args.cc}` : "",
      args.bcc ? `Bcc: ${args.bcc}` : "",
      `Subject: ${args.subject}`,
      "",
      args.body,
    ].filter(Boolean).join("\n");

    const encodedEmail = Buffer.from(email).toString("base64url");

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedEmail },
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, messageId: result.data.id }, null, 2),
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
    
    const email = [
      `To: ${args.to}`,
      `Subject: ${args.subject}`,
      "",
      args.body,
    ].join("\n");

    const encodedEmail = Buffer.from(email).toString("base64url");

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
          text: JSON.stringify({ success: true, draftId: result.data.id }, null, 2),
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

    const media = {
      mimeType: args.mimeType,
      body: args.content,
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

    let content = result.data;

    if (args.includeContent !== false) {
      try {
        const fileContent = await drive.files.get({
          fileId: args.fileId,
          alt: "media",
        }, { responseType: "text" });
        
        (content as any).content = fileContent.data;
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
          text: JSON.stringify({
            spreadsheetId: result.data.spreadsheetId,
            spreadsheetUrl: result.data.spreadsheetUrl,
          }, null, 2),
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
          fields: args.bold ? "userEnteredFormat(textFormat,backgroundColor)" : "userEnteredFormat.backgroundColor",
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
          text: JSON.stringify({
            spreadsheetId: result.data.spreadsheetId,
            title: result.data.properties?.title,
            sheets: result.data.sheets?.map(s => ({
              sheetId: s.properties?.sheetId,
              title: s.properties?.title,
              index: s.properties?.index,
            })),
          }, null, 2),
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
          text: JSON.stringify({
            documentId: result.data.documentId,
            title: result.data.title,
          }, null, 2),
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
          text: JSON.stringify({
            title: result.data.title,
            content: content,
          }, null, 2),
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
          text: JSON.stringify({
            eventId: result.data.id,
            htmlLink: result.data.htmlLink,
          }, null, 2),
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
          text: JSON.stringify({
            message: "Use existing events to find gaps manually or implement sophisticated slot finding",
            events: events.data.items,
          }, null, 2),
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

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Google Workspace MCP Server running on stdio");
  }
}

const server = new GoogleWorkspaceMCP();
server.run().catch(console.error);
