/**
 * PARA Auto-Archival System
 * Automatically archives completed projects
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import {
  ArchiveCandidate,
  ArchiveResult,
  FileInfo,
} from "../types/para.js";
import { updateFileMetadata, getFileMetadata } from "./metadata.js";
import { ensureArchiveFolder } from "./setup.js";

/**
 * Find archival candidates (completed or stale projects)
 */
export async function findArchivalCandidates(
  auth: OAuth2Client,
  options: {
    staleDays?: number;
    checkProposalTracker?: boolean;
  } = {}
): Promise<ArchiveCandidate[]> {
  const { staleDays = 90, checkProposalTracker = true } = options;
  const candidates: ArchiveCandidate[] = [];
  const drive = google.drive({ version: "v3", auth });

  // Find completed projects
  const completedQuery =
    "properties has { key='para_category' and value='PROJECT' } and properties has { key='para_project_status' and value='completed' } and trashed=false";

  const completedResponse = await drive.files.list({
    q: completedQuery,
    pageSize: 100,
    fields: "files(id, name, properties, modifiedTime)",
  });

  for (const file of completedResponse.data.files || []) {
    candidates.push({
      fileId: file.id!,
      fileName: file.name!,
      reason: "Project marked as completed",
      confidence: 1.0,
      projectName: file.properties?.para_project_name,
      completionDate: file.properties?.para_archive_date || file.modifiedTime!,
      needsConfirmation: false,
    });
  }

  // Find stale projects (no modifications in X days)
  const staleDate = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
  const staleQuery = `properties has { key='para_category' and value='PROJECT' } and properties has { key='para_project_status' and value='active' } and modifiedTime < '${staleDate.toISOString()}' and trashed=false`;

  const staleResponse = await drive.files.list({
    q: staleQuery,
    pageSize: 100,
    fields: "files(id, name, properties, modifiedTime)",
  });

  for (const file of staleResponse.data.files || []) {
    const daysSinceModified = Math.floor(
      (Date.now() - new Date(file.modifiedTime!).getTime()) /
        (24 * 60 * 60 * 1000)
    );

    candidates.push({
      fileId: file.id!,
      fileName: file.name!,
      reason: `No activity in ${daysSinceModified} days`,
      confidence: 0.7,
      projectName: file.properties?.para_project_name,
      needsConfirmation: true,
    });
  }

  return candidates;
}

/**
 * Archive a project
 */
export async function archiveProject(
  auth: OAuth2Client,
  fileId: string,
  options: {
    reason?: string;
    completionDate?: string;
    moveFile?: boolean;
  } = {}
): Promise<ArchiveResult> {
  const {
    reason = "Project archived",
    completionDate = new Date().toISOString(),
    moveFile = false,
  } = options;

  const drive = google.drive({ version: "v3", auth });

  // Get file info
  const file = await drive.files.get({
    fileId,
    fields: "id, name, properties, parents, webViewLink",
  });

  const fileName = file.data.name!;
  const projectName = file.data.properties?.para_project_name || fileName;

  // Determine archive folder (year and quarter)
  const archiveDate = new Date(completionDate);
  const year = archiveDate.getFullYear();
  const quarter = Math.floor(archiveDate.getMonth() / 3) + 1;

  const quarterFolderId = await ensureArchiveFolder(auth, year, quarter);

  // Create project folder in archive
  const archiveProjectFolder = await drive.files.create({
    requestBody: {
      name: projectName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [quarterFolderId],
    },
    fields: "id, webViewLink",
  });

  const archiveFolderId = archiveProjectFolder.data.id!;

  // Create archive metadata file
  const metadataContent = `Project: ${projectName}
Archived: ${completionDate}
Reason: ${reason}
Original Location: ${file.data.parents?.[0] || "Unknown"}
Archive Folder: ${year}-Q${quarter}
File Link: ${file.data.webViewLink || "N/A"}

This project has been archived and is no longer active.
`;

  const metadataFile = await drive.files.create({
    requestBody: {
      name: "_ARCHIVE_INFO.txt",
      mimeType: "text/plain",
      parents: [archiveFolderId],
    },
    media: {
      mimeType: "text/plain",
      body: metadataContent,
    },
    fields: "id",
  });

  // Move or create shortcut
  if (moveFile) {
    // Move the actual file
    await drive.files.update({
      fileId,
      addParents: archiveFolderId,
      removeParents: file.data.parents?.join(","),
      fields: "id, parents",
    });
  } else {
    // Create shortcut
    await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: "application/vnd.google-apps.shortcut",
        shortcutDetails: {
          targetId: fileId,
        },
        parents: [archiveFolderId],
      },
      fields: "id",
    });
  }

  // Update file metadata
  await updateFileMetadata(auth, fileId, {
    para_category: "ARCHIVE",
    para_archive_date: completionDate,
    para_archive_reason: reason,
    para_project_status: "completed",
  } as any);

  console.log(`✓ Archived: ${projectName} to ${year}-Q${quarter}`);

  return {
    fileId,
    fileName,
    archiveFolderId,
    archiveFolderPath: `PARA System/4-Archives/${year}/Q${quarter}/${projectName}`,
    archiveDate: completionDate,
    metadataFileId: metadataFile.data.id || undefined,
  };
}

/**
 * Batch archive multiple projects
 */
export async function batchArchiveProjects(
  auth: OAuth2Client,
  fileIds: string[],
  reason?: string
): Promise<ArchiveResult[]> {
  const results: ArchiveResult[] = [];

  for (const fileId of fileIds) {
    try {
      const result = await archiveProject(auth, fileId, { reason });
      results.push(result);
    } catch (error) {
      console.error(`Failed to archive ${fileId}:`, error);
    }
  }

  return results;
}

/**
 * Auto-archive based on proposal tracker
 */
export async function autoArchiveFromProposalTracker(
  auth: OAuth2Client,
  trackerSpreadsheetId: string
): Promise<ArchiveResult[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const results: ArchiveResult[] = [];

  try {
    // Check Won Deals sheet
    const wonData = await sheets.spreadsheets.values.get({
      spreadsheetId: trackerSpreadsheetId,
      range: "Won Deals!A2:E",
    });

    for (const row of wonData.data.values || []) {
      const [name, client, closeDate] = row;
      // Find corresponding file and archive
      // This would require more sophisticated matching logic
      console.log(`Found won deal: ${name} - ${client}`);
    }

    // Check Lost Deals sheet
    const lostData = await sheets.spreadsheets.values.get({
      spreadsheetId: trackerSpreadsheetId,
      range: "Lost Deals!A2:E",
    });

    for (const row of lostData.data.values || []) {
      const [name, client, closeDate] = row;
      console.log(`Found lost deal: ${name} - ${client}`);
    }
  } catch (error) {
    console.error("Failed to check proposal tracker:", error);
  }

  return results;
}

/**
 * Get archive statistics
 */
export async function getArchiveStats(
  auth: OAuth2Client
): Promise<{
  totalArchived: number;
  archivedThisYear: number;
  archivedThisMonth: number;
  byReason: Record<string, number>;
}> {
  const drive = google.drive({ version: "v3", auth });

  const query =
    "properties has { key='para_category' and value='ARCHIVE' } and trashed=false";

  const response = await drive.files.list({
    q: query,
    pageSize: 1000,
    fields: "files(id, properties)",
  });

  const files = response.data.files || [];

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();

  let archivedThisYear = 0;
  let archivedThisMonth = 0;
  const byReason: Record<string, number> = {};

  for (const file of files) {
    const archiveDate = file.properties?.para_archive_date;
    const reason = file.properties?.para_archive_reason || "Unknown";

    if (archiveDate) {
      const date = new Date(archiveDate);
      if (date.getFullYear() === thisYear) {
        archivedThisYear++;
        if (date.getMonth() === thisMonth) {
          archivedThisMonth++;
        }
      }
    }

    byReason[reason] = (byReason[reason] || 0) + 1;
  }

  return {
    totalArchived: files.length,
    archivedThisYear,
    archivedThisMonth,
    byReason,
  };
}
