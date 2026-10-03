import type { AttackGraph } from "../attack-graph/types";
import type { TrainingSessionAggregate } from "../training/types";
import { filterHiddenContextBySpoilerLevel } from "./policy";
import {
  SPOILER_LEVEL_NAMES,
  type GuidancePromptContext,
  type SpoilerLevel,
  type VisibleGuidanceState,
} from "./types";

export interface PrepareGuidanceParams {
  readonly session: TrainingSessionAggregate;
  readonly graph?: AttackGraph;
  readonly spoilerLevel: SpoilerLevel;
  readonly userQuery?: string;
}

const SPOILER_PENALTIES: Record<SpoilerLevel, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 5,
  5: 10,
  6: 25,
};

/**
 * Calculates the deterministic evaluation penalty for using a given spoiler level.
 */
export function calculateSpoilerPenalty(level: SpoilerLevel): number {
  return SPOILER_PENALTIES[level] ?? 0;
}

/**
 * Safely escalates the current spoiler level to the next tier (up to 6).
 */
export function escalateSpoilerLevel(currentLevel: SpoilerLevel): SpoilerLevel {
  const next = Math.min(6, currentLevel + 1);
  return next as SpoilerLevel;
}

/**
 * Builds the complete prompt context for AI Mentor / Guidance generation,
 * strictly filtered by the requested spoiler level.
 */
export function prepareGuidancePromptContext(
  params: PrepareGuidanceParams,
): GuidancePromptContext {
  const { session, graph, spoilerLevel, userQuery } = params;
  const currentPhaseKey = session.currentPhase?.semanticKey || "reconnaissance";

  // Collect confirmed findings identifiers to preserve user's own discoveries
  const confirmedIdentifiers = new Set<string>();
  const visibleFindings = session.findings
    .filter((f) => f.evidenceState === "confirmed")
    .map((f) => {
      const identifier = f.contextValue || f.title;
      confirmedIdentifiers.add(identifier);
      if (f.title) confirmedIdentifiers.add(f.title);
      return {
        kind: f.category,
        identifier,
        description: f.evidence || undefined,
      };
    });

  // Active checks in current phase
  const activeChecks =
    session.currentPhase?.checks
      .filter((c) => c.status === "active")
      .map((c) => ({
        semanticKey: c.semanticKey,
        title: c.title,
        priority: c.priority,
      })) || [];

  const visibleState: VisibleGuidanceState = {
    currentPhase: session.currentPhase?.name || "Reconnaissance",
    activeChecks,
    confirmedFindings: visibleFindings,
    recentAttemptsCount: session.attempts.length,
  };

  // If a hidden attack graph exists, filter it through the Spoiler Policy
  const dummyGraph: AttackGraph = {
    id: "empty",
    machineName: session.session.name,
    nodes: [],
    edges: [],
    entryNodeIds: [],
    terminalNodeIds: [],
    referencePathNodeIds: [],
    createdAt: new Date().toISOString(),
  };

  const filteredHiddenContext = filterHiddenContextBySpoilerLevel({
    graph: graph || dummyGraph,
    spoilerLevel,
    currentPhaseKey,
    confirmedFindingIdentifiers: confirmedIdentifiers,
  });

  const levelName = SPOILER_LEVEL_NAMES[spoilerLevel];

  const systemInstruction = `You are the CTF Methodology Trainer Mentor.
Your role is to guide cybersecurity learners through structured penetration-testing methodology without spoiling solutions prematurely.

CORE INVARIANT:
"Give the least revealing guidance that enables meaningful progress."

CURRENT SPOILER LEVEL: ${spoilerLevel} (${levelName.toUpperCase()})
GUIDANCE SCOPE:
${filteredHiddenContext.guidanceScope}

RULES:
1. Method before exploit: Prioritize enumeration and methodical reasoning over blind exploitation.
2. Under no circumstance provide details exceeding Spoiler Level ${spoilerLevel}.
3. If the user asks for direct answers, steer them to the relevant methodology phase and next step.
4. Keep answers concise, technical, and actionable. Avoid fluff and overly verbose greetings.`;

  return {
    systemInstruction,
    visibleState,
    filteredHiddenContext,
    spoilerLevel,
    spoilerLevelName: levelName,
    coreRule: "Give the least revealing guidance that enables meaningful progress.",
    userQuery,
  };
}
