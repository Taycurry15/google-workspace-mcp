# LLM Router Architecture

Multi-provider intelligent LLM routing with cost optimization, automatic fallbacks, and performance monitoring.

**Last Updated:** 2026-01-05

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Provider Support](#provider-support)
4. [Routing Strategies](#routing-strategies)
5. [Cost Tracking](#cost-tracking)
6. [Configuration](#configuration)
7. [Usage Examples](#usage-examples)

---

## Overview

The LLM Router is a sophisticated orchestration layer that intelligently routes requests to the optimal LLM provider based on:
- **Task requirements** (categorization, analysis, generation)
- **Cost constraints** (budget limits, cost optimization)
- **Performance needs** (latency, quality, context size)
- **Availability** (automatic fallback on failure)

### Key Features

- ✨ **5 Provider Support** - Anthropic, Google, OpenAI, Groq, Mistral
- 💰 **Real-Time Cost Tracking** - Track spend per provider, workflow, and day
- 🎯 **10+ Task-Optimized Presets** - Pre-configured for common use cases
- 🔄 **Automatic Fallbacks** - Seamless failover between providers
- ⚡ **Performance Monitoring** - Latency tracking and error rates
- 🔧 **Flexible Configuration** - Environment-based or per-request settings

---

## Architecture Diagram

### Request Flow

```
                    ┌──────────────┐
                    │ LLM Request  │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  LLM Router  │
                    └──────┬───────┘
                           │
                           ▼
                  ┌────────────────────┐
                  │ Selection Strategy │
                  └────┬───┬───┬───┬───┘
                       │   │   │   │
       ┌───────────────┼───┼───┼───┼───────────────┐
       │               │   │   │   │               │
       ▼               ▼   ▼   ▼   ▼               ▼
┌────────────┐  ┌────────┐ │ │ │ ┌────────┐  ┌────────────┐
│Cost        │  │Quality │ │ │ │ │Latency │  │Context     │
│Optimized   │  │Rank    │ │ │ │ │Rank    │  │Size Rank   │
│(Calculate  │  │(Rank by│ │ │ │ │(Rank by│  │(Rank by    │
│ Estimates) │  │Quality)│ │ │ │ │Latency)│  │ Window)    │
└─────┬──────┘  └───┬────┘ │ │ │ └───┬────┘  └─────┬──────┘
      │             │      │ │ │     │             │
      │             │  ┌───┘ │ └───┐ │             │
      │             │  │ Balanced  │ │             │
      │             │  │(Quality/  │ │             │
      │             │  │  Cost)    │ │             │
      │             │  └─────┬─────┘ │             │
      │             │        │       │             │
      └─────────────┴────────┴───────┴─────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Select Provider │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Within Budget?  │
                  └────┬────────┬───┘
                       │        │
                   YES │        │ NO
                       │        │
                       ▼        ▼
              ┌────────────┐  ┌──────────────┐
              │  Execute   │  │ Try Next     │
              │  Request   │  │ Provider     │
              └──┬─────┬───┘  │ (Fallback)   │
                 │     │      └──────┬───────┘
          Success│     │Error        │
                 │     └─────────────┘
                 │
                 ▼
         ┌───────────────┐
         │ Track Cost &  │
         │  Performance  │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │Return Response│
         └───────────────┘
```

### Multi-Provider Routing

```
REQUEST:                    ROUTER:                  PROVIDER SELECTION:
────────                    ───────                  ──────────────────

┌──────────────┐           ┌─────────────┐
│  Task Type:  │           │             │         ┌─────────────────────┐
│Categorization│──────────►│             │────────►│ Anthropic Claude    │
└──────────────┘           │             │         │ Claude 3.5 Sonnet   │
                           │  LLM Router │         │ Quality: ⭐⭐⭐⭐⭐   │
┌──────────────┐           │             │         │ Cost: $$$           │
│  Criteria:   │           │             │         └─────────────────────┘
│Cost Optimized│──────────►│             │
└──────────────┘           │             │         ┌─────────────────────┐
                           │             │────────►│ Google Gemini       │
                           │             │  ✓      │ Gemini 1.5 Flash    │
                           │             │SELECTED │ Quality: ⭐⭐⭐⭐     │
                           │             │         │ Cost: $ FREE        │
                           │             │         └──────────┬──────────┘
                           │             │                    │
                           │             │         ┌─────────────────────┐
                           │             │────────►│ OpenAI GPT          │
                           │             │         │ GPT-4o Mini         │
                           │             │         │ Quality: ⭐⭐⭐⭐     │
                           │             │         │ Cost: $$            │
                           │             │         └─────────────────────┘
                           │             │
                           │             │         ┌─────────────────────┐
                           │             │────────►│ Groq Llama          │
                           │             │         │ Llama 3 70B         │
                           │             │         │ Quality: ⭐⭐⭐      │
                           │             │         │ Cost: $$            │
                           └─────────────┘         └─────────────────────┘

                                                   ┌─────────────────────┐
                                                   │ Mistral Large       │
                                                   │ Large 2             │
                                                   │ Quality: ⭐⭐⭐⭐    │
                                                   │ Cost: $$            │
                                                   └─────────────────────┘


                           COST TRACKING:
                           ──────────────

                                │ Selected: Gemini
                                ▼
                           ┌─────────────┐
                           │Cost Tracker │
                           └──────┬──────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
            ┌────────────┐ ┌────────────┐ ┌────────────┐
            │Daily Budget│ │Statistics: │ │Per Workflow│
            │  $10.00    │ │Per Provider│ │  Tracking  │
            └────────────┘ └────────────┘ └────────────┘

Routing Logic:
  Analysis Tasks     → Anthropic Claude (highest quality)
  Categorization     → Google Gemini (free, fast)
  General Tasks      → OpenAI GPT (balanced)
  Speed Critical     → Groq (ultra-fast)
  Open Source Prefer → Mistral
```

### Fallback Chain

```
                        ┌─────────────────┐
                        │ Initial Request │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │ Select Primary │
                        └────┬─────┬─────┘
                             │     │
            ┌────────────────┤     └──────────────┐
            │                │                    │
            ▼                ▼                    ▼
      Cost Optimized    High Quality          Balanced
            │                │                    │
            ▼                ▼                    ▼
       ┌─────────┐      ┌─────────┐        ┌─────────┐
       │ Gemini  │      │ Claude  │        │   GPT   │
       │ Flash   │      │ Sonnet  │        │  4o     │
       └────┬────┘      └────┬────┘        └────┬────┘
            │                │                   │
            │ Execute        │ Execute           │ Execute
            │                │                   │
       ┌────┴─────┐     ┌────┴─────┐       ┌────┴─────┐
       │          │     │          │       │          │
       ✓          ✗     ✓          ✗       ✓          ✗
    Success    Error  Success   Error   Success    Error
       │          │     │          │       │          │
       │          │     │          │       │          │
       │    ┌─────┴─────┘          │       │          │
       │    │ Fallback to          │       │          │
       │    │    GPT               │       │          │
       │    │                      │       │          │
       │    └──────────────────────┼───────┘          │
       │                           │                  │
       │    ┌──────────────────────┘                  │
       │    │ Fallback to                             │
       │    │   Gemini                                │
       │    │                                         │
       │    └─────────────────────────────────────────┤
       │                                              │
       │                          Fallback to Claude  │
       │                                   │          │
       │                         ┌─────────┘          │
       │                         │                    │
       │    All Fallbacks ───────┴────────────────────┘
       │    Exhausted                                 │
       │         │                                    │
       │         ▼                                    │
       │   ┌──────────┐                              │
       │   │   All    │                              │
       │   │  Failed  │                              │
       │   └─────┬────┘                              │
       │         │                                    │
       └─────────┼────────────────────────────────────┘
                 │
                 ▼
               END

FALLBACK LOGIC:
┌───────────────┬─────────────────┬──────────────────┐
│ Primary Fails │ 1st Fallback    │ 2nd Fallback     │
├───────────────┼─────────────────┼──────────────────┤
│ Gemini        │ → GPT           │ → Claude         │
│ Claude        │ → Gemini        │ → GPT            │
│ GPT           │ → Claude        │ → Gemini         │
└───────────────┴─────────────────┴──────────────────┘

Each provider gets 2 attempts (primary + fallback).
If all attempts fail → Return error to user.
```

---

## Provider Support

### Provider Comparison

| Provider | Models | Strengths | Best For | Cost Tier |
|----------|--------|-----------|----------|-----------|
| **Anthropic Claude** | Sonnet 4.5, Opus 4 | Structured outputs, reasoning | Risk analysis, complex planning | $$$ |
| **Google Gemini** | 1.5 Flash, 1.5 Pro, 2.0 Flash | Free tier, large context | Categorization, extraction | $ (Free) |
| **OpenAI** | GPT-4o, GPT-4o Mini | Balanced performance | General tasks, report generation | $$ |
| **Groq** | Llama 3, Mixtral | Ultra-fast inference | Real-time, high-volume | $$ |
| **Mistral** | Large 2, Nemo | Open-source, EU-hosted | Privacy-focused, open weights | $$ |

### Model Specifications

#### Anthropic Claude

```typescript
{
  provider: "anthropic",
  models: {
    "claude-sonnet-4.5": {
      contextWindow: 200000,
      outputTokens: 8192,
      costPer1MInput: 3.00,
      costPer1MOutput: 15.00,
      avgLatency: 2000,
      quality: 5
    },
    "claude-opus-4": {
      contextWindow: 200000,
      outputTokens: 4096,
      costPer1MInput: 15.00,
      costPer1MOutput: 75.00,
      avgLatency: 3000,
      quality: 5
    }
  }
}
```

#### Google Gemini

```typescript
{
  provider: "google",
  models: {
    "gemini-2.0-flash": {
      contextWindow: 1000000,
      outputTokens: 8192,
      costPer1MInput: 0.00,  // Free tier
      costPer1MOutput: 0.00,
      avgLatency: 1200,
      quality: 4
    },
    "gemini-1.5-pro": {
      contextWindow: 2000000,
      outputTokens: 8192,
      costPer1MInput: 1.25,
      costPer1MOutput: 5.00,
      avgLatency: 2500,
      quality: 4.5
    }
  }
}
```

#### OpenAI

```typescript
{
  provider: "openai",
  models: {
    "gpt-4o-mini": {
      contextWindow: 128000,
      outputTokens: 16384,
      costPer1MInput: 0.15,
      costPer1MOutput: 0.60,
      avgLatency: 1500,
      quality: 4
    },
    "gpt-4o": {
      contextWindow: 128000,
      outputTokens: 16384,
      costPer1MInput: 2.50,
      costPer1MOutput: 10.00,
      avgLatency: 2000,
      quality: 4.5
    }
  }
}
```

---

## Routing Strategies

### 1. Cost Optimized

Selects the cheapest provider that meets minimum quality requirements.

**Algorithm:**
```typescript
1. Filter providers with quality >= minQuality
2. Estimate cost for each provider
3. Select provider with lowest cost
4. Check budget constraints
5. Fallback to next cheapest if budget exceeded
```

**Use Cases:**
- Document categorization
- Simple data extraction
- Routing decisions
- High-volume processing

**Example:**
```typescript
const response = await llmRouter.complete(
  { messages: [...] },
  {
    strategy: "cost_optimized",
    taskType: "categorization",
    budget: "low"
  }
);
// Usually routes to: Gemini Flash (free)
```

### 2. Performance

Selects the highest quality provider regardless of cost.

**Algorithm:**
```typescript
1. Rank providers by quality score
2. Select highest quality provider
3. Check availability
4. Fallback to next highest quality if unavailable
```

**Use Cases:**
- Risk analysis
- Complex decision-making
- Strategic planning
- High-stakes recommendations

**Example:**
```typescript
const response = await llmRouter.complete(
  { messages: [...] },
  {
    strategy: "performance",
    taskType: "analysis",
    budget: "unlimited"
  }
);
// Usually routes to: Claude Sonnet 4.5 or Opus 4
```

### 3. Balanced

Optimizes the quality-to-cost ratio.

**Algorithm:**
```typescript
1. Calculate quality/cost ratio for each provider
2. Weight by task requirements
3. Select provider with best ratio
4. Consider budget constraints
```

**Use Cases:**
- Report generation
- Content creation
- General analysis
- Most workflows

**Example:**
```typescript
const response = await llmRouter.complete(
  { messages: [...] },
  {
    strategy: "balanced",
    taskType: "generation",
    budget: "medium"
  }
);
// Usually routes to: GPT-4o Mini or Gemini Pro
```

### 4. Speed

Selects the fastest provider (lowest latency).

**Algorithm:**
```typescript
1. Rank providers by average latency
2. Filter by minimum quality
3. Select fastest provider
4. Track actual latency
```

**Use Cases:**
- Real-time applications
- Interactive workflows
- User-facing features
- High-volume batch processing

**Example:**
```typescript
const response = await llmRouter.complete(
  { messages: [...] },
  {
    strategy: "speed",
    taskType: "routing",
    latencyRequirement: "low"
  }
);
// Usually routes to: Groq or Gemini Flash
```

### 5. Context Size

Selects provider with largest context window.

**Algorithm:**
```typescript
1. Estimate request token count
2. Filter providers with sufficient context
3. Select provider with largest window
4. Consider cost constraints
```

**Use Cases:**
- Long document analysis
- Full codebase review
- Multi-document comparison
- Large dataset processing

**Example:**
```typescript
const response = await llmRouter.complete(
  { messages: [...] },
  {
    strategy: "context_size",
    taskType: "analysis",
    contextSize: 500000
  }
);
// Usually routes to: Gemini 1.5 Pro (2M tokens)
```

---

## Cost Tracking

### Cost Tracker Architecture

```
        ┌──────────────┐
        │ LLM Request  │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │    Router    │
        └──────┬───────┘
               │
               ▼
        ┌──────────────────┐
        │ Selected Provider│
        └──────┬───────────┘
               │
               ▼
        ┌──────────────────┐
        │ Provider Response│
        └──────┬───────────┘
               │
               ▼
        ┌──────────────┐
        │Extract Usage │
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │Calculate Cost│
        └──┬─────┬─────┘
           │     │
    ┌──────┘     └───────┬─────────────┐
    │                    │             │
    ▼                    ▼             ▼
┌─────────┐      ┌──────────┐    ┌──────────┐
│ Update  │      │  Update  │    │  Update  │
│Provider │      │ Workflow │    │  Daily   │
│  Stats  │      │  Stats   │    │  Total   │
└─────────┘      └──────────┘    └────┬─────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │   Exceeds    │
                               │ Daily Limit? │
                               └──┬───────┬───┘
                                  │       │
                          Yes ◄───┘       └───► No
                           │                   │
                           ▼                   ▼
                    ┌──────────────┐    ┌─────────┐
                    │ ⚠️  Log       │    │Continue │
                    │   Warning    │    └────┬────┘
                    └──────┬───────┘         │
                           │                 │
                           ▼                 │
                    ┌──────────────┐         │
                    │ Block Future │         │
                    │ Requests     │         │
                    │ Today        │         │
                    └──────┬───────┘         │
                           │                 │
                           └────────┬────────┘
                                    │
                                    ▼
                             ┌──────────────┐
                             │Return Response│
                             └──────────────┘

COST TRACKING METRICS:
┌──────────────────┬────────────────────────────────────┐
│ Metric           │ Description                        │
├──────────────────┼────────────────────────────────────┤
│ Provider Stats   │ Cost/requests per provider         │
│ Workflow Stats   │ Cost/requests per workflow         │
│ Daily Total      │ Cumulative cost for current day    │
│ Budget Alert     │ Warning when limit exceeded        │
│ Request Blocking │ Prevents overspending              │
└──────────────────┴────────────────────────────────────┘
```

### Cost Tracking Features

#### Real-Time Tracking

```typescript
import { costTracker } from "./llm/index.js";

// Get today's total cost
const todayCost = costTracker.getTodayCost();
console.log(`Today: $${todayCost.toFixed(4)}`);

// Get detailed statistics
const stats = costTracker.getStatistics();
console.log(stats.byProvider);   // Per provider
console.log(stats.byWorkflow);   // Per workflow
console.log(stats.totalCost);    // Overall total
```

#### Budget Management

```typescript
// Set daily budget limit
process.env.LLM_COST_LIMIT_PER_DAY = "10.00";

// Costs are automatically tracked
// Requests blocked when limit exceeded
```

#### Statistics Breakdown

```typescript
{
  totalCost: 5.43,
  totalRequests: 247,
  byProvider: {
    "anthropic": {
      cost: 2.15,
      requests: 18,
      avgCostPerRequest: 0.119
    },
    "google": {
      cost: 0.00,
      requests: 205,
      avgCostPerRequest: 0.000
    },
    "openai": {
      cost: 3.28,
      requests: 24,
      avgCostPerRequest: 0.137
    }
  },
  byWorkflow: {
    "document_categorization": {
      cost: 0.05,
      requests: 180
    },
    "risk_analysis": {
      cost: 1.80,
      requests: 12
    },
    "report_generation": {
      cost: 3.58,
      requests: 55
    }
  }
}
```

---

## Configuration

### Environment Variables

```bash
# Provider API Keys (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AI...
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=...

# Router Configuration
LLM_ROUTER_ENVIRONMENT=production  # production | cost_optimized | high_quality | speed_optimized
LLM_DEFAULT_PROVIDER=anthropic     # Default provider if strategy doesn't specify
LLM_DEFAULT_MODEL=claude-sonnet-4.5  # Default model for provider

# Fallback & Retry
LLM_ENABLE_FALLBACK=true          # Auto-fallback to next provider on error
LLM_MAX_RETRIES=3                 # Max retry attempts per provider

# Cost Management
LLM_ENABLE_COST_TRACKING=true     # Enable cost tracking
LLM_COST_LIMIT_PER_DAY=100        # Daily budget limit ($)

# Model Overrides (optional)
OPENAI_MODEL=gpt-4o-mini          # Override default OpenAI model
GEMINI_MODEL=gemini-2.0-flash     # Override default Gemini model

# Debug
DEBUG_LLMS=false                  # Log routing decisions
```

### Environment Presets

#### Production (Default)
```bash
LLM_ROUTER_ENVIRONMENT=production
# Balanced quality and cost
# Uses Gemini for simple tasks, Claude for complex
```

#### Cost Optimized
```bash
LLM_ROUTER_ENVIRONMENT=cost_optimized
# Prefers free/cheap models
# Gemini Flash for everything, Claude only when necessary
```

#### High Quality
```bash
LLM_ROUTER_ENVIRONMENT=high_quality
# Best quality regardless of cost
# Claude Sonnet/Opus for all tasks
```

#### Speed Optimized
```bash
LLM_ROUTER_ENVIRONMENT=speed_optimized
# Fastest models
# Groq and Gemini Flash prioritized
```

---

## Usage Examples

### Example 1: Document Categorization (Cost Optimized)

```typescript
import { llmRouter } from "./llm/index.js";
import { LLM_PRESETS } from "./llm/config.js";

const response = await llmRouter.complete(
  {
    messages: [
      {
        role: "user",
        content: "Categorize this document: Project Charter - Alpha Program v1.2.pdf"
      }
    ]
  },
  LLM_PRESETS.DOCUMENT_CATEGORIZATION
);

console.log(response.content);  // Category: Charter, Phase: Initiation
console.log(`Provider: ${response.provider}/${response.model}`);  // google/gemini-2.0-flash
console.log(`Cost: $${response.metadata.cost.toFixed(6)}`);  // $0.000000 (free!)
```

### Example 2: Risk Analysis (High Quality)

```typescript
const riskAnalysis = await llmRouter.complete(
  {
    messages: [
      {
        role: "user",
        content: `Analyze these program risks:
1. Vendor delays on critical components
2. Budget overrun in Q3
3. Key stakeholder departure

Provide impact assessment, probability, mitigation strategies.`
      }
    ]
  },
  LLM_PRESETS.RISK_ANALYSIS
);

// Routes to: Claude Sonnet 4.5 (high quality for analysis)
// Cost: ~$0.03
```

### Example 3: Parallel Multi-LLM Execution

```typescript
const [categorization, extraction, summary] = await Promise.all([
  // Fast categorization (Gemini)
  llmRouter.complete(
    { messages: [{role: "user", content: "Categorize: Invoice.pdf"}] },
    LLM_PRESETS.DOCUMENT_CATEGORIZATION
  ),

  // Data extraction (GPT-4o Mini)
  llmRouter.complete(
    { messages: [{role: "user", content: "Extract invoice data..."}] },
    LLM_PRESETS.DATA_EXTRACTION
  ),

  // Summarization (Gemini)
  llmRouter.complete(
    { messages: [{role: "user", content: "Summarize document..."}] },
    LLM_PRESETS.SUMMARIZATION
  )
]);

// All three run in parallel, each using optimal provider
```

### Example 4: Custom Selection Criteria

```typescript
const customResponse = await llmRouter.complete(
  {
    messages: [
      { role: "user", content: "Generate executive summary..." }
    ]
  },
  {
    strategy: "balanced",
    taskType: "generation",
    budget: "medium",
    qualityRequirement: 4,  // Min quality score (1-5)
    latencyRequirement: "medium",
    contextSize: 50000,
    structuredOutput: false
  }
);
```

### Example 5: Cost Monitoring

```typescript
import { costTracker } from "./llm/index.js";

// Before expensive operation
const beforeCost = costTracker.getTodayCost();

// Run LLM operations
await llmRouter.complete(...);

// Check cost increase
const afterCost = costTracker.getTodayCost();
console.log(`Operation cost: $${(afterCost - beforeCost).toFixed(4)}`);

// Get statistics
const stats = costTracker.getStatistics();
console.log(`Total today: $${stats.totalCost.toFixed(2)}`);
console.log(`Requests: ${stats.totalRequests}`);
console.log(`Avg per request: $${(stats.totalCost / stats.totalRequests).toFixed(4)}`);
```

---

## Presets Reference

### Available Presets

| Preset | Strategy | Provider (Typical) | Use Case | Est. Cost |
|--------|----------|-------------------|----------|-----------|
| `DOCUMENT_CATEGORIZATION` | cost_optimized | Gemini Flash | Fast classification | $0.0001 |
| `DOCUMENT_ROUTING` | speed | Gemini Flash | Ultra-fast routing | $0.0005 |
| `DOCUMENT_ANALYSIS` | balanced | GPT-4o Mini | Balanced analysis | $0.005 |
| `RISK_ANALYSIS` | performance | Claude Sonnet | High-quality risk assessment | $0.03 |
| `REPORT_GENERATION` | balanced | GPT-4o Mini | Report writing | $0.01 |
| `COMPLEX_PLANNING` | performance | Claude Sonnet | Strategic planning | $0.05 |
| `SIMPLE_TASK` | cost_optimized | Gemini Flash | Cheapest option | $0.0001 |
| `DATA_EXTRACTION` | speed | Gemini Flash | Fast extraction | $0.0005 |
| `SUMMARIZATION` | balanced | GPT-4o Mini | Quick summary | $0.001 |
| `LONG_CONTEXT` | context_size | Gemini Pro | Large documents | $0.02 |

---

## Performance Metrics

### Typical Latencies

| Provider | Model | Avg Latency | Use Case |
|----------|-------|-------------|----------|
| Groq | Llama 3 70B | 400ms | Real-time |
| Google | Gemini Flash | 1200ms | Fast batch |
| OpenAI | GPT-4o Mini | 1500ms | Balanced |
| Anthropic | Claude Sonnet | 2000ms | Quality |
| Google | Gemini Pro | 2500ms | Large context |
| Anthropic | Claude Opus | 3000ms | Highest quality |

### Cost Estimates (Per 1M Tokens)

| Provider | Model | Input | Output | Notes |
|----------|-------|-------|--------|-------|
| Google | Gemini Flash | $0 | $0 | Free tier! |
| OpenAI | GPT-4o Mini | $0.15 | $0.60 | Best value |
| Google | Gemini Pro | $1.25 | $5.00 | Large context |
| OpenAI | GPT-4o | $2.50 | $10.00 | Balanced |
| Anthropic | Claude Sonnet | $3.00 | $15.00 | High quality |
| Anthropic | Claude Opus | $15.00 | $75.00 | Highest quality |

---

## Related Documentation

- **[Architecture Overview](overview.md)** - System architecture
- **[Configuration Guide](../guides/llm-configuration.md)** - Detailed configuration
- **[Cost Optimization Guide](../guides/llm-configuration.md#cost-optimization)** - Save money
- **[API Reference](../api-reference/index.md)** - Tool documentation

---

**The LLM Router provides intelligent, cost-optimized routing across 5 providers with automatic fallbacks and real-time cost tracking.**
