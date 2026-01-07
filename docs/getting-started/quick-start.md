# Quick Start Guide

Get your Google Workspace MCP server up and running in 10 minutes.

**Last Updated:** 2026-01-05

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed ([Download](https://nodejs.org/))
- A Google Workspace or Gmail account
- Claude Desktop installed

**Check Node version:**
```bash
node --version  # Should be 18.0.0 or higher
```

---

## 1. Install the MCP Server (3 minutes)

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/google-workspace-mcp.git
cd google-workspace-mcp

# Install dependencies
npm install

# Build the server
npm run build
```

**Verify build:**
```bash
ls dist/index.js  # Should exist
```

---

## 2. Set Up Google Cloud (5 minutes)

### Create Project and Enable APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: `workspace-mcp-server`
3. Enable the following APIs:
   - [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
   - [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
   - [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)
   - [Google Docs API](https://console.cloud.google.com/apis/library/docs.googleapis.com)
   - [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
   - [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)

### Create OAuth Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Configure OAuth consent screen if prompted (External, add your email)
4. Choose **Desktop app** as application type
5. Click **Create**
6. **Download JSON** and save as `credentials.json` in project root

**Full instructions:** [Installation Guide](installation.md)

---

## 3. Authenticate with Google (2 minutes)

Run the authentication script:

```bash
npm run setup-auth
```

This will:
1. Open your browser to Google login
2. Ask you to authorize permissions
3. Create a `token.json` file

**Expected output:**
```
✓ Token saved to token.json
✓ Authentication complete!
✓ Setup complete!
```

**Troubleshooting:** See [Authentication Guide](authentication.md)

---

## 4. Configure Claude Desktop (3 minutes)

### Find your config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

### Add MCP server configuration:

```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": [
        "/absolute/path/to/google-workspace-mcp/dist/index.js"
      ]
    }
  }
}
```

**Important:** Replace `/absolute/path/to/` with your actual path!

**Find your path:**
```bash
cd google-workspace-mcp
pwd
```

**Example:**
```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": [
        "/Users/taydaddy/projects/google-workspace-mcp/dist/index.js"
      ]
    }
  }
}
```

**Detailed setup:** [Claude Desktop Setup Guide](claude-desktop.md)

---

## 5. Test Your Setup (2 minutes)

### Restart Claude Desktop

1. Quit Claude completely (Cmd+Q on macOS)
2. Relaunch Claude Desktop
3. Wait ~5 seconds for initialization

### Verify Tools Are Available

In Claude Desktop, ask:

```
What Google Workspace tools do you have available?
```

**Expected:** You should see 100+ tools including Gmail, Drive, Sheets, Docs, Calendar, Tasks, PARA organization, PMO, Program Management, Document Organization, Deliverable Tracking, and Workflows.

### Quick Tests

Try these commands:

**Gmail:**
```
Send me a test email with subject "MCP Test"
```

**Drive:**
```
List my 5 most recent Google Drive files
```

**Sheets:**
```
Create a test spreadsheet called "MCP Test" with headers Name, Value, Status
```

**Calendar:**
```
What events do I have today?
```

**If all tests work, you're ready!** 🎉

---

## Optional: Set Up LLM Router (5 minutes)

The MCP server includes intelligent multi-provider LLM routing for cost optimization.

### Add API Keys

Create a `.env` file (or edit existing):

```bash
cp .env.example .env
```

Add at least one provider API key:

```bash
# Anthropic Claude (recommended for high-quality analysis)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Google Gemini (free tier available, great for categorization)
GOOGLE_API_KEY=AI-your-key-here

# OpenAI (balanced performance)
OPENAI_API_KEY=sk-your-key-here
```

**Get API Keys:**
- **Anthropic:** https://console.anthropic.com/
- **Google Gemini:** https://aistudio.google.com/app/apikey
- **OpenAI:** https://platform.openai.com/api-keys

### Configure Router (Optional)

Edit `.env` to set routing preferences:

```bash
# Routing strategy
LLM_ROUTER_ENVIRONMENT=production  # or cost_optimized, high_quality, speed_optimized

# Daily budget limit
LLM_COST_LIMIT_PER_DAY=10  # $10/day

# Enable debug logging
DEBUG_LLMS=false
```

**Learn more:** [LLM Configuration Guide](../guides/llm-configuration.md) | [LLM Router Architecture](../architecture/llm-router.md)

---

## Next Steps

### Learn the Capabilities

- **[API Reference](../api-reference/index.md)** - Explore all 100+ tools
- **[Workflow Examples](../guides/workflows.md)** - 12+ real-world automation examples
- **[Architecture Overview](../architecture/overview.md)** - Understand how it works

### Start Automating

Try these workflow prompts:

**Deal Capture:**
```
Claude, new deal: Acme Corp, $2.5M opportunity, 70% probability,
partners: TechCo. Add to tracker, create deal folder, draft notification.
```

**Weekly Review:**
```
Claude, show me my weekly pipeline review with total value,
weighted forecast, and deals with no activity in 7+ days.
```

**Document Organization:**
```
Claude, I uploaded a project charter to Drive (file ID: abc123).
Submit it to the Alpha Program for automatic categorization and routing.
```

**Status Reporting:**
```
Claude, generate a program status report for the Beta Program
including milestones, issues, risks, and deliverables.
```

### Customize for Your Needs

- **[Templates Guide](../guides/templates.md)** - Create spreadsheets and folder structures
- **[PMI Framework](../pmi-framework/framework.md)** - Implement PMBOK program management
- **[Configuration Guide](../reference/configuration.md)** - Environment variables and settings

---

## Troubleshooting

### Claude Doesn't See Tools

1. Verify absolute path in `claude_desktop_config.json`
2. Ensure `dist/index.js` exists
3. Restart Claude Desktop completely (Cmd+Q, not just close)
4. Check logs: `~/Library/Logs/Claude/mcp*.log`

### Authentication Failed

```bash
# Re-authenticate
rm token.json
npm run setup-auth
```

### Build Errors

```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Full troubleshooting:** [Troubleshooting Guide](../reference/troubleshooting.md)

---

## Getting Help

- **[FAQ](../reference/faq.md)** - Frequently asked questions
- **[Documentation Index](../INDEX.md)** - Complete documentation map
- **[Troubleshooting](../reference/troubleshooting.md)** - Common issues and solutions
- **[Configuration](../reference/configuration.md)** - Advanced configuration options

---

**🎉 You're ready to automate your Google Workspace with intelligent AI-powered workflows!**
