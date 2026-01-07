# LLM Router - Quick Start

## ✅ Build Complete!

The LLM router has been successfully built and is ready to use.

## 🚀 Next Steps

### 1. Add Your API Keys

Edit your `.env` file and add at least one API key:

```bash
# Required: At least one provider
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here
GOOGLE_API_KEY=AI-your-key-here
```

**Get API Keys:**
- **Anthropic (Claude)**: https://console.anthropic.com/
- **OpenAI (GPT)**: https://platform.openai.com/api-keys
- **Google (Gemini)**: https://aistudio.google.com/app/apikey

### 2. Test the Router

Run the test script:

```bash
node dist/test-llm-router.js
```

This will:
- Test document categorization (cost-optimized)
- Test simple tasks (ultra-fast)
- Show cost statistics
- Show performance metrics
- Demonstrate custom selection

**Expected Output:**
```
🧪 Testing LLM Router
============================================================
📋 Router Configuration:
  Environment: production
  Default Provider: anthropic
  Default Model: claude-sonnet-4.5

============================================================
Test 1: Document Categorization (Cost Optimized)
============================================================
✅ Provider: google/gemini-2.0-flash
💰 Cost: $0.000000
🔢 Tokens: 150
⏱️  Response Time: 1200ms
📝 Response Preview: This document appears to be a Risk Register...

...
✅ All tests passed!
📊 Total Tests Run: 5
💵 Total Cost: $0.002500
```

### 3. Use in Your Workflows

The router is already integrated! Your existing workflows will automatically use it.

**Example - Document Categorization:**
```typescript
// Your existing code in workflows/actions/categorize-document.ts
// Already uses the new router via the orchestrator adapter!
import { LLMOrchestrator } from "../../utils/llm/index.js";

const orchestrator = new LLMOrchestrator();
const response = await orchestrator.generate({
  taskType: "classification",
  messages: [...]
});
// ✅ This now routes to the best LLM automatically!
```

**Example - Using Router Directly:**
```typescript
import { llmRouter } from "./llm/index.js";
import { LLM_PRESETS } from "./llm/config.js";

// Document categorization (fast & cheap)
const cat = await llmRouter.complete(
  { messages: [{ role: "user", content: "Categorize: Risk.pdf" }] },
  LLM_PRESETS.DOCUMENT_CATEGORIZATION
);

// Risk analysis (high quality)
const risk = await llmRouter.complete(
  { messages: [{ role: "user", content: "Analyze this risk..." }] },
  LLM_PRESETS.RISK_ANALYSIS
);
```

### 4. Monitor Costs

```typescript
import { costTracker } from "./llm/index.js";

// Check today's cost
console.log(`Today: $${costTracker.getTodayCost()}`);

// Get detailed stats
const stats = costTracker.getStatistics();
console.log(stats.byProvider);  // Cost per provider
console.log(stats.byWorkflow);  // Cost per workflow
```

### 5. Configure for Your Needs

Edit `.env` to customize:

```bash
# Use cost-optimized config (free/cheap models)
LLM_ROUTER_ENVIRONMENT=cost_optimized

# Or high-quality config (best models)
LLM_ROUTER_ENVIRONMENT=high_quality

# Or speed-optimized (fastest models)
LLM_ROUTER_ENVIRONMENT=speed_optimized

# Set daily budget limit
LLM_COST_LIMIT_PER_DAY=50  # $50/day
```

## 📊 Available Presets

Use these for optimal results:

| Preset | Use Case | Typical Cost |
|--------|----------|--------------|
| `DOCUMENT_CATEGORIZATION` | Fast document classification | $0.0001 |
| `DOCUMENT_ROUTING` | Ultra-fast routing decisions | $0.0005 |
| `DOCUMENT_ANALYSIS` | Balanced document analysis | $0.005 |
| `RISK_ANALYSIS` | High-quality risk assessment | $0.03 |
| `REPORT_GENERATION` | Balanced report writing | $0.01 |
| `COMPLEX_PLANNING` | Best model for planning | $0.05 |
| `SIMPLE_TASK` | Cheapest for simple tasks | $0.0001 |
| `DATA_EXTRACTION` | Fast data extraction | $0.0005 |
| `SUMMARIZATION` | Quick summarization | $0.001 |
| `LONG_CONTEXT` | Large document analysis | $0.02 |

## 🎯 Multi-LLM Execution Patterns

### Pattern 1: Parallel Execution (Recommended)

Process multiple tasks simultaneously:

```typescript
const [cat, risk, report] = await Promise.all([
  llmRouter.complete({...}, LLM_PRESETS.DOCUMENT_CATEGORIZATION),
  llmRouter.complete({...}, LLM_PRESETS.RISK_ANALYSIS),
  llmRouter.complete({...}, LLM_PRESETS.REPORT_GENERATION)
]);
```

### Pattern 2: Sequential with Different Models

Use the best model for each step:

```typescript
// Step 1: Fast categorization
const category = await llmRouter.complete(
  {...},
  LLM_PRESETS.DOCUMENT_CATEGORIZATION
);

// Step 2: Deep analysis (only if needed)
if (category.requiresAnalysis) {
  const analysis = await llmRouter.complete(
    {...},
    LLM_PRESETS.RISK_ANALYSIS
  );
}
```

### Pattern 3: Cost-Aware Execution

Set budget limits per request:

```typescript
const response = await llmRouter.complete(
  {...},
  {
    strategy: "cost_optimized",
    budget: "low",
    taskType: "categorization"
  }
);
```

## 💡 Tips for Cost Optimization

1. **Use the right preset** - Don't use `RISK_ANALYSIS` for simple tasks
2. **Enable cost tracking** - Monitor usage with `costTracker`
3. **Set daily limits** - Prevent surprise bills with `LLM_COST_LIMIT_PER_DAY`
4. **Use parallel execution** - Process batches faster and cheaper
5. **Prefer Gemini for simple tasks** - It's free!

## 📚 Full Documentation

- **Setup Guide**: [LLM_ROUTER_SETUP.md](LLM_ROUTER_SETUP.md)
- **Detailed Docs**: [src/llm/README.md](src/llm/README.md)
- **PMI Framework**: [PMI/PMI_FRAMEWORK.md](PMI/PMI_FRAMEWORK.md)

## ❓ Troubleshooting

### "No providers available"
✅ Add at least one API key to `.env`

### High costs
✅ Check `costTracker.getStatistics()` to see which models are expensive
✅ Use `LLM_PRESETS.DOCUMENT_CATEGORIZATION` for simple tasks
✅ Set `LLM_COST_LIMIT_PER_DAY` in `.env`

### Slow responses
✅ Use `LLM_PRESETS.SIMPLE_TASK` or `DOCUMENT_ROUTING`
✅ Or set `LLM_ROUTER_ENVIRONMENT=speed_optimized`

### Low quality results
✅ Use `LLM_PRESETS.RISK_ANALYSIS` or `COMPLEX_PLANNING`
✅ Or set `LLM_ROUTER_ENVIRONMENT=high_quality`

## 🎉 You're Ready!

The LLM router is fully configured and ready to optimize your PMI workflows across multiple LLM providers.

**Start testing:**
```bash
node dist/test-llm-router.js
```
