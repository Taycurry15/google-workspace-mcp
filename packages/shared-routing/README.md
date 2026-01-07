# @gw-mcp/shared-routing

Cross-server routing, document intelligence, program context management, and event-based communication for the Google Workspace MCP multi-server architecture.

## Features

### 🌐 Cross-Server Communication
- **Service Registry**: Automatic service discovery and health monitoring
- **API Client**: REST API client for cross-server requests
- **Health Checking**: Periodic health checks with status tracking

### 📄 Document Intelligence
- **AI Classification**: LLM-powered document type classification (16 document types)
- **Automatic Routing**: Route documents to correct Drive folders based on type
- **Metadata Extraction**: Extract IDs, dates, entities, and keywords
- **Server Notifications**: Notify target servers when documents are routed

### 🎯 Program Context Management
- **Context Tracking**: Maintain active program context across operations
- **Entity Validation**: Validate entities belong to correct programs
- **Cross-Program Protection**: Prevent accidental cross-program data leaks
- **Access History**: Track user's program access patterns

### 📡 Event Communication
- **Cross-Server Events**: Pub/sub event system across servers
- **Targeted Delivery**: Send events to specific servers
- **Event Filtering**: Filter by event type, program ID
- **Entity Lifecycle**: Convenience methods for created/updated/deleted events

## Installation

```bash
npm install @gw-mcp/shared-routing
```

## Quick Start

### Cross-Server Communication

```typescript
import { ServiceRegistry, CrossServerClient, registerDefaultServers } from "@gw-mcp/shared-routing";

// Register servers from environment
registerDefaultServers();

// Create client
const client = new CrossServerClient("mcp-program");

// Make request
const response = await client.get("/api/programs/PROG-001");
if (response.success) {
  console.log("Program:", response.data);
}
```

### Document Intelligence

```typescript
import { DocumentClassifier, DocumentRouter } from "@gw-mcp/shared-routing";
import { LLMRouter } from "@gw-mcp/shared-llm";

const llmRouter = new LLMRouter();
const classifier = new DocumentClassifier(llmRouter);
const router = new DocumentRouter(classifier);

// Route a document
const result = await router.route(auth, driveFileId, {
  notifyServers: true,
});

console.log("Document type:", result.classification.documentType);
console.log("Routed to:", result.targetFolder);
console.log("Notified:", result.notificationsSent);
```

### Program Context

```typescript
import { ProgramContextManager, ProgramContextValidator } from "@gw-mcp/shared-routing";

const context = ProgramContextManager.getInstance();
const validator = new ProgramContextValidator();

// Set active program
context.setActiveProgram("PROG-001", {
  userId: "user@example.com",
});

// Validate entity
const result = await validator.validateDeliverableId(
  auth,
  "D-042",
  "PROG-001"
);

if (!result.valid) {
  console.error("Invalid deliverable:", result.error);
}
```

### Event Communication

```typescript
import { CrossServerEventPublisher, CrossServerEventSubscriber } from "@gw-mcp/shared-routing";

// Publisher
const publisher = new CrossServerEventPublisher("mcp-deliverables");
await publisher.publish({
  eventType: "deliverable_submitted",
  programId: "PROG-001",
  timestamp: new Date(),
  data: { deliverableId: "D-042" },
});

// Subscriber
const subscriber = new CrossServerEventSubscriber("mcp-financial");
subscriber.subscribe(["deliverable_completed"], async (event) => {
  console.log("Deliverable completed:", event.data.deliverableId);
  await recalculateEVM(event.programId);
});
```

## Configuration

### Environment Variables

```bash
# Server URLs for cross-server communication
MCP_PROGRAM_URL=http://localhost:3001
MCP_DELIVERABLES_URL=http://localhost:3002
MCP_SUBCONTRACT_URL=http://localhost:3003
MCP_COMPLIANCE_URL=http://localhost:3004
MCP_FINANCIAL_URL=http://localhost:3005

# Spreadsheet IDs for entity validation
PMO_SPREADSHEET_ID=your_pmo_spreadsheet_id
PROGRAM_SPREADSHEET_ID=your_program_spreadsheet_id
SUBCONTRACT_SPREADSHEET_ID=your_subcontract_spreadsheet_id
FINANCIAL_SPREADSHEET_ID=your_financial_spreadsheet_id
```

### Server Implementation

Each server should implement these endpoints:

**Health Check:**
```typescript
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    server: "mcp-program",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});
```

**Document Notification:**
```typescript
app.post("/api/documents/notify", async (req, res) => {
  const { documentId, documentType, metadata } = req.body;
  await processDocument(documentId, documentType, metadata);
  res.json({ success: true });
});
```

**Event Reception:**
```typescript
app.post("/api/events/receive", async (req, res) => {
  const event = req.body;
  await handleEvent(event);
  res.json({ success: true });
});
```

## Architecture

### Four Routing Layers

1. **MCP Tool Routing**: Handled by Claude Desktop (multi-server config)
2. **Cross-Server Data Routing**: REST APIs + Service Registry
3. **Physical Document Routing**: AI classification + Drive folder routing
4. **Program-Specific Routing**: Context tracking + entity validation

### Package Structure

```
@gw-mcp/shared-routing/
├── cross-server/       # Cross-server communication
├── document-routing/   # Document intelligence
├── program-context/    # Program context management
└── events/            # Event pub/sub
```

## API Reference

### Cross-Server Module

- `ServiceRegistry` - Server discovery and health monitoring
- `CrossServerClient` - REST API client
- `registerDefaultServers()` - Register from environment

### Document Routing Module

- `DocumentClassifier` - AI-powered classification
- `DocumentRouter` - Automatic routing
- `extractMetadata()` - Metadata extraction
- `ROUTING_RULES` - Document type routing configuration

### Program Context Module

- `ProgramContextManager` - Context tracking
- `ProgramContextValidator` - Entity validation
- `getProgramContextManager()` - Get singleton

### Events Module

- `CrossServerEventPublisher` - Publish events
- `CrossServerEventSubscriber` - Subscribe to events
- `CrossServerEvent` - Event payload type

## Documentation

See [docs/shared-routing-week8.md](../../docs/shared-routing-week8.md) for comprehensive documentation including:
- Detailed API reference
- Use cases and examples
- Testing strategies
- Performance considerations
- Troubleshooting guide

## Dependencies

- `@gw-mcp/shared-core` - Auth, Google APIs, helpers
- `@gw-mcp/shared-llm` - LLM router for classification
- `@gw-mcp/shared-workflows` - Event bus integration

## License

MIT

## Author

Tay Daddy - The Bronze Shield
