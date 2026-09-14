import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "../../lib/db";
import { contextObservations, sessionContexts } from "../../lib/db/schema";
import type { TrainingTransaction } from "../training/repository";
import type { FindingRecord } from "../training/types";
import type { SessionContextWithEvidence } from "./types";

// The application holds the session row lock throughout reconciliation.
export async function reconcileContextObservations(
  transaction: TrainingTransaction,
  finding: FindingRecord,
  canonicalKeys: readonly string[],
): Promise<void> {
  const sessionId = finding.trainingSessionId;
  const current = await transaction.select().from(contextObservations).where(and(
    eq(contextObservations.trainingSessionId, sessionId),
    eq(contextObservations.findingId, finding.id),
    isNull(contextObservations.retractedAt),
  ));
  const retained = current.filter((observation) =>
    canonicalKeys.includes(observation.canonicalKey)
    && observation.sourceKind === finding.contextKind
    && observation.sourceValue === finding.contextValue,
  );
  const retainedIds = new Set(retained.map((observation) => observation.id));
  const retiredIds = current.filter((observation) => !retainedIds.has(observation.id))
    .map((observation) => observation.id);
  const now = new Date();

  if (retiredIds.length > 0) {
    await transaction.update(contextObservations).set({ retractedAt: now }).where(and(
      eq(contextObservations.trainingSessionId, sessionId),
      inArray(contextObservations.id, retiredIds),
    ));
  }

  if (finding.contextKind && finding.contextValue) {
    for (const canonicalKey of canonicalKeys) {
      await transaction.insert(sessionContexts).values({
        trainingSessionId: sessionId, canonicalKey,
      }).onConflictDoNothing();

      if (!retained.some((observation) => observation.canonicalKey === canonicalKey)) {
        await transaction.insert(contextObservations).values({
          trainingSessionId: sessionId,
          findingId: finding.id,
          canonicalKey,
          sourceKind: finding.contextKind,
          sourceValue: finding.contextValue,
          createdAt: now,
        });
      }
    }
  }

  const affectedKeys = new Set([...current.map((observation) => observation.canonicalKey), ...canonicalKeys]);
  for (const canonicalKey of affectedKeys) {
    const [support] = await transaction.select({ id: contextObservations.id })
      .from(contextObservations).where(and(
        eq(contextObservations.trainingSessionId, sessionId),
        eq(contextObservations.canonicalKey, canonicalKey),
        isNull(contextObservations.retractedAt),
      )).limit(1);
    const state = support ? "active" : "inactive";
    await transaction.update(sessionContexts).set({ state, updatedAt: now }).where(and(
      eq(sessionContexts.trainingSessionId, sessionId),
      eq(sessionContexts.canonicalKey, canonicalKey),
      ne(sessionContexts.state, state),
    ));
  }
}

export async function loadSessionContext(
  connection: Pick<typeof db, "select">,
  sessionId: string,
): Promise<SessionContextWithEvidence[]> {
  const rows = await connection.select({
    context: sessionContexts,
    observation: contextObservations,
  }).from(sessionContexts).innerJoin(contextObservations, and(
    eq(contextObservations.trainingSessionId, sessionContexts.trainingSessionId),
    eq(contextObservations.canonicalKey, sessionContexts.canonicalKey),
  )).where(and(
    eq(sessionContexts.trainingSessionId, sessionId),
    eq(sessionContexts.state, "active"),
    isNull(contextObservations.retractedAt),
  )).orderBy(asc(sessionContexts.canonicalKey), asc(contextObservations.createdAt), asc(contextObservations.id));

  const contexts = new Map<string, SessionContextWithEvidence>();
  for (const { context, observation } of rows) {
    const entry = contexts.get(context.id) ?? { ...context, observations: [] };
    entry.observations.push(observation);
    contexts.set(context.id, entry);
  }
  return [...contexts.values()];
}

export function readSessionContext(sessionId: string) {
  return loadSessionContext(db, sessionId);
}
