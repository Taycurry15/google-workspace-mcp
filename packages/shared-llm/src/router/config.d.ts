/**
 * LLM Router Configuration Presets
 *
 * Predefined configurations for common workflow types
 */
import type { LLMSelectionCriteria, LLMRouterConfig } from "./types.js";
/**
 * Preset Configurations for Common Tasks
 */
export declare const LLM_PRESETS: {
    /**
     * Document Categorization
     * - Fast response required
     * - Low cost
     * - Simple classification task
     */
    DOCUMENT_CATEGORIZATION: LLMSelectionCriteria;
    /**
     * Document Analysis
     * - High quality analysis
     * - Medium latency acceptable
     * - May require tool use
     */
    DOCUMENT_ANALYSIS: LLMSelectionCriteria;
    /**
     * Risk Analysis
     * - Best quality required
     * - Deep reasoning
     * - Higher cost acceptable
     */
    RISK_ANALYSIS: LLMSelectionCriteria;
    /**
     * Report Generation
     * - Balanced quality/cost
     * - Good writing capability
     * - Medium latency
     */
    REPORT_GENERATION: LLMSelectionCriteria;
    /**
     * Data Extraction
     * - Fast processing
     * - Simple extraction task
     * - Cost optimized
     */
    DATA_EXTRACTION: LLMSelectionCriteria;
    /**
     * Summarization
     * - Fast processing
     * - Medium quality
     * - Balanced cost
     */
    SUMMARIZATION: LLMSelectionCriteria;
    /**
     * Document Routing
     * - Very fast required
     * - Simple decision
     * - Ultra low cost
     */
    DOCUMENT_ROUTING: LLMSelectionCriteria;
    /**
     * Complex Planning
     * - Best model required
     * - Deep reasoning
     * - Cost not a concern
     */
    COMPLEX_PLANNING: LLMSelectionCriteria;
    /**
     * Simple Task
     * - Ultra-fast
     * - Ultra-low cost
     * - Basic capability
     */
    SIMPLE_TASK: LLMSelectionCriteria;
    /**
     * Long Context Processing
     * - Requires large context window
     * - Quality important
     * - Higher cost acceptable
     */
    LONG_CONTEXT: LLMSelectionCriteria;
};
/**
 * Router Configurations for Different Environments
 */
export declare const ROUTER_CONFIGS: {
    /**
     * Development - Favor speed and cost
     */
    DEVELOPMENT: LLMRouterConfig;
    /**
     * Production - Balance reliability and cost
     */
    PRODUCTION: LLMRouterConfig;
    /**
     * Cost Optimized - Minimize costs
     */
    COST_OPTIMIZED: LLMRouterConfig;
    /**
     * High Quality - Best models only
     */
    HIGH_QUALITY: LLMRouterConfig;
    /**
     * Speed Optimized - Fastest models
     */
    SPEED_OPTIMIZED: LLMRouterConfig;
};
/**
 * Workflow-Specific Configurations
 * Map workflow types to optimal LLM configurations
 */
export declare const WORKFLOW_LLM_CONFIG: {
    document_submission: LLMSelectionCriteria;
    document_categorization: LLMSelectionCriteria;
    document_routing: LLMSelectionCriteria;
    document_analysis: LLMSelectionCriteria;
    deliverable_review: LLMSelectionCriteria;
    deliverable_approval: LLMSelectionCriteria;
    weekly_status: LLMSelectionCriteria;
    monthly_report: LLMSelectionCriteria;
    executive_summary: LLMSelectionCriteria;
    risk_analysis: LLMSelectionCriteria;
    stakeholder_analysis: LLMSelectionCriteria;
    lessons_learned: LLMSelectionCriteria;
    program_planning: LLMSelectionCriteria;
    milestone_planning: LLMSelectionCriteria;
    notification: LLMSelectionCriteria;
    data_update: LLMSelectionCriteria;
    extraction: LLMSelectionCriteria;
};
/**
 * Get preset configuration by name
 */
export declare function getPreset(name: keyof typeof LLM_PRESETS): LLMSelectionCriteria;
/**
 * Get router configuration by environment
 */
export declare function getRouterConfig(env: keyof typeof ROUTER_CONFIGS): LLMRouterConfig;
/**
 * Get workflow-specific LLM configuration
 */
export declare function getWorkflowConfig(workflowType: string): LLMSelectionCriteria | undefined;
//# sourceMappingURL=config.d.ts.map