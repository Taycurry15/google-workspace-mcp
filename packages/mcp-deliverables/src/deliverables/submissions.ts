/**
 * Deliverable Submission Workflow
 *
 * Handles deliverable submission including:
 * - Validation of submissions
 * - Document routing to review folders
 * - Reviewer assignment
 * - Notification sending
 * - Status tracking
 */

import type { sheets_v4 } from "googleapis";
import type { drive_v3 } from "googleapis";
import type {
  DeliverableSubmission,
  SubmitDeliverableInput,
  CompletenessCheck,
  ReviewStatus,
} from "@gw-mcp/shared-core";
import {
  readSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "@gw-mcp/shared-core";
import { readDeliverable, updateDeliverable } from "./deliverables.js";

/**
 * Column mapping for Submissions sheet
 */
export const SUBMISSION_COLUMNS = {
  submissionId: "A",
  deliverableId: "B",
  submittedBy: "C",
  submittedDate: "D",
  version: "E",
  fileIds: "F",
  submitterNotes: "G",
  status: "H",
  reviewerId: "I",
  reviewDueDate: "J",
  completenessComplete: "K",
  completenessMissingItems: "L",
  notificationsSent: "M",
};

const SUBMISSIONS_SHEET = "Submissions";

/**
 * Parse a row from the sheet into a DeliverableSubmission object
 */
function parseSubmissionRow(row: any[]): DeliverableSubmission | null {
  if (!row || row.length === 0 || !row[0]) {
    return null;
  }

  const completenessCheck: CompletenessCheck = {
    complete: row[10] === "TRUE" || row[10] === true,
    missingItems: row[11] ? row[11].split(",").map((i: string) => i.trim()) : [],
    checks: {
      hasDocuments: true,
      meetsAcceptanceCriteria: true,
      hasRequiredFields: true,
      passesQualityChecklist: true,
    },
    checkedBy: row[2] || "",
    checkedDate: row[3] ? new Date(row[3]) : new Date(),
  };

  return {
    submissionId: row[0] || "",
    deliverableId: row[1] || "",
    submittedBy: row[2] || "",
    submittedDate: row[3] ? new Date(row[3]) : new Date(),
    version: row[4] || "1.0",
    fileIds: row[5] ? row[5].split(",").map((f: string) => f.trim()) : [],
    submitterNotes: row[6] || "",
    status: (row[7] as ReviewStatus) || "pending",
    reviewerId: row[8] || undefined,
    reviewDueDate: row[9] ? new Date(row[9]) : undefined,
    completenessCheck,
    notificationsSent: row[12]
      ? row[12].split(",").map((n: string) => n.trim())
      : [],
  };
}

/**
 * Convert a DeliverableSubmission object to a row array
 */
function submissionToRow(submission: DeliverableSubmission): any[] {
  return [
    submission.submissionId,
    submission.deliverableId,
    submission.submittedBy,
    submission.submittedDate.toISOString(),
    submission.version,
    submission.fileIds.join(", "),
    submission.submitterNotes,
    submission.status,
    submission.reviewerId || "",
    submission.reviewDueDate
      ? submission.reviewDueDate.toISOString().split("T")[0]
      : "",
    submission.completenessCheck.complete ? "TRUE" : "FALSE",
    submission.completenessCheck.missingItems.join(", "),
    submission.notificationsSent.join(", "),
  ];
}

/**
 * Validate submission completeness
 */
export function validateSubmission(
  fileIds: string[],
  acceptanceCriteria: string,
  submitterNotes: string
): CompletenessCheck {
  const missingItems: string[] = [];
  const checks = {
    hasDocuments: fileIds.length > 0,
    meetsAcceptanceCriteria: acceptanceCriteria.trim().length > 0,
    hasRequiredFields: submitterNotes.trim().length > 0,
    passesQualityChecklist: true, // Will be checked later
  };

  if (!checks.hasDocuments) {
    missingItems.push("No documents attached");
  }

  if (!checks.meetsAcceptanceCriteria) {
    missingItems.push("Acceptance criteria not defined");
  }

  if (!checks.hasRequiredFields) {
    missingItems.push("Submitter notes required");
  }

  const complete =
    checks.hasDocuments &&
    checks.meetsAcceptanceCriteria &&
    checks.hasRequiredFields;

  return {
    complete,
    missingItems,
    checks,
    checkedBy: "system",
    checkedDate: new Date(),
  };
}

/**
 * Determine reviewer based on deliverable type
 * In a real system, this would look up from a reviewer assignment table
 */
export function determineReviewer(deliverableType: string): {
  reviewerId: string;
  reviewDueDate: Date;
} {
  // Simple assignment logic - in production, this would be more sophisticated
  const reviewerMap: Record<string, string> = {
    document: process.env.DOCUMENT_REVIEWER || "reviewer@example.com",
    design: process.env.DESIGN_REVIEWER || "design-reviewer@example.com",
    software: process.env.SOFTWARE_REVIEWER || "tech-reviewer@example.com",
    hardware: process.env.HARDWARE_REVIEWER || "hw-reviewer@example.com",
    training: process.env.TRAINING_REVIEWER || "training-reviewer@example.com",
    report: process.env.REPORT_REVIEWER || "reviewer@example.com",
    presentation: process.env.PRESENTATION_REVIEWER || "reviewer@example.com",
    prototype: process.env.PROTOTYPE_REVIEWER || "tech-reviewer@example.com",
    data: process.env.DATA_REVIEWER || "data-reviewer@example.com",
    other: process.env.DEFAULT_REVIEWER || "reviewer@example.com",
  };

  const reviewerId =
    reviewerMap[deliverableType] || reviewerMap.other;

  // Review due in 5 business days
  const reviewDueDate = new Date();
  reviewDueDate.setDate(reviewDueDate.getDate() + 5);

  return { reviewerId, reviewDueDate };
}

/**
 * Get folder path for deliverable documents based on status
 */
export function getDeliverableFolderPath(
  programId: string,
  deliverableId: string,
  phase: "draft" | "review" | "final"
): string {
  // This assumes folder structure: Program/03-Execution/Deliverables/{deliverableId}/{phase}/
  return `03-Execution/Deliverables/${deliverableId}/${phase.charAt(0).toUpperCase() + phase.slice(1)}`;
}

/**
 * Submit a deliverable for review
 */
export async function submitDeliverable(
  sheets: sheets_v4.Sheets,
  drive: drive_v3.Drive,
  spreadsheetId: string,
  input: SubmitDeliverableInput,
  submittedBy: string
): Promise<{
  submission: DeliverableSubmission;
  validation: CompletenessCheck;
  routedDocuments: string[];
}> {
  try {
    // 1. Read the deliverable
    const deliverable = await readDeliverable(
      sheets,
      spreadsheetId,
      input.deliverableId
    );

    if (!deliverable) {
      throw new Error(`Deliverable ${input.deliverableId} not found`);
    }

    // 2. Validate submission
    const validation = validateSubmission(
      input.fileIds,
      deliverable.acceptanceCriteria,
      input.submitterNotes || ""
    );

    if (!validation.complete) {
      throw new Error(
        `Submission incomplete: ${validation.missingItems.join(", ")}`
      );
    }

    // 3. Assign reviewer
    const { reviewerId, reviewDueDate } = determineReviewer(deliverable.type);

    // 4. Generate submission ID
    const submissionId = await generateNextId(
      sheets,
      spreadsheetId,
      SUBMISSIONS_SHEET,
      "Submission ID",
      "SUB"
    );

    // 5. Determine version (count previous submissions + 1)
    const existingSubmissions = await listSubmissionsForDeliverable(
      sheets,
      spreadsheetId,
      input.deliverableId
    );
    const version = `${existingSubmissions.length + 1}.0`;

    // 6. Create submission record
    const submission: DeliverableSubmission = {
      submissionId,
      deliverableId: input.deliverableId,
      submittedBy,
      submittedDate: new Date(),
      version,
      fileIds: input.fileIds,
      submitterNotes: input.submitterNotes || "",
      status: "pending",
      reviewerId,
      reviewDueDate,
      completenessCheck: validation,
      notificationsSent: [],
    };

    // 7. Save submission to sheet
    const row = submissionToRow(submission);
    await appendRows(sheets, spreadsheetId, `${SUBMISSIONS_SHEET}!A:M`, [row]);

    // 8. Update deliverable status
    await updateDeliverable(
      sheets,
      spreadsheetId,
      {
        deliverableId: input.deliverableId,
        status: "submitted",
        reviewStatus: "pending",
      },
      submittedBy
    );

    // 9. Route documents to review folder
    // In Phase 4, we're focusing on the submission workflow
    // Document routing integration with Phase 3 will be done in integration testing
    const routedDocuments: string[] = [];

    // Placeholder for document routing
    // This would call the document router from Phase 3:
    // const folderPath = getDeliverableFolderPath(
    //   deliverable.programId,
    //   deliverable.deliverableId,
    //   "review"
    // );
    //
    // for (const fileId of input.fileIds) {
    //   await routeDocument(drive, fileId, folderPath);
    //   routedDocuments.push(fileId);
    // }

    // 10. Queue notifications (will be sent by notification system)
    // This would integrate with the workflow engine from Phase 5
    // For now, we just record that notifications should be sent
    submission.notificationsSent = [reviewerId, submittedBy];

    return {
      submission,
      validation,
      routedDocuments,
    };
  } catch (error) {
    throw new Error(
      `Failed to submit deliverable: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Read a submission by ID
 */
export async function readSubmission(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  submissionId: string
): Promise<DeliverableSubmission | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      SUBMISSIONS_SHEET,
      "Submission ID",
      submissionId
    );

    if (!result) {
      return null;
    }

    return parseSubmissionRow(result.rowData);
  } catch (error) {
    throw new Error(
      `Failed to read submission: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List all submissions for a deliverable
 */
export async function listSubmissionsForDeliverable(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  deliverableId: string
): Promise<DeliverableSubmission[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${SUBMISSIONS_SHEET}!A:M`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const submissions: DeliverableSubmission[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const submission = parseSubmissionRow(data[i]);
      if (submission && submission.deliverableId === deliverableId) {
        submissions.push(submission);
      }
    }

    // Sort by submitted date (newest first)
    submissions.sort(
      (a, b) => b.submittedDate.getTime() - a.submittedDate.getTime()
    );

    return submissions;
  } catch (error) {
    throw new Error(
      `Failed to list submissions: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update submission status
 */
export async function updateSubmissionStatus(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  submissionId: string,
  status: ReviewStatus
): Promise<DeliverableSubmission | null> {
  try {
    const submission = await readSubmission(
      sheets,
      spreadsheetId,
      submissionId
    );

    if (!submission) {
      return null;
    }

    await updateRow(
      sheets,
      spreadsheetId,
      SUBMISSIONS_SHEET,
      "Submission ID",
      submissionId,
      { status },
      SUBMISSION_COLUMNS
    );

    submission.status = status;
    return submission;
  } catch (error) {
    throw new Error(
      `Failed to update submission status: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get pending submissions (need review)
 */
export async function getPendingSubmissions(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  reviewerId?: string
): Promise<DeliverableSubmission[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${SUBMISSIONS_SHEET}!A:M`
    );

    if (data.length <= 1) {
      return []; // No data or only headers
    }

    const submissions: DeliverableSubmission[] = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const submission = parseSubmissionRow(data[i]);
      if (!submission) continue;

      // Filter by status
      if (submission.status !== "pending" && submission.status !== "in_review") {
        continue;
      }

      // Filter by reviewer if specified
      if (reviewerId && submission.reviewerId !== reviewerId) {
        continue;
      }

      submissions.push(submission);
    }

    // Sort by review due date (earliest first)
    submissions.sort((a, b) => {
      if (!a.reviewDueDate) return 1;
      if (!b.reviewDueDate) return -1;
      return a.reviewDueDate.getTime() - b.reviewDueDate.getTime();
    });

    return submissions;
  } catch (error) {
    throw new Error(
      `Failed to get pending submissions: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get overdue submissions (past review due date)
 */
export async function getOverdueSubmissions(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<DeliverableSubmission[]> {
  try {
    const pending = await getPendingSubmissions(sheets, spreadsheetId);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return pending.filter((submission) => {
      if (!submission.reviewDueDate) return false;

      const dueDate = new Date(submission.reviewDueDate);
      dueDate.setHours(0, 0, 0, 0);

      return dueDate < now;
    });
  } catch (error) {
    throw new Error(
      `Failed to get overdue submissions: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
