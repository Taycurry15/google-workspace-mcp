/**
 * PARA Review System
 * Identifies files needing review and generates prompts
 */

import { OAuth2Client } from "google-auth-library";
import {
  ReviewItem,
  ReviewPromptResult,
  FileInfo,
} from "../types/para.js";
import {
  getUncategorizedFiles,
  getFilesNeedingReview,
  searchByPARA,
} from "./metadata.js";
import { findArchivalCandidates } from "./archiver.js";

/**
 * Identify all files needing review
 */
export async function identifyReviewItems(
  auth: OAuth2Client,
  options: {
    includeUncategorized?: boolean;
    includeStale?: boolean;
    includeLowConfidence?: boolean;
    includeArchivalCandidates?: boolean;
    staleDays?: number;
    maxItems?: number;
  } = {}
): Promise<ReviewItem[]> {
  const {
    includeUncategorized = true,
    includeStale = true,
    includeLowConfidence = true,
    includeArchivalCandidates = true,
    staleDays = 90,
    maxItems = 100,
  } = options;

  const items: ReviewItem[] = [];

  // Uncategorized files
  if (includeUncategorized) {
    const uncategorized = await getUncategorizedFiles(auth, maxItems);

    for (const file of uncategorized) {
      items.push({
        file,
        issue: "uncategorized",
        issueDetails: "File has not been categorized with PARA method",
        suggestedAction: "Categorize using AI or manually",
        priority: "high",
      });
    }
  }

  // Files marked as needing review
  const needsReview = await getFilesNeedingReview(auth, maxItems);

  for (const file of needsReview) {
    items.push({
      file,
      issue: "lowConfidence",
      issueDetails: "AI categorization had low confidence",
      suggestedAction: "Manually review and update category if needed",
      priority: "medium",
    });
  }

  // Stale projects
  if (includeStale) {
    const staleDate = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

    const staleProjects = await searchByPARA(auth, {
      category: "PROJECT",
      dateRange: {
        end: staleDate.toISOString(),
      },
      maxResults: maxItems,
    });

    for (const file of staleProjects) {
      const daysSinceModified = Math.floor(
        (Date.now() - new Date(file.modifiedTime).getTime()) /
          (24 * 60 * 60 * 1000)
      );

      items.push({
        file,
        issue: "stale",
        issueDetails: `No activity in ${daysSinceModified} days`,
        suggestedAction:
          "Review project status - consider completing or archiving",
        priority: daysSinceModified > 180 ? "high" : "medium",
        daysPending: daysSinceModified,
      });
    }
  }

  // Archival candidates
  if (includeArchivalCandidates) {
    const candidates = await findArchivalCandidates(auth, { staleDays });

    for (const candidate of candidates) {
      if (candidate.needsConfirmation) {
        items.push({
          file: {
            id: candidate.fileId,
            name: candidate.fileName,
          } as FileInfo,
          issue: "archivalCandidate",
          issueDetails: candidate.reason,
          suggestedAction: "Review and archive if completed",
          priority: "medium",
        });
      }
    }
  }

  // Limit total items
  return items.slice(0, maxItems);
}

/**
 * Generate review prompt with summary
 */
export async function generateReviewPrompt(
  auth: OAuth2Client,
  options: {
    scanScope?: "all" | "uncategorized" | "stale" | "lowConfidence";
    staleDays?: number;
    maxItems?: number;
  } = {}
): Promise<ReviewPromptResult> {
  const { scanScope = "all", staleDays = 90, maxItems = 100 } = options;

  // Determine what to include
  const includeOptions = {
    includeUncategorized: scanScope === "all" || scanScope === "uncategorized",
    includeStale: scanScope === "all" || scanScope === "stale",
    includeLowConfidence: scanScope === "all" || scanScope === "lowConfidence",
    includeArchivalCandidates: scanScope === "all",
    staleDays,
    maxItems,
  };

  const items = await identifyReviewItems(auth, includeOptions);

  // Categorize by priority
  const highPriority = items.filter((item) => item.priority === "high");
  const mediumPriority = items.filter((item) => item.priority === "medium");
  const lowPriority = items.filter((item) => item.priority === "low");

  // Estimate review time (2 minutes per item)
  const estimatedMinutes = Math.ceil(items.length * 2);
  const estimatedTime =
    estimatedMinutes < 60
      ? `${estimatedMinutes} minutes`
      : `${Math.floor(estimatedMinutes / 60)} hours ${estimatedMinutes % 60} minutes`;

  return {
    items,
    summary: {
      totalItems: items.length,
      highPriority: highPriority.length,
      mediumPriority: mediumPriority.length,
      lowPriority: lowPriority.length,
      estimatedReviewTime: estimatedTime,
    },
  };
}

/**
 * Format review prompt as email
 */
export function formatReviewEmail(result: ReviewPromptResult): {
  subject: string;
  body: string;
} {
  const { items, summary } = result;

  const subject = `PARA Review Needed - ${summary.totalItems} Items`;

  let body = `PARA System Review\n\n`;
  body += `You have ${summary.totalItems} items needing review:\n\n`;

  body += `Summary:\n`;
  body += `- High Priority: ${summary.highPriority}\n`;
  body += `- Medium Priority: ${summary.mediumPriority}\n`;
  body += `- Low Priority: ${summary.lowPriority}\n`;
  body += `- Estimated Review Time: ${summary.estimatedReviewTime}\n\n`;

  // High priority items
  if (summary.highPriority > 0) {
    body += `HIGH PRIORITY (${summary.highPriority} items)\n`;
    body += `${"=".repeat(50)}\n\n`;

    const highItems = items.filter((item) => item.priority === "high");
    for (const item of highItems.slice(0, 10)) {
      body += `- ${item.file.name}\n`;
      body += `  Issue: ${item.issueDetails}\n`;
      body += `  Action: ${item.suggestedAction}\n`;
      if (item.file.webViewLink) {
        body += `  Link: ${item.file.webViewLink}\n`;
      }
      body += `\n`;
    }

    if (highItems.length > 10) {
      body += `... and ${highItems.length - 10} more high priority items\n\n`;
    }
  }

  // Medium priority items
  if (summary.mediumPriority > 0) {
    body += `\nMEDIUM PRIORITY (${summary.mediumPriority} items)\n`;
    body += `${"=".repeat(50)}\n\n`;

    const mediumItems = items.filter((item) => item.priority === "medium");
    for (const item of mediumItems.slice(0, 5)) {
      body += `- ${item.file.name}\n`;
      body += `  Issue: ${item.issueDetails}\n`;
      body += `  Action: ${item.suggestedAction}\n\n`;
    }

    if (mediumItems.length > 5) {
      body += `... and ${mediumItems.length - 5} more medium priority items\n\n`;
    }
  }

  // Low priority summary
  if (summary.lowPriority > 0) {
    body += `\nLOW PRIORITY: ${summary.lowPriority} items\n\n`;
  }

  body += `\n${"=".repeat(50)}\n`;
  body += `Automated by PARA System\n`;

  return { subject, body };
}

/**
 * Send review prompt email
 */
export async function sendReviewEmail(
  auth: OAuth2Client,
  to: string,
  result: ReviewPromptResult
): Promise<void> {
  const { google } = await import("googleapis");
  const gmail = google.gmail({ version: "v1", auth });

  const { subject, body } = formatReviewEmail(result);

  // Create email
  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\n");

  const encodedEmail = Buffer.from(email)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedEmail,
    },
  });

  console.log(`✓ Review email sent to ${to}`);
}

/**
 * Get review statistics
 */
export async function getReviewStats(
  auth: OAuth2Client
): Promise<{
  uncategorized: number;
  lowConfidence: number;
  stale: number;
  archivalCandidates: number;
}> {
  const uncategorized = await getUncategorizedFiles(auth, 1000);
  const needsReview = await getFilesNeedingReview(auth, 1000);

  const staleDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const staleProjects = await searchByPARA(auth, {
    category: "PROJECT",
    dateRange: { end: staleDate.toISOString() },
    maxResults: 1000,
  });

  const candidates = await findArchivalCandidates(auth, { staleDays: 90 });

  return {
    uncategorized: uncategorized.length,
    lowConfidence: needsReview.length,
    stale: staleProjects.length,
    archivalCandidates: candidates.filter((c) => c.needsConfirmation).length,
  };
}
