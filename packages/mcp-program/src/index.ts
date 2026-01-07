#!/usr/bin/env node
/**
 * Program Management MCP Server
 *
 * Provides tools for:
 * - Program charter management
 * - WBS (Work Breakdown Structure)
 * - Milestones and schedule tracking
 * - Issue and decision logs
 * - Change control
 * - Lessons learned
 * - Governance meetings
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
import { PROGRAM_TOOLS, handleToolCall } from "./tools.js";
import apiRoutes from "./api/routes.js";
import { registerDefaultServers } from "@gw-mcp/shared-routing";

// Load environment variables
dotenv.config();

// MCP Server setup
const mcpServer = new Server(
  {
    name: "mcp-program",
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
  tools: PROGRAM_TOOLS,
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
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use("/", apiRoutes);

// Start both servers
async function main() {
  try {
    // Register with service registry
    console.error("[mcp-program] Registering with service registry...");
    registerDefaultServers();

    // Start REST API server
    app.listen(PORT, () => {
      console.error(`[mcp-program] REST API server listening on port ${PORT}`);
      console.error(`[mcp-program] Health check: http://localhost:${PORT}/health`);
    });

    // Start MCP server (stdio)
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("[mcp-program] MCP Server running on stdio");

    // Note: The MCP server will handle stdin/stdout, while REST API runs on HTTP
  } catch (error) {
    console.error("[mcp-program] Failed to start server:", error);
    process.exit(1);
  }
}

main().catch(console.error);
