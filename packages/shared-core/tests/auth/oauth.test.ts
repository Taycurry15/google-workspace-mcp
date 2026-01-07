/**
 * OAuth Authentication Utilities - Unit Tests
 *
 * Covers initialization, caching, token helpers, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import fs from "fs/promises";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import {
  createOAuth2Client,
  authorize,
  clearAuthCache,
  isAuthorized,
  getAccessToken,
  refreshTokenIfNeeded,
  saveToken,
} from "../../src/auth/oauth.js";

jest.mock("fs/promises", () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn(),
    },
  },
}));

type ReadFileFn = (path: string, encoding?: string) => Promise<string>;
type WriteFileFn = (path: string, data: string) => Promise<void>;
type OAuthCtor = (clientId: string, clientSecret: string, redirectUri: string) => OAuth2Client;

const readFileMock = fs.readFile as unknown as jest.MockedFunction<ReadFileFn>;
const writeFileMock = fs.writeFile as unknown as jest.MockedFunction<WriteFileFn>;
const oauthCtorMock = google.auth.OAuth2 as unknown as jest.MockedFunction<OAuthCtor>;

interface MockOAuthInstance {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  credentials: Record<string, any>;
  setCredentials: jest.MockedFunction<(creds: Record<string, any>) => void>;
  refreshAccessToken: jest.MockedFunction<() => Promise<OAuth2Client>>;
}

let oauthInstances: MockOAuthInstance[] = [];

beforeEach(() => {
  oauthInstances = [];
  oauthCtorMock.mockImplementation((clientId: string, clientSecret: string, redirectUri: string) => {
    const instance: MockOAuthInstance = {
      clientId,
      clientSecret,
      redirectUri,
      credentials: {},
      setCredentials: jest.fn((creds: Record<string, any>) => {
        instance.credentials = { ...creds };
      }) as jest.MockedFunction<(creds: Record<string, any>) => void>,
      refreshAccessToken: jest.fn(async () => {
        instance.credentials = {
          ...instance.credentials,
          access_token: "refreshed-token",
          expiry_date: Date.now() + 60 * 60 * 1000,
        };
        return instance as unknown as OAuth2Client;
      }) as jest.MockedFunction<() => Promise<OAuth2Client>>,
    };
    oauthInstances.push(instance);
    return instance as unknown as OAuth2Client;
  });
  readFileMock.mockReset();
  writeFileMock.mockReset();
  clearAuthCache();
});

const mockCredentials = {
  installed: {
    client_id: "client-id",
    client_secret: "client-secret",
    redirect_uris: ["http://localhost"],
  },
};

const mockToken = { access_token: "token-123", expiry_date: Date.now() + 3600_000 };

describe("createOAuth2Client", () => {
  it("should create OAuth client and load credentials/token", async () => {
    readFileMock
      .mockResolvedValueOnce(JSON.stringify(mockCredentials))
      .mockResolvedValueOnce(JSON.stringify(mockToken));

    const client = await createOAuth2Client({
      credentialsPath: "/tmp/creds.json",
      tokenPath: "/tmp/token.json",
      scopes: ["scope1"],
    });

    expect(client).toBeTruthy();
    expect(oauthCtorMock).toHaveBeenCalledWith("client-id", "client-secret", "http://localhost");
    expect(oauthInstances[0].setCredentials).toHaveBeenCalledWith(mockToken);
  });

  it("should throw descriptive error when credentials file missing", async () => {
    readFileMock.mockRejectedValueOnce(new Error("Not found"));

    await expect(
      createOAuth2Client({ credentialsPath: "/bad/creds.json", tokenPath: "/tmp/token.json" })
    ).rejects.toThrow("Failed to read credentials file at /bad/creds.json");
  });

  it("should throw descriptive error when token file missing", async () => {
    readFileMock
      .mockResolvedValueOnce(JSON.stringify(mockCredentials))
      .mockRejectedValueOnce(new Error("missing token"));

    await expect(
      createOAuth2Client({ credentialsPath: "/tmp/creds.json", tokenPath: "/tmp/token.json" })
    ).rejects.toThrow("No token found at /tmp/token.json");
  });
});

describe("authorize", () => {
  it("should cache OAuth clients between calls", async () => {
    readFileMock
      .mockResolvedValueOnce(JSON.stringify(mockCredentials))
      .mockResolvedValueOnce(JSON.stringify(mockToken));

    const first = await authorize({
      credentialsPath: "/tmp/creds.json",
      tokenPath: "/tmp/token.json",
    });
    const second = await authorize({
      credentialsPath: "/tmp/creds.json",
      tokenPath: "/tmp/token.json",
    });

    expect(first).toBe(second);
    expect(readFileMock).toHaveBeenCalledTimes(2);
  });
});

describe("token helpers", () => {
  it("should detect when client is authorized", () => {
    const clientWithToken = { credentials: { access_token: "abc" } } as OAuth2Client;
    const clientWithout = { credentials: {} } as OAuth2Client;

    expect(isAuthorized(clientWithToken)).toBe(true);
    expect(isAuthorized(clientWithout)).toBe(false);
  });

  it("should return access token or null", () => {
    const clientWithToken = { credentials: { access_token: "abc" } } as OAuth2Client;
    const clientWithout = { credentials: {} } as OAuth2Client;

    expect(getAccessToken(clientWithToken)).toBe("abc");
    expect(getAccessToken(clientWithout)).toBeNull();
  });

  it("should refresh token when expiring soon", async () => {
    const client = {
      credentials: {
        access_token: "old-token",
        expiry_date: Date.now() + 1_000, // 1 second
      },
      refreshAccessToken: jest.fn(async () => {
        client.credentials = {
          access_token: "new-token",
          expiry_date: Date.now() + 3_600_000,
        };
        return client;
      }),
    } as unknown as OAuth2Client;

    const refreshed = await refreshTokenIfNeeded(client);

    expect(client.refreshAccessToken).toHaveBeenCalled();
    expect(refreshed.credentials.access_token).toBe("new-token");
  });

  it("should not refresh token when expiry far away", async () => {
    const client = {
      credentials: {
        access_token: "fresh-token",
        expiry_date: Date.now() + 24 * 60 * 60 * 1000, // 1 day
      },
      refreshAccessToken: jest.fn(),
    } as unknown as OAuth2Client;

    await refreshTokenIfNeeded(client);

    expect(client.refreshAccessToken).not.toHaveBeenCalled();
  });
});

describe("saveToken", () => {
  it("should write credentials to provided path", async () => {
    const client = {
      credentials: { access_token: "abc", refresh_token: "def" },
    } as OAuth2Client;

    writeFileMock.mockResolvedValueOnce(undefined);

    await saveToken(client, "/tmp/token.json");

    expect(writeFileMock).toHaveBeenCalledWith(
      "/tmp/token.json",
      JSON.stringify(client.credentials, null, 2)
    );
  });
});
