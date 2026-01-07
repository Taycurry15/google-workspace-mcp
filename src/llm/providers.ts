/**
 * LLM Provider Adapters
 *
 * Unified interface to multiple LLM providers
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  LLMProvider,
  LLMModel,
  LLMConfig,
  LLMRequest,
  LLMResponse,
  LLMMessage,
} from "./types.js";
import { LLMError } from "./types.js";

/**
 * Base Provider Interface
 */
export interface ILLMProvider {
  complete(request: LLMRequest, config: LLMConfig): Promise<LLMResponse>;
}

/**
 * Anthropic Provider
 */
export class AnthropicProvider implements ILLMProvider {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async complete(request: LLMRequest, config: LLMConfig): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // Convert messages to Anthropic format
      const messages = this.convertMessages(request.messages);
      const systemPrompt = request.systemPrompt || messages.find(m => m.role === 'system')?.content;

      const response = await this.client.messages.create({
        model: config.model,
        messages: messages.filter(m => m.role !== 'system'),
        system: systemPrompt as string | undefined,
        max_tokens: config.maxTokens || 4096,
        temperature: config.temperature ?? 1.0,
        top_p: config.topP,
        top_k: config.topK,
        stop_sequences: config.stopSequences,
        stream: false,
        // @ts-ignore - tools typing
        tools: request.tools,
      });

      const responseTime = Date.now() - startTime;

      // Extract content
      const textContent = response.content
        .filter((block) => block.type === "text")
        .map((block: any) => block.text)
        .join("\n");

      // Extract tool calls if any
      const toolCalls = response.content
        .filter((block) => block.type === "tool_use")
        .map((block: any) => ({
          id: block.id,
          name: block.name,
          arguments: block.input,
        }));

      return {
        content: textContent,
        role: "assistant",
        model: config.model,
        provider: "anthropic",
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        finishReason: this.mapStopReason(response.stop_reason),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        metadata: {
          requestId: response.id,
          responseTime,
          cost: 0, // Will be calculated by cost tracker
        },
      };
    } catch (error: any) {
      throw this.handleError(error, config);
    }
  }

  private convertMessages(messages: LLMMessage[]): any[] {
    return messages.map((msg) => ({
      role: msg.role === "system" ? "user" : msg.role,
      content: typeof msg.content === "string" ? msg.content : msg.content,
    }));
  }

  private mapStopReason(reason: string | null): LLMResponse["finishReason"] {
    switch (reason) {
      case "end_turn":
        return "stop";
      case "max_tokens":
        return "length";
      case "tool_use":
        return "tool_calls";
      default:
        return "stop";
    }
  }

  private handleError(error: any, config: LLMConfig): LLMError {
    const retryable = error.status === 429 || error.status >= 500;
    return new LLMError(
      error.message || "Anthropic API error",
      "anthropic",
      config.model,
      error.error?.type || "unknown_error",
      error.status,
      retryable
    );
  }
}

/**
 * OpenAI Provider
 */
export class OpenAIProvider implements ILLMProvider {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async complete(request: LLMRequest, config: LLMConfig): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const messages = this.convertMessages(request.messages, request.systemPrompt);

      const response = await this.client.chat.completions.create({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
        stop: config.stopSequences,
        presence_penalty: config.presencePenalty,
        frequency_penalty: config.frequencyPenalty,
        stream: false,
        // @ts-ignore - tools typing
        tools: request.tools?.map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        })),
      });

      const responseTime = Date.now() - startTime;
      const choice = response.choices[0];

      return {
        content: choice.message.content || "",
        role: "assistant",
        model: config.model,
        provider: "openai",
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        finishReason: this.mapFinishReason(choice.finish_reason),
        toolCalls: choice.message.tool_calls?.map((tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        })),
        metadata: {
          requestId: response.id,
          responseTime,
          cost: 0,
        },
      };
    } catch (error: any) {
      throw this.handleError(error, config);
    }
  }

  private convertMessages(messages: LLMMessage[], systemPrompt?: string): any[] {
    const result: any[] = [];

    if (systemPrompt) {
      result.push({ role: "system", content: systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === "system" && !systemPrompt) {
        result.push({ role: "system", content: msg.content });
      } else if (msg.role !== "system") {
        result.push({
          role: msg.role,
          content: msg.content,
          name: msg.name,
          tool_call_id: msg.toolCallId,
        });
      }
    }

    return result;
  }

  private mapFinishReason(reason: string | null): LLMResponse["finishReason"] {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
        return "length";
      case "tool_calls":
      case "function_call":
        return "tool_calls";
      case "content_filter":
        return "content_filter";
      default:
        return "stop";
    }
  }

  private handleError(error: any, config: LLMConfig): LLMError {
    const retryable = error.status === 429 || error.status >= 500;
    return new LLMError(
      error.message || "OpenAI API error",
      "openai",
      config.model,
      error.code || "unknown_error",
      error.status,
      retryable
    );
  }
}

/**
 * Google Gemini Provider
 */
export class GoogleProvider implements ILLMProvider {
  private client: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    this.client = new GoogleGenerativeAI(
      apiKey || process.env.GOOGLE_API_KEY || ""
    );
  }

  async complete(request: LLMRequest, config: LLMConfig): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel({ model: config.model });

      // Convert messages to Gemini format
      const contents = this.convertMessages(request.messages, request.systemPrompt);

      const result = await model.generateContent({
        contents,
        generationConfig: {
          temperature: config.temperature,
          topP: config.topP,
          topK: config.topK,
          maxOutputTokens: config.maxTokens,
          stopSequences: config.stopSequences,
        },
      });

      const responseTime = Date.now() - startTime;
      const response = result.response;

      return {
        content: response.text(),
        role: "assistant",
        model: config.model,
        provider: "google",
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0,
        },
        finishReason: "stop",
        metadata: {
          responseTime,
          cost: 0,
        },
      };
    } catch (error: any) {
      throw this.handleError(error, config);
    }
  }

  private convertMessages(messages: LLMMessage[], systemPrompt?: string): any[] {
    const contents: any[] = [];

    // Add system prompt as first user message if present
    if (systemPrompt) {
      contents.push({
        role: "user",
        parts: [{ text: systemPrompt }],
      });
    }

    for (const msg of messages) {
      if (msg.role === "system") continue; // Already handled

      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content) }],
      });
    }

    return contents;
  }

  private handleError(error: any, config: LLMConfig): LLMError {
    return new LLMError(
      error.message || "Google API error",
      "google",
      config.model,
      "unknown_error",
      undefined,
      true
    );
  }
}

/**
 * Provider Factory
 */
export class ProviderFactory {
  private providers: Map<LLMProvider, ILLMProvider> = new Map();

  getProvider(provider: LLMProvider, apiKey?: string): ILLMProvider {
    // Check if provider already instantiated
    if (this.providers.has(provider)) {
      return this.providers.get(provider)!;
    }

    // Create new provider instance
    let providerInstance: ILLMProvider;

    switch (provider) {
      case "anthropic":
        providerInstance = new AnthropicProvider(apiKey);
        break;
      case "openai":
        providerInstance = new OpenAIProvider(apiKey);
        break;
      case "google":
        providerInstance = new GoogleProvider(apiKey);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    this.providers.set(provider, providerInstance);
    return providerInstance;
  }

  clearProviders(): void {
    this.providers.clear();
  }
}

/**
 * Global provider factory
 */
export const providerFactory = new ProviderFactory();
