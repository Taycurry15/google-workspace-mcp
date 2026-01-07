/**
 * REST API Routes for Program Management Server
 *
 * Provides HTTP endpoints for cross-server communication
 */

import express, { type Request, type Response } from "express";
import { initializeAuth } from "@gw-mcp/shared-core";
import type { OAuth2Client } from "google-auth-library";
import * as charter from "../program/charter.js";
import * as wbs from "../program/wbs.js";
import * as milestones from "../program/milestones.js";
import * as schedule from "../program/schedule.js";
import * as issueLog from "../program/issue-log.js";
import * as decisionLog from "../program/decision-log.js";
import * as changeControl from "../program/change-control.js";
import * as lessons from "../program/lessons.js";
import * as governance from "../program/governance.js";

const router = express.Router();

// Global auth client
let authClient: OAuth2Client | null = null;

async function getAuth(): Promise<OAuth2Client> {
  if (!authClient) {
    authClient = await initializeAuth();
  }
  return authClient;
}

/**
 * Health check endpoint
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    server: "mcp-program",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    dependencies: {
      sheets: "healthy",
      drive: "healthy",
      eventBus: "healthy",
    },
  });
});

/**
 * Program Charter endpoints
 */
router.get("/api/programs/:programId/charter", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const charterData = await charter.readCharter(auth, req.params.programId);
    res.json({ success: true, data: charterData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/api/programs/charter", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const result = await charter.createCharter(auth, req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Milestone endpoints
 */
router.get("/api/programs/:programId/milestones", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.critical) filters.critical = req.query.critical === "true";
    if (req.query.upcoming) filters.upcoming = req.query.upcoming === "true";

    const milestonesData = await milestones.getMilestones(auth, req.params.programId, filters);
    res.json({ success: true, data: milestonesData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/api/milestones", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const milestone = await milestones.createMilestone(auth, req.body);
    res.json({ success: true, data: milestone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/api/milestones/:milestoneId", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const result = await milestones.trackMilestone(auth, req.params.milestoneId, req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Schedule endpoints
 */
router.get("/api/programs/:programId/schedule", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const filters: any = { programId: req.params.programId };
    if (req.query.status) filters.status = req.query.status;
    if (req.query.criticalPath) filters.criticalPath = req.query.criticalPath === "true";

    const activities = await schedule.listScheduleActivities(auth, filters);
    res.json({ success: true, data: activities });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/api/schedule/activities", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const activity = await schedule.createScheduleActivity(auth, req.body);
    res.json({ success: true, data: activity });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Issue Log endpoints
 */
router.get("/api/programs/:programId/issues", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.priority) filters.priority = req.query.priority;

    const issues = await issueLog.getIssues(auth, req.params.programId, filters);
    res.json({ success: true, data: issues });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/api/issues", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const issue = await issueLog.logIssue(auth, req.body);
    res.json({ success: true, data: issue });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Change Control endpoints
 */
router.get("/api/programs/:programId/changes", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const filters: any = { programId: req.params.programId };
    if (req.query.status) filters.status = req.query.status;

    const changes = await changeControl.listChangeRequests(auth, filters);
    res.json({ success: true, data: changes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/api/changes", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const change = await changeControl.createChangeRequest(auth, req.body);
    res.json({ success: true, data: change });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/api/changes/:changeId/review", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const { decision, approver, comments } = req.body;
    const result = await changeControl.reviewChangeRequest(
      auth,
      req.params.changeId,
      decision,
      approver,
      comments
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Lessons Learned endpoints
 */
router.get("/api/lessons", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const filters: any = {};
    if (req.query.programId) filters.programId = req.query.programId;
    if (req.query.category) filters.category = req.query.category;
    if (req.query.searchTerm) filters.searchTerm = req.query.searchTerm;
    if (req.query.tags) filters.tags = (req.query.tags as string).split(",");

    const lessonsData = await lessons.searchLessons(auth, filters);
    res.json({ success: true, data: lessonsData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/api/lessons", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const lesson = await lessons.captureLessonLearned(auth, req.body);
    res.json({ success: true, data: lesson });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Governance endpoints
 */
router.post("/api/governance/meetings", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const meeting = await governance.scheduleGovernanceMeeting(auth, req.body);
    res.json({ success: true, data: meeting });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/api/governance/meetings/:meetingId/minutes", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const result = await governance.recordGovernanceMinutes(auth, req.params.meetingId, req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/api/governance/action-items", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const { meetingId, programId, description, owner, dueDate } = req.body;
    const actionItem = await governance.createActionItem(auth, meetingId, programId, {
      description,
      owner,
      dueDate: new Date(dueDate),
    });
    res.json({ success: true, data: actionItem });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Document notification endpoint (for document routing)
 */
router.post("/api/documents/notify", async (req: Request, res: Response) => {
  try {
    const { documentId, filename, location, documentType, metadata } = req.body;

    console.log(`[mcp-program] Document notification received:`);
    console.log(`  Type: ${documentType}`);
    console.log(`  File: ${filename}`);
    console.log(`  Location: ${location}`);
    console.log(`  Program: ${metadata?.programId || "N/A"}`);

    // Process document based on type
    // For program_charter, proposal, meeting_minutes, etc.
    // Implementation depends on specific requirements

    res.json({ success: true, message: "Document notification received" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Event notification endpoint (for cross-server events)
 */
router.post("/api/events/receive", async (req: Request, res: Response) => {
  try {
    const event = req.body;

    console.log(`[mcp-program] Event received from ${event.sourceServer}: ${event.eventType}`);

    // Handle cross-server events
    // For example: deliverable_completed, contract_signed, etc.
    // Implementation depends on event handling logic

    res.json({ success: true, message: "Event received" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
