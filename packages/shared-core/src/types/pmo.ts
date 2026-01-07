/**
 * PMO Type Definitions
 * Minimal risk-related types for compliance server
 */

export type RiskStatus = "active" | "closed" | "monitoring";

export interface Risk {
  id: string;
  name: string;
  category: string;
  probability: number; // 1-5
  impact: number; // 1-5
  score: number; // probability × impact
  status: RiskStatus;
  response: string;
  owner: string;
  mitigation: number; // 0-100
}

export interface EVMData {
  week: number;
  pv: number;
  ev: number;
  ac: number;
  sv: number;
  cv: number;
  spi: number;
  cpi: number;
}
