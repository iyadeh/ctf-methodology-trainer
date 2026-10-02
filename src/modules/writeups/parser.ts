import { createHash } from "node:crypto";
import { extractText } from "unpdf";
import { countWords, normalizeWriteupText } from "./normalizer";
import {
  WriteupParseError,
  type ParsedWriteupDocument,
  type WriteupInputFile,
} from "./types";
import { validateWriteupFile } from "./validation";

/**
 * Parses and normalizes an uploaded writeup file (PDF, TXT, or Markdown).
 * Performs validation, extracts text, cleans formatting, and generates a SHA-256 fingerprint.
 */
export async function parseWriteupFile(
  file: WriteupInputFile,
): Promise<ParsedWriteupDocument> {
  const { format, cleanFilename } = validateWriteupFile(file);

  const sha256Hash = createHash("sha256")
    .update(file.buffer)
    .digest("hex");

  let rawExtractedText = "";
  let pageCount: number | undefined;

  switch (format) {
    case "txt":
    case "md": {
      try {
        rawExtractedText = new TextDecoder("utf-8", { fatal: false }).decode(
          file.buffer,
        );
      } catch (error) {
        throw new WriteupParseError(
          "parse_failed",
          `Failed to decode text file: ${error instanceof Error ? error.message : "Encoding error"}`,
        );
      }
      break;
    }

    case "pdf": {
      try {
        const uint8Data = new Uint8Array(
          file.buffer.buffer,
          file.buffer.byteOffset,
          file.buffer.byteLength,
        );
        const result = await extractText(uint8Data, { mergePages: true });
        pageCount = result.totalPages;
        rawExtractedText = result.text;
      } catch (error) {
        if (error instanceof WriteupParseError) throw error;
        throw new WriteupParseError(
          "parse_failed",
          `Failed to parse PDF document: ${error instanceof Error ? error.message : "Invalid or corrupted PDF structure"}`,
        );
      }
      break;
    }
  }

  const normalizedText = normalizeWriteupText(rawExtractedText);

  if (!normalizedText) {
    throw new WriteupParseError(
      "empty_file",
      format === "pdf"
        ? "PDF was processed, but contained no extractable text. It may contain only scanned images without an OCR text layer."
        : "The writeup file contains no readable text content.",
    );
  }

  return {
    filename: cleanFilename,
    format,
    sizeBytes: file.buffer.length,
    sha256Hash,
    normalizedText,
    characterCount: normalizedText.length,
    wordCount: countWords(normalizedText),
    ...(pageCount !== undefined ? { pageCount } : {}),
  };
}
