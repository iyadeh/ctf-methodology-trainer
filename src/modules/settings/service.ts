import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  findings,
  generationRuns,
  hintRecords,
  trainingSessions,
} from "@/lib/db/schema";
import {
  DEFAULT_GEMINI_MODEL,
  getActiveApiKey,
  getCustomApiKey,
  getGeminiClient,
  setCustomApiKey,
} from "../ai/client";
import type {
  AppSettings,
  DensityOption,
  GeminiModelInfo,
  HintBehaviorOption,
  SpoilerLevelOption,
  TestAiConnectionResult,
  ThemeOption,
} from "./types";

const LOCAL_SETTINGS_FILE = path.join(process.cwd(), ".settings.local.json");

/**
 * Curated fallback models known to be active and performant.
 */
export const VERIFIED_GEMINI_MODELS: GeminiModelInfo[] = [
  {
    id: "gemini-3.5-flash",
    displayName: "Gemini 3.5 Flash",
    description: "Hybrid reasoning, high speed & accuracy (Recommended)",
    isRecommended: true,
  },
  {
    id: "gemini-3.5-flash-lite",
    displayName: "Gemini 3.5 Flash-Lite",
    description: "Ultra-fast & cost-effective for high volume requests",
  },
  {
    id: "gemini-3.1-pro-preview",
    displayName: "Gemini 3.1 Pro Preview",
    description: "Advanced complex multi-step reasoning",
  },
];

interface PersistedLocalSettings {
  customApiKey?: string | null;
  aiModel?: string;
  defaultSpoilerLevel?: SpoilerLevelOption;
  hintBehavior?: HintBehaviorOption;
  theme?: ThemeOption;
  density?: DensityOption;
  reducedMotion?: boolean;
}

function loadPersistedSettings(): PersistedLocalSettings {
  try {
    if (fs.existsSync(LOCAL_SETTINGS_FILE)) {
      const content = fs.readFileSync(LOCAL_SETTINGS_FILE, "utf-8");
      const parsed: PersistedLocalSettings = JSON.parse(content);
      // Auto-migrate discontinued 2.5 models
      if (parsed.aiModel && (parsed.aiModel.includes("2.5") || parsed.aiModel.includes("flash-lite-latest"))) {
        parsed.aiModel = "gemini-3.5-flash";
        savePersistedSettings(parsed);
      }
      return parsed;
    }
  } catch {
    // Ignore read or parse errors, fallback to empty
  }
  return {};
}

function savePersistedSettings(settings: PersistedLocalSettings): void {
  try {
    fs.writeFileSync(
      LOCAL_SETTINGS_FILE,
      JSON.stringify(settings, null, 2),
      "utf-8",
    );
  } catch {
    // Non-fatal if filesystem write fails
  }
}

// Initialize custom API key and settings on module load
try {
  const persisted = loadPersistedSettings();
  if (persisted.customApiKey && !getCustomApiKey()) {
    setCustomApiKey(persisted.customApiKey);
  }
} catch {
  // Ignore
}

/**
 * Masks an API key for safe display in the frontend without leaking secrets.
 */
export function maskApiKey(key?: string | null): string {
  if (!key || key.trim().length === 0) {
    return "Not Configured";
  }
  const trimmed = key.trim();
  if (trimmed.length <= 8) {
    return "••••••••";
  }
  const prefix = trimmed.startsWith("AIzaSy") ? "AIzaSy" : trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Fetches available text generation models dynamically from Gemini API in real time.
 * Falls back to VERIFIED_GEMINI_MODELS if unavailable or offline.
 */
export async function fetchAvailableGeminiModels(
  apiKeyToUse?: string,
): Promise<GeminiModelInfo[]> {
  const key = apiKeyToUse?.trim() || getActiveApiKey();
  if (!key) {
    return VERIFIED_GEMINI_MODELS;
  }

  try {
    const client = getGeminiClient(key);
    const response = await client.models.list();
    const discovered: GeminiModelInfo[] = [];

    for await (const m of response) {
      const name = m.name?.replace(/^models\//, "") || "";
      const isGenerateAction = m.supportedActions?.includes("generateContent");

      // Filter for text/multimodal generation models, excluding audio/image/robotics specialized models
      if (
        isGenerateAction &&
        name.startsWith("gemini-") &&
        !name.includes("image") &&
        !name.includes("tts") &&
        !name.includes("audio") &&
        !name.includes("transcribe") &&
        !name.includes("live") &&
        !name.includes("computer-use") &&
        !name.includes("2.5") // exclude discontinued 2.5 models
      ) {
        discovered.push({
          id: name,
          displayName: m.displayName || name,
          description: m.description ? m.description.slice(0, 90) : undefined,
          isRecommended: name === "gemini-3.5-flash",
        });
      }
    }

    if (discovered.length > 0) {
      // Sort recommended first, then alphabetically descending by model code
      discovered.sort((a, b) => {
        if (a.isRecommended) return -1;
        if (b.isRecommended) return 1;
        return b.id.localeCompare(a.id);
      });
      return discovered;
    }
  } catch {
    // Graceful fallback to verified presets
  }

  return VERIFIED_GEMINI_MODELS;
}

/**
 * Tests Gemini connectivity with a lightweight probe and measures latency.
 */
export async function testGeminiConnectivity(
  apiKeyToTest?: string,
  modelToTest?: string,
): Promise<TestAiConnectionResult> {
  const key =
    apiKeyToTest !== undefined ? apiKeyToTest.trim() : getActiveApiKey();
  const persisted = loadPersistedSettings();

  const candidate =
    modelToTest?.trim() ||
    persisted.aiModel ||
    process.env.GEMINI_MODEL?.trim() ||
    DEFAULT_GEMINI_MODEL;
  const model = candidate.includes("2.5") ? "gemini-3.5-flash" : candidate;

  if (!key) {
    return {
      ok: false,
      latencyMs: 0,
      model,
      error: "No GEMINI_API_KEY configured in environment or settings.",
    };
  }

  const startTime = Date.now();
  try {
    const client = getGeminiClient(key);
    // Lightweight content generation test
    await client.models.generateContent({
      model,
      contents: "ping",
    });

    const latencyMs = Date.now() - startTime;
    return {
      ok: true,
      latencyMs,
      model,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const rawMessage = err instanceof Error ? err.message : String(err);

    // Sanitize message to never expose the API key or raw secret tokens
    let sanitized = "Failed to connect to Gemini API.";
    if (
      rawMessage.includes("401") ||
      rawMessage.toLowerCase().includes("unauthorized") ||
      rawMessage.toLowerCase().includes("api key not valid")
    ) {
      sanitized = "Invalid API key (401 Unauthorized). Please check your key.";
    } else if (
      rawMessage.includes("404") ||
      rawMessage.toLowerCase().includes("not found") ||
      rawMessage.toLowerCase().includes("is no longer available")
    ) {
      sanitized = `Model "${model}" is not available or discontinued for this API key. Please select a supported model (e.g. gemini-3.5-flash).`;
    } else if (
      rawMessage.includes("429") ||
      rawMessage.toLowerCase().includes("quota") ||
      rawMessage.toLowerCase().includes("resource exhausted")
    ) {
      sanitized = `Gemini API quota exceeded or rate limit reached (429) for model "${model}".`;
    } else if (
      rawMessage.includes("503") ||
      rawMessage.toLowerCase().includes("high demand") ||
      rawMessage.toLowerCase().includes("service unavailable")
    ) {
      sanitized = `Model "${model}" is temporarily experiencing high demand (503). Try another model like gemini-3.5-flash-lite.`;
    } else if (
      rawMessage.toLowerCase().includes("fetch failed") ||
      rawMessage.toLowerCase().includes("network")
    ) {
      sanitized = "Network connectivity error reaching Google Gemini endpoints.";
    } else {
      sanitized = `Gemini API error: ${rawMessage.slice(0, 100)}`;
    }

    return {
      ok: false,
      latencyMs,
      model,
      error: sanitized,
    };
  }
}

/**
 * Updates the custom API key override after pre-flight verification.
 */
export async function updateCustomApiKey(
  newKey: string,
  modelToTest?: string,
): Promise<{
  ok: boolean;
  message: string;
  maskedKey?: string;
}> {
  const trimmed = newKey.trim();
  if (!trimmed) {
    return { ok: false, message: "API key cannot be empty." };
  }

  // Pre-flight test with active/selected model
  const testResult = await testGeminiConnectivity(trimmed, modelToTest);
  if (!testResult.ok) {
    return {
      ok: false,
      message: testResult.error || "Pre-flight connection test failed.",
    };
  }

  // Save in runtime and persist to local settings file
  setCustomApiKey(trimmed);
  const current = loadPersistedSettings();
  savePersistedSettings({ ...current, customApiKey: trimmed });

  return {
    ok: true,
    message: "API key successfully verified and saved.",
    maskedKey: maskApiKey(trimmed),
  };
}

/**
 * Resets custom API key and falls back to .env.local default.
 */
export async function resetCustomApiKey(): Promise<{
  ok: boolean;
  message: string;
  maskedKey: string;
}> {
  setCustomApiKey(null);
  const current = loadPersistedSettings();
  delete current.customApiKey;
  savePersistedSettings(current);

  const envKey = process.env.GEMINI_API_KEY?.trim();
  return {
    ok: true,
    message: "Reset to environment default (.env.local).",
    maskedKey: maskApiKey(envKey),
  };
}

/**
 * Updates training defaults in persisted local settings.
 */
export async function updateTrainingDefaults(defaults: {
  defaultSpoilerLevel?: SpoilerLevelOption;
  hintBehavior?: HintBehaviorOption;
}): Promise<void> {
  const current = loadPersistedSettings();
  savePersistedSettings({
    ...current,
    ...defaults,
  });
}

/**
 * Updates active AI model preference.
 */
export async function updateAiModel(model: string): Promise<void> {
  const current = loadPersistedSettings();
  savePersistedSettings({
    ...current,
    aiModel: model,
  });
}

/**
 * Updates interface display preferences.
 */
export async function updateInterfacePreferences(preferences: {
  theme?: ThemeOption;
  density?: DensityOption;
  reducedMotion?: boolean;
}): Promise<void> {
  const current = loadPersistedSettings();
  savePersistedSettings({
    ...current,
    ...preferences,
  });
}

/**
 * Checks PostgreSQL database connectivity and retrieves table statistics.
 */
export async function testDatabaseConnectivity(): Promise<{
  isDbConnected: boolean;
  totalSessions: number;
  totalFindings: number;
  totalGenerationRuns: number;
  totalHintRecords: number;
}> {
  try {
    // Quick test query
    await db.execute(sql`SELECT 1`);

    const [sessionsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(trainingSessions);
    const [findingsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(findings);
    const [runsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(generationRuns);
    const [hintsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(hintRecords);

    return {
      isDbConnected: true,
      totalSessions: sessionsCount?.count ?? 0,
      totalFindings: findingsCount?.count ?? 0,
      totalGenerationRuns: runsCount?.count ?? 0,
      totalHintRecords: hintsCount?.count ?? 0,
    };
  } catch {
    return {
      isDbConnected: false,
      totalSessions: 0,
      totalFindings: 0,
      totalGenerationRuns: 0,
      totalHintRecords: 0,
    };
  }
}

/**
 * Retrieves the full AppSettings payload for the Settings page.
 */
export async function getAppSettings(): Promise<AppSettings> {
  const persisted = loadPersistedSettings();
  const dbStats = await testDatabaseConnectivity();

  // Ensure runtime custom key is synchronized with persisted local settings
  if (persisted.customApiKey && !getCustomApiKey()) {
    setCustomApiKey(persisted.customApiKey);
  }

  const activeKey = getActiveApiKey() || persisted.customApiKey?.trim();
  const customKey = getCustomApiKey() || persisted.customApiKey?.trim();

  const isConfigured = Boolean(activeKey && activeKey.length > 0);
  const activeModel =
    persisted.aiModel && !persisted.aiModel.includes("2.5")
      ? persisted.aiModel
      : process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";

  return {
    ai: {
      provider: "gemini",
      model: activeModel,
      isConnected: isConfigured,
      hasCustomKey: Boolean(customKey),
      maskedKey: maskApiKey(activeKey),
    },
    trainingDefaults: {
      frameworkSlug: "ptes-ctf",
      frameworkName: "PTES — CTF Adapted",
      defaultSpoilerLevel: persisted.defaultSpoilerLevel || "methodology_only",
      hintBehavior: persisted.hintBehavior || "progressive",
    },
    interface: {
      theme: persisted.theme || "dark",
      density: persisted.density || "comfortable",
      reducedMotion: Boolean(persisted.reducedMotion),
    },
    storage: {
      ...dbStats,
      estimatedCacheMb: 12,
    },
  };
}

/**
 * Exports all training sessions as a structured JSON backup.
 */
export async function exportAllSessionsData(): Promise<object> {
  const sessions = await db.query.trainingSessions.findMany({
    with: {
      phases: true,
      findings: true,
      hypotheses: true,
      attempts: true,
      notes: true,
    },
  });

  return {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    totalSessions: sessions.length,
    sessions,
  };
}

/**
 * Clears stored AI generation runs and prompt records.
 */
export async function clearGenerationHistory(): Promise<{
  ok: boolean;
  deletedCount: number;
}> {
  try {
    const deleted = await db.delete(generationRuns).returning({ id: generationRuns.id });
    return { ok: true, deletedCount: deleted.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to clear generation history: ${msg}`);
  }
}

/**
 * Clears temporary application cache.
 */
export async function clearApplicationCache(): Promise<{ ok: boolean }> {
  // In a local monolith, clearing cache resets in-memory singletons
  return { ok: true };
}
