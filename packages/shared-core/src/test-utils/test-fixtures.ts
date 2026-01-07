/**
 * Test Fixtures - Common Test Data
 *
 * Provides realistic test data for programs, deliverables, budgets, etc.
 * Used across all test suites for consistency.
 */

/**
 * Test Program Data
 */
export const TEST_PROGRAM = {
  programId: 'PROG-TEST-001',
  name: 'Test Program Alpha',
  description: 'A test program for automated testing',
  status: 'active' as const,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-12-31'),
  budget: 1000000,
  sponsor: 'Test Sponsor',
  programManager: 'Test PM',
  createdAt: new Date('2025-12-01'),
  updatedAt: new Date('2026-01-01'),
};

/**
 * Test Deliverable Data
 */
export const TEST_DELIVERABLE = {
  deliverableId: 'D-TEST-001',
  programId: 'PROG-TEST-001',
  name: 'Test Deliverable',
  description: 'Test deliverable for automated testing',
  type: 'document' as const,
  status: 'in_progress' as const,
  owner: 'Test Owner',
  dueDate: new Date('2026-06-30'),
  percentComplete: 50,
  priority: 'high' as const,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-15'),
};

/**
 * Test Budget Data
 */
export const TEST_BUDGET = {
  budgetId: 'BUD-TEST-001',
  programId: 'PROG-TEST-001',
  name: 'Test Budget',
  category: 'labor' as const,
  allocated: 500000,
  committed: 200000,
  spent: 150000,
  remaining: 350000,
  status: 'active' as const,
  fiscalYear: 2026,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-15'),
};

/**
 * Test EVM Snapshot Data
 */
export const TEST_EVM_SNAPSHOT = {
  snapshotId: 'EVM-TEST-001',
  programId: 'PROG-TEST-001',
  date: new Date('2026-01-15'),
  plannedValue: 400000,
  earnedValue: 350000,
  actualCost: 375000,
  schedulePerformanceIndex: 0.875,
  costPerformanceIndex: 0.933,
  estimateAtCompletion: 1071429,
  estimateToComplete: 696429,
  varianceAtCompletion: -71429,
  toCompletePerformanceIndex: 1.11,
  budgetAtCompletion: 1000000,
  createdAt: new Date('2026-01-15'),
};

/**
 * Test Risk Data
 */
export const TEST_RISK = {
  riskId: 'RISK-TEST-001',
  programId: 'PROG-TEST-001',
  title: 'Test Risk',
  description: 'A test risk for automated testing',
  category: 'technical' as const,
  probability: 0.5,
  impact: 0.7,
  score: 0.35,
  status: 'active' as const,
  owner: 'Test Risk Owner',
  identifiedDate: new Date('2026-01-10'),
  createdAt: new Date('2026-01-10'),
  updatedAt: new Date('2026-01-15'),
};

/**
 * Test Contract Data
 */
export const TEST_CONTRACT = {
  contractId: 'CONT-TEST-001',
  programId: 'PROG-TEST-001',
  vendorId: 'VEND-TEST-001',
  name: 'Test Contract',
  type: 'fixed_price' as const,
  value: 250000,
  status: 'active' as const,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-12-31'),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

/**
 * Test Vendor Data
 */
export const TEST_VENDOR = {
  vendorId: 'VEND-TEST-001',
  name: 'Test Vendor Inc.',
  contactEmail: 'contact@testvendor.com',
  contactPhone: '+1-555-0100',
  status: 'active' as const,
  performanceRating: 4.5,
  category: 'professional_services' as const,
  createdAt: new Date('2025-12-01'),
  updatedAt: new Date('2026-01-01'),
};

/**
 * Test Cash Flow Data
 */
export const TEST_CASH_FLOW = {
  flowId: 'CF-TEST-001',
  programId: 'PROG-TEST-001',
  date: new Date('2026-01-15'),
  type: 'outflow' as const,
  amount: 50000,
  category: 'vendor_payment' as const,
  description: 'Test vendor payment',
  status: 'completed' as const,
  createdAt: new Date('2026-01-15'),
};

/**
 * Create a test program with custom overrides
 */
export function createTestProgram(overrides?: Partial<typeof TEST_PROGRAM>) {
  return { ...TEST_PROGRAM, ...overrides };
}

/**
 * Create a test deliverable with custom overrides
 */
export function createTestDeliverable(overrides?: Partial<typeof TEST_DELIVERABLE>) {
  return { ...TEST_DELIVERABLE, ...overrides };
}

/**
 * Create a test budget with custom overrides
 */
export function createTestBudget(overrides?: Partial<typeof TEST_BUDGET>) {
  return { ...TEST_BUDGET, ...overrides };
}

/**
 * Create a test EVM snapshot with custom overrides
 */
export function createTestEVMSnapshot(overrides?: Partial<typeof TEST_EVM_SNAPSHOT>) {
  return { ...TEST_EVM_SNAPSHOT, ...overrides };
}

/**
 * Create a test risk with custom overrides
 */
export function createTestRisk(overrides?: Partial<typeof TEST_RISK>) {
  return { ...TEST_RISK, ...overrides };
}

/**
 * Create a test contract with custom overrides
 */
export function createTestContract(overrides?: Partial<typeof TEST_CONTRACT>) {
  return { ...TEST_CONTRACT, ...overrides };
}

/**
 * Create a test vendor with custom overrides
 */
export function createTestVendor(overrides?: Partial<typeof TEST_VENDOR>) {
  return { ...TEST_VENDOR, ...overrides };
}

/**
 * Create a test cash flow entry with custom overrides
 */
export function createTestCashFlow(overrides?: Partial<typeof TEST_CASH_FLOW>) {
  return { ...TEST_CASH_FLOW, ...overrides };
}

/**
 * Create multiple test programs
 */
export function createTestPrograms(count: number): typeof TEST_PROGRAM[] {
  return Array.from({ length: count }, (_, i) => createTestProgram({
    programId: `PROG-TEST-${String(i + 1).padStart(3, '0')}`,
    name: `Test Program ${String.fromCharCode(65 + i)}`,
  }));
}

/**
 * Create multiple test deliverables
 */
export function createTestDeliverables(count: number, programId?: string): typeof TEST_DELIVERABLE[] {
  return Array.from({ length: count }, (_, i) => createTestDeliverable({
    deliverableId: `D-TEST-${String(i + 1).padStart(3, '0')}`,
    name: `Test Deliverable ${i + 1}`,
    programId: programId || TEST_PROGRAM.programId,
  }));
}

/**
 * Create multiple test budgets
 */
export function createTestBudgets(count: number, programId?: string): typeof TEST_BUDGET[] {
  return Array.from({ length: count }, (_, i) => createTestBudget({
    budgetId: `BUD-TEST-${String(i + 1).padStart(3, '0')}`,
    name: `Test Budget ${i + 1}`,
    programId: programId || TEST_PROGRAM.programId,
  }));
}
