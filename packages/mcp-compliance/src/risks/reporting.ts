/**
 * Risk Reporting Module
 * Generates risk reports and dashboards
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import type { Risk } from "@gw-mcp/shared-core";
import { readSheetRange } from "@gw-mcp/shared-core";

const SPREADSHEET_ID = process.env.COMPLIANCE_SPREADSHEET_ID || "";

export interface RiskSummary {
  programId: string;
  totalRisks: number;
  highSeverityRisks: number;
  openRisks: number;
  mitigatedRisks: number;
  closedRisks: number;
  avgRiskScore: number;
  topRisks: Array<{
    riskId: string;
    title: string;
    score: number;
    status: string;
  }>;
}

/**
 * Generate risk summary for a program
 */
export async function generateRiskSummary(
  auth: OAuth2Client,
  programId: string
): Promise<RiskSummary> {
  const sheets = google.sheets({ version: "v4", auth });
  const data = await readSheetRange(sheets, SPREADSHEET_ID, "Risks!A:P");

  if (data.length <= 1) {
    return {
      programId,
      totalRisks: 0,
      highSeverityRisks: 0,
      openRisks: 0,
      mitigatedRisks: 0,
      closedRisks: 0,
      avgRiskScore: 0,
      topRisks: [],
    };
  }

  const risks: any[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] !== programId) continue;

    const probability = parseInt(row[6]) || 1;
    const impact = parseInt(row[7]) || 1;
    const score = probability * impact;

    risks.push({
      riskId: row[0],
      title: row[3],
      status: row[13],
      score,
    });
  }

  const openRisks = risks.filter((r) => r.status === "open" || r.status === "identified");
  const mitigatedRisks = risks.filter((r) => r.status === "mitigated");
  const closedRisks = risks.filter((r) => r.status === "closed");
  const highSeverityRisks = risks.filter((r) => r.score >= 15);

  const avgRiskScore =
    risks.length > 0
      ? Math.round(risks.reduce((sum, r) => sum + r.score, 0) / risks.length)
      : 0;

  const topRisks = risks
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((r) => ({
      riskId: r.riskId,
      title: r.title,
      score: r.score,
      status: r.status,
    }));

  return {
    programId,
    totalRisks: risks.length,
    highSeverityRisks: highSeverityRisks.length,
    openRisks: openRisks.length,
    mitigatedRisks: mitigatedRisks.length,
    closedRisks: closedRisks.length,
    avgRiskScore,
    topRisks,
  };
}

/**
 * Get trend of risk scores over time
 */
export async function getRiskTrend(
  auth: OAuth2Client,
  programId: string,
  months: number = 6
): Promise<Array<{ month: string; avgScore: number; count: number }>> {
  // Simplified implementation - would need historical snapshot data
  const summary = await generateRiskSummary(auth, programId);
  
  return [{
    month: new Date().toISOString().substring(0, 7),
    avgScore: summary.avgRiskScore,
    count: summary.totalRisks,
  }];
}
