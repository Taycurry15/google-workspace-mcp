/**
 * Program Context Types
 *
 * Types for program context management
 */

/**
 * Program context information
 */
export interface ProgramContext {
  programId: string;
  programName?: string;
  startedAt: Date;
  userId?: string;
  sessionId?: string;
}

/**
 * Entity reference validation result
 */
export interface ValidationResult {
  valid: boolean;
  programId?: string;
  entityId: string;
  entityType: string;
  error?: string;
}

/**
 * Program access record
 */
export interface ProgramAccess {
  programId: string;
  userId: string;
  lastAccessed: Date;
  accessCount: number;
}

/**
 * Cross-program reference check
 */
export interface CrossProgramCheck {
  sourceProgram: string;
  targetProgram: string;
  entityId: string;
  entityType: string;
  allowed: boolean;
  reason?: string;
}
