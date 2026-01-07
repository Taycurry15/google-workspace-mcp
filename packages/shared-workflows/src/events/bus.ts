/**
 * Event Bus
 *
 * Abstraction layer for event-driven communication
 * Supports both in-memory (EventEmitter) and distributed (Redis) backends
 *
 * Phase 5 Implementation
 */

import { EventEmitter } from "events";
import type {
  EventPayload,
  EventCallback,
  SubscriptionOptions,
  EventBusConfig,
} from "./types.js";

/**
 * Event Bus Interface
 */
export interface IEventBus {
  publish(payload: EventPayload): Promise<void>;
  subscribe(
    eventType: string,
    callback: EventCallback,
    options?: SubscriptionOptions
  ): string;
  unsubscribe(subscriptionId: string): void;
  close(): Promise<void>;
}

/**
 * In-Memory Event Bus (using EventEmitter)
 * Suitable for single-server deployments
 */
export class MemoryEventBus implements IEventBus {
  private emitter: EventEmitter;
  private subscriptions: Map<
    string,
    { eventType: string; callback: EventCallback; options?: SubscriptionOptions }
  > = new Map();

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100); // Increase limit for many subscriptions
  }

  async publish(payload: EventPayload): Promise<void> {
    // Emit to all listeners for this event type
    this.emitter.emit(payload.eventType, payload);

    // Also emit to wildcard listeners
    this.emitter.emit("*", payload);
  }

  subscribe(
    eventType: string,
    callback: EventCallback,
    options?: SubscriptionOptions
  ): string {
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Create wrapped callback with filtering
    const wrappedCallback = async (payload: EventPayload) => {
      // Apply filter if provided
      if (options?.filter && !options.filter(payload)) {
        return;
      }

      try {
        await callback(payload);
      } catch (error) {
        console.error(
          `Error in event handler for ${eventType}:`,
          error
        );
        // Could implement retry logic here based on options.maxRetries
      }
    };

    // Store subscription metadata
    this.subscriptions.set(subscriptionId, {
      eventType,
      callback: wrappedCallback,
      options,
    });

    // Register with EventEmitter
    this.emitter.on(eventType, wrappedCallback);

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      this.emitter.off(subscription.eventType, subscription.callback);
      this.subscriptions.delete(subscriptionId);
    }
  }

  async close(): Promise<void> {
    // Remove all listeners
    this.emitter.removeAllListeners();
    this.subscriptions.clear();
  }
}

/**
 * Redis Event Bus (for multi-server deployments)
 * Future implementation - placeholder for now
 */
export class RedisEventBus implements IEventBus {
  private config: EventBusConfig;

  constructor(config: EventBusConfig) {
    this.config = config;
    // TODO: Initialize Redis client
    throw new Error(
      "RedisEventBus not yet implemented. Use MemoryEventBus for now."
    );
  }

  async publish(payload: EventPayload): Promise<void> {
    // TODO: Publish to Redis channel
    throw new Error("Not implemented");
  }

  subscribe(
    eventType: string,
    callback: EventCallback,
    options?: SubscriptionOptions
  ): string {
    // TODO: Subscribe to Redis channel
    throw new Error("Not implemented");
  }

  unsubscribe(subscriptionId: string): void {
    // TODO: Unsubscribe from Redis channel
    throw new Error("Not implemented");
  }

  async close(): Promise<void> {
    // TODO: Close Redis connection
  }
}

/**
 * Event Bus Factory
 * Creates appropriate event bus based on configuration
 */
export function createEventBus(config: EventBusConfig): IEventBus {
  switch (config.backend) {
    case "memory":
      return new MemoryEventBus();
    case "redis":
      return new RedisEventBus(config);
    default:
      throw new Error(`Unknown event bus backend: ${config.backend}`);
  }
}

/**
 * Default event bus instance (memory-based)
 */
let defaultBus: IEventBus | null = null;

export function getDefaultEventBus(): IEventBus {
  if (!defaultBus) {
    defaultBus = new MemoryEventBus();
  }
  return defaultBus;
}

export function setDefaultEventBus(bus: IEventBus): void {
  defaultBus = bus;
}
