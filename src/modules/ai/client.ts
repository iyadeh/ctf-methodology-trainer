import "server-only";

import { GoogleGenAI } from "@google/genai";
import { GeminiConfigError } from "./errors";
import type { MultimodalPart } from "./types";

export const DEFAULT_GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";

let cachedClient: GoogleGenAI | null = null;

/**
 * Checks whether the server environment has a GEMINI_API_KEY configured.
 * Useful for graceful degradation where local features continue without AI.
 */
export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return typeof key === "string" && key.trim().length > 0;
}

/**
 * Returns an authenticated GoogleGenAI client instance.
 * Throws GeminiConfigError if GEMINI_API_KEY is missing.
 */
export function getGeminiClient(): GoogleGenAI {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiConfigError();
  }

  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

/**
 * Helper to convert binary data (such as PDF or screenshots) into a Gemini multimodal Part.
 */
export function createMultimodalPart(
  buffer: Buffer | Uint8Array,
  mimeType: string,
): MultimodalPart {
  const base64Data = Buffer.from(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  ).toString("base64");

  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
}
