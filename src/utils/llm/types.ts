export type LLMProviderName = "anthropic" | "openai" | "gemini";

export type LLMTaskType =
  | "classification"
  | "structured_extraction"
  | "content_generation"
  | "analysis"
  | "chat";

export type LLMTaskPriority = "low" | "normal" | "high";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequestMetadata {
  /**
   * Estimated input tokens. Used for rough cost calculations and model selection.
   */
  estimatedInputTokens?: number;
  /**
   * Indicates the caller requires deterministic JSON output.
   */
  requiresStructuredJson?: boolean;
  /**
   * Flag if prompt contains long attachments that need large context windows.
   */
  allowLongContext?: boolean;
  /**
   * Domain information helps the router pick specialized models.
   */
  domain?: string;
  /**
   * Max spend (USD) the caller is willing to pay for this request.
   */
  maxBudgetUsd?: number;
}

export interface LLMOrchestratorRequest {
  messages: LLMMessage[];
  taskType: LLMTaskType;
  priority?: LLMTaskPriority;
  maxOutputTokens?: number;
  temperature?: number;
  metadata?: LLMRequestMetadata;
}

export interface LLMProviderCapabilities {
  supportsJsonMode: boolean;
  excelsAt: LLMTaskType[];
  reasoningScore: number;
  minCostUsd: number;
  latencyClass: "fast" | "balanced" | "thorough";
  longContextTokens: number;
}

export interface LLMProviderCost {
  inputPerMillion: number;
  outputPerMillion: number;
}

export interface LLMProvider {
  readonly name: LLMProviderName;
  readonly model: string;
  readonly cost: LLMProviderCost;
  readonly capabilities: LLMProviderCapabilities;
  isAvailable(): boolean;
  generate(request: LLMOrchestratorRequest): Promise<LLMResponse>;
}

export interface LLMUsage {
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

export interface LLMResponse {
  provider: LLMProviderName;
  model: string;
  outputText: string;
  usage?: LLMUsage;
}

export class MissingProviderKeyError extends Error {
  constructor(provider: LLMProviderName) {
    super(
      `Missing API key for ${provider}. Please add it to your environment before using this provider.`
    );
  }
}
