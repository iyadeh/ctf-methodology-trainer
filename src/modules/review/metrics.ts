import type {
  AttemptRecord,
  FindingRecord,
  HypothesisRecord,
  SessionCheckRecord,
  SessionPhaseRecord,
  TrainingSessionRecord,
} from "../training/types";
import type { RevealedReferencePath, RevealedReferencePathNode } from "../training/completion";
import type { HintMetrics } from "../mentor/types";
import type {
  ImprovementArea,
  MethodologyDeviationRecord,
  PathComparisonItem,
  ReviewMetrics,
  ReviewNarrative,
  UserPathStep,
} from "./types";

/**
 * Formats milliseconds into human-readable duration like "2h 18m" or "45m" or "< 1m".
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return "< 1m";
  const totalMinutes = Math.floor(ms / (1000 * 60));
  if (totalMinutes < 1) return "< 1m";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Computes deterministic, explainable methodology metrics from session data.
 * Pure function: Does NOT invoke AI or produce non-deterministic numbers.
 */
export function computeReviewMetrics(params: {
  session: TrainingSessionRecord;
  phases: readonly SessionPhaseRecord[];
  checks: readonly SessionCheckRecord[];
  findings: readonly FindingRecord[];
  hypotheses: readonly HypothesisRecord[];
  attempts: readonly AttemptRecord[];
  deviations: readonly MethodologyDeviationRecord[];
  hintMetrics?: HintMetrics;
}): ReviewMetrics {
  const { session, phases, checks, findings, hypotheses, attempts, deviations, hintMetrics } =
    params;

  // 1. Recon Coverage
  // Formula: completed required/recommended recon checks / activated required/recommended recon checks
  const reconPhase = phases.find((p) => p.semanticKey === "reconnaissance");
  const reconPhaseId = reconPhase?.id;

  const reconChecks = checks.filter(
    (c) =>
      c.sessionPhaseId === reconPhaseId &&
      (c.priority === "required" || c.priority === "recommended") &&
      c.status !== "superseded",
  );

  const completedReconChecks = reconChecks.filter((c) => c.status === "completed");
  const reconTotal = reconChecks.length;
  const reconCompleted = completedReconChecks.length;
  const reconCoverage =
    reconTotal > 0 ? Math.min(100, Math.round((reconCompleted / reconTotal) * 100)) : 100;

  // 2. Phase Gate Compliance
  // Formula: phases entered without override / total gated transitions
  // Gated transitions = total phases past phase 1 (typically 5 gated transitions in PTES)
  const totalTransitions = Math.max(1, phases.length - 1);
  const phaseOverrides = deviations.filter((d) => d.type === "phase_gate_override").length;
  const compliantTransitions = Math.max(0, totalTransitions - phaseOverrides);
  const phaseGateCompliance = Math.min(
    100,
    Math.max(0, Math.round((compliantTransitions / totalTransitions) * 100)),
  );

  // 3. Hypothesis Discipline
  // Formula: validated attack attempts associated with hypotheses / relevant attack attempts
  const totalAttempts = attempts.length;
  const attemptsWithHypothesis = attempts.filter((a) => a.hypothesisId !== null).length;
  const hypothesisDiscipline =
    totalAttempts > 0
      ? Math.min(100, Math.round((attemptsWithHypothesis / totalAttempts) * 100))
      : hypotheses.length > 0
        ? 100
        : 100;

  // 4. Documentation Coverage
  // Formula: documented meaningful findings / confirmed session findings
  const confirmedFindings = findings.filter((f) => f.evidenceState === "confirmed");
  const totalConfirmed = confirmedFindings.length;
  const documentedFindings = confirmedFindings.filter(
    (f) => typeof f.evidence === "string" && f.evidence.trim().length > 0,
  );
  const documentationCoverage =
    totalConfirmed > 0
      ? Math.min(100, Math.round((documentedFindings.length / totalConfirmed) * 100))
      : 100;

  // 5. Durations and Counters
  const startedTime = session.startedAt ? new Date(session.startedAt).getTime() : new Date(session.createdAt).getTime();
  const completedTime = session.completedAt ? new Date(session.completedAt).getTime() : Date.now();
  const totalDurationMs = Math.max(0, completedTime - startedTime);
  const totalDurationFormatted = formatDuration(totalDurationMs);

  const totalChecksCompleted = checks.filter((c) => c.status === "completed").length;

  return {
    reconCoverage,
    phaseGateCompliance,
    hypothesisDiscipline,
    documentationCoverage,
    hintsUsed: hintMetrics?.totalHints ?? 0,
    machineHints: hintMetrics?.machineSpecificHints ?? 0,
    fullReveals: hintMetrics?.fullReveals ?? 0,
    phaseOverrides,
    totalPenaltyPoints: hintMetrics?.totalPenaltyPoints ?? 0,
    totalDurationMs,
    totalDurationFormatted,
    totalChecksCompleted,
    totalFindingsRecorded: findings.length,
    totalHypothesesFormed: hypotheses.length,
    totalAttemptsExecuted: attempts.length,
    breakdown: {
      recon: {
        completed: reconCompleted,
        total: reconTotal,
      },
      gates: {
        compliantTransitions,
        totalTransitions,
        overrides: phaseOverrides,
      },
      hypotheses: {
        attemptsWithHypothesis,
        totalAttempts,
      },
      documentation: {
        confirmedWithEvidence: documentedFindings.length,
        totalConfirmed,
      },
    },
  };
}

/**
 * Reconstructs the chronological User Path from session activities.
 */
export function reconstructUserPath(params: {
  session: TrainingSessionRecord;
  phases?: readonly SessionPhaseRecord[];
  findings: readonly FindingRecord[];
  hypotheses: readonly HypothesisRecord[];
  attempts: readonly AttemptRecord[];
}): UserPathStep[] {
  const { session, findings, hypotheses, attempts } = params;

  type RawTimelineEvent = {
    timestamp: Date;
    stepNumber: number;
    phase: string;
    title: string;
    description: string;
    kind: UserPathStep["kind"];
    evidence?: string | null;
  };

  const rawEvents: RawTimelineEvent[] = [];

  // 1. Session start
  const startTime = session.startedAt ? new Date(session.startedAt) : new Date(session.createdAt);
  rawEvents.push({
    timestamp: startTime,
    stepNumber: 1,
    phase: "reconnaissance",
    title: "Session Initialized & Reconnaissance Commenced",
    description: `Target IP ${session.targetIp ?? "unspecified"}. Began structured penetration testing workflow.`,
    kind: "phase_start",
  });

  // 2. Confirmed findings
  for (const finding of findings) {
    const isFlag =
      finding.category.toLowerCase().includes("objective") ||
      finding.category.toLowerCase().includes("flag") ||
      finding.title.toLowerCase().includes("flag");

    let kind: UserPathStep["kind"] = "milestone";
    let phase = "reconnaissance";

    if (isFlag) {
      kind = "objective_capture";
      phase = "post_exploitation";
    } else if (finding.contextKind === "service" || finding.category.toLowerCase().includes("service")) {
      kind = "service_discovery";
      phase = "reconnaissance";
    } else if (finding.contextKind === "surface" || finding.category.toLowerCase().includes("surface")) {
      kind = "surface_enumeration";
      phase = "threat_modeling";
    } else if (
      finding.category.toLowerCase().includes("vulnerability") ||
      finding.title.toLowerCase().includes("injection") ||
      finding.title.toLowerCase().includes("overflow")
    ) {
      kind = "vulnerability";
      phase = "vulnerability_analysis";
    }

    rawEvents.push({
      timestamp: new Date(finding.createdAt),
      stepNumber: 0,
      phase,
      title: `${finding.category}: ${finding.title}`,
      description: finding.notes || finding.evidence || "Recorded finding",
      kind,
      evidence: finding.evidence,
    });
  }

  // Objective capture from confirmed submitted flags
  if (session.userFlag) {
    rawEvents.push({
      timestamp: session.userFlagSubmittedAt ? new Date(session.userFlagSubmittedAt) : new Date(session.updatedAt),
      stepNumber: 0,
      phase: "exploitation",
      title: "Objective Captured: User Flag Submitted",
      description: `User flag confirmed: ${session.userFlag}`,
      kind: "objective_capture",
      evidence: session.userFlag,
    });
  }

  if (session.rootFlag) {
    rawEvents.push({
      timestamp: session.rootFlagSubmittedAt ? new Date(session.rootFlagSubmittedAt) : new Date(session.updatedAt),
      stepNumber: 0,
      phase: "post_exploitation",
      title: "Objective Captured: Root Flag Submitted",
      description: `Root flag confirmed: ${session.rootFlag}`,
      kind: "objective_capture",
      evidence: session.rootFlag,
    });
  }

  // 3. Hypotheses
  for (const hyp of hypotheses) {
    rawEvents.push({
      timestamp: new Date(hyp.createdAt),
      stepNumber: 0,
      phase: "threat_modeling",
      title: `Hypothesis Formulated: ${hyp.hypothesis}`,
      description: `Reasoning: ${hyp.reasoning}. Test Approach: ${hyp.testApproach}. Expected: ${hyp.expectedResult}`,
      kind: "hypothesis",
    });
  }

  // 4. Attempts
  for (const att of attempts) {
    const isSuccess = att.outcome === "confirmed";
    rawEvents.push({
      timestamp: new Date(att.createdAt),
      stepNumber: 0,
      phase: "exploitation",
      title: `Execution Attempt [${att.outcome.toUpperCase()}]: ${att.action}`,
      description: att.result || att.notes || "Attempt executed",
      kind: isSuccess ? "milestone" : "attempt",
    });
  }

  // Sort events chronologically
  rawEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Deduplicate and assign sequential step numbers
  const steps: UserPathStep[] = [];
  let currentStep = 1;

  for (const evt of rawEvents) {
    const elapsedMs = evt.timestamp.getTime() - startTime.getTime();
    steps.push({
      id: `user-step-${currentStep}`,
      stepNumber: currentStep,
      phase: evt.phase,
      title: evt.title,
      description: evt.description,
      timestamp: evt.timestamp,
      durationFormatted: formatDuration(elapsedMs),
      kind: evt.kind,
      evidence: evt.evidence,
    });
    currentStep++;
  }

  return steps;
}

const COMMON_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with", "from", "by", "of",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "performed", "perform", "step", "using", "used", "into", "that", "this", "target", "system",
  "allows", "allowed", "allowing", "obtain", "obtaining", "transition", "execute", "execution",
  "read", "write", "access", "via", "through", "then", "after", "before", "over", "under", "between"
]);

function extractDistinctiveTokens(text: string): string[] {
  if (!text) return [];
  const matches = text.toLowerCase().match(/[a-z0-9_.-]{3,}/g) || [];
  return Array.from(new Set(matches.filter((w) => !COMMON_STOP_WORDS.has(w) && !/^\d+$/.test(w))));
}

function scoreFindingMatch(
  refNode: RevealedReferencePathNode,
  finding: FindingRecord,
  session?: TrainingSessionRecord,
): number {
  const refPort = refNode.port;
  const refService = (refNode.service || "").toLowerCase();
  const refTools = (refNode.toolsUsed || []).map((t) => t.toLowerCase());
  const refTitleLower = refNode.title.toLowerCase();
  const refDescLower = (refNode.description || "").toLowerCase();
  const semKeyLower = (refNode.semanticKey || "").toLowerCase();

  const fTitleLower = finding.title.toLowerCase();
  const fEvidenceLower = (finding.evidence ?? "").toLowerCase();
  const fCategoryLower = (finding.category ?? "").toLowerCase();
  const fContextLower = (finding.contextValue ?? "").toLowerCase();
  const fCombined = `${fTitleLower} ${fEvidenceLower} ${fCategoryLower} ${fContextLower}`;

  let score = 0;

  // 1. Port match
  if (refPort) {
    if (
      fEvidenceLower.includes(`${refPort}/tcp`) ||
      fEvidenceLower.includes(`${refPort}/udp`) ||
      fEvidenceLower.includes(`:${refPort}`)
    ) {
      score += 40;
    }
    if (fTitleLower.includes(String(refPort))) {
      score += 35;
    }
  }

  // 2. Service match
  if (refService) {
    if (fContextLower === refService) {
      score += 30;
    }
    if (fTitleLower.includes(refService)) {
      score += 20;
    } else if (fCombined.includes(refService)) {
      score += 15;
    }
  }

  // 3. Dynamic token matching from title, semanticKey, and description
  const refTokens = extractDistinctiveTokens(`${refTitleLower} ${refDescLower} ${semKeyLower}`);
  for (const token of refTokens) {
    const isSpecialToken = token.includes(".") || token.includes("_") || token.length >= 6;
    if (fTitleLower.includes(token)) {
      score += isSpecialToken ? 40 : 20;
    } else if (fContextLower.includes(token)) {
      score += isSpecialToken ? 30 : 15;
    } else if (fEvidenceLower.includes(token)) {
      score += isSpecialToken ? 20 : 10;
    }
  }

  // 4. Tools match
  for (const tool of refTools) {
    if (["cat", "su", "curl", "ssh", "echo"].includes(tool)) continue;
    if (fTitleLower.includes(tool)) {
      score += 35;
    } else if (fEvidenceLower.includes(tool)) {
      score += 20;
    }
  }

  // 5. Objective / Root flag match
  const isTerminalRef = refNode.isTerminal || refNode.kind === "objective_capture" || refTitleLower.includes("flag");
  if (isTerminalRef) {
    if (fTitleLower.includes("root") && fTitleLower.includes("flag")) {
      score += 80;
    } else if (fCombined.includes("root.txt") || fCategoryLower.includes("objective")) {
      score += 60;
    } else if (fTitleLower.includes("root") || fEvidenceLower.includes("root.txt")) {
      score += 40;
    }
    if (session && session.rootFlag && (fCombined.includes("root") || fEvidenceLower.includes("root"))) {
      score += 40;
    }
  }

  // 6. Semantic category/phase correlation
  if (refNode.phase === "reconnaissance" && (finding.category.toLowerCase().includes("network") || fContextLower === "service")) {
    score += 10;
  }
  if (
    refNode.phase === "threat_modeling" &&
    (finding.category.toLowerCase().includes("surface") || fCombined.includes("directory") || fCombined.includes("scan"))
  ) {
    score += 15;
  }
  if (
    (refNode.phase === "privilege_escalation" || refNode.kind === "privilege_escalation") &&
    (finding.category.toLowerCase().includes("privilege") || finding.category.toLowerCase().includes("sudo") || fCombined.includes("sudo"))
  ) {
    score += 15;
  }

  return score;
}

/**
 * Compares the learner's User Path against canonical Reference Path nodes.
 */
export function compareUserAndReferencePaths(params: {
  userPath: readonly UserPathStep[];
  findings: readonly FindingRecord[];
  referencePath: RevealedReferencePath | null;
  session?: TrainingSessionRecord;
}): PathComparisonItem[] {
  const { userPath, findings, referencePath, session } = params;

  if (!referencePath || !referencePath.available || referencePath.referencePathNodes.length === 0) {
    return [];
  }

  return referencePath.referencePathNodes.map((refNode, idx) => {
    const stepNumber = idx + 1;
    const refTitleLower = refNode.title.toLowerCase();

    // 1. Score findings against refNode
    let bestFinding: FindingRecord | undefined;
    let bestScore = 0;

    for (const f of findings) {
      const s = scoreFindingMatch(refNode, f, session);
      if (s > bestScore) {
        bestScore = s;
        bestFinding = f;
      }
    }

    // 2. Check user path steps
    let matchedStep = bestFinding ? userPath.find((s) => s.title.includes(bestFinding!.title)) : undefined;

    if (!matchedStep) {
      matchedStep = userPath.find((s) => {
        const sTitleLower = s.title.toLowerCase();
        const sDescLower = s.description.toLowerCase();

        if (refNode.port && (sDescLower.includes(String(refNode.port)) || sTitleLower.includes(String(refNode.port)))) return true;
        if (refNode.isTerminal && s.kind === "objective_capture") return true;
        if (refNode.isEntryPoint && s.kind === "service_discovery") return true;
        if (refNode.phase === s.phase && sTitleLower.includes(refNode.kind.replace(/_/g, " "))) return true;
        return false;
      });
    }

    const isTerminalFallback =
      (refNode.isTerminal || refNode.kind === "objective_capture" || refTitleLower.includes("root flag")) &&
      Boolean(session?.rootFlag);

    let userStatus: PathComparisonItem["userStatus"] = "unmatched";
    if (bestScore >= 35 || isTerminalFallback || (matchedStep && matchedStep.kind === "objective_capture")) {
      userStatus = "matched";
    } else if (bestScore >= 15 || Boolean(matchedStep)) {
      userStatus = "partially_matched";
    }

    const displayTitle =
      matchedStep?.title ||
      (bestFinding ? `${bestFinding.category}: ${bestFinding.title}` : undefined) ||
      (isTerminalFallback ? "Objective Captured: Root Flag Submitted" : undefined);

    const displayEvidence =
      bestFinding?.evidence ||
      matchedStep?.evidence ||
      (isTerminalFallback ? session?.rootFlag ?? undefined : undefined);

    return {
      referenceNodeId: refNode.id,
      referenceStepNumber: stepNumber,
      referenceTitle: refNode.title,
      referencePhase: refNode.phase,
      referenceKind: refNode.kind,
      referenceTools: refNode.toolsUsed,
      userStatus,
      matchedUserStepTitle: displayTitle,
      matchedEvidence: displayEvidence,
      notes:
        userStatus === "matched"
          ? "Step covered and documented in evidence."
          : userStatus === "partially_matched"
            ? "Phase/activity touched but specific target details differed."
            : "Reference step not observed or not recorded during session.",
    };
  });
}

/**
 * Computes grounded Improvement Areas from metrics and deviations.
 */
export function computeImprovementAreas(
  metrics: ReviewMetrics,
  deviations: readonly MethodologyDeviationRecord[],
): ImprovementArea[] {
  const areas: ImprovementArea[] = [];

  // 1. Recon Coverage
  if (metrics.reconCoverage < 80) {
    areas.push({
      id: "recon-depth",
      title: "Expand Reconnaissance Coverage",
      description: `Reconnaissance coverage was ${metrics.reconCoverage}%. Skipping preliminary enumeration checks increases the likelihood of missing subtle attack vectors.`,
      severity: "high",
      metric: "Recon Coverage",
    });
  } else if (metrics.reconCoverage < 95) {
    areas.push({
      id: "recon-depth-refine",
      title: "Complete Secondary Reconnaissance Checks",
      description: `Reconnaissance coverage reached ${metrics.reconCoverage}%. A few recommended checks were skipped before transitioning phases.`,
      severity: "low",
      metric: "Recon Coverage",
    });
  }

  // 2. Phase Gate Overrides
  if (metrics.phaseOverrides > 0 || deviations.length > 0) {
    const overrideCount = metrics.phaseOverrides || deviations.length;
    areas.push({
      id: "phase-gate-discipline",
      title: "Respect Methodology Phase Gates",
      description: `Phase Gate was overridden ${overrideCount} time(s). Advancing without completing required checks creates blind spots and methodology deviations.`,
      severity: "high",
      metric: "Phase Gate Compliance",
    });
  }

  // 3. Hypothesis Discipline
  if (metrics.hypothesisDiscipline < 75) {
    areas.push({
      id: "hypothesis-documentation",
      title: "Formulate Hypotheses Prior to Execution",
      description: `Hypothesis discipline was ${metrics.hypothesisDiscipline}%. Recording your reasoning and expected outcomes prior to attempts prevents trial-and-error bias.`,
      severity: "medium",
      metric: "Hypothesis Discipline",
    });
  }

  // 4. Solution Reveals / Hints
  if (metrics.fullReveals > 0) {
    areas.push({
      id: "reduce-reveals",
      title: "Minimize Full Solution Escalation",
      description: `${metrics.fullReveals} full reveal hint(s) were accessed. Work through progressive hints (concepts and techniques) before escalating to target solutions.`,
      severity: "high",
      metric: "Hint Usage",
    });
  } else if (metrics.machineHints > 2) {
    areas.push({
      id: "independent-enumeration",
      title: "Strengthen Independent Enumeration",
      description: `${metrics.machineHints} machine-specific hint(s) were used. Deepen directory fuzzing, source review, and protocol analysis before requesting target hints.`,
      severity: "medium",
      metric: "Hint Usage",
    });
  }

  // 5. Documentation
  if (metrics.documentationCoverage < 75) {
    areas.push({
      id: "evidence-documentation",
      title: "Deepen Finding Evidence Documentation",
      description: `Documentation coverage was ${metrics.documentationCoverage}%. Ensure all discovered credentials, endpoints, and hashes include explicit supporting evidence.`,
      severity: "medium",
      metric: "Documentation Coverage",
    });
  }

  // Default accolade if everything is top tier
  if (areas.length === 0) {
    areas.push({
      id: "methodology-mastery",
      title: "Maintain Disciplined Methodology",
      description: "Exceptional methodology discipline across all PTES phases, zero phase gate overrides, and disciplined hypothesis formulation.",
      severity: "low",
      metric: "Overall Quality",
    });
  }

  return areas;
}

/**
 * Generates deterministic narrative review for fallback / baseline.
 */
export function generateDeterministicNarrative(
  metrics: ReviewMetrics,
  sessionName: string,
  improvementAreas: readonly ImprovementArea[],
): ReviewNarrative {
  const strengths: string[] = [];
  const areasForGrowth: string[] = [];

  if (metrics.reconCoverage >= 80) {
    strengths.push(`Strong reconnaissance coverage (${metrics.reconCoverage}%), ensuring the target attack surface was thoroughly mapped.`);
  }
  if (metrics.phaseGateCompliance === 100) {
    strengths.push("Zero phase gate overrides: strictly observed methodology boundaries before advancing to active exploitation.");
  }
  if (metrics.hypothesisDiscipline >= 80) {
    strengths.push(`Disciplined scientific testing (${metrics.hypothesisDiscipline}% hypothesis alignment): actions were supported by structured reasoning.`);
  }
  if (metrics.hintsUsed === 0) {
    strengths.push("Completely autonomous execution: 0 hints were required to complete the objective.");
  } else if (metrics.fullReveals === 0) {
    strengths.push("Controlled guidance usage: no full solution reveals were triggered during the assessment.");
  }

  for (const area of improvementAreas) {
    if (area.severity === "high" || area.severity === "medium") {
      areasForGrowth.push(`${area.title}: ${area.description}`);
    }
  }

  if (areasForGrowth.length === 0) {
    areasForGrowth.push("Continue testing unfamiliar protocols and post-exploitation workflows to broaden coverage.");
  }

  const executiveSummary = `Assessment of "${sessionName}" concluded in ${metrics.totalDurationFormatted} with ${metrics.totalChecksCompleted} checklist items completed and ${metrics.totalFindingsRecorded} findings documented. Overall Phase Gate compliance stood at ${metrics.phaseGateCompliance}%, and Reconnaissance coverage reached ${metrics.reconCoverage}%.`;

  const recommendation =
    metrics.phaseGateCompliance < 100 || metrics.reconCoverage < 80
      ? "For subsequent targets, prioritize complete service and surface enumeration before proceeding to active exploit attempts."
      : "Maintain this structured approach on more complex multi-tier network topologies and privilege escalation scenarios.";

  return {
    executiveSummary,
    strengths: strengths.length > 0 ? strengths : ["Demonstrated persistence in reaching target completion."],
    areasForGrowth,
    recommendation,
    isAiGenerated: false,
  };
}
