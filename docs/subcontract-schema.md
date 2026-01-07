# Subcontract Management Google Sheets Schema

## Overview

This document defines the Google Sheets structure for the mcp-subcontract server.

**Spreadsheet ID Environment Variable:** `SUBCONTRACT_SPREADSHEET_ID`

**Server Port:** 3003

**Cross-Server Dependencies:**
- Links to Program server (programId validation)
- Links to Deliverables server (deliverableId for SOW)
- Links to Compliance server (due diligence, FCPA checks)
- Links to Financial server (invoice payment tracking)

---

## Sheet 1: Vendors

**Purpose:** Store vendor/subcontractor information

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | vendorId | string | Unique vendor ID | VEND-001 |
| B | name | string | Vendor name | Acme Engineering |
| C | legalName | string | Legal business name | Acme Engineering Inc. |
| D | taxId | string | EIN/TIN | 12-3456789 |
| E | dunsNumber | string | D&B DUNS number | 123456789 |
| F | category | string | Vendor category | professional_services |
| G | status | string | Vendor status | active |
| H | primaryContact | string | Primary contact name | John Smith |
| I | email | string | Contact email | john@acme.com |
| J | phone | string | Contact phone | (555) 123-4567 |
| K | street | string | Street address | 123 Main St |
| L | city | string | City | Springfield |
| M | state | string | State | IL |
| N | zip | string | ZIP code | 62701 |
| O | country | string | Country | USA |
| P | cageCode | string | CAGE code (govt contracts) | 1A2B3 |
| Q | smallBusiness | boolean | Small business | TRUE |
| R | womanOwned | boolean | Woman-owned | FALSE |
| S | minorityOwned | boolean | Minority-owned | FALSE |
| T | veteranOwned | boolean | Veteran-owned | FALSE |
| U | paymentTerms | string | Payment terms | Net 30 |
| V | currency | string | Currency | USD |
| W | dueDiligenceCompleted | boolean | Due diligence done | TRUE |
| X | dueDiligenceDate | date | Due diligence date | 2024-01-15 |
| Y | insuranceCurrent | boolean | Insurance current | TRUE |
| Z | insuranceExpiry | date | Insurance expiry | 2025-12-31 |
| AA | performanceRating | number | Performance rating (0-100) | 92 |
| AB | totalContractValue | number | Total contract value | 500000 |
| AC | activeContracts | number | Active contract count | 3 |
| AD | createdDate | date | Created date | 2024-01-01 |
| AE | createdBy | string | Created by | user@example.com |
| AF | lastModified | date | Last modified date | 2024-01-15 |
| AG | notes | string | Notes | Preferred vendor for... |

### Data Validation

- **vendorId:** Must be unique, format VEND-XXX
- **category:** Enum [professional_services, it_services, construction, manufacturing, consulting, logistics, other]
- **status:** Enum [prospective, approved, active, suspended, debarred, inactive]
- **email:** Valid email format
- **performanceRating:** 0-100
- **smallBusiness, womanOwned, minorityOwned, veteranOwned:** Boolean
- **dueDiligenceCompleted, insuranceCurrent:** Boolean

### Indexes

- Primary: vendorId (Column A)
- Secondary: name (Column B)
- Lookup: status (Column G)

---

## Sheet 2: Vendor Contacts

**Purpose:** Store additional contacts for each vendor

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | contactId | string | Unique contact ID | VC-001 |
| B | vendorId | string | Vendor ID (FK) | VEND-001 |
| C | name | string | Contact name | Jane Doe |
| D | title | string | Contact title | Project Manager |
| E | email | string | Contact email | jane@acme.com |
| F | phone | string | Contact phone | (555) 123-4568 |
| G | isPrimary | boolean | Is primary contact | FALSE |
| H | department | string | Department | Engineering |
| I | notes | string | Notes | Technical escalations |

### Data Validation

- **contactId:** Must be unique, format VC-XXX
- **vendorId:** Must exist in Vendors sheet
- **isPrimary:** Boolean

### Cross-References

- vendorId → Vendors.vendorId

---

## Sheet 3: Contracts

**Purpose:** Store contract information

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | contractId | string | Unique contract ID | CONT-001 |
| B | contractNumber | string | External contract # | ACM-2024-001 |
| C | vendorId | string | Vendor ID (FK) | VEND-001 |
| D | programId | string | Program ID (FK) | PROG-001 |
| E | title | string | Contract title | Phase 1 Engineering |
| F | description | string | Contract description | Detailed engineering... |
| G | type | string | Contract type | fixed_price |
| H | status | string | Contract status | active |
| I | totalValue | number | Total contract value | 500000 |
| J | currency | string | Currency | USD |
| K | fundingSource | string | Funding source | Program Budget |
| L | startDate | date | Start date | 2024-01-01 |
| M | endDate | date | End date | 2024-12-31 |
| N | signedDate | date | Signed date | 2023-12-15 |
| O | contractManager | string | PM responsible | pm@example.com |
| P | vendorSignatory | string | Vendor signatory | John Smith |
| Q | clientSignatory | string | Client signatory | Jane Client |
| R | paymentTerms | string | Payment terms | Net 30 |
| S | deliveryTerms | string | Delivery terms | FOB Destination |
| T | penaltyClause | string | Penalty clause | $1000/day late |
| U | performanceBond | boolean | Performance bond reqd | TRUE |
| V | bondAmount | number | Bond amount | 50000 |
| W | warrantyPeriod | number | Warranty period (days) | 365 |
| X | scopeOfWork | string | Scope of work | Provide engineering... |
| Y | deliverables | string | Deliverable IDs (JSON) | ["D-001","D-002"] |
| Z | fcpaReviewRequired | boolean | FCPA review required | TRUE |
| AA | fcpaReviewCompleted | boolean | FCPA review done | TRUE |
| AB | createdDate | date | Created date | 2023-12-01 |
| AC | createdBy | string | Created by | pm@example.com |
| AD | lastModified | date | Last modified | 2024-01-15 |
| AE | documentUrl | string | Contract document URL | https://drive.google... |
| AF | notes | string | Notes | Special terms... |

### Data Validation

- **contractId:** Must be unique, format CONT-XXX
- **vendorId:** Must exist in Vendors sheet
- **programId:** Must exist in Program server
- **type:** Enum [fixed_price, cost_plus, time_and_materials, indefinite_delivery, purchase_order, other]
- **status:** Enum [draft, pending_approval, approved, active, completed, terminated, closed]
- **performanceBond:** Boolean
- **fcpaReviewRequired, fcpaReviewCompleted:** Boolean

### Cross-References

- vendorId → Vendors.vendorId
- programId → mcp-program.Programs.programId
- deliverables → mcp-deliverables.Deliverables.deliverableId (JSON array)

---

## Sheet 4: Contract Modifications

**Purpose:** Track contract modifications (change orders)

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | modificationId | string | Unique modification ID | MOD-001 |
| B | contractId | string | Contract ID (FK) | CONT-001 |
| C | modificationNumber | number | Modification sequence | 1 |
| D | title | string | Modification title | Add 2 FTEs |
| E | description | string | Modification description | Increase labor by... |
| F | reason | string | Reason for change | Scope expansion |
| G | valueChange | number | Value change | 50000 |
| H | newTotalValue | number | New total value | 550000 |
| I | oldEndDate | date | Original end date | 2024-12-31 |
| J | newEndDate | date | New end date | 2025-02-28 |
| K | requestedBy | string | Requested by | pm@example.com |
| L | requestedDate | date | Requested date | 2024-06-01 |
| M | approvedBy | string | Approved by | director@example.com |
| N | approvedDate | date | Approved date | 2024-06-15 |
| O | status | string | Status | approved |
| P | effectiveDate | date | Effective date | 2024-07-01 |
| Q | documentUrl | string | Modification doc URL | https://drive.google... |

### Data Validation

- **modificationId:** Must be unique, format MOD-XXX
- **contractId:** Must exist in Contracts sheet
- **status:** Enum [pending, approved, rejected]
- **valueChange:** Can be negative

### Cross-References

- contractId → Contracts.contractId

---

## Sheet 5: SOW Deliverables

**Purpose:** Link contract deliverables to program deliverables

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | sowDeliverableId | string | Unique SOW deliverable ID | SOW-001 |
| B | contractId | string | Contract ID (FK) | CONT-001 |
| C | deliverableId | string | Deliverable ID (FK) | D-001 |
| D | programId | string | Program ID (FK) | PROG-001 |
| E | description | string | Deliverable description | Engineering design... |
| F | dueDate | date | Due date | 2024-06-30 |
| G | acceptanceCriteria | string | Acceptance criteria | Meets spec 123... |
| H | status | string | Status | in_progress |
| I | submittedDate | date | Submitted date | 2024-06-25 |
| J | acceptedDate | date | Accepted date | 2024-06-30 |
| K | qualityScore | number | Quality score (0-100) | 95 |
| L | reviewNotes | string | Review notes | Excellent work... |

### Data Validation

- **sowDeliverableId:** Must be unique, format SOW-XXX
- **contractId:** Must exist in Contracts sheet
- **deliverableId:** Must exist in mcp-deliverables server
- **programId:** Must exist in mcp-program server
- **status:** Enum [pending, in_progress, submitted, accepted, rejected]
- **qualityScore:** 0-100

### Cross-References

- contractId → Contracts.contractId
- deliverableId → mcp-deliverables.Deliverables.deliverableId
- programId → mcp-program.Programs.programId

---

## Sheet 6: Invoices

**Purpose:** Track vendor invoices

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | invoiceId | string | Unique invoice ID | INV-001 |
| B | invoiceNumber | string | Vendor invoice # | ACM-INV-2024-001 |
| C | contractId | string | Contract ID (FK) | CONT-001 |
| D | vendorId | string | Vendor ID (FK) | VEND-001 |
| E | programId | string | Program ID (FK) | PROG-001 |
| F | subtotal | number | Subtotal | 10000 |
| G | tax | number | Tax amount | 800 |
| H | total | number | Total amount | 10800 |
| I | currency | string | Currency | USD |
| J | invoiceDate | date | Invoice date | 2024-01-31 |
| K | dueDate | date | Due date | 2024-02-29 |
| L | receivedDate | date | Received date | 2024-02-01 |
| M | status | string | Invoice status | approved |
| N | reviewedBy | string | Reviewed by | pm@example.com |
| O | reviewedDate | date | Reviewed date | 2024-02-05 |
| P | approvedBy | string | Approved by | finance@example.com |
| Q | approvedDate | date | Approved date | 2024-02-07 |
| R | paidDate | date | Paid date | 2024-02-15 |
| S | paymentReference | string | Payment reference | CHK-12345 |
| T | validationErrors | string | Validation errors (JSON) | ["Rate mismatch"] |
| U | validationWarnings | string | Validation warnings (JSON) | ["Large amount"] |
| V | submittedBy | string | Submitted by | vendor@example.com |
| W | submittedDate | date | Submitted date | 2024-02-01 |
| X | documentUrl | string | Invoice doc URL | https://drive.google... |
| Y | notes | string | Notes | Partial payment... |

### Data Validation

- **invoiceId:** Must be unique, format INV-XXX
- **contractId:** Must exist in Contracts sheet
- **vendorId:** Must exist in Vendors sheet
- **programId:** Must exist in mcp-program server
- **status:** Enum [draft, submitted, under_review, approved, rejected, paid, disputed]
- **total:** Must equal subtotal + tax

### Cross-References

- contractId → Contracts.contractId
- vendorId → Vendors.vendorId
- programId → mcp-program.Programs.programId

---

## Sheet 7: Invoice Line Items

**Purpose:** Detailed line items for each invoice

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | invoiceId | string | Invoice ID (FK) | INV-001 |
| B | lineNumber | number | Line number | 1 |
| C | description | string | Line item description | Engineering hours |
| D | quantity | number | Quantity | 100 |
| E | unitPrice | number | Unit price | 100 |
| F | amount | number | Line amount | 10000 |
| G | sowDeliverableId | string | SOW deliverable ID (FK) | SOW-001 |
| H | contractLineItem | string | Contract line item ref | CLIN-001 |
| I | isValid | boolean | Validation passed | TRUE |
| J | validationMessage | string | Validation message | OK |

### Data Validation

- **invoiceId:** Must exist in Invoices sheet
- **amount:** Must equal quantity × unitPrice
- **isValid:** Boolean
- **sowDeliverableId:** Must exist in SOW Deliverables sheet (if provided)

### Cross-References

- invoiceId → Invoices.invoiceId
- sowDeliverableId → SOW Deliverables.sowDeliverableId

---

## Sheet 8: Vendor Performance

**Purpose:** Track vendor performance reviews

### Column Mapping

| Column | Field Name | Type | Description | Example |
|--------|-----------|------|-------------|---------|
| A | performanceId | string | Unique performance ID | PERF-001 |
| B | vendorId | string | Vendor ID (FK) | VEND-001 |
| C | contractId | string | Contract ID (FK, optional) | CONT-001 |
| D | programId | string | Program ID (FK) | PROG-001 |
| E | periodStart | date | Review period start | 2024-01-01 |
| F | periodEnd | date | Review period end | 2024-03-31 |
| G | qualityScore | number | Quality score (0-100) | 95 |
| H | deliveryScore | number | Delivery score (0-100) | 92 |
| I | costScore | number | Cost score (0-100) | 88 |
| J | communicationScore | number | Communication score (0-100) | 90 |
| K | complianceScore | number | Compliance score (0-100) | 98 |
| L | overallScore | number | Overall score (0-100) | 93 |
| M | strengths | string | Strengths (JSON array) | ["High quality","..."] |
| N | weaknesses | string | Weaknesses (JSON array) | ["Slow response"] |
| O | recommendations | string | Recommendations | Continue engagement |
| P | actionItems | string | Action items (JSON array) | ["Improve comms"] |
| Q | followUpRequired | boolean | Follow-up required | FALSE |
| R | reviewedBy | string | Reviewed by | pm@example.com |
| S | reviewDate | date | Review date | 2024-04-15 |
| T | notes | string | Notes | Excellent overall... |

### Data Validation

- **performanceId:** Must be unique, format PERF-XXX
- **vendorId:** Must exist in Vendors sheet
- **contractId:** Must exist in Contracts sheet (if provided)
- **programId:** Must exist in mcp-program server
- **All scores:** 0-100
- **followUpRequired:** Boolean

### Cross-References

- vendorId → Vendors.vendorId
- contractId → Contracts.contractId (optional)
- programId → mcp-program.Programs.programId

---

## Summary

### Spreadsheet Structure

```
SUBCONTRACT_SPREADSHEET_ID
├── Vendors                 (8 entities)
├── Vendor Contacts         (2 entities)
├── Contracts              (15 entities)
├── Contract Modifications  (3 entities)
├── SOW Deliverables       (10 entities)
├── Invoices               (25 entities)
├── Invoice Line Items     (50 entities)
└── Vendor Performance      (4 entities)
```

### ID Generation Patterns

- **Vendors:** VEND-001, VEND-002, VEND-003...
- **Vendor Contacts:** VC-001, VC-002, VC-003...
- **Contracts:** CONT-001, CONT-002, CONT-003...
- **Contract Modifications:** MOD-001, MOD-002, MOD-003...
- **SOW Deliverables:** SOW-001, SOW-002, SOW-003...
- **Invoices:** INV-001, INV-002, INV-003...
- **Vendor Performance:** PERF-001, PERF-002, PERF-003...

### Cross-Server References

**To Program Server (mcp-program):**
- Contracts.programId → Programs.programId
- SOW Deliverables.programId → Programs.programId
- Invoices.programId → Programs.programId
- Vendor Performance.programId → Programs.programId

**To Deliverables Server (mcp-deliverables):**
- Contracts.deliverables (JSON array) → Deliverables.deliverableId
- SOW Deliverables.deliverableId → Deliverables.deliverableId

**To Compliance Server (mcp-compliance):**
- Contracts.fcpaReviewRequired / fcpaReviewCompleted → FCPA reviews
- Vendor due diligence → Compliance checks

**To Financial Server (mcp-financial):**
- Invoices → Financial Transactions
- Invoices.paidDate / paymentReference → Payment tracking
- Contracts.totalValue → Budget allocation

### Access Patterns

**Common Queries:**
1. Get all active contracts for a program
2. Get all invoices for a contract
3. Get vendor performance history
4. Get all SOW deliverables for a contract
5. Get unpaid invoices
6. Get contracts expiring soon
7. Get vendors pending due diligence

**Write Patterns:**
1. Onboard new vendor
2. Create contract
3. Submit invoice
4. Approve/reject invoice
5. Complete performance review
6. Modify contract
