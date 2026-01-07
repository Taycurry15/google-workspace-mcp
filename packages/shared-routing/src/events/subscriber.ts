/**
 * Cross-Server Event Subscriber
 *
 * Subscribes to events from other servers
 */

import { getDefaultEventBus } from "@gw-mcp/shared-core";
import type { CrossServerEvent, EventSubscription } from "./types.js";

/**
 * Cross-server event subscriber
 *
 * Subscribes to events from other servers via event bus
 */
export class CrossServerEventSubscriber {
  private eventBus = getDefaultEventBus();
  private serverId: string;
  private subscriptions: Map<string, EventSubscription> = new Map();

  constructor(serverId: string) {
    this.serverId = serverId;
  }

  /**
   * Subscribe to specific event types
   */
  subscribe(
    eventTypes: string[],
    handler: (event: CrossServerEvent) => Promise<void>,
    options?: {
      programIds?: string[]; // Filter by program IDs
    }
  ): string {
    const subscriptionId = `${this.serverId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const subscription: EventSubscription = {
      subscriptionId,
      serverId: this.serverId,
      eventTypes,
      programIds: options?.programIds,
      handler,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Register with event bus for each event type
    for (const eventType of eventTypes) {
      this.eventBus.subscribe(eventType, async (event) => {
        await this.handleEvent(event, subscription);
      });
    }

    console.log(
      `[CrossServerEvent] Subscribed to ${eventTypes.join(", ")} (${subscriptionId})`
    );

    return subscriptionId;
  }

  /**
   * Subscribe to all events
   */
  subscribeAll(
    handler: (event: CrossServerEvent) => Promise<void>,
    options?: {
      programIds?: string[];
    }
  ): string {
    return this.subscribe(["*"], handler, options);
  }

  /**
   * Subscribe to program-specific events
   */
  subscribeToProgramEvents(
    programId: string,
    eventTypes: string[],
    handler: (event: CrossServerEvent) => Promise<void>
  ): string {
    return this.subscribe(eventTypes, handler, { programIds: [programId] });
  }

  /**
   * Subscribe to entity lifecycle events
   */
  subscribeToEntityEvents(
    entityType: string,
    handler: (event: CrossServerEvent) => Promise<void>,
    options?: {
      programIds?: string[];
    }
  ): string {
    const eventTypes = [
      `${entityType}_created`,
      `${entityType}_updated`,
      `${entityType}_deleted`,
    ];

    return this.subscribe(eventTypes, handler, options);
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);

    if (subscription) {
      // Unregister from event bus
      for (const eventType of subscription.eventTypes) {
        // Note: EventBus doesn't have direct unsubscribe per handler
        // In production, you'd need to track handlers and remove them
      }

      this.subscriptions.delete(subscriptionId);
      console.log(`[CrossServerEvent] Unsubscribed ${subscriptionId}`);
    }
  }

  /**
   * Handle incoming event
   */
  private async handleEvent(
    event: any,
    subscription: EventSubscription
  ): Promise<void> {
    // Check if event is cross-server
    if (!event.data?._crossServer) {
      return; // Not a cross-server event
    }

    // Check if event is targeted to specific servers
    const targetServers = event.data._targetServers as string[] | undefined;
    if (targetServers && !targetServers.includes(this.serverId)) {
      return; // Not targeted to this server
    }

    // Check if event type matches subscription
    if (
      subscription.eventTypes[0] !== "*" &&
      !subscription.eventTypes.includes(event.eventType)
    ) {
      return;
    }

    // Check if program ID matches filter
    if (subscription.programIds && event.programId) {
      if (!subscription.programIds.includes(event.programId)) {
        return; // Program ID doesn't match filter
      }
    }

    // Convert to CrossServerEvent format
    const crossServerEvent: CrossServerEvent = {
      eventType: event.eventType,
      sourceServer: event.source,
      targetServers,
      timestamp: event.timestamp,
      programId: event.programId,
      userId: event.userId,
      data: event.data,
      metadata: event.metadata,
    };

    // Call handler
    try {
      await subscription.handler(crossServerEvent);
    } catch (error) {
      console.error(
        `[CrossServerEvent] Handler error for ${event.eventType}:`,
        error
      );
    }
  }

  /**
   * Get all active subscriptions
   */
  getSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Clear all subscriptions
   */
  clearAll(): void {
    for (const subscriptionId of this.subscriptions.keys()) {
      this.unsubscribe(subscriptionId);
    }
  }
}

/**
 * Create a cross-server event subscriber
 */
export function createCrossServerEventSubscriber(
  serverId: string
): CrossServerEventSubscriber {
  return new CrossServerEventSubscriber(serverId);
}
