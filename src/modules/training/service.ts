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
} from "./types";

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
  const { session, phases, checks } =
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
