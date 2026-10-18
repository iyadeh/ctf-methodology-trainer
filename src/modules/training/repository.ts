import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db } from "../../lib/db";
import { loadSessionContext } from "../context/repository";
import {
  attempts,
  contextObservations,
  findings,
  frameworkChecks,
  frameworkPhases,
  frameworks,
  generationRuns,
  hintRecords,
  hypotheses,
  machineProfiles,
  methodologyDeviations,
  notes,
  sessionChecks,
  sessionContexts,
  sessionPhases,
  trainingSessions,
} from "../../lib/db/schema";
import type { PhaseGateOverride } from "../methodology/engine";
import { TrainingSessionError } from "./types";
import type {
  SessionCheckRecord,
  SessionPhaseRecord,
  TrainingSessionRecord,
} from "./types";

export type TrainingTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function trainingTransaction<Result>(
  operation: (transaction: TrainingTransaction) => Promise<Result>,
): Promise<Result> {
  return db.transaction(operation);
}

export async function loadFramework(
  transaction: TrainingTransaction,
  slug: string,
  version: number,
) {
  const [framework] = await transaction
    .select()
    .from(frameworks)
    .where(and(eq(frameworks.slug, slug), eq(frameworks.version, version)));

  if (!framework) {
    throw new TrainingSessionError(
      "framework_not_found",
      `Framework ${slug} v${version} is not installed. Run pnpm db:seed.`,
    );
  }

  return framework;
}

export function loadFrameworkPhases(
  transaction: TrainingTransaction,
  frameworkId: string,
) {
  return transaction
    .select()
    .from(frameworkPhases)
    .where(eq(frameworkPhases.frameworkId, frameworkId))
    .orderBy(asc(frameworkPhases.sortOrder));
}

export function loadFrameworkChecks(
  transaction: TrainingTransaction,
  frameworkPhaseId: string,
) {
  return transaction
    .select()
    .from(frameworkChecks)
    .where(eq(frameworkChecks.frameworkPhaseId, frameworkPhaseId))
    .orderBy(asc(frameworkChecks.sortOrder));
}

export async function insertTrainingSession(
  transaction: TrainingTransaction,
  frameworkId: string,
  name: string,
) {
  const [session] = await transaction
    .insert(trainingSessions)
    .values({ frameworkId, name, status: "not_started" })
    .returning();
  return session;
}

export async function insertSessionPhase(
  transaction: TrainingTransaction,
  values: typeof sessionPhases.$inferInsert,
) {
  const [phase] = await transaction
    .insert(sessionPhases)
    .values(values)
    .returning();
  return phase;
}

export function insertSessionChecks(
  transaction: TrainingTransaction,
  values: (typeof sessionChecks.$inferInsert)[],
) {
  return transaction.insert(sessionChecks).values(values);
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return typeof id === "string" && UUID_REGEX.test(id);
}

export async function lockTrainingSession(
  transaction: TrainingTransaction,
  sessionId: string,
): Promise<TrainingSessionRecord> {
  if (!isValidUuid(sessionId)) {
    throw new TrainingSessionError("not_found", "Training Session not found.");
  }

  const [session] = await transaction
    .select()
    .from(trainingSessions)
    .where(eq(trainingSessions.id, sessionId))
    .for("update");

  if (!session) {
    throw new TrainingSessionError("not_found", "Training Session not found.");
  }

  return session;
}

export function loadSessionPhases(
  transaction: TrainingTransaction,
  sessionId: string,
) {
  return transaction
    .select()
    .from(sessionPhases)
    .where(eq(sessionPhases.trainingSessionId, sessionId))
    .orderBy(asc(sessionPhases.sortOrder));
}

export function loadPhaseChecks(
  transaction: TrainingTransaction,
  sessionId: string,
  phaseId: string,
) {
  return transaction
    .select()
    .from(sessionChecks)
    .where(
      and(
        eq(sessionChecks.trainingSessionId, sessionId),
        eq(sessionChecks.sessionPhaseId, phaseId),
      ),
    )
    .orderBy(asc(sessionChecks.sortOrder));
}

export async function loadSessionCheck(
  transaction: TrainingTransaction,
  sessionId: string,
  checkId: string,
): Promise<SessionCheckRecord> {
  const [check] = await transaction
    .select()
    .from(sessionChecks)
    .where(
      and(
        eq(sessionChecks.trainingSessionId, sessionId),
        eq(sessionChecks.id, checkId),
      ),
    );

  if (!check) {
    throw new TrainingSessionError(
      "check_not_found",
      "Session Check does not belong to this Training Session.",
    );
  }

  return check;
}

export async function updateTrainingSession(
  transaction: TrainingTransaction,
  sessionId: string,
  values: Partial<Pick<TrainingSessionRecord, "name" | "status" | "startedAt" | "completedAt" | "targetIp">>,
) {
  const [session] = await transaction
    .update(trainingSessions)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(trainingSessions.id, sessionId))
    .returning();
  return session;
}

export async function updateSessionPhase(
  transaction: TrainingTransaction,
  phaseId: string,
  status: SessionPhaseRecord["status"],
) {
  await transaction
    .update(sessionPhases)
    .set({ status, updatedAt: new Date() })
    .where(eq(sessionPhases.id, phaseId));
}

export async function activatePhaseChecks(
  transaction: TrainingTransaction,
  phaseId: string,
) {
  await transaction
    .update(sessionChecks)
    .set({ status: "active", activatedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(sessionChecks.sessionPhaseId, phaseId),
        eq(sessionChecks.status, "inactive"),
      ),
    );
}

export async function updateSessionCheck(
  transaction: TrainingTransaction,
  checkId: string,
  values: Pick<SessionCheckRecord, "status"> &
    Partial<Pick<SessionCheckRecord, "completedAt" | "skippedAt">>,
) {
  const [check] = await transaction
    .update(sessionChecks)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(sessionChecks.id, checkId))
    .returning();
  return check;
}

export async function insertPhaseGateDeviation(
  transaction: TrainingTransaction,
  sessionId: string,
  phaseId: string,
  type: PhaseGateOverride["type"],
  reason?: string,
) {
  await transaction.insert(methodologyDeviations).values({
    trainingSessionId: sessionId,
    sessionPhaseId: phaseId,
    type,
    reason,
  });
}

export async function loadTrainingSessionSnapshot(sessionId: string) {
  if (!isValidUuid(sessionId)) {
    throw new TrainingSessionError("not_found", "Training Session not found.");
  }

  return db.transaction(
    async (transaction) => {
      const [session] = await transaction
        .select()
        .from(trainingSessions)
        .where(eq(trainingSessions.id, sessionId));

      if (!session) {
        throw new TrainingSessionError("not_found", "Training Session not found.");
      }

      const phases = await transaction
        .select()
        .from(sessionPhases)
        .where(eq(sessionPhases.trainingSessionId, sessionId))
        .orderBy(asc(sessionPhases.sortOrder));
      const checks = await transaction
        .select()
        .from(sessionChecks)
        .where(eq(sessionChecks.trainingSessionId, sessionId))
        .orderBy(asc(sessionChecks.sortOrder));

      const sessionFindings = await transaction
        .select()
        .from(findings)
        .where(eq(findings.trainingSessionId, sessionId))
        .orderBy(asc(findings.createdAt), asc(findings.id));
      const sessionHypotheses = await transaction
        .select()
        .from(hypotheses)
        .where(eq(hypotheses.trainingSessionId, sessionId))
        .orderBy(asc(hypotheses.createdAt), asc(hypotheses.id));
      const sessionAttempts = await transaction
        .select()
        .from(attempts)
        .where(eq(attempts.trainingSessionId, sessionId))
        .orderBy(asc(attempts.createdAt), asc(attempts.id));
      const sessionNotes = await transaction
        .select()
        .from(notes)
        .where(eq(notes.trainingSessionId, sessionId))
        .orderBy(asc(notes.createdAt), asc(notes.id));
      const sessionDeviations = await transaction
        .select()
        .from(methodologyDeviations)
        .where(eq(methodologyDeviations.trainingSessionId, sessionId))
        .orderBy(asc(methodologyDeviations.createdAt));

      return {
        session,
        phases,
        checks,
        findings: sessionFindings,
        hypotheses: sessionHypotheses,
        attempts: sessionAttempts,
        notes: sessionNotes,
        deviations: sessionDeviations,
        context: await loadSessionContext(transaction, sessionId),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export async function loadAllTrainingSessions() {
  const allSessions = await db
    .select()
    .from(trainingSessions)
    .orderBy(desc(trainingSessions.updatedAt), desc(trainingSessions.createdAt));

  const allPhases = await db
    .select()
    .from(sessionPhases)
    .orderBy(asc(sessionPhases.sortOrder));

  const allChecks = await db
    .select()
    .from(sessionChecks)
    .orderBy(asc(sessionChecks.sortOrder));

  const allProfiles = await db
    .select()
    .from(machineProfiles);

  return allSessions.map((session) => {
    const phases = allPhases.filter((p) => p.trainingSessionId === session.id);
    const checks = allChecks.filter((c) => c.trainingSessionId === session.id);
    const profile = allProfiles.find((p) => p.trainingSessionId === session.id) ?? null;
    return {
      session,
      phases,
      checks,
      profile,
    };
  });
}

/**
 * Permanently deletes a training session and cleans up its associated records.
 */
export async function deleteTrainingSessionRecord(sessionId: string): Promise<boolean> {
  if (!isValidUuid(sessionId)) {
    throw new TrainingSessionError("not_found", "Training Session not found.");
  }

  return trainingTransaction(async (transaction) => {
    const [existing] = await transaction
      .select({ id: trainingSessions.id })
      .from(trainingSessions)
      .where(eq(trainingSessions.id, sessionId));

    if (!existing) {
      throw new TrainingSessionError("not_found", "Training Session not found.");
    }

    // Explicitly delete generationRuns referencing this session
    await transaction
      .delete(generationRuns)
      .where(eq(generationRuns.trainingSessionId, sessionId));

    // Delete session (foreign keys cascade to phases, checks, findings, notes, hints, profiles, graphs)
    await transaction
      .delete(trainingSessions)
      .where(eq(trainingSessions.id, sessionId));

    return true;
  });
}

/**
 * Resets a training session back to 'not_started' and resets its checklist and evidence.
 */
export async function resetTrainingSessionRecord(sessionId: string): Promise<void> {
  if (!isValidUuid(sessionId)) {
    throw new TrainingSessionError("not_found", "Training Session not found.");
  }

  await trainingTransaction(async (transaction) => {
    await lockTrainingSession(transaction, sessionId);

    // 1. Reset session status, startedAt, completedAt
    await transaction
      .update(trainingSessions)
      .set({
        status: "not_started",
        startedAt: null,
        completedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(trainingSessions.id, sessionId));

    // 2. Clear findings, hypotheses, attempts, notes, deviations, hints, and context
    await transaction.delete(findings).where(eq(findings.trainingSessionId, sessionId));
    await transaction.delete(hypotheses).where(eq(hypotheses.trainingSessionId, sessionId));
    await transaction.delete(attempts).where(eq(attempts.trainingSessionId, sessionId));
    await transaction.delete(notes).where(eq(notes.trainingSessionId, sessionId));
    await transaction.delete(methodologyDeviations).where(eq(methodologyDeviations.trainingSessionId, sessionId));
    await transaction.delete(hintRecords).where(eq(hintRecords.trainingSessionId, sessionId));
    await transaction.delete(contextObservations).where(eq(contextObservations.trainingSessionId, sessionId));
    await transaction.delete(sessionContexts).where(eq(sessionContexts.trainingSessionId, sessionId));

    // 3. Reset session phases: All phases locked (ready for startTrainingSession)
    const phases = await loadSessionPhases(transaction, sessionId);
    for (const p of phases) {
      await updateSessionPhase(transaction, p.id, "locked");
    }

    // 4. Delete non-core checks (dynamic playbook and suggested checks from previous runs)
    await transaction
      .delete(sessionChecks)
      .where(
        and(
          eq(sessionChecks.trainingSessionId, sessionId),
          ne(sessionChecks.provenance, "core"),
        ),
      );

    // 5. Reset remaining core checks: All checks inactive, timestamps cleared
    await transaction
      .update(sessionChecks)
      .set({
        status: "inactive",
        completedAt: null,
        activatedAt: null,
        skippedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(sessionChecks.trainingSessionId, sessionId));
  });
}

/**
 * Renames an existing training session.
 */
export async function renameTrainingSessionRecord(
  sessionId: string,
  newName: string,
): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed || trimmed.length > 255) {
    throw new TrainingSessionError(
      "invalid_input",
      "Training Session name must contain 1–255 characters.",
    );
  }
  if (!isValidUuid(sessionId)) {
    throw new TrainingSessionError("not_found", "Training Session not found.");
  }

  await trainingTransaction(async (transaction) => {
    const session = await lockTrainingSession(transaction, sessionId);
    await updateTrainingSession(transaction, session.id, {
      name: trimmed,
    });
  });
}
