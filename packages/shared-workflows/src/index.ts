/**
 * @gw-mcp/shared-workflows
 * Workflow engine with event bus, scheduler, and RBAC
 *
 * Provides:
 * - Workflow engine and executor
 * - Event bus (EventEmitter and Redis support)
 * - Cron-like scheduler
 * - RBAC (Role-based access control)
 * - Reusable action executors
 */

export * from "./engine/index.js";
export * from "./triggers/index.js";
export * from "./actions/index.js";
export * from "./definitions/index.js";
export * from "./rbac/index.js";
export * from "./events/index.js";

// Version info
export const VERSION = "1.0.0";
export const PACKAGE_NAME = "@gw-mcp/shared-workflows";
