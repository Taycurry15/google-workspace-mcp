# Installation Guide

Complete step-by-step installation guide for the Google Workspace MCP server.

**Last Updated:** 2026-01-05
**Estimated Time:** 45 minutes

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Google Cloud Setup](#phase-1-google-cloud-setup)
3. [Phase 2: Install MCP Server](#phase-2-install-mcp-server)
4. [Phase 3: Configure Claude Desktop](#phase-3-configure-claude-desktop)
5. [Phase 4: Verify Installation](#phase-4-verify-installation)
6. [Optional: Business Templates](#optional-business-templates)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (optional, for cloning)
- **Claude Desktop** or Claude API access

**Check versions:**
```bash
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 8.0.0
```

### Required Accounts

- Google Workspace or Gmail account
- Google Cloud account (free tier works)
- Claude Desktop account

---

## Phase 1: Google Cloud Setup

**Time:** 15 minutes

### Step 1: Create Google Cloud Project (5 min)

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. **Project name:** `workspace-mcp-server`
4. **Organization:** (optional) Select if applicable
5. Click **"Create"**
6. Wait for project creation (~30 seconds)
7. Select your new project from the dropdown

### Step 2: Enable Required APIs (5 min)

Enable all six Google Workspace APIs:

#### Quick Enable Links

Click each link and press **"Enable"**:

1. [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
2. [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
3. [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)
4. [Google Docs API](https://console.cloud.google.com/apis/library/docs.googleapis.com)
5. [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
6. [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)

#### Manual Enable Process

Alternatively, use the API Library:

1. Go to **APIs & Services → Library**
2. Search for each API name
3. Click on the API
4. Click **"Enable"**
5. Repeat for all six APIs

**Verify:** Go to **APIs & Services → Enabled APIs** and confirm all six are listed.

### Step 3: Configure OAuth Consent Screen (3 min)

Before creating credentials, configure the OAuth consent screen:

1. Go to **APIs & Services → OAuth consent screen**
2. **User Type:** Select **External**
3. Click **"Create"**

**App Information:**
- **App name:** `Google Workspace MCP Server`
- **User support email:** Your email address
- **App logo:** (optional)

**App Domain:** (optional, can skip)

**Developer contact information:**
- **Email addresses:** Your email address

4. Click **"Save and Continue"**

**Scopes:**
- Click **"Save and Continue"** (scopes will be requested during authentication)

**Test Users:**
- Click **"+ Add Users"**
- Add your email address
- Click **"Save and Continue"**

**Summary:**
- Review and click **"Back to Dashboard"**

### Step 4: Create OAuth Credentials (2 min)

1. Go to **APIs & Services → Credentials**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. **Application type:** Select **Desktop app**
4. **Name:** `MCP Server Desktop Client`
5. Click **"Create"**

**Download Credentials:**
1. In the popup, click **"Download JSON"**
2. Save the file as `credentials.json`
3. **Important:** Keep this file secure! Never commit to git.

**Note:** If you miss the download popup, you can download later from the credentials list by clicking the download icon.

---

## Phase 2: Install MCP Server

**Time:** 10 minutes

### Step 1: Download Source Code (2 min)

**Option A: Clone from Repository**
```bash
git clone https://github.com/yourusername/google-workspace-mcp.git
cd google-workspace-mcp
```

**Option B: Download ZIP**
```bash
# After downloading and extracting:
cd google-workspace-mcp
```

### Step 2: Install Dependencies (3 min)

```bash
npm install
```

This installs:
- `@modelcontextprotocol/sdk` - MCP server framework
- `googleapis` - Google APIs client library
- TypeScript and build tools
- All required dependencies

**Expected output:**
```
added 247 packages, and audited 248 packages in 45s
```

### Step 3: Add OAuth Credentials (1 min)

Move your downloaded `credentials.json` to the project root:

```bash
# If in Downloads folder (macOS):
mv ~/Downloads/credentials.json ./credentials.json

# If in Downloads folder (Windows):
move %USERPROFILE%\Downloads\credentials.json credentials.json
```

**Verify:**
```bash
ls -la credentials.json  # macOS/Linux
dir credentials.json     # Windows
```

The file should exist in your project root directory.

### Step 4: Build the Server (2 min)

```bash
npm run build
```

This compiles TypeScript source to JavaScript in the `dist/` directory.

**Expected output:**
```
> google-workspace-mcp@1.0.0 build
> tsc

# (No errors means successful build)
```

**Verify:**
```bash
ls dist/index.js  # Should exist
```

### Step 5: Authenticate with Google (2 min)

Run the OAuth authentication setup:

```bash
npm run setup-auth
```

**What happens:**
1. Opens your default browser to Google login
2. Shows the app name and requested permissions
3. Asks you to allow access to:
   - Gmail (send and manage)
   - Drive (full access)
   - Sheets (create and edit)
   - Docs (create and edit)
   - Calendar (manage events)
   - Tasks (manage tasks)
4. After allowing, you'll get an authorization code
5. Copy the code and paste it into the terminal
6. Creates `token.json` with access and refresh tokens

**Expected output:**
```
Authorize this app by visiting this url: https://accounts.google.com/o/oauth2/v2/auth?...

Enter the code from that page here: [paste code]
✓ Token saved to token.json
✓ Authentication complete!
✓ Setup complete! You can now use the MCP server.
```

**Troubleshooting:** See [Authentication Guide](authentication.md) for detailed OAuth information.

---

## Phase 3: Configure Claude Desktop

**Time:** 10 minutes

See the dedicated [Claude Desktop Setup Guide](claude-desktop.md) for detailed instructions.

### Quick Configuration

1. **Locate config file:**
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux:** `~/.config/Claude/claude_desktop_config.json`

2. **Get absolute path:**
   ```bash
   cd google-workspace-mcp
   pwd  # Copy this path
   ```

3. **Edit config file:**
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

4. **Restart Claude Desktop** (Quit completely, then relaunch)

---

## Phase 4: Verify Installation

**Time:** 5 minutes

### Check Tools Are Available

1. Open Claude Desktop
2. Start a new conversation
3. Ask:

```
What Google Workspace tools do you have available?
```

**Expected response:**
Claude should list 100+ tools across 7 domains:
- Core Google Workspace (40+ tools)
- PARA Organization (8+ tools)
- PMO Module (6+ tools)
- Program Management (18+ tools)
- Document Organization (13+ tools)
- Deliverable Tracking (27+ tools)
- Workflow Automation (10+ tools)

### Run Quick Tests

**Test 1: Gmail**
```
Send me a test email with subject "MCP Installation Test"
```

**Test 2: Drive**
```
List my 5 most recent Google Drive files
```

**Test 3: Sheets**
```
Create a test spreadsheet called "MCP Test" with headers:
Name, Email, Status
```

**Test 4: Calendar**
```
Create a calendar event tomorrow at 2pm titled "MCP Setup Complete"
```

**Test 5: Document Categorization (LLM-powered)**
```
What are the PARA categories for organizing files?
```

If all tests work, your installation is complete! 🎉

---

## Optional: Business Templates

**Time:** 10 minutes (optional)

### Create Folder Structures

Generate pre-built folder structures in Google Drive:

```bash
# Government contracting operations
npm run create-folders govcon

# International deal management
npm run create-folders international

# Cybersecurity consulting
npm run create-folders cybersec

# General business operations
npm run create-folders business

# Create all structures
npm run create-folders all
```

**Example output:** Creates organized folder hierarchies in your Drive.

### Create Spreadsheet Templates

Generate business-ready spreadsheets with formulas:

```bash
# Deal pipeline tracker
npm run create-sheets deal

# Proposal management
npm run create-sheets proposal

# Time tracking
npm run create-sheets time

# Client relationship tracker
npm run create-sheets client

# Financial dashboard
npm run create-sheets financial

# Create all templates
npm run create-sheets all
```

**Learn more:** [Templates Guide](../guides/templates.md)

---

## Troubleshooting

### "No token found" Error

**Problem:** Missing or invalid `token.json`

**Solution:**
```bash
npm run setup-auth
```

### "credentials.json not found"

**Problem:** OAuth credentials not in project root

**Solution:**
1. Download credentials from Google Cloud Console
2. Save as `credentials.json` in project root
3. Verify: `ls -la credentials.json`

### "APIs not enabled"

**Problem:** Required Google APIs not enabled

**Solution:**
1. Go to Google Cloud Console
2. Navigate to **APIs & Services → Library**
3. Enable all six required APIs (see Step 2 above)

### Claude Doesn't See Tools

**Problem:** MCP server not connecting to Claude Desktop

**Solutions:**
1. Check config file path is absolute (not relative)
2. Verify `dist/index.js` exists: `ls dist/index.js`
3. Restart Claude Desktop completely (Cmd+Q, then relaunch)
4. Check logs: `~/Library/Logs/Claude/mcp*.log`

**Full troubleshooting:** [Troubleshooting Guide](../reference/troubleshooting.md)

### "Permission denied" Errors

**Problem:** Missing or incomplete OAuth permissions

**Solution:**
1. Delete token: `rm token.json`
2. Re-authenticate: `npm run setup-auth`
3. Ensure you click "Allow" for all permissions

### "Module not found" Errors

**Problem:** Missing or corrupted dependencies

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Build Fails

**Problem:** TypeScript compilation errors

**Check:**
1. Node.js version: `node --version` (must be 18+)
2. TypeScript installed: `npm list typescript`
3. Clean build: `rm -rf dist && npm run build`

---

## Security Best Practices

### Protect Your Credentials

1. **Never commit to version control:**
   ```bash
   # Verify .gitignore includes:
   cat .gitignore | grep credentials
   cat .gitignore | grep token
   ```

2. **Use environment-specific accounts:**
   - **Development:** Test Google account
   - **Production:** Business Google account

3. **Rotate tokens periodically:**
   ```bash
   rm token.json
   npm run setup-auth
   ```

4. **Limit OAuth scopes:**
   - Only enable APIs you need
   - Review permissions regularly

5. **Monitor API usage:**
   - Check [Google Cloud Console](https://console.cloud.google.com/apis/dashboard)
   - Set up billing alerts if needed

**More security info:** [Configuration Guide - Security](../reference/configuration.md#security)

---

## Environment Variables (Optional)

For custom credential paths or multiple instances:

### Create .env File

```bash
cp .env.example .env
```

### Configure Custom Paths

Edit `.env`:
```bash
# Custom credential locations
CREDENTIALS_PATH=/path/to/credentials.json
TOKEN_PATH=/path/to/token.json

# LLM Router (optional)
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AI-...
OPENAI_API_KEY=sk-...

# Router configuration
LLM_ROUTER_ENVIRONMENT=production
LLM_COST_LIMIT_PER_DAY=10

# Debug mode
DEBUG=false
```

**Learn more:** [Configuration Reference](../reference/configuration.md)

---

## What's Next?

### 1. Learn the Tools

- **[API Reference](../api-reference/index.md)** - Complete tool documentation
- **[Architecture Overview](../architecture/overview.md)** - System design
- **[Workflow Examples](../guides/workflows.md)** - Real-world use cases

### 2. Configure LLM Router

Set up multi-provider LLM routing for cost optimization:
- **[LLM Configuration Guide](../guides/llm-configuration.md)**
- **[LLM Router Architecture](../architecture/llm-router.md)**

### 3. Implement PMI Framework

For program managers using PMBOK standards:
- **[PMI Framework](../pmi-framework/framework.md)**
- **[PMI Workflows](../pmi-framework/workflows.md)**

### 4. Start Automating

Try these example workflows:

**Deal Capture:**
```
Claude, new deal: Acme Corp - $2.5M contract, 70% probability.
Add to tracker, create deal folder, draft team notification.
```

**Weekly Review:**
```
Claude, generate my weekly business review:
- Pipeline metrics and weighted forecast
- Proposals due this week
- Overdue action items
- Calendar summary
```

**Document Management:**
```
Claude, create a PMI-standard folder structure for the
Alpha Program in my Drive.
```

---

## Installation Checklist

Use this checklist to track your progress:

- [ ] Node.js 18+ installed and verified
- [ ] Google Cloud project created
- [ ] All 6 Google APIs enabled
- [ ] OAuth consent screen configured
- [ ] OAuth credentials downloaded as `credentials.json`
- [ ] Project dependencies installed (`npm install`)
- [ ] Server built successfully (`npm run build`)
- [ ] Google authentication complete (`npm run setup-auth`)
- [ ] `token.json` file created
- [ ] Claude Desktop config file updated
- [ ] Absolute paths verified in config
- [ ] Claude Desktop restarted
- [ ] Tools visible in Claude (100+ tools)
- [ ] Test email sent successfully
- [ ] Test spreadsheet created
- [ ] Test calendar event created
- [ ] (Optional) Folder structures created
- [ ] (Optional) Spreadsheet templates created
- [ ] (Optional) LLM router configured

**When all checked, you're ready to automate!** 🚀

---

## Support Resources

- **[Quick Start Guide](quick-start.md)** - 10-minute setup
- **[Authentication Guide](authentication.md)** - OAuth details
- **[Claude Desktop Setup](claude-desktop.md)** - Detailed Claude configuration
- **[Troubleshooting](../reference/troubleshooting.md)** - Common issues
- **[FAQ](../reference/faq.md)** - Frequently asked questions
- **[Configuration](../reference/configuration.md)** - Advanced settings

---

**Time Breakdown:**
- Google Cloud Setup: 15 minutes
- Install MCP Server: 10 minutes
- Configure Claude: 10 minutes
- Verify Installation: 5 minutes
- **Total: ~40 minutes**

**Welcome to automated Google Workspace operations!** 🎉
