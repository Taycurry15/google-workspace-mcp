# Data Flow Architecture

Complete data flow diagrams showing processing pipelines and integration patterns across the Google Workspace MCP server.

**Last Updated:** 2026-01-05

---

## Table of Contents

1. [Overview](#overview)
2. [Document Processing Pipeline](#document-processing-pipeline)
3. [Deliverable Lifecycle Flow](#deliverable-lifecycle-flow)
4. [Program Management Flow](#program-management-flow)
5. [LLM Routing Flow](#llm-routing-flow)
6. [Workflow Execution Flow](#workflow-execution-flow)
7. [Authentication Flow](#authentication-flow)

---

## Overview

This document provides detailed sequence diagrams showing how data flows through the system for common operations. Each diagram illustrates the interaction between components, external services, and the user.

---

## Document Processing Pipeline

### Document Submission Flow

Complete flow from document upload to final routing and tracking.

```
    User      Claude      MCP     Document    LLM      Google    Google   Workflow
                                  Module     Router    Drive     Sheets    Engine
     │          │          │         │         │         │         │         │
     │ "Submit project charter to Alpha Program"        │         │         │
     ├─────────►│          │         │         │         │         │         │
     │          │          │         │         │         │         │         │
     │          │ document_submit(fileId, programId)    │         │         │
     │          ├─────────►│         │         │         │         │         │
     │          │          │         │         │         │         │         │
     │          │          │ handleDocumentSubmit()     │         │         │
     │          │          ├────────►│         │         │         │         │
     │          │          │         │         │         │         │         │
     │          │          │         │ STEP 1: Get File Content    │         │
     │          │          │         │         │         │         │         │
     │          │          │         │ Get file metadata & content │         │
     │          │          │         ├───────────────────►         │         │
     │          │          │         │         │         │         │         │
     │          │          │         │ File data         │         │         │
     │          │          │         │◄──────────────────┤         │         │
     │          │          │         │         │         │         │         │
     │          │          │         │ STEP 2: LLM Categorization  │         │
     │          │          │         │         │         │         │         │
     │          │          │         │ Categorize document         │         │
     │          │          │         ├────────►│         │         │         │
     │          │          │         │         │         │         │         │
     │          │          │         │         │ Route to Gemini   │         │
     │          │          │         │         │ (cost-optimized)  │         │
     │          │          │         │         │         │         │         │
     │          │          │         │ {category: "Charter",       │         │
     │          │          │         │  phase: "Initiation",       │         │
     │          │          │         │  confidence: 0.95}          │         │
     │          │          │         │◄────────┤         │         │         │
     │          │          │         │         │         │         │         │
     │          │          │         │ STEP 3: Determine Target Folder      │
     │          │          │         │         │         │         │         │
     │          │          │         │ Map category to PMI folder  │         │
     │          │          │         ├───┐     │         │         │         │
     │          │          │         │   │     │         │         │         │
     │          │          │         │◄──┘     │         │         │         │
     │          │          │         │         │         │         │         │
     │          │          │         │ Find/create "01-Initiation/Charter"  │
     │          │          │         ├───────────────────►         │         │
     │          │          │         │         │         │         │         │
     │          │          │         │ Folder ID         │         │         │
     │          │          │         │◄──────────────────┤         │         │
     │          │          │         │         │         │         │         │
     │          │          │         │ STEP 4: Route Document      │         │
     │          │          │         │         │         │         │         │
     │          │          │         │ Move file to target folder  │         │
     │          │          │         ├───────────────────►         │         │
     │          │          │         │         │         │         │         │
     │          │          │         │ Success           │         │         │
     │          │          │         │◄──────────────────┤         │         │
     │          │          │         │         │         │         │         │
     │          │          │         │ STEP 5: Update Register     │         │
     │          │          │         │         │         │         │         │
     │          │          │         │ Append row to Document Register       │
     │          │          │         ├───────────────────┴────────►│         │
     │          │          │         │         │         │         │         │
     │          │          │         │ Row added         │         │         │
     │          │          │         │◄────────────────────────────┤         │
     │          │          │         │         │         │         │         │
     │          │          │         │ STEP 6: Emit Event          │         │
     │          │          │         │         │         │         │         │
     │          │          │         │ emit("document.submitted", data)      │
     │          │          │         ├───────────────────┴─────────┴────────►│
     │          │          │         │         │         │         │         │
     │          │          │         │         │         │         │ Trigger │
     │          │          │         │         │         │         │ subscribed
     │          │          │         │         │         │         │ workflows
     │          │          │         │         │         │         │         │
     │          │          │         │ {documentId: "DOC-123",     │         │
     │          │          │         │  category: "Charter",       │         │
     │          │          │         │  folderId: "xxx",           │         │
     │          │          │         │  registered: true}          │         │
     │          │          │◄────────┤         │         │         │         │
     │          │          │         │         │         │         │         │
     │          │ Success response    │         │         │         │         │
     │          │◄─────────┤         │         │         │         │         │
     │          │          │         │         │         │         │         │
     │ "Document categorized as Charter and routed to              │         │
     │  Alpha Program > 01-Initiation > Charter folder.            │         │
     │  Registered in Document Register."                          │         │
     │◄─────────┤          │         │         │         │         │         │
     │          │          │         │         │         │         │         │
     ▼          ▼          ▼         ▼         ▼         ▼         ▼         ▼
```

### Document Search Flow

Advanced search with relevance scoring.

```
    User         MCP       Document      Google       Google
                           Module        Sheets       Drive
     │            │           │             │            │
     │ document_search({program: "Alpha",  │            │
     │                  phase: "Planning",  │            │
     │                  minConfidence: 0.8})│            │
     ├───────────►│           │             │            │
     │            │           │             │            │
     │            │ handleDocumentSearch()  │            │
     │            ├──────────►│             │            │
     │            │           │             │            │
     │            │           │ Read Document Register   │
     │            │           ├────────────►│            │
     │            │           │             │            │
     │            │           │ All documents            │
     │            │           │◄────────────┤            │
     │            │           │             │            │
     │            │           │ Filter by criteria:      │
     │            │           │ - Program = "Alpha"      │
     │            │           │ - Phase = "Planning"     │
     │            │           │ - Confidence >= 0.8      │
     │            │           ├───┐         │            │
     │            │           │   │         │            │
     │            │           │◄──┘         │            │
     │            │           │             │            │
     │            │           │ ┌─────────────────────────────────┐
     │            │           │ │ For each matching document:     │
     │            │           │ │                                 │
     │            │           │ │ Get file metadata               │
     │            │           │ ├────────────┴───────────►        │
     │            │           │ │             │            │       │
     │            │           │ │ File info   │            │       │
     │            │           │ │◄───────────────────────┤        │
     │            │           │ │             │            │       │
     │            │           │ │ Calculate relevance score       │
     │            │           │ ├───┐         │            │       │
     │            │           │ │   │         │            │       │
     │            │           │ │◄──┘         │            │       │
     │            │           │ └─────────────────────────────────┘
     │            │           │             │            │
     │            │           │ Sort by relevance        │
     │            │           ├───┐         │            │
     │            │           │   │         │            │
     │            │           │◄──┘         │            │
     │            │           │             │            │
     │            │ Ranked search results   │            │
     │            │◄──────────┤             │            │
     │            │           │             │            │
     │ [{id: "DOC-045", name: "Budget Plan", score: 0.95},
     │  {id: "DOC-052", name: "Schedule", score: 0.88},
     │  ...]        │           │             │            │
     │◄───────────┤           │             │            │
     │            │           │             │            │
     ▼            ▼           ▼             ▼            ▼
```

---

## Deliverable Lifecycle Flow

### Complete Deliverable Lifecycle

From creation through submission, review, and approval.

```
                         ┌──────────────┐
                         │    Create    │
                         │ Deliverable  │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                    ┌───►│    Draft     │
                    │    └──┬───────┬───┘
                    │       │       │
            Return  │       │       │ Cancel
           to Draft │       │       │
                    │       │       ▼
                    │       │  ┌──────────┐
                    │       │  │Cancelled │──► END
                    │       │  └──────────┘
                    │       │
                    │       │ Start Work
                    │       │
                    │       ▼
                    │  ┌──────────────┐
                    └──┤  InProgress  │
                       └──┬───────────┘
                          │
                          │ Submit for Review
                          │
                          ▼
                    ┌──────────────┐
                    │  Submitted   │◄────┐
                    └──┬───────┬───┘     │
                       │       │         │ Withdraw
         Assign        │       │         │
         Reviewer      │       └─────────┘
                       │
                       ▼
                ┌──────────────┐         NOTE: Quality Checklist
                │   InReview   │               Evaluated Here
                └──┬───────┬───┘
                   │       │
    Reviewer       │       │ Review Approved
    Requests       │       │
    Changes        │       ▼
                   │  ┌──────────────┐   NOTE: Stakeholder Sign-Off
                   │  │  InApproval  │
                   │  └──┬───────┬───┘
                   │     │       │
                   │     │       │ Final Approval
                   │     │       │
                   │     │       ▼
                   │     │  ┌──────────┐
                   │     │  │ Approved │──► END
                   │     │  └──────────┘
                   │     │
                   │     │ Approval Rejected
                   │     │
                   ▼     ▼
            ┌────────────────┐
            │     Changes    │
            │   Requested    │
            └────────┬───────┘
                     │
                     │ Make Changes
                     │
                     └──────────► (Back to InProgress)

DELIVERABLE STATES:
┌──────────────────┬──────────────────────────────────────────┐
│ State            │ Description                              │
├──────────────────┼──────────────────────────────────────────┤
│ Draft            │ Initial state, being planned             │
│ InProgress       │ Actively being worked on                 │
│ Submitted        │ Submitted for review                     │
│ InReview         │ Under review by assigned reviewer        │
│ ChangesRequested │ Changes needed before approval           │
│ InApproval       │ Awaiting final stakeholder approval      │
│ Approved         │ Final approval granted, complete         │
│ Cancelled        │ Deliverable cancelled                    │
└──────────────────┴──────────────────────────────────────────┘
```

### Submission and Review Flow

Detailed sequence for deliverable submission process.

```
Program   MCP   Deliverable  Google   Workflow  Gmail   Reviewer
Manager         Module       Sheets   Engine
  │       │         │           │         │        │        │
  │       │         │           │         │        │        │
  ├──────────────── SUBMISSION PHASE ───────────────────────┤
  │       │         │           │         │        │        │
  │ deliverable_submit("DEL-001")         │        │        │
  ├──────►│         │           │         │        │        │
  │       │         │           │         │        │        │
  │       │ handleDeliverableSubmit()     │        │        │
  │       ├────────►│           │         │        │        │
  │       │         │           │         │        │        │
  │       │         │ Read deliverable DEL-001     │        │
  │       │         ├──────────►│         │        │        │
  │       │         │           │         │        │        │
  │       │         │ Deliverable data    │        │        │
  │       │         │◄──────────┤         │        │        │
  │       │         │           │         │        │        │
  │       │         │ Validate status = "InProgress"        │
  │       │         ├───┐       │         │        │        │
  │       │         │   │       │         │        │        │
  │       │         │◄──┘       │         │        │        │
  │       │         │           │         │        │        │
  │       │         │ Update status to "Submitted" │        │
  │       │         ├──────────►│         │        │        │
  │       │         │           │         │        │        │
  │       │         │ Updated   │         │        │        │
  │       │         │◄──────────┤         │        │        │
  │       │         │           │         │        │        │
  │       │         │ Add submission record        │        │
  │       │         ├──────────►│         │        │        │
  │       │         │           │         │        │        │
  │       │         │ Submission ID       │        │        │
  │       │         │◄──────────┤         │        │        │
  │       │         │           │         │        │        │
  │       │         │ emit("deliverable.submitted", {       │
  │       │         │      deliverableId: "DEL-001",        │
  │       │         │      type: "Technical Design"})       │
  │       │         ├──────────────────────►       │        │
  │       │         │           │         │        │        │
  │       │         │           │    Auto-assign reviewer   │
  │       │         │           │    workflow triggers      │
  │       │         │           │         │        │        │
  │       │         │ deliverable_assign_reviewer( │        │
  │       │         │   "DEL-001",        │        │        │
  │       │         │   "reviewer@example.com")    │        │
  │       │         │◄──────────────────────       │        │
  │       │         │           │         │        │        │
  │       │         │ Update reviewer assignment   │        │
  │       │         ├──────────►│         │        │        │
  │       │         │           │         │        │        │
  │       │         │ Updated   │         │        │        │
  │       │         │◄──────────┤         │        │        │
  │       │         │           │         │        │        │
  │       │         │ Update status to "InReview"  │        │
  │       │         ├──────────►│         │        │        │
  │       │         │           │         │        │        │
  │       │         │ Updated   │         │        │        │
  │       │         │◄──────────┤         │        │        │
  │       │         │           │         │        │        │
  │       │         │           │         │ Send review request
  │       │         │           │         ├───────►│        │
  │       │         │           │         │        │        │
  │       │         │           │         │ Email sent      │
  │       │         │           │         │◄───────┤        │
  │       │         │           │         │        │        │
  │ {status: "InReview",        │         │        │        │
  │  reviewer: "reviewer@example.com",    │        │        │
  │  notified: true}            │         │        │        │
  │◄──────┴─────────┤           │         │        │        │
  │       │         │           │         │        │        │
  │       │         │           │         │        │        │
  ├──────────────── REVIEW PHASE ─────────────────────────────┤
  │       │         │           │         │        │        │
  │       │         │           │         │        │ deliverable_submit_review(
  │       │         │           │         │        │   "DEL-001",
  │       │         │           │         │        │   "approved",
  │       │         │           │         │        │   "Looks good!")
  │       │         │           │         │        │        ├────┐
  │       │         │           │         │        │        │    │
  │       │◄────────────────────────────────────────────────┤    │
  │       │         │           │         │        │        │    │
  │       │ handleDeliverableReview()     │        │        │    │
  │       ├────────►│           │         │        │        │    │
  │       │         │           │         │        │        │    │
  │       │         │ Add review record   │        │        │    │
  │       │         ├──────────►│         │        │        │    │
  │       │         │           │         │        │        │    │
  │       │         │ Review ID │         │        │        │    │
  │       │         │◄──────────┤         │        │        │    │
  │       │         │           │         │        │        │    │
  │       │         │ Update status to "InApproval"│        │    │
  │       │         ├──────────►│         │        │        │    │
  │       │         │           │         │        │        │    │
  │       │         │ Updated   │         │        │        │    │
  │       │         │◄──────────┤         │        │        │    │
  │       │         │           │         │        │        │    │
  │       │         │ emit("deliverable.reviewed") │        │    │
  │       │         ├──────────────────────►       │        │    │
  │       │         │           │         │        │        │    │
  │       │         │           │         │ Notify PM of approval
  │       │         │           │         ├───────►│        │    │
  │       │         │           │         │        │        │    │
  │       │         │           │         │ Email sent      │    │
  │       │         │           │         │◄───────┤        │    │
  │       │         │           │         │        │        │    │
  │       │         │ Review submitted successfully│        │    │
  │       │         ├──────────────────────────────────────►│    │
  │       │         │           │         │        │        │◄───┘
  │       │         │           │         │        │        │
  ▼       ▼         ▼           ▼         ▼        ▼        ▼
```

---

## Program Management Flow

### Milestone Tracking Flow

Milestone creation, tracking, and variance analysis.

```
Program      MCP      Program     Google    Workflow
Manager               Module      Sheets     Engine
   │           │          │           │          │
   ├───────────────── CREATE MILESTONE ───────────────┤
   │           │          │           │          │
   │ program_create_milestone({program: "Alpha", │
   │  name: "Design Complete",        │          │
   │  plannedDate: "2026-03-15",      │          │
   │  weight: 20})        │           │          │
   ├──────────►│          │           │          │
   │           │          │           │          │
   │           │ handleCreateMilestone()         │
   │           ├─────────►│           │          │
   │           │          │           │          │
   │           │          │ Append to Milestones sheet
   │           │          ├──────────►│          │
   │           │          │           │          │
   │           │          │ Milestone ID: "MS-005"│
   │           │          │◄──────────┤          │
   │           │          │           │          │
   │           │          │ Add formula for variance calculation
   │           │          ├──────────►│          │
   │           │          │           │          │
   │           │          │ Formula added        │
   │           │          │◄──────────┤          │
   │           │          │           │          │
   │ Milestone MS-005 created         │          │
   │◄──────────┴──────────┤           │          │
   │           │          │           │          │
   │           │          │           │          │
   ├───────────────── TRACK PROGRESS ─────────────────┤
   │           │          │           │          │
   │ program_track_milestone({milestoneId: "MS-005",
   │  actualDate: "2026-03-18",       │          │
   │  status: "completed"})           │          │
   ├──────────►│          │           │          │
   │           │          │           │          │
   │           │ handleTrackMilestone()│         │
   │           ├─────────►│           │          │
   │           │          │           │          │
   │           │          │ Update milestone record  │
   │           │          ├──────────►│          │
   │           │          │           │          │
   │           │          │ Updated   │          │
   │           │          │◄──────────┤          │
   │           │          │           │          │
   │           │          │ Read variance formula result
   │           │          ├──────────►│          │
   │           │          │           │          │
   │           │          │ Variance: +3 days (late)
   │           │          │◄──────────┤          │
   │           │          │           │          │
   │           │          │ Calculate impact:    │
   │           │          │ - Schedule variance  │
   │           │          │ - Cost variance      │
   │           │          │ - EVM metrics        │
   │           │          ├───┐       │          │
   │           │          │   │       │          │
   │           │          │◄──┘       │          │
   │           │          │           │          │
   │           │          │ emit("milestone.completed", {
   │           │          │   id: "MS-005",       │
   │           │          │   variance: 3,        │
   │           │          │   impact: "moderate"})│
   │           │          ├──────────────────────►│
   │           │          │           │          │
   │           │          │           │ Check variance threshold
   │           │          │           │          ├───┐
   │           │          │           │          │   │
   │           │          │           │          │   │ IF variance > 5 days:
   │           │          │           │          │   │ Trigger escalation
   │           │          │           │          │   │ workflow
   │           │          │           │          │◄──┘
   │           │          │           │          │
   │ {status: "completed",            │          │
   │  actualDate: "2026-03-18",       │          │
   │  variance: "+3 days",            │          │
   │  scheduleImpact: "Low"}          │          │
   │◄──────────┴──────────┤           │          │
   │           │          │           │          │
   ▼           ▼          ▼           ▼          ▼
```

---

## LLM Routing Flow

### Multi-Provider Selection Flow

How the LLM router selects the optimal provider.

```
Application    LLM       Cost      Anthropic   Google    OpenAI
  Code        Router    Tracker     Claude      Gemini    GPT
    │            │         │           │          │         │
    │ complete(request, {strategy: "cost_optimized",       │
    │                     taskType: "categorization"})     │
    ├───────────►│         │           │          │         │
    │            │         │           │          │         │
    │            │ Analyze request:    │          │         │
    │            │ - Estimate tokens: 500         │         │
    │            │ - Task type: categorization    │         │
    │            │ - Strategy: cost_optimized     │         │
    │            ├───┐     │           │          │         │
    │            │   │     │           │          │         │
    │            │◄──┘     │           │          │         │
    │            │         │           │          │         │
    │            │ Rank providers by cost         │         │
    │            ├───┐     │           │          │         │
    │            │   │     │           │          │         │
    │            │◄──┘     │           │          │         │
    │            │         │           │          │         │
    │            │ Provider Rankings:  │          │         │
    │            │ 1. Google Gemini: $0.00        │         │
    │            │ 2. OpenAI Mini: $0.0001        │         │
    │            │ 3. Claude Sonnet: $0.0015      │         │
    │            │         │           │          │         │
    │            │ Check daily budget  │          │         │
    │            ├────────►│           │          │         │
    │            │         │           │          │         │
    │            │ $8.50 / $10.00 used │          │         │
    │            │◄────────┤           │          │         │
    │            │         │           │          │         │
    │            │ Select: Google Gemini Flash    │         │
    │            ├───┐     │           │          │         │
    │            │   │     │           │          │         │
    │            │◄──┘     │           │          │         │
    │            │         │           │          │         │
    │            │ API call with retry logic      │         │
    │            ├────────────────────────────────►│        │
    │            │         │           │          │         │
    │            │         │           │  SUCCESS PATH:     │
    │            │         │           │          │         │
    │            │ Response + usage    │          │         │
    │            │◄────────────────────────────────┤        │
    │            │         │           │          │         │
    │            │ Track cost: $0.00   │          │         │
    │            ├────────►│           │          │         │
    │            │         │           │          │         │
    │            │ Updated │           │          │         │
    │            │◄────────┤           │          │         │
    │            │         │           │          │         │
    │            │ Calculate metrics:  │          │         │
    │            │ - Latency: 1200ms   │          │         │
    │            │ - Quality: 4/5      │          │         │
    │            │ - Cost: $0.00       │          │         │
    │            ├───┐     │           │          │         │
    │            │   │     │           │          │         │
    │            │◄──┘     │           │          │         │
    │            │         │           │          │         │
    │ {content: "Category: Charter",   │          │         │
    │  provider: "google",             │          │         │
    │  model: "gemini-2.0-flash",      │          │         │
    │  usage: {...},                   │          │         │
    │  metadata: {cost: 0, latency: 1200}}        │         │
    │◄───────────┤         │           │          │         │
    │            │         │           │          │         │
    │            │         │           │  ERROR PATH:       │
    │            │         │           │          │         │
    │            │ Error 503           │          │         │
    │            │◄────────────────────────────────┤        │
    │            │         │           │          │         │
    │            │ Fallback to next:   │          │         │
    │            │ OpenAI GPT-4o Mini  │          │         │
    │            ├───┐     │           │          │         │
    │            │   │     │           │          │         │
    │            │◄──┘     │           │          │         │
    │            │         │           │          │         │
    │            │ Retry with OpenAI   │          │         │
    │            ├────────────────────────────────┴─────────►
    │            │         │           │          │         │
    │            │ Response            │          │         │
    │            │◄────────────────────────────────┴─────────┤
    │            │         │           │          │         │
    │            │ Track cost: $0.0001 │          │         │
    │            ├────────►│           │          │         │
    │            │         │           │          │         │
    │ Response with fallback provider  │          │         │
    │◄───────────┤         │           │          │         │
    │            │         │           │          │         │
    ▼            ▼         ▼           ▼          ▼         ▼
```

---

## Workflow Execution Flow

### Event-Triggered Workflow Execution

Complete flow from event emission to workflow completion.

```
System   Event      Workflow    Role     Action 1:   Action 2:  Action 3:  Execution
         Handler     Engine     Manager  Categorize    Route      Notify     Logger
   │        │           │          │          │           │          │          │
   │ emit("document.submitted", {documentId: "DOC-123",   │          │          │
   │                userId: "user@example.com"})          │          │          │
   ├───────►│           │          │          │           │          │          │
   │        │           │          │          │           │          │          │
   │        │ Find subscribed workflows       │           │          │          │
   │        ├───┐       │          │          │           │          │          │
   │        │   │       │          │          │           │          │          │
   │        │◄──┘       │          │          │           │          │          │
   │        │           │          │          │           │          │          │
   │        │ Execute "document-processing"   │           │          │          │
   │        ├──────────►│          │          │           │          │          │
   │        │           │          │          │           │          │          │
   │        │           │ Load workflow definition        │          │          │
   │        │           ├───┐      │          │           │          │          │
   │        │           │   │      │          │           │          │          │
   │        │           │◄──┘      │          │           │          │          │
   │        │           │          │          │           │          │          │
   │        │           │ Check user permission           │          │          │
   │        │           ├─────────►│          │           │          │          │
   │        │           │          │          │           │          │          │
   │        │           │ Authorized ✓        │           │          │          │
   │        │           │◄─────────┤          │           │          │          │
   │        │           │          │          │           │          │          │
   │        │           │ Create execution context        │          │          │
   │        │           ├───┐      │          │           │          │          │
   │        │           │   │      │          │           │          │          │
   │        │           │◄──┘      │          │           │          │          │
   │        │           │          │          │           │          │          │
   │        │           │ ════════ EXECUTE ACTIONS SEQUENTIALLY ═══════════════ │
   │        │           │          │          │           │          │          │
   │        │           │ Execute categorize-document     │          │          │
   │        │           ├─────────────────────►│          │          │          │
   │        │           │          │          │           │          │          │
   │        │           │          │ Call LLM router      │          │          │
   │        │           │          │          ├───┐       │          │          │
   │        │           │          │          │   │       │          │          │
   │        │           │          │          │◄──┘       │          │          │
   │        │           │          │          │           │          │          │
   │        │           │ {category: "Charter",           │          │          │
   │        │           │  phase: "Initiation"}           │          │          │
   │        │           │◄─────────────────────┤          │          │          │
   │        │           │          │          │           │          │          │
   │        │           │ Log action 1 success │          │          │          │
   │        │           ├─────────────────────────────────┴──────────┴─────────►│
   │        │           │          │          │           │          │          │
   │        │           │ Execute route-document          │          │          │
   │        │           ├────────────────────────────────►│          │          │
   │        │           │          │          │           │          │          │
   │        │           │          │          │ Move to folder       │          │
   │        │           │          │          │           ├───┐      │          │
   │        │           │          │          │           │   │      │          │
   │        │           │          │          │           │◄──┘      │          │
   │        │           │          │          │           │          │          │
   │        │           │ {folderId: "xxx"}   │           │          │          │
   │        │           │◄────────────────────────────────┤          │          │
   │        │           │          │          │           │          │          │
   │        │           │ Log action 2 success │          │          │          │
   │        │           ├─────────────────────────────────┴──────────┴─────────►│
   │        │           │          │          │           │          │          │
   │        │           │ Execute send-notification       │          │          │
   │        │           ├────────────────────────────────────────────►          │
   │        │           │          │          │           │          │          │
   │        │           │          │          │           │ Send email via Gmail│
   │        │           │          │          │           │          ├───┐      │
   │        │           │          │          │           │          │   │      │
   │        │           │          │          │           │          │◄──┘      │
   │        │           │          │          │           │          │          │
   │        │           │ {sent: true}        │           │          │          │
   │        │           │◄───────────────────────────────────────────┤          │
   │        │           │          │          │           │          │          │
   │        │           │ Log action 3 success │          │          │          │
   │        │           ├─────────────────────────────────┴──────────┴─────────►│
   │        │           │          │          │           │          │          │
   │        │           │ Log execution complete          │          │          │
   │        │           ├─────────────────────────────────┴──────────┴─────────►│
   │        │           │          │          │           │          │          │
   │        │ Execution successful │          │           │          │          │
   │        │◄──────────┤          │          │           │          │          │
   │        │           │          │          │           │          │          │
   │ Workflow completed │          │          │           │          │          │
   │◄───────┤           │          │          │           │          │          │
   │        │           │          │          │           │          │          │
   ▼        ▼           ▼          ▼          ▼           ▼          ▼          ▼
```

### Retry Logic Flow

How workflows handle failures with exponential backoff.

```
                      ┌──────────────┐
                      │ Start Action │
                      └──────┬───────┘
                             │
                             ▼
                      ┌──────────────┐
                      │   Execute    │
                      │    Action    │
                      └──────┬───────┘
                             │
                             │ Action Complete
                             │
                             ▼
                      ┌──────────────┐
                      │ Check Result │
                      └──┬───────┬───┘
                         │       │
                   ✓ Success   ✗ Error
                         │       │
                         │       ▼
                         │  ┌──────────────┐
                         │  │    Check     │
                         │  │  Retryable?  │
                         │  └──┬───────┬───┘
                         │     │       │
               Not Retryable   │       │ Retryable
                         │     │       │
                         │     ▼       ▼
                         │  ┌────────┐ ┌──────────────┐
                         │  │Permanent││    Check     │
                         │  │ Error  │ │   Attempts   │
                         │  └────┬───┘ └──┬───────┬───┘
                         │       │        │       │
                         │       │  Attempts   Attempts
                         │       │  < Max      >= Max
                         │       │        │       │
                         │       │        ▼       ▼
                         │       │   ┌────────┐ ┌────────────┐
                         │       │   │ Retry  │ │Max Retries │
                         │       │   │        │ │ Exceeded   │
                         │       │   └───┬────┘ └──────┬─────┘
                         │       │       │             │
                         │       │       │ Calculate   │
                         │       │       │ Delay       │
                         │       │       │             │
                         │       │       ▼             │
                         │       │   ┌────────┐        │
                         │       │   │Backoff │        │
                         │       │   │        │        │
                         │       │   │NOTE:   │        │
                         │       │   │Exp.    │        │
                         │       │   │Backoff:│        │
                         │       │   │1: 1s   │        │
                         │       │   │2: 2s   │        │
                         │       │   │3: 4s   │        │
                         │       │   └───┬────┘        │
                         │       │       │             │
                         │       │       │ Wait N seconds
                         │       │       │             │
                         │       │       ▼             │
                         │       │   ┌────────┐        │
                         │       │   │  Wait  │        │
                         │       │   └───┬────┘        │
                         │       │       │             │
                         │       │       │ Retry       │
                         │       │       │             │
                         │       │       └──────┐      │
                         │       │              │      │
                         │       └──────────────┼──────┤
                         │                      │      │
                         ▼                      ▼      ▼
                   ┌──────────┐          ┌──────────────┐
                   │  Next    │          │   Workflow   │
                   │  Action  │          │    Failed    │
                   │(Continue)│          └──────┬───────┘
                   └────┬─────┘                 │
                        │                       │
                        └───────────┬───────────┘
                                    │
                                    ▼
                                   END

RETRY BEHAVIOR:
• Success → Continue to next action in workflow
• Permanent Error → Immediately fail workflow
• Transient Error + Retries Available → Retry with backoff
• Max Retries Exceeded → Fail workflow
```

---

## Authentication Flow

### OAuth 2.0 Authentication Flow

Complete OAuth flow from initial setup to API request with token refresh.

```
  User   setup-auth.ts  Browser   Google    File      MCP     Google
                                   OAuth     System            APIs
   │          │            │         │         │        │        │
   ├────────────── INITIAL AUTHENTICATION ────────────────────────┤
   │          │            │         │         │        │        │
   │ npm run setup-auth    │         │         │        │        │
   ├─────────►│            │         │         │        │        │
   │          │            │         │         │        │        │
   │          │ Read credentials.json          │        │        │
   │          ├────────────────────────────────►        │        │
   │          │            │         │         │        │        │
   │          │ Client ID & Secret   │         │        │        │
   │          │◄───────────────────────────────┤        │        │
   │          │            │         │         │        │        │
   │          │ Generate authorization URL     │        │        │
   │          ├───────────────────────►        │        │        │
   │          │            │         │         │        │        │
   │          │ Auth URL   │         │         │        │        │
   │          │◄───────────────────────        │        │        │
   │          │            │         │         │        │        │
   │          │ Open auth URL        │         │        │        │
   │          ├───────────►│         │         │        │        │
   │          │            │         │         │        │        │
   │          │            │ User login & authorize     │        │
   │          │            ├────────►│         │        │        │
   │          │            │         │         │        │        │
   │          │            │ Authorization code         │        │
   │          │            │◄────────┤         │        │        │
   │          │            │         │         │        │        │
   │ Display code          │         │         │        │        │
   │◄──────────────────────┤         │         │        │        │
   │          │            │         │         │        │        │
   │ Paste code            │         │         │        │        │
   ├─────────►│            │         │         │        │        │
   │          │            │         │         │        │        │
   │          │ Exchange code for tokens       │        │        │
   │          ├───────────────────────►        │        │        │
   │          │            │         │         │        │        │
   │          │ {access_token,       │         │        │        │
   │          │  refresh_token,      │         │        │        │
   │          │  expiry_date}        │         │        │        │
   │          │◄───────────────────────        │        │        │
   │          │            │         │         │        │        │
   │          │ Save token.json      │         │        │        │
   │          ├────────────────────────────────►        │        │
   │          │            │         │         │        │        │
   │          │ Saved      │         │         │        │        │
   │          │◄───────────────────────────────┤        │        │
   │          │            │         │         │        │        │
   │ ✓ Authentication complete!      │         │        │        │
   │◄─────────┤            │         │         │        │        │
   │          │            │         │         │        │        │
   │          │            │         │         │        │        │
   ├────────────── MAKING API REQUESTS ──────────────────────────┤
   │          │            │         │         │        │        │
   │ Use Gmail tool        │         │         │        │        │
   ├───────────────────────────────────────────────────►│        │
   │          │            │         │         │        │        │
   │          │            │         │         │ Load token.json │
   │          │            │         │         │◄───────┤        │
   │          │            │         │         │        │        │
   │          │            │         │         │ Tokens │        │
   │          │            │         │         ├───────►│        │
   │          │            │         │         │        │        │
   │          │            │         │         │ Check token expiry
   │          │            │         │         │        ├───┐    │
   │          │            │         │         │        │   │    │
   │          │            │         │         │        │◄──┘    │
   │          │            │         │         │        │        │
   │          │            │         │         │ ══ IF TOKEN VALID ══
   │          │            │         │         │        │        │
   │          │            │         │         │ API request with access_token
   │          │            │         │         │        ├───────►│
   │          │            │         │         │        │        │
   │          │            │         │         │ Response        │
   │          │            │         │         │        │◄───────┤
   │          │            │         │         │        │        │
   │ Result   │            │         │         │        │        │
   │◄───────────────────────────────────────────────────┤        │
   │          │            │         │         │        │        │
   │          │            │         │         │ ══ IF TOKEN EXPIRED ══
   │          │            │         │         │        │        │
   │          │            │         │ Refresh token request     │
   │          │            │         │◄─────────────────┤        │
   │          │            │         │         │        │        │
   │          │            │         │ New access_token │        │
   │          │            │         ├─────────────────►│        │
   │          │            │         │         │        │        │
   │          │            │         │         │ Update token.json
   │          │            │         │         │◄───────┤        │
   │          │            │         │         │        │        │
   │          │            │         │         │ Updated│        │
   │          │            │         │         ├───────►│        │
   │          │            │         │         │        │        │
   │          │            │         │         │ API request with new token
   │          │            │         │         │        ├───────►│
   │          │            │         │         │        │        │
   │          │            │         │         │ Response        │
   │          │            │         │         │        │◄───────┤
   │          │            │         │         │        │        │
   │ Result   │            │         │         │        │        │
   │◄───────────────────────────────────────────────────┤        │
   │          │            │         │         │        │        │
   ▼          ▼            ▼         ▼         ▼        ▼        ▼
```

---

## Integration Patterns

### Google API Integration Pattern

Common pattern used across all Google Workspace integrations.

```
                    ┌──────────────┐
                    │ MCP Tool Call│
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Load OAuth   │
                    │    Tokens    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Create API   │
                    │   Client     │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Validate    │
                    │  Parameters  │
                    └──┬───────┬───┘
                       │       │
                 Invalid│       │Valid
                       │       │
                       ▼       ▼
                 ┌────────┐ ┌──────────────┐
                 │ Return │ │ Call Google  │
                 │ Error  │ │     API      │
                 └───┬────┘ └──┬───────────┘
                     │         │
                     │         │ ┌────────────────────────┐
                     │         ├─┤  Success               │
                     │         │ └────────────────────────┘
                     │         │ ┌────────────────────────┐
                     │         ├─┤  401 Auth Error        │
                     │         │ └────────────────────────┘
                     │         │ ┌────────────────────────┐
                     │         ├─┤  429 Rate Limit        │
                     │         │ └────────────────────────┘
                     │         │ ┌────────────────────────┐
                     │         ├─┤  500 Server Error      │
                     │         │ └────────────────────────┘
                     │         │ ┌────────────────────────┐
                     │         └─┤  Other Error           │
                     │           └────────────────────────┘
                     │         │     │       │       │       │
                     │    Success   401    429     500    Other
                     │         │     │       │       │       │
                     │         ▼     ▼       ▼       ▼       ▼
                     │   ┌────────┐ ┌──────┐ ┌─────┐ ┌────┐ ┌────┐
                     │   │Transform││Refresh││Back-│ │Retry││Err-│
                     │   │Response│ │Token │ │ off │ │Req.│ │ or │
                     │   └───┬────┘ └───┬──┘ └──┬──┘ └─┬──┘ └─┬──┘
                     │       │          │       │      │      │
                     │       │          └───────┴──────┴──────┘
                     │       │                  │
                     │       │            Retry to API
                     │       │                  │
                     │       │                  └──────► (Back to Call Google API)
                     │       │
                     │       ▼
                     │  ┌──────────────┐
                     └─►│ Return to    │
                        │     MCP      │
                        └──────────────┘

ERROR HANDLING:
• 401 Auth Error → Refresh token and retry
• 429 Rate Limit → Exponential backoff and retry
• 500 Server Error → Retry request
• Other Errors → Return error to MCP
• Invalid Parameters → Immediate error return
```

---

## Performance Optimization

### Caching Strategy

```
                     ┌──────────────┐
                     │ API Request  │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  In Cache?   │
                     └──┬───────┬───┘
                        │       │
                   Hit  │       │ Miss
                        │       │
                        ▼       ▼
                ┌───────────┐  ┌──────────────┐
                │  Return   │  │ Call Google  │
                │  Cached   │  │     API      │
                └───────────┘  └──────┬───────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │  Store in    │
                               │    Cache     │
                               └──────┬───────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │ Return Fresh │
                               │     Data     │
                               └──────────────┘

CACHE LAYERS (Hierarchical):
┌─────────────────────────────────────────────────┐
│ Layer 1: IN-MEMORY (Fast Access)                │
│   - Active data                                 │
│   - Cleared on restart                          │
├─────────────────────────────────────────────────┤
│ Layer 2: TIME-BASED (TTL: 5 minutes)            │
│   - Temporary data                              │
│   - Auto-expires                                │
├─────────────────────────────────────────────────┤
│ Layer 3: PERMANENT (No expiration)              │
│   - Folder IDs                                  │
│   - Structure data                              │
└─────────────────────────────────────────────────┘

CACHE FLOW:
Cache Check → Memory → Timed → Permanent → Miss (API Call)
```

### Batch Operations Flow

```
  User        MCP       Batch      Google Sheets
                       Handler         API
    │           │          │             │
    │ Multiple sheet updates             │
    ├──────────►│          │             │
    │           │          │             │
    │           │ Collect operations     │
    │           ├─────────►│             │
    │           │          │             │
    │           │          │ Batch Operations:
    │           │          │ 1. Update A1:B1
    │           │          │ 2. Format C1:D10
    │           │          │ 3. Append row
    │           │          │             │
    │           │          │ sheets_batch_update([
    │           │          │   updateCells,
    │           │          │   repeatCell,
    │           │          │   appendDimension
    │           │          │ ])          │
    │           │          ├────────────►│
    │           │          │             │
    │           │          │    ┌────────┴────────┐
    │           │          │    │ Single API Call │
    │           │          │    └────────┬────────┘
    │           │          │             │
    │           │          │ Batch response
    │           │          │◄────────────┤
    │           │          │             │
    │           │          │ Parse individual results
    │           │          ├───┐         │
    │           │          │   │         │
    │           │          │◄──┘         │
    │           │          │             │
    │           │ All operations complete│
    │           │◄─────────┤             │
    │           │          │             │
    │ Success   │          │             │
    │◄──────────┤          │             │
    │           │          │             │
    ▼           ▼          ▼             ▼

PERFORMANCE BENEFIT:
┌───────────────────────────────────────────────┐
│ Without Batching: 3 API calls                 │
│ With Batching:    1 API call                  │
│                                               │
│ 3 operations → 1 API call = 66% reduction     │
│                                               │
│ Benefits:                                     │
│ • Reduced latency                             │
│ • Lower quota usage                           │
│ • Better atomicity                            │
└───────────────────────────────────────────────┘
```

---

## Related Documentation

- **[Architecture Overview](overview.md)** - System architecture
- **[LLM Router](llm-router.md)** - Multi-provider routing
- **[Workflows](workflows.md)** - Workflow automation
- **[API Reference](../api-reference/index.md)** - Tool documentation

---

**These data flows demonstrate the sophisticated processing pipelines that power the Google Workspace MCP server's 100+ tools.**
