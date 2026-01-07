/**
 * Workflow Event Handler
 *
 * Handles event-based workflow triggers including:
 * - Event subscription and dispatching
 * - Event filtering
 * - Event-driven workflow execution
 * - Built-in event types
 *
 * Phase 5 Implementation
 */

import type {
  WorkflowDefinition,
  EventTrigger,
  ExecutionContext,
} from "../types/workflows.js";

import { WorkflowEngine } from "./engine.js";
import { EventEmitter } from "events";

/**
 * Workflow Event
 */
export interface WorkflowEvent {
  eventType: string;
  source: string;
  timestamp: Date;
  data: any;
  userId?: string;
}

/**
 * Event Subscription
 */
interface EventSubscription {
  workflowId: string;
  eventType: string;
  trigger: EventTrigger;
}

/**
 * Workflow Event Handler
 * Manages event-driven workflow executions
 */
export class WorkflowEventHandler extends EventEmitter {
  private engine: WorkflowEngine;
  private subscriptions: Map<string, EventSubscription[]> = new Map();

  constructor(engine: WorkflowEngine) {
    super();
    this.engine = engine;
    this.setupBuiltInEvents();
  }

  /**
   * Subscribe a workflow to an event
   */
  subscribe(workflow: WorkflowDefinition): void {
    if (workflow.trigger.type !== "event") {
      throw new Error(`Workflow ${workflow.workflowId} does not have an event trigger`);
    }

    if (!workflow.trigger.event) {
      throw new Error(`Workflow ${workflow.workflowId} is missing event configuration`);
    }

    const subscription: EventSubscription = {
      workflowId: workflow.workflowId,
      eventType: workflow.trigger.event.eventType,
      trigger: workflow.trigger.event,
    };

    const subs = this.subscriptions.get(subscription.eventType) || [];
    subs.push(subscription);
    this.subscriptions.set(subscription.eventType, subs);
  }

  /**
   * Unsubscribe a workflow from events
   */
  unsubscribe(workflowId: string): void {
    for (const [eventType, subs] of this.subscriptions.entries()) {
      const filtered = subs.filter((s) => s.workflowId !== workflowId);
      if (filtered.length === 0) {
        this.subscriptions.delete(eventType);
      } else {
        this.subscriptions.set(eventType, filtered);
      }
    }
  }

  /**
   * Emit an event (trigger workflows)
   */
  async emitWorkflowEvent(event: WorkflowEvent): Promise<void> {
    const subscriptions = this.subscriptions.get(event.eventType) || [];

    for (const subscription of subscriptions) {
      try {
        // Check if event matches filters
        if (!this.eventMatchesFilters(event, subscription.trigger)) {
          continue;
        }

        const workflow = this.engine.getWorkflow(subscription.workflowId);
        if (!workflow || !workflow.enabled) {
          continue;
        }

        // Create execution context from event
        const context: ExecutionContext = {
          variables: {
            event: event.data,
            eventType: event.eventType,
            eventSource: event.source,
          },
          userId: event.userId,
        };

        // Execute workflow asynchronously (don't await - fire and forget)
        this.engine
          .executeWorkflow(subscription.workflowId, context, event.userId || "system")
          .catch((error) => {
            console.error(
              `Error executing workflow ${subscription.workflowId} for event ${event.eventType}:`,
              error
            );
          });
      } catch (error) {
        console.error(
          `Error processing subscription for workflow ${subscription.workflowId}:`,
          error
        );
      }
    }

    // Also emit to EventEmitter listeners
    this.emit(event.eventType, event);
  }

  /**
   * Check if event matches trigger filters
   */
  private eventMatchesFilters(event: WorkflowEvent, trigger: EventTrigger): boolean {
    if (!trigger.filters) {
      return true;
    }

    for (const [key, value] of Object.entries(trigger.filters)) {
      const eventValue = this.getNestedValue(event.data, key);

      // Handle different filter types
      if (typeof value === "object" && value !== null) {
        // Complex filter (operator-based)
        const operator = value.operator || "equals";
        const filterValue = value.value;

        if (!this.compareValues(eventValue, filterValue, operator)) {
          return false;
        }
      } else {
        // Simple equality filter
        if (eventValue !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  /**
   * Compare values using operator
   */
  private compareValues(eventValue: any, filterValue: any, operator: string): boolean {
    switch (operator) {
      case "equals":
        return eventValue === filterValue;
      case "not_equals":
        return eventValue !== filterValue;
      case "contains":
        return String(eventValue).includes(String(filterValue));
      case "greater_than":
        return eventValue > filterValue;
      case "less_than":
        return eventValue < filterValue;
      case "in":
        return Array.isArray(filterValue) && filterValue.includes(eventValue);
      case "not_in":
        return Array.isArray(filterValue) && !filterValue.includes(eventValue);
      default:
        return false;
    }
  }

  /**
   * Get subscriptions for an event type
   */
  getSubscriptions(eventType: string): EventSubscription[] {
    return this.subscriptions.get(eventType) || [];
  }

  /**
   * List all event types with subscriptions
   */
  listEventTypes(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Setup built-in event listeners
   */
  private setupBuiltInEvents(): void {
    // Listen to workflow engine events
    this.engine.on("execution_started", (execution) => {
      this.emitWorkflowEvent({
        eventType: "workflow_execution_started",
        source: "workflow_engine",
        timestamp: new Date(),
        data: {
          executionId: execution.executionId,
          workflowId: execution.workflowId,
        },
      });
    });

    this.engine.on("execution_completed", (execution) => {
      this.emitWorkflowEvent({
        eventType: "workflow_execution_completed",
        source: "workflow_engine",
        timestamp: new Date(),
        data: {
          executionId: execution.executionId,
          workflowId: execution.workflowId,
          status: execution.status,
        },
      });
    });

    this.engine.on("execution_failed", (execution) => {
      this.emitWorkflowEvent({
        eventType: "workflow_execution_failed",
        source: "workflow_engine",
        timestamp: new Date(),
        data: {
          executionId: execution.executionId,
          workflowId: execution.workflowId,
          error: execution.error,
        },
      });
    });
  }

  /**
   * Clear all subscriptions
   */
  clearAll(): void {
    this.subscriptions.clear();
  }
}

/**
 * Built-in event types
 * These events are emitted by various parts of the system
 */
export const BUILT_IN_EVENTS = {
  // Document events
  DOCUMENT_SUBMITTED: "document_submitted",
  DOCUMENT_CATEGORIZED: "document_categorized",
  DOCUMENT_ROUTED: "document_routed",
  DOCUMENT_APPROVED: "document_approved",
  DOCUMENT_REJECTED: "document_rejected",

  // Deliverable events
  DELIVERABLE_CREATED: "deliverable_created",
  DELIVERABLE_SUBMITTED: "deliverable_submitted",
  DELIVERABLE_REVIEWED: "deliverable_reviewed",
  DELIVERABLE_APPROVED: "deliverable_approved",
  DELIVERABLE_REJECTED: "deliverable_rejected",
  DELIVERABLE_OVERDUE: "deliverable_overdue",

  // Program events
  PROGRAM_CREATED: "program_created",
  PROGRAM_UPDATED: "program_updated",
  MILESTONE_CREATED: "milestone_created",
  MILESTONE_COMPLETED: "milestone_completed",
  MILESTONE_OVERDUE: "milestone_overdue",

  // Issue events
  ISSUE_CREATED: "issue_created",
  ISSUE_UPDATED: "issue_updated",
  ISSUE_RESOLVED: "issue_resolved",
  ISSUE_ESCALATED: "issue_escalated",

  // Change events
  CHANGE_REQUEST_CREATED: "change_request_created",
  CHANGE_REQUEST_APPROVED: "change_request_approved",
  CHANGE_REQUEST_REJECTED: "change_request_rejected",

  // Workflow events
  WORKFLOW_EXECUTION_STARTED: "workflow_execution_started",
  WORKFLOW_EXECUTION_COMPLETED: "workflow_execution_completed",
  WORKFLOW_EXECUTION_FAILED: "workflow_execution_failed",

  // User events
  USER_ROLE_ASSIGNED: "user_role_assigned",
  USER_ROLE_REVOKED: "user_role_revoked",
} as const;

/**
 * Helper function to create workflow event
 */
export function createWorkflowEvent(
  eventType: string,
  source: string,
  data: any,
  userId?: string
): WorkflowEvent {
  return {
    eventType,
    source,
    timestamp: new Date(),
    data,
    userId,
  };
}
