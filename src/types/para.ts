/**
 * PARA Method Type Definitions
 * Types for Projects, Areas, Resources, Archives organization
 */

// Core PARA categories
export type PARACategory = "PROJECT" | "AREA" | "RESOURCE" | "ARCHIVE";

// Actionability levels
export type ActionabilityLevel = "high" | "medium" | "low";

// Project status
export type ProjectStatus = "active" | "on-hold" | "completed";

// Domain types
export type Domain = "govcon" | "international" | "cybersec" | "business";

/**
 * PARA Metadata stored in Google Drive custom properties
 */
export interface PARAMetadata {
  // Core PARA classification
  para_category: PARACategory;
  para_confidence: string; // "0.0-1.0"
  para_assigned_date: string; // ISO 8601
  para_reviewed_date: string; // ISO 8601

  // Project-specific
  para_project_name?: string;
  para_project_deadline?: string; // ISO 8601
  para_project_status?: ProjectStatus;

  // Area-specific
  para_area_name?: string;

  // Resource-specific
  para_resource_type?: string; // "template", "reference", "guide"

  // Archive-specific
  para_archive_date?: string; // ISO 8601
  para_archive_reason?: string;

  // Common metadata
  para_tags: string; // JSON array as string
  para_actionability: ActionabilityLevel;
  para_domain?: Domain;
  para_needs_review: string; // "true" | "false"
  para_last_ai_analysis: string; // ISO 8601
}

/**
 * Categorization result from AI analysis
 */
export interface CategorizationResult {
  category: PARACategory;
  confidence: number; // 0.0-1.0
  reasoning: string;
  suggestedTags: string[];
  actionability: ActionabilityLevel;
  suggestedProject?: string;
  suggestedArea?: string;
  archiveDate?: string; // ISO date if ARCHIVE category
}

/**
 * File information for categorization
 */
export interface FileInfo {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  folderPath?: string;
  folderId?: string;
  webViewLink?: string | null;
}

/**
 * Content extraction result
 */
export interface ExtractedContent {
  fileId: string;
  fileName: string;
  mimeType: string;
  contentPreview: string; // Max 2000 chars
  metadata: {
    createdTime: string;
    modifiedTime: string;
    folderPath?: string;
    domain?: Domain;
  };
}

/**
 * Search criteria for PARA search
 */
export interface PARASearchCriteria {
  category?: PARACategory;
  actionability?: ActionabilityLevel;
  tags?: string[];
  domain?: Domain;
  needsReview?: boolean;
  projectName?: string;
  dateRange?: {
    start?: string; // ISO date
    end?: string; // ISO date
  };
  maxResults?: number;
}

/**
 * Search result
 */
export interface PARASearchResult {
  file: FileInfo;
  metadata: Partial<PARAMetadata>;
  matchReason?: string;
}

/**
 * Review item
 */
export interface ReviewItem {
  file: FileInfo;
  issue: "uncategorized" | "stale" | "lowConfidence" | "archivalCandidate";
  issueDetails: string;
  suggestedAction: string;
  priority: "high" | "medium" | "low";
  daysPending?: number;
}

/**
 * Review prompt result
 */
export interface ReviewPromptResult {
  items: ReviewItem[];
  summary: {
    totalItems: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    estimatedReviewTime: string;
  };
}

/**
 * Auto-archive candidate
 */
export interface ArchiveCandidate {
  fileId: string;
  fileName: string;
  reason: string;
  confidence: number;
  projectName?: string;
  completionDate?: string;
  needsConfirmation: boolean;
}

/**
 * Archive result
 */
export interface ArchiveResult {
  fileId: string;
  fileName: string;
  archiveFolderId: string;
  archiveFolderPath: string;
  archiveDate: string;
  metadataFileId?: string;
}

/**
 * Batch categorization progress
 */
export interface BatchProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentFile?: string;
}

/**
 * PARA folder structure IDs
 */
export interface PARAFolderStructure {
  rootId: string;
  projectsId: string;
  areasId: string;
  resourcesId: string;
  archivesId: string;
  archiveYears: Map<string, string>; // year -> folderId
  archiveQuarters: Map<string, string>; // "YYYY-QX" -> folderId
}

/**
 * Dashboard metrics
 */
export interface DashboardMetrics {
  categoryBreakdown: {
    projects: number;
    areas: number;
    resources: number;
    archives: number;
  };
  health: {
    categorizedFiles: number;
    uncategorizedFiles: number;
    avgConfidence: number;
    itemsNeedingReview: number;
  };
  recentActivity: {
    newCategorizations7d: number;
    filesArchived7d: number;
    projectsCompleted7d: number;
  };
  actionability: {
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * PARA configuration
 */
export interface PARAConfig {
  confidenceThreshold: number; // Default 0.7
  autoArchiveDays: number; // Default 90
  contentPreviewMaxChars: number; // Default 2000
  batchSize: number; // Default 50
  maxConcurrentRequests: number; // Default 5
}
