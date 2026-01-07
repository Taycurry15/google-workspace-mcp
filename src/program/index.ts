/**
 * Program Management Domain
 *
 * This module provides program management functionality including:
 * - Program charters and workstream organization
 * - WBS (Work Breakdown Structure) hierarchy
 * - Master schedules and milestone tracking
 * - Change control and issue management
 * - Decision logging and lessons learned
 * - Governance and board meetings
 *
 * Phase 2 Implementation
 */

import type {
  Program,
  Workstream,
  Project,
  Milestone,
  WBS,
  ScheduleActivity,
  ChangeRequest,
  Issue,
  Decision,
  LessonLearned,
  GovernanceMeeting,
  Stakeholder,
} from "../types/program.js";

// Module exports
export * from "./charter.js";
export * from "./wbs.js";
export * from "./milestones.js";
export * from "./schedule.js";
export * from "./change-control.js";
export * from "./issue-log.js";
export * from "./decision-log.js";
export * from "./lessons.js";
export * from "./governance.js";

export type {
  Program,
  Workstream,
  Project,
  Milestone,
  WBS,
  ScheduleActivity,
  ChangeRequest,
  Issue,
  Decision,
  LessonLearned,
  GovernanceMeeting,
  Stakeholder,
};

/**
 * Get tool definitions for program management
 */
export function getToolDefinitions() {
  return [
    // Program Charter Tools
    {
      name: "program_create_charter",
      description: "Create a new program charter with objectives, timeline, and stakeholders",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Program name" },
          description: { type: "string", description: "Program description" },
          sponsor: { type: "string", description: "Executive sponsor email" },
          programManager: { type: "string", description: "Program manager email" },
          objective: { type: "string", description: "Program objective" },
          startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
          endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
          priority: {
            type: "string",
            enum: ["critical", "high", "medium", "low"],
            description: "Priority level",
          },
          stakeholders: {
            type: "array",
            items: { type: "string" },
            description: "Stakeholder emails",
          },
          tags: { type: "array", items: { type: "string" }, description: "Tags" },
        },
        required: ["name", "description", "sponsor", "programManager", "objective", "startDate", "endDate"],
      },
    },
    {
      name: "program_read_charter",
      description: "Read a program charter by ID",
      inputSchema: {
        type: "object",
        properties: {
          programId: { type: "string", description: "Program ID (e.g., PROG-001)" },
        },
        required: ["programId"],
      },
    },
    {
      name: "program_update_charter",
      description: "Update a program charter",
      inputSchema: {
        type: "object",
        properties: {
          programId: { type: "string", description: "Program ID" },
          updates: {
            type: "object",
            description: "Fields to update",
            properties: {
              status: {
                type: "string",
                enum: ["initiation", "planning", "execution", "monitoring", "closing", "on_hold", "cancelled", "completed"],
              },
              health: { type: "string", enum: ["green", "amber", "red"] },
              percentComplete: { type: "number", minimum: 0, maximum: 100 },
            },
          },
        },
        required: ["programId", "updates"],
      },
    },
    {
      name: "program_list_charters",
      description: "List all program charters with optional filters",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status" },
          priority: { type: "string", description: "Filter by priority" },
          health: { type: "string", description: "Filter by health" },
        },
      },
    },

    // WBS Tools
    {
      name: "program_create_wbs",
      description: "Create a Work Breakdown Structure element",
      inputSchema: {
        type: "object",
        properties: {
          wbsCode: { type: "string", description: "WBS code (e.g., 1.2.3)" },
          programId: { type: "string", description: "Program ID" },
          parentCode: { type: "string", description: "Parent WBS code" },
          description: { type: "string", description: "WBS element description" },
          responsible: { type: "string", description: "Responsible person email" },
          deliverables: {
            type: "array",
            items: { type: "string" },
            description: "Associated deliverable IDs",
          },
        },
        required: ["wbsCode", "programId", "description", "responsible"],
      },
    },
    {
      name: "program_read_wbs",
      description: "Read WBS hierarchy for a program",
      inputSchema: {
        type: "object",
        properties: {
          programId: { type: "string", description: "Program ID" },
          level: { type: "number", description: "Filter by WBS level (optional)" },
        },
        required: ["programId"],
      },
    },

    // Milestone Tools
    {
      name: "program_create_milestone",
      description: "Create a program milestone",
      inputSchema: {
        type: "object",
        properties: {
          programId: { type: "string", description: "Program ID" },
          projectId: { type: "string", description: "Associated project ID (optional)" },
          wbsCode: { type: "string", description: "WBS code (optional)" },
          name: { type: "string", description: "Milestone name" },
          description: { type: "string", description: "Milestone description" },
          targetDate: { type: "string", description: "Target date (YYYY-MM-DD)" },
          owner: { type: "string", description: "Milestone owner email" },
          acceptanceCriteria: { type: "string", description: "What defines completion" },
          critical: { type: "boolean", description: "Is this critical path?" },
        },
        required: ["programId", "name", "description", "targetDate", "owner", "acceptanceCriteria"],
      },
    },
    {
      name: "program_track_milestone",
      description: "Update milestone status and dates",
      inputSchema: {
        type: "object",
        properties: {
          milestoneId: { type: "string", description: "Milestone ID (e.g., M-001)" },
          status: {
            type: "string",
            enum: ["not_started", "in_progress", "at_risk", "achieved", "missed"],
          },
          actualDate: { type: "string", description: "Actual completion date (YYYY-MM-DD)" },
          forecastDate: { type: "string", description: "Forecasted date (YYYY-MM-DD)" },
        },
        required: ["milestoneId"],
      },
    },
    {
      name: "program_get_milestones",
      description: "Get milestones for a program with optional filters",
      inputSchema: {
        type: "object",
        properties: {
          programId: { type: "string", description: "Program ID" },
          status: { type: "string", description: "Filter by status" },
          critical: { type: "boolean", description: "Filter critical milestones only" },
          upcoming: { type: "boolean", description: "Show upcoming (next 30 days)" },
        },
        required: ["programId"],
      },
    },

    // Issue Log Tools
    {
      name: "program_log_issue",
      description: "Log a new program issue",
      inputSchema: {
        type: "object",
        properties: {
          programId: { type: "string", description: "Program ID" },
          title: { type: "string", description: "Issue title" },
          description: { type: "string", description: "Issue description" },
          category: {
            type: "string",
            enum: ["technical", "resource", "schedule", "quality", "stakeholder", "other"],
          },
          priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
          severity: { type: "string", enum: ["critical", "major", "minor"] },
          raisedBy: { type: "string", description: "Who raised the issue (email)" },
          impact: { type: "string", description: "Impact assessment" },
        },
        required: ["programId", "title", "description", "category", "priority", "severity", "raisedBy", "impact"],
      },
    },
    {
      name: "program_track_issue",
      description: "Update issue status and resolution",
      inputSchema: {
        type: "object",
        properties: {
          issueId: { type: "string", description: "Issue ID (e.g., ISS-001)" },
          status: {
            type: "string",
            enum: ["open", "in_progress", "resolved", "closed", "escalated"],
          },
          assignedTo: { type: "string", description: "Assigned to (email)" },
          resolution: { type: "string", description: "Resolution description" },
          resolvedDate: { type: "string", description: "Resolution date (YYYY-MM-DD)" },
        },
        required: ["issueId"],
      },
    },
    {
      name: "program_get_issues",
      description: "Get issues for a program with filters",
      inputSchema: {
        type: "object",
        properties: {
          programId: { type: "string", description: "Program ID" },
          status: { type: "string", description: "Filter by status" },
          priority: { type: "string", description: "Filter by priority" },
          severity: { type: "string", description: "Filter by severity" },
        },
        required: ["programId"],
      },
    },

    // Decision Log Tools
    {
      name: "program_log_decision",
      description: "Log a program decision",
      inputSchema: {
        type: "object",
        properties: {
          programId: { type: "string", description: "Program ID" },
          decision: { type: "string", description: "The decision made" },
          context: { type: "string", description: "Decision context/background" },
          alternatives: {
            type: "array",
            items: { type: "string" },
            description: "Alternatives considered",
          },
          rationale: { type: "string", description: "Why this decision was made" },
          decisionMaker: { type: "string", description: "Who made the decision (email)" },
          stakeholders: {
            type: "array",
            items: { type: "string" },
            description: "Involved stakeholders",
          },
          impacts: { type: "array", items: { type: "string" }, description: "Expected impacts" },
          category: {
            type: "string",
            enum: ["strategic", "technical", "operational", "financial", "other"],
          },
        },
        required: ["programId", "decision", "context", "alternatives", "rationale", "decisionMaker"],
      },
    },
    {
      name: "program_get_decisions",
      description: "Get decisions for a program",
      inputSchema: {
        type: "object",
        properties: {
          programId: { type: "string", description: "Program ID" },
          category: { type: "string", description: "Filter by category" },
          decisionMaker: { type: "string", description: "Filter by decision maker" },
        },
        required: ["programId"],
      },
    },
  ];
}
