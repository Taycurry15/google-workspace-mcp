# Google Workspace MCP Workflows

Real-world automation workflows using the Google Workspace MCP server.

## Table of Contents
- [Deal Management Workflows](#deal-management-workflows)
- [Proposal Workflows](#proposal-workflows)
- [Email Automation](#email-automation)
- [Document Workflows](#document-workflows)
- [Calendar Automation](#calendar-automation)

---

## Deal Management Workflows

### Workflow 1: Log New Deal and Send Notification

**Scenario:** Capture new international deal opportunity, log in tracker, send team notification

**Steps:**
1. Create/update deal tracker spreadsheet
2. Log deal details with formulas
3. Send Gmail notification to team
4. Create Google Doc for deal brief
5. Schedule kickoff meeting

**Example Commands:**

```
Claude, help me capture this new deal:
- DRC Digital Infrastructure with Ministry of Telecom
- $1.41 billion value
- 60% probability
- Partners: Thales, local facilitators
- Next action: Ministerial presentation prep

Add it to my deal tracker, create a deal brief doc, and send notification to team@thebronzeshield.com
```

**What Claude Does:**
- Uses `sheets_append` to add deal row with auto-calculated weighted value
- Uses `docs_create` to create "DRC Deal Brief" with initial context
- Uses `gmail_send` to notify team with deal summary
- Uses `calendar_create_event` to schedule kickoff call

---

### Workflow 2: Weekly Pipeline Review

**Scenario:** Generate weekly deal pipeline summary

**Commands:**
```
Claude, give me my weekly pipeline review:
1. Read my deal tracker
2. Calculate total pipeline and weighted values
3. Identify deals with no activity in 7+ days
4. Create summary email draft
```

**What Claude Does:**
- Uses `sheets_read` to pull all pipeline data
- Analyzes dates and calculates metrics
- Uses `gmail_create_draft` with formatted summary

---

## Proposal Workflows

### Workflow 3: RFP Capture and Setup

**Scenario:** New RFP arrives, need to set up proposal workspace

**Commands:**
```
Claude, set up proposal workspace for Navy PEO Digital RFP:
1. Create folder structure in Drive under "02-Proposals/Active"
2. Log in proposal tracker (due date: Jan 30, 2026)
3. Create proposal outline doc
4. Schedule color team reviews
```

**What Claude Does:**
- Uses `drive_create_folder` to create nested structure:
  - Technical Volume
  - Management Volume
  - Past Performance
  - Pricing
- Uses `sheets_append` to log in proposal tracker
- Uses `docs_create` for proposal outline
- Uses `calendar_create_event` for color team dates

---

### Workflow 4: Proposal Status Update

**Scenario:** Update proposal status and notify stakeholders

**Commands:**
```
Claude, update Navy PEO proposal:
- Status: Pink Team complete
- Next action: Red Team scheduled for Jan 15
- Send update email to capture team
- Update tracker
```

**What Claude Does:**
- Uses `sheets_write` to update specific rows
- Uses `gmail_send` to send formatted update
- Uses `docs_append` to add status notes to deal doc

---

## Email Automation

### Workflow 5: Meeting Follow-up Automation

**Scenario:** After client meeting, automate follow-up

**Commands:**
```
Claude, process my meeting follow-up:
1. Search Gmail for today's meeting invite with DRC facilitators
2. Create follow-up email thanking them
3. Attach action items document
4. Create tasks for my action items
5. Update deal tracker with notes
```

**What Claude Does:**
- Uses `gmail_search` with query: "subject:DRC after:2026/01/03"
- Uses `gmail_create_draft` with professional follow-up
- Uses `docs_create` for action items
- Uses `tasks_create` for each action item
- Uses `sheets_write` to update deal notes

---

### Workflow 6: Email Digest and Priority Triage

**Scenario:** Morning email triage

**Commands:**
```
Claude, help me triage my inbox:
1. Find unread emails from last 24 hours
2. Categorize by priority (client, partner, internal, other)
3. Draft replies to quick responses
4. Flag important ones for detailed response
```

**What Claude Does:**
- Uses `gmail_search` with "is:unread newer_than:1d"
- Analyzes sender/subject for categorization
- Uses `gmail_create_draft` for quick replies
- Uses `gmail_add_label` to flag important emails

---

## Document Workflows

### Workflow 7: Ministerial Brief Creation

**Scenario:** Create formatted brief for DRC Minister

**Commands:**
```
Claude, create ministerial brief:
1. Create new Google Doc "DRC GNCS Ministerial Brief"
2. Add executive summary from our deal doc
3. Format professionally with sections
4. Share with ministry.presentation@gmail.com as viewer
5. Get shareable link for facilitators
```

**What Claude Does:**
- Uses `docs_create` with title
- Uses `docs_batch_update` to insert formatted content
- Uses `drive_share_file` with viewer permissions
- Returns shareable link

---

### Workflow 8: Contract Template Population

**Scenario:** Generate contract from template

**Commands:**
```
Claude, create SOW from template:
1. Copy "SOW Template" doc
2. Replace placeholders:
   - CLIENT_NAME: Navy PEO Digital
   - CONTRACT_VALUE: $2.5M
   - START_DATE: Feb 1, 2026
3. Save as "Navy PEO Digital - SOW Draft v1"
```

**What Claude Does:**
- Uses `drive_copy_file` to duplicate template
- Uses `docs_read` to get content
- Uses `docs_batch_update` to replace text
- Saves with new name

---

## Calendar Automation

### Workflow 9: Smart Meeting Scheduling

**Scenario:** Find best time to schedule with multiple people

**Commands:**
```
Claude, find meeting slots:
1. Find 2-hour slots next week
2. Between 9 AM - 4 PM EST
3. Send calendar invite for best slot
4. Include Zoom link and agenda doc
```

**What Claude Does:**
- Uses `calendar_find_slots` with parameters
- Uses `calendar_create_event` with details
- Creates agenda with `docs_create`
- Attaches doc link to calendar event

---

### Workflow 10: Weekly Planning Automation

**Scenario:** Monday morning weekly planning

**Commands:**
```
Claude, help me plan this week:
1. Show me all calendar events this week
2. Check my tasks due this week
3. Review deals with actions due this week
4. Create Monday planning doc with priorities
```

**What Claude Does:**
- Uses `calendar_list_events` for next 7 days
- Uses `tasks_list` filtered by due date
- Uses `sheets_read` on deal tracker with date filter
- Uses `docs_create` to compile planning doc

---

## Combined Workflows

### Workflow 11: Complete Deal Capture

**Full automation from opportunity identification to tracking**

**Scenario:** New opportunity identified, set up everything

**Commands:**
```
Claude, I got a new opportunity. Set up everything:

Opportunity: McDonald's Global Cybersecurity Principal Domain Architect
Value: $250K annual (consulting retainer)
Client Contact: recruiter@mcdonalds.com
Next Action: Submit application by Jan 10

Please:
1. Create deal in tracker
2. Create deal folder in Drive
3. Create deal brief doc
4. Create task reminder for application
5. Draft introduction email to recruiter
6. Schedule prep time on calendar
```

**What Claude Does:**

```typescript
// 1. Add to deal tracker
sheets_append({
  spreadsheetId: "your-tracker-id",
  range: "Pipeline",
  values: [[
    "McDonald's - Principal Domain Architect",
    "McDonald's Corporation",
    250000,
    75, // probability
    "=C2*D2/100", // weighted value formula
    "Prospect",
    "Tay Daddy",
    "Submit application",
    "2026-01-10",
    "2026-01-03", // today
    "2026-02-01", // expected close
    "=TODAY()-J2", // days open formula
    "Active",
    "Reached out via LinkedIn",
    "=TODAY()" // last updated
  ]]
})

// 2. Create Drive folder
drive_create_folder({
  name: "McDonald's - Principal Domain Architect",
  parentId: "active-deals-folder-id"
})

// 3. Create deal brief
docs_create({
  title: "McDonald's Deal Brief",
  content: `
DEAL BRIEF: McDonald's Global Cybersecurity Principal Domain Architect

CLIENT: McDonald's Corporation
VALUE: $250K annual retainer
PROBABILITY: 75%
STAGE: Prospect

OPPORTUNITY OVERVIEW:
Principal Domain Architect role focusing on global cybersecurity strategy

KEY CONTACTS:
- Recruiter: recruiter@mcdonalds.com

NEXT ACTIONS:
- Submit application by Jan 10, 2026
- Prepare technical discussion points
- Research McDonald's security architecture

COMPETITIVE ADVANTAGES:
- DoD TS/SCI clearance
- 10+ years enterprise security
- CISM, CCP (pending), Security+
- Experience with global architectures

STRATEGY:
Emphasize Zero Trust, cloud security, and DoD-level rigor
  `
})

// 4. Create task
tasks_create({
  title: "Submit McDonald's application",
  due: "2026-01-10T17:00:00Z",
  notes: "Complete application with resume and cover letter emphasizing global architecture experience"
})

// 5. Draft email
gmail_create_draft({
  to: "recruiter@mcdonalds.com",
  subject: "Application: Principal Domain Architect - Global Cybersecurity",
  body: `
Dear Hiring Team,

I am writing to express my strong interest in the Principal Domain Architect position for Global Cybersecurity at McDonald's Corporation.

With over 10 years of DoD cybersecurity experience, active TS/SCI clearance, and current role as Senior ISSE supporting Navy PEO Digital operations, I bring enterprise-scale security architecture expertise that aligns well with McDonald's global requirements.

KEY QUALIFICATIONS:
• Cybersecurity architecture across Defense, Federal, and Healthcare sectors
• CISM, Security+, CMMC Professional (CCP) certifications
• Zero Trust, cloud security, and emerging AI/ML governance frameworks
• $2M+ budget management and 8-hospital system security leadership

I have attached my resume and would welcome the opportunity to discuss how my background in high-assurance environments can contribute to McDonald's global security posture.

Best regards,
Keontay Curry
Senior ISSE | CEO, The Bronze Shield
  `
})

// 6. Schedule calendar time
calendar_create_event({
  summary: "Prep: McDonald's Application",
  startDateTime: "2026-01-08T14:00:00-05:00",
  endDateTime: "2026-01-08T16:00:00-05:00",
  description: "Prepare application materials and research McDonald's security architecture"
})
```

**Result:**
- Deal logged with auto-calculated weighted value ($187,500)
- Organized folder structure created
- Professional deal brief for reference
- Task reminder set
- Draft email ready to review and send
- Calendar blocked for preparation

---

### Workflow 12: Monthly Business Review

**Complete monthly reporting automation**

**Commands:**
```
Claude, generate my monthly business review:

1. Pipeline Analysis:
   - Total deals, pipeline value, weighted value
   - Deals closed won vs lost
   - Win rate and average deal size

2. Proposal Status:
   - Active proposals
   - Submitted awaiting decision
   - Win/loss analysis

3. Time Tracking:
   - Total hours worked
   - Billable vs non-billable
   - Revenue generated

4. Financial Summary:
   - Income vs expenses
   - Profit margin
   - YTD comparison

5. Action Items:
   - Stale deals (no activity >14 days)
   - Upcoming deadlines
   - Follow-ups needed

Create a comprehensive report doc and email to myself.
```

**What Claude Does:**
- Pulls data from multiple sheets
- Calculates all metrics
- Creates formatted report doc
- Generates executive summary
- Emails complete report

---

## Power User Tips

### Chaining Multiple Operations

```
Claude, complete deal lifecycle update:
1. Move "DRC Infrastructure" deal to "Negotiation" stage
2. Update probability to 85%
3. Schedule contract review meeting next week
4. Create contract folder in Drive
5. Share folder with legal@thebronzeshield.com
6. Send status update email to stakeholders
```

### Batch Processing

```
Claude, process all new opportunities:
1. Read "New Opportunities" sheet
2. For each row:
   - Create deal in pipeline tracker
   - Create deal folder
   - Create deal brief doc
   - Send notification email
3. Mark as processed
```

### Smart Queries

```
Claude, analyze my deals:
- Which deals haven't been touched in 2+ weeks?
- What's my total weighted pipeline by stage?
- Show me all deals closing this month
- Calculate my win rate for Q4 2025
```

### Template-Based Creation

```
Claude, use my proposal template:
1. Copy "Proposal Template v2024"
2. Fill in client: Navy PEO Digital
3. Insert past performance from my win sheet
4. Add technical approach from our capability doc
5. Save as "Navy PEO - Technical Proposal Draft 1"
```

---

## Integration Patterns

### Email → Drive → Sheets

Save important emails and log them:
```
Claude, process this email:
1. Save email to Drive folder "Client Communications/DRC"
2. Log in communication tracker sheet
3. Create follow-up task
4. Update deal notes
```

### Calendar → Tasks → Email

After meeting automation:
```
Claude, post-meeting automation:
1. Get today's "DRC Strategy Call" event
2. Create tasks from meeting notes
3. Draft follow-up email with action items
4. Update deal status in tracker
```

### Sheets → Docs → Gmail

Report generation workflow:
```
Claude, generate weekly report:
1. Pull metrics from all tracking sheets
2. Create formatted report doc
3. Generate executive summary
4. Email to leadership team
```

---

## Common Use Cases

### For Government Contracting
- Opportunity tracking and capture planning
- Proposal lifecycle management
- Compliance documentation
- Past performance organization
- Teaming agreement tracking

### For Business Development
- Deal pipeline management
- Client relationship tracking
- Partner management
- Revenue forecasting
- Win/loss analysis

### For Consulting
- Project time tracking
- Client deliverable management
- Invoice generation support
- Resource allocation
- Utilization reporting

### For Executives
- Business metrics dashboards
- Strategic planning documents
- Board reporting automation
- Stakeholder communications
- Decision support data

---

## Best Practices

1. **Use Consistent Naming**: Standardize folder and file names
2. **Leverage Formulas**: Let spreadsheets calculate automatically
3. **Automate Repetitive Tasks**: If you do it >3 times, automate it
4. **Keep Data Centralized**: Single source of truth for each data type
5. **Version Control**: Use date-based naming for iterations
6. **Share Selectively**: Use appropriate permission levels
7. **Backup Important Docs**: Copy critical documents periodically
8. **Review Regularly**: Set up automated weekly/monthly reviews

---

## Advanced Scenarios

### Multi-Deal Comparison
```
Compare these three opportunities and recommend focus priority:
- DRC Infrastructure ($1.41B, 60% probability)
- Navy PEO Digital ($2.5M, 80% probability)  
- McDonald's Consulting ($250K, 75% probability)

Consider: weighted value, timeline, resource requirements, strategic value
```

### Intelligent Document Assembly
```
Create complete proposal package:
1. Technical volume from capability statements
2. Management volume from org chart and resumes
3. Past performance from win tracker
4. Pricing from cost model
5. Assemble into single PDF in correct order
```

### Automated Compliance Tracking
```
Set up CMMC compliance tracker:
1. Create compliance checklist spreadsheet
2. Link to evidence documents in Drive
3. Set up monthly review calendar events
4. Create assessment preparation tasks
5. Generate compliance status report
```

---

## Questions?

These workflows are starting points. Claude can combine, modify, and create custom workflows based on your specific needs.

Just describe what you want to accomplish, and Claude will orchestrate the right combination of Google Workspace tools to make it happen.
