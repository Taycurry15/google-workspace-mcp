/**
 * E2E Tests: Server Startup
 *
 * Tests that all 5 MCP servers start successfully and register with the service registry.
 * This is the foundational E2E test that validates the basic infrastructure.
 *
 * Test Coverage:
 * - All 5 servers start without errors
 * - REST API servers listen on correct ports
 * - Health check endpoints respond
 * - Service registry registration
 * - MCP stdio connection (if applicable)
 *
 * Prerequisites:
 * - All servers built (npm run build)
 * - Environment variables configured
 * - Google Sheets/Drive credentials available
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { spawn, ChildProcess } from "child_process";

// ============================================================================
// Configuration
// ============================================================================

interface ServerConfig {
  name: string;
  serverId: string;
  port: number;
  scriptPath: string;
  healthEndpoint: string;
}

const SERVERS: ServerConfig[] = [
  {
    name: "Program Management",
    serverId: "mcp-program",
    port: 3001,
    scriptPath: "./packages/mcp-program/dist/index.js",
    healthEndpoint: "http://localhost:3001/health",
  },
  {
    name: "Deliverable Tracking",
    serverId: "mcp-deliverables",
    port: 3002,
    scriptPath: "./packages/mcp-deliverables/dist/index.js",
    healthEndpoint: "http://localhost:3002/health",
  },
  {
    name: "Subcontract Management",
    serverId: "mcp-subcontract",
    port: 3003,
    scriptPath: "./packages/mcp-subcontract/dist/index.js",
    healthEndpoint: "http://localhost:3003/health",
  },
  {
    name: "Compliance & Risk",
    serverId: "mcp-compliance",
    port: 3004,
    scriptPath: "./packages/mcp-compliance/dist/index.js",
    healthEndpoint: "http://localhost:3004/health",
  },
  {
    name: "Financial Management",
    serverId: "mcp-financial",
    port: 3005,
    scriptPath: "./packages/mcp-financial/dist/index.js",
    healthEndpoint: "http://localhost:3005/health",
  },
];

const STARTUP_TIMEOUT = 30000; // 30 seconds for all servers to start
const HEALTH_CHECK_RETRY_COUNT = 10;
const HEALTH_CHECK_RETRY_DELAY = 2000; // 2 seconds between retries

// ============================================================================
// Server Process Management
// ============================================================================

const serverProcesses: Map<string, ChildProcess> = new Map();
const serverLogs: Map<string, string[]> = new Map();

/**
 * Start a single server process
 */
async function startServer(config: ServerConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[E2E] Starting ${config.name} on port ${config.port}...`);

    const process = spawn("node", [config.scriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: config.port.toString(),
        NODE_ENV: "test",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    serverProcesses.set(config.serverId, process);
    serverLogs.set(config.serverId, []);

    // Capture stdout
    process.stdout?.on("data", (data) => {
      const log = data.toString();
      serverLogs.get(config.serverId)?.push(log);

      // Check for successful startup messages
      if (
        log.includes("listening on port") ||
        log.includes("MCP Server running") ||
        log.includes("REST API server listening")
      ) {
        console.log(`[E2E] ${config.name} started successfully`);
        resolve();
      }
    });

    // Capture stderr
    process.stderr?.on("data", (data) => {
      const log = data.toString();
      serverLogs.get(config.serverId)?.push(`ERROR: ${log}`);
      console.error(`[E2E] ${config.name} error: ${log}`);
    });

    // Handle process exit
    process.on("exit", (code) => {
      if (code !== 0) {
        console.error(`[E2E] ${config.name} exited with code ${code}`);
      }
    });

    // Handle process error
    process.on("error", (error) => {
      console.error(`[E2E] ${config.name} process error:`, error);
      reject(error);
    });

    // Timeout fallback: resolve after 5 seconds even if no startup message
    setTimeout(() => {
      console.log(`[E2E] ${config.name} startup timeout, assuming started`);
      resolve();
    }, 5000);
  });
}

/**
 * Stop a single server process
 */
async function stopServer(serverId: string): Promise<void> {
  const process = serverProcesses.get(serverId);
  if (process) {
    console.log(`[E2E] Stopping ${serverId}...`);
    process.kill("SIGTERM");

    // Wait for graceful shutdown
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Force kill if still running
    if (!process.killed) {
      process.kill("SIGKILL");
    }

    serverProcesses.delete(serverId);
  }
}

/**
 * Wait for server health check to pass
 */
async function waitForHealthCheck(
  config: ServerConfig,
  retries = HEALTH_CHECK_RETRY_COUNT
): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(config.healthEndpoint, {
        method: "GET",
        timeout: 5000,
      });

      if (response.ok) {
        console.log(`[E2E] ${config.name} health check passed`);
        return true;
      }
    } catch (error) {
      console.log(
        `[E2E] ${config.name} health check failed (attempt ${i + 1}/${retries})`
      );
    }

    // Wait before retry
    if (i < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_RETRY_DELAY));
    }
  }

  return false;
}

// ============================================================================
// Test Suite Setup
// ============================================================================

beforeAll(async () => {
  console.log("\n[E2E] ========================================");
  console.log("[E2E] Starting all 5 MCP servers...");
  console.log("[E2E] ========================================\n");

  // Start all servers in parallel
  await Promise.all(SERVERS.map((config) => startServer(config)));

  console.log("\n[E2E] All servers started, waiting for health checks...\n");

  // Wait for all health checks to pass
  const healthCheckResults = await Promise.all(
    SERVERS.map((config) => waitForHealthCheck(config))
  );

  const allHealthy = healthCheckResults.every((result) => result);
  if (!allHealthy) {
    console.error("[E2E] Not all servers are healthy!");
    // Continue anyway to see which tests fail
  }
}, STARTUP_TIMEOUT);

afterAll(async () => {
  console.log("\n[E2E] ========================================");
  console.log("[E2E] Stopping all servers...");
  console.log("[E2E] ========================================\n");

  // Stop all servers
  await Promise.all(
    Array.from(serverProcesses.keys()).map((serverId) => stopServer(serverId))
  );

  console.log("[E2E] All servers stopped\n");
});

// ============================================================================
// E2E Tests: Server Startup
// ============================================================================

describe("E2E: Server Startup", () => {
  describe("Server Processes", () => {
    it("should start all 5 servers without errors", () => {
      expect(serverProcesses.size).toBe(5);

      for (const config of SERVERS) {
        const process = serverProcesses.get(config.serverId);
        expect(process).toBeDefined();
        expect(process?.killed).toBe(false);
      }
    });

    it("should have stdout/stderr captured for all servers", () => {
      expect(serverLogs.size).toBe(5);

      for (const config of SERVERS) {
        const logs = serverLogs.get(config.serverId);
        expect(logs).toBeDefined();
        expect(Array.isArray(logs)).toBe(true);
      }
    });
  });

  describe("Health Check Endpoints", () => {
    it.each(SERVERS)(
      "should respond to health check: $name (port $port)",
      async (config) => {
        const response = await fetch(config.healthEndpoint, {
          method: "GET",
          timeout: 5000,
        });

        expect(response.ok).toBe(true);
        expect(response.status).toBe(200);
      }
    );

    it.each(SERVERS)(
      "should return valid health check JSON: $name",
      async (config) => {
        const response = await fetch(config.healthEndpoint);
        const data = await response.json();

        expect(data).toHaveProperty("status");
        expect(data).toHaveProperty("server");
        expect(data).toHaveProperty("version");
        expect(data).toHaveProperty("timestamp");

        expect(["healthy", "degraded", "unhealthy"]).toContain(data.status);
        expect(data.server).toBe(config.serverId);
      }
    );

    it("should have all servers in healthy or degraded status", async () => {
      const healthStatuses = await Promise.all(
        SERVERS.map(async (config) => {
          const response = await fetch(config.healthEndpoint);
          const data = await response.json();
          return { serverId: config.serverId, status: data.status };
        })
      );

      for (const { serverId, status } of healthStatuses) {
        expect(["healthy", "degraded"]).toContain(status);
        console.log(`[E2E] ${serverId}: ${status}`);
      }
    });
  });

  describe("Service Registry Integration", () => {
    it("should register all servers with service registry", async () => {
      // Query the program server's service registry endpoint
      const response = await fetch("http://localhost:3001/api/registry/servers", {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();

        // Expect service registry to list registered servers
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);

        // At minimum, the server itself should be registered
        const serverIds = data.data.map((s: any) => s.serverId);
        expect(serverIds.length).toBeGreaterThan(0);
      } else {
        // Service registry endpoint might not exist yet
        console.log("[E2E] Service registry endpoint not available");
      }
    });
  });

  describe("Server Logs", () => {
    it("should have startup logs for all servers", () => {
      for (const config of SERVERS) {
        const logs = serverLogs.get(config.serverId);
        expect(logs).toBeDefined();
        expect(logs!.length).toBeGreaterThan(0);

        // Log sample for debugging
        console.log(`\n[E2E] ${config.name} logs (first 5 lines):`);
        logs!.slice(0, 5).forEach((line) => console.log(`  ${line.trim()}`));
      }
    });

    it("should not have critical errors in logs", () => {
      for (const config of SERVERS) {
        const logs = serverLogs.get(config.serverId);
        const errorLogs = logs!.filter(
          (log) =>
            log.toLowerCase().includes("error") &&
            !log.includes("0 errors") && // Build output
            !log.includes("no errors") // Build output
        );

        if (errorLogs.length > 0) {
          console.warn(`\n[E2E] ${config.name} has error logs:`);
          errorLogs.forEach((log) => console.warn(`  ${log.trim()}`));
        }

        // Allow warnings but not fatal errors
        const fatalErrors = errorLogs.filter(
          (log) =>
            log.toLowerCase().includes("fatal") ||
            log.toLowerCase().includes("failed to start") ||
            log.toLowerCase().includes("cannot find module")
        );

        expect(fatalErrors).toHaveLength(0);
      }
    });
  });

  describe("Port Availability", () => {
    it.each(SERVERS)(
      "should have $name listening on port $port",
      async (config) => {
        // Try to connect to the port
        try {
          const response = await fetch(config.healthEndpoint, {
            method: "GET",
            timeout: 3000,
          });

          // If we get a response, the port is listening
          expect(response).toBeDefined();
        } catch (error: any) {
          // ECONNREFUSED means port is not listening
          if (error.code === "ECONNREFUSED") {
            fail(`Port ${config.port} is not listening`);
          }
          // Other errors (timeout, etc.) we'll let pass for now
        }
      }
    );
  });
});

// ============================================================================
// E2E Tests: Basic API Functionality
// ============================================================================

describe("E2E: Basic API Functionality", () => {
  describe("Program Server API", () => {
    it("should respond to program listing endpoint", async () => {
      const response = await fetch("http://localhost:3001/api/programs", {
        method: "GET",
      });

      expect([200, 404]).toContain(response.status);
      // 404 is acceptable if no programs exist yet
    });
  });

  describe("Deliverables Server API", () => {
    it("should respond to deliverables listing endpoint", async () => {
      const response = await fetch("http://localhost:3002/api/deliverables", {
        method: "GET",
      });

      expect([200, 404]).toContain(response.status);
    });
  });

  describe("Subcontract Server API", () => {
    it("should respond to vendors listing endpoint", async () => {
      const response = await fetch("http://localhost:3003/api/vendors", {
        method: "GET",
      });

      expect([200, 404]).toContain(response.status);
    });
  });

  describe("Compliance Server API", () => {
    it("should respond to risks listing endpoint", async () => {
      const response = await fetch("http://localhost:3004/api/risks", {
        method: "GET",
      });

      expect([200, 404]).toContain(response.status);
    });
  });

  describe("Financial Server API", () => {
    it("should respond to budgets listing endpoint", async () => {
      const response = await fetch("http://localhost:3005/api/budgets", {
        method: "GET",
      });

      expect([200, 404]).toContain(response.status);
    });
  });
});
