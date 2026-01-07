/**
 * MCP Tool Definitions for Subcontract Server
 *
 * Defines all tools exposed via the MCP protocol
 */

import type { OAuth2Client } from "google-auth-library";
import type { sheets_v4 } from "googleapis";
import { initializeAuth, createSheetsClient } from "@gw-mcp/shared-core";
import * as vendors from "./vendors/vendors.js";
import * as contacts from "./vendors/contacts.js";
import * as contracts from "./contracts/contracts.js";
import * as sow from "./contracts/sow.js";
import * as modifications from "./contracts/modifications.js";
import * as invoices from "./invoices/invoices.js";
import * as processing from "./invoices/processing.js";
import * as lineItems from "./invoices/line-items.js";
import * as performanceTracking from "./performance/tracking.js";
import * as performanceScoring from "./performance/scoring.js";
import * as performanceReporting from "./performance/reporting.js";

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
 * Tool definitions for Subcontract Management
 */
export const SUBCONTRACT_TOOLS = [
  // Vendor Tools
  {
    name: "subcontract_vendor_create",
    description: "Create a new vendor",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "Spreadsheet ID" },
        vendor: {
          type: "object",
          description: "Vendor data",
          properties: {
            name: { type: "string" },
            legalName: { type: "string" },
            taxId: { type: "string" },
            dunsNumber: { type: "string" },
            category: { type: "string", enum: ["consulting", "it_services", "construction", "supplies", "professional_services", "other"] },
            primaryContact: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            address: {
              type: "object",
              properties: {
                street: { type: "string" },
                city: { type: "string" },
                state: { type: "string" },
                zip: { type: "string" },
                country: { type: "string" },
              },
            },
            cageCode: { type: "string" },
            smallBusiness: { type: "boolean" },
            womanOwned: { type: "boolean" },
            minorityOwned: { type: "boolean" },
            veteranOwned: { type: "boolean" },
            paymentTerms: { type: "string" },
            currency: { type: "string" },
            notes: { type: "string" },
          },
          required: ["name", "legalName", "taxId", "category", "primaryContact", "email", "phone", "address", "paymentTerms"],
        },
        createdBy: { type: "string" },
      },
      required: ["vendor"],
    },
  },
  {
    name: "subcontract_vendor_read",
    description: "Read vendor by ID",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        vendorId: { type: "string", description: "Vendor ID to read" },
      },
      required: ["vendorId"],
    },
  },
  {
    name: "subcontract_vendor_update",
    description: "Update a vendor",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        vendorId: { type: "string" },
        updates: { type: "object", description: "Fields to update" },
        modifiedBy: { type: "string" },
      },
      required: ["vendorId", "updates"],
    },
  },
  {
    name: "subcontract_vendor_list",
    description: "List vendors with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        filters: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["prospective", "approved", "active", "inactive", "disqualified"] },
            category: { type: "string", enum: ["consulting", "it_services", "construction", "supplies", "professional_services", "other"] },
            smallBusiness: { type: "boolean" },
          },
        },
      },
    },
  },
  {
    name: "subcontract_vendor_due_diligence",
    description: "Get vendors needing due diligence",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        daysAhead: { type: "number", description: "Number of days ahead to check (default: 90)" },
      },
    },
  },
  {
    name: "subcontract_vendor_top_performers",
    description: "Get top performing vendors",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        limit: { type: "number", description: "Number of vendors to return (default: 10)" },
        minRating: { type: "number", description: "Minimum performance rating (default: 80)" },
      },
    },
  },
  {
    name: "subcontract_vendor_delete",
    description: "Delete a vendor (soft delete)",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        vendorId: { type: "string" },
        deletedBy: { type: "string" },
      },
      required: ["vendorId"],
    },
  },

  // Contact Tools
  {
    name: "subcontract_contact_create",
    description: "Create a vendor contact",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        contact: {
          type: "object",
          properties: {
            vendorId: { type: "string" },
            name: { type: "string" },
            title: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            department: { type: "string" },
            notes: { type: "string" },
          },
          required: ["vendorId", "name", "title", "email", "phone"],
        },
      },
      required: ["contact"],
    },
  },
  {
    name: "subcontract_contact_list",
    description: "List contacts for a vendor",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        vendorId: { type: "string" },
      },
      required: ["vendorId"],
    },
  },
  {
    name: "subcontract_contact_set_primary",
    description: "Set primary contact for a vendor",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        contactId: { type: "string" },
      },
      required: ["contactId"],
    },
  },

  // Contract Tools
  {
    name: "subcontract_contract_create",
    description: "Create a new contract",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        contract: {
          type: "object",
          properties: {
            contractNumber: { type: "string" },
            vendorId: { type: "string" },
            programId: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            type: { type: "string", enum: ["ffp", "t_and_m", "cpff", "cpif", "idiq", "other"] },
            totalValue: { type: "number" },
            currency: { type: "string" },
            fundingSource: { type: "string" },
            startDate: { type: "string", description: "ISO date string" },
            endDate: { type: "string", description: "ISO date string" },
            contractManager: { type: "string" },
            vendorSignatory: { type: "string" },
            clientSignatory: { type: "string" },
            paymentTerms: { type: "string" },
            deliveryTerms: { type: "string" },
            penaltyClause: { type: "string" },
            performanceBond: { type: "boolean" },
            bondAmount: { type: "number" },
            warrantyPeriod: { type: "number" },
            scopeOfWork: { type: "string" },
            fcpaReviewRequired: { type: "boolean" },
            documentUrl: { type: "string" },
            notes: { type: "string" },
          },
          required: ["contractNumber", "vendorId", "programId", "title", "description", "type", "totalValue", "fundingSource", "startDate", "endDate", "contractManager", "vendorSignatory", "clientSignatory", "paymentTerms", "deliveryTerms", "scopeOfWork"],
        },
        createdBy: { type: "string" },
      },
      required: ["contract"],
    },
  },
  {
    name: "subcontract_contract_read",
    description: "Read contract by ID",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        contractId: { type: "string" },
      },
      required: ["contractId"],
    },
  },
  {
    name: "subcontract_contract_update",
    description: "Update a contract",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        contractId: { type: "string" },
        updates: { type: "object", description: "Fields to update" },
        modifiedBy: { type: "string" },
      },
      required: ["contractId", "updates"],
    },
  },
  {
    name: "subcontract_contract_list",
    description: "List contracts with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        filters: {
          type: "object",
          properties: {
            vendorId: { type: "string" },
            programId: { type: "string" },
            status: { type: "string", enum: ["draft", "pending_approval", "active", "suspended", "completed", "terminated"] },
            type: { type: "string", enum: ["ffp", "t_and_m", "cpff", "cpif", "idiq", "other"] },
          },
        },
      },
    },
  },
  {
    name: "subcontract_contract_active",
    description: "Get active contracts",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        vendorId: { type: "string", description: "Optional vendor filter" },
      },
    },
  },
  {
    name: "subcontract_contract_expiring",
    description: "Get expiring contracts",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        daysAhead: { type: "number", description: "Number of days ahead to check (default: 90)" },
      },
    },
  },
  {
    name: "subcontract_contract_delete",
    description: "Delete a contract (soft delete)",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        contractId: { type: "string" },
        deletedBy: { type: "string" },
      },
      required: ["contractId"],
    },
  },

  // SOW Deliverable Tools
  {
    name: "subcontract_sow_link",
    description: "Link a deliverable to a contract",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        contractId: { type: "string" },
        deliverableId: { type: "string" },
        programId: { type: "string" },
        description: { type: "string" },
        dueDate: { type: "string", description: "ISO date string" },
        acceptanceCriteria: { type: "string" },
      },
      required: ["contractId", "deliverableId", "programId", "description", "dueDate", "acceptanceCriteria"],
    },
  },
  {
    name: "subcontract_sow_list",
    description: "List deliverables for a contract",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        contractId: { type: "string" },
      },
      required: ["contractId"],
    },
  },

  // Modification Tools
  {
    name: "subcontract_modification_create",
    description: "Create a contract modification",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        modification: {
          type: "object",
          properties: {
            contractId: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            reason: { type: "string" },
            valueChange: { type: "number" },
            dateChange: {
              type: "object",
              properties: {
                newEndDate: { type: "string", description: "ISO date string" },
              },
            },
            documentUrl: { type: "string" },
          },
          required: ["contractId", "title", "description", "reason"],
        },
        requestedBy: { type: "string" },
      },
      required: ["modification"],
    },
  },
  {
    name: "subcontract_modification_approve",
    description: "Approve a contract modification",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        modificationId: { type: "string" },
        approvedBy: { type: "string" },
        effectiveDate: { type: "string", description: "ISO date string (optional)" },
      },
      required: ["modificationId", "approvedBy"],
    },
  },

  // Invoice Tools
  {
    name: "subcontract_invoice_create",
    description: "Create invoice",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        invoice: {
          type: "object",
          properties: {
            contractId: { type: "string" },
            invoiceNumber: { type: "string" },
            invoiceDate: { type: "string", description: "ISO date string" },
            dueDate: { type: "string", description: "ISO date string" },
            amount: { type: "number" },
            currency: { type: "string" },
            description: { type: "string" },
            documentUrl: { type: "string" },
          },
          required: ["contractId", "invoiceNumber", "invoiceDate", "dueDate", "amount", "currency", "description"],
        },
        createdBy: { type: "string" },
      },
      required: ["invoice"],
    },
  },
  {
    name: "subcontract_invoice_submit",
    description: "Submit invoice for approval",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        invoiceId: { type: "string" },
        submittedBy: { type: "string" },
      },
      required: ["invoiceId"],
    },
  },
  {
    name: "subcontract_invoice_approve",
    description: "Approve invoice",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        invoiceId: { type: "string" },
        approvedBy: { type: "string" },
      },
      required: ["invoiceId", "approvedBy"],
    },
  },
  {
    name: "subcontract_invoice_list",
    description: "List invoices with filters",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        filters: {
          type: "object",
          properties: {
            contractId: { type: "string" },
            status: { type: "string", enum: ["draft", "submitted", "approved", "rejected", "paid"] },
          },
        },
      },
    },
  },
  {
    name: "subcontract_line_item_create",
    description: "Create invoice line item",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        lineItem: {
          type: "object",
          properties: {
            invoiceId: { type: "string" },
            description: { type: "string" },
            quantity: { type: "number" },
            unitPrice: { type: "number" },
            amount: { type: "number" },
          },
          required: ["invoiceId", "description", "quantity", "unitPrice", "amount"],
        },
      },
      required: ["lineItem"],
    },
  },

  // Performance Tools
  {
    name: "subcontract_performance_record",
    description: "Record performance metric",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        record: {
          type: "object",
          properties: {
            vendorId: { type: "string" },
            contractId: { type: "string" },
            metricType: { type: "string", enum: ["quality", "schedule", "cost", "compliance", "customer_satisfaction"] },
            score: { type: "number" },
            comments: { type: "string" },
            recordDate: { type: "string", description: "ISO date string" },
          },
          required: ["vendorId", "contractId", "metricType", "score", "recordDate"],
        },
        recordedBy: { type: "string" },
      },
      required: ["record"],
    },
  },
  {
    name: "subcontract_performance_score",
    description: "Calculate performance score",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        vendorId: { type: "string" },
        startDate: { type: "string", description: "ISO date string" },
        endDate: { type: "string", description: "ISO date string" },
      },
      required: ["vendorId"],
    },
  },
  {
    name: "subcontract_performance_scorecard",
    description: "Generate vendor scorecard",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        vendorId: { type: "string" },
        startDate: { type: "string", description: "ISO date string" },
        endDate: { type: "string", description: "ISO date string" },
      },
      required: ["vendorId"],
    },
  },
  {
    name: "subcontract_performance_top",
    description: "Get top performers",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        limit: { type: "number", description: "Number of performers to return (default: 10)" },
        startDate: { type: "string", description: "ISO date string" },
        endDate: { type: "string", description: "ISO date string" },
      },
    },
  },
  {
    name: "subcontract_performance_underperformers",
    description: "Get underperformers",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" },
        threshold: { type: "number", description: "Score threshold for underperformance (default: 70)" },
        startDate: { type: "string", description: "ISO date string" },
        endDate: { type: "string", description: "ISO date string" },
      },
    },
  },
];

/**
 * Tool handlers
 */
export async function handleToolCall(name: string, args: any): Promise<any> {
  const sheets = await getSheets();
  const spreadsheetId = args.spreadsheetId || process.env.SUBCONTRACT_SPREADSHEET_ID || "";

  switch (name) {
    // Vendor Tools
    case "subcontract_vendor_create":
      return await vendors.createVendor(sheets, spreadsheetId, args.vendor, args.createdBy || "system");
    case "subcontract_vendor_read":
      return await vendors.readVendor(sheets, spreadsheetId, args.vendorId);
    case "subcontract_vendor_update":
      return await vendors.updateVendor(sheets, spreadsheetId, { vendorId: args.vendorId, ...args.updates }, args.modifiedBy || "system");
    case "subcontract_vendor_list":
      return await vendors.listVendors(sheets, spreadsheetId, args.filters);
    case "subcontract_vendor_due_diligence":
      return await vendors.getVendorsNeedingDueDiligence(sheets, spreadsheetId, args.daysAhead);
    case "subcontract_vendor_top_performers":
      return await vendors.getTopPerformers(sheets, spreadsheetId, args.limit, args.minRating);
    case "subcontract_vendor_delete":
      return await vendors.deleteVendor(sheets, spreadsheetId, args.vendorId, args.deletedBy || "system");

    // Contact Tools
    case "subcontract_contact_create":
      return await contacts.createContact(sheets, spreadsheetId, args.contact);
    case "subcontract_contact_list":
      return await contacts.listContactsForVendor(sheets, spreadsheetId, args.vendorId);
    case "subcontract_contact_set_primary":
      return await contacts.setPrimaryContact(sheets, spreadsheetId, args.contactId);

    // Contract Tools
    case "subcontract_contract_create":
      return await contracts.createContract(sheets, spreadsheetId, {
        ...args.contract,
        startDate: new Date(args.contract.startDate),
        endDate: new Date(args.contract.endDate),
      }, args.createdBy || "system");
    case "subcontract_contract_read":
      return await contracts.readContract(sheets, spreadsheetId, args.contractId);
    case "subcontract_contract_update":
      const updateInput: any = { contractId: args.contractId, ...args.updates };
      if (args.updates.startDate) updateInput.startDate = new Date(args.updates.startDate);
      if (args.updates.endDate) updateInput.endDate = new Date(args.updates.endDate);
      if (args.updates.signedDate) updateInput.signedDate = new Date(args.updates.signedDate);
      return await contracts.updateContract(sheets, spreadsheetId, updateInput, args.modifiedBy || "system");
    case "subcontract_contract_list":
      return await contracts.listContracts(sheets, spreadsheetId, args.filters);
    case "subcontract_contract_active":
      return await contracts.getActiveContracts(sheets, spreadsheetId, args.vendorId);
    case "subcontract_contract_expiring":
      return await contracts.getExpiringContracts(sheets, spreadsheetId, args.daysAhead);
    case "subcontract_contract_delete":
      return await contracts.deleteContract(sheets, spreadsheetId, args.contractId, args.deletedBy || "system");

    // SOW Deliverable Tools
    case "subcontract_sow_link":
      return await sow.linkDeliverableToContract(
        sheets,
        spreadsheetId,
        args.contractId,
        args.deliverableId,
        args.programId,
        args.description,
        new Date(args.dueDate),
        args.acceptanceCriteria
      );
    case "subcontract_sow_list":
      return await sow.getContractDeliverables(sheets, spreadsheetId, args.contractId);

    // Modification Tools
    case "subcontract_modification_create":
      const modInput: modifications.CreateModificationInput = {
        ...args.modification,
      };
      if (args.modification.dateChange) {
        modInput.dateChange = {
          newEndDate: new Date(args.modification.dateChange.newEndDate),
        };
      }
      return await modifications.createModification(sheets, spreadsheetId, modInput, args.requestedBy || "system");
    case "subcontract_modification_approve":
      return await modifications.approveModification(
        sheets,
        spreadsheetId,
        args.modificationId,
        args.approvedBy,
        args.effectiveDate ? new Date(args.effectiveDate) : undefined
      );

    // Invoice Tools
    case "subcontract_invoice_create":
      return await invoices.createInvoice(sheets, spreadsheetId, {
        ...args.invoice,
        invoiceDate: new Date(args.invoice.invoiceDate),
        dueDate: new Date(args.invoice.dueDate),
      }, args.createdBy || "system");
    case "subcontract_invoice_submit":
      return await processing.submitForApproval(sheets, spreadsheetId, args.invoiceId, args.submittedBy || "system");
    case "subcontract_invoice_approve":
      return await processing.approveInvoice(sheets, spreadsheetId, args.invoiceId, args.approvedBy, undefined);
    case "subcontract_invoice_list":
      return await invoices.listInvoices(sheets, spreadsheetId, args.filters);
    case "subcontract_line_item_create":
      return await lineItems.createLineItem(sheets, spreadsheetId, args.lineItem, "system");

    // Performance Tools
    case "subcontract_performance_record": {
      const metricType = args.record.metricType;
      if (metricType === "delivery") {
        return await performanceTracking.recordDeliveryMetric(
          sheets,
          spreadsheetId,
          {
            vendorId: args.record.vendorId,
            contractId: args.record.contractId,
            programId: args.record.programId,
            deliverableId: args.record.deliverableId || args.record.vendorId,
            dueDate: new Date(args.record.recordDate),
            actualDate: new Date(args.record.recordDate),
            target: 0,
          },
          args.recordedBy || "system"
        );
      } else if (metricType === "quality") {
        return await performanceTracking.recordQualityMetric(
          sheets,
          spreadsheetId,
          {
            vendorId: args.record.vendorId,
            contractId: args.record.contractId,
            programId: args.record.programId,
            deliverableId: args.record.deliverableId || args.record.vendorId,
            score: args.record.score,
            target: 80,
          },
          args.recordedBy || "system"
        );
      } else if (metricType === "cost") {
        return await performanceTracking.recordCostMetric(
          sheets,
          spreadsheetId,
          {
            vendorId: args.record.vendorId,
            contractId: args.record.contractId,
            programId: args.record.programId,
            deliverableId: args.record.deliverableId,
            budgeted: args.record.score,
            actual: args.record.score,
          },
          args.recordedBy || "system"
        );
      }
      throw new Error(`Invalid metricType: ${metricType}`);
    }
    case "subcontract_performance_score":
      return await performanceScoring.calculatePerformanceScore(
        sheets,
        spreadsheetId,
        args.vendorId,
        12
      );
    case "subcontract_performance_scorecard":
      return await performanceReporting.generateVendorScorecard(
        sheets,
        spreadsheetId,
        args.vendorId,
        12
      );
    case "subcontract_performance_top":
      return await performanceReporting.generateTopPerformersReport(
        sheets,
        spreadsheetId,
        args.limit || 10,
        80,
        12
      );
    case "subcontract_performance_underperformers":
      return await performanceReporting.generateUnderperformersReport(
        sheets,
        spreadsheetId,
        args.threshold || 60,
        12
      );

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
