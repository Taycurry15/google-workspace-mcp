/**
 * Cross-Server Event Types
 *
 * Event types for cross-server communication
 */

/**
 * Cross-server event payload
 */
export interface CrossServerEvent {
  eventType: string;
  sourceServer: string;
  targetServers?: string[]; // Specific servers to notify, or undefined for all
  timestamp: Date;
  programId?: string;
  userId?: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Event subscription filter
 */
export interface EventSubscription {
  subscriptionId: string;
  serverId: string;
  eventTypes: string[]; // Event types to subscribe to, or ["*"] for all
  programIds?: string[]; // Specific programs, or undefined for all
  handler: (event: CrossServerEvent) => Promise<void>;
}

/**
 * Event delivery status
 */
export interface EventDeliveryStatus {
  eventId: string;
  delivered: string[]; // Server IDs that received the event
  failed: string[]; // Server IDs that failed to receive
  timestamp: Date;
}
