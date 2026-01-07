/**
 * Financial Management Type Definitions
 *
 * Defines all types for budget tracking, EVM analysis,
 * cash flow forecasting, and financial reporting
 */

/**
 * Budget Category Types
 */
export type BudgetCategory =
  | "labor"
  | "materials"
  | "equipment"
  | "subcontracts"
  | "travel"
  | "indirect"
  | "contingency"
  | "other";

/**
 * Budget Status
 */
export type BudgetStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "active"
  | "closed";

/**
 * Budget Interface
 * Represents a budget allocation for a program or project
 */
export interface Budget {
  budgetId: string;              // BUD-001
  programId: string;
  projectId?: string;            // Optional: sub-project level

  // Budget Details
  name: string;
  description: string;
  category: BudgetCategory;
  status: BudgetStatus;

  // Financial Amounts
  allocated: number;             // Total budget allocated
  committed: number;             // Funds committed but not spent
  spent: number;                 // Actual expenditures
  remaining: number;             // allocated - spent

  // Period
  fiscalYear: string;            // FY2024, FY2025
  periodStart: Date;
  periodEnd: Date;

  // Variance
  variance: number;              // allocated - spent
  variancePercent: number;       // variance / allocated * 100

  // Approvals
  requestedBy: string;
  approvedBy?: string;
  approvedDate?: Date;

  // Metadata
  currency: string;              // USD, EUR, etc.
  createdDate: Date;
  createdBy: string;
  lastModified: Date;
  notes?: string;
}

/**
 * Budget Line Item
 * Detailed breakdown of budget allocations
 */
export interface BudgetLineItem {
  lineItemId: string;            // BLI-001
  budgetId: string;

  lineNumber: number;
  description: string;
  category: BudgetCategory;

  // Amounts
  allocated: number;
  spent: number;
  remaining: number;

  // References
  costCenterId?: string;
  accountCode?: string;

  // Notes
  justification?: string;
  assumptions?: string;
}

/**
 * Cost Center
 * Organizational unit for cost tracking
 */
export interface CostCenter {
  costCenterId: string;          // CC-001
  programId: string;

  name: string;
  code: string;                  // CC-ENGG, CC-ADMIN
  description: string;

  // Hierarchy
  parentCostCenterId?: string;

  // Budget
  totalBudget: number;
  totalSpent: number;

  // Manager
  managerId: string;
  managerName: string;

  // Status
  isActive: boolean;

  // Metadata
  createdDate: Date;
  lastModified: Date;
}

/**
 * EVM Snapshot Interface
 * Point-in-time snapshot of Earned Value Management metrics
 */
export interface EVMSnapshot {
  snapshotId: string;            // EVM-001
  programId: string;
  projectId?: string;

  // Snapshot Details
  snapshotDate: Date;
  reportingPeriod: string;       // "2024-Q1", "2024-W42"

  // Core EVM Metrics
  pv: number;                    // Planned Value (BCWS)
  ev: number;                    // Earned Value (BCWP)
  ac: number;                    // Actual Cost (ACWP)

  // Variance Metrics
  sv: number;                    // Schedule Variance (EV - PV)
  cv: number;                    // Cost Variance (EV - AC)
  svPercent: number;             // SV / PV * 100
  cvPercent: number;             // CV / AC * 100

  // Performance Indices
  spi: number;                   // Schedule Performance Index (EV / PV)
  cpi: number;                   // Cost Performance Index (EV / AC)

  // Forecasting Metrics
  bac: number;                   // Budget at Completion
  eac: number;                   // Estimate at Completion
  etc: number;                   // Estimate to Complete
  vac: number;                   // Variance at Completion (BAC - EAC)
  tcpi: number;                  // To-Complete Performance Index

  // Completion Metrics
  percentComplete: number;       // Physical % complete
  percentScheduleComplete: number; // Planned % complete

  // Trend Data
  trend: "improving" | "stable" | "declining";

  // Metadata
  calculatedBy: string;
  calculatedDate: Date;
  notes?: string;
}

/**
 * EVM Metrics Interface
 * Calculated EVM metrics (derived from PV, EV, AC, BAC)
 */
export interface EVMMetrics {
  // Variance Metrics
  cv: number;                    // Cost Variance (EV - AC)
  sv: number;                    // Schedule Variance (EV - PV)
  cvPercent: number;             // CV / AC * 100
  svPercent: number;             // SV / PV * 100

  // Performance Indices
  cpi: number;                   // Cost Performance Index (EV / AC)
  spi: number;                   // Schedule Performance Index (EV / PV)

  // Forecasting Metrics
  eac: number;                   // Estimate at Completion (BAC / CPI)
  etc: number;                   // Estimate to Complete (EAC - AC)
  vac: number;                   // Variance at Completion (BAC - EAC)
  tcpi: number;                  // To-Complete Performance Index
}

/**
 * Cash Flow Type
 */
export type CashFlowType =
  | "inflow"                     // Money coming in
  | "outflow";                   // Money going out

/**
 * Cash Flow Category
 */
export type CashFlowCategory =
  | "client_payment"             // Payment from client
  | "milestone_payment"          // Milestone-based payment
  | "vendor_payment"             // Payment to vendor
  | "payroll"                    // Employee salaries
  | "invoice_payment"            // Invoice payment
  | "expense_reimbursement"      // Expense reimbursement
  | "other";

/**
 * Cash Flow Status
 */
export type CashFlowStatus =
  | "forecasted"                 // Future expected flow
  | "scheduled"                  // Scheduled payment
  | "pending"                    // Awaiting processing
  | "completed"                  // Payment completed
  | "cancelled";                 // Payment cancelled

/**
 * Cash Flow Interface
 * Tracks cash inflows and outflows
 */
export interface CashFlow {
  flowId: string;                // CF-001
  programId: string;

  // Flow Details
  type: CashFlowType;
  category: CashFlowCategory;
  description: string;

  // Financial
  amount: number;
  currency: string;

  // Dates
  forecastDate: Date;            // When cash flow is expected
  actualDate?: Date;             // When it actually occurred

  // Status
  status: CashFlowStatus;

  // References
  invoiceId?: string;            // Link to invoice if applicable
  contractId?: string;           // Link to contract
  budgetId?: string;             // Link to budget

  // Payment Details
  paymentMethod?: string;        // Wire, ACH, Check, etc.
  paymentReference?: string;

  // Metadata
  createdDate: Date;
  createdBy: string;
  lastModified: Date;
  notes?: string;
}

/**
 * Financial Transaction
 * Detailed record of all financial transactions
 */
export interface FinancialTransaction {
  transactionId: string;         // TXN-001
  programId: string;

  // Transaction Details
  transactionDate: Date;
  postingDate: Date;
  description: string;

  // Amounts
  debit: number;                 // Debit amount
  credit: number;                // Credit amount
  amount: number;                // Net amount (debit - credit)

  // Classification
  category: BudgetCategory;
  costCenterId?: string;
  accountCode: string;           // GL account code

  // References
  budgetId?: string;
  invoiceId?: string;
  contractId?: string;

  // Reconciliation
  isReconciled: boolean;
  reconciledDate?: Date;
  reconciledBy?: string;

  // Approval
  approvedBy?: string;
  approvedDate?: Date;

  // Metadata
  enteredBy: string;
  enteredDate: Date;
  currency: string;
  notes?: string;
}

/**
 * Financial Report Type
 */
export type FinancialReportType =
  | "budget_vs_actual"
  | "evm_analysis"
  | "cash_flow_statement"
  | "variance_report"
  | "cost_center_report"
  | "executive_summary"
  | "forecast_report";

/**
 * Financial Report Status
 */
export type FinancialReportStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published";

/**
 * Financial Report Interface
 * Generated financial reports
 */
export interface FinancialReport {
  reportId: string;              // REP-001
  programId: string;

  // Report Details
  reportType: FinancialReportType;
  title: string;
  description: string;

  // Period
  periodStart: Date;
  periodEnd: Date;
  reportingDate: Date;

  // Status
  status: FinancialReportStatus;

  // Content (stored as JSON)
  data: Record<string, any>;     // Flexible structure for different report types

  // Key Metrics (for quick reference)
  summary: {
    totalBudget?: number;
    totalSpent?: number;
    totalVariance?: number;
    cpi?: number;
    spi?: number;
    burnRate?: number;
    runway?: number;              // Months of runway remaining
  };

  // Attachments
  documentUrl?: string;          // Google Drive URL for PDF/Excel
  chartUrls?: string[];          // Chart images

  // Review
  generatedBy: string;
  generatedDate: Date;
  reviewedBy?: string;
  reviewedDate?: Date;
  approvedBy?: string;
  approvedDate?: Date;

  // Distribution
  distributedTo?: string[];      // Email addresses
  distributedDate?: Date;

  notes?: string;
}

/**
 * Burn Rate Analysis
 * Tracks spending rate over time
 */
export interface BurnRateAnalysis {
  analysisId: string;            // BRA-001
  programId: string;

  // Period
  periodStart: Date;
  periodEnd: Date;

  // Metrics
  totalBudget: number;
  totalSpent: number;
  averageDailyBurn: number;
  averageWeeklyBurn: number;
  averageMonthlyBurn: number;

  // Forecast
  projectedCompletionDate: Date;
  projectedFinalCost: number;
  runwayMonths: number;          // Months until budget depleted
  runwayWeeks: number;

  // Trend
  trend: "accelerating" | "stable" | "decelerating";
  trendPercentChange: number;    // % change in burn rate vs previous period

  // Analysis
  recommendations: string[];
  warnings: string[];

  // Metadata
  analyzedBy: string;
  analyzedDate: Date;
}

/**
 * Variance Analysis
 * Detailed analysis of budget vs actual variances
 */
export interface VarianceAnalysis {
  varianceId: string;            // VAR-001
  programId: string;
  budgetId?: string;             // Optional: specific budget or overall

  // Period
  periodStart: Date;
  periodEnd: Date;

  // Amounts
  budgeted: number;
  actual: number;
  variance: number;              // budgeted - actual
  variancePercent: number;       // variance / budgeted * 100

  // Classification
  varianceType: "favorable" | "unfavorable";
  category: BudgetCategory;

  // Analysis
  rootCause: string;
  explanation: string;
  impact: "low" | "medium" | "high";

  // Action Items
  correctiveActions: string[];
  responsibleParty: string;
  dueDate?: Date;

  // Status
  status: "identified" | "analyzing" | "action_taken" | "resolved";

  // Metadata
  identifiedBy: string;
  identifiedDate: Date;
  resolvedDate?: Date;
}

/**
 * Forecast Model
 * Financial forecasting parameters and results
 */
export interface ForecastModel {
  forecastId: string;            // FCT-001
  programId: string;

  // Model Details
  modelName: string;
  modelType: "linear" | "monte_carlo" | "regression" | "manual";
  description: string;

  // Period
  forecastDate: Date;
  forecastHorizon: number;       // Months into future

  // Input Parameters
  baselineBudget: number;
  currentSpent: number;
  currentCPI: number;
  currentSPI: number;

  // Forecast Results
  forecastedEAC: number;         // Forecasted Estimate at Completion
  forecastedCompletionDate: Date;
  confidenceLevel: number;       // 0-100

  // Risk Factors
  optimisticCase: number;        // Best case EAC
  pessimisticCase: number;       // Worst case EAC
  mostLikelyCase: number;        // Most likely EAC

  // Assumptions
  assumptions: string[];
  risks: string[];

  // Accuracy (if historical)
  actualEAC?: number;
  forecastAccuracy?: number;     // % accuracy of forecast

  // Metadata
  createdBy: string;
  createdDate: Date;
  lastUpdated: Date;
}

/**
 * Payment Schedule
 * Schedule of expected payments to/from vendors and clients
 */
export interface PaymentSchedule {
  scheduleId: string;            // PS-001
  programId: string;

  // Related Entity
  entityType: "vendor" | "client" | "internal";
  entityId: string;              // vendorId, clientId, etc.
  contractId?: string;

  // Payment Details
  description: string;
  totalAmount: number;
  currency: string;

  // Schedule
  frequency: "one_time" | "weekly" | "monthly" | "quarterly" | "milestone_based";
  startDate: Date;
  endDate?: Date;

  // Milestones (if milestone-based)
  milestones?: Array<{
    milestoneId: string;
    description: string;
    amount: number;
    dueDate: Date;
    status: "pending" | "due" | "paid";
    paidDate?: Date;
  }>;

  // Status
  isActive: boolean;
  totalPaid: number;
  totalRemaining: number;

  // Metadata
  createdBy: string;
  createdDate: Date;
  lastModified: Date;
  notes?: string;
}
