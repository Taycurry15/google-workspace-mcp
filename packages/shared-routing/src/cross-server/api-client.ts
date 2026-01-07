/**
 * Cross-Server API Client
 *
 * REST API client for communication between MCP servers
 */

import type {
  ApiRequest,
  ApiResponse,
  RequestContext,
  ServerInfo,
} from "./types.js";
import { ServiceRegistry } from "./registry.js";

/**
 * Cross-server API client
 *
 * @example
 * const client = new CrossServerClient('mcp-program');
 * const program = await client.get('/api/programs/PROG-001');
 */
export class CrossServerClient {
  private serverId: string;
  private registry: ServiceRegistry;
  private defaultTimeout: number = 30000; // 30 seconds

  constructor(serverId: string, registry?: ServiceRegistry) {
    this.serverId = serverId;
    this.registry = registry || ServiceRegistry.getInstance();
  }

  /**
   * GET request to another server
   */
  async get<T = any>(
    path: string,
    options?: {
      query?: Record<string, string>;
      timeout?: number;
      context?: Partial<RequestContext>;
    }
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: "GET",
      path,
      query: options?.query,
      timeout: options?.timeout,
    }, options?.context);
  }

  /**
   * POST request to another server
   */
  async post<T = any>(
    path: string,
    body: any,
    options?: {
      timeout?: number;
      context?: Partial<RequestContext>;
    }
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: "POST",
      path,
      body,
      timeout: options?.timeout,
    }, options?.context);
  }

  /**
   * PUT request to another server
   */
  async put<T = any>(
    path: string,
    body: any,
    options?: {
      timeout?: number;
      context?: Partial<RequestContext>;
    }
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: "PUT",
      path,
      body,
      timeout: options?.timeout,
    }, options?.context);
  }

  /**
   * DELETE request to another server
   */
  async delete<T = any>(
    path: string,
    options?: {
      timeout?: number;
      context?: Partial<RequestContext>;
    }
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: "DELETE",
      path,
      timeout: options?.timeout,
    }, options?.context);
  }

  /**
   * Generic request method
   */
  async request<T = any>(
    request: ApiRequest,
    context?: Partial<RequestContext>
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();

    try {
      // Get server info from registry
      const serverInfo = this.registry.getServer(this.serverId);
      if (!serverInfo) {
        throw new Error(`Server not found in registry: ${this.serverId}`);
      }

      // Check server health
      if (serverInfo.status === "unhealthy") {
        throw new Error(`Server is unhealthy: ${this.serverId}`);
      }

      // Build URL
      const url = this.buildUrl(serverInfo, request.path, request.query);

      // Build headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Request-Id": context?.requestId || this.generateRequestId(),
        "X-Source-Server": context?.sourceServerId || "unknown",
        ...request.headers,
      };

      if (context?.userId) {
        headers["X-User-Id"] = context.userId;
      }
      if (context?.programId) {
        headers["X-Program-Id"] = context.programId;
      }

      // Make request
      const timeout = request.timeout || this.defaultTimeout;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions: RequestInit = {
        method: request.method,
        headers,
        signal: controller.signal,
      };

      if (request.body) {
        fetchOptions.body = JSON.stringify(request.body);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;

      // Parse response
      const contentType = response.headers.get("content-type");
      let responseData: any;

      if (contentType?.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Build response
      if (response.ok) {
        return {
          success: true,
          data: responseData,
          metadata: {
            serverId: this.serverId,
            timestamp: new Date().toISOString(),
            duration,
          },
        };
      } else {
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: response.statusText,
            details: responseData,
          },
          metadata: {
            serverId: this.serverId,
            timestamp: new Date().toISOString(),
            duration,
          },
        };
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        error: {
          code: error.name === "AbortError" ? "TIMEOUT" : "REQUEST_FAILED",
          message: error.message || "Request failed",
          details: error,
        },
        metadata: {
          serverId: this.serverId,
          timestamp: new Date().toISOString(),
          duration,
        },
      };
    }
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(
    serverInfo: ServerInfo,
    path: string,
    query?: Record<string, string>
  ): string {
    let url = `${serverInfo.baseUrl}${path}`;

    if (query && Object.keys(query).length > 0) {
      const queryString = new URLSearchParams(query).toString();
      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Set default timeout for all requests
   */
  setDefaultTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }
}

/**
 * Create a cross-server client for a specific server
 */
export function createCrossServerClient(serverId: string): CrossServerClient {
  return new CrossServerClient(serverId);
}
