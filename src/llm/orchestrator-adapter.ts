/**
 * LLM Orchestrator Adapter
 *
 * Bridges the old LLMOrchestrator interface with the new LLMRouter
 * This allows existing code to work with the new router without changes
 */

import { llmRouter } from "./router.js";
import type { LLMSelectionCriteria, LLMRequest, LLMResponse } from "./types.js";
import { getWorkflowConfig } from "./config.js";

// Import old orchestrator types
import type {
  LLMOrchestratorRequest,
  LLMResponse as OldLLMResponse,
} from "../utils/llm/types.js";

/**
 * Adapter class that provides backward compatibility
 * with the old LLMOrchestrator interface while using the new router
 */
export class LLMOrchestratorAdapter {
  /**
   * Generate completion using new router but with old interface
   */
  async generate(request: LLMOrchestratorRequest): Promise<OldLLMResponse> {
    // Convert old request format to new format
    // Extract system message if present
    const systemMsg = request.messages.find(m => m.role === 'system');
    const userMessages = request.messages.filter(m => m.role !== 'system');

    const newRequest: LLMRequest = {
      messages: userMessages.map((msg) => ({
        role: msg.role as any,
        content: msg.content,
      })),
      systemPrompt: systemMsg?.content,
      stream: false,
      metadata: {
        requestType: request.taskType,
        ...request.metadata,
      },
    };

    // Determine selection criteria based on task type
    const criteria = this.mapTaskTypeToCriteria(
      request.taskType,
      request.priority,
      request.metadata
    );

    // Use the new router
    const response: LLMResponse = await llmRouter.complete(newRequest, criteria);

    // Convert new response format to old format
    // Map provider name: "google" -> "gemini"
    const providerName = response.provider === "google" ? "gemini" : response.provider;

    const oldResponse: OldLLMResponse = {
      provider: providerName as any,
      model: response.model,
      outputText: response.content,
      usage: {
        inputTokens: response.usage.promptTokens,
        outputTokens: response.usage.completionTokens,
        costUsd: response.metadata?.cost || 0,
      },
    };

    return oldResponse;
  }

  /**
   * Map old task type to new selection criteria
   */
  private mapTaskTypeToCriteria(
    taskType: string,
    priority?: "low" | "normal" | "high",
    metadata?: any
  ): LLMSelectionCriteria {
    // Base criteria
    const criteria: LLMSelectionCriteria = {
      strategy: "balanced",
      taskType: this.mapTaskType(taskType),
      budget: this.mapPriority(priority),
      latencyRequirement: this.mapLatency(priority),
    };

    // Apply metadata hints
    if (metadata?.requiresStructuredJson) {
      criteria.requiresToolUse = true;
    }

    if (metadata?.allowLongContext || metadata?.estimatedInputTokens > 50000) {
      criteria.contextSize = metadata?.estimatedInputTokens || 100000;
      criteria.strategy = "context_size";
    }

    if (metadata?.maxBudgetUsd) {
      if (metadata.maxBudgetUsd < 0.001) {
        criteria.budget = "low";
      } else if (metadata.maxBudgetUsd < 0.01) {
        criteria.budget = "medium";
      } else {
        criteria.budget = "high";
      }
    }

    return criteria;
  }

  /**
   * Map old task type to new task type
   */
  private mapTaskType(
    taskType: string
  ): LLMSelectionCriteria["taskType"] {
    const mapping: Record<string, LLMSelectionCriteria["taskType"]> = {
      classification: "categorization",
      structured_extraction: "extraction",
      content_generation: "generation",
      analysis: "analysis",
      chat: "simple",
      summarization: "summarization",
    };

    return mapping[taskType] || "simple";
  }

  /**
   * Map priority to budget
   */
  private mapPriority(priority?: "low" | "normal" | "high"): "low" | "medium" | "high" | "unlimited" {
    switch (priority) {
      case "low":
        return "low";
      case "high":
        return "high";
      case "normal":
      default:
        return "medium";
    }
  }

  /**
   * Map priority to latency requirement
   */
  private mapLatency(priority?: "low" | "normal" | "high"): "low" | "medium" | "high" {
    switch (priority) {
      case "low":
        return "high"; // Low priority = can tolerate high latency
      case "high":
        return "low"; // High priority = needs low latency
      case "normal":
      default:
        return "medium";
    }
  }
}

/**
 * Global instance for backward compatibility
 */
export const llmOrchestrator = new LLMOrchestratorAdapter();

/**
 * Helper function to get orchestrator for workflows
 * This can be imported in existing code without changes
 */
export function createLLMOrchestrator(): LLMOrchestratorAdapter {
  return new LLMOrchestratorAdapter();
}
