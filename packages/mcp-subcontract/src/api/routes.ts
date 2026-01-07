/**
 * REST API Routes for Subcontract Server
 *
 * Provides HTTP endpoints for cross-server communication
 */

import express, { type Request, type Response } from "express";
import type { OAuth2Client } from "google-auth-library";
import type { sheets_v4 } from "googleapis";
import { initializeAuth, createSheetsClient } from "@gw-mcp/shared-core";
import * as vendors from "../vendors/vendors.js";
import * as contacts from "../vendors/contacts.js";
import * as dueDiligence from "../vendors/due-diligence.js";
import * as contracts from "../contracts/contracts.js";
import * as sow from "../contracts/sow.js";
import * as modifications from "../contracts/modifications.js";
import * as invoices from "../invoices/invoices.js";
import * as processing from "../invoices/processing.js";
import * as lineItems from "../invoices/line-items.js";
import * as performanceTracking from "../performance/tracking.js";
import * as performanceScoring from "../performance/scoring.js";
import * as performanceReporting from "../performance/reporting.js";

const router = express.Router();

// Global auth and API clients
let authClient: OAuth2Client | null = null;
let sheetsClient: sheets_v4.Sheets | null = null;

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

const SPREADSHEET_ID = process.env.SUBCONTRACT_SPREADSHEET_ID || "";

/**
 * Health check endpoint
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    server: "mcp-subcontract",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    dependencies: {
      sheets: "healthy",
      eventBus: "healthy",
    },
  });
});

/**
 * Vendor CRUD endpoints
 */
router.get("/api/vendors", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const vendorId = req.query.id as string | undefined;

    let data;
    if (vendorId) {
      data = await vendors.readVendor(sheets, SPREADSHEET_ID, vendorId);
    } else {
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.category) filters.category = req.query.category;
      if (req.query.smallBusiness !== undefined) {
        filters.smallBusiness = req.query.smallBusiness === "true";
      }
      data = await vendors.listVendors(sheets, SPREADSHEET_ID, filters);
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/vendors/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await vendors.readVendor(sheets, SPREADSHEET_ID, req.params.id);

    if (!data) {
      res.status(404).json({ success: false, error: "Vendor not found" });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/api/vendors", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const vendor = await vendors.createVendor(
      sheets,
      SPREADSHEET_ID,
      req.body,
      req.body.createdBy || "api"
    );
    res.json({ success: true, data: vendor });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/api/vendors/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await vendors.updateVendor(
      sheets,
      SPREADSHEET_ID,
      { vendorId: req.params.id, ...req.body },
      req.body.modifiedBy || "api"
    );

    if (!result) {
      res.status(404).json({ success: false, error: "Vendor not found" });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/api/vendors/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await vendors.deleteVendor(
      sheets,
      SPREADSHEET_ID,
      req.params.id,
      "api"
    );
    res.json({ success: true, data: { deleted: result } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/vendors/due-diligence", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const daysAhead = req.query.daysAhead
      ? parseInt(req.query.daysAhead as string, 10)
      : 90;
    const data = await vendors.getVendorsNeedingDueDiligence(
      sheets,
      SPREADSHEET_ID,
      daysAhead
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Contact endpoints
 */
router.post("/api/vendors/:vendorId/contacts", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const contact = await contacts.createContact(sheets, SPREADSHEET_ID, {
      vendorId: req.params.vendorId,
      ...req.body,
    });
    res.json({ success: true, data: contact });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/vendors/:vendorId/contacts", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await contacts.listContactsForVendor(
      sheets,
      SPREADSHEET_ID,
      req.params.vendorId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/api/contacts/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await contacts.updateContact(sheets, SPREADSHEET_ID, {
      contactId: req.params.id,
      ...req.body,
    });

    if (!result) {
      res.status(404).json({ success: false, error: "Contact not found" });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/api/contacts/:id/set-primary", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await contacts.setPrimaryContact(
      sheets,
      SPREADSHEET_ID,
      req.params.id
    );

    if (!result) {
      res.status(404).json({ success: false, error: "Contact not found" });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Contract CRUD endpoints
 */
router.get("/api/contracts", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const contractId = req.query.id as string | undefined;

    let data;
    if (contractId) {
      data = await contracts.readContract(sheets, SPREADSHEET_ID, contractId);
    } else {
      const filters: any = {};
      if (req.query.vendorId) filters.vendorId = req.query.vendorId;
      if (req.query.programId) filters.programId = req.query.programId;
      if (req.query.status) filters.status = req.query.status;
      if (req.query.type) filters.type = req.query.type;
      data = await contracts.listContracts(sheets, SPREADSHEET_ID, filters);
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/contracts/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await contracts.readContract(sheets, SPREADSHEET_ID, req.params.id);

    if (!data) {
      res.status(404).json({ success: false, error: "Contract not found" });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/programs/:programId/contracts", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await contracts.listContracts(sheets, SPREADSHEET_ID, {
      programId: req.params.programId,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/api/contracts", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const contract = await contracts.createContract(
      sheets,
      SPREADSHEET_ID,
      req.body,
      req.body.createdBy || "api"
    );
    res.json({ success: true, data: contract });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/api/contracts/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await contracts.updateContract(
      sheets,
      SPREADSHEET_ID,
      { contractId: req.params.id, ...req.body },
      req.body.modifiedBy || "api"
    );

    if (!result) {
      res.status(404).json({ success: false, error: "Contract not found" });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/api/contracts/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await contracts.deleteContract(
      sheets,
      SPREADSHEET_ID,
      req.params.id,
      "api"
    );
    res.json({ success: true, data: { deleted: result } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/contracts/expiring", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const daysAhead = req.query.daysAhead
      ? parseInt(req.query.daysAhead as string, 10)
      : 90;
    const data = await contracts.getExpiringContracts(
      sheets,
      SPREADSHEET_ID,
      daysAhead
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * SOW Deliverable endpoints
 */
router.post("/api/contracts/:contractId/deliverables", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await sow.linkDeliverableToContract(
      sheets,
      SPREADSHEET_ID,
      req.params.contractId,
      req.body.deliverableId,
      req.body.programId,
      req.body.description,
      new Date(req.body.dueDate),
      req.body.acceptanceCriteria
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/contracts/:contractId/deliverables", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await sow.getContractDeliverables(
      sheets,
      SPREADSHEET_ID,
      req.params.contractId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/api/sow/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await sow.updateSOWDeliverable(
      sheets,
      SPREADSHEET_ID,
      req.params.id,
      req.body.status,
      req.body.qualityScore,
      req.body.reviewNotes
    );

    if (!result) {
      res.status(404).json({ success: false, error: "SOW deliverable not found" });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Modification endpoints
 */
router.post("/api/contracts/:contractId/modifications", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await modifications.createModification(
      sheets,
      SPREADSHEET_ID,
      {
        contractId: req.params.contractId,
        ...req.body,
        dateChange: req.body.dateChange
          ? {
              newEndDate: new Date(req.body.dateChange.newEndDate),
            }
          : undefined,
      },
      req.body.requestedBy || "api"
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/contracts/:contractId/modifications", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await modifications.listModifications(
      sheets,
      SPREADSHEET_ID,
      req.params.contractId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/api/modifications/:id/approve", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await modifications.approveModification(
      sheets,
      SPREADSHEET_ID,
      req.params.id,
      req.body.approvedBy || "api",
      req.body.effectiveDate ? new Date(req.body.effectiveDate) : undefined
    );

    if (!result) {
      res.status(404).json({ success: false, error: "Modification not found" });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Invoice endpoints
 */
router.post("/api/invoices", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const invoice = await invoices.createInvoice(
      sheets,
      SPREADSHEET_ID,
      req.body,
      req.body.createdBy || "api"
    );
    res.json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/invoices/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await invoices.readInvoice(sheets, SPREADSHEET_ID, req.params.id);

    if (!data) {
      res.status(404).json({ success: false, error: "Invoice not found" });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/contracts/:contractId/invoices", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await invoices.listInvoices(
      sheets,
      SPREADSHEET_ID,
      { contractId: req.params.contractId }
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/api/invoices/:id/submit", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await processing.submitForApproval(
      sheets,
      SPREADSHEET_ID,
      req.params.id,
      req.body.submittedBy || "api"
    );

    if (!result) {
      res.status(404).json({ success: false, error: "Invoice not found" });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/api/invoices/:id/approve", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await processing.approveInvoice(
      sheets,
      SPREADSHEET_ID,
      req.params.id,
      req.body.approvedBy || "api",
      req.body.notes
    );

    if (!result) {
      res.status(404).json({ success: false, error: "Invoice not found" });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/api/invoices/:id/line-items", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const lineItem = await lineItems.createLineItem(
      sheets,
      SPREADSHEET_ID,
      {
        invoiceId: req.params.id,
        ...req.body,
      },
      req.body.createdBy || "api"
    );
    res.json({ success: true, data: lineItem });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/invoices/:id/line-items", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await lineItems.listLineItemsForInvoice(
      sheets,
      SPREADSHEET_ID,
      req.params.id
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Performance endpoints
 */
router.post("/api/vendors/:vendorId/performance", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const metricType = req.body.metricType;
    let metric;

    if (metricType === "delivery") {
      metric = await performanceTracking.recordDeliveryMetric(
        sheets,
        SPREADSHEET_ID,
        {
          vendorId: req.params.vendorId,
          contractId: req.body.contractId,
          programId: req.body.programId,
          deliverableId: req.body.deliverableId,
          dueDate: new Date(req.body.dueDate),
          actualDate: new Date(req.body.actualDate),
          target: req.body.target,
        },
        req.body.recordedBy || "api"
      );
    } else if (metricType === "quality") {
      metric = await performanceTracking.recordQualityMetric(
        sheets,
        SPREADSHEET_ID,
        {
          vendorId: req.params.vendorId,
          contractId: req.body.contractId,
          programId: req.body.programId,
          deliverableId: req.body.deliverableId,
          score: req.body.score,
          target: req.body.target,
        },
        req.body.recordedBy || "api"
      );
    } else if (metricType === "cost") {
      metric = await performanceTracking.recordCostMetric(
        sheets,
        SPREADSHEET_ID,
        {
          vendorId: req.params.vendorId,
          contractId: req.body.contractId,
          programId: req.body.programId,
          deliverableId: req.body.deliverableId,
          budgeted: req.body.budgeted,
          actual: req.body.actual,
        },
        req.body.recordedBy || "api"
      );
    } else {
      res.status(400).json({ success: false, error: "Invalid metricType. Must be delivery, quality, or cost." });
      return;
    }

    res.json({ success: true, data: metric });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/vendors/:vendorId/performance/score", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const periodMonths = req.query.periodMonths ? parseInt(req.query.periodMonths as string, 10) : undefined;
    const data = await performanceScoring.calculatePerformanceScore(
      sheets,
      SPREADSHEET_ID,
      req.params.vendorId,
      periodMonths
    );

    if (!data) {
      res.status(404).json({ success: false, error: "Vendor not found or no performance data" });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/vendors/:vendorId/scorecard", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const periodMonths = req.query.periodMonths ? parseInt(req.query.periodMonths as string, 10) : undefined;
    const data = await performanceReporting.generateVendorScorecard(
      sheets,
      SPREADSHEET_ID,
      req.params.vendorId,
      periodMonths
    );

    if (!data) {
      res.status(404).json({ success: false, error: "Vendor not found or no scorecard data" });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/vendors/performance/top", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const minScore = req.query.minScore ? parseFloat(req.query.minScore as string) : 80;
    const periodMonths = req.query.periodMonths ? parseInt(req.query.periodMonths as string, 10) : 12;
    const data = await performanceReporting.generateTopPerformersReport(
      sheets,
      SPREADSHEET_ID,
      limit,
      minScore,
      periodMonths
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/api/vendors/performance/underperformers", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const maxScore = req.query.maxScore ? parseFloat(req.query.maxScore as string) : 60;
    const periodMonths = req.query.periodMonths ? parseInt(req.query.periodMonths as string, 10) : 12;
    const data = await performanceReporting.generateUnderperformersReport(
      sheets,
      SPREADSHEET_ID,
      maxScore,
      periodMonths
    );
    res.json({ success: true, data });
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

    console.log(`[mcp-subcontract] Document notification received:`);
    console.log(`  Type: ${documentType}`);
    console.log(`  File: ${filename}`);
    console.log(`  Location: ${location}`);
    console.log(`  Contract: ${metadata?.contractId || "N/A"}`);
    console.log(`  Vendor: ${metadata?.vendorId || "N/A"}`);

    // Process contract documents
    if (documentType === "contract" && metadata?.contractId) {
      console.log(`[mcp-subcontract] Processing contract document: ${metadata.contractId}`);
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

    console.log(`[mcp-subcontract] Event received from ${event.sourceServer}: ${event.eventType}`);

    // Handle cross-server events
    // For example: program_created, deliverable_completed, etc.

    res.json({ success: true, message: "Event received" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
