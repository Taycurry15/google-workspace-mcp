/**
 * PMO Workflow Definitions
 * Week 7 Implementation
 *
 * Workflows:
 * 1. Risk Escalation - Escalate high-severity risks
 * 2. Deliverable Quality Issue - Handle poor quality deliverables
 */

import type { WorkflowDefinition } from "../../types/workflows.js";

/**
 * Risk Escalation Workflow
 *
 * Triggered when: risk_identified event (score >= 15)
 * Actions:
 * 1. Notify risk owner
 * 2. Assess financial impact
 * 3. Create mitigation plan
 * 4. Escalate to program manager if critical
 * 5. Schedule risk review meeting
 */
export const riskEscalation: WorkflowDefinition = {
  workflowId: "risk_escalation",
  name: "Risk Escalation Workflow",
  description:
    "When a high-severity risk is identified, escalate and create mitigation plan",
  version: "1.0.0",
  trigger: {
    type: "event",
    event: {
      eventType: "risk_identified",
      source: "pmo_risks",
    },
  },
  actions: [
    {
      actionId: "notify_risk_owner",
      type: "send_notification",
      name: "Notify Risk Owner",
      description: "Alert the risk owner of the new high-severity risk",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{event.data.owner}}"],
          subject: "High-Severity Risk Identified: {{event.data.name}}",
          body: `A high-severity risk has been identified and assigned to you:

Risk: {{event.data.name}}
ID: {{event.data.riskId}}
Category: {{event.data.category}}
Probability: {{event.data.probability}}/5
Impact: {{event.data.impact}}/5
Risk Score: {{event.data.score}} (High)

IMMEDIATE ACTIONS REQUIRED:
1. Review risk details and validate assessment
2. Develop mitigation plan within 48 hours
3. Identify resources needed for mitigation
4. Provide status update to program manager

This risk requires your immediate attention. Please acknowledge receipt and provide initial assessment.`,
          priority: "critical",
        },
      },
      retryOnFailure: true,
      continueOnFailure: false,
      order: 1,
    },
    {
      actionId: "assess_financial_impact",
      type: "custom",
      name: "Assess Financial Impact",
      description: "Calculate potential financial impact of the risk",
      config: {
        module: "./actions/custom.js",
        function: "assessRiskFinancialImpact",
        parameters: {
          riskId: "{{event.data.riskId}}",
          programId: "{{event.programId}}",
          impactScore: "{{event.data.impact}}",
          category: "{{event.data.category}}",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 2,
    },
    {
      actionId: "create_mitigation_template",
      type: "custom",
      name: "Create Mitigation Plan Template",
      description: "Generate mitigation plan template in Google Docs",
      config: {
        module: "./actions/custom.js",
        function: "createMitigationPlanDocument",
        parameters: {
          riskId: "{{event.data.riskId}}",
          riskName: "{{event.data.name}}",
          programId: "{{event.programId}}",
          owner: "{{event.data.owner}}",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 3,
    },
    {
      actionId: "escalate_to_pm",
      type: "send_notification",
      name: "Escalate to Program Manager",
      description: "Notify program manager of critical risk",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{env.PROGRAM_MANAGERS}}"],
          subject: "CRITICAL RISK: {{event.data.name}}",
          body: `A critical risk has been identified that requires your attention:

Risk: {{event.data.name}}
ID: {{event.data.riskId}}
Owner: {{event.data.owner}}
Category: {{event.data.category}}
Risk Score: {{event.data.score}}/25

Risk Details:
- Probability: {{event.data.probability}}/5
- Impact: {{event.data.impact}}/5

Required Actions:
1. Review risk assessment
2. Approve mitigation plan (due within 48 hours)
3. Allocate resources for mitigation
4. Schedule risk review with stakeholders

This risk may impact program schedule, budget, or deliverables. Please prioritize accordingly.`,
          priority: "critical",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 4,
    },
    {
      actionId: "schedule_risk_review",
      type: "custom",
      name: "Schedule Risk Review Meeting",
      description: "Create calendar event for risk review",
      config: {
        module: "./actions/custom.js",
        function: "createCalendarEvent",
        parameters: {
          title: "Risk Review: {{event.data.name}}",
          description: "Review high-severity risk {{event.data.riskId}} and approve mitigation plan",
          attendees: ["{{event.data.owner}}", "{{env.PROGRAM_MANAGERS}}"],
          durationMinutes: 60,
          scheduleDaysOut: 2,
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 5,
    },
  ],
  roles: [
    {
      role: "risk_manager",
      action: "execute",
      required: true,
    },
    {
      role: "program_manager",
      action: "approve",
      required: true,
    },
  ],
  status: "active",
  enabled: true,
  priority: 9,
  timeout: 300,
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 5,
    backoffMultiplier: 2,
  },
  errorHandling: {
    onError: "notify",
    notifyOnError: true,
    errorRecipients: ["{{env.PROGRAM_MANAGERS}}"],
  },
  metadata: {
    category: "risk_management",
    tags: ["automation", "risk", "escalation", "critical"],
    documentation: "https://github.com/example/workflows/risk-escalation",
  },
  createdBy: "system",
  createdDate: new Date(),
  modifiedDate: new Date(),
  executionCount: 0,
};

/**
 * Deliverable Quality Issue Workflow
 *
 * Triggered when: deliverable_quality_issue event (score < 50)
 * Actions:
 * 1. Notify responsible party
 * 2. Create quality improvement plan
 * 3. Notify accountable party
 * 4. Schedule quality review
 * 5. Track rework efforts
 */
export const deliverableQualityIssue: WorkflowDefinition = {
  workflowId: "deliverable_quality_issue",
  name: "Deliverable Quality Issue Workflow",
  description:
    "When a deliverable has poor quality (score < 50), initiate quality improvement process",
  version: "1.0.0",
  trigger: {
    type: "event",
    event: {
      eventType: "deliverable_quality_issue",
      source: "pmo_deliverables",
    },
  },
  actions: [
    {
      actionId: "notify_responsible",
      type: "send_notification",
      name: "Notify Responsible Party",
      description: "Alert the person responsible for the deliverable",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{event.data.responsible}}"],
          subject: "Quality Issue: {{event.data.name}}",
          body: `A quality issue has been identified with your deliverable:

Deliverable: {{event.data.name}}
ID: {{event.data.deliverableId}}
WBS: {{event.data.wbs}}
Quality Score: {{event.data.qualityScore}}/100 (Below acceptable threshold)

Reviewer Notes:
{{event.data.notes}}

REQUIRED ACTIONS:
1. Review quality feedback
2. Create rework plan within 24 hours
3. Address identified issues
4. Resubmit for quality review
5. Provide estimated completion date

Quality standards are critical to program success. Please prioritize addressing these issues.

If you need assistance or resources, contact your team lead immediately.`,
          priority: "high",
        },
      },
      retryOnFailure: true,
      continueOnFailure: false,
      order: 1,
    },
    {
      actionId: "create_improvement_plan",
      type: "custom",
      name: "Create Quality Improvement Plan",
      description: "Generate template for quality improvement",
      config: {
        module: "./actions/custom.js",
        function: "createQualityImprovementPlan",
        parameters: {
          deliverableId: "{{event.data.deliverableId}}",
          deliverableName: "{{event.data.name}}",
          qualityScore: "{{event.data.qualityScore}}",
          responsible: "{{event.data.responsible}}",
          reviewerNotes: "{{event.data.notes}}",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 2,
    },
    {
      actionId: "notify_accountable",
      type: "send_notification",
      name: "Notify Accountable Party",
      description: "Inform accountable party (team lead) of quality issue",
      config: {
        module: "./actions/send-notification.js",
        function: "sendNotificationAction",
        parameters: {
          type: "email",
          recipients: ["{{event.data.accountable}}"],
          subject: "Team Member Quality Issue: {{event.data.name}}",
          body: `A quality issue has been identified with a deliverable from your team:

Deliverable: {{event.data.name}}
ID: {{event.data.deliverableId}}
Responsible: {{event.data.responsible}}
Quality Score: {{event.data.qualityScore}}/100

As the accountable party, please:
1. Meet with {{event.data.responsible}} to review feedback
2. Ensure rework plan is created within 24 hours
3. Provide any needed resources or guidance
4. Monitor progress on quality improvements
5. Report status to program manager

Quality patterns may indicate need for additional training or process improvements.`,
          priority: "high",
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 3,
    },
    {
      actionId: "schedule_quality_review",
      type: "custom",
      name: "Schedule Quality Review Meeting",
      description: "Create calendar event for quality review after rework",
      config: {
        module: "./actions/custom.js",
        function: "createCalendarEvent",
        parameters: {
          title: "Quality Review: {{event.data.name}}",
          description: "Review reworked deliverable {{event.data.deliverableId}} for quality acceptance",
          attendees: ["{{event.data.responsible}}", "{{event.data.accountable}}"],
          durationMinutes: 30,
          scheduleDaysOut: 3,
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 4,
    },
    {
      actionId: "track_rework",
      type: "update_spreadsheet",
      name: "Track Rework Effort",
      description: "Log quality issue for tracking and trend analysis",
      config: {
        module: "./actions/update-spreadsheet.js",
        function: "updateSpreadsheetAction",
        parameters: {
          spreadsheetId: "{{env.PMO_SPREADSHEET_ID}}",
          sheet: "Quality Issues",
          operation: "append",
          values: [[
            "{{event.timestamp}}",
            "{{event.data.deliverableId}}",
            "{{event.data.name}}",
            "{{event.data.responsible}}",
            "{{event.data.qualityScore}}",
            "{{event.data.notes}}",
            "Open",
          ]],
        },
      },
      retryOnFailure: true,
      continueOnFailure: true,
      order: 5,
    },
  ],
  roles: [
    {
      role: "quality_manager",
      action: "execute",
      required: true,
    },
    {
      role: "team_lead",
      action: "review",
      required: true,
    },
  ],
  status: "active",
  enabled: true,
  priority: 8,
  timeout: 300,
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 5,
    backoffMultiplier: 2,
  },
  errorHandling: {
    onError: "notify",
    notifyOnError: true,
    errorRecipients: ["{{env.QUALITY_MANAGERS}}"],
  },
  metadata: {
    category: "quality_management",
    tags: ["automation", "quality", "deliverables", "rework"],
    documentation: "https://github.com/example/workflows/quality-issue",
  },
  createdBy: "system",
  createdDate: new Date(),
  modifiedDate: new Date(),
  executionCount: 0,
};
