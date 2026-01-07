/**
 * PARA Folder Structure Setup
 * Creates PARA folder structure in Google Drive
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { PARAFolderStructure } from "../types/para.js";

/**
 * Create a folder in Google Drive
 */
async function createFolder(
  drive: any,
  name: string,
  parentId?: string,
  description?: string
): Promise<string> {
  const fileMetadata: any = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };

  if (parentId) {
    fileMetadata.parents = [parentId];
  }

  if (description) {
    fileMetadata.description = description;
  }

  const result = await drive.files.create({
    requestBody: fileMetadata,
    fields: "id, name, webViewLink",
  });

  console.log(`  ✓ Created: ${name} (${result.data.id})`);
  return result.data.id!;
}

/**
 * Create archive folder structure (years and quarters)
 */
async function createArchiveStructure(
  drive: any,
  archivesRootId: string,
  years: number[] = [new Date().getFullYear(), new Date().getFullYear() - 1]
): Promise<{
  yearFolders: Map<string, string>;
  quarterFolders: Map<string, string>;
}> {
  const yearFolders = new Map<string, string>();
  const quarterFolders = new Map<string, string>();

  for (const year of years) {
    const yearStr = year.toString();
    const yearId = await createFolder(
      drive,
      yearStr,
      archivesRootId,
      `Archived projects from ${year}`
    );
    yearFolders.set(yearStr, yearId);

    // Create quarters
    for (let q = 1; q <= 4; q++) {
      const quarterName = `Q${q}`;
      const quarterId = await createFolder(
        drive,
        quarterName,
        yearId,
        `${year} Quarter ${q}`
      );
      quarterFolders.set(`${year}-Q${q}`, quarterId);
    }
  }

  return { yearFolders, quarterFolders };
}

/**
 * Set up complete PARA folder structure
 */
export async function setupPARAStructure(
  auth: OAuth2Client,
  parentFolderId?: string,
  includeSubfolders: boolean = true
): Promise<PARAFolderStructure> {
  const drive = google.drive({ version: "v3", auth });

  console.log("🚀 Creating PARA folder structure...\n");

  // Create root PARA folder
  const rootId = await createFolder(
    drive,
    "PARA System",
    parentFolderId,
    "PARA method organization: Projects, Areas, Resources, Archives"
  );

  console.log("\n📂 Creating main PARA categories...");

  // Create main category folders
  const projectsId = await createFolder(
    drive,
    "1-Projects",
    rootId,
    "Active projects with specific deadlines and goals"
  );

  const areasId = await createFolder(
    drive,
    "2-Areas",
    rootId,
    "Ongoing responsibilities without specific deadlines"
  );

  const resourcesId = await createFolder(
    drive,
    "3-Resources",
    rootId,
    "Reference materials and knowledge base"
  );

  const archivesId = await createFolder(
    drive,
    "4-Archives",
    rootId,
    "Completed projects and archived information"
  );

  // Create subfolders if requested
  if (includeSubfolders) {
    console.log("\n📁 Creating subfolders...");

    // Areas subfolders
    await createFolder(
      drive,
      "Client-Relationships",
      areasId,
      "Ongoing client relationship management"
    );
    await createFolder(
      drive,
      "Business-Development",
      areasId,
      "Ongoing business development activities"
    );
    await createFolder(
      drive,
      "Compliance-Management",
      areasId,
      "Ongoing compliance and regulatory management"
    );

    // Resources subfolders
    await createFolder(drive, "Templates", resourcesId, "Document templates");
    await createFolder(
      drive,
      "Research",
      resourcesId,
      "Research materials and reports"
    );
    await createFolder(
      drive,
      "Knowledge-Base",
      resourcesId,
      "Guides, best practices, and reference materials"
    );
  }

  // Create archive structure (current year and previous year)
  console.log("\n📅 Creating archive structure...");
  const { yearFolders, quarterFolders } = await createArchiveStructure(
    drive,
    archivesId
  );

  console.log("\n✅ PARA folder structure created successfully!");
  console.log(`\nRoot folder ID: ${rootId}`);
  console.log(`View at: https://drive.google.com/drive/folders/${rootId}`);

  return {
    rootId,
    projectsId,
    areasId,
    resourcesId,
    archivesId,
    archiveYears: yearFolders,
    archiveQuarters: quarterFolders,
  };
}

/**
 * Get PARA folder structure if it already exists
 */
export async function getPARAStructure(
  auth: OAuth2Client
): Promise<PARAFolderStructure | null> {
  const drive = google.drive({ version: "v3", auth });

  try {
    // Search for PARA System root folder
    const response = await drive.files.list({
      q: "name='PARA System' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: "files(id, name)",
      pageSize: 1,
    });

    if (!response.data.files || response.data.files.length === 0) {
      return null;
    }

    const rootId = response.data.files[0].id!;

    // Get subfolders
    const subfolders = await drive.files.list({
      q: `'${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)",
    });

    const folders = subfolders.data.files || [];

    const projectsFolder = folders.find((f) => f.name === "1-Projects");
    const areasFolder = folders.find((f) => f.name === "2-Areas");
    const resourcesFolder = folders.find((f) => f.name === "3-Resources");
    const archivesFolder = folders.find((f) => f.name === "4-Archives");

    if (!projectsFolder || !areasFolder || !resourcesFolder || !archivesFolder) {
      console.warn("PARA structure exists but is incomplete");
      return null;
    }

    // Get archive structure
    const archiveSubfolders = await drive.files.list({
      q: `'${archivesFolder.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)",
    });

    const yearFolders = new Map<string, string>();
    const quarterFolders = new Map<string, string>();

    for (const yearFolder of archiveSubfolders.data.files || []) {
      if (/^\d{4}$/.test(yearFolder.name!)) {
        yearFolders.set(yearFolder.name!, yearFolder.id!);

        // Get quarters
        const quarters = await drive.files.list({
          q: `'${yearFolder.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: "files(id, name)",
        });

        for (const quarterFolder of quarters.data.files || []) {
          if (/^Q[1-4]$/.test(quarterFolder.name!)) {
            const key = `${yearFolder.name}-${quarterFolder.name}`;
            quarterFolders.set(key, quarterFolder.id!);
          }
        }
      }
    }

    return {
      rootId,
      projectsId: projectsFolder.id!,
      areasId: areasFolder.id!,
      resourcesId: resourcesFolder.id!,
      archivesId: archivesFolder.id!,
      archiveYears: yearFolders,
      archiveQuarters: quarterFolders,
    };
  } catch (error) {
    console.error("Error getting PARA structure:", error);
    return null;
  }
}

/**
 * Ensure archive folders exist for a given year/quarter
 */
export async function ensureArchiveFolder(
  auth: OAuth2Client,
  year: number,
  quarter: number
): Promise<string> {
  const drive = google.drive({ version: "v3", auth });

  // Get or create PARA structure
  let structure = await getPARAStructure(auth);
  if (!structure) {
    structure = await setupPARAStructure(auth);
  }

  const yearStr = year.toString();
  const quarterKey = `${year}-Q${quarter}`;

  // Check if quarter folder exists
  if (structure.archiveQuarters.has(quarterKey)) {
    return structure.archiveQuarters.get(quarterKey)!;
  }

  // Create year folder if needed
  let yearFolderId: string;
  if (structure.archiveYears.has(yearStr)) {
    yearFolderId = structure.archiveYears.get(yearStr)!;
  } else {
    yearFolderId = await createFolder(
      drive,
      yearStr,
      structure.archivesId,
      `Archived projects from ${year}`
    );
    structure.archiveYears.set(yearStr, yearFolderId);
  }

  // Create quarter folder
  const quarterFolderId = await createFolder(
    drive,
    `Q${quarter}`,
    yearFolderId,
    `${year} Quarter ${quarter}`
  );

  structure.archiveQuarters.set(quarterKey, quarterFolderId);

  return quarterFolderId;
}

/**
 * Create a shortcut to a file in a PARA category folder
 */
export async function createShortcutInPARAFolder(
  auth: OAuth2Client,
  fileId: string,
  fileName: string,
  category: "PROJECT" | "AREA" | "RESOURCE" | "ARCHIVE",
  subfolderName?: string
): Promise<string> {
  const drive = google.drive({ version: "v3", auth });

  // Get PARA structure
  const structure = await getPARAStructure(auth);
  if (!structure) {
    throw new Error("PARA structure not found. Run setup first.");
  }

  // Determine target folder
  let targetFolderId: string;
  switch (category) {
    case "PROJECT":
      targetFolderId = structure.projectsId;
      break;
    case "AREA":
      targetFolderId = structure.areasId;
      break;
    case "RESOURCE":
      targetFolderId = structure.resourcesId;
      break;
    case "ARCHIVE":
      targetFolderId = structure.archivesId;
      break;
  }

  // If subfolder specified, find or create it
  if (subfolderName) {
    const subfolder = await drive.files.list({
      q: `name='${subfolderName}' and '${targetFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
      pageSize: 1,
    });

    if (subfolder.data.files && subfolder.data.files.length > 0) {
      targetFolderId = subfolder.data.files[0].id!;
    } else {
      targetFolderId = await createFolder(drive, subfolderName, targetFolderId);
    }
  }

  // Create shortcut
  const shortcut = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: "application/vnd.google-apps.shortcut",
      shortcutDetails: {
        targetId: fileId,
      },
      parents: [targetFolderId],
    },
    fields: "id, name, webViewLink",
  });

  return shortcut.data.id!;
}
