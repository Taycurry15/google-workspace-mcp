/**
 * Folder Structure Automation
 *
 * Handles automatic creation and management of PMI-standard folder hierarchies
 * for program, project, and deliverable organization.
 */

import type { drive_v3 } from "googleapis";
import type {
  FolderNode,
  FolderCreationRequest,
  FolderCreationResult,
  FolderMapping,
  FolderRule,
  ProjectPhase,
  DocumentType,
} from "../types/document.js";
import {
  createFolder,
  findFolderByName,
  ensureFolderExists,
} from "../utils/driveHelpers.js";

/**
 * PMI Standard Folder Structure
 * Based on PMBOK project lifecycle phases
 */
export const PMI_FOLDER_STRUCTURE: FolderNode[] = [
  {
    name: "01-Initiation",
    description: "Project initiation documents",
    phase: "initiation",
    documentTypes: ["charter", "plan"],
    autoCreate: true,
    children: [
      {
        name: "Charter",
        documentTypes: ["charter"],
        autoCreate: true,
      },
      {
        name: "Stakeholder Analysis",
        documentTypes: ["report", "plan"],
        autoCreate: true,
      },
      {
        name: "Business Case",
        documentTypes: ["report", "plan"],
        autoCreate: true,
      },
      {
        name: "Kickoff Materials",
        documentTypes: ["presentation", "meeting_notes"],
        autoCreate: true,
      },
    ],
  },
  {
    name: "02-Planning",
    description: "Project planning documents",
    phase: "planning",
    documentTypes: ["plan", "report"],
    autoCreate: true,
    children: [
      {
        name: "Project Plans",
        documentTypes: ["plan"],
        autoCreate: true,
      },
      {
        name: "Schedule",
        documentTypes: ["plan"],
        autoCreate: true,
      },
      {
        name: "WBS",
        documentTypes: ["plan", "report"],
        autoCreate: true,
      },
      {
        name: "Risk Register",
        documentTypes: ["plan", "report"],
        autoCreate: true,
      },
      {
        name: "Resource Planning",
        documentTypes: ["plan"],
        autoCreate: true,
      },
    ],
  },
  {
    name: "03-Execution",
    description: "Project execution documents",
    phase: "execution",
    documentTypes: ["deliverable", "report", "meeting_notes"],
    autoCreate: true,
    children: [
      {
        name: "Deliverables",
        description: "Deliverable-specific folders created dynamically",
        documentTypes: ["deliverable"],
        autoCreate: true,
        children: [], // Populated dynamically per deliverable
      },
      {
        name: "Status Reports",
        documentTypes: ["report"],
        autoCreate: true,
        children: [
          {
            name: "Weekly",
            documentTypes: ["report"],
            autoCreate: true,
          },
          {
            name: "Monthly",
            documentTypes: ["report"],
            autoCreate: true,
          },
          {
            name: "Quarterly",
            documentTypes: ["report"],
            autoCreate: true,
          },
        ],
      },
      {
        name: "Meetings",
        documentTypes: ["meeting_notes", "presentation"],
        autoCreate: true,
        children: [
          {
            name: "Steering Committee",
            documentTypes: ["meeting_notes", "presentation"],
            autoCreate: true,
          },
          {
            name: "Team Meetings",
            documentTypes: ["meeting_notes"],
            autoCreate: true,
          },
          {
            name: "Client Meetings",
            documentTypes: ["meeting_notes", "presentation"],
            autoCreate: true,
          },
        ],
      },
      {
        name: "Change Requests",
        documentTypes: ["plan", "report"],
        autoCreate: true,
      },
    ],
  },
  {
    name: "04-Monitoring-Control",
    description: "Monitoring and control documents",
    phase: "monitoring",
    documentTypes: ["report", "plan"],
    autoCreate: true,
    children: [
      {
        name: "Performance Reports",
        documentTypes: ["report"],
        autoCreate: true,
      },
      {
        name: "Quality Assurance",
        documentTypes: ["report", "plan"],
        autoCreate: true,
      },
      {
        name: "Issue Management",
        documentTypes: ["report"],
        autoCreate: true,
      },
      {
        name: "Change Log",
        documentTypes: ["report"],
        autoCreate: true,
      },
    ],
  },
  {
    name: "05-Closing",
    description: "Project closing documents",
    phase: "closing",
    documentTypes: ["deliverable", "report"],
    autoCreate: true,
    children: [
      {
        name: "Final Deliverables",
        documentTypes: ["deliverable"],
        autoCreate: true,
      },
      {
        name: "Lessons Learned",
        documentTypes: ["report"],
        autoCreate: true,
      },
      {
        name: "Client Acceptance",
        documentTypes: ["report", "contract"],
        autoCreate: true,
      },
      {
        name: "Closeout Reports",
        documentTypes: ["report"],
        autoCreate: true,
      },
    ],
  },
  {
    name: "06-Support",
    description: "Support and reference documents",
    phase: "support",
    documentTypes: ["template", "reference", "training"],
    autoCreate: true,
    children: [
      {
        name: "Templates",
        documentTypes: ["template"],
        autoCreate: true,
      },
      {
        name: "Reference Documents",
        documentTypes: ["reference", "other"],
        autoCreate: true,
      },
      {
        name: "Training Materials",
        documentTypes: ["training", "presentation"],
        autoCreate: true,
      },
      {
        name: "Archives",
        documentTypes: ["other"],
        autoCreate: true,
      },
    ],
  },
];

/**
 * Create full PMI folder structure for a program
 */
export async function createProgramFolderStructure(
  drive: drive_v3.Drive,
  request: FolderCreationRequest
): Promise<FolderCreationResult> {
  try {
    const { programId, templateId, rootFolderId, customFolders } = request;

    // Determine which structure to use
    let structure: FolderNode[] = [];
    if (templateId === "pmi") {
      structure = PMI_FOLDER_STRUCTURE;
    } else if (templateId === "custom" && customFolders) {
      structure = customFolders;
    } else {
      throw new Error(`Unknown template ID: ${templateId}`);
    }

    // Create root folder if needed
    let programRootId = rootFolderId;
    if (!programRootId) {
      programRootId = await createFolder(drive, `Program: ${programId}`);
    }

    // Create folder structure recursively
    const folderMap: Record<string, string> = {};
    const rules: FolderRule[] = [];
    let ruleIdCounter = 1;

    await createFolderRecursive(
      drive,
      structure,
      programRootId,
      "",
      folderMap,
      rules,
      ruleIdCounter
    );

    const folderMapping: FolderMapping = {
      programId,
      rootFolderId: programRootId,
      mappings: rules,
    };

    return {
      programId,
      rootFolderId: programRootId,
      foldersCreated: Object.keys(folderMap).length,
      folderMapping,
      errors: [],
    };
  } catch (error) {
    throw new Error(
      `Failed to create program folder structure: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Recursively create folder structure
 */
async function createFolderRecursive(
  drive: drive_v3.Drive,
  nodes: FolderNode[],
  parentId: string,
  currentPath: string,
  folderMap: Record<string, string>,
  rules: FolderRule[],
  ruleIdCounter: number
): Promise<void> {
  for (const node of nodes) {
    if (!node.autoCreate) {
      continue;
    }

    // Check if folder exists
    const existingId = await findFolderByName(drive, node.name, parentId);
    let folderId: string;

    if (existingId) {
      folderId = existingId;
    } else {
      folderId = await createFolder(drive, node.name, parentId);
    }

    const folderPath = currentPath ? `${currentPath}/${node.name}` : node.name;
    folderMap[folderPath] = folderId;
    node.driveId = folderId;

    // Create routing rule for this folder
    if (node.phase || node.documentTypes.length > 0) {
      for (const docType of node.documentTypes) {
        rules.push({
          ruleId: `RULE-${String(ruleIdCounter++).padStart(3, "0")}`,
          documentType: docType,
          phase: node.phase,
          folderPath,
          folderId,
          priority: rules.length + 1,
          active: true,
        });
      }
    }

    // Recurse for children
    if (node.children && node.children.length > 0) {
      await createFolderRecursive(
        drive,
        node.children,
        folderId,
        folderPath,
        folderMap,
        rules,
        ruleIdCounter
      );
    }
  }
}

/**
 * Create deliverable-specific folder structure
 * Creates: Deliverables/{deliverableId}/{Draft, Review, Final}
 */
export async function createDeliverableFolderStructure(
  drive: drive_v3.Drive,
  programRootId: string,
  deliverableId: string,
  deliverableName: string
): Promise<{
  deliverableFolderId: string;
  draftFolderId: string;
  reviewFolderId: string;
  finalFolderId: string;
}> {
  try {
    // Find or create Deliverables folder
    const executionFolderId = await findFolderByName(
      drive,
      "03-Execution",
      programRootId
    );
    if (!executionFolderId) {
      throw new Error("03-Execution folder not found");
    }

    const deliverablesParentId = await findFolderByName(
      drive,
      "Deliverables",
      executionFolderId
    );
    if (!deliverablesParentId) {
      throw new Error("Deliverables folder not found");
    }

    // Create deliverable folder
    const deliverableFolderName = `${deliverableId} - ${deliverableName}`;
    let deliverableFolderId = await findFolderByName(
      drive,
      deliverableFolderName,
      deliverablesParentId
    );
    if (!deliverableFolderId) {
      deliverableFolderId = await createFolder(
        drive,
        deliverableFolderName,
        deliverablesParentId
      );
    }

    // Create sub-folders: Draft, Review, Final
    const draftFolderId = await ensureFolderExists(
      drive,
      "Draft",
      deliverableFolderId
    );
    const reviewFolderId = await ensureFolderExists(
      drive,
      "Review",
      deliverableFolderId
    );
    const finalFolderId = await ensureFolderExists(
      drive,
      "Final",
      deliverableFolderId
    );

    return {
      deliverableFolderId,
      draftFolderId,
      reviewFolderId,
      finalFolderId,
    };
  } catch (error) {
    throw new Error(
      `Failed to create deliverable folder structure: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get target folder path based on document type and phase
 */
export function getTargetFolderPath(
  documentType: DocumentType,
  phase?: ProjectPhase,
  deliverableId?: string,
  deliverableStatus?: "draft" | "review" | "final"
): string {
  // Handle deliverables specially
  if (documentType === "deliverable" && deliverableId) {
    const statusFolder = deliverableStatus || "draft";
    return `03-Execution/Deliverables/${deliverableId}/${
      statusFolder.charAt(0).toUpperCase() + statusFolder.slice(1)
    }`;
  }

  // Map document types and phases to folders
  const folderMap: Record<string, string> = {
    // Initiation
    "charter:initiation": "01-Initiation/Charter",
    charter: "01-Initiation/Charter",

    // Planning
    "plan:planning": "02-Planning/Project Plans",
    "plan:initiation": "01-Initiation/Business Case",

    // Execution
    "report:execution": "03-Execution/Status Reports/Weekly",
    "meeting_notes:execution": "03-Execution/Meetings/Team Meetings",
    "presentation:execution": "03-Execution/Meetings",

    // Monitoring
    "report:monitoring": "04-Monitoring-Control/Performance Reports",
    "plan:monitoring": "04-Monitoring-Control/Quality Assurance",

    // Closing
    "report:closing": "05-Closing/Closeout Reports",
    "deliverable:closing": "05-Closing/Final Deliverables",

    // Support
    template: "06-Support/Templates",
    reference: "06-Support/Reference Documents",
    training: "06-Support/Training Materials",

    // Fallbacks by type only
    contract: "01-Initiation",
    presentation: "03-Execution/Meetings",
    meeting_notes: "03-Execution/Meetings/Team Meetings",
    other: "06-Support/Reference Documents",
  };

  // Try phase + type combination first
  const key = phase ? `${documentType}:${phase}` : documentType;
  const path = folderMap[key] || folderMap[documentType];

  if (!path) {
    // Default to Support/Reference Documents
    return "06-Support/Reference Documents";
  }

  return path;
}

/**
 * Find folder ID by path within a program structure
 */
export async function findFolderIdByPath(
  drive: drive_v3.Drive,
  programRootId: string,
  folderPath: string
): Promise<string | null> {
  try {
    const parts = folderPath.split("/").filter((p) => p.length > 0);
    let currentId = programRootId;

    for (const folderName of parts) {
      const folderId = await findFolderByName(drive, folderName, currentId);
      if (!folderId) {
        return null;
      }
      currentId = folderId;
    }

    return currentId;
  } catch (error) {
    throw new Error(
      `Failed to find folder by path: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
