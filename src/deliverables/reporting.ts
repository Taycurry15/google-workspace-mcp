/**
 * Deliverable Reporting
 *
 * Generates various reports for deliverables including:
 * - Status reports
 * - Quality reports
 * - Schedule variance reports
 * - Summary dashboards
 * - Performance metrics
 */

import type { sheets_v4 } from "googleapis";
import type {
  DeliverableReport,
  DeliverableReportConfig,
  DeliverableSummary,
  Deliverable,
  DeliverableStatus,
  DeliverableType,
} from "../types/deliverable.js";
import {
  listDeliverables,
  getOverdueDeliverables,
  getAtRiskDeliverables,
  getUpcomingDeliverables,
} from "./deliverables.js";
import { generateNextId } from "../utils/sheetHelpers.js";

/**
 * Generate deliverable summary statistics
 */
export async function generateSummary(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<DeliverableSummary> {
  try {
    const deliverables = await listDeliverables(sheets, spreadsheetId, {
      programId,
    });

    const total = deliverables.length;

    // Count by status
    const byStatus: Record<DeliverableStatus, number> = {
      not_started: 0,
      in_progress: 0,
      submitted: 0,
      in_review: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
    };

    for (const d of deliverables) {
      byStatus[d.status]++;
    }

    // Count by type
    const byType: Record<DeliverableType, number> = {
      document: 0,
      design: 0,
      software: 0,
      hardware: 0,
      training: 0,
      report: 0,
      presentation: 0,
      prototype: 0,
      data: 0,
      other: 0,
    };

    for (const d of deliverables) {
      byType[d.type]++;
    }

    // Calculate overdue, at-risk, on-track
    const overdue = (
      await getOverdueDeliverables(sheets, spreadsheetId, programId)
    ).length;

    const atRisk = (
      await getAtRiskDeliverables(sheets, spreadsheetId, programId)
    ).length;

    const onTrack = total - overdue - atRisk;

    // Calculate average quality score
    const delivsWithQuality = deliverables.filter((d) => d.qualityScore);
    const avgQualityScore =
      delivsWithQuality.length > 0
        ? delivsWithQuality.reduce((sum, d) => sum + (d.qualityScore || 0), 0) /
          delivsWithQuality.length
        : undefined;

    // Calculate completion rate
    const completed = byStatus.completed + byStatus.approved;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    // Calculate average variance
    const delivsWithVariance = deliverables.filter((d) => d.variance !== undefined);
    const avgVariance =
      delivsWithVariance.length > 0
        ? delivsWithVariance.reduce((sum, d) => sum + (d.variance || 0), 0) /
          delivsWithVariance.length
        : undefined;

    return {
      total,
      byStatus,
      byType,
      overdue,
      atRisk,
      onTrack,
      avgQualityScore,
      completionRate,
      avgVariance,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate summary: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate a status report
 */
export async function generateStatusReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  config: DeliverableReportConfig
): Promise<DeliverableReport> {
  try {
    const reportId = await generateNextId(
      sheets,
      spreadsheetId,
      "Reports",
      "Report ID",
      "REP"
    );

    const deliverables = await listDeliverables(sheets, spreadsheetId, {
      programId: config.programId,
    });

    // Apply filters
    let filtered = deliverables;

    if (config.filters?.status) {
      filtered = filtered.filter((d) => config.filters!.status!.includes(d.status));
    }

    if (config.filters?.owner) {
      filtered = filtered.filter((d) => config.filters!.owner!.includes(d.owner));
    }

    if (config.filters?.dateRange) {
      const { field, from, to } = config.filters.dateRange;
      filtered = filtered.filter((d) => {
        const date = d[field];
        if (!date) return false;

        if (from && date < from) return false;
        if (to && date > to) return false;

        return true;
      });
    }

    if (config.filters?.tags) {
      filtered = filtered.filter((d) =>
        config.filters!.tags!.some((tag) => d.tags.includes(tag))
      );
    }

    // Sort deliverables
    if (config.sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[config.sortBy!];
        const bVal = b[config.sortBy!];

        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      });
    }

    // Generate summary
    const summary = await generateSummary(sheets, spreadsheetId, config.programId);

    const report: DeliverableReport = {
      reportId,
      reportType: config.reportType,
      programId: config.programId,
      generatedDate: new Date(),
      generatedBy: "system",
      config,
      summary,
      deliverables: filtered,
      fileId: undefined,
    };

    return report;
  } catch (error) {
    throw new Error(
      `Failed to generate status report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate a quality report
 */
export async function generateQualityReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<DeliverableReport> {
  try {
    const config: DeliverableReportConfig = {
      reportType: "quality",
      programId,
      includeCharts: true,
      includeDetails: true,
      sortBy: "qualityScore",
    };

    const deliverables = await listDeliverables(sheets, spreadsheetId, {
      programId,
    });

    // Filter to only deliverables with quality scores
    const withQuality = deliverables.filter((d) => d.qualityScore !== undefined);

    // Sort by quality score (lowest first to highlight problems)
    withQuality.sort((a, b) => {
      const aScore = a.qualityScore || 0;
      const bScore = b.qualityScore || 0;
      return aScore - bScore;
    });

    const summary = await generateSummary(sheets, spreadsheetId, programId);

    const reportId = await generateNextId(
      sheets,
      spreadsheetId,
      "Reports",
      "Report ID",
      "REP"
    );

    return {
      reportId,
      reportType: "quality",
      programId,
      generatedDate: new Date(),
      generatedBy: "system",
      config,
      summary,
      deliverables: withQuality,
      fileId: undefined,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate quality report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate a schedule variance report
 */
export async function generateScheduleReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<DeliverableReport> {
  try {
    const config: DeliverableReportConfig = {
      reportType: "schedule",
      programId,
      includeCharts: true,
      includeDetails: true,
      sortBy: "dueDate",
    };

    const deliverables = await listDeliverables(sheets, spreadsheetId, {
      programId,
    });

    // Include overdue, at-risk, and upcoming
    const overdue = await getOverdueDeliverables(sheets, spreadsheetId, programId);
    const atRisk = await getAtRiskDeliverables(sheets, spreadsheetId, programId);
    const upcoming = await getUpcomingDeliverables(
      sheets,
      spreadsheetId,
      programId,
      30
    );

    // Sort by due date
    deliverables.sort((a, b) => {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    const summary = await generateSummary(sheets, spreadsheetId, programId);

    const reportId = await generateNextId(
      sheets,
      spreadsheetId,
      "Reports",
      "Report ID",
      "REP"
    );

    return {
      reportId,
      reportType: "schedule",
      programId,
      generatedDate: new Date(),
      generatedBy: "system",
      config,
      summary: {
        ...summary,
        // Add schedule-specific metrics
      },
      deliverables,
      fileId: undefined,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate schedule report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate an overdue deliverables report
 */
export async function generateOverdueReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<DeliverableReport> {
  try {
    const config: DeliverableReportConfig = {
      reportType: "overdue",
      programId,
      includeCharts: false,
      includeDetails: true,
      sortBy: "dueDate",
    };

    const overdue = await getOverdueDeliverables(sheets, spreadsheetId, programId);

    // Sort by how many days overdue (most overdue first)
    overdue.sort((a, b) => {
      const aDaysOverdue = Math.floor(
        (new Date().getTime() - new Date(a.dueDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const bDaysOverdue = Math.floor(
        (new Date().getTime() - new Date(b.dueDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return bDaysOverdue - aDaysOverdue; // Most overdue first
    });

    const summary = await generateSummary(sheets, spreadsheetId, programId);

    const reportId = await generateNextId(
      sheets,
      spreadsheetId,
      "Reports",
      "Report ID",
      "REP"
    );

    return {
      reportId,
      reportType: "overdue",
      programId,
      generatedDate: new Date(),
      generatedBy: "system",
      config,
      summary,
      deliverables: overdue,
      fileId: undefined,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate overdue report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate a summary dashboard report
 */
export async function generateSummaryReport(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<DeliverableReport> {
  try {
    const config: DeliverableReportConfig = {
      reportType: "summary",
      programId,
      includeCharts: true,
      includeDetails: false,
    };

    const summary = await generateSummary(sheets, spreadsheetId, programId);

    const overdue = await getOverdueDeliverables(sheets, spreadsheetId, programId);
    const atRisk = await getAtRiskDeliverables(sheets, spreadsheetId, programId);
    const upcoming = await getUpcomingDeliverables(
      sheets,
      spreadsheetId,
      programId,
      30
    );

    // Get recently completed (last 30 days)
    const allDeliverables = await listDeliverables(sheets, spreadsheetId, {
      programId,
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentlyCompleted = allDeliverables.filter((d) => {
      return (
        (d.status === "completed" || d.status === "approved") &&
        d.actualDate &&
        d.actualDate >= thirtyDaysAgo
      );
    });

    const reportId = await generateNextId(
      sheets,
      spreadsheetId,
      "Reports",
      "Report ID",
      "REP"
    );

    return {
      reportId,
      reportType: "summary",
      programId,
      generatedDate: new Date(),
      generatedBy: "system",
      config,
      summary,
      deliverables: [
        ...overdue.slice(0, 10), // Top 10 overdue
        ...atRisk.slice(0, 10), // Top 10 at-risk
        ...upcoming.slice(0, 10), // Top 10 upcoming
        ...recentlyCompleted.slice(0, 10), // Top 10 recently completed
      ],
      fileId: undefined,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate summary report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Format report as text
 */
export function formatReportAsText(report: DeliverableReport): string {
  const lines: string[] = [];

  lines.push(`DELIVERABLE REPORT: ${report.reportType.toUpperCase()}`);
  lines.push(`Program ID: ${report.programId}`);
  lines.push(`Generated: ${report.generatedDate.toISOString()}`);
  lines.push(`Report ID: ${report.reportId}`);
  lines.push("");

  // Summary section
  lines.push("SUMMARY");
  lines.push("=======");
  lines.push(`Total Deliverables: ${report.summary.total}`);
  lines.push(`Completion Rate: ${report.summary.completionRate.toFixed(1)}%`);
  lines.push(`Overdue: ${report.summary.overdue}`);
  lines.push(`At Risk: ${report.summary.atRisk}`);
  lines.push(`On Track: ${report.summary.onTrack}`);

  if (report.summary.avgQualityScore !== undefined) {
    lines.push(
      `Average Quality Score: ${report.summary.avgQualityScore.toFixed(1)}/5`
    );
  }

  if (report.summary.avgVariance !== undefined) {
    lines.push(
      `Average Schedule Variance: ${report.summary.avgVariance.toFixed(1)} days`
    );
  }

  lines.push("");

  // Status breakdown
  lines.push("STATUS BREAKDOWN");
  lines.push("================");
  for (const [status, count] of Object.entries(report.summary.byStatus)) {
    if (count > 0) {
      lines.push(`${status}: ${count}`);
    }
  }

  lines.push("");

  // Type breakdown
  lines.push("TYPE BREAKDOWN");
  lines.push("==============");
  for (const [type, count] of Object.entries(report.summary.byType)) {
    if (count > 0) {
      lines.push(`${type}: ${count}`);
    }
  }

  lines.push("");

  // Deliverable details
  if (report.config.includeDetails && report.deliverables.length > 0) {
    lines.push("DELIVERABLES");
    lines.push("============");

    for (const d of report.deliverables) {
      lines.push("");
      lines.push(`ID: ${d.deliverableId}`);
      lines.push(`Name: ${d.name}`);
      lines.push(`Owner: ${d.owner}`);
      lines.push(`Status: ${d.status}`);
      lines.push(`Due Date: ${d.dueDate.toISOString().split("T")[0]}`);

      if (d.forecastDate) {
        lines.push(
          `Forecast Date: ${d.forecastDate.toISOString().split("T")[0]}`
        );
      }

      if (d.actualDate) {
        lines.push(
          `Actual Date: ${d.actualDate.toISOString().split("T")[0]}`
        );
      }

      if (d.variance !== undefined) {
        lines.push(`Variance: ${d.variance} days`);
      }

      if (d.qualityScore !== undefined) {
        lines.push(`Quality Score: ${d.qualityScore}/5`);
      }

      lines.push(`Progress: ${d.percentComplete}%`);
    }
  }

  return lines.join("\n");
}

/**
 * Export report data as CSV
 */
export function exportReportAsCSV(report: DeliverableReport): string {
  const headers = [
    "Deliverable ID",
    "Name",
    "Type",
    "Owner",
    "Due Date",
    "Forecast Date",
    "Actual Date",
    "Variance (days)",
    "Status",
    "Review Status",
    "% Complete",
    "Quality Score",
  ];

  const rows = report.deliverables.map((d) => [
    d.deliverableId,
    d.name,
    d.type,
    d.owner,
    d.dueDate.toISOString().split("T")[0],
    d.forecastDate ? d.forecastDate.toISOString().split("T")[0] : "",
    d.actualDate ? d.actualDate.toISOString().split("T")[0] : "",
    d.variance || "",
    d.status,
    d.reviewStatus,
    d.percentComplete,
    d.qualityScore || "",
  ]);

  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ];

  return csvLines.join("\n");
}
