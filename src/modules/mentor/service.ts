import { z } from "zod";
import { generateStructuredAI } from "../ai";
import { calculateSpoilerPenalty, prepareGuidancePromptContext } from "../guidance";
import { guidanceResponseSchema, type GuidanceResponseOutput } from "../guidance/schema";
import type { AllowedHiddenNode, GuidanceMode, GuidancePromptContext } from "../guidance/types";
import { getTrainingSession } from "../training/service";
import { sessionChecks } from "@/lib/db/schema";
import { db } from "@/lib/db";
import {
  computeHintMetricsBySessionId,
  findAttackGraphBySessionId,
  findHintRecordsBySessionId,
  insertHintRecord,
} from "./repository";
import type {
  AiChecklistSuggestion,
  HintMetrics,
  HintRecord,
  MentorGuidanceRequest,
  MentorGuidanceResult,
} from "./types";

const aiChecklistOutputSchema = z.object({
  suggestions: z
    .array(
      z.object({
        semanticKey: z.string().min(3),
        title: z.string().min(3),
        description: z.string().min(5),
      }),
    )
    .min(1)
    .max(3),
});

function cleanNodeSummary(title: string, summary: string): string {
  const t = title.trim();
  let s = summary.trim();
  if (s.toLowerCase().startsWith(t.toLowerCase())) {
    s = s.slice(t.length).replace(/^[:.\-\s]+/, "").trim();
  }
  return s || summary;
}

function buildSmartLevel6Fallback(
  allowedNodes: readonly AllowedHiddenNode[],
  userQuery?: string,
): GuidanceResponseOutput {
  const queryLower = (userQuery || "").toLowerCase();

  // Find flag artifacts
  const flagNodes = allowedNodes.filter(
    (n) =>
      n.kind === "objective_capture" ||
      n.title.toLowerCase().includes("flag") ||
      n.title.toLowerCase().includes("artifact") ||
      n.summary.includes("{"),
  );

  // If user specifically asked about flag / root / objective
  if (
    queryLower.includes("flag") ||
    queryLower.includes("root") ||
    queryLower.includes("objektif") ||
    queryLower.includes("jawaban")
  ) {
    const flagLines = flagNodes.map((n) => {
      const flagMatch = n.summary.match(/\b(BEECTF|HTB|FLAG|CTF)\{[^}]+\}/i);
      const flagCode = flagMatch ? `\`${flagMatch[0]}\`` : "";
      const desc = cleanNodeSummary(
        n.title,
        n.summary.replace(flagMatch?.[0] || "", ""),
      );
      return `• **${n.title}**${flagCode ? `: ${flagCode}` : ""}\n  ${desc}`;
    });

    const vulnNodes = allowedNodes.filter(
      (n) =>
        n.phase === "vulnerability_analysis" || n.phase === "exploitation",
    );
    const vulnLines = vulnNodes
      .slice(0, 3)
      .map((n) => `• **${n.title}**: ${cleanNodeSummary(n.title, n.summary)}`)
      .join("\n\n");

    const content = `### 🚩 Solusi Flag Target (Full Reveal - Level 6)

${flagLines.length > 0 ? flagLines.join("\n\n") : "Tidak ditemukan artefak flag spesifik dalam attack graph."}

---

### ⚔️ Vektor Eksploitasi Terkait:
${vulnLines || "Ikuti alur metodologi eksploitasi untuk mengekstrak data dari target."}`;

    return {
      content,
      spoilerLevel: 6,
      recommendedTechnique:
        "Direct objective extraction via identified exploit vector.",
      suggestedTools: Array.from(
        new Set(allowedNodes.flatMap((n) => n.toolsAllowed || [])),
      ).slice(0, 4),
    };
  }

  // Walkthrough by phase
  const phases = [
    "reconnaissance",
    "threat_modeling",
    "vulnerability_analysis",
    "exploitation",
    "post_exploitation",
  ];
  const phaseSections: string[] = [];

  for (const p of phases) {
    const nodes = allowedNodes.filter((n) => n.phase === p);
    if (nodes.length > 0) {
      const heading = p.replace("_", " ").toUpperCase();
      const items = nodes
        .map(
          (n) =>
            `• **${n.title}**\n  ${cleanNodeSummary(n.title, n.summary)}`,
        )
        .join("\n\n");
      phaseSections.push(`### ⚔️ Phase: ${heading}\n\n${items}`);
    }
  }

  return {
    content: phaseSections.join("\n\n"),
    spoilerLevel: 6,
    recommendedTechnique:
      "Review full reference attack graph against session progress.",
    suggestedTools: Array.from(
      new Set(allowedNodes.flatMap((n) => n.toolsAllowed || [])),
    ).slice(0, 4),
  };
}

function buildSmartLevel5Fallback(
  allowedNodes: readonly AllowedHiddenNode[],
): GuidanceResponseOutput {
  const vulnAndExploit = allowedNodes.filter(
    (n) =>
      n.phase === "vulnerability_analysis" || n.phase === "exploitation",
  );
  const hints = (
    vulnAndExploit.length > 0 ? vulnAndExploit : allowedNodes
  ).map(
    (n) =>
      `• **${n.title}** (${n.phase.toUpperCase()}):\n  ${cleanNodeSummary(n.title, n.summary)}`,
  );

  return {
    content: `### 🔍 Panduan Jalur Eksploitasi (Partial Solution - Level 5)

Fokuskan pengujian Anda pada temuan berikut (kredensial dan flag mentah tetap terlindungi):

${hints.join("\n\n")}`,
    spoilerLevel: 5,
    recommendedTechnique:
      "Focus on identified vulnerability vectors while maintaining methodology discipline.",
    suggestedTools: Array.from(
      new Set(allowedNodes.flatMap((n) => n.toolsAllowed || [])),
    ).slice(0, 4),
  };
}

function buildSmartLevel4Fallback(
  allowedNodes: readonly AllowedHiddenNode[],
  phase: string,
): GuidanceResponseOutput {
  const contextItems = allowedNodes.map(
    (n) => `• **${n.title}**:\n  ${cleanNodeSummary(n.title, n.summary)}`,
  );
  return {
    content: `### 🎯 Konteks Target Terkait (${phase} - Level 4)

Informasi spesifik mesin untuk fase ${phase}:

${contextItems.join("\n\n")}`,
    spoilerLevel: 4,
    recommendedTechnique:
      "Target-specific surface enumeration and port analysis.",
    suggestedTools: ["nmap", "curl", "gobuster"],
  };
}

/**
 * Generates deterministic fallback guidance when Gemini is offline, rate-limited,
 * or when no API key is configured.
 */
function buildFallbackGuidance(
  promptCtx: GuidancePromptContext,
  mode: GuidanceMode,
): GuidanceResponseOutput {
  const phase = promptCtx.visibleState.currentPhase;
  const activeChecks = promptCtx.visibleState.activeChecks;
  const checkSummary =
    activeChecks.length > 0
      ? activeChecks.map((c) => c.title).slice(0, 2).join(" and ")
      : "active methodology tasks";
  const allowedNodes = promptCtx.filteredHiddenContext.allowedNodes;

  if (mode === "concept_explanation") {
    return {
      content: `In the ${phase} phase, structured methodology dictates thorough discovery before attempting exploitation. Focus on understanding the technology stack and protocols in play.`,
      spoilerLevel: promptCtx.spoilerLevel,
      conceptExplanation:
        "Methodology emphasizes gathering verifiable evidence before forming exploitative hypotheses.",
      recommendedTechnique: "Service version analysis, header inspection, and manual verification.",
      suggestedTools: ["curl", "nmap", "whatweb"],
    };
  }

  if (mode === "next_step_guidance") {
    return {
      content: `Your next priority in ${phase} is to address: ${checkSummary}. Ensure you verify service versions and confirm findings with raw evidence before moving to the next phase gate.`,
      spoilerLevel: promptCtx.spoilerLevel,
      recommendedTechnique: "Methodical checklist completion and evidence documentation.",
      suggestedTools: ["nmap", "nikto", "ffuf"],
    };
  }

  // Handle Spoiler Levels 4-6 (Machine Knowledge tier)
  if (promptCtx.spoilerLevel >= 4) {
    if (allowedNodes.length > 0) {
      if (promptCtx.spoilerLevel === 6) {
        return buildSmartLevel6Fallback(allowedNodes, promptCtx.userQuery);
      } else if (promptCtx.spoilerLevel === 5) {
        return buildSmartLevel5Fallback(allowedNodes);
      } else {
        return buildSmartLevel4Fallback(allowedNodes, phase);
      }
    }

    // No attack graph linked to this session
    return {
      content: `Informasi Mesin (Spoiler Level ${promptCtx.spoilerLevel}): Sesi latihan "${phase}" ini tidak memiliki attack graph atau writeup terlampir di sistem (Manual Practice Session). Tidak ada data flag atau solusi spesifik mesin yang tersimpan di database untuk diungkapkan. Buka sesi yang dibuat dari writeup (seperti BeeFest 2022) untuk bimbingan spesifik solusi mesin/flag.`,
      spoilerLevel: promptCtx.spoilerLevel,
      recommendedTechnique: "Enumerasi manual dan pengujian metodologi PTES standar.",
      suggestedTools: ["nmap", "curl"],
    };
  }

  // Level 1: Concept
  if (promptCtx.spoilerLevel === 1) {
    return {
      content: `Theoretical Concept for ${phase}: Security methodology emphasizes gathering verifiable evidence before attempting exploitation. Examine active service architecture carefully.`,
      spoilerLevel: promptCtx.spoilerLevel,
      conceptExplanation: "Thorough reconnaissance is essential to prevent false assumptions.",
      recommendedTechnique: "Service version analysis and attack surface mapping.",
      suggestedTools: ["nmap", "curl"],
    };
  }

  // Level 2: Technique
  if (promptCtx.spoilerLevel === 2) {
    return {
      content: `Recommended Technique for ${phase}: Conduct structured content discovery, inspect HTTP headers, and thoroughly identify service versions.`,
      spoilerLevel: promptCtx.spoilerLevel,
      recommendedTechnique: "Content discovery and banner grabbing.",
      suggestedTools: ["ffuf", "gobuster", "curl"],
    };
  }

  // Level 3: Tool
  if (promptCtx.spoilerLevel === 3) {
    return {
      content: `Suggested Tools for ${phase}: For ${phase}, use standardized security tools such as Nmap for network scanning, curl for HTTP probing, and ffuf for content discovery.`,
      spoilerLevel: promptCtx.spoilerLevel,
      recommendedTechnique: "Automated scanning paired with manual endpoint inspection.",
      suggestedTools: ["nmap", "ffuf", "curl", "nikto"],
    };
  }

  // Level 0: Methodology default
  return {
    content: `Methodology guidance for ${phase}: Focus on methodical enumeration. Complete all required checks (${checkSummary}) to satisfy the phase gate requirements.`,
    spoilerLevel: promptCtx.spoilerLevel,
    recommendedTechnique: "Systematic enumeration and structured hypothesis formulation.",
    suggestedTools: ["nmap", "curl"],
  };
}

/**
 * Handles a learner's mentor request:
 * 1. Prepares strictly filtered prompt context (Spoiler levels 0-6).
 * 2. Prompts Gemini with structured output validation.
 * 3. Gracefully degrades to fallback if AI fails or hits quota.
 * 4. Persists the hint record with deterministic penalty scoring.
 */
export async function requestMentorGuidance(
  request: MentorGuidanceRequest,
): Promise<MentorGuidanceResult> {
  const { sessionId, mode, spoilerLevel, userQuery, currentCheckKey } = request;

  // 1. Fetch current session aggregate & hidden attack graph
  const session = await getTrainingSession(sessionId);
  const graph = await findAttackGraphBySessionId(sessionId);

  // 2. Prepare filtered guidance prompt context (Context Minimization)
  const promptCtx = prepareGuidancePromptContext({
    session,
    graph: graph || undefined,
    spoilerLevel,
    userQuery,
  });

  const penaltyPoints = calculateSpoilerPenalty(spoilerLevel);
  const allowedNodes = promptCtx.filteredHiddenContext.allowedNodes;

  // 3. Construct user prompt for Gemini
  const userPromptLines = [
    `Learner request mode: ${mode.toUpperCase()}`,
    userQuery ? `Learner question: "${userQuery}"` : null,
    currentCheckKey ? `Focused check: ${currentCheckKey}` : null,
    `Current Phase: ${promptCtx.visibleState.currentPhase}`,
    `Active checks: ${promptCtx.visibleState.activeChecks.map((c) => c.title).join("; ") || "None"}`,
    `Confirmed findings: ${promptCtx.visibleState.confirmedFindings.map((f) => `${f.identifier} (${f.kind})`).join(", ") || "None"}`,
    allowedNodes.length > 0
      ? `Allowed Reference Nodes (Spoiler Level ${spoilerLevel}):\n${allowedNodes.map((n) => `- [${n.phase}] ${n.title}: ${n.summary}`).join("\n")}`
      : "Note: No machine attack graph is attached to this session (manual practice session).",
    "",
    "Provide technical, concise, actionable guidance respecting the Spoiler Level invariant.",
    `Respond in JSON format with key "content" containing your markdown response and key "spoilerLevel": ${spoilerLevel}.`,
  ]
    .filter(Boolean)
    .join("\n");

  let aiResponse: GuidanceResponseOutput;
  let isFallback = false;

  try {
    aiResponse = await generateStructuredAI<GuidanceResponseOutput>({
      contents: userPromptLines,
      schema: guidanceResponseSchema,
      systemInstruction: promptCtx.systemInstruction,
      temperature: 0.2, // Controlled low temperature
    });
  } catch (err) {
    console.warn(
      `[AI Mentor] Gemini call failed or quota reached, using deterministic fallback guidance.`,
      err,
    );
    aiResponse = buildFallbackGuidance(promptCtx, mode);
    isFallback = true;
  }

  // 4. Persist hint record
  const currentPhaseKey = session.currentPhase?.semanticKey || "reconnaissance";
  const record = await insertHintRecord({
    trainingSessionId: sessionId,
    spoilerLevel,
    spoilerLevelName: promptCtx.spoilerLevelName,
    phaseKey: currentPhaseKey,
    mode,
    userQuery: userQuery || null,
    content: aiResponse.content,
    conceptExplanation: aiResponse.conceptExplanation || null,
    recommendedTechnique: aiResponse.recommendedTechnique || null,
    suggestedToolsJson: aiResponse.suggestedTools
      ? JSON.stringify(aiResponse.suggestedTools)
      : null,
    penaltyPoints,
  });

  return {
    record,
    content: aiResponse.content,
    conceptExplanation: aiResponse.conceptExplanation,
    recommendedTechnique: aiResponse.recommendedTechnique,
    suggestedTools: aiResponse.suggestedTools,
    spoilerLevel,
    spoilerLevelName: promptCtx.spoilerLevelName,
    penaltyPoints,
    isFallback,
  };
}

/**
 * Generates contextual suggested checklist extensions using Gemini.
 * INVARIANT: AI-generated checks must ALWAYS be priority "suggested"
 * and provenance "ai_generated". They never block Phase Gate.
 */
export async function generateAiChecklistSuggestions(
  sessionId: string,
): Promise<{ addedCount: number; suggestions: AiChecklistSuggestion[] }> {
  const session = await getTrainingSession(sessionId);
  const currentPhase = session.currentPhase;

  if (!currentPhase) {
    return { addedCount: 0, suggestions: [] };
  }

  const confirmedFindings = session.findings
    .filter((f) => f.evidenceState === "confirmed")
    .map((f) => `${f.category}: ${f.contextValue || f.title}`);

  const existingSemanticKeys = new Set(
    currentPhase.checks.map((c) => c.semanticKey),
  );

  const prompt = `Based on the following confirmed target context in the "${currentPhase.name}" phase:
Confirmed Context:
${confirmedFindings.length > 0 ? confirmedFindings.join("\n") : "No specific service confirmed yet."}

Existing checks in this phase:
${currentPhase.checks.map((c) => `- ${c.title} (${c.semanticKey})`).join("\n")}

Suggest 1 to 2 relevant exploratory methodology checks to investigate further.
Return JSON with suggestions: semanticKey (e.g. "ai.http.inspect-headers"), title, and description.`;

  let suggestions: AiChecklistSuggestion[] = [];

  try {
    const response = await generateStructuredAI({
      contents: prompt,
      schema: aiChecklistOutputSchema,
      systemInstruction:
        "You are an assistant generating suggested exploration checks for a CTF penetration testing session. Keep checks technical, non-destructive, and strictly relevant.",
      temperature: 0.2,
    });
    suggestions = response.suggestions;
  } catch (err) {
    console.warn("[AI Mentor] Could not generate AI checklist extensions:", err);
    return { addedCount: 0, suggestions: [] };
  }

  // Filter out any duplicate semantic keys
  const validSuggestions = suggestions.filter(
    (s) => !existingSemanticKeys.has(s.semanticKey),
  );

  if (validSuggestions.length === 0) {
    return { addedCount: 0, suggestions: [] };
  }

  // Insert into sessionChecks
  let nextSortOrder = currentPhase.checks.length + 1;
  const newCheckRows = validSuggestions.map((s) => ({
    trainingSessionId: sessionId,
    sessionPhaseId: currentPhase.id,
    semanticKey: s.semanticKey,
    title: s.title,
    description: s.description,
    priority: "suggested" as const, // STRICT PRD INVARIANT
    provenance: "ai_generated" as const, // STRICT PRD INVARIANT
    sortOrder: nextSortOrder++,
    status: "active" as const,
    sourceVersion: 1,
    activatedAt: new Date(),
  }));

  await db.insert(sessionChecks).values(newCheckRows);

  return {
    addedCount: newCheckRows.length,
    suggestions: validSuggestions,
  };
}

/**
 * Returns all hint records and aggregated metrics for a session.
 */
export async function getSessionHintsAndMetrics(sessionId: string): Promise<{
  hints: HintRecord[];
  metrics: HintMetrics;
}> {
  const [hints, metrics] = await Promise.all([
    findHintRecordsBySessionId(sessionId),
    computeHintMetricsBySessionId(sessionId),
  ]);

  return { hints, metrics };
}
