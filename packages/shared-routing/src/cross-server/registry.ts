/**
 * Service Registry
 *
 * Maintains registry of available MCP servers and their health status
 */

import type {
  ServerInfo,
  ServiceRegistryEntry,
  HealthCheckResponse,
} from "./types.js";

/**
 * Service registry for server discovery
 *
 * Maintains a registry of all available MCP servers with health checking
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private servers: Map<string, ServiceRegistryEntry> = new Map();
  private healthCheckInterval: number = 60000; // 60 seconds
  private healthCheckTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    // Singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  /**
   * Register a server
   */
  register(serverInfo: ServerInfo, healthCheckInterval?: number): void {
    const entry: ServiceRegistryEntry = {
      serverId: serverInfo.serverId,
      serverInfo,
      registeredAt: new Date(),
      lastHealthCheck: new Date(),
      healthCheckInterval: healthCheckInterval || this.healthCheckInterval,
    };

    this.servers.set(serverInfo.serverId, entry);

    // Start health checking
    this.startHealthCheck(serverInfo.serverId);

    console.log(`[ServiceRegistry] Registered server: ${serverInfo.serverId} at ${serverInfo.baseUrl}`);
  }

  /**
   * Unregister a server
   */
  unregister(serverId: string): void {
    this.stopHealthCheck(serverId);
    this.servers.delete(serverId);
    console.log(`[ServiceRegistry] Unregistered server: ${serverId}`);
  }

  /**
   * Get server info by ID
   */
  getServer(serverId: string): ServerInfo | undefined {
    const entry = this.servers.get(serverId);
    return entry?.serverInfo;
  }

  /**
   * List all registered servers
   */
  listServers(): ServerInfo[] {
    return Array.from(this.servers.values()).map((entry) => entry.serverInfo);
  }

  /**
   * List healthy servers only
   */
  listHealthyServers(): ServerInfo[] {
    return this.listServers().filter(
      (server) => server.status === "healthy" || server.status === "degraded"
    );
  }

  /**
   * Check if server is registered
   */
  hasServer(serverId: string): boolean {
    return this.servers.has(serverId);
  }

  /**
   * Update server status
   */
  updateStatus(
    serverId: string,
    status: "healthy" | "degraded" | "unhealthy"
  ): void {
    const entry = this.servers.get(serverId);
    if (entry) {
      entry.serverInfo.status = status;
      entry.lastHealthCheck = new Date();
    }
  }

  /**
   * Perform health check on a server
   */
  async healthCheck(serverId: string): Promise<boolean> {
    const entry = this.servers.get(serverId);
    if (!entry) {
      return false;
    }

    try {
      const url = `${entry.serverInfo.baseUrl}/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const healthData = (await response.json()) as HealthCheckResponse;
        this.updateStatus(serverId, healthData.status);
        return healthData.status !== "unhealthy";
      } else {
        this.updateStatus(serverId, "unhealthy");
        return false;
      }
    } catch (error) {
      console.error(`[ServiceRegistry] Health check failed for ${serverId}:`, error);
      this.updateStatus(serverId, "unhealthy");
      return false;
    }
  }

  /**
   * Start periodic health checking for a server
   */
  private startHealthCheck(serverId: string): void {
    const entry = this.servers.get(serverId);
    if (!entry) {
      return;
    }

    // Stop existing health check if any
    this.stopHealthCheck(serverId);

    // Perform initial health check
    this.healthCheck(serverId);

    // Schedule periodic health checks
    const timer = setInterval(() => {
      this.healthCheck(serverId);
    }, entry.healthCheckInterval);

    this.healthCheckTimers.set(serverId, timer);
  }

  /**
   * Stop health checking for a server
   */
  private stopHealthCheck(serverId: string): void {
    const timer = this.healthCheckTimers.get(serverId);
    if (timer) {
      clearInterval(timer);
      this.healthCheckTimers.delete(serverId);
    }
  }

  /**
   * Set global health check interval
   */
  setHealthCheckInterval(interval: number): void {
    this.healthCheckInterval = interval;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalServers: number;
    healthyServers: number;
    degradedServers: number;
    unhealthyServers: number;
  } {
    const servers = this.listServers();
    return {
      totalServers: servers.length,
      healthyServers: servers.filter((s) => s.status === "healthy").length,
      degradedServers: servers.filter((s) => s.status === "degraded").length,
      unhealthyServers: servers.filter((s) => s.status === "unhealthy").length,
    };
  }

  /**
   * Clear all servers (for testing)
   */
  clear(): void {
    // Stop all health checks
    for (const serverId of this.servers.keys()) {
      this.stopHealthCheck(serverId);
    }
    this.servers.clear();
  }
}

/**
 * Get the singleton service registry instance
 */
export function getServiceRegistry(): ServiceRegistry {
  return ServiceRegistry.getInstance();
}

/**
 * Register default servers from environment variables
 */
export function registerDefaultServers(): void {
  const registry = ServiceRegistry.getInstance();

  // MCP Program Server
  if (process.env.MCP_PROGRAM_URL) {
    registry.register({
      serverId: "mcp-program",
      name: "Program Management",
      baseUrl: process.env.MCP_PROGRAM_URL,
      version: "1.0.0",
      status: "healthy",
      capabilities: ["programs", "wbs", "milestones", "schedule", "governance"],
    });
  }

  // MCP Deliverables Server
  if (process.env.MCP_DELIVERABLES_URL) {
    registry.register({
      serverId: "mcp-deliverables",
      name: "Deliverable Tracking",
      baseUrl: process.env.MCP_DELIVERABLES_URL,
      version: "1.0.0",
      status: "healthy",
      capabilities: ["deliverables", "submissions", "reviews", "quality"],
    });
  }

  // MCP Subcontract Server
  if (process.env.MCP_SUBCONTRACT_URL) {
    registry.register({
      serverId: "mcp-subcontract",
      name: "Subcontract Management",
      baseUrl: process.env.MCP_SUBCONTRACT_URL,
      version: "1.0.0",
      status: "healthy",
      capabilities: ["vendors", "contracts", "invoices", "performance"],
    });
  }

  // MCP Compliance Server
  if (process.env.MCP_COMPLIANCE_URL) {
    registry.register({
      serverId: "mcp-compliance",
      name: "Compliance & Risk",
      baseUrl: process.env.MCP_COMPLIANCE_URL,
      version: "1.0.0",
      status: "healthy",
      capabilities: ["risks", "compliance", "fcpa", "audit"],
    });
  }

  // MCP Financial Server
  if (process.env.MCP_FINANCIAL_URL) {
    registry.register({
      serverId: "mcp-financial",
      name: "Financial Management",
      baseUrl: process.env.MCP_FINANCIAL_URL,
      version: "1.0.0",
      status: "healthy",
      capabilities: ["budgets", "evm", "cashflow", "transactions"],
    });
  }
}
