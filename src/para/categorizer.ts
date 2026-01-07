/**
 * PARA Categorization Engine
 * Core logic for AI-powered document categorization
 */

import { OAuth2Client } from "google-auth-library";
import { getClaudeClient } from "../utils/claude-api.js";
import { extractContent, batchExtractContent } from "./content-extractor.js";
import {
  updateFileMetadata,
  categorizationToMetadata,
  hasParaMetadata,
} from "./metadata.js";
import { createShortcutInPARAFolder } from "./setup.js";
import {
  CategorizationResult,
  FileInfo,
  BatchProgress,
} from "../types/para.js";

/**
 * Categorize a single file
 */
export async function categorizeFile(
  auth: OAuth2Client,
  fileId: string,
  options: {
    forceRecategorize?: boolean;
    applyToFolder?: boolean;
    createShortcut?: boolean;
  } = {}
): Promise<CategorizationResult> {
  const {
    forceRecategorize = false,
    applyToFolder = true,
    createShortcut = true,
  } = options;

  // Check if already categorized
  if (!forceRecategorize) {
    const alreadyCategorized = await hasParaMetadata(auth, fileId);
    if (alreadyCategorized) {
      throw new Error(
        "File already has PARA categorization. Use forceRecategorize=true to re-categorize."
      );
    }
  }

  // Extract content
  console.log("Extracting content...");
  const extractedContent = await extractContent(auth, fileId);

  // Get LLM client and categorize
  console.log("Analyzing with AI orchestrator...");
  const claudeClient = getClaudeClient();
  const result = await claudeClient.categorizeDocument(extractedContent);

  // Update metadata
  if (applyToFolder) {
    console.log("Updating metadata...");
    const metadata = categorizationToMetadata(
      result,
      extractedContent.metadata.domain
    );
    await updateFileMetadata(auth, fileId, metadata);
  }

  // Create shortcut in PARA folder
  if (createShortcut) {
    try {
      console.log(`Creating shortcut in ${result.category} folder...`);
      const subfolderName = result.suggestedProject || result.suggestedArea;
      await createShortcutInPARAFolder(
        auth,
        fileId,
        extractedContent.fileName,
        result.category,
        subfolderName
      );
    } catch (error) {
      console.warn("Failed to create shortcut:", error);
      // Don't fail the whole operation if shortcut creation fails
    }
  }

  console.log(
    `✓ Categorized as ${result.category} (confidence: ${result.confidence})`
  );

  return result;
}

/**
 * Batch categorize multiple files
 */
export async function batchCategorizeFiles(
  auth: OAuth2Client,
  fileIds: string[],
  options: {
    forceRecategorize?: boolean;
    applyToFolder?: boolean;
    createShortcut?: boolean;
    maxConcurrent?: number;
    onProgress?: (progress: BatchProgress) => void;
  } = {}
): Promise<Map<string, CategorizationResult>> {
  const {
    forceRecategorize = false,
    applyToFolder = true,
    createShortcut = true,
    maxConcurrent = 5,
    onProgress,
  } = options;

  const results = new Map<string, CategorizationResult>();
  const total = fileIds.length;
  let processed = 0;
  let successful = 0;
  let failed = 0;

  // Filter already categorized files if not forcing
  let filesToProcess = fileIds;
  if (!forceRecategorize) {
    const filtered: string[] = [];
    for (const fileId of fileIds) {
      const hasMeta = await hasParaMetadata(auth, fileId);
      if (!hasMeta) {
        filtered.push(fileId);
      } else {
        processed++;
        console.log(`Skipping already categorized file: ${fileId}`);
      }
    }
    filesToProcess = filtered;
  }

  if (filesToProcess.length === 0) {
    console.log("All files already categorized.");
    return results;
  }

  console.log(`Processing ${filesToProcess.length} files...`);

  // Extract content from all files
  console.log("Extracting content from files...");
  const extractedContents = await batchExtractContent(
    auth,
    filesToProcess,
    (extractProcessed, extractTotal) => {
      if (onProgress) {
        onProgress({
          total,
          processed: processed + Math.floor(extractProcessed / 2),
          successful,
          failed,
          currentFile: `Extracting ${extractProcessed}/${extractTotal}`,
        });
      }
    }
  );

  // Categorize with orchestrated LLMs (batch with concurrency)
  console.log("Categorizing with AI orchestrator...");
  const claudeClient = getClaudeClient();

  const categorizations = await claudeClient.batchCategorize(
    Array.from(extractedContents.values()),
    maxConcurrent,
    (catProcessed, catTotal) => {
      if (onProgress) {
        onProgress({
          total,
          processed:
            processed + Math.floor(filesToProcess.length / 2) + catProcessed,
          successful,
          failed,
          currentFile: `Categorizing ${catProcessed}/${catTotal}`,
        });
      }
    }
  );

  // Apply results
  console.log("Applying categorizations...");
  for (const [fileId, content] of extractedContents) {
    const result = categorizations.get(fileId);
    if (!result) {
      failed++;
      processed++;
      continue;
    }

    try {
      // Update metadata
      if (applyToFolder) {
        const metadata = categorizationToMetadata(
          result,
          content.metadata.domain
        );
        await updateFileMetadata(auth, fileId, metadata);
      }

      // Create shortcut
      if (createShortcut) {
        try {
          const subfolderName = result.suggestedProject || result.suggestedArea;
          await createShortcutInPARAFolder(
            auth,
            fileId,
            content.fileName,
            result.category,
            subfolderName
          );
        } catch (error) {
          console.warn(`Failed to create shortcut for ${fileId}:`, error);
        }
      }

      results.set(fileId, result);
      successful++;
    } catch (error) {
      console.error(`Failed to apply categorization for ${fileId}:`, error);
      failed++;
    }

    processed++;

    if (onProgress) {
      onProgress({
        total,
        processed,
        successful,
        failed,
        currentFile: content.fileName,
      });
    }
  }

  console.log(
    `\n✓ Batch categorization complete: ${successful} successful, ${failed} failed`
  );

  return results;
}

/**
 * Categorize files in a folder
 */
export async function categorizeFolderFiles(
  auth: OAuth2Client,
  folderId: string,
  options: {
    forceRecategorize?: boolean;
    applyToFolder?: boolean;
    createShortcut?: boolean;
    maxFiles?: number;
    maxConcurrent?: number;
    onProgress?: (progress: BatchProgress) => void;
  } = {}
): Promise<Map<string, CategorizationResult>> {
  const { maxFiles = 50, ...otherOptions } = options;

  // Import getFilesInFolder from metadata
  const { getFilesInFolder } = await import("./metadata.js");

  // Get files in folder
  console.log(`Getting files from folder ${folderId}...`);
  const files = await getFilesInFolder(auth, folderId, false);

  if (files.length === 0) {
    console.log("No files found in folder.");
    return new Map();
  }

  // Limit files if specified
  const filesToProcess = files.slice(0, maxFiles);
  const fileIds = filesToProcess.map((f) => f.id);

  console.log(`Found ${files.length} files, processing ${fileIds.length}`);

  return batchCategorizeFiles(auth, fileIds, otherOptions);
}

/**
 * Re-categorize files with low confidence
 */
export async function recategorizeLowConfidence(
  auth: OAuth2Client,
  threshold: number = 0.7,
  maxFiles: number = 50
): Promise<Map<string, CategorizationResult>> {
  const { google } = await import("googleapis");
  const drive = google.drive({ version: "v3", auth });

  // Find files with low confidence
  const query = `properties has { key='para_confidence' } and trashed=false`;

  const response = await drive.files.list({
    q: query,
    pageSize: maxFiles * 2, // Get more to filter
    fields: "files(id, name, properties)",
  });

  const files = response.data.files || [];

  // Filter by confidence threshold
  const lowConfidenceFiles = files
    .filter((file) => {
      const confidence = parseFloat(
        file.properties?.para_confidence || "1.0"
      );
      return confidence < threshold;
    })
    .slice(0, maxFiles)
    .map((file) => file.id!);

  if (lowConfidenceFiles.length === 0) {
    console.log(`No files found with confidence < ${threshold}`);
    return new Map();
  }

  console.log(
    `Re-categorizing ${lowConfidenceFiles.length} files with low confidence...`
  );

  return batchCategorizeFiles(auth, lowConfidenceFiles, {
    forceRecategorize: true,
    applyToFolder: true,
    createShortcut: false, // Don't recreate shortcuts
  });
}

/**
 * Get categorization summary for files
 */
export async function getCategorizationSummary(
  auth: OAuth2Client
): Promise<{
  total: number;
  categorized: number;
  uncategorized: number;
  byCategory: Record<string, number>;
  byActionability: Record<string, number>;
  avgConfidence: number;
}> {
  const { google } = await import("googleapis");
  const drive = google.drive({ version: "v3", auth });

  // Get all files with PARA metadata
  const categorizedQuery =
    "properties has { key='para_category' } and trashed=false";

  const categorizedResponse = await drive.files.list({
    q: categorizedQuery,
    pageSize: 1000,
    fields: "files(id, properties)",
  });

  const categorizedFiles = categorizedResponse.data.files || [];

  // Count by category
  const byCategory: Record<string, number> = {
    PROJECT: 0,
    AREA: 0,
    RESOURCE: 0,
    ARCHIVE: 0,
  };

  const byActionability: Record<string, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  let totalConfidence = 0;

  for (const file of categorizedFiles) {
    const category = file.properties?.para_category;
    const actionability = file.properties?.para_actionability;
    const confidence = parseFloat(file.properties?.para_confidence || "0");

    if (category && category in byCategory) {
      byCategory[category]++;
    }

    if (actionability && actionability in byActionability) {
      byActionability[actionability]++;
    }

    totalConfidence += confidence;
  }

  const avgConfidence =
    categorizedFiles.length > 0
      ? totalConfidence / categorizedFiles.length
      : 0;

  // Get total files (approximate - use categorized + uncategorized from search)
  const uncategorizedQuery =
    "not properties has { key='para_category' } and trashed=false and mimeType != 'application/vnd.google-apps.folder'";

  const uncategorizedResponse = await drive.files.list({
    q: uncategorizedQuery,
    pageSize: 1000,
    fields: "files(id)",
  });

  const uncategorizedCount = uncategorizedResponse.data.files?.length || 0;

  return {
    total: categorizedFiles.length + uncategorizedCount,
    categorized: categorizedFiles.length,
    uncategorized: uncategorizedCount,
    byCategory,
    byActionability,
    avgConfidence,
  };
}
