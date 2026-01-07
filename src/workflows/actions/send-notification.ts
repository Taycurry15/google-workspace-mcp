/**
 * Send Notification Action
 *
 * Workflow action for sending notifications via:
 * - Email (Gmail)
 * - Calendar events
 * - Tasks (Google Tasks)
 *
 * Phase 5 Implementation
 */

import type { ExecutionContext, ActionExecution } from "../../types/workflows.js";
import type { NotificationActionConfig } from "../../types/workflows.js";
import { google } from "googleapis";

/**
 * Send email notification via Gmail
 */
async function sendEmail(
  auth: any,
  config: NotificationActionConfig,
  context: ExecutionContext
): Promise<any> {
  const gmail = google.gmail({ version: "v1", auth });

  // Interpolate variables in subject and body
  const subject = interpolateVariables(config.subject, context);
  const body = interpolateVariables(config.body, context);

  // Build email message
  const message = [
    `To: ${config.recipients.join(", ")}`,
    config.cc ? `Cc: ${config.cc.join(", ")}` : "",
    config.bcc ? `Bcc: ${config.bcc.join(", ")}` : "",
    `Subject: ${subject}`,
    "",
    body,
  ]
    .filter(Boolean)
    .join("\n");

  // Base64 encode the message
  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Send email
  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });

  return {
    messageId: result.data.id,
    recipients: config.recipients,
    subject,
  };
}

/**
 * Create calendar event
 */
async function createCalendarEvent(
  auth: any,
  config: any,
  context: ExecutionContext
): Promise<any> {
  const calendar = google.calendar({ version: "v3", auth });

  const summary = interpolateVariables(config.summary || config.subject, context);
  const description = interpolateVariables(config.description || config.body, context);

  const event = {
    summary,
    description,
    start: {
      dateTime: config.startTime || new Date().toISOString(),
      timeZone: config.timeZone || "America/New_York",
    },
    end: {
      dateTime:
        config.endTime ||
        new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      timeZone: config.timeZone || "America/New_York",
    },
    attendees: config.recipients.map((email: string) => ({ email })),
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 30 },
      ],
    },
  };

  const result = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
  });

  return {
    eventId: result.data.id,
    htmlLink: result.data.htmlLink,
    summary,
  };
}

/**
 * Create Google Task
 */
async function createTask(
  auth: any,
  config: any,
  context: ExecutionContext
): Promise<any> {
  const tasks = google.tasks({ version: "v1", auth });

  const title = interpolateVariables(config.title || config.subject, context);
  const notes = interpolateVariables(config.notes || config.body, context);

  // Get default task list
  const taskLists = await tasks.tasklists.list();
  const defaultList = taskLists.data.items?.[0]?.id;

  if (!defaultList) {
    throw new Error("No task list found");
  }

  const task = {
    title,
    notes,
    due: config.dueDate,
  };

  const result = await tasks.tasks.insert({
    tasklist: defaultList,
    requestBody: task,
  });

  return {
    taskId: result.data.id,
    title,
  };
}

/**
 * Interpolate variables in text
 * Replaces {{variable.path}} with values from context
 */
function interpolateVariables(text: string, context: ExecutionContext): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(context.variables, path.trim());
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Send Notification Action Handler
 */
export async function sendNotificationAction(
  auth: any,
  config: NotificationActionConfig,
  context: ExecutionContext
): Promise<any> {
  switch (config.type) {
    case "email":
      return sendEmail(auth, config, context);

    case "calendar":
      return createCalendarEvent(auth, config, context);

    case "task":
      return createTask(auth, config, context);

    default:
      throw new Error(`Unsupported notification type: ${config.type}`);
  }
}

/**
 * Action metadata for registration
 */
export const actionMetadata = {
  type: "send_notification",
  name: "Send Notification",
  description: "Send email, calendar event, or task notification",
  handler: sendNotificationAction,
};
