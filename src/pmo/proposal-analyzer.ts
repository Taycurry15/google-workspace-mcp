/**
 * Proposal Analyzer
 * Uses the LLM orchestrator to extract PMO tracking information from proposals
 */

import { OAuth2Client } from "google-auth-library";
import {
  ProposalAnalysis,
  ProposedDeliverable,
  ProposedRisk,
  ProposedStakeholder,
  ClarificationQuestion,
  ProposalSession,
} from "../types/pmo.js";
import {
  extractProposalContent,
  isSupportedProposal,
} from "../utils/proposal-content-extractor.js";
import { LLMOrchestrator, LLMTaskPriority } from "../utils/llm/index.js";

// PMO Analysis system prompt (cacheable)
const PMO_SYSTEM_PROMPT = `You are a senior PMO (Project Management Office) analyst expert at extracting structured tracking information from project proposals. You understand:

- Work Breakdown Structures (WBS) and project decomposition
- PMBOK risk assessment (probability × impact on 1-5 scales)
- Stakeholder analysis using power/interest grids (1-5 scales)
- Resource estimation and budget planning
- Project phases: 1=Initiation, 2=Planning, 3=Execution, 4=Closeout

When analyzing proposals, you:

1. Extract ALL deliverables and organize into appropriate phases
   - Phase 1 (Initiation): Charter, stakeholder analysis, feasibility
   - Phase 2 (Planning): Detailed plans, schedules, budgets, risk registers
   - Phase 3 (Execution): Actual work products, development, implementation
   - Phase 4 (Closeout): Final reports, acceptance, lessons learned

2. Identify risks across categories:
   - Technical: Technology challenges, integration issues
   - Schedule: Timeline constraints, dependencies
   - Budget: Cost overruns, funding issues
   - Political: Stakeholder conflicts, regulatory changes
   - Resource: Staff availability, skill gaps
   - External: Vendor issues, market changes

3. Map stakeholders with realistic assessments:
   - Influence (1-5): Their power to impact the project
   - Interest (1-5): Their level of engagement/concern
   - Always identify decision-makers and approvers

4. Estimate effort conservatively - if uncertain, estimate high

5. Flag ambiguities in the clarificationNeeded sections

6. Be conservative with confidence scores (0-1):
   - 0.9-1.0: Explicitly stated in proposal
   - 0.7-0.8: Clearly implied or standard practice
   - 0.5-0.6: Reasonable inference
   - Below 0.5: Uncertain, needs clarification

Return responses as valid JSON only, no markdown formatting.`;

const proposalLLM = new LLMOrchestrator();

async function runProposalAnalysisPrompt(
  prompt: string,
  priority: LLMTaskPriority = "high",
  maxBudgetUsd = 0.12
): Promise<string> {
  const response = await proposalLLM.generate({
    messages: [
      {
        role: "system",
        content: PMO_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    taskType: "analysis",
    priority,
    maxOutputTokens: 4096,
    metadata: {
      requiresStructuredJson: true,
      estimatedInputTokens: Math.ceil(prompt.length / 4),
      maxBudgetUsd,
      allowLongContext: true,
    },
  });

  return response.outputText;
}

/**
 * Build analysis prompt for LLMs
 */
function buildAnalysisPrompt(
  content: string,
  fileName: string,
  projectName?: string,
  additionalContext?: string
): string {
  return `Analyze this project proposal and extract PMO tracking data.

Document: ${fileName}
${projectName ? `Project Name: ${projectName}` : "Project Name: Infer from content"}
${additionalContext ? `\nAdditional Context:\n${additionalContext}` : ""}

Proposal Content:
${content}

Extract and return a JSON object with this exact structure:
{
  "projectMetadata": {
    "projectName": "Clear, concise project name",
    "projectObjective": "1-2 sentence objective",
    "estimatedDuration": "e.g., '6 months' or '24 weeks'",
    "totalBudget": 150000,
    "startDate": "YYYY-MM-DD if mentioned",
    "confidence": 0.85
  },
  "deliverables": [
    {
      "name": "Requirements Gathering",
      "description": "Brief description",
      "phase": 2,
      "week": 2,
      "estimatedHours": 80,
      "estimatedBudget": 12000,
      "priority": "critical",
      "responsible": "John Doe or TBD",
      "accountable": "Jane Smith or TBD",
      "confidence": 0.9
    }
  ],
  "risks": [
    {
      "name": "Vendor Delays",
      "description": "Detailed risk description",
      "category": "Schedule",
      "estimatedProbability": 4,
      "estimatedImpact": 4,
      "suggestedResponse": "Multi-vendor approach, early RFPs",
      "owner": "Procurement Manager or TBD",
      "confidence": 0.7
    }
  ],
  "stakeholders": [
    {
      "name": "Minister of Digital Affairs",
      "role": "Executive Sponsor",
      "email": "minister@example.gov",
      "influence": 5,
      "interest": 5,
      "department": "Ministry of Digital Affairs",
      "confidence": 0.95
    }
  ],
  "clarificationNeeded": {
    "scope": ["Are mobile applications in scope?"],
    "risks": ["What is the backup plan for vendor failure?"],
    "stakeholders": ["Who approves budget changes?"],
    "resources": ["Is the full team allocated or shared?"]
  }
}

Guidelines:
- Extract at least 5-10 deliverables (be thorough)
- Identify at least 3-5 risks (think broadly)
- List all stakeholders mentioned (aim for 5-10)
- Deliverable priorities: "critical", "high", "medium", "low"
- Risk categories: "Technical", "Schedule", "Budget", "Political", "Resource", "External"
- Probability and Impact: 1 (very low) to 5 (very high)
- Influence and Interest: 1 (very low) to 5 (very high)
- Use "TBD" for unknown owners/responsible parties
- Flag specific gaps in clarificationNeeded sections

Return ONLY valid JSON, no markdown code blocks.`;
}

/**
 * Parse LLM response and validate structure
 */
function parseProposalAnalysis(
  response: string,
  documentInfo: { fileId: string; fileName: string }
): Omit<ProposalAnalysis, "sessionId"> {
  try {
    // Remove markdown code blocks if present
    let jsonStr = response.trim();
    if (jsonStr.startsWith("```")) {
      const lines = jsonStr.split("\n");
      jsonStr = lines
        .slice(1, -1)
        .join("\n")
        .trim();
      if (jsonStr.startsWith("json")) {
        jsonStr = jsonStr.slice(4).trim();
      }
    }

    const parsed = JSON.parse(jsonStr);

    // Validate structure
    if (!parsed.projectMetadata || !parsed.deliverables || !parsed.risks || !parsed.stakeholders) {
      throw new Error("Missing required fields in analysis");
    }

    // Ensure deliverables have required fields
    const deliverables: ProposedDeliverable[] = (parsed.deliverables || []).map((d: any) => ({
      name: d.name || "Unnamed Deliverable",
      description: d.description,
      wbs: d.wbs,
      phase: d.phase || 3,
      week: d.week,
      estimatedHours: d.estimatedHours,
      estimatedBudget: d.estimatedBudget,
      priority: d.priority || "medium",
      responsible: d.responsible || "TBD",
      accountable: d.accountable || "TBD",
      confidence: d.confidence || 0.5,
    }));

    // Ensure risks have required fields
    const risks: ProposedRisk[] = (parsed.risks || []).map((r: any) => ({
      name: r.name || "Unnamed Risk",
      description: r.description || "",
      category: r.category || "External",
      estimatedProbability: r.estimatedProbability || 3,
      estimatedImpact: r.estimatedImpact || 3,
      suggestedResponse: r.suggestedResponse,
      owner: r.owner || "TBD",
      confidence: r.confidence || 0.5,
    }));

    // Ensure stakeholders have required fields
    const stakeholders: ProposedStakeholder[] = (parsed.stakeholders || []).map((s: any) => ({
      name: s.name || "Unnamed Stakeholder",
      role: s.role || "Stakeholder",
      email: s.email,
      influence: s.influence || 3,
      interest: s.interest || 3,
      department: s.department,
      confidence: s.confidence || 0.5,
    }));

    const analysis: Omit<ProposalAnalysis, "sessionId"> = {
      documentInfo: {
        fileId: documentInfo.fileId,
        fileName: documentInfo.fileName,
        analyzedAt: new Date().toISOString(),
      },
      projectMetadata: {
        projectName: parsed.projectMetadata.projectName || documentInfo.fileName,
        projectObjective: parsed.projectMetadata.projectObjective || "",
        estimatedDuration: parsed.projectMetadata.estimatedDuration,
        totalBudget: parsed.projectMetadata.totalBudget,
        startDate: parsed.projectMetadata.startDate,
        confidence: parsed.projectMetadata.confidence || 0.5,
      },
      deliverables,
      risks,
      stakeholders,
      clarificationNeeded: {
        scope: parsed.clarificationNeeded?.scope || [],
        risks: parsed.clarificationNeeded?.risks || [],
        stakeholders: parsed.clarificationNeeded?.stakeholders || [],
        resources: parsed.clarificationNeeded?.resources || [],
      },
    };

    return analysis;
  } catch (error) {
    console.error("Failed to parse proposal analysis:", error);
    console.error("Response:", response);

    throw new Error(
      `Failed to parse AI analysis: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Analyze a proposal document using the LLM orchestrator
 * @param auth OAuth2 client for Google Drive/Docs access
 * @param fileId Google Drive file ID of the proposal
 * @param projectName Optional project name override
 * @returns Proposal analysis (without sessionId)
 */
export async function analyzeProposal(
  auth: OAuth2Client,
  fileId: string,
  projectName?: string
): Promise<Omit<ProposalAnalysis, "sessionId">> {
  // Extract proposal content
  const extractedContent = await extractProposalContent(auth, fileId);

  // Check if supported
  if (!isSupportedProposal(extractedContent.mimeType)) {
    throw new Error(
      `Unsupported document type: ${extractedContent.mimeType}. Please use Google Docs or Word documents.`
    );
  }

  // Build prompt
  const prompt = buildAnalysisPrompt(
    extractedContent.contentPreview,
    extractedContent.fileName,
    projectName
  );

  // Call orchestrator
  try {
    const textContent = await runProposalAnalysisPrompt(prompt, "high", 0.15);

    // Parse and validate
    const analysis = parseProposalAnalysis(textContent, {
      fileId,
      fileName: extractedContent.fileName,
    });

    // Auto-assign WBS codes
    const deliverablesWithWBS = assignWBS(analysis.deliverables);
    analysis.deliverables = deliverablesWithWBS;

    return analysis;
  } catch (error) {
    console.error("LLM error during proposal analysis:", error);
    throw new Error(
      `AI analysis failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Auto-assign WBS codes to deliverables
 * Groups by phase, then by similarity, then assigns sequential task numbers
 */
export function assignWBS(
  deliverables: ProposedDeliverable[]
): ProposedDeliverable[] {
  // Group by phase
  const byPhase: Record<number, ProposedDeliverable[]> = {};

  for (const deliverable of deliverables) {
    const phase = deliverable.phase || 3;
    if (!byPhase[phase]) {
      byPhase[phase] = [];
    }
    byPhase[phase].push(deliverable);
  }

  // Assign WBS codes
  const results: ProposedDeliverable[] = [];

  for (const [phase, items] of Object.entries(byPhase)) {
    // Simple grouping by keywords (could be enhanced with AI)
    const workstreams = groupByWorkstream(items);

    let workstreamNum = 1;

    for (const workstream of workstreams) {
      let taskNum = 1;

      for (const item of workstream) {
        item.wbs = `${phase}.${workstreamNum}.${taskNum}`;
        taskNum++;
        results.push(item);
      }

      workstreamNum++;
    }
  }

  return results;
}

/**
 * Group deliverables by workstream using keyword similarity
 * This is a simple implementation - could be enhanced with AI
 */
function groupByWorkstream(
  deliverables: ProposedDeliverable[]
): ProposedDeliverable[][] {
  if (deliverables.length === 0) return [];

  const workstreams: ProposedDeliverable[][] = [];
  const keywords = ["plan", "design", "build", "test", "deploy", "review", "report"];

  // Group by keyword matches
  for (const keyword of keywords) {
    const matching = deliverables.filter((d) =>
      d.name.toLowerCase().includes(keyword)
    );

    if (matching.length > 0) {
      workstreams.push(matching);
      // Remove from remaining
      deliverables = deliverables.filter(
        (d) => !matching.includes(d)
      );
    }
  }

  // Add remaining as separate workstream
  if (deliverables.length > 0) {
    workstreams.push(deliverables);
  }

  return workstreams;
}

/**
 * Generate clarification questions based on analysis gaps
 */
export function generateClarifications(
  analysis: Omit<ProposalAnalysis, "sessionId">
): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [];

  // Add questions from clarificationNeeded
  for (const question of analysis.clarificationNeeded.scope || []) {
    questions.push({
      category: "scope",
      question,
      priority: "high",
    });
  }

  for (const question of analysis.clarificationNeeded.risks || []) {
    questions.push({
      category: "risks",
      question,
      priority: "medium",
    });
  }

  for (const question of analysis.clarificationNeeded.stakeholders || []) {
    questions.push({
      category: "stakeholders",
      question,
      priority: "medium",
    });
  }

  for (const question of analysis.clarificationNeeded.resources || []) {
    questions.push({
      category: "resources",
      question,
      priority: "high",
    });
  }

  // Check for missing budget
  if (!analysis.projectMetadata.totalBudget) {
    questions.push({
      category: "budget",
      question: "What is the total project budget?",
      priority: "high",
    });
  }

  // Check for low-confidence items
  const lowConfidenceDeliverables = analysis.deliverables.filter(
    (d) => d.confidence < 0.6
  );
  if (lowConfidenceDeliverables.length > 0) {
    questions.push({
      category: "scope",
      question: `Some deliverables are unclear: ${lowConfidenceDeliverables.map((d) => d.name).join(", ")}. Can you clarify these?`,
      priority: "medium",
    });
  }

  // Check for TBD owners
  const tbd = analysis.deliverables.filter(
    (d) => d.responsible === "TBD" || d.accountable === "TBD"
  );
  if (tbd.length > 2) {
    questions.push({
      category: "resources",
      question: "Many deliverables have unassigned owners (TBD). Who will be responsible for these?",
      priority: "medium",
    });
  }

  // Limit to top 10 questions
  return questions.slice(0, 10);
}

/**
 * Apply user answers to refine analysis
 * Re-runs AI analysis with additional context from answers
 */
export async function applyAnswersToAnalysis(
  auth: OAuth2Client,
  session: ProposalSession,
  answers: Record<string, string>
): Promise<Omit<ProposalAnalysis, "sessionId">> {
  // Build additional context from answers
  let additionalContext = "User Clarifications:\n";
  for (const [question, answer] of Object.entries(answers)) {
    additionalContext += `Q: ${question}\nA: ${answer}\n\n`;
  }

  // Re-extract content
  const extractedContent = await extractProposalContent(
    auth,
    session.analysis.documentInfo.fileId
  );

  // Build prompt with additional context
  const prompt = buildAnalysisPrompt(
    extractedContent.contentPreview,
    extractedContent.fileName,
    session.analysis.projectMetadata.projectName,
    additionalContext
  );

  // Call orchestrator
  const textContent = await runProposalAnalysisPrompt(prompt, "normal", 0.12);

  // Parse and validate
  const refinedAnalysis = parseProposalAnalysis(textContent, {
    fileId: session.analysis.documentInfo.fileId,
    fileName: session.analysis.documentInfo.fileName,
  });

  // Auto-assign WBS codes
  refinedAnalysis.deliverables = assignWBS(refinedAnalysis.deliverables);

  return refinedAnalysis;
}
