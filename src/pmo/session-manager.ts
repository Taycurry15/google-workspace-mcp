/**
 * Proposal Session Manager
 * Manages proposal analysis sessions with automatic cleanup
 */

import { ProposalSession, ProposalAnalysis } from "../types/pmo.js";

// In-memory session storage
const sessions = new Map<string, ProposalSession>();

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  const timestamp = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 8);
  return `proposal_${timestamp}_${random}`;
}

/**
 * Create a new proposal session
 * @param analysis The initial proposal analysis (without sessionId)
 * @returns Session ID
 */
export function createSession(
  analysis: Omit<ProposalAnalysis, "sessionId">
): string {
  const sessionId = generateSessionId();
  const now = new Date();
  const timeoutMinutes = parseInt(
    process.env.PMO_SESSION_TIMEOUT_MINUTES || "60",
    10
  );
  const expiresAt = new Date(now.getTime() + timeoutMinutes * 60 * 1000);

  const fullAnalysis: ProposalAnalysis = {
    ...analysis,
    sessionId,
  };

  const session: ProposalSession = {
    sessionId,
    analysis: fullAnalysis,
    createdAt: now,
    expiresAt,
  };

  sessions.set(sessionId, session);

  console.log(
    `Created proposal session ${sessionId}, expires at ${expiresAt.toISOString()}`
  );

  return sessionId;
}

/**
 * Get a session by ID
 * @param sessionId The session ID
 * @returns Session or null if not found/expired
 */
export function getSession(sessionId: string): ProposalSession | null {
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  // Check if expired
  if (new Date() > session.expiresAt) {
    sessions.delete(sessionId);
    console.log(`Session ${sessionId} expired and was removed`);
    return null;
  }

  return session;
}

/**
 * Update a session with new data
 * @param sessionId The session ID
 * @param updates Partial session updates
 */
export function updateSession(
  sessionId: string,
  updates: Partial<Omit<ProposalSession, "sessionId" | "createdAt" | "expiresAt">>
): void {
  const session = getSession(sessionId);

  if (!session) {
    throw new Error(`Session ${sessionId} not found or expired`);
  }

  // If updates include refinedData without sessionId, add it
  if (updates.refinedData && !updates.refinedData.sessionId) {
    updates.refinedData = {
      ...updates.refinedData,
      sessionId,
    };
  }

  // Merge updates
  const updatedSession: ProposalSession = {
    ...session,
    ...updates,
    sessionId, // Ensure sessionId doesn't change
    createdAt: session.createdAt, // Preserve creation time
    expiresAt: session.expiresAt, // Preserve expiry time
  };

  sessions.set(sessionId, updatedSession);

  console.log(`Updated session ${sessionId}`);
}

/**
 * Delete a session
 * @param sessionId The session ID
 */
export function deleteSession(sessionId: string): void {
  const deleted = sessions.delete(sessionId);

  if (deleted) {
    console.log(`Deleted session ${sessionId}`);
  }
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions(): void {
  const now = new Date();
  let count = 0;

  for (const [sessionId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
      count++;
    }
  }

  if (count > 0) {
    console.log(`Cleaned up ${count} expired proposal session(s)`);
  }
}

/**
 * Get all active sessions (for debugging)
 */
export function getActiveSessions(): ProposalSession[] {
  const now = new Date();
  const active: ProposalSession[] = [];

  for (const session of sessions.values()) {
    if (now <= session.expiresAt) {
      active.push(session);
    }
  }

  return active;
}

/**
 * Get session count (for debugging)
 */
export function getSessionCount(): number {
  return sessions.size;
}

// Auto-cleanup every 15 minutes
const cleanupIntervalMs = 15 * 60 * 1000;
setInterval(cleanupExpiredSessions, cleanupIntervalMs);

console.log(
  `Proposal session manager initialized (cleanup every ${cleanupIntervalMs / 1000 / 60} minutes)`
);
