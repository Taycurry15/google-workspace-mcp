/**
 * Cross-Server Communication Types
 *
 * Defines interfaces for REST API communication between MCP servers
 */

/**
 * Server identity and connection info
 */
export interface ServerInfo {
  serverId: string;
  name: string;
  baseUrl: string;
  version: string;
  status: "healthy" | "degraded" | "unhealthy";
  capabilities?: string[];
}

/**
 * API request configuration
 */
export interface ApiRequest {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  timeout?: number; // milliseconds
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    serverId: string;
    timestamp: string;
    duration: number; // milliseconds
  };
}

/**
 * Service registry entry
 */
export interface ServiceRegistryEntry {
  serverId: string;
  serverInfo: ServerInfo;
  registeredAt: Date;
  lastHealthCheck: Date;
  healthCheckInterval: number; // milliseconds
}

/**
 * Cross-server request context
 */
export interface RequestContext {
  requestId: string;
  sourceServerId: string;
  targetServerId: string;
  userId?: string;
  programId?: string;
  timestamp: Date;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  server: string;
  version: string;
  timestamp: string;
  dependencies?: {
    [key: string]: "healthy" | "unhealthy";
  };
  uptime?: number; // seconds
}
