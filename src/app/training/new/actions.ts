"use server";

import { isGeminiConfigured } from "@/modules/ai";
import { extractMachineFacts, type ExtractedMachineFacts } from "@/modules/facts";
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

/**
 * Server Action to validate, parse an uploaded writeup file,
 * and extract structured machine facts if Gemini API is configured.
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
        aiWarning = aiErr instanceof Error ? aiErr.message : "AI fact extraction failed.";
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
      error: error instanceof Error ? error.message : "Failed to process writeup.",
    };
  }
}
