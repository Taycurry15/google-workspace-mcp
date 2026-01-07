/**
 * Authentication Helper for Program Server
 *
 * Temporary auth initialization until @gw-mcp/shared-core is fully implemented
 */

import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import fs from "fs/promises";
import path from "path";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar",
];

const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH || path.join(process.cwd(), "../../credentials.json");
const TOKEN_PATH = process.env.TOKEN_PATH || path.join(process.cwd(), "../../token.json");

/**
 * Initialize OAuth2 client
 */
export async function initializeAuth(): Promise<OAuth2Client> {
  try {
    // Load client secrets
    const content = await fs.readFile(CREDENTIALS_PATH, "utf-8");
    const credentials = JSON.parse(content);

    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Load saved token if exists
    try {
      const token = await fs.readFile(TOKEN_PATH, "utf-8");
      oAuth2Client.setCredentials(JSON.parse(token));
    } catch (error) {
      throw new Error("Token file not found. Please run authentication setup first.");
    }

    return oAuth2Client;
  } catch (error: any) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}
