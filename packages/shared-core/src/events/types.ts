/**
 * Event Bus Types
 *
 * Type definitions for cross-server event communication
 */

/**
 * Event payload structure
 */
export interface EventPayload {
  eventType: string;
  source: string;
  timestamp: Date;
  data: any;
  userId?: string;
  programId?: string;
  metadata?: Record<string, any>;
}

/**
 * Event subscription callback
 */
export type EventCallback = (payload: EventPayload) => void | Promise<void>;

/**
 * Event subscription options
 */
export interface SubscriptionOptions {
  filter?: (payload: EventPayload) => boolean;
  priority?: number;
  maxRetries?: number;
}

/**
 * Event bus backend types
 */
export type EventBusBackend = "memory" | "redis";

/**
 * Event bus configuration
 */
export interface EventBusConfig {
  backend: EventBusBackend;
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
}
