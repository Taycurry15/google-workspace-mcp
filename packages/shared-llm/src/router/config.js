/**
 * LLM Router Configuration Presets
 *
 * Predefined configurations for common workflow types
 */
/**
 * Preset Configurations for Common Tasks
 */
export const LLM_PRESETS = {
    /**
     * Document Categorization
     * - Fast response required
     * - Low cost
     * - Simple classification task
     */
    DOCUMENT_CATEGORIZATION: {
        strategy: "cost_optimized",
        taskType: "categorization",
        budget: "low",
        latencyRequirement: "low",
    },
    /**
     * Document Analysis
     * - High quality analysis
     * - Medium latency acceptable
     * - May require tool use
     */
    DOCUMENT_ANALYSIS: {
        strategy: "balanced",
        taskType: "analysis",
        budget: "medium",
        requiresToolUse: false,
        latencyRequirement: "medium",
    },
    /**
     * Risk Analysis
     * - Best quality required
     * - Deep reasoning
     * - Higher cost acceptable
     */
    RISK_ANALYSIS: {
        strategy: "performance",
        taskType: "analysis",
        budget: "high",
        latencyRequirement: "high",
    },
    /**
     * Report Generation
     * - Balanced quality/cost
     * - Good writing capability
     * - Medium latency
     */
    REPORT_GENERATION: {
        strategy: "balanced",
        taskType: "generation",
        budget: "medium",
        latencyRequirement: "medium",
    },
    /**
     * Data Extraction
     * - Fast processing
     * - Simple extraction task
     * - Cost optimized
     */
    DATA_EXTRACTION: {
        strategy: "cost_optimized",
        taskType: "extraction",
        budget: "low",
        latencyRequirement: "low",
    },
    /**
     * Summarization
     * - Fast processing
     * - Medium quality
     * - Balanced cost
     */
    SUMMARIZATION: {
        strategy: "balanced",
        taskType: "summarization",
        budget: "low",
        latencyRequirement: "low",
    },
    /**
     * Document Routing
     * - Very fast required
     * - Simple decision
     * - Ultra low cost
     */
    DOCUMENT_ROUTING: {
        strategy: "speed",
        taskType: "routing",
        budget: "low",
        latencyRequirement: "low",
    },
    /**
     * Complex Planning
     * - Best model required
     * - Deep reasoning
     * - Cost not a concern
     */
    COMPLEX_PLANNING: {
        strategy: "performance",
        taskType: "analysis",
        budget: "unlimited",
        requiresToolUse: true,
        latencyRequirement: "high",
    },
    /**
     * Simple Task
     * - Ultra-fast
     * - Ultra-low cost
     * - Basic capability
     */
    SIMPLE_TASK: {
        strategy: "cost_optimized",
        taskType: "simple",
        budget: "low",
        latencyRequirement: "low",
    },
    /**
     * Long Context Processing
     * - Requires large context window
     * - Quality important
     * - Higher cost acceptable
     */
    LONG_CONTEXT: {
        strategy: "context_size",
        taskType: "analysis",
        budget: "high",
        contextSize: 100000,
        latencyRequirement: "high",
    },
};
/**
 * Router Configurations for Different Environments
 */
export const ROUTER_CONFIGS = {
    /**
     * Development - Favor speed and cost
     */
    DEVELOPMENT: {
        defaultProvider: "anthropic",
        defaultModel: "claude-sonnet-4.5",
        fallbackChain: [
            { provider: "anthropic", model: "claude-haiku-4" },
            { provider: "google", model: "gemini-2.0-flash" },
            { provider: "groq", model: "llama-3.3-70b" },
        ],
        enableFallback: true,
        maxRetries: 2,
        retryDelay: 500,
        enableCostTracking: true,
        enablePerformanceMonitoring: true,
    },
    /**
     * Production - Balance reliability and cost
     */
    PRODUCTION: {
        defaultProvider: "anthropic",
        defaultModel: "claude-sonnet-4.5",
        fallbackChain: [
            { provider: "anthropic", model: "claude-sonnet-4.5" },
            { provider: "openai", model: "gpt-4o" },
            { provider: "google", model: "gemini-2.0-flash" },
            { provider: "anthropic", model: "claude-haiku-4" },
        ],
        enableFallback: true,
        maxRetries: 3,
        retryDelay: 1000,
        enableCostTracking: true,
        enablePerformanceMonitoring: true,
        costLimitPerDay: 100, // $100 per day
    },
    /**
     * Cost Optimized - Minimize costs
     */
    COST_OPTIMIZED: {
        defaultProvider: "google",
        defaultModel: "gemini-2.0-flash",
        fallbackChain: [
            { provider: "google", model: "gemini-2.0-flash" },
            { provider: "groq", model: "llama-3.3-70b" },
            { provider: "openai", model: "gpt-3.5-turbo" },
            { provider: "anthropic", model: "claude-haiku-4" },
        ],
        enableFallback: true,
        maxRetries: 2,
        retryDelay: 500,
        enableCostTracking: true,
        enablePerformanceMonitoring: true,
        costLimitPerDay: 10, // $10 per day
    },
    /**
     * High Quality - Best models only
     */
    HIGH_QUALITY: {
        defaultProvider: "anthropic",
        defaultModel: "claude-opus-4.5",
        fallbackChain: [
            { provider: "anthropic", model: "claude-opus-4.5" },
            { provider: "openai", model: "o1" },
            { provider: "anthropic", model: "claude-sonnet-4.5" },
            { provider: "openai", model: "gpt-4o" },
        ],
        enableFallback: true,
        maxRetries: 3,
        retryDelay: 2000,
        enableCostTracking: true,
        enablePerformanceMonitoring: true,
    },
    /**
     * Speed Optimized - Fastest models
     */
    SPEED_OPTIMIZED: {
        defaultProvider: "groq",
        defaultModel: "llama-3.3-70b",
        fallbackChain: [
            { provider: "groq", model: "llama-3.3-70b" },
            { provider: "groq", model: "mixtral-8x7b" },
            { provider: "google", model: "gemini-2.0-flash" },
            { provider: "anthropic", model: "claude-haiku-4" },
        ],
        enableFallback: true,
        maxRetries: 2,
        retryDelay: 200,
        enableCostTracking: true,
        enablePerformanceMonitoring: true,
    },
};
/**
 * Workflow-Specific Configurations
 * Map workflow types to optimal LLM configurations
 */
export const WORKFLOW_LLM_CONFIG = {
    // Document Management
    document_submission: LLM_PRESETS.DOCUMENT_CATEGORIZATION,
    document_categorization: LLM_PRESETS.DOCUMENT_CATEGORIZATION,
    document_routing: LLM_PRESETS.DOCUMENT_ROUTING,
    document_analysis: LLM_PRESETS.DOCUMENT_ANALYSIS,
    // Deliverables
    deliverable_review: LLM_PRESETS.DOCUMENT_ANALYSIS,
    deliverable_approval: LLM_PRESETS.DOCUMENT_ANALYSIS,
    // Reporting
    weekly_status: LLM_PRESETS.REPORT_GENERATION,
    monthly_report: LLM_PRESETS.REPORT_GENERATION,
    executive_summary: LLM_PRESETS.REPORT_GENERATION,
    // Analysis
    risk_analysis: LLM_PRESETS.RISK_ANALYSIS,
    stakeholder_analysis: LLM_PRESETS.DOCUMENT_ANALYSIS,
    lessons_learned: LLM_PRESETS.DOCUMENT_ANALYSIS,
    // Planning
    program_planning: LLM_PRESETS.COMPLEX_PLANNING,
    milestone_planning: LLM_PRESETS.COMPLEX_PLANNING,
    // Simple Tasks
    notification: LLM_PRESETS.SIMPLE_TASK,
    data_update: LLM_PRESETS.SIMPLE_TASK,
    extraction: LLM_PRESETS.DATA_EXTRACTION,
};
/**
 * Get preset configuration by name
 */
export function getPreset(name) {
    return LLM_PRESETS[name];
}
/**
 * Get router configuration by environment
 */
export function getRouterConfig(env) {
    return ROUTER_CONFIGS[env];
}
/**
 * Get workflow-specific LLM configuration
 */
export function getWorkflowConfig(workflowType) {
    return WORKFLOW_LLM_CONFIG[workflowType];
}
//# sourceMappingURL=config.js.map