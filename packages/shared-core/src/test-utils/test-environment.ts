/**
 * Test Environment Helpers
 *
 * Setup and teardown utilities for test environment
 */

/**
 * Setup test environment before all tests
 */
export function setupTestEnvironment(): void {
  // Set NODE_ENV to test
  process.env.NODE_ENV = 'test';

  // Set test spreadsheet IDs
  process.env.PROGRAM_SPREADSHEET_ID = 'test-program-spreadsheet-id';
  process.env.DELIVERABLES_SPREADSHEET_ID = 'test-deliverables-spreadsheet-id';
  process.env.SUBCONTRACT_SPREADSHEET_ID = 'test-subcontract-spreadsheet-id';
  process.env.COMPLIANCE_SPREADSHEET_ID = 'test-compliance-spreadsheet-id';
  process.env.FINANCIAL_SPREADSHEET_ID = 'test-financial-spreadsheet-id';

  // Set test server URLs
  process.env.PROGRAM_SERVER_URL = 'http://localhost:13001';
  process.env.DELIVERABLES_SERVER_URL = 'http://localhost:13002';
  process.env.SUBCONTRACT_SERVER_URL = 'http://localhost:13003';
  process.env.COMPLIANCE_SERVER_URL = 'http://localhost:13004';
  process.env.FINANCIAL_SERVER_URL = 'http://localhost:13005';

  // Disable LLM integration for tests (use mocks instead)
  process.env.LLM_ENABLED = 'false';

  // Set test credentials paths
  process.env.CREDENTIALS_PATH = './test-credentials.json';
  process.env.TOKEN_PATH = './test-token.json';

  // Disable external service calls
  process.env.DISABLE_EXTERNAL_SERVICES = 'true';
}

/**
 * Teardown test environment after all tests
 */
export function teardownTestEnvironment(): void {
  // Restore original environment
  delete process.env.NODE_ENV;
  delete process.env.PROGRAM_SPREADSHEET_ID;
  delete process.env.DELIVERABLES_SPREADSHEET_ID;
  delete process.env.SUBCONTRACT_SPREADSHEET_ID;
  delete process.env.COMPLIANCE_SPREADSHEET_ID;
  delete process.env.FINANCIAL_SPREADSHEET_ID;
  delete process.env.PROGRAM_SERVER_URL;
  delete process.env.DELIVERABLES_SERVER_URL;
  delete process.env.SUBCONTRACT_SERVER_URL;
  delete process.env.COMPLIANCE_SERVER_URL;
  delete process.env.FINANCIAL_SERVER_URL;
  delete process.env.LLM_ENABLED;
  delete process.env.CREDENTIALS_PATH;
  delete process.env.TOKEN_PATH;
  delete process.env.DISABLE_EXTERNAL_SERVICES;
}

/**
 * Setup before each test
 */
export function setupBeforeEach(): void {
  // Clear all mocks before each test
  jest.clearAllMocks();
}

/**
 * Teardown after each test
 */
export function teardownAfterEach(): void {
  // Restore all mocks after each test
  jest.restoreAllMocks();
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Suppress console output during tests
 */
export function suppressConsole(): void {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}

/**
 * Restore console output
 */
export function restoreConsole(): void {
  jest.restoreAllMocks();
}

/**
 * Mock Date.now() for consistent timestamps in tests
 */
export function mockDateNow(timestamp: number): void {
  jest.spyOn(Date, 'now').mockReturnValue(timestamp);
}

/**
 * Restore Date.now()
 */
export function restoreDateNow(): void {
  jest.restoreAllMocks();
}

/**
 * Create a mock timer for testing time-based functionality
 */
export function useFakeTimers(): void {
  jest.useFakeTimers();
}

/**
 * Restore real timers
 */
export function useRealTimers(): void {
  jest.useRealTimers();
}

/**
 * Fast-forward time by the specified duration
 */
export function advanceTimersByTime(ms: number): void {
  jest.advanceTimersByTime(ms);
}

/**
 * Run all pending timers
 */
export async function runAllTimers(): Promise<void> {
  jest.runAllTimers();
}
