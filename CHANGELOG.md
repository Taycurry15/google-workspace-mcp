# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation restructure with new `docs/` directory
- Master documentation index at `docs/INDEX.md`
- Complete API reference for 100+ tools
- Architecture documentation with Mermaid diagrams
- Troubleshooting guide
- FAQ documentation
- Testing guide
- Configuration reference

### Changed
- Reorganized all documentation into logical sections
- Consolidated duplicated content from multiple quick start guides
- Updated README to serve as concise project overview
- Migrated PMI framework documentation to `docs/pmi-framework/`

### Removed
- Duplicated quick start documentation (consolidated)
- Scattered documentation from root directory (moved to `docs/`)

## [1.0.0] - Prior Releases

### Added

#### Phase 5: Workflow Automation
- Workflow engine with scheduling and event-driven execution
- 10+ workflow management tools
- Role-based access control
- Predefined workflows (document submission, deliverable review, weekly status, milestone notifications)
- Reusable workflow actions

#### Phase 4: Deliverable Tracking
- Complete deliverable lifecycle management (27+ tools)
- Submission and review workflows
- Quality checklist system
- Status tracking and reporting
- Schedule variance analysis
- Notification system

#### Phase 3: Document Organization
- LLM-powered document categorization (13+ tools)
- Automated document routing
- PMI-standard folder structures
- Metadata management
- Document versioning
- Template system
- Advanced search with relevance scoring

#### Phase 2: Program Management
- Program charter management (18+ tools)
- Work Breakdown Structure (WBS)
- Milestone tracking with variance analysis
- Issue and decision logs
- PMI PMBOK framework implementation

#### Phase 1: PMO Module
- PMO tracking tools (6+ tools)
- Deliverable tracking
- Risk register management
- Stakeholder management
- EVM (Earned Value Management)
- AI-powered proposal analysis

#### PARA Organization
- PARA method implementation (8+ tools)
- LLM-powered file categorization
- Batch processing
- Semantic search
- Auto-archival
- Dashboard creation

#### Google Workspace Integration
- Gmail tools (10 tools)
- Google Drive tools (10 tools)
- Google Sheets tools (8 tools)
- Google Docs tools (4 tools)
- Google Calendar tools (5 tools)
- Google Tasks tools (4 tools)

#### LLM Multi-Provider Router
- Support for Anthropic Claude, Google Gemini, OpenAI, Groq, and Mistral
- Intelligent routing based on task type
- Cost tracking and budget management
- Automatic fallback between providers
- Provider-specific optimizations

#### Development & Operations
- TypeScript implementation
- ESLint and Prettier for code quality
- GitHub Actions CI/CD workflows
- OAuth 2.0 authentication
- Environment variable support
- Comprehensive error handling

#### Templates & Scripts
- 4 spreadsheet creation scripts (PMO, deliverable, program, document)
- 13 npm scripts for development and operations
- Pre-built spreadsheet templates
- Folder structure templates
- PMI-standard templates

#### Documentation
- Comprehensive README
- 45-minute deployment guide
- PMI framework documentation (177KB across 3 files)
- 12+ real-world workflow examples
- Claude Desktop setup guide
- LLM router setup guide
- Contributing guidelines

---

## Version History Notes

**v1.0.0** represents the initial production-ready release with all 7 domains (100+ tools) fully implemented.

Future releases will be documented here with semantic versioning:
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backwards compatible manner
- **PATCH** version for backwards compatible bug fixes
