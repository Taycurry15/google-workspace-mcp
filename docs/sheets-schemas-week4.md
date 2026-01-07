# Google Sheets Schemas - Week 4 Implementation

## Schedule Activities Sheet

**Sheet Name:** `Schedule Activities`
**Spreadsheet ID:** `PROGRAM_SPREADSHEET_ID` (from .env)

### Columns

| Column | Field | Type | Description |
|--------|-------|------|-------------|
| A | Activity ID | String | Unique identifier (SA-001, SA-002, etc.) |
| B | Program ID | String | Parent program reference (PROG-001) |
| C | WBS Code | String | Work Breakdown Structure alignment (optional) |
| D | Name | String | Activity name |
| E | Description | String | Detailed description |
| F | Start Date | Date | Planned start date (YYYY-MM-DD) |
| G | End Date | Date | Planned end date (YYYY-MM-DD) |
| H | Duration | Number | Duration in days |
| I | Actual Start | Date | Actual start date (YYYY-MM-DD) |
| J | Actual End | Date | Actual completion date (YYYY-MM-DD) |
| K | Percent Complete | Number | Completion percentage (0-100) |
| L | Dependencies | String | Comma-separated activity IDs (predecessors) |
| M | Responsible | String | Responsible person (email) |
| N | Status | Enum | Status: initiation, planning, execution, monitoring, closing, on_hold, cancelled, completed |
| O | Critical | Boolean | Is on critical path? (TRUE/FALSE) |

### Header Row (Row 1)
```
Activity ID | Program ID | WBS Code | Name | Description | Start Date | End Date | Duration | Actual Start | Actual End | Percent Complete | Dependencies | Responsible | Status | Critical
```

### Example Data
```
SA-001 | PROG-001 | 1.1 | Design Phase | Complete system design | 2026-01-15 | 2026-02-28 | 45 | 2026-01-15 | | 30 | | john@example.com | execution | TRUE
SA-002 | PROG-001 | 1.2 | Development | Build core features | 2026-03-01 | 2026-04-30 | 61 | | | 0 | SA-001 | jane@example.com | planning | TRUE
```

### Functions Using This Sheet
- `createScheduleActivity()` - Generates next SA-XXX ID, appends row
- `readScheduleActivity()` - Finds row by Activity ID
- `updateScheduleActivity()` - Updates row by Activity ID
- `listScheduleActivities()` - Filters activities by programId, status, critical, etc.
- `calculateCriticalPath()` - Reads all activities, calculates CPM, updates critical flags
- `detectScheduleVariance()` - Compares actual vs planned dates
- `getScheduleSummary()` - Aggregates status, progress, health

---

## Change Requests Sheet

**Sheet Name:** `Change Requests`
**Spreadsheet ID:** `PROGRAM_SPREADSHEET_ID` (from .env)

### Columns

| Column | Field | Type | Description |
|--------|-------|------|-------------|
| A | Change ID | String | Unique identifier (CR-001, CR-002, etc.) |
| B | Program ID | String | Parent program reference (PROG-001) |
| C | Title | String | Change request title |
| D | Description | String | Detailed description |
| E | Requested By | String | Requester (email) |
| F | Request Date | Date | Submission date (YYYY-MM-DD) |
| G | Category | Enum | Category: scope, schedule, quality, resources, other |
| H | Priority | Enum | Priority: critical, high, medium, low |
| I | Impact | String | Impact assessment description |
| J | Justification | String | Business justification |
| K | Status | Enum | Status: submitted, under_review, approved, rejected, implemented |
| L | Decision | Enum | Decision: approve, reject, defer (optional) |
| M | Decision Date | Date | When decision was made (YYYY-MM-DD) |
| N | Approver | String | Who approved/rejected (email) |
| O | Approver Comments | String | Reviewer feedback |
| P | Implementation Date | Date | When change was implemented (YYYY-MM-DD) |
| Q | Affected Deliverables | String | Comma-separated deliverable IDs |
| R | Affected Milestones | String | Comma-separated milestone IDs |

### Header Row (Row 1)
```
Change ID | Program ID | Title | Description | Requested By | Request Date | Category | Priority | Impact | Justification | Status | Decision | Decision Date | Approver | Approver Comments | Implementation Date | Affected Deliverables | Affected Milestones
```

### Example Data
```
CR-001 | PROG-001 | Add Analytics Module | Request to add advanced analytics capability | john@example.com | 2026-01-20 | scope | high | Adds 2 weeks to timeline, requires 1 FTE | Stakeholder requirement from Q4 review | under_review | | | | | | D-005, D-007 | M-003
CR-002 | PROG-001 | Extend Testing Phase | Need additional week for UAT | jane@example.com | 2026-01-22 | schedule | medium | Delays go-live by 1 week | Found critical bugs in integration | approved | approve | 2026-01-23 | pm@example.com | Approved with mitigation plan | | | M-005
```

### Functions Using This Sheet
- `createChangeRequest()` - Generates next CR-XXX ID, appends row with status=submitted
- `readChangeRequest()` - Finds row by Change ID
- `updateChangeRequest()` - Updates row by Change ID
- `reviewChangeRequest()` - Sets decision, approver, status (approved/rejected/under_review)
- `implementChange()` - Updates status to implemented, sets implementation date
- `listChangeRequests()` - Filters by programId, status, category, priority
- `analyzeChangeImpact()` - Aggregates statistics, identifies critical changes
- `getPendingChangeRequests()` - Filters submitted + under_review
- `getChangeControlSummary()` - Calculates approval rate, decision time, health

---

## Setup Instructions

### 1. Create New Sheets

In your PROGRAM_SPREADSHEET_ID Google Sheet:

1. Add a new sheet named `Schedule Activities`
2. Add the header row (Row 1) with all column names as shown above
3. Format column headers (bold, freeze row 1)
4. Set column F-J date formatting: Format → Number → Date (YYYY-MM-DD)
5. Set column H (Duration) and K (Percent Complete) as numbers

6. Add a new sheet named `Change Requests`
7. Add the header row (Row 1) with all column names as shown above
8. Format column headers (bold, freeze row 1)
9. Set columns F, M, P date formatting: Format → Number → Date (YYYY-MM-DD)

### 2. Data Validation (Optional but Recommended)

**Schedule Activities:**
- Column N (Status): Data validation → List from a range → Dropdown: initiation, planning, execution, monitoring, closing, on_hold, cancelled, completed
- Column O (Critical): Data validation → Checkbox

**Change Requests:**
- Column G (Category): Data validation → List: scope, schedule, quality, resources, other
- Column H (Priority): Data validation → List: critical, high, medium, low
- Column K (Status): Data validation → List: submitted, under_review, approved, rejected, implemented
- Column L (Decision): Data validation → List: approve, reject, defer

### 3. Access Permissions

Ensure the service account has Editor access to the spreadsheet.

### 4. Testing

Use these test operations:

```typescript
// Test Schedule Activity
const activity = await createScheduleActivity(auth, {
  programId: "PROG-001",
  name: "Design Phase",
  description: "Complete system design",
  startDate: new Date("2026-01-15"),
  endDate: new Date("2026-02-28"),
  duration: 45,
  responsible: "john@example.com",
});

// Test Change Request
const changeRequest = await createChangeRequest(auth, {
  programId: "PROG-001",
  title: "Add Analytics Module",
  description: "Request to add advanced analytics",
  requestedBy: "john@example.com",
  category: "scope",
  priority: "high",
  impact: "Adds 2 weeks to timeline",
  justification: "Stakeholder requirement",
});
```

---

## Integration with Existing Sheets

The new sheets integrate with existing Program Management sheets:

- **Programs** (from charter.ts) - Parent program for schedules and changes
- **WBS** (from wbs.ts) - Activities can align with WBS codes
- **Milestones** (from milestones.ts) - Changes can affect milestones, schedule activities support milestone dependencies

---

## Week 4 Implementation Complete

✅ Schedule Activities sheet with CPM analysis
✅ Change Requests sheet with approval workflow
✅ Critical path calculation (forward/backward pass)
✅ Schedule variance detection
✅ Change impact analysis
✅ Integration with existing program data
