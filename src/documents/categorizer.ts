/**
 * Document Categorization using LLM Orchestrator
 *
 * Intelligently categorizes documents using multi-provider LLM orchestration.
 * Routes to optimal provider (Gemini for classification, Claude for complex analysis).
 *
 * PRIORITY #1: Core intelligent routing capability
 */

import type { drive_v3 } from "googleapis";
import type {
  CategorizationResult,
  DocumentType,
  ProjectPhase,
} from "../types/document.js";
import { LLMOrchestrator } from "../utils/llm/orchestrator.js";
import { extractDocumentContent } from "../utils/driveHelpers.js";
import { getTargetFolderPath } from "./folder-structure.js";

// Create orchestrator instance
const orchestrator = new LLMOrchestrator();

/**
 * Categorize a document using LLM orchestration
 *
 * This function:
 * 1. Extracts document content from Google Drive
 * 2. Calls LLM orchestrator with classification task type
 * 3. Parses structured categorization response
 * 4. Returns categorization with confidence score
 */
export async function categorizeDocument(
  drive: drive_v3.Drive,
  fileId: string,
  fileName?: string,
  forcedType?: DocumentType
): Promise<CategorizationResult> {
  try {
    const startTime = Date.now();

    // Extract document content
    const { content, mimeType } = await extractDocumentContent(drive, fileId);

    // Truncate content if too long (max 10,000 chars for classification)
    const truncatedContent =
      content.length > 10000 ? content.substring(0, 10000) + "..." : content;

    // Build categorization prompt
    const prompt = buildCategorizationPrompt(
      truncatedContent,
      fileName,
      mimeType,
      forcedType
    );

    // Call LLM orchestrator with classification task type
    // This will prefer Gemini for cost-effective classification
    const response = await orchestrator.generate({
      taskType: "classification",
      priority: "normal",
      messages: [
        {
          role: "system",
          content:
            "You are an expert document classification system for project management. Analyze documents and provide structured categorization data in JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Parse the response
    const result = parseCategorizationResponse(response.outputText);

    // Determine suggested folder path
    const suggestedFolderPath = getTargetFolderPath(
      result.documentType,
      result.phase
    );

    const processingTimeMs = Date.now() - startTime;

    return {
      documentType: result.documentType,
      category: result.category,
      subcategory: result.subcategory,
      phase: result.phase,
      keywords: result.keywords,
      suggestedTags: result.suggestedTags,
      suggestedFolderPath,
      confidence: result.confidence,
      reasoning: result.reasoning,
      provider: response.provider,
      timestamp: new Date(),
    };
  } catch (error) {
    throw new Error(
      `Failed to categorize document: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Build categorization prompt for LLM
 */
function buildCategorizationPrompt(
  content: string,
  fileName?: string,
  mimeType?: string,
  forcedType?: DocumentType
): string {
  let prompt = `Analyze this document and provide structured categorization data.

DOCUMENT INFORMATION:
${fileName ? `File Name: ${fileName}\n` : ""}${
    mimeType ? `MIME Type: ${mimeType}\n` : ""
  }
DOCUMENT CONTENT:
${content}

---

CATEGORIZATION REQUIREMENTS:

1. **Document Type**: Classify into one of these types:
   - charter: Program or project charter documents
   - plan: Planning documents (project plans, risk plans, resource plans, etc.)
   - report: Status reports, performance reports, analytics
   - deliverable: Project deliverables (designs, specifications, final products)
   - meeting_notes: Meeting minutes, notes, agendas
   - presentation: Slide decks and presentations
   - template: Reusable document templates
   - contract: Contracts, agreements, SOWs
   - specification: Technical specifications
   - design: Design documents, diagrams
   - test_plan: Test plans and testing documents
   - training: Training materials
   - reference: Reference documentation
   - other: Other document types

${
  forcedType
    ? `NOTE: Document type has been manually specified as "${forcedType}". Use this type unless it's clearly incorrect.\n`
    : ""
}

2. **Project Phase**: Identify the project management phase:
   - initiation: Project startup, charter, business case
   - planning: Project planning, schedules, WBS, risk planning
   - execution: Active project work, deliverables, status reports
   - monitoring: Performance monitoring, quality assurance
   - closing: Project closeout, lessons learned
   - support: Templates, references, training materials

3. **Category & Subcategory**: Provide a specific category and optional subcategory

4. **Keywords**: Extract 3-7 important keywords from the document

5. **Suggested Tags**: Suggest 3-5 tags for searchability

6. **Confidence**: Rate your confidence in this categorization (0.0 to 1.0)

7. **Reasoning**: Brief explanation of why you chose this categorization

RESPOND IN THIS EXACT JSON FORMAT:
{
  "documentType": "charter",
  "category": "Project Initiation",
  "subcategory": "Program Charter",
  "phase": "initiation",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "confidence": 0.95,
  "reasoning": "Brief explanation here"
}`;

  return prompt;
}

/**
 * Parse LLM response into structured categorization result
 */
function parseCategorizationResponse(responseContent: string): {
  documentType: DocumentType;
  category: string;
  subcategory?: string;
  phase?: ProjectPhase;
  keywords: string[];
  suggestedTags: string[];
  confidence: number;
  reasoning: string;
} {
  try {
    // Try to extract JSON from response
    let jsonStr = responseContent.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    }

    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (!parsed.documentType) {
      throw new Error("Missing documentType in response");
    }

    // Ensure arrays
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords
      : [parsed.keywords || ""];
    const suggestedTags = Array.isArray(parsed.suggestedTags)
      ? parsed.suggestedTags
      : [parsed.suggestedTags || ""];

    // Ensure confidence is a number between 0 and 1
    let confidence = parseFloat(parsed.confidence || 0.5);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      confidence = 0.5;
    }

    return {
      documentType: parsed.documentType as DocumentType,
      category: parsed.category || "Uncategorized",
      subcategory: parsed.subcategory,
      phase: parsed.phase as ProjectPhase | undefined,
      keywords: keywords.filter((k: string) => k && k.trim().length > 0),
      suggestedTags: suggestedTags.filter(
        (t: string) => t && t.trim().length > 0
      ),
      confidence,
      reasoning: parsed.reasoning || "No reasoning provided",
    };
  } catch (error) {
    // Fallback if parsing fails
    console.error("Failed to parse categorization response:", error);

    return {
      documentType: "other" as DocumentType,
      category: "Uncategorized",
      keywords: [],
      suggestedTags: [],
      confidence: 0.3,
      reasoning: "Failed to parse LLM response",
    };
  }
}

/**
 * Categorize multiple documents in batch
 */
export async function categorizeDocumentsBatch(
  drive: drive_v3.Drive,
  fileIds: string[]
): Promise<Map<string, CategorizationResult>> {
  const results = new Map<string, CategorizationResult>();

  // Process in parallel with concurrency limit
  const BATCH_SIZE = 5;
  for (let i = 0; i < fileIds.length; i += BATCH_SIZE) {
    const batch = fileIds.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (fileId) => {
      try {
        const result = await categorizeDocument(drive, fileId);
        return { fileId, result };
      } catch (error) {
        console.error(`Failed to categorize ${fileId}:`, error);
        return null;
      }
    });

    const batchResults = await Promise.all(promises);
    for (const item of batchResults) {
      if (item) {
        results.set(item.fileId, item.result);
      }
    }
  }

  return results;
}

/**
 * Validate categorization confidence
 * Returns true if confidence meets threshold
 */
export function isCategorizationConfident(
  result: CategorizationResult,
  threshold: number = 0.7
): boolean {
  return result.confidence >= threshold;
}

/**
 * Get categorization summary text
 */
export function getCategorizationSummary(
  result: CategorizationResult
): string {
  const parts = [
    `Type: ${result.documentType}`,
    `Category: ${result.category}`,
  ];

  if (result.subcategory) {
    parts.push(`Subcategory: ${result.subcategory}`);
  }

  if (result.phase) {
    parts.push(`Phase: ${result.phase}`);
  }

  parts.push(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);

  if (result.provider) {
    parts.push(`Provider: ${result.provider}`);
  }

  return parts.join(" | ");
}
