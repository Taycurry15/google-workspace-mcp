/**
 * Subcontract Management Type Definitions
 * 
 * Defines all types for vendor management, contract tracking,
 * invoice processing, and vendor performance evaluation
 */

/**
 * Vendor Status
 */
export type VendorStatus = 
  | "prospective"      // Under evaluation
  | "approved"         // Approved for work
  | "active"           // Currently engaged
  | "suspended"        // Temporarily suspended
  | "debarred"         // Permanently banned
  | "inactive";        // No longer working

/**
 * Vendor Category
 */
export type VendorCategory =
  | "professional_services"
  | "it_services"
  | "construction"
  | "manufacturing"
  | "consulting"
  | "logistics"
  | "other";

/**
 * Vendor Interface
 * Represents a vendor/subcontractor
 */
export interface Vendor {
  vendorId: string;              // VEND-001
  name: string;
  legalName: string;
  taxId: string;                 // EIN/TIN
  dunsNumber?: string;           // D&B number
  category: VendorCategory;
  status: VendorStatus;
  
  // Contact Information
  primaryContact: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  
  // Business Information
  cageCode?: string;             // For government contracts
  smallBusiness: boolean;
  womanOwned: boolean;
  minorityOwned: boolean;
  veteranOwned: boolean;
  
  // Financial
  paymentTerms: string;          // Net 30, Net 60, etc.
  currency: string;              // USD, EUR, etc.
  
  // Compliance
  dueDiligenceCompleted: boolean;
  dueDiligenceDate?: Date;
  insuranceCurrent: boolean;
  insuranceExpiry?: Date;
  
  // Performance
  performanceRating?: number;    // 0-100
  totalContractValue: number;
  activeContracts: number;
  
  // Metadata
  createdDate: Date;
  createdBy: string;
  lastModified: Date;
  notes?: string;
}

/**
 * Vendor Contact
 */
export interface VendorContact {
  contactId: string;             // VC-001
  vendorId: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  isPrimary: boolean;
  department?: string;
  notes?: string;
}

/**
 * Contract Type
 */
export type ContractType =
  | "fixed_price"                // Firm Fixed Price
  | "cost_plus"                  // Cost Plus
  | "time_and_materials"         // T&M
  | "indefinite_delivery"        // IDIQ
  | "purchase_order"             // Simple PO
  | "other";

/**
 * Contract Status
 */
export type ContractStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "active"
  | "completed"
  | "terminated"
  | "closed";

/**
 * Contract Interface
 * Represents a contract with a vendor
 */
export interface Contract {
  contractId: string;            // CONT-001
  contractNumber: string;        // External contract number
  vendorId: string;
  programId: string;             // Linked to program
  
  // Contract Details
  title: string;
  description: string;
  type: ContractType;
  status: ContractStatus;
  
  // Financial
  totalValue: number;
  currency: string;
  fundingSource: string;
  
  // Dates
  startDate: Date;
  endDate: Date;
  signedDate?: Date;
  
  // Parties
  contractManager: string;       // PM responsible
  vendorSignatory: string;
  clientSignatory: string;
  
  // Terms
  paymentTerms: string;
  deliveryTerms: string;
  penaltyClause?: string;
  
  // Performance
  performanceBond: boolean;
  bondAmount?: number;
  warrantyPeriod?: number;       // Days
  
  // SOW
  scopeOfWork: string;
  deliverables: string[];        // Deliverable IDs
  
  // Compliance
  fcpaReviewRequired: boolean;
  fcpaReviewCompleted: boolean;
  
  // Metadata
  createdDate: Date;
  createdBy: string;
  lastModified: Date;
  documentUrl?: string;          // Google Drive URL
  notes?: string;
}

/**
 * Contract Modification
 */
export interface ContractModification {
  modificationId: string;        // MOD-001
  contractId: string;
  modificationNumber: number;    // 1, 2, 3...
  
  title: string;
  description: string;
  reason: string;
  
  // Financial Impact
  valueChange: number;           // Can be negative
  newTotalValue: number;
  
  // Schedule Impact
  dateChange?: {
    oldEndDate: Date;
    newEndDate: Date;
  };
  
  // Approval
  requestedBy: string;
  requestedDate: Date;
  approvedBy?: string;
  approvedDate?: Date;
  status: "pending" | "approved" | "rejected";
  
  effectiveDate?: Date;
  documentUrl?: string;
}

/**
 * SOW Deliverable
 * Links contract deliverables to program deliverables
 */
export interface SOWDeliverable {
  sowDeliverableId: string;      // SOW-001
  contractId: string;
  deliverableId: string;         // Links to mcp-deliverables
  programId: string;
  
  description: string;
  dueDate: Date;
  acceptanceCriteria: string;
  
  // Status
  status: "pending" | "in_progress" | "submitted" | "accepted" | "rejected";
  submittedDate?: Date;
  acceptedDate?: Date;
  
  // Quality
  qualityScore?: number;
  reviewNotes?: string;
}

/**
 * Invoice Status
 */
export type InvoiceStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "paid"
  | "disputed";

/**
 * Invoice Interface
 */
export interface Invoice {
  invoiceId: string;             // INV-001
  invoiceNumber: string;         // Vendor's invoice number
  contractId: string;
  vendorId: string;
  programId: string;
  
  // Financial
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  
  // Dates
  invoiceDate: Date;
  dueDate: Date;
  receivedDate: Date;
  
  // Status
  status: InvoiceStatus;
  
  // Review
  reviewedBy?: string;
  reviewedDate?: Date;
  approvedBy?: string;
  approvedDate?: Date;
  
  // Payment
  paidDate?: Date;
  paymentReference?: string;
  
  // Line Items
  lineItems: InvoiceLineItem[];
  
  // Validation
  validationErrors?: string[];
  validationWarnings?: string[];
  
  // Metadata
  submittedBy: string;
  submittedDate: Date;
  documentUrl?: string;
  notes?: string;
}

/**
 * Invoice Line Item
 */
export interface InvoiceLineItem {
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  
  // Reference
  sowDeliverableId?: string;
  
  // Validation
  contractLineItem?: string;
  isValid: boolean;
  validationMessage?: string;
}

/**
 * Vendor Performance Review
 */
export interface VendorPerformance {
  performanceId: string;         // PERF-001
  vendorId: string;
  contractId?: string;           // Optional: specific contract or overall
  programId: string;
  
  // Review Period
  periodStart: Date;
  periodEnd: Date;
  
  // Metrics (0-100 scale)
  qualityScore: number;          // Deliverable quality
  deliveryScore: number;         // On-time delivery
  costScore: number;             // Budget adherence
  communicationScore: number;    // Responsiveness
  complianceScore: number;       // Regulatory compliance
  
  // Overall
  overallScore: number;          // Weighted average
  
  // Details
  strengths: string[];
  weaknesses: string[];
  recommendations: string;
  
  // Actions
  actionItems: string[];
  followUpRequired: boolean;
  
  // Metadata
  reviewedBy: string;
  reviewDate: Date;
  notes?: string;
}

/**
 * Performance Metric Type
 */
export type PerformanceMetricType =
  | "quality"
  | "delivery"
  | "cost"
  | "communication"
  | "compliance";

/**
 * Performance Trend
 */
export interface PerformanceTrend {
  vendorId: string;
  metricType: PerformanceMetricType;
  dataPoints: Array<{
    date: Date;
    score: number;
  }>;
  trend: "improving" | "stable" | "declining";
  currentScore: number;
  averageScore: number;
}
