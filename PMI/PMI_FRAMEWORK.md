# PMI Program Management Framework
# Using Google Workspace MCP for PMBOK-Aligned Delivery

## Overview

This framework maps PMI's 5 Process Groups and 10 Knowledge Areas to Google Workspace automation, ensuring your programs (especially DRC $1.41B) follow PMI best practices from initiation to closure.

---

## PMI Process Groups Mapped to MCP Tools

### 1. INITIATING PROCESS GROUP

**PMI Artifacts:**
- Project Charter
- Stakeholder Register
- Preliminary Scope Statement
- Business Case

**MCP Implementation:**

```
Claude, initiate DRC Infrastructure Program:

1. Create Program Charter:
   - Title: "DRC National Digital Infrastructure (GNCS)"
   - Value: $1.41B
   - Sponsor: Ministry of Telecommunications (Minister Augustin Kibassa Maliba)
   - Program Manager: Keontay Curry
   - Timeline: Q1 2026 - Q4 2028
   - Objectives: National broadband, data centers, cybersecurity
   
2. Create Stakeholder Register spreadsheet with:
   - Name, Organization, Role, Interest, Influence, Engagement Strategy
   - Auto-calculate stakeholder power/interest matrix
   
3. Set up program folder structure:
   /DRC-GNCS-Program/
   ├── 01-Initiating/
   │   ├── Charter/
   │   ├── Business-Case/
   │   └── Stakeholder-Analysis/
   ├── 02-Planning/
   ├── 03-Executing/
   ├── 04-Monitoring-Controlling/
   └── 05-Closing/

4. Send charter for approval to stakeholders
5. Schedule kickoff meeting with all stakeholders
```

**Tools Used:**
- `docs_create` - Program Charter document
- `sheets_create` - Stakeholder Register with formulas
- `drive_create_folder` - PMI-aligned folder structure
- `gmail_send` - Stakeholder notifications
- `calendar_create_event` - Kickoff meeting

---

### 2. PLANNING PROCESS GROUP

**PMI Artifacts:**
- Program Management Plan
- Scope Management Plan
- Schedule Baseline (WBS, Gantt)
- Cost Baseline & Budget
- Risk Register
- Quality Management Plan
- Resource Management Plan
- Communications Management Plan
- Stakeholder Engagement Plan
- Procurement Management Plan

**MCP Implementation:**

#### A. Create Master Program Management Plan

```
Claude, create DRC Program Management Plan:

1. Create master document with sections:
   - Executive Summary
   - Program Scope Statement
   - Program Deliverables
   - Success Criteria
   - Governance Structure
   - Integration Management Approach
   
2. Link to subsidiary plans:
   - Schedule Management Plan
   - Cost Management Plan
   - Risk Management Plan
   - Quality Management Plan
   - Resource Management Plan
   - Communications Management Plan
   - Procurement Management Plan
   
3. Include approval workflow with digital signatures
4. Share with Program Board for approval
5. Version control (v1.0, approval date)
```

#### B. Work Breakdown Structure (WBS)

```
Claude, create WBS for DRC Program:

1. Create spreadsheet "DRC-WBS" with:
   Level 1: Program Components
   - National Broadband Network
   - Data Center Infrastructure  
   - Cybersecurity Framework
   - Training & Capacity Building
   - Program Management
   
   Level 2: Major Deliverables
   Level 3: Work Packages
   Level 4: Activities
   
2. Add columns:
   - WBS Code (auto-generate: 1.1.1, 1.1.2, etc.)
   - Description
   - Owner
   - Start Date
   - End Date
   - Duration (auto-calculate)
   - Dependencies
   - Status
   - % Complete
   - Budget Allocated
   - Actual Cost
   - Variance (formula)
   
3. Create Gantt chart view
4. Link to task list in Google Tasks
```

#### C. Risk Register

```
Claude, create Risk Register for DRC:

1. Create "DRC-Risk-Register" spreadsheet:
   - Risk ID (auto-increment)
   - Risk Description
   - Category (Technical, Financial, Political, Operational)
   - Probability (1-5)
   - Impact (1-5)
   - Risk Score (P×I, auto-calculate)
   - Risk Level (formula: Low/Med/High/Critical)
   - Owner
   - Mitigation Strategy
   - Contingency Plan
   - Status
   - Review Date
   
2. Add risk matrix visualization
3. Auto-flag critical risks (score ≥ 15)
4. Create monthly risk review calendar reminder
5. Link to issues log

Example risks:
- FCPA compliance failure (P:3, I:5, Score:15)
- Currency exchange volatility (P:4, I:4, Score:16)
- Political instability (P:3, I:5, Score:15)
- Vendor delivery delays (P:4, I:3, Score:12)
```

#### D. Schedule Management

```
Claude, create integrated master schedule:

1. Create "DRC-Master-Schedule" with:
   - Phase 1: Network Design (Months 1-6)
   - Phase 2: Procurement (Months 4-12)
   - Phase 3: Implementation (Months 9-30)
   - Phase 4: Testing & Commissioning (Months 28-33)
   - Phase 5: Training & Handover (Months 30-36)
   
2. Add milestones:
   - Contract Award (Month 0)
   - Design Approval (Month 6)
   - Equipment Delivery (Month 12)
   - First Site Operational (Month 15)
   - 50% Deployment (Month 24)
   - Full Operational Capability (Month 36)
   
3. Critical path analysis with formulas
4. Earned Value Management (EVM) calculations
5. Schedule Performance Index (SPI) tracking
6. Weekly schedule updates automation
```

#### E. Budget & Cost Management

```
Claude, create program budget baseline:

1. Create "DRC-Budget-Baseline" spreadsheet:
   Cost Breakdown Structure aligned to WBS:
   
   Component 1: Broadband Network - $580M
   - Design & Engineering - $45M
   - Equipment & Materials - $320M
   - Installation & Testing - $180M
   - Contingency (10%) - $35M
   
   Component 2: Data Centers - $520M
   Component 3: Cybersecurity - $180M
   Component 4: Training - $80M
   Component 5: Program Management - $50M
   
   Total: $1.5B
   
2. Add EVM tracking:
   - Planned Value (PV)
   - Earned Value (EV)
   - Actual Cost (AC)
   - Cost Variance (CV = EV - AC)
   - Schedule Variance (SV = EV - PV)
   - Cost Performance Index (CPI = EV/AC)
   - Schedule Performance Index (SPI = EV/PV)
   - Estimate at Completion (EAC)
   - Estimate to Complete (ETC)
   - Variance at Completion (VAC)
   
3. Monthly burn rate tracking
4. Cash flow forecasting
5. Budget alerts (threshold: ±5% variance)
```

#### F. Quality Management Plan

```
Claude, create Quality Management Plan:

1. Create "DRC-Quality-Standards" doc:
   - ITU standards for telecom infrastructure
   - ISO 27001 for cybersecurity
   - NIST framework alignment
   - Local DRC regulatory compliance
   
2. Create Quality Metrics spreadsheet:
   - Network uptime target: 99.9%
   - Mean Time Between Failures (MTBF)
   - Customer satisfaction score
   - Defect density
   - Test pass rate
   
3. Quality assurance checklist templates
4. Inspection & testing schedules
5. Non-conformance tracking
6. Corrective action register
```

#### G. Communications Management Plan

```
Claude, create Communications Plan:

1. Create stakeholder communication matrix:
   
   Stakeholder Group | Information Needs | Frequency | Method | Owner
   ------------------|------------------|-----------|---------|-------
   Minister/Ministry | Executive dashboard | Weekly | Email + Meeting | PM
   Thales (OEM) | Technical coordination | Daily | Email/Slack | Tech Lead
   Local Partners | Operational updates | Bi-weekly | Video conf | Partnership Mgr
   Project Board | Governance decisions | Monthly | Formal meeting | PM
   Team Members | Task assignments | Daily | Tasks + Email | PM
   Financiers | Budget status | Monthly | Report + Meeting | Finance Mgr
   
2. Set up automated reports:
   - Daily: Task completion status
   - Weekly: Schedule & budget dashboard
   - Monthly: Executive summary report
   - Quarterly: Board presentation
   
3. Create distribution lists in Gmail
4. Schedule recurring meetings in Calendar
5. Set up shared drives with appropriate permissions
```

**Tools Used for Planning:**
- `docs_create` + `docs_batch_update` - All plan documents
- `sheets_create` + formulas - WBS, Risk Register, Budget, Schedule
- `drive_create_folder` - Organized structure
- `drive_share_file` - Stakeholder access
- `calendar_create_event` - Planning meetings
- `gmail_send` - Plan distribution

---

### 3. EXECUTING PROCESS GROUP

**PMI Artifacts:**
- Work Performance Data
- Deliverable Status
- Change Requests
- Quality Deliverables
- Team Performance Assessments

**MCP Implementation:**

#### A. Daily Stand-ups Automation

```
Claude, run daily stand-up automation:

1. Pull from Task lists:
   - Completed yesterday
   - Planned for today
   - Blockers/issues
   
2. Check schedule:
   - Tasks due today
   - Overdue tasks (auto-flag)
   - Upcoming milestones (7-day lookahead)
   
3. Generate stand-up summary email
4. Send to team with color coding:
   - Green: On track
   - Yellow: At risk
   - Red: Critical issues
   
5. Update status dashboard
```

#### B. Work Package Execution Tracking

```
Claude, track work package execution:

1. For each active work package:
   - Update % complete based on tasks
   - Calculate earned value
   - Track actual costs vs. budget
   - Identify variances
   - Update forecasts
   
2. Auto-generate work performance reports:
   - Deliverables completed
   - Quality metrics achieved
   - Resource utilization
   - Issues encountered
   
3. Flag items needing escalation (threshold rules)
4. Update integrated master schedule
5. Trigger change requests if needed
```

#### C. Procurement Execution

```
Claude, manage Thales procurement:

1. Create "Thales-Contract-Execution" folder:
   - Purchase Orders
   - Delivery Schedules
   - Quality Certifications
   - Payment Milestones
   
2. Track deliverables spreadsheet:
   - PO Number
   - Description
   - Quantity
   - Unit Price
   - Total Value
   - Delivery Date (Planned)
   - Delivery Date (Actual)
   - Variance (auto-calculate)
   - Acceptance Status
   - Payment Status
   
3. Set delivery reminders (7 days before due)
4. Auto-generate payment requests when accepted
5. Track vendor performance metrics
```

#### D. Team Development

```
Claude, support team development:

1. Create team directory with:
   - Skills matrix
   - Training completed
   - Certifications
   - Performance metrics
   
2. Schedule 1-on-1s with team members (bi-weekly)
3. Track training needs and completion
4. Generate performance dashboards
5. Recognition automation (milestone achievements)
```

**Tools Used for Executing:**
- `tasks_create` + `tasks_update` - Work management
- `sheets_write` + `sheets_append` - Status tracking
- `gmail_send` - Daily communications
- `docs_create` - Deliverable documentation
- `calendar_create_event` - Team coordination

---

### 4. MONITORING & CONTROLLING PROCESS GROUP

**PMI Artifacts:**
- Performance Reports
- Variance Analysis
- Change Log
- Issue Log
- Lessons Learned Register

**MCP Implementation:**

#### A. Integrated Change Control

```
Claude, implement change control process:

1. Create "DRC-Change-Log" spreadsheet:
   - Change ID (auto-increment: CHG-001)
   - Date Submitted
   - Requested By
   - Change Description
   - Impact on Scope
   - Impact on Schedule (days)
   - Impact on Budget ($)
   - Impact on Risk
   - Priority (Critical/High/Med/Low)
   - Status (Submitted/Under Review/Approved/Rejected/Implemented)
   - Approver
   - Approval Date
   - Implementation Date
   
2. Change request workflow:
   - Submit via form → auto-create row
   - Email to Change Control Board
   - Meeting scheduled if needed
   - Decision logged
   - If approved: update baselines
   
3. Auto-update affected documents when approved
4. Baseline version control
5. Monthly change report generation
```

#### B. Earned Value Management (EVM) Dashboard

```
Claude, create EVM dashboard:

1. Pull from budget and schedule sheets:
   - Planned Value (PV) by period
   - Earned Value (EV) calculated from % complete
   - Actual Cost (AC) from expense tracking
   
2. Calculate key metrics:
   - CV = EV - AC (Cost Variance)
   - SV = EV - PV (Schedule Variance)
   - CPI = EV/AC (Cost Performance Index)
   - SPI = EV/PV (Schedule Performance Index)
   - EAC = BAC/CPI (Estimate at Completion)
   - ETC = EAC - AC (Estimate to Complete)
   - TCPI = (BAC-EV)/(BAC-AC) (To-Complete Performance Index)
   
3. Create visualizations:
   - S-curve (PV, EV, AC over time)
   - Variance trends
   - Performance indices trends
   - Forecast vs. baseline
   
4. Color-code status:
   - Green: CPI ≥ 0.95, SPI ≥ 0.95
   - Yellow: CPI or SPI between 0.90-0.95
   - Red: CPI or SPI < 0.90
   
5. Auto-generate monthly EVM report
6. Trigger alerts for threshold breaches
```

#### C. Risk Monitoring

```
Claude, monitor and control risks:

1. Weekly risk review automation:
   - Pull all active risks from register
   - Check if mitigation actions completed
   - Update probability/impact if changed
   - Recalculate risk scores
   - Identify new risks from issue log
   
2. Risk trigger monitoring:
   - Budget variance > 5% → Financial risk
   - Schedule delay > 2 weeks → Schedule risk
   - Vendor late delivery → Supply chain risk
   
3. Auto-escalate critical risks (score ≥ 15):
   - Email to program board
   - Add to next board meeting agenda
   - Request mitigation plan update
   
4. Monthly risk report generation
5. Risk burn-down chart (total risk exposure over time)
```

#### D. Quality Control

```
Claude, perform quality control:

1. Inspection checklist automation:
   - Pull deliverable from Drive
   - Load quality criteria
   - Create inspection form
   - Assign inspector
   - Set deadline
   - Send notification
   
2. Test results tracking:
   - Test ID
   - Test Description
   - Expected Result
   - Actual Result
   - Pass/Fail
   - Defect ID (if fail)
   - Retest Required?
   
3. Defect management:
   - Defect log with severity
   - Root cause analysis tracking
   - Corrective action assignment
   - Verification of fix
   - Defect aging report
   
4. Quality metrics dashboard:
   - Test pass rate (target: >95%)
   - Defect density (defects per KLOC)
   - Customer satisfaction score
   - Rework rate
   
5. Non-conformance auto-escalation
```

#### E. Performance Reporting

```
Claude, generate weekly performance report:

1. Executive Dashboard (1-page):
   - Overall Status: Green/Yellow/Red
   - Schedule Performance: SPI = [value]
   - Cost Performance: CPI = [value]
   - Scope: [% complete]
   - Top 3 Achievements this week
   - Top 3 Issues requiring attention
   - Next week priorities
   
2. Detailed sections:
   - Schedule Status (Gantt with variances)
   - Budget Status (EVM metrics)
   - Risk Status (top 10 risks)
   - Quality Status (metrics dashboard)
   - Stakeholder Engagement (communication log)
   
3. Automated distribution:
   - Email to stakeholders per comm plan
   - Upload to shared drive
   - Add to document repository
   
4. Trend analysis (compare to previous weeks)
5. Action item tracking from previous reports
```

**Tools Used for Monitoring:**
- `sheets_read` - Pull performance data
- `sheets_write` - Update metrics
- `docs_create` - Performance reports
- `gmail_send` - Report distribution
- Custom formulas - Variance analysis, EVM calculations

---

### 5. CLOSING PROCESS GROUP

**PMI Artifacts:**
- Final Performance Report
- Lessons Learned Register
- Formal Acceptance
- Archived Documents
- Transition Plan

**MCP Implementation:**

#### A. Phase Gate Closure

```
Claude, execute Phase 1 gate closure:

1. Closure checklist verification:
   - All deliverables completed and accepted
   - All scope verified against baseline
   - All contracts closed or transitioned
   - Financial reconciliation complete
   - Resources released or reassigned
   
2. Generate phase completion report:
   - Planned vs. Actual (scope, schedule, budget)
   - Final EVM metrics
   - Quality metrics achieved
   - Risks closed vs. realized
   - Lessons learned
   
3. Formal acceptance process:
   - Create acceptance document
   - Get stakeholder signatures
   - Archive all phase documentation
   
4. Transition to next phase:
   - Handover meeting scheduled
   - Knowledge transfer completed
   - Updated baselines for next phase
   
5. Celebration and recognition
```

#### B. Lessons Learned

```
Claude, capture lessons learned:

1. Create "DRC-Lessons-Learned" database:
   - Category (Technical, Management, Procurement, etc.)
   - What Worked Well
   - What Didn't Work
   - Root Cause
   - Recommendation
   - Applicable To (future projects)
   - Submitted By
   - Date
   
2. Conduct lessons learned workshop:
   - Send calendar invite to all team
   - Create collaborative doc for input
   - Facilitate session (virtual or in-person)
   - Document and categorize findings
   
3. Share with organizational PMO:
   - Export to standard template
   - Submit to knowledge base
   - Present at PMO meeting
   
4. Apply to ongoing/future projects
```

#### C. Final Documentation

```
Claude, finalize program documentation:

1. Create final document package:
   - As-Built Documentation
   - Operations & Maintenance Manuals
   - Training Materials
   - Warranty Information
   - Contact Lists
   
2. Archive all project files:
   - Organize by PMI process group
   - Compress and backup
   - Store in long-term archive
   - Document retention policy applied
   
3. Financial closure:
   - Final invoices processed
   - Final budget reconciliation
   - Close all cost accounts
   - Generate final financial report
   
4. Contract closure:
   - Thales contract closeout
   - Local partner agreements closure
   - Final payments processed
   - Performance evaluations completed
```

**Tools Used for Closing:**
- `docs_create` - Closure reports, lessons learned
- `sheets_read` - Final performance data
- `gmail_send` - Acceptance notifications
- `drive_copy_file` - Archive documentation
- `tasks_update` - Close all tasks

---

## PMI Knowledge Areas Implementation

### 1. INTEGRATION MANAGEMENT

```
Claude, manage program integration:

1. Maintain Integration Dashboard:
   - Links to all subsidiary plans
   - Cross-cutting issues
   - Dependencies between components
   - Overall program health
   
2. Weekly integration review:
   - Check alignment across components
   - Identify integration risks
   - Resolve conflicts/trade-offs
   - Update integrated baseline
   
3. Automation:
   - Pull data from all component trackers
   - Aggregate metrics
   - Flag inconsistencies
   - Generate integration report
```

### 2. SCOPE MANAGEMENT

```
Claude, control program scope:

1. Scope baseline maintenance:
   - WBS as single source of truth
   - Scope verification checklists
   - Deliverable acceptance criteria
   
2. Scope change control:
   - All changes logged in change register
   - Impact analysis automated (schedule, cost)
   - Approval workflow enforced
   - Baseline updates version-controlled
   
3. Scope validation:
   - Deliverable inspection checklists
   - Customer acceptance process
   - Scope completion reports
```

### 3. SCHEDULE MANAGEMENT

```
Claude, optimize schedule management:

1. Maintain master schedule:
   - Activity dependencies enforced
   - Resource leveling applied
   - Critical path identified
   - Float/slack calculated
   
2. Schedule control:
   - Weekly progress updates
   - Variance analysis (planned vs. actual)
   - Schedule forecasting (ETC, EAC)
   - Recovery plans for delays
   
3. Automation:
   - Auto-update from task completion
   - Alert on critical path delays
   - Generate schedule reports
   - What-if analysis for changes
```

### 4. COST MANAGEMENT

```
Claude, control program costs:

1. Budget tracking:
   - Real-time cost capture
   - Commitment tracking (POs issued)
   - Accruals for work performed
   - Reserve management (contingency & management)
   
2. Cost control:
   - Variance analysis (planned vs. actual)
   - Trend analysis (cost performance)
   - Forecasting (EAC, ETC, VAC)
   - Corrective action triggers
   
3. EVM implementation:
   - Monthly EVM calculations
   - Performance index trending
   - TCPI for recovery planning
   - Forecast reliability analysis
```

### 5. QUALITY MANAGEMENT

```
Claude, ensure quality standards:

1. Quality planning artifacts:
   - Quality standards documented
   - Acceptance criteria defined
   - Inspection/test procedures
   - Quality metrics established
   
2. Quality assurance:
   - Process audits scheduled
   - Best practice compliance checks
   - Continuous improvement initiatives
   - Quality training for team
   
3. Quality control:
   - Inspection results tracked
   - Defect management system
   - Statistical process control
   - Customer satisfaction surveys
```

### 6. RESOURCE MANAGEMENT

```
Claude, optimize resource utilization:

1. Resource planning:
   - Resource breakdown structure
   - Skills matrix and gap analysis
   - Acquisition plan
   - Training plan
   
2. Resource assignment:
   - Resource loading by period
   - Utilization tracking (target: 80-90%)
   - Conflict resolution
   - Resource leveling
   
3. Team development:
   - Performance tracking
   - 1-on-1 meetings scheduled
   - Training completion
   - Recognition programs
```

### 7. COMMUNICATIONS MANAGEMENT

```
Claude, execute communications plan:

1. Information distribution:
   - Automated reports per schedule
   - Distribution lists maintained
   - Document repository organized
   - Version control enforced
   
2. Stakeholder engagement:
   - Engagement level tracking
   - Communication effectiveness measured
   - Feedback captured and acted upon
   - Relationship management
   
3. Communication channels:
   - Email for formal communications
   - Shared drives for documents
   - Calendar for meetings
   - Tasks for action items
```

### 8. RISK MANAGEMENT

```
Claude, implement risk management process:

1. Risk identification:
   - Risk workshops scheduled
   - Risk triggers monitored
   - Issue log analysis for emerging risks
   - Stakeholder risk concerns captured
   
2. Risk analysis:
   - Qualitative analysis (P×I matrix)
   - Quantitative analysis (Monte Carlo for schedule/cost)
   - Risk prioritization
   - Risk categorization
   
3. Risk response:
   - Response strategies defined (Avoid, Transfer, Mitigate, Accept)
   - Action owners assigned
   - Contingency plans documented
   - Risk response effectiveness tracked
```

### 9. PROCUREMENT MANAGEMENT

```
Claude, manage procurement lifecycle:

1. Procurement planning:
   - Make-or-buy analysis
   - Contract types selected
   - Procurement schedule
   - Vendor pre-qualification
   
2. Procurement execution:
   - RFP/RFQ issuance tracked
   - Proposal evaluation scorecards
   - Contract negotiation notes
   - Contract award documentation
   
3. Procurement control:
   - Vendor performance tracking
   - Contract compliance monitoring
   - Payment milestone tracking
   - Claims and disputes log
```

### 10. STAKEHOLDER MANAGEMENT

```
Claude, manage stakeholder engagement:

1. Stakeholder analysis:
   - Power/interest matrix
   - Engagement level (Unaware→Supportive)
   - Influence network mapping
   - Cultural considerations
   
2. Engagement planning:
   - Engagement strategies by stakeholder
   - Communication preferences
   - Meeting schedules
   - Escalation paths
   
3. Engagement monitoring:
   - Engagement level tracking
   - Satisfaction surveys
   - Issue/concern log
   - Relationship health score
```

---

## PMI Governance Framework

### Program Governance Structure

```
Claude, set up governance framework:

1. Program Board (Monthly):
   - Minister (Sponsor)
   - Program Manager (You)
   - Finance Director
   - Technical Director
   - Risk Manager
   
   - Review: Strategy alignment, major decisions, risks, budget
   - Artifacts: Board pack (dashboard + key decisions needed)
   
2. Steering Committee (Bi-weekly):
   - Component leads
   - Key vendor reps (Thales)
   - Subject matter experts
   
   - Review: Integration issues, technical decisions, dependencies
   - Artifacts: Status report, issue log, decision log
   
3. Change Control Board (Weekly):
   - Program Manager (Chair)
   - Technical leads
   - Finance rep
   
   - Review: All change requests
   - Artifacts: Change log, impact analyses, decisions
   
4. Risk Review Board (Monthly):
   - Program Manager
   - Risk Manager
   - Component leads
   
   - Review: Risk register, new risks, mitigation effectiveness
   - Artifacts: Risk report, risk trends, action plans

Automation:
- Auto-generate board packs from dashboards
- Meeting scheduling and agenda creation
- Minutes documentation templates
- Action item tracking and follow-up
```

### Decision Log

```
Claude, maintain decision log:

Create "DRC-Decision-Log" spreadsheet:
- Decision ID (auto-increment)
- Date
- Decision Description
- Options Considered
- Decision Made
- Rationale
- Decision Maker
- Approver
- Impact on Project (Scope/Schedule/Cost/Risk)
- Implementation Date
- Status

Link decisions to affected components (WBS items)
Reference in change requests where applicable
Monthly decision summary report
```

### Issue Log

```
Claude, track and escalate issues:

Create "DRC-Issue-Log" spreadsheet:
- Issue ID (auto-increment)
- Date Identified
- Issue Description
- Category (Technical, Financial, Resource, External)
- Priority (Critical/High/Medium/Low)
- Impact (Scope/Schedule/Cost/Quality)
- Owner
- Status (Open/In Progress/Resolved/Closed)
- Resolution
- Date Resolved

Automation:
- Auto-escalate critical issues (email + calendar)
- SLA tracking (time to resolution by priority)
- Issue aging report (weekly)
- Convert to risks if unresolved for >14 days
```

---

## Integration with Your Existing Systems

### Link to Deal Tracker

```
Claude, integrate PMI framework with my deal tracker:

1. Deal entry becomes Program Initiation:
   - Deal: "DRC Infrastructure" → Program: "DRC-GNCS"
   - Value: $1.41B → Budget Baseline: $1.41B
   - Probability: 60% → Risk: Political/Execution risk
   - Stage: Negotiation → Phase: Initiating
   
2. Automated workflow:
   - When deal moves to "Won" → Trigger program initiation
   - Create PMI folder structure
   - Initialize all PMI templates
   - Populate with deal data
   - Send kickoff notifications
   
3. Ongoing sync:
   - Program budget → Deal value (updates if changed)
   - Program status → Deal stage
   - Program risks → Deal notes
   - Program milestones → Deal action dates
```

### Link to Proposal Tracker

```
Claude, align proposals with PMI procurement:

1. RFP capture → Procurement planning:
   - RFP details populate procurement register
   - Evaluation criteria become vendor scorecard
   - Proposal submission → Procurement milestone
   
2. Proposal workflow:
   - Bid/No-Bid decision → Procurement decision log
   - Win → Execute contract, start vendor management
   - Loss → Lessons learned capture
   
3. Procurement tracking:
   - All subcontracts tracked in procurement log
   - Vendor performance feeds back to proposal database
   - Lessons learned improve future bids
```

---

## Continuous Improvement & Maturity

### PMI Organizational Project Management (OPM)

```
Claude, build OPM capabilities:

1. PMO Knowledge Base:
   - All lessons learned aggregated
   - Best practices documented
   - Templates standardized
   - Metrics benchmarked
   
2. Process maturity tracking:
   - PMBOK process coverage (target: 100%)
   - Process compliance rate
   - Template usage rate
   - Continuous improvement initiatives
   
3. Capability development:
   - PM training completion
   - Certification tracking (PMP, PgMP)
   - Methodology adoption
   - Tool proficiency
```

### Metrics & KPIs

```
Claude, track PMI maturity KPIs:

Program Performance:
- Schedule Performance Index (SPI) - Target: ≥ 1.0
- Cost Performance Index (CPI) - Target: ≥ 1.0
- Quality: Defect density - Target: < 0.1 per unit
- Customer satisfaction - Target: ≥ 4.0/5.0

Process Maturity:
- % of projects using PMI methodology - Target: 100%
- % of deliverables on-time - Target: ≥ 95%
- % of projects within budget - Target: ≥ 90%
- Lessons learned capture rate - Target: 100%

Governance:
- Decision lag time (days) - Target: < 3 days
- Issue resolution time by priority - Target: Critical < 1 day
- Risk response plan completion - Target: 100%
- Stakeholder engagement score - Target: ≥ 4.0/5.0
```

---

This framework transforms your Google Workspace MCP into a full PMI-compliant program management system. Every PMBOK process is mapped to specific MCP tools and automation workflows.
