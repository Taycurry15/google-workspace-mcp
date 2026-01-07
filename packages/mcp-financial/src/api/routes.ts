/**
 * REST API Routes for Financial Server
 *
 * Provides HTTP endpoints for cross-server communication
 * Week 14 - Budget and EVM endpoints
 * Week 15 - Cash Flow, Transactions, and Reporting endpoints
 */

import express, { type Request, type Response } from "express";
import type { OAuth2Client } from "google-auth-library";
import type { sheets_v4 } from "googleapis";
import { initializeAuth, createSheetsClient } from "@gw-mcp/shared-core";
import * as budgets from "../budgets/index.js";
import * as evm from "../evm/index.js";
import * as cashflow from "../cashflow/index.js";
import * as transactions from "../transactions/index.js";
import * as reporting from "../reporting/index.js";

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

const SPREADSHEET_ID = process.env.FINANCIAL_SPREADSHEET_ID || "";

/**
 * Health check endpoint
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    server: "mcp-financial",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    dependencies: {
      sheets: "healthy",
      eventBus: "healthy",
    },
  });
});

// ============================================================================
// BUDGET ENDPOINTS (14 endpoints)
// ============================================================================

/**
 * Create a new budget
 * POST /api/budgets
 */
router.post("/api/budgets", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const budget = await budgets.createBudget(
      sheets,
      SPREADSHEET_ID,
      {
        programId: req.body.programId,
        projectId: req.body.projectId,
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        allocated: req.body.allocated,
        fiscalYear: req.body.fiscalYear,
        periodStart: new Date(req.body.periodStart),
        periodEnd: new Date(req.body.periodEnd),
        requestedBy: req.body.requestedBy,
        approvedBy: req.body.approvedBy,
        approvedDate: req.body.approvedDate ? new Date(req.body.approvedDate) : undefined,
        currency: req.body.currency,
        notes: req.body.notes,
      },
      req.body.createdBy || "api"
    );
    res.json({ success: true, data: budget });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Read a budget by ID
 * GET /api/budgets/:id
 */
router.get("/api/budgets/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await budgets.readBudget(sheets, SPREADSHEET_ID, req.params.id);

    if (!data) {
      res.status(404).json({ success: false, error: "Budget not found" });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update a budget
 * PUT /api/budgets/:id
 */
router.put("/api/budgets/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await budgets.updateBudget(
      sheets,
      SPREADSHEET_ID,
      {
        budgetId: req.params.id,
        name: req.body.name,
        description: req.body.description,
        status: req.body.status,
        allocated: req.body.allocated,
        periodStart: req.body.periodStart ? new Date(req.body.periodStart) : undefined,
        periodEnd: req.body.periodEnd ? new Date(req.body.periodEnd) : undefined,
        approvedBy: req.body.approvedBy,
        approvedDate: req.body.approvedDate ? new Date(req.body.approvedDate) : undefined,
        notes: req.body.notes,
      },
      req.body.modifiedBy || "api"
    );

    if (!result) {
      res.status(404).json({ success: false, error: "Budget not found" });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Delete a budget (soft delete)
 * DELETE /api/budgets/:id
 */
router.delete("/api/budgets/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await budgets.deleteBudget(
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

/**
 * List budgets for a program
 * GET /api/programs/:programId/budgets
 */
router.get("/api/programs/:programId/budgets", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const filters: any = { programId: req.params.programId };

    if (req.query.status) filters.status = req.query.status;
    if (req.query.category) filters.category = req.query.category;
    if (req.query.fiscalYear) filters.fiscalYear = req.query.fiscalYear;

    const data = await budgets.listBudgets(sheets, SPREADSHEET_ID, filters);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Allocate budget amount
 * POST /api/budgets/:id/allocate
 */
router.post("/api/budgets/:id/allocate", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await budgets.allocateBudget(
      sheets,
      SPREADSHEET_ID,
      req.params.id,
      req.body.amount,
      req.body.allocatedBy || "api"
    );

    if (!result) {
      res.status(404).json({ success: false, error: "Budget not found" });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Commit budget amount
 * POST /api/budgets/:id/commit
 */
router.post("/api/budgets/:id/commit", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await budgets.commitBudget(
      sheets,
      SPREADSHEET_ID,
      req.params.id,
      req.body.amount,
      req.body.committedBy || "api"
    );

    if (!result) {
      res.status(404).json({ success: false, error: "Budget not found" });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Record an expense against a budget
 * POST /api/budgets/:id/expense
 */
router.post("/api/budgets/:id/expense", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await budgets.recordExpense(
      sheets,
      SPREADSHEET_ID,
      req.params.id,
      req.body.amount,
      req.body.description,
      req.body.recordedBy || "api"
    );

    if (!result) {
      res.status(404).json({ success: false, error: "Budget not found" });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get program budget status
 * GET /api/programs/:programId/budget/status
 */
router.get("/api/programs/:programId/budget/status", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await budgets.getBudgetStatus(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );

    if (!data) {
      res.status(404).json({ success: false, error: "Program budget status not found" });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create a budget category
 * POST /api/budgets/categories
 */
router.post("/api/budgets/categories", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const category = await budgets.createCategory(
      sheets,
      SPREADSHEET_ID,
      {
        name: req.body.name,
        code: req.body.code,
        type: req.body.type,
        description: req.body.description,
        parentCategoryId: req.body.parentCategoryId,
      },
      req.body.createdBy || "api"
    );
    res.json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * List all budget categories
 * GET /api/budgets/categories
 */
router.get("/api/budgets/categories", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const filters: any = {};

    if (req.query.parentCategoryId) {
      filters.parentCategoryId = req.query.parentCategoryId;
    }
    if (req.query.status) {
      filters.status = req.query.status;
    }

    const data = await budgets.listCategories(sheets, SPREADSHEET_ID, filters);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Reallocate budget between budgets
 * POST /api/budgets/reallocate
 */
router.post("/api/budgets/reallocate", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await budgets.reallocateBudget(
      sheets,
      SPREADSHEET_ID,
      req.body.fromBudgetId,
      req.body.toBudgetId,
      req.body.amount,
      req.body.reason,
      req.body.approvedBy || "api"
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get budget allocation summary for a program
 * GET /api/programs/:programId/budget/allocation-summary
 */
router.get("/api/programs/:programId/budget/allocation-summary", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await budgets.getBudgetAllocationSummary(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Calculate burn rate for a budget
 * GET /api/budgets/:id/burn-rate
 */
router.get("/api/budgets/:id/burn-rate", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();

    const data = await budgets.calculateBurnRate(
      sheets,
      SPREADSHEET_ID,
      req.params.id
    );

    if (!data) {
      res.status(404).json({ success: false, error: "Budget not found or insufficient data" });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// EVM ENDPOINTS (16 endpoints)
// ============================================================================

/**
 * Calculate EVM metrics for a program
 * POST /api/programs/:programId/evm/calculate
 */
router.post("/api/programs/:programId/evm/calculate", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const asOfDate = req.body.asOfDate ? new Date(req.body.asOfDate) : undefined;

    const data = await evm.performEVMCalculation(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      asOfDate
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create an EVM snapshot
 * POST /api/programs/:programId/evm/snapshot
 */
router.post("/api/programs/:programId/evm/snapshot", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const snapshot = await evm.createSnapshot(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      req.body.snapshotDate ? new Date(req.body.snapshotDate) : undefined,
      req.body.createdBy || "api"
    );
    res.json({ success: true, data: snapshot });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * List all EVM snapshots for a program
 * GET /api/programs/:programId/evm/snapshots
 */
router.get("/api/programs/:programId/evm/snapshots", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const filters: any = { programId: req.params.programId };

    if (req.query.projectId) {
      filters.projectId = req.query.projectId;
    }

    const data = await evm.listSnapshots(sheets, SPREADSHEET_ID, filters);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get latest EVM snapshot for a program
 * GET /api/programs/:programId/evm/snapshot/latest
 */
router.get("/api/programs/:programId/evm/snapshot/latest", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await evm.getLatestSnapshot(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );

    if (!data) {
      res.status(404).json({ success: false, error: "No snapshots found for program" });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Delete an EVM snapshot
 * DELETE /api/evm/snapshots/:id
 */
router.delete("/api/evm/snapshots/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await evm.deleteSnapshot(
      sheets,
      SPREADSHEET_ID,
      req.params.id
    );
    res.json({ success: true, data: { deleted: result } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Forecast project completion date
 * POST /api/programs/:programId/evm/forecast/completion
 */
router.post("/api/programs/:programId/evm/forecast/completion", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const plannedEndDate = new Date(req.body.plannedEndDate);

    const data = await evm.forecastCompletionDate(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      plannedEndDate
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Forecast EAC and ETC
 * POST /api/programs/:programId/evm/forecast/budget
 */
router.post("/api/programs/:programId/evm/forecast/budget", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await evm.forecastBudgetAtCompletion(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate forecast scenarios (best/expected/worst)
 * POST /api/programs/:programId/evm/forecast/scenarios
 */
router.post("/api/programs/:programId/evm/forecast/scenarios", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();

    const data = await evm.generateForecastScenarios(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Calculate required performance to meet targets
 * POST /api/programs/:programId/evm/forecast/required-performance
 */
router.post("/api/programs/:programId/evm/forecast/required-performance", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const targetEAC = req.body.targetEAC;

    const data = await evm.calculateRequiredPerformance(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      targetEAC
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Analyze CPI trend
 * GET /api/programs/:programId/evm/trend/cpi
 */
router.get("/api/programs/:programId/evm/trend/cpi", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const periodMonths = req.query.periodMonths
      ? parseInt(req.query.periodMonths as string, 10)
      : 12;

    const data = await evm.analyzeCPITrend(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      periodMonths
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Analyze SPI trend
 * GET /api/programs/:programId/evm/trend/spi
 */
router.get("/api/programs/:programId/evm/trend/spi", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const periodMonths = req.query.periodMonths
      ? parseInt(req.query.periodMonths as string, 10)
      : 12;

    const data = await evm.analyzeSPITrend(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      periodMonths
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Analyze overall performance trend
 * GET /api/programs/:programId/evm/trend/performance
 */
router.get("/api/programs/:programId/evm/trend/performance", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const periodMonths = req.query.periodMonths
      ? parseInt(req.query.periodMonths as string, 10)
      : 12;

    const data = await evm.analyzePerformanceTrend(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      periodMonths
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Detect performance anomalies
 * POST /api/programs/:programId/evm/trend/anomalies
 */
router.post("/api/programs/:programId/evm/trend/anomalies", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const periodMonths = req.body.periodMonths || 12;
    const threshold = req.body.threshold || 2.0;

    const data = await evm.detectAnomalies(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      periodMonths,
      threshold
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Compare current performance to baseline snapshot
 * POST /api/programs/:programId/evm/compare/:baselineSnapshotId
 */
router.post("/api/programs/:programId/evm/compare/:baselineSnapshotId", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();

    const data = await evm.compareToBaseline(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      req.params.baselineSnapshotId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get snapshot history for a program
 * GET /api/programs/:programId/evm/snapshot/history
 */
router.get("/api/programs/:programId/evm/snapshot/history", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const periodMonths = req.query.periodMonths
      ? parseInt(req.query.periodMonths as string, 10)
      : 12;

    const data = await evm.getSnapshotHistory(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      periodMonths
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Compare two snapshots
 * POST /api/evm/snapshots/compare
 */
router.post("/api/evm/snapshots/compare", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();

    // Fetch both snapshots
    const snapshot1 = await evm.readSnapshot(
      sheets,
      SPREADSHEET_ID,
      req.body.snapshot1Id
    );

    const snapshot2 = await evm.readSnapshot(
      sheets,
      SPREADSHEET_ID,
      req.body.snapshot2Id
    );

    if (!snapshot1 || !snapshot2) {
      res.status(404).json({ success: false, error: "One or both snapshots not found" });
      return;
    }

    const comparison = evm.compareSnapshots(snapshot1, snapshot2);
    res.json({ success: true, data: comparison });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CASH FLOW ENDPOINTS (14 endpoints)
// ============================================================================

/**
 * Create a new cash flow
 * POST /api/cashflows
 */
router.post("/api/cashflows", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const cashFlow = await cashflow.createCashFlow(
      sheets,
      SPREADSHEET_ID,
      {
        programId: req.body.programId,
        type: req.body.flowType,
        category: req.body.category,
        description: req.body.description,
        amount: req.body.plannedAmount,
        forecastDate: new Date(req.body.plannedDate),
        currency: req.body.currency,
        budgetId: req.body.budgetId,
        paymentMethod: req.body.paymentMethod,
        invoiceId: req.body.invoiceNumber,
        notes: req.body.notes,
      },
      req.body.createdBy || "api"
    );
    res.json({ success: true, data: cashFlow });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Read a cash flow by ID
 * GET /api/cashflows/:id
 */
router.get("/api/cashflows/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await cashflow.readCashFlow(sheets, SPREADSHEET_ID, req.params.id);

    if (!data) {
      res.status(404).json({ success: false, error: "Cash flow not found" });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update a cash flow
 * PUT /api/cashflows/:id
 */
router.put("/api/cashflows/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await cashflow.updateCashFlow(
      sheets,
      SPREADSHEET_ID,
      {
        flowId: req.params.id,
        description: req.body.description,
        status: req.body.status,
        amount: req.body.plannedAmount,
        forecastDate: req.body.plannedDate ? new Date(req.body.plannedDate) : undefined,
        paymentMethod: req.body.paymentMethod,
        invoiceId: req.body.invoiceNumber,
        notes: req.body.notes,
      },
      req.body.modifiedBy || "api"
    );

    if (!result) {
      res.status(404).json({ success: false, error: "Cash flow not found" });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Delete a cash flow (soft delete)
 * DELETE /api/cashflows/:id
 */
router.delete("/api/cashflows/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await cashflow.deleteCashFlow(
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

/**
 * List cash flows for a program
 * GET /api/programs/:programId/cashflows
 */
router.get("/api/programs/:programId/cashflows", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const filters: any = { programId: req.params.programId };

    if (req.query.status) filters.status = req.query.status;
    if (req.query.flowType) filters.flowType = req.query.flowType;
    if (req.query.category) filters.category = req.query.category;

    const data = await cashflow.listCashFlows(sheets, SPREADSHEET_ID, filters);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Record actual cash flow
 * POST /api/cashflows/:id/record-actual
 */
router.post("/api/cashflows/:id/record-actual", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await cashflow.recordActualCashFlow(
      sheets,
      SPREADSHEET_ID,
      req.params.id,
      req.body.actualDate ? new Date(req.body.actualDate) : new Date(),
      req.body.actualAmount,
      req.body.recordedBy || "api"
    );

    if (!result) {
      res.status(404).json({ success: false, error: "Cash flow not found" });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get monthly cash flow forecast
 * GET /api/programs/:programId/cashflow/forecast/monthly
 */
router.get("/api/programs/:programId/cashflow/forecast/monthly", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const periodMonths = req.query.periodMonths
      ? parseInt(req.query.periodMonths as string, 10)
      : 12;

    const data = await cashflow.forecastMonthlyCashFlow(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      periodMonths
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get weekly cash flow forecast
 * GET /api/programs/:programId/cashflow/forecast/weekly
 */
router.get("/api/programs/:programId/cashflow/forecast/weekly", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const periodWeeks = req.query.periodWeeks
      ? parseInt(req.query.periodWeeks as string, 10)
      : 12;

    const data = await cashflow.forecastWeeklyCashFlow(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      periodWeeks
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Calculate burn rate
 * GET /api/programs/:programId/cashflow/burnrate
 */
router.get("/api/programs/:programId/cashflow/burnrate", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const periodMonths = req.query.periodMonths
      ? parseInt(req.query.periodMonths as string, 10)
      : 3;

    const data = await cashflow.calculateBurnRate(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      periodMonths
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Calculate cash runway
 * GET /api/programs/:programId/cashflow/runway
 */
router.get("/api/programs/:programId/cashflow/runway", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const currentBalance = req.query.currentBalance
      ? parseFloat(req.query.currentBalance as string)
      : 100000;
    const data = await cashflow.calculateRunway(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      currentBalance
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Analyze cash velocity
 * GET /api/programs/:programId/cashflow/velocity
 */
router.get("/api/programs/:programId/cashflow/velocity", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();

    const data = await cashflow.analyzeCashVelocity(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Analyze cash concentration
 * GET /api/programs/:programId/cashflow/concentration
 */
router.get("/api/programs/:programId/cashflow/concentration", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await cashflow.analyzeCashFlowConcentration(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get upcoming cash flows
 * GET /api/programs/:programId/cashflow/upcoming
 */
router.get("/api/programs/:programId/cashflow/upcoming", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const days = req.query.days
      ? parseInt(req.query.days as string, 10)
      : 30;

    const data = await cashflow.getUpcomingCashFlows(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      days
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get overdue cash flows
 * GET /api/programs/:programId/cashflow/overdue
 */
router.get("/api/programs/:programId/cashflow/overdue", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await cashflow.getOverdueCashFlows(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// TRANSACTION ENDPOINTS (12 endpoints)
// ============================================================================

/**
 * Create a new transaction
 * POST /api/transactions
 */
router.post("/api/transactions", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const transaction = await transactions.createTransaction(
      sheets,
      SPREADSHEET_ID,
      {
        programId: req.body.programId,
        projectId: req.body.projectId,
        type: req.body.transactionType,
        category: req.body.category,
        amount: req.body.amount,
        currency: req.body.currency,
        transactionDate: new Date(req.body.transactionDate),
        description: req.body.description,
        budgetId: req.body.budgetId,
        invoiceId: req.body.invoiceNumber,
        vendorId: req.body.vendor,
        paymentMethod: req.body.paymentMethod,
        reference: req.body.referenceNumber,
        notes: req.body.notes,
      },
      req.body.createdBy || "api"
    );
    res.json({ success: true, data: transaction });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Read a transaction by ID
 * GET /api/transactions/:id
 */
router.get("/api/transactions/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await transactions.readTransaction(sheets, SPREADSHEET_ID, req.params.id);

    if (!data) {
      res.status(404).json({ success: false, error: "Transaction not found" });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update a transaction
 * PUT /api/transactions/:id
 */
router.put("/api/transactions/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await transactions.updateTransaction(
      sheets,
      SPREADSHEET_ID,
      {
        transactionId: req.params.id,
        description: req.body.description,
        amount: req.body.amount,
        transactionDate: req.body.transactionDate ? new Date(req.body.transactionDate) : undefined,
        paymentMethod: req.body.paymentMethod,
        vendorId: req.body.vendor,
        invoiceId: req.body.invoiceNumber,
        reference: req.body.referenceNumber,
        notes: req.body.notes,
      },
      req.body.modifiedBy || "api"
    );

    if (!result) {
      res.status(404).json({ success: false, error: "Transaction not found" });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Delete a transaction (soft delete)
 * DELETE /api/transactions/:id
 */
router.delete("/api/transactions/:id", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await transactions.deleteTransaction(
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

/**
 * List transactions for a program
 * GET /api/programs/:programId/transactions
 */
router.get("/api/programs/:programId/transactions", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const filters: any = { programId: req.params.programId };

    if (req.query.status) filters.status = req.query.status;
    if (req.query.transactionType) filters.transactionType = req.query.transactionType;
    if (req.query.category) filters.category = req.query.category;

    const data = await transactions.listTransactions(sheets, SPREADSHEET_ID, filters);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Reconcile a transaction
 * POST /api/transactions/:id/reconcile
 */
router.post("/api/transactions/:id/reconcile", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await transactions.reconcileTransaction(
      sheets,
      SPREADSHEET_ID,
      req.params.id,
      req.body.reconciledBy || "api"
    );

    if (!result) {
      res.status(404).json({ success: false, error: "Transaction not found" });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Auto-reconcile transactions
 * POST /api/programs/:programId/transactions/auto-reconcile
 */
router.post("/api/programs/:programId/transactions/auto-reconcile", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await transactions.autoReconcileTransactions(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      req.body.reconciledBy || "api"
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Identify transaction discrepancies
 * GET /api/programs/:programId/transactions/discrepancies
 */
router.get("/api/programs/:programId/transactions/discrepancies", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await transactions.identifyReconciliationDiscrepancies(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate reconciliation report
 * GET /api/programs/:programId/transactions/reconciliation-report
 */
router.get("/api/programs/:programId/transactions/reconciliation-report", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await transactions.generateReconciliationReport(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Bulk reconcile transactions
 * POST /api/transactions/bulk-reconcile
 */
router.post("/api/transactions/bulk-reconcile", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const result = await transactions.bulkReconcile(
      sheets,
      SPREADSHEET_ID,
      req.body.transactionIds,
      req.body.reconciledBy || "api"
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get transactions by budget
 * GET /api/budgets/:budgetId/transactions
 */
router.get("/api/budgets/:budgetId/transactions", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await transactions.getTransactionsByBudget(
      sheets,
      SPREADSHEET_ID,
      req.params.budgetId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get unreconciled transactions
 * GET /api/programs/:programId/transactions/unreconciled
 */
router.get("/api/programs/:programId/transactions/unreconciled", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await transactions.getUnreconciledTransactions(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// REPORTING ENDPOINTS (15 endpoints)
// ============================================================================

/**
 * Generate budget vs actual report
 * GET /api/programs/:programId/reports/budget/vs-actual
 */
router.get("/api/programs/:programId/reports/budget/vs-actual", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await reporting.generateBudgetVsActualReport(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate budget utilization report
 * GET /api/programs/:programId/reports/budget/utilization
 */
router.get("/api/programs/:programId/reports/budget/utilization", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await reporting.generateBudgetUtilizationReport(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate budget variance report
 * GET /api/programs/:programId/reports/budget/variance
 */
router.get("/api/programs/:programId/reports/budget/variance", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await reporting.generateBudgetVarianceReport(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate budget executive summary
 * GET /api/programs/:programId/reports/budget/executive
 */
router.get("/api/programs/:programId/reports/budget/executive", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await reporting.generateBudgetExecutiveSummary(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate EVM dashboard report
 * GET /api/programs/:programId/reports/evm/dashboard
 */
router.get("/api/programs/:programId/reports/evm/dashboard", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await reporting.generateEVMDashboard(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate EVM trend report
 * GET /api/programs/:programId/reports/evm/trend
 */
router.get("/api/programs/:programId/reports/evm/trend", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const periodMonths = req.query.periodMonths
      ? parseInt(req.query.periodMonths as string, 10)
      : 12;

    const data = await reporting.generateEVMTrendReport(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      periodMonths
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate EVM health report
 * GET /api/programs/:programId/reports/evm/health
 */
router.get("/api/programs/:programId/reports/evm/health", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await reporting.generateEVMHealthReport(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate EVM executive summary
 * GET /api/programs/:programId/reports/evm/executive
 */
router.get("/api/programs/:programId/reports/evm/executive", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await reporting.generateEVMExecutiveSummary(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate cash flow statement
 * GET /api/programs/:programId/reports/cashflow/statement
 */
router.get("/api/programs/:programId/reports/cashflow/statement", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const periodMonths = req.query.periodMonths
      ? parseInt(req.query.periodMonths as string, 10)
      : 12;

    const data = await reporting.generateCashFlowStatement(
      sheets,
      SPREADSHEET_ID,
      req.params.programId,
      periodMonths
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate cash position report
 * GET /api/programs/:programId/reports/cashflow/position
 */
router.get("/api/programs/:programId/reports/cashflow/position", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await reporting.generateCashPositionReport(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate cash burn report
 * GET /api/programs/:programId/reports/cashflow/burn
 */
router.get("/api/programs/:programId/reports/cashflow/burn", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();

    const data = await reporting.generateCashBurnReport(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate cash flow executive summary
 * GET /api/programs/:programId/reports/cashflow/executive
 */
router.get("/api/programs/:programId/reports/cashflow/executive", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await reporting.generateCashFlowExecutiveSummary(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate cost variance report
 * GET /api/programs/:programId/reports/variance/cost
 */
router.get("/api/programs/:programId/reports/variance/cost", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await reporting.generateCostVarianceReport(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate schedule variance report
 * GET /api/programs/:programId/reports/variance/schedule
 */
router.get("/api/programs/:programId/reports/variance/schedule", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await reporting.generateScheduleVarianceReport(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate variance executive summary
 * GET /api/programs/:programId/reports/variance/executive
 */
router.get("/api/programs/:programId/reports/variance/executive", async (req: Request, res: Response) => {
  try {
    const sheets = await getSheets();
    const data = await reporting.generateVarianceExecutiveSummary(
      sheets,
      SPREADSHEET_ID,
      req.params.programId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CROSS-SERVER INTEGRATION (2 endpoints)
// ============================================================================

/**
 * Document notification endpoint (for document routing)
 * POST /api/documents/notify
 */
router.post("/api/documents/notify", async (req: Request, res: Response) => {
  try {
    const { documentId, filename, location, documentType, metadata } = req.body;

    console.log(`[mcp-financial] Document notification received:`);
    console.log(`  Type: ${documentType}`);
    console.log(`  File: ${filename}`);
    console.log(`  Location: ${location}`);
    console.log(`  Budget: ${metadata?.budgetId || "N/A"}`);
    console.log(`  Program: ${metadata?.programId || "N/A"}`);

    // Process budget/financial documents
    if (documentType === "budget" && metadata?.budgetId) {
      console.log(`[mcp-financial] Processing budget document: ${metadata.budgetId}`);
    }

    if (documentType === "invoice" && metadata?.invoiceId) {
      console.log(`[mcp-financial] Processing invoice document: ${metadata.invoiceId}`);
    }

    res.json({ success: true, message: "Document notification received" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Event notification endpoint (for cross-server events)
 * POST /api/events/receive
 */
router.post("/api/events/receive", async (req: Request, res: Response) => {
  try {
    const event = req.body;

    console.log(`[mcp-financial] Event received from ${event.sourceServer}: ${event.eventType}`);

    // Handle cross-server events
    // For example: program_created, budget_approved, deliverable_completed, etc.

    if (event.eventType === "program_created") {
      console.log(`[mcp-financial] New program created: ${event.data?.programId}`);
      // Could auto-create budget templates, etc.
    }

    if (event.eventType === "deliverable_completed") {
      console.log(`[mcp-financial] Deliverable completed: ${event.data?.deliverableId}`);
      // Could update EV calculations
    }

    res.json({ success: true, message: "Event received" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
