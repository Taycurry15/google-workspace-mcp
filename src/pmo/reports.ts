/**
 * PMO Comprehensive Reporting Module
 * Generates weekly reports, executive summaries, and stakeholder updates
 * Phase 4 - Week 6 Implementation
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { appendRows, readSheetRange } from "../utils/sheetHelpers.js";
import { llmRouter } from "../../packages/shared-llm/src/router/router.js";

// Import from other modules
import { getEVMSnapshots, forecastCompletion, type EVMSnapshot } from "./evm.js";
import { getSentimentSnapshots, type SentimentSnapshot } from "./sentiment.js";
import { readCharter } from "../program/charter.js";
import { getMilestones } from "../program/milestones.js";
import { listChangeRequests } from "../program/change-control.js";
import { getIssues } from "../program/issue-log.js";

const SPREADSHEET_ID = process.env.PMO_SPREADSHEET_ID || "";
const REPORTS_SHEET = "Weekly Reports";

/**
 * Weekly Report Interface
 */
export interface WeeklyReport {
  reportId: string;
  programId: string;
  weekStartDate: Date;
  weekEndDate: Date;
  generatedDate: Date;
  overallHealth: "green" | "yellow" | "red";
  executiveSummary: string;
  programProgress: {
    percentComplete: number;
    completedMilestones: number;
    totalMilestones: number;
    upcomingMilestones: string[];
  };
  scheduleStatus: {
    status: "on_track" | "at_risk" | "behind";
    varianceDays: number;
    criticalIssues: string[];
  };
  financialStatus: {
    budgetSpent: number;
    budgetRemaining: number;
    spi: number;
    cpi: number;
    forecastedOverrun: number;
  };
  deliverableStatus: {
    submitted: number;
    accepted: number;
    rejected: number;
    pending: number;
  };
  riskStatus: {
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
    topRisks: string[];
  };
  changeControl: {
    pendingChanges: number;
    approvedChanges: number;
    implementedChanges: number;
  };
  stakeholderSentiment: {
    averageSentiment: number;
    improvingCount: number;
    decliningCount: number;
    alertStakeholders: string[];
  };
  keyAccomplishments: string[];
  upcomingActivities: string[];
  issues: string[];
  recommendations: string[];
}

/**
 * Executive Summary Interface
 */
export interface ExecutiveSummary {
  programId: string;
  programName: string;
  generatedDate: Date;
  overallHealth: "green" | "yellow" | "red";
  statusSummary: string; // AI-generated 2-3 sentence summary
  keyMetrics: {
    percentComplete: number;
    scheduleVarianceDays: number;
    budgetVariancePercent: number;
    avgStakeholderSentiment: number;
  };
  highlights: string[]; // Top 3 accomplishments
  concerns: string[]; // Top 3 issues
  nextSteps: string[]; // Top 3 upcoming activities
  executiveRecommendation: string; // AI-generated recommendation
}

/**
 * Column mapping for Weekly Reports sheet
 */
const COLUMN_MAP = {
  reportId: 0,
  programId: 1,
  weekStartDate: 2,
  weekEndDate: 3,
  generatedDate: 4,
  overallHealth: 5,
  executiveSummary: 6,
  percentComplete: 7,
  scheduleDays: 8,
  spi: 9,
  cpi: 10,
  avgSentiment: 11,
  highRisks: 12,
  pendingChanges: 13,
};

/**
 * Generate comprehensive weekly report
 */
export async function generateWeeklyReport(
  auth: OAuth2Client,
  programId: string,
  weekStartDate?: Date
): Promise<WeeklyReport> {
  const sheets = google.sheets({ version: "v4", auth });

  // Calculate week dates
  const startDate = weekStartDate || getWeekStart(new Date());
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  // Fetch program details
  const program = await readCharter(auth, programId);
  if (!program) {
    throw new Error(`Program ${programId} not found`);
  }

  // Fetch milestones
  const allMilestones = await getMilestones(auth, programId);
  const completedMilestones = allMilestones.filter((m) => m.status === "achieved");
  const upcomingMilestones = allMilestones
    .filter(
      (m) =>
        m.status === "in_progress" &&
        m.targetDate &&
        new Date(m.targetDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    )
    .slice(0, 5)
    .map((m) => m.name);

  // Fetch latest EVM snapshot
  const evmSnapshots = await getEVMSnapshots(auth, programId, { limit: 1 });
  const latestEVM = evmSnapshots[0];

  let financialStatus = {
    budgetSpent: 0,
    budgetRemaining: 0,
    spi: 0,
    cpi: 0,
    forecastedOverrun: 0,
  };

  if (latestEVM) {
    financialStatus = {
      budgetSpent: latestEVM.ac,
      budgetRemaining: latestEVM.bac - latestEVM.ac,
      spi: latestEVM.spi,
      cpi: latestEVM.cpi,
      forecastedOverrun: Math.max(0, latestEVM.eac - latestEVM.bac),
    };
  }

  // Fetch sentiment snapshots
  const sentimentSnapshots = await getSentimentSnapshots(auth, { programId });
  const stakeholderMap = new Map<string, SentimentSnapshot>();
  sentimentSnapshots.forEach((s) => {
    const existing = stakeholderMap.get(s.stakeholderId);
    if (!existing || s.snapshotDate > existing.snapshotDate) {
      stakeholderMap.set(s.stakeholderId, s);
    }
  });
  const latestSentiment = Array.from(stakeholderMap.values());

  const avgSentiment =
    latestSentiment.length > 0
      ? latestSentiment.reduce((sum, s) => sum + s.overallSentiment, 0) / latestSentiment.length
      : 0.5;
  const improvingCount = latestSentiment.filter((s) => s.trend === "improving").length;
  const decliningCount = latestSentiment.filter((s) => s.trend === "declining").length;
  const alertStakeholders = latestSentiment
    .filter((s) => s.overallSentiment < 0.4 || s.trend === "declining")
    .map((s) => s.stakeholderName);

  // Fetch change requests
  const allChanges = await listChangeRequests(auth, { programId });
  const pendingChanges = allChanges.filter(
    (c) => c.status === "submitted" || c.status === "under_review"
  ).length;
  const approvedChanges = allChanges.filter((c) => c.status === "approved").length;
  const implementedChanges = allChanges.filter((c) => c.status === "implemented").length;

  // Fetch issues
  const allIssues = await getIssues(auth, programId);
  const openIssues = allIssues.filter((i) => i.status === "open" || i.status === "in_progress");
  const criticalIssues = openIssues
    .filter((i) => i.priority === "critical" || i.severity === "critical")
    .map((i) => i.title);

  // Determine schedule status
  let scheduleStatus: "on_track" | "at_risk" | "behind" = "on_track";
  let varianceDays = 0;

  if (latestEVM) {
    // Calculate schedule variance in days (rough estimate)
    // If SPI < 1, we're behind
    if (latestEVM.spi < 0.85) {
      scheduleStatus = "behind";
      varianceDays = Math.round((1 - latestEVM.spi) * 30); // Rough estimate
    } else if (latestEVM.spi < 0.95) {
      scheduleStatus = "at_risk";
      varianceDays = Math.round((1 - latestEVM.spi) * 30);
    }
  }

  // Determine overall health
  let overallHealth: "green" | "yellow" | "red" = "green";
  if (
    scheduleStatus === "behind" ||
    (latestEVM && latestEVM.cpi < 0.85) ||
    avgSentiment < 0.4 ||
    criticalIssues.length > 3
  ) {
    overallHealth = "red";
  } else if (
    scheduleStatus === "at_risk" ||
    (latestEVM && latestEVM.cpi < 0.95) ||
    avgSentiment < 0.6 ||
    criticalIssues.length > 0
  ) {
    overallHealth = "yellow";
  }

  // Generate AI executive summary
  const executiveSummary = await generateAIExecutiveSummary({
    programName: program.name,
    health: overallHealth,
    percentComplete: latestEVM?.percentComplete || 0,
    spi: latestEVM?.spi || 0,
    cpi: latestEVM?.cpi || 0,
    sentiment: avgSentiment,
    criticalIssues,
  });

  // Generate report ID
  const reportRange = `${REPORTS_SHEET}!A2:A`;
  const reportRows = await readSheetRange(sheets, SPREADSHEET_ID, reportRange);
  const reportId = `WR-${String(reportRows.length + 1).padStart(3, "0")}`;

  const report: WeeklyReport = {
    reportId,
    programId,
    weekStartDate: startDate,
    weekEndDate: endDate,
    generatedDate: new Date(),
    overallHealth,
    executiveSummary,
    programProgress: {
      percentComplete: latestEVM?.percentComplete || 0,
      completedMilestones: completedMilestones.length,
      totalMilestones: allMilestones.length,
      upcomingMilestones,
    },
    scheduleStatus: {
      status: scheduleStatus,
      varianceDays,
      criticalIssues,
    },
    financialStatus,
    deliverableStatus: {
      submitted: 0, // Would need to fetch from deliverables module
      accepted: 0,
      rejected: 0,
      pending: 0,
    },
    riskStatus: {
      highRisks: 0, // Would need to fetch from risks module
      mediumRisks: 0,
      lowRisks: 0,
      topRisks: [],
    },
    changeControl: {
      pendingChanges,
      approvedChanges,
      implementedChanges,
    },
    stakeholderSentiment: {
      averageSentiment: avgSentiment,
      improvingCount,
      decliningCount,
      alertStakeholders,
    },
    keyAccomplishments: await extractKeyAccomplishments(auth, programId, startDate, endDate),
    upcomingActivities: upcomingMilestones,
    issues: criticalIssues,
    recommendations: await generateRecommendations({
      health: overallHealth,
      spi: latestEVM?.spi || 0,
      cpi: latestEVM?.cpi || 0,
      sentiment: avgSentiment,
      criticalIssues,
    }),
  };

  return report;
}

/**
 * Store weekly report in Google Sheets
 */
export async function storeWeeklyReport(
  auth: OAuth2Client,
  report: WeeklyReport
): Promise<WeeklyReport> {
  const sheets = google.sheets({ version: "v4", auth });

  const row = [
    report.reportId,
    report.programId,
    report.weekStartDate.toISOString().split("T")[0],
    report.weekEndDate.toISOString().split("T")[0],
    report.generatedDate.toISOString().split("T")[0],
    report.overallHealth,
    report.executiveSummary,
    report.programProgress.percentComplete,
    report.scheduleStatus.varianceDays,
    report.financialStatus.spi,
    report.financialStatus.cpi,
    report.stakeholderSentiment.averageSentiment,
    report.riskStatus.highRisks,
    report.changeControl.pendingChanges,
  ];

  await appendRows(sheets, SPREADSHEET_ID, REPORTS_SHEET, [row]);

  return report;
}

/**
 * Generate executive summary
 */
export async function generateExecutiveSummary(
  auth: OAuth2Client,
  programId: string
): Promise<ExecutiveSummary> {
  // Fetch program details
  const program = await readCharter(auth, programId);
  if (!program) {
    throw new Error(`Program ${programId} not found`);
  }

  // Fetch latest EVM
  const evmSnapshots = await getEVMSnapshots(auth, programId, { limit: 1 });
  const latestEVM = evmSnapshots[0];

  // Fetch sentiment
  const sentimentSnapshots = await getSentimentSnapshots(auth, { programId });
  const stakeholderMap = new Map<string, SentimentSnapshot>();
  sentimentSnapshots.forEach((s) => {
    const existing = stakeholderMap.get(s.stakeholderId);
    if (!existing || s.snapshotDate > existing.snapshotDate) {
      stakeholderMap.set(s.stakeholderId, s);
    }
  });
  const latestSentiment = Array.from(stakeholderMap.values());
  const avgSentiment =
    latestSentiment.length > 0
      ? latestSentiment.reduce((sum, s) => sum + s.overallSentiment, 0) / latestSentiment.length
      : 0.5;

  // Calculate schedule variance
  const percentComplete = latestEVM?.percentComplete || 0;
  const spi = latestEVM?.spi || 0;
  const cpi = latestEVM?.cpi || 0;
  const scheduleVarianceDays = spi < 1 ? Math.round((1 - spi) * 30) : 0;
  const budgetVariancePercent = cpi < 1 ? Math.round((1 - cpi) * 100) : 0;

  // Determine health
  let overallHealth: "green" | "yellow" | "red" = "green";
  if (spi < 0.85 || cpi < 0.85 || avgSentiment < 0.4) {
    overallHealth = "red";
  } else if (spi < 0.95 || cpi < 0.95 || avgSentiment < 0.6) {
    overallHealth = "yellow";
  }

  // Get recent accomplishments
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const highlights = await extractKeyAccomplishments(auth, programId, startDate, endDate);

  // Get issues
  const issues = await getIssues(auth, programId);
  const criticalIssues = issues
    .filter((i) => i.priority === "critical" && (i.status === "open" || i.status === "in_progress"))
    .map((i) => i.title)
    .slice(0, 3);

  // Get upcoming milestones
  const milestones = await getMilestones(auth, programId);
  const upcomingMilestones = milestones
    .filter(
      (m) =>
        m.status === "in_progress" &&
        m.targetDate &&
        new Date(m.targetDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    )
    .map((m) => m.name)
    .slice(0, 3);

  // Generate AI status summary
  const statusSummary = await generateAIStatusSummary({
    programName: program.name,
    health: overallHealth,
    percentComplete,
    spi,
    cpi,
    sentiment: avgSentiment,
  });

  // Generate AI executive recommendation
  const executiveRecommendation = await generateAIRecommendation({
    health: overallHealth,
    spi,
    cpi,
    sentiment: avgSentiment,
    criticalIssues,
  });

  const summary: ExecutiveSummary = {
    programId,
    programName: program.name,
    generatedDate: new Date(),
    overallHealth,
    statusSummary,
    keyMetrics: {
      percentComplete,
      scheduleVarianceDays,
      budgetVariancePercent,
      avgStakeholderSentiment: avgSentiment,
    },
    highlights: highlights.slice(0, 3),
    concerns: criticalIssues,
    nextSteps: upcomingMilestones,
    executiveRecommendation,
  };

  return summary;
}

/**
 * Generate AI executive summary (2-3 sentences)
 */
async function generateAIExecutiveSummary(params: {
  programName: string;
  health: string;
  percentComplete: number;
  spi: number;
  cpi: number;
  sentiment: number;
  criticalIssues: string[];
}): Promise<string> {
  const prompt = `Generate a concise 2-3 sentence executive summary for program "${params.programName}".

Key Metrics:
- Overall Health: ${params.health}
- Percent Complete: ${params.percentComplete.toFixed(1)}%
- Schedule Performance Index (SPI): ${params.spi.toFixed(2)}
- Cost Performance Index (CPI): ${params.cpi.toFixed(2)}
- Stakeholder Sentiment: ${params.sentiment.toFixed(2)}
- Critical Issues: ${params.criticalIssues.length}

Focus on overall program health, progress, and any critical concerns. Keep it brief and executive-friendly.`;

  try {
    const response = await llmRouter.complete({
      messages: [{ role: "user", content: prompt }],
      config: {
        provider: "anthropic",
        model: "claude-sonnet-4.5",
        temperature: 0.5,
        maxTokens: 300,
      },
      metadata: { requestType: "executive_summary" },
    });

    return response.content.trim();
  } catch (error) {
    console.error("Failed to generate AI summary:", error);
    return `Program is ${params.percentComplete.toFixed(1)}% complete with ${params.health} health status. ${params.criticalIssues.length > 0 ? `${params.criticalIssues.length} critical issues require attention.` : "No critical issues."}`;
  }
}

/**
 * Generate AI status summary
 */
async function generateAIStatusSummary(params: {
  programName: string;
  health: string;
  percentComplete: number;
  spi: number;
  cpi: number;
  sentiment: number;
}): Promise<string> {
  const prompt = `Summarize the current status of program "${params.programName}" in 2-3 sentences for executives.

Metrics:
- Health: ${params.health}
- Progress: ${params.percentComplete.toFixed(1)}%
- Schedule Performance (SPI): ${params.spi.toFixed(2)} (>1=ahead, <1=behind)
- Cost Performance (CPI): ${params.cpi.toFixed(2)} (>1=under budget, <1=over budget)
- Stakeholder Sentiment: ${params.sentiment.toFixed(2)} (0=negative, 1=positive)

Be concise and executive-friendly.`;

  try {
    const response = await llmRouter.complete({
      messages: [{ role: "user", content: prompt }],
      config: {
        provider: "anthropic",
        model: "claude-sonnet-4.5",
        temperature: 0.5,
        maxTokens: 300,
      },
      metadata: { requestType: "status_summary" },
    });

    return response.content.trim();
  } catch (error) {
    console.error("Failed to generate AI status summary:", error);
    return `Program is ${params.percentComplete.toFixed(1)}% complete with ${params.health} health. SPI: ${params.spi.toFixed(2)}, CPI: ${params.cpi.toFixed(2)}.`;
  }
}

/**
 * Generate AI recommendation
 */
async function generateAIRecommendation(params: {
  health: string;
  spi: number;
  cpi: number;
  sentiment: number;
  criticalIssues: string[];
}): Promise<string> {
  const prompt = `Provide a brief executive recommendation (2-3 sentences) based on these program metrics:

- Health: ${params.health}
- Schedule Performance (SPI): ${params.spi.toFixed(2)}
- Cost Performance (CPI): ${params.cpi.toFixed(2)}
- Stakeholder Sentiment: ${params.sentiment.toFixed(2)}
- Critical Issues: ${params.criticalIssues.length}

What should executives do or be aware of?`;

  try {
    const response = await llmRouter.complete({
      messages: [{ role: "user", content: prompt }],
      config: {
        provider: "anthropic",
        model: "claude-sonnet-4.5",
        temperature: 0.5,
        maxTokens: 300,
      },
      metadata: { requestType: "recommendation" },
    });

    return response.content.trim();
  } catch (error) {
    console.error("Failed to generate AI recommendation:", error);
    if (params.health === "red") {
      return "Immediate executive attention required. Address critical issues and performance gaps.";
    } else if (params.health === "yellow") {
      return "Monitor closely. Take corrective action to prevent further degradation.";
    }
    return "Continue monitoring. Program is on track.";
  }
}

/**
 * Extract key accomplishments from recent period
 */
async function extractKeyAccomplishments(
  auth: OAuth2Client,
  programId: string,
  startDate: Date,
  endDate: Date
): Promise<string[]> {
  const accomplishments: string[] = [];

  // Get milestones achieved in period
  const milestones = await getMilestones(auth, programId);
  const achievedMilestones = milestones.filter(
    (m) =>
      m.status === "achieved" &&
      m.actualDate &&
      new Date(m.actualDate) >= startDate &&
      new Date(m.actualDate) <= endDate
  );

  achievedMilestones.forEach((m) => {
    accomplishments.push(`Achieved milestone: ${m.name}`);
  });

  // Get implemented change requests
  const changes = await listChangeRequests(auth, { programId });
  const implementedChanges = changes.filter(
    (c) =>
      c.status === "implemented" &&
      c.implementationDate &&
      new Date(c.implementationDate) >= startDate &&
      new Date(c.implementationDate) <= endDate
  );

  implementedChanges.forEach((c) => {
    accomplishments.push(`Implemented change: ${c.title}`);
  });

  return accomplishments.slice(0, 10);
}

/**
 * Generate recommendations based on metrics
 */
async function generateRecommendations(params: {
  health: string;
  spi: number;
  cpi: number;
  sentiment: number;
  criticalIssues: string[];
}): Promise<string[]> {
  const recommendations: string[] = [];

  if (params.spi < 0.9) {
    recommendations.push("Schedule is behind. Accelerate critical path activities or add resources.");
  }

  if (params.cpi < 0.9) {
    recommendations.push("Costs are over budget. Review spending and identify cost reduction opportunities.");
  }

  if (params.sentiment < 0.5) {
    recommendations.push("Stakeholder sentiment is low. Increase engagement and address concerns.");
  }

  if (params.criticalIssues.length > 0) {
    recommendations.push(`${params.criticalIssues.length} critical issues require immediate attention.`);
  }

  if (params.health === "green" && recommendations.length === 0) {
    recommendations.push("Program is performing well. Continue current approach.");
  }

  return recommendations;
}

/**
 * Compile stakeholder-specific update
 */
export async function compileStakeholderUpdate(
  auth: OAuth2Client,
  programId: string,
  stakeholderId: string
): Promise<{
  stakeholderName: string;
  programName: string;
  generatedDate: Date;
  personalizedMessage: string;
  programHighlights: string[];
  relevantMilestones: string[];
  areasOfConcern: string[];
  nextSteps: string[];
}> {
  // Get program
  const program = await readCharter(auth, programId);
  if (!program) {
    throw new Error(`Program ${programId} not found`);
  }

  // Get stakeholder sentiment
  const sentimentSnapshots = await getSentimentSnapshots(auth, {
    programId,
    stakeholderId,
    limit: 1,
  });
  const sentiment = sentimentSnapshots[0];

  // Get recent accomplishments
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const highlights = await extractKeyAccomplishments(auth, programId, startDate, endDate);

  // Get upcoming milestones
  const milestones = await getMilestones(auth, programId);
  const upcomingMilestones = milestones
    .filter(
      (m) =>
        m.status !== "achieved" &&
        m.targetDate &&
        new Date(m.targetDate) <= new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    )
    .map((m) => `${m.name} (${new Date(m.targetDate).toLocaleDateString()})`)
    .slice(0, 5);

  // Areas of concern (from sentiment or issues)
  const areasOfConcern = sentiment?.keyConcerns || [];

  // Generate personalized message using AI
  const personalizedMessage = sentiment
    ? await generatePersonalizedStakeholderMessage(
        program.name,
        sentiment.stakeholderName,
        sentiment.overallSentiment,
        sentiment.keyConcerns
      )
    : `Thank you for your continued support of ${program.name}.`;

  return {
    stakeholderName: sentiment?.stakeholderName || "Stakeholder",
    programName: program.name,
    generatedDate: new Date(),
    personalizedMessage,
    programHighlights: highlights.slice(0, 5),
    relevantMilestones: upcomingMilestones,
    areasOfConcern,
    nextSteps: upcomingMilestones,
  };
}

/**
 * Generate personalized stakeholder message
 */
async function generatePersonalizedStakeholderMessage(
  programName: string,
  stakeholderName: string,
  sentiment: number,
  concerns: string[]
): Promise<string> {
  const prompt = `Generate a brief personalized message (2-3 sentences) for stakeholder "${stakeholderName}" regarding program "${programName}".

Stakeholder Sentiment: ${sentiment.toFixed(2)} (0=negative, 1=positive)
Key Concerns: ${concerns.join(", ") || "None"}

The message should acknowledge their engagement, address concerns if any, and maintain a professional, appreciative tone.`;

  try {
    const response = await llmRouter.complete({
      messages: [{ role: "user", content: prompt }],
      config: {
        provider: "anthropic",
        model: "claude-sonnet-4.5",
        temperature: 0.7,
        maxTokens: 300,
      },
      metadata: { requestType: "stakeholder_message" },
    });

    return response.content.trim();
  } catch (error) {
    console.error("Failed to generate personalized message:", error);
    return `Thank you for your continued support and engagement with ${programName}. We value your input and are committed to addressing your concerns.`;
  }
}

/**
 * Get week start date (Monday)
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Generate metrics report (KPI dashboard)
 */
export async function generateMetricsReport(
  auth: OAuth2Client,
  programId: string
): Promise<{
  programId: string;
  generatedDate: Date;
  scheduleMetrics: {
    percentComplete: number;
    spi: number;
    scheduledVarianceDays: number;
    milestonesCompleted: number;
    milestonesTotal: number;
    criticalPathStatus: "on_track" | "at_risk" | "delayed";
  };
  costMetrics: {
    budgetAllocated: number;
    actualCost: number;
    earnedValue: number;
    cpi: number;
    forecastedCost: number;
    varianceAtCompletion: number;
  };
  qualityMetrics: {
    deliverablesAccepted: number;
    deliverablesRejected: number;
    acceptanceRate: number;
    avgQualityScore: number;
  };
  riskMetrics: {
    activeRisks: number;
    highRisks: number;
    mitigatedRisks: number;
    riskExposure: number;
  };
  stakeholderMetrics: {
    totalStakeholders: number;
    avgSentiment: number;
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    engagementLevel: number;
  };
  changeMetrics: {
    totalChanges: number;
    pendingChanges: number;
    approvedChanges: number;
    rejectedChanges: number;
    approvalRate: number;
  };
}> {
  // Fetch EVM data
  const evmSnapshots = await getEVMSnapshots(auth, programId, { limit: 1 });
  const latestEVM = evmSnapshots[0];

  // Fetch milestones
  const milestones = await getMilestones(auth, programId);
  const completedMilestones = milestones.filter((m) => m.status === "achieved").length;

  // Fetch sentiment
  const sentimentSnapshots = await getSentimentSnapshots(auth, { programId });
  const stakeholderMap = new Map<string, SentimentSnapshot>();
  sentimentSnapshots.forEach((s) => {
    const existing = stakeholderMap.get(s.stakeholderId);
    if (!existing || s.snapshotDate > existing.snapshotDate) {
      stakeholderMap.set(s.stakeholderId, s);
    }
  });
  const latestSentiment = Array.from(stakeholderMap.values());

  const avgSentiment =
    latestSentiment.length > 0
      ? latestSentiment.reduce((sum, s) => sum + s.overallSentiment, 0) / latestSentiment.length
      : 0.5;
  const avgEngagement =
    latestSentiment.length > 0
      ? latestSentiment.reduce((sum, s) => sum + s.engagementLevel, 0) / latestSentiment.length
      : 3;

  const positiveCount = latestSentiment.filter((s) => s.overallSentiment >= 0.7).length;
  const neutralCount = latestSentiment.filter(
    (s) => s.overallSentiment >= 0.4 && s.overallSentiment < 0.7
  ).length;
  const negativeCount = latestSentiment.filter((s) => s.overallSentiment < 0.4).length;

  // Fetch change requests
  const changes = await listChangeRequests(auth, { programId });
  const pendingChanges = changes.filter(
    (c) => c.status === "submitted" || c.status === "under_review"
  ).length;
  const approvedChanges = changes.filter((c) => c.status === "approved").length;
  const rejectedChanges = changes.filter((c) => c.status === "rejected").length;
  const approvalRate =
    approvedChanges + rejectedChanges > 0
      ? (approvedChanges / (approvedChanges + rejectedChanges)) * 100
      : 0;

  // Determine critical path status
  let criticalPathStatus: "on_track" | "at_risk" | "delayed" = "on_track";
  if (latestEVM) {
    if (latestEVM.spi < 0.85) {
      criticalPathStatus = "delayed";
    } else if (latestEVM.spi < 0.95) {
      criticalPathStatus = "at_risk";
    }
  }

  return {
    programId,
    generatedDate: new Date(),
    scheduleMetrics: {
      percentComplete: latestEVM?.percentComplete || 0,
      spi: latestEVM?.spi || 0,
      scheduledVarianceDays: latestEVM && latestEVM.spi < 1 ? Math.round((1 - latestEVM.spi) * 30) : 0,
      milestonesCompleted: completedMilestones,
      milestonesTotal: milestones.length,
      criticalPathStatus,
    },
    costMetrics: {
      budgetAllocated: latestEVM?.bac || 0,
      actualCost: latestEVM?.ac || 0,
      earnedValue: latestEVM?.ev || 0,
      cpi: latestEVM?.cpi || 0,
      forecastedCost: latestEVM?.eac || 0,
      varianceAtCompletion: latestEVM?.vac || 0,
    },
    qualityMetrics: {
      deliverablesAccepted: 0, // Would fetch from deliverables module
      deliverablesRejected: 0,
      acceptanceRate: 0,
      avgQualityScore: 0,
    },
    riskMetrics: {
      activeRisks: 0, // Would fetch from risks module
      highRisks: 0,
      mitigatedRisks: 0,
      riskExposure: 0,
    },
    stakeholderMetrics: {
      totalStakeholders: latestSentiment.length,
      avgSentiment,
      positiveCount,
      neutralCount,
      negativeCount,
      engagementLevel: avgEngagement,
    },
    changeMetrics: {
      totalChanges: changes.length,
      pendingChanges,
      approvedChanges,
      rejectedChanges,
      approvalRate,
    },
  };
}
