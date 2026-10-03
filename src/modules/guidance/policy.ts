import type { AttackGraph, AttackNodePhase, SpoilerLevel } from "../attack-graph/types";
import { filteredHiddenContextSchema } from "./schema";
import {
  SPOILER_LEVEL_NAMES,
  type AllowedHiddenNode,
  type FilteredHiddenContext,
  type SpoilerLevelName,
} from "./types";

const PHASE_ORDER: Record<AttackNodePhase, number> = {
  reconnaissance: 1,
  threat_modeling: 2,
  vulnerability_analysis: 3,
  exploitation: 4,
  post_exploitation: 5,
  reporting: 6,
};

const CREDENTIAL_REGEX = /\b(?!(?:https?|ftp|file|ssh):)([a-zA-Z0-9_.-]{3,32}):(?!\/\/)([^\s:;'"`,]{4,64})\b/gi;
const FLAG_REGEX = /\b(HTB|FLAG|CTF)\{[^}]+\}/gi;
const ROOT_FLAG_PATH_REGEX = /\/root\/[a-zA-Z0-9_.-]*(?:flag|root)[a-zA-Z0-9_.-]*/gi;

/**
 * Redacts sensitive credentials, secrets, and raw flag strings from text.
 * Skips redaction if the identifier is already confirmed by the user.
 */
export function redactSensitiveText(
  text: string,
  confirmedIdentifiers: ReadonlySet<string>,
): { redactedText: string; redactedItems: string[] } {
  const redactedItems: string[] = [];
  let result = text;

  // Redact flags: e.g. HTB{...}
  result = result.replace(FLAG_REGEX, (match) => {
    if (confirmedIdentifiers.has(match)) {
      return match;
    }
    redactedItems.push(match);
    return "[REDACTED_FLAG]";
  });

  // Redact root flag paths
  result = result.replace(ROOT_FLAG_PATH_REGEX, (match) => {
    if (confirmedIdentifiers.has(match)) {
      return match;
    }
    redactedItems.push(match);
    return "[REDACTED_FLAG_PATH]";
  });

  // Redact credentials: e.g. user:password
  result = result.replace(CREDENTIAL_REGEX, (match, user, pass) => {
    if (confirmedIdentifiers.has(match) || confirmedIdentifiers.has(pass)) {
      return match;
    }
    redactedItems.push(match);
    return `${user}:[REDACTED_PASSWORD]`;
  });

  return { redactedText: result, redactedItems };
}

export interface FilterHiddenContextParams {
  readonly graph: AttackGraph;
  readonly spoilerLevel: SpoilerLevel;
  readonly currentPhaseKey: string;
  readonly confirmedFindingIdentifiers?: ReadonlySet<string>;
}

/**
 * Enforces Context Minimization:
 * Server-side deterministic filtering of hidden attack graph knowledge
 * according to the requested Spoiler Level (0 to 6).
 */
export function filterHiddenContextBySpoilerLevel(
  params: FilterHiddenContextParams,
): FilteredHiddenContext {
  const {
    graph,
    spoilerLevel,
    currentPhaseKey,
    confirmedFindingIdentifiers = new Set<string>(),
  } = params;

  const levelName: SpoilerLevelName = SPOILER_LEVEL_NAMES[spoilerLevel];
  const allRedactedItems: string[] = [];

  // LEVEL 0, 1, 2, 3: ZERO HIDDEN GRAPH NODES
  // PRD Rule: Context minimization - no attack graph nodes or machine-specific hidden answers
  if (spoilerLevel <= 3) {
    const scopeDescriptions: Record<number, string> = {
      0: "Framework methodology guidance only. No target-specific details or hidden attack graph nodes are provided.",
      1: "Theoretical security concepts only. General educational guidance without target solution details.",
      2: "Recommended methodology techniques (e.g. fuzzing, content discovery, inspection). No target secrets.",
      3: "Standard security tool suggestions and usage patterns. No specific target secrets or credentials.",
    };

    const emptyResult: FilteredHiddenContext = {
      requestedLevel: spoilerLevel,
      levelName,
      allowedNodes: [],
      redactedItems: [],
      guidanceScope: scopeDescriptions[spoilerLevel],
    };

    return filteredHiddenContextSchema.parse(emptyResult);
  }

  // LEVEL 4, 5, 6: FILTERED HIDDEN NODES
  const currentRank =
    PHASE_ORDER[currentPhaseKey as AttackNodePhase] || 1;

  // Find candidate nodes
  const candidateNodes = graph.nodes.filter((node) => {
    const nodeRank = PHASE_ORDER[node.phase] || 1;
    // Allow nodes up to the current phase + 1 next phase step if at level 5 or 6
    const maxAllowedRank = spoilerLevel >= 5 ? currentRank + 1 : currentRank;
    return nodeRank <= maxAllowedRank && node.spoilerLevel <= spoilerLevel;
  });

  // Transform and redact node content based on spoiler level
  const allowedNodes: AllowedHiddenNode[] = candidateNodes.map((node) => {
    let summary = `${node.title}. ${node.description}`;
    const tools = node.metadata?.toolsUsed ? [...node.metadata.toolsUsed] : undefined;

    if (spoilerLevel === 4) {
      // Level 4: Machine Context - redact all credentials, payloads, and specific paths
      const { redactedText, redactedItems } = redactSensitiveText(
        summary,
        confirmedFindingIdentifiers,
      );
      summary = redactedText;
      allRedactedItems.push(...redactedItems);
    } else if (spoilerLevel === 5) {
      // Level 5: Partial Solution - attack approach permitted, but raw credentials still redacted
      const { redactedText, redactedItems } = redactSensitiveText(
        summary,
        confirmedFindingIdentifiers,
      );
      summary = redactedText;
      allRedactedItems.push(...redactedItems);
    }
    // Level 6: Full Reveal - unredacted reference solution

    return {
      id: node.id,
      title: node.title,
      phase: node.phase,
      kind: node.kind,
      spoilerLevel: node.spoilerLevel,
      summary,
      toolsAllowed: tools,
    };
  });

  // Find the next logical milestone (frontier)
  const frontierNode = graph.nodes.find(
    (n) =>
      (PHASE_ORDER[n.phase] || 1) >= currentRank &&
      n.spoilerLevel > spoilerLevel,
  );

  const scopeDescriptions: Record<number, string> = {
    4: "Target machine context permitted. Passwords, hashes, and specific flags remain strictly redacted.",
    5: "Partial attack path guidance permitted. Approach is explained while raw credentials remain protected.",
    6: "Explicit reference solution allowed upon user request. Recorded as Full Reveal.",
  };

  const result: FilteredHiddenContext = {
    requestedLevel: spoilerLevel,
    levelName,
    allowedNodes,
    redactedItems: Array.from(new Set(allRedactedItems)),
    guidanceScope: scopeDescriptions[spoilerLevel],
    currentFrontierMilestone: frontierNode?.title,
  };

  return filteredHiddenContextSchema.parse(result);
}
