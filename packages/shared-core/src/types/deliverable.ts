/**
 * Deliverable Tracking Type Definitions
 *
 * This file defines all types for deliverable tracking including:
 * - Deliverables and submissions
 * - Reviews and approvals
 * - Quality checklists
 * - Status tracking and notifications
 */

/**
 * Deliverable Type enumeration
 */
export type DeliverableType =
  | "document"
  | "design"
  | "software"
  | "hardware"
  | "training"
  | "report"
  | "presentation"
  | "prototype"
  | "data"
  | "other";

/**
 * Deliverable Status
 */
export type DeliverableStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "completed";

/**
 * Review Status
 */
export type ReviewStatus =
  | "pending"
  | "in_review"
  | "comments"
  | "approved"
  | "rejected";

/**
 * Review Decision
 */
export type ReviewDecision = "approve" | "reject" | "request_changes";

/**
 * Approval Status
 */
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "conditional";

/**
 * Deliverable Interface
 * Represents a program deliverable
 */
export interface Deliverable {
  deliverableId: string;          // Unique identifier (e.g., D-001)
  programId: string;              // Parent program
  projectId?: string;             // Associated project
  workstreamId?: string;          // Associated workstream
  wbsCode?: string;               // WBS alignment
  name: string;                   // Deliverable name
  description: string;            // Detailed description
  type: DeliverableType;          // Deliverable type
  owner: string;                  // Responsible person email
  dueDate: Date;                  // Target delivery date
  forecastDate?: Date;            // Current forecast date
  actualDate?: Date;              // Actual delivery date
  variance?: number;              // Schedule variance in days
  status: DeliverableStatus;      // Current status
  reviewStatus: ReviewStatus;     // Review state
  percentComplete: number;        // Completion percentage (0-100)
  qualityScore?: number;          // Quality rating (1-5)
  acceptanceCriteria: string;     // What defines "done"
  dependencies: string[];         // Dependent deliverable IDs
  relatedDocuments: string[];     // Associated document IDs (Drive file IDs)
  relatedMilestones: string[];    // Associated milestone IDs
  tags: string[];                 // Keywords/tags
  notes: string;                  // Additional notes
  createdDate: Date;              // When created
  createdBy: string;              // Who created
  modifiedDate: Date;             // Last modified
  modifiedBy: string;             // Who modified
}

/**
 * Deliverable Submission
 * Record of a deliverable submission
 */
export interface DeliverableSubmission {
  submissionId: string;           // Unique submission ID
  deliverableId: string;          // Parent deliverable
  submittedBy: string;            // Who submitted
  submittedDate: Date;            // When submitted
  version: string;                // Version submitted (e.g., 1.0)
  fileIds: string[];              // Google Drive file IDs
  submitterNotes: string;         // Submission notes/comments
  status: ReviewStatus;           // Current review status
  reviewerId?: string;            // Assigned reviewer
  reviewDueDate?: Date;           // Review deadline
  completenessCheck: CompletenessCheck; // Submission completeness
  notificationsSent: string[];    // Recipients notified
}

/**
 * Completeness Check
 * Validates submission completeness
 */
export interface CompletenessCheck {
  complete: boolean;              // Is submission complete
  missingItems: string[];         // What's missing
  checks: {
    hasDocuments: boolean;        // Has attached documents
    meetsAcceptanceCriteria: boolean; // Acceptance criteria defined
    hasRequiredFields: boolean;   // All required fields filled
    passesQualityChecklist: boolean; // Quality checklist complete
  };
  checkedBy: string;              // Who checked
  checkedDate: Date;              // When checked
}

/**
 * Deliverable Review
 * Review record for a deliverable
 */
export interface DeliverableReview {
  reviewId: string;               // Unique review ID
  deliverableId: string;          // Parent deliverable
  submissionId: string;           // Associated submission
  reviewerId: string;             // Reviewer email
  assignedDate: Date;             // When assigned
  dueDate: Date;                  // Review deadline
  startedDate?: Date;             // When reviewer started
  completedDate?: Date;           // When completed
  status: ReviewStatus;           // Current status
  decision?: ReviewDecision;      // Final decision
  qualityScore?: number;          // Quality rating (1-5)
  comments: ReviewComment[];      // Review comments
  checklist?: QualityChecklistResult; // Quality checklist result
  recommendation: string;         // Reviewer recommendation
  notificationsSent: string[];    // Recipients notified
}

/**
 * Review Comment
 * Individual comment in a review
 */
export interface ReviewComment {
  commentId: string;              // Unique comment ID
  reviewer: string;               // Commenter email
  timestamp: Date;                // When commented
  comment: string;                // Comment text
  category: "critical" | "major" | "minor" | "suggestion" | "positive";
  section?: string;               // Which section/page
  resolved: boolean;              // Has been addressed
  resolvedBy?: string;            // Who resolved
  resolvedDate?: Date;            // When resolved
  response?: string;              // Response to comment
}

/**
 * Quality Checklist
 * Template for quality criteria
 */
export interface QualityChecklist {
  checklistId: string;            // Unique checklist ID
  name: string;                   // Checklist name
  description: string;            // Description
  deliverableType?: DeliverableType; // Applicable type (null = all)
  criteria: QualityCriterion[];   // Quality criteria
  createdBy: string;              // Creator
  createdDate: Date;              // When created
  active: boolean;                // Is active
}

/**
 * Quality Criterion
 * Individual quality criterion
 */
export interface QualityCriterion {
  criterionId: string;            // Unique criterion ID
  name: string;                   // Criterion name
  description: string;            // Description
  category: "completeness" | "accuracy" | "clarity" | "compliance" | "quality" | "other";
  required: boolean;              // Is mandatory
  weight: number;                 // Weight for scoring (1-10)
  guidance?: string;              // How to evaluate
}

/**
 * Quality Checklist Result
 * Completed quality checklist
 */
export interface QualityChecklistResult {
  resultId: string;               // Unique result ID
  checklistId: string;            // Template checklist ID
  deliverableId: string;          // Associated deliverable
  reviewId?: string;              // Associated review (optional)
  evaluatedBy: string;            // Who evaluated
  evaluatedDate: Date;            // When evaluated
  results: CriterionResult[];     // Criterion results
  overallScore: number;           // Overall score (0-100)
  passed: boolean;                // Did it pass
  comments: string;               // Overall comments
}

/**
 * Criterion Result
 * Result for individual criterion
 */
export interface CriterionResult {
  criterionId: string;            // Criterion ID
  met: boolean;                   // Was criterion met
  score?: number;                 // Score (if applicable)
  comments?: string;              // Comments
  evidence?: string;              // Evidence/reference
}

/**
 * Deliverable Approval
 * Final approval record
 */
export interface DeliverableApproval {
  approvalId: string;             // Unique approval ID
  deliverableId: string;          // Parent deliverable
  reviewId?: string;              // Associated review (optional)
  approverId: string;             // Approver email
  approverRole: string;           // Approver role (PM, Sponsor, etc.)
  requestedDate: Date;            // When requested
  approvedDate?: Date;            // When approved/rejected
  status: ApprovalStatus;         // Current status
  decision?: "approve" | "reject" | "conditional";
  conditions?: string[];          // Conditions (if conditional approval)
  comments: string;               // Approval comments
  signature?: string;             // Digital signature (optional)
  notificationsSent: string[];    // Recipients notified
}

/**
 * Deliverable Notification
 * Notification queue entry
 */
export interface DeliverableNotification {
  notificationId: string;         // Unique notification ID
  deliverableId: string;          // Related deliverable
  type: "submission" | "review_assigned" | "review_complete" | "approval_requested" | "approved" | "rejected" | "overdue" | "reminder";
  recipient: string;              // Recipient email
  subject: string;                // Notification subject
  message: string;                // Notification message
  priority: "high" | "normal" | "low";
  status: "pending" | "sent" | "failed";
  scheduledDate: Date;            // When to send
  sentDate?: Date;                // When sent
  method: "email" | "calendar" | "task" | "webhook";
  metadata?: Record<string, any>; // Additional metadata
}

/**
 * Deliverable Report Config
 * Configuration for deliverable reports
 */
export interface DeliverableReportConfig {
  reportType: "status" | "quality" | "schedule" | "overdue" | "summary";
  programId: string;              // Program to report on
  filters?: {
    status?: DeliverableStatus[];
    owner?: string[];
    dateRange?: {
      field: "dueDate" | "actualDate" | "forecastDate";
      from?: Date;
      to?: Date;
    };
    tags?: string[];
  };
  groupBy?: "status" | "owner" | "type" | "workstream";
  sortBy?: "dueDate" | "status" | "qualityScore" | "name";
  includeCharts: boolean;         // Include visual charts
  includeDetails: boolean;        // Include detailed info
}

/**
 * Deliverable Report
 * Generated deliverable report
 */
export interface DeliverableReport {
  reportId: string;               // Unique report ID
  reportType: string;             // Report type
  programId: string;              // Program ID
  generatedDate: Date;            // When generated
  generatedBy: string;            // Who generated
  config: DeliverableReportConfig; // Report configuration
  summary: DeliverableSummary;    // Summary statistics
  deliverables: Deliverable[];    // Included deliverables
  fileId?: string;                // Generated file ID (Drive)
}

/**
 * Deliverable Summary
 * Summary statistics
 */
export interface DeliverableSummary {
  total: number;                  // Total deliverables
  byStatus: Record<DeliverableStatus, number>; // Count by status
  byType: Record<DeliverableType, number>;     // Count by type
  overdue: number;                // Count overdue
  atRisk: number;                 // Count at risk
  onTrack: number;                // Count on track
  avgQualityScore?: number;       // Average quality score
  completionRate: number;         // Overall completion rate
  avgVariance?: number;           // Average schedule variance
}

/**
 * Deliverable Tracking Entry
 * Status tracking log entry
 */
export interface DeliverableTrackingEntry {
  trackingId: string;             // Unique tracking ID
  deliverableId: string;          // Deliverable ID
  timestamp: Date;                // When tracked
  status: DeliverableStatus;      // Status at time
  percentComplete: number;        // % complete at time
  forecastDate?: Date;            // Forecast at time
  notes: string;                  // Tracking notes
  recordedBy: string;             // Who recorded
  changes: Record<string, any>;   // What changed
}

/**
 * Deliverable Forecast
 * Completion date forecast
 */
export interface DeliverableForecast {
  deliverableId: string;          // Deliverable ID
  currentForecast: Date;          // Current forecast date
  originalDueDate: Date;          // Original due date
  variance: number;               // Days variance
  confidence: number;             // Confidence level (0-100)
  trend: "improving" | "stable" | "degrading";
  factors: string[];              // Factors affecting forecast
  lastUpdated: Date;              // When forecast updated
  updatedBy: string;              // Who updated
}

/**
 * Input types for deliverable operations
 */

/**
 * Create deliverable input
 */
export interface CreateDeliverableInput {
  name: string;
  description: string;
  type: DeliverableType;
  wbsCode?: string;
  programId: string;
  owner: string;
  dueDate: Date;
  priority: "critical" | "high" | "medium" | "low";
  acceptanceCriteria: string[];
  notes?: string;
}

/**
 * Update deliverable input
 */
export interface UpdateDeliverableInput {
  deliverableId: string;
  name?: string;
  description?: string;
  type?: DeliverableType;
  wbsCode?: string;
  owner?: string;
  dueDate?: Date;
  forecastDate?: Date;
  actualDate?: Date;
  status?: DeliverableStatus;
  priority?: "critical" | "high" | "medium" | "low";
  qualityScore?: number;
  reviewStatus?: ReviewStatus;
  acceptanceCriteria?: string[];
  relatedDocuments?: string[];
  notes?: string;
}

/**
 * Submit deliverable input
 */
export interface SubmitDeliverableInput {
  deliverableId: string;
  fileIds: string[];
  submitterNotes?: string;
}

/**
 * Submit review input
 */
export interface SubmitReviewInput {
  deliverableId: string;
  submissionId: string;
  decision: ReviewDecision;
  comments?: string;
  qualityScore?: number;
  feedbackItems?: Omit<ReviewComment, "commentId" | "reviewer" | "timestamp" | "resolved">[];
}

/**
 * Assign reviewer input
 */
export interface AssignReviewerInput {
  deliverableId: string;
  reviewerId: string;
  dueDate: Date;
}
