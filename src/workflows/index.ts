/**
 * Workflow Automation Domain
 *
 * This module provides workflow automation including:
 * - Workflow engine and orchestration
 * - Schedule-based triggers (cron-like)
 * - Event-based triggers
 * - Role-based access control
 * - Predefined workflows (status reports, document routing, etc.)
 * - Reusable workflow actions
 *
 * Phase 5 Implementation
 */

import type {
  WorkflowDefinition,
  WorkflowTrigger,
  WorkflowAction,
  WorkflowExecution,
  ExecutionContext,
  ActionExecution,
  Role,
  UserRoles,
  Permission,
  WorkflowRegistryEntry,
  WorkflowSchedule,
} from "../types/workflows.js";

// Core engine and components
export { WorkflowEngine, workflowEngine } from "./engine.js";
export { WorkflowScheduler } from "./scheduler.js";
export { WorkflowEventHandler, createWorkflowEvent, BUILT_IN_EVENTS } from "./event-handler.js";
export { WorkflowRoleManager, createUserRoles, DEFAULT_ROLES } from "./role-manager.js";

// Predefined workflows
export * from "./definitions/index.js";

// Actions
export * from "./actions/index.js";

// Initialize global instances
import { workflowEngine } from "./engine.js";
import { WorkflowScheduler } from "./scheduler.js";
import { WorkflowEventHandler } from "./event-handler.js";
import { WorkflowRoleManager } from "./role-manager.js";
import { PREDEFINED_WORKFLOWS } from "./definitions/index.js";

// Global instances
export const scheduler = new WorkflowScheduler(workflowEngine);
export const eventHandler = new WorkflowEventHandler(workflowEngine);
export const roleManager = new WorkflowRoleManager();

/**
 * Initialize workflow system
 * Register all predefined workflows
 */
export function initializeWorkflows(): void {
  // Register all predefined workflows
  for (const workflow of PREDEFINED_WORKFLOWS) {
    workflowEngine.registerWorkflow(workflow);

    // Subscribe to events or schedule as needed
    if (workflow.trigger.type === "event") {
      eventHandler.subscribe(workflow);
    } else if (workflow.trigger.type === "schedule") {
      scheduler.scheduleWorkflow(workflow);
    }
  }

  console.log(`✓ Registered ${PREDEFINED_WORKFLOWS.length} workflows`);
}

/**
 * Workflow Tool Definitions
 */
export function getToolDefinitions() {
  return [
    {
      name: "workflow_list",
      description: "List all registered workflows with their status and configuration",
      inputSchema: {
        type: "object",
        properties: {
          enabled: {
            type: "boolean",
            description: "Filter by enabled status (optional)",
          },
          category: {
            type: "string",
            description: "Filter by workflow category (optional)",
          },
        },
      },
    },
    {
      name: "workflow_execute",
      description: "Manually execute a workflow by ID",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            description: "Unique workflow ID to execute",
          },
          context: {
            type: "object",
            description: "Execution context with variables",
            properties: {
              programId: { type: "string" },
              documentId: { type: "string" },
              deliverableId: { type: "string" },
              userId: { type: "string" },
              variables: { type: "object" },
            },
          },
        },
        required: ["workflowId"],
      },
    },
    {
      name: "workflow_get_execution",
      description: "Get details of a workflow execution by ID",
      inputSchema: {
        type: "object",
        properties: {
          executionId: {
            type: "string",
            description: "Unique execution ID",
          },
        },
        required: ["executionId"],
      },
    },
    {
      name: "workflow_list_executions",
      description: "List recent workflow executions with filtering",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            description: "Filter by workflow ID (optional)",
          },
          limit: {
            type: "number",
            description: "Maximum number of executions to return (default: 100)",
            default: 100,
          },
        },
      },
    },
    {
      name: "workflow_enable",
      description: "Enable a workflow",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            description: "Workflow ID to enable",
          },
        },
        required: ["workflowId"],
      },
    },
    {
      name: "workflow_disable",
      description: "Disable a workflow",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            description: "Workflow ID to disable",
          },
        },
        required: ["workflowId"],
      },
    },
    {
      name: "workflow_get_schedule",
      description: "Get schedule information for a scheduled workflow",
      inputSchema: {
        type: "object",
        properties: {
          workflowId: {
            type: "string",
            description: "Workflow ID",
          },
        },
        required: ["workflowId"],
      },
    },
    {
      name: "workflow_get_upcoming_runs",
      description: "Get upcoming scheduled workflow runs",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of upcoming runs to return (default: 10)",
            default: 10,
          },
        },
      },
    },
    {
      name: "workflow_emit_event",
      description: "Manually emit an event to trigger event-based workflows",
      inputSchema: {
        type: "object",
        properties: {
          eventType: {
            type: "string",
            description: "Event type (e.g., 'document_submitted', 'deliverable_submitted')",
          },
          source: {
            type: "string",
            description: "Event source identifier",
          },
          data: {
            type: "object",
            description: "Event data payload",
          },
          userId: {
            type: "string",
            description: "User ID who triggered the event (optional)",
          },
        },
        required: ["eventType", "source", "data"],
      },
    },
    {
      name: "workflow_assign_role",
      description: "Assign roles to a user for workflow access control",
      inputSchema: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "User email address",
          },
          roles: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "system",
                "admin",
                "program_manager",
                "project_manager",
                "team_member",
                "reviewer",
                "approver",
                "stakeholder",
                "viewer",
              ],
            },
            description: "Roles to assign",
          },
          programId: {
            type: "string",
            description: "Program ID for scoped roles (optional)",
          },
          permissions: {
            type: "array",
            items: { type: "string" },
            description: "Additional specific permissions (optional)",
          },
          expiryDate: {
            type: "string",
            description: "Role expiry date in ISO format (optional)",
          },
        },
        required: ["userId", "roles"],
      },
    },
  ];
}

// Type exports
export type {
  WorkflowDefinition,
  WorkflowTrigger,
  WorkflowAction,
  WorkflowExecution,
  ExecutionContext,
  ActionExecution,
  Role,
  UserRoles,
  Permission,
  WorkflowRegistryEntry,
  WorkflowSchedule,
};
