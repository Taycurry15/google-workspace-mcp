/**
 * Document Organization Type Definitions
 *
 * This file defines all types for document organization including:
 * - Documents and metadata
 * - Folder structures
 * - Templates and versions
 * - Categorization and search
 */

/**
 * Document Type enumeration
 */
export type DocumentType =
  | "charter"
  | "plan"
  | "report"
  | "deliverable"
  | "meeting_notes"
  | "presentation"
  | "template"
  | "contract"
  | "specification"
  | "design"
  | "test_plan"
  | "training"
  | "reference"
  | "other";

/**
 * Document Status
 */
export type DocumentStatus =
  | "draft"
  | "review"
  | "approved"
  | "final"
  | "archived"
  | "deprecated";

/**
 * Project Phase (for folder organization)
 */
export type ProjectPhase =
  | "initiation"
  | "planning"
  | "execution"
  | "monitoring"
  | "closing"
  | "support";

/**
 * Classification Level
 */
export type ClassificationLevel =
  | "public"
  | "internal"
  | "confidential"
  | "restricted";

/**
 * Document Interface
 * Represents a tracked document in the system
 */
export interface Document {
  docId: string;                  // Unique document ID (e.g., DOC-001)
  driveFileId: string;            // Google Drive file ID
  title: string;                  // Document title
  type: DocumentType;             // Document type
  category?: string;              // LLM-generated category
  subcategory?: string;           // LLM-generated subcategory
  programId: string;              // Associated program
  projectId?: string;             // Associated project (optional)
  deliverableId?: string;         // Associated deliverable (optional)
  owner: string;                  // Document owner email
  createdDate: Date;              // When created
  modifiedDate: Date;             // Last modified
  status: DocumentStatus;         // Current status
  version: string;                // Version number (e.g., 1.0, 2.1)
  phase?: ProjectPhase;           // Project phase
  folderPath: string;             // Drive folder path
  folderId: string;               // Drive folder ID
  tags: string[];                 // Keywords/tags
  classification: ClassificationLevel; // Security classification
  metadata: DocumentMetadata;     // Additional metadata
  categorization?: CategorizationResult; // LLM categorization result
}

/**
 * Document Metadata
 * Additional structured information about the document
 */
export interface DocumentMetadata {
  author?: string;                // Original author
  contributors?: string[];        // Contributors
  department?: string;            // Department/organization
  keywords?: string[];            // Keywords
  description?: string;           // Document description
  purpose?: string;               // Purpose of document
  audience?: string[];            // Target audience
  references?: string[];          // Related document IDs
  externalReferences?: string[];  // External URLs/references
  language?: string;              // Document language
  pageCount?: number;             // Number of pages
  wordCount?: number;             // Word count
  fileSize?: number;              // File size in bytes
  mimeType?: string;              // MIME type
  customFields?: Record<string, any>; // Custom metadata fields
}

/**
 * Categorization Result
 * Result from LLM-powered document categorization
 */
export interface CategorizationResult {
  documentType: DocumentType;     // Identified document type
  category: string;               // Primary category
  subcategory?: string;           // Subcategory
  phase?: ProjectPhase;           // Project phase
  keywords: string[];             // Extracted keywords
  suggestedTags: string[];        // Suggested tags
  suggestedFolderPath: string;    // Recommended folder path
  confidence: number;             // Confidence score (0-1)
  reasoning?: string;             // LLM reasoning
  provider?: string;              // Which LLM provider was used
  timestamp: Date;                // When categorized
}

/**
 * Folder Structure Template
 * Defines the standard folder hierarchy for programs
 */
export interface FolderStructure {
  templateId: string;             // Template identifier (e.g., "pmi", "custom")
  name: string;                   // Template name
  description: string;            // Template description
  folders: FolderNode[];          // Root folder nodes
}

/**
 * Folder Node
 * Represents a folder in the hierarchy
 */
export interface FolderNode {
  name: string;                   // Folder name
  description?: string;           // Folder description
  phase?: ProjectPhase;           // Associated project phase
  documentTypes: DocumentType[];  // Accepted document types
  children?: FolderNode[];        // Subfolders
  autoCreate: boolean;            // Auto-create for new programs
  driveId?: string;               // Google Drive folder ID (once created)
}

/**
 * Folder Mapping
 * Maps document types/phases to folder paths
 */
export interface FolderMapping {
  programId: string;              // Program ID
  rootFolderId: string;           // Root Drive folder ID
  mappings: FolderRule[];         // Routing rules
}

/**
 * Folder Rule
 * Rule for routing documents to folders
 */
export interface FolderRule {
  ruleId: string;                 // Unique rule ID
  documentType?: DocumentType;    // Document type filter
  phase?: ProjectPhase;           // Phase filter
  category?: string;              // Category filter
  deliverableId?: string;         // Specific deliverable
  folderPath: string;             // Target folder path (relative)
  folderId: string;               // Target folder Drive ID
  priority: number;               // Rule priority (lower = higher priority)
  active: boolean;                // Is rule active
}

/**
 * Document Template
 * Reusable document template
 */
export interface DocumentTemplate {
  templateId: string;             // Unique template ID (e.g., TMPL-001)
  name: string;                   // Template name
  description: string;            // Description
  type: DocumentType;             // Document type
  driveFileId: string;            // Google Drive template file ID
  category: string;               // Template category
  variables: TemplateVariable[];  // Replaceable variables
  tags: string[];                 // Tags
  active: boolean;                // Is template active
  createdBy: string;              // Creator
  createdDate: Date;              // When created
  lastUsed?: Date;                // When last used
  usageCount: number;             // How many times used
}

/**
 * Template Variable
 * Replaceable variable in a template
 */
export interface TemplateVariable {
  name: string;                   // Variable name (e.g., "programName")
  placeholder: string;            // Placeholder in template (e.g., "{{programName}}")
  description: string;            // Variable description
  required: boolean;              // Is required
  defaultValue?: string;          // Default value
  type: "text" | "date" | "number" | "email" | "list";
  validation?: string;            // Validation regex
}

/**
 * Document Version
 * Version control record
 */
export interface DocumentVersion {
  versionId: string;              // Unique version ID
  docId: string;                  // Parent document ID
  driveFileId: string;            // Drive file ID for this version
  version: string;                // Version number (e.g., 1.0)
  major: number;                  // Major version number
  minor: number;                  // Minor version number
  patch: number;                  // Patch version number
  createdDate: Date;              // When created
  createdBy: string;              // Who created
  comment: string;                // Version comment
  changeType: "major" | "minor" | "patch"; // Type of change
  changeLog?: string;             // Change description
  fileSize: number;               // File size
  checksum?: string;              // File checksum/hash
}

/**
 * Document Search Criteria
 * Criteria for searching documents
 */
export interface DocumentSearchCriteria {
  query?: string;                 // Text search query
  documentType?: DocumentType[];  // Filter by type
  programId?: string;             // Filter by program
  projectId?: string;             // Filter by project
  deliverableId?: string;         // Filter by deliverable
  owner?: string[];               // Filter by owner
  status?: DocumentStatus[];      // Filter by status
  phase?: ProjectPhase[];         // Filter by phase
  tags?: string[];                // Filter by tags
  category?: string[];            // Filter by category
  classification?: ClassificationLevel[]; // Filter by classification
  dateRange?: {                   // Date range filter
    field: "createdDate" | "modifiedDate";
    from?: Date;
    to?: Date;
  };
  folderPath?: string;            // Filter by folder path
  minConfidence?: number;         // Min categorization confidence
  limit?: number;                 // Max results
  offset?: number;                // Pagination offset
  sortBy?: "createdDate" | "modifiedDate" | "title" | "confidence"; // Sort field
  sortOrder?: "asc" | "desc";     // Sort order
}

/**
 * Document Search Result
 */
export interface DocumentSearchResult {
  document: Document;             // The document
  score: number;                  // Relevance score
  highlights?: string[];          // Highlighted text snippets
}

/**
 * Document Routing Request
 * Request to route a document to appropriate folder
 */
export interface DocumentRoutingRequest {
  fileId: string;                 // Google Drive file ID
  programId: string;              // Target program
  documentType?: DocumentType;    // Manual type (optional)
  deliverableId?: string;         // Associated deliverable (optional)
  phase?: ProjectPhase;           // Manual phase (optional)
  autoRoute: boolean;             // Auto-route based on categorization
  forceCategorize: boolean;       // Force recategorization
}

/**
 * Document Routing Result
 */
export interface DocumentRoutingResult {
  docId: string;                  // Assigned document ID
  driveFileId: string;            // Google Drive file ID
  categorization: CategorizationResult; // Categorization result
  folderPath: string;             // Where routed
  folderId: string;               // Drive folder ID
  moved: boolean;                 // Was file moved
  registered: boolean;            // Registered in tracking sheet
  notifications: NotificationSent[]; // Notifications sent
}

/**
 * Notification Sent
 */
export interface NotificationSent {
  type: "email" | "calendar" | "task";
  recipient: string;
  subject: string;
  timestamp: Date;
  success: boolean;
}

/**
 * Document Access Log Entry
 */
export interface DocumentAccessLog {
  logId: string;                  // Unique log ID
  docId: string;                  // Document ID
  driveFileId: string;            // Drive file ID
  action: "view" | "edit" | "download" | "share" | "delete" | "move";
  user: string;                   // User email
  timestamp: Date;                // When accessed
  ipAddress?: string;             // IP address
  userAgent?: string;             // User agent
  details?: Record<string, any>;  // Additional details
}

/**
 * Folder Creation Request
 */
export interface FolderCreationRequest {
  programId: string;              // Program to create folders for
  templateId: string;             // Folder structure template
  rootFolderId?: string;          // Parent folder (optional)
  customFolders?: FolderNode[];   // Additional custom folders
}

/**
 * Folder Creation Result
 */
export interface FolderCreationResult {
  programId: string;              // Program ID
  rootFolderId: string;           // Root folder ID
  foldersCreated: number;         // Count of folders created
  folderMapping: FolderMapping;   // Complete folder mapping
  errors?: string[];              // Any errors encountered
}
