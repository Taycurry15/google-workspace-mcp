#!/usr/bin/env node

/**
 * Google Drive Folder Structure Automation
 * Creates standardized folder structures for business operations
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables with fallback to defaults
const TOKEN_PATH = process.env.TOKEN_PATH || path.join(__dirname, "..", "token.json");
const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH || path.join(__dirname, "..", "credentials.json");

// Folder structures for different business needs
const FOLDER_STRUCTURES = {
  // Government contracting project structure
  govcon: {
    name: "GovCon Operations",
    folders: [
      { name: "01-Opportunities", folders: [] },
      { name: "02-Proposals", folders: [
        { name: "Active", folders: [] },
        { name: "Submitted", folders: [] },
        { name: "Won", folders: [] },
        { name: "Lost", folders: [] },
      ]},
      { name: "03-Contracts", folders: [
        { name: "Active-Contracts", folders: [] },
        { name: "SOWs-PWS", folders: [] },
        { name: "Modifications", folders: [] },
      ]},
      { name: "04-Compliance", folders: [
        { name: "CMMC", folders: [] },
        { name: "FAR-DFARS", folders: [] },
        { name: "Certifications", folders: [] },
      ]},
      { name: "05-Finance", folders: [
        { name: "Invoices", folders: [] },
        { name: "Budgets", folders: [] },
        { name: "Reports", folders: [] },
      ]},
      { name: "06-Business-Development", folders: [
        { name: "Partners", folders: [] },
        { name: "Teaming", folders: [] },
        { name: "Marketing", folders: [] },
      ]},
    ],
  },

  // International deal structure (like DRC)
  international: {
    name: "International Deals",
    folders: [
      { name: "01-Deal-Pipeline", folders: [] },
      { name: "02-Active-Deals", folders: [
        { name: "Technical-Proposals", folders: [] },
        { name: "Financial-Models", folders: [] },
        { name: "Legal-Agreements", folders: [] },
        { name: "Due-Diligence", folders: [] },
      ]},
      { name: "03-Partners", folders: [
        { name: "OEMs", folders: [] },
        { name: "Local-Partners", folders: [] },
        { name: "Consultants", folders: [] },
      ]},
      { name: "04-Compliance", folders: [
        { name: "FCPA", folders: [] },
        { name: "Export-Control", folders: [] },
        { name: "Local-Laws", folders: [] },
      ]},
      { name: "05-Communications", folders: [
        { name: "Ministerial", folders: [] },
        { name: "Facilitators", folders: [] },
        { name: "Internal", folders: [] },
      ]},
    ],
  },

  // Cybersecurity consulting structure
  cybersec: {
    name: "Cybersecurity Practice",
    folders: [
      { name: "01-Clients", folders: [
        { name: "Active", folders: [] },
        { name: "Prospective", folders: [] },
        { name: "Past", folders: [] },
      ]},
      { name: "02-Assessments", folders: [
        { name: "CMMC", folders: [] },
        { name: "RMF", folders: [] },
        { name: "Penetration-Testing", folders: [] },
      ]},
      { name: "03-Documentation", folders: [
        { name: "Templates", folders: [] },
        { name: "Policies", folders: [] },
        { name: "Procedures", folders: [] },
      ]},
      { name: "04-Tools", folders: [
        { name: "Scripts", folders: [] },
        { name: "Automation", folders: [] },
        { name: "Dashboards", folders: [] },
      ]},
      { name: "05-Research", folders: [
        { name: "Threat-Intel", folders: [] },
        { name: "Frameworks", folders: [] },
        { name: "Industry-News", folders: [] },
      ]},
    ],
  },

  // General business operations
  business: {
    name: "Business Operations",
    folders: [
      { name: "01-Strategy", folders: [
        { name: "Business-Plans", folders: [] },
        { name: "Market-Research", folders: [] },
        { name: "Competitive-Analysis", folders: [] },
      ]},
      { name: "02-Operations", folders: [
        { name: "SOPs", folders: [] },
        { name: "Process-Docs", folders: [] },
        { name: "Systems", folders: [] },
      ]},
      { name: "03-HR", folders: [
        { name: "Hiring", folders: [] },
        { name: "Onboarding", folders: [] },
        { name: "Performance", folders: [] },
      ]},
      { name: "04-Finance", folders: [
        { name: "Accounting", folders: [] },
        { name: "Payroll", folders: [] },
        { name: "Taxes", folders: [] },
      ]},
      { name: "05-Legal", folders: [
        { name: "Contracts", folders: [] },
        { name: "IP", folders: [] },
        { name: "Corporate", folders: [] },
      ]},
      { name: "06-Marketing", folders: [
        { name: "Content", folders: [] },
        { name: "Campaigns", folders: [] },
        { name: "Brand", folders: [] },
      ]},
    ],
  },
};

async function authorize(): Promise<OAuth2Client> {
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, "utf-8"));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const token = JSON.parse(await fs.readFile(TOKEN_PATH, "utf-8"));
  oauth2Client.setCredentials(token);
  return oauth2Client;
}

async function createFolder(
  drive: any,
  name: string,
  parentId?: string
): Promise<string> {
  const fileMetadata: any = {
    name: name,
    mimeType: "application/vnd.google-apps.folder",
  };

  if (parentId) {
    fileMetadata.parents = [parentId];
  }

  const result = await drive.files.create({
    requestBody: fileMetadata,
    fields: "id, name, webViewLink",
  });

  console.log(`  ✓ Created: ${name} (${result.data.id})`);
  return result.data.id!;
}

async function createFolderStructure(
  drive: any,
  structure: any,
  parentId?: string
): Promise<void> {
  for (const folder of structure) {
    const folderId = await createFolder(drive, folder.name, parentId);
    
    if (folder.folders && folder.folders.length > 0) {
      await createFolderStructure(drive, folder.folders, folderId);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("\n📁 Google Drive Folder Structure Automation");
    console.log("\nAvailable structures:");
    console.log("  govcon       - Government contracting operations");
    console.log("  international - International deal management");
    console.log("  cybersec     - Cybersecurity consulting practice");
    console.log("  business     - General business operations");
    console.log("  all          - Create all structures");
    console.log("\nUsage: npm run create-folders <structure>");
    console.log("Example: npm run create-folders govcon");
    process.exit(0);
  }

  const structureType = args[0];
  
  const auth = await authorize();
  const drive = google.drive({ version: "v3", auth });

  console.log("\n🚀 Creating folder structure...\n");

  if (structureType === "all") {
    for (const [key, structure] of Object.entries(FOLDER_STRUCTURES)) {
      console.log(`\n📂 Creating ${structure.name}...`);
      const rootId = await createFolder(drive, structure.name);
      await createFolderStructure(drive, structure.folders, rootId);
    }
  } else {
    const structure = FOLDER_STRUCTURES[structureType as keyof typeof FOLDER_STRUCTURES];
    
    if (!structure) {
      console.error(`\n❌ Unknown structure: ${structureType}`);
      console.log("Available: govcon, international, cybersec, business, all");
      process.exit(1);
    }

    console.log(`📂 Creating ${structure.name}...`);
    const rootId = await createFolder(drive, structure.name);
    await createFolderStructure(drive, structure.folders, rootId);
  }

  console.log("\n✅ Folder structure created successfully!\n");
}

main().catch(console.error);
