"use server";

import { revalidatePath } from "next/cache";
import {
  clearApplicationCache,
  clearGenerationHistory,
  exportAllSessionsData,
  fetchAvailableGeminiModels,
  resetCustomApiKey,
  testDatabaseConnectivity,
  testGeminiConnectivity,
  updateAiModel,
  updateCustomApiKey,
  updateInterfacePreferences,
  updateTrainingDefaults,
} from "./service";
import type {
  DensityOption,
  GeminiModelInfo,
  HintBehaviorOption,
  SpoilerLevelOption,
  TestAiConnectionResult,
  ThemeOption,
} from "./types";

export async function testAiConnectionAction(
  modelToTest?: string,
): Promise<TestAiConnectionResult> {
  return testGeminiConnectivity(undefined, modelToTest);
}

export async function fetchAvailableModelsAction(): Promise<GeminiModelInfo[]> {
  return fetchAvailableGeminiModels();
}

export async function saveApiKeyAction(
  newKey: string,
  modelToTest?: string,
): Promise<{
  ok: boolean;
  message: string;
  maskedKey?: string;
}> {
  const result = await updateCustomApiKey(newKey, modelToTest);
  if (result.ok) {
    revalidatePath("/settings");
  }
  return result;
}

export async function resetApiKeyAction(): Promise<{
  ok: boolean;
  message: string;
  maskedKey: string;
}> {
  const result = await resetCustomApiKey();
  revalidatePath("/settings");
  return result;
}

export async function saveAiModelAction(model: string): Promise<{ ok: boolean }> {
  await updateAiModel(model);
  revalidatePath("/settings");
  return { ok: true };
}

export async function saveTrainingDefaultsAction(defaults: {
  defaultSpoilerLevel: SpoilerLevelOption;
  hintBehavior: HintBehaviorOption;
}): Promise<{ ok: boolean }> {
  await updateTrainingDefaults(defaults);
  revalidatePath("/settings");
  return { ok: true };
}

export async function saveInterfacePreferencesAction(preferences: {
  theme?: ThemeOption;
  density?: DensityOption;
  reducedMotion?: boolean;
}): Promise<{ ok: boolean }> {
  await updateInterfacePreferences(preferences);
  revalidatePath("/settings");
  return { ok: true };
}

export async function exportSessionsAction(): Promise<object> {
  return exportAllSessionsData();
}

export async function clearHistoryAction(): Promise<{
  ok: boolean;
  deletedCount: number;
}> {
  const result = await clearGenerationHistory();
  revalidatePath("/settings");
  return result;
}

export async function clearCacheAction(): Promise<{ ok: boolean }> {
  const result = await clearApplicationCache();
  revalidatePath("/settings");
  return result;
}

export async function refreshDatabaseStatsAction(): Promise<{
  isDbConnected: boolean;
  totalSessions: number;
  totalFindings: number;
  totalGenerationRuns: number;
  totalHintRecords: number;
}> {
  return testDatabaseConnectivity();
}
