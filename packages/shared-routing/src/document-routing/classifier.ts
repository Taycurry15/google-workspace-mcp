/**
 * Document Classifier
 *
 * AI-powered document classification using LLM
 */

import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { LLMRouter } from "@gw-mcp/shared-llm";
import type {
  DocumentClassification,
  DocumentType,
  DocumentMetadata,
  TargetServer,
} from "./types.js";
import { ROUTING_RULES } from "./types.js";

/**
 * Document classifier using LLM
 *
 * @example
 * const classifier = new DocumentClassifier(llmRouter);
 * const classification = await classifier.classify(auth, driveFileId);
 */
export class DocumentClassifier {
  private llmRouter: LLMRouter;

  constructor(llmRouter: LLMRouter) {
    this.llmRouter = llmRouter;
  }

  /**
   * Classify a document by its Drive file ID
   */
  async classify(
    auth: OAuth2Client,
    fileId: string
  ): Promise<DocumentClassification> {
    // Get document content
    const content = await this.getDocumentContent(auth, fileId);

    // Get document metadata from Drive
    const driveMetadata = await this.getDriveMetadata(auth, fileId);

    // Classify using LLM
    const classification = await this.classifyWithLLM(
      content,
      driveMetadata.name,
      driveMetadata.mimeType
    );

    return classification;
  }

  /**
   * Classify document content using LLM
   */
  private async classifyWithLLM(
    content: string,
    filename: string,
    mimeType: string
  ): Promise<DocumentClassification> {
    const prompt = this.buildClassificationPrompt(content, filename, mimeType);

    const response = await this.llmRouter.complete({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      config: {
        temperature: 0.1, // Low temperature for consistent classification
        maxTokens: 1000,
      },
      metadata: {
        task: "document_classification",
        documentName: filename,
      },
    });

    // Parse LLM response
    try {
      const parsed = JSON.parse(response.content);

      // Get routing config
      const config = ROUTING_RULES[parsed.documentType as DocumentType] || ROUTING_RULES.other;

      return {
        documentType: parsed.documentType,
        confidence: parsed.confidence,
        targetServers: config.targetServers,
        suggestedFolder: config.folderTemplate,
        metadata: parsed.metadata || {},
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error("[DocumentClassifier] Failed to parse LLM response:", error);

      // Fallback classification
      return {
        documentType: "other",
        confidence: 0.1,
        targetServers: [],
        suggestedFolder: "Documents/Unclassified",
        metadata: {},
        reasoning: "Failed to classify document",
      };
    }
  }

  /**
   * Build classification prompt for LLM
   */
  private buildClassificationPrompt(
    content: string,
    filename: string,
    mimeType: string
  ): string {
    return `You are a document classification AI for a Program Management Office (PMO) system.

Analyze the following document and classify it into one of these types:
- program_charter: Program charter documents
- proposal: Proposal documents for new work
- contract: Contract agreements with vendors
- invoice: Vendor invoices for payment
- deliverable: Deliverable submissions (reports, designs, code, etc.)
- financial_report: Financial reports (budget, EVM, cash flow)
- risk_assessment: Risk assessment documents
- meeting_minutes: Meeting minutes and notes
- status_report: Status reports (weekly, monthly)
- change_request: Change request documents
- lesson_learned: Lessons learned documents
- quality_report: Quality assurance reports
- vendor_evaluation: Vendor performance evaluations
- budget_document: Budget planning documents
- technical_document: Technical specifications and documentation
- other: Any other document type

**Document Information:**
Filename: ${filename}
MIME Type: ${mimeType}

**Document Content (first 3000 characters):**
${content.substring(0, 3000)}

**Task:**
1. Classify the document type
2. Extract relevant metadata (programId, deliverableId, contractId, vendorId, dates, entities, etc.)
3. Provide confidence score (0-1)
4. Explain your reasoning

**Important:** Look for ID patterns like:
- PROG-### for Program IDs
- D-### for Deliverable IDs
- CONT-### for Contract IDs
- VEND-### for Vendor IDs
- M-### for Milestone IDs
- CR-### for Change Request IDs
- R-### for Risk IDs

**Response Format (JSON only, no markdown):**
{
  "documentType": "program_charter",
  "confidence": 0.95,
  "metadata": {
    "programId": "PROG-001",
    "title": "Document title",
    "documentDate": "2024-01-15",
    "author": "John Doe",
    "keywords": ["keyword1", "keyword2"],
    "entities": [
      {"type": "program", "value": "PROG-001", "confidence": 0.99}
    ]
  },
  "reasoning": "This document is classified as a program charter because..."
}`;
  }

  /**
   * Get document content from Google Drive
   */
  private async getDocumentContent(
    auth: OAuth2Client,
    fileId: string
  ): Promise<string> {
    const drive = google.drive({ version: "v3", auth });

    try {
      // Get file metadata to determine type
      const metadata = await drive.files.get({
        fileId,
        fields: "mimeType,name",
      });

      const mimeType = metadata.data.mimeType || "";

      // Handle Google Docs (export as plain text)
      if (mimeType === "application/vnd.google-apps.document") {
        const response = await drive.files.export({
          fileId,
          mimeType: "text/plain",
        });
        return response.data as string;
      }

      // Handle Google Sheets (export as CSV)
      if (mimeType === "application/vnd.google-apps.spreadsheet") {
        const response = await drive.files.export({
          fileId,
          mimeType: "text/csv",
        });
        return response.data as string;
      }

      // Handle PDF and other binary formats
      if (mimeType === "application/pdf") {
        // For PDFs, we'll just return metadata for now
        // Full PDF text extraction would require additional libraries
        return `PDF Document: ${metadata.data.name}`;
      }

      // For plain text files
      if (mimeType.startsWith("text/")) {
        const response = await drive.files.get({
          fileId,
          alt: "media",
        });
        return response.data as string;
      }

      // Fallback: return filename
      return `Document: ${metadata.data.name}`;
    } catch (error) {
      console.error("[DocumentClassifier] Failed to get document content:", error);
      throw error;
    }
  }

  /**
   * Get Drive file metadata
   */
  private async getDriveMetadata(
    auth: OAuth2Client,
    fileId: string
  ): Promise<{ name: string; mimeType: string }> {
    const drive = google.drive({ version: "v3", auth });

    const response = await drive.files.get({
      fileId,
      fields: "name,mimeType",
    });

    return {
      name: response.data.name || "Unknown",
      mimeType: response.data.mimeType || "application/octet-stream",
    };
  }
}

/**
 * Create a document classifier instance
 */
export function createDocumentClassifier(llmRouter: LLMRouter): DocumentClassifier {
  return new DocumentClassifier(llmRouter);
}
