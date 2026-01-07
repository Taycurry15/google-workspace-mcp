# LLM Router - Multi-Provider Intelligent Routing

A sophisticated LLM routing system that intelligently selects the best model across multiple providers (Anthropic, OpenAI, Google, Groq, Mistral) based on task requirements, cost, performance, and latency.

## Features

- ✨ **Intelligent Model Selection** - Automatically picks the best model for your task
- 💰 **Cost Tracking** - Real-time cost monitoring and budgeting
- 🔄 **Automatic Fallbacks** - Seamless failover between providers
- ⚡ **Performance Monitoring** - Track latency and error rates
- 🎯 **Task-Optimized** - Different strategies for different workloads
- 🔧 **Highly Configurable** - Presets for common use cases

## Quick Start

### Basic Usage

```typescript
import { llmRouter } from "./llm/index.js";

// Simple completion
const response = await llmRouter.complete({
  messages: [
    { role: "user", content: "Categorize this document: Project Charter v1.2" }
  ]
});

console.log(response.content);
console.log(`Cost: $${response.metadata.cost}`);
console.log(`Provider: ${response.provider}/${response.model}`);
```

### With Selection Criteria

```typescript
import { llmRouter } from "./llm/index.js";

// Cost-optimized categorization
const response = await llmRouter.complete(
  {
    messages: [
      { role: "user", content: "Extract key data from this invoice..." }
    ]
  },
  {
    strategy: "cost_optimized",
    taskType: "extraction",
    budget: "low",
    latencyRequirement: "low"
  }
);
```

### Using Presets

```typescript
import { llmRouter } from "./llm/router.js";
import { LLM_PRESETS } from "./llm/config.js";

// Document categorization (fast & cheap)
const catResponse = await llmRouter.complete(
  { messages: [...] },
  LLM_PRESETS.DOCUMENT_CATEGORIZATION
);

// Risk analysis (high quality)
const riskResponse = await llmRouter.complete(
  { messages: [...] },
  LLM_PRESETS.RISK_ANALYSIS
);

// Report generation (balanced)
const reportResponse = await llmRouter.complete(
  { messages: [...] },
  LLM_PRESETS.REPORT_GENERATION
);
```

## Selection Strategies

### 1. Cost Optimized
Picks the cheapest model that meets requirements.

```typescript
{
  strategy: "cost_optimized",
  taskType: "categorization",
  budget: "low"
}
```

**Best for:** Simple categorization, routing, data extraction

### 2. Performance
Picks the highest quality model available.

```typescript
{
  strategy: "performance",
  taskType: "analysis",
  budget: "unlimited"
}
```

**Best for:** Risk analysis, complex planning, important decisions

### 3. Balanced
Optimizes quality/cost ratio.

```typescript
{
  strategy: "balanced",
  taskType: "generation",
  budget: "medium"
}
```

**Best for:** Report generation, content creation, general analysis

### 4. Speed
Picks the fastest model.

```typescript
{
  strategy: "speed",
  taskType: "routing",
  latencyRequirement: "low"
}
```

**Best for:** Real-time applications, high-volume processing

### 5. Context Size
Picks model with largest context window.

```typescript
{
  strategy: "context_size",
  taskType: "analysis",
  contextSize: 100000
}
```

**Best for:** Long document analysis, full codebase review

## Available Presets

```typescript
import { LLM_PRESETS } from "./llm/config.js";

// All available presets:
LLM_PRESETS.DOCUMENT_CATEGORIZATION  // Fast, cheap categorization
LLM_PRESETS.DOCUMENT_ANALYSIS        // Balanced document analysis
LLM_PRESETS.RISK_ANALYSIS            // High-quality risk assessment
LLM_PRESETS.REPORT_GENERATION        // Balanced report writing
LLM_PRESETS.DATA_EXTRACTION          // Fast data extraction
LLM_PRESETS.SUMMARIZATION            // Quick summarization
LLM_PRESETS.DOCUMENT_ROUTING         // Ultra-fast routing
LLM_PRESETS.COMPLEX_PLANNING         // Best model for planning
LLM_PRESETS.SIMPLE_TASK              // Cheapest for simple tasks
LLM_PRESETS.LONG_CONTEXT             // Large context analysis
```

## Cost Tracking

### Track Costs

```typescript
import { costTracker } from "./llm/index.js";

// Get today's costs
const todayCost = costTracker.getTodayCost();
console.log(`Today's cost: $${todayCost.toFixed(4)}`);

// Get cost breakdown by provider
const byProvider = costTracker.getCostByProvider();
console.log(byProvider);
// { "anthropic/claude-sonnet-4.5": 0.45, "openai/gpt-4o": 0.32 }

// Get cost by workflow
const byWorkflow = costTracker.getCostByWorkflow();
console.log(byWorkflow);
// { "document_submission": 0.12, "risk_analysis": 0.65 }

// Get detailed statistics
const stats = costTracker.getStatistics();
console.log(`Total: $${stats.totalCost.toFixed(4)}`);
console.log(`Avg per request: $${stats.avgCostPerRequest.toFixed(6)}`);
console.log(`Total requests: ${stats.totalRequests}`);
```

### Export Cost Data

```typescript
import { costTracker } from "./llm/index.js";

// Export last 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const costData = costTracker.exportCostData(thirtyDaysAgo);

// Save to file or send to analytics
console.log(JSON.stringify(costData, null, 2));
```

## Router Configuration

### Environment-Based Config

```typescript
import { llmRouter } from "./llm/router.js";
import { ROUTER_CONFIGS } from "./llm/config.js";

// Production config (reliable, balanced)
llmRouter.updateConfig(ROUTER_CONFIGS.PRODUCTION);

// Cost-optimized config (cheapest models)
llmRouter.updateConfig(ROUTER_CONFIGS.COST_OPTIMIZED);

// High-quality config (best models only)
llmRouter.updateConfig(ROUTER_CONFIGS.HIGH_QUALITY);

// Speed config (fastest models)
llmRouter.updateConfig(ROUTER_CONFIGS.SPEED_OPTIMIZED);
```

### Custom Configuration

```typescript
import { llmRouter } from "./llm/router.js";

llmRouter.updateConfig({
  defaultProvider: "anthropic",
  defaultModel: "claude-sonnet-4.5",
  fallbackChain: [
    { provider: "anthropic", model: "claude-sonnet-4.5" },
    { provider: "openai", model: "gpt-4o" },
    { provider: "google", model: "gemini-2.0-flash" }
  ],
  enableFallback: true,
  maxRetries: 3,
  costLimitPerDay: 50  // $50 per day limit
});
```

## Workflow Integration

### In Workflow Definitions

```typescript
import { WorkflowDefinition } from "../types/workflows.js";

export const myWorkflow: WorkflowDefinition = {
  workflowId: "document_analysis",
  actions: [
    {
      actionId: "analyze_doc",
      type: "llm_task",
      config: {
        llmCriteria: {
          strategy: "balanced",
          taskType: "analysis",
          budget: "medium"
        },
        prompt: "Analyze this document..."
      }
    }
  ]
};
```

### In Action Handlers

```typescript
import { llmRouter } from "../../llm/index.js";
import { LLM_PRESETS } from "../../llm/config.js";

export async function analyzeDocument(context: ExecutionContext) {
  const response = await llmRouter.complete(
    {
      messages: [
        { role: "user", content: context.documentContent }
      ],
      metadata: {
        workflowId: context.workflowId,
        executionId: context.executionId
      }
    },
    LLM_PRESETS.DOCUMENT_ANALYSIS
  );

  return response;
}
```

## Backward Compatibility

The router includes an adapter for the old `LLMOrchestrator` interface:

```typescript
import { llmOrchestrator } from "./llm/orchestrator-adapter.js";

// Old code continues to work
const response = await llmOrchestrator.generate({
  taskType: "classification",
  priority: "normal",
  messages: [
    { role: "user", content: "Categorize this..." }
  ]
});

// But now uses the new router under the hood!
```

## Performance Monitoring

```typescript
import { llmRouter } from "./llm/index.js";

// Get performance metrics
const metrics = llmRouter.getPerformanceMetrics();

for (const metric of metrics) {
  console.log(`${metric.provider}/${metric.model}`);
  console.log(`  Avg Response: ${metric.avgResponseTime}ms`);
  console.log(`  Success Rate: ${(1 - metric.errorRate) * 100}%`);
  console.log(`  Total Requests: ${metric.totalRequests}`);
}

// Filter by provider
const anthropicMetrics = llmRouter.getPerformanceMetrics("anthropic");
```

## Advanced Usage

### Custom Selection Logic

```typescript
const response = await llmRouter.complete(
  { messages: [...] },
  {
    strategy: "custom",
    customLogic: (availableModels) => {
      // Your custom selection logic
      const model = availableModels.find(m =>
        m.model === "claude-opus-4.5" &&
        m.maxContextTokens >= 200000
      );

      return {
        provider: model!.provider,
        model: model!.model
      };
    }
  }
);
```

### Force Specific Model

```typescript
const response = await llmRouter.executeWithConfig(
  { messages: [...] },
  {
    provider: "openai",
    model: "o1",
    temperature: 1.0
  }
);
```

### Event Listening

```typescript
import { llmRouter } from "./llm/router.js";

llmRouter.on("model_selected", (data) => {
  console.log(`Selected: ${data.config.provider}/${data.config.model}`);
});

llmRouter.on("attempt_failed", (data) => {
  console.warn(`Failed: ${data.provider}/${data.model}`, data.error);
});

llmRouter.on("attempt_succeeded", (data) => {
  console.log(`Success: ${data.provider}/${data.model}`);
});
```

## Environment Variables

Set API keys in your `.env` file:

```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AI...
```

## Model Capabilities Reference

| Model | Provider | Context | Tool Use | Multimodal | Input $/1M | Output $/1M | Latency | Quality |
|-------|----------|---------|----------|------------|------------|-------------|---------|---------|
| claude-opus-4.5 | Anthropic | 200K | ✅ | ✅ | $15 | $75 | 2.5s | 10/10 |
| claude-sonnet-4.5 | Anthropic | 200K | ✅ | ✅ | $3 | $15 | 1.5s | 9/10 |
| claude-haiku-4 | Anthropic | 200K | ✅ | ❌ | $0.80 | $4 | 0.8s | 7/10 |
| gpt-4o | OpenAI | 128K | ✅ | ✅ | $2.50 | $10 | 1.8s | 9/10 |
| gpt-4-turbo | OpenAI | 128K | ✅ | ✅ | $10 | $30 | 2.0s | 9/10 |
| gpt-3.5-turbo | OpenAI | 16K | ✅ | ❌ | $0.50 | $1.50 | 0.8s | 6/10 |
| o1 | OpenAI | 200K | ❌ | ❌ | $15 | $60 | 5.0s | 10/10 |
| gemini-2.0-flash | Google | 1M | ✅ | ✅ | **FREE** | **FREE** | 1.2s | 8/10 |
| gemini-1.5-pro | Google | 2M | ✅ | ✅ | $1.25 | $5 | 2.0s | 8/10 |
| llama-3.3-70b | Groq | 8K | ✅ | ❌ | $0.59 | $0.79 | 0.3s | 7/10 |

## Best Practices

1. **Use Presets** - Start with presets for common tasks
2. **Monitor Costs** - Check cost statistics regularly
3. **Set Budgets** - Use `costLimitPerDay` in production
4. **Enable Fallbacks** - Always have backup providers
5. **Track Workflows** - Pass `workflowId` in metadata for cost attribution
6. **Tune for Your Use Case** - Adjust strategies based on your requirements

## Examples for PMI Workflows

```typescript
import { llmRouter } from "./llm/index.js";
import { LLM_PRESETS } from "./llm/config.js";

// Document Categorization (fast, cheap)
const cat = await llmRouter.complete(
  { messages: [{ role: "user", content: "Categorize: Risk Register v2.3" }] },
  LLM_PRESETS.DOCUMENT_CATEGORIZATION
);

// Risk Analysis (high quality)
const risk = await llmRouter.complete(
  { messages: [{ role: "user", content: "Analyze risk: Currency volatility..." }] },
  LLM_PRESETS.RISK_ANALYSIS
);

// Weekly Status Report (balanced)
const report = await llmRouter.complete(
  { messages: [{ role: "user", content: "Generate weekly status..." }] },
  LLM_PRESETS.REPORT_GENERATION
);

// Stakeholder Analysis (medium quality, medium cost)
const stakeholder = await llmRouter.complete(
  { messages: [{ role: "user", content: "Analyze stakeholder: Minister..." }] },
  LLM_PRESETS.DOCUMENT_ANALYSIS
);
```

## License

MIT
