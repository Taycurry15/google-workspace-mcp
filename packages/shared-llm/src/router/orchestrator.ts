import {
  LLMMessage,
  LLMOrchestratorRequest,
  LLMProvider,
  LLMResponse,
  LLMTaskType,
} from "../types.js";
import { AnthropicProvider } from "../providers/anthropic.js";
import { GeminiProvider } from "../providers/google.js";
import { OpenAIProvider } from "../providers/openai.js";

interface RankedProvider {
  provider: LLMProvider;
  score: number;
}

export class LLMOrchestrator {
  private providers: LLMProvider[];

  constructor(providers?: LLMProvider[]) {
    this.providers =
      providers ?? [new AnthropicProvider(), new OpenAIProvider(), new GeminiProvider()];
  }

  async generate(request: LLMOrchestratorRequest): Promise<LLMResponse> {
    const ranked = this.rankProviders(request);
    const reasons: string[] = [];
    let lastError: unknown = null;

    for (const entry of ranked) {
      const provider = entry.provider;
      if (!provider.isAvailable()) {
        reasons.push(`${provider.name} skipped (missing API key)`);
        continue;
      }

      try {
        const response = await provider.generate(request);
        if (process.env.DEBUG_LLMS === "true") {
          console.debug(
            `[LLM] ${provider.name} selected (score: ${entry.score.toFixed(2)})`
          );
        }
        return response;
      } catch (error) {
        lastError = error;
        reasons.push(`${provider.name} failed: ${error instanceof Error ? error.message : error}`);
        console.warn(`[LLM] ${provider.name} provider failed`, error);
      }
    }

    throw new Error(
      `All LLM providers failed. Selection trail: ${reasons.join(" | ")}. Last error: ${lastError}`
    );
  }

  private rankProviders(request: LLMOrchestratorRequest): RankedProvider[] {
    const estimatedInputTokens =
      request.metadata?.estimatedInputTokens ?? this.estimateTokens(request.messages);
    const estimatedOutputTokens = request.maxOutputTokens ?? 1024;

    const baseOrder = new Map<LLMProvider["name"], number>([
      ["anthropic", 2.5],
      ["openai", 2.0],
      ["gemini", 1.5],
    ]);

    const ranked = this.providers.map((provider) => {
      let score = baseOrder.get(provider.name) ?? 1.0;

      // Prefer providers that excel at the given task type
      if (provider.capabilities.excelsAt.includes(request.taskType)) {
        score += 1.1;
      }

      // Structured JSON needs
      if (request.metadata?.requiresStructuredJson) {
        score += provider.capabilities.supportsJsonMode ? 0.8 : -0.8;
      }

      // Long context handling
      if (
        request.metadata?.allowLongContext ||
        estimatedInputTokens > provider.capabilities.longContextTokens
      ) {
        score += provider.capabilities.longContextTokens >= estimatedInputTokens ? 0.5 : -0.5;
      }

      // Priority weighting
      if (request.priority === "high") {
        score += provider.capabilities.latencyClass === "thorough" ? 0.5 : 0;
        score += provider.capabilities.reasoningScore;
      } else if (request.priority === "low") {
        score -= provider.capabilities.reasoningScore / 2;
        score += provider.capabilities.minCostUsd;
      }

      // Budget awareness
      const estimatedCost =
        (estimatedInputTokens / 1_000_000) * provider.cost.inputPerMillion +
        (estimatedOutputTokens / 1_000_000) * provider.cost.outputPerMillion;
      if (request.metadata?.maxBudgetUsd) {
        if (estimatedCost > request.metadata.maxBudgetUsd) {
          score -= 1.5;
        } else {
          score += 0.25;
        }
      } else {
        score -= estimatedCost * 2; // prefer cheaper default
      }

      // Task specific heuristics
      score += this.taskHeuristic(provider.name, request.taskType);

      return { provider, score };
    });

    return ranked.sort((a, b) => b.score - a.score);
  }

  private taskHeuristic(providerName: LLMProvider["name"], taskType: LLMTaskType): number {
    switch (taskType) {
      case "classification":
        return providerName === "gemini" ? 0.8 : providerName === "anthropic" ? 0.2 : 0.3;
      case "structured_extraction":
        return providerName === "anthropic" ? 1.2 : providerName === "openai" ? 0.6 : -0.4;
      case "content_generation":
        return providerName === "openai" ? 0.9 : providerName === "anthropic" ? 0.4 : 0.2;
      case "analysis":
        return providerName === "anthropic" ? 0.9 : providerName === "openai" ? 0.7 : 0.1;
      case "chat":
      default:
        return providerName === "openai" ? 0.5 : 0.25;
    }
  }

  private estimateTokens(messages: LLMMessage[]): number {
    const totalCharacters = messages.reduce((sum, message) => sum + message.content.length, 0);
    return Math.max(256, Math.ceil(totalCharacters / 4));
  }
}
