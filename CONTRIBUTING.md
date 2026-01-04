# Contributing to Google Workspace MCP

Thank you for your interest in contributing! This guide will help you set up your development environment and understand our development workflow.

## Development Setup

### Prerequisites

- Node.js 18.x or higher
- npm
- Google Cloud account (for testing)
- Git

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/google-workspace-mcp.git
   cd google-workspace-mcp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables (optional):**
   ```bash
   cp .env.example .env
   # Edit .env with your paths if needed
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Authenticate with Google:**
   ```bash
   npm run setup-auth
   ```

You're now ready to develop!

---

## Development Workflow

### Before Committing

Always run quality checks before committing:

```bash
# Run all quality checks
npm run quality

# Or run individual checks:
npm run typecheck  # TypeScript type checking
npm run lint       # ESLint linting
npm run format:check  # Prettier formatting check
```

### Auto-fixing Issues

```bash
# Auto-fix linting issues
npm run lint:fix

# Auto-format code
npm run format
```

### Building

```bash
# Development build (with watch mode)
npm run watch

# Production build
npm run build
```

### Testing Changes

```bash
# Test the server locally
npm run dev

# Or test specific features
npm run create-folders govcon
npm run create-sheets deal
```

---

## Code Style Guide

### TypeScript Standards

- **Strict mode enabled:** All code must pass TypeScript strict checks
- **Type safety:** Avoid `any` types when possible (warnings are acceptable for complex Google API types)
- **Async/await:** Use async/await instead of promises chains
- **Error handling:** Always wrap API calls in try/catch blocks

### ESLint Rules

Our ESLint configuration enforces:
- Recommended TypeScript rules
- Unused variable detection (prefixing with `_` allows unused args)
- Consistent code patterns

Warnings are acceptable for existing code, but new code should avoid them.

### Prettier Formatting

- **Semi-colons:** Required
- **Quotes:** Double quotes
- **Print width:** 100 characters
- **Tab width:** 2 spaces
- **Trailing commas:** ES5 style

Prettier runs automatically on save in most editors. Configure your editor to use the project's `.prettierrc.json`.

---

## Adding New Tools

When adding a new Google Workspace tool:

### 1. Define Tool Schema

Add to `src/index.ts` in the `ListToolsRequestSchema` handler:

```typescript
{
  name: "your_tool_name",
  description: "Clear, concise description of what the tool does",
  inputSchema: {
    type: "object",
    properties: {
      param1: {
        type: "string",
        description: "Description of parameter"
      }
    },
    required: ["param1"]
  }
}
```

### 2. Implement Tool Method

Add a private method to the `GoogleWorkspaceMCP` class:

```typescript
private async yourToolName(param1: string): Promise<string> {
  try {
    // Ensure OAuth client is available
    if (!this.oauth2Client) {
      throw new Error("Not authenticated");
    }

    // Initialize Google API
    const service = google.yourapi({ version: 'v1', auth: this.oauth2Client });

    // Call API
    const response = await service.something.do({ ... });

    // Return formatted result
    return JSON.stringify(response.data, null, 2);
  } catch (error: any) {
    throw new Error(`Failed to do thing: ${error.message}`);
  }
}
```

### 3. Add to Call Handler

Add a case to the `CallToolRequestSchema` handler switch statement:

```typescript
case "your_tool_name":
  return {
    content: [
      {
        type: "text",
        text: await this.yourToolName(args.param1)
      }
    ]
  };
```

### 4. Update Documentation

- Add tool to [README.md](README.md) tool list
- Add usage examples to [WORKFLOWS.md](WORKFLOWS.md)
- Update tool count (currently 30+ tools)

### 5. Test

```bash
npm run build
npm run dev

# In Claude Desktop, test the new tool:
# "Claude, use the new tool with..."
```

---

## Pull Request Process

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Use clear branch names:
- `feature/gmail-attachment-support`
- `fix/calendar-timezone-bug`
- `docs/update-deployment-guide`

### 2. Make Changes

- Follow code style guide
- Write meaningful commit messages
- Keep commits focused and atomic

### 3. Run Quality Checks

```bash
npm run quality
```

All checks must pass before creating a PR.

### 4. Commit Changes

```bash
git add .
git commit -m "feat: Add email attachment support"
```

**Commit message format:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test updates
- `chore:` Maintenance tasks

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub with:
- Clear description of changes
- Any breaking changes noted
- Screenshots/examples if applicable

### 6. CI Checks

GitHub Actions will automatically:
- Run type checking
- Run ESLint
- Run Prettier checks
- Build the project
- Test on Node.js 18.x and 20.x

All checks must pass for PR to be merged.

---

## Project Structure

```
google-workspace-mcp/
├── src/                    # TypeScript source files
│   ├── index.ts           # Main MCP server (30+ tools)
│   ├── setup-auth.ts      # OAuth2 setup script
│   ├── create-folders.ts  # Drive folder automation
│   └── create-sheets.ts   # Spreadsheet templates
├── dist/                  # Compiled JavaScript (generated)
├── .github/workflows/     # CI/CD pipelines
│   ├── ci.yml            # Build, lint, test
│   └── release.yml       # Release automation
├── .gitignore            # Git ignore rules
├── .env.example          # Environment template
├── .eslintrc.json        # ESLint configuration
├── .prettierrc.json      # Prettier configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── README.md             # Main documentation
├── DEPLOYMENT.md         # Deployment guide
├── WORKFLOWS.md          # Usage examples
└── CONTRIBUTING.md       # This file
```

---

## Code Quality Standards

### Type Safety

```typescript
// ✅ Good - Explicit types
async function sendEmail(to: string, subject: string): Promise<string> {
  // ...
}

// ❌ Bad - Implicit any
async function sendEmail(to, subject) {
  // ...
}
```

### Error Handling

```typescript
// ✅ Good - Proper error handling
try {
  const result = await gmail.users.messages.send({ ... });
  return JSON.stringify(result.data);
} catch (error: any) {
  throw new Error(`Failed to send email: ${error.message}`);
}

// ❌ Bad - No error handling
const result = await gmail.users.messages.send({ ... });
return JSON.stringify(result.data);
```

### Documentation

```typescript
// ✅ Good - Clear documentation
/**
 * Sends an email via Gmail API
 * @param to - Recipient email address
 * @param subject - Email subject line
 * @param body - Email body (plain text or HTML)
 * @returns Message ID of sent email
 */
async function sendEmail(to: string, subject: string, body: string): Promise<string> {
  // ...
}
```

---

## Testing Checklist

Before submitting a PR, verify:

- [ ] Code compiles without errors (`npm run build`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Formatting is correct (`npm run format:check`)
- [ ] All quality checks pass (`npm run quality`)
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] Commit messages are clear

---

## Release Process

**For Maintainers Only:**

1. **Update version:**
   ```bash
   npm version patch  # or minor, major
   ```

2. **Push with tags:**
   ```bash
   git push --follow-tags
   ```

3. **GitHub Actions automatically:**
   - Builds the project
   - Creates release archive
   - Publishes GitHub release

---

## Getting Help

- **Documentation:** [README.md](README.md), [DEPLOYMENT.md](DEPLOYMENT.md), [WORKFLOWS.md](WORKFLOWS.md)
- **Issues:** https://github.com/yourusername/google-workspace-mcp/issues
- **Discussions:** https://github.com/yourusername/google-workspace-mcp/discussions

---

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

---

**Thank you for contributing to Google Workspace MCP!** 🚀

Every contribution, no matter how small, makes this project better for everyone.
