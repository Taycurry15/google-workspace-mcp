/**
 * Custom error types for Google Workspace MCP platform
 */

/**
 * Base error class for all MCP errors
 */
export class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = "MCPError";
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication/Authorization errors
 */
export class AuthenticationError extends MCPError {
  constructor(message: string = "Authentication failed", details?: any) {
    super(message, "AUTH_ERROR", 401, details);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends MCPError {
  constructor(message: string = "Insufficient permissions", details?: any) {
    super(message, "AUTHZ_ERROR", 403, details);
    this.name = "AuthorizationError";
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends MCPError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, "NOT_FOUND", 404, { resource, id });
    this.name = "NotFoundError";
  }
}

/**
 * Validation errors
 */
export class ValidationError extends MCPError {
  constructor(message: string, details?: any) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

/**
 * Conflict errors (e.g., duplicate IDs)
 */
export class ConflictError extends MCPError {
  constructor(message: string, details?: any) {
    super(message, "CONFLICT", 409, details);
    this.name = "ConflictError";
  }
}

/**
 * Google API errors
 */
export class GoogleAPIError extends MCPError {
  constructor(message: string, apiName: string, details?: any) {
    super(`Google ${apiName} API error: ${message}`, "GOOGLE_API_ERROR", 502, {
      apiName,
      ...details,
    });
    this.name = "GoogleAPIError";
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends MCPError {
  constructor(retryAfter?: number) {
    super(
      "Rate limit exceeded",
      "RATE_LIMIT",
      429,
      retryAfter ? { retryAfter } : undefined
    );
    this.name = "RateLimitError";
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends MCPError {
  constructor(operation: string, timeoutMs: number) {
    super(`Operation timed out: ${operation}`, "TIMEOUT", 504, {
      operation,
      timeoutMs,
    });
    this.name = "TimeoutError";
  }
}

/**
 * Cross-server communication errors
 */
export class CrossServerError extends MCPError {
  constructor(message: string, targetServer: string, details?: any) {
    super(message, "CROSS_SERVER_ERROR", 503, { targetServer, ...details });
    this.name = "CrossServerError";
  }
}

/**
 * Workflow execution errors
 */
export class WorkflowError extends MCPError {
  constructor(message: string, workflowId: string, details?: any) {
    super(message, "WORKFLOW_ERROR", 500, { workflowId, ...details });
    this.name = "WorkflowError";
  }
}

/**
 * Error handler utility
 */
export function handleError(error: unknown): MCPError {
  if (error instanceof MCPError) {
    return error;
  }

  if (error instanceof Error) {
    return new MCPError(error.message, "UNKNOWN_ERROR", 500, {
      originalError: error.name,
      stack: error.stack,
    });
  }

  return new MCPError(String(error), "UNKNOWN_ERROR", 500);
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: MCPError) {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };
}
