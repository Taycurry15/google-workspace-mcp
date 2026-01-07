/**
 * LLM Router
 *
 * Intelligent routing and orchestration of multiple LLM providers
 * Features:
 * - Automatic model selection based on task type
 * - Cost optimization
 * - Fallback chains
 * - Retry logic
 * - Performance monitoring
 */
import { EventEmitter } from "events";
import type { LLMConfig, LLMRequest, LLMResponse, LLMSelectionCriteria, LLMRouterConfig, LLMProvider, PerformanceMetrics } from "./types.js";
/**
 * LLM Router
 */
export declare class LLMRouter extends EventEmitter {
    private config;
    private performanceMetrics;
    constructor(config?: Partial<LLMRouterConfig>);
    /**
     * Main method: Complete a request with automatic model selection
     */
    complete(request: LLMRequest, criteria?: LLMSelectionCriteria): Promise<LLMResponse>;
    /**
     * Execute request with specific config
     */
    executeWithConfig(request: LLMRequest, config: LLMConfig): Promise<LLMResponse>;
    /**
     * Select the best model based on criteria
     */
    selectModel(request: LLMRequest, criteria?: LLMSelectionCriteria): LLMConfig;
    /**
     * Select cost-optimized model
     */
    private selectCostOptimized;
    /**
     * Select best performance model
     */
    private selectBestPerformance;
    /**
     * Select balanced model (quality vs cost)
     */
    private selectBalanced;
    /**
     * Select fastest model
     */
    private selectFastest;
    /**
     * Select model with largest context window
     */
    private selectLargestContext;
    /**
     * Filter candidate models based on criteria
     */
    private filterCandidates;
    /**
     * Execute with fallback chain
     */
    private executeWithFallback;
    /**
     * Execute a single request
     */
    private executeRequest;
    /**
     * Track performance metrics
     */
    private trackPerformance;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(provider?: LLMProvider): PerformanceMetrics[];
    /**
     * Merge config with defaults
     */
    private mergeConfig;
    /**
     * Get budget threshold for cost filtering
     */
    private getBudgetThreshold;
    /**
     * Get latency threshold for speed filtering
     */
    private getLatencyThreshold;
    /**
     * Sleep utility
     */
    private sleep;
    /**
     * Update router configuration
     */
    updateConfig(config: Partial<LLMRouterConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): LLMRouterConfig;
}
/**
 * Global LLM router instance
 */
export declare const llmRouter: LLMRouter;
//# sourceMappingURL=router.d.ts.map