import type { z } from "zod";
import { DEFAULT_GEMINI_MODEL, getGeminiClient } from "./client";
import {
  classifyGeminiError,
  GeminiRateLimitError,
  GeminiUnavailableError,
  InvalidAIOutputError,
} from "./errors";
import type { GenerateStructuredAIOptions } from "./types";

/**
 * Strips markdown code blocks (e.g. ```json ... ```) and cleans raw AI output text.
 */
export function cleanRawJsonText(rawText: string): string {
  let cleaned = rawText.trim();

  // Strip opening markdown code fence (```json or ```)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  }

  // Strip closing markdown code fence (```)
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/\s*```$/i, "");
  }

  return cleaned.trim();
}

/**
 * Parses raw AI string output into JSON and strictly validates it against a Zod schema.
 * Throws InvalidAIOutputError if JSON parsing fails or schema validation fails.
 */
export function parseAndValidateAIOutput<T>(
  rawOutput: string,
  schema: z.ZodType<T>,
): T {
  const cleaned = cleanRawJsonText(rawOutput);

  if (!cleaned) {
    throw new InvalidAIOutputError(
      "AI response was empty and contained no valid data.",
      rawOutput,
    );
  }

  let jsonObject: unknown;
  try {
    jsonObject = JSON.parse(cleaned);
  } catch (parseError) {
    throw new InvalidAIOutputError(
      `AI response could not be parsed as JSON: ${parseError instanceof Error ? parseError.message : "Syntax error"}`,
      rawOutput,
    );
  }

  const result = schema.safeParse(jsonObject);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");

    throw new InvalidAIOutputError(
      `AI output failed schema validation: ${errorDetails}`,
      rawOutput,
      result.error.issues,
    );
  }

  return result.data;
}

/**
 * Calls Gemini Developer API and parses the response into a strictly-typed object via Zod.
 * Enforces server-side execution, JSON response format, rate-limit classification, model fallback, and schema validation.
 */
export async function generateStructuredAI<T>(
  options: GenerateStructuredAIOptions<T>,
): Promise<T> {
  const {
    contents,
    schema,
    systemInstruction,
    model = DEFAULT_GEMINI_MODEL,
    temperature = 0.2, // Low temperature for high deterministic accuracy
  } = options;

  const candidateModels = [
    model,
    ...(model === "gemini-3.8-flash" ? ["gemini-3.5-flash"] : ["gemini-3.8-flash"]),
  ];

  let lastError: unknown;

  for (let i = 0; i < candidateModels.length; i++) {
    const currentModel = candidateModels[i];

    try {
      const client = getGeminiClient();

      // Map contents to array
      const contentParts = Array.isArray(contents) ? contents : [contents];

      const response = await client.models.generateContent({
        model: currentModel,
        contents: contentParts,
        config: {
          responseMimeType: "application/json",
          ...(systemInstruction ? { systemInstruction } : {}),
          temperature,
        },
      });

      const responseText = response.text;

      if (!responseText) {
        throw new InvalidAIOutputError(
          "Gemini returned an empty response.",
          "",
        );
      }

      return parseAndValidateAIOutput(responseText, schema);
    } catch (error) {
      lastError = error;
      const classified = classifyGeminiError(error);

      // If it's a rate limit or 503 unavailable, try the fallback model before giving up
      if (
        (classified instanceof GeminiRateLimitError || classified instanceof GeminiUnavailableError) &&
        i < candidateModels.length - 1
      ) {
        console.warn(
          `[AI Engine] Model ${currentModel} returned ${classified.name}. Trying fallback model ${candidateModels[i + 1]}...`,
        );
        continue;
      }

      throw classified;
    }
  }

  throw classifyGeminiError(lastError);
}
