/**
 * Proposal Content Extraction
 * Extracts content from proposal documents for PMO analysis
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { ExtractedContent } from "../types/para.js";

// Maximum characters for proposal content (longer than regular files)
const MAX_PROPOSAL_CHARS = 10000;

/**
 * Extract content from Google Docs with table support
 */
async function extractFromProposalDoc(
  auth: OAuth2Client,
  fileId: string
): Promise<{ text: string; tables: string[] }> {
  const docs = google.docs({ version: "v1", auth });

  try {
    const doc = await docs.documents.get({ documentId: fileId });

    if (!doc.data.body || !doc.data.body.content) {
      return { text: "", tables: [] };
    }

    let text = "";
    const tables: string[] = [];

    for (const element of doc.data.body.content) {
      // Extract paragraph text
      if (element.paragraph) {
        for (const paragraphElement of element.paragraph.elements || []) {
          if (paragraphElement.textRun) {
            text += paragraphElement.textRun.content || "";
          }
        }
      }

      // Extract table content
      if (element.table) {
        let tableText = "\n[TABLE]\n";

        for (const row of element.table.tableRows || []) {
          const rowTexts: string[] = [];

          for (const cell of row.tableCells || []) {
            let cellText = "";

            for (const cellElement of cell.content || []) {
              if (cellElement.paragraph) {
                for (const paragraphElement of cellElement.paragraph
                  .elements || []) {
                  if (paragraphElement.textRun) {
                    cellText += paragraphElement.textRun.content || "";
                  }
                }
              }
            }

            rowTexts.push(cellText.trim());
          }

          tableText += rowTexts.join(" | ") + "\n";
        }

        tableText += "[/TABLE]\n";
        tables.push(tableText);
        text += tableText;
      }
    }

    return { text: text.trim(), tables };
  } catch (error) {
    console.error(`Failed to extract from proposal Doc ${fileId}:`, error);
    return { text: "", tables: [] };
  }
}

/**
 * Extract content from Word document (.docx)
 * Uses Drive export to text format
 */
async function extractFromWordDoc(
  auth: OAuth2Client,
  fileId: string
): Promise<string> {
  const drive = google.drive({ version: "v3", auth });

  try {
    // Export Word doc as plain text
    const response = await drive.files.export(
      {
        fileId,
        mimeType: "text/plain",
      },
      { responseType: "text" }
    );

    return (response.data as string) || "";
  } catch (error) {
    console.error(`Failed to extract from Word doc ${fileId}:`, error);

    // Fallback: try to get as PDF then extract metadata
    try {
      const file = await drive.files.get({
        fileId,
        fields: "name, description",
      });

      return `Word Document: ${file.data.name}\n${file.data.description || "No description"}`;
    } catch (fallbackError) {
      return "";
    }
  }
}

/**
 * Extract content from a proposal document
 * Supports Google Docs and Word files
 * @param auth OAuth2 client
 * @param fileId Google Drive file ID
 * @returns Extracted content with metadata
 */
export async function extractProposalContent(
  auth: OAuth2Client,
  fileId: string
): Promise<ExtractedContent> {
  const drive = google.drive({ version: "v3", auth });

  // Get file metadata
  const file = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, createdTime, modifiedTime, parents, description",
  });

  const fileName = file.data.name!;
  const mimeType = file.data.mimeType!;
  const createdTime = file.data.createdTime!;
  const modifiedTime = file.data.modifiedTime!;
  const description = file.data.description || "";

  // Extract content based on MIME type
  let content = "";
  let hasTables = false;

  try {
    if (mimeType === "application/vnd.google-apps.document") {
      // Google Docs
      const { text, tables } = await extractFromProposalDoc(auth, fileId);
      content = text;
      hasTables = tables.length > 0;
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      // Word document
      content = await extractFromWordDoc(auth, fileId);
    } else if (mimeType.startsWith("text/")) {
      // Plain text
      const response = await drive.files.get(
        {
          fileId,
          alt: "media",
        },
        { responseType: "text" }
      );
      content = (response.data as string) || "";
    } else {
      // Unsupported format
      throw new Error(`Unsupported document type: ${mimeType}`);
    }
  } catch (error) {
    console.error(`Failed to extract proposal content from ${fileName}:`, error);
    throw new Error(
      `Could not extract content from ${fileName}. Supported formats: Google Docs, Word (.docx), plain text.`
    );
  }

  if (!content || content.trim().length === 0) {
    throw new Error(
      `Proposal document ${fileName} appears to be empty or unreadable.`
    );
  }

  // Include description if available
  if (description) {
    content = `[Description: ${description}]\n\n${content}`;
  }

  // Truncate to max length but preserve important context
  const contentPreview =
    content.length > MAX_PROPOSAL_CHARS
      ? content.substring(0, MAX_PROPOSAL_CHARS) +
        "\n\n[Content truncated. Full document analyzed.]"
      : content;

  return {
    fileId,
    fileName,
    mimeType,
    contentPreview,
    metadata: {
      createdTime,
      modifiedTime,
      folderPath: "Proposals", // Generic path for proposals
      domain: undefined,
    },
  };
}

/**
 * Check if a file is a supported proposal document
 */
export function isSupportedProposal(mimeType: string): boolean {
  const supportedTypes = [
    "application/vnd.google-apps.document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/markdown",
  ];

  return supportedTypes.includes(mimeType);
}

/**
 * Get document type label
 */
export function getProposalTypeLabel(mimeType: string): string {
  switch (mimeType) {
    case "application/vnd.google-apps.document":
      return "Google Doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "Word Document (.docx)";
    case "application/msword":
      return "Word Document (.doc)";
    case "text/plain":
      return "Plain Text";
    case "text/markdown":
      return "Markdown";
    default:
      return "Unknown";
  }
}
