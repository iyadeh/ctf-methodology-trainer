import type { hintRecords } from "@/lib/db/schema";
import type { GuidanceMode, SpoilerLevel, SpoilerLevelName } from "../guidance/types";

export type HintRecord = typeof hintRecords.$inferSelect;
export type NewHintRecord = typeof hintRecords.$inferInsert;

export interface MentorGuidanceRequest {
  readonly sessionId: string;
  readonly mode: GuidanceMode;
  readonly spoilerLevel: SpoilerLevel;
  readonly userQuery?: string;
  readonly currentCheckKey?: string;
}

export interface MentorGuidanceResult {
  readonly record: HintRecord;
  readonly content: string;
  readonly conceptExplanation?: string;
  readonly recommendedTechnique?: string;
  readonly suggestedTools?: string[];
  readonly spoilerLevel: SpoilerLevel;
  readonly spoilerLevelName: SpoilerLevelName;
  readonly penaltyPoints: number;
  readonly isFallback?: boolean;
}

export interface HintMetrics {
  readonly totalHints: number;
  readonly methodologyHints: number;
  readonly conceptExplanations: number;
  readonly machineSpecificHints: number;
  readonly fullReveals: number;
  readonly totalPenaltyPoints: number;
}

export interface AiChecklistSuggestion {
  readonly semanticKey: string;
  readonly title: string;
  readonly description: string;
}
