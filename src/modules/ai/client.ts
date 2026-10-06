import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { GeminiConfigError } from "./errors";
import type { MultimodalPart } from "./types";

export const DEFAULT_GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.5-flash";

const LOCAL_SETTINGS_FILE = path.join(process.cwd(), ".settings.local.json");

let cachedClient: GoogleGenAI | null = null;
let customApiKey: string | null = null;

function readPersistedCustomKey(): string | null {
  try {
    if (fs.existsSync(LOCAL_SETTINGS_FILE)) {
      const content = fs.readFileSync(LOCAL_SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (typeof parsed.customApiKey === "string" && parsed.customApiKey.trim()) {
        return parsed.customApiKey.trim();
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Sets or clears a runtime custom API key override (from Settings UI).
 */
export function setCustomApiKey(key: string | null): void {
  customApiKey = key ? key.trim() : null;
  cachedClient = null; // Invalidate cached client
}

export function getCustomApiKey(): string | null {
  if (customApiKey) return customApiKey;
  const persistedKey = readPersistedCustomKey();
  if (persistedKey) {
    customApiKey = persistedKey;
    return customApiKey;
  }
  return null;
}

export function getActiveApiKey(): string | undefined {
  const custom = getCustomApiKey();
  return custom || process.env.GEMINI_API_KEY?.trim();
}

/**
 * Checks whether the server environment has a GEMINI_API_KEY configured.
 * Useful for graceful degradation where local features continue without AI.
 */
export function isGeminiConfigured(): boolean {
  const key = getActiveApiKey();
  return typeof key === "string" && key.trim().length > 0;
}

/**
 * Returns an authenticated GoogleGenAI client instance.
 * Throws GeminiConfigError if GEMINI_API_KEY is missing.
 */
export function getGeminiClient(explicitApiKey?: string): GoogleGenAI {
  if (explicitApiKey) {
    return new GoogleGenAI({ apiKey: explicitApiKey.trim() });
  }

  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = getActiveApiKey();
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
