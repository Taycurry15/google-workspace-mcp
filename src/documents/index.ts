/**
 * Document Organization Domain
 *
 * This module provides intelligent document organization including:
 * - LLM-powered document categorization
 * - Automated folder routing and organization
 * - Document metadata management
 * - Template system for common documents
 * - Version control tracking
 * - Advanced document search
 *
 * Phase 3 Implementation
 */

import type {
  Document,
  DocumentMetadata,
  CategorizationResult,
  FolderStructure,
  FolderNode,
  FolderMapping,
  FolderCreationRequest,
  FolderCreationResult,
  DocumentTemplate,
  DocumentVersion,
  DocumentSearchCriteria,
  DocumentRoutingRequest,
  DocumentRoutingResult,
} from "../types/document.js";

// Export all modules
export * from "./folder-structure.js";
export * from "./categorizer.js";
export * from "./router.js";
export * from "./metadata.js";
export * from "./templates.js";
export * from "./versioning.js";
export * from "./search.js";

/**
 * Get tool definitions for the Document Organization domain
 */
export function getToolDefinitions() {
  return [
    // Document Submission & Routing
    {
      name: "document_submit",
      description:
        "Submit a document for intelligent categorization and automatic routing to the appropriate folder. This is the primary tool for organizing documents in a program structure. The system will use LLM analysis to determine the document type, phase, and optimal folder location.",
      inputSchema: {
        type: "object",
        properties: {
          fileId: {
            type: "string",
            description: "Google Drive file ID of the document to submit",
          },
          programId: {
            type: "string",
            description: "Program ID to associate the document with",
          },
          documentType: {
            type: "string",
            description:
              "Optional: Manual document type override (charter, plan, report, deliverable, meeting_notes, presentation, template, contract, specification, design, test_plan, training, reference, other)",
          },
          deliverableId: {
            type: "string",
            description:
              "Optional: Deliverable ID if this document is part of a deliverable",
          },
          phase: {
            type: "string",
            description:
              "Optional: Project phase override (initiation, planning, execution, monitoring, closing, support)",
          },
          autoRoute: {
            type: "boolean",
            description:
              "Whether to automatically move the file to the determined folder (default: true)",
          },
        },
        required: ["fileId", "programId"],
      },
    },

    // Document Categorization
    {
      name: "document_categorize",
      description:
        "Analyze and categorize a document using LLM intelligence. Returns document type, category, keywords, and suggested folder path without moving the file. Useful for preview before submission.",
      inputSchema: {
        type: "object",
        properties: {
          fileId: {
            type: "string",
            description: "Google Drive file ID to categorize",
          },
          documentType: {
            type: "string",
            description: "Optional: Suggested document type to validate",
          },
        },
        required: ["fileId"],
      },
    },

    // Folder Structure Creation
    {
      name: "document_create_folder_structure",
      description:
        "Create a complete PMI-standard folder structure for a program. This creates all standard project management folders (Initiation, Planning, Execution, Monitoring, Closing, Support) with appropriate sub-folders.",
      inputSchema: {
        type: "object",
        properties: {
          programId: {
            type: "string",
            description: "Program ID to create folders for",
          },
          template: {
            type: "string",
            description:
              "Folder structure template to use (pmi or custom)",
            default: "pmi",
          },
          parentFolderId: {
            type: "string",
            description:
              "Optional: Parent folder ID in Drive to create structure under",
          },
        },
        required: ["programId"],
      },
    },

    // Metadata Management
    {
      name: "document_get_metadata",
      description: "Retrieve complete metadata for a document by document ID or file ID",
      inputSchema: {
        type: "object",
        properties: {
          docId: {
            type: "string",
            description: "Document ID (e.g., DOC-001)",
          },
          fileId: {
            type: "string",
            description: "Google Drive file ID (alternative to docId)",
          },
        },
      },
    },

    {
      name: "document_update_metadata",
      description: "Update metadata fields for a document",
      inputSchema: {
        type: "object",
        properties: {
          docId: {
            type: "string",
            description: "Document ID to update",
          },
          updates: {
            type: "object",
            description:
              "Fields to update (title, type, category, status, tags, etc.)",
          },
        },
        required: ["docId", "updates"],
      },
    },

    // Document Search
    {
      name: "document_search",
      description:
        "Search documents using advanced criteria including full-text search, filters by type/status/phase, date ranges, and more. Returns ranked results with relevance scores.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Full-text search query",
          },
          programId: {
            type: "string",
            description: "Filter by program ID",
          },
          documentType: {
            type: "array",
            items: { type: "string" },
            description: "Filter by document types",
          },
          status: {
            type: "array",
            items: { type: "string" },
            description: "Filter by status (draft, review, approved, final, archived)",
          },
          phase: {
            type: "array",
            items: { type: "string" },
            description: "Filter by project phase",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Filter by tags",
          },
          owner: {
            type: "array",
            items: { type: "string" },
            description: "Filter by owner email",
          },
          deliverableId: {
            type: "string",
            description: "Filter by deliverable ID",
          },
          limit: {
            type: "number",
            description: "Maximum number of results (default: 50)",
          },
          offset: {
            type: "number",
            description: "Pagination offset",
          },
        },
      },
    },

    // Templates
    {
      name: "document_create_from_template",
      description: "Create a new document from a template",
      inputSchema: {
        type: "object",
        properties: {
          templateId: {
            type: "string",
            description: "Template ID (e.g., TMPL-001)",
          },
          targetFolderId: {
            type: "string",
            description: "Destination folder ID in Drive",
          },
          fileName: {
            type: "string",
            description: "Name for the new document",
          },
          variables: {
            type: "object",
            description: "Variables to replace in template",
          },
        },
        required: ["templateId", "targetFolderId", "fileName"],
      },
    },

    {
      name: "document_list_templates",
      description: "List available document templates",
      inputSchema: {
        type: "object",
        properties: {
          documentType: {
            type: "string",
            description: "Filter by document type",
          },
          category: {
            type: "string",
            description: "Filter by category",
          },
        },
      },
    },

    // Version Control
    {
      name: "document_create_version",
      description: "Create a new version record for a document",
      inputSchema: {
        type: "object",
        properties: {
          docId: {
            type: "string",
            description: "Document ID",
          },
          version: {
            type: "string",
            description: "Version number (e.g., 2.0, 1.1)",
          },
          comment: {
            type: "string",
            description: "Version comment describing changes",
          },
          major: {
            type: "boolean",
            description: "Whether this is a major version change",
            default: false,
          },
        },
        required: ["docId", "version", "comment"],
      },
    },

    {
      name: "document_get_version_history",
      description: "Get version history for a document",
      inputSchema: {
        type: "object",
        properties: {
          docId: {
            type: "string",
            description: "Document ID",
          },
        },
        required: ["docId"],
      },
    },

    // Statistics & Reporting
    {
      name: "document_get_statistics",
      description:
        "Get document statistics including counts by type, status, and phase",
      inputSchema: {
        type: "object",
        properties: {
          programId: {
            type: "string",
            description: "Optional: Filter by program ID",
          },
        },
      },
    },

    // Similar Documents
    {
      name: "document_find_similar",
      description:
        "Find documents similar to a given document based on type, category, and tags",
      inputSchema: {
        type: "object",
        properties: {
          docId: {
            type: "string",
            description: "Reference document ID",
          },
          limit: {
            type: "number",
            description: "Maximum number of similar documents to return",
            default: 5,
          },
        },
        required: ["docId"],
      },
    },
  ];
}

export type {
  Document,
  DocumentMetadata,
  CategorizationResult,
  FolderStructure,
  FolderNode,
  FolderMapping,
  FolderCreationRequest,
  FolderCreationResult,
  DocumentTemplate,
  DocumentVersion,
  DocumentSearchCriteria,
  DocumentRoutingRequest,
  DocumentRoutingResult,
};
