/**
 * @gw-mcp/shared-routing
 * Cross-server routing, document intelligence, and program context management
 *
 * Provides:
 * - Cross-server API client for REST communication
 * - Document Intelligence Service (AI-powered classification)
 * - Document Router (automatic folder routing)
 * - Program Context Manager (active program tracking)
 * - Event-based cross-server communication
 */

export * from "./cross-server/index.js";
export * from "./document-routing/index.js";
export * from "./program-context/index.js";
export * from "./events/index.js";

// Version info
export const VERSION = "1.0.0";
export const PACKAGE_NAME = "@gw-mcp/shared-routing";
