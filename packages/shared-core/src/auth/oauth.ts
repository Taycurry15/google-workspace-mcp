/**
 * OAuth2 Authentication for Google Workspace APIs
 * Handles OAuth2Client creation, token loading, and credential management
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import { DEFAULT_SCOPES } from "./scopes.js";

// Load environment variables
dotenv.config();

/**
 * OAuth2 Configuration
 */
export interface OAuth2Config {
  credentialsPath?: string;
  tokenPath?: string;
  scopes?: string[];
}

/**
 * Google OAuth2 Credentials structure
 */
interface GoogleCredentials {
  installed?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
  web?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

/**
 * Default paths for credentials and tokens
 */
const getDefaultPaths = () => {
  const cwd = process.cwd();
  return {
    credentials: process.env.CREDENTIALS_PATH || path.join(cwd, "credentials.json"),
    token: process.env.TOKEN_PATH || path.join(cwd, "token.json"),
  };
};

/**
 * Create and configure OAuth2Client
 *
 * @param config - OAuth2 configuration options
 * @returns Configured OAuth2Client
 * @throws Error if credentials file not found or invalid
 */
export async function createOAuth2Client(
  config: OAuth2Config = {}
): Promise<OAuth2Client> {
  const defaults = getDefaultPaths();
  const credentialsPath = config.credentialsPath || defaults.credentials;
  const tokenPath = config.tokenPath || defaults.token;
  const scopes = config.scopes || [...DEFAULT_SCOPES];

  // Read credentials file
  let credentials: GoogleCredentials;
  try {
    const credentialsContent = await fs.readFile(credentialsPath, "utf-8");
    credentials = JSON.parse(credentialsContent);
  } catch (error) {
    throw new Error(
      `Failed to read credentials file at ${credentialsPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // Extract OAuth2 parameters
  const oauthConfig = credentials.installed || credentials.web;
  if (!oauthConfig) {
    throw new Error("Invalid credentials file: missing 'installed' or 'web' configuration");
  }

  const { client_id, client_secret, redirect_uris } = oauthConfig;

  // Create OAuth2Client
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Load token if exists
  try {
    const tokenContent = await fs.readFile(tokenPath, "utf-8");
    const token = JSON.parse(tokenContent);
    oauth2Client.setCredentials(token);
  } catch (error) {
    throw new Error(
      `No token found at ${tokenPath}. Please run authentication setup first. ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return oauth2Client;
}

/**
 * Authorize and return OAuth2Client (singleton pattern)
 * Caches the client to avoid recreating on every call
 */
let cachedOAuth2Client: OAuth2Client | null = null;

export async function authorize(config: OAuth2Config = {}): Promise<OAuth2Client> {
  if (cachedOAuth2Client) {
    return cachedOAuth2Client;
  }

  cachedOAuth2Client = await createOAuth2Client(config);
  return cachedOAuth2Client;
}

/**
 * Clear cached OAuth2Client (useful for testing or re-authentication)
 */
export function clearAuthCache(): void {
  cachedOAuth2Client = null;
}

/**
 * Check if OAuth2Client is authorized (has valid token)
 *
 * @param client - OAuth2Client to check
 * @returns true if client has credentials set
 */
export function isAuthorized(client: OAuth2Client): boolean {
  const credentials = client.credentials;
  return !!(credentials && credentials.access_token);
}

/**
 * Get access token from OAuth2Client
 *
 * @param client - OAuth2Client
 * @returns Access token or null if not authorized
 */
export function getAccessToken(client: OAuth2Client): string | null {
  return client.credentials.access_token || null;
}

/**
 * Refresh access token if expired
 *
 * @param client - OAuth2Client
 * @returns Refreshed OAuth2Client
 */
export async function refreshTokenIfNeeded(client: OAuth2Client): Promise<OAuth2Client> {
  const credentials = client.credentials;

  // Check if token is expired or about to expire (within 5 minutes)
  if (credentials.expiry_date) {
    const expiryTime = credentials.expiry_date;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (now >= expiryTime - fiveMinutes) {
      console.error("Access token expired or expiring soon, refreshing...");
      await client.refreshAccessToken();
    }
  }

  return client;
}

/**
 * Save token to file
 *
 * @param client - OAuth2Client with credentials
 * @param tokenPath - Path to save token file
 */
export async function saveToken(client: OAuth2Client, tokenPath?: string): Promise<void> {
  const defaults = getDefaultPaths();
  const savePath = tokenPath || defaults.token;

  const credentials = client.credentials;
  await fs.writeFile(savePath, JSON.stringify(credentials, null, 2));
  console.error(`Token saved to ${savePath}`);
}

/**
 * Initialize authentication (alias for authorize)
 * Provides backward compatibility with existing code
 */
export const initializeAuth = authorize;
