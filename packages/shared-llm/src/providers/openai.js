import OpenAI from "openai";
import { MissingProviderKeyError, } from "../types.js";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
export class OpenAIProvider {
    apiKey;
    name = "openai";
    model = DEFAULT_MODEL;
    cost = {
        inputPerMillion: 5.0,
        outputPerMillion: 15.0,
    };
    capabilities = {
        supportsJsonMode: true,
        excelsAt: ["content_generation", "analysis", "chat"],
        reasoningScore: 0.9,
        minCostUsd: 0.005,
        latencyClass: "balanced",
        longContextTokens: 128000,
    };
    client = null;
    constructor(apiKey = process.env.OPENAI_API_KEY) {
        this.apiKey = apiKey;
    }
    isAvailable() {
        return Boolean(this.apiKey);
    }
    getClient() {
        if (!this.apiKey) {
            throw new MissingProviderKeyError(this.name);
        }
        if (!this.client) {
            this.client = new OpenAI({ apiKey: this.apiKey });
        }
        return this.client;
    }
    async generate(request) {
        const client = this.getClient();
        const completion = await client.chat.completions.create({
            model: this.model,
            temperature: request.temperature ?? 0.25,
            max_tokens: request.maxOutputTokens ?? 2048,
            messages: request.messages.map((message) => ({
                role: message.role,
                content: message.content,
            })),
            response_format: request.metadata?.requiresStructuredJson
                ? { type: "json_object" }
                : undefined,
        });
        const outputText = completion.choices[0]?.message?.content ?? "";
        const usage = completion.usage;
        return {
            provider: this.name,
            model: this.model,
            outputText: outputText.trim(),
            usage: {
                inputTokens: usage?.prompt_tokens,
                outputTokens: usage?.completion_tokens,
                costUsd: usage
                    ? this.estimateCost(usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0)
                    : undefined,
            },
        };
    }
    estimateCost(inputTokens = 0, outputTokens = 0) {
        if (!inputTokens && !outputTokens)
            return undefined;
        const inputCost = (inputTokens / 1_000_000) * this.cost.inputPerMillion;
        const outputCost = (outputTokens / 1_000_000) * this.cost.outputPerMillion;
        return Number((inputCost + outputCost).toFixed(6));
    }
}
//# sourceMappingURL=openai.js.map