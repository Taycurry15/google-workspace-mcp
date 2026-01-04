# Google Workspace MCP Server

Production-ready Model Context Protocol (MCP) server with **30+ tools** for complete Google Workspace automation through Claude.

**Built for:** Government contractors, business development professionals, consultants, and executives who need serious automation.

---

## 🚀 What You Get

### 30+ Google Workspace Tools

**Gmail (8 tools):**
- Send emails, search messages, create drafts
- Manage labels, mark read, archive
- Full email automation

**Google Drive (10 tools):**
- List, create, upload, delete files
- Folder management and organization
- Share files, manage permissions
- Move, copy, and search content

**Google Sheets (8 tools):**
- Create spreadsheets with formulas
- Read, write, append data
- Format cells and ranges
- Batch operations for efficiency

**Google Docs (4 tools):**
- Create and read documents
- Append text and batch updates
- Professional document automation

**Google Calendar (5 tools):**
- Create, update, delete events
- Find available time slots
- Schedule meetings with attendees

**Google Tasks (4 tools):**
- Create and manage tasks
- List and update task lists
- Complete task automation

---

## 💼 Perfect For

### Government Contractors
- Track opportunities and proposals
- Manage compliance documentation
- Organize past performance
- Automate contract administration

### Business Development
- Pipeline management with formulas
- Deal tracking and forecasting
- Client relationship management
- Automated status reporting

### Consultants
- Project time tracking
- Client deliverable management
- Invoice preparation
- Resource utilization

### Executives
- Business metrics dashboards
- Strategic planning automation
- Board reporting
- Decision support

---

## ⚡ Quick Start

### 1. Install (10 minutes)

```bash
# Clone repository
git clone https://github.com/yourusername/google-workspace-mcp.git
cd google-workspace-mcp

# Install dependencies
npm install

# Build
npm run build
```

### 2.5. Configure Environment Variables (Optional)

For custom credential paths:

```bash
cp .env.example .env
# Edit .env with your custom paths if needed
```

Default paths (project root) work for most users.

### 2. Google Cloud Setup (15 minutes)

1. Create Google Cloud project
2. Enable 6 APIs (Gmail, Drive, Sheets, Docs, Calendar, Tasks)
3. Create OAuth credentials
4. Download `credentials.json`

**Detailed guide:** See [DEPLOYMENT.md](./DEPLOYMENT.md)

### 3. Authenticate (2 minutes)

```bash
npm run setup-auth
```

Authenticate with Google and authorize permissions.

### 4. Configure Claude Desktop (5 minutes)

Add to `claude_desktop_config.json`:

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

### 5. Test (2 minutes)

```
Claude, what Google Workspace tools do you have?
```

You should see 30+ tools available!

---

## 📊 Pre-Built Templates

### Spreadsheets with Formulas

Create business-ready spreadsheets instantly:

```bash
# Deal pipeline tracker with weighted values
npm run create-sheets deal

# Proposal management with win/loss analysis
npm run create-sheets proposal

# Time tracking with billable hours
npm run create-sheets time

# Client relationship tracker
npm run create-sheets client

# Financial dashboard (income/expenses)
npm run create-sheets financial

# Create all templates
npm run create-sheets all
```

**Each template includes:**
- Pre-configured headers
- Auto-calculating formulas
- Summary dashboards
- Professional formatting

### Drive Folder Structures

Organize your business automatically:

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

**Example govcon structure:**
```
GovCon Operations/
├── 01-Opportunities/
├── 02-Proposals/
│   ├── Active/
│   ├── Submitted/
│   ├── Won/
│   └── Lost/
├── 03-Contracts/
│   ├── Active-Contracts/
│   ├── SOWs-PWS/
│   └── Modifications/
├── 04-Compliance/
│   ├── CMMC/
│   ├── FAR-DFARS/
│   └── Certifications/
├── 05-Finance/
└── 06-Business-Development/
```

---

## 🔥 Real-World Examples

### Example 1: Capture New Deal

```
Claude, new deal:
- DRC Digital Infrastructure
- Ministry of Telecommunications  
- $1.41 billion
- 60% probability
- Partners: Thales

Add to tracker, create deal folder, draft team notification
```

**What happens:**
1. Adds to deal tracker with weighted value formula
2. Creates organized Drive folder
3. Generates deal brief document
4. Drafts notification email
5. Sets up action items

### Example 2: Weekly Pipeline Review

```
Claude, show me my weekly pipeline review:
- Total pipeline value
- Weighted forecast
- Deals with no activity in 7+ days
- Top 3 deals by weighted value
```

### Example 3: Proposal Setup

```
Claude, set up proposal workspace for Navy RFP:
- Create folder structure
- Log in tracker (due Jan 30)
- Create outline doc
- Schedule color team reviews
```

### Example 4: Client Follow-up

```
Claude, after my DRC call:
1. Search for meeting invite
2. Create follow-up email
3. Document action items
4. Create tasks for me
5. Update deal tracker
```

### Example 5: Monthly Business Report

```
Claude, generate monthly business review:
- Pipeline metrics
- Proposal win rate
- Time tracking summary
- Financial dashboard
- Action items

Create report doc and email to myself
```

---

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete 45-minute setup guide
- **[WORKFLOWS.md](./WORKFLOWS.md)** - 12+ real-world automation workflows
- **[API Reference](#api-reference)** - Detailed tool documentation

---

## 🛠️ Development

### Project Structure

```
google-workspace-mcp/
├── src/
│   ├── index.ts              # Main MCP server (30+ tools)
│   ├── setup-auth.ts         # OAuth authentication
│   ├── create-folders.ts     # Drive folder automation
│   └── create-sheets.ts      # Spreadsheet templates
├── dist/                     # Compiled JavaScript
├── credentials.json          # OAuth credentials (not in git)
├── token.json               # OAuth tokens (not in git)
├── package.json
├── tsconfig.json
├── DEPLOYMENT.md
├── WORKFLOWS.md
└── README.md
```

### Build and Watch

```bash
# One-time build
npm run build

# Watch mode (auto-rebuild)
npm run watch

# Development mode
npm run dev
```

### Add Custom Tools

Edit `src/index.ts` to add your own tools:

```typescript
{
  name: "custom_tool",
  description: "Your custom automation",
  inputSchema: {
    type: "object",
    properties: {
      param: { type: "string" }
    },
    required: ["param"]
  }
}
```

---

## 🔒 Security

### Best Practices

1. **Never commit credentials:**
   ```bash
   # Already in .gitignore
   credentials.json
   token.json
   ```

2. **Use environment-specific accounts:**
   - Development: Test account
   - Production: Business account

3. **Review permissions:**
   Only enable APIs you need

4. **Rotate tokens:**
   ```bash
   rm token.json
   npm run setup-auth
   ```

5. **Monitor usage:**
   Check Google Cloud Console for API usage

### OAuth Scopes

The server requests these scopes:
- `gmail.modify` - Send and manage emails
- `drive` - Full Drive access
- `spreadsheets` - Create and edit sheets
- `documents` - Create and edit docs
- `calendar` - Manage calendar events
- `tasks` - Manage tasks

---

## 📈 Performance

### API Limits

- **Gmail:** 250 quota units/user/second
- **Drive:** 1000 requests/100 seconds
- **Sheets:** 500 requests/100 seconds/user
- **Docs:** 600 requests/60 seconds/user
- **Calendar:** 1000 requests/100 seconds/user

Normal automation usage is **well within** these limits.

### Optimization Tips

1. Use batch operations (`sheets_batch_update`)
2. Cache frequently used IDs
3. Filter queries to reduce data
4. Limit search results appropriately
5. Combine related operations

---

## 🤝 Contributing

### Adding New Tools

1. Define tool schema in `setupHandlers()`
2. Implement handler method
3. Add to switch statement
4. Update documentation
5. Test thoroughly

### Adding New Templates

1. Add template function to `create-sheets.ts`
2. Include formulas and formatting
3. Add to template registry
4. Document in WORKFLOWS.md

---

## 🐛 Troubleshooting

### Common Issues

**"No token found"**
```bash
npm run setup-auth
```

**"APIs not enabled"**
- Enable all 6 APIs in Google Cloud Console

**Claude doesn't see tools**
- Check absolute path in config
- Verify `dist/index.js` exists
- Restart Claude Desktop

**Permission errors**
```bash
rm token.json
npm run setup-auth
```

**See [DEPLOYMENT.md](./DEPLOYMENT.md#troubleshooting)** for complete troubleshooting guide.

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🎯 Use Cases

### Government Contracting
✅ Opportunity tracking  
✅ Proposal lifecycle management  
✅ Compliance documentation  
✅ Past performance organization  
✅ Teaming agreement tracking  

### Business Development  
✅ Deal pipeline with forecasting  
✅ Client relationship management  
✅ Partner management  
✅ Revenue tracking  
✅ Win/loss analysis  

### Consulting
✅ Project time tracking  
✅ Client deliverables  
✅ Invoice preparation  
✅ Resource allocation  
✅ Utilization reporting  

### Executive Operations
✅ Business metrics dashboards  
✅ Strategic planning docs  
✅ Board reporting automation  
✅ Stakeholder communications  
✅ Decision support data  

---

## 🚦 Getting Started Checklist

- [ ] Node.js 18+ installed
- [ ] Google Cloud project created
- [ ] 6 APIs enabled
- [ ] OAuth credentials downloaded
- [ ] Dependencies installed (`npm install`)
- [ ] Server built (`npm run build`)
- [ ] Authenticated (`npm run setup-auth`)
- [ ] Claude Desktop configured
- [ ] Tools visible in Claude ✅
- [ ] Test email sent ✅
- [ ] Test spreadsheet created ✅

**When complete, you're ready to automate!** 🎉

---

## 💡 Pro Tips

1. **Start with templates** - Use pre-built sheets and folders
2. **Chain operations** - Combine multiple tools in one request
3. **Use formulas** - Let spreadsheets calculate automatically
4. **Batch process** - Handle multiple items at once
5. **Review regularly** - Set up automated weekly/monthly reviews

---

## 📞 Support

- **Documentation:** [DEPLOYMENT.md](./DEPLOYMENT.md) | [WORKFLOWS.md](./WORKFLOWS.md)
- **Issues:** GitHub Issues
- **Logs:** `~/Library/Logs/Claude/` (macOS)

---

## 🎓 Learn More

### Example Queries to Try

```
Claude, what can you do with Google Workspace?

Claude, show me examples of deal tracking automation

Claude, help me set up a complete proposal workspace

Claude, create my weekly business review

Claude, automate my client follow-up process
```

### Advanced Workflows

See [WORKFLOWS.md](./WORKFLOWS.md) for:
- Deal lifecycle automation
- Proposal management
- Email processing
- Document assembly
- Calendar optimization
- Financial reporting

---

## 💎 Code Quality

Maintain high code quality with built-in tools:

```bash
npm run typecheck  # Type checking
npm run lint       # Linting
npm run lint:fix   # Auto-fix linting issues
npm run format     # Format code
npm run quality    # Run all checks
```

---

## ⭐ Features

- ✅ 30+ production-ready tools
- ✅ Pre-built business templates
- ✅ Automated folder structures  
- ✅ Spreadsheets with formulas
- ✅ Complete documentation
- ✅ 45-minute deployment
- ✅ Real-world workflows
- ✅ Security best practices
- ✅ Error handling
- ✅ Performance optimized

---

**Built by Tay Daddy | The Bronze Shield**  
Service-Disabled Veteran-Owned Small Business  
Cybersecurity Consulting & Government Contracting

*Automating business operations one workspace at a time.* 🚀
