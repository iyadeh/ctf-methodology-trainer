import { and, asc, eq } from "drizzle-orm";
import { db } from "../../lib/db";
import { loadSessionContext } from "../context/repository";
import {
  attempts,
  findings,
  frameworkChecks,
  frameworkPhases,
  frameworks,
  hypotheses,
  methodologyDeviations,
  sessionChecks,
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

export async function lockTrainingSession(
  transaction: TrainingTransaction,
  sessionId: string,
): Promise<TrainingSessionRecord> {
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
  values: Partial<Pick<TrainingSessionRecord, "status" | "startedAt" | "targetIp">>,
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

      return {
        session,
        phases,
        checks,
        findings: sessionFindings,
        hypotheses: sessionHypotheses,
        attempts: sessionAttempts,
        context: await loadSessionContext(transaction, sessionId),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
