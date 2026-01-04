# Google Workspace MCP Server - 45-Minute Deployment Guide

Complete setup guide to get your Google Workspace MCP server running in under 45 minutes.

## Prerequisites (5 minutes)

**What You Need:**
- Google Workspace or Gmail account
- Node.js 18+ installed
- Claude Desktop or API access
- Terminal/command line access

**Check Node Version:**
```bash
node --version  # Should be 18.0.0 or higher
```

If you need Node.js: https://nodejs.org/

---

## Phase 1: Google Cloud Setup (15 minutes)

### Step 1: Create Google Cloud Project (5 min)

1. Go to https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Project name: `workspace-mcp-server`
4. Click "Create"
5. Wait for project creation (30 seconds)

### Step 2: Enable Required APIs (5 min)

In your new project:

1. Go to "APIs & Services" → "Library"
2. Search and enable each API (click "Enable" button):
   - Gmail API
   - Google Drive API
   - Google Sheets API
   - Google Docs API
   - Google Calendar API
   - Google Tasks API

**Quick Enable Links:**
- https://console.cloud.google.com/apis/library/gmail.googleapis.com
- https://console.cloud.google.com/apis/library/drive.googleapis.com
- https://console.cloud.google.com/apis/library/sheets.googleapis.com
- https://console.cloud.google.com/apis/library/docs.googleapis.com
- https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
- https://console.cloud.google.com/apis/library/tasks.googleapis.com

### Step 3: Create OAuth Credentials (5 min)

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure OAuth consent screen first:
   - User Type: **External**
   - App name: `Workspace MCP Server`
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue"
   - Scopes: Skip for now (click "Save and Continue")
   - Test users: Add your email
   - Click "Save and Continue" → "Back to Dashboard"

4. Now create OAuth client:
   - Go back to "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Desktop app**
   - Name: `MCP Server Desktop`
   - Click "Create"

5. **Download credentials:**
   - Click "Download JSON" button
   - Save as `credentials.json`
   - **Keep this file safe!** (Do not commit to git)

---

## Phase 2: Install MCP Server (10 minutes)

### Step 1: Download or Clone (2 min)

**Option A: Clone from repository**
```bash
git clone https://github.com/yourusername/google-workspace-mcp.git
cd google-workspace-mcp
```

**Option B: Extract from ZIP**
```bash
unzip google-workspace-mcp.zip
cd google-workspace-mcp
```

### Step 2: Install Dependencies (3 min)

```bash
npm install
```

This will install:
- Google APIs client library
- OAuth authentication
- MCP SDK
- TypeScript dependencies

### Step 3: Add Credentials (1 min)

Move your downloaded `credentials.json` to the project root:

```bash
# If in Downloads folder:
mv ~/Downloads/credentials.json ./credentials.json

# Verify it's there:
ls -la credentials.json
```

### Step 4: Build the Server (2 min)

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### Step 4.5: Environment Variables (Optional - 2 min)

For custom credential locations:

```bash
cp .env.example .env
# Edit .env file with your paths
```

**When to use:**
- Credentials stored outside project directory
- Multiple MCP server instances
- Shared credential storage

**Default behavior:** Credentials and tokens are stored in the project root. Skip this step if that works for you.

### Step 5: Authenticate with Google (2 min)

```bash
npm run setup-auth
```

**What happens:**
1. Opens browser to Google login
2. Shows you permission scopes (Gmail, Drive, etc.)
3. Click "Allow"
4. Copy the authorization code
5. Paste into terminal
6. Creates `token.json` file

**You should see:**
```
✓ Token saved to token.json
✓ Authentication complete!
✓ Setup complete! You can now use the MCP server.
```

---

## Phase 3: Configure Claude Desktop (10 minutes)

### Step 1: Locate Claude Config (2 min)

**macOS:**
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```bash
code ~/.config/Claude/claude_desktop_config.json
```

If file doesn't exist, create it:
```bash
# macOS
touch ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Windows (in PowerShell)
New-Item -ItemType File -Path "$env:APPDATA\Claude\claude_desktop_config.json"

# Linux
touch ~/.config/Claude/claude_desktop_config.json
```

### Step 2: Add MCP Server Configuration (5 min)

Add this to your `claude_desktop_config.json`:

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
# Run this in your project directory:
pwd
```

**Example configurations:**

**macOS:**
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

**Windows:**
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

### Step 3: Restart Claude Desktop (1 min)

1. Completely quit Claude Desktop
2. Relaunch Claude Desktop
3. Start a new conversation

### Step 4: Verify Installation (2 min)

In Claude Desktop, ask:

```
Claude, what Google Workspace tools do you have available?
```

You should see a list of 30+ tools including:
- Gmail tools (send, search, drafts, etc.)
- Drive tools (files, folders, sharing, etc.)
- Sheets tools (create, read, write, format, etc.)
- Docs tools (create, read, update, etc.)
- Calendar tools (events, scheduling, etc.)
- Tasks tools (create, list, update, etc.)

**If you see the tools, you're ready!** ✅

---

## Phase 4: Quick Start Test (5 minutes)

### Test 1: Send Test Email (1 min)

```
Claude, send me a test email with subject "MCP Test" and body "Server is working!"
```

Check your inbox for the email.

### Test 2: Create Test Spreadsheet (2 min)

```
Claude, create a test spreadsheet called "MCP Test Sheet" with:
- Sheet 1: "Data"
- Headers: Name, Value, Formula
- Add a row: "Test", 100, and a formula to multiply Value by 2
```

### Test 3: List Your Files (1 min)

```
Claude, show me my most recent 5 files in Google Drive
```

### Test 4: Create Calendar Event (1 min)

```
Claude, create a calendar event tomorrow at 2pm for 1 hour titled "MCP Server Testing Complete"
```

**If all tests work, you're 100% operational!** 🚀

---

## Phase 5: Create Business Templates (Optional - 10 minutes)

### Create Folder Structure

```bash
npm run create-folders govcon
```

This creates a complete government contracting folder structure in your Drive.

**Other options:**
```bash
npm run create-folders international  # International deals
npm run create-folders cybersec        # Cybersecurity practice
npm run create-folders business        # General business ops
npm run create-folders all             # All structures
```

### Create Spreadsheet Templates

```bash
npm run create-sheets deal
```

Creates a deal pipeline tracker with formulas.

**Other templates:**
```bash
npm run create-sheets proposal    # Proposal management
npm run create-sheets time         # Time tracking
npm run create-sheets client       # Client relationship tracker
npm run create-sheets financial    # Financial dashboard
npm run create-sheets all          # All templates
```

---

## Troubleshooting

### Issue: "No token found" Error

**Solution:**
```bash
npm run setup-auth
```
Re-authenticate with Google.

### Issue: "credentials.json not found"

**Solution:**
1. Download credentials from Google Cloud Console
2. Save as `credentials.json` in project root
3. Verify: `ls -la credentials.json`

### Issue: "APIs not enabled"

**Solution:**
Go to Google Cloud Console and enable required APIs (see Phase 1, Step 2).

### Issue: Claude doesn't see the tools

**Solution:**
1. Check config file path is correct (absolute path)
2. Verify `dist/index.js` exists: `ls dist/index.js`
3. Restart Claude Desktop completely
4. Check logs in Claude Desktop developer tools

### Issue: "Permission denied" errors

**Solution:**
1. Delete `token.json`
2. Run `npm run setup-auth` again
3. Make sure you allow all permissions when authenticating

### Issue: "Module not found" errors

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## Security Best Practices

1. **Never commit credentials:**
   ```bash
   # Add to .gitignore
   echo "credentials.json" >> .gitignore
   echo "token.json" >> .gitignore
   ```

2. **Use environment-specific configs:**
   - Development: Test account
   - Production: Business account

3. **Rotate tokens periodically:**
   ```bash
   rm token.json
   npm run setup-auth
   ```

4. **Review OAuth scopes:**
   Only enable APIs you actually use.

5. **Monitor API usage:**
   Check Google Cloud Console → APIs & Services → Dashboard

---

## What's Next?

### 1. Read the Workflows Guide
```bash
cat WORKFLOWS.md
```

Learn 12+ real-world automation workflows.

### 2. Customize Templates

Edit `src/create-sheets.ts` and `src/create-folders.ts` to match your business structure.

### 3. Build Custom Workflows

Start with simple automation:
```
Claude, help me automate my morning routine:
1. Read unread emails from last 24 hours
2. Summarize by priority
3. Create tasks for action items
4. Show my calendar for today
```

### 4. Integrate with Your Systems

Add custom tools for your specific needs:
- CRM integration
- Project management
- Financial systems
- Custom reporting

---

## Command Reference

### Common Commands

```bash
# Build after code changes
npm run build

# Watch mode (auto-rebuild)
npm run watch

# Re-authenticate
npm run setup-auth

# Test the server
npm test

# Create folder structures
npm run create-folders <type>

# Create sheet templates
npm run create-sheets <type>
```

### Package Scripts

```json
{
  "build": "Compile TypeScript to JavaScript",
  "watch": "Auto-rebuild on file changes",
  "setup-auth": "Authenticate with Google OAuth",
  "test": "Test the MCP server",
  "dev": "Build and run"
}
```

---

## Configuration Files

### package.json
- Dependencies and scripts
- Entry point configuration

### tsconfig.json
- TypeScript compiler settings
- Module resolution

### credentials.json
- Google OAuth client credentials
- **Keep secure, never commit**

### token.json
- OAuth access/refresh tokens
- Auto-generated, **never commit**

### claude_desktop_config.json
- MCP server configuration
- Points to your server executable

---

## Performance Tips

1. **Batch operations** when possible (e.g., `sheets_batch_update`)
2. **Cache frequently used data** (folder IDs, sheet IDs)
3. **Use filters** in queries to reduce data transfer
4. **Limit search results** to what you actually need
5. **Format once** instead of multiple format calls

---

## Getting Help

### Check Logs

**Claude Desktop Logs:**
- macOS: `~/Library/Logs/Claude/`
- Windows: `%APPDATA%\Claude\logs\`
- Linux: `~/.config/Claude/logs/`

### Debug Mode

Add to your MCP config:
```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "DEBUG": "true"
      }
    }
  }
}
```

### Test Independently

```bash
echo '{"method":"tools/list"}' | node dist/index.js
```

### Common Questions

**Q: Can I use multiple Google accounts?**
A: Yes, create separate credential sets and use different token files.

**Q: What are API rate limits?**
A: Gmail: 250 quota units/user/second. Drive: 1000 requests/100 seconds. Normal usage is well within limits.

**Q: Can I use this in production?**
A: Yes! Just ensure proper error handling and monitoring.

**Q: How do I update the server?**
A: Pull latest code, run `npm install`, then `npm run build`.

---

## Success Checklist

- [ ] Node.js 18+ installed
- [ ] Google Cloud project created
- [ ] All 6 APIs enabled
- [ ] OAuth credentials downloaded
- [ ] Project dependencies installed
- [ ] Server built successfully
- [ ] Google authentication complete
- [ ] Claude Desktop configured
- [ ] Tools visible in Claude
- [ ] Test email sent
- [ ] Test spreadsheet created
- [ ] Test calendar event created
- [ ] Folder structure created (optional)
- [ ] Sheet templates created (optional)

**If all checked, you're ready to automate your business with Google Workspace!** 🎉

---

## Time Breakdown

- **Phase 1 (Google Cloud):** 15 minutes
- **Phase 2 (Install Server):** 10 minutes
- **Phase 3 (Configure Claude):** 10 minutes
- **Phase 4 (Test):** 5 minutes
- **Phase 5 (Templates):** 10 minutes (optional)

**Total: 40-50 minutes** depending on your familiarity with the tools.

---

## Next Steps

1. **Read WORKFLOWS.md** for real-world examples
2. **Customize templates** for your business
3. **Build custom workflows** for your specific needs
4. **Integrate with other systems** as needed
5. **Share with your team** to multiply productivity

Welcome to automated business operations with Google Workspace! 🚀
