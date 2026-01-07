/**
 * Deliverable Status Tracking
 *
 * Handles deliverable status tracking including:
 * - Status change logging
 * - Progress tracking
 * - Forecast management
 * - Trend analysis
 * - Notification queue management
 */

import type { sheets_v4 } from "googleapis";
import type {
  DeliverableTrackingEntry,
  DeliverableForecast,
  DeliverableNotification,
  Deliverable,
  DeliverableStatus,
} from "../types/deliverable.js";
import {
  readSheetRange,
  appendRows,
  updateRow,
  generateNextId,
} from "../utils/sheetHelpers.js";
import { readDeliverable, listDeliverables } from "./deliverables.js";

/**
 * Column mapping for Tracking sheet
 */
export const TRACKING_COLUMNS = {
  trackingId: "A",
  deliverableId: "B",
  timestamp: "C",
  status: "D",
  percentComplete: "E",
  forecastDate: "F",
  notes: "G",
  recordedBy: "H",
};

/**
 * Column mapping for Notifications sheet
 */
export const NOTIFICATION_COLUMNS = {
  notificationId: "A",
  deliverableId: "B",
  type: "C",
  recipient: "D",
  subject: "E",
  message: "F",
  priority: "G",
  status: "H",
  scheduledDate: "I",
  sentDate: "J",
  method: "K",
};

const TRACKING_SHEET = "Deliverable Tracking";
const NOTIFICATIONS_SHEET = "Notifications";

/**
 * Track a status change for a deliverable
 */
export async function trackStatus(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  deliverableId: string,
  status: DeliverableStatus,
  percentComplete: number,
  forecastDate: Date | undefined,
  notes: string,
  recordedBy: string,
  changes: Record<string, any> = {}
): Promise<DeliverableTrackingEntry> {
  try {
    const trackingId = await generateNextId(
      sheets,
      spreadsheetId,
      TRACKING_SHEET,
      "Tracking ID",
      "TRK"
    );

    const entry: DeliverableTrackingEntry = {
      trackingId,
      deliverableId,
      timestamp: new Date(),
      status,
      percentComplete,
      forecastDate,
      notes,
      recordedBy,
      changes,
    };

    const row = [
      entry.trackingId,
      entry.deliverableId,
      entry.timestamp.toISOString(),
      entry.status,
      entry.percentComplete,
      entry.forecastDate ? entry.forecastDate.toISOString().split("T")[0] : "",
      entry.notes,
      entry.recordedBy,
    ];

    await appendRows(sheets, spreadsheetId, `${TRACKING_SHEET}!A:H`, [row]);

    return entry;
  } catch (error) {
    throw new Error(
      `Failed to track status: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get tracking history for a deliverable
 */
export async function getTrackingHistory(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  deliverableId: string
): Promise<DeliverableTrackingEntry[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${TRACKING_SHEET}!A:H`
    );

    if (data.length <= 1) {
      return [];
    }

    const entries: DeliverableTrackingEntry[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === deliverableId) {
        entries.push({
          trackingId: row[0],
          deliverableId: row[1],
          timestamp: new Date(row[2]),
          status: row[3] as DeliverableStatus,
          percentComplete: parseFloat(row[4]) || 0,
          forecastDate: row[5] ? new Date(row[5]) : undefined,
          notes: row[6] || "",
          recordedBy: row[7] || "",
          changes: {},
        });
      }
    }

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return entries;
  } catch (error) {
    throw new Error(
      `Failed to get tracking history: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update deliverable forecast
 */
export async function updateForecast(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  deliverableId: string,
  newForecast: Date,
  confidence: number,
  factors: string[],
  updatedBy: string
): Promise<DeliverableForecast> {
  try {
    const deliverable = await readDeliverable(
      sheets,
      spreadsheetId,
      deliverableId
    );

    if (!deliverable) {
      throw new Error("Deliverable not found");
    }

    // Calculate variance
    const variance = Math.floor(
      (newForecast.getTime() - deliverable.dueDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Determine trend by comparing with previous forecast
    const history = await getTrackingHistory(sheets, spreadsheetId, deliverableId);
    let trend: "improving" | "stable" | "degrading" = "stable";

    if (history.length > 0) {
      const lastEntry = history[history.length - 1];
      if (lastEntry.forecastDate) {
        const previousVariance = Math.floor(
          (lastEntry.forecastDate.getTime() - deliverable.dueDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (variance < previousVariance) {
          trend = "improving";
        } else if (variance > previousVariance) {
          trend = "degrading";
        }
      }
    }

    const forecast: DeliverableForecast = {
      deliverableId,
      currentForecast: newForecast,
      originalDueDate: deliverable.dueDate,
      variance,
      confidence,
      trend,
      factors,
      lastUpdated: new Date(),
      updatedBy,
    };

    // Track this forecast update
    await trackStatus(
      sheets,
      spreadsheetId,
      deliverableId,
      deliverable.status,
      deliverable.percentComplete,
      newForecast,
      `Forecast updated: ${factors.join(", ")}`,
      updatedBy,
      { forecastVariance: variance, trend, confidence }
    );

    return forecast;
  } catch (error) {
    throw new Error(
      `Failed to update forecast: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get current forecast for a deliverable
 */
export async function getCurrentForecast(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  deliverableId: string
): Promise<DeliverableForecast | null> {
  try {
    const deliverable = await readDeliverable(
      sheets,
      spreadsheetId,
      deliverableId
    );

    if (!deliverable) {
      return null;
    }

    if (!deliverable.forecastDate) {
      return null;
    }

    const history = await getTrackingHistory(sheets, spreadsheetId, deliverableId);

    // Calculate trend from history
    let trend: "improving" | "stable" | "degrading" = "stable";
    if (history.length >= 2) {
      const recent = history.slice(-3);
      const variances = recent
        .filter((h) => h.forecastDate)
        .map((h) => {
          const forecast = h.forecastDate!;
          return Math.floor(
            (forecast.getTime() - deliverable.dueDate.getTime()) /
              (1000 * 60 * 60 * 24)
          );
        });

      if (variances.length >= 2) {
        const avgChange =
          variances.reduce((sum, v, i) => {
            if (i === 0) return 0;
            return sum + (v - variances[i - 1]);
          }, 0) /
          (variances.length - 1);

        if (avgChange < -1) {
          trend = "improving";
        } else if (avgChange > 1) {
          trend = "degrading";
        }
      }
    }

    const variance = deliverable.variance || 0;

    return {
      deliverableId,
      currentForecast: deliverable.forecastDate,
      originalDueDate: deliverable.dueDate,
      variance,
      confidence: 70, // Default confidence
      trend,
      factors: [],
      lastUpdated: deliverable.modifiedDate,
      updatedBy: deliverable.modifiedBy,
    };
  } catch (error) {
    throw new Error(
      `Failed to get current forecast: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Queue a notification
 */
export async function queueNotification(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  notification: Omit<DeliverableNotification, "notificationId">
): Promise<DeliverableNotification> {
  try {
    const notificationId = await generateNextId(
      sheets,
      spreadsheetId,
      NOTIFICATIONS_SHEET,
      "Notification ID",
      "NOT"
    );

    const fullNotification: DeliverableNotification = {
      ...notification,
      notificationId,
    };

    const row = [
      fullNotification.notificationId,
      fullNotification.deliverableId,
      fullNotification.type,
      fullNotification.recipient,
      fullNotification.subject,
      fullNotification.message,
      fullNotification.priority,
      fullNotification.status,
      fullNotification.scheduledDate.toISOString(),
      fullNotification.sentDate ? fullNotification.sentDate.toISOString() : "",
      fullNotification.method,
    ];

    await appendRows(sheets, spreadsheetId, `${NOTIFICATIONS_SHEET}!A:K`, [row]);

    return fullNotification;
  } catch (error) {
    throw new Error(
      `Failed to queue notification: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get pending notifications
 */
export async function getPendingNotifications(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<DeliverableNotification[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${NOTIFICATIONS_SHEET}!A:K`
    );

    if (data.length <= 1) {
      return [];
    }

    const notifications: DeliverableNotification[] = [];
    const now = new Date();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[7] === "pending") {
        const scheduledDate = new Date(row[8]);
        if (scheduledDate <= now) {
          notifications.push({
            notificationId: row[0],
            deliverableId: row[1],
            type: row[2] as any,
            recipient: row[3],
            subject: row[4],
            message: row[5],
            priority: row[6] as any,
            status: "pending",
            scheduledDate,
            sentDate: row[9] ? new Date(row[9]) : undefined,
            method: row[10] as any,
            metadata: {},
          });
        }
      }
    }

    // Sort by priority (high first) then scheduled date
    notifications.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return a.scheduledDate.getTime() - b.scheduledDate.getTime();
    });

    return notifications;
  } catch (error) {
    throw new Error(
      `Failed to get pending notifications: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Mark notification as sent
 */
export async function markNotificationSent(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  notificationId: string
): Promise<void> {
  try {
    await updateRow(
      sheets,
      spreadsheetId,
      NOTIFICATIONS_SHEET,
      "Notification ID",
      notificationId,
      {
        status: "sent",
        sentDate: new Date().toISOString(),
      },
      NOTIFICATION_COLUMNS
    );
  } catch (error) {
    throw new Error(
      `Failed to mark notification as sent: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create overdue notification for a deliverable
 */
export async function createOverdueNotification(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  deliverable: Deliverable
): Promise<DeliverableNotification> {
  const daysOverdue = Math.floor(
    (new Date().getTime() - deliverable.dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return await queueNotification(sheets, spreadsheetId, {
    deliverableId: deliverable.deliverableId,
    type: "overdue",
    recipient: deliverable.owner,
    subject: `Deliverable Overdue: ${deliverable.name}`,
    message: `Deliverable "${deliverable.name}" (${deliverable.deliverableId}) is ${daysOverdue} days overdue. Due date was ${deliverable.dueDate.toDateString()}.`,
    priority: "high",
    status: "pending",
    scheduledDate: new Date(),
    method: "email",
    metadata: {
      daysOverdue,
      deliverableName: deliverable.name,
    },
  });
}

/**
 * Create reminder notification for upcoming deliverable
 */
export async function createReminderNotification(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  deliverable: Deliverable,
  daysUntilDue: number
): Promise<DeliverableNotification> {
  return await queueNotification(sheets, spreadsheetId, {
    deliverableId: deliverable.deliverableId,
    type: "reminder",
    recipient: deliverable.owner,
    subject: `Deliverable Due Soon: ${deliverable.name}`,
    message: `Deliverable "${deliverable.name}" (${deliverable.deliverableId}) is due in ${daysUntilDue} days on ${deliverable.dueDate.toDateString()}.`,
    priority: daysUntilDue <= 3 ? "high" : "normal",
    status: "pending",
    scheduledDate: new Date(),
    method: "email",
    metadata: {
      daysUntilDue,
      deliverableName: deliverable.name,
    },
  });
}

/**
 * Check for deliverables needing notifications
 */
export async function checkAndQueueNotifications(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  programId: string
): Promise<{
  overdueNotifications: number;
  reminderNotifications: number;
}> {
  try {
    const deliverables = await listDeliverables(sheets, spreadsheetId, {
      programId,
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let overdueCount = 0;
    let reminderCount = 0;

    for (const deliverable of deliverables) {
      // Skip completed/approved deliverables
      if (
        deliverable.status === "completed" ||
        deliverable.status === "approved"
      ) {
        continue;
      }

      const dueDate = new Date(deliverable.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const daysUntilDue = Math.floor(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if overdue
      if (daysUntilDue < 0) {
        await createOverdueNotification(sheets, spreadsheetId, deliverable);
        overdueCount++;
      }
      // Check if due soon (7, 3, or 1 day reminders)
      else if (daysUntilDue === 7 || daysUntilDue === 3 || daysUntilDue === 1) {
        await createReminderNotification(
          sheets,
          spreadsheetId,
          deliverable,
          daysUntilDue
        );
        reminderCount++;
      }
    }

    return {
      overdueNotifications: overdueCount,
      reminderNotifications: reminderCount,
    };
  } catch (error) {
    throw new Error(
      `Failed to check and queue notifications: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
