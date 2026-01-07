/**
 * Lessons Learned Module
 * Handles capturing, searching, and reporting on lessons learned
 * Phase 4 - Week 5 Implementation
 */

import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import type { LessonLearned, ProgramStatus } from "../types/program.js";
import { appendRows, generateNextId, readSheetRange, updateRow } from "../utils/sheetHelpers.js";

const SPREADSHEET_ID = process.env.PROGRAM_SPREADSHEET_ID || "";
const SHEET_NAME = "Lessons Learned";

/**
 * Column mapping for Lessons Learned sheet
 */
const COLUMN_MAP = {
  lessonId: 0,
  programId: 1,
  category: 2,
  lesson: 3,
  context: 4,
  impact: 5,
  recommendation: 6,
  dateRecorded: 7,
  recordedBy: 8,
  phase: 9,
  tags: 10,       // Comma-separated
  positive: 11,
};

/**
 * Parse a row from the sheet into a LessonLearned object
 */
function parseLessonLearned(row: any[]): LessonLearned {
  return {
    lessonId: row[COLUMN_MAP.lessonId] || "",
    programId: row[COLUMN_MAP.programId] || "",
    category: row[COLUMN_MAP.category] as any || "other",
    lesson: row[COLUMN_MAP.lesson] || "",
    context: row[COLUMN_MAP.context] || "",
    impact: row[COLUMN_MAP.impact] || "",
    recommendation: row[COLUMN_MAP.recommendation] || "",
    dateRecorded: row[COLUMN_MAP.dateRecorded]
      ? new Date(row[COLUMN_MAP.dateRecorded])
      : new Date(),
    recordedBy: row[COLUMN_MAP.recordedBy] || "",
    phase: (row[COLUMN_MAP.phase] as ProgramStatus) || "execution",
    tags: row[COLUMN_MAP.tags]
      ? row[COLUMN_MAP.tags].split(",").map((tag: string) => tag.trim()).filter(Boolean)
      : [],
    positive: row[COLUMN_MAP.positive] === "TRUE" || row[COLUMN_MAP.positive] === true,
  };
}

/**
 * Serialize a LessonLearned object to a sheet row
 */
function serializeLessonLearned(lesson: LessonLearned): any[] {
  const row = new Array(Object.keys(COLUMN_MAP).length).fill("");

  row[COLUMN_MAP.lessonId] = lesson.lessonId;
  row[COLUMN_MAP.programId] = lesson.programId;
  row[COLUMN_MAP.category] = lesson.category;
  row[COLUMN_MAP.lesson] = lesson.lesson;
  row[COLUMN_MAP.context] = lesson.context;
  row[COLUMN_MAP.impact] = lesson.impact;
  row[COLUMN_MAP.recommendation] = lesson.recommendation;
  row[COLUMN_MAP.dateRecorded] = lesson.dateRecorded.toISOString().split("T")[0];
  row[COLUMN_MAP.recordedBy] = lesson.recordedBy;
  row[COLUMN_MAP.phase] = lesson.phase;
  row[COLUMN_MAP.tags] = lesson.tags.join(", ");
  row[COLUMN_MAP.positive] = lesson.positive;

  return row;
}

/**
 * Capture a lesson learned
 */
export async function captureLessonLearned(
  auth: OAuth2Client,
  params: {
    programId: string;
    category: "technical" | "process" | "people" | "stakeholder" | "risk" | "other";
    lesson: string;
    context: string;
    impact: string;
    recommendation: string;
    recordedBy: string;
    phase: ProgramStatus;
    tags?: string[];
    positive?: boolean;
  }
): Promise<LessonLearned> {
  const sheets = google.sheets({ version: "v4", auth });

  const lessonId = await generateNextId(sheets, SPREADSHEET_ID, SHEET_NAME, "Lesson ID", "LL");

  const lesson: LessonLearned = {
    lessonId,
    programId: params.programId,
    category: params.category,
    lesson: params.lesson,
    context: params.context,
    impact: params.impact,
    recommendation: params.recommendation,
    dateRecorded: new Date(),
    recordedBy: params.recordedBy,
    phase: params.phase,
    tags: params.tags || [],
    positive: params.positive || false,
  };

  const row = serializeLessonLearned(lesson);
  await appendRows(sheets, SPREADSHEET_ID, SHEET_NAME, [row]);

  return lesson;
}

/**
 * Read a lesson learned by ID
 */
export async function readLessonLearned(
  auth: OAuth2Client,
  lessonId: string
): Promise<LessonLearned | null> {
  const sheets = google.sheets({ version: "v4", auth });
  const range = `${SHEET_NAME}!A2:L`;

  const rows = await readSheetRange(sheets, SPREADSHEET_ID, range);

  const lessonRow = rows.find((row) => row[COLUMN_MAP.lessonId] === lessonId);

  if (!lessonRow) {
    return null;
  }

  return parseLessonLearned(lessonRow);
}

/**
 * Update a lesson learned
 */
export async function updateLessonLearned(
  auth: OAuth2Client,
  lessonId: string,
  updates: Partial<LessonLearned>
): Promise<LessonLearned> {
  const sheets = google.sheets({ version: "v4", auth });

  // Column map for updates (field -> column letter)
  const columnMap: Record<string, string> = {
    category: "C",
    lesson: "D",
    context: "E",
    impact: "F",
    recommendation: "G",
    phase: "J",
    tags: "K",
    positive: "L",
  };

  // Prepare update data (convert types as needed)
  const updateData: Record<string, any> = {};
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.lesson !== undefined) updateData.lesson = updates.lesson;
  if (updates.context !== undefined) updateData.context = updates.context;
  if (updates.impact !== undefined) updateData.impact = updates.impact;
  if (updates.recommendation !== undefined) updateData.recommendation = updates.recommendation;
  if (updates.phase !== undefined) updateData.phase = updates.phase;
  if (updates.tags) updateData.tags = updates.tags.join(", ");
  if (updates.positive !== undefined) updateData.positive = updates.positive;

  await updateRow(
    sheets,
    SPREADSHEET_ID,
    SHEET_NAME,
    "Lesson ID",
    lessonId,
    updateData,
    columnMap
  );

  // Read and return the updated lesson
  const updatedLesson = await readLessonLearned(auth, lessonId);
  if (!updatedLesson) {
    throw new Error(`Failed to read updated lesson: ${lessonId}`);
  }

  return updatedLesson;
}

/**
 * Search lessons learned with filters
 */
export async function searchLessons(
  auth: OAuth2Client,
  filters?: {
    programId?: string;
    category?: LessonLearned["category"];
    phase?: ProgramStatus;
    tags?: string[];
    positive?: boolean;
    searchText?: string; // Search in lesson, context, impact, recommendation
  }
): Promise<LessonLearned[]> {
  const sheets = google.sheets({ version: "v4", auth });
  const range = `${SHEET_NAME}!A2:L`;

  const rows = await readSheetRange(sheets, SPREADSHEET_ID, range);

  let lessons = rows.map(parseLessonLearned);

  // Apply filters
  if (filters?.programId) {
    lessons = lessons.filter((l) => l.programId === filters.programId);
  }
  if (filters?.category) {
    lessons = lessons.filter((l) => l.category === filters.category);
  }
  if (filters?.phase) {
    lessons = lessons.filter((l) => l.phase === filters.phase);
  }
  if (filters?.positive !== undefined) {
    lessons = lessons.filter((l) => l.positive === filters.positive);
  }
  if (filters?.tags && filters.tags.length > 0) {
    lessons = lessons.filter((l) =>
      filters.tags!.some((tag) => l.tags.includes(tag))
    );
  }
  if (filters?.searchText) {
    const searchLower = filters.searchText.toLowerCase();
    lessons = lessons.filter(
      (l) =>
        l.lesson.toLowerCase().includes(searchLower) ||
        l.context.toLowerCase().includes(searchLower) ||
        l.impact.toLowerCase().includes(searchLower) ||
        l.recommendation.toLowerCase().includes(searchLower)
    );
  }

  return lessons;
}

/**
 * Generate lessons learned report
 */
export async function generateLessonsReport(
  auth: OAuth2Client,
  filters?: {
    programId?: string;
    category?: LessonLearned["category"];
    phase?: ProgramStatus;
  }
): Promise<{
  totalLessons: number;
  positiveLessons: number;
  negativeLessons: number;
  categoryBreakdown: Record<LessonLearned["category"], number>;
  phaseBreakdown: Record<ProgramStatus, number>;
  topTags: Array<{ tag: string; count: number }>;
  lessons: LessonLearned[];
}> {
  const lessons = await searchLessons(auth, filters);

  const positiveLessons = lessons.filter((l) => l.positive).length;
  const negativeLessons = lessons.filter((l) => !l.positive).length;

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {
    technical: 0,
    process: 0,
    people: 0,
    stakeholder: 0,
    risk: 0,
    other: 0,
  };

  // Phase breakdown
  const phaseBreakdown: Record<string, number> = {
    initiation: 0,
    planning: 0,
    execution: 0,
    monitoring: 0,
    closing: 0,
    on_hold: 0,
    cancelled: 0,
    completed: 0,
  };

  // Tag frequency
  const tagCounts = new Map<string, number>();

  lessons.forEach((lesson) => {
    categoryBreakdown[lesson.category]++;
    phaseBreakdown[lesson.phase]++;

    lesson.tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  // Top tags (sorted by frequency, top 10)
  const topTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalLessons: lessons.length,
    positiveLessons,
    negativeLessons,
    categoryBreakdown: categoryBreakdown as Record<LessonLearned["category"], number>,
    phaseBreakdown: phaseBreakdown as Record<ProgramStatus, number>,
    topTags,
    lessons,
  };
}

/**
 * Get recent lessons (last N days)
 */
export async function getRecentLessons(
  auth: OAuth2Client,
  programId: string,
  days: number = 30
): Promise<LessonLearned[]> {
  const allLessons = await searchLessons(auth, { programId });

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return allLessons
    .filter((l) => l.dateRecorded >= cutoffDate)
    .sort((a, b) => b.dateRecorded.getTime() - a.dateRecorded.getTime());
}

/**
 * Get lessons by tag
 */
export async function getLessonsByTag(
  auth: OAuth2Client,
  programId: string,
  tag: string
): Promise<LessonLearned[]> {
  return await searchLessons(auth, { programId, tags: [tag] });
}

/**
 * Get positive vs negative lessons summary
 */
export async function getLessonsSummary(
  auth: OAuth2Client,
  programId: string
): Promise<{
  total: number;
  positive: number;
  negative: number;
  positiveRate: number;
  byCategory: Record<LessonLearned["category"], { positive: number; negative: number }>;
}> {
  const lessons = await searchLessons(auth, { programId });

  const byCategory: Record<string, { positive: number; negative: number }> = {
    technical: { positive: 0, negative: 0 },
    process: { positive: 0, negative: 0 },
    people: { positive: 0, negative: 0 },
    stakeholder: { positive: 0, negative: 0 },
    risk: { positive: 0, negative: 0 },
    other: { positive: 0, negative: 0 },
  };

  let positiveCount = 0;
  let negativeCount = 0;

  lessons.forEach((lesson) => {
    if (lesson.positive) {
      positiveCount++;
      byCategory[lesson.category].positive++;
    } else {
      negativeCount++;
      byCategory[lesson.category].negative++;
    }
  });

  const positiveRate = lessons.length > 0 ? (positiveCount / lessons.length) * 100 : 0;

  return {
    total: lessons.length,
    positive: positiveCount,
    negative: negativeCount,
    positiveRate,
    byCategory: byCategory as Record<
      LessonLearned["category"],
      { positive: number; negative: number }
    >,
  };
}
