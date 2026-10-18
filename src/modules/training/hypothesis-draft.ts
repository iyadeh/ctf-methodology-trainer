import { z } from "zod";
import { generateStructuredAI } from "../ai/structured";
import { isGeminiConfigured } from "../ai/client";

export const hypothesisDraftSchema = z.object({
  reasoning: z
    .string()
    .min(5, "Reasoning must provide technical justification")
    .describe("Technical justification for why this hypothesis is plausible based on observed evidence."),
  expectedResult: z
    .string()
    .min(5, "Expected result must define concrete success criteria")
    .describe("Concrete, verifiable indicators of success (e.g. response code change, shell prompt, credential disclosure)."),
  testApproach: z
    .string()
    .min(5, "Test approach must outline concrete verification steps")
    .describe("Concrete methodology steps or commands to safely test this hypothesis without destructive modifications."),
});

export type HypothesisDraftResult = z.infer<typeof hypothesisDraftSchema>;

export interface GenerateHypothesisDraftParams {
  readonly hypothesis: string;
  readonly findingTitle?: string | null;
  readonly findingCategory?: string | null;
  readonly findingEvidence?: string | null;
  readonly contextKind?: string | null;
  readonly contextValue?: string | null;
}

/**
 * Deterministic fallback generator for hypothesis drafting when Gemini API is unavailable or unconfigured.
 */
export function generateCuratedHypothesisFallback(
  params: GenerateHypothesisDraftParams,
): HypothesisDraftResult {
  const { hypothesis, findingTitle, contextValue } = params;
  const target = contextValue || findingTitle || "observed service";

  return {
    reasoning: `Based on evidence gathered for ${target}, the configuration or exposed interface indicates a plausible attack surface that could allow ${hypothesis.toLowerCase().replace(/\.$/, "")}.`,
    expectedResult: `Execution of the verification test yields verifiable response anomalies, access confirmation, or error code differential distinct from baseline behavior.`,
    testApproach: `Perform controlled, non-destructive probing against ${target}; verify response codes and banner output before attempting full exploitation.`,
  };
}

/**
 * Uses Gemini to draft structured hypothesis details (reasoning, expectedResult, testApproach)
 * from a 1-sentence hypothesis statement and optional finding context.
 */
export async function generateHypothesisDraft(
  params: GenerateHypothesisDraftParams,
): Promise<HypothesisDraftResult> {
  const {
    hypothesis,
    findingTitle,
    findingCategory,
    findingEvidence,
    contextKind,
    contextValue,
  } = params;

  if (!isGeminiConfigured()) {
    return generateCuratedHypothesisFallback(params);
  }

  const findingContext = findingTitle
    ? `\nLINKED EVIDENCE FINDING:
- Title: ${findingTitle}
- Category: ${findingCategory || "unspecified"}
- Context: ${contextKind || "none"}:${contextValue || "none"}
${findingEvidence ? `- Evidence/Output: ${findingEvidence}` : ""}`
    : "\nNo specific evidence finding was linked.";

  const systemInstruction = `You are a cybersecurity penetration testing methodology mentor and technical assistant.
Your task is to take a concise attack hypothesis statement and expand it into a structured, scientifically testable penetration testing hypothesis.

CORE METHODOLOGY INVARIANT:
"HYPOTHESIS BEFORE ACTION — Evidence before assumption."

You must generate:
1. "reasoning": Clear technical justification for why this attack vector is plausible given the evidence and protocol architecture.
2. "expectedResult": Specific observable results that prove the hypothesis true (e.g. status code 200 with admin dashboard, interactive shell prompt with uid, error differential).
3. "testApproach": Concrete, safe, step-by-step methodology and commands to test this hypothesis without causing denial of service.

Return JSON adhering strictly to the schema.`;

  const prompt = `ATTACK HYPOTHESIS STATEMENT:
"${hypothesis}"
${findingContext}

Draft the Reasoning, Expected Result, and Test Approach for this hypothesis.`;

  try {
    return await generateStructuredAI({
      contents: prompt,
      schema: hypothesisDraftSchema,
      systemInstruction,
      temperature: 0.2,
    });
  } catch (error) {
    console.warn("[Hypothesis Auto-Draft] Gemini generation failed, falling back to curated template:", error);
    return generateCuratedHypothesisFallback(params);
  }
}
