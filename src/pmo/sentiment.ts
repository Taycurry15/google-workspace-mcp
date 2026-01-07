/**
 * Sentiment Analysis Module
 * LLM-powered sentiment analysis of stakeholder communications
 * Phase 4 - Week 6 Implementation
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { llmRouter } from "../../packages/shared-llm/src/router/router.js";
import { appendRows, readSheetRange } from "../utils/sheetHelpers.js";

const SPREADSHEET_ID = process.env.PMO_SPREADSHEET_ID || "";
const SHEET_NAME = "Sentiment Analysis";

/**
 * Sentiment Analysis Snapshot Interface
 */
export interface SentimentSnapshot {
  snapshotId: string;
  stakeholderId: string;
  stakeholderName: string;
  programId: string;
  snapshotDate: Date;
  overallSentiment: number;        // 0-1 (0=very negative, 1=very positive)
  engagementLevel: number;         // 1-5
  trend: "improving" | "stable" | "declining";
  keyConcerns: string[];           // AI-extracted concerns
  recommendedActions: string[];    // AI-suggested actions
  communicationCount: number;      // Number of communications analyzed
  dateRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Communication Item (email, meeting notes, etc.)
 */
export interface CommunicationItem {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  date: Date;
  type: "email" | "meeting_notes" | "document" | "chat";
}

/**
 * Column mapping for Sentiment Analysis sheet
 */
const COLUMN_MAP = {
  snapshotId: 0,
  stakeholderId: 1,
  stakeholderName: 2,
  programId: 3,
  snapshotDate: 4,
  overallSentiment: 5,
  engagementLevel: 6,
  trend: 7,
  keyConcerns: 8,         // Comma-separated
  recommendedActions: 9,  // Comma-separated
  communicationCount: 10,
  dateRangeStart: 11,
  dateRangeEnd: 12,
};

/**
 * Parse a row from the sheet into a SentimentSnapshot object
 */
function parseSentimentSnapshot(row: any[]): SentimentSnapshot {
  return {
    snapshotId: row[COLUMN_MAP.snapshotId] || "",
    stakeholderId: row[COLUMN_MAP.stakeholderId] || "",
    stakeholderName: row[COLUMN_MAP.stakeholderName] || "",
    programId: row[COLUMN_MAP.programId] || "",
    snapshotDate: row[COLUMN_MAP.snapshotDate]
      ? new Date(row[COLUMN_MAP.snapshotDate])
      : new Date(),
    overallSentiment: parseFloat(row[COLUMN_MAP.overallSentiment]) || 0,
    engagementLevel: parseFloat(row[COLUMN_MAP.engagementLevel]) || 0,
    trend: (row[COLUMN_MAP.trend] as any) || "stable",
    keyConcerns: row[COLUMN_MAP.keyConcerns]
      ? row[COLUMN_MAP.keyConcerns].split(",").map((s: string) => s.trim()).filter(Boolean)
      : [],
    recommendedActions: row[COLUMN_MAP.recommendedActions]
      ? row[COLUMN_MAP.recommendedActions].split(",").map((s: string) => s.trim()).filter(Boolean)
      : [],
    communicationCount: parseInt(row[COLUMN_MAP.communicationCount]) || 0,
    dateRange: {
      start: row[COLUMN_MAP.dateRangeStart]
        ? new Date(row[COLUMN_MAP.dateRangeStart])
        : new Date(),
      end: row[COLUMN_MAP.dateRangeEnd]
        ? new Date(row[COLUMN_MAP.dateRangeEnd])
        : new Date(),
    },
  };
}

/**
 * Serialize a SentimentSnapshot object to a sheet row
 */
function serializeSentimentSnapshot(snapshot: SentimentSnapshot): any[] {
  const row = new Array(Object.keys(COLUMN_MAP).length).fill("");

  row[COLUMN_MAP.snapshotId] = snapshot.snapshotId;
  row[COLUMN_MAP.stakeholderId] = snapshot.stakeholderId;
  row[COLUMN_MAP.stakeholderName] = snapshot.stakeholderName;
  row[COLUMN_MAP.programId] = snapshot.programId;
  row[COLUMN_MAP.snapshotDate] = snapshot.snapshotDate.toISOString().split("T")[0];
  row[COLUMN_MAP.overallSentiment] = snapshot.overallSentiment;
  row[COLUMN_MAP.engagementLevel] = snapshot.engagementLevel;
  row[COLUMN_MAP.trend] = snapshot.trend;
  row[COLUMN_MAP.keyConcerns] = snapshot.keyConcerns.join(", ");
  row[COLUMN_MAP.recommendedActions] = snapshot.recommendedActions.join(", ");
  row[COLUMN_MAP.communicationCount] = snapshot.communicationCount;
  row[COLUMN_MAP.dateRangeStart] = snapshot.dateRange.start.toISOString().split("T")[0];
  row[COLUMN_MAP.dateRangeEnd] = snapshot.dateRange.end.toISOString().split("T")[0];

  return row;
}

/**
 * Fetch stakeholder emails from Gmail
 */
export async function fetchStakeholderEmails(
  auth: OAuth2Client,
  stakeholderEmail: string,
  dateRange: { start: Date; end: Date }
): Promise<CommunicationItem[]> {
  const gmail = google.gmail({ version: "v1", auth });

  // Build query
  const afterDate = Math.floor(dateRange.start.getTime() / 1000);
  const beforeDate = Math.floor(dateRange.end.getTime() / 1000);
  const query = `from:${stakeholderEmail} after:${afterDate} before:${beforeDate}`;

  try {
    // Search for messages
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 100,
    });

    const messages = listResponse.data.messages || [];
    const communications: CommunicationItem[] = [];

    // Fetch message details
    for (const message of messages) {
      try {
        const messageDetail = await gmail.users.messages.get({
          userId: "me",
          id: message.id!,
          format: "full",
        });

        const headers = messageDetail.data.payload?.headers || [];
        const from = headers.find((h) => h.name === "From")?.value || "";
        const to = headers.find((h) => h.name === "To")?.value?.split(",") || [];
        const subject = headers.find((h) => h.name === "Subject")?.value || "";
        const date = headers.find((h) => h.name === "Date")?.value || "";

        // Extract body (simplified - just get text/plain part)
        let body = "";
        if (messageDetail.data.payload?.parts) {
          const textPart = messageDetail.data.payload.parts.find(
            (p) => p.mimeType === "text/plain"
          );
          if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
          }
        } else if (messageDetail.data.payload?.body?.data) {
          body = Buffer.from(messageDetail.data.payload.body.data, "base64").toString("utf-8");
        }

        communications.push({
          id: message.id!,
          from,
          to,
          subject,
          body,
          date: new Date(date),
          type: "email",
        });
      } catch (err) {
        console.warn(`Failed to fetch message ${message.id}:`, err);
      }
    }

    return communications;
  } catch (error) {
    console.error("Failed to fetch emails:", error);
    return [];
  }
}

/**
 * Analyze sentiment of text using LLM
 */
export async function analyzeSentiment(text: string): Promise<{
  sentiment: number;
  concerns: string[];
  actions: string[];
  engagement: number;
}> {
  const prompt = `Analyze the sentiment and engagement in the following communication. Provide:
1. Sentiment score (0.0 to 1.0, where 0=very negative, 0.5=neutral, 1.0=very positive)
2. List of key concerns or issues mentioned (up to 5)
3. Recommended actions to address concerns (up to 5)
4. Engagement level (1-5, where 1=disengaged, 5=highly engaged)

Communication:
${text}

Respond in the following JSON format:
{
  "sentiment": <number 0-1>,
  "concerns": [<string>, ...],
  "actions": [<string>, ...],
  "engagement": <number 1-5>
}`;

  try {
    const response = await llmRouter.complete({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      config: {
        provider: "anthropic",
        model: "claude-sonnet-4.5",
        temperature: 0.3, // Lower temperature for more consistent analysis
        maxTokens: 2000,
      },
      metadata: {
        requestType: "sentiment_analysis",
      },
    });

    // Parse JSON response
    const content = response.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from LLM response");
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      sentiment: Math.max(0, Math.min(1, result.sentiment || 0.5)),
      concerns: (result.concerns || []).slice(0, 5),
      actions: (result.actions || []).slice(0, 5),
      engagement: Math.max(1, Math.min(5, Math.round(result.engagement || 3))),
    };
  } catch (error) {
    console.error("Sentiment analysis failed:", error);
    // Return neutral defaults on error
    return {
      sentiment: 0.5,
      concerns: [],
      actions: [],
      engagement: 3,
    };
  }
}

/**
 * Analyze stakeholder sentiment based on communications
 */
export async function analyzeStakeholderSentiment(
  auth: OAuth2Client,
  params: {
    stakeholderId: string;
    stakeholderName: string;
    stakeholderEmail: string;
    programId: string;
    dateRange?: { start: Date; end: Date };
    communications?: CommunicationItem[]; // Optional: provide communications directly
  }
): Promise<SentimentSnapshot> {
  const sheets = google.sheets({ version: "v4", auth });

  // Default date range: last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const dateRange = params.dateRange || { start: startDate, end: endDate };

  // Fetch communications if not provided
  let communications = params.communications || [];
  if (communications.length === 0) {
    communications = await fetchStakeholderEmails(
      auth,
      params.stakeholderEmail,
      dateRange
    );
  }

  // If no communications found, return neutral snapshot
  if (communications.length === 0) {
    const range = `${SHEET_NAME}!A2:A`;
    const rows = await readSheetRange(sheets, SPREADSHEET_ID, range);
    const nextId = `SENT-${String(rows.length + 1).padStart(3, "0")}`;

    return {
      snapshotId: nextId,
      stakeholderId: params.stakeholderId,
      stakeholderName: params.stakeholderName,
      programId: params.programId,
      snapshotDate: new Date(),
      overallSentiment: 0.5,
      engagementLevel: 3,
      trend: "stable",
      keyConcerns: ["No recent communications"],
      recommendedActions: ["Reach out to stakeholder to increase engagement"],
      communicationCount: 0,
      dateRange,
    };
  }

  // Combine all communications into one text for analysis
  const combinedText = communications
    .map((comm) => `Subject: ${comm.subject}\n${comm.body}`)
    .join("\n\n---\n\n");

  // Truncate if too long (max ~8000 chars for reasonable LLM input)
  const truncatedText = combinedText.length > 8000
    ? combinedText.substring(0, 8000) + "\n... (truncated)"
    : combinedText;

  // Analyze sentiment using LLM
  const analysis = await analyzeSentiment(truncatedText);

  // Determine trend by comparing to previous snapshot
  let trend: "improving" | "stable" | "declining" = "stable";
  const previousSnapshots = await getSentimentSnapshots(auth, {
    stakeholderId: params.stakeholderId,
    programId: params.programId,
    limit: 1,
  });

  if (previousSnapshots.length > 0) {
    const previous = previousSnapshots[0];
    const sentimentChange = analysis.sentiment - previous.overallSentiment;

    if (sentimentChange > 0.1) {
      trend = "improving";
    } else if (sentimentChange < -0.1) {
      trend = "declining";
    }
  }

  // Generate snapshot ID
  const range = `${SHEET_NAME}!A2:A`;
  const rows = await readSheetRange(sheets, SPREADSHEET_ID, range);
  const nextId = `SENT-${String(rows.length + 1).padStart(3, "0")}`;

  const snapshot: SentimentSnapshot = {
    snapshotId: nextId,
    stakeholderId: params.stakeholderId,
    stakeholderName: params.stakeholderName,
    programId: params.programId,
    snapshotDate: new Date(),
    overallSentiment: analysis.sentiment,
    engagementLevel: analysis.engagement,
    trend,
    keyConcerns: analysis.concerns,
    recommendedActions: analysis.actions,
    communicationCount: communications.length,
    dateRange,
  };

  return snapshot;
}

/**
 * Store a sentiment snapshot in Google Sheets
 */
export async function storeSentimentSnapshot(
  auth: OAuth2Client,
  snapshot: SentimentSnapshot
): Promise<SentimentSnapshot> {
  const sheets = google.sheets({ version: "v4", auth });

  const row = serializeSentimentSnapshot(snapshot);
  await appendRows(sheets, SPREADSHEET_ID, SHEET_NAME, [row]);

  return snapshot;
}

/**
 * Get sentiment snapshots with filters
 */
export async function getSentimentSnapshots(
  auth: OAuth2Client,
  filters?: {
    programId?: string;
    stakeholderId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<SentimentSnapshot[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const range = `${SHEET_NAME}!A2:M`;

  const rows = await readSheetRange(sheets, SPREADSHEET_ID, range);

  let snapshots = rows.map(parseSentimentSnapshot);

  // Apply filters
  if (filters?.programId) {
    snapshots = snapshots.filter((s) => s.programId === filters.programId);
  }
  if (filters?.stakeholderId) {
    snapshots = snapshots.filter((s) => s.stakeholderId === filters.stakeholderId);
  }
  if (filters?.startDate) {
    snapshots = snapshots.filter((s) => s.snapshotDate >= filters.startDate!);
  }
  if (filters?.endDate) {
    snapshots = snapshots.filter((s) => s.snapshotDate <= filters.endDate!);
  }

  // Sort by date (newest first)
  snapshots.sort((a, b) => b.snapshotDate.getTime() - a.snapshotDate.getTime());

  // Apply limit
  if (filters?.limit) {
    snapshots = snapshots.slice(0, filters.limit);
  }

  return snapshots;
}

/**
 * Track sentiment trend over time for a stakeholder
 */
export async function trackSentimentTrend(
  auth: OAuth2Client,
  stakeholderId: string,
  programId: string,
  periods: number = 10
): Promise<{
  snapshots: SentimentSnapshot[];
  trendDirection: "improving" | "stable" | "declining";
  averageSentiment: number;
  averageEngagement: number;
  sentimentChange: number;
  engagementChange: number;
}> {
  const snapshots = await getSentimentSnapshots(auth, {
    stakeholderId,
    programId,
    limit: periods,
  });

  if (snapshots.length === 0) {
    return {
      snapshots: [],
      trendDirection: "stable",
      averageSentiment: 0.5,
      averageEngagement: 3,
      sentimentChange: 0,
      engagementChange: 0,
    };
  }

  // Calculate averages
  const avgSentiment =
    snapshots.reduce((sum, s) => sum + s.overallSentiment, 0) / snapshots.length;
  const avgEngagement =
    snapshots.reduce((sum, s) => sum + s.engagementLevel, 0) / snapshots.length;

  // Determine trend by comparing recent vs older
  let trendDirection: "improving" | "stable" | "declining" = "stable";
  let sentimentChange = 0;
  let engagementChange = 0;

  if (snapshots.length >= 2) {
    const midpoint = Math.floor(snapshots.length / 2);
    const recentSnapshots = snapshots.slice(0, midpoint);
    const olderSnapshots = snapshots.slice(midpoint);

    const recentAvgSentiment =
      recentSnapshots.reduce((sum, s) => sum + s.overallSentiment, 0) / recentSnapshots.length;
    const olderAvgSentiment =
      olderSnapshots.reduce((sum, s) => sum + s.overallSentiment, 0) / olderSnapshots.length;

    sentimentChange = recentAvgSentiment - olderAvgSentiment;

    const recentAvgEngagement =
      recentSnapshots.reduce((sum, s) => sum + s.engagementLevel, 0) / recentSnapshots.length;
    const olderAvgEngagement =
      olderSnapshots.reduce((sum, s) => sum + s.engagementLevel, 0) / olderSnapshots.length;

    engagementChange = recentAvgEngagement - olderAvgEngagement;

    // Trend based on sentiment (>0.1 change = significant)
    if (sentimentChange > 0.1) {
      trendDirection = "improving";
    } else if (sentimentChange < -0.1) {
      trendDirection = "declining";
    }
  }

  return {
    snapshots,
    trendDirection,
    averageSentiment: avgSentiment,
    averageEngagement: avgEngagement,
    sentimentChange,
    engagementChange,
  };
}

/**
 * Generate sentiment report for a program
 */
export async function generateSentimentReport(
  auth: OAuth2Client,
  programId: string
): Promise<{
  totalStakeholders: number;
  positiveSentiment: number;
  neutralSentiment: number;
  negativeSentiment: number;
  averageSentiment: number;
  averageEngagement: number;
  improvingStakeholders: number;
  decliningStakeholders: number;
  topConcerns: Array<{ concern: string; frequency: number }>;
  topActions: Array<{ action: string; frequency: number }>;
  stakeholderSnapshots: SentimentSnapshot[];
  alertStakeholders: Array<{
    stakeholder: string;
    reason: string;
    sentiment: number;
  }>;
}> {
  // Get latest snapshot for each stakeholder in the program
  const allSnapshots = await getSentimentSnapshots(auth, { programId });

  // Group by stakeholder and get latest
  const stakeholderMap = new Map<string, SentimentSnapshot>();
  allSnapshots.forEach((snapshot) => {
    const existing = stakeholderMap.get(snapshot.stakeholderId);
    if (!existing || snapshot.snapshotDate > existing.snapshotDate) {
      stakeholderMap.set(snapshot.stakeholderId, snapshot);
    }
  });

  const latestSnapshots = Array.from(stakeholderMap.values());

  if (latestSnapshots.length === 0) {
    return {
      totalStakeholders: 0,
      positiveSentiment: 0,
      neutralSentiment: 0,
      negativeSentiment: 0,
      averageSentiment: 0.5,
      averageEngagement: 3,
      improvingStakeholders: 0,
      decliningStakeholders: 0,
      topConcerns: [],
      topActions: [],
      stakeholderSnapshots: [],
      alertStakeholders: [],
    };
  }

  // Sentiment categorization
  const positiveSentiment = latestSnapshots.filter((s) => s.overallSentiment >= 0.7).length;
  const neutralSentiment = latestSnapshots.filter(
    (s) => s.overallSentiment >= 0.4 && s.overallSentiment < 0.7
  ).length;
  const negativeSentiment = latestSnapshots.filter((s) => s.overallSentiment < 0.4).length;

  // Averages
  const avgSentiment =
    latestSnapshots.reduce((sum, s) => sum + s.overallSentiment, 0) / latestSnapshots.length;
  const avgEngagement =
    latestSnapshots.reduce((sum, s) => sum + s.engagementLevel, 0) / latestSnapshots.length;

  // Trends
  const improvingStakeholders = latestSnapshots.filter((s) => s.trend === "improving").length;
  const decliningStakeholders = latestSnapshots.filter((s) => s.trend === "declining").length;

  // Top concerns
  const concernCounts = new Map<string, number>();
  latestSnapshots.forEach((snapshot) => {
    snapshot.keyConcerns.forEach((concern) => {
      concernCounts.set(concern, (concernCounts.get(concern) || 0) + 1);
    });
  });
  const topConcerns = Array.from(concernCounts.entries())
    .map(([concern, frequency]) => ({ concern, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  // Top actions
  const actionCounts = new Map<string, number>();
  latestSnapshots.forEach((snapshot) => {
    snapshot.recommendedActions.forEach((action) => {
      actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
    });
  });
  const topActions = Array.from(actionCounts.entries())
    .map(([action, frequency]) => ({ action, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  // Alert stakeholders (negative sentiment or declining trend)
  const alertStakeholders: Array<{ stakeholder: string; reason: string; sentiment: number }> = [];
  latestSnapshots.forEach((snapshot) => {
    if (snapshot.overallSentiment < 0.4) {
      alertStakeholders.push({
        stakeholder: snapshot.stakeholderName,
        reason: "Negative sentiment detected",
        sentiment: snapshot.overallSentiment,
      });
    } else if (snapshot.trend === "declining" && snapshot.overallSentiment < 0.6) {
      alertStakeholders.push({
        stakeholder: snapshot.stakeholderName,
        reason: "Declining sentiment trend",
        sentiment: snapshot.overallSentiment,
      });
    }
  });

  return {
    totalStakeholders: latestSnapshots.length,
    positiveSentiment,
    neutralSentiment,
    negativeSentiment,
    averageSentiment: avgSentiment,
    averageEngagement: avgEngagement,
    improvingStakeholders,
    decliningStakeholders,
    topConcerns,
    topActions,
    stakeholderSnapshots: latestSnapshots,
    alertStakeholders,
  };
}

/**
 * Get stakeholders requiring attention (negative or declining sentiment)
 */
export async function getStakeholdersRequiringAttention(
  auth: OAuth2Client,
  programId: string
): Promise<SentimentSnapshot[]> {
  const allSnapshots = await getSentimentSnapshots(auth, { programId });

  // Get latest snapshot for each stakeholder
  const stakeholderMap = new Map<string, SentimentSnapshot>();
  allSnapshots.forEach((snapshot) => {
    const existing = stakeholderMap.get(snapshot.stakeholderId);
    if (!existing || snapshot.snapshotDate > existing.snapshotDate) {
      stakeholderMap.set(snapshot.stakeholderId, snapshot);
    }
  });

  const latestSnapshots = Array.from(stakeholderMap.values());

  // Filter for negative or declining
  return latestSnapshots.filter(
    (s) => s.overallSentiment < 0.4 || (s.trend === "declining" && s.overallSentiment < 0.6)
  );
}
