/**
 * PMO Type Definitions
 * Data models for Project Management Office integration
 */

import { PARACategory, ActionabilityLevel } from "./para.js";

export type DeliverableStatus =
  | "not-started"
  | "in-progress"
  | "in-review"
  | "complete";

export type DeliverablePriority = "critical" | "high" | "medium" | "low";

export type RiskStatus = "active" | "closed" | "monitoring";

export interface Deliverable {
  id: string; // D-01, D-02, etc.
  name: string;
  wbs: string; // Work Breakdown Structure code (e.g., 1.2.3)
  week: number; // Week number
  status: DeliverableStatus;
  quality: number; // Quality score 0-100
  budget: number; // Budget in USD
  responsible: string; // R in RACI (Responsible)
  accountable: string; // A in RACI (Accountable)
  priority: DeliverablePriority;

  // PARA integration fields
  para_category?: PARACategory;
  para_actionability?: ActionabilityLevel;
  para_tags?: string[];
}

export interface Risk {
  id: string; // R-01, R-02, etc.
  name: string;
  category: string; // Technical, Schedule, Budget, Political, etc.
  probability: number; // 1-5 scale
  impact: number; // 1-5 scale
  score: number; // probability × impact (1-25)
  status: RiskStatus;
  response: string; // Mitigation strategy/plan
  owner: string; // Risk owner
  mitigation: number; // Mitigation progress percentage (0-100)

  // PARA integration
  para_needs_review?: boolean;
}

export interface EVMData {
  week: number;
  pv: number; // Planned Value
  ev: number; // Earned Value
  ac: number; // Actual Cost
  spi: number; // Schedule Performance Index (EV/PV)
  cpi: number; // Cost Performance Index (EV/AC)
  eac: number; // Estimate at Completion
  vac: number; // Variance at Completion (BAC - EAC)
}

export interface EVMAnalysis {
  data: EVMData[];
  insights: string; // AI-generated analysis
  trends: {
    spi: "improving" | "stable" | "declining";
    cpi: "improving" | "stable" | "declining";
  };
  forecast: {
    completionDate: string; // ISO date
    finalCost: number;
  };
}

export interface StakeholderInfo {
  id: string; // G-01, G-02, etc. (Government stakeholders)
  name: string;
  role: string;
  email: string;
  influence: number; // 1-5 scale
  interest: number; // 1-5 scale
  engagement: number; // Current engagement level 1-5
  sentiment?: number; // AI-calculated sentiment 0-1 (from communications)
}

export interface SentimentAnalysis {
  stakeholder_id: string;
  name: string;
  overall_sentiment: number; // 0-1 (0=very negative, 1=very positive)
  engagement_level: number; // 1-5
  trend: "improving" | "stable" | "declining";
  key_concerns: string[]; // AI-extracted concerns
  recommended_actions: string[]; // AI-suggested actions
  email_count: number; // Number of emails analyzed
  date_range: {
    start: string;
    end: string;
  };
}

export interface PMOMetadata {
  pmo_deliverable_id?: string;
  pmo_wbs?: string;
  pmo_priority?: string;
  pmo_risk_score?: number;
  pmo_week?: number;
}

export interface WeeklyReport {
  week: number;
  documentId: string;
  url: string;
  created: string; // ISO date
  summary: {
    total_deliverables: number;
    completed_deliverables: number;
    in_progress_deliverables: number;
    critical_risks: number;
    spi: number;
    cpi: number;
  };
}

/**
 * Proposal Processing Types
 * For automated extraction and creation of PMO items from proposals
 */

export interface ProposalAnalysis {
  sessionId: string;
  documentInfo: {
    fileId: string;
    fileName: string;
    analyzedAt: string;
  };
  projectMetadata: {
    projectName: string;
    projectObjective: string;
    estimatedDuration?: string;
    totalBudget?: number;
    startDate?: string;
    confidence: number;
  };
  deliverables: ProposedDeliverable[];
  risks: ProposedRisk[];
  stakeholders: ProposedStakeholder[];
  clarificationNeeded: {
    scope: string[];
    risks: string[];
    stakeholders: string[];
    resources: string[];
  };
}

export interface ProposedDeliverable {
  name: string;
  description?: string;
  wbs?: string; // Auto-assigned: "1.2.3"
  phase?: number; // 1-4
  week?: number;
  estimatedHours?: number;
  estimatedBudget?: number;
  priority: DeliverablePriority;
  responsible?: string; // R in RACI
  accountable?: string; // A in RACI
  confidence: number; // 0-1
}

export interface ProposedRisk {
  name: string;
  description: string;
  category:
    | "Technical"
    | "Schedule"
    | "Budget"
    | "Political"
    | "Resource"
    | "External";
  estimatedProbability?: number; // 1-5 scale
  estimatedImpact?: number; // 1-5 scale
  suggestedResponse?: string; // Mitigation strategy
  owner?: string; // Risk owner
  confidence: number; // 0-1
}

export interface ProposedStakeholder {
  name: string;
  role: string;
  email?: string;
  influence?: number; // 1-5 scale
  interest?: number; // 1-5 scale
  department?: string;
  confidence: number; // 0-1
}

export interface ClarificationQuestion {
  category:
    | "scope"
    | "risks"
    | "stakeholders"
    | "resources"
    | "budget"
    | "timeline";
  question: string;
  relatedTo?: string; // Optional reference to specific item
  priority: "high" | "medium" | "low";
}

export interface ProposalSession {
  sessionId: string;
  analysis: ProposalAnalysis;
  questions?: ClarificationQuestion[];
  answers?: Record<string, string>; // Question -> Answer mapping
  refinedData?: ProposalAnalysis;
  createdAt: Date;
  expiresAt: Date;
}
