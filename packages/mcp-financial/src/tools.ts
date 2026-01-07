/**
 * MCP Tool Definitions for Financial Server
 *
 * Defines all tools exposed via the MCP protocol for Week 14 & Week 15:
 * - Budget Management (12 tools)
 * - EVM (Earned Value Management) (10 tools)
 * - Cash Flow Management (10 tools)
 * - Transaction Management (8 tools)
 * - Financial Reporting (15 tools)
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { OAuth2Client } from "google-auth-library";
import type { sheets_v4 } from "googleapis";
import { initializeAuth, createSheetsClient } from "@gw-mcp/shared-core";

// Import budget functions
import * as budgets from "./budgets/budgets.js";
import * as categories from "./budgets/categories.js";
import * as allocation from "./budgets/allocation.js";

// Import EVM functions
import * as calculations from "./evm/calculations.js";
import * as snapshots from "./evm/snapshots.js";
import * as forecasting from "./evm/forecasting.js";
import * as trending from "./evm/trending.js";

// Import Week 15 functions
import * as cashflow from "./cashflow/index.js";
import * as transactions from "./transactions/index.js";
import * as reporting from "./reporting/index.js";

// Global auth client and API clients
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

/**
 * Tool definitions for Financial Management (Week 14)
 */
export const FINANCIAL_TOOLS: Tool[] = [
  // ============================================================================
  // BUDGET TOOLS (12 tools)
  // ============================================================================

  {
    name: "financial_budget_create",
    description: "Create a new budget allocation for a program or project",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: {
          type: "string",
          description: "Spreadsheet ID (optional, uses FINANCIAL_SPREADSHEET_ID env var if not provided)"
        },
        budget: {
          type: "object",
          description: "Budget data",
          properties: {
            programId: { type: "string", description: "Program ID" },
            projectId: { type: "string", description: "Project ID (optional)" },
            name: { type: "string", description: "Budget name" },
            description: { type: "string", description: "Budget description" },
            category: {
              type: "string",
              description: "Budget category",
              enum: ["labor", "materials", "equipment", "travel", "subcontracts", "overhead", "other"]
            },
            allocated: { type: "number", description: "Allocated amount" },
            fiscalYear: { type: "string", description: "Fiscal year (e.g., '2024')" },
            periodStart: { type: "string", description: "Period start date (ISO format)" },
            periodEnd: { type: "string", description: "Period end date (ISO format)" },
            requestedBy: { type: "string", description: "User requesting the budget" },
            approvedBy: { type: "string", description: "Approver name (optional)" },
            approvedDate: { type: "string", description: "Approval date (ISO format, optional)" },
            currency: { type: "string", description: "Currency code (default: USD)" },
            notes: { type: "string", description: "Additional notes" },
          },
          required: ["programId", "name", "description", "category", "allocated", "fiscalYear", "periodStart", "periodEnd", "requestedBy"],
        },
        createdBy: { type: "string", description: "User creating the budget" },
      },
      required: ["budget"],
    },
  },

  {
    name: "financial_budget_read",
    description: "Read a budget by ID",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        budgetId: { type: "string", description: "Budget ID to read" },
      },
      required: ["budgetId"],
    },
  },

  {
    name: "financial_budget_update",
    description: "Update an existing budget",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        budgetId: { type: "string", description: "Budget ID to update" },
        updates: {
          type: "object",
          description: "Fields to update",
          properties: {
            programId: { type: "string" },
            projectId: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            category: {
              type: "string",
              enum: ["labor", "materials", "equipment", "travel", "subcontracts", "overhead", "other"]
            },
            status: {
              type: "string",
              enum: ["draft", "approved", "active", "frozen", "closed", "cancelled"]
            },
            allocated: { type: "number" },
            committed: { type: "number" },
            spent: { type: "number" },
            fiscalYear: { type: "string" },
            periodStart: { type: "string", description: "ISO date string" },
            periodEnd: { type: "string", description: "ISO date string" },
            requestedBy: { type: "string" },
            approvedBy: { type: "string" },
            approvedDate: { type: "string", description: "ISO date string" },
            currency: { type: "string" },
            notes: { type: "string" },
          },
        },
        modifiedBy: { type: "string", description: "User making the update" },
      },
      required: ["budgetId", "updates"],
    },
  },

  {
    name: "financial_budget_list",
    description: "List budgets with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        filters: {
          type: "object",
          description: "Filter criteria",
          properties: {
            programId: { type: "string", description: "Filter by program ID" },
            projectId: { type: "string", description: "Filter by project ID" },
            category: {
              type: "string",
              description: "Filter by category",
              enum: ["labor", "materials", "equipment", "travel", "subcontracts", "overhead", "other"]
            },
            status: {
              type: "string",
              description: "Filter by status",
              enum: ["draft", "approved", "active", "frozen", "closed", "cancelled"]
            },
            fiscalYear: { type: "string", description: "Filter by fiscal year" },
          },
        },
      },
    },
  },

  {
    name: "financial_budget_allocate",
    description: "Allocate budget amount (mark funds as allocated)",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        budgetId: { type: "string", description: "Budget ID" },
        amount: { type: "number", description: "Amount to allocate" },
        description: { type: "string", description: "Allocation description" },
        allocatedBy: { type: "string", description: "User performing the allocation" },
      },
      required: ["budgetId", "amount", "description"],
    },
  },

  {
    name: "financial_budget_commit",
    description: "Commit budget amount (reserve for contract or obligation)",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        budgetId: { type: "string", description: "Budget ID" },
        amount: { type: "number", description: "Amount to commit" },
        description: { type: "string", description: "Commitment description" },
        committedBy: { type: "string", description: "User performing the commitment" },
      },
      required: ["budgetId", "amount", "description"],
    },
  },

  {
    name: "financial_budget_expense",
    description: "Record an expense against a budget",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        budgetId: { type: "string", description: "Budget ID" },
        amount: { type: "number", description: "Expense amount" },
        description: { type: "string", description: "Expense description" },
        expenseDate: { type: "string", description: "Expense date (ISO format, optional)" },
        recordedBy: { type: "string", description: "User recording the expense" },
      },
      required: ["budgetId", "amount", "description"],
    },
  },

  {
    name: "financial_budget_status",
    description: "Get comprehensive budget status for a program (total allocated, committed, spent)",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        fiscalYear: { type: "string", description: "Fiscal year filter (optional)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_category_create",
    description: "Create a new budget category",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        category: {
          type: "object",
          description: "Category data",
          properties: {
            code: { type: "string", description: "Category code (unique identifier)" },
            name: { type: "string", description: "Category name" },
            description: { type: "string", description: "Category description" },
            parentCode: { type: "string", description: "Parent category code (optional, for subcategories)" },
            allowSubcategories: { type: "boolean", description: "Allow subcategories (default: true)" },
            isActive: { type: "boolean", description: "Active status (default: true)" },
          },
          required: ["code", "name", "description"],
        },
        createdBy: { type: "string", description: "User creating the category" },
      },
      required: ["category"],
    },
  },

  {
    name: "financial_category_list",
    description: "List all budget categories",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        includeInactive: { type: "boolean", description: "Include inactive categories (default: false)" },
        parentCode: { type: "string", description: "Filter by parent category code (optional)" },
      },
    },
  },

  {
    name: "financial_allocation_reallocate",
    description: "Reallocate budget between two budgets",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        fromBudgetId: { type: "string", description: "Source budget ID" },
        toBudgetId: { type: "string", description: "Target budget ID" },
        amount: { type: "number", description: "Amount to reallocate" },
        reason: { type: "string", description: "Reason for reallocation" },
        approvedBy: { type: "string", description: "Approver of reallocation" },
        effectiveDate: { type: "string", description: "Effective date (ISO format, optional)" },
      },
      required: ["fromBudgetId", "toBudgetId", "amount", "reason", "approvedBy"],
    },
  },

  {
    name: "financial_allocation_summary",
    description: "Get budget allocation summary for a program",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        fiscalYear: { type: "string", description: "Fiscal year (optional)" },
      },
      required: ["programId"],
    },
  },

  // ============================================================================
  // EVM TOOLS (10 tools)
  // ============================================================================

  {
    name: "financial_evm_calculate",
    description: "Calculate current EVM metrics (PV, EV, AC, CV, SV, CPI, SPI) for a program",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        asOfDate: { type: "string", description: "Calculation date (ISO format, default: today)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_evm_snapshot_create",
    description: "Create an EVM snapshot for a specific point in time",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        snapshot: {
          type: "object",
          description: "Snapshot data",
          properties: {
            programId: { type: "string", description: "Program ID" },
            snapshotDate: { type: "string", description: "Snapshot date (ISO format)" },
            reportingPeriod: { type: "string", description: "Reporting period (e.g., '2024-Q1', '2024-03')" },
            pv: { type: "number", description: "Planned Value" },
            ev: { type: "number", description: "Earned Value" },
            ac: { type: "number", description: "Actual Cost" },
            bac: { type: "number", description: "Budget at Completion" },
            notes: { type: "string", description: "Snapshot notes (optional)" },
          },
          required: ["programId", "snapshotDate", "reportingPeriod", "pv", "ev", "ac", "bac"],
        },
        createdBy: { type: "string", description: "User creating the snapshot" },
      },
      required: ["snapshot"],
    },
  },

  {
    name: "financial_evm_snapshot_list",
    description: "List EVM snapshots with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Filter by program ID (optional)" },
        startDate: { type: "string", description: "Filter snapshots after this date (ISO format, optional)" },
        endDate: { type: "string", description: "Filter snapshots before this date (ISO format, optional)" },
        reportingPeriod: { type: "string", description: "Filter by reporting period (optional)" },
      },
    },
  },

  {
    name: "financial_evm_snapshot_latest",
    description: "Get the latest EVM snapshot for a program",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_evm_forecast_completion",
    description: "Forecast project completion date based on current SPI",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        plannedEndDate: { type: "string", description: "Originally planned end date (ISO format)" },
        asOfDate: { type: "string", description: "Date to forecast from (ISO format, default: today)" },
      },
      required: ["programId", "plannedEndDate"],
    },
  },

  {
    name: "financial_evm_forecast_budget",
    description: "Forecast budget at completion (EAC) and estimate to complete (ETC)",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        method: {
          type: "string",
          description: "Forecast method",
          enum: ["cpi", "cpi-spi", "bottom-up"]
        },
        asOfDate: { type: "string", description: "Date to forecast from (ISO format, default: today)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_evm_forecast_scenarios",
    description: "Generate multiple forecast scenarios (optimistic, realistic, pessimistic)",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        plannedEndDate: { type: "string", description: "Originally planned end date (ISO format)" },
        asOfDate: { type: "string", description: "Date to forecast from (ISO format, default: today)" },
      },
      required: ["programId", "plannedEndDate"],
    },
  },

  {
    name: "financial_evm_trend_cpi",
    description: "Analyze Cost Performance Index (CPI) trend over time",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        months: { type: "number", description: "Number of months to analyze (default: 6)" },
        includeForecasting: { type: "boolean", description: "Include future trend forecasting (default: true)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_evm_trend_spi",
    description: "Analyze Schedule Performance Index (SPI) trend over time",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        months: { type: "number", description: "Number of months to analyze (default: 6)" },
        includeForecasting: { type: "boolean", description: "Include future trend forecasting (default: true)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_evm_trend_performance",
    description: "Comprehensive performance trend analysis (both CPI and SPI with anomaly detection)",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        months: { type: "number", description: "Number of months to analyze (default: 6)" },
        detectAnomalies: { type: "boolean", description: "Detect performance anomalies (default: true)" },
      },
      required: ["programId"],
    },
  },

  // ============================================================================
  // CASH FLOW TOOLS (10 tools)
  // ============================================================================

  {
    name: "financial_cashflow_create",
    description: "Create a cash flow entry for tracking expected or actual cash movements",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        cashFlow: {
          type: "object",
          description: "Cash flow data",
          properties: {
            programId: { type: "string", description: "Program ID" },
            projectId: { type: "string", description: "Project ID (optional)" },
            type: {
              type: "string",
              description: "Cash flow type",
              enum: ["inflow", "outflow"]
            },
            category: {
              type: "string",
              description: "Cash flow category",
              enum: ["revenue", "funding", "payment", "expense", "refund", "other"]
            },
            amount: { type: "number", description: "Cash flow amount" },
            plannedDate: { type: "string", description: "Planned date (ISO format)" },
            actualDate: { type: "string", description: "Actual date (ISO format, optional)" },
            description: { type: "string", description: "Description" },
            counterparty: { type: "string", description: "Counterparty name (optional)" },
            reference: { type: "string", description: "Reference number (optional)" },
            currency: { type: "string", description: "Currency code (default: USD)" },
            notes: { type: "string", description: "Additional notes (optional)" },
          },
          required: ["programId", "type", "category", "amount", "plannedDate", "description"],
        },
        createdBy: { type: "string", description: "User creating the entry" },
      },
      required: ["cashFlow"],
    },
  },

  {
    name: "financial_cashflow_read",
    description: "Read a cash flow entry by ID",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        cashFlowId: { type: "string", description: "Cash flow ID to read" },
      },
      required: ["cashFlowId"],
    },
  },

  {
    name: "financial_cashflow_list",
    description: "List cash flow entries with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        filters: {
          type: "object",
          description: "Filter criteria",
          properties: {
            programId: { type: "string", description: "Filter by program ID" },
            projectId: { type: "string", description: "Filter by project ID" },
            type: {
              type: "string",
              description: "Filter by type",
              enum: ["inflow", "outflow"]
            },
            category: {
              type: "string",
              description: "Filter by category",
              enum: ["revenue", "funding", "payment", "expense", "refund", "other"]
            },
            startDate: { type: "string", description: "Filter after this date (ISO format)" },
            endDate: { type: "string", description: "Filter before this date (ISO format)" },
            status: {
              type: "string",
              description: "Filter by status",
              enum: ["planned", "actual", "cancelled"]
            },
          },
        },
      },
    },
  },

  {
    name: "financial_cashflow_record_actual",
    description: "Record actual cash flow for a planned entry",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        cashFlowId: { type: "string", description: "Cash flow ID" },
        actualDate: { type: "string", description: "Actual date (ISO format)" },
        actualAmount: { type: "number", description: "Actual amount (optional, uses planned if not provided)" },
        notes: { type: "string", description: "Notes about the actual transaction (optional)" },
        recordedBy: { type: "string", description: "User recording the actual" },
      },
      required: ["cashFlowId", "actualDate"],
    },
  },

  {
    name: "financial_cashflow_forecast_monthly",
    description: "Generate monthly cash flow forecast for a program",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        startDate: { type: "string", description: "Forecast start date (ISO format)" },
        months: { type: "number", description: "Number of months to forecast (default: 12)" },
      },
      required: ["programId", "startDate"],
    },
  },

  {
    name: "financial_cashflow_forecast_weekly",
    description: "Generate weekly cash flow forecast for a program",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        startDate: { type: "string", description: "Forecast start date (ISO format)" },
        weeks: { type: "number", description: "Number of weeks to forecast (default: 13)" },
      },
      required: ["programId", "startDate"],
    },
  },

  {
    name: "financial_cashflow_burnrate",
    description: "Calculate cash burn rate for a program",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        months: { type: "number", description: "Number of months to analyze (default: 3)" },
        asOfDate: { type: "string", description: "Calculation date (ISO format, default: today)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_cashflow_runway",
    description: "Calculate cash runway (months until cash depletion)",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        currentBalance: { type: "number", description: "Current cash balance" },
        asOfDate: { type: "string", description: "Calculation date (ISO format, default: today)" },
      },
      required: ["programId", "currentBalance"],
    },
  },

  {
    name: "financial_cashflow_analyze_velocity",
    description: "Analyze cash flow velocity (speed of cash conversion)",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        months: { type: "number", description: "Number of months to analyze (default: 6)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_cashflow_concentration",
    description: "Analyze cash flow concentration and counterparty risk",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        months: { type: "number", description: "Number of months to analyze (default: 12)" },
      },
      required: ["programId"],
    },
  },

  // ============================================================================
  // TRANSACTION TOOLS (8 tools)
  // ============================================================================

  {
    name: "financial_transaction_create",
    description: "Create a financial transaction record",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        transaction: {
          type: "object",
          description: "Transaction data",
          properties: {
            programId: { type: "string", description: "Program ID" },
            budgetId: { type: "string", description: "Budget ID (optional)" },
            type: {
              type: "string",
              description: "Transaction type",
              enum: ["debit", "credit", "transfer"]
            },
            category: {
              type: "string",
              description: "Transaction category",
              enum: ["labor", "materials", "equipment", "travel", "subcontracts", "overhead", "other"]
            },
            amount: { type: "number", description: "Transaction amount" },
            transactionDate: { type: "string", description: "Transaction date (ISO format)" },
            description: { type: "string", description: "Description" },
            reference: { type: "string", description: "Reference number (optional)" },
            vendor: { type: "string", description: "Vendor name (optional)" },
            account: { type: "string", description: "Account code (optional)" },
            currency: { type: "string", description: "Currency code (default: USD)" },
            notes: { type: "string", description: "Additional notes (optional)" },
          },
          required: ["programId", "type", "category", "amount", "transactionDate", "description"],
        },
        createdBy: { type: "string", description: "User creating the transaction" },
      },
      required: ["transaction"],
    },
  },

  {
    name: "financial_transaction_read",
    description: "Read a transaction by ID",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        transactionId: { type: "string", description: "Transaction ID to read" },
      },
      required: ["transactionId"],
    },
  },

  {
    name: "financial_transaction_list",
    description: "List transactions with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        filters: {
          type: "object",
          description: "Filter criteria",
          properties: {
            programId: { type: "string", description: "Filter by program ID" },
            budgetId: { type: "string", description: "Filter by budget ID" },
            type: {
              type: "string",
              description: "Filter by type",
              enum: ["debit", "credit", "transfer"]
            },
            category: {
              type: "string",
              description: "Filter by category",
              enum: ["labor", "materials", "equipment", "travel", "subcontracts", "overhead", "other"]
            },
            startDate: { type: "string", description: "Filter after this date (ISO format)" },
            endDate: { type: "string", description: "Filter before this date (ISO format)" },
            status: {
              type: "string",
              description: "Filter by reconciliation status",
              enum: ["pending", "reconciled", "disputed"]
            },
          },
        },
      },
    },
  },

  {
    name: "financial_transaction_reconcile",
    description: "Reconcile a transaction with bank or accounting records",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        transactionId: { type: "string", description: "Transaction ID" },
        reconciledAmount: { type: "number", description: "Reconciled amount (optional, uses transaction amount if not provided)" },
        reconciledDate: { type: "string", description: "Reconciliation date (ISO format, default: today)" },
        notes: { type: "string", description: "Reconciliation notes (optional)" },
        reconciledBy: { type: "string", description: "User performing reconciliation" },
      },
      required: ["transactionId"],
    },
  },

  {
    name: "financial_transaction_auto_reconcile",
    description: "Automatically reconcile all matching transactions",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        tolerance: { type: "number", description: "Amount tolerance for auto-matching (default: 0.01)" },
        reconciledBy: { type: "string", description: "User performing reconciliation" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_transaction_discrepancies",
    description: "Identify transaction discrepancies and anomalies",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        startDate: { type: "string", description: "Analysis start date (ISO format, optional)" },
        endDate: { type: "string", description: "Analysis end date (ISO format, optional)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_transaction_reconciliation_report",
    description: "Generate reconciliation report for a period",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        startDate: { type: "string", description: "Report start date (ISO format)" },
        endDate: { type: "string", description: "Report end date (ISO format)" },
      },
      required: ["programId", "startDate", "endDate"],
    },
  },

  {
    name: "financial_transaction_bulk_reconcile",
    description: "Bulk reconcile multiple transactions",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        transactionIds: {
          type: "array",
          description: "Array of transaction IDs to reconcile",
          items: { type: "string" }
        },
        reconciledDate: { type: "string", description: "Reconciliation date (ISO format, default: today)" },
        notes: { type: "string", description: "Reconciliation notes (optional)" },
        reconciledBy: { type: "string", description: "User performing reconciliation" },
      },
      required: ["transactionIds"],
    },
  },

  // ============================================================================
  // REPORTING TOOLS (15 tools)
  // ============================================================================

  {
    name: "financial_report_budget_vs_actual",
    description: "Generate budget vs actual comparison report",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        fiscalYear: { type: "string", description: "Fiscal year (optional)" },
        groupBy: {
          type: "string",
          description: "Group results by (default: category)",
          enum: ["category", "project", "month"]
        },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_report_budget_utilization",
    description: "Generate budget utilization report showing allocation, commitment, and spend percentages",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        fiscalYear: { type: "string", description: "Fiscal year (optional)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_report_budget_variance",
    description: "Generate detailed budget variance report with explanations",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        threshold: { type: "number", description: "Variance threshold percentage (default: 10)" },
        fiscalYear: { type: "string", description: "Fiscal year (optional)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_report_budget_executive",
    description: "Generate executive summary of budget status",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        fiscalYear: { type: "string", description: "Fiscal year (optional)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_report_evm_dashboard",
    description: "Generate comprehensive EVM dashboard with all key metrics",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        asOfDate: { type: "string", description: "Report date (ISO format, default: today)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_report_evm_trend",
    description: "Generate EVM trend report showing performance over time",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        months: { type: "number", description: "Number of months to include (default: 6)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_report_evm_health",
    description: "Generate EVM health scorecard with risk indicators",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        asOfDate: { type: "string", description: "Report date (ISO format, default: today)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_report_evm_executive",
    description: "Generate executive EVM summary with forecasts",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        asOfDate: { type: "string", description: "Report date (ISO format, default: today)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_report_cashflow_statement",
    description: "Generate cash flow statement for a period",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        startDate: { type: "string", description: "Period start date (ISO format)" },
        endDate: { type: "string", description: "Period end date (ISO format)" },
      },
      required: ["programId", "startDate", "endDate"],
    },
  },

  {
    name: "financial_report_cashflow_position",
    description: "Generate current cash position report",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        asOfDate: { type: "string", description: "Report date (ISO format, default: today)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_report_cashflow_burn",
    description: "Generate cash burn analysis report",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        months: { type: "number", description: "Number of months to analyze (default: 6)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_report_cashflow_executive",
    description: "Generate executive cash flow summary",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        asOfDate: { type: "string", description: "Report date (ISO format, default: today)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_report_cost_variance",
    description: "Generate comprehensive cost variance report",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        threshold: { type: "number", description: "Variance threshold percentage (default: 5)" },
        asOfDate: { type: "string", description: "Report date (ISO format, default: today)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_report_schedule_variance",
    description: "Generate comprehensive schedule variance report",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        threshold: { type: "number", description: "Variance threshold percentage (default: 5)" },
        asOfDate: { type: "string", description: "Report date (ISO format, default: today)" },
      },
      required: ["programId"],
    },
  },

  {
    name: "financial_report_variance_executive",
    description: "Generate executive variance summary (cost and schedule)",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID (optional)" },
        programId: { type: "string", description: "Program ID" },
        asOfDate: { type: "string", description: "Report date (ISO format, default: today)" },
      },
      required: ["programId"],
    },
  },
];

/**
 * Tool handler for Financial Management
 */
export async function handleToolCall(name: string, args: any): Promise<any> {
  const sheets = await getSheets();
  const spreadsheetId = args.spreadsheetId || process.env.FINANCIAL_SPREADSHEET_ID || "";

  switch (name) {
    // ========================================================================
    // BUDGET TOOLS
    // ========================================================================

    case "financial_budget_create":
      return await budgets.createBudget(
        sheets,
        spreadsheetId,
        {
          ...args.budget,
          periodStart: new Date(args.budget.periodStart),
          periodEnd: new Date(args.budget.periodEnd),
          approvedDate: args.budget.approvedDate ? new Date(args.budget.approvedDate) : undefined,
        },
        args.createdBy || "system"
      );

    case "financial_budget_read":
      return await budgets.readBudget(sheets, spreadsheetId, args.budgetId);

    case "financial_budget_update": {
      const updateInput: budgets.UpdateBudgetInput = {
        budgetId: args.budgetId,
        ...args.updates,
      };

      // Convert date strings to Date objects if present
      if (args.updates.periodStart) {
        updateInput.periodStart = new Date(args.updates.periodStart);
      }
      if (args.updates.periodEnd) {
        updateInput.periodEnd = new Date(args.updates.periodEnd);
      }
      if (args.updates.approvedDate) {
        updateInput.approvedDate = new Date(args.updates.approvedDate);
      }

      return await budgets.updateBudget(
        sheets,
        spreadsheetId,
        updateInput,
        args.modifiedBy || "system"
      );
    }

    case "financial_budget_list":
      return await budgets.listBudgets(sheets, spreadsheetId, args.filters);

    case "financial_budget_allocate":
      return await budgets.allocateBudget(
        sheets,
        spreadsheetId,
        args.budgetId,
        args.amount,
        args.allocatedBy || "system"
      );

    case "financial_budget_commit":
      return await budgets.commitBudget(
        sheets,
        spreadsheetId,
        args.budgetId,
        args.amount,
        args.committedBy || "system"
      );

    case "financial_budget_expense":
      return await budgets.recordExpense(
        sheets,
        spreadsheetId,
        args.budgetId,
        args.amount,
        args.description,
        args.recordedBy || "system"
      );

    case "financial_budget_status":
      return await budgets.getBudgetStatus(
        sheets,
        spreadsheetId,
        args.programId
      );

    case "financial_category_create":
      return await categories.createCategory(
        sheets,
        spreadsheetId,
        args.category,
        args.createdBy || "system"
      );

    case "financial_category_list": {
      const allCategories = await categories.listCategories(
        sheets,
        spreadsheetId,
        args.parentCode
      );

      // Filter out inactive categories unless requested
      if (!args.includeInactive) {
        return allCategories.filter(cat => cat.active);
      }

      return allCategories;
    }

    case "financial_allocation_reallocate":
      return await allocation.reallocateBudget(
        sheets,
        spreadsheetId,
        args.fromBudgetId,
        args.toBudgetId,
        args.amount,
        args.reason,
        args.approvedBy
      );

    case "financial_allocation_summary":
      return await allocation.getBudgetAllocationSummary(
        sheets,
        spreadsheetId,
        args.programId,
        args.fiscalYear
      );

    // ========================================================================
    // EVM TOOLS
    // ========================================================================

    case "financial_evm_calculate":
      return await calculations.performEVMCalculation(
        sheets,
        spreadsheetId,
        args.programId,
        args.asOfDate ? new Date(args.asOfDate) : new Date()
      );

    case "financial_evm_snapshot_create":
      return await snapshots.createSnapshot(
        sheets,
        spreadsheetId,
        {
          ...args.snapshot,
          snapshotDate: new Date(args.snapshot.snapshotDate),
        },
        args.createdBy || "system"
      );

    case "financial_evm_snapshot_list": {
      const filters: any = {};

      if (args.programId) {
        filters.programId = args.programId;
      }
      if (args.startDate) {
        filters.startDate = new Date(args.startDate);
      }
      if (args.endDate) {
        filters.endDate = new Date(args.endDate);
      }
      if (args.reportingPeriod) {
        filters.reportingPeriod = args.reportingPeriod;
      }

      return await snapshots.listSnapshots(sheets, spreadsheetId, filters);
    }

    case "financial_evm_snapshot_latest":
      return await snapshots.getLatestSnapshot(sheets, spreadsheetId, args.programId);

    case "financial_evm_forecast_completion":
      return await forecasting.forecastCompletionDate(
        sheets,
        spreadsheetId,
        args.programId,
        new Date(args.plannedEndDate)
      );

    case "financial_evm_forecast_budget":
      return await forecasting.forecastBudgetAtCompletion(
        sheets,
        spreadsheetId,
        args.programId,
        args.method || "cpi"
      );

    case "financial_evm_forecast_scenarios":
      return await forecasting.generateForecastScenarios(
        sheets,
        spreadsheetId,
        args.programId
      );

    case "financial_evm_trend_cpi":
      return await trending.analyzeCPITrend(
        sheets,
        spreadsheetId,
        args.programId,
        args.months || 6
      );

    case "financial_evm_trend_spi":
      return await trending.analyzeSPITrend(
        sheets,
        spreadsheetId,
        args.programId,
        args.months || 6
      );

    case "financial_evm_trend_performance":
      return await trending.analyzePerformanceTrend(
        sheets,
        spreadsheetId,
        args.programId,
        args.months || 6
      );

    // ========================================================================
    // CASH FLOW TOOLS
    // ========================================================================

    case "financial_cashflow_create":
      return await cashflow.createCashFlow(
        sheets,
        spreadsheetId,
        {
          ...args.cashFlow,
          plannedDate: new Date(args.cashFlow.plannedDate),
          actualDate: args.cashFlow.actualDate ? new Date(args.cashFlow.actualDate) : undefined,
        },
        args.createdBy || "system"
      );

    case "financial_cashflow_read":
      return await cashflow.readCashFlow(sheets, spreadsheetId, args.cashFlowId);

    case "financial_cashflow_list": {
      const filters: any = args.filters || {};

      if (filters.startDate) {
        filters.startDate = new Date(filters.startDate);
      }
      if (filters.endDate) {
        filters.endDate = new Date(filters.endDate);
      }

      return await cashflow.listCashFlows(sheets, spreadsheetId, filters);
    }

    case "financial_cashflow_record_actual":
      return await cashflow.recordActualCashFlow(
        sheets,
        spreadsheetId,
        args.cashFlowId,
        new Date(args.actualDate),
        args.actualAmount,
        args.recordedBy || "system"
      );

    case "financial_cashflow_forecast_monthly":
      return await cashflow.forecastMonthlyCashFlow(
        sheets,
        spreadsheetId,
        args.programId,
        args.months || 12
      );

    case "financial_cashflow_forecast_weekly":
      return await cashflow.forecastWeeklyCashFlow(
        sheets,
        spreadsheetId,
        args.programId,
        args.weeks || 12
      );

    case "financial_cashflow_burnrate":
      return await cashflow.calculateBurnRate(
        sheets,
        spreadsheetId,
        args.programId,
        args.months || 6
      );

    case "financial_cashflow_runway":
      return await cashflow.calculateRunway(
        sheets,
        spreadsheetId,
        args.programId,
        args.currentBalance
      );

    case "financial_cashflow_analyze_velocity":
      return await cashflow.analyzeCashVelocity(
        sheets,
        spreadsheetId,
        args.programId
      );

    case "financial_cashflow_concentration":
      return await cashflow.analyzeCashFlowConcentration(
        sheets,
        spreadsheetId,
        args.programId
      );

    // ========================================================================
    // TRANSACTION TOOLS
    // ========================================================================

    case "financial_transaction_create":
      return await transactions.createTransaction(
        sheets,
        spreadsheetId,
        {
          ...args.transaction,
          transactionDate: new Date(args.transaction.transactionDate),
        },
        args.createdBy || "system"
      );

    case "financial_transaction_read":
      return await transactions.readTransaction(sheets, spreadsheetId, args.transactionId);

    case "financial_transaction_list": {
      const filters: any = args.filters || {};

      if (filters.startDate) {
        filters.startDate = new Date(filters.startDate);
      }
      if (filters.endDate) {
        filters.endDate = new Date(filters.endDate);
      }

      return await transactions.listTransactions(sheets, spreadsheetId, filters);
    }

    case "financial_transaction_reconcile":
      return await transactions.reconcileTransaction(
        sheets,
        spreadsheetId,
        args.transactionId,
        args.reconciledBy || "system"
      );

    case "financial_transaction_auto_reconcile":
      return await transactions.autoReconcileTransactions(
        sheets,
        spreadsheetId,
        args.programId,
        args.reconciledBy || "system"
      );

    case "financial_transaction_discrepancies":
      return await transactions.identifyReconciliationDiscrepancies(
        sheets,
        spreadsheetId,
        args.programId
      );

    case "financial_transaction_reconciliation_report":
      return await transactions.generateReconciliationReport(
        sheets,
        spreadsheetId,
        args.programId,
        new Date(args.startDate),
        new Date(args.endDate)
      );

    case "financial_transaction_bulk_reconcile":
      return await transactions.bulkReconcile(
        sheets,
        spreadsheetId,
        args.transactionIds,
        args.reconciledBy || "system"
      );

    // ========================================================================
    // REPORTING TOOLS
    // ========================================================================

    case "financial_report_budget_vs_actual":
      return await reporting.generateBudgetVsActualReport(
        sheets,
        spreadsheetId,
        args.programId,
        args.fiscalYear
      );

    case "financial_report_budget_utilization":
      return await reporting.generateBudgetUtilizationReport(
        sheets,
        spreadsheetId,
        args.programId
      );

    case "financial_report_budget_variance":
      return await reporting.generateBudgetVarianceReport(
        sheets,
        spreadsheetId,
        args.programId
      );

    case "financial_report_budget_executive":
      return await reporting.generateBudgetExecutiveSummary(
        sheets,
        spreadsheetId,
        args.programId
      );

    case "financial_report_evm_dashboard":
      return await reporting.generateEVMDashboard(
        sheets,
        spreadsheetId,
        args.programId
      );

    case "financial_report_evm_trend":
      return await reporting.generateEVMTrendReport(
        sheets,
        spreadsheetId,
        args.programId,
        args.months || 6
      );

    case "financial_report_evm_health":
      return await reporting.generateEVMHealthReport(
        sheets,
        spreadsheetId,
        args.programId
      );

    case "financial_report_evm_executive":
      return await reporting.generateEVMExecutiveSummary(
        sheets,
        spreadsheetId,
        args.programId
      );

    case "financial_report_cashflow_statement":
      return await reporting.generateCashFlowStatement(
        sheets,
        spreadsheetId,
        args.programId,
        args.periodMonths || 1
      );

    case "financial_report_cashflow_position":
      return await reporting.generateCashPositionReport(
        sheets,
        spreadsheetId,
        args.programId
      );

    case "financial_report_cashflow_burn":
      return await reporting.generateCashBurnReport(
        sheets,
        spreadsheetId,
        args.programId
      );

    case "financial_report_cashflow_executive":
      return await reporting.generateCashFlowExecutiveSummary(
        sheets,
        spreadsheetId,
        args.programId
      );

    case "financial_report_cost_variance":
      return await reporting.generateCostVarianceReport(
        sheets,
        spreadsheetId,
        args.programId
      );

    case "financial_report_schedule_variance":
      return await reporting.generateScheduleVarianceReport(
        sheets,
        spreadsheetId,
        args.programId
      );

    case "financial_report_variance_executive":
      return await reporting.generateVarianceExecutiveSummary(
        sheets,
        spreadsheetId,
        args.programId
      );

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
