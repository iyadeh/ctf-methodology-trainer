import { extname, basename } from "node:path";
import {
  WriteupParseError,
  type SupportedWriteupFormat,
  type WriteupInputFile,
} from "./types";

export const MAX_WRITEUP_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS: Record<string, SupportedWriteupFormat> = {
  ".pdf": "pdf",
  ".txt": "txt",
  ".md": "md",
};

/**
 * Validates writeup file inputs against size, extension, format, and magic bytes.
 */
export function validateWriteupFile(file: WriteupInputFile): {
  format: SupportedWriteupFormat;
  cleanFilename: string;
} {
  if (!file || !file.filename || typeof file.filename !== "string") {
    throw new WriteupParseError("invalid_input", "Writeup filename is required.");
  }

  const cleanFilename = basename(file.filename.trim());
  if (!cleanFilename) {
    throw new WriteupParseError("invalid_input", "Writeup filename must not be empty.");
  }

  const rawExtension = extname(cleanFilename).toLowerCase();
  const format = ALLOWED_EXTENSIONS[rawExtension];

  if (!format) {
    throw new WriteupParseError(
      "unsupported_format",
      `Unsupported file extension "${rawExtension}". Allowed formats: PDF (.pdf), Plain Text (.txt), Markdown (.md).`,
    );
  }

  if (!file.buffer) {
    throw new WriteupParseError("invalid_input", "Writeup file buffer is missing.");
  }

  const size = file.buffer.length;

  if (size === 0) {
    throw new WriteupParseError("empty_file", "The uploaded writeup file is empty (0 bytes).");
  }

  if (size > MAX_WRITEUP_SIZE_BYTES) {
    throw new WriteupParseError(
      "file_too_large",
      `File size (${(size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 10 MB.`,
    );
  }

  // Validate PDF magic bytes: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  if (format === "pdf") {
    const isPdfMagic =
      file.buffer.length >= 5 &&
      file.buffer[0] === 0x25 && // %
      file.buffer[1] === 0x50 && // P
      file.buffer[2] === 0x44 && // D
      file.buffer[3] === 0x46 && // F
      file.buffer[4] === 0x2d;   // -

    if (!isPdfMagic) {
      throw new WriteupParseError(
        "invalid_input",
        "File has a .pdf extension but does not contain a valid PDF signature (%PDF-).",
      );
    }
  }

  return { format, cleanFilename };
}
