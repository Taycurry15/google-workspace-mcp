import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import {
  LLMOrchestratorRequest,
  LLMProvider,
  LLMProviderCapabilities,
  LLMProviderCost,
  LLMResponse,
  MissingProviderKeyError,
} from "../types.js";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

export class GeminiProvider implements LLMProvider {
  public readonly name = "gemini" as const;
  public readonly model = DEFAULT_MODEL;
  public readonly cost: LLMProviderCost = {
    inputPerMillion: 0.35,
    outputPerMillion: 1.05,
  };
  public readonly capabilities: LLMProviderCapabilities = {
    supportsJsonMode: false,
    excelsAt: ["classification", "structured_extraction", "chat"],
    reasoningScore: 0.75,
    minCostUsd: 0.00035,
    latencyClass: "fast",
    longContextTokens: 1000000,
  };

  private client: GoogleGenerativeAI | null = null;
  private modelInstance: GenerativeModel | null = null;

  constructor(private readonly apiKey = process.env.GEMINI_API_KEY) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  private getModel(): GenerativeModel {
    if (!this.apiKey) {
      throw new MissingProviderKeyError(this.name);
    }

    if (!this.client) {
      this.client = new GoogleGenerativeAI(this.apiKey);
    }

    if (!this.modelInstance) {
      this.modelInstance = this.client.getGenerativeModel({
        model: this.model,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.2,
        },
      });
    }

    return this.modelInstance;
  }

  async generate(request: LLMOrchestratorRequest): Promise<LLMResponse> {
    const model = this.getModel();
    const systemPrompt = request.messages
      .filter((msg) => msg.role === "system")
      .map((msg) => msg.content)
      .join("\n\n");

    const conversationalMessages = request.messages
      .filter((msg) => msg.role !== "system")
      .map((msg, index) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [
          {
            text:
              index === 0 && systemPrompt
                ? `${systemPrompt}\n\n${msg.content}`
                : msg.content,
          },
        ],
      }));

    const contents =
      conversationalMessages.length > 0
        ? conversationalMessages
        : [
            {
              role: "user" as const,
              parts: [{ text: systemPrompt || "Provide a response." }],
            },
          ];

    const result = await model.generateContent({
      contents,
    });

    const response = await result.response;
    const outputText = response.text();
    const usage = response.usageMetadata;

    return {
      provider: this.name,
      model: this.model,
      outputText: outputText.trim(),
      usage: {
        inputTokens: usage?.promptTokenCount,
        outputTokens: usage?.candidatesTokenCount,
        costUsd: usage
          ? this.estimateCost(usage.promptTokenCount ?? 0, usage.candidatesTokenCount ?? 0)
          : undefined,
      },
    };
  }

  private estimateCost(inputTokens = 0, outputTokens = 0): number | undefined {
    if (!inputTokens && !outputTokens) return undefined;
    const inputCost = (inputTokens / 1_000_000) * this.cost.inputPerMillion;
    const outputCost = (outputTokens / 1_000_000) * this.cost.outputPerMillion;
    return Number((inputCost + outputCost).toFixed(6));
  }
}
