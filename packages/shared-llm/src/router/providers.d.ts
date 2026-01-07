/**
 * LLM Provider Adapters
 *
 * Unified interface to multiple LLM providers
 */
import type { LLMProvider, LLMConfig, LLMRequest, LLMResponse } from "./types.js";
/**
 * Base Provider Interface
 */
export interface ILLMProvider {
    complete(request: LLMRequest, config: LLMConfig): Promise<LLMResponse>;
}
/**
 * Anthropic Provider
 */
export declare class AnthropicProvider implements ILLMProvider {
    private client;
    constructor(apiKey?: string);
    complete(request: LLMRequest, config: LLMConfig): Promise<LLMResponse>;
    private convertMessages;
    private mapStopReason;
    private handleError;
}
/**
 * OpenAI Provider
 */
export declare class OpenAIProvider implements ILLMProvider {
    private client;
    constructor(apiKey?: string);
    complete(request: LLMRequest, config: LLMConfig): Promise<LLMResponse>;
    private convertMessages;
    private mapFinishReason;
    private handleError;
}
/**
 * Google Gemini Provider
 */
export declare class GoogleProvider implements ILLMProvider {
    private client;
    constructor(apiKey?: string);
    complete(request: LLMRequest, config: LLMConfig): Promise<LLMResponse>;
    private convertMessages;
    private handleError;
}
/**
 * Provider Factory
 */
export declare class ProviderFactory {
    private providers;
    getProvider(provider: LLMProvider, apiKey?: string): ILLMProvider;
    clearProviders(): void;
}
/**
 * Global provider factory
 */
export declare const providerFactory: ProviderFactory;
//# sourceMappingURL=providers.d.ts.map