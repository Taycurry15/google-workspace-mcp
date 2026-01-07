# Google Workspace MCP Server

Production-ready Model Context Protocol (MCP) server with **100+ tools** across 7 automation domains for complete Google Workspace integration through Claude.

**Built for:** Government contractors, business development professionals, consultants, program managers, and executives who need enterprise-grade automation.

[![Code Quality](https://img.shields.io/badge/code%20quality-typescript-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## 🚀 What You Get

### 100+ Tools Across 7 Automation Domains

This MCP server provides comprehensive Google Workspace automation with intelligent LLM-powered features:

**1. Core Google Workspace (40+ tools)**
- **Gmail:** Send, search, manage labels, attachments, automation (10 tools)
- **Drive:** Files, folders, permissions, sharing, content search (10 tools)
- **Sheets:** Create, read, write, format, batch operations (8 tools)
- **Docs:** Create, read, append, batch updates (4 tools)
- **Calendar:** Events, scheduling, time slot finding (5 tools)
- **Tasks:** Create, manage, list tasks (4 tools)

**2. PARA Organization (8+ tools)**
- LLM-powered file categorization using the PARA method
- Batch processing and semantic search
- Auto-archival and dashboard creation

**3. PMO Module (6+ tools)**
- Deliverable tracking, risk register
- AI-powered proposal analysis
- Stakeholder management

**4. Program Management (18+ tools)**
- Program charter and WBS management
- Milestone tracking with variance analysis
- Issue and decision logs
- PMI PMBOK framework implementation

**5. Document Organization (13+ tools)**
- LLM-powered document categorization and routing
- PMI-standard folder structures
- Template system with versioning
- Advanced search and metadata tracking

**6. Deliverable Tracking (27+ tools)**
- Complete lifecycle management
- Submission and review workflows
- Quality checklist system
- Status reporting and analytics

**7. Workflow Automation (10+ tools)**
- Event-driven and scheduled workflows
- Role-based access control
- Predefined workflows for common operations

---

## ⚡ Quick Start

### 1. Install

```bash
git clone https://github.com/yourusername/google-workspace-mcp.git
cd google-workspace-mcp
npm install
npm run build
```

### 2. Set Up Google Cloud

1. Create a Google Cloud project
2. Enable 6 APIs: Gmail, Drive, Sheets, Docs, Calendar, Tasks
3. Create OAuth 2.0 credentials
4. Download `credentials.json` to project root

**Detailed guide:** [Installation Guide](docs/getting-started/installation.md)

### 3. Authenticate

```bash
npm run setup-auth
```

Follow the OAuth flow to authorize the MCP server.

### 4. Configure Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": ["/absolute/path/to/google-workspace-mcp/dist/index.js"]
    }
  }
}
```

**Configuration guide:** [Claude Desktop Setup](docs/getting-started/claude-desktop.md)

### 5. Test

In Claude Desktop:
```
Claude, what Google Workspace tools do you have available?
```

You should see 100+ tools ready to use!

**Complete quick start:** [Quick Start Guide](docs/getting-started/quick-start.md)

---

## 🤖 Multi-Provider LLM Router

The MCP server includes intelligent LLM routing across multiple providers with automatic cost optimization:

**Supported Providers:**
- **Anthropic Claude 3.5 Sonnet** - High-quality analysis, structured outputs
- **Google Gemini 1.5 Flash** - Cost-effective categorization, large context
- **OpenAI GPT-4o/Mini** - Balanced general-purpose tasks
- **Groq** - Ultra-fast inference
- **Mistral** - Open-source alternative

The router automatically selects the best provider based on task type, cost, and quality requirements, with automatic fallback if a provider fails.

**Learn more:** [LLM Router Architecture](docs/architecture/llm-router.md) | [LLM Configuration Guide](docs/guides/llm-configuration.md)

---

## 📊 Pre-Built Templates

Get started instantly with production-ready templates:

### Spreadsheet Templates
- Deal pipeline tracker with weighted forecasting
- Proposal management with win/loss analysis
- Time tracking with billable hours
- Client relationship tracker
- Financial dashboard

### Drive Folder Structures
- Government contracting operations
- International deal management
- Cybersecurity consulting
- PMI-standard project structures

**Learn more:** [Templates Guide](docs/guides/templates.md)

---

## 🔥 Real-World Use Cases

### Government Contractors
- Opportunity and proposal tracking
- Compliance documentation management
- Past performance organization
- Contract administration automation

### Business Development
- Pipeline management with forecasting
- Deal tracking and client relationships
- Automated status reporting

### Program Managers
- PMI PMBOK-compliant program management
- Deliverable lifecycle tracking
- Issue and decision logging
- Milestone tracking with EVM

### Consultants
- Project time tracking
- Client deliverable management
- Resource utilization reporting

**See examples:** [Workflow Examples](docs/guides/workflows.md) | [PMI Workflows](docs/pmi-framework/workflows.md)

---

## 📚 Documentation

**Complete documentation is available in the [docs/](docs/) directory.**

### Essential Guides
- **[Documentation Index](docs/INDEX.md)** - Complete documentation map
- **[Quick Start](docs/getting-started/quick-start.md)** - 10-minute setup guide
- **[Installation](docs/getting-started/installation.md)** - Detailed setup with Google Cloud
- **[Architecture Overview](docs/architecture/overview.md)** - System design and components

### API Reference
- **[API Index](docs/api-reference/index.md)** - Complete tool reference (100+ tools)
- **[Google Workspace API](docs/api-reference/google-workspace.md)** - Core tools
- **[Program Management API](docs/api-reference/program.md)** - PMI tools
- **[Deliverable Tracking API](docs/api-reference/deliverables.md)** - Lifecycle management
- **[Workflows API](docs/api-reference/workflows.md)** - Automation tools

### Advanced Topics
- **[Workflow Automation](docs/guides/workflows.md)** - 12+ real-world examples
- **[LLM Configuration](docs/guides/llm-configuration.md)** - Multi-provider setup
- **[PMI Framework](docs/pmi-framework/framework.md)** - PMBOK implementation
- **[Troubleshooting](docs/reference/troubleshooting.md)** - Common issues

**[→ Browse All Documentation](docs/INDEX.md)**

---

## 🛠️ Development

### Build Commands

```bash
npm run build       # Compile TypeScript
npm run watch       # Watch mode for development
npm run dev         # Build and run
npm run quality     # Run all quality checks (typecheck, lint, format)
```

### Code Quality

```bash
npm run typecheck   # TypeScript type checking
npm run lint        # ESLint
npm run lint:fix    # Auto-fix linting issues
npm run format      # Format with Prettier
```

### Automation Scripts

```bash
npm run create-program-spreadsheet    # Create program management spreadsheet
npm run create-document-spreadsheet   # Create document tracking spreadsheet
```

**Learn more:** [Scripts Reference](docs/guides/scripts.md) | [Configuration Guide](docs/reference/configuration.md)

---

## 🏗️ Architecture

The MCP server is built with a modular architecture:

```
├── Core Google Workspace Integration
│   └── Gmail, Drive, Sheets, Docs, Calendar, Tasks
├── PARA Organization Module
│   └── LLM-powered file categorization
├── PMO Module
│   └── Deliverables, risks, proposals
├── Program Management Module
│   └── Charter, WBS, milestones, logs
├── Document Organization Module
│   └── Categorization, routing, templates
├── Deliverable Tracking Module
│   └── Lifecycle, review, quality
└── Workflow Automation Module
    └── Events, scheduling, role-based access
```

**Powered by:**
- TypeScript for type safety
- Google APIs Client for Workspace integration
- Multi-provider LLM orchestration
- Event-driven workflow engine

**Learn more:** [Architecture Overview](docs/architecture/overview.md)

---

## 🔒 Security

- OAuth 2.0 authentication with Google
- Credentials never committed to git
- Environment variable support for custom paths
- API scopes limited to required permissions
- Token rotation and refresh handling

**Best practices:** [Security Guide](docs/reference/configuration.md#security)

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Code style guidelines
- Pull request process
- Adding new tools
- Documentation standards

---

## 📝 License

MIT License - See [LICENSE](./LICENSE) file for details.

---

## 📞 Support & Resources

- **Documentation:** [docs/INDEX.md](docs/INDEX.md)
- **Quick Start:** [docs/getting-started/quick-start.md](docs/getting-started/quick-start.md)
- **API Reference:** [docs/api-reference/index.md](docs/api-reference/index.md)
- **Troubleshooting:** [docs/reference/troubleshooting.md](docs/reference/troubleshooting.md)
- **FAQ:** [docs/reference/faq.md](docs/reference/faq.md)
- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)

---

## ✨ Features

- ✅ 100+ production-ready tools across 7 domains
- ✅ Multi-provider LLM routing with cost optimization
- ✅ LLM-powered document categorization and routing
- ✅ PMI PMBOK-compliant program management
- ✅ Complete deliverable lifecycle tracking
- ✅ Event-driven workflow automation
- ✅ Pre-built business templates
- ✅ Advanced search and metadata tracking
- ✅ Version control and audit trails
- ✅ Role-based access control
- ✅ Comprehensive documentation
- ✅ TypeScript type safety
- ✅ CI/CD with GitHub Actions
- ✅ Security best practices

---

**Built by Tay Daddy | The Bronze Shield**
Service-Disabled Veteran-Owned Small Business
Cybersecurity Consulting & Government Contracting

*Automating enterprise operations with intelligent workspace integration.* 🚀
