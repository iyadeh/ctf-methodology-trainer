import "server-only";

import { generateStructuredAI, type AIContentPart } from "../ai";
import { FACT_EXTRACTION_SYSTEM_INSTRUCTION, buildFactExtractionUserPrompt } from "./prompts";
import { ExtractedMachineFactsSchema } from "./schema";
import type { ExtractMachineFactsOptions, ExtractedMachineFacts } from "./types";

/**
 * Extracts structured machine facts from a normalized writeup document.
 * Supports multimodal inputs (text + optional screenshots / diagrams).
 * Output is strictly validated against ExtractedMachineFactsSchema via Zod.
 * Hidden knowledge security boundary: This function and its output are strictly server-side.
 */
export async function extractMachineFacts(
  options: ExtractMachineFactsOptions,
): Promise<ExtractedMachineFacts> {
  const { writeupText, mediaParts = [], model } = options;

  if (!writeupText || writeupText.trim().length === 0) {
    throw new Error("Writeup text cannot be empty for fact extraction.");
  }

  const promptText = buildFactExtractionUserPrompt(writeupText);

  // Combine text prompt with any multimodal parts (e.g. screenshots from writeup)
  const contents: AIContentPart[] = [promptText, ...mediaParts];

  return generateStructuredAI<ExtractedMachineFacts>({
    contents,
    schema: ExtractedMachineFactsSchema,
    systemInstruction: FACT_EXTRACTION_SYSTEM_INSTRUCTION,
    temperature: 0.1, // Low temperature for deterministic, hallucination-resistant extraction
    model,
  });
}
