#!/usr/bin/env node
/**
 * Deliverable Tracking MCP Server
 *
 * Provides tools for:
 * - Deliverable CRUD operations
 * - Submission workflows
 * - Review and QA processes
 * - Quality checklists
 * - Status tracking
 * - Reporting and analytics
 *
 * Runs both:
 * 1. MCP Server (stdio) for Claude Desktop
 * 2. REST API Server (Express) for cross-server communication
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import dotenv from "dotenv";
import { DELIVERABLE_TOOLS, handleToolCall } from "./tools.js";
import apiRoutes from "./api/routes.js";
import { registerDefaultServers } from "@gw-mcp/shared-routing";

// Load environment variables
dotenv.config();

// MCP Server setup
const mcpServer = new Server(
  {
    name: "mcp-deliverables",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// MCP Tool handlers
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: DELIVERABLE_TOOLS,
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await handleToolCall(name, args || {});
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

// Express REST API setup (for cross-server communication)
const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());
app.use("/", apiRoutes);

// Start both servers
async function main() {
  try {
    // Register with service registry
    console.error("[mcp-deliverables] Registering with service registry...");
    registerDefaultServers();

    // Start REST API server
    app.listen(PORT, () => {
      console.error(`[mcp-deliverables] REST API server listening on port ${PORT}`);
      console.error(`[mcp-deliverables] Health check: http://localhost:${PORT}/health`);
    });

    // Start MCP server (stdio)
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("[mcp-deliverables] MCP Server running on stdio");
  } catch (error) {
    console.error("[mcp-deliverables] Failed to start server:", error);
    process.exit(1);
  }
}

main().catch(console.error);
