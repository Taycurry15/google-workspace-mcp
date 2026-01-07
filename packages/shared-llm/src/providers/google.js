import { GoogleGenerativeAI } from "@google/generative-ai";
import { MissingProviderKeyError, } from "../types.js";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
export class GeminiProvider {
    apiKey;
    name = "gemini";
    model = DEFAULT_MODEL;
    cost = {
        inputPerMillion: 0.35,
        outputPerMillion: 1.05,
    };
    capabilities = {
        supportsJsonMode: false,
        excelsAt: ["classification", "structured_extraction", "chat"],
        reasoningScore: 0.75,
        minCostUsd: 0.00035,
        latencyClass: "fast",
        longContextTokens: 1000000,
    };
    client = null;
    modelInstance = null;
    constructor(apiKey = process.env.GEMINI_API_KEY) {
        this.apiKey = apiKey;
    }
    isAvailable() {
        return Boolean(this.apiKey);
    }
    getModel() {
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
    async generate(request) {
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
                    text: index === 0 && systemPrompt
                        ? `${systemPrompt}\n\n${msg.content}`
                        : msg.content,
                },
            ],
        }));
        const contents = conversationalMessages.length > 0
            ? conversationalMessages
            : [
                {
                    role: "user",
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
    estimateCost(inputTokens = 0, outputTokens = 0) {
        if (!inputTokens && !outputTokens)
            return undefined;
        const inputCost = (inputTokens / 1_000_000) * this.cost.inputPerMillion;
        const outputCost = (outputTokens / 1_000_000) * this.cost.outputPerMillion;
        return Number((inputCost + outputCost).toFixed(6));
    }
}
//# sourceMappingURL=google.js.map