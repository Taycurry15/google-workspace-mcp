# PARA Organization Tools

AI-powered file organization using the PARA method (Projects, Areas, Resources, Archives).

**Last Updated:** 2026-01-05

---

## Overview

The PARA module provides intelligent file categorization and organization using AI analysis. PARA is a productivity method that organizes information into four categories:

- **Projects**: Short-term efforts with deadlines and specific outcomes
- **Areas**: Long-term responsibilities requiring ongoing attention
- **Resources**: Topics of interest and reference materials
- **Archives**: Inactive items from the other three categories

**Total: 8 tools**

---

## What is PARA?

PARA (Projects, Areas, Resources, Archives) is an organizational system created by Tiago Forte that helps manage information and files based on actionability:

```
┌─────────────────────────────────────────────────┐
│                    PARA METHOD                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  PROJECT    Active, time-bound, specific goal   │
│  ▼          High actionability                   │
│             Example: "Q1 Proposal"               │
│                                                  │
│  AREA       Ongoing responsibility               │
│  ▼          Medium actionability                 │
│             Example: "Client Management"         │
│                                                  │
│  RESOURCE   Reference material                   │
│  ▼          Low actionability                    │
│             Example: "Industry Research"         │
│                                                  │
│  ARCHIVE    Completed/inactive items             │
│  ▼          No actionability                     │
│             Example: "2025 Projects"             │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Tools

### para_setup_structure

**Description**: Create PARA folder structure (Projects, Areas, Resources, Archives) in Google Drive with optional subfolders for specific domains.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| parentFolderId | string | No | Parent folder ID (default: Drive root) |
| includeSubfolders | boolean | No | Create domain-specific subfolders (default: true) |

**Folder Structure Created:**
```
PARA/
├── 1. Projects/
│   ├── Government Contracting/
│   ├── International Deals/
│   ├── Cybersecurity/
│   └── General Business/
├── 2. Areas/
│   ├── Client Management/
│   ├── Business Development/
│   ├── Operations/
│   └── Professional Development/
├── 3. Resources/
│   ├── Industry Research/
│   ├── Templates/
│   ├── Best Practices/
│   └── Tools & Technologies/
└── 4. Archives/
    ├── 2025/
    ├── 2024/
    └── Older/
```

**Returns:**

```typescript
{
  rootFolderId: "1a2b3c4d5e6f7g8h9i0j",
  structure: {
    projects: {
      folderId: "1b2c3d4e5f6g7h8i9j0k",
      subfolders: {
        govcon: "1c2d3e4f5g6h7i8j9k0l",
        international: "1d2e3f4g5h6i7j8k9l0m",
        cybersec: "1e2f3g4h5i6j7k8l9m0n",
        business: "1f2g3h4i5j6k7l8m9n0o"
      }
    },
    areas: {
      folderId: "1g2h3i4j5k6l7m8n9o0p",
      subfolders: {...}
    },
    resources: {
      folderId: "1h2i3j4k5l6m7n8o9p0q",
      subfolders: {...}
    },
    archives: {
      folderId: "1i2j3k4l5m6n7o8p9q0r",
      subfolders: {...}
    }
  }
}
```

**Example:**

```typescript
// Create PARA structure in Drive root
const structure = await para_setup_structure({
  includeSubfolders: true
});

console.log(`PARA root folder: ${structure.rootFolderId}`);
console.log(`Projects folder: ${structure.structure.projects.folderId}`);
```

**See Also:** [para_categorize_file](#para_categorize_file), [document_create_folder_structure](documents.md#document_create_folder_structure)

---

### para_categorize_file

**Description**: Analyze a file using AI and automatically assign PARA category with confidence scoring, actionability level, and metadata.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fileId | string | Yes | Google Drive file ID to categorize |
| forceRecategorize | boolean | No | Re-analyze even if already categorized (default: false) |
| applyToFolder | boolean | No | Apply metadata to file (default: true) |
| createShortcut | boolean | No | Create shortcut in PARA folder (default: true) |

**AI Analysis Considers:**
- File name and content
- Creation/modification dates
- Project indicators (deadlines, deliverables)
- Area indicators (ongoing, recurring, responsibility)
- Resource indicators (reference, template, research)
- Domain classification (govcon, international, cybersec, business)

**Returns:**

```typescript
{
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  fileName: "RFP-Response-Draft.docx",
  category: "PROJECT",
  confidence: 0.92,
  reasoning: "Document contains RFP response with deadline and deliverables",
  metadata: {
    actionability: "high",
    domain: "govcon",
    projectName: "Federal RFP Response",
    tags: ["rfp", "proposal", "federal", "govcon"],
    needsReview: false,
    lastCategorized: "2026-01-05T10:30:00Z"
  },
  shortcutCreated: true,
  shortcutId: "1b2c3d4e5f6g7h8i9j0k"
}
```

**Confidence Levels:**
- **High (0.8-1.0)**: Clear indicators, confident categorization
- **Medium (0.5-0.79)**: Some ambiguity, likely correct
- **Low (0-0.49)**: Unclear, may need manual review

**Actionability Levels:**
- **high**: Requires immediate or near-term action (Projects)
- **medium**: Ongoing attention needed (Areas)
- **low**: Reference only (Resources)
- **none**: No action needed (Archives)

**Example:**

```typescript
// Categorize a new file
const result = await para_categorize_file({
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  applyToFolder: true,
  createShortcut: true
});

console.log(`Category: ${result.category} (${result.confidence * 100}% confident)`);
console.log(`Reasoning: ${result.reasoning}`);

// Re-categorize existing file
const updated = await para_categorize_file({
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  forceRecategorize: true
});
```

**Errors:**
- `FILE_NOT_FOUND`: File ID does not exist
- `LLM_ERROR`: AI analysis failed
- `QUOTA_EXCEEDED`: LLM API quota exceeded

**See Also:** [para_batch_categorize](#para_batch_categorize), [para_update_category](#para_update_category)

---

### para_batch_categorize

**Description**: Batch categorize multiple files with AI analysis for efficient processing.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fileIds | array of strings | No | Array of file IDs to categorize |
| folderId | string | No | Categorize all files in this folder |
| maxFiles | number | No | Maximum files to process (default: 50, max: 100) |
| forceRecategorize | boolean | No | Re-categorize already categorized files (default: false) |

**Note:** Provide either `fileIds` OR `folderId`, not both.

**Returns:**

```typescript
{
  processed: 42,
  successful: 38,
  failed: 4,
  skipped: 10,
  results: [
    {
      fileId: "1a2b3c4d5e6f7g8h9i0j",
      fileName: "proposal.docx",
      category: "PROJECT",
      confidence: 0.92,
      success: true
    },
    {
      fileId: "1b2c3d4e5f6g7h8i9j0k",
      fileName: "research.pdf",
      category: "RESOURCE",
      confidence: 0.85,
      success: true
    },
    {
      fileId: "1c2d3e4f5g6h7i8j9k0l",
      fileName: "corrupted.docx",
      success: false,
      error: "Unable to read file content"
    }
  ],
  summary: {
    byCategory: {
      PROJECT: 15,
      AREA: 8,
      RESOURCE: 12,
      ARCHIVE: 3
    },
    averageConfidence: 0.87
  }
}
```

**Example:**

```typescript
// Categorize all files in a folder
const results = await para_batch_categorize({
  folderId: "1a2b3c4d5e6f7g8h9i0j",
  maxFiles: 50
});

console.log(`Categorized ${results.successful}/${results.processed} files`);
console.log(`Projects: ${results.summary.byCategory.PROJECT}`);

// Categorize specific files
const specificResults = await para_batch_categorize({
  fileIds: [
    "1a2b3c4d5e6f7g8h9i0j",
    "1b2c3d4e5f6g7h8i9j0k",
    "1c2d3e4f5g6h7i8j9k0l"
  ]
});
```

**Errors:**
- `FOLDER_NOT_FOUND`: Folder ID does not exist
- `INVALID_PARAMETERS`: Both fileIds and folderId provided
- `LLM_QUOTA_EXCEEDED`: LLM API quota exceeded during batch

**See Also:** [para_categorize_file](#para_categorize_file)

---

### para_search

**Description**: Search files by PARA category, actionability, tags, domain, and other metadata with filtering.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| category | string | No | Filter by PARA category (PROJECT/AREA/RESOURCE/ARCHIVE) |
| actionability | string | No | Filter by actionability level (high/medium/low/none) |
| tags | array of strings | No | Filter by tags (matches any) |
| domain | string | No | Filter by domain (govcon/international/cybersec/business) |
| needsReview | boolean | No | Only show files needing review |
| projectName | string | No | Filter by project name |
| maxResults | number | No | Maximum results (default: 100, max: 500) |

**Returns:**

```typescript
{
  files: [
    {
      fileId: "1a2b3c4d5e6f7g8h9i0j",
      fileName: "RFP-Response.docx",
      category: "PROJECT",
      confidence: 0.92,
      actionability: "high",
      domain: "govcon",
      projectName: "Federal RFP Response",
      tags: ["rfp", "proposal", "federal"],
      needsReview: false,
      lastCategorized: "2026-01-05T10:30:00Z",
      webViewLink: "https://drive.google.com/file/d/..."
    }
  ],
  total: 42,
  filters: {
    category: "PROJECT",
    actionability: "high"
  }
}
```

**Example:**

```typescript
// Find all active projects
const activeProjects = await para_search({
  category: "PROJECT",
  actionability: "high"
});

// Find government contracting resources
const govconResources = await para_search({
  category: "RESOURCE",
  domain: "govcon"
});

// Find files needing review
const needsReview = await para_search({
  needsReview: true,
  maxResults: 50
});

// Find files with specific tags
const securityFiles = await para_search({
  tags: ["security", "compliance"],
  domain: "cybersec"
});
```

**Errors:**
- `INVALID_CATEGORY`: Invalid category value
- `INVALID_ACTIONABILITY`: Invalid actionability value

**See Also:** [para_categorize_file](#para_categorize_file), [para_review_prompt](#para_review_prompt)

---

### para_auto_archive

**Description**: Automatically archive completed projects to Archives folder based on completion status or date.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fileId | string | No | Specific file ID to archive |
| projectName | string | No | Project name to archive (all files) |
| completionDate | string | No | Project completion date (default: today) |
| archiveReason | string | No | Reason for archival |
| scanForCompletedProjects | boolean | No | Scan and identify completed projects (default: false) |

**Auto-Archive Criteria:**
- Project marked as complete in metadata
- No modifications in last 90 days
- All deliverables marked complete
- Explicit completion date set

**Returns:**

```typescript
{
  archived: 12,
  files: [
    {
      fileId: "1a2b3c4d5e6f7g8h9i0j",
      fileName: "Q4-2025-Report.pdf",
      previousCategory: "PROJECT",
      newCategory: "ARCHIVE",
      archiveDate: "2026-01-05",
      archiveReason: "Project completed",
      archivedTo: "1z2y3x4w5v6u7t8s9r0q"
    }
  ]
}
```

**Example:**

```typescript
// Archive specific project
const result = await para_auto_archive({
  projectName: "Q4 2025 Federal RFP",
  completionDate: "2025-12-31",
  archiveReason: "Contract awarded and project complete"
});

// Archive specific file
await para_auto_archive({
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  archiveReason: "Deliverable completed"
});

// Scan and archive all completed projects
const scanResult = await para_auto_archive({
  scanForCompletedProjects: true
});

console.log(`Archived ${scanResult.archived} files`);
```

**Errors:**
- `FILE_NOT_FOUND`: File ID does not exist
- `PROJECT_NOT_FOUND`: Project name not found
- `ALREADY_ARCHIVED`: File already in ARCHIVE category

**See Also:** [para_update_category](#para_update_category), [para_search](#para_search)

---

### para_review_prompt

**Description**: Identify files needing PARA categorization or review and generate action prompts with optional email notification.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| scanScope | string | No | What to scan: all/uncategorized/stale/lowConfidence (default: all) |
| staleDays | number | No | Days since last review to consider stale (default: 90) |
| sendNotification | boolean | No | Send email notification with review list (default: false) |
| emailTo | string | No | Email address for notification (required if sendNotification: true) |

**Scan Scopes:**
- `all`: All files needing attention
- `uncategorized`: Files without PARA categorization
- `stale`: Files not reviewed in X days
- `lowConfidence`: Files with confidence < 0.7

**Returns:**

```typescript
{
  needsAttention: 23,
  categories: {
    uncategorized: 8,
    stale: 12,
    lowConfidence: 3
  },
  files: [
    {
      fileId: "1a2b3c4d5e6f7g8h9i0j",
      fileName: "untitled-document.docx",
      reason: "uncategorized",
      lastModified: "2026-01-03T14:20:00Z",
      actionPrompt: "Review and categorize this document into PARA system",
      webViewLink: "https://drive.google.com/file/d/..."
    },
    {
      fileId: "1b2c3d4e5f6g7h8i9j0k",
      fileName: "old-proposal.pdf",
      reason: "stale",
      lastCategorized: "2025-08-15T10:30:00Z",
      category: "PROJECT",
      actionPrompt: "Review if project is still active or should be archived",
      webViewLink: "https://drive.google.com/file/d/..."
    },
    {
      fileId: "1c2d3e4f5g6h7i8j9k0l",
      fileName: "meeting-notes.docx",
      reason: "lowConfidence",
      category: "AREA",
      confidence: 0.62,
      actionPrompt: "Verify AREA categorization - confidence is moderate",
      webViewLink: "https://drive.google.com/file/d/..."
    }
  ],
  emailSent: true
}
```

**Email Notification Example:**
```
Subject: PARA Review Required - 23 Files Need Attention

You have 23 files that need PARA categorization or review:

Uncategorized (8 files):
- untitled-document.docx
  Action: Review and categorize this document into PARA system
  Link: https://drive.google.com/file/d/...

Stale (12 files):
- old-proposal.pdf (last reviewed 142 days ago)
  Action: Review if project is still active or should be archived
  Link: https://drive.google.com/file/d/...

[...]
```

**Example:**

```typescript
// Review all uncategorized files
const uncategorized = await para_review_prompt({
  scanScope: "uncategorized"
});

console.log(`${uncategorized.needsAttention} files need categorization`);

// Review stale files and send email notification
const staleReview = await para_review_prompt({
  scanScope: "stale",
  staleDays: 60,
  sendNotification: true,
  emailTo: "me@example.com"
});

// Comprehensive review
const fullReview = await para_review_prompt({
  scanScope: "all",
  sendNotification: true,
  emailTo: "me@example.com"
});
```

**Errors:**
- `INVALID_SCAN_SCOPE`: Invalid scanScope value
- `EMAIL_REQUIRED`: sendNotification is true but emailTo not provided

**See Also:** [para_search](#para_search), [para_categorize_file](#para_categorize_file)

---

### para_create_dashboard

**Description**: Create a PARA tracking dashboard spreadsheet with live metrics, categorization log, and visualizations.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| folderId | string | No | Folder to create dashboard in (default: PARA root) |

**Dashboard Sheets:**
1. **Overview**: Summary metrics and key statistics
2. **Categorization Log**: All categorization events with timestamps
3. **By Category**: Breakdown by PROJECT/AREA/RESOURCE/ARCHIVE
4. **By Domain**: Breakdown by govcon/international/cybersec/business
5. **Review Tracker**: Files needing review with aging

**Dashboard Content:**
```
┌─────────────────────────────────────────────────┐
│              PARA DASHBOARD                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  Total Files: 245                                │
│                                                  │
│  By Category:                                    │
│    Projects:   42 (17%)  ████████                │
│    Areas:      35 (14%)  ███████                 │
│    Resources:  128 (52%) █████████████████████   │
│    Archives:   40 (16%)  ████████                │
│                                                  │
│  Actionability:                                  │
│    High:      42                                 │
│    Medium:    35                                 │
│    Low:       128                                │
│    None:      40                                 │
│                                                  │
│  Needs Review: 12 files                          │
│  Uncategorized: 8 files                          │
│                                                  │
│  Last Updated: 2026-01-05 10:30 AM               │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Returns:**

```typescript
{
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  spreadsheetUrl: "https://docs.google.com/spreadsheets/d/...",
  sheets: [
    { title: "Overview", sheetId: 0 },
    { title: "Categorization Log", sheetId: 1 },
    { title: "By Category", sheetId: 2 },
    { title: "By Domain", sheetId: 3 },
    { title: "Review Tracker", sheetId: 4 }
  ]
}
```

**Example:**

```typescript
const dashboard = await para_create_dashboard({
  folderId: "1a2b3c4d5e6f7g8h9i0j"
});

console.log(`Dashboard created: ${dashboard.spreadsheetUrl}`);
```

**See Also:** [para_search](#para_search), [para_review_prompt](#para_review_prompt)

---

### para_update_category

**Description**: Manually update PARA category and metadata for a file, overriding AI categorization.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fileId | string | Yes | File ID to update |
| category | string | Yes | PARA category (PROJECT/AREA/RESOURCE/ARCHIVE) |
| metadata | object | No | Additional PARA metadata to update |
| createShortcut | boolean | No | Create/move shortcut to PARA folder (default: true) |

**Metadata Fields:**
```typescript
metadata: {
  actionability?: "high" | "medium" | "low" | "none",
  domain?: "govcon" | "international" | "cybersec" | "business",
  projectName?: string,
  tags?: string[],
  needsReview?: boolean,
  notes?: string
}
```

**Returns:**

```typescript
{
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  fileName: "proposal.docx",
  category: "PROJECT",
  previousCategory: "AREA",
  metadata: {
    actionability: "high",
    domain: "govcon",
    projectName: "Federal RFP Response",
    tags: ["rfp", "proposal", "federal"],
    needsReview: false,
    manualOverride: true,
    lastUpdated: "2026-01-05T10:30:00Z"
  },
  shortcutUpdated: true
}
```

**Example:**

```typescript
// Change category and update metadata
const result = await para_update_category({
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  category: "PROJECT",
  metadata: {
    actionability: "high",
    domain: "govcon",
    projectName: "Q1 2026 Federal RFP",
    tags: ["rfp", "federal", "priority"]
  }
});

// Archive a file
await para_update_category({
  fileId: "1b2c3d4e5f6g7h8i9j0k",
  category: "ARCHIVE",
  metadata: {
    actionability: "none",
    notes: "Project completed 2025-12-31"
  }
});
```

**Errors:**
- `FILE_NOT_FOUND`: File ID does not exist
- `INVALID_CATEGORY`: Invalid category value
- `INVALID_METADATA`: Metadata format invalid

**See Also:** [para_categorize_file](#para_categorize_file), [para_auto_archive](#para_auto_archive)

---

## PARA Best Practices

### When to Use Each Category

**PROJECT**
- Has a deadline or target completion date
- Has specific, measurable outcomes
- Requires multiple actions or deliverables
- Examples: "Q1 RFP Response", "Website Redesign", "Annual Report"

**AREA**
- Ongoing responsibility or standard to maintain
- No specific end date
- Requires regular attention
- Examples: "Client Management", "Team Leadership", "Financial Planning"

**RESOURCE**
- Reference material on topics of interest
- No immediate action required
- May be useful in the future
- Examples: "Industry Research", "Technical Documentation", "Templates"

**ARCHIVE**
- Completed projects
- Inactive areas
- Outdated resources
- No current relevance but kept for reference

### Categorization Tips

1. **Start with actionability**: Ask "What action does this require?"
   - Immediate/specific action → PROJECT
   - Ongoing attention → AREA
   - Reference only → RESOURCE
   - No action → ARCHIVE

2. **Use domains for sub-organization**: Apply domain tags (govcon, international, cybersec, business) for easier filtering

3. **Review regularly**: Set up weekly/monthly reviews with `para_review_prompt`

4. **Archive completed work**: Use `para_auto_archive` to keep Projects folder focused on active work

5. **Trust low confidence scores**: Files with confidence < 0.7 may need manual review

---

## Related Documentation

- [Google Workspace Tools](google-workspace.md) - Drive integration
- [Document Organization Tools](documents.md) - PMI-standard folder structures
- [Workflow Automation](workflows.md) - Automated PARA workflows
- [LLM Configuration](../guides/llm-configuration.md) - Cost optimization for AI analysis

---

**Next:** [PMO Tools](pmo.md) →
