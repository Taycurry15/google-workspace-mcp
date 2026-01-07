/**
 * Document Routing Types
 *
 * Types for AI-powered document classification and routing
 */

/**
 * Document types that can be classified
 */
export type DocumentType =
  | "program_charter"
  | "proposal"
  | "contract"
  | "invoice"
  | "deliverable"
  | "financial_report"
  | "risk_assessment"
  | "meeting_minutes"
  | "status_report"
  | "change_request"
  | "lesson_learned"
  | "quality_report"
  | "vendor_evaluation"
  | "budget_document"
  | "technical_document"
  | "other";

/**
 * Target server for document type
 */
export type TargetServer =
  | "mcp-program"
  | "mcp-deliverables"
  | "mcp-subcontract"
  | "mcp-compliance"
  | "mcp-financial";

/**
 * Document classification result
 */
export interface DocumentClassification {
  documentType: DocumentType;
  confidence: number; // 0-1
  targetServers: TargetServer[]; // Primary and secondary servers
  suggestedFolder: string; // Drive folder path
  metadata: DocumentMetadata;
  reasoning?: string; // LLM reasoning for classification
}

/**
 * Document metadata extracted from content
 */
export interface DocumentMetadata {
  programId?: string;
  projectId?: string;
  deliverableId?: string;
  contractId?: string;
  vendorId?: string;
  milestoneId?: string;
  riskId?: string;
  changeId?: string;
  documentDate?: Date;
  author?: string;
  title?: string;
  keywords?: string[];
  entities?: ExtractedEntity[];
}

/**
 * Extracted entity from document
 */
export interface ExtractedEntity {
  type: "program" | "deliverable" | "contract" | "vendor" | "milestone" | "person" | "date" | "amount";
  value: string;
  confidence: number;
}

/**
 * Document routing configuration
 */
export interface RoutingConfig {
  documentType: DocumentType;
  folderTemplate: string; // e.g., "Contracts/{programId}/{vendorId}"
  targetServers: TargetServer[];
  notificationEnabled: boolean;
  autoTag: boolean;
}

/**
 * Document routing result
 */
export interface RoutingResult {
  success: boolean;
  documentId: string;
  originalLocation: string;
  newLocation?: string;
  targetFolder?: string;
  classification: DocumentClassification;
  notificationsSent: string[]; // Server IDs notified
  error?: string;
}

/**
 * Document routing rules
 */
export const ROUTING_RULES: Record<DocumentType, RoutingConfig> = {
  program_charter: {
    documentType: "program_charter",
    folderTemplate: "Programs/{programId}/Charter",
    targetServers: ["mcp-program"],
    notificationEnabled: true,
    autoTag: true,
  },
  proposal: {
    documentType: "proposal",
    folderTemplate: "Programs/{programId}/Proposals",
    targetServers: ["mcp-program", "mcp-deliverables"],
    notificationEnabled: true,
    autoTag: true,
  },
  contract: {
    documentType: "contract",
    folderTemplate: "Contracts/{programId}/{vendorId}",
    targetServers: ["mcp-subcontract", "mcp-compliance"],
    notificationEnabled: true,
    autoTag: true,
  },
  invoice: {
    documentType: "invoice",
    folderTemplate: "Invoices/{programId}/{vendorId}/{contractId}",
    targetServers: ["mcp-subcontract", "mcp-financial"],
    notificationEnabled: true,
    autoTag: true,
  },
  deliverable: {
    documentType: "deliverable",
    folderTemplate: "Deliverables/{programId}/{deliverableId}",
    targetServers: ["mcp-deliverables"],
    notificationEnabled: true,
    autoTag: true,
  },
  financial_report: {
    documentType: "financial_report",
    folderTemplate: "Financial/{programId}/Reports",
    targetServers: ["mcp-financial"],
    notificationEnabled: true,
    autoTag: true,
  },
  risk_assessment: {
    documentType: "risk_assessment",
    folderTemplate: "Compliance/{programId}/Risks",
    targetServers: ["mcp-compliance"],
    notificationEnabled: true,
    autoTag: true,
  },
  meeting_minutes: {
    documentType: "meeting_minutes",
    folderTemplate: "Programs/{programId}/Meetings",
    targetServers: ["mcp-program"],
    notificationEnabled: true,
    autoTag: true,
  },
  status_report: {
    documentType: "status_report",
    folderTemplate: "Programs/{programId}/Reports",
    targetServers: ["mcp-program"],
    notificationEnabled: true,
    autoTag: true,
  },
  change_request: {
    documentType: "change_request",
    folderTemplate: "Programs/{programId}/Changes",
    targetServers: ["mcp-program"],
    notificationEnabled: true,
    autoTag: true,
  },
  lesson_learned: {
    documentType: "lesson_learned",
    folderTemplate: "Programs/{programId}/Lessons",
    targetServers: ["mcp-program"],
    notificationEnabled: true,
    autoTag: true,
  },
  quality_report: {
    documentType: "quality_report",
    folderTemplate: "Deliverables/{programId}/Quality",
    targetServers: ["mcp-deliverables"],
    notificationEnabled: true,
    autoTag: true,
  },
  vendor_evaluation: {
    documentType: "vendor_evaluation",
    folderTemplate: "Vendors/{vendorId}/Evaluations",
    targetServers: ["mcp-subcontract"],
    notificationEnabled: true,
    autoTag: true,
  },
  budget_document: {
    documentType: "budget_document",
    folderTemplate: "Financial/{programId}/Budgets",
    targetServers: ["mcp-financial"],
    notificationEnabled: true,
    autoTag: true,
  },
  technical_document: {
    documentType: "technical_document",
    folderTemplate: "Documents/{programId}/Technical",
    targetServers: ["mcp-program"],
    notificationEnabled: false,
    autoTag: true,
  },
  other: {
    documentType: "other",
    folderTemplate: "Documents/{programId}/Other",
    targetServers: [],
    notificationEnabled: false,
    autoTag: false,
  },
};
