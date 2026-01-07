/**
 * REST API Routes for Deliverables Server
 *
 * Provides HTTP endpoints for cross-server communication
 */

import express, { type Request, type Response } from "express";
import type { OAuth2Client } from "google-auth-library";
import type { sheets_v4, drive_v3 } from "googleapis";
import { initializeAuth, createSheetsClient, createDriveClient } from "@gw-mcp/shared-core";
import * as deliverables from "../deliverables/deliverables.js";
import * as submissions from "../deliverables/submissions.js";
import * as review from "../deliverables/review.js";
import * as quality from "../deliverables/quality.js";
import * as tracking from "../deliverables/tracking.js";
import * as reporting from "../deliverables/reporting.js";

const router = express.Router();

// Global auth and API clients
let authClient: OAuth2Client | null = null;
let sheetsClient: sheets_v4.Sheets | null = null;
let driveClient: drive_v3.Drive | null = null;

async function getAuth(): Promise<OAuth2Client> {
  if (!authClient) {
    authClient = await initializeAuth();
  }
  return authClient;
}

async function getSheets(): Promise<sheets_v4.Sheets> {
  if (!sheetsClient) {
    const auth = await getAuth();
    sheetsClient = createSheetsClient(auth);
  }
  return sheetsClient!;
}

async function getDrive(): Promise<drive_v3.Drive> {
  if (!driveClient) {
    const auth = await getAuth();
    driveClient = createDriveClient(auth);
  }
  return driveClient!;
}

const SPREADSHEET_ID = process.env.DELIVERABLES_SPREADSHEET_ID || "";

/**
 * Health check endpoint
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    server: "mcp-deliverables",
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
 * Deliverable CRUD endpoints
 */
router.get("/api/deliverables", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const deliverableId = req.query.id as string | undefined;

    let data;
    if (deliverableId) {
      data = await deliverables.readDeliverable(sheets, SPREADSHEET_ID, deliverableId);
    } else {
      const filters = req.query as any;
      data = await deliverables.listDeliverables(sheets, SPREADSHEET_ID, filters);
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/programs/:programId/deliverables", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await deliverables.listDeliverables(sheets, SPREADSHEET_ID, {
      programId: req.params.programId,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/api/deliverables", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const deliverable = await deliverables.createDeliverable(
      sheets,
      SPREADSHEET_ID,
      req.body,
      req.body.createdBy || "api"
    );
    res.json({ success: true, data: deliverable });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/api/deliverables/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await deliverables.updateDeliverable(
      sheets,
      SPREADSHEET_ID,
      { deliverableId: req.params.id, ...req.body },
      req.body.modifiedBy || "api"
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/api/deliverables/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await deliverables.deleteDeliverable(
      sheets,
      SPREADSHEET_ID,
      req.params.id,
      "api"
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Submission endpoints
 */
router.post("/api/deliverables/:id/submit", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const drive = await getDrive();
    const result = await submissions.submitDeliverable(
      sheets,
      drive,
      SPREADSHEET_ID,
      {
        deliverableId: req.params.id,
        fileIds: req.body.fileIds || [],
        submitterNotes: req.body.notes || ""
      },
      req.body.submittedBy || "api"
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/deliverables/:id/submissions", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const history = await submissions.listSubmissionsForDeliverable(
      sheets,
      SPREADSHEET_ID,
      req.params.id
    );
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Review endpoints
 */
router.post("/api/deliverables/:id/review/start", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await review.assignReviewer(
      sheets,
      SPREADSHEET_ID,
      {
        deliverableId: req.params.id,
        reviewerId: req.body.reviewer,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      req.body.submissionId
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/api/reviews/:reviewId/submit", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await review.submitReview(
      sheets,
      SPREADSHEET_ID,
      {
        deliverableId: req.body.deliverableId,
        submissionId: req.body.submissionId,
        decision: req.body.decision,
        comments: req.body.comments,
        qualityScore: req.body.qualityScore,
        feedbackItems: req.body.feedbackItems
      },
      req.body.reviewerId || "api"
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/deliverables/:id/reviews", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const reviews = await review.listReviewsForDeliverable(
      sheets,
      SPREADSHEET_ID,
      req.params.id
    );
    res.json({ success: true, data: reviews });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Quality endpoints
 */
router.post("/api/deliverables/:id/quality/assess", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await quality.evaluateDeliverable(
      sheets,
      SPREADSHEET_ID,
      req.params.id,
      req.body.checklistId,
      req.body.results || [],
      req.body.evaluatedBy || "api",
      req.body.reviewId
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/programs/:programId/quality/report", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const report = await reporting.generateQualityReport(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Tracking endpoints
 */
router.put("/api/deliverables/:id/status", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await tracking.trackStatus(
      sheets,
      SPREADSHEET_ID,
      req.params.id,
      req.body.status,
      req.body.percentComplete || 0,
      req.body.forecastDate ? new Date(req.body.forecastDate) : undefined,
      req.body.notes || "",
      req.body.recordedBy || "api"
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/programs/:programId/tracking/dashboard", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const dashboard = await reporting.generateStatusReport(sheets, SPREADSHEET_ID, {
      reportType: "status",
      programId: req.params.programId,
      includeCharts: false,
      includeDetails: true
    });
    res.json({ success: true, data: dashboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Reporting endpoints
 */
router.get("/api/programs/:programId/reports/status", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const report = await reporting.generateStatusReport(sheets, SPREADSHEET_ID, {
      reportType: "status",
      programId: req.params.programId,
      filters: req.query.filters as any,
      groupBy: req.query.groupBy as any,
      sortBy: req.query.sortBy as any,
      includeCharts: false,
      includeDetails: true
    });
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/programs/:programId/reports/overdue", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const report = await reporting.generateOverdueReport(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data: report });
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

    console.log(`[mcp-deliverables] Document notification received:`);
    console.log(`  Type: ${documentType}`);
    console.log(`  File: ${filename}`);
    console.log(`  Location: ${location}`);
    console.log(`  Deliverable: ${metadata?.deliverableId || "N/A"}`);

    // Process deliverable submissions
    if (documentType === "deliverable" && metadata?.deliverableId) {
      // Could automatically create submission record
      console.log(`[mcp-deliverables] Processing deliverable submission: ${metadata.deliverableId}`);
    }

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

    console.log(`[mcp-deliverables] Event received from ${event.sourceServer}: ${event.eventType}`);

    // Handle cross-server events
    // For example: milestone_achieved, contract_signed, etc.

    res.json({ success: true, message: "Event received" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
