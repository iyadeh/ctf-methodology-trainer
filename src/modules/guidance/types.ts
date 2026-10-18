import type { AttackNodeKind, AttackNodePhase, SpoilerLevel } from "../attack-graph/types";

export type { SpoilerLevel };

export const SPOILER_LEVEL_NAMES = {
  0: "methodology",
  1: "concept",
  2: "technique",
  3: "tool",
  4: "machine_context",
  5: "partial_solution",
  6: "full_reveal",
} as const;

export type SpoilerLevelName = (typeof SPOILER_LEVEL_NAMES)[SpoilerLevel];

export type GuidanceMode =
  | "methodology_hint"
  | "concept_explanation"
  | "next_step_guidance"
  | "review_hint";

export interface GuidanceRequest {
  readonly sessionId: string;
  readonly mode: GuidanceMode;
  readonly spoilerLevel: SpoilerLevel;
  readonly currentCheckKey?: string;
  readonly userQuery?: string;
}

export interface AllowedHiddenNode {
  readonly id: string;
  readonly title: string;
  readonly phase: AttackNodePhase;
  readonly kind: AttackNodeKind;
  readonly spoilerLevel: SpoilerLevel;
  readonly summary: string;
  readonly toolsAllowed?: readonly string[];
}

export interface FilteredHiddenContext {
  readonly requestedLevel: SpoilerLevel;
  readonly levelName: SpoilerLevelName;
  readonly allowedNodes: readonly AllowedHiddenNode[];
  readonly redactedItems: readonly string[];
  readonly guidanceScope: string;
  readonly currentFrontierMilestone?: string;
}

export interface VisibleGuidanceState {
  readonly currentPhase: string;
  readonly activeChecks: readonly {
    readonly semanticKey: string;
    readonly title: string;
    readonly priority: string;
  }[];
  readonly confirmedFindings: readonly {
    readonly kind: string;
    readonly identifier: string;
    readonly description?: string;
  }[];
  readonly recentAttemptsCount: number;
  readonly failedAttemptsCount?: number;
  readonly deviationsCount?: number;
}

export interface GuidancePromptContext {
  readonly systemInstruction: string;
  readonly visibleState: VisibleGuidanceState;
  readonly filteredHiddenContext: FilteredHiddenContext;
  readonly spoilerLevel: SpoilerLevel;
  readonly spoilerLevelName: SpoilerLevelName;
  readonly coreRule: string;
  readonly userQuery?: string;
}
