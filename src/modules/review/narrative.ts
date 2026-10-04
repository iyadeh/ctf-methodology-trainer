import "server-only";

import { DEFAULT_GEMINI_MODEL, getGeminiClient, isGeminiConfigured } from "../ai/client";
import { generateDeterministicNarrative } from "./metrics";
import { reviewNarrativeSchema, type ImprovementArea, type ReviewMetrics, type ReviewNarrative } from "./types";

interface GenerateReviewNarrativeParams {
  readonly sessionName: string;
  readonly targetIp?: string | null;
  readonly metrics: ReviewMetrics;
  readonly improvementAreas: readonly ImprovementArea[];
  readonly userPathSummary: string;
}

export async function generateReviewNarrative(
  params: GenerateReviewNarrativeParams,
): Promise<ReviewNarrative> {
  const { sessionName, targetIp, metrics, improvementAreas, userPathSummary } = params;

  // Fallback if Gemini is not configured
  if (!isGeminiConfigured()) {
    return generateDeterministicNarrative(metrics, sessionName, improvementAreas);
  }

  try {
    const ai = getGeminiClient();

    const systemPrompt = `You are the CTF Methodology Reviewer.
Your task is to generate a concise, professional, technical evaluation of a learner's penetration testing session based STRICTLY on their recorded activity and deterministic metrics.

RULES:
1. Do NOT invent new scores or override the provided metrics.
2. Ground all commentary in the provided metrics, user timeline, and improvement areas.
3. Be constructive, technical, and restrained. No fluff, no generic motivational slogans.
4. Return a valid JSON object matching the exact schema:
   - "executiveSummary": string (2-3 sentences summarizing performance, duration, and compliance)
   - "strengths": array of 2-3 specific bullet points highlighting what the learner did well
   - "areasForGrowth": array of 1-3 specific bullet points based on the improvement areas
   - "recommendation": string (1-2 sentences with concrete advice for their next target)`;

    const prompt = `TRAINING SESSION DATA:
Target Machine: ${sessionName} (IP: ${targetIp ?? "unspecified"})
Total Duration: ${metrics.totalDurationFormatted}
Reconnaissance Coverage: ${metrics.reconCoverage}% (${metrics.breakdown.recon.completed}/${metrics.breakdown.recon.total} checks)
Phase Gate Compliance: ${metrics.phaseGateCompliance}% (${metrics.breakdown.gates.compliantTransitions}/${metrics.breakdown.gates.totalTransitions} transitions compliant, ${metrics.phaseOverrides} overrides)
Hypothesis Discipline: ${metrics.hypothesisDiscipline}% (${metrics.breakdown.hypotheses.attemptsWithHypothesis}/${metrics.breakdown.hypotheses.totalAttempts} attempts supported by hypothesis)
Documentation Coverage: ${metrics.documentationCoverage}% (${metrics.breakdown.documentation.confirmedWithEvidence}/${metrics.breakdown.documentation.totalConfirmed} findings documented)
Hints Used: ${metrics.hintsUsed} (${metrics.machineHints} machine-specific, ${metrics.fullReveals} full reveals)

AREAS TO IMPROVE:
${improvementAreas.map((a) => `- [${a.metric}] ${a.title}: ${a.description}`).join("\n")}

TIMELINE SUMMARY:
${userPathSummary}

Generate the structured methodology review narrative in valid JSON:`;

    const response = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const rawText = response.text?.trim() || "";
    const parsed = JSON.parse(rawText);
    const validated = reviewNarrativeSchema.parse(parsed);

    return {
      executiveSummary: validated.executiveSummary,
      strengths: validated.strengths,
      areasForGrowth: validated.areasForGrowth,
      recommendation: validated.recommendation,
      isAiGenerated: true,
    };
  } catch (error) {
    console.warn(
      "[SessionReview] AI narrative generation unavailable or failed; utilizing deterministic narrative fallback:",
      error instanceof Error ? error.message : String(error),
    );
    return generateDeterministicNarrative(metrics, sessionName, improvementAreas);
  }
}
