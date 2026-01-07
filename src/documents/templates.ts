/**
 * Document Template System
 *
 * Manages reusable document templates for common program documents.
 */

import type { drive_v3, sheets_v4 } from "googleapis";
import type {
  DocumentTemplate,
  TemplateVariable,
  DocumentType,
} from "../types/document.js";
import { copyToFolder } from "../utils/driveHelpers.js";
import {
  readSheetRange,
  appendRows,
  findRowById,
  generateNextId,
} from "../utils/sheetHelpers.js";

const TEMPLATES_SHEET = "Templates";

/**
 * Create a document from a template
 */
export async function createFromTemplate(
  drive: drive_v3.Drive,
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  templateId: string,
  targetFolderId: string,
  variables: Record<string, string>,
  newFileName?: string
): Promise<string> {
  try {
    // Get template
    const template = await getTemplate(sheets, spreadsheetId, templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Copy template file
    const newFileId = await copyToFolder(
      drive,
      template.driveFileId,
      targetFolderId,
      newFileName
    );

    // TODO: Replace variables in the copied document
    // This would require reading/writing doc content
    // For now, we'll just copy the file as-is

    return newFileId;
  } catch (error) {
    throw new Error(
      `Failed to create from template: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Register a new template
 */
export async function registerTemplate(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  template: Omit<DocumentTemplate, "templateId">
): Promise<string> {
  try {
    const templateId = await generateNextId(
      sheets,
      spreadsheetId,
      TEMPLATES_SHEET,
      "Template ID",
      "TMPL"
    );

    const row = [
      templateId,
      template.name,
      template.description,
      template.type,
      template.driveFileId,
      template.category,
      JSON.stringify(template.variables),
      template.tags.join(", "),
      template.active,
      template.createdBy,
      template.createdDate.toISOString(),
      template.lastUsed?.toISOString() || "",
      template.usageCount,
    ];

    await appendRows(sheets, spreadsheetId, `${TEMPLATES_SHEET}!A:M`, [row]);

    return templateId;
  } catch (error) {
    throw new Error(
      `Failed to register template: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Get template by ID
 */
export async function getTemplate(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  templateId: string
): Promise<DocumentTemplate | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      TEMPLATES_SHEET,
      "Template ID",
      templateId
    );

    if (!result) {
      return null;
    }

    return parseTemplateRow(result.rowData);
  } catch (error) {
    throw new Error(
      `Failed to get template: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * List templates by type or category
 */
export async function listTemplates(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  type?: DocumentType,
  category?: string,
  activeOnly: boolean = true
): Promise<DocumentTemplate[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${TEMPLATES_SHEET}!A:M`
    );

    if (data.length <= 1) {
      return [];
    }

    const templates: DocumentTemplate[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const template = parseTemplateRow(row);

      if (activeOnly && !template.active) {
        continue;
      }

      if (type && template.type !== type) {
        continue;
      }

      if (category && template.category !== category) {
        continue;
      }

      templates.push(template);
    }

    return templates;
  } catch (error) {
    throw new Error(
      `Failed to list templates: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Parse template row
 */
function parseTemplateRow(row: any[]): DocumentTemplate {
  return {
    templateId: row[0] || "",
    name: row[1] || "",
    description: row[2] || "",
    type: (row[3] as DocumentType) || "other",
    driveFileId: row[4] || "",
    category: row[5] || "",
    variables: row[6] ? JSON.parse(row[6]) : [],
    tags: row[7] ? row[7].split(",").map((t: string) => t.trim()) : [],
    active: row[8] === true || row[8] === "TRUE" || row[8] === "true",
    createdBy: row[9] || "",
    createdDate: row[10] ? new Date(row[10]) : new Date(),
    lastUsed: row[11] ? new Date(row[11]) : undefined,
    usageCount: parseInt(row[12]) || 0,
  };
}
