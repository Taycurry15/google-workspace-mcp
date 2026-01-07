# Document Organization Tools

LLM-powered document routing, metadata management, and PMI-standard folder structures.

**Last Updated:** 2026-01-05

---

## Overview

The Document Organization module provides intelligent document categorization and routing using AI analysis. Automatically organize program documents into PMI-standard folder structures, manage rich metadata, and find relevant documents across your organization.

**Key Features:**
- AI-powered document categorization and routing
- PMI-standard folder structure creation
- Rich metadata management with versioning
- Advanced search with relevance scoring
- Template management and document generation
- Similarity-based document discovery

**Total: 12 tools**

---

## Tools

### document_submit

**Description**: Submit a document for intelligent categorization and automatic routing to appropriate program folder using AI analysis.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fileId | string | Yes | Google Drive file ID |
| programId | string | Yes | Program ID to associate |
| documentType | string | No | Manual type override |
| deliverableId | string | No | Deliverable ID if part of a deliverable |
| phase | string | No | Project phase override |
| autoRoute | boolean | No | Auto-move file to determined folder (default: true) |

**AI Analysis Determines:**
- Document type (charter, plan, report, specification, etc.)
- Project phase (planning, execution, monitoring, closing)
- Recommended folder location
- Relevant keywords and tags
- Related documents

**Returns:**

```typescript
{
  docId: "DOC-001",
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  fileName: "Security-Assessment-Plan.docx",
  programId: "PROG-001",
  documentType: "plan",
  phase: "planning",
  category: "technical",
  keywords: ["security", "assessment", "methodology", "scope"],
  routedTo: {
    folderId: "1b2c3d4e5f6g7h8i9j0k",
    folderPath: "PROG-001/02-Planning/Technical Documents"
  },
  confidence: 0.89,
  reasoning: "Document contains planning details for security assessment with methodology and scope definition",
  createdDate: "2026-01-05T10:30:00Z"
}
```

**Document Types:**
- `charter`: Program/project charters
- `plan`: Plans (project, test, security, etc.)
- `specification`: Requirements, specifications
- `design`: Design documents, architectures
- `report`: Reports, assessments, findings
- `procedure`: Procedures, standards, guidelines
- `presentation`: Presentations, briefings
- `meeting_notes`: Meeting minutes, notes
- `correspondence`: Emails, letters, memos
- `contract`: Contracts, agreements, MOUs
- `other`: Other document types

**Project Phases:**
- `initiating`: Chartering, stakeholder identification
- `planning`: Plans, schedules, budgets
- `executing`: Implementation, testing, deployment
- `monitoring`: Status reports, reviews
- `closing`: Lessons learned, closeout

**Example:**

```typescript
// Submit document for auto-routing
const result = await document_submit({
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  programId: "PROG-001",
  autoRoute: true
});

console.log(`Routed to: ${result.routedTo.folderPath}`);
console.log(`Type: ${result.documentType} (${result.confidence * 100}% confident)`);

// Submit with manual overrides
const manual = await document_submit({
  fileId: "1b2c3d4e5f6g7h8i9j0k",
  programId: "PROG-001",
  documentType: "report",
  phase: "executing",
  deliverableId: "D-05",
  autoRoute: false  // Don't move the file
});
```

**Errors:**
- `FILE_NOT_FOUND`: File ID does not exist
- `PROGRAM_NOT_FOUND`: Program ID does not exist
- `LLM_ERROR`: AI analysis failed
- `FOLDER_STRUCTURE_NOT_FOUND`: Program folder structure not created

**See Also:** [document_categorize](#document_categorize), [document_create_folder_structure](#document_create_folder_structure)

---

### document_categorize

**Description**: Analyze and categorize a document using LLM intelligence without moving it. Returns categorization data only.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fileId | string | Yes | Google Drive file ID |
| documentType | string | No | Suggested document type to validate |

**Returns:**

```typescript
{
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  fileName: "Implementation-Strategy.docx",
  analysis: {
    documentType: "plan",
    phase: "planning",
    category: "technical",
    keywords: ["implementation", "strategy", "approach", "timeline", "resources"],
    summary: "Document outlines implementation strategy with phased approach and resource allocation",
    confidence: 0.92,
    suggestedFolder: "02-Planning/Technical Documents",
    relatedTopics: ["project execution", "resource management", "timeline planning"]
  }
}
```

**Example:**

```typescript
// Analyze document without moving
const analysis = await document_categorize({
  fileId: "1a2b3c4d5e6f7g8h9i0j"
});

console.log(`Type: ${analysis.analysis.documentType}`);
console.log(`Phase: ${analysis.analysis.phase}`);
console.log(`Keywords: ${analysis.analysis.keywords.join(", ")}`);

// Validate suggested type
const validation = await document_categorize({
  fileId: "1b2c3d4e5f6g7h8i9j0k",
  documentType: "specification"
});

if (validation.analysis.documentType !== "specification") {
  console.log("Warning: Document may not be a specification");
}
```

**Errors:**
- `FILE_NOT_FOUND`: File ID does not exist
- `LLM_ERROR`: AI analysis failed
- `FILE_TYPE_NOT_SUPPORTED`: File type cannot be analyzed

**See Also:** [document_submit](#document_submit), [para_categorize_file](para.md#para_categorize_file)

---

### document_create_folder_structure

**Description**: Create PMI-standard folder structure for a program in Google Drive.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | Yes | Program ID |
| template | string | No | Template to use: pmi or custom (default: pmi) |
| parentFolderId | string | No | Parent folder ID in Drive (default: root) |

**PMI Standard Folder Structure:**
```
PROG-001 - Digital Transformation/
├── 00-Charter/
│   └── Program Charter.docx
├── 01-Initiating/
│   ├── Stakeholder Register.xlsx
│   └── Business Case.docx
├── 02-Planning/
│   ├── Project Plans/
│   ├── Technical Documents/
│   ├── Test Plans/
│   └── Risk Register.xlsx
├── 03-Executing/
│   ├── Deliverables/
│   ├── Test Results/
│   └── Status Reports/
├── 04-Monitoring/
│   ├── Status Reports/
│   ├── Change Requests/
│   └── Issue Log.xlsx
├── 05-Closing/
│   ├── Lessons Learned.docx
│   ├── Final Report.docx
│   └── Closeout Checklist.xlsx
├── 90-Reference/
│   ├── Templates/
│   ├── Standards/
│   └── Guidelines/
└── 91-Archive/
    └── Old Versions/
```

**Returns:**

```typescript
{
  programId: "PROG-001",
  rootFolderId: "1a2b3c4d5e6f7g8h9i0j",
  rootFolderPath: "PROG-001 - Digital Transformation",
  structure: {
    "00-Charter": "1b2c3d4e5f6g7h8i9j0k",
    "01-Initiating": "1c2d3e4f5g6h7i8j9k0l",
    "02-Planning": "1d2e3f4g5h6i7j8k9l0m",
    "02-Planning/Project Plans": "1e2f3g4h5i6j7k8l9m0n",
    "02-Planning/Technical Documents": "1f2g3h4i5j6k7l8m9n0o",
    "02-Planning/Test Plans": "1g2h3i4j5k6l7m8n9o0p",
    "03-Executing": "1h2i3j4k5l6m7n8o9p0q",
    "03-Executing/Deliverables": "1i2j3k4l5m6n7o8p9q0r",
    "04-Monitoring": "1j2k3l4m5n6o7p8q9r0s",
    "05-Closing": "1k2l3m4n5o6p7q8r9s0t",
    "90-Reference": "1l2m3n4o5p6q7r8s9t0u",
    "91-Archive": "1m2n3o4p5q6r7s8t9u0v"
  },
  createdFolders: 15,
  webViewLink: "https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j"
}
```

**Example:**

```typescript
// Create PMI-standard structure
const structure = await document_create_folder_structure({
  programId: "PROG-001",
  template: "pmi"
});

console.log(`Created ${structure.createdFolders} folders`);
console.log(`Root folder: ${structure.webViewLink}`);

// Get specific folder ID
const planningFolderId = structure.structure["02-Planning"];
```

**Errors:**
- `PROGRAM_NOT_FOUND`: Program ID does not exist
- `PARENT_FOLDER_NOT_FOUND`: Parent folder not found
- `STRUCTURE_ALREADY_EXISTS`: Folder structure already exists for program

**See Also:** [document_submit](#document_submit), [para_setup_structure](para.md#para_setup_structure)

---

### document_get_metadata

**Description**: Retrieve complete metadata for a document by document ID or file ID.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| docId | string | No | Document ID (e.g., DOC-001) |
| fileId | string | No | Google Drive file ID (alternative) |

**Note:** Provide either `docId` OR `fileId`, not both.

**Returns:**

```typescript
{
  docId: "DOC-001",
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  fileName: "Security-Assessment-Plan.docx",
  programId: "PROG-001",
  documentType: "plan",
  phase: "planning",
  category: "technical",
  status: "approved",
  version: "2.1",
  owner: "pm@example.com",
  reviewers: ["security@example.com", "qa@example.com"],
  approver: "cto@example.com",
  keywords: ["security", "assessment", "methodology"],
  tags: ["critical", "Q1"],
  deliverableId: "D-03",
  createdDate: "2026-01-05T10:30:00Z",
  lastModified: "2026-01-20T14:15:00Z",
  lastReviewed: "2026-01-18T16:00:00Z",
  webViewLink: "https://drive.google.com/file/d/...",
  folderPath: "PROG-001/02-Planning/Technical Documents"
}
```

**Example:**

```typescript
// Get metadata by document ID
const doc = await document_get_metadata({
  docId: "DOC-001"
});

// Get metadata by file ID
const docByFile = await document_get_metadata({
  fileId: "1a2b3c4d5e6f7g8h9i0j"
});

console.log(`Document: ${doc.fileName}`);
console.log(`Status: ${doc.status}`);
console.log(`Version: ${doc.version}`);
```

**Errors:**
- `DOCUMENT_NOT_FOUND`: Document ID not found
- `FILE_NOT_FOUND`: File ID not found
- `INVALID_PARAMETERS`: Both docId and fileId provided

**See Also:** [document_update_metadata](#document_update_metadata), [document_search](#document_search)

---

### document_update_metadata

**Description**: Update metadata fields for a document including status, owner, version, and tags.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| docId | string | Yes | Document ID |
| updates | object | Yes | Fields to update |

**Updatable Fields:**
```typescript
updates: {
  status?: "draft" | "review" | "approved" | "obsolete",
  version?: string,
  owner?: string,  // Email
  reviewers?: string[],  // Emails
  approver?: string,  // Email
  keywords?: string[],
  tags?: string[],
  deliverableId?: string,
  notes?: string
}
```

**Returns:**

```typescript
{
  docId: "DOC-001",
  updated: true,
  changes: {
    status: { old: "review", new: "approved" },
    version: { old: "2.0", new: "2.1" },
    approver: { old: null, new: "cto@example.com" }
  },
  metadata: {
    // Full updated metadata
  }
}
```

**Example:**

```typescript
// Approve document
await document_update_metadata({
  docId: "DOC-001",
  updates: {
    status: "approved",
    version: "2.1",
    approver: "cto@example.com"
  }
});

// Update tags and keywords
await document_update_metadata({
  docId: "DOC-002",
  updates: {
    tags: ["Q1", "critical", "security"],
    keywords: ["assessment", "security", "methodology"]
  }
});

// Change owner
await document_update_metadata({
  docId: "DOC-003",
  updates: {
    owner: "new-pm@example.com",
    notes: "Ownership transferred due to role change"
  }
});
```

**Errors:**
- `DOCUMENT_NOT_FOUND`: Document ID not found
- `INVALID_STATUS`: Status value invalid
- `INVALID_EMAIL`: Email format invalid

**See Also:** [document_get_metadata](#document_get_metadata)

---

### document_search

**Description**: Search documents using advanced criteria including full-text search, metadata filters, and relevance ranking.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| query | string | No | Full-text search query |
| programId | string | No | Filter by program ID |
| documentType | array | No | Filter by document types |
| status | array | No | Filter by status (draft/review/approved/obsolete) |
| phase | array | No | Filter by project phase |
| tags | array | No | Filter by tags (matches any) |
| owner | array | No | Filter by owner email |
| deliverableId | string | No | Filter by deliverable ID |
| limit | number | No | Max results (default: 50, max: 200) |
| offset | number | No | Pagination offset (default: 0) |

**Returns:**

```typescript
{
  results: [
    {
      docId: "DOC-001",
      fileId: "1a2b3c4d5e6f7g8h9i0j",
      fileName: "Security-Assessment-Plan.docx",
      programId: "PROG-001",
      documentType: "plan",
      status: "approved",
      phase: "planning",
      owner: "pm@example.com",
      relevanceScore: 0.95,
      matchedFields: ["title", "content", "keywords"],
      snippet: "...security assessment methodology with comprehensive scope definition...",
      webViewLink: "https://drive.google.com/file/d/...",
      lastModified: "2026-01-20T14:15:00Z"
    }
  ],
  total: 42,
  returned: 20,
  offset: 0,
  hasMore: true
}
```

**Relevance Score:**
- **0.9-1.0**: Excellent match
- **0.7-0.89**: Good match
- **0.5-0.69**: Moderate match
- **0-0.49**: Weak match

**Example:**

```typescript
// Full-text search
const results = await document_search({
  query: "security assessment methodology",
  programId: "PROG-001",
  limit: 20
});

// Filter by document type and status
const approvedPlans = await document_search({
  programId: "PROG-001",
  documentType: ["plan", "specification"],
  status: ["approved"]
});

// Find documents by tags
const critical = await document_search({
  tags: ["critical", "Q1"],
  phase: ["planning", "executing"]
});

// Paginated search
const page1 = await document_search({
  query: "security",
  limit: 50,
  offset: 0
});

const page2 = await document_search({
  query: "security",
  limit: 50,
  offset: 50
});
```

**Errors:**
- `INVALID_LIMIT`: Limit exceeds maximum
- `PROGRAM_NOT_FOUND`: Program ID does not exist

**See Also:** [document_find_similar](#document_find_similar), [drive_search_content](google-workspace.md#drive_search_content)

---

### document_create_from_template

**Description**: Create a new document from a registered template with variable substitution.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| templateId | string | Yes | Template ID (e.g., TMPL-001) |
| targetFolderId | string | Yes | Destination folder ID in Drive |
| fileName | string | Yes | Name for new document |
| variables | object | No | Variables to replace in template |

**Variable Substitution:**
Variables in template: `{{programName}}`, `{{date}}`, `{{owner}}`

**Returns:**

```typescript
{
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  fileName: "PROG-001-Charter.docx",
  templateId: "TMPL-001",
  templateName: "Program Charter Template",
  webViewLink: "https://drive.google.com/file/d/...",
  variablesApplied: {
    "programName": "Digital Transformation",
    "date": "2026-01-05",
    "owner": "pm@example.com",
    "sponsor": "ceo@example.com"
  }
}
```

**Example:**

```typescript
// Create document from template
const doc = await document_create_from_template({
  templateId: "TMPL-001",
  targetFolderId: "1b2c3d4e5f6g7h8i9j0k",
  fileName: "PROG-001-Charter.docx",
  variables: {
    programName: "Digital Transformation",
    date: "2026-01-05",
    owner: "pm@example.com",
    sponsor: "ceo@example.com",
    objective: "Modernize legacy systems"
  }
});

console.log(`Created: ${doc.webViewLink}`);
```

**Errors:**
- `TEMPLATE_NOT_FOUND`: Template ID not found
- `FOLDER_NOT_FOUND`: Target folder not found
- `MISSING_VARIABLES`: Required template variables not provided

**See Also:** [document_list_templates](#document_list_templates)

---

### document_list_templates

**Description**: List available document templates with filtering by type and category.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| documentType | string | No | Filter by document type |
| category | string | No | Filter by category (technical/management/administrative) |

**Returns:**

```typescript
{
  templates: [
    {
      templateId: "TMPL-001",
      name: "Program Charter Template",
      description: "Standard program charter following PMI guidelines",
      documentType: "charter",
      category: "management",
      fileId: "1a2b3c4d5e6f7g8h9i0j",
      variables: [
        { name: "programName", required: true, description: "Program name" },
        { name: "sponsor", required: true, description: "Executive sponsor" },
        { name: "objective", required: true, description: "Program objective" }
      ],
      webViewLink: "https://drive.google.com/file/d/..."
    },
    {
      templateId: "TMPL-002",
      name: "Test Plan Template",
      description: "Comprehensive test plan template",
      documentType: "plan",
      category: "technical",
      fileId: "1b2c3d4e5f6g7h8i9j0k",
      variables: [
        { name: "projectName", required: true },
        { name: "testLead", required: true }
      ],
      webViewLink: "https://drive.google.com/file/d/..."
    }
  ],
  total: 15
}
```

**Example:**

```typescript
// List all templates
const all = await document_list_templates();

// List charter templates
const charters = await document_list_templates({
  documentType: "charter"
});

// List technical templates
const technical = await document_list_templates({
  category: "technical"
});
```

**See Also:** [document_create_from_template](#document_create_from_template)

---

### document_create_version

**Description**: Create a new version record for a document with comments describing changes.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| docId | string | Yes | Document ID |
| version | string | Yes | Version number (e.g., 2.0, 1.1) |
| comment | string | Yes | Version comment describing changes |
| major | boolean | No | Whether major version change (default: false) |

**Version Numbering:**
- **Major version (X.0)**: Significant changes, major=true
- **Minor version (X.Y)**: Incremental changes, major=false

**Returns:**

```typescript
{
  versionId: "VER-001",
  docId: "DOC-001",
  version: "2.1",
  major: false,
  previousVersion: "2.0",
  comment: "Updated security methodology section based on review feedback",
  createdBy: "pm@example.com",
  createdDate: "2026-01-20T14:15:00Z",
  fileSnapshot: {
    fileId: "1a2b3c4d5e6f7g8h9i0j",
    fileName: "Security-Assessment-Plan.docx",
    size: 1048576,
    modifiedDate: "2026-01-20T14:10:00Z"
  }
}
```

**Example:**

```typescript
// Create minor version
await document_create_version({
  docId: "DOC-001",
  version: "2.1",
  comment: "Updated methodology section based on review feedback",
  major: false
});

// Create major version
await document_create_version({
  docId: "DOC-001",
  version: "3.0",
  comment: "Complete rewrite with new framework",
  major: true
});
```

**Errors:**
- `DOCUMENT_NOT_FOUND`: Document ID not found
- `INVALID_VERSION`: Version format invalid
- `VERSION_EXISTS`: Version number already exists

**See Also:** [document_get_version_history](#document_get_version_history)

---

### document_get_version_history

**Description**: Get version history for a document showing all versions and changes.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| docId | string | Yes | Document ID |

**Returns:**

```typescript
{
  docId: "DOC-001",
  currentVersion: "2.1",
  versions: [
    {
      versionId: "VER-003",
      version: "2.1",
      major: false,
      comment: "Updated methodology section based on review feedback",
      createdBy: "pm@example.com",
      createdDate: "2026-01-20T14:15:00Z"
    },
    {
      versionId: "VER-002",
      version: "2.0",
      major: true,
      comment: "Approved version for implementation",
      createdBy: "pm@example.com",
      createdDate: "2026-01-15T10:30:00Z"
    },
    {
      versionId: "VER-001",
      version: "1.0",
      major: true,
      comment: "Initial version",
      createdBy: "pm@example.com",
      createdDate: "2026-01-05T10:00:00Z"
    }
  ],
  totalVersions: 3
}
```

**Example:**

```typescript
const history = await document_get_version_history({
  docId: "DOC-001"
});

console.log(`Current version: ${history.currentVersion}`);
console.log(`Total versions: ${history.totalVersions}`);

// List all versions
history.versions.forEach(v => {
  console.log(`v${v.version} (${v.createdDate}): ${v.comment}`);
});
```

**Errors:**
- `DOCUMENT_NOT_FOUND`: Document ID not found

**See Also:** [document_create_version](#document_create_version)

---

### document_get_statistics

**Description**: Get document statistics including counts by type, status, phase, and owner.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| programId | string | No | Filter by program ID (default: all programs) |

**Returns:**

```typescript
{
  programId: "PROG-001",  // null if all programs
  totalDocuments: 245,
  byType: {
    charter: 2,
    plan: 28,
    specification: 35,
    design: 18,
    report: 42,
    procedure: 15,
    presentation: 22,
    meeting_notes: 38,
    correspondence: 25,
    contract: 8,
    other: 12
  },
  byStatus: {
    draft: 45,
    review: 28,
    approved: 152,
    obsolete: 20
  },
  byPhase: {
    initiating: 15,
    planning: 68,
    executing: 95,
    monitoring: 52,
    closing: 15
  },
  byOwner: {
    "pm@example.com": 85,
    "tech-lead@example.com": 62,
    "security@example.com": 38,
    // ... other owners
  },
  recentActivity: {
    documentsCreatedLast30Days: 42,
    documentsModifiedLast30Days: 128,
    averageDocsPerWeek: 12
  }
}
```

**Example:**

```typescript
// Get statistics for specific program
const stats = await document_get_statistics({
  programId: "PROG-001"
});

console.log(`Total documents: ${stats.totalDocuments}`);
console.log(`Approved: ${stats.byStatus.approved}`);
console.log(`In planning phase: ${stats.byPhase.planning}`);

// Get statistics across all programs
const allStats = await document_get_statistics();
```

**See Also:** [document_search](#document_search)

---

### document_find_similar

**Description**: Find documents similar to a given document using content analysis and metadata matching.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| docId | string | Yes | Reference document ID |
| limit | number | No | Max similar documents (default: 5, max: 20) |

**Similarity Algorithm Considers:**
- Content similarity (keywords, topics)
- Document type and category
- Project phase
- Metadata overlap (tags, keywords)

**Returns:**

```typescript
{
  referenceDoc: {
    docId: "DOC-001",
    fileName: "Security-Assessment-Plan.docx",
    documentType: "plan"
  },
  similarDocuments: [
    {
      docId: "DOC-015",
      fileId: "1b2c3d4e5f6g7h8i9j0k",
      fileName: "Penetration-Test-Plan.docx",
      documentType: "plan",
      similarityScore: 0.87,
      matchedKeywords: ["security", "assessment", "methodology", "scope"],
      reason: "Similar security planning document with overlapping methodology",
      webViewLink: "https://drive.google.com/file/d/..."
    },
    {
      docId: "DOC-023",
      fileId: "1c2d3e4f5g6h7i8j9k0l",
      fileName: "Security-Assessment-Report.docx",
      documentType: "report",
      similarityScore: 0.79,
      matchedKeywords: ["security", "assessment", "findings"],
      reason: "Related security assessment report from same program",
      webViewLink: "https://drive.google.com/file/d/..."
    }
  ],
  total: 5
}
```

**Similarity Score:**
- **0.8-1.0**: Very similar
- **0.6-0.79**: Moderately similar
- **0.4-0.59**: Somewhat similar
- **0-0.39**: Weakly similar

**Example:**

```typescript
// Find similar documents
const similar = await document_find_similar({
  docId: "DOC-001",
  limit: 10
});

console.log(`Found ${similar.total} similar documents`);

similar.similarDocuments.forEach(doc => {
  console.log(`${doc.fileName} (${doc.similarityScore * 100}% similar)`);
  console.log(`  Reason: ${doc.reason}`);
});
```

**Errors:**
- `DOCUMENT_NOT_FOUND`: Reference document not found

**See Also:** [document_search](#document_search), [document_categorize](#document_categorize)

---

## Document Organization Best Practices

### Folder Structure
1. **Use PMI standards**: Create consistent folder structures across programs
2. **Number folders**: Use numeric prefixes (00-, 01-, 02-) for sorting
3. **Limit depth**: Keep folder hierarchy to 3-4 levels maximum
4. **Archive regularly**: Move old versions to archive folders

### Document Submission
1. **Submit early**: Submit documents as soon as they're created
2. **Trust AI routing**: Let AI determine folder locations (95%+ accuracy)
3. **Review categorization**: Check low-confidence categorizations
4. **Link to deliverables**: Associate documents with deliverables

### Metadata Management
1. **Update status**: Keep document status current (draft/review/approved)
2. **Version consistently**: Use semantic versioning (major.minor)
3. **Tag appropriately**: Use consistent tags across documents
4. **Assign ownership**: Every document has a clear owner

### Search and Discovery
1. **Use keywords**: Add relevant keywords for better search
2. **Leverage similarity**: Find related documents to discover context
3. **Filter effectively**: Combine multiple filters for precise results
4. **Monitor statistics**: Track document metrics by program

---

## Related Documentation

- [Google Workspace Tools](google-workspace.md) - Drive integration
- [PARA Organization Tools](para.md) - Alternative organization method
- [Program Management Tools](program.md) - Link documents to programs
- [Deliverable Tracking Tools](deliverables.md) - Link documents to deliverables

---

**Next:** [Deliverable Tracking Tools](deliverables.md) →
