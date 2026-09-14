import { and, asc, eq } from "drizzle-orm";
import { db } from "../../lib/db";
import { attempts, findings, hypotheses, trainingSessions } from "../../lib/db/schema";
import type { TrainingTransaction } from "./repository";
import { TrainingSessionError } from "./types";
import type { AttemptRecord, FindingRecord, HypothesisRecord } from "./types";

export async function ensureSessionExists(sessionId: string): Promise<void> {
  const [session] = await db
    .select({ id: trainingSessions.id })
    .from(trainingSessions)
    .where(eq(trainingSessions.id, sessionId));
  if (!session) {
    throw new TrainingSessionError("not_found", "Training Session not found.");
  }
}

export async function getFindingRecord(sessionId: string, findingId: string) {
  const [finding] = await db
    .select()
    .from(findings)
    .where(and(eq(findings.trainingSessionId, sessionId), eq(findings.id, findingId)));
  if (!finding) {
    throw new TrainingSessionError(
      "finding_not_found",
      "Finding does not belong to this Training Session.",
    );
  }
  return finding;
}

export async function lockFinding(
  transaction: TrainingTransaction,
  sessionId: string,
  findingId: string,
) {
  const [finding] = await transaction
    .select()
    .from(findings)
    .where(and(eq(findings.trainingSessionId, sessionId), eq(findings.id, findingId)))
    .for("update");
  if (!finding) {
    throw new TrainingSessionError(
      "finding_not_found",
      "Finding does not belong to this Training Session.",
    );
  }
  return finding;
}

export function listFindingRecords(sessionId: string) {
  return db
    .select()
    .from(findings)
    .where(eq(findings.trainingSessionId, sessionId))
    .orderBy(asc(findings.createdAt), asc(findings.id));
}

export async function insertFinding(
  transaction: TrainingTransaction,
  values: typeof findings.$inferInsert,
) {
  const [finding] = await transaction.insert(findings).values(values).returning();
  return finding;
}

export async function updateFindingRecord(
  transaction: TrainingTransaction,
  sessionId: string,
  findingId: string,
  values: Partial<Pick<FindingRecord,
    "title" | "category" | "evidence" | "evidenceState" | "importance" | "source" | "notes"
  >>,
) {
  const [finding] = await transaction
    .update(findings)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(findings.trainingSessionId, sessionId), eq(findings.id, findingId)))
    .returning();
  return finding;
}

export async function getHypothesisRecord(sessionId: string, hypothesisId: string) {
  const [hypothesis] = await db
    .select()
    .from(hypotheses)
    .where(
      and(eq(hypotheses.trainingSessionId, sessionId), eq(hypotheses.id, hypothesisId)),
    );
  if (!hypothesis) {
    throw new TrainingSessionError(
      "hypothesis_not_found",
      "Hypothesis does not belong to this Training Session.",
    );
  }
  return hypothesis;
}

export async function lockHypothesis(
  transaction: TrainingTransaction,
  sessionId: string,
  hypothesisId: string,
) {
  const [hypothesis] = await transaction
    .select()
    .from(hypotheses)
    .where(
      and(eq(hypotheses.trainingSessionId, sessionId), eq(hypotheses.id, hypothesisId)),
    )
    .for("update");
  if (!hypothesis) {
    throw new TrainingSessionError(
      "hypothesis_not_found",
      "Hypothesis does not belong to this Training Session.",
    );
  }
  return hypothesis;
}

export function listHypothesisRecords(sessionId: string) {
  return db
    .select()
    .from(hypotheses)
    .where(eq(hypotheses.trainingSessionId, sessionId))
    .orderBy(asc(hypotheses.createdAt), asc(hypotheses.id));
}

export async function insertHypothesis(
  transaction: TrainingTransaction,
  values: typeof hypotheses.$inferInsert,
) {
  const [hypothesis] = await transaction.insert(hypotheses).values(values).returning();
  return hypothesis;
}

export async function updateHypothesisRecord(
  transaction: TrainingTransaction,
  sessionId: string,
  hypothesisId: string,
  values: Partial<Pick<HypothesisRecord,
    "basedOnFindingId" | "hypothesis" | "reasoning" | "expectedResult" | "testApproach" | "outcome"
  >>,
) {
  const [hypothesis] = await transaction
    .update(hypotheses)
    .set({ ...values, updatedAt: new Date() })
    .where(
      and(eq(hypotheses.trainingSessionId, sessionId), eq(hypotheses.id, hypothesisId)),
    )
    .returning();
  return hypothesis;
}

export async function getAttemptRecord(sessionId: string, attemptId: string) {
  const [attempt] = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.trainingSessionId, sessionId), eq(attempts.id, attemptId)));
  if (!attempt) {
    throw new TrainingSessionError(
      "attempt_not_found",
      "Attempt does not belong to this Training Session.",
    );
  }
  return attempt;
}

export async function lockAttempt(
  transaction: TrainingTransaction,
  sessionId: string,
  attemptId: string,
) {
  const [attempt] = await transaction
    .select()
    .from(attempts)
    .where(and(eq(attempts.trainingSessionId, sessionId), eq(attempts.id, attemptId)))
    .for("update");
  if (!attempt) {
    throw new TrainingSessionError(
      "attempt_not_found",
      "Attempt does not belong to this Training Session.",
    );
  }
  return attempt;
}

export function listAttemptRecords(sessionId: string) {
  return db
    .select()
    .from(attempts)
    .where(eq(attempts.trainingSessionId, sessionId))
    .orderBy(asc(attempts.createdAt), asc(attempts.id));
}

export async function insertAttempt(
  transaction: TrainingTransaction,
  values: typeof attempts.$inferInsert,
) {
  const [attempt] = await transaction.insert(attempts).values(values).returning();
  return attempt;
}

export async function updateAttemptRecord(
  transaction: TrainingTransaction,
  sessionId: string,
  attemptId: string,
  values: Partial<Pick<AttemptRecord,
    "hypothesisId" | "action" | "notes" | "result" | "outcome"
  >>,
) {
  const [attempt] = await transaction
    .update(attempts)
    .set(values)
    .where(and(eq(attempts.trainingSessionId, sessionId), eq(attempts.id, attemptId)))
    .returning();
  return attempt;
}
