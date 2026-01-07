/**
 * CrossServerClient Tests
 *
 * Verifies REST interactions, error handling, and timeout logic.
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { CrossServerClient } from "../../src/cross-server/api-client.js";
import type { ServerInfo } from "../../src/cross-server/types.js";
import type { ServiceRegistry } from "../../src/cross-server/registry.js";

const BASE_SERVER: ServerInfo = {
  serverId: "mcp-program",
  name: "Program Server",
  baseUrl: "http://program.test",
  version: "1.0.0",
  status: "healthy",
  capabilities: ["programs"],
};

function createRegistry(server?: ServerInfo): ServiceRegistry {
  return {
    getServer: jest.fn().mockReturnValue(server),
  } as unknown as ServiceRegistry;
}

function createJsonResponse(body: any, overrides?: Partial<Response>): Response {
  const headers = new Headers({
    "content-type": "application/json",
  });
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers,
    json: async () => body,
    text: async () => JSON.stringify(body),
    ...overrides,
  } as Response;
}

function createTextResponse(body: string, overrides?: Partial<Response>): Response {
  const headers = new Headers({
    "content-type": "text/plain",
  });
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers,
    json: async () => JSON.parse(body),
    text: async () => body,
    ...overrides,
  } as Response;
}

describe("CrossServerClient", () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
  });

  it("should perform GET request with headers and query params", async () => {
    const registry = createRegistry(BASE_SERVER);
    const client = new CrossServerClient("mcp-program", registry);

    const payload = { id: "PROG-001" };
    fetchMock.mockResolvedValueOnce(createJsonResponse(payload));

    const response = await client.get<typeof payload>("/api/programs/PROG-001", {
      query: { includeWbs: "true" },
      context: {
        requestId: "req-123",
        userId: "user@example.com",
        sourceServerId: "mcp-financial",
        programId: "PROG-001",
      },
    });

    expect(response.success).toBe(true);
    expect(response.data).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://program.test/api/programs/PROG-001?includeWbs=true",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Request-Id": "req-123",
          "X-Source-Server": "mcp-financial",
          "X-User-Id": "user@example.com",
          "X-Program-Id": "PROG-001",
        }),
      })
    );
  });

  it("should handle text responses", async () => {
    const registry = createRegistry(BASE_SERVER);
    const client = new CrossServerClient("mcp-program", registry);

    fetchMock.mockResolvedValueOnce(createTextResponse("OK"));

    const response = await client.delete("/api/status");

    expect(response.success).toBe(true);
    expect(response.data).toBe("OK");
  });

  it("should return error when server responds with failure", async () => {
    const registry = createRegistry(BASE_SERVER);
    const client = new CrossServerClient("mcp-program", registry);

    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        { message: "Bad request" },
        {
          ok: false,
          status: 400,
          statusText: "Bad Request",
        }
      )
    );

    const response = await client.post("/api/programs", { name: "Test" });

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe("HTTP_400");
    expect(response.error?.message).toBe("Bad Request");
  });

  it("should fail when server is not registered", async () => {
    const registry = createRegistry(undefined);
    const client = new CrossServerClient("missing-server", registry);

    const response = await client.get("/api/programs");

    expect(response.success).toBe(false);
    expect(response.error?.message).toContain("Server not found");
  });

  it("should fail when server is unhealthy", async () => {
    const registry = createRegistry({ ...BASE_SERVER, status: "unhealthy" });
    const client = new CrossServerClient("mcp-program", registry);

    const response = await client.get("/api/programs");

    expect(response.success).toBe(false);
    expect(response.error?.message).toContain("Server is unhealthy");
  });

  it("should translate AbortError into timeout code", async () => {
    const registry = createRegistry(BASE_SERVER);
    const client = new CrossServerClient("mcp-program", registry);
    client.setDefaultTimeout(5);

    const abortError = Object.assign(new Error("Aborted"), { name: "AbortError" });
    fetchMock.mockRejectedValueOnce(abortError);

    const response = await client.get("/api/programs");

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe("TIMEOUT");
  });
});
