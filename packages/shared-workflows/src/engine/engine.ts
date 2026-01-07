/**
 * Workflow Engine
 *
 * Core orchestration engine for automated workflows including:
 * - Workflow execution and management
 * - Action execution with dynamic loading
 * - Role-based access control
 * - Event handling and scheduling
 *
 * Phase 5 Implementation
 */

import type {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowAction,
  ActionExecution,
  ExecutionStatus,
  ExecutionContext,
  ExecutionError,
  Role,
  UserRoles,
} from "../types/workflows.js";

import { EventEmitter } from "events";

/**
 * Workflow Engine
 * Main orchestration engine for workflow automation
 */
export class WorkflowEngine extends EventEmitter {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private userRoles: Map<string, UserRoles> = new Map();

  constructor() {
    super();
  }

  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.workflowId, workflow);
    this.emit("workflow_registered", workflow);
  }

  /**
   * Unregister a workflow
   */
  unregisterWorkflow(workflowId: string): void {
    this.workflows.delete(workflowId);
    this.emit("workflow_unregistered", workflowId);
  }

  /**
   * Get a workflow by ID
   */
  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * List all registered workflows
   */
  listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    context: ExecutionContext,
    triggeredBy: string
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Check if workflow is enabled
    if (!workflow.enabled || workflow.status !== "active") {
      throw new Error(`Workflow ${workflowId} is not enabled or active`);
    }

    // Create execution record
    const executionId = this.generateExecutionId();
    const execution: WorkflowExecution = {
      executionId,
      workflowId: workflow.workflowId,
      workflowVersion: workflow.version,
      status: "pending",
      startTime: new Date(),
      triggeredBy,
      triggerType: workflow.trigger.type,
      context,
      actions: [],
      logs: [],
    };

    this.executions.set(executionId, execution);
    this.emit("execution_started", execution);

    try {
      // Update status to running
      execution.status = "running";
      this.logExecution(execution, "info", "Workflow execution started");

      // Execute actions in order
      for (const action of workflow.actions.sort((a, b) => a.order - b.order)) {
        const actionExecution = await this.executeAction(
          execution,
          action,
          context
        );
        execution.actions.push(actionExecution);

        // Check if action failed and workflow should stop
        if (
          actionExecution.status === "failed" &&
          !action.continueOnFailure
        ) {
          execution.status = "failed";
          execution.error = actionExecution.error;
          break;
        }
      }

      // Mark as completed if no failures
      if (execution.status === "running") {
        execution.status = "completed";
      }

      execution.endTime = new Date();
      execution.duration =
        execution.endTime.getTime() - execution.startTime.getTime();

      this.logExecution(
        execution,
        execution.status === "completed" ? "info" : "error",
        `Workflow execution ${execution.status}`
      );

      this.emit("execution_completed", execution);

      return execution;
    } catch (error) {
      execution.status = "failed";
      execution.endTime = new Date();
      execution.duration =
        execution.endTime.getTime() - execution.startTime.getTime();
      execution.error = this.createExecutionError(error);

      this.logExecution(
        execution,
        "error",
        `Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`
      );

      this.emit("execution_failed", execution);

      return execution;
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    execution: WorkflowExecution,
    action: WorkflowAction,
    context: ExecutionContext
  ): Promise<ActionExecution> {
    const actionExecution: ActionExecution = {
      actionExecutionId: this.generateActionExecutionId(),
      actionId: action.actionId,
      actionType: action.type,
      status: "pending",
      startTime: new Date(),
      retryCount: 0,
    };

    this.logExecution(
      execution,
      "info",
      `Executing action: ${action.name} (${action.type})`
    );

    try {
      actionExecution.status = "running";

      // Execute action based on type
      // Phase 5: Implement actual action execution
      // For now, this is a placeholder
      const result = await this.performActionExecution(action, context);

      actionExecution.output = result;
      actionExecution.status = "completed";
      actionExecution.endTime = new Date();
      actionExecution.duration =
        actionExecution.endTime.getTime() - actionExecution.startTime.getTime();

      this.logExecution(
        execution,
        "info",
        `Action ${action.name} completed successfully`
      );

      return actionExecution;
    } catch (error) {
      actionExecution.status = "failed";
      actionExecution.endTime = new Date();
      actionExecution.duration =
        actionExecution.endTime.getTime() - actionExecution.startTime.getTime();
      actionExecution.error = this.createExecutionError(error);

      this.logExecution(
        execution,
        "error",
        `Action ${action.name} failed: ${error instanceof Error ? error.message : String(error)}`
      );

      // Retry if configured
      if (action.retryOnFailure && actionExecution.retryCount < 3) {
        actionExecution.retryCount++;
        this.logExecution(
          execution,
          "info",
          `Retrying action ${action.name} (attempt ${actionExecution.retryCount})`
        );
        // Recursive retry
        return this.executeAction(execution, action, context);
      }

      return actionExecution;
    }
  }

  /**
   * Perform actual action execution
   * Phase 5: This will be implemented with actual action handlers
   */
  private async performActionExecution(
    action: WorkflowAction,
    context: ExecutionContext
  ): Promise<any> {
    // Placeholder for Phase 5 implementation
    // Will load and execute action modules dynamically
    return {
      message: `Action ${action.name} executed (placeholder)`,
      actionType: action.type,
      context,
    };
  }

  /**
   * Check if user has required role
   */
  hasRole(userId: string, role: Role, programId?: string): boolean {
    const userRoles = this.userRoles.get(userId);
    if (!userRoles) {
      return false;
    }

    // Check if roles match program context
    if (programId && userRoles.programId && userRoles.programId !== programId) {
      return false;
    }

    return userRoles.roles.includes(role);
  }

  /**
   * Assign roles to a user
   */
  assignUserRoles(userRoles: UserRoles): void {
    this.userRoles.set(userRoles.userId, userRoles);
    this.emit("user_roles_assigned", userRoles);
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * List executions for a workflow
   */
  listExecutions(
    workflowId?: string,
    limit: number = 100
  ): WorkflowExecution[] {
    let executions = Array.from(this.executions.values());

    if (workflowId) {
      executions = executions.filter((e) => e.workflowId === workflowId);
    }

    // Sort by start time descending
    executions.sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );

    return executions.slice(0, limit);
  }

  /**
   * Log execution event
   */
  private logExecution(
    execution: WorkflowExecution,
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data?: any
  ): void {
    execution.logs.push({
      logId: this.generateLogId(),
      timestamp: new Date(),
      level,
      message,
      data,
    });
  }

  /**
   * Create execution error object
   */
  private createExecutionError(error: unknown): ExecutionError {
    if (error instanceof Error) {
      return {
        code: "EXECUTION_ERROR",
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
      };
    }

    return {
      code: "UNKNOWN_ERROR",
      message: String(error),
      timestamp: new Date(),
    };
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique action execution ID
   */
  private generateActionExecutionId(): string {
    return `act-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Clear old executions (cleanup)
   */
  clearOldExecutions(olderThan: Date): number {
    let count = 0;
    for (const [id, execution] of this.executions.entries()) {
      if (execution.startTime < olderThan) {
        this.executions.delete(id);
        count++;
      }
    }
    return count;
  }
}

/**
 * Global workflow engine instance
 * Will be initialized in Phase 5
 */
export const workflowEngine = new WorkflowEngine();
