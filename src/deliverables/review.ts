/**
 * Deliverable Review Workflow
 *
 * Handles deliverable review and approval processes including:
 * - Review assignment and tracking
 * - Review comments and feedback
 * - Review completion and decisions
 * - Approval workflows
 * - Moving documents through review stages
 */

import type { sheets_v4 } from "googleapis";
import type {
  DeliverableReview,
  ReviewComment,
  ReviewDecision,
  ReviewStatus,
  DeliverableApproval,
  ApprovalStatus,
  SubmitReviewInput,
  AssignReviewerInput,
} from "../types/deliverable.js";
import {
  readSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "../utils/sheetHelpers.js";
import {
  readSubmission,
  updateSubmissionStatus,
} from "./submissions.js";
import { readDeliverable, updateDeliverable } from "./deliverables.js";

/**
 * Column mapping for Reviews sheet
 */
export const REVIEW_COLUMNS = {
  reviewId: "A",
  deliverableId: "B",
  submissionId: "C",
  reviewerId: "D",
  assignedDate: "E",
  dueDate: "F",
  startedDate: "G",
  completedDate: "H",
  status: "I",
  decision: "J",
  qualityScore: "K",
  recommendation: "L",
  notificationsSent: "M",
};

/**
 * Column mapping for Approvals sheet
 */
export const APPROVAL_COLUMNS = {
  approvalId: "A",
  deliverableId: "B",
  reviewId: "C",
  approverId: "D",
  approverRole: "E",
  requestedDate: "F",
  approvedDate: "G",
  status: "H",
  decision: "I",
  conditions: "J",
  comments: "K",
  notificationsSent: "L",
};

const REVIEWS_SHEET = "Reviews";
const APPROVALS_SHEET = "Approvals";

/**
 * Parse a row from the Reviews sheet into a DeliverableReview object
 */
function parseReviewRow(row: any[]): DeliverableReview | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  return {
    reviewId: row[0] || "",
    deliverableId: row[1] || "",
    submissionId: row[2] || "",
    reviewerId: row[3] || "",
    assignedDate: row[4] ? new Date(row[4]) : new Date(),
    dueDate: row[5] ? new Date(row[5]) : new Date(),
    startedDate: row[6] ? new Date(row[6]) : undefined,
    completedDate: row[7] ? new Date(row[7]) : undefined,
    status: (row[8] as ReviewStatus) || "pending",
    decision: row[9] as ReviewDecision | undefined,
    qualityScore: row[10] ? parseFloat(row[10]) : undefined,
    comments: [], // Comments stored separately
    checklist: undefined, // Checklist results stored separately
    recommendation: row[11] || "",
    notificationsSent: row[12]
      ? row[12].split(",").map((n: string) => n.trim())
      : [],
  };
}

/**
 * Convert a DeliverableReview object to a row array
 */
function reviewToRow(review: DeliverableReview): any[] {
  return [
    review.reviewId,
    review.deliverableId,
    review.submissionId,
    review.reviewerId,
    review.assignedDate.toISOString(),
    review.dueDate.toISOString().split("T")[0],
    review.startedDate ? review.startedDate.toISOString() : "",
    review.completedDate ? review.completedDate.toISOString() : "",
    review.status,
    review.decision || "",
    review.qualityScore || "",
    review.recommendation,
    review.notificationsSent.join(", "),
  ];
}

/**
 * Parse a row from the Approvals sheet into a DeliverableApproval object
 */
function parseApprovalRow(row: any[]): DeliverableApproval | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  return {
    approvalId: row[0] || "",
    deliverableId: row[1] || "",
    reviewId: row[2] || undefined,
    approverId: row[3] || "",
    approverRole: row[4] || "",
    requestedDate: row[5] ? new Date(row[5]) : new Date(),
    approvedDate: row[6] ? new Date(row[6]) : undefined,
    status: (row[7] as ApprovalStatus) || "pending",
    decision: row[8] as "approve" | "reject" | "conditional" | undefined,
    conditions: row[9] ? row[9].split(";").map((c: string) => c.trim()) : undefined,
    comments: row[10] || "",
    notificationsSent: row[11]
      ? row[11].split(",").map((n: string) => n.trim())
      : [],
  };
}

/**
 * Convert a DeliverableApproval object to a row array
 */
function approvalToRow(approval: DeliverableApproval): any[] {
  return [
    approval.approvalId,
    approval.deliverableId,
    approval.reviewId || "",
    approval.approverId,
    approval.approverRole,
    approval.requestedDate.toISOString(),
    approval.approvedDate ? approval.approvedDate.toISOString() : "",
    approval.status,
    approval.decision || "",
    approval.conditions ? approval.conditions.join("; ") : "",
    approval.comments,
    approval.notificationsSent.join(", "),
  ];
}

/**
 * Assign a reviewer to a deliverable
 */
export async function assignReviewer(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: AssignReviewerInput,
  submissionId: string
): Promise<DeliverableReview> {
  try {
    // Generate review ID
    const reviewId = await generateNextId(
      sheets,
      spreadsheetId,
      REVIEWS_SHEET,
      "Review ID",
      "REV"
    );

    const review: DeliverableReview = {
      reviewId,
      deliverableId: input.deliverableId,
      submissionId,
      reviewerId: input.reviewerId,
      assignedDate: new Date(),
      dueDate: input.dueDate,
      startedDate: undefined,
      completedDate: undefined,
      status: "pending",
      decision: undefined,
      qualityScore: undefined,
      comments: [],
      checklist: undefined,
      recommendation: "",
      notificationsSent: [input.reviewerId],
    };

    // Save review to sheet
    const row = reviewToRow(review);
    await appendRows(sheets, spreadsheetId, `${REVIEWS_SHEET}!A:M`, [row]);

    // Update submission with reviewer info
    await updateRow(
      sheets,
      spreadsheetId,
      "Submissions",
      "Submission ID",
      submissionId,
      {
        reviewerId: input.reviewerId,
        reviewDueDate: input.dueDate.toISOString().split("T")[0],
        status: "pending",
      },
      {
        reviewerId: "I",
        reviewDueDate: "J",
        status: "H",
      }
    );

    return review;
  } catch (error) {
    throw new Error(
      `Failed to assign reviewer: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Start a review (reviewer begins reviewing)
 */
export async function startReview(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  reviewId: string
): Promise<DeliverableReview | null> {
  try {
    const review = await readReview(sheets, spreadsheetId, reviewId);
    if (!review) {
      return null;
    }

    const now = new Date();

    await updateRow(
      sheets,
      spreadsheetId,
      REVIEWS_SHEET,
      "Review ID",
      reviewId,
      {
        startedDate: now.toISOString(),
        status: "in_review",
      },
      REVIEW_COLUMNS
    );

    // Update submission status
    await updateSubmissionStatus(
      sheets,
      spreadsheetId,
      review.submissionId,
      "in_review"
    );

    review.startedDate = now;
    review.status = "in_review";
    return review;
  } catch (error) {
    throw new Error(
      `Failed to start review: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Submit a review with decision
 */
export async function submitReview(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  input: SubmitReviewInput,
  reviewerId: string
): Promise<{
  review: DeliverableReview;
  approvalNeeded: boolean;
}> {
  try {
    // 1. Find the review for this submission
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${REVIEWS_SHEET}!A:M`
    );

    let reviewId: string | null = null;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[2] === input.submissionId && row[3] === reviewerId) {
        reviewId = row[0];
        break;
      }
    }

    if (!reviewId) {
      throw new Error("Review not found for this submission and reviewer");
    }

    const review = await readReview(sheets, spreadsheetId, reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    // 2. Update review with decision
    const now = new Date();
    const status: ReviewStatus =
      input.decision === "approve" ? "approved" : "comments";

    await updateRow(
      sheets,
      spreadsheetId,
      REVIEWS_SHEET,
      "Review ID",
      reviewId,
      {
        completedDate: now.toISOString(),
        status,
        decision: input.decision,
        qualityScore: input.qualityScore || "",
        recommendation: input.comments || "",
      },
      REVIEW_COLUMNS
    );

    // 3. Update submission status
    await updateSubmissionStatus(sheets, spreadsheetId, input.submissionId, status);

    // 4. Update deliverable based on decision
    const deliverable = await readDeliverable(
      sheets,
      spreadsheetId,
      input.deliverableId
    );

    if (!deliverable) {
      throw new Error("Deliverable not found");
    }

    if (input.decision === "approve") {
      // Move to approval stage
      await updateDeliverable(
        sheets,
        spreadsheetId,
        {
          deliverableId: input.deliverableId,
          status: "in_review",
          reviewStatus: "approved",
          qualityScore: input.qualityScore,
        },
        reviewerId
      );
    } else if (input.decision === "reject") {
      // Reject deliverable
      await updateDeliverable(
        sheets,
        spreadsheetId,
        {
          deliverableId: input.deliverableId,
          status: "in_progress", // Back to in progress
          reviewStatus: "rejected",
          qualityScore: input.qualityScore,
        },
        reviewerId
      );
    } else if (input.decision === "request_changes") {
      // Request changes
      await updateDeliverable(
        sheets,
        spreadsheetId,
        {
          deliverableId: input.deliverableId,
          status: "in_progress",
          reviewStatus: "comments",
          qualityScore: input.qualityScore,
        },
        reviewerId
      );
    }

    review.completedDate = now;
    review.status = status;
    review.decision = input.decision;
    review.qualityScore = input.qualityScore;
    review.recommendation = input.comments || "";

    // 5. Determine if approval is needed
    const approvalNeeded = input.decision === "approve";

    return {
      review,
      approvalNeeded,
    };
  } catch (error) {
    throw new Error(
      `Failed to submit review: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Request approval for a deliverable
 */
export async function requestApproval(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  deliverableId: string,
  reviewId: string,
  approverId: string,
  approverRole: string = "Program Manager"
): Promise<DeliverableApproval> {
  try {
    const approvalId = await generateNextId(
      sheets,
      spreadsheetId,
      APPROVALS_SHEET,
      "Approval ID",
      "APP"
    );

    const approval: DeliverableApproval = {
      approvalId,
      deliverableId,
      reviewId,
      approverId,
      approverRole,
      requestedDate: new Date(),
      approvedDate: undefined,
      status: "pending",
      decision: undefined,
      conditions: undefined,
      comments: "",
      notificationsSent: [approverId],
    };

    // Save approval to sheet
    const row = approvalToRow(approval);
    await appendRows(sheets, spreadsheetId, `${APPROVALS_SHEET}!A:L`, [row]);

    return approval;
  } catch (error) {
    throw new Error(
      `Failed to request approval: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Approve a deliverable
 */
export async function approveDeliverable(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  approvalId: string,
  decision: "approve" | "reject" | "conditional",
  comments: string,
  conditions?: string[],
  isFinalApproval: boolean = true
): Promise<DeliverableApproval | null> {
  try {
    const approval = await readApproval(sheets, spreadsheetId, approvalId);
    if (!approval) {
      return null;
    }

    const now = new Date();
    const status: ApprovalStatus =
      decision === "approve"
        ? "approved"
        : decision === "reject"
          ? "rejected"
          : "conditional";

    await updateRow(
      sheets,
      spreadsheetId,
      APPROVALS_SHEET,
      "Approval ID",
      approvalId,
      {
        approvedDate: now.toISOString(),
        status,
        decision,
        comments,
        conditions: conditions ? conditions.join("; ") : "",
      },
      APPROVAL_COLUMNS
    );

    // Update deliverable status
    if (decision === "approve") {
      await updateDeliverable(
        sheets,
        spreadsheetId,
        {
          deliverableId: approval.deliverableId,
          status: "approved",
          reviewStatus: "approved",
          actualDate: isFinalApproval ? now : undefined,
        },
        approval.approverId
      );
    } else if (decision === "reject") {
      await updateDeliverable(
        sheets,
        spreadsheetId,
        {
          deliverableId: approval.deliverableId,
          status: "rejected",
          reviewStatus: "rejected",
        },
        approval.approverId
      );
    }

    approval.approvedDate = now;
    approval.status = status;
    approval.decision = decision;
    approval.comments = comments;
    approval.conditions = conditions;

    return approval;
  } catch (error) {
    throw new Error(
      `Failed to approve deliverable: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Read a review by ID
 */
export async function readReview(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  reviewId: string
): Promise<DeliverableReview | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      REVIEWS_SHEET,
      "Review ID",
      reviewId
    );

    if (!result) {
      return null;
    }

    return parseReviewRow(result.rowData);
  } catch (error) {
    throw new Error(
      `Failed to read review: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Read an approval by ID
 */
export async function readApproval(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  approvalId: string
): Promise<DeliverableApproval | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      APPROVALS_SHEET,
      "Approval ID",
      approvalId
    );

    if (!result) {
      return null;
    }

    return parseApprovalRow(result.rowData);
  } catch (error) {
    throw new Error(
      `Failed to read approval: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List reviews for a deliverable
 */
export async function listReviewsForDeliverable(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  deliverableId: string
): Promise<DeliverableReview[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${REVIEWS_SHEET}!A:M`
    );

    if (data.length <= 1) {
      return [];
    }

    const reviews: DeliverableReview[] = [];

    for (let i = 1; i < data.length; i++) {
      const review = parseReviewRow(data[i]);
      if (review && review.deliverableId === deliverableId) {
        reviews.push(review);
      }
    }

    // Sort by assigned date (newest first)
    reviews.sort(
      (a, b) => b.assignedDate.getTime() - a.assignedDate.getTime()
    );

    return reviews;
  } catch (error) {
    throw new Error(
      `Failed to list reviews: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List pending reviews for a reviewer
 */
export async function listPendingReviews(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  reviewerId: string
): Promise<DeliverableReview[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${REVIEWS_SHEET}!A:M`
    );

    if (data.length <= 1) {
      return [];
    }

    const reviews: DeliverableReview[] = [];

    for (let i = 1; i < data.length; i++) {
      const review = parseReviewRow(data[i]);
      if (!review) continue;

      if (
        review.reviewerId === reviewerId &&
        (review.status === "pending" || review.status === "in_review")
      ) {
        reviews.push(review);
      }
    }

    // Sort by due date (earliest first)
    reviews.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return reviews;
  } catch (error) {
    throw new Error(
      `Failed to list pending reviews: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List pending approvals for an approver
 */
export async function listPendingApprovals(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  approverId: string
): Promise<DeliverableApproval[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${APPROVALS_SHEET}!A:L`
    );

    if (data.length <= 1) {
      return [];
    }

    const approvals: DeliverableApproval[] = [];

    for (let i = 1; i < data.length; i++) {
      const approval = parseApprovalRow(data[i]);
      if (!approval) continue;

      if (approval.approverId === approverId && approval.status === "pending") {
        approvals.push(approval);
      }
    }

    // Sort by requested date (earliest first)
    approvals.sort(
      (a, b) => a.requestedDate.getTime() - b.requestedDate.getTime()
    );

    return approvals;
  } catch (error) {
    throw new Error(
      `Failed to list pending approvals: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
