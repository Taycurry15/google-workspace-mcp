/**
 * Quality Checklist Management
 *
 * Handles quality checklists and evaluation for deliverables including:
 * - Creating and managing quality checklists
 * - Evaluating deliverables against checklists
 * - Calculating quality scores
 * - Tracking quality criteria compliance
 */

import type { sheets_v4 } from "googleapis";
import type {
  QualityChecklist,
  QualityCriterion,
  QualityChecklistResult,
  CriterionResult,
  DeliverableType,
} from "@gw-mcp/shared-core";
import {
  readSheetRange,
  appendRows,
  updateRow,
  findRowById,
  generateNextId,
} from "@gw-mcp/shared-core";

/**
 * Column mapping for Quality Checklists sheet
 */
export const CHECKLIST_COLUMNS = {
  checklistId: "A",
  name: "B",
  description: "C",
  deliverableType: "D",
  createdBy: "E",
  createdDate: "F",
  active: "G",
};

/**
 * Column mapping for Checklist Results sheet
 */
export const CHECKLIST_RESULT_COLUMNS = {
  resultId: "A",
  checklistId: "B",
  deliverableId: "C",
  reviewId: "D",
  evaluatedBy: "E",
  evaluatedDate: "F",
  overallScore: "G",
  passed: "H",
  comments: "I",
};

const CHECKLISTS_SHEET = "Quality Checklists";
const CHECKLIST_RESULTS_SHEET = "Quality Checklist Results";

/**
 * Default quality criteria for different deliverable types
 */
export const DEFAULT_QUALITY_CRITERIA: Record<
  DeliverableType,
  Omit<QualityCriterion, "criterionId">[]
> = {
  document: [
    {
      name: "Completeness",
      description: "All required sections are present and complete",
      category: "completeness",
      required: true,
      weight: 10,
      guidance: "Check that all sections from the template are included",
    },
    {
      name: "Accuracy",
      description: "Information is accurate and factually correct",
      category: "accuracy",
      required: true,
      weight: 10,
      guidance: "Verify facts, figures, and references",
    },
    {
      name: "Clarity",
      description: "Content is clear, concise, and well-organized",
      category: "clarity",
      required: true,
      weight: 8,
      guidance: "Check for logical flow and readability",
    },
    {
      name: "Formatting",
      description: "Document follows formatting standards",
      category: "quality",
      required: false,
      weight: 5,
      guidance: "Check headers, fonts, spacing, and styles",
    },
    {
      name: "Grammar and Spelling",
      description: "No grammatical or spelling errors",
      category: "quality",
      required: false,
      weight: 5,
      guidance: "Run spell check and grammar check",
    },
  ],
  design: [
    {
      name: "Requirements Coverage",
      description: "Design addresses all requirements",
      category: "completeness",
      required: true,
      weight: 10,
      guidance: "Trace design elements back to requirements",
    },
    {
      name: "Technical Feasibility",
      description: "Design is technically feasible and implementable",
      category: "accuracy",
      required: true,
      weight: 10,
      guidance: "Verify technical approach is sound",
    },
    {
      name: "Scalability",
      description: "Design can scale to meet future needs",
      category: "quality",
      required: true,
      weight: 8,
      guidance: "Consider growth and expansion scenarios",
    },
    {
      name: "Standards Compliance",
      description: "Follows industry and organizational standards",
      category: "compliance",
      required: true,
      weight: 8,
      guidance: "Check against applicable standards",
    },
    {
      name: "Documentation Quality",
      description: "Design is well-documented with clear diagrams",
      category: "clarity",
      required: false,
      weight: 6,
      guidance: "Assess clarity of diagrams and explanations",
    },
  ],
  software: [
    {
      name: "Functionality",
      description: "Software meets all functional requirements",
      category: "completeness",
      required: true,
      weight: 10,
      guidance: "Test all required features",
    },
    {
      name: "Code Quality",
      description: "Code follows best practices and standards",
      category: "quality",
      required: true,
      weight: 9,
      guidance: "Review code for maintainability and readability",
    },
    {
      name: "Testing Coverage",
      description: "Adequate unit and integration tests",
      category: "quality",
      required: true,
      weight: 9,
      guidance: "Check test coverage metrics",
    },
    {
      name: "Security",
      description: "No security vulnerabilities",
      category: "compliance",
      required: true,
      weight: 10,
      guidance: "Run security scans and review for vulnerabilities",
    },
    {
      name: "Performance",
      description: "Meets performance requirements",
      category: "quality",
      required: false,
      weight: 7,
      guidance: "Run performance tests",
    },
  ],
  hardware: [
    {
      name: "Specifications Met",
      description: "Hardware meets all specifications",
      category: "completeness",
      required: true,
      weight: 10,
      guidance: "Verify against spec sheet",
    },
    {
      name: "Quality Testing",
      description: "Passed all quality tests",
      category: "quality",
      required: true,
      weight: 10,
      guidance: "Review test results",
    },
    {
      name: "Documentation",
      description: "Complete documentation and manuals",
      category: "completeness",
      required: true,
      weight: 7,
      guidance: "Check user manuals and technical docs",
    },
    {
      name: "Safety Compliance",
      description: "Meets safety standards",
      category: "compliance",
      required: true,
      weight: 10,
      guidance: "Verify safety certifications",
    },
  ],
  training: [
    {
      name: "Learning Objectives",
      description: "Clear and measurable learning objectives",
      category: "completeness",
      required: true,
      weight: 9,
      guidance: "Check that objectives are SMART",
    },
    {
      name: "Content Quality",
      description: "Content is accurate and relevant",
      category: "accuracy",
      required: true,
      weight: 10,
      guidance: "Verify content accuracy and relevance",
    },
    {
      name: "Engagement",
      description: "Materials are engaging and interactive",
      category: "quality",
      required: false,
      weight: 7,
      guidance: "Assess engagement strategies",
    },
    {
      name: "Assessment Methods",
      description: "Appropriate methods to assess learning",
      category: "completeness",
      required: true,
      weight: 8,
      guidance: "Review quizzes, exercises, and evaluations",
    },
  ],
  report: [
    {
      name: "Executive Summary",
      description: "Clear executive summary present",
      category: "completeness",
      required: true,
      weight: 8,
      guidance: "Check for concise executive summary",
    },
    {
      name: "Data Accuracy",
      description: "All data and statistics are accurate",
      category: "accuracy",
      required: true,
      weight: 10,
      guidance: "Verify data sources and calculations",
    },
    {
      name: "Analysis Quality",
      description: "Thorough and insightful analysis",
      category: "quality",
      required: true,
      weight: 9,
      guidance: "Assess depth and quality of analysis",
    },
    {
      name: "Recommendations",
      description: "Clear, actionable recommendations",
      category: "completeness",
      required: true,
      weight: 8,
      guidance: "Check that recommendations are specific and actionable",
    },
  ],
  presentation: [
    {
      name: "Content Coverage",
      description: "All required topics covered",
      category: "completeness",
      required: true,
      weight: 9,
      guidance: "Verify all topics are addressed",
    },
    {
      name: "Visual Design",
      description: "Professional and consistent design",
      category: "quality",
      required: false,
      weight: 7,
      guidance: "Check slide design and formatting",
    },
    {
      name: "Clarity",
      description: "Clear and easy to understand",
      category: "clarity",
      required: true,
      weight: 9,
      guidance: "Assess clarity of message",
    },
  ],
  prototype: [
    {
      name: "Functionality",
      description: "Demonstrates key functionality",
      category: "completeness",
      required: true,
      weight: 10,
      guidance: "Test core features",
    },
    {
      name: "Usability",
      description: "Easy to use and understand",
      category: "quality",
      required: true,
      weight: 8,
      guidance: "Conduct usability testing",
    },
    {
      name: "Technical Viability",
      description: "Demonstrates technical feasibility",
      category: "accuracy",
      required: true,
      weight: 9,
      guidance: "Assess technical approach",
    },
  ],
  data: [
    {
      name: "Data Quality",
      description: "Data is accurate and complete",
      category: "accuracy",
      required: true,
      weight: 10,
      guidance: "Check for errors, duplicates, and completeness",
    },
    {
      name: "Data Format",
      description: "Data follows specified format",
      category: "compliance",
      required: true,
      weight: 9,
      guidance: "Verify format compliance",
    },
    {
      name: "Documentation",
      description: "Data dictionary and documentation provided",
      category: "completeness",
      required: true,
      weight: 8,
      guidance: "Check for data dictionary and metadata",
    },
  ],
  other: [
    {
      name: "Requirements Met",
      description: "Deliverable meets stated requirements",
      category: "completeness",
      required: true,
      weight: 10,
      guidance: "Verify against requirements",
    },
    {
      name: "Quality Standards",
      description: "Meets quality standards",
      category: "quality",
      required: true,
      weight: 9,
      guidance: "Assess overall quality",
    },
  ],
};

/**
 * Create a quality checklist
 */
export async function createQualityChecklist(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  name: string,
  description: string,
  deliverableType: DeliverableType | null,
  criteria: Omit<QualityCriterion, "criterionId">[],
  createdBy: string
): Promise<QualityChecklist> {
  try {
    const checklistId = await generateNextId(
      sheets,
      spreadsheetId,
      CHECKLISTS_SHEET,
      "Checklist ID",
      "QC"
    );

    // Add criterion IDs
    const criteriaWithIds: QualityCriterion[] = criteria.map((c, index) => ({
      ...c,
      criterionId: `${checklistId}-C${String(index + 1).padStart(3, "0")}`,
    }));

    const checklist: QualityChecklist = {
      checklistId,
      name,
      description,
      deliverableType: deliverableType || undefined,
      criteria: criteriaWithIds,
      createdBy,
      createdDate: new Date(),
      active: true,
    };

    // Save checklist header to sheet
    const headerRow = [
      checklist.checklistId,
      checklist.name,
      checklist.description,
      checklist.deliverableType || "all",
      checklist.createdBy,
      checklist.createdDate.toISOString(),
      "TRUE",
    ];

    await appendRows(sheets, spreadsheetId, `${CHECKLISTS_SHEET}!A:G`, [
      headerRow,
    ]);

    // Save criteria (in practice, these might go to a separate sheet)
    // For now, we'll store them as JSON in the description field
    // In a production system, you'd want a separate Criteria sheet

    return checklist;
  } catch (error) {
    throw new Error(
      `Failed to create quality checklist: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get checklist for deliverable type
 */
export async function getChecklistForType(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  deliverableType: DeliverableType
): Promise<QualityChecklist | null> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${CHECKLISTS_SHEET}!A:G`
    );

    if (data.length <= 1) {
      return null;
    }

    // Find active checklist for this type
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (
        (row[3] === deliverableType || row[3] === "all") &&
        (row[6] === "TRUE" || row[6] === true)
      ) {
        // Use default criteria for this type
        const criteria: QualityCriterion[] = (
          DEFAULT_QUALITY_CRITERIA[deliverableType] || []
        ).map((c, index) => ({
          ...c,
          criterionId: `${row[0]}-C${String(index + 1).padStart(3, "0")}`,
        }));

        return {
          checklistId: row[0],
          name: row[1],
          description: row[2],
          deliverableType: row[3] === "all" ? undefined : (row[3] as DeliverableType),
          criteria,
          createdBy: row[4],
          createdDate: new Date(row[5]),
          active: row[6] === "TRUE" || row[6] === true,
        };
      }
    }

    return null;
  } catch (error) {
    throw new Error(
      `Failed to get checklist: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Evaluate a deliverable against a checklist
 */
export async function evaluateDeliverable(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  deliverableId: string,
  checklistId: string,
  results: Omit<CriterionResult, "criterionId">[],
  evaluatedBy: string,
  reviewId?: string
): Promise<QualityChecklistResult> {
  try {
    const resultId = await generateNextId(
      sheets,
      spreadsheetId,
      CHECKLIST_RESULTS_SHEET,
      "Result ID",
      "QCR"
    );

    // Get the checklist to get criterion IDs
    const checklist = await readChecklistById(
      sheets,
      spreadsheetId,
      checklistId
    );

    if (!checklist) {
      throw new Error("Checklist not found");
    }

    // Map results to criteria
    const criterionResults: CriterionResult[] = results.map((r, index) => ({
      ...r,
      criterionId: checklist.criteria[index]?.criterionId || `${checklistId}-C${index + 1}`,
    }));

    // Calculate overall score
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (let i = 0; i < criterionResults.length; i++) {
      const result = criterionResults[i];
      const criterion = checklist.criteria.find(
        (c) => c.criterionId === result.criterionId
      );

      if (criterion) {
        const score = result.met ? 100 : 0;
        totalWeightedScore += score * criterion.weight;
        totalWeight += criterion.weight;
      }
    }

    const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    // Check if passed (all required criteria met)
    const requiredResults = criterionResults.filter((r) => {
      const criterion = checklist.criteria.find((c) => c.criterionId === r.criterionId);
      return criterion?.required;
    });

    const passed = requiredResults.every((r) => r.met);

    const checklistResult: QualityChecklistResult = {
      resultId,
      checklistId,
      deliverableId,
      reviewId,
      evaluatedBy,
      evaluatedDate: new Date(),
      results: criterionResults,
      overallScore: Math.round(overallScore),
      passed,
      comments: "",
    };

    // Save result to sheet
    const row = [
      checklistResult.resultId,
      checklistResult.checklistId,
      checklistResult.deliverableId,
      checklistResult.reviewId || "",
      checklistResult.evaluatedBy,
      checklistResult.evaluatedDate.toISOString(),
      checklistResult.overallScore,
      checklistResult.passed ? "TRUE" : "FALSE",
      checklistResult.comments,
    ];

    await appendRows(sheets, spreadsheetId, `${CHECKLIST_RESULTS_SHEET}!A:I`, [
      row,
    ]);

    return checklistResult;
  } catch (error) {
    throw new Error(
      `Failed to evaluate deliverable: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Read a checklist by ID
 */
export async function readChecklistById(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  checklistId: string
): Promise<QualityChecklist | null> {
  try {
    const result = await findRowById(
      sheets,
      spreadsheetId,
      CHECKLISTS_SHEET,
      "Checklist ID",
      checklistId
    );

    if (!result) {
      return null;
    }

    const row = result.rowData;

    // Get deliverable type to load default criteria
    const deliverableType = row[3] === "all" ? null : (row[3] as DeliverableType);

    const criteria: QualityCriterion[] = deliverableType
      ? (DEFAULT_QUALITY_CRITERIA[deliverableType] || []).map((c, index) => ({
          ...c,
          criterionId: `${row[0]}-C${String(index + 1).padStart(3, "0")}`,
        }))
      : [];

    return {
      checklistId: row[0],
      name: row[1],
      description: row[2],
      deliverableType: deliverableType || undefined,
      criteria,
      createdBy: row[4],
      createdDate: new Date(row[5]),
      active: row[6] === "TRUE" || row[6] === true,
    };
  } catch (error) {
    throw new Error(
      `Failed to read checklist: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get checklist results for a deliverable
 */
export async function getChecklistResultsForDeliverable(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  deliverableId: string
): Promise<QualityChecklistResult[]> {
  try {
    const data = await readSheetRange(
      sheets,
      spreadsheetId,
      `${CHECKLIST_RESULTS_SHEET}!A:I`
    );

    if (data.length <= 1) {
      return [];
    }

    const results: QualityChecklistResult[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[2] === deliverableId) {
        results.push({
          resultId: row[0],
          checklistId: row[1],
          deliverableId: row[2],
          reviewId: row[3] || undefined,
          evaluatedBy: row[4],
          evaluatedDate: new Date(row[5]),
          results: [], // Would need to be loaded separately
          overallScore: parseFloat(row[6]),
          passed: row[7] === "TRUE" || row[7] === true,
          comments: row[8] || "",
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(
      `Failed to get checklist results: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
