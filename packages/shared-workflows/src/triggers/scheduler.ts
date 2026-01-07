/**
 * Workflow Scheduler
 *
 * Handles schedule-based workflow triggers including:
 * - Cron-like scheduling
 * - Interval-based scheduling
 * - Next run calculation
 * - Automatic rescheduling
 * - Timezone support
 *
 * Phase 5 Implementation
 */

import type {
  WorkflowDefinition,
  WorkflowSchedule,
  ScheduleTrigger,
  ExecutionContext,
} from "../types/workflows.js";

import { WorkflowEngine } from "../engine/engine.js";

/**
 * Cron expression parser
 * Supports basic cron format: minute hour day month weekday
 * Example: "0 9 * * 1" = Every Monday at 9:00 AM
 */
interface CronParts {
  minute: number | "*";
  hour: number | "*";
  dayOfMonth: number | "*";
  month: number | "*";
  dayOfWeek: number | "*";
}

/**
 * Workflow Scheduler
 * Manages scheduled workflow executions
 */
export class WorkflowScheduler {
  private engine: WorkflowEngine;
  private schedules: Map<string, WorkflowSchedule> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(engine: WorkflowEngine) {
    this.engine = engine;
  }

  /**
   * Schedule a workflow
   */
  scheduleWorkflow(workflow: WorkflowDefinition): void {
    if (workflow.trigger.type !== "schedule") {
      throw new Error(`Workflow ${workflow.workflowId} does not have a schedule trigger`);
    }

    if (!workflow.trigger.schedule) {
      throw new Error(`Workflow ${workflow.workflowId} is missing schedule configuration`);
    }

    const schedule: WorkflowSchedule = {
      scheduleId: `sched-${workflow.workflowId}`,
      workflowId: workflow.workflowId,
      enabled: workflow.enabled,
      schedule: workflow.trigger.schedule,
      runCount: 0,
    };

    // Calculate next run time
    schedule.nextRun = this.calculateNextRun(workflow.trigger.schedule);

    this.schedules.set(workflow.workflowId, schedule);

    if (schedule.enabled && schedule.nextRun) {
      this.setTimer(workflow, schedule);
    }
  }

  /**
   * Unschedule a workflow
   */
  unscheduleWorkflow(workflowId: string): void {
    const timer = this.timers.get(workflowId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(workflowId);
    }
    this.schedules.delete(workflowId);
  }

  /**
   * Enable a scheduled workflow
   */
  enableSchedule(workflowId: string): void {
    const schedule = this.schedules.get(workflowId);
    if (!schedule) {
      throw new Error(`No schedule found for workflow ${workflowId}`);
    }

    schedule.enabled = true;
    schedule.nextRun = this.calculateNextRun(schedule.schedule);

    if (schedule.nextRun) {
      const workflow = this.engine.getWorkflow(workflowId);
      if (workflow) {
        this.setTimer(workflow, schedule);
      }
    }
  }

  /**
   * Disable a scheduled workflow
   */
  disableSchedule(workflowId: string): void {
    const schedule = this.schedules.get(workflowId);
    if (schedule) {
      schedule.enabled = false;
    }

    const timer = this.timers.get(workflowId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(workflowId);
    }
  }

  /**
   * Get schedule for a workflow
   */
  getSchedule(workflowId: string): WorkflowSchedule | undefined {
    return this.schedules.get(workflowId);
  }

  /**
   * List all schedules
   */
  listSchedules(): WorkflowSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Calculate next run time based on schedule
   */
  private calculateNextRun(schedule: ScheduleTrigger): Date | undefined {
    const now = new Date();

    // Handle interval-based scheduling
    if (schedule.interval) {
      const ms = this.intervalToMilliseconds(
        schedule.interval.value,
        schedule.interval.unit
      );
      return new Date(now.getTime() + ms);
    }

    // Handle cron-based scheduling
    if (schedule.cron) {
      return this.calculateNextCronRun(schedule.cron, now, schedule.timezone);
    }

    return undefined;
  }

  /**
   * Convert interval to milliseconds
   */
  private intervalToMilliseconds(value: number, unit: string): number {
    switch (unit) {
      case "minutes":
        return value * 60 * 1000;
      case "hours":
        return value * 60 * 60 * 1000;
      case "days":
        return value * 24 * 60 * 60 * 1000;
      case "weeks":
        return value * 7 * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unknown interval unit: ${unit}`);
    }
  }

  /**
   * Calculate next cron run time
   * Simplified cron parser supporting: minute hour day month weekday
   * Format: "0 9 * * 1" = Monday at 9:00 AM
   */
  private calculateNextCronRun(
    cron: string,
    fromDate: Date,
    timezone?: string
  ): Date {
    const parts = this.parseCron(cron);
    const next = new Date(fromDate);

    // Start from next minute
    next.setSeconds(0);
    next.setMilliseconds(0);
    next.setMinutes(next.getMinutes() + 1);

    // Find next matching time (max 1000 iterations to prevent infinite loop)
    for (let i = 0; i < 1000; i++) {
      if (this.cronMatches(parts, next)) {
        return next;
      }

      // Increment by 1 minute
      next.setMinutes(next.getMinutes() + 1);
    }

    throw new Error(`Could not calculate next run for cron: ${cron}`);
  }

  /**
   * Parse cron expression
   */
  private parseCron(cron: string): CronParts {
    const parts = cron.trim().split(/\s+/);

    if (parts.length !== 5) {
      throw new Error(
        `Invalid cron expression: ${cron}. Expected format: minute hour day month weekday`
      );
    }

    return {
      minute: parts[0] === "*" ? "*" : parseInt(parts[0], 10),
      hour: parts[1] === "*" ? "*" : parseInt(parts[1], 10),
      dayOfMonth: parts[2] === "*" ? "*" : parseInt(parts[2], 10),
      month: parts[3] === "*" ? "*" : parseInt(parts[3], 10),
      dayOfWeek: parts[4] === "*" ? "*" : parseInt(parts[4], 10),
    };
  }

  /**
   * Check if date matches cron expression
   */
  private cronMatches(parts: CronParts, date: Date): boolean {
    if (parts.minute !== "*" && date.getMinutes() !== parts.minute) {
      return false;
    }

    if (parts.hour !== "*" && date.getHours() !== parts.hour) {
      return false;
    }

    if (parts.dayOfMonth !== "*" && date.getDate() !== parts.dayOfMonth) {
      return false;
    }

    if (parts.month !== "*" && date.getMonth() + 1 !== parts.month) {
      return false;
    }

    if (parts.dayOfWeek !== "*" && date.getDay() !== parts.dayOfWeek) {
      return false;
    }

    return true;
  }

  /**
   * Set timer for next workflow execution
   */
  private setTimer(workflow: WorkflowDefinition, schedule: WorkflowSchedule): void {
    // Clear existing timer
    const existingTimer = this.timers.get(workflow.workflowId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    if (!schedule.nextRun) {
      return;
    }

    const delay = schedule.nextRun.getTime() - Date.now();

    // Don't set timer if delay is negative (already passed)
    if (delay <= 0) {
      // Recalculate next run
      schedule.nextRun = this.calculateNextRun(schedule.schedule);
      if (schedule.nextRun) {
        this.setTimer(workflow, schedule);
      }
      return;
    }

    // Set timer (max timeout is ~24.8 days, so we need to handle longer delays)
    const MAX_TIMEOUT = 2147483647; // Max 32-bit signed integer
    const actualDelay = Math.min(delay, MAX_TIMEOUT);

    const timer = setTimeout(() => {
      this.executeScheduledWorkflow(workflow, schedule);
    }, actualDelay);

    this.timers.set(workflow.workflowId, timer);
  }

  /**
   * Execute scheduled workflow
   */
  private async executeScheduledWorkflow(
    workflow: WorkflowDefinition,
    schedule: WorkflowSchedule
  ): Promise<void> {
    try {
      // Update schedule metadata
      schedule.lastRun = new Date();
      schedule.runCount++;

      // Create execution context
      const context: ExecutionContext = {
        variables: {
          scheduledRun: true,
          scheduleId: schedule.scheduleId,
        },
      };

      // Execute workflow
      await this.engine.executeWorkflow(workflow.workflowId, context, "system");

      // Calculate next run
      schedule.nextRun = this.calculateNextRun(schedule.schedule);

      // Reschedule if enabled
      if (schedule.enabled && schedule.nextRun) {
        this.setTimer(workflow, schedule);
      }
    } catch (error) {
      console.error(
        `Error executing scheduled workflow ${workflow.workflowId}:`,
        error
      );

      // Still reschedule on error (workflow should handle its own errors)
      schedule.nextRun = this.calculateNextRun(schedule.schedule);
      if (schedule.enabled && schedule.nextRun) {
        this.setTimer(workflow, schedule);
      }
    }
  }

  /**
   * Clear all schedules and timers
   */
  clearAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.schedules.clear();
  }

  /**
   * Get next scheduled runs (useful for debugging)
   */
  getUpcomingRuns(limit: number = 10): Array<{
    workflowId: string;
    workflowName: string;
    nextRun: Date;
  }> {
    const schedules = Array.from(this.schedules.values())
      .filter((s) => s.enabled && s.nextRun)
      .sort((a, b) => {
        if (!a.nextRun || !b.nextRun) return 0;
        return a.nextRun.getTime() - b.nextRun.getTime();
      })
      .slice(0, limit);

    return schedules.map((s) => {
      const workflow = this.engine.getWorkflow(s.workflowId);
      return {
        workflowId: s.workflowId,
        workflowName: workflow?.name || "Unknown",
        nextRun: s.nextRun!,
      };
    });
  }
}
