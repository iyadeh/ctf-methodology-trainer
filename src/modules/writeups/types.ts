export type SupportedWriteupFormat = "pdf" | "txt" | "md";

export type WriteupErrorCode =
  | "unsupported_format"
  | "file_too_large"
  | "empty_file"
  | "parse_failed"
  | "invalid_input";

export class WriteupParseError extends Error {
  readonly code: WriteupErrorCode;

  constructor(code: WriteupErrorCode, message: string) {
    super(message);
    this.name = "WriteupParseError";
    this.code = code;
  }
}

export interface WriteupInputFile {
  readonly filename: string;
  readonly buffer: Uint8Array | Buffer;
  readonly mimeType?: string | null;
}

export interface ParsedWriteupDocument {
  readonly filename: string;
  readonly format: SupportedWriteupFormat;
  readonly sizeBytes: number;
  readonly sha256Hash: string;
  readonly normalizedText: string;
  readonly characterCount: number;
  readonly wordCount: number;
  readonly pageCount?: number;
}

export interface WriteupMetadataSummary {
  readonly filename: string;
  readonly format: SupportedWriteupFormat;
  readonly sizeBytes: number;
  readonly sha256Hash: string;
  readonly characterCount: number;
  readonly wordCount: number;
  readonly pageCount?: number;
}
