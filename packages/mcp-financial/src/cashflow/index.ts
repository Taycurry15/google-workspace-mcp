/**
 * Cash Flow Module
 *
 * Exports all cash flow management functions
 */

export {
  CASHFLOW_COLUMNS,
  parseCashFlowRow,
  cashFlowToRow,
  createCashFlow,
  readCashFlow,
  updateCashFlow,
  listCashFlows,
  deleteCashFlow,
  recordActualCashFlow,
  getUpcomingCashFlows,
  getOverdueCashFlows,
  getCashFlowProjection,
  getCashFlowStatus,
  reconcileCashFlow,
} from "./cashflow.js";

export type { CreateCashFlowInput, UpdateCashFlowInput } from "./cashflow.js";

// Forecasting functions
export {
  forecastMonthlyCashFlow,
  forecastWeeklyCashFlow,
  identifyCashShortfalls,
  calculateRunway,
  forecastCashPosition,
  generateCashFlowScenarios,
  identifySeasonalTrends,
} from "./forecasting.js";

export type {
  MonthlyCashFlowForecast,
  WeeklyCashFlowForecast,
  CashShortfall,
  RunwayAnalysis,
  CashPositionForecast,
  CashFlowScenarios,
  SeasonalTrend,
  SeasonalTrendsAnalysis,
} from "./forecasting.js";

// Analysis functions
export {
  calculateBurnRate,
  analyzeCashVelocity,
  identifyLargestCashFlows,
  analyzeCashFlowConcentration,
  compareActualVsForecast,
  calculateCashFlowRatios,
  generateCashFlowSummary,
} from "./analysis.js";

export type {
  BurnRateResult,
  CashVelocityResult,
  LargestCashFlowsResult,
  ConcentrationItem,
  ConcentrationAnalysisResult,
  ActualVsForecastResult,
  CashFlowRatiosResult,
  CashFlowSummaryResult,
} from "./analysis.js";
