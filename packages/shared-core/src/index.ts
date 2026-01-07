/**
 * @gw-mcp/shared-core
 * Shared core utilities for Google Workspace MCP servers
 *
 * Provides:
 * - OAuth2 authentication
 * - Google API client factories (Sheets, Drive, Docs, Gmail, Calendar)
 * - Sheet/Drive helper functions
 * - Common types and utilities
 */

export * from "./auth/index.js";
export * from "./google-apis/index.js";
export * from "./utils/index.js";
export * from "./types/index.js";

// Version info
export const VERSION = "1.0.0";
export const PACKAGE_NAME = "@gw-mcp/shared-core";
