/**
 * Program Management Type Definitions
 *
 * This file defines all types for program management including:
 * - Programs, Workstreams, Projects
 * - Milestones and WBS (Work Breakdown Structure)
 * - Change Control, Issues, Decisions
 * - Governance and Lessons Learned
 */

/**
 * Program Status enumeration
 */
export type ProgramStatus =
  | "initiation"
  | "planning"
  | "execution"
  | "monitoring"
  | "closing"
  | "on_hold"
  | "cancelled"
  | "completed";

/**
 * Program Priority levels
 */
export type ProgramPriority = "critical" | "high" | "medium" | "low";

/**
 * Health Status (RAG)
 */
export type HealthStatus = "green" | "amber" | "red";

/**
 * Program Interface
 * Represents a large-scale government program
 */
export interface Program {
  programId: string;              // Unique identifier (e.g., PROG-001)
  name: string;                   // Program name
  description: string;            // Program description
  sponsor: string;                // Executive sponsor
  programManager: string;         // Program manager
  objective: string;              // Program objective
  startDate: Date;                // Planned start date
  endDate: Date;                  // Planned end date
  actualStartDate?: Date;         // Actual start date
  actualEndDate?: Date;           // Actual end date
  status: ProgramStatus;          // Current status
  priority: ProgramPriority;      // Priority level
  health: HealthStatus;           // Overall health (RAG)
  budget?: number;                // Total budget (optional - not tracking finances)
  percentComplete: number;        // Overall completion percentage (0-100)
  spreadsheetId: string;          // Google Sheets ID for program data
  rootFolderId: string;           // Google Drive root folder ID
  stakeholders: string[];         // List of stakeholder emails
  tags: string[];                 // Keywords/tags
  createdDate: Date;              // When program was created
  modifiedDate: Date;             // Last modification date
  createdBy: string;              // Who created the program
}

/**
 * Workstream Interface
 * Major component of a program
 */
export interface Workstream {
  workstreamId: string;           // Unique identifier (e.g., WS-001)
  programId: string;              // Parent program
  name: string;                   // Workstream name
  description: string;            // Description
  lead: string;                   // Workstream lead
  startDate: Date;                // Start date
  endDate: Date;                  // End date
  status: ProgramStatus;          // Current status
  health: HealthStatus;           // Health status
  percentComplete: number;        // Completion percentage
  dependencies: string[];         // Dependent workstream IDs
}

/**
 * Project Interface
 * Individual project within a workstream
 */
export interface Project {
  projectId: string;              // Unique identifier (e.g., PROJ-001)
  programId: string;              // Parent program
  workstreamId?: string;          // Parent workstream (optional)
  name: string;                   // Project name
  description: string;            // Description
  projectManager: string;         // Project manager
  startDate: Date;                // Start date
  endDate: Date;                  // End date
  status: ProgramStatus;          // Current status
  health: HealthStatus;           // Health status
  percentComplete: number;        // Completion percentage
  wbsCode?: string;               // WBS alignment
  dependencies: string[];         // Dependent project IDs
}

/**
 * WBS (Work Breakdown Structure) Interface
 */
export interface WBS {
  wbsCode: string;                // Hierarchical code (e.g., 1.2.3)
  programId: string;              // Parent program
  parentCode?: string;            // Parent WBS code
  level: number;                  // Hierarchy level (1=top, 2=sub, etc.)
  description: string;            // WBS element description
  deliverables: string[];         // Associated deliverable IDs
  responsible: string;            // Responsible person
  status: ProgramStatus;          // Current status
  percentComplete: number;        // Completion percentage
}

/**
 * Milestone Interface
 */
export interface Milestone {
  milestoneId: string;            // Unique identifier (e.g., M-001)
  programId: string;              // Parent program
  projectId?: string;             // Associated project (optional)
  wbsCode?: string;               // WBS alignment
  name: string;                   // Milestone name
  description: string;            // Description
  targetDate: Date;               // Target completion date
  forecastDate?: Date;            // Forecasted date (if different)
  actualDate?: Date;              // Actual completion date
  status: "not_started" | "in_progress" | "at_risk" | "achieved" | "missed";
  owner: string;                  // Milestone owner
  dependencies: string[];         // Dependent milestone IDs
  deliverables: string[];         // Required deliverables
  acceptanceCriteria: string;     // What defines completion
  health: HealthStatus;           // Health status
  critical: boolean;              // Is this a critical milestone?
}

/**
 * Schedule Activity Interface
 */
export interface ScheduleActivity {
  activityId: string;             // Unique identifier
  programId: string;              // Parent program
  wbsCode?: string;               // WBS alignment
  name: string;                   // Activity name
  description: string;            // Description
  startDate: Date;                // Planned start
  endDate: Date;                  // Planned end
  duration: number;               // Duration in days
  actualStart?: Date;             // Actual start
  actualEnd?: Date;               // Actual end
  percentComplete: number;        // Completion percentage
  dependencies: string[];         // Predecessor activity IDs
  responsible: string;            // Responsible person
  status: ProgramStatus;          // Current status
  critical: boolean;              // Is on critical path?
}

/**
 * Change Request Interface
 */
export interface ChangeRequest {
  changeId: string;               // Unique identifier (e.g., CR-001)
  programId: string;              // Parent program
  title: string;                  // Change title
  description: string;            // Detailed description
  requestedBy: string;            // Who requested
  requestDate: Date;              // When requested
  category: "scope" | "schedule" | "quality" | "resources" | "other";
  priority: ProgramPriority;      // Priority level
  impact: string;                 // Impact assessment
  justification: string;          // Business justification
  status: "submitted" | "under_review" | "approved" | "rejected" | "implemented";
  decision?: "approve" | "reject" | "defer";
  decisionDate?: Date;            // When decided
  approver?: string;              // Who approved/rejected
  approverComments?: string;      // Approver feedback
  implementationDate?: Date;      // When implemented
  affectedDeliverables: string[]; // Impacted deliverable IDs
  affectedMilestones: string[];   // Impacted milestone IDs
}

/**
 * Issue Interface
 */
export interface Issue {
  issueId: string;                // Unique identifier (e.g., ISS-001)
  programId: string;              // Parent program
  projectId?: string;             // Associated project
  title: string;                  // Issue title
  description: string;            // Detailed description
  category: "technical" | "resource" | "schedule" | "quality" | "stakeholder" | "other";
  priority: ProgramPriority;      // Priority level
  severity: "critical" | "major" | "minor";
  status: "open" | "in_progress" | "resolved" | "closed" | "escalated";
  raisedBy: string;               // Who raised the issue
  raisedDate: Date;               // When raised
  assignedTo?: string;            // Who is assigned
  dueDate?: Date;                 // Resolution due date
  resolvedDate?: Date;            // When resolved
  resolution?: string;            // Resolution description
  relatedIssues: string[];        // Related issue IDs
  relatedRisks: string[];         // Related risk IDs
  escalated: boolean;             // Has been escalated?
  impact: string;                 // Impact assessment
}

/**
 * Decision Interface
 */
export interface Decision {
  decisionId: string;             // Unique identifier (e.g., DEC-001)
  programId: string;              // Parent program
  decision: string;               // The decision made
  context: string;                // Decision context/background
  alternatives: string[];         // Alternative options considered
  rationale: string;              // Why this decision was made
  decisionDate: Date;             // When decided
  decisionMaker: string;          // Who made the decision
  stakeholders: string[];         // Involved stakeholders
  impacts: string[];              // Expected impacts
  category: "strategic" | "technical" | "operational" | "financial" | "other";
  status: "proposed" | "approved" | "implemented" | "reversed";
  implementationDate?: Date;      // When implemented
  reviewDate?: Date;              // When to review
  relatedDecisions: string[];     // Related decision IDs
}

/**
 * Lesson Learned Interface
 */
export interface LessonLearned {
  lessonId: string;               // Unique identifier (e.g., LL-001)
  programId: string;              // Parent program
  category: "technical" | "process" | "people" | "stakeholder" | "risk" | "other";
  lesson: string;                 // The lesson learned
  context: string;                // What happened
  impact: string;                 // What was the impact
  recommendation: string;         // What should be done differently
  dateRecorded: Date;             // When recorded
  recordedBy: string;             // Who recorded it
  phase: ProgramStatus;           // Which phase it occurred in
  tags: string[];                 // Keywords for searchability
  positive: boolean;              // Was this a positive lesson?
}

/**
 * Governance Meeting Interface
 */
export interface GovernanceMeeting {
  meetingId: string;              // Unique identifier (e.g., GM-001)
  programId: string;              // Parent program
  meetingType: "steering_committee" | "board" | "review" | "status" | "other";
  title: string;                  // Meeting title
  date: Date;                     // Meeting date
  duration: number;               // Duration in minutes
  attendees: string[];            // Attendee emails
  chair: string;                  // Meeting chair
  agenda: string[];               // Agenda items
  decisions: string[];            // Decision IDs made during meeting
  actionItems: ActionItem[];      // Action items from meeting
  minutesFileId?: string;         // Google Docs file ID for minutes
  status: "scheduled" | "completed" | "cancelled";
}

/**
 * Action Item Interface (from governance meetings)
 */
export interface ActionItem {
  actionId: string;               // Unique identifier
  description: string;            // What needs to be done
  owner: string;                  // Who is responsible
  dueDate: Date;                  // When due
  status: "open" | "in_progress" | "completed" | "cancelled";
  completedDate?: Date;           // When completed
}

/**
 * Stakeholder Interface
 */
export interface Stakeholder {
  stakeholderId: string;          // Unique identifier
  programId: string;              // Parent program
  name: string;                   // Stakeholder name
  email: string;                  // Email address
  organization: string;           // Organization/company
  role: string;                   // Role/title
  type: "sponsor" | "client" | "team" | "vendor" | "regulator" | "other";
  influence: "high" | "medium" | "low"; // Level of influence
  interest: "high" | "medium" | "low";  // Level of interest
  strategy: string;               // Engagement strategy (manage closely, keep satisfied, keep informed, monitor)
  contactFrequency: "daily" | "weekly" | "monthly" | "quarterly" | "as_needed";
  preferredComms: "email" | "phone" | "meeting" | "report";
  notes: string;                  // Additional notes
}
