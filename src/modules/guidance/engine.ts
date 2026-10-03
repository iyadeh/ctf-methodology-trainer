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

  const allowedKnowledgeSection =
    filteredHiddenContext.allowedNodes.length > 0
      ? `\n\nALLOWED MACHINE KNOWLEDGE (Filtered according to Spoiler Level ${spoilerLevel} - You may refer to or reveal these details):
${filteredHiddenContext.allowedNodes.map((n) => `- [${n.phase.toUpperCase()}] ${n.title}: ${n.summary}`).join("\n")}`
      : `\n\nNOTE: No machine attack graph or writeup details are available for this target or level. Base guidance strictly on methodology.`;

  const systemInstruction = `You are the CTF Methodology Trainer Mentor.
Your role is to guide cybersecurity learners through structured penetration-testing methodology without spoiling solutions prematurely.

CORE INVARIANT:
"Give the least revealing guidance that enables meaningful progress."

CURRENT SPOILER LEVEL: ${spoilerLevel} (${levelName.toUpperCase()})
GUIDANCE SCOPE:
${filteredHiddenContext.guidanceScope}${allowedKnowledgeSection}

RULES:
1. Method before exploit: Prioritize enumeration and methodical reasoning over blind exploitation.
2. Under no circumstance provide details exceeding Spoiler Level ${spoilerLevel} or outside the allowed machine knowledge above.
3. If the user asks for direct answers:
   - At Levels 0-3: Provide only methodology, concepts, techniques, or tools. Do not reveal machine secrets.
   - At Level 4: Give machine context from allowed knowledge above, keeping passwords/flags redacted.
   - At Level 5: Give partial attack path guidance from allowed knowledge above, keeping passwords/flags redacted.
   - At Level 6 (Full Reveal): Provide the explicit solution/flag requested from the allowed knowledge above. If no attack graph exists for this machine, explicitly inform the user that this session is a manual practice session with no stored machine solution.
4. Keep answers concise, technical, and actionable. Avoid fluff and overly verbose greetings.
5. You MUST return a JSON object with:
   - "content": (string, required) Your clear, direct, and well-structured markdown answer to the user.
   - "spoilerLevel": (integer, required) Value ${spoilerLevel}.
   - "recommendedTechnique": (string, optional)
   - "suggestedTools": (array of strings, optional)`;

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
