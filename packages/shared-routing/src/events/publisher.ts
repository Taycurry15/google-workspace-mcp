/**
 * Cross-Server Event Publisher
 *
 * Publishes events to other servers via event bus
 */

import { getDefaultEventBus } from "@gw-mcp/shared-workflows";
import type { CrossServerEvent, EventDeliveryStatus } from "./types.js";
import { getServiceRegistry } from "../cross-server/registry.js";

/**
 * Cross-server event publisher
 *
 * Publishes events to be consumed by other servers
 */
export class CrossServerEventPublisher {
  private eventBus = getDefaultEventBus();
  private serverId: string;

  constructor(serverId: string) {
    this.serverId = serverId;
  }

  /**
   * Publish event to all subscribers
   */
  async publish(event: Omit<CrossServerEvent, "sourceServer">): Promise<void> {
    const fullEvent: CrossServerEvent = {
      ...event,
      sourceServer: this.serverId,
      timestamp: event.timestamp || new Date(),
    };

    // Publish to event bus
    await this.eventBus.publish({
      eventType: fullEvent.eventType,
      source: fullEvent.sourceServer,
      timestamp: fullEvent.timestamp,
      programId: fullEvent.programId,
      userId: fullEvent.userId,
      data: {
        ...fullEvent.data,
        _crossServer: true,
        _targetServers: fullEvent.targetServers,
      },
      metadata: fullEvent.metadata,
    });

    console.log(
      `[CrossServerEvent] Published ${fullEvent.eventType} from ${this.serverId}`
    );
  }

  /**
   * Publish event to specific servers
   */
  async publishTo(
    targetServers: string[],
    event: Omit<CrossServerEvent, "sourceServer" | "targetServers">
  ): Promise<EventDeliveryStatus> {
    const fullEvent: CrossServerEvent = {
      ...event,
      sourceServer: this.serverId,
      targetServers,
      timestamp: event.timestamp || new Date(),
    };

    const eventId = `${this.serverId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const delivered: string[] = [];
    const failed: string[] = [];

    // Publish to event bus
    await this.publish(fullEvent);

    // Also send direct HTTP notifications to target servers
    const registry = getServiceRegistry();

    for (const targetServerId of targetServers) {
      const server = registry.getServer(targetServerId);

      if (!server || server.status === "unhealthy") {
        failed.push(targetServerId);
        continue;
      }

      try {
        const url = `${server.baseUrl}/api/events/receive`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Source-Server": this.serverId,
          },
          body: JSON.stringify(fullEvent),
        });

        if (response.ok) {
          delivered.push(targetServerId);
        } else {
          failed.push(targetServerId);
          console.warn(
            `[CrossServerEvent] Failed to deliver to ${targetServerId}: ${response.statusText}`
          );
        }
      } catch (error) {
        failed.push(targetServerId);
        console.error(`[CrossServerEvent] Error delivering to ${targetServerId}:`, error);
      }
    }

    return {
      eventId,
      delivered,
      failed,
      timestamp: new Date(),
    };
  }

  /**
   * Publish program-specific event
   */
  async publishProgramEvent(
    programId: string,
    eventType: string,
    data: Record<string, any>
  ): Promise<void> {
    await this.publish({
      eventType,
      programId,
      timestamp: new Date(),
      data,
    });
  }

  /**
   * Publish document event
   */
  async publishDocumentEvent(
    documentId: string,
    documentType: string,
    programId: string,
    data: Record<string, any>
  ): Promise<void> {
    await this.publish({
      eventType: "document_processed",
      programId,
      timestamp: new Date(),
      data: {
        documentId,
        documentType,
        ...data,
      },
    });
  }

  /**
   * Publish entity created event
   */
  async publishEntityCreated(
    entityType: string,
    entityId: string,
    programId: string,
    data: Record<string, any>
  ): Promise<void> {
    await this.publish({
      eventType: `${entityType}_created`,
      programId,
      timestamp: new Date(),
      data: {
        entityId,
        entityType,
        ...data,
      },
    });
  }

  /**
   * Publish entity updated event
   */
  async publishEntityUpdated(
    entityType: string,
    entityId: string,
    programId: string,
    changes: Record<string, any>
  ): Promise<void> {
    await this.publish({
      eventType: `${entityType}_updated`,
      programId,
      timestamp: new Date(),
      data: {
        entityId,
        entityType,
        changes,
      },
    });
  }

  /**
   * Publish entity deleted event
   */
  async publishEntityDeleted(
    entityType: string,
    entityId: string,
    programId: string
  ): Promise<void> {
    await this.publish({
      eventType: `${entityType}_deleted`,
      programId,
      timestamp: new Date(),
      data: {
        entityId,
        entityType,
      },
    });
  }
}

/**
 * Create a cross-server event publisher
 */
export function createCrossServerEventPublisher(
  serverId: string
): CrossServerEventPublisher {
  return new CrossServerEventPublisher(serverId);
}
