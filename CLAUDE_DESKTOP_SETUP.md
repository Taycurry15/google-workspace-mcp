# Claude Desktop Configuration Guide

Quick setup guide for connecting your Google Workspace MCP server to Claude Desktop.

## Prerequisites

Before configuring Claude Desktop, ensure you have:
- ✅ Installed dependencies (`npm install`)
- ✅ Built the project (`npm run build`)
- ✅ Completed Google OAuth setup (`npm run setup-auth`)
- ✅ Both `credentials.json` and `token.json` exist in your project root

## Quick Setup (5 minutes)

### Step 1: Locate Claude Desktop Config

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Open the directory:
```bash
open ~/Library/Application\ Support/Claude/
```

If the `claude_desktop_config.json` file doesn't exist, create it.

---

### Step 2: Edit Configuration

1. Open `claude_desktop_config.json` in your text editor
2. Copy the content from `claude_desktop_config.example.json` in this project
3. Paste it into your Claude Desktop config
4. **Important:** Verify the absolute paths are correct for your installation

**Default paths (if you didn't move the project):**
```json
{
  "mcpServers": {
    "google-workspace-mcp": {
      "command": "node",
      "args": [
        "/Users/taycurry/Library/Mobile Documents/com~apple~CloudDocs/Projects/Google Workspace MCP/dist/index.js"
      ],
      "env": {
        "CREDENTIALS_PATH": "/Users/taycurry/Library/Mobile Documents/com~apple~CloudDocs/Projects/Google Workspace MCP/credentials.json",
        "TOKEN_PATH": "/Users/taycurry/Library/Mobile Documents/com~apple~CloudDocs/Projects/Google Workspace MCP/token.json",
        "NODE_ENV": "production"
      }
    }
  }
}
```

**If you have other MCP servers configured:**
Add the `google-workspace-mcp` entry to your existing `mcpServers` object.

**Note:** Paths with spaces (like "Google Workspace MCP") are handled correctly in JSON with quotes - no escaping needed.

---

### Step 3: Restart Claude Desktop

1. **Quit Claude completely:** Press `Cmd+Q` (don't just close the window)
2. **Relaunch Claude Desktop** from Applications or Spotlight
3. **Wait ~5 seconds** for the server to initialize

---

### Step 4: Verify Installation

**Start a new conversation in Claude** and ask:

```
What Google Workspace tools do you have?
```

**Expected Response:**
Claude should list 30+ tools including:
- **Gmail:** Send, search, manage emails and drafts
- **Drive:** Files, folders, permissions, sharing
- **Sheets:** Create, update, format, formulas
- **Docs:** Create, edit, format documents
- **Calendar:** Events, scheduling, attendees
- **Tasks:** Task lists and management

**If you see the tools ✅** - Setup complete! Start automating your workflow.

---

## Troubleshooting

### Issue: Claude doesn't see any tools

**Check these in order:**

1. **Verify absolute paths in config:**
   ```bash
   ls "/Users/taycurry/Library/Mobile Documents/com~apple~CloudDocs/Projects/Google Workspace MCP/dist/index.js"
   ```
   Should show the file exists.

2. **Verify credentials exist:**
   ```bash
   ls "/Users/taycurry/Library/Mobile Documents/com~apple~CloudDocs/Projects/Google Workspace MCP/credentials.json"
   ls "/Users/taycurry/Library/Mobile Documents/com~apple~CloudDocs/Projects/Google Workspace MCP/token.json"
   ```
   Both files should exist.

3. **Check Claude Desktop logs:**
   ```bash
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```
   Look for error messages related to `google-workspace-mcp`.

4. **Restart Claude Desktop completely:**
   - Quit with `Cmd+Q` (not just close window)
   - Relaunch from Applications

5. **Rebuild the project:**
   ```bash
   cd "/Users/taycurry/Library/Mobile Documents/com~apple~CloudDocs/Projects/Google Workspace MCP"
   npm run build
   ```

---

### Issue: "Authentication failed" or "Invalid credentials"

**Solution:**

1. **Verify credentials.json is valid:**
   ```bash
   cat credentials.json
   ```
   Should show valid JSON with `installed` or `web` object.

2. **Re-run OAuth setup:**
   ```bash
   npm run setup-auth
   ```
   Follow the authentication flow again.

3. **Check token.json exists and has valid tokens:**
   ```bash
   ls -la token.json
   ```
   If missing or corrupted, re-run `npm run setup-auth`.

---

### Issue: "Module not found" or "Cannot find package"

**Solution:**

1. **Reinstall dependencies:**
   ```bash
   cd "/Users/taycurry/Library/Mobile Documents/com~apple~CloudDocs/Projects/Google Workspace MCP"
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Verify Node.js version:**
   ```bash
   node --version
   ```
   Should be v18 or higher.

---

### Issue: Path with spaces causing problems

**Solution:**

In JSON, paths with spaces are handled by the surrounding quotes. No escaping needed.

**Correct:**
```json
"args": ["/Users/taycurry/Library/Mobile Documents/com~apple~CloudDocs/Projects/Google Workspace MCP/dist/index.js"]
```

**Incorrect:**
```json
"args": ["/Users/taycurry/Library/Mobile Documents/com~apple~CloudDocs/Projects/Google Workspace MCP/dist/index.js"]  ❌ (extra backslashes)
```

---

### Issue: Server starts but tools don't work

**Check API permissions:**

1. **Verify all required APIs are enabled** in Google Cloud Console:
   - Gmail API
   - Google Drive API
   - Google Sheets API
   - Google Docs API
   - Google Calendar API
   - Google Tasks API

2. **Verify OAuth scopes** in your credentials:
   Run `npm run setup-auth` again to ensure all scopes are granted.

3. **Check for quota limits:**
   View quotas at: https://console.cloud.google.com/apis/dashboard

---

## Testing Your Setup

Once Claude shows the tools, test with these commands:

### Gmail Test
```
Send a test email to myself with subject "MCP Test"
```

### Drive Test
```
List the first 10 files in my Google Drive
```

### Sheets Test
```
Create a new spreadsheet called "MCP Test Sheet" with headers Name, Email, Status
```

### Calendar Test
```
What events do I have on my calendar today?
```

### Tasks Test
```
Create a new task called "Test MCP Integration"
```

---

## Advanced Configuration

### Custom Credential Paths

If you want to store credentials outside the project:

1. **Create a `.env` file** in the project root:
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** with your custom paths:
   ```bash
   CREDENTIALS_PATH=/path/to/your/credentials.json
   TOKEN_PATH=/path/to/your/token.json
   ```

3. **Update Claude Desktop config** to use environment variables (or remove the `env` object to use .env file)

### Multiple MCP Server Instances

To run multiple instances (e.g., different Google accounts):

1. **Create separate project directories**
2. **Run `npm run setup-auth`** in each with different `credentials.json`
3. **Add multiple entries** to Claude Desktop config:
   ```json
   {
     "mcpServers": {
       "google-workspace-personal": { ... },
       "google-workspace-work": { ... }
     }
   }
   ```

---

## Getting Help

If you continue to have issues:

1. **Check the logs:**
   ```bash
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```

2. **Verify the setup:**
   ```bash
   cd "/Users/taycurry/Library/Mobile Documents/com~apple~CloudDocs/Projects/Google Workspace MCP"
   npm run build
   node dist/index.js
   ```
   Should show MCP server initialization.

3. **Review the main documentation:**
   - [README.md](README.md) - Overview and features
   - [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
   - [WORKFLOWS.md](WORKFLOWS.md) - Real-world usage examples

---

## Quick Reference

**Config File Location:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Log File Location:**
```
~/Library/Logs/Claude/mcp*.log
```

**Restart Claude:**
```
Cmd+Q, then relaunch
```

**Rebuild Project:**
```bash
cd "/Users/taycurry/Library/Mobile Documents/com~apple~CloudDocs/Projects/Google Workspace MCP"
npm run build
```

**Re-authenticate:**
```bash
npm run setup-auth
```

---

**🎉 Once setup is complete, you'll have powerful Google Workspace automation at your fingertips through Claude!**
