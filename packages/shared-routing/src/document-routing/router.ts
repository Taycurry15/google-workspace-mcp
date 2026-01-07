/**
 * Document Router
 *
 * Routes documents to correct Drive folders and notifies servers
 */

import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type {
  DocumentClassification,
  RoutingResult,
  RoutingConfig,
} from "./types.js";
import { ROUTING_RULES } from "./types.js";
import { DocumentClassifier } from "./classifier.js";
import { getServiceRegistry } from "../cross-server/registry.js";

/**
 * Document router
 *
 * Routes documents to appropriate folders and notifies servers
 */
export class DocumentRouter {
  private classifier: DocumentClassifier;

  constructor(classifier: DocumentClassifier) {
    this.classifier = classifier;
  }

  /**
   * Route a document to the appropriate location
   */
  async route(
    auth: OAuth2Client,
    fileId: string,
    options?: {
      dryRun?: boolean; // Don't actually move, just return what would happen
      notifyServers?: boolean; // Send notifications to target servers
    }
  ): Promise<RoutingResult> {
    try {
      // Classify document
      const classification = await this.classifier.classify(auth, fileId);

      // Get routing config
      const config = ROUTING_RULES[classification.documentType];

      // Get original file location
      const drive = google.drive({ version: "v3", auth });
      const file = await drive.files.get({
        fileId,
        fields: "name,parents,webViewLink",
      });

      const originalLocation = file.data.webViewLink || "";
      const filename = file.data.name || "Unknown";

      // Resolve folder template
      const targetFolder = this.resolveFolderTemplate(
        config.folderTemplate,
        classification.metadata
      );

      // Move file if not dry run
      let newLocation: string | undefined;
      if (!options?.dryRun) {
        newLocation = await this.moveFile(
          auth,
          fileId,
          targetFolder,
          classification.metadata
        );
      }

      // Notify servers if enabled
      const notificationsSent: string[] = [];
      if (config.notificationEnabled && options?.notifyServers !== false) {
        notificationsSent.push(
          ...(await this.notifyServers(
            classification,
            fileId,
            filename,
            newLocation || originalLocation
          ))
        );
      }

      return {
        success: true,
        documentId: fileId,
        originalLocation,
        newLocation,
        targetFolder,
        classification,
        notificationsSent,
      };
    } catch (error: any) {
      console.error("[DocumentRouter] Routing failed:", error);

      return {
        success: false,
        documentId: fileId,
        originalLocation: "",
        classification: {
          documentType: "other",
          confidence: 0,
          targetServers: [],
          suggestedFolder: "",
          metadata: {},
        },
        notificationsSent: [],
        error: error.message,
      };
    }
  }

  /**
   * Resolve folder template with metadata
   */
  private resolveFolderTemplate(
    template: string,
    metadata: DocumentClassification["metadata"]
  ): string {
    let resolved = template;

    // Replace placeholders
    if (metadata.programId) {
      resolved = resolved.replace("{programId}", metadata.programId);
    }
    if (metadata.deliverableId) {
      resolved = resolved.replace("{deliverableId}", metadata.deliverableId);
    }
    if (metadata.contractId) {
      resolved = resolved.replace("{contractId}", metadata.contractId);
    }
    if (metadata.vendorId) {
      resolved = resolved.replace("{vendorId}", metadata.vendorId);
    }

    // Remove any unresolved placeholders
    resolved = resolved.replace(/\{[^}]+\}/g, "Unknown");

    return resolved;
  }

  /**
   * Move file to target folder in Drive
   */
  private async moveFile(
    auth: OAuth2Client,
    fileId: string,
    folderPath: string,
    metadata: DocumentClassification["metadata"]
  ): Promise<string> {
    const drive = google.drive({ version: "v3", auth });

    // Find or create target folder
    const folderId = await this.findOrCreateFolder(auth, folderPath);

    // Get current parents
    const file = await drive.files.get({
      fileId,
      fields: "parents",
    });

    const previousParents = file.data.parents?.join(",") || "";

    // Move file
    await drive.files.update({
      fileId,
      addParents: folderId,
      removeParents: previousParents,
      fields: "id,parents,webViewLink",
    });

    // Add metadata tags if available
    if (metadata.programId || metadata.deliverableId) {
      await this.tagFile(auth, fileId, metadata);
    }

    // Get new location
    const updated = await drive.files.get({
      fileId,
      fields: "webViewLink",
    });

    return updated.data.webViewLink || "";
  }

  /**
   * Find or create folder by path
   */
  private async findOrCreateFolder(
    auth: OAuth2Client,
    folderPath: string
  ): Promise<string> {
    const drive = google.drive({ version: "v3", auth });
    const parts = folderPath.split("/").filter((p) => p.length > 0);

    let currentParentId = "root";

    for (const part of parts) {
      // Search for folder in current parent
      const response = await drive.files.list({
        q: `name='${part}' and '${currentParentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id,name)",
        spaces: "drive",
      });

      if (response.data.files && response.data.files.length > 0) {
        // Folder exists
        currentParentId = response.data.files[0].id!;
      } else {
        // Create folder
        const folder = await drive.files.create({
          requestBody: {
            name: part,
            mimeType: "application/vnd.google-apps.folder",
            parents: [currentParentId],
          },
          fields: "id",
        });

        currentParentId = folder.data.id!;
      }
    }

    return currentParentId;
  }

  /**
   * Tag file with metadata
   */
  private async tagFile(
    auth: OAuth2Client,
    fileId: string,
    metadata: DocumentClassification["metadata"]
  ): Promise<void> {
    const drive = google.drive({ version: "v3", auth });

    // Build description with metadata tags
    const tags: string[] = [];
    if (metadata.programId) tags.push(`Program: ${metadata.programId}`);
    if (metadata.deliverableId) tags.push(`Deliverable: ${metadata.deliverableId}`);
    if (metadata.contractId) tags.push(`Contract: ${metadata.contractId}`);
    if (metadata.vendorId) tags.push(`Vendor: ${metadata.vendorId}`);

    if (tags.length > 0) {
      await drive.files.update({
        fileId,
        requestBody: {
          description: tags.join(" | "),
        },
      });
    }
  }

  /**
   * Notify target servers about new document
   */
  private async notifyServers(
    classification: DocumentClassification,
    fileId: string,
    filename: string,
    location: string
  ): Promise<string[]> {
    const registry = getServiceRegistry();
    const notified: string[] = [];

    for (const serverId of classification.targetServers) {
      const server = registry.getServer(serverId);

      if (server && server.status !== "unhealthy") {
        try {
          // Send notification to server
          const url = `${server.baseUrl}/api/documents/notify`;

          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              documentId: fileId,
              filename,
              location,
              documentType: classification.documentType,
              metadata: classification.metadata,
              timestamp: new Date().toISOString(),
            }),
          });

          if (response.ok) {
            notified.push(serverId);
            console.log(`[DocumentRouter] Notified ${serverId} about ${filename}`);
          } else {
            console.warn(`[DocumentRouter] Failed to notify ${serverId}: ${response.statusText}`);
          }
        } catch (error) {
          console.error(`[DocumentRouter] Error notifying ${serverId}:`, error);
        }
      }
    }

    return notified;
  }
}

/**
 * Create a document router instance
 */
export function createDocumentRouter(classifier: DocumentClassifier): DocumentRouter {
  return new DocumentRouter(classifier);
}
