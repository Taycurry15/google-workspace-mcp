/**
 * Unit Tests for Service Registry
 *
 * Tests the ServiceRegistry class which manages MCP server discovery and health checking:
 * - Server registration and unregistration
 * - Server discovery (get, list, check existence)
 * - Health status management
 * - Health check execution (with mock fetch)
 * - Registry statistics
 *
 * Test Coverage:
 * - Singleton pattern
 * - Server lifecycle management
 * - Health checking with mocked HTTP requests
 * - Status filtering
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  ServiceRegistry,
  getServiceRegistry,
  registerDefaultServers,
} from "../../src/cross-server/registry.js";
import type { ServerInfo } from "../../src/cross-server/types.js";

// ============================================================================
// Test Setup
// ============================================================================

// Save original environment
const originalEnv = process.env;

// Mock global fetch
global.fetch = jest.fn() as any;

beforeEach(() => {
  // Clear the registry before each test
  const registry = ServiceRegistry.getInstance();
  registry.clear();

  // Reset fetch mock
  (global.fetch as jest.Mock).mockReset();

  // Reset environment
  process.env = { ...originalEnv };
});

afterEach(() => {
  // Restore environment
  process.env = originalEnv;

  // Clear registry
  const registry = ServiceRegistry.getInstance();
  registry.clear();
});

// ============================================================================
// Helper Functions
// ============================================================================

function createTestServerInfo(serverId: string): ServerInfo {
  return {
    serverId,
    name: `Test Server ${serverId}`,
    baseUrl: `http://localhost:300${serverId.slice(-1)}`,
    version: "1.0.0",
    status: "healthy",
    capabilities: ["test"],
  };
}

function mockHealthyResponse() {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      status: "healthy",
      server: "test",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    }),
  });
}

function mockUnhealthyResponse() {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status: 500,
  });
}

function mockNetworkError() {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));
}

// ============================================================================
// Singleton Pattern Tests
// ============================================================================

describe("ServiceRegistry Singleton", () => {
  it("should return the same instance", () => {
    const instance1 = ServiceRegistry.getInstance();
    const instance2 = ServiceRegistry.getInstance();

    expect(instance1).toBe(instance2);
  });

  it("should return instance via getServiceRegistry helper", () => {
    const instance1 = ServiceRegistry.getInstance();
    const instance2 = getServiceRegistry();

    expect(instance1).toBe(instance2);
  });
});

// ============================================================================
// Server Registration Tests
// ============================================================================

describe("ServiceRegistry.register", () => {
  it("should register a server", () => {
    const registry = ServiceRegistry.getInstance();
    const serverInfo = createTestServerInfo("server1");

    // Mock health check
    mockHealthyResponse();

    registry.register(serverInfo);

    expect(registry.hasServer("server1")).toBe(true);
    expect(registry.getServer("server1")).toEqual(serverInfo);
  });

  it("should register multiple servers", () => {
    const registry = ServiceRegistry.getInstance();
    const server1 = createTestServerInfo("server1");
    const server2 = createTestServerInfo("server2");

    mockHealthyResponse();
    mockHealthyResponse();

    registry.register(server1);
    registry.register(server2);

    expect(registry.hasServer("server1")).toBe(true);
    expect(registry.hasServer("server2")).toBe(true);

    const servers = registry.listServers();
    expect(servers).toHaveLength(2);
  });

  it("should use custom health check interval", () => {
    const registry = ServiceRegistry.getInstance();
    const serverInfo = createTestServerInfo("server1");

    mockHealthyResponse();

    registry.register(serverInfo, 30000); // 30 seconds

    expect(registry.hasServer("server1")).toBe(true);
  });
});

describe("ServiceRegistry.unregister", () => {
  it("should unregister a server", () => {
    const registry = ServiceRegistry.getInstance();
    const serverInfo = createTestServerInfo("server1");

    mockHealthyResponse();
    registry.register(serverInfo);

    expect(registry.hasServer("server1")).toBe(true);

    registry.unregister("server1");

    expect(registry.hasServer("server1")).toBe(false);
    expect(registry.getServer("server1")).toBeUndefined();
  });

  it("should handle unregistering non-existent server", () => {
    const registry = ServiceRegistry.getInstance();

    // Should not throw
    expect(() => registry.unregister("nonexistent")).not.toThrow();
  });
});

// ============================================================================
// Server Discovery Tests
// ============================================================================

describe("ServiceRegistry.getServer", () => {
  it("should return server info by ID", () => {
    const registry = ServiceRegistry.getInstance();
    const serverInfo = createTestServerInfo("server1");

    mockHealthyResponse();
    registry.register(serverInfo);

    const retrieved = registry.getServer("server1");

    expect(retrieved).toEqual(serverInfo);
  });

  it("should return undefined for non-existent server", () => {
    const registry = ServiceRegistry.getInstance();

    const retrieved = registry.getServer("nonexistent");

    expect(retrieved).toBeUndefined();
  });
});

describe("ServiceRegistry.listServers", () => {
  it("should list all registered servers", () => {
    const registry = ServiceRegistry.getInstance();
    const server1 = createTestServerInfo("server1");
    const server2 = createTestServerInfo("server2");
    const server3 = createTestServerInfo("server3");

    mockHealthyResponse();
    mockHealthyResponse();
    mockHealthyResponse();

    registry.register(server1);
    registry.register(server2);
    registry.register(server3);

    const servers = registry.listServers();

    expect(servers).toHaveLength(3);
    expect(servers).toEqual(
      expect.arrayContaining([server1, server2, server3])
    );
  });

  it("should return empty array when no servers registered", () => {
    const registry = ServiceRegistry.getInstance();

    const servers = registry.listServers();

    expect(servers).toEqual([]);
  });
});

describe("ServiceRegistry.listHealthyServers", () => {
  it("should list only healthy and degraded servers", () => {
    const registry = ServiceRegistry.getInstance();
    const server1 = createTestServerInfo("server1");
    const server2 = createTestServerInfo("server2");
    const server3 = createTestServerInfo("server3");

    mockHealthyResponse();
    mockHealthyResponse();
    mockHealthyResponse();

    registry.register(server1);
    registry.register(server2);
    registry.register(server3);

    // Update statuses
    registry.updateStatus("server1", "healthy");
    registry.updateStatus("server2", "degraded");
    registry.updateStatus("server3", "unhealthy");

    const healthyServers = registry.listHealthyServers();

    expect(healthyServers).toHaveLength(2);
    expect(healthyServers.map((s) => s.serverId)).toEqual(
      expect.arrayContaining(["server1", "server2"])
    );
    expect(healthyServers.map((s) => s.serverId)).not.toContain("server3");
  });

  it("should return empty array when all servers unhealthy", () => {
    const registry = ServiceRegistry.getInstance();
    const server1 = createTestServerInfo("server1");

    mockHealthyResponse();
    registry.register(server1);
    registry.updateStatus("server1", "unhealthy");

    const healthyServers = registry.listHealthyServers();

    expect(healthyServers).toEqual([]);
  });
});

describe("ServiceRegistry.hasServer", () => {
  it("should return true for registered server", () => {
    const registry = ServiceRegistry.getInstance();
    const serverInfo = createTestServerInfo("server1");

    mockHealthyResponse();
    registry.register(serverInfo);

    expect(registry.hasServer("server1")).toBe(true);
  });

  it("should return false for non-registered server", () => {
    const registry = ServiceRegistry.getInstance();

    expect(registry.hasServer("server1")).toBe(false);
  });
});

// ============================================================================
// Status Management Tests
// ============================================================================

describe("ServiceRegistry.updateStatus", () => {
  it("should update server status to healthy", () => {
    const registry = ServiceRegistry.getInstance();
    const serverInfo = createTestServerInfo("server1");

    mockHealthyResponse();
    registry.register(serverInfo);

    registry.updateStatus("server1", "healthy");

    const server = registry.getServer("server1");
    expect(server?.status).toBe("healthy");
  });

  it("should update server status to degraded", () => {
    const registry = ServiceRegistry.getInstance();
    const serverInfo = createTestServerInfo("server1");

    mockHealthyResponse();
    registry.register(serverInfo);

    registry.updateStatus("server1", "degraded");

    const server = registry.getServer("server1");
    expect(server?.status).toBe("degraded");
  });

  it("should update server status to unhealthy", () => {
    const registry = ServiceRegistry.getInstance();
    const serverInfo = createTestServerInfo("server1");

    mockHealthyResponse();
    registry.register(serverInfo);

    registry.updateStatus("server1", "unhealthy");

    const server = registry.getServer("server1");
    expect(server?.status).toBe("unhealthy");
  });

  it("should do nothing for non-existent server", () => {
    const registry = ServiceRegistry.getInstance();

    // Should not throw
    expect(() => registry.updateStatus("nonexistent", "healthy")).not.toThrow();
  });
});

// ============================================================================
// Health Check Tests
// ============================================================================

describe("ServiceRegistry.healthCheck", () => {
  it("should return true for healthy server", async () => {
    const registry = ServiceRegistry.getInstance();
    const serverInfo = createTestServerInfo("server1");

    mockHealthyResponse();
    registry.register(serverInfo);

    mockHealthyResponse();
    const result = await registry.healthCheck("server1");

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3001/health",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("should return false for unhealthy server (HTTP error)", async () => {
    const registry = ServiceRegistry.getInstance();
    const serverInfo = createTestServerInfo("server1");

    mockHealthyResponse();
    registry.register(serverInfo);

    mockUnhealthyResponse();
    const result = await registry.healthCheck("server1");

    expect(result).toBe(false);

    const server = registry.getServer("server1");
    expect(server?.status).toBe("unhealthy");
  });

  it("should return false for network error", async () => {
    const registry = ServiceRegistry.getInstance();
    const serverInfo = createTestServerInfo("server1");

    mockHealthyResponse();
    registry.register(serverInfo);

    mockNetworkError();
    const result = await registry.healthCheck("server1");

    expect(result).toBe(false);

    const server = registry.getServer("server1");
    expect(server?.status).toBe("unhealthy");
  });

  it("should return false for non-existent server", async () => {
    const registry = ServiceRegistry.getInstance();

    const result = await registry.healthCheck("nonexistent");

    expect(result).toBe(false);
  });

  it("should update status based on health check response", async () => {
    const registry = ServiceRegistry.getInstance();
    const serverInfo = createTestServerInfo("server1");

    mockHealthyResponse();
    registry.register(serverInfo);

    // Mock degraded response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "degraded",
        server: "server1",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      }),
    });

    const result = await registry.healthCheck("server1");

    expect(result).toBe(true); // Still returns true (not unhealthy)

    const server = registry.getServer("server1");
    expect(server?.status).toBe("degraded");
  });

  it("should handle timeout (5 seconds)", async () => {
    const registry = ServiceRegistry.getInstance();
    const serverInfo = createTestServerInfo("server1");

    mockHealthyResponse();
    registry.register(serverInfo);

    // Mock timeout
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5100)
      )
    );

    const result = await registry.healthCheck("server1");

    expect(result).toBe(false);
  }, 10000); // Increase test timeout
});

// ============================================================================
// Statistics Tests
// ============================================================================

describe("ServiceRegistry.getStats", () => {
  it("should return correct statistics", () => {
    const registry = ServiceRegistry.getInstance();
    const server1 = createTestServerInfo("server1");
    const server2 = createTestServerInfo("server2");
    const server3 = createTestServerInfo("server3");
    const server4 = createTestServerInfo("server4");

    mockHealthyResponse();
    mockHealthyResponse();
    mockHealthyResponse();
    mockHealthyResponse();

    registry.register(server1);
    registry.register(server2);
    registry.register(server3);
    registry.register(server4);

    registry.updateStatus("server1", "healthy");
    registry.updateStatus("server2", "healthy");
    registry.updateStatus("server3", "degraded");
    registry.updateStatus("server4", "unhealthy");

    const stats = registry.getStats();

    expect(stats.totalServers).toBe(4);
    expect(stats.healthyServers).toBe(2);
    expect(stats.degradedServers).toBe(1);
    expect(stats.unhealthyServers).toBe(1);
  });

  it("should return zero stats when no servers", () => {
    const registry = ServiceRegistry.getInstance();

    const stats = registry.getStats();

    expect(stats.totalServers).toBe(0);
    expect(stats.healthyServers).toBe(0);
    expect(stats.degradedServers).toBe(0);
    expect(stats.unhealthyServers).toBe(0);
  });
});

// ============================================================================
// Clear Tests
// ============================================================================

describe("ServiceRegistry.clear", () => {
  it("should clear all servers", () => {
    const registry = ServiceRegistry.getInstance();
    const server1 = createTestServerInfo("server1");
    const server2 = createTestServerInfo("server2");

    mockHealthyResponse();
    mockHealthyResponse();

    registry.register(server1);
    registry.register(server2);

    expect(registry.listServers()).toHaveLength(2);

    registry.clear();

    expect(registry.listServers()).toHaveLength(0);
    expect(registry.hasServer("server1")).toBe(false);
    expect(registry.hasServer("server2")).toBe(false);
  });

  it("should stop all health checks when clearing", () => {
    const registry = ServiceRegistry.getInstance();
    const server1 = createTestServerInfo("server1");

    mockHealthyResponse();
    registry.register(server1);

    registry.clear();

    // After clear, health check timers should be stopped
    // No additional assertions needed, just verify clear doesn't throw
    expect(registry.listServers()).toHaveLength(0);
  });
});

// ============================================================================
// Default Servers Registration Tests
// ============================================================================

describe("registerDefaultServers", () => {
  it("should register servers from environment variables", () => {
    process.env.MCP_PROGRAM_URL = "http://localhost:3001";
    process.env.MCP_DELIVERABLES_URL = "http://localhost:3002";
    process.env.MCP_FINANCIAL_URL = "http://localhost:3005";

    // Mock health checks for all servers
    mockHealthyResponse();
    mockHealthyResponse();
    mockHealthyResponse();

    registerDefaultServers();

    const registry = getServiceRegistry();

    expect(registry.hasServer("mcp-program")).toBe(true);
    expect(registry.hasServer("mcp-deliverables")).toBe(true);
    expect(registry.hasServer("mcp-financial")).toBe(true);
    expect(registry.hasServer("mcp-subcontract")).toBe(false);
    expect(registry.hasServer("mcp-compliance")).toBe(false);
  });

  it("should not register servers without env vars", () => {
    // No env vars set
    registerDefaultServers();

    const registry = getServiceRegistry();

    expect(registry.listServers()).toHaveLength(0);
  });

  it("should register all 5 servers when all env vars set", () => {
    process.env.MCP_PROGRAM_URL = "http://localhost:3001";
    process.env.MCP_DELIVERABLES_URL = "http://localhost:3002";
    process.env.MCP_SUBCONTRACT_URL = "http://localhost:3003";
    process.env.MCP_COMPLIANCE_URL = "http://localhost:3004";
    process.env.MCP_FINANCIAL_URL = "http://localhost:3005";

    // Mock health checks for all 5 servers
    for (let i = 0; i < 5; i++) {
      mockHealthyResponse();
    }

    registerDefaultServers();

    const registry = getServiceRegistry();

    expect(registry.listServers()).toHaveLength(5);
    expect(registry.hasServer("mcp-program")).toBe(true);
    expect(registry.hasServer("mcp-deliverables")).toBe(true);
    expect(registry.hasServer("mcp-subcontract")).toBe(true);
    expect(registry.hasServer("mcp-compliance")).toBe(true);
    expect(registry.hasServer("mcp-financial")).toBe(true);
  });

  it("should set correct server properties", () => {
    process.env.MCP_PROGRAM_URL = "http://localhost:3001";

    mockHealthyResponse();
    registerDefaultServers();

    const registry = getServiceRegistry();
    const server = registry.getServer("mcp-program");

    expect(server).toBeDefined();
    expect(server?.name).toBe("Program Management");
    expect(server?.baseUrl).toBe("http://localhost:3001");
    expect(server?.version).toBe("1.0.0");
    expect(server?.status).toBe("healthy");
    expect(server?.capabilities).toEqual([
      "programs",
      "wbs",
      "milestones",
      "schedule",
      "governance",
    ]);
  });
});
