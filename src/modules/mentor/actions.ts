"use server";

import { revalidatePath } from "next/cache";
import type { GuidanceMode, SpoilerLevel } from "../guidance/types";
import {
  generateAiChecklistSuggestions,
  getSessionHintsAndMetrics,
  requestMentorGuidance,
} from "./service";
import type { MentorGuidanceResult } from "./types";

export interface AskMentorActionParams {
  readonly sessionId: string;
  readonly mode: GuidanceMode;
  readonly spoilerLevel: SpoilerLevel;
  readonly userQuery?: string;
  readonly currentCheckKey?: string;
}

export async function askMentorAction(
  params: AskMentorActionParams,
): Promise<{ ok: boolean; data?: MentorGuidanceResult; error?: string }> {
  try {
    const result = await requestMentorGuidance(params);
    revalidatePath(`/training/${params.sessionId}`);
    return { ok: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to obtain mentor guidance.";
    return { ok: false, error: message };
  }
}

export async function generateAiChecklistAction(
  sessionId: string,
): Promise<{ ok: boolean; addedCount: number; error?: string }> {
  try {
    const res = await generateAiChecklistSuggestions(sessionId);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true, addedCount: res.addedCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate AI checklist.";
    return { ok: false, addedCount: 0, error: message };
  }
}

export async function getMentorHistoryAction(sessionId: string) {
  try {
    const data = await getSessionHintsAndMetrics(sessionId);
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch mentor history.";
    return { ok: false, error: message };
  }
}
