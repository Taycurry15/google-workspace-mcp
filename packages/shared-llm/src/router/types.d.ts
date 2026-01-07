/**
 * LLM Router Types
 *
 * Type definitions for multi-provider LLM routing system
 */
/**
 * Supported LLM providers
 */
export type LLMProvider = "anthropic" | "openai" | "google" | "cohere" | "mistral" | "groq";
/**
 * LLM model configurations
 */
export type LLMModel = "claude-opus-4.5" | "claude-sonnet-4.5" | "claude-sonnet-4" | "claude-haiku-4" | "gpt-4" | "gpt-4-turbo" | "gpt-4o" | "gpt-3.5-turbo" | "o1" | "o1-mini" | "gemini-2.0-flash" | "gemini-1.5-pro" | "gemini-1.5-flash" | "mistral-large" | "mistral-medium" | "mistral-small" | "llama-3.3-70b" | "mixtral-8x7b";
/**
 * LLM Configuration
 */
export interface LLMConfig {
    provider: LLMProvider;
    model: LLMModel;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
    presencePenalty?: number;
    frequencyPenalty?: number;
    timeout?: number;
    apiKey?: string;
    baseURL?: string;
}
/**
 * LLM Request
 */
export interface LLMRequest {
    messages: LLMMessage[];
    config?: Partial<LLMConfig>;
    systemPrompt?: string;
    tools?: LLMTool[];
    stream?: boolean;
    metadata?: Record<string, any>;
}
/**
 * LLM Message
 */
export interface LLMMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string | LLMContentBlock[];
    name?: string;
    toolCallId?: string;
}
/**
 * LLM Content Block (for multimodal)
 */
export type LLMContentBlock = {
    type: "text";
    text: string;
} | {
    type: "image";
    source: {
        type: "url" | "base64";
        data: string;
    };
} | {
    type: "tool_use";
    id: string;
    name: string;
    input: any;
} | {
    type: "tool_result";
    toolUseId: string;
    content: string;
};
/**
 * LLM Tool Definition
 */
export interface LLMTool {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: Record<string, any>;
        required?: string[];
    };
}
/**
 * LLM Response
 */
export interface LLMResponse {
    content: string;
    role: "assistant";
    model: string;
    provider: LLMProvider;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason: "stop" | "length" | "tool_calls" | "content_filter" | "error";
    toolCalls?: LLMToolCall[];
    metadata?: {
        requestId?: string;
        responseTime: number;
        cost: number;
        [key: string]: any;
    };
}
/**
 * LLM Tool Call
 */
export interface LLMToolCall {
    id: string;
    name: string;
    arguments: Record<string, any>;
}
/**
 * LLM Selection Strategy
 */
export type LLMSelectionStrategy = "cost_optimized" | "performance" | "balanced" | "speed" | "context_size" | "custom";
/**
 * LLM Selection Criteria
 */
export interface LLMSelectionCriteria {
    strategy: LLMSelectionStrategy;
    taskType?: "categorization" | "analysis" | "generation" | "extraction" | "summarization" | "routing" | "simple";
    contextSize?: number;
    budget?: "low" | "medium" | "high" | "unlimited";
    requiresToolUse?: boolean;
    requiresMultimodal?: boolean;
    latencyRequirement?: "low" | "medium" | "high";
    customLogic?: (availableModels: ModelCapabilities[]) => LLMConfig;
}
/**
 * Model Capabilities
 */
export interface ModelCapabilities {
    provider: LLMProvider;
    model: LLMModel;
    maxContextTokens: number;
    maxOutputTokens: number;
    supportsToolUse: boolean;
    supportsMultimodal: boolean;
    inputCostPer1K: number;
    outputCostPer1K: number;
    averageLatencyMs: number;
    qualityScore: number;
    capabilities: string[];
}
/**
 * LLM Router Configuration
 */
export interface LLMRouterConfig {
    defaultProvider: LLMProvider;
    defaultModel: LLMModel;
    fallbackChain: LLMConfig[];
    enableFallback: boolean;
    maxRetries: number;
    retryDelay: number;
    enableCostTracking: boolean;
    enablePerformanceMonitoring: boolean;
    costLimitPerRequest?: number;
    costLimitPerDay?: number;
}
/**
 * Cost Tracking Entry
 */
export interface CostEntry {
    id: string;
    timestamp: Date;
    provider: LLMProvider;
    model: LLMModel;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
    requestType: string;
    workflowId?: string;
    executionId?: string;
    metadata?: Record<string, any>;
}
/**
 * Performance Metrics
 */
export interface PerformanceMetrics {
    provider: LLMProvider;
    model: LLMModel;
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
}
/**
 * LLM Error
 */
export declare class LLMError extends Error {
    provider: LLMProvider;
    model: LLMModel;
    code: string;
    statusCode?: number | undefined;
    retryable: boolean;
    constructor(message: string, provider: LLMProvider, model: LLMModel, code: string, statusCode?: number | undefined, retryable?: boolean);
}
//# sourceMappingURL=types.d.ts.map