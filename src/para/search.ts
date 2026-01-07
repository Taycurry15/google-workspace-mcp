/**
 * PARA Smart Search
 * Advanced search functionality for PARA-categorized files
 */

import { OAuth2Client } from "google-auth-library";
import {
  PARASearchCriteria,
  PARASearchResult,
  FileInfo,
} from "../types/para.js";
import { searchByPARA, SEARCH_PRESETS } from "./metadata.js";
import { getFileMetadata } from "./metadata.js";

/**
 * Search files with PARA criteria and return detailed results
 */
export async function search(
  auth: OAuth2Client,
  criteria: PARASearchCriteria
): Promise<PARASearchResult[]> {
  const files = await searchByPARA(auth, criteria);
  const results: PARASearchResult[] = [];

  for (const file of files) {
    const metadata = await getFileMetadata(auth, file.id);

    let matchReason = "";
    if (criteria.category) {
      matchReason = `Category: ${criteria.category}`;
    }
    if (criteria.actionability) {
      matchReason += matchReason
        ? `, Actionability: ${criteria.actionability}`
        : `Actionability: ${criteria.actionability}`;
    }
    if (criteria.tags && criteria.tags.length > 0) {
      matchReason += matchReason
        ? `, Tags: ${criteria.tags.join(", ")}`
        : `Tags: ${criteria.tags.join(", ")}`;
    }

    results.push({
      file,
      metadata: metadata || {},
      matchReason: matchReason || "All PARA files",
    });
  }

  return results;
}

/**
 * Search using a preset
 */
export async function searchPreset(
  auth: OAuth2Client,
  presetName: keyof typeof SEARCH_PRESETS
): Promise<PARASearchResult[]> {
  const preset = SEARCH_PRESETS[presetName];
  return search(auth, preset);
}

/**
 * Search for high priority items
 */
export async function searchHighPriority(
  auth: OAuth2Client
): Promise<PARASearchResult[]> {
  return search(auth, {
    actionability: "high",
    maxResults: 100,
  });
}

/**
 * Search for projects by domain
 */
export async function searchProjectsByDomain(
  auth: OAuth2Client,
  domain: "govcon" | "international" | "cybersec" | "business"
): Promise<PARASearchResult[]> {
  return search(auth, {
    category: "PROJECT",
    domain,
    maxResults: 100,
  });
}

/**
 * Search for stale projects (no activity in X days)
 */
export async function searchStaleProjects(
  auth: OAuth2Client,
  days: number = 90
): Promise<PARASearchResult[]> {
  const endDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return search(auth, {
    category: "PROJECT",
    dateRange: {
      end: endDate.toISOString(),
    },
    maxResults: 100,
  });
}

/**
 * Search for resources by tags
 */
export async function searchResourcesByTags(
  auth: OAuth2Client,
  tags: string[]
): Promise<PARASearchResult[]> {
  return search(auth, {
    category: "RESOURCE",
    tags,
    maxResults: 100,
  });
}

/**
 * Advanced search with multiple criteria
 */
export async function advancedSearch(
  auth: OAuth2Client,
  options: {
    category?: "PROJECT" | "AREA" | "RESOURCE" | "ARCHIVE";
    actionability?: "high" | "medium" | "low";
    domain?: "govcon" | "international" | "cybersec" | "business";
    tags?: string[];
    searchText?: string;
    modifiedAfter?: Date;
    modifiedBefore?: Date;
    maxResults?: number;
  }
): Promise<PARASearchResult[]> {
  const criteria: PARASearchCriteria = {
    category: options.category,
    actionability: options.actionability,
    domain: options.domain,
    tags: options.tags,
    maxResults: options.maxResults || 100,
  };

  if (options.modifiedAfter || options.modifiedBefore) {
    criteria.dateRange = {
      start: options.modifiedAfter?.toISOString(),
      end: options.modifiedBefore?.toISOString(),
    };
  }

  let results = await search(auth, criteria);

  // Additional text filtering if provided
  if (options.searchText) {
    const searchLower = options.searchText.toLowerCase();
    results = results.filter((result) =>
      result.file.name.toLowerCase().includes(searchLower)
    );
  }

  return results;
}

/**
 * Get available search presets
 */
export function getAvailablePresets(): Array<{
  name: string;
  description: string;
}> {
  return [
    {
      name: "highPriorityProjects",
      description: "Active projects requiring immediate attention",
    },
    {
      name: "staleProjects",
      description: "Projects with no activity in 90+ days",
    },
    {
      name: "recentResources",
      description: "Resources added in last 30 days",
    },
    {
      name: "needsReview",
      description: "All items flagged for review",
    },
    {
      name: "govconProjects",
      description: "All government contracting projects",
    },
    {
      name: "internationalProjects",
      description: "All international deal projects",
    },
    {
      name: "cybersecProjects",
      description: "All cybersecurity practice projects",
    },
  ];
}
