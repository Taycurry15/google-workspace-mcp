/**
 * Common type definitions used across all MCP servers
 * Entity IDs, timestamps, user info, etc.
 */

/**
 * Entity ID types - branded strings for type safety
 */
export type ProgramId = string & { readonly __brand: "ProgramId" };
export type WorkstreamId = string & { readonly __brand: "WorkstreamId" };
export type ProjectId = string & { readonly __brand: "ProjectId" };
export type DeliverableId = string & { readonly __brand: "DeliverableId" };
export type MilestoneId = string & { readonly __brand: "MilestoneId" };
export type RiskId = string & { readonly __brand: "RiskId" };
export type ContractId = string & { readonly __brand: "ContractId" };
export type VendorId = string & { readonly __brand: "VendorId" };
export type InvoiceId = string & { readonly __brand: "InvoiceId" };
export type BudgetId = string & { readonly __brand: "BudgetId" };
export type UserId = string & { readonly __brand: "UserId" };
export type DocumentId = string & { readonly __brand: "DocumentId" };

/**
 * Helper functions to create branded IDs
 */
export function createProgramId(id: string): ProgramId {
  return id as ProgramId;
}

export function createWorkstreamId(id: string): WorkstreamId {
  return id as WorkstreamId;
}

export function createProjectId(id: string): ProjectId {
  return id as ProjectId;
}

export function createDeliverableId(id: string): DeliverableId {
  return id as DeliverableId;
}

export function createMilestoneId(id: string): MilestoneId {
  return id as MilestoneId;
}

export function createRiskId(id: string): RiskId {
  return id as RiskId;
}

export function createContractId(id: string): ContractId {
  return id as ContractId;
}

export function createVendorId(id: string): VendorId {
  return id as VendorId;
}

export function createInvoiceId(id: string): InvoiceId {
  return id as InvoiceId;
}

export function createBudgetId(id: string): BudgetId {
  return id as BudgetId;
}

export function createUserId(id: string): UserId {
  return id as UserId;
}

export function createDocumentId(id: string): DocumentId {
  return id as DocumentId;
}

/**
 * Common timestamp fields for entities
 */
export interface Timestamps {
  createdDate: Date;
  createdBy: UserId;
  modifiedDate: Date;
  modifiedBy: UserId;
}

/**
 * User information
 */
export interface UserInfo {
  userId: UserId;
  email: string;
  name: string;
  roles: string[];
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  offset?: number;
  limit?: number;
}

/**
 * Pagination result metadata
 */
export interface PaginationMeta {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/**
 * Generic paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Common status types
 */
export type EntityStatus = "active" | "inactive" | "archived" | "deleted";

/**
 * Common priority levels
 */
export type Priority = "critical" | "high" | "medium" | "low";

/**
 * Date range filter
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Search/filter options
 */
export interface SearchOptions {
  query?: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: "asc" | "desc";
  };
  pagination?: PaginationParams;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Google Workspace file reference
 */
export interface DriveFileReference {
  fileId: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
}

/**
 * Google Sheets reference
 */
export interface SpreadsheetReference {
  spreadsheetId: string;
  sheetName: string;
  range?: string;
}

/**
 * Attachment information
 */
export interface Attachment {
  fileId: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedBy: UserId;
  uploadedDate: Date;
}
