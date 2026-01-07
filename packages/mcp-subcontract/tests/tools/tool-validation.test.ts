/**
 * Subcontract MCP tool validation tests.
 *
 * Ensures tool metadata is sound and handleToolCall dispatches to the correct
 * module methods (with the right argument transforms).
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { SUBCONTRACT_TOOLS, handleToolCall } from "../../src/tools.js";
import * as vendorsModule from "../../src/vendors/vendors.js";
import * as contactsModule from "../../src/vendors/contacts.js";
import * as contractsModule from "../../src/contracts/contracts.js";
import * as sowModule from "../../src/contracts/sow.js";
import * as modificationsModule from "../../src/contracts/modifications.js";
import * as invoicesModule from "../../src/invoices/invoices.js";
import * as processingModule from "../../src/invoices/processing.js";
import * as lineItemsModule from "../../src/invoices/line-items.js";
import * as performanceTrackingModule from "../../src/performance/tracking.js";
import * as performanceScoringModule from "../../src/performance/scoring.js";
import * as performanceReportingModule from "../../src/performance/reporting.js";

const fakeSheets = { kind: "sheets" };
jest.mock("@gw-mcp/shared-core", () => ({
  initializeAuth: jest.fn(async () => ({ client: "auth" }) as any),
  createSheetsClient: jest.fn(() => fakeSheets as any),
}));

jest.mock("../../src/vendors/vendors.js", () => ({
  createVendor: jest.fn(),
  readVendor: jest.fn(),
  updateVendor: jest.fn(),
  listVendors: jest.fn(),
  getVendorsNeedingDueDiligence: jest.fn(),
  getTopPerformers: jest.fn(),
  deleteVendor: jest.fn(),
}));

jest.mock("../../src/vendors/contacts.js", () => ({
  createContact: jest.fn(),
  listContactsForVendor: jest.fn(),
  setPrimaryContact: jest.fn(),
}));

jest.mock("../../src/contracts/contracts.js", () => ({
  createContract: jest.fn(),
  readContract: jest.fn(),
  updateContract: jest.fn(),
  listContracts: jest.fn(),
  getActiveContracts: jest.fn(),
  getExpiringContracts: jest.fn(),
  deleteContract: jest.fn(),
}));

jest.mock("../../src/contracts/sow.js", () => ({
  linkDeliverableToContract: jest.fn(),
  getContractDeliverables: jest.fn(),
}));

jest.mock("../../src/contracts/modifications.js", () => ({
  createModification: jest.fn(),
  approveModification: jest.fn(),
}));

jest.mock("../../src/invoices/invoices.js", () => ({
  createInvoice: jest.fn(),
  listInvoices: jest.fn(),
}));

jest.mock("../../src/invoices/processing.js", () => ({
  submitForApproval: jest.fn(),
  approveInvoice: jest.fn(),
}));

jest.mock("../../src/invoices/line-items.js", () => ({
  createLineItem: jest.fn(),
}));

jest.mock("../../src/performance/tracking.js", () => ({
  recordDeliveryMetric: jest.fn(),
  recordQualityMetric: jest.fn(),
  recordCostMetric: jest.fn(),
}));

jest.mock("../../src/performance/scoring.js", () => ({
  calculatePerformanceScore: jest.fn(),
}));

jest.mock("../../src/performance/reporting.js", () => ({
  generateVendorScorecard: jest.fn(),
  generateTopPerformersReport: jest.fn(),
  generateUnderperformersReport: jest.fn(),
}));

const createVendorMock = vendorsModule.createVendor as jest.Mock;
const readVendorMock = vendorsModule.readVendor as jest.Mock;
const updateVendorMock = vendorsModule.updateVendor as jest.Mock;
const listVendorsMock = vendorsModule.listVendors as jest.Mock;
const dueDiligenceMock = vendorsModule.getVendorsNeedingDueDiligence as jest.Mock;
const topVendorMock = vendorsModule.getTopPerformers as jest.Mock;
const deleteVendorMock = vendorsModule.deleteVendor as jest.Mock;

const createContactMock = contactsModule.createContact as jest.Mock;
const listContactsMock = contactsModule.listContactsForVendor as jest.Mock;
const setPrimaryContactMock = contactsModule.setPrimaryContact as jest.Mock;

const createContractMock = contractsModule.createContract as jest.Mock;
const readContractMock = contractsModule.readContract as jest.Mock;
const updateContractMock = contractsModule.updateContract as jest.Mock;
const listContractsMock = contractsModule.listContracts as jest.Mock;
const activeContractsMock = contractsModule.getActiveContracts as jest.Mock;
const expiringContractsMock = contractsModule.getExpiringContracts as jest.Mock;
const deleteContractMock = contractsModule.deleteContract as jest.Mock;

const linkDeliverableMock = sowModule.linkDeliverableToContract as jest.Mock;
const getDeliverablesMock = sowModule.getContractDeliverables as jest.Mock;
const createModificationMock = modificationsModule.createModification as jest.Mock;
const approveModificationMock = modificationsModule.approveModification as jest.Mock;

const createInvoiceMock = invoicesModule.createInvoice as jest.Mock;
const listInvoicesMock = invoicesModule.listInvoices as jest.Mock;
const submitInvoiceMock = processingModule.submitForApproval as jest.Mock;
const approveInvoiceMock = processingModule.approveInvoice as jest.Mock;
const createLineItemMock = lineItemsModule.createLineItem as jest.Mock;

const recordDeliveryMock = performanceTrackingModule.recordDeliveryMetric as jest.Mock;
const recordQualityMock = performanceTrackingModule.recordQualityMetric as jest.Mock;
const recordCostMock = performanceTrackingModule.recordCostMetric as jest.Mock;
const performanceScoreMock = performanceScoringModule.calculatePerformanceScore as jest.Mock;
const scorecardMock = performanceReportingModule.generateVendorScorecard as jest.Mock;
const topReportMock = performanceReportingModule.generateTopPerformersReport as jest.Mock;
const underperformMock = performanceReportingModule.generateUnderperformersReport as jest.Mock;

describe("Subcontract tool definitions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ensures every tool has required metadata and unique names", () => {
    expect(SUBCONTRACT_TOOLS.length).toBeGreaterThan(0);
    const names = new Set<string>();
    for (const tool of SUBCONTRACT_TOOLS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema?.type).toBe("object");
      expect(names.has(tool.name)).toBe(false);
      names.add(tool.name);
    }
  });

  it("routes vendor and contact tools through their modules", async () => {
    await handleToolCall("subcontract_vendor_create", {
      spreadsheetId: "sheet",
      vendor: { name: "Test", legalName: "Test", taxId: "1", category: "other", primaryContact: "A", email: "a", phone: "1", address: { street: "", city: "", state: "", zip: "", country: "" }, paymentTerms: "Net 30" },
      createdBy: "user",
    });
    expect(createVendorMock).toHaveBeenCalledWith(fakeSheets, "sheet", expect.objectContaining({ name: "Test" }), "user");

    await handleToolCall("subcontract_vendor_read", { spreadsheetId: "sheet", vendorId: "V-1" });
    expect(readVendorMock).toHaveBeenCalledWith(fakeSheets, "sheet", "V-1");

    await handleToolCall("subcontract_vendor_update", {
      spreadsheetId: "sheet",
      vendorId: "V-1",
      updates: { status: "active" },
      modifiedBy: "user",
    });
    expect(updateVendorMock).toHaveBeenCalledWith(
      fakeSheets,
      "sheet",
      expect.objectContaining({ vendorId: "V-1", status: "active" }),
      "user"
    );

    await handleToolCall("subcontract_vendor_list", { spreadsheetId: "sheet", filters: { status: "active" } });
    expect(listVendorsMock).toHaveBeenCalledWith(fakeSheets, "sheet", { status: "active" });

    await handleToolCall("subcontract_vendor_due_diligence", { spreadsheetId: "sheet", daysAhead: 60 });
    expect(dueDiligenceMock).toHaveBeenCalledWith(fakeSheets, "sheet", 60);

    await handleToolCall("subcontract_vendor_top_performers", { spreadsheetId: "sheet", limit: 5, minRating: 85 });
    expect(topVendorMock).toHaveBeenCalledWith(fakeSheets, "sheet", 5, 85);

    await handleToolCall("subcontract_vendor_delete", { spreadsheetId: "sheet", vendorId: "V-9", deletedBy: "user" });
    expect(deleteVendorMock).toHaveBeenCalledWith(fakeSheets, "sheet", "V-9", "user");

    await handleToolCall("subcontract_contact_create", {
      spreadsheetId: "sheet",
      contact: { vendorId: "V-1", name: "Sam", title: "PM", email: "sam@example.com", phone: "555" },
    });
    expect(createContactMock).toHaveBeenCalled();

    await handleToolCall("subcontract_contact_list", { spreadsheetId: "sheet", vendorId: "V-1" });
    expect(listContactsMock).toHaveBeenCalledWith(fakeSheets, "sheet", "V-1");

    await handleToolCall("subcontract_contact_set_primary", { spreadsheetId: "sheet", contactId: "C-1" });
    expect(setPrimaryContactMock).toHaveBeenCalledWith(fakeSheets, "sheet", "C-1");
  });

  it("routes contract, SOW, and modification tools", async () => {
    await handleToolCall("subcontract_contract_create", {
      spreadsheetId: "sheet",
      contract: {
        contractNumber: "C-1",
        vendorId: "V-1",
        programId: "PROG",
        title: "Work",
        description: "Desc",
        type: "fixed_price",
        totalValue: 1000,
        fundingSource: "CAPEX",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        contractManager: "Mgr",
        vendorSignatory: "Vendor",
        clientSignatory: "Client",
        paymentTerms: "Net 30",
        deliveryTerms: "terms",
        scopeOfWork: "Scope",
      },
      createdBy: "author",
    });
    expect(createContractMock).toHaveBeenCalled();
    const createArgs = createContractMock.mock.calls[0][2];
    expect(createArgs.startDate).toBeInstanceOf(Date);
    expect(createArgs.endDate).toBeInstanceOf(Date);

    await handleToolCall("subcontract_contract_update", {
      spreadsheetId: "sheet",
      contractId: "CONT-1",
      updates: { startDate: "2026-02-01", endDate: "2026-03-01", signedDate: "2026-01-20" },
      modifiedBy: "user",
    });
    expect(updateContractMock).toHaveBeenCalledWith(
      fakeSheets,
      "sheet",
      expect.objectContaining({
        contractId: "CONT-1",
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        signedDate: expect.any(Date),
      }),
      "user"
    );

    await handleToolCall("subcontract_contract_read", { spreadsheetId: "sheet", contractId: "CONT-1" });
    expect(readContractMock).toHaveBeenCalled();

    await handleToolCall("subcontract_contract_list", { spreadsheetId: "sheet", filters: { status: "active" } });
    expect(listContractsMock).toHaveBeenCalledWith(fakeSheets, "sheet", { status: "active" });

    await handleToolCall("subcontract_contract_active", { spreadsheetId: "sheet", vendorId: "V-1" });
    expect(activeContractsMock).toHaveBeenCalledWith(fakeSheets, "sheet", "V-1");

    await handleToolCall("subcontract_contract_expiring", { spreadsheetId: "sheet", daysAhead: 30 });
    expect(expiringContractsMock).toHaveBeenCalledWith(fakeSheets, "sheet", 30);

    await handleToolCall("subcontract_contract_delete", { spreadsheetId: "sheet", contractId: "CONT-2", deletedBy: "user" });
    expect(deleteContractMock).toHaveBeenCalledWith(fakeSheets, "sheet", "CONT-2", "user");

    await handleToolCall("subcontract_sow_link", {
      spreadsheetId: "sheet",
      contractId: "CONT-1",
      deliverableId: "DEL-1",
      programId: "PROG",
      description: "Work",
      dueDate: "2026-05-01",
      acceptanceCriteria: "Done",
    });
    expect(linkDeliverableMock).toHaveBeenCalledWith(
      fakeSheets,
      "sheet",
      "CONT-1",
      "DEL-1",
      "PROG",
      "Work",
      expect.any(Date),
      "Done"
    );

    await handleToolCall("subcontract_sow_list", { spreadsheetId: "sheet", contractId: "CONT-1" });
    expect(getDeliverablesMock).toHaveBeenCalledWith(fakeSheets, "sheet", "CONT-1");

    await handleToolCall("subcontract_modification_create", {
      spreadsheetId: "sheet",
      modification: {
        contractId: "CONT-1",
        type: "scope",
        description: "Add scope",
        requestedBy: "user",
        dateChange: { newEndDate: "2026-06-01" },
      },
      requestedBy: "user",
    });
    expect(createModificationMock).toHaveBeenCalled();
    const modInput = createModificationMock.mock.calls[0][2];
    expect(modInput.dateChange?.newEndDate).toBeInstanceOf(Date);

    await handleToolCall("subcontract_modification_approve", {
      spreadsheetId: "sheet",
      modificationId: "MOD-1",
      approvedBy: "director",
      effectiveDate: "2026-04-01",
    });
    expect(approveModificationMock).toHaveBeenCalledWith(
      fakeSheets,
      "sheet",
      "MOD-1",
      "director",
      expect.any(Date)
    );
  });

  it("routes invoice, line item, and performance tools", async () => {
    await handleToolCall("subcontract_invoice_create", {
      spreadsheetId: "sheet",
      invoice: {
        invoiceId: "INV-1",
        contractId: "CONT-1",
        programId: "PROG",
        vendorId: "V-1",
        amount: 1000,
        currency: "USD",
        invoiceDate: "2026-01-15",
        dueDate: "2026-02-15",
      },
      createdBy: "user",
    });
    expect(createInvoiceMock).toHaveBeenCalled();
    const invoiceArgs = createInvoiceMock.mock.calls[0][2];
    expect(invoiceArgs.invoiceDate).toBeInstanceOf(Date);
    expect(invoiceArgs.dueDate).toBeInstanceOf(Date);

    await handleToolCall("subcontract_invoice_submit", {
      spreadsheetId: "sheet",
      invoiceId: "INV-1",
      submittedBy: "user",
    });
    expect(submitInvoiceMock).toHaveBeenCalledWith(fakeSheets, "sheet", "INV-1", "user");

    await handleToolCall("subcontract_invoice_approve", {
      spreadsheetId: "sheet",
      invoiceId: "INV-1",
      approvedBy: "cfo",
    });
    expect(approveInvoiceMock).toHaveBeenCalledWith(fakeSheets, "sheet", "INV-1", "cfo", undefined);

    await handleToolCall("subcontract_invoice_list", { spreadsheetId: "sheet", filters: { status: "pending" } });
    expect(listInvoicesMock).toHaveBeenCalledWith(fakeSheets, "sheet", { status: "pending" });

    await handleToolCall("subcontract_line_item_create", {
      spreadsheetId: "sheet",
      lineItem: { invoiceId: "INV-1", description: "Labor", amount: 500 },
    });
    expect(createLineItemMock).toHaveBeenCalledWith(fakeSheets, "sheet", { invoiceId: "INV-1", description: "Labor", amount: 500 }, "system");

    await handleToolCall("subcontract_performance_record", {
      spreadsheetId: "sheet",
      record: {
        metricType: "delivery",
        vendorId: "V-1",
        contractId: "CONT-1",
        programId: "PROG",
        deliverableId: "DEL-1",
        recordDate: "2026-03-01",
        score: 90,
      },
      recordedBy: "user",
    });
    expect(recordDeliveryMock).toHaveBeenCalled();

    await handleToolCall("subcontract_performance_record", {
      spreadsheetId: "sheet",
      record: {
        metricType: "quality",
        vendorId: "V-1",
        contractId: "CONT-1",
        programId: "PROG",
        deliverableId: "DEL-1",
        score: 75,
      },
    });
    expect(recordQualityMock).toHaveBeenCalled();

    await handleToolCall("subcontract_performance_record", {
      spreadsheetId: "sheet",
      record: {
        metricType: "cost",
        vendorId: "V-1",
        contractId: "CONT-1",
        programId: "PROG",
        deliverableId: "DEL-1",
        score: 80,
      },
    });
    expect(recordCostMock).toHaveBeenCalled();

    await handleToolCall("subcontract_performance_score", { spreadsheetId: "sheet", vendorId: "V-1" });
    expect(performanceScoreMock).toHaveBeenCalledWith(fakeSheets, "sheet", "V-1", 12);

    await handleToolCall("subcontract_performance_scorecard", { spreadsheetId: "sheet", vendorId: "V-1" });
    expect(scorecardMock).toHaveBeenCalledWith(fakeSheets, "sheet", "V-1", 12);

    await handleToolCall("subcontract_performance_top", { spreadsheetId: "sheet", limit: 3 });
    expect(topReportMock).toHaveBeenCalledWith(fakeSheets, "sheet", 3, 80, 12);

    await handleToolCall("subcontract_performance_underperformers", { spreadsheetId: "sheet", threshold: 65 });
    expect(underperformMock).toHaveBeenCalledWith(fakeSheets, "sheet", 65, 12);
  });

  it("throws on invalid performance metric types", async () => {
    await expect(
      handleToolCall("subcontract_performance_record", {
        spreadsheetId: "sheet",
        record: { metricType: "invalid", vendorId: "V-1", contractId: "C-1", programId: "PROG", deliverableId: "D-1", score: 0 },
      })
    ).rejects.toThrow(/Invalid metricType/);
  });
});
