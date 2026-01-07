# Google Workspace Tools

Complete API reference for 41 Google Workspace integration tools.

**Last Updated:** 2026-01-05

---

## Overview

Direct integrations with Google Workspace APIs providing full CRUD operations across 6 services:

- **Gmail (10 tools)**: Email management, drafts, labels, and attachments
- **Drive (10 tools)**: File and folder management, sharing, search
- **Sheets (8 tools)**: Spreadsheet creation and data operations
- **Docs (4 tools)**: Document creation and editing
- **Calendar (5 tools)**: Event management and scheduling
- **Tasks (4 tools)**: Task management across lists

**Total: 41 tools**

---

## Gmail Tools

### gmail_send

**Description**: Send an email via Gmail with optional file attachments from Google Drive.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| to | string | Yes | Recipient email address |
| subject | string | Yes | Email subject line |
| body | string | Yes | Email body (plain text or HTML) |
| cc | string | No | CC recipients (comma-separated) |
| bcc | string | No | BCC recipients (comma-separated) |
| attachments | array | No | File attachments (max 25MB total per email) |

**Attachments Format:**
```typescript
attachments: [
  {
    driveFileId: "1a2b3c4d5e6f7g8h9i0j", // Google Drive file ID
    filename: "report.pdf"                // Optional: override filename
  }
]
```

**Returns:**

```typescript
{
  success: true,
  messageId: "18d1234567890abcd",
  attachmentCount: 2
}
```

**Example:**

```typescript
const result = await gmail_send({
  to: "client@example.com",
  subject: "Quarterly Report",
  body: "Please find attached the Q1 2026 report.",
  cc: "manager@example.com",
  attachments: [{
    driveFileId: "1a2b3c4d5e6f7g8h9i0j"
  }]
});
```

**Errors:**
- `INVALID_EMAIL`: Invalid email address format
- `ATTACHMENT_TOO_LARGE`: Attachments exceed 25MB limit
- `FILE_NOT_FOUND`: Drive file not found or no access

**See Also:** [gmail_create_draft](#gmail_create_draft), [gmail_save_attachment_to_drive](#gmail_save_attachment_to_drive)

---

### gmail_search

**Description**: Search Gmail messages using Gmail query syntax.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| query | string | Yes | Gmail search query |
| maxResults | number | No | Maximum results to return (default: 10, max: 100) |

**Gmail Query Syntax Examples:**
```
from:user@example.com              # From specific sender
subject:proposal                   # Subject contains "proposal"
after:2026/01/01                   # After date
has:attachment                     # Has attachments
is:unread                          # Unread messages
from:user@example.com subject:RFP  # Combined criteria
```

**Returns:**

```typescript
{
  messages: [
    {
      id: "18d1234567890abcd",
      threadId: "18d1234567890abcd",
      snippet: "Message preview text...",
      from: "sender@example.com",
      subject: "RFP Response",
      date: "2026-01-05T10:30:00Z",
      labels: ["INBOX", "UNREAD"]
    }
  ],
  resultSizeEstimate: 42
}
```

**Example:**

```typescript
// Search for unread proposals from last week
const results = await gmail_search({
  query: "from:procurement@example.com subject:RFP is:unread after:2025/12/29",
  maxResults: 20
});
```

**Errors:**
- `INVALID_QUERY`: Malformed Gmail query syntax

**See Also:** [gmail_get_message](#gmail_get_message), [gmail_get_attachments](#gmail_get_attachments)

---

### gmail_get_message

**Description**: Get full message details including headers, body, and attachments metadata.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| messageId | string | Yes | Gmail message ID |

**Returns:**

```typescript
{
  id: "18d1234567890abcd",
  threadId: "18d1234567890abcd",
  labelIds: ["INBOX", "UNREAD"],
  snippet: "Message preview...",
  headers: {
    from: "sender@example.com",
    to: "recipient@example.com",
    subject: "Project Update",
    date: "2026-01-05T10:30:00Z"
  },
  body: "Full message body...",
  attachments: [
    {
      attachmentId: "ANGjdJ...",
      filename: "document.pdf",
      mimeType: "application/pdf",
      size: 1048576
    }
  ]
}
```

**Example:**

```typescript
const message = await gmail_get_message({
  messageId: "18d1234567890abcd"
});

console.log(`From: ${message.headers.from}`);
console.log(`Attachments: ${message.attachments.length}`);
```

**Errors:**
- `MESSAGE_NOT_FOUND`: Message ID does not exist
- `PERMISSION_DENIED`: No access to message

**See Also:** [gmail_search](#gmail_search), [gmail_get_attachments](#gmail_get_attachments)

---

### gmail_create_draft

**Description**: Create a draft email with optional attachments from Google Drive.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| to | string | Yes | Recipient email address |
| subject | string | Yes | Email subject line |
| body | string | Yes | Email body |
| attachments | array | No | File attachments from Drive |

**Returns:**

```typescript
{
  id: "r-1234567890abcdef",
  message: {
    id: "18d1234567890abcd",
    threadId: "18d1234567890abcd",
    labelIds: ["DRAFT"]
  }
}
```

**Example:**

```typescript
const draft = await gmail_create_draft({
  to: "client@example.com",
  subject: "Draft: Proposal Review",
  body: "Please review the attached proposal.",
  attachments: [{
    driveFileId: "1a2b3c4d5e6f7g8h9i0j"
  }]
});
```

**Errors:**
- `INVALID_EMAIL`: Invalid email address format
- `FILE_NOT_FOUND`: Drive file not found

**See Also:** [gmail_send](#gmail_send)

---

### gmail_list_labels

**Description**: List all Gmail labels including system and custom labels.

**Parameters:** None

**Returns:**

```typescript
{
  labels: [
    {
      id: "INBOX",
      name: "INBOX",
      type: "system",
      messagesTotal: 42,
      messagesUnread: 5
    },
    {
      id: "Label_1234",
      name: "Projects/Alpha",
      type: "user",
      messagesTotal: 15,
      messagesUnread: 2
    }
  ]
}
```

**Example:**

```typescript
const labels = await gmail_list_labels();
const projectLabels = labels.labels.filter(l =>
  l.name.startsWith("Projects/")
);
```

**See Also:** [gmail_add_label](#gmail_add_label)

---

### gmail_add_label

**Description**: Add a label to an email message.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| messageId | string | Yes | Gmail message ID |
| labelId | string | Yes | Label ID to add |

**Returns:**

```typescript
{
  id: "18d1234567890abcd",
  labelIds: ["INBOX", "Label_1234", "UNREAD"]
}
```

**Example:**

```typescript
// Add "Important" label to message
const result = await gmail_add_label({
  messageId: "18d1234567890abcd",
  labelId: "IMPORTANT"
});
```

**Errors:**
- `MESSAGE_NOT_FOUND`: Message ID does not exist
- `LABEL_NOT_FOUND`: Label ID does not exist

**See Also:** [gmail_list_labels](#gmail_list_labels)

---

### gmail_mark_read

**Description**: Mark an email message as read.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| messageId | string | Yes | Gmail message ID |

**Returns:**

```typescript
{
  id: "18d1234567890abcd",
  labelIds: ["INBOX"] // UNREAD label removed
}
```

**Example:**

```typescript
await gmail_mark_read({
  messageId: "18d1234567890abcd"
});
```

**Errors:**
- `MESSAGE_NOT_FOUND`: Message ID does not exist

**See Also:** [gmail_archive](#gmail_archive)

---

### gmail_archive

**Description**: Archive an email message (removes INBOX label).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| messageId | string | Yes | Gmail message ID |

**Returns:**

```typescript
{
  id: "18d1234567890abcd",
  labelIds: ["UNREAD"] // INBOX label removed
}
```

**Example:**

```typescript
await gmail_archive({
  messageId: "18d1234567890abcd"
});
```

**Errors:**
- `MESSAGE_NOT_FOUND`: Message ID does not exist

**See Also:** [gmail_mark_read](#gmail_mark_read)

---

### gmail_get_attachments

**Description**: Get attachment metadata and content from an email message.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| messageId | string | Yes | Gmail message ID |
| includeContent | boolean | No | Include attachment content as base64 (default: true) |

**Returns:**

```typescript
{
  attachments: [
    {
      attachmentId: "ANGjdJ...",
      filename: "report.pdf",
      mimeType: "application/pdf",
      size: 1048576,
      data: "JVBERi0xLjQKJeLjz9..." // base64 if includeContent: true
    }
  ]
}
```

**Example:**

```typescript
// Get attachment metadata only
const attachments = await gmail_get_attachments({
  messageId: "18d1234567890abcd",
  includeContent: false
});

// Get full attachment content
const fullAttachments = await gmail_get_attachments({
  messageId: "18d1234567890abcd",
  includeContent: true
});
```

**Errors:**
- `MESSAGE_NOT_FOUND`: Message ID does not exist
- `NO_ATTACHMENTS`: Message has no attachments

**See Also:** [gmail_save_attachment_to_drive](#gmail_save_attachment_to_drive)

---

### gmail_save_attachment_to_drive

**Description**: Extract an email attachment and save it directly to Google Drive.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| messageId | string | Yes | Email message ID |
| attachmentId | string | Yes | Attachment ID from the email |
| folderId | string | No | Drive folder ID (default: root) |
| newFilename | string | No | Override filename |

**Returns:**

```typescript
{
  id: "1a2b3c4d5e6f7g8h9i0j",
  name: "report.pdf",
  mimeType: "application/pdf",
  size: 1048576,
  webViewLink: "https://drive.google.com/file/d/...",
  createdTime: "2026-01-05T10:30:00Z"
}
```

**Example:**

```typescript
// Save attachment to specific folder
const file = await gmail_save_attachment_to_drive({
  messageId: "18d1234567890abcd",
  attachmentId: "ANGjdJ...",
  folderId: "1b2c3d4e5f6g7h8i9j0k",
  newFilename: "Q1-2026-Report.pdf"
});

console.log(`Saved to Drive: ${file.webViewLink}`);
```

**Errors:**
- `MESSAGE_NOT_FOUND`: Message ID does not exist
- `ATTACHMENT_NOT_FOUND`: Attachment ID not found in message
- `FOLDER_NOT_FOUND`: Drive folder not found

**See Also:** [gmail_get_attachments](#gmail_get_attachments), [drive_upload_file](#drive_upload_file)

---

## Drive Tools

### drive_list_files

**Description**: List files and folders in Google Drive with optional filtering.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| query | string | No | Drive search query |
| folderId | string | No | Parent folder ID to list |
| pageSize | number | No | Number of results (default: 100, max: 1000) |

**Drive Query Syntax:**
```
name contains 'report'                    # Name contains text
mimeType = 'application/pdf'              # PDF files only
'1a2b3c4d' in parents                     # Files in specific folder
trashed = false                           # Non-trashed files
modifiedTime > '2026-01-01T00:00:00'      # Modified after date
```

**Returns:**

```typescript
{
  files: [
    {
      id: "1a2b3c4d5e6f7g8h9i0j",
      name: "Q1 Report.pdf",
      mimeType: "application/pdf",
      size: 1048576,
      createdTime: "2026-01-05T10:30:00Z",
      modifiedTime: "2026-01-05T14:20:00Z",
      owners: ["owner@example.com"],
      webViewLink: "https://drive.google.com/file/d/...",
      parents: ["0B1a2b3c4d5e6f7g8h"]
    }
  ]
}
```

**Example:**

```typescript
// List PDFs in a folder
const files = await drive_list_files({
  folderId: "1a2b3c4d5e6f7g8h9i0j",
  query: "mimeType='application/pdf' and trashed=false",
  pageSize: 50
});
```

**See Also:** [drive_search_content](#drive_search_content)

---

### drive_create_folder

**Description**: Create a new folder in Google Drive.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | Yes | Folder name |
| parentId | string | No | Parent folder ID (default: root) |

**Returns:**

```typescript
{
  id: "1a2b3c4d5e6f7g8h9i0j",
  name: "Projects",
  mimeType: "application/vnd.google-apps.folder",
  createdTime: "2026-01-05T10:30:00Z",
  webViewLink: "https://drive.google.com/drive/folders/..."
}
```

**Example:**

```typescript
// Create nested folder structure
const parent = await drive_create_folder({
  name: "2026 Projects"
});

const child = await drive_create_folder({
  name: "Alpha Project",
  parentId: parent.id
});
```

**Errors:**
- `PARENT_NOT_FOUND`: Parent folder ID does not exist
- `DUPLICATE_NAME`: Folder with same name exists (creates anyway)

**See Also:** [drive_list_files](#drive_list_files)

---

### drive_upload_file

**Description**: Upload a file to Google Drive. Supports text and binary files via base64 encoding.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | Yes | File name |
| content | string | Yes | File content (text or base64-encoded) |
| mimeType | string | Yes | MIME type (e.g., 'application/pdf') |
| folderId | string | No | Parent folder ID (default: root) |
| encoding | string | No | 'base64' or 'text' (default: 'base64') |

**Common MIME Types:**
```
application/pdf                           # PDF
text/plain                                # Text file
image/png                                 # PNG image
image/jpeg                                # JPEG image
application/vnd.ms-excel                  # Excel
application/json                          # JSON
text/csv                                  # CSV
```

**Returns:**

```typescript
{
  id: "1a2b3c4d5e6f7g8h9i0j",
  name: "document.pdf",
  mimeType: "application/pdf",
  size: 1048576,
  webViewLink: "https://drive.google.com/file/d/...",
  createdTime: "2026-01-05T10:30:00Z"
}
```

**Example:**

```typescript
// Upload text file
const textFile = await drive_upload_file({
  name: "notes.txt",
  content: "Project notes...",
  mimeType: "text/plain",
  encoding: "text",
  folderId: "1a2b3c4d5e6f7g8h9i0j"
});

// Upload binary file (base64)
const pdfFile = await drive_upload_file({
  name: "report.pdf",
  content: "JVBERi0xLjQKJeLjz9...",
  mimeType: "application/pdf",
  encoding: "base64"
});
```

**Errors:**
- `FOLDER_NOT_FOUND`: Parent folder not found
- `INVALID_CONTENT`: Content encoding invalid

**See Also:** [drive_get_file](#drive_get_file), [gmail_save_attachment_to_drive](#gmail_save_attachment_to_drive)

---

### drive_get_file

**Description**: Get file metadata and optionally download file content.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fileId | string | Yes | Google Drive file ID |
| includeContent | boolean | No | Include file content as base64 (default: true) |

**Returns:**

```typescript
{
  id: "1a2b3c4d5e6f7g8h9i0j",
  name: "report.pdf",
  mimeType: "application/pdf",
  size: 1048576,
  createdTime: "2026-01-05T10:30:00Z",
  modifiedTime: "2026-01-05T14:20:00Z",
  owners: ["owner@example.com"],
  webViewLink: "https://drive.google.com/file/d/...",
  content: "JVBERi0xLjQKJeLjz9..." // base64 if includeContent: true
}
```

**Example:**

```typescript
// Get metadata only
const metadata = await drive_get_file({
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  includeContent: false
});

// Download file content
const fileWithContent = await drive_get_file({
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  includeContent: true
});
```

**Errors:**
- `FILE_NOT_FOUND`: File ID does not exist
- `PERMISSION_DENIED`: No access to file
- `FILE_TOO_LARGE`: File exceeds download limit (10MB)

**See Also:** [drive_upload_file](#drive_upload_file)

---

### drive_delete_file

**Description**: Delete a file or folder from Google Drive (moves to trash).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fileId | string | Yes | File or folder ID to delete |

**Returns:**

```typescript
{
  success: true,
  fileId: "1a2b3c4d5e6f7g8h9i0j"
}
```

**Example:**

```typescript
await drive_delete_file({
  fileId: "1a2b3c4d5e6f7g8h9i0j"
});
```

**Errors:**
- `FILE_NOT_FOUND`: File ID does not exist
- `PERMISSION_DENIED`: No permission to delete

**Note:** Files are moved to trash, not permanently deleted. Use Drive UI to permanently delete.

---

### drive_share_file

**Description**: Share a file with specific user and permissions.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fileId | string | Yes | File ID to share |
| email | string | Yes | Email address to share with |
| role | string | Yes | Permission role: 'reader', 'writer', or 'commenter' |
| sendNotification | boolean | No | Send email notification (default: true) |

**Roles:**
- `reader`: Can view and download
- `commenter`: Can view and comment (Docs, Sheets only)
- `writer`: Can edit

**Returns:**

```typescript
{
  id: "12345678901234567890",
  type: "user",
  emailAddress: "user@example.com",
  role: "writer",
  displayName: "John Doe"
}
```

**Example:**

```typescript
// Share with write access
const permission = await drive_share_file({
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  email: "colleague@example.com",
  role: "writer",
  sendNotification: true
});
```

**Errors:**
- `FILE_NOT_FOUND`: File ID does not exist
- `INVALID_EMAIL`: Email address invalid
- `PERMISSION_DENIED`: No permission to share

**See Also:** [drive_get_permissions](#drive_get_permissions)

---

### drive_get_permissions

**Description**: List all permissions for a file or folder.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fileId | string | Yes | File or folder ID |

**Returns:**

```typescript
{
  permissions: [
    {
      id: "12345678901234567890",
      type: "user",
      emailAddress: "user@example.com",
      role: "writer",
      displayName: "John Doe"
    },
    {
      id: "09876543210987654321",
      type: "user",
      emailAddress: "viewer@example.com",
      role: "reader",
      displayName: "Jane Smith"
    }
  ]
}
```

**Example:**

```typescript
const permissions = await drive_get_permissions({
  fileId: "1a2b3c4d5e6f7g8h9i0j"
});

const writers = permissions.permissions.filter(p => p.role === 'writer');
```

**Errors:**
- `FILE_NOT_FOUND`: File ID does not exist
- `PERMISSION_DENIED`: No permission to view permissions

**See Also:** [drive_share_file](#drive_share_file)

---

### drive_copy_file

**Description**: Create a copy of a file in Google Drive.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fileId | string | Yes | Source file ID to copy |
| name | string | Yes | Name for the copied file |
| folderId | string | No | Destination folder ID (default: same as source) |

**Returns:**

```typescript
{
  id: "1x2y3z4a5b6c7d8e9f0g",
  name: "Report (Copy).pdf",
  mimeType: "application/pdf",
  size: 1048576,
  createdTime: "2026-01-05T10:30:00Z",
  webViewLink: "https://drive.google.com/file/d/..."
}
```

**Example:**

```typescript
// Copy file to different folder
const copy = await drive_copy_file({
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  name: "Archive - Q1 Report.pdf",
  folderId: "1b2c3d4e5f6g7h8i9j0k"
});
```

**Errors:**
- `FILE_NOT_FOUND`: Source file not found
- `FOLDER_NOT_FOUND`: Destination folder not found
- `PERMISSION_DENIED`: No permission to copy file

**See Also:** [drive_move_file](#drive_move_file)

---

### drive_move_file

**Description**: Move a file to a different folder.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fileId | string | Yes | File ID to move |
| newParentId | string | Yes | New parent folder ID |

**Returns:**

```typescript
{
  id: "1a2b3c4d5e6f7g8h9i0j",
  name: "report.pdf",
  parents: ["1b2c3d4e5f6g7h8i9j0k"],
  modifiedTime: "2026-01-05T10:30:00Z"
}
```

**Example:**

```typescript
// Move file to archive folder
await drive_move_file({
  fileId: "1a2b3c4d5e6f7g8h9i0j",
  newParentId: "1x2y3z4a5b6c7d8e9f0g"
});
```

**Errors:**
- `FILE_NOT_FOUND`: File not found
- `FOLDER_NOT_FOUND`: Destination folder not found
- `PERMISSION_DENIED`: No permission to move file

**Note:** Files in Drive can only have one parent. Moving removes from current parent.

**See Also:** [drive_copy_file](#drive_copy_file)

---

### drive_search_content

**Description**: Full-text search of file contents in Google Drive.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| searchText | string | Yes | Text to search for in file contents |
| mimeType | string | No | Filter by MIME type |

**Returns:**

```typescript
{
  files: [
    {
      id: "1a2b3c4d5e6f7g8h9i0j",
      name: "proposal.docx",
      mimeType: "application/vnd.google-apps.document",
      snippet: "...contains the search text in context...",
      webViewLink: "https://drive.google.com/file/d/..."
    }
  ]
}
```

**Example:**

```typescript
// Search for "cybersecurity" in all documents
const results = await drive_search_content({
  searchText: "cybersecurity",
  mimeType: "application/vnd.google-apps.document"
});
```

**Errors:**
- `INVALID_QUERY`: Search text too short or invalid

**Note:** Only searches text-based files (Docs, Sheets, PDFs with text, etc.)

**See Also:** [drive_list_files](#drive_list_files)

---

## Sheets Tools

### sheets_create

**Description**: Create a new Google Sheets spreadsheet.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| title | string | Yes | Spreadsheet title |
| sheetNames | array of strings | No | Names for initial sheets (default: ["Sheet1"]) |

**Returns:**

```typescript
{
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  spreadsheetUrl: "https://docs.google.com/spreadsheets/d/...",
  sheets: [
    {
      sheetId: 0,
      title: "Sheet1",
      index: 0,
      gridProperties: {
        rowCount: 1000,
        columnCount: 26
      }
    }
  ]
}
```

**Example:**

```typescript
// Create spreadsheet with multiple sheets
const spreadsheet = await sheets_create({
  title: "Q1 2026 Sales Tracking",
  sheetNames: ["Overview", "January", "February", "March"]
});
```

**See Also:** [sheets_create_sheet](#sheets_create_sheet)

---

### sheets_read

**Description**: Read data from a spreadsheet range.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| spreadsheetId | string | Yes | Spreadsheet ID |
| range | string | Yes | A1 notation range (e.g., 'Sheet1!A1:D10') |

**Range Examples:**
```
Sheet1!A1:D10      # Specific range on Sheet1
A1:D10             # Range on first sheet
Sheet1!A:A         # Entire column A
Sheet1!1:1         # Entire row 1
Sheet1             # All data on Sheet1
```

**Returns:**

```typescript
{
  range: "Sheet1!A1:D10",
  majorDimension: "ROWS",
  values: [
    ["Name", "Email", "Status", "Score"],
    ["John Doe", "john@example.com", "Active", "95"],
    ["Jane Smith", "jane@example.com", "Pending", "87"]
  ]
}
```

**Example:**

```typescript
const data = await sheets_read({
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  range: "Sales!A1:F100"
});

// Process rows
data.values.forEach((row, index) => {
  if (index === 0) return; // Skip header
  console.log(`${row[0]}: ${row[2]}`);
});
```

**Errors:**
- `SPREADSHEET_NOT_FOUND`: Spreadsheet ID does not exist
- `INVALID_RANGE`: Range syntax invalid
- `SHEET_NOT_FOUND`: Sheet name does not exist

**See Also:** [sheets_write](#sheets_write), [sheets_append](#sheets_append)

---

### sheets_write

**Description**: Write data to a spreadsheet range, replacing existing content.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| spreadsheetId | string | Yes | Spreadsheet ID |
| range | string | Yes | A1 notation range |
| values | array | Yes | 2D array of values to write |

**Returns:**

```typescript
{
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  updatedRange: "Sheet1!A1:C3",
  updatedRows: 3,
  updatedColumns: 3,
  updatedCells: 9
}
```

**Example:**

```typescript
// Write table data
await sheets_write({
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  range: "Sheet1!A1:C3",
  values: [
    ["Name", "Email", "Status"],
    ["John Doe", "john@example.com", "Active"],
    ["Jane Smith", "jane@example.com", "Pending"]
  ]
});
```

**Errors:**
- `SPREADSHEET_NOT_FOUND`: Spreadsheet not found
- `INVALID_RANGE`: Range syntax invalid
- `PERMISSION_DENIED`: No write permission

**See Also:** [sheets_append](#sheets_append), [sheets_read](#sheets_read)

---

### sheets_append

**Description**: Append data to the end of a sheet.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| spreadsheetId | string | Yes | Spreadsheet ID |
| range | string | Yes | Sheet name or range (e.g., 'Sheet1') |
| values | array | Yes | 2D array of values to append |

**Returns:**

```typescript
{
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  tableRange: "Sheet1!A1:C100",
  updates: {
    updatedRange: "Sheet1!A101:C101",
    updatedRows: 1,
    updatedColumns: 3,
    updatedCells: 3
  }
}
```

**Example:**

```typescript
// Append new row to tracking sheet
await sheets_append({
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  range: "Tracking",
  values: [
    ["2026-01-05", "New Entry", "Active", "100"]
  ]
});
```

**Errors:**
- `SPREADSHEET_NOT_FOUND`: Spreadsheet not found
- `SHEET_NOT_FOUND`: Sheet name does not exist

**See Also:** [sheets_write](#sheets_write)

---

### sheets_format

**Description**: Apply formatting to a spreadsheet range.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| spreadsheetId | string | Yes | Spreadsheet ID |
| sheetId | number | Yes | Sheet ID (0 for first sheet) |
| startRow | number | Yes | Start row index (0-based) |
| endRow | number | Yes | End row index (exclusive) |
| startColumn | number | Yes | Start column index (0-based) |
| endColumn | number | Yes | End column index (exclusive) |
| bold | boolean | No | Make text bold |
| backgroundColor | object | No | Background color RGB (values 0-1) |

**Background Color Format:**
```typescript
{
  red: 0.9,
  green: 0.9,
  blue: 0.9
}
```

**Returns:**

```typescript
{
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  replies: [...]
}
```

**Example:**

```typescript
// Format header row (row 0) as bold with gray background
await sheets_format({
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  sheetId: 0,
  startRow: 0,
  endRow: 1,
  startColumn: 0,
  endColumn: 5,
  bold: true,
  backgroundColor: {
    red: 0.9,
    green: 0.9,
    blue: 0.9
  }
});
```

**Errors:**
- `SPREADSHEET_NOT_FOUND`: Spreadsheet not found
- `INVALID_SHEET_ID`: Sheet ID does not exist

**See Also:** [sheets_batch_update](#sheets_batch_update)

---

### sheets_create_sheet

**Description**: Add a new sheet to an existing spreadsheet.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| spreadsheetId | string | Yes | Spreadsheet ID |
| title | string | Yes | New sheet title |

**Returns:**

```typescript
{
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  replies: [
    {
      addSheet: {
        properties: {
          sheetId: 123456,
          title: "February",
          index: 1,
          sheetType: "GRID",
          gridProperties: {
            rowCount: 1000,
            columnCount: 26
          }
        }
      }
    }
  ]
}
```

**Example:**

```typescript
const result = await sheets_create_sheet({
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  title: "Q2 Data"
});

const newSheetId = result.replies[0].addSheet.properties.sheetId;
```

**Errors:**
- `SPREADSHEET_NOT_FOUND`: Spreadsheet not found
- `DUPLICATE_SHEET_NAME`: Sheet with same name exists

**See Also:** [sheets_create](#sheets_create)

---

### sheets_get_info

**Description**: Get spreadsheet metadata and sheet information.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| spreadsheetId | string | Yes | Spreadsheet ID |

**Returns:**

```typescript
{
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  properties: {
    title: "Sales Tracking",
    locale: "en_US",
    timeZone: "America/Los_Angeles"
  },
  sheets: [
    {
      properties: {
        sheetId: 0,
        title: "Sheet1",
        index: 0,
        gridProperties: {
          rowCount: 1000,
          columnCount: 26
        }
      }
    }
  ],
  spreadsheetUrl: "https://docs.google.com/spreadsheets/d/..."
}
```

**Example:**

```typescript
const info = await sheets_get_info({
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j"
});

console.log(`Title: ${info.properties.title}`);
console.log(`Sheets: ${info.sheets.length}`);
```

**Errors:**
- `SPREADSHEET_NOT_FOUND`: Spreadsheet not found

**See Also:** [sheets_create](#sheets_create)

---

### sheets_batch_update

**Description**: Execute multiple sheet operations in one request for performance.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| spreadsheetId | string | Yes | Spreadsheet ID |
| requests | array | Yes | Array of update request objects |

**Request Types:**
- `updateCells`: Update cell values/formatting
- `mergeCells`: Merge cells
- `autoResizeDimensions`: Auto-resize rows/columns
- `updateSheetProperties`: Update sheet properties
- Many more: see [Sheets API documentation](https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request)

**Returns:**

```typescript
{
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  replies: [...]
}
```

**Example:**

```typescript
// Multiple formatting operations
await sheets_batch_update({
  spreadsheetId: "1a2b3c4d5e6f7g8h9i0j",
  requests: [
    {
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: 0,
          endRowIndex: 1
        },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true }
          }
        },
        fields: "userEnteredFormat.textFormat.bold"
      }
    },
    {
      autoResizeDimensions: {
        dimensions: {
          sheetId: 0,
          dimension: "COLUMNS",
          startIndex: 0,
          endIndex: 5
        }
      }
    }
  ]
});
```

**Errors:**
- `SPREADSHEET_NOT_FOUND`: Spreadsheet not found
- `INVALID_REQUEST`: Request format invalid

**See Also:** [sheets_format](#sheets_format)

---

## Docs Tools

### docs_create

**Description**: Create a new Google Doc.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| title | string | Yes | Document title |
| content | string | No | Initial content to insert |

**Returns:**

```typescript
{
  documentId: "1a2b3c4d5e6f7g8h9i0jk",
  title: "Project Charter",
  revisionId: "ALm37BWl...",
  documentUrl: "https://docs.google.com/document/d/..."
}
```

**Example:**

```typescript
const doc = await docs_create({
  title: "Sprint Planning Notes",
  content: "Sprint 10 - January 2026\n\nGoals:\n- Complete feature X\n- Fix bugs Y and Z"
});

console.log(`Created: ${doc.documentUrl}`);
```

**See Also:** [docs_append](#docs_append)

---

### docs_read

**Description**: Read document content and structure.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| documentId | string | Yes | Google Docs document ID |

**Returns:**

```typescript
{
  documentId: "1a2b3c4d5e6f7g8h9i0jk",
  title: "Project Charter",
  body: {
    content: [
      {
        paragraph: {
          elements: [
            {
              textRun: {
                content: "Project Overview\n",
                textStyle: {}
              }
            }
          ]
        }
      }
    ]
  },
  textContent: "Project Overview\n\nThis document describes..." // Extracted plain text
}
```

**Example:**

```typescript
const doc = await docs_read({
  documentId: "1a2b3c4d5e6f7g8h9i0jk"
});

console.log(`Title: ${doc.title}`);
console.log(`Content:\n${doc.textContent}`);
```

**Errors:**
- `DOCUMENT_NOT_FOUND`: Document not found
- `PERMISSION_DENIED`: No access to document

**See Also:** [docs_create](#docs_create)

---

### docs_append

**Description**: Append text to the end of a document.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| documentId | string | Yes | Google Docs document ID |
| text | string | Yes | Text to append |

**Returns:**

```typescript
{
  documentId: "1a2b3c4d5e6f7g8h9i0jk",
  replies: [...]
}
```

**Example:**

```typescript
await docs_append({
  documentId: "1a2b3c4d5e6f7g8h9i0jk",
  text: "\n\nUpdated on 2026-01-05:\n- Added new requirements\n- Updated timeline"
});
```

**Errors:**
- `DOCUMENT_NOT_FOUND`: Document not found
- `PERMISSION_DENIED`: No write permission

**See Also:** [docs_batch_update](#docs_batch_update)

---

### docs_batch_update

**Description**: Execute multiple document operations in one request.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| documentId | string | Yes | Google Docs document ID |
| requests | array | Yes | Array of update request objects |

**Request Types:**
- `insertText`: Insert text at position
- `deleteContentRange`: Delete text range
- `replaceAllText`: Find and replace
- `updateTextStyle`: Apply formatting
- Many more: see [Docs API documentation](https://developers.google.com/docs/api/reference/rest/v1/documents/request)

**Returns:**

```typescript
{
  documentId: "1a2b3c4d5e6f7g8h9i0jk",
  replies: [...]
}
```

**Example:**

```typescript
// Insert text and apply formatting
await docs_batch_update({
  documentId: "1a2b3c4d5e6f7g8h9i0jk",
  requests: [
    {
      insertText: {
        location: { index: 1 },
        text: "EXECUTIVE SUMMARY\n\n"
      }
    },
    {
      updateTextStyle: {
        range: { startIndex: 1, endIndex: 19 },
        textStyle: {
          bold: true,
          fontSize: { magnitude: 16, unit: "PT" }
        },
        fields: "bold,fontSize"
      }
    }
  ]
});
```

**Errors:**
- `DOCUMENT_NOT_FOUND`: Document not found
- `INVALID_REQUEST`: Request format invalid

**See Also:** [docs_append](#docs_append)

---

## Calendar Tools

### calendar_create_event

**Description**: Create a calendar event with optional attendees.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| summary | string | Yes | Event title |
| description | string | No | Event description |
| startDateTime | string | Yes | Start time (ISO 8601) |
| endDateTime | string | Yes | End time (ISO 8601) |
| attendees | array of strings | No | Attendee email addresses |
| location | string | No | Event location |

**Returns:**

```typescript
{
  id: "abc123def456",
  htmlLink: "https://www.google.com/calendar/event?eid=...",
  summary: "Sprint Planning",
  start: {
    dateTime: "2026-01-10T10:00:00-08:00",
    timeZone: "America/Los_Angeles"
  },
  end: {
    dateTime: "2026-01-10T11:00:00-08:00",
    timeZone: "America/Los_Angeles"
  },
  attendees: [
    {
      email: "attendee@example.com",
      responseStatus: "needsAction"
    }
  ]
}
```

**Example:**

```typescript
const event = await calendar_create_event({
  summary: "Project Kickoff Meeting",
  description: "Discuss project goals and timeline",
  startDateTime: "2026-01-15T14:00:00",
  endDateTime: "2026-01-15T15:30:00",
  location: "Conference Room A",
  attendees: ["pm@example.com", "lead@example.com", "stakeholder@example.com"]
});
```

**Errors:**
- `INVALID_DATE_TIME`: Date format invalid
- `END_BEFORE_START`: End time before start time

**See Also:** [calendar_list_events](#calendar_list_events)

---

### calendar_list_events

**Description**: List upcoming calendar events.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| timeMin | string | No | Start time filter (ISO 8601, default: now) |
| timeMax | string | No | End time filter (ISO 8601) |
| maxResults | number | No | Maximum events to return (default: 10, max: 250) |

**Returns:**

```typescript
{
  items: [
    {
      id: "abc123def456",
      summary: "Sprint Planning",
      start: {
        dateTime: "2026-01-10T10:00:00-08:00"
      },
      end: {
        dateTime: "2026-01-10T11:00:00-08:00"
      },
      attendees: [...],
      htmlLink: "https://www.google.com/calendar/event?eid=..."
    }
  ]
}
```

**Example:**

```typescript
// Get this week's events
const today = new Date().toISOString();
const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const events = await calendar_list_events({
  timeMin: today,
  timeMax: nextWeek,
  maxResults: 50
});
```

**See Also:** [calendar_create_event](#calendar_create_event)

---

### calendar_update_event

**Description**: Update an existing calendar event.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| eventId | string | Yes | Event ID |
| summary | string | No | New event title |
| description | string | No | New description |
| startDateTime | string | No | New start time (ISO 8601) |
| endDateTime | string | No | New end time (ISO 8601) |

**Returns:**

```typescript
{
  id: "abc123def456",
  summary: "Updated: Sprint Planning",
  start: { dateTime: "2026-01-10T14:00:00-08:00" },
  end: { dateTime: "2026-01-10T15:00:00-08:00" },
  updated: "2026-01-05T10:30:00Z"
}
```

**Example:**

```typescript
// Reschedule event
await calendar_update_event({
  eventId: "abc123def456",
  startDateTime: "2026-01-10T14:00:00",
  endDateTime: "2026-01-10T15:00:00"
});
```

**Errors:**
- `EVENT_NOT_FOUND`: Event ID does not exist
- `INVALID_DATE_TIME`: Date format invalid

**See Also:** [calendar_create_event](#calendar_create_event)

---

### calendar_delete_event

**Description**: Delete a calendar event.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| eventId | string | Yes | Event ID to delete |

**Returns:**

```typescript
{
  success: true,
  eventId: "abc123def456"
}
```

**Example:**

```typescript
await calendar_delete_event({
  eventId: "abc123def456"
});
```

**Errors:**
- `EVENT_NOT_FOUND`: Event ID does not exist

---

### calendar_find_slots

**Description**: Find available time slots for a meeting based on calendar availability.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| durationMinutes | number | Yes | Meeting duration in minutes |
| daysAhead | number | No | Days to look ahead (default: 7, max: 30) |
| workingHoursOnly | boolean | No | Only business hours 9am-5pm (default: true) |

**Returns:**

```typescript
{
  availableSlots: [
    {
      start: "2026-01-06T10:00:00-08:00",
      end: "2026-01-06T11:00:00-08:00"
    },
    {
      start: "2026-01-06T14:00:00-08:00",
      end: "2026-01-06T15:00:00-08:00"
    }
  ]
}
```

**Example:**

```typescript
// Find 60-minute meeting slots this week
const slots = await calendar_find_slots({
  durationMinutes: 60,
  daysAhead: 7,
  workingHoursOnly: true
});

console.log(`Found ${slots.availableSlots.length} available slots`);
```

**See Also:** [calendar_create_event](#calendar_create_event)

---

## Tasks Tools

### tasks_create

**Description**: Create a new task in Google Tasks.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| title | string | Yes | Task title |
| notes | string | No | Task notes/description |
| due | string | No | Due date (ISO 8601) |
| listId | string | No | Task list ID (default: default list) |

**Returns:**

```typescript
{
  id: "abc123def456",
  title: "Review proposal document",
  status: "needsAction",
  due: "2026-01-10T00:00:00.000Z",
  selfLink: "https://www.googleapis.com/tasks/v1/lists/.../tasks/..."
}
```

**Example:**

```typescript
const task = await tasks_create({
  title: "Review Q1 proposal",
  notes: "Focus on budget section and timeline",
  due: "2026-01-10T00:00:00"
});
```

**See Also:** [tasks_list](#tasks_list)

---

### tasks_list

**Description**: List tasks in a task list.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| listId | string | No | Task list ID (default: default list) |
| showCompleted | boolean | No | Include completed tasks (default: false) |

**Returns:**

```typescript
{
  items: [
    {
      id: "abc123def456",
      title: "Review proposal document",
      status: "needsAction",
      due: "2026-01-10T00:00:00.000Z",
      notes: "Focus on budget section"
    }
  ]
}
```

**Example:**

```typescript
// Get pending tasks only
const tasks = await tasks_list({
  showCompleted: false
});

// Get all tasks including completed
const allTasks = await tasks_list({
  showCompleted: true
});
```

**See Also:** [tasks_create](#tasks_create), [tasks_list_all](#tasks_list_all)

---

### tasks_update

**Description**: Update a task's properties or mark as complete.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| taskId | string | Yes | Task ID |
| listId | string | Yes | Task list ID |
| title | string | No | New title |
| notes | string | No | New notes |
| status | string | No | Status: 'needsAction' or 'completed' |

**Returns:**

```typescript
{
  id: "abc123def456",
  title: "Review proposal document",
  status: "completed",
  completed: "2026-01-05T10:30:00.000Z"
}
```

**Example:**

```typescript
// Mark task as complete
await tasks_update({
  taskId: "abc123def456",
  listId: "MTIzNDU2Nzg5...",
  status: "completed"
});

// Update task title
await tasks_update({
  taskId: "abc123def456",
  listId: "MTIzNDU2Nzg5...",
  title: "Updated: Review proposal document",
  notes: "Added review comments"
});
```

**Errors:**
- `TASK_NOT_FOUND`: Task ID does not exist
- `LIST_NOT_FOUND`: List ID does not exist

**See Also:** [tasks_create](#tasks_create)

---

### tasks_list_all

**Description**: List all task lists in the user's account.

**Parameters:** None

**Returns:**

```typescript
{
  items: [
    {
      id: "MTIzNDU2Nzg5...",
      title: "My Tasks",
      updated: "2026-01-05T10:30:00.000Z"
    },
    {
      id: "OTg3NjU0MzIx...",
      title: "Work Projects",
      updated: "2026-01-04T15:20:00.000Z"
    }
  ]
}
```

**Example:**

```typescript
const lists = await tasks_list_all();
lists.items.forEach(list => {
  console.log(`${list.title} (${list.id})`);
});
```

**See Also:** [tasks_list](#tasks_list)

---

## Related Documentation

- [PARA Organization Tools](para.md) - AI-powered file categorization
- [PMO Tools](pmo.md) - Project management tracking
- [Deliverable Tools](deliverables.md) - Deliverable lifecycle management
- [Workflow Automation](workflows.md) - Automated workflows

---

**Next:** [PARA Organization Tools](para.md) →
