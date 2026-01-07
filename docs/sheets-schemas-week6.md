# Google Sheets Schemas - Week 6 (PMO Core)

Documentation for Google Sheets schemas implemented in Week 6: EVM, Sentiment Analysis, and Comprehensive Reporting.

## 1. EVM Snapshots Sheet

**Spreadsheet**: PMO_SPREADSHEET_ID
**Sheet Name**: `EVM Snapshots`
**Purpose**: Store periodic Earned Value Management snapshots for program financial tracking and forecasting

### Columns

| Column | Name | Type | Description | Example |
|--------|------|------|-------------|---------|
| A | Snapshot ID | String | Unique identifier (EVM-001) | EVM-001 |
| B | Program ID | String | Parent program reference | PROG-001 |
| C | Snapshot Date | Date | When snapshot was taken | 2026-01-05 |
| D | PV (Planned Value) | Number | Budgeted cost of work scheduled | 500000 |
| E | EV (Earned Value) | Number | Budgeted cost of work performed | 450000 |
| F | AC (Actual Cost) | Number | Actual cost of work performed | 480000 |
| G | BAC (Budget at Completion) | Number | Total planned budget | 1000000 |
| H | SPI (Schedule Performance Index) | Number | EV/PV (>1=ahead, <1=behind) | 0.90 |
| I | CPI (Cost Performance Index) | Number | EV/AC (>1=under budget, <1=over) | 0.94 |
| J | CV (Cost Variance) | Number | EV - AC (positive=under budget) | -30000 |
| K | SV (Schedule Variance) | Number | EV - PV (positive=ahead of schedule) | -50000 |
| L | EAC (Estimate at Completion) | Number | Forecasted total cost | 1063830 |
| M | ETC (Estimate to Complete) | Number | Remaining cost estimate | 583830 |
| N | VAC (Variance at Completion) | Number | BAC - EAC (budget variance) | -63830 |
| O | TCPI (To-Complete Performance Index) | Number | Performance needed to meet BAC | 1.06 |
| P | Percent Complete | Number | Overall % complete (EV/BAC * 100) | 45.0 |

### Standard EVM Formulas

- **SPI** = EV / PV (Schedule Performance Index)
- **CPI** = EV / AC (Cost Performance Index)
- **CV** = EV - AC (Cost Variance)
- **SV** = EV - PV (Schedule Variance)
- **EAC** = BAC / CPI (Estimate at Completion)
- **ETC** = EAC - AC (Estimate to Complete)
- **VAC** = BAC - EAC (Variance at Completion)
- **TCPI** = (BAC - EV) / (BAC - AC) (To-Complete Performance Index)
- **% Complete** = (EV / BAC) * 100

### Performance Interpretation

#### SPI (Schedule Performance Index)
- **> 1.0**: Ahead of schedule
- **= 1.0**: On schedule
- **< 1.0**: Behind schedule
- **< 0.9**: Significant schedule concern

#### CPI (Cost Performance Index)
- **> 1.0**: Under budget
- **= 1.0**: On budget
- **< 1.0**: Over budget
- **< 0.9**: Significant cost concern

#### TCPI (To-Complete Performance Index)
- **< 1.0**: Easy to achieve BAC
- **= 1.0**: Must maintain current performance
- **> 1.0**: Must improve performance
- **> 1.1**: Very difficult to achieve BAC

### Example Data

```csv
Snapshot ID,Program ID,Snapshot Date,PV,EV,AC,BAC,SPI,CPI,CV,SV,EAC,ETC,VAC,TCPI,Percent Complete
EVM-001,PROG-001,2026-01-05,500000,450000,480000,1000000,0.90,0.94,-30000,-50000,1063830,583830,-63830,1.06,45.0
EVM-002,PROG-001,2026-01-12,550000,520000,540000,1000000,0.95,0.96,-20000,-30000,1041667,501667,-41667,1.04,52.0
EVM-003,PROG-002,2026-01-05,300000,310000,295000,800000,1.03,1.05,15000,10000,761905,466905,38095,0.96,38.8
```

### Setup Instructions

1. Create new sheet in PMO spreadsheet named "EVM Snapshots"
2. Add header row with column names (A1:P1)
3. Format columns:
   - Dates (C): Date format
   - Currency (D, E, F, G, J, K, L, M, N): Currency or Number format with 2 decimals
   - Indices (H, I, O): Number format with 2 decimals
   - Percent (P): Number format with 1 decimal
4. Apply Data Validation (optional):
   - SPI, CPI > 0
   - Percent Complete: 0-100
5. Create chart for trend visualization (SPI and CPI over time)

---

## 2. Sentiment Analysis Sheet

**Spreadsheet**: PMO_SPREADSHEET_ID
**Sheet Name**: `Sentiment Analysis`
**Purpose**: Track LLM-powered stakeholder sentiment analysis over time

### Columns

| Column | Name | Type | Description | Example |
|--------|------|------|-------------|---------|
| A | Snapshot ID | String | Unique identifier (SENT-001) | SENT-001 |
| B | Stakeholder ID | String | Reference to stakeholder | G-01 |
| C | Stakeholder Name | String | Stakeholder name | John Smith |
| D | Program ID | String | Parent program reference | PROG-001 |
| E | Snapshot Date | Date | When analysis was performed | 2026-01-05 |
| F | Overall Sentiment | Number | Sentiment score (0-1) | 0.75 |
| G | Engagement Level | Number | Engagement level (1-5) | 4 |
| H | Trend | String | Improving/Stable/Declining | improving |
| I | Key Concerns | Text | Comma-separated concerns | Budget overruns, Schedule delays |
| J | Recommended Actions | Text | Comma-separated actions | Increase communication, Address budget |
| K | Communication Count | Number | # of communications analyzed | 15 |
| L | Date Range Start | Date | Start of analysis period | 2025-12-06 |
| M | Date Range End | Date | End of analysis period | 2026-01-05 |

### Sentiment Score Interpretation

- **0.8 - 1.0**: Very positive (highly satisfied)
- **0.6 - 0.79**: Positive (satisfied)
- **0.4 - 0.59**: Neutral (no strong sentiment)
- **0.2 - 0.39**: Negative (dissatisfied)
- **0.0 - 0.19**: Very negative (highly dissatisfied)

### Engagement Level Scale

- **5**: Highly engaged (frequent, proactive communication)
- **4**: Engaged (regular, responsive communication)
- **3**: Moderately engaged (occasional communication)
- **2**: Low engagement (rare communication)
- **1**: Disengaged (no communication or unresponsive)

### Trend Indicators

- **Improving**: Sentiment increased > 0.1 from previous snapshot
- **Stable**: Sentiment changed ≤ 0.1 from previous snapshot
- **Declining**: Sentiment decreased > 0.1 from previous snapshot

### Example Data

```csv
Snapshot ID,Stakeholder ID,Stakeholder Name,Program ID,Snapshot Date,Overall Sentiment,Engagement Level,Trend,Key Concerns,Recommended Actions,Communication Count,Date Range Start,Date Range End
SENT-001,G-01,John Smith,PROG-001,2026-01-05,0.75,4,improving,"Budget concerns, Timeline questions","Provide detailed budget breakdown, Share updated schedule",15,2025-12-06,2026-01-05
SENT-002,G-02,Jane Doe,PROG-001,2026-01-05,0.45,3,declining,"Lack of visibility, Quality issues","Increase status updates, Address quality concerns",8,2025-12-06,2026-01-05
SENT-003,G-03,Bob Johnson,PROG-002,2026-01-05,0.85,5,stable,"None identified","Continue current engagement level",22,2025-12-06,2026-01-05
```

### Setup Instructions

1. Create new sheet in PMO spreadsheet named "Sentiment Analysis"
2. Add header row with column names (A1:M1)
3. Format columns:
   - Dates (E, L, M): Date format
   - Sentiment (F): Number format with 2 decimals
   - Engagement (G): Whole number (1-5)
   - Communication Count (K): Whole number
4. Apply Data Validation:
   - Overall Sentiment (F): 0 to 1
   - Engagement Level (G): 1, 2, 3, 4, or 5
   - Trend (H): Dropdown list (improving, stable, declining)
5. Conditional Formatting (optional):
   - Sentiment < 0.4: Red background
   - Sentiment 0.4-0.6: Yellow background
   - Sentiment > 0.6: Green background

### Integration Notes

- Sentiment analysis uses LLM router (Anthropic Claude Sonnet 4.5) to analyze communications
- Fetches emails from Gmail API for the specified stakeholder and date range
- Extracts key concerns and recommended actions automatically
- Tracks trends by comparing consecutive snapshots

---

## 3. Weekly Reports Sheet

**Spreadsheet**: PMO_SPREADSHEET_ID
**Sheet Name**: `Weekly Reports`
**Purpose**: Store comprehensive weekly status report snapshots

### Columns

| Column | Name | Type | Description | Example |
|--------|------|------|-------------|---------|
| A | Report ID | String | Unique identifier (WR-001) | WR-001 |
| B | Program ID | String | Parent program reference | PROG-001 |
| C | Week Start Date | Date | Monday of the week | 2025-12-30 |
| D | Week End Date | Date | Sunday of the week | 2026-01-05 |
| E | Generated Date | Date | When report was generated | 2026-01-06 |
| F | Overall Health | String | Green/Yellow/Red status | yellow |
| G | Executive Summary | Text | AI-generated 2-3 sentence summary | Program is 45% complete... |
| H | Percent Complete | Number | Overall program % complete | 45.0 |
| I | Schedule Variance Days | Number | Days ahead/behind (negative=behind) | -5 |
| J | SPI | Number | Schedule Performance Index | 0.90 |
| K | CPI | Number | Cost Performance Index | 0.94 |
| L | Avg Sentiment | Number | Average stakeholder sentiment | 0.65 |
| M | High Risks | Number | Count of high-priority risks | 2 |
| N | Pending Changes | Number | Pending change requests | 3 |

### Health Status Determination

**Red Status** - Any of:
- Schedule Status = "behind" (SPI < 0.85)
- CPI < 0.85 (significantly over budget)
- Average Sentiment < 0.4 (negative)
- Critical Issues > 3

**Yellow Status** - Any of:
- Schedule Status = "at_risk" (SPI 0.85-0.94)
- CPI 0.85-0.94 (moderately over budget)
- Average Sentiment 0.4-0.59 (neutral)
- Critical Issues > 0

**Green Status**:
- SPI ≥ 0.95
- CPI ≥ 0.95
- Average Sentiment ≥ 0.6
- No critical issues

### Example Data

```csv
Report ID,Program ID,Week Start Date,Week End Date,Generated Date,Overall Health,Executive Summary,Percent Complete,Schedule Variance Days,SPI,CPI,Avg Sentiment,High Risks,Pending Changes
WR-001,PROG-001,2025-12-30,2026-01-05,2026-01-06,yellow,"Program is 45% complete with yellow health status. Schedule is slightly behind with SPI of 0.90, while costs remain near budget. 2 high-priority risks require attention.",45.0,-5,0.90,0.94,0.65,2,3
WR-002,PROG-002,2025-12-30,2026-01-05,2026-01-06,green,"Program is 38.8% complete with green health status. Performing ahead of schedule (SPI 1.03) and under budget (CPI 1.05). Stakeholder sentiment is positive.",38.8,3,1.03,1.05,0.75,0,1
```

### Setup Instructions

1. Create new sheet in PMO spreadsheet named "Weekly Reports"
2. Add header row with column names (A1:N1)
3. Format columns:
   - Dates (C, D, E): Date format
   - Numbers (H, I, J, K, L): Number format with appropriate decimals
   - Counts (M, N): Whole numbers
4. Apply Data Validation:
   - Overall Health (F): Dropdown list (green, yellow, red)
   - Percent Complete (H): 0 to 100
5. Conditional Formatting:
   - Health = "red": Red background
   - Health = "yellow": Yellow background
   - Health = "green": Green background

### Report Components

The weekly report aggregates data from:
- **Program Progress**: Milestones, completion percentage
- **Schedule Status**: SPI, variance, critical issues
- **Financial Status**: EVM metrics (from EVM Snapshots sheet)
- **Deliverable Status**: Submission/acceptance counts
- **Risk Status**: Active risks by priority
- **Change Control**: Pending/approved change requests
- **Stakeholder Sentiment**: Average sentiment and trends
- **Key Accomplishments**: Recent milestones and changes
- **Upcoming Activities**: Next milestones
- **Issues**: Critical open issues
- **Recommendations**: AI-generated recommendations

---

## Data Relationships

### Cross-Sheet References

1. **EVM Snapshots → Weekly Reports**
   - Weekly report fetches latest EVM snapshot for program
   - Uses SPI, CPI, percent complete for report metrics

2. **Sentiment Analysis → Weekly Reports**
   - Weekly report calculates average sentiment across all stakeholders
   - Counts improving/declining trends

3. **Stakeholders → Sentiment Analysis**
   - Stakeholder ID links to stakeholder register
   - Stakeholder email used to fetch communications

4. **Program Charter → All Sheets**
   - Program ID is foreign key across all sheets
   - Validates program existence before creating snapshots

### Data Flow

```
Gmail API → Sentiment Analysis → Weekly Report
   ↓                                    ↑
Stakeholder Register              EVM Snapshots
                                        ↑
                                  Program Charter
                                        ↑
                                    Milestones
```

---

## Testing Checklist

### EVM Snapshots
- [ ] Create EVM snapshot with all metrics calculated
- [ ] Verify formulas: SPI, CPI, CV, SV, EAC, ETC, VAC, TCPI
- [ ] Test trend analysis (improving/declining)
- [ ] Test forecasting (forecasted end date and cost)
- [ ] Verify health status determination

### Sentiment Analysis
- [ ] Fetch stakeholder emails from Gmail
- [ ] Analyze sentiment using LLM
- [ ] Extract concerns and recommended actions
- [ ] Calculate engagement level
- [ ] Determine trend by comparing snapshots
- [ ] Verify alert stakeholders identification

### Weekly Reports
- [ ] Generate weekly report with all sections
- [ ] Verify data aggregation from all sources
- [ ] Test AI-generated executive summary
- [ ] Verify health status calculation
- [ ] Test report storage in Google Sheets
- [ ] Generate executive summary
- [ ] Generate metrics report (KPI dashboard)
- [ ] Compile stakeholder-specific update

---

## Week 6 Implementation Summary

**New Modules Created:**
1. `src/pmo/evm.ts` - Earned Value Management with forecasting
2. `src/pmo/sentiment.ts` - LLM-powered sentiment analysis
3. `src/pmo/reports.ts` - Comprehensive reporting and dashboards

**Key Features:**
- Standard EVM calculations per PMI guidelines
- LLM-powered sentiment analysis of stakeholder communications
- Automated weekly reporting with AI-generated summaries
- Executive summary generation
- Stakeholder-specific updates
- KPI dashboard with metrics across all domains

**Integration:**
- Integrates with `@gw-mcp/shared-llm` for AI capabilities
- Uses Gmail API for email analysis
- Aggregates data from Program, Deliverables, Risks, Change Control modules
- Cross-references stakeholder register

**PMO Core Module Status:** ✅ 100% Complete

All Week 6 deliverables implemented successfully!
