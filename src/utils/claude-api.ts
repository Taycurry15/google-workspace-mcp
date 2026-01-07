/**
 * AI Orchestrator Client for PARA Categorization
 * Handles AI-powered document categorization using best available LLM
 */

import { LLMOrchestrator } from "./llm/index.js";
import { CategorizationResult, ExtractedContent } from "../types/para.js";

// PARA method guidelines for system prompt (cacheable)
const PARA_GUIDELINES = `You are an expert at the PARA method (Projects, Areas, Resources, Archives) for organizing information.

PARA Category Definitions:

1. PROJECT: Active work with a specific deadline or end goal
   - Examples: proposals, deals, specific initiatives, campaigns
   - Characteristics: Time-bound, clear outcome, actionable steps
   - Typically: High actionability

2. AREA: Ongoing responsibility without a specific deadline
   - Examples: client relationships, compliance management, business development
   - Characteristics: Continuous, no end date, requires regular attention
   - Typically: Medium actionability

3. RESOURCE: Reference material for future use
   - Examples: templates, research, guides, best practices, knowledge base
   - Characteristics: Informational, reusable, timeless
   - Typically: Low actionability

4. ARCHIVE: Completed project or outdated information
   - Examples: finished proposals, closed deals, expired contracts
   - Characteristics: No longer active, historical value only
   - Typically: Low actionability

Domain Context:
- govcon: Government contracting (proposals, contracts, compliance)
- international: International deals (partnerships, agreements, due diligence)
- cybersec: Cybersecurity practice (assessments, tools, research)
- business: General business operations (strategy, HR, finance)

Actionability Levels:
- HIGH: Requires immediate or near-term action, has deadlines
- MEDIUM: Ongoing attention needed but no immediate deadline
- LOW: Reference only, no action needed currently`;

/**
 * Backwards-compatible client that now delegates to the LLM orchestrator
 */
export class ClaudeAPIClient {
  private orchestrator: LLMOrchestrator;

  constructor(apiKey?: string) {
    if (apiKey && !process.env.ANTHROPIC_API_KEY) {
      process.env.ANTHROPIC_API_KEY = apiKey;
    }

    this.orchestrator = new LLMOrchestrator();
  }

  /**
   * Categorize a document using the orchestrator
   */
  async categorizeDocument(
    content: ExtractedContent
  ): Promise<CategorizationResult> {
    try {
      const analysisPrompt = this.buildCategorizationPrompt(content);

      const response = await this.orchestrator.generate({
        messages: [
          { role: "system", content: PARA_GUIDELINES },
          {
            role: "system",
            content: "Analyze documents and provide PARA categorization with high accuracy.",
          },
          { role: "user", content: analysisPrompt },
        ],
        taskType: "classification",
        priority: "normal",
        maxOutputTokens: 1024,
        metadata: {
          requiresStructuredJson: true,
          estimatedInputTokens: Math.ceil(analysisPrompt.length / 4),
          maxBudgetUsd: 0.03,
        },
      });

      // Parse JSON response
      const result = this.parseCategorizationResponse(response.outputText);

      return result;
    } catch (error) {
      console.error("LLM categorization error:", error);
      throw new Error(
        `Failed to categorize document: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Build categorization prompt from extracted content
   */
  private buildCategorizationPrompt(content: ExtractedContent): string {
    const { fileName, mimeType, contentPreview, metadata } = content;

    return `Analyze this document and categorize it using the PARA method.

Document Metadata:
- Filename: ${fileName}
- MIME Type: ${mimeType}
- Created: ${metadata.createdTime}
- Modified: ${metadata.modifiedTime}
- Current Folder: ${metadata.folderPath || "Unknown"}
${metadata.domain ? `- Domain Context: ${metadata.domain}` : ""}

Document Content Preview (first 2000 characters):
${contentPreview}

Analyze this document and return a JSON object with the following structure:
{
  "category": "PROJECT|AREA|RESOURCE|ARCHIVE",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of why this category was chosen",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "actionability": "high|medium|low",
  "suggestedProject": "project name if PROJECT category",
  "suggestedArea": "area name if AREA category",
  "archiveDate": "ISO date if ARCHIVE category (use modifiedTime if applicable)"
}

Guidelines:
1. Be decisive - choose the most appropriate category
2. Confidence should be high (>0.8) for clear cases
3. Provide 2-5 relevant tags that describe the content
4. Actionability should match the category (PROJECT=high, AREA=medium, RESOURCE=low, ARCHIVE=low)
5. If it's a PROJECT, extract or suggest a clear project name
6. If it's an AREA, identify the ongoing responsibility area
7. Return ONLY valid JSON, no additional text`;
  }

  /**
   * Parse and validate categorization response
   */
  private parseCategorizationResponse(response: string): CategorizationResult {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith("```")) {
        const lines = jsonStr.split("\n");
        jsonStr = lines
          .slice(1, -1)
          .join("\n")
          .trim();
        if (jsonStr.startsWith("json")) {
          jsonStr = jsonStr.slice(4).trim();
        }
      }

      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      if (!parsed.category || !["PROJECT", "AREA", "RESOURCE", "ARCHIVE"].includes(parsed.category)) {
        throw new Error("Invalid category in response");
      }

      if (
        typeof parsed.confidence !== "number" ||
        parsed.confidence < 0 ||
        parsed.confidence > 1
      ) {
        throw new Error("Invalid confidence score in response");
      }

      if (
        !parsed.actionability ||
        !["high", "medium", "low"].includes(parsed.actionability)
      ) {
        throw new Error("Invalid actionability level in response");
      }

      // Build result with defaults for optional fields
      const result: CategorizationResult = {
        category: parsed.category,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning || "No reasoning provided",
        suggestedTags: Array.isArray(parsed.suggestedTags)
          ? parsed.suggestedTags
          : [],
        actionability: parsed.actionability,
      };

      // Add optional fields
      if (parsed.suggestedProject) {
        result.suggestedProject = parsed.suggestedProject;
      }
      if (parsed.suggestedArea) {
        result.suggestedArea = parsed.suggestedArea;
      }
      if (parsed.archiveDate) {
        result.archiveDate = parsed.archiveDate;
      }

      return result;
    } catch (error) {
      console.error("Failed to parse categorization response:", response);
      console.error("Parse error:", error);

      // Return a fallback result with low confidence
      return {
        category: "RESOURCE",
        confidence: 0.3,
        reasoning: "Failed to parse AI response, defaulting to RESOURCE",
        suggestedTags: ["needs-review"],
        actionability: "low",
      };
    }
  }

  /**
   * Batch categorize multiple documents
   * Uses rate limiting to avoid API throttling
   */
  async batchCategorize(
    contents: ExtractedContent[],
    concurrency: number = 5,
    onProgress?: (processed: number, total: number) => void
  ): Promise<Map<string, CategorizationResult>> {
    const results = new Map<string, CategorizationResult>();
    const total = contents.length;
    let processed = 0;

    // Process in batches with concurrency limit
    for (let i = 0; i < contents.length; i += concurrency) {
      const batch = contents.slice(i, i + concurrency);

      const promises = batch.map(async (content) => {
        try {
          const result = await this.categorizeDocument(content);
          results.set(content.fileId, result);
        } catch (error) {
          console.error(
            `Failed to categorize ${content.fileName}:`,
            error
          );
          // Set fallback result
          results.set(content.fileId, {
            category: "RESOURCE",
            confidence: 0.2,
            reasoning: `Categorization failed: ${error instanceof Error ? error.message : String(error)}`,
            suggestedTags: ["error", "needs-review"],
            actionability: "low",
          });
        }
      });

      await Promise.all(promises);

      processed += batch.length;
      if (onProgress) {
        onProgress(processed, total);
      }
    }

    return results;
  }

  /**
   * Test connection to the orchestrated LLM stack
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.orchestrator.generate({
        messages: [
          { role: "system", content: "You are a latency test assistant." },
          {
            role: "user",
            content: "Reply with just the word 'OK' if you can read this.",
          },
        ],
        taskType: "chat",
        priority: "low",
        maxOutputTokens: 10,
      });

      return response.outputText.toLowerCase().includes("ok");
    } catch (error) {
      console.error("LLM orchestrator connection test failed:", error);
      return false;
    }
  }
}

/**
 * Create a singleton instance
 */
let claudeClient: ClaudeAPIClient | null = null;

export function getClaudeClient(): ClaudeAPIClient {
  if (!claudeClient) {
    claudeClient = new ClaudeAPIClient();
  }
  return claudeClient;
}

export function setClaudeClient(apiKey: string): void {
  claudeClient = new ClaudeAPIClient(apiKey);
}
