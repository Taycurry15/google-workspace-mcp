# System Architecture Overview

Comprehensive overview of the Google Workspace MCP server architecture, components, and design patterns.

**Last Updated:** 2026-01-05

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Core Components](#core-components)
3. [Domain Modules](#domain-modules)
4. [Technology Stack](#technology-stack)
5. [Design Patterns](#design-patterns)
6. [Data Flow](#data-flow)

---

## High-Level Architecture

The Google Workspace MCP server is built with a modular architecture that separates concerns into distinct domains while maintaining a unified interface through the Model Context Protocol.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                 │
│                                                                         │
│                        ┌──────────────────┐                             │
│                        │ Claude Desktop/  │                             │
│                        │   Claude API     │                             │
│                        └────────┬─────────┘                             │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │ MCP Protocol
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         MCP SERVER LAYER                                │
│                                                                         │
│                        ┌──────────────────┐                             │
│                        │   MCP Server     │                             │
│                        │   (index.ts)     │                             │
│                        └────────┬─────────┘                             │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
                ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DOMAIN MODULES                                 │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │ Core Google  │  │    PARA      │  │     PMO      │                   │
│  │  Workspace   │  │Organization  │  │   Module     │                   │
│  │  (40+ tools) │  │  (8+ tools)  │  │  (6+ tools)  │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │   Program    │  │  Documents   │  │ Deliverable  │                   │
│  │ Management   │  │Organization  │  │  Tracking    │                   │
│  │ (18+ tools)  │  │ (13+ tools)  │  │ (27+ tools)  │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│                                                                         │
│  ┌──────────────┐                                                       │
│  │  Workflow    │                                                       │
│  │ Automation   │                                                       │
│  │ (10+ tools)  │                                                       │
│  └──────────────┘                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                │                 │                 │
                ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SHARED SERVICES                                  │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │  LLM Router  │  │   OAuth 2.0  │  │  Utilities   │                   │
│  │Multi-Provider│  │    (Auth)    │  │  & Helpers   │                   │
│  └──────┬───────┘  └───────┬──────┘  └──────────────┘                   │
└─────────┼──────────────────┼────────────────────────────────────────────┘
          │                  │
          │                  └──────────────┐
          │                                 │
          ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL SERVICES                                 │
│                                                                         │
│  LLM Providers:              Google Workspace APIs:                     │
│  ┌──────────────┐            ┌──────────────┐                           │
│  │  Anthropic   │            │   Gmail API  │                           │
│  │    Claude    │            ├──────────────┤                           │
│  ├──────────────┤            │   Drive API  │                           │
│  │   Google     │            ├──────────────┤                           │
│  │   Gemini     │            │  Sheets API  │                           │
│  ├──────────────┤            ├──────────────┤                           │
│  │   OpenAI     │            │   Docs API   │                           │
│  │     GPT      │            ├──────────────┤                           │
│  └──────────────┘            │ Calendar API │                           │
│                              ├──────────────┤                           │
│                              │  Tasks API   │                           │
│                              └──────────────┘                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. MCP Server (Entry Point)

**File:** `src/index.ts`

**Responsibilities:**
- Implements Model Context Protocol interface
- Aggregates tool definitions from all domains
- Routes tool calls to appropriate handlers
- Manages server lifecycle and stdio communication

**Key Features:**
- 100+ tool definitions
- Type-safe tool schemas
- Error handling and validation
- Streaming responses

### 2. OAuth Authentication

**File:** `src/setup-auth.ts`

**Responsibilities:**
- Google OAuth 2.0 flow implementation
- Token generation and refresh
- Credential management
- Scope authorization

**Components:**
```
OAuth Flow:
1. Load credentials.json
2. Generate authorization URL
3. User authorizes in browser
4. Exchange code for tokens
5. Save tokens to token.json
6. Auto-refresh on expiry
```

### 3. LLM Router

**Files:** `src/llm/router.ts`, `src/llm/providers/`

**Responsibilities:**
- Multi-provider LLM orchestration
- Intelligent routing based on task type
- Cost tracking and budget management
- Automatic fallback on failure

**Supported Providers:**
- Anthropic Claude 3.5 Sonnet
- Google Gemini 1.5 Flash/Pro
- OpenAI GPT-4o/Mini
- Groq (ultra-fast inference)
- Mistral (open-source)

**See:** [LLM Router Architecture](llm-router.md)

---

## Domain Modules

### Module Architecture Pattern

Each domain module follows this consistent pattern:

```typescript
// Domain module structure
src/[domain]/
├── index.ts              // Exports getToolDefinitions() and handlers
├── [feature1].ts         // Feature implementation
├── [feature2].ts
└── types/                // TypeScript type definitions (optional)
```

### 1. Core Google Workspace Module

**Location:** Integrated into `src/index.ts`

**Tools:** 40+ tools across 6 Google APIs
- Gmail (10 tools)
- Drive (10 tools)
- Sheets (8 tools)
- Docs (4 tools)
- Calendar (5 tools)
- Tasks (4 tools)

**Purpose:** Direct Google Workspace API integration for basic operations.

### 2. PARA Organization Module

**Location:** `src/para/`

**Tools:** 8+ tools for file organization using the PARA method

**Key Features:**
- LLM-powered file categorization
- Projects, Areas, Resources, Archives structure
- Semantic search
- Auto-archival based on age

**Components:**
```
para/
├── index.ts              // Tool definitions
├── categorizer.ts        // LLM categorization
├── metadata.ts           // Metadata management
├── search.ts             // Semantic search
├── archiver.ts           // Auto-archival
└── dashboard.ts          // Dashboard creation
```

### 3. PMO Module

**Location:** `src/pmo/`

**Tools:** 6+ tools for project management office operations

**Key Features:**
- Deliverable tracking
- Risk register management
- AI-powered proposal analysis
- Stakeholder management

**Components:**
```
pmo/
├── index.ts
├── deliverables.ts       // Deliverable CRUD
├── risks.ts              // Risk register
├── stakeholders.ts       // Stakeholder mgmt
├── proposal-analyzer.ts  // LLM proposal analysis
└── session-manager.ts    // Analysis sessions
```

### 4. Program Management Module

**Location:** `src/program/`

**Tools:** 18+ tools following PMI PMBOK standards

**Key Features:**
- Program charter management
- Work Breakdown Structure (WBS)
- Milestone tracking with variance
- Issue and decision logs

**Components:**
```
program/
├── index.ts
├── charter.ts            // Program charters
├── wbs.ts                // Work breakdown structure
├── milestones.ts         // Milestone tracking
├── issue-log.ts          // Issue management
└── decision-log.ts       // Decision tracking
```

### 5. Document Organization Module

**Location:** `src/documents/`

**Tools:** 13+ tools for intelligent document management

**Key Features:**
- LLM-powered categorization
- Automated routing to PMI folders
- Template system
- Version control
- Advanced search

**Components:**
```
documents/
├── index.ts
├── categorizer.ts        // LLM categorization
├── router.ts             // Auto-routing
├── folder-structure.ts   // PMI folders
├── metadata.ts           // Metadata tracking
├── templates.ts          // Template mgmt
├── versioning.ts         // Version control
└── search.ts             // Advanced search
```

### 6. Deliverable Tracking Module

**Location:** `src/deliverables/`

**Tools:** 27+ tools for complete deliverable lifecycle

**Key Features:**
- CRUD operations
- Submission workflows
- Review and approval process
- Quality checklists
- Status reporting

**Components:**
```
deliverables/
├── index.ts
├── deliverables.ts       // CRUD operations
├── submissions.ts        // Submission workflow
├── review.ts             // Review process
├── quality.ts            // Quality checklists
├── tracking.ts           // Status tracking
└── reporting.ts          // Report generation
```

### 7. Workflow Automation Module

**Location:** `src/workflows/`

**Tools:** 10+ tools for event-driven automation

**Key Features:**
- Workflow engine with retry logic
- Cron-like scheduling
- Event-based triggers
- Role-based access control

**Components:**
```
workflows/
├── index.ts
├── engine.ts             // Workflow execution
├── scheduler.ts          // Scheduling
├── event-handler.ts      // Event triggers
├── role-manager.ts       // RBAC
├── definitions/          // Predefined workflows
└── actions/              // Reusable actions
```

---

## Technology Stack

### Core Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js 18+ | Server execution |
| Language | TypeScript | Type safety |
| Protocol | MCP SDK | Claude integration |
| APIs | Google APIs Client | Workspace integration |
| Authentication | OAuth 2.0 | Google authorization |

### LLM Providers

| Provider | SDK | Use Cases |
|----------|-----|-----------|
| Anthropic | `@anthropic-ai/sdk` | High-quality analysis, structured outputs |
| Google | `@google/generative-ai` | Cost-effective categorization |
| OpenAI | `openai` | Balanced general tasks |
| Groq | `groq-sdk` | Ultra-fast inference |
| Mistral | `@mistralai/mistralai` | Open-source alternative |

### Build & Quality Tools

| Tool | Purpose |
|------|---------|
| TypeScript Compiler | Transpilation |
| ESLint | Linting |
| Prettier | Code formatting |
| GitHub Actions | CI/CD |

---

## Design Patterns

### 1. Modular Domain Architecture

Each domain is self-contained with its own:
- Tool definitions
- Business logic
- Type definitions
- Helper functions

**Benefits:**
- Easy to maintain
- Clear separation of concerns
- Simple to extend
- Independent testing

### 2. Factory Pattern (Tool Registration)

```typescript
// Each domain exports getToolDefinitions()
export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: "tool_name",
      description: "...",
      inputSchema: { ... }
    },
    // ... more tools
  ];
}

// Main server aggregates all tools
const allTools = [
  ...getGmailTools(),
  ...getPARATools(),
  ...getPMOTools(),
  // ... etc
];
```

### 3. Strategy Pattern (LLM Routing)

```typescript
// Different providers implement same interface
interface LLMProvider {
  complete(request: LLMRequest): Promise<LLMResponse>;
  estimateCost(request: LLMRequest): number;
}

// Router selects provider based on strategy
const provider = router.selectProvider({
  taskType: "categorization",
  strategy: "cost_optimized"
});
```

### 4. Adapter Pattern (LLM Orchestrator)

```typescript
// Old code uses LLMOrchestrator
const orchestrator = new LLMOrchestrator();
const result = await orchestrator.generate({ ... });

// Internally adapts to new LLM Router
class LLMOrchestrator {
  async generate(params) {
    return llmRouter.complete(params);
  }
}
```

### 5. Observer Pattern (Workflow Events)

```typescript
// Workflows emit events
workflowEngine.emit("document.submitted", {
  documentId: "DOC-123",
  programId: "PROG-001"
});

// Event handlers listen and react
eventHandler.on("document.submitted", async (event) => {
  await categorizeDocument(event.documentId);
  await routeToFolder(event.documentId);
  await updateRegister(event.documentId);
});
```

---

## Data Flow

### Request Flow

```
┌──────┐
│ User │
└──┬───┘
   │  1. Natural language request
   ▼
┌────────┐
│ Claude │
└───┬────┘
    │  2. Tool call via MCP protocol
    ▼
┌─────────────┐
│ MCP Server  │
└──────┬──────┘
       │  3. Route to domain handler
       ▼
┌────────────────┐
│ Domain Module  │
└───┬────────┬───┘
    │        │
    │        │ 4a. LLM request (if needed)
    │        ▼
    │   ┌──────────┐
    │   │   LLM    │ (categorization, analysis)
    │   │  Router  │
    │   └────┬─────┘
    │        │ 4b. LLM response
    │        │
    │◄───────┘
    │
    │  5. API request (with OAuth)
    ▼
┌─────────────┐
│ Google API  │ (Gmail, Drive, Sheets, etc.)
└──────┬──────┘
       │  6. API response
       ▼
┌────────────────┐
│ Domain Module  │
└───────┬────────┘
        │  7. Tool result
        ▼
┌─────────────┐
│ MCP Server  │
└──────┬──────┘
       │  8. MCP response
       ▼
┌────────┐
│ Claude │
└───┬────┘
    │  9. Natural language response
    ▼
┌──────┐
│ User │
└──────┘
```

### Authentication Flow

```
INITIAL SETUP:
──────────────

┌────────────┐
│   Server   │
└─────┬──────┘
      │ 1. Load credentials.json
      ▼
┌────────────┐
│OAuth Client│
└─────┬──────┘
      │ 2. Request authorization URL
      ▼
┌────────────┐
│   Google   │
└─────┬──────┘
      │ 3. Return authorization URL
      ▼
┌────────────┐
│  Browser   │ ◄──── User opens URL
└─────┬──────┘
      │ 4. User authorizes
      ▼
┌────────────┐
│   Google   │
└─────┬──────┘
      │ 5. Return authorization code
      ▼
┌────────────┐
│    User    │ (copies code)
└─────┬──────┘
      │ 6. Paste code
      ▼
┌────────────┐
│OAuth Client│
└─────┬──────┘
      │ 7. Exchange code for tokens
      ▼
┌────────────┐
│   Google   │
└─────┬──────┘
      │ 8. Return access_token + refresh_token
      ▼
┌────────────┐
│OAuth Client│
└─────┬──────┘
      │ 9. Save token.json
      ▼
┌────────────┐
│   Server   │ ✓ Authenticated
└────────────┘


FUTURE API REQUESTS:
────────────────────

┌────────────┐
│   Server   │
└─────┬──────┘
      │ API request with access_token
      ▼
┌────────────┐
│   Google   │
└─────┬──────┘
      │
      ├─────► Token Valid?
      │           │
      │        YES│         NO
      │           │          │
      │           ▼          ▼
      │     ┌─────────┐  ┌──────────────┐
      │     │Response │  │401 Unauthorized│
      │     └────┬────┘  └────┬─────────┘
      │          │            │
      │          │            │ Automatic refresh
      │          │            ▼
      │          │      ┌────────────┐
      │          │      │   Server   │
      │          │      └─────┬──────┘
      │          │            │ Use refresh_token
      │          │            ▼
      │          │      ┌────────────┐
      │          │      │   Google   │
      │          │      └─────┬──────┘
      │          │            │ New access_token
      │          │            ▼
      │          │      ┌────────────┐
      │          │      │   Server   │
      │          │      └─────┬──────┘
      │          │            │ Retry request
      │          │            ▼
      │          │      ┌────────────┐
      │          │      │   Google   │
      │          │      └─────┬──────┘
      │          │            │
      │          └────────────┘
      │                       │
      ▼                       ▼
┌────────────┐          ┌────────────┐
│   Server   │  ◄───────│  Response  │
└────────────┘          └────────────┘
```

### Workflow Execution Flow

```
                        ┌─────────┐
                        │  START  │
                        └────┬────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │  Trigger Event/  │
                   │    Schedule      │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │   Validate       │
                   │   Context        │
                   └────┬─────┬───────┘
                        │     │
                 Valid  │     │ Invalid
                        │     │
                        ▼     ▼
              ┌──────────┐  ┌───────┐
              │ Execute  │  │Failed │
              │ Actions  │  └───┬───┘
              └────┬─────┘      │
                   │            │
                   ▼            │
              ┌──────────┐      │
              │ Action 1 │      │
              └────┬─────┘      │
                   │            │
      ┌────────────┼────────────┤
      │ Success    │ Transient  │ Permanent
      │            │ Error      │ Error
      ▼            ▼            ▼
 ┌──────────┐  ┌────────┐   ┌───────┐
 │ Action 2 │  │ Retry  │   │Failed │
 └────┬─────┘  │ Logic  │   └───┬───┘
      │        └───┬┬───┘       │
      │            ││           │
      │   ┌────────┘│           │
      │   │ < Max   │ >= Max    │
      │   │         │           │
      ▼   ▼         ▼           │
 ┌──────────┐   ┌───────┐       │
 │ Action 3 │   │Failed │       │
 └────┬─────┘   └───┬───┘       │
      │             │           │
      │ Success     │           │
      │             │           │
      ▼             ▼           ▼
 ┌───────────────────────────────┐
 │       Completed/Failed        │
 └──────────────┬────────────────┘
                │
                ▼
           ┌─────────┐
           │   END   │
           └─────────┘

Legend:
  Success Path: ─────►
  Error Path:   ─ ─ ─►
  Retry: Exponential backoff (1s, 2s, 4s)
```

---

## Performance Considerations

### API Rate Limits

| API | Limit | Strategy |
|-----|-------|----------|
| Gmail | 250 quota units/user/second | Batch operations, caching |
| Drive | 1000 requests/100 seconds | File ID caching, query filtering |
| Sheets | 500 requests/100 seconds/user | Batch updates, data validation |
| Docs | 600 requests/60 seconds/user | Batch append operations |
| Calendar | 1000 requests/100 seconds/user | Event caching |

### LLM Cost Optimization

| Task Type | Recommended Provider | Est. Cost |
|-----------|---------------------|-----------|
| Simple categorization | Gemini Flash | $0.0001 |
| Document routing | Gemini Flash | $0.0005 |
| Risk analysis | Claude Sonnet | $0.03 |
| Report generation | GPT-4o Mini | $0.01 |
| Complex planning | Claude Sonnet | $0.05 |

### Caching Strategy

```typescript
// Folder ID caching
const folderCache = new Map<string, string>();

// Metadata caching
const metadataCache = new Map<string, Metadata>();

// Token caching (handled by OAuth client)
// Automatic refresh on expiry
```

---

## Security Architecture

### Authentication Layers

```
1. OAuth 2.0 (Google)
   └── User authorization
   └── Token-based access
   └── Automatic refresh

2. MCP Protocol (Claude)
   └── Stdio communication
   └── Local-only access
   └── No network exposure

3. Environment Variables
   └── API keys
   └── Configuration
   └── Credential paths
```

### Data Security

- **Credentials:** Never committed to git (.gitignore)
- **Tokens:** Stored locally, auto-refreshed
- **API Keys:** Environment variables only
- **Data in Transit:** HTTPS for all API calls
- **Data at Rest:** Google's encryption standards

---

## Scalability

### Horizontal Scalability

The server can be scaled by:
- Running multiple instances with different Google accounts
- Load balancing across instances
- Domain-specific deployments (e.g., separate PMO server)

### Vertical Scalability

Performance can be improved by:
- Increasing Node.js heap size
- Batch operations
- Parallel processing with Promise.all()
- Caching frequently accessed data

---

## Error Handling

### Error Hierarchy

```
Error Handling Strategy:
├── Google API Errors
│   ├── 401 (Auth) → Auto-refresh token
│   ├── 403 (Permission) → Return clear error
│   ├── 429 (Rate limit) → Exponential backoff
│   └── 500 (Server) → Retry with backoff
│
├── LLM Provider Errors
│   ├── API Error → Try next provider
│   ├── Timeout → Try faster provider
│   ├── Budget Exceeded → Use cheaper provider
│   └── Invalid Response → Return error
│
└── Application Errors
    ├── Validation → Return to user
    ├── Not Found → Helpful message
    └── Unknown → Log and return generic error
```

---

## Related Documentation

- **[LLM Router Architecture](llm-router.md)** - Multi-provider LLM routing
- **[Workflow Engine](workflows.md)** - Event-driven automation
- **[Data Flow](data-flow.md)** - Detailed data flow diagrams
- **[API Reference](../api-reference/index.md)** - All 100+ tools
- **[Configuration Guide](../reference/configuration.md)** - Settings and tuning

---

**This architecture supports 100+ tools across 7 domains with intelligent LLM routing and enterprise-grade Google Workspace integration.**
