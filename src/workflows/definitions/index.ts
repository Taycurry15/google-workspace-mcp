/**
 * Workflow Definitions Registry
 *
 * Central registry for all predefined workflow definitions
 * Phase 5 Implementation
 */

import { documentSubmissionWorkflow } from "./document-submission.js";
import { deliverableReviewWorkflow } from "./deliverable-review.js";
import { weeklyStatusWorkflow } from "./weekly-status.js";
import { milestoneNotificationWorkflow } from "./milestone-notification.js";
import { milestoneCompletionCascade, changeRequestApproval } from "./program-workflows.js";
import { riskEscalation, deliverableQualityIssue } from "./pmo-workflows.js";
import { deliverableCompletion, milestoneDeliverableTracking } from "./deliverable-workflows.js";
import type { WorkflowDefinition } from "../../types/workflows.js";

/**
 * All predefined workflows
 */
export const PREDEFINED_WORKFLOWS: WorkflowDefinition[] = [
  documentSubmissionWorkflow,
  deliverableReviewWorkflow,
  weeklyStatusWorkflow,
  milestoneNotificationWorkflow,
  // Week 7 additions
  milestoneCompletionCascade,
  changeRequestApproval,
  riskEscalation,
  deliverableQualityIssue,
  deliverableCompletion,
  milestoneDeliverableTracking,
];

/**
 * Get workflow by ID
 */
export function getWorkflowDefinition(workflowId: string): WorkflowDefinition | undefined {
  return PREDEFINED_WORKFLOWS.find((w) => w.workflowId === workflowId);
}

/**
 * List all workflow definitions
 */
export function listWorkflowDefinitions(): WorkflowDefinition[] {
  return PREDEFINED_WORKFLOWS;
}

/**
 * Get workflows by trigger type
 */
export function getWorkflowsByTriggerType(
  triggerType: "schedule" | "event" | "manual"
): WorkflowDefinition[] {
  return PREDEFINED_WORKFLOWS.filter((w) => w.trigger.type === triggerType);
}

/**
 * Get workflows by category
 */
export function getWorkflowsByCategory(category: string): WorkflowDefinition[] {
  return PREDEFINED_WORKFLOWS.filter(
    (w) => w.metadata?.category === category
  );
}

// Export individual workflows
export {
  documentSubmissionWorkflow,
  deliverableReviewWorkflow,
  weeklyStatusWorkflow,
  milestoneNotificationWorkflow,
  milestoneCompletionCascade,
  changeRequestApproval,
  riskEscalation,
  deliverableQualityIssue,
  deliverableCompletion,
  milestoneDeliverableTracking,
};
