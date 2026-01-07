/**
 * LLM Cost Tracker
 *
 * Tracks costs across all LLM providers with detailed breakdowns
 */
import type { CostEntry, LLMProvider, LLMModel, ModelCapabilities } from "./router/types.js";
/**
 * Model pricing database (prices per 1K tokens)
 * Updated as of January 2025
 */
export declare const MODEL_PRICING: Record<string, ModelCapabilities>;
/**
 * Cost Tracker
 */
export declare class CostTracker {
    private entries;
    private dailyCosts;
    /**
     * Calculate cost for a request
     */
    calculateCost(provider: LLMProvider, model: LLMModel, promptTokens: number, completionTokens: number): number;
    /**
     * Track a cost entry
     */
    trackCost(entry: Omit<CostEntry, "id" | "timestamp" | "cost">): CostEntry;
    /**
     * Get total cost for a time period
     */
    getTotalCost(startDate?: Date, endDate?: Date): number;
    /**
     * Get cost by provider
     */
    getCostByProvider(provider?: LLMProvider): Record<string, number>;
    /**
     * Get cost by workflow
     */
    getCostByWorkflow(workflowId?: string): Record<string, number>;
    /**
     * Get today's cost
     */
    getTodayCost(): number;
    /**
     * Get cost statistics
     */
    getStatistics(startDate?: Date, endDate?: Date): {
        totalCost: number;
        totalRequests: number;
        totalTokens: number;
        avgCostPerRequest: number;
        byProvider: Record<string, number>;
        byModel: Record<string, number>;
        byWorkflow: Record<string, number>;
    };
    /**
     * Export cost data
     */
    exportCostData(startDate?: Date, endDate?: Date): CostEntry[];
    /**
     * Clear old entries (cleanup)
     */
    clearOldEntries(olderThan: Date): number;
    /**
     * Generate unique ID
     */
    private generateId;
}
/**
 * Global cost tracker instance
 */
export declare const costTracker: CostTracker;
//# sourceMappingURL=cost-tracker.d.ts.map