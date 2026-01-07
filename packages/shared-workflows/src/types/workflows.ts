/**
 * Workflow Automation Type Definitions
 *
 * This file defines all types for workflow automation including:
 * - Workflow definitions and triggers
 * - Workflow actions and execution
 * - Role-based access control
 * - Scheduling and events
 */

/**
 * Trigger Type
 */
export type TriggerType =
  | "schedule"      // Time-based (cron)
  | "event"         // Event-driven
  | "manual";       // Manual execution

/**
 * Workflow Status
 */
export type WorkflowStatus =
  | "active"
  | "inactive"
  | "disabled"
  | "error";

/**
 * Execution Status
 */
export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "skipped";

/**
 * Action Type
 */
export type ActionType =
  | "send_notification"
  | "route_document"
  | "categorize_document"
  | "update_spreadsheet"
  | "generate_report"
  | "assign_reviewer"
  | "create_task"
  | "create_calendar_event"
  | "move_file"
  | "copy_file"
  | "create_folder"
  | "update_status"
  | "conditional"
  | "loop"
  | "wait"
  | "webhook"
  | "custom";

/**
 * Workflow Definition
 * Defines a reusable workflow
 */
export interface WorkflowDefinition {
  workflowId: string;             // Unique workflow ID
  name: string;                   // Workflow name
  description: string;            // Description
  version: string;                // Version number
  trigger: WorkflowTrigger;       // How workflow is triggered
  actions: WorkflowAction[];      // Actions to execute
  roles: RoleRequirement[];       // Required roles
  status: WorkflowStatus;         // Current status
  enabled: boolean;               // Is enabled
  priority: number;               // Execution priority
  timeout?: number;               // Max execution time (seconds)
  retryPolicy?: RetryPolicy;      // Retry configuration
  errorHandling?: ErrorHandling;  // Error handling config
  metadata?: WorkflowMetadata;    // Additional metadata
  createdBy: string;              // Creator
  createdDate: Date;              // When created
  modifiedDate: Date;             // Last modified
  lastExecuted?: Date;            // Last execution time
  executionCount: number;         // Total executions
}

/**
 * Workflow Trigger
 * Defines when workflow executes
 */
export interface WorkflowTrigger {
  type: TriggerType;              // Trigger type
  schedule?: ScheduleTrigger;     // Schedule config (if type=schedule)
  event?: EventTrigger;           // Event config (if type=event)
  manual?: ManualTrigger;         // Manual config (if type=manual)
  conditions?: TriggerCondition[]; // Additional conditions
}

/**
 * Schedule Trigger
 * Cron-like scheduling
 */
export interface ScheduleTrigger {
  cron?: string;                  // Cron expression (e.g., "0 9 * * 1" = Mon 9am)
  interval?: {                    // Alternative: simple interval
    value: number;
    unit: "minutes" | "hours" | "days" | "weeks";
  };
  timezone?: string;              // Timezone (default: UTC)
  startDate?: Date;               // When to start
  endDate?: Date;                 // When to end
  nextRun?: Date;                 // Next scheduled run
}

/**
 * Event Trigger
 * Event-driven trigger
 */
export interface EventTrigger {
  eventType: string;              // Event type (e.g., "document_submitted")
  source?: string;                // Event source (e.g., "document_submit_tool")
  filters?: Record<string, any>;  // Event filters
}

/**
 * Manual Trigger
 * Manual execution settings
 */
export interface ManualTrigger {
  requiresApproval: boolean;      // Requires approval before run
  approvers?: string[];           // Who can approve
  confirmationMessage?: string;   // Confirmation prompt
}

/**
 * Trigger Condition
 * Additional condition for trigger
 */
export interface TriggerCondition {
  field: string;                  // Field to check
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
  value: any;                     // Value to compare
  logic?: "AND" | "OR";           // Logic with next condition
}

/**
 * Workflow Action
 * Single action in workflow
 */
export interface WorkflowAction {
  actionId: string;               // Unique action ID
  type: ActionType;               // Action type
  name: string;                   // Action name
  description?: string;           // Description
  config: ActionConfig;           // Action configuration
  runCondition?: ActionCondition; // When to run this action
  onSuccess?: string;             // Next action ID on success
  onFailure?: string;             // Next action ID on failure
  retryOnFailure: boolean;        // Retry if fails
  continueOnFailure: boolean;     // Continue workflow if fails
  timeout?: number;               // Action timeout (seconds)
  order: number;                  // Execution order
}

/**
 * Action Configuration
 * Configuration for specific action types
 */
export type ActionConfig =
  | NotificationActionConfig
  | DocumentActionConfig
  | SpreadsheetActionConfig
  | ReportActionConfig
  | TaskActionConfig
  | ConditionalActionConfig
  | LoopActionConfig
  | WaitActionConfig
  | WebhookActionConfig
  | CustomActionConfig;

/**
 * Notification Action Config
 */
export interface NotificationActionConfig {
  type: "email" | "calendar" | "task" | "webhook";
  recipients: string[];           // Recipient emails or expressions
  subject: string;                // Subject template
  body: string;                   // Body template (supports variables)
  cc?: string[];                  // CC recipients
  bcc?: string[];                 // BCC recipients
  attachments?: string[];         // Attachment file IDs
  priority?: "high" | "normal" | "low";
}

/**
 * Document Action Config
 */
export interface DocumentActionConfig {
  operation: "route" | "categorize" | "move" | "copy" | "create" | "delete";
  fileId?: string;                // File ID or expression
  targetFolderId?: string;        // Target folder ID
  templateId?: string;            // Template ID (for create)
  variables?: Record<string, any>; // Template variables
  createFolderIfMissing?: boolean; // Create folder if it doesn't exist
}

/**
 * Spreadsheet Action Config
 */
export interface SpreadsheetActionConfig {
  operation: "append" | "update" | "read" | "delete";
  spreadsheetId: string;          // Spreadsheet ID
  sheet: string;                  // Sheet name
  range?: string;                 // Range (e.g., A1:B10)
  values?: any[][];               // Values to write
  rowId?: string;                 // Row ID to update
  criteria?: Record<string, any>; // Selection criteria
}

/**
 * Report Action Config
 */
export interface ReportActionConfig {
  reportType: string;             // Report type
  programId: string;              // Program ID or expression
  templateId?: string;            // Report template
  outputFormat: "pdf" | "docx" | "xlsx" | "html";
  outputFolder: string;           // Where to save report
  variables?: Record<string, any>; // Report variables
}

/**
 * Task Action Config
 */
export interface TaskActionConfig {
  taskType: "google_tasks" | "calendar" | "custom";
  title: string;                  // Task title
  description?: string;           // Task description
  assignee: string;               // Assignee email
  dueDate?: string;               // Due date expression
  priority?: "high" | "normal" | "low";
}

/**
 * Conditional Action Config
 */
export interface ConditionalActionConfig {
  conditions: TriggerCondition[]; // Conditions to evaluate
  ifTrue: string[];               // Action IDs if true
  ifFalse?: string[];             // Action IDs if false
}

/**
 * Loop Action Config
 */
export interface LoopActionConfig {
  collection: string;             // Collection expression (e.g., "deliverables")
  itemVariable: string;           // Variable name for item
  actions: string[];              // Action IDs to repeat
  maxIterations?: number;         // Max iterations
}

/**
 * Wait Action Config
 */
export interface WaitActionConfig {
  duration: number;               // Wait duration
  unit: "seconds" | "minutes" | "hours" | "days";
  untilDate?: Date;               // Or wait until specific date
}

/**
 * Webhook Action Config
 */
export interface WebhookActionConfig {
  url: string;                    // Webhook URL
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>; // HTTP headers
  body?: any;                     // Request body
  auth?: {
    type: "bearer" | "basic" | "api_key";
    token?: string;
    username?: string;
    password?: string;
  };
}

/**
 * Custom Action Config
 */
export interface CustomActionConfig {
  module: string;                 // Module path
  function: string;               // Function name
  parameters: Record<string, any>; // Function parameters
}

/**
 * Action Condition
 * Condition for running action
 */
export interface ActionCondition {
  expression: string;             // Condition expression
  variables?: Record<string, any>; // Variables for evaluation
}

/**
 * Retry Policy
 */
export interface RetryPolicy {
  maxRetries: number;             // Max retry attempts
  retryDelay: number;             // Delay between retries (seconds)
  backoffMultiplier?: number;     // Exponential backoff multiplier
  retryOn?: string[];             // Error codes to retry on
}

/**
 * Error Handling
 */
export interface ErrorHandling {
  onError: "fail" | "continue" | "rollback" | "notify";
  notifyOnError: boolean;         // Send notification on error
  errorRecipients?: string[];     // Who to notify
  fallbackWorkflow?: string;      // Fallback workflow ID
  rollbackActions?: string[];     // Actions to run on rollback
}

/**
 * Workflow Metadata
 */
export interface WorkflowMetadata {
  category?: string;              // Workflow category
  tags?: string[];                // Tags
  documentation?: string;         // Documentation URL
  changelog?: WorkflowChange[];   // Change history
  customFields?: Record<string, any>; // Custom fields
}

/**
 * Workflow Change
 */
export interface WorkflowChange {
  version: string;                // Version number
  date: Date;                     // Change date
  author: string;                 // Who changed
  description: string;            // What changed
}

/**
 * Workflow Execution
 * Record of workflow execution
 */
export interface WorkflowExecution {
  executionId: string;            // Unique execution ID
  workflowId: string;             // Workflow ID
  workflowVersion: string;        // Workflow version
  status: ExecutionStatus;        // Execution status
  startTime: Date;                // When started
  endTime?: Date;                 // When ended
  duration?: number;              // Duration in milliseconds
  triggeredBy: string;            // Who/what triggered
  triggerType: TriggerType;       // How triggered
  context: ExecutionContext;      // Execution context
  actions: ActionExecution[];     // Action executions
  error?: ExecutionError;         // Error (if failed)
  logs: ExecutionLog[];           // Execution logs
  metadata?: Record<string, any>; // Additional metadata
}

/**
 * Execution Context
 * Context data for workflow execution
 */
export interface ExecutionContext {
  programId?: string;             // Program context
  documentId?: string;            // Document context
  deliverableId?: string;         // Deliverable context
  userId?: string;                // User context
  variables: Record<string, any>; // Workflow variables
  inputs?: Record<string, any>;   // Input parameters
}

/**
 * Action Execution
 * Record of action execution
 */
export interface ActionExecution {
  actionExecutionId: string;      // Unique ID
  actionId: string;               // Action ID
  actionType: ActionType;         // Action type
  status: ExecutionStatus;        // Execution status
  startTime: Date;                // When started
  endTime?: Date;                 // When ended
  duration?: number;              // Duration in milliseconds
  input?: any;                    // Input data
  output?: any;                   // Output data
  error?: ExecutionError;         // Error (if failed)
  retryCount: number;             // Number of retries
}

/**
 * Execution Error
 */
export interface ExecutionError {
  code: string;                   // Error code
  message: string;                // Error message
  stack?: string;                 // Stack trace
  details?: any;                  // Additional details
  timestamp: Date;                // When error occurred
}

/**
 * Execution Log
 */
export interface ExecutionLog {
  logId: string;                  // Unique log ID
  timestamp: Date;                // When logged
  level: "debug" | "info" | "warn" | "error";
  message: string;                // Log message
  actionId?: string;              // Related action
  data?: any;                     // Additional data
}

/**
 * Role Requirement
 * Required role for workflow
 */
export interface RoleRequirement {
  role: Role;                     // Required role
  action: "execute" | "approve" | "view" | "edit";
  required: boolean;              // Is required
}

/**
 * Role
 */
export type Role =
  | "system"                      // System (automated)
  | "admin"                       // Administrator
  | "program_manager"             // Program manager
  | "project_manager"             // Project manager
  | "team_member"                 // Team member
  | "reviewer"                    // Reviewer
  | "approver"                    // Approver
  | "stakeholder"                 // Stakeholder
  | "viewer";                     // Read-only viewer

/**
 * User Roles
 * User's assigned roles
 */
export interface UserRoles {
  userId: string;                 // User email
  programId?: string;             // Program context (optional)
  roles: Role[];                  // Assigned roles
  permissions: Permission[];      // Specific permissions
  assignedBy: string;             // Who assigned
  assignedDate: Date;             // When assigned
  expiryDate?: Date;              // When expires
}

/**
 * Permission
 */
export type Permission =
  | "read"
  | "write"
  | "delete"
  | "approve"
  | "execute_workflow"
  | "manage_program"
  | "manage_documents"
  | "manage_deliverables"
  | "manage_workflows"
  | "manage_users";

/**
 * Workflow Registry Entry
 * Registry of available workflows
 */
export interface WorkflowRegistryEntry {
  workflowId: string;             // Workflow ID
  name: string;                   // Name
  category: string;               // Category
  description: string;            // Description
  enabled: boolean;               // Is enabled
  builtin: boolean;               // Is built-in (vs custom)
  moduleFile?: string;            // Module file path
  lastModified: Date;             // Last modified
}

/**
 * Workflow Schedule
 * Active schedule for workflow
 */
export interface WorkflowSchedule {
  scheduleId: string;             // Unique schedule ID
  workflowId: string;             // Workflow ID
  enabled: boolean;               // Is enabled
  schedule: ScheduleTrigger;      // Schedule config
  lastRun?: Date;                 // Last execution
  nextRun?: Date;                 // Next scheduled run
  runCount: number;               // Total runs
}
