# Quick Reference Guide

## Installation Commands

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Authenticate with Google
npm run setup-auth

# Test the server
npm test
```

## Automation Scripts

```bash
# Create folder structures
npm run create-folders govcon         # Government contracting
npm run create-folders international  # International deals
npm run create-folders cybersec        # Cybersecurity practice
npm run create-folders business        # General business
npm run create-folders all             # All structures

# Create spreadsheet templates
npm run create-sheets deal            # Deal pipeline tracker
npm run create-sheets proposal        # Proposal management
npm run create-sheets time            # Time tracking
npm run create-sheets client          # Client tracker
npm run create-sheets financial       # Financial dashboard
npm run create-sheets all             # All templates
```

## Tool Categories

### Gmail (8 tools)
- `gmail_send` - Send email
- `gmail_search` - Search messages
- `gmail_get_message` - Get message details
- `gmail_create_draft` - Create draft
- `gmail_list_labels` - List labels
- `gmail_add_label` - Add label to message
- `gmail_mark_read` - Mark as read
- `gmail_archive` - Archive message

### Drive (10 tools)
- `drive_list_files` - List files/folders
- `drive_create_folder` - Create folder
- `drive_upload_file` - Upload file
- `drive_get_file` - Get file details
- `drive_delete_file` - Delete file
- `drive_share_file` - Share file
- `drive_get_permissions` - List permissions
- `drive_copy_file` - Copy file
- `drive_move_file` - Move file
- `drive_search_content` - Full-text search

### Sheets (8 tools)
- `sheets_create` - Create spreadsheet
- `sheets_read` - Read range
- `sheets_write` - Write range
- `sheets_append` - Append rows
- `sheets_format` - Format cells
- `sheets_create_sheet` - Add sheet
- `sheets_get_info` - Get metadata
- `sheets_batch_update` - Batch operations

### Docs (4 tools)
- `docs_create` - Create document
- `docs_read` - Read content
- `docs_append` - Append text
- `docs_batch_update` - Batch operations

### Calendar (5 tools)
- `calendar_create_event` - Create event
- `calendar_list_events` - List events
- `calendar_update_event` - Update event
- `calendar_delete_event` - Delete event
- `calendar_find_slots` - Find available times

### Tasks (4 tools)
- `tasks_create` - Create task
- `tasks_list` - List tasks
- `tasks_update` - Update task
- `tasks_list_all` - List all task lists

## Common Claude Commands

### Deal Management
```
Claude, create new deal:
- Name: [Deal Name]
- Client: [Client]
- Value: $[Amount]
- Probability: [%]

Add to tracker and create deal folder
```

### Email Automation
```
Claude, send email to [recipient]:
Subject: [subject]
Body: [message]
```

### Document Creation
```
Claude, create document titled "[title]" with:
- Executive Summary
- Key Points
- Next Steps
```

### Spreadsheet Operations
```
Claude, add row to my deal tracker:
[Deal Name] | [Client] | $[Value] | [%] | [Stage]
```

### Calendar Management
```
Claude, schedule meeting:
- Tomorrow at 2pm
- 1 hour
- With: [emails]
- Title: [title]
```

## Example Workflows

### Morning Routine
```
Claude, morning briefing:
1. Unread emails from last 24 hours
2. Today's calendar
3. Tasks due today
4. Deals requiring action
```

### Deal Capture
```
Claude, capture new opportunity:
- [Details]

Create tracker entry, folder, brief doc, and notify team
```

### Weekly Review
```
Claude, weekly business review:
- Pipeline metrics
- Proposal status
- Top action items
```

### Proposal Setup
```
Claude, set up proposal for [RFP]:
- Create folder structure
- Log in tracker
- Create outline
- Schedule reviews
```

## File Locations

```
Credentials:     credentials.json (not in git)
Tokens:          token.json (not in git)
Config:          ~/.config/Claude/claude_desktop_config.json (macOS)
Logs:            ~/Library/Logs/Claude/
```

## Troubleshooting

```bash
# Re-authenticate
rm token.json
npm run setup-auth

# Rebuild
npm run build

# Clean install
rm -rf node_modules
npm install
npm run build
```

## API Quotas

- Gmail: 250 units/user/second
- Drive: 1000 requests/100 seconds
- Sheets: 500 requests/100 seconds/user
- Docs: 600 requests/60 seconds/user
- Calendar: 1000 requests/100 seconds/user

## Security Checklist

- [ ] credentials.json not committed
- [ ] token.json not committed
- [ ] Using environment-specific accounts
- [ ] Reviewing permissions regularly
- [ ] Monitoring API usage
- [ ] Rotating tokens periodically

## Links

- README: ./README.md
- Deployment: ./DEPLOYMENT.md
- Workflows: ./WORKFLOWS.md
- GitHub: https://github.com/yourusername/google-workspace-mcp
- Google Cloud: https://console.cloud.google.com
