import Anthropic from "@anthropic-ai/sdk";
import { MissingProviderKeyError, } from "../types.js";
const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";
export class AnthropicProvider {
    apiKey;
    name = "anthropic";
    model = DEFAULT_MODEL;
    cost = {
        inputPerMillion: 3.0,
        outputPerMillion: 15.0,
    };
    capabilities = {
        supportsJsonMode: true,
        excelsAt: ["structured_extraction", "analysis"],
        reasoningScore: 0.95,
        minCostUsd: 0.003,
        latencyClass: "thorough",
        longContextTokens: 200000,
    };
    client = null;
    constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
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
            this.client = new Anthropic({ apiKey: this.apiKey });
        }
        return this.client;
    }
    async generate(request) {
        const client = this.getClient();
        const systemPrompt = request.messages
            .filter((msg) => msg.role === "system")
            .map((msg) => msg.content)
            .join("\n\n");
        const conversation = request.messages
            .filter((msg) => msg.role !== "system")
            .map((msg) => ({
            role: msg.role === "assistant" ? "assistant" : "user",
            content: [
                {
                    type: "text",
                    text: msg.content,
                },
            ],
        }));
        const response = await client.messages.create({
            model: this.model,
            max_tokens: request.maxOutputTokens ?? 2048,
            temperature: request.temperature ?? 0,
            system: systemPrompt ? [{ type: "text", text: systemPrompt }] : undefined,
            messages: conversation,
        });
        const outputText = response.content
            .filter((block) => block.type === "text")
            .map((block) => ("text" in block ? block.text : ""))
            .join("\n");
        return {
            provider: this.name,
            model: this.model,
            outputText: outputText.trim(),
            usage: {
                inputTokens: response.usage?.input_tokens,
                outputTokens: response.usage?.output_tokens,
                costUsd: this.estimateCost(response.usage?.input_tokens, response.usage?.output_tokens),
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
//# sourceMappingURL=anthropic.js.map