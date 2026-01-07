# LLM Router Setup Guide

## Overview

The LLM Router has been successfully implemented and integrated into your Google Workspace MCP server. It provides intelligent multi-provider LLM routing with cost tracking, automatic fallbacks, and performance monitoring.

## Platform Recommendation

**✅ Recommended Platform: Your Current MCP + New LLM Router**

You should continue using your current MCP server infrastructure with the newly implemented LLM router. Here's why:

1. **Already Built** - No need to migrate to another platform
2. **TypeScript Native** - Fully type-safe and integrated
3. **Multi-Provider** - Works with Anthropic, OpenAI, Google, Groq, Mistral
4. **Cost Optimized** - Automatic cost tracking and budget limits
5. **PMI Framework Ready** - Pre-configured for your workflows

### Alternative Platforms (if you want to explore)
- **n8n** - If you prefer visual workflow builder
- **Temporal** - For enterprise-grade orchestration
- **LangSmith** - Add for observability (can use alongside current setup)

## Quick Setup

### 1. Install Dependencies (Already Done ✅)

All required dependencies are already in your `package.json`:
- `@anthropic-ai/sdk` - Anthropic Claude
- `openai` - OpenAI GPT
- `@google/generative-ai` - Google Gemini

### 2. Configure API Keys

Update your `.env` file with API keys:

```bash
# Required: At least one provider
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AI...

# Optional: Router configuration
LLM_ROUTER_ENVIRONMENT=production
LLM_DEFAULT_PROVIDER=anthropic
LLM_DEFAULT_MODEL=claude-sonnet-4.5
LLM_ENABLE_FALLBACK=true
LLM_ENABLE_COST_TRACKING=true
LLM_COST_LIMIT_PER_DAY=100
```

### 3. Build the Project

```bash
npm run build
```

### 4. Test the Router

Create a test file `test-router.ts`:

```typescript
import { llmRouter, costTracker } from "./src/llm/index.js";
import { LLM_PRESETS } from "./src/llm/config.js";

async function testRouter() {
  // Test document categorization (fast & cheap)
  const response = await llmRouter.complete(
    {
      messages: [
        { role: "user", content: "Categorize this document: Risk Register v1.2.pdf" }
      ]
    },
    LLM_PRESETS.DOCUMENT_CATEGORIZATION
  );

  console.log("Response:", response.content);
  console.log(`Provider: ${response.provider}/${response.model}`);
  console.log(`Cost: $${response.metadata?.cost.toFixed(6)}`);
  console.log(`Tokens: ${response.usage.totalTokens}`);

  // Check total costs
  const todayCost = costTracker.getTodayCost();
  console.log(`\nToday's total cost: $${todayCost.toFixed(4)}`);
}

testRouter();
```

Build and run:
```bash
npm run build
node dist/test-router.js
```

## Usage in Your Workflows

### Example: Document Submission Workflow

The router is already integrated via the orchestrator adapter. Your existing code will automatically use the new router:

```typescript
// In: src/workflows/actions/categorize-document.ts
import { LLMOrchestrator } from "../../utils/llm/index.js";

const orchestrator = new LLMOrchestrator();
const response = await orchestrator.generate({
  taskType: "classification",
  priority: "normal",
  messages: [...]
});

// This now uses the new router under the hood! ✅
```

### Example: Using Router Directly

For new workflows, use the router directly:

```typescript
import { llmRouter } from "../llm/index.js";
import { LLM_PRESETS } from "../llm/config.js";

// Fast categorization
const cat = await llmRouter.complete(
  { messages: [{ role: "user", content: "..." }] },
  LLM_PRESETS.DOCUMENT_CATEGORIZATION
);

// High-quality risk analysis
const risk = await llmRouter.complete(
  { messages: [{ role: "user", content: "..." }] },
  LLM_PRESETS.RISK_ANALYSIS
);
```

## Cost Management

### Monitor Costs

```typescript
import { costTracker } from "./llm/index.js";

// Get today's cost
console.log(`Today: $${costTracker.getTodayCost()}`);

// Get cost breakdown
const stats = costTracker.getStatistics();
console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Avg per request: $${stats.avgCostPerRequest.toFixed(6)}`);
console.log(`By provider:`, stats.byProvider);
console.log(`By workflow:`, stats.byWorkflow);
```

### Set Budget Limits

In your `.env`:
```bash
LLM_COST_LIMIT_PER_DAY=50  # $50 daily limit
```

Or in code:
```typescript
import { llmRouter } from "./llm/router.js";

llmRouter.updateConfig({
  costLimitPerDay: 50
});
```

## Workflow-Specific Configurations

The router includes presets optimized for your PMI workflows:

| Workflow Type | Preset | Strategy | Expected Cost/Request |
|---------------|--------|----------|----------------------|
| Document Categorization | `DOCUMENT_CATEGORIZATION` | Cost Optimized | $0.0001 - $0.001 |
| Document Routing | `DOCUMENT_ROUTING` | Speed | $0.0001 - $0.0005 |
| Document Analysis | `DOCUMENT_ANALYSIS` | Balanced | $0.001 - $0.01 |
| Risk Analysis | `RISK_ANALYSIS` | Performance | $0.01 - $0.05 |
| Report Generation | `REPORT_GENERATION` | Balanced | $0.005 - $0.02 |
| Complex Planning | `COMPLEX_PLANNING` | Performance | $0.02 - $0.10 |

## Multi-LLM Execution Strategies

### Strategy 1: Parallel Execution (Recommended)

Run independent tasks in parallel across different LLMs:

```typescript
async function processDocuments(docs: string[]) {
  const results = await Promise.all(
    docs.map(doc =>
      llmRouter.complete(
        { messages: [{ role: "user", content: doc }] },
        LLM_PRESETS.DOCUMENT_CATEGORIZATION
      )
    )
  );
  return results;
}
```

### Strategy 2: Task-Specific Routing

Use different LLMs for different task types:

```typescript
// Fast categorization → Gemini (free) or GPT-3.5 (cheap)
const category = await llmRouter.complete(
  { messages: [...] },
  LLM_PRESETS.DOCUMENT_CATEGORIZATION
);

// Deep analysis → Claude Opus or GPT-4
const analysis = await llmRouter.complete(
  { messages: [...] },
  LLM_PRESETS.RISK_ANALYSIS
);

// Report writing → Claude Sonnet or GPT-4o (balanced)
const report = await llmRouter.complete(
  { messages: [...] },
  LLM_PRESETS.REPORT_GENERATION
);
```

### Strategy 3: Fallback Chain

The router automatically falls back to alternative providers:

```typescript
llmRouter.updateConfig({
  fallbackChain: [
    { provider: "anthropic", model: "claude-sonnet-4.5" },  // Try first
    { provider: "openai", model: "gpt-4o" },                 // Fallback 1
    { provider: "google", model: "gemini-2.0-flash" },       // Fallback 2
    { provider: "anthropic", model: "claude-haiku-4" }       // Fallback 3
  ]
});
```

## Performance Monitoring

```typescript
import { llmRouter } from "./llm/router.js";

// Get performance metrics
const metrics = llmRouter.getPerformanceMetrics();

for (const m of metrics) {
  console.log(`${m.provider}/${m.model}:`);
  console.log(`  Avg Response: ${m.avgResponseTime}ms`);
  console.log(`  Success Rate: ${((1 - m.errorRate) * 100).toFixed(1)}%`);
  console.log(`  Total Requests: ${m.totalRequests}`);
}
```

## Files Created

The following files were created for the LLM router:

```
src/llm/
├── types.ts                    # Type definitions
├── cost-tracker.ts            # Cost tracking and monitoring
├── providers.ts               # Provider adapters (Anthropic, OpenAI, Google)
├── router.ts                  # Main router with intelligent selection
├── config.ts                  # Presets and configurations
├── orchestrator-adapter.ts    # Backward compatibility adapter
├── index.ts                   # Exports
└── README.md                  # Detailed documentation
```

## Next Steps

1. **Test the Router** - Run the test script above
2. **Monitor Costs** - Check cost tracking after a few requests
3. **Optimize Presets** - Adjust presets based on your actual usage
4. **Set Budgets** - Configure daily cost limits
5. **Review Analytics** - Analyze which models work best for which tasks

## Support & Documentation

- **Detailed Docs**: [src/llm/README.md](src/llm/README.md)
- **Type Definitions**: [src/llm/types.ts](src/llm/types.ts)
- **Configuration**: [src/llm/config.ts](src/llm/config.ts)
- **Examples**: See README.md for comprehensive examples

## Recommended Model Distribution for Your PMI Framework

Based on your workflow types:

**70% of requests - Low Cost Models:**
- Document categorization: Gemini 2.0 Flash (FREE) or Claude Haiku
- Document routing: Groq Llama 3.3 (ultra-fast) or Gemini Flash
- Simple updates: GPT-3.5 Turbo or Claude Haiku

**25% of requests - Balanced Models:**
- Document analysis: Claude Sonnet 4.5 or GPT-4o
- Report generation: Claude Sonnet 4.5
- Deliverable reviews: GPT-4o or Claude Sonnet

**5% of requests - Premium Models:**
- Risk analysis: Claude Opus 4.5 or GPT-4
- Complex planning: Claude Opus 4.5 or O1
- Executive summaries: Claude Opus 4.5

**Estimated Monthly Cost (10,000 requests):**
- Low tier (7,000 req × $0.0005 avg): $3.50
- Mid tier (2,500 req × $0.005 avg): $12.50
- High tier (500 req × $0.03 avg): $15.00
- **Total: ~$31/month**

## Troubleshooting

### Issue: "No providers available"
**Solution:** Check that at least one API key is set in `.env`

### Issue: High costs
**Solution:**
1. Check `costTracker.getStatistics()` to see which models are expensive
2. Adjust presets to use cheaper models
3. Set `LLM_COST_LIMIT_PER_DAY` in `.env`

### Issue: Slow responses
**Solution:** Use `ROUTER_CONFIGS.SPEED_OPTIMIZED` or presets with `latencyRequirement: "low"`

### Issue: Low quality results
**Solution:** Use `ROUTER_CONFIGS.HIGH_QUALITY` or increase budget in selection criteria

---

**The LLM Router is now ready to use! 🎉**
