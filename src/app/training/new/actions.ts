"use server";

import { isGeminiConfigured } from "@/modules/ai";
import { extractMachineFacts, type ExtractedMachineFacts } from "@/modules/facts";
import { generateTrainingSession } from "@/modules/training/orchestrator";
import { parseWriteupFile } from "@/modules/writeups/parser";
import {
  WriteupParseError,
  type WriteupMetadataSummary,
} from "@/modules/writeups/types";

export type UploadWriteupActionResult =
  | {
      ok: true;
      metadata: WriteupMetadataSummary;
      facts?: ExtractedMachineFacts;
      aiWarning?: string;
    }
  | { ok: false; error: string; code: string };

export type GenerateTrainingActionResult =
  | {
      ok: true;
      sessionId: string;
      generationRunId: string;
      machineProfile?: {
        name: string;
        platform: string;
        os: string;
        difficulty: string;
        author?: string;
        targetIp?: string;
      };
    }
  | {
      ok: false;
      error: string;
      code?: string;
    };

/**
 * Server Action to orchestrate writeup parsing, facts extraction, attack graph building,
 * verification, hidden knowledge persistence, and session creation.
 */
export async function generateTrainingAction(
  formData: FormData,
): Promise<GenerateTrainingActionResult> {
  try {
    const file = formData.get("writeup");

    if (!file || !(file instanceof File)) {
      return {
        ok: false,
        code: "invalid_input",
        error: "No file was uploaded. Please choose a writeup file.",
      };
    }

    const sessionNameOverride =
      formData.get("sessionName")?.toString() || undefined;
    const forceRegenerate = formData.get("forceRegenerate") === "true";

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await generateTrainingSession({
      writeupFile: {
        filename: file.name,
        buffer,
        mimeType: file.type || null,
      },
      sessionNameOverride,
      forceRegenerate,
    });

    if (!result.ok || !result.sessionId) {
      return {
        ok: false,
        code: "generation_failed",
        error: result.error || "Failed to generate training session from writeup.",
      };
    }

    return {
      ok: true,
      sessionId: result.sessionId,
      generationRunId: result.generationRunId,
      machineProfile: result.machineProfile,
    };
  } catch (error) {
    console.error("[generateTrainingAction] Error:", error);
    return {
      ok: false,
      code: "server_error",
      error:
        error instanceof Error
          ? error.message
          : "Failed to process and generate training session.",
    };
  }
}

/**
 * Server Action to validate and parse an uploaded writeup file.
 */
export async function uploadWriteupAction(
  formData: FormData,
): Promise<UploadWriteupActionResult> {
  try {
    const file = formData.get("writeup");

    if (!file || !(file instanceof File)) {
      return {
        ok: false,
        code: "invalid_input",
        error: "No file was uploaded. Please choose a writeup file.",
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = await parseWriteupFile({
      filename: file.name,
      buffer,
      mimeType: file.type || null,
    });

    let facts: ExtractedMachineFacts | undefined;
    let aiWarning: string | undefined;

    if (isGeminiConfigured()) {
      try {
        facts = await extractMachineFacts({
          writeupText: parsed.normalizedText,
        });
      } catch (aiErr) {
        console.error("[uploadWriteupAction] AI Fact Extraction Error:", aiErr);
        aiWarning =
          aiErr instanceof Error ? aiErr.message : "AI fact extraction failed.";
      }
    }

    return {
      ok: true,
      metadata: {
        filename: parsed.filename,
        format: parsed.format,
        sizeBytes: parsed.sizeBytes,
        sha256Hash: parsed.sha256Hash,
        characterCount: parsed.characterCount,
        wordCount: parsed.wordCount,
        pageCount: parsed.pageCount,
      },
      facts,
      aiWarning,
    };
  } catch (error) {
    if (error instanceof WriteupParseError) {
      return {
        ok: false,
        code: error.code,
        error: error.message,
      };
    }
    return {
      ok: false,
      code: "parse_failed",
      error:
        error instanceof Error ? error.message : "Failed to process writeup.",
    };
  }
}
