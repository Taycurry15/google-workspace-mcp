/**
 * Deliverable workflow integration test.
 *
 * Simulates a deliverable submission event that is published by the Deliverables
 * server, picked up by the Program server via the shared workflow event bus,
 * and results in a cross-server HTTP call to fetch deliverable details.
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

type TestServer = {
  serverId: string;
  server: Server;
  baseUrl: string;
};

async function launchServer(
  serverId: string,
  configure: (app: express.Express) => void
): Promise<TestServer> {
  const app = express();
  app.use(express.json());
  configure(app);

  const server: Server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const address = server.address() as AddressInfo;
  return {
    serverId,
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

describe("Deliverable workflow integration", () => {
  const registry = ServiceRegistry.getInstance();
  let deliverablesServer: TestServer;
  let programServer: TestServer;

  beforeAll(async () => {
    setDefaultEventBus(new MemoryEventBus());
    registry.clear();

    deliverablesServer = await launchServer("mcp-deliverables", (app) => {
      app.get("/health", (_req, res) => {
        res.json({ status: "healthy", server: "mcp-deliverables" });
      });

      app.get("/api/deliverables/:deliverableId", (req, res) => {
        res.json({
          success: true,
          data: {
            deliverableId: req.params.deliverableId,
            status: "submitted",
            owner: "owner@example.com",
          },
        });
      });

      app.post("/api/events/receive", (_req, res) => res.json({ success: true }));
    });

    programServer = await launchServer("mcp-program", (app) => {
      app.get("/health", (_req, res) => {
        res.json({ status: "healthy", server: "mcp-program" });
      });

      app.post("/api/events/receive", (_req, res) => res.json({ success: true }));
    });

    registry.register(
      {
        serverId: "mcp-deliverables",
        name: "Deliverables",
        baseUrl: deliverablesServer.baseUrl,
        version: "integration",
        status: "healthy",
        capabilities: ["deliverables"],
      },
      5 * 60 * 1000
    );
    registry.register(
      {
        serverId: "mcp-program",
        name: "Program",
        baseUrl: programServer.baseUrl,
        version: "integration",
        status: "healthy",
        capabilities: ["programs"],
      },
      5 * 60 * 1000
    );
  });

  afterAll(async () => {
    await Promise.all([
      new Promise<void>((resolve) => deliverablesServer.server.close(() => resolve())),
      new Promise<void>((resolve) => programServer.server.close(() => resolve())),
    ]);
    registry.clear();
  });

  it("reacts to deliverable events with cross-server lookups", async () => {
    const subscriber = new CrossServerEventSubscriber("mcp-program");
    const publisher = new CrossServerEventPublisher("mcp-deliverables");

    const workflowPromise = new Promise((resolve) => {
      subscriber.subscribe(["deliverable_submitted"], async (event) => {
        const client = new CrossServerClient("mcp-deliverables");
        const response = await client.get<{ success: boolean; data: any }>(
          `/api/deliverables/${event.data.deliverableId}`
        );
        resolve(response.data.data);
      });
    });

    await publisher.publishTo(["mcp-program"], {
      eventType: "deliverable_submitted",
      programId: "PROG-INT-001",
      timestamp: new Date(),
      data: {
        deliverableId: "DEL-999",
      },
    });

    await expect(workflowPromise).resolves.toMatchObject({
      deliverableId: "DEL-999",
      status: "submitted",
      owner: "owner@example.com",
    });
  });
});
