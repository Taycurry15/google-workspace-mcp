/**
 * Program Context Manager
 *
 * Manages active program context across server interactions
 */

import type { ProgramContext, ProgramAccess } from "./types.js";

/**
 * Program context manager
 *
 * Maintains active program context to prevent cross-program data leaks
 *
 * @example
 * const context = new ProgramContextManager();
 * context.setActiveProgram('PROG-001');
 * const programId = context.getActiveProgram(); // 'PROG-001'
 */
export class ProgramContextManager {
  private static instance: ProgramContextManager;
  private activeContexts: Map<string, ProgramContext> = new Map(); // sessionId -> context
  private programAccess: Map<string, ProgramAccess[]> = new Map(); // userId -> accesses
  private defaultSessionId: string = "default";

  private constructor() {
    // Singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ProgramContextManager {
    if (!ProgramContextManager.instance) {
      ProgramContextManager.instance = new ProgramContextManager();
    }
    return ProgramContextManager.instance;
  }

  /**
   * Set active program for current session
   */
  setActiveProgram(
    programId: string,
    options?: {
      programName?: string;
      userId?: string;
      sessionId?: string;
    }
  ): void {
    const sessionId = options?.sessionId || this.defaultSessionId;

    const context: ProgramContext = {
      programId,
      programName: options?.programName,
      startedAt: new Date(),
      userId: options?.userId,
      sessionId,
    };

    this.activeContexts.set(sessionId, context);

    // Track access
    if (options?.userId) {
      this.trackAccess(options.userId, programId);
    }

    console.log(`[ProgramContext] Set active program: ${programId} (session: ${sessionId})`);
  }

  /**
   * Get active program ID for current session
   */
  getActiveProgram(sessionId?: string): string | undefined {
    const sid = sessionId || this.defaultSessionId;
    const context = this.activeContexts.get(sid);
    return context?.programId;
  }

  /**
   * Get active program context
   */
  getActiveContext(sessionId?: string): ProgramContext | undefined {
    const sid = sessionId || this.defaultSessionId;
    return this.activeContexts.get(sid);
  }

  /**
   * Clear active program context
   */
  clearActiveProgram(sessionId?: string): void {
    const sid = sessionId || this.defaultSessionId;
    this.activeContexts.delete(sid);
    console.log(`[ProgramContext] Cleared active program (session: ${sid})`);
  }

  /**
   * Check if program is active
   */
  isProgramActive(programId: string, sessionId?: string): boolean {
    const sid = sessionId || this.defaultSessionId;
    const context = this.activeContexts.get(sid);
    return context?.programId === programId;
  }

  /**
   * Get all active contexts
   */
  getAllActiveContexts(): ProgramContext[] {
    return Array.from(this.activeContexts.values());
  }

  /**
   * Track program access by user
   */
  private trackAccess(userId: string, programId: string): void {
    const userAccess = this.programAccess.get(userId) || [];

    // Find existing access record
    const existing = userAccess.find((a) => a.programId === programId);

    if (existing) {
      existing.lastAccessed = new Date();
      existing.accessCount++;
    } else {
      userAccess.push({
        programId,
        userId,
        lastAccessed: new Date(),
        accessCount: 1,
      });
    }

    this.programAccess.set(userId, userAccess);
  }

  /**
   * Get user's program access history
   */
  getUserAccess(userId: string): ProgramAccess[] {
    return this.programAccess.get(userId) || [];
  }

  /**
   * Get user's recent programs
   */
  getUserRecentPrograms(userId: string, limit: number = 5): string[] {
    const access = this.getUserAccess(userId);
    return access
      .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
      .slice(0, limit)
      .map((a) => a.programId);
  }

  /**
   * Validate programId is active for operation
   */
  validateProgramContext(
    programId: string,
    sessionId?: string
  ): { valid: boolean; error?: string } {
    const sid = sessionId || this.defaultSessionId;
    const activeProgram = this.getActiveProgram(sid);

    if (!activeProgram) {
      return {
        valid: true, // No active context, allow any program
      };
    }

    if (activeProgram !== programId) {
      return {
        valid: false,
        error: `Program context mismatch: active program is ${activeProgram}, but operation requested for ${programId}`,
      };
    }

    return { valid: true };
  }

  /**
   * Switch active program
   */
  switchProgram(
    newProgramId: string,
    options?: {
      programName?: string;
      userId?: string;
      sessionId?: string;
    }
  ): void {
    const sessionId = options?.sessionId || this.defaultSessionId;
    const oldContext = this.activeContexts.get(sessionId);

    if (oldContext) {
      console.log(
        `[ProgramContext] Switching from ${oldContext.programId} to ${newProgramId}`
      );
    }

    this.setActiveProgram(newProgramId, options);
  }

  /**
   * Get context statistics
   */
  getStats(): {
    activeSessions: number;
    uniquePrograms: number;
    totalUsers: number;
  } {
    const uniquePrograms = new Set(
      Array.from(this.activeContexts.values()).map((c) => c.programId)
    );

    return {
      activeSessions: this.activeContexts.size,
      uniquePrograms: uniquePrograms.size,
      totalUsers: this.programAccess.size,
    };
  }

  /**
   * Clear all contexts (for testing)
   */
  clear(): void {
    this.activeContexts.clear();
    this.programAccess.clear();
  }
}

/**
 * Get the singleton program context manager instance
 */
export function getProgramContextManager(): ProgramContextManager {
  return ProgramContextManager.getInstance();
}
