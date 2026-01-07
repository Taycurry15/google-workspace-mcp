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
import { providerFactory } from "./providers.js";
import { costTracker, MODEL_PRICING } from "../cost-tracker.js";
/**
 * Default Router Configuration
 */
const DEFAULT_ROUTER_CONFIG = {
    defaultProvider: "anthropic",
    defaultModel: "claude-sonnet-4.5",
    fallbackChain: [
        { provider: "anthropic", model: "claude-sonnet-4.5" },
        { provider: "openai", model: "gpt-4o" },
        { provider: "google", model: "gemini-2.0-flash" },
    ],
    enableFallback: true,
    maxRetries: 3,
    retryDelay: 1000,
    enableCostTracking: true,
    enablePerformanceMonitoring: true,
};
/**
 * LLM Router
 */
export class LLMRouter extends EventEmitter {
    config;
    performanceMetrics = new Map();
    constructor(config) {
        super();
        this.config = { ...DEFAULT_ROUTER_CONFIG, ...config };
    }
    /**
     * Main method: Complete a request with automatic model selection
     */
    async complete(request, criteria) {
        // Select the best model for this request
        const selectedConfig = this.selectModel(request, criteria);
        this.emit("model_selected", {
            config: selectedConfig,
            criteria,
            request: request.metadata,
        });
        // Execute with fallback chain
        return this.executeWithFallback(request, selectedConfig);
    }
    /**
     * Execute request with specific config
     */
    async executeWithConfig(request, config) {
        return this.executeWithFallback(request, config);
    }
    /**
     * Select the best model based on criteria
     */
    selectModel(request, criteria) {
        // Use explicitly provided config if available
        if (request.config) {
            return this.mergeConfig(request.config);
        }
        // No criteria - use default
        if (!criteria) {
            return {
                provider: this.config.defaultProvider,
                model: this.config.defaultModel,
            };
        }
        // Custom logic override
        if (criteria.customLogic) {
            const capabilities = Object.values(MODEL_PRICING);
            return criteria.customLogic(capabilities);
        }
        // Select based on strategy
        switch (criteria.strategy) {
            case "cost_optimized":
                return this.selectCostOptimized(request, criteria);
            case "performance":
                return this.selectBestPerformance(request, criteria);
            case "balanced":
                return this.selectBalanced(request, criteria);
            case "speed":
                return this.selectFastest(request, criteria);
            case "context_size":
                return this.selectLargestContext(request, criteria);
            default:
                return {
                    provider: this.config.defaultProvider,
                    model: this.config.defaultModel,
                };
        }
    }
    /**
     * Select cost-optimized model
     */
    selectCostOptimized(request, criteria) {
        const candidates = this.filterCandidates(criteria);
        // Sort by cost (input + output average)
        candidates.sort((a, b) => {
            const aCost = (a.inputCostPer1K + a.outputCostPer1K) / 2;
            const bCost = (b.inputCostPer1K + b.outputCostPer1K) / 2;
            return aCost - bCost;
        });
        const selected = candidates[0];
        return {
            provider: selected.provider,
            model: selected.model,
        };
    }
    /**
     * Select best performance model
     */
    selectBestPerformance(request, criteria) {
        const candidates = this.filterCandidates(criteria);
        // Sort by quality score
        candidates.sort((a, b) => b.qualityScore - a.qualityScore);
        const selected = candidates[0];
        return {
            provider: selected.provider,
            model: selected.model,
        };
    }
    /**
     * Select balanced model (quality vs cost)
     */
    selectBalanced(request, criteria) {
        const candidates = this.filterCandidates(criteria);
        // Calculate balance score (quality / cost ratio)
        const scored = candidates.map((model) => {
            const avgCost = (model.inputCostPer1K + model.outputCostPer1K) / 2;
            const score = model.qualityScore / Math.max(avgCost, 0.0001);
            return { model, score };
        });
        scored.sort((a, b) => b.score - a.score);
        const selected = scored[0].model;
        return {
            provider: selected.provider,
            model: selected.model,
        };
    }
    /**
     * Select fastest model
     */
    selectFastest(request, criteria) {
        const candidates = this.filterCandidates(criteria);
        // Sort by latency
        candidates.sort((a, b) => a.averageLatencyMs - b.averageLatencyMs);
        const selected = candidates[0];
        return {
            provider: selected.provider,
            model: selected.model,
        };
    }
    /**
     * Select model with largest context window
     */
    selectLargestContext(request, criteria) {
        const candidates = this.filterCandidates(criteria);
        // Sort by context size
        candidates.sort((a, b) => b.maxContextTokens - a.maxContextTokens);
        const selected = candidates[0];
        return {
            provider: selected.provider,
            model: selected.model,
        };
    }
    /**
     * Filter candidate models based on criteria
     */
    filterCandidates(criteria) {
        let candidates = Object.values(MODEL_PRICING);
        // Filter by task type
        if (criteria.taskType) {
            candidates = candidates.filter((model) => model.capabilities.includes(criteria.taskType));
        }
        // Filter by context size requirement
        if (criteria.contextSize) {
            candidates = candidates.filter((model) => model.maxContextTokens >= criteria.contextSize);
        }
        // Filter by budget
        if (criteria.budget) {
            const maxCost = this.getBudgetThreshold(criteria.budget);
            candidates = candidates.filter((model) => {
                const avgCost = (model.inputCostPer1K + model.outputCostPer1K) / 2;
                return avgCost <= maxCost;
            });
        }
        // Filter by tool use requirement
        if (criteria.requiresToolUse) {
            candidates = candidates.filter((model) => model.supportsToolUse);
        }
        // Filter by multimodal requirement
        if (criteria.requiresMultimodal) {
            candidates = candidates.filter((model) => model.supportsMultimodal);
        }
        // Filter by latency requirement
        if (criteria.latencyRequirement) {
            const maxLatency = this.getLatencyThreshold(criteria.latencyRequirement);
            candidates = candidates.filter((model) => model.averageLatencyMs <= maxLatency);
        }
        // If no candidates match, return all (fallback)
        if (candidates.length === 0) {
            console.warn("No models match criteria, using all models");
            return Object.values(MODEL_PRICING);
        }
        return candidates;
    }
    /**
     * Execute with fallback chain
     */
    async executeWithFallback(request, config) {
        const fallbackChain = this.config.enableFallback
            ? [config, ...this.config.fallbackChain.filter((c) => c.model !== config.model)]
            : [config];
        let lastError = null;
        for (const fallbackConfig of fallbackChain) {
            try {
                this.emit("attempt_started", {
                    provider: fallbackConfig.provider,
                    model: fallbackConfig.model,
                });
                const response = await this.executeRequest(request, fallbackConfig);
                this.emit("attempt_succeeded", {
                    provider: fallbackConfig.provider,
                    model: fallbackConfig.model,
                    response,
                });
                return response;
            }
            catch (error) {
                lastError = error;
                this.emit("attempt_failed", {
                    provider: fallbackConfig.provider,
                    model: fallbackConfig.model,
                    error,
                });
                // If error is not retryable and we have fallbacks, try next one
                if (!error.retryable && fallbackChain.length > 1) {
                    console.warn(`Non-retryable error from ${fallbackConfig.provider}/${fallbackConfig.model}, trying fallback`);
                    continue;
                }
                // If retryable, retry with exponential backoff
                if (error.retryable) {
                    for (let i = 0; i < this.config.maxRetries; i++) {
                        const delay = this.config.retryDelay * Math.pow(2, i);
                        await this.sleep(delay);
                        try {
                            const response = await this.executeRequest(request, fallbackConfig);
                            return response;
                        }
                        catch (retryError) {
                            lastError = retryError;
                        }
                    }
                }
            }
        }
        // All fallbacks failed
        throw lastError || new Error("All LLM providers failed");
    }
    /**
     * Execute a single request
     */
    async executeRequest(request, config) {
        const startTime = Date.now();
        // Get provider
        const provider = providerFactory.getProvider(config.provider, config.apiKey);
        // Merge config with defaults
        const fullConfig = this.mergeConfig(config);
        // Execute request
        const response = await provider.complete(request, fullConfig);
        const responseTime = Date.now() - startTime;
        // Track cost
        if (this.config.enableCostTracking) {
            const costEntry = costTracker.trackCost({
                provider: config.provider,
                model: config.model,
                promptTokens: response.usage.promptTokens,
                completionTokens: response.usage.completionTokens,
                totalTokens: response.usage.totalTokens,
                requestType: request.metadata?.requestType || "unknown",
                workflowId: request.metadata?.workflowId,
                executionId: request.metadata?.executionId,
                metadata: request.metadata,
            });
            response.metadata = {
                requestId: response.metadata?.requestId,
                responseTime: response.metadata?.responseTime || responseTime,
                cost: costEntry.cost,
                ...response.metadata,
            };
        }
        // Track performance
        if (this.config.enablePerformanceMonitoring) {
            this.trackPerformance(config.provider, config.model, responseTime, true);
        }
        return response;
    }
    /**
     * Track performance metrics
     */
    trackPerformance(provider, model, responseTime, success) {
        const key = `${provider}/${model}`;
        let metrics = this.performanceMetrics.get(key);
        if (!metrics) {
            metrics = {
                provider,
                model,
                avgResponseTime: 0,
                p50ResponseTime: 0,
                p95ResponseTime: 0,
                p99ResponseTime: 0,
                errorRate: 0,
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
            };
            this.performanceMetrics.set(key, metrics);
        }
        metrics.totalRequests++;
        if (success) {
            metrics.successfulRequests++;
        }
        else {
            metrics.failedRequests++;
        }
        // Update average response time
        metrics.avgResponseTime =
            (metrics.avgResponseTime * (metrics.totalRequests - 1) + responseTime) /
                metrics.totalRequests;
        // Update error rate
        metrics.errorRate = metrics.failedRequests / metrics.totalRequests;
    }
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(provider) {
        const metrics = Array.from(this.performanceMetrics.values());
        if (provider) {
            return metrics.filter((m) => m.provider === provider);
        }
        return metrics;
    }
    /**
     * Merge config with defaults
     */
    mergeConfig(config) {
        return {
            provider: config.provider || this.config.defaultProvider,
            model: config.model || this.config.defaultModel,
            temperature: config.temperature ?? 1.0,
            maxTokens: config.maxTokens ?? 4096,
            topP: config.topP,
            topK: config.topK,
            stopSequences: config.stopSequences,
            presencePenalty: config.presencePenalty,
            frequencyPenalty: config.frequencyPenalty,
            timeout: config.timeout,
            apiKey: config.apiKey,
            baseURL: config.baseURL,
        };
    }
    /**
     * Get budget threshold for cost filtering
     */
    getBudgetThreshold(budget) {
        switch (budget) {
            case "low":
                return 0.001; // $0.001 per 1K tokens
            case "medium":
                return 0.005; // $0.005 per 1K tokens
            case "high":
                return 0.02; // $0.02 per 1K tokens
            case "unlimited":
                return Infinity;
        }
    }
    /**
     * Get latency threshold for speed filtering
     */
    getLatencyThreshold(requirement) {
        switch (requirement) {
            case "low":
                return 500; // 500ms
            case "medium":
                return 2000; // 2s
            case "high":
                return 5000; // 5s
        }
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Update router configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        this.emit("config_updated", this.config);
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
/**
 * Global LLM router instance
 */
export const llmRouter = new LLMRouter();
//# sourceMappingURL=router.js.map