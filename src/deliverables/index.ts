/**
 * Deliverable Tracking Domain
 *
 * This module provides deliverable tracking and review workflows including:
 * - Deliverable CRUD operations
 * - Document submission workflows
 * - Review and approval processes
 * - Quality checklist validation
 * - Status tracking and notifications
 * - Deliverable reporting
 *
 * Phase 4 Implementation
 */

import type {
  Deliverable,
  DeliverableSubmission,
  DeliverableReview,
  ReviewComment,
  QualityChecklist,
  QualityChecklistResult,
  DeliverableApproval,
  DeliverableNotification,
  DeliverableReport,
  DeliverableSummary,
} from "../types/deliverable.js";

// Module exports
export * from "./deliverables.js";
export * from "./submissions.js";
export * from "./review.js";
export * from "./quality.js";
export * from "./tracking.js";
export * from "./reporting.js";

/**
 * Get MCP tool definitions for deliverable tracking
 */
export function getToolDefinitions() {
  return [
    // Deliverable CRUD Tools
    {
      name: "deliverable_create",
      description:
        "Create a new deliverable for a program. Deliverables are work products that must be created and delivered as part of a program.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Deliverable name",
          },
          description: {
            type: "string",
            description: "Detailed description of the deliverable",
          },
          type: {
            type: "string",
            description: "Deliverable type",
            enum: [
              "document",
              "design",
              "software",
              "hardware",
              "training",
              "report",
              "presentation",
              "prototype",
              "data",
              "other",
            ],
          },
          programId: {
            type: "string",
            description: "Program ID this deliverable belongs to",
          },
          wbsCode: {
            type: "string",
            description: "WBS (Work Breakdown Structure) code (optional)",
          },
          owner: {
            type: "string",
            description: "Owner email address (responsible person)",
          },
          dueDate: {
            type: "string",
            description: "Due date (ISO 8601 format: YYYY-MM-DD)",
          },
          priority: {
            type: "string",
            description: "Priority level",
            enum: ["critical", "high", "medium", "low"],
          },
          acceptanceCriteria: {
            type: "array",
            items: { type: "string" },
            description: "List of acceptance criteria (what defines done)",
          },
          notes: {
            type: "string",
            description: "Additional notes (optional)",
          },
        },
        required: [
          "name",
          "description",
          "type",
          "programId",
          "owner",
          "dueDate",
          "priority",
          "acceptanceCriteria",
        ],
      },
    },

    {
      name: "deliverable_read",
      description: "Read a deliverable by ID to get all its details",
      inputSchema: {
        type: "object",
        properties: {
          deliverableId: {
            type: "string",
            description: "Deliverable ID (e.g., D-001)",
          },
        },
        required: ["deliverableId"],
      },
    },

    {
      name: "deliverable_update",
      description:
        "Update a deliverable's details, status, dates, or other properties",
      inputSchema: {
        type: "object",
        properties: {
          deliverableId: {
            type: "string",
            description: "Deliverable ID to update",
          },
          name: {
            type: "string",
            description: "Updated name (optional)",
          },
          description: {
            type: "string",
            description: "Updated description (optional)",
          },
          owner: {
            type: "string",
            description: "Updated owner (optional)",
          },
          dueDate: {
            type: "string",
            description: "Updated due date (ISO 8601 format) (optional)",
          },
          forecastDate: {
            type: "string",
            description: "Forecast completion date (ISO 8601 format) (optional)",
          },
          actualDate: {
            type: "string",
            description: "Actual completion date (ISO 8601 format) (optional)",
          },
          status: {
            type: "string",
            description: "Updated status (optional)",
            enum: [
              "not_started",
              "in_progress",
              "submitted",
              "in_review",
              "approved",
              "rejected",
              "completed",
            ],
          },
          reviewStatus: {
            type: "string",
            description: "Updated review status (optional)",
            enum: ["pending", "in_review", "comments", "approved", "rejected"],
          },
          qualityScore: {
            type: "number",
            description: "Quality score 1-5 (optional)",
            minimum: 1,
            maximum: 5,
          },
          notes: {
            type: "string",
            description: "Updated notes (optional)",
          },
        },
        required: ["deliverableId"],
      },
    },

    {
      name: "deliverable_list",
      description: "List deliverables with optional filters",
      inputSchema: {
        type: "object",
        properties: {
          programId: {
            type: "string",
            description: "Filter by program ID (optional)",
          },
          status: {
            type: "string",
            description: "Filter by status (optional)",
            enum: [
              "not_started",
              "in_progress",
              "submitted",
              "in_review",
              "approved",
              "rejected",
              "completed",
            ],
          },
          owner: {
            type: "string",
            description: "Filter by owner email (optional)",
          },
          type: {
            type: "string",
            description: "Filter by type (optional)",
            enum: [
              "document",
              "design",
              "software",
              "hardware",
              "training",
              "report",
              "presentation",
              "prototype",
              "data",
              "other",
            ],
          },
        },
      },
    },

    {
      name: "deliverable_get_overdue",
      description: "Get all overdue deliverables for a program",
      inputSchema: {
        type: "object",
        properties: {
          programId: {
            type: "string",
            description: "Program ID",
          },
        },
        required: ["programId"],
      },
    },

    {
      name: "deliverable_get_at_risk",
      description:
        "Get deliverables at risk of missing their due date (forecast date > due date)",
      inputSchema: {
        type: "object",
        properties: {
          programId: {
            type: "string",
            description: "Program ID",
          },
        },
        required: ["programId"],
      },
    },

    {
      name: "deliverable_get_upcoming",
      description: "Get upcoming deliverables due within the next N days",
      inputSchema: {
        type: "object",
        properties: {
          programId: {
            type: "string",
            description: "Program ID",
          },
          daysAhead: {
            type: "number",
            description: "Number of days to look ahead (default: 30)",
            default: 30,
          },
        },
        required: ["programId"],
      },
    },

    // Submission Tools
    {
      name: "deliverable_submit",
      description:
        "Submit a deliverable for review. This triggers document routing, reviewer assignment, and notification workflows.",
      inputSchema: {
        type: "object",
        properties: {
          deliverableId: {
            type: "string",
            description: "Deliverable ID to submit",
          },
          fileIds: {
            type: "array",
            items: { type: "string" },
            description: "Google Drive file IDs of documents to submit",
          },
          submitterNotes: {
            type: "string",
            description: "Submission notes/comments",
          },
        },
        required: ["deliverableId", "fileIds"],
      },
    },

    {
      name: "deliverable_get_pending_submissions",
      description: "Get submissions pending review, optionally filtered by reviewer",
      inputSchema: {
        type: "object",
        properties: {
          reviewerId: {
            type: "string",
            description: "Filter by reviewer email (optional)",
          },
        },
      },
    },

    // Review Tools
    {
      name: "deliverable_assign_reviewer",
      description: "Manually assign a reviewer to a deliverable",
      inputSchema: {
        type: "object",
        properties: {
          deliverableId: {
            type: "string",
            description: "Deliverable ID",
          },
          reviewerId: {
            type: "string",
            description: "Reviewer email address",
          },
          dueDate: {
            type: "string",
            description: "Review due date (ISO 8601 format)",
          },
        },
        required: ["deliverableId", "reviewerId", "dueDate"],
      },
    },

    {
      name: "deliverable_submit_review",
      description:
        "Submit a review with decision (approve, reject, or request changes)",
      inputSchema: {
        type: "object",
        properties: {
          deliverableId: {
            type: "string",
            description: "Deliverable ID",
          },
          submissionId: {
            type: "string",
            description: "Submission ID being reviewed",
          },
          decision: {
            type: "string",
            description: "Review decision",
            enum: ["approve", "reject", "request_changes"],
          },
          comments: {
            type: "string",
            description: "Review comments/feedback",
          },
          qualityScore: {
            type: "number",
            description: "Quality score 1-5 (optional)",
            minimum: 1,
            maximum: 5,
          },
        },
        required: ["deliverableId", "submissionId", "decision"],
      },
    },

    {
      name: "deliverable_approve",
      description:
        "Approve a deliverable after review (final approval by program manager or sponsor)",
      inputSchema: {
        type: "object",
        properties: {
          approvalId: {
            type: "string",
            description: "Approval ID",
          },
          decision: {
            type: "string",
            description: "Approval decision",
            enum: ["approve", "reject", "conditional"],
          },
          comments: {
            type: "string",
            description: "Approval comments",
          },
          conditions: {
            type: "array",
            items: { type: "string" },
            description: "Conditions for conditional approval (optional)",
          },
        },
        required: ["approvalId", "decision", "comments"],
      },
    },

    {
      name: "deliverable_list_pending_reviews",
      description: "List pending reviews for a reviewer",
      inputSchema: {
        type: "object",
        properties: {
          reviewerId: {
            type: "string",
            description: "Reviewer email address",
          },
        },
        required: ["reviewerId"],
      },
    },

    {
      name: "deliverable_list_pending_approvals",
      description: "List pending approvals for an approver",
      inputSchema: {
        type: "object",
        properties: {
          approverId: {
            type: "string",
            description: "Approver email address",
          },
        },
        required: ["approverId"],
      },
    },

    // Quality Tools
    {
      name: "deliverable_create_checklist",
      description:
        "Create a quality checklist template for a deliverable type (or all types)",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Checklist name",
          },
          description: {
            type: "string",
            description: "Checklist description",
          },
          deliverableType: {
            type: "string",
            description: "Deliverable type (or 'all' for all types)",
            enum: [
              "document",
              "design",
              "software",
              "hardware",
              "training",
              "report",
              "presentation",
              "prototype",
              "data",
              "other",
              "all",
            ],
          },
        },
        required: ["name", "description", "deliverableType"],
      },
    },

    {
      name: "deliverable_evaluate_quality",
      description: "Evaluate a deliverable against a quality checklist",
      inputSchema: {
        type: "object",
        properties: {
          deliverableId: {
            type: "string",
            description: "Deliverable ID to evaluate",
          },
          checklistId: {
            type: "string",
            description: "Quality checklist ID",
          },
          results: {
            type: "array",
            description: "Evaluation results for each criterion",
            items: {
              type: "object",
              properties: {
                met: {
                  type: "boolean",
                  description: "Was the criterion met?",
                },
                score: {
                  type: "number",
                  description: "Score (optional)",
                },
                comments: {
                  type: "string",
                  description: "Comments (optional)",
                },
              },
              required: ["met"],
            },
          },
          reviewId: {
            type: "string",
            description: "Associated review ID (optional)",
          },
        },
        required: ["deliverableId", "checklistId", "results"],
      },
    },

    // Reporting Tools
    {
      name: "deliverable_generate_status_report",
      description: "Generate a status report for deliverables in a program",
      inputSchema: {
        type: "object",
        properties: {
          programId: {
            type: "string",
            description: "Program ID",
          },
          includeCharts: {
            type: "boolean",
            description: "Include charts/visualizations (default: true)",
            default: true,
          },
        },
        required: ["programId"],
      },
    },

    {
      name: "deliverable_generate_quality_report",
      description: "Generate a quality report showing quality scores and trends",
      inputSchema: {
        type: "object",
        properties: {
          programId: {
            type: "string",
            description: "Program ID",
          },
        },
        required: ["programId"],
      },
    },

    {
      name: "deliverable_generate_schedule_report",
      description: "Generate a schedule variance report",
      inputSchema: {
        type: "object",
        properties: {
          programId: {
            type: "string",
            description: "Program ID",
          },
        },
        required: ["programId"],
      },
    },

    {
      name: "deliverable_generate_summary",
      description: "Generate a summary dashboard with key metrics",
      inputSchema: {
        type: "object",
        properties: {
          programId: {
            type: "string",
            description: "Program ID",
          },
        },
        required: ["programId"],
      },
    },

    // Tracking Tools
    {
      name: "deliverable_track_status",
      description:
        "Record a status update/change for a deliverable (for audit trail)",
      inputSchema: {
        type: "object",
        properties: {
          deliverableId: {
            type: "string",
            description: "Deliverable ID",
          },
          status: {
            type: "string",
            description: "New status",
            enum: [
              "not_started",
              "in_progress",
              "submitted",
              "in_review",
              "approved",
              "rejected",
              "completed",
            ],
          },
          percentComplete: {
            type: "number",
            description: "Completion percentage (0-100)",
            minimum: 0,
            maximum: 100,
          },
          forecastDate: {
            type: "string",
            description: "Updated forecast date (ISO 8601 format) (optional)",
          },
          notes: {
            type: "string",
            description: "Status update notes",
          },
        },
        required: ["deliverableId", "status", "percentComplete", "notes"],
      },
    },

    {
      name: "deliverable_update_forecast",
      description: "Update the forecast completion date for a deliverable",
      inputSchema: {
        type: "object",
        properties: {
          deliverableId: {
            type: "string",
            description: "Deliverable ID",
          },
          forecastDate: {
            type: "string",
            description: "New forecast date (ISO 8601 format)",
          },
          confidence: {
            type: "number",
            description: "Confidence level (0-100)",
            minimum: 0,
            maximum: 100,
          },
          factors: {
            type: "array",
            items: { type: "string" },
            description: "Factors affecting the forecast",
          },
        },
        required: ["deliverableId", "forecastDate", "confidence", "factors"],
      },
    },

    {
      name: "deliverable_check_notifications",
      description:
        "Check for deliverables needing notifications (overdue, due soon, etc.) and queue them",
      inputSchema: {
        type: "object",
        properties: {
          programId: {
            type: "string",
            description: "Program ID to check",
          },
        },
        required: ["programId"],
      },
    },
  ];
}

export type {
  Deliverable,
  DeliverableSubmission,
  DeliverableReview,
  ReviewComment,
  QualityChecklist,
  QualityChecklistResult,
  DeliverableApproval,
  DeliverableNotification,
  DeliverableReport,
  DeliverableSummary,
};
