#!/usr/bin/env node

/**
 * Google Workspace MCP Server - Legacy Monolithic Version
 *
 * Simplified MCP server for basic Google Workspace tools.
 * For advanced features use the modular servers in packages/mcp-*
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { initializeAuth } from "@gw-mcp/shared-core";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Google Workspace MCP Server
 * Simplified version using shared packages
 */
class GoogleWorkspaceMCP {
  private server: Server;
  private authClient: OAuth2Client | null = null;

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

  /**
   * Get authenticated OAuth2 client
   */
  private async getAuth(): Promise<OAuth2Client> {
    if (!this.authClient) {
      this.authClient = await initializeAuth();
    }
    return this.authClient;
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Gmail Tools (basic)
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
          description: "Search for emails in Gmail",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Gmail search query (e.g., 'from:user@example.com subject:important')" },
              maxResults: { type: "number", description: "Maximum number of results (default: 10)" },
            },
            required: ["query"],
          },
        },

        // Drive Tools (basic)
        {
          name: "drive_list_files",
          description: "List files in Google Drive",
          inputSchema: {
            type: "object",
            properties: {
              folderId: { type: "string", description: "Folder ID to list (optional, defaults to root)" },
              query: { type: "string", description: "Search query (optional)" },
              maxResults: { type: "number", description: "Maximum number of results (default: 100)" },
            },
          },
        },
        {
          name: "drive_create_folder",
          description: "Create a new folder in Google Drive",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Folder name" },
              parentId: { type: "string", description: "Parent folder ID (optional)" },
            },
            required: ["name"],
          },
        },

        // Sheets Tools (basic)
        {
          name: "sheets_create",
          description: "Create a new Google Sheets spreadsheet",
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
          description: "Read data from a Google Sheets spreadsheet",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: { type: "string", description: "Spreadsheet ID" },
              range: { type: "string", description: "Range to read (e.g., 'Sheet1!A1:D10')" },
            },
            required: ["spreadsheetId", "range"],
          },
        },
        {
          name: "sheets_write",
          description: "Write data to a Google Sheets spreadsheet",
          inputSchema: {
            type: "object",
            properties: {
              spreadsheetId: { type: "string", description: "Spreadsheet ID" },
              range: { type: "string", description: "Range to write (e.g., 'Sheet1!A1')" },
              values: { type: "array", description: "2D array of values to write" },
            },
            required: ["spreadsheetId", "range", "values"],
          },
        },

        // Docs Tools (basic)
        {
          name: "docs_create",
          description: "Create a new Google Docs document",
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
          description: "Read content from a Google Docs document",
          inputSchema: {
            type: "object",
            properties: {
              documentId: { type: "string", description: "Document ID" },
            },
            required: ["documentId"],
          },
        },

        // Calendar Tools (basic)
        {
          name: "calendar_create_event",
          description: "Create a new calendar event",
          inputSchema: {
            type: "object",
            properties: {
              summary: { type: "string", description: "Event title" },
              start: { type: "string", description: "Start time (ISO 8601 format)" },
              end: { type: "string", description: "End time (ISO 8601 format)" },
              description: { type: "string", description: "Event description (optional)" },
              attendees: { type: "array", items: { type: "string" }, description: "Attendee email addresses (optional)" },
            },
            required: ["summary", "start", "end"],
          },
        },
        {
          name: "calendar_list_events",
          description: "List upcoming calendar events",
          inputSchema: {
            type: "object",
            properties: {
              maxResults: { type: "number", description: "Maximum number of events (default: 10)" },
              timeMin: { type: "string", description: "Start time filter (ISO 8601 format, optional)" },
              timeMax: { type: "string", description: "End time filter (ISO 8601 format, optional)" },
            },
          },
        },

        // Tasks Tools (basic)
        {
          name: "tasks_create",
          description: "Create a new task in Google Tasks",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Task title" },
              notes: { type: "string", description: "Task notes (optional)" },
              due: { type: "string", description: "Due date (RFC 3339 timestamp, optional)" },
              taskListId: { type: "string", description: "Task list ID (optional, defaults to '@default')" },
            },
            required: ["title"],
          },
        },
        {
          name: "tasks_list",
          description: "List tasks from a task list",
          inputSchema: {
            type: "object",
            properties: {
              taskListId: { type: "string", description: "Task list ID (optional, defaults to '@default')" },
              showCompleted: { type: "boolean", description: "Include completed tasks (default: false)" },
            },
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const auth = await this.getAuth();
        const result = await this.handleToolCall(name, args || {}, auth);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Handle individual tool calls
   */
  private async handleToolCall(
    name: string,
    args: Record<string, any>,
    auth: OAuth2Client
  ): Promise<any> {
    // Gmail tools
    if (name === "gmail_send") {
      const gmail = google.gmail({ version: "v1", auth });
      const message = [
        `To: ${args.to}`,
        args.cc ? `Cc: ${args.cc}` : "",
        args.bcc ? `Bcc: ${args.bcc}` : "",
        `Subject: ${args.subject}`,
        "",
        args.body,
      ]
        .filter(Boolean)
        .join("\n");

      const encodedMessage = Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      const result = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      });

      return { messageId: result.data.id, success: true };
    }

    if (name === "gmail_search") {
      const gmail = google.gmail({ version: "v1", auth });
      const result = await gmail.users.messages.list({
        userId: "me",
        q: args.query,
        maxResults: args.maxResults || 10,
      });

      return { messages: result.data.messages || [], count: result.data.messages?.length || 0 };
    }

    // Drive tools
    if (name === "drive_list_files") {
      const drive = google.drive({ version: "v3", auth });
      let query = args.query || "";
      if (args.folderId) {
        query = query ? `${query} and '${args.folderId}' in parents` : `'${args.folderId}' in parents`;
      }

      const result = await drive.files.list({
        q: query,
        pageSize: args.maxResults || 100,
        fields: "files(id, name, mimeType, createdTime, modifiedTime, size, webViewLink)",
      });

      return { files: result.data.files || [], count: result.data.files?.length || 0 };
    }

    if (name === "drive_create_folder") {
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

      return { folderId: result.data.id, name: result.data.name, webViewLink: result.data.webViewLink };
    }

    // Sheets tools
    if (name === "sheets_create") {
      const sheets = google.sheets({ version: "v4", auth });
      const resource: any = {
        properties: {
          title: args.title,
        },
      };

      if (args.sheetNames) {
        resource.sheets = args.sheetNames.map((name: string) => ({
          properties: { title: name },
        }));
      }

      const result = await sheets.spreadsheets.create({
        requestBody: resource,
      });

      return {
        spreadsheetId: result.data.spreadsheetId,
        spreadsheetUrl: result.data.spreadsheetUrl,
        title: args.title,
      };
    }

    if (name === "sheets_read") {
      const sheets = google.sheets({ version: "v4", auth });
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: args.spreadsheetId,
        range: args.range,
      });

      return { values: result.data.values || [], range: result.data.range };
    }

    if (name === "sheets_write") {
      const sheets = google.sheets({ version: "v4", auth });
      const result = await sheets.spreadsheets.values.update({
        spreadsheetId: args.spreadsheetId,
        range: args.range,
        valueInputOption: "RAW",
        requestBody: {
          values: args.values,
        },
      });

      return { updatedCells: result.data.updatedCells, updatedRange: result.data.updatedRange };
    }

    // Docs tools
    if (name === "docs_create") {
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

      return { documentId: result.data.documentId, title: result.data.title };
    }

    if (name === "docs_read") {
      const docs = google.docs({ version: "v1", auth });
      const result = await docs.documents.get({
        documentId: args.documentId,
      });

      const content = result.data.body?.content
        ?.map((element) => element.paragraph?.elements?.map((e) => e.textRun?.content).join(""))
        .join("");

      return { documentId: args.documentId, title: result.data.title, content };
    }

    // Calendar tools
    if (name === "calendar_create_event") {
      const calendar = google.calendar({ version: "v3", auth });
      const event: any = {
        summary: args.summary,
        start: { dateTime: args.start },
        end: { dateTime: args.end },
      };

      if (args.description) event.description = args.description;
      if (args.attendees) {
        event.attendees = args.attendees.map((email: string) => ({ email }));
      }

      const result = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
      });

      return { eventId: result.data.id, htmlLink: result.data.htmlLink };
    }

    if (name === "calendar_list_events") {
      const calendar = google.calendar({ version: "v3", auth });
      const result = await calendar.events.list({
        calendarId: "primary",
        timeMin: args.timeMin || new Date().toISOString(),
        timeMax: args.timeMax,
        maxResults: args.maxResults || 10,
        singleEvents: true,
        orderBy: "startTime",
      });

      return { events: result.data.items || [], count: result.data.items?.length || 0 };
    }

    // Tasks tools
    if (name === "tasks_create") {
      const tasks = google.tasks({ version: "v1", auth });
      const task: any = {
        title: args.title,
      };

      if (args.notes) task.notes = args.notes;
      if (args.due) task.due = args.due;

      const result = await tasks.tasks.insert({
        tasklist: args.taskListId || "@default",
        requestBody: task,
      });

      return { taskId: result.data.id, title: result.data.title };
    }

    if (name === "tasks_list") {
      const tasks = google.tasks({ version: "v1", auth });
      const result = await tasks.tasks.list({
        tasklist: args.taskListId || "@default",
        showCompleted: args.showCompleted || false,
      });

      return { tasks: result.data.items || [], count: result.data.items?.length || 0 };
    }

    throw new Error(`Unknown tool: ${name}`);
  }

  /**
   * Start the MCP server
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Google Workspace MCP Server (Legacy) running on stdio");
    console.error("For advanced features, use the modular servers in packages/mcp-*/");
  }
}

// Start the server
const server = new GoogleWorkspaceMCP();
server.run().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
