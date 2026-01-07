/**
 * Root Jest Configuration for Google Workspace MCP Platform
 *
 * Monorepo configuration with TypeScript + ESM support
 * Covers all 5 MCP servers + shared packages
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // TypeScript support
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],

  // Module name mapping for workspace packages
  moduleNameMapper: {
    '^@gw-mcp/shared-core$': '<rootDir>/packages/shared-core/src/index.ts',
    '^@gw-mcp/shared-core/(.*)$': '<rootDir>/packages/shared-core/src/$1',
    '^@gw-mcp/shared-llm$': '<rootDir>/packages/shared-llm/src/index.ts',
    '^@gw-mcp/shared-llm/(.*)$': '<rootDir>/packages/shared-llm/src/$1',
    '^@gw-mcp/shared-workflows$': '<rootDir>/packages/shared-workflows/src/index.ts',
    '^@gw-mcp/shared-workflows/(.*)$': '<rootDir>/packages/shared-workflows/src/$1',
    '^@gw-mcp/shared-routing$': '<rootDir>/packages/shared-routing/src/index.ts',
    '^@gw-mcp/shared-routing/(.*)$': '<rootDir>/packages/shared-routing/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1', // Handle .js imports for ESM
  },

  // Transform TypeScript files
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.jest.json',
      },
    ],
  },

  // Transform node_modules that use ESM
  transformIgnorePatterns: [
    'node_modules/(?!(@jest/globals|@modelcontextprotocol)/)',
  ],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(test|integration.test|e2e.test).ts',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/index.ts',
    '!packages/*/src/test-utils/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 75,
      functions: 80,
      statements: 80,
    },
    // Higher thresholds for critical modules
    './packages/mcp-financial/src/evm/': {
      lines: 90,
      branches: 85,
      functions: 90,
      statements: 90,
    },
    './packages/mcp-financial/src/budgets/': {
      lines: 90,
      branches: 85,
      functions: 90,
      statements: 90,
    },
    './packages/shared-core/src/': {
      lines: 85,
      branches: 80,
      functions: 85,
      statements: 85,
    },
    './packages/shared-routing/src/': {
      lines: 85,
      branches: 80,
      functions: 85,
      statements: 85,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Coverage output
  coverageDirectory: '<rootDir>/coverage',

  // Test timeout (30 seconds for integration tests)
  testTimeout: 30000,

  // Globals
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.npm/',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,
};
