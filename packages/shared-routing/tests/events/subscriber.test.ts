/**
 * CrossServerEventSubscriber Tests
 *
 * Ensures filtering logic and subscription bookkeeping behaves correctly.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  CrossServerEventSubscriber,
} from "../../src/events/subscriber.js";
import type { CrossServerEvent } from "../../src/events/types.js";
import { getDefaultEventBus } from "@gw-mcp/shared-core";

jest.mock("@gw-mcp/shared-core", () => ({
  getDefaultEventBus: jest.fn(),
}));

describe("CrossServerEventSubscriber", () => {
  const serverId = "mcp-deliverables";
  let subscribeMock: jest.MockedFunction<
    (eventType: string, handler: (event: any) => Promise<void>) => void
  >;
  let handlers: Record<string, (event: any) => Promise<void>> = {};

  beforeEach(() => {
    handlers = {};
    const subscribeImpl = (eventType: string, handler: (event: any) => Promise<void>) => {
      handlers[eventType] = handler;
    };
    subscribeMock = jest.fn(subscribeImpl) as jest.MockedFunction<
      (eventType: string, handler: (event: any) => Promise<void>) => void
    >;
    (getDefaultEventBus as jest.Mock).mockReturnValue({
      subscribe: subscribeMock,
    });
  });

  function emit(eventType: string, payload: any) {
    const handler = handlers[eventType] || handlers["*"];
    if (handler) {
      return handler(payload);
    }
    return Promise.resolve();
  }

  function createEvent(overrides: Record<string, any> = {}): any {
    return {
      eventType: "deliverable_submitted",
      source: "mcp-program",
      timestamp: new Date(),
      programId: "PROG-1",
      data: {
        _crossServer: true,
      },
      ...overrides,
    };
  }

  it("should register subscriptions and invoke handlers for matching events", async () => {
    const subscriber = new CrossServerEventSubscriber(serverId);
    const handler = jest.fn(async () => undefined) as jest.MockedFunction<
      (event: CrossServerEvent) => Promise<void>
    >;

    subscriber.subscribe(["deliverable_submitted"], handler);

    await emit("deliverable_submitted", createEvent());

    expect(handler).toHaveBeenCalledTimes(1);
    const eventArg = handler.mock.calls[0][0] as CrossServerEvent;
    expect(eventArg.eventType).toBe("deliverable_submitted");
    expect(subscriber.getSubscriptions()).toHaveLength(1);
  });

  it("should respect target server filters", async () => {
    const subscriber = new CrossServerEventSubscriber(serverId);
    const handler = jest.fn(async () => undefined) as jest.MockedFunction<
      (event: CrossServerEvent) => Promise<void>
    >;

    subscriber.subscribe(["deliverable_submitted"], handler);

    await emit(
      "deliverable_submitted",
      createEvent({
        data: {
          _crossServer: true,
          _targetServers: ["mcp-program"],
        },
      })
    );

    expect(handler).not.toHaveBeenCalled();
  });

  it("should filter events by program IDs", async () => {
    const subscriber = new CrossServerEventSubscriber(serverId);
    const handler = jest.fn(async () => undefined) as jest.MockedFunction<
      (event: CrossServerEvent) => Promise<void>
    >;

    subscriber.subscribe(["deliverable_submitted"], handler, {
      programIds: ["PROG-2"],
    });

    await emit("deliverable_submitted", createEvent());

    expect(handler).not.toHaveBeenCalled();

    await emit(
      "deliverable_submitted",
      createEvent({
        programId: "PROG-2",
      })
    );

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should handle subscribeAll and entity helpers", async () => {
    const subscriber = new CrossServerEventSubscriber(serverId);
    const handler = jest.fn(async () => undefined) as jest.MockedFunction<
      (event: CrossServerEvent) => Promise<void>
    >;

    const subId = subscriber.subscribeAll(handler);
    expect(subId).toContain(serverId);

    subscriber.subscribeToEntityEvents("milestone", handler);
    subscriber.subscribeToProgramEvents("PROG-3", ["milestone_created"], handler);

    expect(subscriber.getSubscriptions().length).toBe(3);
  });

  it("should unsubscribe and clear subscriptions", () => {
    const subscriber = new CrossServerEventSubscriber(serverId);
    const handler = jest.fn(async () => undefined) as jest.MockedFunction<
      (event: CrossServerEvent) => Promise<void>
    >;

    const subId = subscriber.subscribe(["deliverable_submitted"], handler);
    expect(subscriber.getSubscriptions()).toHaveLength(1);

    subscriber.unsubscribe(subId);
    expect(subscriber.getSubscriptions()).toHaveLength(0);

    subscriber.subscribe(["deliverable_submitted"], handler);
    subscriber.subscribe(["milestone_created"], handler);
    subscriber.clearAll();
    expect(subscriber.getSubscriptions()).toHaveLength(0);
  });

  it("should ignore non cross-server events", async () => {
    const subscriber = new CrossServerEventSubscriber(serverId);
    const handler = jest.fn(async () => undefined) as jest.MockedFunction<
      (event: CrossServerEvent) => Promise<void>
    >;
    subscriber.subscribe(["deliverable_submitted"], handler);

    await emit(
      "deliverable_submitted",
      createEvent({
        data: {},
      })
    );

    expect(handler).not.toHaveBeenCalled();
  });
});
