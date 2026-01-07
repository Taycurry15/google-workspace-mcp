/**
 * @gw-mcp/shared-workflows
 * Workflow engine with scheduler and RBAC
 *
 * Provides:
 * - Workflow engine and executor
 * - Cron-like scheduler
 * - RBAC (Role-based access control)
 * - Reusable action executors
 *
 * Note: Event bus moved to @gw-mcp/shared-core
 */

export * from "./engine/index.js";
export * from "./triggers/index.js";
export * from "./actions/index.js";
export * from "./definitions/index.js";
export * from "./rbac/index.js";

// Version info
export const VERSION = "1.0.0";
export const PACKAGE_NAME = "@gw-mcp/shared-workflows";
