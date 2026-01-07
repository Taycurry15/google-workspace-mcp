#!/usr/bin/env node

/**
 * PMI Program Folder Structure Automation
 * Creates PMBOK-aligned folder hierarchy for program management
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN_PATH = path.join(__dirname, "..", "token.json");
const CREDENTIALS_PATH = path.join(__dirname, "..", "credentials.json");

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

  console.log(`  ✓ Created: ${name}`);
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

// PMI-aligned program structure
const PMI_PROGRAM_STRUCTURE = {
  name: "Program - PMI Framework",
  folders: [
    {
      name: "01-INITIATING",
      folders: [
        { name: "Charter", folders: [] },
        { name: "Business-Case", folders: [] },
        { name: "Stakeholder-Analysis", folders: [] },
        { name: "Preliminary-Scope", folders: [] },
        { name: "Governance-Framework", folders: [] },
      ],
    },
    {
      name: "02-PLANNING",
      folders: [
        {
          name: "Program-Management-Plans",
          folders: [
            { name: "Integration-Plan", folders: [] },
            { name: "Scope-Plan", folders: [] },
            { name: "Schedule-Plan", folders: [] },
            { name: "Cost-Plan", folders: [] },
            { name: "Quality-Plan", folders: [] },
            { name: "Resource-Plan", folders: [] },
            { name: "Communications-Plan", folders: [] },
            { name: "Risk-Plan", folders: [] },
            { name: "Procurement-Plan", folders: [] },
            { name: "Stakeholder-Plan", folders: [] },
          ],
        },
        {
          name: "Baselines",
          folders: [
            { name: "Scope-Baseline", folders: [] },
            { name: "Schedule-Baseline", folders: [] },
            { name: "Cost-Baseline", folders: [] },
          ],
        },
        {
          name: "Work-Breakdown-Structure",
          folders: [
            { name: "WBS-Dictionary", folders: [] },
            { name: "Activity-Lists", folders: [] },
            { name: "Network-Diagrams", folders: [] },
          ],
        },
        { name: "Requirements", folders: [] },
        { name: "Resource-Assignments", folders: [] },
      ],
    },
    {
      name: "03-EXECUTING",
      folders: [
        {
          name: "Work-Performance-Data",
          folders: [
            { name: "Daily-Reports", folders: [] },
            { name: "Weekly-Reports", folders: [] },
            { name: "Deliverables", folders: [] },
          ],
        },
        {
          name: "Team-Management",
          folders: [
            { name: "Team-Directory", folders: [] },
            { name: "Performance-Assessments", folders: [] },
            { name: "Training-Records", folders: [] },
            { name: "Recognition", folders: [] },
          ],
        },
        {
          name: "Procurement-Execution",
          folders: [
            { name: "RFPs-RFQs", folders: [] },
            { name: "Proposals", folders: [] },
            { name: "Contracts", folders: [] },
            { name: "Vendor-Management", folders: [] },
          ],
        },
        { name: "Quality-Deliverables", folders: [] },
        { name: "Stakeholder-Engagement", folders: [] },
      ],
    },
    {
      name: "04-MONITORING-CONTROLLING",
      folders: [
        {
          name: "Performance-Reports",
          folders: [
            { name: "Executive-Dashboards", folders: [] },
            { name: "Monthly-Reports", folders: [] },
            { name: "Quarterly-Reports", folders: [] },
            { name: "Board-Presentations", folders: [] },
          ],
        },
        {
          name: "Change-Management",
          folders: [
            { name: "Change-Requests", folders: [] },
            { name: "Impact-Analyses", folders: [] },
            { name: "CCB-Minutes", folders: [] },
          ],
        },
        {
          name: "EVM-Earned-Value",
          folders: [
            { name: "Monthly-EVM-Reports", folders: [] },
            { name: "Forecasts", folders: [] },
            { name: "Variance-Analysis", folders: [] },
          ],
        },
        {
          name: "Risk-Monitoring",
          folders: [
            { name: "Risk-Reviews", folders: [] },
            { name: "Risk-Response-Updates", folders: [] },
            { name: "Risk-Audits", folders: [] },
          ],
        },
        {
          name: "Quality-Control",
          folders: [
            { name: "Inspections", folders: [] },
            { name: "Test-Results", folders: [] },
            { name: "Defect-Logs", folders: [] },
            { name: "Audits", folders: [] },
          ],
        },
        {
          name: "Issue-Management",
          folders: [
            { name: "Active-Issues", folders: [] },
            { name: "Escalations", folders: [] },
            { name: "Resolutions", folders: [] },
          ],
        },
      ],
    },
    {
      name: "05-CLOSING",
      folders: [
        { name: "Final-Reports", folders: [] },
        { name: "Lessons-Learned", folders: [] },
        { name: "Acceptance-Documents", folders: [] },
        { name: "Archive", folders: [] },
        { name: "Transition-Handover", folders: [] },
        { name: "Financial-Closeout", folders: [] },
        { name: "Contract-Closeout", folders: [] },
      ],
    },
    {
      name: "06-GOVERNANCE",
      folders: [
        { name: "Board-Materials", folders: [] },
        { name: "Steering-Committee", folders: [] },
        { name: "Change-Control-Board", folders: [] },
        { name: "Risk-Review-Board", folders: [] },
        { name: "Policies-Procedures", folders: [] },
        { name: "Compliance", folders: [] },
      ],
    },
    {
      name: "07-KNOWLEDGE-MANAGEMENT",
      folders: [
        { name: "Templates", folders: [] },
        { name: "Best-Practices", folders: [] },
        { name: "Reference-Documents", folders: [] },
        { name: "Training-Materials", folders: [] },
        { name: "PMO-Standards", folders: [] },
      ],
    },
  ],
};

// DRC-specific program structure
const DRC_PROGRAM_STRUCTURE = {
  name: "DRC-GNCS-Program",
  folders: [
    {
      name: "01-INITIATING",
      folders: [
        { name: "Charter-Ministerial-Approval", folders: [] },
        { name: "Business-Case-Economic-Analysis", folders: [] },
        { name: "Stakeholder-Register", folders: [
          { name: "Ministry-Contacts", folders: [] },
          { name: "Thales-Partnership", folders: [] },
          { name: "Local-Partners", folders: [] },
          { name: "Facilitators", folders: [] },
        ]},
        { name: "FCPA-Compliance", folders: [] },
      ],
    },
    {
      name: "02-PLANNING",
      folders: [
        {
          name: "Program-Plans",
          folders: [
            { name: "Master-Program-Plan", folders: [] },
            { name: "Technical-Design", folders: [] },
            { name: "Implementation-Schedule", folders: [] },
            { name: "Budget-Financial-Model", folders: [] },
            { name: "Risk-Management-Plan", folders: [] },
          ],
        },
        {
          name: "Work-Breakdown",
          folders: [
            { name: "Component-1-Broadband-Network", folders: [] },
            { name: "Component-2-Data-Centers", folders: [] },
            { name: "Component-3-Cybersecurity", folders: [] },
            { name: "Component-4-Training", folders: [] },
            { name: "Component-5-Program-Management", folders: [] },
          ],
        },
        { name: "Procurement-Strategy", folders: [] },
      ],
    },
    {
      name: "03-EXECUTING",
      folders: [
        {
          name: "Component-Execution",
          folders: [
            { name: "Broadband-Network-Deployment", folders: [] },
            { name: "Data-Center-Implementation", folders: [] },
            { name: "Cybersecurity-Framework", folders: [] },
            { name: "Training-Programs", folders: [] },
          ],
        },
        {
          name: "Vendor-Management",
          folders: [
            { name: "Thales-Deliverables", folders: [] },
            { name: "Local-Contractors", folders: [] },
            { name: "Quality-Certifications", folders: [] },
          ],
        },
        { name: "Site-Implementation", folders: [] },
        { name: "Testing-Commissioning", folders: [] },
      ],
    },
    {
      name: "04-MONITORING",
      folders: [
        { name: "Ministerial-Reports", folders: [] },
        { name: "EVM-Dashboard", folders: [] },
        { name: "Risk-Register-Updates", folders: [] },
        { name: "Change-Requests", folders: [] },
        { name: "Quality-Metrics", folders: [] },
        { name: "Stakeholder-Engagement-Tracking", folders: [] },
      ],
    },
    {
      name: "05-GOVERNANCE",
      folders: [
        { name: "Ministerial-Board", folders: [] },
        { name: "Program-Steering-Committee", folders: [] },
        { name: "Technical-Review-Board", folders: [] },
        { name: "Compliance-Audits", folders: [] },
      ],
    },
    {
      name: "06-COMMUNICATIONS",
      folders: [
        { name: "Ministry-Communications", folders: [] },
        { name: "Thales-Coordination", folders: [] },
        { name: "Local-Partner-Updates", folders: [] },
        { name: "Public-Relations", folders: [] },
      ],
    },
  ],
};

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("\n📁 PMI Program Folder Structure Automation");
    console.log("\nAvailable structures:");
    console.log("  pmi          - Standard PMI/PMBOK program structure");
    console.log("  drc          - DRC GNCS program-specific structure");
    console.log("  all          - Create both structures");
    console.log("\nUsage: npm run create-pmi-folders <structure>");
    console.log("Example: npm run create-pmi-folders drc");
    process.exit(0);
  }

  const structureType = args[0];
  
  const auth = await authorize();
  const drive = google.drive({ version: "v3", auth });

  console.log("\n🚀 Creating PMI folder structure...\n");

  if (structureType === "pmi") {
    console.log(`📂 Creating ${PMI_PROGRAM_STRUCTURE.name}...`);
    const rootId = await createFolder(drive, PMI_PROGRAM_STRUCTURE.name);
    await createFolderStructure(drive, PMI_PROGRAM_STRUCTURE.folders, rootId);
  } else if (structureType === "drc") {
    console.log(`📂 Creating ${DRC_PROGRAM_STRUCTURE.name}...`);
    const rootId = await createFolder(drive, DRC_PROGRAM_STRUCTURE.name);
    await createFolderStructure(drive, DRC_PROGRAM_STRUCTURE.folders, rootId);
  } else if (structureType === "all") {
    console.log(`📂 Creating ${PMI_PROGRAM_STRUCTURE.name}...`);
    const pmiRootId = await createFolder(drive, PMI_PROGRAM_STRUCTURE.name);
    await createFolderStructure(drive, PMI_PROGRAM_STRUCTURE.folders, pmiRootId);
    
    console.log(`\n📂 Creating ${DRC_PROGRAM_STRUCTURE.name}...`);
    const drcRootId = await createFolder(drive, DRC_PROGRAM_STRUCTURE.name);
    await createFolderStructure(drive, DRC_PROGRAM_STRUCTURE.folders, drcRootId);
  } else {
    console.error(`\n❌ Unknown structure: ${structureType}`);
    console.log("Available: pmi, drc, all");
    process.exit(1);
  }

  console.log("\n✅ PMI folder structure created successfully!\n");
}

main().catch(console.error);
