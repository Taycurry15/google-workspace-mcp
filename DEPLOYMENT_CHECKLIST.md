# Google Workspace MCP - Deployment Checklist

## Pre-Deployment (Before You Start)

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Google Workspace or Gmail account ready
- [ ] Claude Desktop installed
- [ ] 1 hour of focused time available

---

## Phase 1: Google Cloud Setup (15 minutes)

### Create Project
- [ ] Go to https://console.cloud.google.com/
- [ ] Click "Select a project" → "New Project"
- [ ] Name: `workspace-mcp-server`
- [ ] Click "Create"
- [ ] Wait for project creation

### Enable APIs (Enable all 6)
- [ ] Gmail API
- [ ] Google Drive API
- [ ] Google Sheets API
- [ ] Google Docs API
- [ ] Google Calendar API
- [ ] Google Tasks API

### Create OAuth Credentials
- [ ] Go to "APIs & Services" → "Credentials"
- [ ] Click "Create Credentials" → "OAuth client ID"
- [ ] Configure OAuth consent screen (if prompted):
  - [ ] User Type: External
  - [ ] App name: `Workspace MCP Server`
  - [ ] Add your email as test user
- [ ] Create OAuth client:
  - [ ] Application type: Desktop app
  - [ ] Name: `MCP Server Desktop`
- [ ] Download JSON credentials
- [ ] Save as `credentials.json`
- [ ] **Keep file secure!**

---

## Phase 2: Install Server (10 minutes)

### Extract and Navigate
- [ ] Extract `google-workspace-mcp.zip`
- [ ] Open terminal
- [ ] Navigate to project: `cd google-workspace-mcp`

### Install Dependencies
- [ ] Run: `npm install`
- [ ] Wait for installation to complete
- [ ] Verify no errors

### Add Credentials
- [ ] Move `credentials.json` to project root
- [ ] Verify: `ls credentials.json` shows the file

### Build Server
- [ ] Run: `npm run build`
- [ ] Verify `dist/` folder created
- [ ] Check: `ls dist/index.js` exists

### Authenticate
- [ ] Run: `npm run setup-auth`
- [ ] Browser opens to Google login
- [ ] Select your account
- [ ] Review permissions
- [ ] Click "Allow"
- [ ] Copy authorization code
- [ ] Paste into terminal
- [ ] See: "✓ Authentication complete!"
- [ ] Verify `token.json` created

---

## Phase 3: Configure Claude (10 minutes)

### Locate Config File
**macOS:**
- [ ] Path: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:**
- [ ] Path: `%APPDATA%\Claude\claude_desktop_config.json`

**Linux:**
- [ ] Path: `~/.config/Claude/claude_desktop_config.json`

### Get Absolute Path
- [ ] In project directory, run: `pwd`
- [ ] Copy the full path

### Edit Config File
- [ ] Open `claude_desktop_config.json`
- [ ] Add this configuration:
```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": [
        "/PASTE/YOUR/ABSOLUTE/PATH/google-workspace-mcp/dist/index.js"
      ]
    }
  }
}
```
- [ ] Replace path with your actual path
- [ ] Save file

### Restart Claude
- [ ] Completely quit Claude Desktop
- [ ] Relaunch Claude Desktop
- [ ] Start new conversation

---

## Phase 4: Verify Installation (5 minutes)

### Test 1: Check Tools
- [ ] Ask: "Claude, what Google Workspace tools do you have?"
- [ ] Verify you see 30+ tools listed
- [ ] Categories: Gmail, Drive, Sheets, Docs, Calendar, Tasks

### Test 2: Send Email
- [ ] Ask: "Claude, send me a test email"
- [ ] Check inbox for email
- [ ] Email received successfully

### Test 3: Create Spreadsheet
- [ ] Ask: "Claude, create a test spreadsheet"
- [ ] Verify spreadsheet created
- [ ] Open in browser

### Test 4: List Files
- [ ] Ask: "Claude, show my recent Drive files"
- [ ] Verify files are listed
- [ ] Check file names match

### Test 5: Calendar Event
- [ ] Ask: "Claude, create test event tomorrow 2pm"
- [ ] Check Google Calendar
- [ ] Event appears correctly

**All tests passed?** ✅ You're operational!

---

## Phase 5: Create Templates (10 minutes - Optional)

### Folder Structures
- [ ] Government contracting: `npm run create-folders govcon`
- [ ] International deals: `npm run create-folders international`
- [ ] Cybersecurity: `npm run create-folders cybersec`
- [ ] Business ops: `npm run create-folders business`
- [ ] Or all: `npm run create-folders all`

### Spreadsheet Templates
- [ ] Deal tracker: `npm run create-sheets deal`
- [ ] Proposal tracker: `npm run create-sheets proposal`
- [ ] Time tracker: `npm run create-sheets time`
- [ ] Client tracker: `npm run create-sheets client`
- [ ] Financial dashboard: `npm run create-sheets financial`
- [ ] Or all: `npm run create-sheets all`

### Verify Templates
- [ ] Check Google Drive for new folders
- [ ] Open created spreadsheets
- [ ] Verify formulas working
- [ ] Check formatting applied

---

## Post-Deployment

### Security Review
- [ ] Verify `credentials.json` NOT committed to git
- [ ] Verify `token.json` NOT committed to git
- [ ] Review `.gitignore` includes both files
- [ ] Check Google Cloud Console permissions
- [ ] Review OAuth consent screen

### Documentation Review
- [ ] Read README.md for overview
- [ ] Scan DEPLOYMENT.md for details
- [ ] Browse WORKFLOWS.md for examples
- [ ] Check QUICK_REFERENCE.md for commands

### First Real Task
- [ ] Identify one automation need
- [ ] Try it with Claude
- [ ] Verify it works
- [ ] Customize as needed

---

## Troubleshooting Checks

### If Tools Don't Appear
- [ ] Check config file path is absolute
- [ ] Verify `dist/index.js` exists
- [ ] Restart Claude Desktop completely
- [ ] Check logs: `~/Library/Logs/Claude/`

### If Authentication Fails
- [ ] Delete `token.json`
- [ ] Run `npm run setup-auth` again
- [ ] Allow all permissions
- [ ] Try different browser

### If APIs Don't Work
- [ ] Verify all 6 APIs enabled in Google Cloud
- [ ] Check API quotas in Console
- [ ] Review error messages
- [ ] Verify credentials are current

### If Build Fails
- [ ] Check Node.js version (18+)
- [ ] Delete `node_modules/`
- [ ] Run `npm install` again
- [ ] Run `npm run build` again

---

## Success Criteria

You know deployment succeeded when:

✅ Claude lists 30+ Google Workspace tools
✅ Test email sends successfully
✅ Test spreadsheet creates with formulas
✅ Calendar events appear in Google Calendar
✅ Drive files are accessible
✅ Tasks can be created and listed
✅ No authentication errors
✅ All tests pass

---

## Next Steps After Deployment

### Day 1
- [ ] Try 3-5 example workflows
- [ ] Create your first real automation
- [ ] Customize one template
- [ ] Set up your folder structure

### Week 1
- [ ] Use for daily email automation
- [ ] Track deals in spreadsheet
- [ ] Automate calendar management
- [ ] Create custom workflows

### Month 1
- [ ] Measure time savings
- [ ] Train team members
- [ ] Build custom tools (optional)
- [ ] Integrate with other systems

---

## Time Investment vs. Return

**Setup Time:** 40-50 minutes
**Learning Time:** 2-3 hours
**Weekly Time Saved:** 10+ hours
**Break-Even:** Week 1
**Annual Value:** 500+ hours

---

## Support Resources

- [ ] README.md - Feature overview
- [ ] DEPLOYMENT.md - Detailed setup guide
- [ ] WORKFLOWS.md - 12+ example workflows
- [ ] QUICK_REFERENCE.md - Command cheat sheet
- [ ] PROJECT_SUMMARY.md - Complete overview

---

## Final Verification

Before considering deployment complete:

- [ ] All Phase 1 tasks complete
- [ ] All Phase 2 tasks complete
- [ ] All Phase 3 tasks complete
- [ ] All Phase 4 tests pass
- [ ] Templates created (optional)
- [ ] Documentation reviewed
- [ ] First automation working
- [ ] Security verified
- [ ] Ready to use daily

**Deployment Status:** ☐ In Progress  ☐ Complete ✅

**Deployment Date:** _____________

**Deployed By:** _____________

**Notes:** _______________________________________________

---

**Congratulations! Your Google Workspace is now automated!** 🚀

Start with simple tasks, build confidence, then tackle complex workflows.

You've got 30+ tools at your fingertips - use them to transform your business operations.
