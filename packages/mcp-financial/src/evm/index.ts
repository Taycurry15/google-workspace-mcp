/**
 * EVM (Earned Value Management) Module
 * Exports all EVM calculation and snapshot functions
 */

export {
  calculatePV,
  calculateEV,
  calculateAC,
  calculateBAC,
  calculateEVMMetrics,
  performEVMCalculation,
  calculateHealthIndex,
  type HealthStatus,
} from "./calculations.js";

export {
  SNAPSHOT_COLUMNS,
  parseSnapshotRow,
  snapshotToRow,
  createSnapshot,
  readSnapshot,
  listSnapshots,
  getLatestSnapshot,
  getSnapshotHistory,
  compareSnapshots,
  deleteSnapshot,
  type SnapshotComparison,
} from "./snapshots.js";

export {
  calculateLinearRegression,
  analyzeCPITrend,
  analyzeSPITrend,
  calculateMovingAverage,
  detectAnomalies,
  analyzePerformanceTrend,
  compareToBaseline,
  type DataPoint,
  type LinearRegression,
  type TrendDirection,
  type IndexTrendAnalysis,
  type CPITrendAnalysis,
  type SPITrendAnalysis,
  type Anomaly,
  type RiskLevel,
  type PerformanceTrendAnalysis,
  type BaselineComparison,
} from "./trending.js";

export {
  forecastEACUsingCPI,
  forecastEACUsingCPIAndSPI,
  forecastETC,
  forecastCompletionDate,
  forecastBudgetAtCompletion,
  generateForecastScenarios,
  calculateRequiredPerformance,
  type ConfidenceLevel,
  type ForecastMethod,
} from "./forecasting.js";
