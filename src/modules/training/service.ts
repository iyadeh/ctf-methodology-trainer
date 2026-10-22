import { isIP } from "node:net";
import {
  calculateCoreProgress,
  calculateMethodologyCoverage,
  evaluatePhaseGate,
  getFirstPhase,
  getNextPhase,
  getPhaseGateOverride,
  type SessionCheckState,
} from "../methodology/engine";
import { ptesFramework } from "../methodology/ptes";
import * as repository from "./repository";
import { TrainingSessionError } from "./types";
import type {
  AdvancePhaseResult,
  SessionCheckRecord,
  TrainingSessionAggregate,
  TrainingSessionMode,
  TrainingSessionRecord,
} from "./types";
import type {
  TrainingSessionAction,
  TrainingSessionDemo,
  TrainingSessionMetric,
  TrainingSessionStatus,
} from "@/components/training/training-sessions-demo-data";
import { countAllHintRecords } from "../mentor/repository";
import type {
  DashboardData,
  DashboardSessionStatus,
  DashboardSessionSummary,
} from "@/components/dashboard/dashboard-demo-data";

export type CreateTrainingSessionInput = {
  name: string;
  frameworkSlug?: string;
  frameworkVersion?: number;
  mode?: TrainingSessionMode;
};

function toMethodologyCheck(check: SessionCheckRecord): SessionCheckState {
  return {
    semanticKey: check.semanticKey,
    title: check.title,
    priority: check.priority,
    status: check.status,
  };
}

export async function createTrainingSession({
  name,
  frameworkSlug = ptesFramework.slug,
  frameworkVersion = ptesFramework.version,
  mode = "guided",
}: CreateTrainingSessionInput): Promise<TrainingSessionAggregate> {
  const sessionName = name.trim();

  if (!sessionName || sessionName.length > 255) {
    throw new TrainingSessionError(
      "invalid_input",
      "Training Session name must contain 1–255 characters.",
    );
  }

  if (
    frameworkSlug !== ptesFramework.slug ||
    frameworkVersion !== ptesFramework.version
  ) {
    throw new TrainingSessionError(
      "invalid_input",
      "Only PTES — CTF Adapted v1 is available.",
    );
  }

  const sessionId = await repository.trainingTransaction(async (transaction) => {
    const framework = await repository.loadFramework(
      transaction,
      frameworkSlug,
      frameworkVersion,
    );
    const frameworkPhases = await repository.loadFrameworkPhases(
      transaction,
      framework.id,
    );

    if (frameworkPhases.length === 0) {
      throw new TrainingSessionError(
        "invalid_state",
        "Framework has no phases. Run pnpm db:seed.",
      );
    }

    const session = await repository.insertTrainingSession(
      transaction,
      framework.id,
      sessionName,
      mode,
    );

    for (const frameworkPhase of frameworkPhases) {
      const frameworkChecks = await repository.loadFrameworkChecks(
        transaction,
        frameworkPhase.id,
      );
      const phase = await repository.insertSessionPhase(transaction, {
        trainingSessionId: session.id,
        frameworkPhaseId: frameworkPhase.id,
        semanticKey: frameworkPhase.semanticKey,
        name: frameworkPhase.name,
        description: frameworkPhase.description,
        sortOrder: frameworkPhase.sortOrder,
        status: "locked",
      });

      if (frameworkChecks.length > 0) {
        await repository.insertSessionChecks(
          transaction,
          frameworkChecks.map((frameworkCheck) => ({
            trainingSessionId: session.id,
            sessionPhaseId: phase.id,
            frameworkCheckId: frameworkCheck.id,
            semanticKey: frameworkCheck.semanticKey,
            title: frameworkCheck.title,
            description: frameworkCheck.description,
            priority: frameworkCheck.priority,
            provenance: "core" as const,
            sortOrder: frameworkCheck.sortOrder,
            status: "inactive" as const,
            sourceVersion: framework.version,
          })),
        );
      }
    }

    return session.id;
  });

  return getTrainingSession(sessionId);
}

export async function getTrainingSession(
  sessionId: string,
): Promise<TrainingSessionAggregate> {
  const {
    session,
    phases,
    checks,
    findings,
    hypotheses,
    attempts,
    notes: sessionNotes,
    context,
    deviations,
    milestones,
  } = await repository.loadTrainingSessionSnapshot(sessionId);
  const phaseSnapshots = phases.map((phase) => ({
    ...phase,
    checks: checks.filter((check) => check.sessionPhaseId === phase.id),
  }));
  const activePhases = phaseSnapshots.filter((phase) => phase.status === "active");

  if (activePhases.length > 1) {
    throw new TrainingSessionError(
      "invalid_state",
      "Training Session has more than one active phase.",
    );
  }

  const methodologyChecks = checks.map(toMethodologyCheck);

  return {
    session,
    phases: phaseSnapshots,
    currentPhase: activePhases[0] ?? null,
    findings,
    hypotheses,
    attempts,
    notes: sessionNotes,
    context,
    deviations: deviations ?? [],
    milestones: (milestones ?? []).map((m) => ({
      ...m,
      // Rule 11: Hidden Knowledge Security Boundary. Never expose expected answer or answerHash before completion.
      expectedAnswer:
        session.status === "completed" || m.status === "completed"
          ? m.expectedAnswer
          : null,
      answerHash: null,
    })),
    progress: {
      required: calculateCoreProgress(methodologyChecks),
      coverage: calculateMethodologyCoverage(methodologyChecks),
      completedChecks: checks.filter((check) => check.status === "completed").length,
      remainingChecks: checks.filter(
        (check) => check.status === "active" || check.status === "skipped",
      ).length,
    },
  };
}

export async function getTrainingSessionProgress(sessionId: string) {
  const aggregate = await getTrainingSession(sessionId);
  return {
    currentPhase: aggregate.currentPhase,
    ...aggregate.progress,
  };
}

export async function startTrainingSession(
  sessionId: string,
): Promise<TrainingSessionAggregate> {
  await repository.trainingTransaction(async (transaction) => {
    const session = await repository.lockTrainingSession(transaction, sessionId);

    if (session.status === "in_progress") return;
    if (session.status !== "not_started") {
      throw new TrainingSessionError(
        "invalid_transition",
        `Cannot start a ${session.status} Training Session.`,
      );
    }

    const phases = await repository.loadSessionPhases(transaction, sessionId);
    const firstPhase = getFirstPhase(phases);

    if (!firstPhase || phases.some((phase) => phase.status !== "locked")) {
      throw new TrainingSessionError(
        "invalid_state",
        "Training Session phases are not ready to start.",
      );
    }

    await repository.updateTrainingSession(transaction, sessionId, {
      status: "in_progress",
      startedAt: session.startedAt ?? new Date(),
    });
    await repository.updateSessionPhase(transaction, firstPhase.id, "active");
    await repository.activatePhaseChecks(transaction, firstPhase.id);
  });

  return getTrainingSession(sessionId);
}

async function changeSessionStatus(
  sessionId: string,
  from: "in_progress" | "paused",
  to: "paused" | "in_progress",
): Promise<TrainingSessionAggregate> {
  await repository.trainingTransaction(async (transaction) => {
    const session = await repository.lockTrainingSession(transaction, sessionId);

    if (session.status !== from) {
      throw new TrainingSessionError(
        "invalid_transition",
        `Cannot change a ${session.status} Training Session to ${to}.`,
      );
    }

    await repository.updateTrainingSession(transaction, sessionId, { status: to });
  });

  return getTrainingSession(sessionId);
}

export function pauseTrainingSession(sessionId: string) {
  return changeSessionStatus(sessionId, "in_progress", "paused");
}

export function resumeTrainingSession(sessionId: string) {
  return changeSessionStatus(sessionId, "paused", "in_progress");
}

export async function setTrainingSessionTargetIp(
  sessionId: string,
  targetIp: string,
): Promise<TrainingSessionAggregate> {
  const normalizedIp = targetIp.trim();

  if (isIP(normalizedIp) === 0) {
    throw new TrainingSessionError("invalid_input", "Target IP must be valid IPv4 or IPv6.");
  }

  await repository.trainingTransaction(async (transaction) => {
    await repository.lockTrainingSession(transaction, sessionId);
    await repository.updateTrainingSession(transaction, sessionId, {
      targetIp: normalizedIp,
    });
  });

  return getTrainingSession(sessionId);
}

async function changeSessionCheck(
  sessionId: string,
  checkId: string,
  action: "complete" | "skip" | "reset",
): Promise<SessionCheckRecord> {
  return repository.trainingTransaction(async (transaction) => {
    const session = await repository.lockTrainingSession(transaction, sessionId);

    if (session.status !== "in_progress") {
      throw new TrainingSessionError(
        "invalid_transition",
        "Checks can change only while the Training Session is in progress.",
      );
    }

    const check = await repository.loadSessionCheck(transaction, sessionId, checkId);

    if (action === "reset") {
      if (check.status === "active") return check;
      if (check.status !== "completed" && check.status !== "skipped") {
        throw new TrainingSessionError(
          "invalid_transition",
          `Cannot reset a ${check.status} Session Check.`,
        );
      }
      return repository.updateSessionCheck(transaction, checkId, {
        status: "active",
        completedAt: null,
        skippedAt: null,
      });
    }

    const nextStatus = action === "complete" ? "completed" : "skipped";

    if (check.status === nextStatus) return check;
    if (check.status !== "active") {
      throw new TrainingSessionError(
        "invalid_transition",
        `Cannot ${action} a ${check.status} Session Check.`,
      );
    }

    return repository.updateSessionCheck(
      transaction,
      checkId,
      action === "complete"
        ? { status: "completed", completedAt: new Date() }
        : { status: "skipped", skippedAt: new Date() },
    );
  });
}

export function completeSessionCheck(sessionId: string, checkId: string) {
  return changeSessionCheck(sessionId, checkId, "complete");
}

export function skipSessionCheck(sessionId: string, checkId: string) {
  return changeSessionCheck(sessionId, checkId, "skip");
}

export function resetSessionCheck(sessionId: string, checkId: string) {
  return changeSessionCheck(sessionId, checkId, "reset");
}

export async function advanceTrainingSessionPhase(
  sessionId: string,
  options: { override?: boolean; reason?: string } = {},
): Promise<AdvancePhaseResult> {
  return repository.trainingTransaction(async (transaction) => {
    const session = await repository.lockTrainingSession(transaction, sessionId);

    if (session.status !== "in_progress") {
      throw new TrainingSessionError(
        "invalid_transition",
        "Only an in-progress Training Session can advance phases.",
      );
    }

    const phases = await repository.loadSessionPhases(transaction, sessionId);
    const activePhases = phases.filter((phase) => phase.status === "active");

    if (activePhases.length !== 1) {
      throw new TrainingSessionError(
        "invalid_state",
        "Training Session must have exactly one active phase.",
      );
    }

    const currentPhase = activePhases[0];
    const nextPhase = getNextPhase(phases, currentPhase.semanticKey);

    if (!nextPhase) {
      return { status: "final_phase_reached", finalPhaseReached: true };
    }

    if (nextPhase.status !== "locked") {
      throw new TrainingSessionError(
        "invalid_state",
        "Next Training Session phase must be locked before advancement.",
      );
    }

    const checks = await repository.loadPhaseChecks(
      transaction,
      sessionId,
      currentPhase.id,
    );
    const gate = evaluatePhaseGate(checks.map(toMethodologyCheck));

    if (!gate.allowed && !options.override) {
      return { status: "blocked", gate };
    }

    const override = getPhaseGateOverride(gate);

    if (override && options.override) {
      await repository.insertPhaseGateDeviation(
        transaction,
        sessionId,
        currentPhase.id,
        override.type,
        options.reason?.trim() || undefined,
      );
    }

    await repository.updateSessionPhase(transaction, currentPhase.id, "completed");
    await repository.updateSessionPhase(transaction, nextPhase.id, "active");
    await repository.activatePhaseChecks(transaction, nextPhase.id);

    return {
      status: "advanced",
      completedPhaseKey: currentPhase.semanticKey,
      activePhaseKey: nextPhase.semanticKey,
      overridden: override !== null && options.override === true,
    };
  });
}

export {
  completeTrainingSession,
  getRevealedReferencePath,
  completeSessionInputSchema,
  type CompleteSessionInput,
  type RevealedReferencePath,
  type RevealedReferencePathNode,
  type RevealedReferencePathEdge,
} from "./completion";

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
  if (diffDay === 1) return "Yesterday";
  return `${diffDay} days ago`;
}

function mapSessionStatus(status: TrainingSessionRecord["status"]): TrainingSessionStatus {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    case "not_started":
    default:
      return "Not Started";
  }
}

function mapSessionAction(status: TrainingSessionRecord["status"]): TrainingSessionAction {
  switch (status) {
    case "in_progress":
      return "Continue";
    case "paused":
      return "Resume";
    case "completed":
      return "Review";
    case "not_started":
    default:
      return "View Details";
  }
}

function formatOs(
  os?: string | null,
): "Linux" | "Windows" | "macOS" | "BSD" | "Android" | "Unknown" {
  if (!os) return "Unknown";
  const lower = os.toLowerCase().trim();
  if (lower === "unknown" || lower === "unspecified") return "Unknown";
  if (lower.includes("win")) return "Windows";
  if (lower.includes("bsd")) return "BSD";
  if (lower.includes("mac") || lower.includes("darwin") || lower.includes("ios") || lower.includes("apple")) return "macOS";
  if (lower.includes("android")) return "Android";
  if (
    lower.includes("lin") ||
    lower.includes("ubuntu") ||
    lower.includes("debian") ||
    lower.includes("centos") ||
    lower.includes("rhel") ||
    lower.includes("fedora") ||
    lower.includes("arch") ||
    lower.includes("kali")
  ) {
    return "Linux";
  }
  return "Unknown";
}

function formatDifficulty(
  diff?: string | null,
): "Easy" | "Medium" | "Hard" | "Insane" | "Unrated" {
  if (!diff) return "Unrated";
  const lower = diff.toLowerCase().trim();
  if (lower === "easy") return "Easy";
  if (lower === "medium") return "Medium";
  if (lower === "hard") return "Hard";
  if (lower === "insane") return "Insane";
  return "Unrated";
}

export async function deleteTrainingSession(sessionId: string): Promise<boolean> {
  return repository.deleteTrainingSessionRecord(sessionId);
}

export async function resetTrainingSession(
  sessionId: string,
): Promise<TrainingSessionAggregate> {
  await repository.resetTrainingSessionRecord(sessionId);
  return getTrainingSession(sessionId);
}

export async function renameTrainingSession(
  sessionId: string,
  newName: string,
): Promise<TrainingSessionAggregate> {
  await repository.renameTrainingSessionRecord(sessionId, newName);
  return getTrainingSession(sessionId);
}

export type ListTrainingSessionsResult = {
  sessions: TrainingSessionDemo[];
  metrics: TrainingSessionMetric[];
};

/**
 * Detects if a summary text contains exploit details, CVEs, credentials, or solution spoilers.
 */
export function containsExploitSpoilers(text: string): boolean {
  const spoilerPatterns = [
    /\bexploit(ing|ed|s)?\b/i,
    /\bvulnerabilit(y|ies)\b/i,
    /\bcve-\d+/i,
    /\bexploit-db\b/i,
    /\binitial foothold\b/i,
    /\bprivilege escalation\b/i,
    /\broot (access|was achieved|flag)\b/i,
    /\buser flag\b/i,
    /\bcredentials? (were|was)? leaked?\b/i,
    /\bpassword reuse\b/i,
    /\bplaintext (credentials?|passwords?)\b/i,
    /\bextracted credentials?\b/i,
    /\b(sqli|sql injection|idor|lfi|rfi|buffer overflow|kerberoasting|as-rep|bloodhound|suid|cap_setuid)\b/i,
    /\/(etc|var|tmp|root)\/[a-z0-9_.-]+/i,
  ];
  return spoilerPatterns.some((pattern) => pattern.test(text));
}

function isGenericPlaceholderSummary(summary?: string | null): boolean {
  if (!summary) return true;
  const s = summary.trim().toLowerCase();
  return (
    s.includes("standard web and network services configured for methodology practice") ||
    s.includes("target running standard web") ||
    s === "no summary available." ||
    s.length < 15
  );
}

/**
 * Ensures session description on cards never leaks exploit solutions prior to completion,
 * and provides clear, differentiated status once completed.
 */
export function formatSpoilerSafeSessionDescription(
  session: { name: string; status: string; targetIp?: string | null },
  profile?: { summary?: string | null; os?: string | null; difficulty?: string | null } | null,
): string {
  // If completed, provide a clear post-engagement summary
  if (session.status === "completed") {
    if (profile?.summary && !isGenericPlaceholderSummary(profile.summary)) {
      return profile.summary;
    }
    const ipSuffix = session.targetIp ? ` on ${session.targetIp}` : "";
    return `Penetration test completed for ${session.name}${ipSuffix}. Full attack chain, methodology adherence, and post-engagement review verified.`;
  }

  if (session.targetIp) {
    return `Target host ${session.targetIp} assessed using PTES methodology.`;
  }

  // For uncompleted sessions (not_started, in_progress, paused), check if summary is spoiler-free and non-generic
  if (profile?.summary && !isGenericPlaceholderSummary(profile.summary) && !containsExploitSpoilers(profile.summary)) {
    return profile.summary;
  }

  // Safe default for uncompleted sessions
  const osLabel =
    profile?.os && profile.os !== "unknown"
      ? `${profile.os.charAt(0).toUpperCase() + profile.os.slice(1)} `
      : "";
  return `Structured penetration testing practice session for ${session.name}. Practice methodical ${osLabel}enumeration and assessment via PTES.`;
}

export async function listTrainingSessions(): Promise<ListTrainingSessionsResult> {
  const loaded = await repository.loadAllTrainingSessions();

  // Create a map of created orders based on actual createdAt timestamps (newest = 1)
  const sortedByCreated = [...loaded].sort(
    (a, b) => new Date(b.session.createdAt).getTime() - new Date(a.session.createdAt).getTime(),
  );
  const createdOrderMap = new Map(sortedByCreated.map((item, idx) => [item.session.id, idx + 1]));

  const sessions: TrainingSessionDemo[] = loaded.map((item, index) => {
    const { session, checks, profile } = item;
    const status = mapSessionStatus(session.status);
    const action = mapSessionAction(session.status);
    const progressResult = calculateCoreProgress(checks.map(toMethodologyCheck));
    const completedChecks = checks.filter((c) => c.status === "completed").length;
    const progress =
      session.status === "not_started" || completedChecks === 0
        ? 0
        : session.status === "completed" && completedChecks >= checks.length
          ? 100
          : progressResult.percentage;
    const taskProgress =
      session.status === "completed"
        ? completedChecks === 0
          ? `0 of ${checks.length} tasks (Objective Captured)`
          : completedChecks >= checks.length
            ? `${completedChecks} of ${checks.length} tasks (Full Methodology Verified)`
            : `${completedChecks} of ${checks.length} tasks (Objective Captured)`
        : `${completedChecks} of ${checks.length} tasks`;
    const lastAccessedDate = session.updatedAt ? new Date(session.updatedAt) : new Date(session.createdAt);

    const description = formatSpoilerSafeSessionDescription(session, profile);

    return {
      id: session.id,
      name: session.name,
      description,
      methodology: "PTES" as const,
      operatingSystem: formatOs(profile?.os),
      difficulty: formatDifficulty(profile?.difficulty),
      status,
      progress,
      taskProgress,
      lastAccessed: formatRelativeTime(lastAccessedDate),
      lastAccessedOrder: index + 1,
      createdOrder: createdOrderMap.get(session.id) ?? index + 1,
      action,
    };
  });

  const total = sessions.length;
  const inProgress = sessions.filter((s) => s.status === "In Progress").length;
  const paused = sessions.filter((s) => s.status === "Paused").length;
  const completed = sessions.filter((s) => s.status === "Completed").length;

  const metrics: TrainingSessionMetric[] = [
    {
      label: "Total Sessions",
      value: total,
      description: "Across all machines",
    },
    { label: "In Progress", value: inProgress, description: "Keep going" },
    {
      label: "Paused",
      value: paused,
      description: "Pick up where you left off",
    },
    { label: "Completed", value: completed, description: "Great progress!" },
  ];

  return { sessions, metrics };
}

export async function getDashboardData(): Promise<DashboardData> {
  const loaded = await repository.loadAllTrainingSessions();
  const allHintCount = await countAllHintRecords();

  const inProgress = loaded.filter((item) => item.session.status === "in_progress").length;
  const completed = loaded.filter((item) => item.session.status === "completed").length;
  const paused = loaded.filter((item) => item.session.status === "paused").length;

  const overview = [
    {
      label: "In Progress",
      value: inProgress,
      description: "Active training sessions",
    },
    {
      label: "Completed",
      value: completed,
      description: "Machines finished",
    },
    {
      label: "Paused",
      value: paused,
      description: "Ready when you return",
    },
    {
      label: "Hints Used",
      value: allHintCount,
      description: "Across all sessions",
    },
  ];

  const featuredItem =
    loaded.find((item) => item.session.status === "in_progress") ??
    loaded.find((item) => item.session.status === "paused") ??
    loaded.find((item) => item.session.status === "not_started") ??
    loaded[0] ??
    null;

  let featuredSession: DashboardData["featuredSession"] = null;
  if (featuredItem) {
    const { session, checks, phases, profile } = featuredItem;
    const completedChecks = checks.filter((c) => c.status === "completed").length;
    const progressResult = calculateCoreProgress(checks.map(toMethodologyCheck));
    const progress =
      session.status === "not_started" || completedChecks === 0
        ? 0
        : session.status === "completed" && completedChecks >= checks.length
          ? 100
          : progressResult.percentage;
    const completedPhases = phases.filter((p) => p.status === "completed").length;
    const totalPhases = phases.length > 0 ? phases.length : 7;
    const status = mapSessionStatus(session.status) as DashboardSessionStatus;

    const description = formatSpoilerSafeSessionDescription(session, profile);

    featuredSession = {
      id: session.id,
      name: session.name,
      description,
      status,
      tags: ["PTES", formatOs(profile?.os), formatDifficulty(profile?.difficulty)],
      progress,
      completedPhases,
      totalPhases,
    };
  }

  const recentSessions: DashboardSessionSummary[] = loaded.slice(0, 3).map((item) => {
    const { session, checks } = item;
    const completedChecks = checks.filter((c) => c.status === "completed").length;
    const progressResult = calculateCoreProgress(checks.map(toMethodologyCheck));
    const progress =
      session.status === "not_started" || completedChecks === 0
        ? 0
        : session.status === "completed" && completedChecks >= checks.length
          ? 100
          : progressResult.percentage;
    const lastAccessedDate = session.updatedAt ? new Date(session.updatedAt) : new Date(session.createdAt);

    return {
      id: session.id,
      name: session.name,
      lastAccessed: formatRelativeTime(lastAccessedDate),
      status: mapSessionStatus(session.status) as DashboardSessionStatus,
      progress,
    };
  });

  const ptesPhases = [
    { name: "Reconnaissance", keys: ["pre-engagement", "intelligence-gathering", "reconnaissance"] },
    { name: "Threat Modeling", keys: ["threat-modeling"] },
    { name: "Vulnerability Analysis", keys: ["vulnerability-analysis"] },
    { name: "Exploitation", keys: ["exploitation"] },
    { name: "Post Exploitation", keys: ["post-exploitation"] },
    { name: "Reporting", keys: ["reporting"] },
  ];

  const methodologyProgress = ptesPhases.map((phaseDef) => {
    const phaseChecks = loaded.flatMap((item) => {
      const matchingPhases = item.phases.filter((p) =>
        phaseDef.keys.some((k) => p.semanticKey.toLowerCase().includes(k)),
      );
      const matchingPhaseIds = new Set(matchingPhases.map((p) => p.id));
      return item.checks.filter((c) => matchingPhaseIds.has(c.sessionPhaseId));
    });

    const completedCount = phaseChecks.filter((c) => c.status === "completed").length;
    const totalCount = phaseChecks.filter(
      (c) => c.priority === "required" || c.priority === "recommended",
    ).length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
      name: phaseDef.name,
      progress: Math.min(100, Math.max(0, progress)),
    };
  });

  return {
    featuredSession,
    recentSessions,
    methodologyProgress,
    overview,
  };
}
