"use server";

import { parseWriteupFile } from "@/modules/writeups/parser";
import {
  WriteupParseError,
  type WriteupMetadataSummary,
} from "@/modules/writeups/types";

export type UploadWriteupActionResult =
  | { ok: true; metadata: WriteupMetadataSummary }
  | { ok: false; error: string; code: string };

/**
 * Server Action to validate and parse an uploaded writeup file.
 * Returns safe metadata summary; normalized writeup content remains securely on the server.
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
