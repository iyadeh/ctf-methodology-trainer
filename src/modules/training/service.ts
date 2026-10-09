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
  const { session, phases, checks, findings, hypotheses, attempts, notes: sessionNotes, context } =
    await repository.loadTrainingSessionSnapshot(sessionId);
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
  action: "complete" | "skip",
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

export type ListTrainingSessionsResult = {
  sessions: TrainingSessionDemo[];
  metrics: TrainingSessionMetric[];
};

export async function listTrainingSessions(): Promise<ListTrainingSessionsResult> {
  const loaded = await repository.loadAllTrainingSessions();

  const sessions: TrainingSessionDemo[] = loaded.map((item, index) => {
    const { session, checks } = item;
    const status = mapSessionStatus(session.status);
    const action = mapSessionAction(session.status);
    const progressResult = calculateCoreProgress(checks.map(toMethodologyCheck));
    const completedChecks = checks.filter((c) => c.status === "completed").length;
    const progress =
      session.status === "completed"
        ? 100
        : session.status === "not_started" || completedChecks === 0
          ? 0
          : progressResult.percentage;
    const taskProgress = `${completedChecks} of ${checks.length} tasks`;
    const lastAccessedDate = session.updatedAt ? new Date(session.updatedAt) : new Date(session.createdAt);

    return {
      id: session.id,
      name: session.name,
      description: session.targetIp
        ? `Target host ${session.targetIp} assessed using PTES methodology.`
        : `Structured penetration testing practice session for ${session.name}.`,
      methodology: "PTES" as const,
      operatingSystem: "Linux" as const,
      difficulty: "Medium" as const,
      status,
      progress,
      taskProgress,
      lastAccessed: formatRelativeTime(lastAccessedDate),
      lastAccessedOrder: index + 1,
      createdOrder: index + 1,
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
    const { session, checks, phases } = featuredItem;
    const completedChecks = checks.filter((c) => c.status === "completed").length;
    const progressResult = calculateCoreProgress(checks.map(toMethodologyCheck));
    const progress =
      session.status === "completed"
        ? 100
        : session.status === "not_started" || completedChecks === 0
          ? 0
          : progressResult.percentage;
    const completedPhases = phases.filter((p) => p.status === "completed").length;
    const totalPhases = phases.length > 0 ? phases.length : 7;
    const status = mapSessionStatus(session.status) as DashboardSessionStatus;

    featuredSession = {
      id: session.id,
      name: session.name,
      description: session.targetIp
        ? `Target host ${session.targetIp} assessed using PTES methodology.`
        : `Structured penetration testing practice session for ${session.name}.`,
      status,
      tags: ["PTES", "Linux", "Practice"] as const,
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
      session.status === "completed"
        ? 100
        : session.status === "not_started" || completedChecks === 0
          ? 0
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
