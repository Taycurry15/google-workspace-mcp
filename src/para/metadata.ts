/**
 * PARA Metadata Management
 * Handles Google Drive custom properties for PARA categorization
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import {
  PARAMetadata,
  CategorizationResult,
  PARASearchCriteria,
  FileInfo,
} from "../types/para.js";

/**
 * Convert categorization result to Drive custom properties
 */
export function categorizationToMetadata(
  result: CategorizationResult,
  domain?: string
): Partial<PARAMetadata> {
  const metadata: Partial<PARAMetadata> = {
    para_category: result.category,
    para_confidence: result.confidence.toString(),
    para_assigned_date: new Date().toISOString(),
    para_reviewed_date: new Date().toISOString(),
    para_tags: JSON.stringify(result.suggestedTags),
    para_actionability: result.actionability,
    para_needs_review: result.confidence < 0.7 ? "true" : "false",
    para_last_ai_analysis: new Date().toISOString(),
  };

  if (domain) {
    metadata.para_domain = domain as any;
  }

  // Category-specific metadata
  if (result.category === "PROJECT" && result.suggestedProject) {
    metadata.para_project_name = result.suggestedProject;
    metadata.para_project_status = "active";
  }

  if (result.category === "AREA" && result.suggestedArea) {
    metadata.para_area_name = result.suggestedArea;
  }

  if (result.category === "ARCHIVE" && result.archiveDate) {
    metadata.para_archive_date = result.archiveDate;
    metadata.para_archive_reason = "Auto-archived by AI";
  }

  return metadata;
}

/**
 * Update file's PARA metadata
 */
export async function updateFileMetadata(
  auth: OAuth2Client,
  fileId: string,
  metadata: Partial<PARAMetadata>
): Promise<void> {
  const drive = google.drive({ version: "v3", auth });

  try {
    await drive.files.update({
      fileId,
      requestBody: {
        properties: metadata as { [key: string]: string },
      },
      fields: "id, properties",
    });
  } catch (error) {
    console.error(`Failed to update metadata for file ${fileId}:`, error);
    throw new Error(
      `Failed to update PARA metadata: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get file's PARA metadata
 */
export async function getFileMetadata(
  auth: OAuth2Client,
  fileId: string
): Promise<Partial<PARAMetadata> | null> {
  const drive = google.drive({ version: "v3", auth });

  try {
    const response = await drive.files.get({
      fileId,
      fields: "id, properties",
    });

    return (response.data.properties as Partial<PARAMetadata>) || null;
  } catch (error) {
    console.error(`Failed to get metadata for file ${fileId}:`, error);
    return null;
  }
}

/**
 * Check if file has PARA metadata
 */
export async function hasParaMetadata(
  auth: OAuth2Client,
  fileId: string
): Promise<boolean> {
  const metadata = await getFileMetadata(auth, fileId);
  return metadata !== null && metadata.para_category !== undefined;
}

/**
 * Build Drive API query from search criteria
 */
export function buildSearchQuery(criteria: PARASearchCriteria): string {
  const conditions: string[] = [];

  // Base condition - must have PARA metadata
  conditions.push("properties has { key='para_category' and value!='' }");

  // Category filter
  if (criteria.category) {
    conditions.push(
      `properties has { key='para_category' and value='${criteria.category}' }`
    );
  }

  // Actionability filter
  if (criteria.actionability) {
    conditions.push(
      `properties has { key='para_actionability' and value='${criteria.actionability}' }`
    );
  }

  // Tags filter (check if tags contain any of the search tags)
  if (criteria.tags && criteria.tags.length > 0) {
    const tagConditions = criteria.tags.map(
      (tag) =>
        `properties has { key='para_tags' and value contains '${tag}' }`
    );
    conditions.push(`(${tagConditions.join(" or ")})`);
  }

  // Domain filter
  if (criteria.domain) {
    conditions.push(
      `properties has { key='para_domain' and value='${criteria.domain}' }`
    );
  }

  // Needs review filter
  if (criteria.needsReview !== undefined) {
    const value = criteria.needsReview ? "true" : "false";
    conditions.push(
      `properties has { key='para_needs_review' and value='${value}' }`
    );
  }

  // Project name filter
  if (criteria.projectName) {
    conditions.push(
      `properties has { key='para_project_name' and value contains '${criteria.projectName}' }`
    );
  }

  // Date range filter (use modifiedTime)
  if (criteria.dateRange) {
    if (criteria.dateRange.start) {
      conditions.push(`modifiedTime >= '${criteria.dateRange.start}'`);
    }
    if (criteria.dateRange.end) {
      conditions.push(`modifiedTime <= '${criteria.dateRange.end}'`);
    }
  }

  // Not trashed
  conditions.push("trashed=false");

  return conditions.join(" and ");
}

/**
 * Search files by PARA criteria
 */
export async function searchByPARA(
  auth: OAuth2Client,
  criteria: PARASearchCriteria
): Promise<FileInfo[]> {
  const drive = google.drive({ version: "v3", auth });
  const query = buildSearchQuery(criteria);
  const maxResults = criteria.maxResults || 100;

  try {
    const response = await drive.files.list({
      q: query,
      pageSize: maxResults,
      fields:
        "files(id, name, mimeType, createdTime, modifiedTime, webViewLink, properties, parents)",
      orderBy: "modifiedTime desc",
    });

    const files = response.data.files || [];

    return files.map((file) => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      createdTime: file.createdTime!,
      modifiedTime: file.modifiedTime!,
      webViewLink: file.webViewLink,
      folderId: file.parents?.[0],
    }));
  } catch (error) {
    console.error("Failed to search by PARA criteria:", error);
    throw new Error(
      `PARA search failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get files without PARA categorization
 */
export async function getUncategorizedFiles(
  auth: OAuth2Client,
  maxResults: number = 100
): Promise<FileInfo[]> {
  const drive = google.drive({ version: "v3", auth });

  try {
    // Query for files without para_category property
    const query =
      "not properties has { key='para_category' } and trashed=false and mimeType != 'application/vnd.google-apps.folder'";

    const response = await drive.files.list({
      q: query,
      pageSize: maxResults,
      fields:
        "files(id, name, mimeType, createdTime, modifiedTime, webViewLink, parents)",
      orderBy: "modifiedTime desc",
    });

    const files = response.data.files || [];

    return files.map((file) => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      createdTime: file.createdTime!,
      modifiedTime: file.modifiedTime!,
      webViewLink: file.webViewLink,
      folderId: file.parents?.[0],
    }));
  } catch (error) {
    console.error("Failed to get uncategorized files:", error);
    throw new Error(
      `Failed to get uncategorized files: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get files needing review
 */
export async function getFilesNeedingReview(
  auth: OAuth2Client,
  maxResults: number = 100
): Promise<FileInfo[]> {
  return searchByPARA(auth, {
    needsReview: true,
    maxResults,
  });
}

/**
 * Mark file as needing review
 */
export async function markNeedsReview(
  auth: OAuth2Client,
  fileId: string,
  needsReview: boolean = true
): Promise<void> {
  await updateFileMetadata(auth, fileId, {
    para_needs_review: needsReview ? "true" : "false",
    para_reviewed_date: new Date().toISOString(),
  } as Partial<PARAMetadata>);
}

/**
 * Update project status
 */
export async function updateProjectStatus(
  auth: OAuth2Client,
  fileId: string,
  status: "active" | "on-hold" | "completed",
  completionDate?: string
): Promise<void> {
  const metadata: Partial<PARAMetadata> = {
    para_project_status: status,
  } as Partial<PARAMetadata>;

  if (status === "completed") {
    metadata.para_archive_date = completionDate || new Date().toISOString();
    metadata.para_archive_reason = "Project completed";
  }

  await updateFileMetadata(auth, fileId, metadata);
}

/**
 * Get files by folder and check if they have PARA metadata
 */
export async function getFilesInFolder(
  auth: OAuth2Client,
  folderId: string,
  includeMetadata: boolean = true
): Promise<Array<FileInfo & { hasParaMetadata?: boolean }>> {
  const drive = google.drive({ version: "v3", auth });

  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'`,
      fields: includeMetadata
        ? "files(id, name, mimeType, createdTime, modifiedTime, webViewLink, properties, parents)"
        : "files(id, name, mimeType, createdTime, modifiedTime, webViewLink, parents)",
      pageSize: 1000,
    });

    const files = response.data.files || [];

    return files.map((file) => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      createdTime: file.createdTime!,
      modifiedTime: file.modifiedTime!,
      webViewLink: file.webViewLink,
      folderId: file.parents?.[0],
      hasParaMetadata: includeMetadata
        ? file.properties?.para_category !== undefined
        : undefined,
    }));
  } catch (error) {
    console.error(`Failed to get files in folder ${folderId}:`, error);
    throw new Error(
      `Failed to get files: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Common search presets
 */
export const SEARCH_PRESETS = {
  highPriorityProjects: {
    category: "PROJECT" as const,
    actionability: "high" as const,
  },

  staleProjects: {
    category: "PROJECT" as const,
    dateRange: {
      end: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },

  recentResources: {
    category: "RESOURCE" as const,
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },

  needsReview: {
    needsReview: true,
  },

  govconProjects: {
    category: "PROJECT" as const,
    domain: "govcon" as const,
  },

  internationalProjects: {
    category: "PROJECT" as const,
    domain: "international" as const,
  },

  cybersecProjects: {
    category: "PROJECT" as const,
    domain: "cybersec" as const,
  },
};
