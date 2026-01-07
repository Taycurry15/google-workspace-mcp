/**
 * Document Version Control
 *
 * Tracks document versions and provides version history.
 */

import type { sheets_v4 } from "googleapis";
import type { DocumentVersion } from "../types/document.js";
import {
  appendRows,
  readSheetRange,
  generateNextId,
} from "../utils/sheetHelpers.js";

const VERSION_HISTORY_SHEET = "Version History";

/**
 * Create a new version record
 */
export async function createVersion(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  docId: string,
  driveFileId: string,
  version: string,
  createdBy: string,
  comment: string,
  major: boolean = false,
  fileSize?: number,
  checksum?: string
): Promise<string> {
  try {
    const versionId = await generateNextId(
      sheets,
      spreadsheetId,
      VERSION_HISTORY_SHEET,
      "Version ID",
      "VER"
    );

    // Parse version into major.minor.patch
    const [majorNum, minorNum, patchNum] = version
      .split(".")
      .map((n) => parseInt(n) || 0);

    const row = [
      versionId,
      docId,
      driveFileId,
      version,
      majorNum,
      minorNum || 0,
      patchNum || 0,
      new Date().toISOString(),
      createdBy,
      comment,
      major ? "major" : "minor",
      fileSize || "",
      checksum || "",
    ];

    await appendRows(
      sheets,
      spreadsheetId,
      `${VERSION_HISTORY_SHEET}!A:M`,
      [row]
    );

    return versionId;
  } catch (error) {
    throw new Error(
      `Failed to create version: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get version history for a document
 */
export async function getVersionHistory(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  docId: string
): Promise<DocumentVersion[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${VERSION_HISTORY_SHEET}!A:M`
    );

    if (data.length <= 1) {
      return [];
    }

    const versions: DocumentVersion[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === docId) {
        versions.push(parseVersionRow(row));
      }
    }

    // Sort by version descending
    versions.sort((a, b) => {
      if (a.major !== b.major) return b.major - a.major;
      if (a.minor !== b.minor) return b.minor - a.minor;
      return b.patch - a.patch;
    });

    return versions;
  } catch (error) {
    throw new Error(
      `Failed to get version history: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get latest version for a document
 */
export async function getLatestVersion(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  docId: string
): Promise<DocumentVersion | null> {
  try {
    const versions = await getVersionHistory(sheets, spreadsheetId, docId);
    return versions.length > 0 ? versions[0] : null;
  } catch (error) {
    throw new Error(
      `Failed to get latest version: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Calculate next version number
 */
export function calculateNextVersion(
  currentVersion: string,
  changeType: "major" | "minor" | "patch"
): string {
  const [major, minor, patch] = currentVersion
    .split(".")
    .map((n) => parseInt(n) || 0);

  switch (changeType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * Parse version row
 */
function parseVersionRow(row: any[]): DocumentVersion {
  return {
    versionId: row[0] || "",
    docId: row[1] || "",
    driveFileId: row[2] || "",
    version: row[3] || "1.0.0",
    major: parseInt(row[4]) || 1,
    minor: parseInt(row[5]) || 0,
    patch: parseInt(row[6]) || 0,
    createdDate: row[7] ? new Date(row[7]) : new Date(),
    createdBy: row[8] || "",
    comment: row[9] || "",
    changeType: (row[10] as "major" | "minor") || "minor",
    changeLog: row[9] || "",
    fileSize: row[11] ? parseInt(row[11]) : 0,
    checksum: row[12] || undefined,
  };
}
