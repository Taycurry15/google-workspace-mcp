# Claude Desktop Setup Guide

Complete guide for connecting your Google Workspace MCP server to Claude Desktop.

**Last Updated:** 2026-01-05
**Estimated Time:** 5-10 minutes

---

## Prerequisites

Before configuring Claude Desktop, ensure you have completed:

- [✅ Installation Guide](installation.md) - Server installed and built
- [✅ Authentication Guide](authentication.md) - Google OAuth complete
- [ ] Both `credentials.json` and `token.json` exist in project root
- [ ] Server builds successfully (`npm run build`)

**Verify prerequisites:**
```bash
cd google-workspace-mcp
ls credentials.json token.json dist/index.js
# All three files should exist
```

---

## Configuration Steps

### Step 1: Locate Claude Desktop Config File

The config file location depends on your operating system:

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### Step 2: Open Config Directory

**macOS:**
```bash
open ~/Library/Application\ Support/Claude/
```

**Windows:**
```bash
explorer %APPDATA%\Claude
```

**Linux:**
```bash
xdg-open ~/.config/Claude/
```

If the directory doesn't exist, create it:

```bash
# macOS
mkdir -p ~/Library/Application\ Support/Claude/

# Windows (PowerShell)
New-Item -ItemType Directory -Force -Path "$env:APPDATA\Claude"

# Linux
mkdir -p ~/.config/Claude/
```

### Step 3: Get Absolute Path to MCP Server

```bash
cd google-workspace-mcp
pwd
```

Copy this path - you'll need it for the config file.

**Example output:**
```
/Users/taydaddy/projects/google-workspace-mcp
```

### Step 4: Create or Edit Config File

Open `claude_desktop_config.json` in your text editor.

**If file doesn't exist**, create it with this content:

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

**If file already exists with other MCP servers**, add the `google-workspace` entry to the existing `mcpServers` object:

```json
{
  "mcpServers": {
    "existing-server": {
      "command": "...",
      "args": ["..."]
    },
    "google-workspace": {
      "command": "node",
      "args": [
        "/absolute/path/to/google-workspace-mcp/dist/index.js"
      ]
    }
  }
}
```

**Important:** Replace `/absolute/path/to/` with your actual path from Step 3!

---

## Platform-Specific Examples

### macOS Configuration

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

**Paths with spaces:** No escaping needed in JSON!
```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": [
        "/Users/taycurry/Library/Mobile Documents/com~apple~CloudDocs/Projects/Google Workspace MCP/dist/index.js"
      ]
    }
  }
}
```

### Windows Configuration

```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": [
        "C:\\Users\\TayDaddy\\projects\\google-workspace-mcp\\dist\\index.js"
      ]
    }
  }
}
```

**Note:** Use double backslashes `\\` in Windows paths within JSON.

### Linux Configuration

```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": [
        "/home/taydaddy/projects/google-workspace-mcp/dist/index.js"
      ]
    }
  }
}
```

---

## Advanced Configuration

### With Environment Variables

If you're using custom credential paths via `.env` file:

```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": [
        "/absolute/path/to/google-workspace-mcp/dist/index.js"
      ],
      "env": {
        "CREDENTIALS_PATH": "/path/to/credentials.json",
        "TOKEN_PATH": "/path/to/token.json",
        "NODE_ENV": "production"
      }
    }
  }
}
```

### With Debug Mode

To enable detailed logging:

```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": [
        "/absolute/path/to/google-workspace-mcp/dist/index.js"
      ],
      "env": {
        "DEBUG": "true",
        "NODE_ENV": "development"
      }
    }
  }
}
```

### Multiple MCP Server Instances

To run multiple instances with different Google accounts:

```json
{
  "mcpServers": {
    "google-workspace-personal": {
      "command": "node",
      "args": [
        "/path/to/google-workspace-mcp-personal/dist/index.js"
      ],
      "env": {
        "CREDENTIALS_PATH": "/path/to/personal-credentials.json",
        "TOKEN_PATH": "/path/to/personal-token.json"
      }
    },
    "google-workspace-work": {
      "command": "node",
      "args": [
        "/path/to/google-workspace-mcp-work/dist/index.js"
      ],
      "env": {
        "CREDENTIALS_PATH": "/path/to/work-credentials.json",
        "TOKEN_PATH": "/path/to/work-token.json"
      }
    }
  }
}
```

---

## Restart and Verify

### Step 1: Restart Claude Desktop

**Important:** You must quit Claude completely, not just close the window.

**macOS:**
1. Press `Cmd+Q` to quit Claude
2. Relaunch from Applications or Spotlight

**Windows:**
1. Right-click Claude in system tray → Quit
2. Relaunch from Start Menu

**Linux:**
1. Close all Claude windows
2. Ensure process is stopped: `pkill claude`
3. Relaunch Claude

### Step 2: Verify Connection

1. Open Claude Desktop
2. Start a new conversation
3. Ask:

```
What Google Workspace tools do you have available?
```

**Expected response:**

Claude should list 100+ tools across 7 domains:

1. **Core Google Workspace (40+ tools)**
   - Gmail, Drive, Sheets, Docs, Calendar, Tasks

2. **PARA Organization (8+ tools)**
   - File categorization and organization

3. **PMO Module (6+ tools)**
   - Deliverables, risks, proposals

4. **Program Management (18+ tools)**
   - Charter, WBS, milestones, issues, decisions

5. **Document Organization (13+ tools)**
   - LLM-powered categorization and routing

6. **Deliverable Tracking (27+ tools)**
   - Lifecycle management and reporting

7. **Workflow Automation (10+ tools)**
   - Event-driven and scheduled workflows

**If you see the tools - success!** ✅

---

## Quick Tests

### Test 1: Gmail
```
Send me a test email with subject "MCP Setup Complete"
```

### Test 2: Drive
```
List my 5 most recent Google Drive files
```

### Test 3: Sheets
```
Create a spreadsheet called "MCP Test" with columns:
Name, Email, Status
```

### Test 4: Calendar
```
What events do I have today?
```

### Test 5: LLM-Powered Feature
```
Explain the PARA method for organizing files
```

All tests should work without errors. If they do, your setup is complete!

---

## Troubleshooting

### Issue: Claude Doesn't Show Any Tools

**Symptoms:**
- Claude responds normally but doesn't mention Google Workspace tools
- No MCP tools are available

**Solutions:**

1. **Verify absolute path is correct:**
   ```bash
   # Test the path from your config:
   node "/absolute/path/to/google-workspace-mcp/dist/index.js"
   # Should start the MCP server without errors
   ```

2. **Check file exists:**
   ```bash
   ls -la "/absolute/path/to/google-workspace-mcp/dist/index.js"
   ```

3. **Verify credentials exist:**
   ```bash
   cd /absolute/path/to/google-workspace-mcp
   ls credentials.json token.json
   ```

4. **Check config file syntax:**
   ```bash
   # Validate JSON syntax
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python -m json.tool
   ```

5. **Restart Claude Desktop completely:**
   - Quit with Cmd+Q (macOS) or right-click → Quit (Windows)
   - Wait 5 seconds
   - Relaunch

6. **Check Claude Desktop logs:**
   ```bash
   # macOS
   tail -f ~/Library/Logs/Claude/mcp*.log

   # Windows
   type %APPDATA%\Claude\logs\mcp*.log

   # Linux
   tail -f ~/.config/Claude/logs/mcp*.log
   ```

### Issue: "Module not found" or "Cannot find package"

**Solutions:**

1. **Rebuild the server:**
   ```bash
   cd google-workspace-mcp
   npm run build
   ```

2. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

3. **Verify Node.js version:**
   ```bash
   node --version  # Must be 18+
   ```

### Issue: "Authentication failed" or "Invalid credentials"

**Solutions:**

1. **Verify credentials.json is valid:**
   ```bash
   cd google-workspace-mcp
   cat credentials.json | python -m json.tool
   ```

2. **Re-authenticate:**
   ```bash
   npm run setup-auth
   ```

3. **Check token.json exists:**
   ```bash
   ls -la token.json
   ```

### Issue: Path with Spaces Causes Errors

**Solution:**

In JSON, paths with spaces are enclosed in quotes - no extra escaping needed.

**Correct:**
```json
"args": ["/Users/tay/My Documents/google-workspace-mcp/dist/index.js"]
```

**Incorrect:**
```json
"args": ["/Users/tay/My\\ Documents/google-workspace-mcp/dist/index.js"]
```

### Issue: Server Starts But Tools Don't Work

**Check API permissions:**

1. Verify all 6 APIs are enabled in [Google Cloud Console](https://console.cloud.google.com/apis/dashboard)
2. Re-run `npm run setup-auth` to ensure all scopes are granted
3. Check for quota limits at https://console.cloud.google.com/apis/dashboard

### Issue: MCP Server Crashes or Restarts

**Check logs for errors:**

```bash
# macOS
tail -100 ~/Library/Logs/Claude/mcp*.log

# Look for error messages
grep -i error ~/Library/Logs/Claude/mcp*.log
```

**Common causes:**
- Invalid credentials
- Expired tokens (re-run `npm run setup-auth`)
- Missing dependencies (run `npm install`)
- TypeScript errors (run `npm run build`)

---

## Config File Reference

### Minimal Configuration

```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": ["/path/to/dist/index.js"]
    }
  }
}
```

### Full Configuration

```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "CREDENTIALS_PATH": "/custom/path/credentials.json",
        "TOKEN_PATH": "/custom/path/token.json",
        "NODE_ENV": "production",
        "DEBUG": "false",
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "GOOGLE_API_KEY": "AI-...",
        "OPENAI_API_KEY": "sk-...",
        "LLM_ROUTER_ENVIRONMENT": "production",
        "LLM_COST_LIMIT_PER_DAY": "10"
      }
    }
  }
}
```

### Config File Locations

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

### Log File Locations

| Platform | Path |
|----------|------|
| macOS | `~/Library/Logs/Claude/mcp*.log` |
| Windows | `%APPDATA%\Claude\logs\mcp*.log` |
| Linux | `~/.config/Claude/logs/mcp*.log` |

---

## Next Steps

### Start Using the Tools

Try these example workflows:

**Email Automation:**
```
Claude, search my email for messages from John Doe in the last week,
summarize them, and draft a response.
```

**Document Management:**
```
Claude, create a PMI-standard folder structure for the Alpha Program,
then upload my project charter and route it to the appropriate folder.
```

**Pipeline Management:**
```
Claude, show me all deals in my pipeline with probability > 60%,
calculate weighted value, and flag any with no activity in 7+ days.
```

### Explore Documentation

- **[API Reference](../api-reference/index.md)** - All 100+ tools documented
- **[Workflow Examples](../guides/workflows.md)** - Real-world use cases
- **[Architecture Overview](../architecture/overview.md)** - How it works

### Configure LLM Router

For cost-optimized multi-provider LLM routing:
- **[LLM Configuration Guide](../guides/llm-configuration.md)**
- **[LLM Router Architecture](../architecture/llm-router.md)**

---

## Support

**Related Documentation:**
- [Quick Start Guide](quick-start.md) - 10-minute setup
- [Installation Guide](installation.md) - Complete installation
- [Authentication Guide](authentication.md) - OAuth details
- [Troubleshooting](../reference/troubleshooting.md) - Common issues
- [Configuration](../reference/configuration.md) - Advanced settings

---

**🎉 Once configured, you'll have powerful Google Workspace automation through Claude!**
