# Google Sheets Schemas - Week 5 Implementation

## Lessons Learned Sheet

**Sheet Name:** `Lessons Learned`
**Spreadsheet ID:** `PROGRAM_SPREADSHEET_ID` (from .env)

### Columns

| Column | Field | Type | Description |
|--------|-------|------|-------------|
| A | Lesson ID | String | Unique identifier (LL-001, LL-002, etc.) |
| B | Program ID | String | Parent program reference (PROG-001) |
| C | Category | Enum | Category: technical, process, people, stakeholder, risk, other |
| D | Lesson | String | The lesson learned (concise statement) |
| E | Context | String | What happened (background/situation) |
| F | Impact | String | What was the impact (positive or negative) |
| G | Recommendation | String | What should be done differently next time |
| H | Date Recorded | Date | When lesson was captured (YYYY-MM-DD) |
| I | Recorded By | String | Who recorded the lesson (email) |
| J | Phase | Enum | Program phase when it occurred: initiation, planning, execution, monitoring, closing, on_hold, cancelled, completed |
| K | Tags | String | Comma-separated keywords for searchability |
| L | Positive | Boolean | Was this a positive lesson? (TRUE/FALSE) |

### Header Row (Row 1)
```
Lesson ID | Program ID | Category | Lesson | Context | Impact | Recommendation | Date Recorded | Recorded By | Phase | Tags | Positive
```

### Example Data
```
LL-001 | PROG-001 | technical | Use automated testing early | We discovered integration bugs late in development | Delayed release by 2 weeks | Implement automated tests from sprint 1 | 2026-01-25 | john@example.com | execution | testing, quality, automation | FALSE
LL-002 | PROG-001 | process | Weekly stakeholder updates work well | Regular Friday updates kept stakeholders informed | High stakeholder satisfaction scores | Continue weekly cadence for all programs | 2026-01-26 | jane@example.com | execution | communication, stakeholders | TRUE
```

### Functions Using This Sheet
- `captureLessonLearned()` - Generates next LL-XXX ID, appends row
- `readLessonLearned()` - Finds row by Lesson ID
- `updateLessonLearned()` - Updates row by Lesson ID
- `searchLessons()` - Advanced search by category, phase, tags, text, positive/negative
- `generateLessonsReport()` - Comprehensive report with category/phase breakdowns, top tags
- `getRecentLessons()` - Filter by date range (default last 30 days)
- `getLessonsByTag()` - Find all lessons with specific tag
- `getLessonsSummary()` - Positive vs negative breakdown by category

---

## Governance Meetings Sheet

**Sheet Name:** `Governance Meetings`
**Spreadsheet ID:** `PROGRAM_SPREADSHEET_ID` (from .env)

### Columns

| Column | Field | Type | Description |
|--------|-------|------|-------------|
| A | Meeting ID | String | Unique identifier (GM-001, GM-002, etc.) |
| B | Program ID | String | Parent program reference (PROG-001) |
| C | Meeting Type | Enum | Type: steering_committee, board, review, status, other |
| D | Title | String | Meeting title |
| E | Date | Date | Meeting date (YYYY-MM-DD) |
| F | Duration | Number | Duration in minutes |
| G | Attendees | String | Comma-separated attendee emails |
| H | Chair | String | Meeting chair (email) |
| I | Agenda | String | Comma-separated agenda items |
| J | Decisions | String | Comma-separated decision IDs (from Decision Log) |
| K | Minutes File ID | String | Google Docs file ID for meeting minutes (optional) |
| L | Status | Enum | Status: scheduled, completed, cancelled |

### Header Row (Row 1)
```
Meeting ID | Program ID | Meeting Type | Title | Date | Duration | Attendees | Chair | Agenda | Decisions | Minutes File ID | Status
```

### Example Data
```
GM-001 | PROG-001 | steering_committee | Q1 Steering Committee | 2026-01-30 | 90 | john@example.com, jane@example.com, bob@example.com | john@example.com | Budget Review, Risk Update, Go/No-Go Decision | DEC-005, DEC-006 | 1a2b3c4d5e6f | completed
GM-002 | PROG-001 | status | Weekly Status Review | 2026-02-06 | 60 | team@example.com | jane@example.com | Progress Update, Blockers, Next Steps | | | scheduled
```

### Functions Using This Sheet
- `scheduleGovernanceMeeting()` - Creates meeting with GM-XXX ID, status=scheduled
- `readGovernanceMeeting()` - Retrieves meeting with associated action items
- `updateGovernanceMeeting()` - Updates meeting fields
- `recordGovernanceMinutes()` - Marks as completed, adds decisions, minutes file, creates action items
- `listGovernanceMeetings()` - Filters by programId, type, status, upcoming (30 days), past (90 days)
- `generateGovernanceReport()` - Summary statistics, upcoming meetings, action item completion rate

---

## Action Items Sheet

**Sheet Name:** `Action Items`
**Spreadsheet ID:** `PROGRAM_SPREADSHEET_ID` (from .env)

### Columns

| Column | Field | Type | Description |
|--------|-------|------|-------------|
| A | Action ID | String | Unique identifier (AI-001, AI-002, etc.) |
| B | Meeting ID | String | Parent governance meeting (GM-001) |
| C | Program ID | String | Program reference for easy filtering |
| D | Description | String | What needs to be done |
| E | Owner | String | Responsible person (email) |
| F | Due Date | Date | When due (YYYY-MM-DD) |
| G | Status | Enum | Status: open, in_progress, completed, cancelled |
| H | Completed Date | Date | When completed (YYYY-MM-DD, optional) |

### Header Row (Row 1)
```
Action ID | Meeting ID | Program ID | Description | Owner | Due Date | Status | Completed Date
```

### Example Data
```
AI-001 | GM-001 | PROG-001 | Update project budget forecast | john@example.com | 2026-02-05 | completed | 2026-02-03
AI-002 | GM-001 | PROG-001 | Schedule vendor review meeting | jane@example.com | 2026-02-10 | in_progress |
AI-003 | GM-001 | PROG-001 | Prepare Q1 board presentation | bob@example.com | 2026-02-15 | open |
```

### Functions Using This Sheet
- `createActionItem()` - Creates from governance meeting with AI-XXX ID, status=open
- `updateActionItem()` - Updates action item, auto-sets completed date when status=completed
- `trackActionItems()` - Filters by programId, meetingId, owner, status, overdue
- Used by `readGovernanceMeeting()` to populate actionItems array
- Used by `generateGovernanceReport()` for completion statistics

---

## Setup Instructions

### 1. Create New Sheets

In your PROGRAM_SPREADSHEET_ID Google Sheet:

#### Lessons Learned Sheet:
1. Add a new sheet named `Lessons Learned`
2. Add the header row (Row 1) with all column names as shown above
3. Format column headers (bold, freeze row 1)
4. Set column H (Date Recorded) date formatting: Format → Number → Date (YYYY-MM-DD)
5. Set column L (Positive) as checkbox: Data → Data validation → Checkbox

#### Governance Meetings Sheet:
1. Add a new sheet named `Governance Meetings`
2. Add the header row (Row 1) with all column names as shown above
3. Format column headers (bold, freeze row 1)
4. Set column E (Date) date formatting: Format → Number → Date (YYYY-MM-DD)
5. Set column F (Duration) as number

#### Action Items Sheet:
1. Add a new sheet named `Action Items`
2. Add the header row (Row 1) with all column names as shown above
3. Format column headers (bold, freeze row 1)
4. Set columns F, H (Due Date, Completed Date) date formatting: Format → Number → Date (YYYY-MM-DD)

### 2. Data Validation (Optional but Recommended)

**Lessons Learned:**
- Column C (Category): Data validation → List: technical, process, people, stakeholder, risk, other
- Column J (Phase): Data validation → List: initiation, planning, execution, monitoring, closing, on_hold, cancelled, completed
- Column L (Positive): Data validation → Checkbox

**Governance Meetings:**
- Column C (Meeting Type): Data validation → List: steering_committee, board, review, status, other
- Column L (Status): Data validation → List: scheduled, completed, cancelled

**Action Items:**
- Column G (Status): Data validation → List: open, in_progress, completed, cancelled

### 3. Testing

Use these test operations:

```typescript
// Test Lessons Learned
const lesson = await captureLessonLearned(auth, {
  programId: "PROG-001",
  category: "technical",
  lesson: "Use automated testing early",
  context: "We discovered integration bugs late",
  impact: "Delayed release by 2 weeks",
  recommendation: "Implement automated tests from sprint 1",
  recordedBy: "john@example.com",
  phase: "execution",
  tags: ["testing", "quality", "automation"],
  positive: false,
});

// Search lessons
const techLessons = await searchLessons(auth, {
  programId: "PROG-001",
  category: "technical",
});

// Test Governance Meeting
const meeting = await scheduleGovernanceMeeting(auth, {
  programId: "PROG-001",
  meetingType: "steering_committee",
  title: "Q1 Steering Committee",
  date: new Date("2026-01-30"),
  duration: 90,
  attendees: ["john@example.com", "jane@example.com"],
  chair: "john@example.com",
  agenda: ["Budget Review", "Risk Update"],
});

// Record meeting minutes and create action items
const completedMeeting = await recordGovernanceMinutes(auth, meeting.meetingId, {
  decisions: ["DEC-005", "DEC-006"],
  actionItems: [
    {
      description: "Update budget forecast",
      owner: "john@example.com",
      dueDate: new Date("2026-02-05"),
    },
  ],
});

// Track action items
const overdueActions = await trackActionItems(auth, {
  programId: "PROG-001",
  overdue: true,
});
```

---

## Integration with Existing Sheets

The new sheets integrate with existing Program Management sheets:

**Lessons Learned:**
- Links to Programs (programId)
- Captures lessons from all program phases
- Tags enable cross-referencing with issues, risks, decisions

**Governance Meetings:**
- Links to Programs (programId)
- References Decision Log (decisions array)
- Creates Action Items from meetings
- Can link to Google Docs for full minutes (minutesFileId)

**Action Items:**
- Links to Governance Meetings (meetingId)
- Links to Programs (programId) for reporting
- Tracks ownership and completion

---

## Advanced Features

### Lessons Learned:
- **Tag-based Search**: Find lessons across categories using tags
- **Positive/Negative Tracking**: Analyze what worked well vs what didn't
- **Phase Analysis**: Understand which phases generate most lessons
- **Full-Text Search**: Search across lesson, context, impact, recommendation
- **Trending Tags**: Identify common themes via top tags report

### Governance Meetings:
- **Action Item Creation**: Automatically create and track action items from meetings
- **Decision Linking**: Reference decisions made during meetings
- **Minutes Integration**: Link to Google Docs for full meeting notes
- **Upcoming/Past Filtering**: Easy access to upcoming meetings and historical data
- **Completion Tracking**: Monitor action item completion rates

### Action Items:
- **Overdue Detection**: Automatically identify overdue items
- **Owner Tracking**: See all actions by owner
- **Auto-Completion Date**: Automatically set when status changes to completed
- **Cross-Meeting Reporting**: Aggregate action items across all meetings

---

## Week 5 Implementation Complete

✅ Lessons Learned sheet with advanced search and tagging
✅ Governance Meetings sheet with action item creation
✅ Action Items sheet with automatic tracking
✅ Full-text search capabilities
✅ Positive/negative lesson analysis
✅ Meeting minutes integration
✅ Overdue action item detection
✅ Comprehensive reporting functions
