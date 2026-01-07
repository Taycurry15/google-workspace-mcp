/**
 * Cross-server integration tests (Week 5 focus).
 *
 * Spins up lightweight Express servers that represent different MCP services,
 * registers them with the shared routing registry, and exercises:
 *  - Service registry health tracking
 *  - CrossServerClient HTTP communication
 *  - Cross-server event publishing/subscription (Memory event bus)
 */

import { describe, it, beforeAll, afterAll, expect } from "@jest/globals";
import express from "express";
import type { Server } from "http";
import type { AddressInfo } from "net";
import {
  ServiceRegistry,
  CrossServerClient,
  CrossServerEventPublisher,
  CrossServerEventSubscriber,
} from "@gw-mcp/shared-routing";
import {
  MemoryEventBus,
  setDefaultEventBus,
} from "@gw-mcp/shared-workflows";

type RunningServer = {
  serverId: string;
  server: Server;
  baseUrl: string;
};

async function startTestServer(
  serverId: string,
  configure?: (app: express.Express, state: { events: any[] }) => void
): Promise<RunningServer & { events: any[] }> {
  const app = express();
  app.use(express.json());

  const events: any[] = [];

  app.get("/health", (_req, res) => {
    res.json({
      status: "healthy",
      server: serverId,
      version: "test",
      timestamp: new Date().toISOString(),
    });
  });

  if (configure) {
    configure(app, { events });
  }

  const server: Server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return { serverId, server, baseUrl, events };
}

async function stopServers(servers: RunningServer[]) {
  await Promise.all(
    servers.map(
      (entry) =>
        new Promise<void>((resolve) => {
          entry.server.close(() => resolve());
        })
    )
  );
}

describe("Cross-Server Integration", () => {
  const registry = ServiceRegistry.getInstance();
  let runningServers: Array<RunningServer & { events: any[] }> = [];

  beforeAll(async () => {
    setDefaultEventBus(new MemoryEventBus());
    registry.clear();

    runningServers = [
      await startTestServer("mcp-program", (app) => {
        app.get("/api/programs/:programId", (req, res) => {
          res.json({
            success: true,
            data: {
              programId: req.params.programId,
              name: "Cross-Server Demo",
              owner: "integration@example.com",
            },
          });
        });
      }),
      await startTestServer("mcp-deliverables", (app, state) => {
        app.post("/api/events/receive", (req, res) => {
          state.events.push(req.body);
          res.json({ success: true });
        });
      }),
    ];

    for (const server of runningServers) {
      registry.register(
        {
          serverId: server.serverId,
          name: server.serverId,
          baseUrl: server.baseUrl,
          version: "integration",
          status: "healthy",
          capabilities: ["health", "api"],
        },
        5 * 60 * 1000
      );
    }
  });

  afterAll(async () => {
    await stopServers(runningServers);
    for (const server of runningServers) {
      registry.unregister(server.serverId);
    }
    registry.clear();
  });

  it("registers servers with the shared routing registry", () => {
    const servers = registry.listServers();

    expect(servers).toHaveLength(2);
    expect(servers.map((s) => s.serverId)).toEqual(
      expect.arrayContaining(["mcp-program", "mcp-deliverables"])
    );
    expect(servers.every((s) => s.status === "healthy")).toBe(true);
  });

  it("performs HTTP calls across servers via CrossServerClient", async () => {
    const client = new CrossServerClient("mcp-program");

    const response = await client.get<{ success: boolean; data: any }>(
      "/api/programs/PROG-INT-001"
    );

    expect(response.success).toBe(true);
    expect(response.data.data.programId).toBe("PROG-INT-001");
    expect(response.metadata?.serverId).toBe("mcp-program");
  });

  it("delivers targeted events via the cross-server event bus", async () => {
    const publisher = new CrossServerEventPublisher("mcp-program");
    const subscriber = new CrossServerEventSubscriber("mcp-deliverables");

    const eventPromise = new Promise((resolve) => {
      subscriber.subscribe(["deliverable_submitted"], async (event) => {
        resolve(event);
      });
    });

    const delivery = await publisher.publishTo(["mcp-deliverables"], {
      eventType: "deliverable_submitted",
      programId: "PROG-INT-001",
      timestamp: new Date(),
      data: {
        deliverableId: "DEL-500",
        status: "submitted",
      },
    });

    expect(delivery.delivered).toContain("mcp-deliverables");
    await expect(eventPromise).resolves.toMatchObject({
      eventType: "deliverable_submitted",
      programId: "PROG-INT-001",
      data: expect.objectContaining({
        deliverableId: "DEL-500",
      }),
    });
  });
});
