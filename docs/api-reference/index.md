# API Reference

Complete reference for all 115 tools in the Google Workspace MCP server.

**Last Updated:** 2026-01-05
**Version:** 1.0.0

---

## Overview

This MCP server provides 115 tools across 7 integrated domains for Google Workspace automation, project management, and intelligent document organization.

### Tool Categories

| Domain | Tools | Description |
|--------|-------|-------------|
| [Google Workspace](google-workspace.md) | 41 | Gmail, Drive, Sheets, Docs, Calendar, Tasks |
| [PARA Organization](para.md) | 8 | AI-powered file categorization (Projects, Areas, Resources, Archives) |
| [PMO](pmo.md) | 7 | Project Management Office tracking and proposal analysis |
| [Program Management](program.md) | 16 | Charter, WBS, milestones, issues, decisions |
| [Document Organization](documents.md) | 12 | LLM-powered routing and folder structures |
| [Deliverable Tracking](deliverables.md) | 28 | Complete lifecycle management with review workflows |
| [Workflow Automation](workflows.md) | 10 | Event-driven and scheduled automation |

**Total: 115 tools**

---

## Quick Navigation

### By Function

**Content Creation & Management**
- [Gmail Tools](google-workspace.md#gmail-tools) - Email automation
- [Drive Tools](google-workspace.md#drive-tools) - File management
- [Sheets Tools](google-workspace.md#sheets-tools) - Spreadsheet operations
- [Docs Tools](google-workspace.md#docs-tools) - Document creation
- [Calendar Tools](google-workspace.md#calendar-tools) - Event scheduling
- [Tasks Tools](google-workspace.md#tasks-tools) - Task management

**Organization & Categorization**
- [PARA Tools](para.md) - Intelligent file organization
- [Document Tools](documents.md) - Document routing and metadata

**Project Management**
- [Program Tools](program.md) - Program governance
- [Deliverable Tools](deliverables.md) - Deliverable tracking
- [PMO Tools](pmo.md) - PMO operations

**Automation**
- [Workflow Tools](workflows.md) - Automated workflows

---

## Authentication

All tools require Google OAuth 2.0 authentication with appropriate scopes.

### Required Scopes

```
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/drive
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/documents
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/tasks
```

See [Authentication Guide](../getting-started/authentication.md) for setup instructions.

---

## Tool Naming Convention

Tools follow a consistent naming pattern:

```
{domain}_{action}[_{object}]
```

**Examples:**
- `gmail_send` - Send an email
- `drive_create_folder` - Create a folder
- `deliverable_submit_review` - Submit a review for a deliverable

---

## Common Parameters

### Date Formats

All date parameters accept ISO 8601 format:

```
YYYY-MM-DD           # Date only: 2026-01-05
YYYY-MM-DDTHH:mm:ss  # Date and time: 2026-01-05T14:30:00
```

### Email Addresses

Email parameters accept standard email format:
```
user@example.com
```

Multiple emails (where supported) are comma-separated:
```
user1@example.com,user2@example.com
```

### Google Drive IDs

Files and folders in Google Drive are identified by unique IDs:
```
1a2b3c4d5e6f7g8h9i0j  # File ID
0B1a2b3c4d5e6f7g8h9i  # Folder ID
```

### Spreadsheet Ranges

Spreadsheet ranges use A1 notation:
```
Sheet1!A1:D10        # Range on Sheet1
A1:D10               # Range on first sheet
Sheet1!A:A           # Entire column A on Sheet1
```

---

## Error Handling

All tools follow consistent error handling patterns.

### Common Error Types

**Authentication Errors**
```json
{
  "error": "AUTHENTICATION_FAILED",
  "message": "OAuth token expired or invalid",
  "code": 401
}
```

**Permission Errors**
```json
{
  "error": "PERMISSION_DENIED",
  "message": "Insufficient permissions to access resource",
  "code": 403
}
```

**Not Found Errors**
```json
{
  "error": "NOT_FOUND",
  "message": "Resource not found: {resourceId}",
  "code": 404
}
```

**Validation Errors**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid parameter: {parameterName}",
  "code": 400
}
```

**API Quota Errors**
```json
{
  "error": "QUOTA_EXCEEDED",
  "message": "Google API quota exceeded",
  "code": 429
}
```

---

## Rate Limits

### Google API Quotas

The server respects Google Workspace API quotas:

| API | Quota | Limit |
|-----|-------|-------|
| Gmail | Queries per day | 1,000,000,000 |
| Gmail | Queries per 100 seconds per user | 250 |
| Drive | Queries per day | 1,000,000,000 |
| Drive | Queries per 100 seconds per user | 1,000 |
| Sheets | Read requests per minute per user | 60 |
| Sheets | Write requests per minute per user | 60 |

See [Google API quotas documentation](https://developers.google.com/sheets/api/limits) for complete details.

### LLM API Limits

Tools using LLM analysis (PARA, PMO, Documents) consume LLM API credits.

**Default Limits:**
- Cost limit per day: $10 (configurable via `LLM_COST_LIMIT_PER_DAY`)
- Automatic provider fallback on quota exhaustion

See [LLM Configuration Guide](../guides/llm-configuration.md) for cost optimization.

---

## Response Formats

### Success Responses

Successful tool calls return structured data:

```typescript
{
  success: true,
  data: {
    // Tool-specific response data
  }
}
```

### List Responses

Tools returning lists include pagination metadata where applicable:

```typescript
{
  items: [...],
  total: 42,
  page: 1,
  pageSize: 20,
  hasMore: true
}
```

---

## Tool Categories Detail

### Core Google Workspace (41 tools)

Direct integrations with Google Workspace APIs providing full CRUD operations:

- **Gmail (10 tools)**: Send, search, draft, label, archive emails and attachments
- **Drive (10 tools)**: Upload, download, share, organize files and folders
- **Sheets (8 tools)**: Create, read, write, format spreadsheets
- **Docs (4 tools)**: Create, read, update documents
- **Calendar (5 tools)**: Manage events, find available time slots
- **Tasks (4 tools)**: Create, list, update tasks

### Advanced Modules (74 tools)

Built on top of Google Workspace APIs with intelligent features:

- **PARA (8 tools)**: AI-powered file organization using the PARA method
- **PMO (7 tools)**: Project management tracking with proposal analysis
- **Program Management (16 tools)**: Enterprise program governance
- **Documents (12 tools)**: Intelligent document routing and metadata
- **Deliverables (28 tools)**: Complete deliverable lifecycle management
- **Workflows (10 tools)**: Event-driven and scheduled automation

---

## Getting Started

1. **Authentication**: Complete [OAuth setup](../getting-started/authentication.md)
2. **First Tool Call**: Try [gmail_send](google-workspace.md#gmail_send)
3. **Explore Workflows**: See [Workflow Examples](../guides/workflows.md)
4. **Advanced Features**: Explore [LLM-powered tools](../guides/llm-configuration.md)

---

## Domain Documentation

### [Google Workspace Tools](google-workspace.md)
Complete reference for Gmail, Drive, Sheets, Docs, Calendar, and Tasks tools.

### [PARA Organization Tools](para.md)
AI-powered file categorization using the PARA method (Projects, Areas, Resources, Archives).

### [PMO Tools](pmo.md)
Project Management Office tools for tracking deliverables, risks, and analyzing proposals.

### [Program Management Tools](program.md)
Enterprise program management with charter, WBS, milestones, issues, and decisions.

### [Document Organization Tools](documents.md)
LLM-powered document routing, metadata management, and folder structures.

### [Deliverable Tracking Tools](deliverables.md)
Complete deliverable lifecycle from creation through submission, review, and approval.

### [Workflow Automation Tools](workflows.md)
Event-driven and scheduled workflows with role-based access control.

---

## Examples

### Example 1: Send Email with Attachment

```typescript
// Upload file to Drive first
const uploadResult = await drive_upload_file({
  name: "report.pdf",
  content: base64Content,
  mimeType: "application/pdf"
});

// Send email with attachment reference
const emailResult = await gmail_send({
  to: "client@example.com",
  subject: "Monthly Report",
  body: "Please find attached the monthly report.",
  attachments: [{
    driveFileId: uploadResult.id
  }]
});
```

### Example 2: Categorize Files with PARA

```typescript
// Setup PARA folder structure
const structure = await para_setup_structure({
  includeSubfolders: true
});

// Categorize a batch of files
const results = await para_batch_categorize({
  folderId: "1a2b3c4d5e6f7g8h9i0j",
  maxFiles: 50
});

// Search for active projects
const projects = await para_search({
  category: "PROJECT",
  actionability: "high"
});
```

### Example 3: Create and Track Deliverable

```typescript
// Create deliverable
const deliverable = await deliverable_create({
  name: "Security Assessment Report",
  description: "Comprehensive security assessment",
  type: "report",
  programId: "PROG-001",
  owner: "pm@example.com",
  dueDate: "2026-02-15",
  priority: "high",
  acceptanceCriteria: [
    "All vulnerabilities documented",
    "Remediation plan included",
    "Executive summary provided"
  ]
});

// Submit for review
const submission = await deliverable_submit({
  deliverableId: deliverable.id,
  fileIds: ["1a2b3c4d5e6f7g8h9i0j"],
  submitterNotes: "Report complete, ready for review"
});

// Assign reviewer
await deliverable_assign_reviewer({
  deliverableId: deliverable.id,
  reviewerId: "security-lead@example.com",
  dueDate: "2026-02-18"
});
```

---

## Support

**Related Documentation:**
- [Getting Started](../getting-started/quick-start.md)
- [Workflow Examples](../guides/workflows.md)
- [LLM Configuration](../guides/llm-configuration.md)
- [Troubleshooting](../reference/troubleshooting.md)

---

**Next:** Start with [Google Workspace Tools](google-workspace.md) →
