# PMO Tools

Project Management Office tools for tracking deliverables, risks, and AI-powered proposal analysis.

**Last Updated:** 2026-01-05

---

## Overview

The PMO module provides project tracking capabilities with integration to Google Sheets for deliverable tracking, risk registers, and intelligent proposal analysis using AI.

**Features:**
- Deliverable tracking with status and quality metrics
- Risk register with scoring and prioritization
- AI-powered proposal analysis and extraction
- Automated PMO spreadsheet population

**Total: 7 tools**

---

## Tools

### pmo_read_deliverables

**Description**: Read project deliverables from PMO tracking spreadsheet with optional status and priority filters.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| spreadsheetId | string | No | PMO spreadsheet ID (default: PMO_SPREADSHEET_ID env var) |
| status_filter | string | No | Filter by status: all/not-started/in-progress/in-review/complete (default: all) |
| priority_filter | string | No | Filter by priority: critical/high/medium/low |

**Expected Spreadsheet Format:**
```
Sheet: "Deliverables"
Columns: ID | Name | Owner | Due Date | Status | Priority | Quality Score | Actual Hours
```

**Returns:**

```typescript
{
  deliverables: [
    {
      id: "D-01",
      name: "Security Assessment Report",
      owner: "security-lead@example.com",
      dueDate: "2026-02-15",
      status: "in-progress",
      priority: "high",
      qualityScore: 85,
      estimatedHours: 40,
      actualHours: 28,
      notes: "Draft completed, pending review"
    },
    {
      id: "D-02",
      name: "Implementation Plan",
      owner: "pm@example.com",
      dueDate: "2026-02-20",
      status: "not-started",
      priority: "critical",
      qualityScore: null,
      estimatedHours: 32,
      actualHours: 0,
      notes: ""
    }
  ],
  total: 42,
  filtered: 2
}
```

**Example:**

```typescript
// Get all in-progress deliverables
const inProgress = await pmo_read_deliverables({
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  status_filter: "in-progress"
});

// Get critical priority deliverables
const critical = await pmo_read_deliverables({
  priority_filter: "critical"
});

// Get all deliverables
const all = await pmo_read_deliverables({
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j"
});
```

**Errors:**
- `SPREADSHEET_NOT_FOUND`: Spreadsheet ID not found or no access
- `SHEET_NOT_FOUND`: "Deliverables" sheet not found
- `INVALID_FORMAT`: Spreadsheet format doesn't match expected columns

**See Also:** [pmo_update_deliverable](#pmo_update_deliverable), [deliverable_list](deliverables.md#deliverable_list)

---

### pmo_update_deliverable

**Description**: Update a deliverable's status, quality score, or hours in PMO tracking spreadsheet.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| spreadsheetId | string | No | PMO spreadsheet ID (default: PMO_SPREADSHEET_ID env var) |
| deliverable_id | string | Yes | Deliverable ID (e.g., D-01, D-02) |
| status | string | No | Update status: not-started/in-progress/in-review/complete |
| quality_score | number | No | Quality score 0-100 |
| actual_hours | number | No | Actual hours spent |
| notes | string | No | Additional notes |

**Returns:**

```typescript
{
  deliverable_id: "D-01",
  updated: true,
  changes: {
    status: { old: "not-started", new: "in-progress" },
    actual_hours: { old: 0, new: 15 }
  },
  deliverable: {
    id: "D-01",
    name: "Security Assessment Report",
    owner: "security-lead@example.com",
    dueDate: "2026-02-15",
    status: "in-progress",
    priority: "high",
    qualityScore: null,
    estimatedHours: 40,
    actualHours: 15,
    notes: "Started analysis phase"
  }
}
```

**Example:**

```typescript
// Update status to in-progress
await pmo_update_deliverable({
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  deliverable_id: "D-01",
  status: "in-progress",
  actual_hours: 15,
  notes: "Started analysis phase"
});

// Complete deliverable with quality score
await pmo_update_deliverable({
  deliverable_id: "D-02",
  status: "complete",
  quality_score: 92,
  actual_hours: 35,
  notes: "Completed ahead of schedule"
});
```

**Errors:**
- `SPREADSHEET_NOT_FOUND`: Spreadsheet not found
- `DELIVERABLE_NOT_FOUND`: Deliverable ID not found in spreadsheet
- `INVALID_STATUS`: Invalid status value
- `INVALID_QUALITY_SCORE`: Quality score not in range 0-100

**See Also:** [pmo_read_deliverables](#pmo_read_deliverables)

---

### pmo_read_risks

**Description**: Read project risks from risk register with optional status and severity filters.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| spreadsheetId | string | No | PMO spreadsheet ID (default: PMO_SPREADSHEET_ID env var) |
| status_filter | string | No | Filter by status: all/active/closed/monitoring (default: all) |
| min_score | number | No | Minimum risk score (1-25). Use 16 for critical risks only |

**Expected Spreadsheet Format:**
```
Sheet: "Risk Register"
Columns: ID | Risk | Category | Probability (1-5) | Impact (1-5) | Score | Status | Owner | Mitigation
```

**Risk Score Calculation:**
```
Score = Probability × Impact
Range: 1-25

Critical: 16-25  (Red)
High:     11-15  (Orange)
Medium:   6-10   (Yellow)
Low:      1-5    (Green)
```

**Returns:**

```typescript
{
  risks: [
    {
      id: "R-01",
      risk: "Key personnel may leave during critical phase",
      category: "resource",
      probability: 3,
      impact: 5,
      score: 15,
      severity: "high",
      status: "active",
      owner: "pm@example.com",
      mitigation: "Cross-training and knowledge transfer",
      lastReviewed: "2026-01-05"
    },
    {
      id: "R-02",
      risk: "Vendor delays in delivery",
      category: "schedule",
      probability: 4,
      impact: 4,
      score: 16,
      severity: "critical",
      status: "monitoring",
      owner: "procurement@example.com",
      mitigation: "Identified backup vendors",
      lastReviewed: "2026-01-03"
    }
  ],
  total: 25,
  filtered: 2,
  summary: {
    bySeverity: {
      critical: 3,
      high: 7,
      medium: 12,
      low: 3
    },
    byStatus: {
      active: 15,
      monitoring: 8,
      closed: 2
    }
  }
}
```

**Example:**

```typescript
// Get all active risks
const active = await pmo_read_risks({
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  status_filter: "active"
});

// Get only critical risks (score >= 16)
const critical = await pmo_read_risks({
  min_score: 16
});

// Get high and critical risks (score >= 11)
const highRisks = await pmo_read_risks({
  status_filter: "active",
  min_score: 11
});
```

**Errors:**
- `SPREADSHEET_NOT_FOUND`: Spreadsheet not found
- `SHEET_NOT_FOUND`: "Risk Register" sheet not found
- `INVALID_FORMAT`: Spreadsheet format doesn't match expected columns

**See Also:** [program_log_issue](program.md#program_log_issue)

---

### pmo_analyze_proposal

**Description**: Analyze a project proposal document and extract PMO tracking information using AI including deliverables, risks, stakeholders, timeline, and budget.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fileId | string | Yes | Google Drive file ID of the proposal document |
| projectName | string | No | Optional project name override |

**AI Analysis Extracts:**
- Deliverables with descriptions, owners, and timelines
- Risks with probability, impact, and mitigation strategies
- Stakeholders with roles and contact information
- Timeline and milestones
- Budget and resource requirements
- Success criteria and KPIs

**Returns:**

```typescript
{
  sessionId: "sess_1a2b3c4d5e6f",
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  fileName: "Alpha-Project-Proposal.docx",
  projectName: "Alpha Cybersecurity Initiative",
  analysis: {
    deliverables: [
      {
        name: "Security Assessment Report",
        description: "Comprehensive security assessment of current infrastructure",
        owner: "Security Team",
        estimatedHours: 120,
        dueDate: "2026-03-15",
        priority: "high",
        acceptanceCriteria: [
          "All systems assessed",
          "Vulnerabilities documented",
          "Remediation plan included"
        ]
      },
      {
        name: "Implementation Plan",
        description: "Detailed plan for security improvements",
        owner: "Project Manager",
        estimatedHours: 80,
        dueDate: "2026-03-30",
        priority: "critical",
        acceptanceCriteria: [
          "Timeline defined",
          "Resources allocated",
          "Budget approved"
        ]
      }
    ],
    risks: [
      {
        risk: "Vendor delays in security tool delivery",
        category: "schedule",
        probability: 3,
        impact: 4,
        score: 12,
        mitigation: "Identified backup vendors and early procurement"
      },
      {
        risk: "Insufficient budget for recommended improvements",
        category: "financial",
        probability: 2,
        impact: 5,
        score: 10,
        mitigation: "Phased implementation approach with priority ranking"
      }
    ],
    stakeholders: [
      {
        name: "John Smith",
        role: "Executive Sponsor",
        email: "john.smith@example.com",
        department: "Executive"
      },
      {
        name: "Jane Doe",
        role: "Security Lead",
        email: "jane.doe@example.com",
        department: "IT Security"
      }
    ],
    timeline: {
      startDate: "2026-02-01",
      endDate: "2026-06-30",
      duration: "5 months",
      phases: [
        { name: "Assessment", duration: "6 weeks" },
        { name: "Planning", duration: "4 weeks" },
        { name: "Implementation", duration: "10 weeks" }
      ]
    },
    budget: {
      total: 450000,
      breakdown: {
        labor: 280000,
        tools: 120000,
        consulting: 50000
      }
    }
  },
  confidence: 0.87,
  gaps: [
    "Specific owner emails not provided for all deliverables",
    "Risk mitigation strategies could be more detailed"
  ]
}
```

**Example:**

```typescript
// Analyze proposal document
const analysis = await pmo_analyze_proposal({
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  projectName: "Alpha Cybersecurity Initiative"
});

console.log(`Found ${analysis.analysis.deliverables.length} deliverables`);
console.log(`Found ${analysis.analysis.risks.length} risks`);
console.log(`Confidence: ${analysis.confidence * 100}%`);

// Check for gaps
if (analysis.gaps.length > 0) {
  console.log("Analysis gaps:");
  analysis.gaps.forEach(gap => console.log(`  - ${gap}`));
}

// Save session ID for follow-up
const sessionId = analysis.sessionId;
```

**Errors:**
- `FILE_NOT_FOUND`: File ID not found or no access
- `FILE_TYPE_NOT_SUPPORTED`: File type cannot be analyzed (must be Docs, PDF, or Word)
- `LLM_ERROR`: AI analysis failed
- `QUOTA_EXCEEDED`: LLM API quota exceeded

**See Also:** [pmo_ask_clarifications](#pmo_ask_clarifications), [pmo_apply_answers](#pmo_apply_answers)

---

### pmo_ask_clarifications

**Description**: Generate clarifying questions for a proposal analysis to identify gaps and ambiguities.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| sessionId | string | Yes | Session ID returned from pmo_analyze_proposal |

**Returns:**

```typescript
{
  sessionId: "sess_1a2b3c4d5e6f",
  questions: [
    {
      id: "q1",
      category: "deliverables",
      question: "Who is the specific owner/email for the Security Assessment Report deliverable?",
      importance: "high",
      context: "Owner specified as 'Security Team' but no specific person or email provided"
    },
    {
      id: "q2",
      category: "risks",
      question: "What specific backup vendors have been identified for the security tools?",
      importance: "medium",
      context: "Risk mitigation mentions backup vendors but doesn't name them"
    },
    {
      id: "q3",
      category: "timeline",
      question: "Are there any external dependencies or constraints on the timeline?",
      importance: "medium",
      context: "Timeline provided but no mention of external dependencies"
    },
    {
      id: "q4",
      category: "budget",
      question: "Is there any contingency budget allocated for unforeseen costs?",
      importance: "high",
      context: "Budget breakdown provided but no contingency mentioned"
    }
  ],
  totalQuestions: 4
}
```

**Example:**

```typescript
// Get clarifying questions after analysis
const clarifications = await pmo_ask_clarifications({
  sessionId: "sess_1a2b3c4d5e6f"
});

console.log(`Generated ${clarifications.totalQuestions} questions`);

// Display questions to user
clarifications.questions.forEach((q, i) => {
  console.log(`\n${i + 1}. [${q.category}] ${q.question}`);
  console.log(`   Importance: ${q.importance}`);
  console.log(`   Context: ${q.context}`);
});
```

**Errors:**
- `SESSION_NOT_FOUND`: Session ID not found or expired
- `ANALYSIS_INCOMPLETE`: Analysis must complete before requesting clarifications

**See Also:** [pmo_analyze_proposal](#pmo_analyze_proposal), [pmo_apply_answers](#pmo_apply_answers)

---

### pmo_apply_answers

**Description**: Apply user answers to clarification questions and refine the proposal analysis with the new information.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| sessionId | string | Yes | Session ID from pmo_analyze_proposal |
| answers | array | Yes | Array of question-answer pairs |

**Answer Format:**
```typescript
answers: [
  {
    questionId: "q1",
    answer: "jane.doe@example.com"
  },
  {
    questionId: "q2",
    answer: "Backup vendors: SecureTech Corp and CyberDefense Inc"
  }
]
```

**Returns:**

```typescript
{
  sessionId: "sess_1a2b3c4d5e6f",
  refined: true,
  analysis: {
    // Updated analysis with refined information
    deliverables: [
      {
        name: "Security Assessment Report",
        description: "Comprehensive security assessment of current infrastructure",
        owner: "jane.doe@example.com",  // Updated from answer
        estimatedHours: 120,
        dueDate: "2026-03-15",
        priority: "high",
        acceptanceCriteria: [...]
      }
    ],
    risks: [
      {
        risk: "Vendor delays in security tool delivery",
        category: "schedule",
        probability: 3,
        impact: 4,
        score: 12,
        mitigation: "Identified backup vendors: SecureTech Corp and CyberDefense Inc. Early procurement initiated.",  // Updated
        backupVendors: ["SecureTech Corp", "CyberDefense Inc"]  // Extracted
      }
    ],
    // ... rest of analysis updated
  },
  confidence: 0.94,  // Increased from 0.87
  gaps: [
    // Fewer gaps after clarification
    "Contingency budget not specified"
  ],
  answersApplied: 2
}
```

**Example:**

```typescript
// Apply answers to clarification questions
const refined = await pmo_apply_answers({
  sessionId: "sess_1a2b3c4d5e6f",
  answers: [
    {
      questionId: "q1",
      answer: "Security Assessment Report owner: jane.doe@example.com"
    },
    {
      questionId: "q2",
      answer: "Backup vendors identified: SecureTech Corp and CyberDefense Inc"
    },
    {
      questionId: "q4",
      answer: "10% contingency budget ($45,000) allocated"
    }
  ]
});

console.log(`Confidence improved to ${refined.confidence * 100}%`);
console.log(`Remaining gaps: ${refined.gaps.length}`);
```

**Errors:**
- `SESSION_NOT_FOUND`: Session ID not found or expired
- `INVALID_QUESTION_ID`: Question ID not found in session
- `EMPTY_ANSWER`: Answer is empty or missing

**See Also:** [pmo_ask_clarifications](#pmo_ask_clarifications), [pmo_create_from_proposal](#pmo_create_from_proposal)

---

### pmo_create_from_proposal

**Description**: Create deliverables, risks, and stakeholders in PMO spreadsheet from analyzed proposal.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| sessionId | string | Yes | Session ID from pmo_analyze_proposal or pmo_apply_answers |
| spreadsheetId | string | No | PMO spreadsheet ID (default: PMO_SPREADSHEET_ID env var) |
| options | object | No | Flags to control what gets created |

**Options Format:**
```typescript
options: {
  createDeliverables: true,  // Default: true
  createRisks: true,         // Default: true
  createStakeholders: true   // Default: true
}
```

**Returns:**

```typescript
{
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  created: {
    deliverables: [
      { id: "D-15", name: "Security Assessment Report", row: 15 },
      { id: "D-16", name: "Implementation Plan", row: 16 }
    ],
    risks: [
      { id: "R-08", risk: "Vendor delays in security tool delivery", row: 8 },
      { id: "R-09", risk: "Insufficient budget for recommended improvements", row: 9 }
    ],
    stakeholders: [
      { name: "John Smith", role: "Executive Sponsor", row: 5 },
      { name: "Jane Doe", role: "Security Lead", row: 6 }
    ]
  },
  summary: {
    deliverablesCreated: 2,
    risksCreated: 2,
    stakeholdersCreated: 2
  }
}
```

**Example:**

```typescript
// Create all items in PMO spreadsheet
const result = await pmo_create_from_proposal({
  sessionId: "sess_1a2b3c4d5e6f",
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j"
});

console.log(`Created ${result.summary.deliverablesCreated} deliverables`);
console.log(`Created ${result.summary.risksCreated} risks`);
console.log(`Created ${result.summary.stakeholdersCreated} stakeholders`);

// Create only deliverables
const deliverablesOnly = await pmo_create_from_proposal({
  sessionId: "sess_1a2b3c4d5e6f",
  options: {
    createDeliverables: true,
    createRisks: false,
    createStakeholders: false
  }
});
```

**Errors:**
- `SESSION_NOT_FOUND`: Session ID not found or expired
- `SPREADSHEET_NOT_FOUND`: Spreadsheet not found or no access
- `ANALYSIS_INCOMPLETE`: Analysis must complete before creating items
- `INSUFFICIENT_DATA`: Not enough data extracted to create items

**See Also:** [pmo_analyze_proposal](#pmo_analyze_proposal), [pmo_apply_answers](#pmo_apply_answers)

---

## PMO Workflow Example

Complete workflow for analyzing a proposal and populating PMO spreadsheet:

```typescript
// 1. Analyze proposal document
const analysis = await pmo_analyze_proposal({
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  projectName: "Alpha Cybersecurity Initiative"
});

console.log(`Analysis confidence: ${analysis.confidence * 100}%`);
console.log(`Found ${analysis.gaps.length} gaps`);

// 2. Get clarification questions (if needed)
if (analysis.gaps.length > 0) {
  const clarifications = await pmo_ask_clarifications({
    sessionId: analysis.sessionId
  });

  // Display questions to user and collect answers
  console.log(`\nPlease answer ${clarifications.totalQuestions} questions:`);
  clarifications.questions.forEach(q => {
    console.log(`\n${q.question}`);
  });

  // 3. Apply answers
  const refined = await pmo_apply_answers({
    sessionId: analysis.sessionId,
    answers: [
      { questionId: "q1", answer: "jane.doe@example.com" },
      { questionId: "q2", answer: "SecureTech Corp, CyberDefense Inc" }
    ]
  });

  console.log(`\nRefined confidence: ${refined.confidence * 100}%`);
}

// 4. Create items in PMO spreadsheet
const result = await pmo_create_from_proposal({
  sessionId: analysis.sessionId,
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j"
});

console.log(`\nCreated in PMO spreadsheet:`);
console.log(`  - ${result.summary.deliverablesCreated} deliverables`);
console.log(`  - ${result.summary.risksCreated} risks`);
console.log(`  - ${result.summary.stakeholdersCreated} stakeholders`);

// 5. Track progress
const deliverables = await pmo_read_deliverables({
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j"
});

console.log(`\nTracking ${deliverables.total} total deliverables`);
```

---

## PMO Spreadsheet Templates

### Required Sheets

**1. Deliverables Sheet**
```
| ID   | Name                    | Owner              | Due Date   | Status       | Priority | Quality Score | Est Hours | Actual Hours | Notes |
|------|-------------------------|--------------------|------------|--------------|----------|---------------|-----------|--------------|-------|
| D-01 | Security Assessment     | jane@example.com   | 2026-03-15 | in-progress  | high     | 85            | 120       | 80           | ...   |
| D-02 | Implementation Plan     | pm@example.com     | 2026-03-30 | not-started  | critical |               | 80        | 0            |       |
```

**2. Risk Register Sheet**
```
| ID   | Risk                    | Category  | Probability | Impact | Score | Severity | Status    | Owner              | Mitigation |
|------|-------------------------|-----------|-------------|--------|-------|----------|-----------|--------------------|-----------  |
| R-01 | Vendor delays           | schedule  | 3           | 4      | 12    | high     | active    | proc@example.com   | ...        |
| R-02 | Budget insufficient     | financial | 2           | 5      | 10    | medium   | monitoring| pm@example.com     | ...        |
```

**3. Stakeholders Sheet (Optional)**
```
| Name         | Role              | Email               | Department    | Engagement Level |
|--------------|-------------------|---------------------|---------------|------------------|
| John Smith   | Executive Sponsor | john@example.com    | Executive     | High             |
| Jane Doe     | Security Lead     | jane@example.com    | IT Security   | High             |
```

---

## Related Documentation

- [Deliverable Tracking Tools](deliverables.md) - Advanced deliverable lifecycle management
- [Program Management Tools](program.md) - Program-level tracking
- [Document Organization Tools](documents.md) - Document routing and metadata
- [PARA Organization Tools](para.md) - File categorization

---

**Next:** [Program Management Tools](program.md) →
