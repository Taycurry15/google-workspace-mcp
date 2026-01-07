/**
 * REST API Routes for Compliance & Risk Server
 */

import express, { type Request, type Response } from "express";
import { initializeAuth } from "@gw-mcp/shared-core";
import type { OAuth2Client } from "google-auth-library";
import * as risks from "../risks/index.js";
import * as compliance from "../compliance/index.js";
import * as fcpa from "../fcpa/index.js";
import * as audit from "../audit/index.js";

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
    server: "mcp-compliance",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Risk endpoints
router.get("/api/programs/:programId/risks", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const risksData = await risks.readRisks(auth, req.params.programId, req.query);
    res.json({ success: true, data: risksData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/api/risks", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const risk = await risks.createRisk(auth, process.env.COMPLIANCE_SPREADSHEET_ID || "", req.body);
    res.json({ success: true, data: risk });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Compliance endpoints
router.get("/api/programs/:programId/compliance/requirements", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const requirements = await compliance.getComplianceRequirements(auth, req.params.programId, req.query);
    res.json({ success: true, data: requirements });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/api/compliance/requirements", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const requirement = await compliance.createComplianceRequirement(auth, {
      ...req.body,
      dueDate: new Date(req.body.dueDate),
    });
    res.json({ success: true, data: requirement });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// FCPA endpoints
router.post("/api/fcpa/transactions", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const transaction = await fcpa.logFCPATransaction(auth, {
      ...req.body,
      date: new Date(req.body.date),
    });
    res.json({ success: true, data: transaction });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Audit endpoints
router.post("/api/audit/log", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    await audit.logAudit(auth, req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/audit/trail/:entityId", async (req: Request, res: Response) => {
  try {
    const auth = await getAuth();
    const trail = await audit.getAuditTrail(auth, req.params.entityId);
    res.json({ success: true, data: trail });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Document and event notification endpoints
router.post("/api/documents/notify", async (req: Request, res: Response) => {
  try {
    console.log("[mcp-compliance] Document notification received");
    res.json({ success: true, message: "Document notification received" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/api/events/receive", async (req: Request, res: Response) => {
  try {
    console.log("[mcp-compliance] Event received");
    res.json({ success: true, message: "Event received" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
