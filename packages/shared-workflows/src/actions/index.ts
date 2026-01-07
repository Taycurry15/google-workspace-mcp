/**
 * Workflow Actions Registry
 *
 * Central registry for all workflow actions
 * Phase 5 Implementation
 */

import { actionMetadata as sendNotification } from "./send-notification.js";
import { actionMetadata as routeDocument } from "./route-document.js";
import { actionMetadata as categorizeDocument } from "./categorize-document.js";
import { actionMetadata as updateSpreadsheet } from "./update-spreadsheet.js";
import { actionMetadata as generateReport } from "./generate-report.js";

/**
 * Action handler function type (accepts any config)
 */
type ActionHandler = (auth: any, config: any, context: any) => Promise<any>;

/**
 * Action registry
 * Maps action type to handler function
 */
export const ACTION_REGISTRY = new Map<string, ActionHandler>([
  [sendNotification.type, sendNotification.handler],
  [routeDocument.type, routeDocument.handler],
  [categorizeDocument.type, categorizeDocument.handler],
  [updateSpreadsheet.type, updateSpreadsheet.handler],
  [generateReport.type, generateReport.handler],
]);

/**
 * Get action handler by type
 */
export function getActionHandler(actionType: string): Function | undefined {
  return ACTION_REGISTRY.get(actionType);
}

/**
 * List all available action types
 */
export function listActionTypes(): string[] {
  return Array.from(ACTION_REGISTRY.keys());
}

/**
 * Check if action type is registered
 */
export function isActionRegistered(actionType: string): boolean {
  return ACTION_REGISTRY.has(actionType);
}

/**
 * Execute action by type
 */
export async function executeAction(
  actionType: string,
  auth: any,
  config: any,
  context: any
): Promise<any> {
  const handler = getActionHandler(actionType);

  if (!handler) {
    throw new Error(`Action type not registered: ${actionType}`);
  }

  return handler(auth, config, context);
}
