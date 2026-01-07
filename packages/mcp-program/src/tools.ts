/**
 * MCP Tool Definitions for Program Management Server
 *
 * Defines all tools exposed via the MCP protocol
 */

import type { OAuth2Client } from "google-auth-library";
import { initializeAuth } from "@gw-mcp/shared-core";
import * as charter from "./program/charter.js";
import * as wbs from "./program/wbs.js";
import * as milestones from "./program/milestones.js";
import * as schedule from "./program/schedule.js";
import * as issueLog from "./program/issue-log.js";
import * as decisionLog from "./program/decision-log.js";
import * as changeControl from "./program/change-control.js";
import * as lessons from "./program/lessons.js";
import * as governance from "./program/governance.js";

// Global auth client (initialized on first use)
let authClient: OAuth2Client | null = null;

async function getAuth(): Promise<OAuth2Client> {
  if (!authClient) {
    authClient = await initializeAuth();
  }
  return authClient;
}

/**
 * Tool definitions for Program Management
 */
export const PROGRAM_TOOLS = [
  // Program Charter Tools
  {
    name: "program_charter_create",
    description: "Create a new program charter with vision, objectives, scope, stakeholders, and success criteria",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string", description: "Program ID (e.g., PROG-001)" },
        name: { type: "string", description: "Program name" },
        description: { type: "string", description: "Program description" },
        vision: { type: "string", description: "Program vision statement" },
        objectives: { type: "array", items: { type: "string" }, description: "Program objectives" },
        scope: { type: "object", description: "In-scope and out-of-scope items" },
        stakeholders: { type: "array", items: { type: "object" }, description: "Key stakeholders" },
        successCriteria: { type: "array", items: { type: "string" }, description: "Success criteria" },
        startDate: { type: "string", description: "Program start date (YYYY-MM-DD)" },
        endDate: { type: "string", description: "Program end date (YYYY-MM-DD)" },
        budget: { type: "number", description: "Program budget" },
        sponsor: { type: "string", description: "Program sponsor" },
        manager: { type: "string", description: "Program manager" },
      },
      required: ["programId", "name", "description"],
    },
  },
  {
    name: "program_charter_read",
    description: "Read an existing program charter",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string", description: "Program ID" },
      },
      required: ["programId"],
    },
  },

  // WBS Tools
  {
    name: "program_wbs_create",
    description: "Create a Work Breakdown Structure element",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string", description: "Program ID" },
        wbsCode: { type: "string", description: "WBS code (e.g., 1.2.3)" },
        name: { type: "string", description: "Element name" },
        description: { type: "string", description: "Element description" },
        level: { type: "number", description: "WBS level (1-5)" },
        parent: { type: "string", description: "Parent WBS code" },
        owner: { type: "string", description: "Element owner" },
      },
      required: ["programId", "wbsCode", "name", "level"],
    },
  },

  // Milestone Tools
  {
    name: "program_milestone_create",
    description: "Create a program milestone",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string", description: "Program ID" },
        projectId: { type: "string", description: "Project ID (optional)" },
        wbsCode: { type: "string", description: "WBS code (optional)" },
        name: { type: "string", description: "Milestone name" },
        description: { type: "string", description: "Milestone description" },
        targetDate: { type: "string", description: "Target date (YYYY-MM-DD)" },
        owner: { type: "string", description: "Milestone owner" },
        acceptanceCriteria: { type: "string", description: "Acceptance criteria" },
        critical: { type: "boolean", description: "Is critical path milestone" },
        deliverables: { type: "array", items: { type: "string" }, description: "Linked deliverable IDs" },
      },
      required: ["programId", "name", "description", "targetDate", "owner", "acceptanceCriteria"],
    },
  },
  {
    name: "program_milestone_track",
    description: "Update milestone status and track progress",
    inputSchema: {
      type: "object",
      properties: {
        milestoneId: { type: "string", description: "Milestone ID (e.g., M-001)" },
        status: { type: "string", enum: ["not_started", "in_progress", "at_risk", "achieved", "missed"] },
        actualDate: { type: "string", description: "Actual completion date (YYYY-MM-DD)" },
        forecastDate: { type: "string", description: "Forecast date (YYYY-MM-DD)" },
        health: { type: "string", enum: ["green", "amber", "red"] },
      },
      required: ["milestoneId"],
    },
  },
  {
    name: "program_milestones_list",
    description: "Get milestones for a program with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string", description: "Program ID" },
        status: { type: "string", description: "Filter by status" },
        critical: { type: "boolean", description: "Filter by critical path" },
        upcoming: { type: "boolean", description: "Only upcoming milestones (next 30 days)" },
      },
      required: ["programId"],
    },
  },

  // Schedule Tools
  {
    name: "program_schedule_activity_create",
    description: "Create a schedule activity",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string", description: "Program ID" },
        projectId: { type: "string", description: "Project ID (optional)" },
        wbsCode: { type: "string", description: "WBS code (optional)" },
        activityId: { type: "string", description: "Activity ID (e.g., ACT-001)" },
        name: { type: "string", description: "Activity name" },
        description: { type: "string", description: "Activity description" },
        startDate: { type: "string", description: "Planned start date (YYYY-MM-DD)" },
        endDate: { type: "string", description: "Planned end date (YYYY-MM-DD)" },
        duration: { type: "number", description: "Duration in days" },
        owner: { type: "string", description: "Activity owner" },
        dependencies: { type: "array", items: { type: "string" }, description: "Dependent activity IDs" },
        criticalPath: { type: "boolean", description: "Is on critical path" },
      },
      required: ["programId", "activityId", "name", "startDate", "endDate"],
    },
  },
  {
    name: "program_schedule_activity_list",
    description: "List schedule activities with filters",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string", description: "Program ID" },
        status: { type: "string", description: "Filter by status" },
        criticalPath: { type: "boolean", description: "Only critical path activities" },
      },
      required: ["programId"],
    },
  },

  // Issue Log Tools
  {
    name: "program_issue_create",
    description: "Create a program issue",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string", description: "Program ID" },
        title: { type: "string", description: "Issue title" },
        description: { type: "string", description: "Issue description" },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        assignedTo: { type: "string", description: "Assigned to" },
        dueDate: { type: "string", description: "Due date (YYYY-MM-DD)" },
      },
      required: ["programId", "title", "description", "priority"],
    },
  },
  {
    name: "program_issue_list",
    description: "List program issues",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string", description: "Program ID" },
        status: { type: "string", enum: ["open", "in_progress", "resolved", "closed"] },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
      },
      required: ["programId"],
    },
  },

  // Decision Log Tools
  {
    name: "program_decision_create",
    description: "Record a program decision",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string", description: "Program ID" },
        title: { type: "string", description: "Decision title" },
        description: { type: "string", description: "Decision description" },
        decision: { type: "string", description: "The decision made" },
        rationale: { type: "string", description: "Decision rationale" },
        decisionBy: { type: "string", description: "Decision maker" },
        date: { type: "string", description: "Decision date (YYYY-MM-DD)" },
      },
      required: ["programId", "title", "decision", "rationale", "decisionBy"],
    },
  },

  // Change Control Tools
  {
    name: "program_change_request_create",
    description: "Create a change request",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string", description: "Program ID" },
        title: { type: "string", description: "Change request title" },
        description: { type: "string", description: "Change description" },
        category: { type: "string", enum: ["scope", "schedule", "budget", "resource", "quality", "risk"] },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        requestedBy: { type: "string", description: "Requestor" },
        justification: { type: "string", description: "Justification for change" },
        affectedDeliverables: { type: "array", items: { type: "string" } },
        affectedMilestones: { type: "array", items: { type: "string" } },
        estimatedImpact: { type: "object", description: "Impact on schedule, budget, etc." },
      },
      required: ["programId", "title", "description", "category", "priority", "requestedBy"],
    },
  },
  {
    name: "program_change_request_review",
    description: "Review a change request (approve/reject)",
    inputSchema: {
      type: "object",
      properties: {
        changeId: { type: "string", description: "Change request ID" },
        decision: { type: "string", enum: ["approve", "reject"] },
        approver: { type: "string", description: "Approver name" },
        comments: { type: "string", description: "Review comments" },
      },
      required: ["changeId", "decision", "approver"],
    },
  },
  {
    name: "program_change_request_list",
    description: "List change requests",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string", description: "Program ID" },
        status: { type: "string", enum: ["pending", "approved", "rejected", "implemented"] },
      },
      required: ["programId"],
    },
  },

  // Lessons Learned Tools
  {
    name: "program_lesson_capture",
    description: "Capture a lesson learned",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string", description: "Program ID" },
        title: { type: "string", description: "Lesson title" },
        description: { type: "string", description: "What happened" },
        category: { type: "string", enum: ["process", "technical", "communication", "risk", "resource", "vendor"] },
        impact: { type: "string", enum: ["positive", "negative", "neutral"] },
        lesson: { type: "string", description: "What was learned" },
        recommendation: { type: "string", description: "Recommendations for future" },
        submittedBy: { type: "string", description: "Submitter" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["programId", "title", "description", "category", "impact", "lesson"],
    },
  },
  {
    name: "program_lesson_search",
    description: "Search lessons learned",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string", description: "Program ID (optional, omit for all programs)" },
        category: { type: "string", description: "Filter by category" },
        tags: { type: "array", items: { type: "string" }, description: "Filter by tags" },
        searchTerm: { type: "string", description: "Search in title/description/lesson" },
      },
    },
  },

  // Governance Tools
  {
    name: "program_governance_schedule",
    description: "Schedule a governance meeting",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string", description: "Program ID" },
        meetingType: { type: "string", enum: ["steering", "review", "checkpoint", "decision"] },
        date: { type: "string", description: "Meeting date (YYYY-MM-DD)" },
        time: { type: "string", description: "Meeting time (HH:MM)" },
        duration: { type: "number", description: "Duration in minutes" },
        location: { type: "string", description: "Location or meeting link" },
        attendees: { type: "array", items: { type: "string" }, description: "Attendee emails" },
        agenda: { type: "array", items: { type: "string" }, description: "Agenda items" },
      },
      required: ["programId", "meetingType", "date", "attendees"],
    },
  },
  {
    name: "program_governance_record_minutes",
    description: "Record governance meeting minutes",
    inputSchema: {
      type: "object",
      properties: {
        meetingId: { type: "string", description: "Meeting ID" },
        attendees: { type: "array", items: { type: "string" } },
        absentees: { type: "array", items: { type: "string" } },
        decisions: { type: "array", items: { type: "object" } },
        actionItems: { type: "array", items: { type: "object" } },
        notes: { type: "string", description: "Additional notes" },
      },
      required: ["meetingId", "attendees", "decisions"],
    },
  },
  {
    name: "program_governance_action_item_create",
    description: "Create a governance action item",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string", description: "Program ID" },
        meetingId: { type: "string", description: "Source meeting ID (optional)" },
        title: { type: "string", description: "Action item title" },
        description: { type: "string", description: "Action item description" },
        assignedTo: { type: "string", description: "Assigned to" },
        dueDate: { type: "string", description: "Due date (YYYY-MM-DD)" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
      },
      required: ["programId", "title", "assignedTo", "dueDate"],
    },
  },
];

/**
 * Tool handlers - maps tool names to implementation functions
 */
export async function handleToolCall(name: string, args: any): Promise<any> {
  const auth = await getAuth();

  switch (name) {
    // Charter
    case "program_charter_create":
      return await charter.createCharter(auth, args);
    case "program_charter_read":
      return await charter.readCharter(auth, args.programId);

    // WBS
    case "program_wbs_create":
      return await wbs.createWBS(auth, args);

    // Milestones
    case "program_milestone_create":
      return await milestones.createMilestone(auth, args);
    case "program_milestone_track":
      return await milestones.trackMilestone(auth, args.milestoneId, args);
    case "program_milestones_list":
      return await milestones.getMilestones(auth, args.programId, args);

    // Schedule
    case "program_schedule_activity_create":
      return await schedule.createScheduleActivity(auth, args);
    case "program_schedule_activity_list":
      return await schedule.listScheduleActivities(auth, { programId: args.programId, ...args });

    // Issue Log
    case "program_issue_create":
      return await issueLog.logIssue(auth, args);
    case "program_issue_list":
      return await issueLog.getIssues(auth, args.programId, args);

    // Decision Log
    case "program_decision_create":
      return await decisionLog.logDecision(auth, args);

    // Change Control
    case "program_change_request_create":
      return await changeControl.createChangeRequest(auth, args);
    case "program_change_request_review":
      return await changeControl.reviewChangeRequest(auth, args.changeId, args.decision, args.approver, args.comments);
    case "program_change_request_list":
      return await changeControl.listChangeRequests(auth, { programId: args.programId, ...args });

    // Lessons Learned
    case "program_lesson_capture":
      return await lessons.captureLessonLearned(auth, args);
    case "program_lesson_search":
      return await lessons.searchLessons(auth, args);

    // Governance
    case "program_governance_schedule":
      return await governance.scheduleGovernanceMeeting(auth, args);
    case "program_governance_record_minutes":
      return await governance.recordGovernanceMinutes(auth, args.meetingId, args);
    case "program_governance_action_item_create":
      return await governance.createActionItem(auth, args.meetingId, args.programId, {
        description: args.description,
        owner: args.assignedTo,
        dueDate: new Date(args.dueDate),
      });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
