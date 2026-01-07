/**
 * Program Context Validator
 *
 * Validates entity references belong to correct programs
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import type { ValidationResult, CrossProgramCheck } from "./types.js";
import { getProgramContextManager } from "./context-manager.js";

/**
 * Entity type to spreadsheet mapping
 */
const ENTITY_SPREADSHEETS: Record<
  string,
  {
    spreadsheetEnv: string;
    sheetName: string;
    idColumn: string;
    programIdColumn: string;
  }
> = {
  deliverable: {
    spreadsheetEnv: "PMO_SPREADSHEET_ID",
    sheetName: "Deliverables",
    idColumn: "A", // Deliverable ID
    programIdColumn: "B", // Program ID
  },
  milestone: {
    spreadsheetEnv: "PROGRAM_SPREADSHEET_ID",
    sheetName: "Milestones",
    idColumn: "A", // Milestone ID
    programIdColumn: "B", // Program ID
  },
  risk: {
    spreadsheetEnv: "PMO_SPREADSHEET_ID",
    sheetName: "Risks",
    idColumn: "A", // Risk ID
    programIdColumn: "B", // Program ID
  },
  contract: {
    spreadsheetEnv: "SUBCONTRACT_SPREADSHEET_ID",
    sheetName: "Contracts",
    idColumn: "A", // Contract ID
    programIdColumn: "B", // Program ID
  },
  vendor: {
    spreadsheetEnv: "SUBCONTRACT_SPREADSHEET_ID",
    sheetName: "Vendors",
    idColumn: "A", // Vendor ID
    programIdColumn: "B", // Program ID (optional - vendors may be global)
  },
};

/**
 * Program context validator
 */
export class ProgramContextValidator {
  private contextManager = getProgramContextManager();

  /**
   * Validate that entity belongs to specified program
   */
  async validateEntity(
    auth: OAuth2Client,
    entityId: string,
    entityType: string,
    programId: string
  ): Promise<ValidationResult> {
    const mapping = ENTITY_SPREADSHEETS[entityType];

    if (!mapping) {
      return {
        valid: false,
        entityId,
        entityType,
        error: `Unknown entity type: ${entityType}`,
      };
    }

    // Get spreadsheet ID from environment
    const spreadsheetId = process.env[mapping.spreadsheetEnv];

    if (!spreadsheetId) {
      return {
        valid: false,
        entityId,
        entityType,
        error: `Spreadsheet not configured: ${mapping.spreadsheetEnv}`,
      };
    }

    try {
      // Query spreadsheet for entity
      const sheets = google.sheets({ version: "v4", auth });

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${mapping.sheetName}!${mapping.idColumn}:${mapping.programIdColumn}`,
      });

      const rows = response.data.values || [];

      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0] === entityId) {
          const entityProgramId = row[1];

          if (entityProgramId === programId) {
            return {
              valid: true,
              programId: entityProgramId,
              entityId,
              entityType,
            };
          } else {
            return {
              valid: false,
              programId: entityProgramId,
              entityId,
              entityType,
              error: `Entity ${entityId} belongs to program ${entityProgramId}, not ${programId}`,
            };
          }
        }
      }

      // Entity not found
      return {
        valid: false,
        entityId,
        entityType,
        error: `Entity ${entityId} not found in ${mapping.sheetName}`,
      };
    } catch (error: any) {
      return {
        valid: false,
        entityId,
        entityType,
        error: `Validation error: ${error.message}`,
      };
    }
  }

  /**
   * Validate deliverable belongs to program
   */
  async validateDeliverableId(
    auth: OAuth2Client,
    deliverableId: string,
    programId: string
  ): Promise<ValidationResult> {
    return this.validateEntity(auth, deliverableId, "deliverable", programId);
  }

  /**
   * Validate milestone belongs to program
   */
  async validateMilestoneId(
    auth: OAuth2Client,
    milestoneId: string,
    programId: string
  ): Promise<ValidationResult> {
    return this.validateEntity(auth, milestoneId, "milestone", programId);
  }

  /**
   * Validate risk belongs to program
   */
  async validateRiskId(
    auth: OAuth2Client,
    riskId: string,
    programId: string
  ): Promise<ValidationResult> {
    return this.validateEntity(auth, riskId, "risk", programId);
  }

  /**
   * Validate contract belongs to program
   */
  async validateContractId(
    auth: OAuth2Client,
    contractId: string,
    programId: string
  ): Promise<ValidationResult> {
    return this.validateEntity(auth, contractId, "contract", programId);
  }

  /**
   * Check if cross-program reference is allowed
   */
  async checkCrossProgramReference(
    auth: OAuth2Client,
    sourceProgram: string,
    targetProgram: string,
    entityId: string,
    entityType: string
  ): Promise<CrossProgramCheck> {
    // Validate entity exists and get its program
    const validation = await this.validateEntity(
      auth,
      entityId,
      entityType,
      targetProgram
    );

    if (!validation.valid) {
      return {
        sourceProgram,
        targetProgram,
        entityId,
        entityType,
        allowed: false,
        reason: validation.error || "Validation failed",
      };
    }

    // Cross-program references are generally not allowed
    // (unless specific rules are implemented)
    if (sourceProgram !== targetProgram) {
      return {
        sourceProgram,
        targetProgram,
        entityId,
        entityType,
        allowed: false,
        reason: `Cross-program references not allowed: ${sourceProgram} → ${targetProgram}`,
      };
    }

    return {
      sourceProgram,
      targetProgram,
      entityId,
      entityType,
      allowed: true,
    };
  }

  /**
   * Validate program context for current operation
   */
  validateCurrentContext(
    programId: string,
    sessionId?: string
  ): { valid: boolean; error?: string } {
    return this.contextManager.validateProgramContext(programId, sessionId);
  }

  /**
   * Get program ID for entity
   */
  async getProgramIdForEntity(
    auth: OAuth2Client,
    entityId: string,
    entityType: string
  ): Promise<string | undefined> {
    const mapping = ENTITY_SPREADSHEETS[entityType];

    if (!mapping) {
      return undefined;
    }

    const spreadsheetId = process.env[mapping.spreadsheetEnv];

    if (!spreadsheetId) {
      return undefined;
    }

    try {
      const sheets = google.sheets({ version: "v4", auth });

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${mapping.sheetName}!${mapping.idColumn}:${mapping.programIdColumn}`,
      });

      const rows = response.data.values || [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0] === entityId) {
          return row[1]; // Program ID
        }
      }

      return undefined;
    } catch (error) {
      console.error("[ProgramContextValidator] Error getting program ID:", error);
      return undefined;
    }
  }
}

/**
 * Create a program context validator instance
 */
export function createProgramContextValidator(): ProgramContextValidator {
  return new ProgramContextValidator();
}
