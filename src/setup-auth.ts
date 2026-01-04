#!/usr/bin/env node

/**
 * Google OAuth Setup Script
 * Run this once to authenticate with Google Workspace
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/tasks",
];

const TOKEN_PATH = path.join(__dirname, "..", "token.json");
const CREDENTIALS_PATH = path.join(__dirname, "..", "credentials.json");

async function authorize() {
  let credentials;
  
  try {
    credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, "utf-8"));
  } catch (error) {
    console.error("credentials.json not found!");
    console.error("\nTo set up Google Workspace MCP:");
    console.error("1. Go to https://console.cloud.google.com/");
    console.error("2. Create a new project or select existing");
    console.error("3. Enable APIs: Gmail, Drive, Sheets, Docs, Calendar, Tasks");
    console.error("4. Create OAuth 2.0 credentials (Desktop app)");
    console.error("5. Download credentials and save as credentials.json");
    process.exit(1);
  }

  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  try {
    const token = JSON.parse(await fs.readFile(TOKEN_PATH, "utf-8"));
    oauth2Client.setCredentials(token);
    console.log("✓ Already authenticated!");
    return oauth2Client;
  } catch (error) {
    return getNewToken(oauth2Client);
  }
}

async function getNewToken(oauth2Client: OAuth2Client) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("\n🔐 Authorize this app by visiting this URL:");
  console.log("\n" + authUrl + "\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise<string>((resolve) => {
    rl.question("Enter the authorization code: ", (code) => {
      rl.close();
      resolve(code);
    });
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log("\n✓ Token saved to", TOKEN_PATH);
  console.log("✓ Authentication complete!\n");

  return oauth2Client;
}

authorize()
  .then(() => {
    console.log("✓ Setup complete! You can now use the MCP server.");
    process.exit(0);
  })
  .catch(console.error);
