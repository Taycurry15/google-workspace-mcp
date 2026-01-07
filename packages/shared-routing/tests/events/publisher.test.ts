/**
 * CrossServerEventPublisher Tests
 *
 * Validates publishing flows, targeted delivery, and helper wrappers.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  CrossServerEventPublisher,
} from "../../src/events/publisher.js";
import { getServiceRegistry } from "../../src/cross-server/registry.js";
import { getDefaultEventBus } from "@gw-mcp/shared-workflows";

jest.mock("@gw-mcp/shared-workflows", () => ({
  getDefaultEventBus: jest.fn(),
}));

jest.mock("../../src/cross-server/registry.js", () => ({
  getServiceRegistry: jest.fn(),
}));

describe("CrossServerEventPublisher", () => {
  const serverId = "mcp-program";
  let publishMock: jest.MockedFunction<(event: any) => Promise<void>>;
  let registryMock: jest.Mocked<{ getServer: (id: string) => any }>;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    publishMock = jest.fn(async () => undefined);
    (getDefaultEventBus as jest.Mock).mockReturnValue({
      publish: publishMock,
    });

    registryMock = {
      getServer: jest.fn(),
    } as jest.Mocked<{ getServer: (id: string) => any }>;
    (getServiceRegistry as jest.Mock).mockReturnValue(registryMock);

    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
  });

  it("should publish cross-server events through the event bus", async () => {
    const publisher = new CrossServerEventPublisher(serverId);

    await publisher.publish({
      eventType: "program_updated",
      programId: "PROG-001",
      timestamp: new Date(),
      data: { field: "value" },
    });

    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "program_updated",
        source: serverId,
        data: expect.objectContaining({
          field: "value",
          _crossServer: true,
        }),
      })
    );
  });

  it("should deliver targeted events and track delivery status", async () => {
    registryMock.getServer.mockImplementation((id: string) => {
      if (id === "mcp-financial") {
        return {
          serverId: id,
          name: "Financial",
          baseUrl: "http://financial.test",
          version: "1.0",
          status: "healthy",
          capabilities: [],
        };
      }
      if (id === "mcp-compliance") {
        return {
          serverId: id,
          name: "Compliance",
          baseUrl: "http://compliance.test",
          version: "1.0",
          status: "unhealthy",
          capabilities: [],
        };
      }
      return undefined;
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
    } as Response);

    const publisher = new CrossServerEventPublisher(serverId);
    const status = await publisher.publishTo(["mcp-financial", "mcp-compliance"], {
      eventType: "deliverable_submitted",
      programId: "PROG-001",
      data: { id: "DEL-1" },
      timestamp: new Date(),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://financial.test/api/events/receive",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(status.delivered).toEqual(["mcp-financial"]);
    expect(status.failed).toEqual(["mcp-compliance"]);
  });

  it("should use helper methods for domain specific events", async () => {
    const publisher = new CrossServerEventPublisher(serverId);
    const publishSpy = jest.spyOn(publisher, "publish").mockResolvedValue();

    await publisher.publishProgramEvent("PROG-1", "program_created", { foo: "bar" });
    await publisher.publishDocumentEvent("DOC-1", "contract", "PROG-1", { bar: "baz" });
    await publisher.publishEntityCreated("milestone", "MS-1", "PROG-1", {});
    await publisher.publishEntityUpdated("milestone", "MS-1", "PROG-1", { status: "done" });
    await publisher.publishEntityDeleted("milestone", "MS-1", "PROG-1");

    expect(publishSpy).toHaveBeenCalledTimes(5);
    publishSpy.mockRestore();
  });
});
