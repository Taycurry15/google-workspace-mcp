/**
 * Content Extraction for PARA Categorization
 * Extracts content from different file types for AI analysis
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { ExtractedContent, Domain } from "../types/para.js";

// Maximum characters for content preview
const MAX_PREVIEW_CHARS = 2000;

/**
 * Determine domain from folder path
 */
function determineDomainFromPath(folderPath: string): Domain | undefined {
  const lowerPath = folderPath.toLowerCase();

  if (lowerPath.includes("govcon")) return "govcon";
  if (lowerPath.includes("international")) return "international";
  if (lowerPath.includes("cybersec") || lowerPath.includes("cyber"))
    return "cybersec";
  if (lowerPath.includes("business")) return "business";

  return undefined;
}

/**
 * Get folder path for a file
 */
async function getFolderPath(
  drive: any,
  folderId: string
): Promise<string> {
  try {
    const folder = await drive.files.get({
      fileId: folderId,
      fields: "name, parents",
    });

    let path = folder.data.name;

    // Recursively get parent folders (max 5 levels)
    let parentId = folder.data.parents?.[0];
    let depth = 0;

    while (parentId && depth < 5) {
      const parent = await drive.files.get({
        fileId: parentId,
        fields: "name, parents",
      });

      path = `${parent.data.name}/${path}`;
      parentId = parent.data.parents?.[0];
      depth++;
    }

    return path;
  } catch (error) {
    console.error(`Failed to get folder path for ${folderId}:`, error);
    return "Unknown";
  }
}

/**
 * Extract content from Google Docs
 */
async function extractFromDoc(
  auth: OAuth2Client,
  fileId: string
): Promise<string> {
  const docs = google.docs({ version: "v1", auth });

  try {
    const doc = await docs.documents.get({ documentId: fileId });

    if (!doc.data.body || !doc.data.body.content) {
      return "";
    }

    let text = "";

    for (const element of doc.data.body.content) {
      if (element.paragraph) {
        for (const paragraphElement of element.paragraph.elements || []) {
          if (paragraphElement.textRun) {
            text += paragraphElement.textRun.content || "";
          }
        }
      }
    }

    return text.trim();
  } catch (error) {
    console.error(`Failed to extract from Doc ${fileId}:`, error);
    return "";
  }
}

/**
 * Extract content from Google Sheets
 */
async function extractFromSheet(
  auth: OAuth2Client,
  fileId: string
): Promise<string> {
  const sheets = google.sheets({ version: "v4", auth });

  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: fileId,
      fields: "sheets.properties.title",
    });

    if (!spreadsheet.data.sheets || spreadsheet.data.sheets.length === 0) {
      return "";
    }

    // Get first sheet
    const firstSheetTitle = spreadsheet.data.sheets[0].properties?.title || "Sheet1";

    // Read first 20 rows
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId: fileId,
      range: `${firstSheetTitle}!A1:Z20`,
    });

    if (!data.data.values || data.data.values.length === 0) {
      return "";
    }

    // Convert to text
    let text = `Spreadsheet: ${firstSheetTitle}\n\n`;

    for (const row of data.data.values) {
      text += row.join("\t") + "\n";
    }

    return text;
  } catch (error) {
    console.error(`Failed to extract from Sheet ${fileId}:`, error);
    return "";
  }
}

/**
 * Extract content from plain text file
 */
async function extractFromTextFile(
  auth: OAuth2Client,
  fileId: string
): Promise<string> {
  const drive = google.drive({ version: "v3", auth });

  try {
    const response = await drive.files.get(
      {
        fileId,
        alt: "media",
      },
      { responseType: "text" }
    );

    return (response.data as string) || "";
  } catch (error) {
    console.error(`Failed to extract from text file ${fileId}:`, error);
    return "";
  }
}

/**
 * Extract metadata-based description (fallback for binary files)
 */
function extractFromMetadata(fileName: string, mimeType: string): string {
  let description = `File: ${fileName}\n`;
  description += `Type: ${mimeType}\n\n`;

  // Add context based on file extension
  const ext = fileName.toLowerCase().split(".").pop();

  switch (ext) {
    case "pdf":
      description += "This appears to be a PDF document.";
      break;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      description += "This is an image file.";
      break;
    case "zip":
    case "tar":
    case "gz":
      description += "This is a compressed archive.";
      break;
    case "xlsx":
    case "xls":
      description += "This is an Excel spreadsheet.";
      break;
    case "docx":
    case "doc":
      description += "This is a Word document.";
      break;
    case "pptx":
    case "ppt":
      description += "This is a PowerPoint presentation.";
      break;
    default:
      description += `File type: ${mimeType}`;
  }

  return description;
}

/**
 * Extract content from a file for AI categorization
 */
export async function extractContent(
  auth: OAuth2Client,
  fileId: string
): Promise<ExtractedContent> {
  const drive = google.drive({ version: "v3", auth });

  // Get file metadata
  const file = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, createdTime, modifiedTime, parents",
  });

  const fileName = file.data.name!;
  const mimeType = file.data.mimeType!;
  const createdTime = file.data.createdTime!;
  const modifiedTime = file.data.modifiedTime!;
  const folderId = file.data.parents?.[0];

  // Get folder path and determine domain
  let folderPath = "Unknown";
  let domain: Domain | undefined;

  if (folderId) {
    folderPath = await getFolderPath(drive, folderId);
    domain = determineDomainFromPath(folderPath);
  }

  // Extract content based on MIME type
  let content = "";

  try {
    if (mimeType === "application/vnd.google-apps.document") {
      content = await extractFromDoc(auth, fileId);
    } else if (mimeType === "application/vnd.google-apps.spreadsheet") {
      content = await extractFromSheet(auth, fileId);
    } else if (mimeType.startsWith("text/")) {
      content = await extractFromTextFile(auth, fileId);
    } else {
      // Fallback: use metadata only
      content = extractFromMetadata(fileName, mimeType);
    }
  } catch (error) {
    console.error(`Failed to extract content from ${fileName}:`, error);
    content = extractFromMetadata(fileName, mimeType);
  }

  // Truncate to preview length
  const contentPreview =
    content.length > MAX_PREVIEW_CHARS
      ? content.substring(0, MAX_PREVIEW_CHARS) + "\n\n[Content truncated...]"
      : content;

  return {
    fileId,
    fileName,
    mimeType,
    contentPreview,
    metadata: {
      createdTime,
      modifiedTime,
      folderPath,
      domain,
    },
  };
}

/**
 * Batch extract content from multiple files
 */
export async function batchExtractContent(
  auth: OAuth2Client,
  fileIds: string[],
  onProgress?: (processed: number, total: number) => void
): Promise<Map<string, ExtractedContent>> {
  const results = new Map<string, ExtractedContent>();
  const total = fileIds.length;

  for (let i = 0; i < fileIds.length; i++) {
    try {
      const content = await extractContent(auth, fileIds[i]);
      results.set(fileIds[i], content);
    } catch (error) {
      console.error(`Failed to extract content from file ${fileIds[i]}:`, error);
      // Skip failed extractions
    }

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return results;
}

/**
 * Check if a file type is supported for content extraction
 */
export function isSupported(mimeType: string): boolean {
  const supportedTypes = [
    "application/vnd.google-apps.document",
    "application/vnd.google-apps.spreadsheet",
    "text/plain",
    "text/html",
    "text/csv",
    "text/markdown",
  ];

  return (
    supportedTypes.includes(mimeType) || mimeType.startsWith("text/")
  );
}

/**
 * Get content extraction method for a MIME type
 */
export function getExtractionMethod(mimeType: string): string {
  if (mimeType === "application/vnd.google-apps.document") {
    return "Google Docs API";
  }
  if (mimeType === "application/vnd.google-apps.spreadsheet") {
    return "Google Sheets API";
  }
  if (mimeType.startsWith("text/")) {
    return "Text file read";
  }
  return "Metadata only";
}
