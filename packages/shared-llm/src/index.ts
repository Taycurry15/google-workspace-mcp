/**
 * @gw-mcp/shared-llm
 * Multi-provider LLM router with cost tracking
 *
 * Provides:
 * - LLM router with intelligent provider selection
 * - Provider implementations (Anthropic, OpenAI, Google)
 * - Cost tracking and limits
 * - Multi-step orchestration
 */

export * from "./router/index.js";
export * from "./providers/index.js";
export * from "./cost-tracker.js";
// Note: Orchestrator types are exported via router/index.js to avoid conflicts

// Version info
export const VERSION = "1.0.0";
export const PACKAGE_NAME = "@gw-mcp/shared-llm";
