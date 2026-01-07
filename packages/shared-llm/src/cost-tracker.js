/**
 * LLM Cost Tracker
 *
 * Tracks costs across all LLM providers with detailed breakdowns
 */
/**
 * Model pricing database (prices per 1K tokens)
 * Updated as of January 2025
 */
export const MODEL_PRICING = {
    // Anthropic Claude
    "claude-opus-4.5": {
        provider: "anthropic",
        model: "claude-opus-4.5",
        maxContextTokens: 200000,
        maxOutputTokens: 16384,
        supportsToolUse: true,
        supportsMultimodal: true,
        inputCostPer1K: 0.015,
        outputCostPer1K: 0.075,
        averageLatencyMs: 2500,
        qualityScore: 10,
        capabilities: ["analysis", "planning", "coding", "reasoning"],
    },
    "claude-sonnet-4.5": {
        provider: "anthropic",
        model: "claude-sonnet-4.5",
        maxContextTokens: 200000,
        maxOutputTokens: 16384,
        supportsToolUse: true,
        supportsMultimodal: true,
        inputCostPer1K: 0.003,
        outputCostPer1K: 0.015,
        averageLatencyMs: 1500,
        qualityScore: 9,
        capabilities: ["analysis", "categorization", "routing", "generation"],
    },
    "claude-sonnet-4": {
        provider: "anthropic",
        model: "claude-sonnet-4",
        maxContextTokens: 200000,
        maxOutputTokens: 8192,
        supportsToolUse: true,
        supportsMultimodal: true,
        inputCostPer1K: 0.003,
        outputCostPer1K: 0.015,
        averageLatencyMs: 1400,
        qualityScore: 8,
        capabilities: ["analysis", "categorization", "generation"],
    },
    "claude-haiku-4": {
        provider: "anthropic",
        model: "claude-haiku-4",
        maxContextTokens: 200000,
        maxOutputTokens: 8192,
        supportsToolUse: true,
        supportsMultimodal: false,
        inputCostPer1K: 0.0008,
        outputCostPer1K: 0.004,
        averageLatencyMs: 800,
        qualityScore: 7,
        capabilities: ["categorization", "simple", "extraction"],
    },
    // OpenAI GPT
    "gpt-4o": {
        provider: "openai",
        model: "gpt-4o",
        maxContextTokens: 128000,
        maxOutputTokens: 16384,
        supportsToolUse: true,
        supportsMultimodal: true,
        inputCostPer1K: 0.0025,
        outputCostPer1K: 0.01,
        averageLatencyMs: 1800,
        qualityScore: 9,
        capabilities: ["analysis", "vision", "generation", "coding"],
    },
    "gpt-4-turbo": {
        provider: "openai",
        model: "gpt-4-turbo",
        maxContextTokens: 128000,
        maxOutputTokens: 4096,
        supportsToolUse: true,
        supportsMultimodal: true,
        inputCostPer1K: 0.01,
        outputCostPer1K: 0.03,
        averageLatencyMs: 2000,
        qualityScore: 9,
        capabilities: ["analysis", "categorization", "generation"],
    },
    "gpt-4": {
        provider: "openai",
        model: "gpt-4",
        maxContextTokens: 8192,
        maxOutputTokens: 4096,
        supportsToolUse: true,
        supportsMultimodal: false,
        inputCostPer1K: 0.03,
        outputCostPer1K: 0.06,
        averageLatencyMs: 2200,
        qualityScore: 8,
        capabilities: ["analysis", "generation"],
    },
    "gpt-3.5-turbo": {
        provider: "openai",
        model: "gpt-3.5-turbo",
        maxContextTokens: 16385,
        maxOutputTokens: 4096,
        supportsToolUse: true,
        supportsMultimodal: false,
        inputCostPer1K: 0.0005,
        outputCostPer1K: 0.0015,
        averageLatencyMs: 800,
        qualityScore: 6,
        capabilities: ["simple", "categorization", "extraction"],
    },
    "o1": {
        provider: "openai",
        model: "o1",
        maxContextTokens: 200000,
        maxOutputTokens: 100000,
        supportsToolUse: false,
        supportsMultimodal: false,
        inputCostPer1K: 0.015,
        outputCostPer1K: 0.06,
        averageLatencyMs: 5000,
        qualityScore: 10,
        capabilities: ["reasoning", "analysis", "planning", "coding"],
    },
    "o1-mini": {
        provider: "openai",
        model: "o1-mini",
        maxContextTokens: 128000,
        maxOutputTokens: 65536,
        supportsToolUse: false,
        supportsMultimodal: false,
        inputCostPer1K: 0.003,
        outputCostPer1K: 0.012,
        averageLatencyMs: 3000,
        qualityScore: 8,
        capabilities: ["reasoning", "coding", "analysis"],
    },
    // Google Gemini
    "gemini-2.0-flash": {
        provider: "google",
        model: "gemini-2.0-flash",
        maxContextTokens: 1000000,
        maxOutputTokens: 8192,
        supportsToolUse: true,
        supportsMultimodal: true,
        inputCostPer1K: 0.0,
        outputCostPer1K: 0.0,
        averageLatencyMs: 1200,
        qualityScore: 8,
        capabilities: ["analysis", "vision", "generation", "speed"],
    },
    "gemini-1.5-pro": {
        provider: "google",
        model: "gemini-1.5-pro",
        maxContextTokens: 2000000,
        maxOutputTokens: 8192,
        supportsToolUse: true,
        supportsMultimodal: true,
        inputCostPer1K: 0.00125,
        outputCostPer1K: 0.005,
        averageLatencyMs: 2000,
        qualityScore: 8,
        capabilities: ["analysis", "vision", "long-context"],
    },
    "gemini-1.5-flash": {
        provider: "google",
        model: "gemini-1.5-flash",
        maxContextTokens: 1000000,
        maxOutputTokens: 8192,
        supportsToolUse: true,
        supportsMultimodal: true,
        inputCostPer1K: 0.000075,
        outputCostPer1K: 0.0003,
        averageLatencyMs: 1000,
        qualityScore: 7,
        capabilities: ["categorization", "simple", "speed"],
    },
    // Groq (Ultra-fast inference)
    "llama-3.3-70b": {
        provider: "groq",
        model: "llama-3.3-70b",
        maxContextTokens: 8192,
        maxOutputTokens: 8192,
        supportsToolUse: true,
        supportsMultimodal: false,
        inputCostPer1K: 0.00059,
        outputCostPer1K: 0.00079,
        averageLatencyMs: 300,
        qualityScore: 7,
        capabilities: ["speed", "simple", "categorization"],
    },
    "mixtral-8x7b": {
        provider: "groq",
        model: "mixtral-8x7b",
        maxContextTokens: 32768,
        maxOutputTokens: 32768,
        supportsToolUse: true,
        supportsMultimodal: false,
        inputCostPer1K: 0.00024,
        outputCostPer1K: 0.00024,
        averageLatencyMs: 250,
        qualityScore: 6,
        capabilities: ["speed", "simple"],
    },
    // Mistral
    "mistral-large": {
        provider: "mistral",
        model: "mistral-large",
        maxContextTokens: 128000,
        maxOutputTokens: 8192,
        supportsToolUse: true,
        supportsMultimodal: false,
        inputCostPer1K: 0.002,
        outputCostPer1K: 0.006,
        averageLatencyMs: 1500,
        qualityScore: 8,
        capabilities: ["analysis", "generation", "coding"],
    },
    "mistral-medium": {
        provider: "mistral",
        model: "mistral-medium",
        maxContextTokens: 32000,
        maxOutputTokens: 8192,
        supportsToolUse: true,
        supportsMultimodal: false,
        inputCostPer1K: 0.0027,
        outputCostPer1K: 0.0081,
        averageLatencyMs: 1200,
        qualityScore: 7,
        capabilities: ["categorization", "generation"],
    },
    "mistral-small": {
        provider: "mistral",
        model: "mistral-small",
        maxContextTokens: 32000,
        maxOutputTokens: 8192,
        supportsToolUse: true,
        supportsMultimodal: false,
        inputCostPer1K: 0.0002,
        outputCostPer1K: 0.0006,
        averageLatencyMs: 800,
        qualityScore: 6,
        capabilities: ["simple", "categorization"],
    },
};
/**
 * Cost Tracker
 */
export class CostTracker {
    entries = new Map();
    dailyCosts = new Map(); // date -> total cost
    /**
     * Calculate cost for a request
     */
    calculateCost(provider, model, promptTokens, completionTokens) {
        const modelKey = model;
        const pricing = MODEL_PRICING[modelKey];
        if (!pricing) {
            console.warn(`No pricing data for ${provider}/${model}, assuming $0`);
            return 0;
        }
        const inputCost = (promptTokens / 1000) * pricing.inputCostPer1K;
        const outputCost = (completionTokens / 1000) * pricing.outputCostPer1K;
        return inputCost + outputCost;
    }
    /**
     * Track a cost entry
     */
    trackCost(entry) {
        const cost = this.calculateCost(entry.provider, entry.model, entry.promptTokens, entry.completionTokens);
        const fullEntry = {
            ...entry,
            id: this.generateId(),
            timestamp: new Date(),
            cost,
        };
        this.entries.set(fullEntry.id, fullEntry);
        // Track daily cost
        const dateKey = fullEntry.timestamp.toISOString().split("T")[0];
        const currentDailyCost = this.dailyCosts.get(dateKey) || 0;
        this.dailyCosts.set(dateKey, currentDailyCost + cost);
        return fullEntry;
    }
    /**
     * Get total cost for a time period
     */
    getTotalCost(startDate, endDate) {
        let total = 0;
        for (const entry of this.entries.values()) {
            if (startDate && entry.timestamp < startDate)
                continue;
            if (endDate && entry.timestamp > endDate)
                continue;
            total += entry.cost;
        }
        return total;
    }
    /**
     * Get cost by provider
     */
    getCostByProvider(provider) {
        const costs = {};
        for (const entry of this.entries.values()) {
            if (provider && entry.provider !== provider)
                continue;
            const key = `${entry.provider}/${entry.model}`;
            costs[key] = (costs[key] || 0) + entry.cost;
        }
        return costs;
    }
    /**
     * Get cost by workflow
     */
    getCostByWorkflow(workflowId) {
        const costs = {};
        for (const entry of this.entries.values()) {
            if (workflowId && entry.workflowId !== workflowId)
                continue;
            if (!entry.workflowId)
                continue;
            costs[entry.workflowId] = (costs[entry.workflowId] || 0) + entry.cost;
        }
        return costs;
    }
    /**
     * Get today's cost
     */
    getTodayCost() {
        const today = new Date().toISOString().split("T")[0];
        return this.dailyCosts.get(today) || 0;
    }
    /**
     * Get cost statistics
     */
    getStatistics(startDate, endDate) {
        let totalCost = 0;
        let totalRequests = 0;
        let totalTokens = 0;
        const byProvider = {};
        const byModel = {};
        const byWorkflow = {};
        for (const entry of this.entries.values()) {
            if (startDate && entry.timestamp < startDate)
                continue;
            if (endDate && entry.timestamp > endDate)
                continue;
            totalCost += entry.cost;
            totalRequests++;
            totalTokens += entry.totalTokens;
            byProvider[entry.provider] = (byProvider[entry.provider] || 0) + entry.cost;
            byModel[entry.model] = (byModel[entry.model] || 0) + entry.cost;
            if (entry.workflowId) {
                byWorkflow[entry.workflowId] = (byWorkflow[entry.workflowId] || 0) + entry.cost;
            }
        }
        return {
            totalCost,
            totalRequests,
            totalTokens,
            avgCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
            byProvider,
            byModel,
            byWorkflow,
        };
    }
    /**
     * Export cost data
     */
    exportCostData(startDate, endDate) {
        const entries = [];
        for (const entry of this.entries.values()) {
            if (startDate && entry.timestamp < startDate)
                continue;
            if (endDate && entry.timestamp > endDate)
                continue;
            entries.push(entry);
        }
        return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    /**
     * Clear old entries (cleanup)
     */
    clearOldEntries(olderThan) {
        let count = 0;
        for (const [id, entry] of this.entries.entries()) {
            if (entry.timestamp < olderThan) {
                this.entries.delete(id);
                count++;
            }
        }
        return count;
    }
    /**
     * Generate unique ID
     */
    generateId() {
        return `cost-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
}
/**
 * Global cost tracker instance
 */
export const costTracker = new CostTracker();
//# sourceMappingURL=cost-tracker.js.map