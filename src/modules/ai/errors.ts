import type { z } from "zod";
import type { AIErrorCode } from "./types";

export class GeminiError extends Error {
  readonly code: AIErrorCode;

  constructor(code: AIErrorCode, message: string) {
    super(message);
    this.name = "GeminiError";
    this.code = code;
  }
}

export class GeminiConfigError extends GeminiError {
  constructor(message = "GEMINI_API_KEY is not configured in environment variables.") {
    super("missing_api_key", message);
    this.name = "GeminiConfigError";
  }
}

export class GeminiRateLimitError extends GeminiError {
  readonly retryAfterSeconds?: number;

  constructor(message = "Gemini API rate limit exceeded. Please wait a moment before trying again.", retryAfterSeconds?: number) {
    super("rate_limit_exceeded", message);
    this.name = "GeminiRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class GeminiUnavailableError extends GeminiError {
  constructor(message = "Gemini service is currently unavailable or unreachable.") {
    super("service_unavailable", message);
    this.name = "GeminiUnavailableError";
  }
}

export class InvalidAIOutputError extends GeminiError {
  readonly rawOutput?: string;
  readonly zodIssues?: z.ZodIssue[];

  constructor(message: string, rawOutput?: string, zodIssues?: z.ZodIssue[]) {
    super("invalid_ai_output", message);
    this.name = "InvalidAIOutputError";
    this.rawOutput = rawOutput;
    this.zodIssues = zodIssues;
  }
}

/**
 * Classifies an unknown error into a structured GeminiError.
 */
export function classifyGeminiError(error: unknown): Error {
  if (error instanceof GeminiError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  // Rate limit / Quota exceeded
  if (
    lower.includes("429") ||
    lower.includes("resource_exhausted") ||
    lower.includes("quota exceeded") ||
    lower.includes("rate limit")
  ) {
    return new GeminiRateLimitError(
      `Gemini quota or rate limit exceeded: ${message}`,
    );
  }

  // Network / Availability / 503 / 504 / DNS
  if (
    lower.includes("503") ||
    lower.includes("504") ||
    lower.includes("unavailable") ||
    lower.includes("econnrefused") ||
    lower.includes("fetch failed") ||
    lower.includes("network error") ||
    lower.includes("timeout")
  ) {
    return new GeminiUnavailableError(
      `Gemini service temporarily unavailable: ${message}`,
    );
  }

  // Missing API key in upstream
  if (lower.includes("api_key") || lower.includes("apikey")) {
    return new GeminiConfigError(message);
  }

  return new GeminiError("generation_failed", `AI generation error: ${message}`);
}
