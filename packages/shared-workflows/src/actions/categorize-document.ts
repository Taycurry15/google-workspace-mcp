/**
 * Categorize Document Action
 *
 * Workflow action for categorizing documents using LLM orchestrator:
 * - Extract document content
 * - Analyze using LLM orchestrator
 * - Determine document type, phase, keywords
 * - Return categorization with confidence score
 *
 * Phase 5 Implementation
 */

import type { ExecutionContext } from "../types/workflows.js";
import { google } from "googleapis";
import { LLMOrchestrator } from "@gw-mcp/shared-llm";

/**
 * Categorize Document Action Handler
 */
export async function categorizeDocumentAction(
  auth: any,
  config: any,
  context: ExecutionContext
): Promise<any> {
  if (!config.fileId) {
    throw new Error("fileId is required for categorize_document action");
  }

  const drive = google.drive({ version: "v3", auth });

  // Get file metadata
  const file = await drive.files.get({
    fileId: config.fileId,
    fields: "id,name,mimeType,description",
  });

  const fileName = file.data.name || "Unknown";
  const mimeType = file.data.mimeType || "";

  // Extract document content
  let content = "";

  try {
    if (mimeType === "application/vnd.google-apps.document") {
      // Google Doc - export as plain text
      const response = await drive.files.export({
        fileId: config.fileId,
        mimeType: "text/plain",
      });
      content = response.data as string;
    } else if (
      mimeType === "text/plain" ||
      mimeType.startsWith("text/")
    ) {
      // Plain text file
      const response = await drive.files.get({
        fileId: config.fileId,
        alt: "media",
      });
      content = response.data as string;
    } else {
      // For other types, use file name and description
      content = `File: ${fileName}\nDescription: ${file.data.description || ""}`;
    }
  } catch (error) {
    console.error(`Error extracting content from ${fileName}:`, error);
    // Use metadata only
    content = `File: ${fileName}\nType: ${mimeType}`;
  }

  // Limit content length for LLM (first 10000 chars)
  const contentPreview = content.substring(0, 10000);

  // Call LLM orchestrator for categorization
  const orchestrator = new LLMOrchestrator();
  const response = await orchestrator.generate({
    taskType: "classification",
    priority: "normal",
    messages: [
      {
        role: "system",
        content:
          "You are a document classification expert for project management. Analyze documents and categorize them according to PMI project management framework phases and document types.",
      },
      {
        role: "user",
        content: `Analyze this document and categorize it for project management purposes.

Document Name: ${fileName}
Content Preview:
${contentPreview}

Provide the following in JSON format:
{
  "documentType": "charter|plan|report|deliverable|meeting_notes|template|other",
  "phase": "initiation|planning|execution|monitoring|closing|support",
  "category": "brief category description",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "suggestedFolder": "suggested folder name based on PMI structure",
  "confidence": 0.85,
  "reasoning": "brief explanation of categorization"
}`,
      },
    ],
  });

  // Parse LLM response
  let categorization;
  try {
    // Extract JSON from response (handles markdown code blocks)
    const jsonMatch = response.outputText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      categorization = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found in LLM response");
    }
  } catch (error) {
    console.error("Error parsing LLM response:", error);
    // Fallback categorization
    categorization = {
      documentType: "other",
      phase: "execution",
      category: "Uncategorized",
      keywords: [fileName],
      suggestedFolder: "03-Execution",
      confidence: 0.3,
      reasoning: "Failed to parse LLM response",
    };
  }

  return {
    fileId: config.fileId,
    fileName,
    categorization,
    llmProvider: response.provider,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Action metadata for registration
 */
export const actionMetadata = {
  type: "categorize_document",
  name: "Categorize Document",
  description:
    "Categorize document using LLM to determine type, phase, and keywords",
  handler: categorizeDocumentAction,
};
