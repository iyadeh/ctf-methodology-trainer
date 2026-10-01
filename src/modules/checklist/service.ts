import { and, asc, eq, inArray } from "drizzle-orm";
import { sessionChecks } from "../../lib/db/schema";
import { loadSessionContext } from "../context/repository";
import { resolvePlaybooks } from "../playbooks/resolver";
import { lockTrainingSession, loadSessionPhases, trainingTransaction } from "../training/repository";
import type { TrainingTransaction } from "../training/repository";
import { parseEvidenceId } from "../training/evidence-input";
import { reconcileDynamicChecklist } from "./engine";
import type { ReconcileChecklistSummary } from "./types";

export async function reconcileSessionChecklistInTransaction(
  transaction: TrainingTransaction,
  sessionId: string,
): Promise<ReconcileChecklistSummary> {
  // 1. Load active canonical context keys
  const activeContext = await loadSessionContext(transaction, sessionId);
  const activeContextKeys = activeContext.map((c) => c.canonicalKey);

  // 2. Resolve matching playbooks and generic fallbacks
  const { matched: resolvedPlaybooks } = resolvePlaybooks(activeContextKeys);

  // 3. Load existing phases and checks for the session
  const phases = await loadSessionPhases(transaction, sessionId);
  const existingChecks = await transaction
    .select()
    .from(sessionChecks)
    .where(eq(sessionChecks.trainingSessionId, sessionId))
    .orderBy(asc(sessionChecks.sortOrder));

  // 4. Compute pure checklist reconciliation
  const { checksToInsert, checksToReactivate, checksToSupersede } =
    reconcileDynamicChecklist({
      sessionId,
      sessionPhases: phases,
      resolvedPlaybooks,
      existingChecks,
    });

  // 5. Batch insert newly composed dynamic checks
  if (checksToInsert.length > 0) {
    await transaction.insert(sessionChecks).values([...checksToInsert]);
  }

  // 6. Reactivate checks whose context has been restored
  for (const reactivation of checksToReactivate) {
    await transaction
      .update(sessionChecks)
      .set({
        status: reactivation.status,
        activatedAt: reactivation.activatedAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sessionChecks.trainingSessionId, sessionId),
          eq(sessionChecks.id, reactivation.id),
        ),
      );
  }

  // 7. Supersede checks that are no longer supported by active context
  if (checksToSupersede.length > 0) {
    const supersedeIds = checksToSupersede.map((c) => c.id);
    await transaction
      .update(sessionChecks)
      .set({
        status: "superseded",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sessionChecks.trainingSessionId, sessionId),
          inArray(sessionChecks.id, supersedeIds),
        ),
      );
  }

  return {
    insertedCount: checksToInsert.length,
    reactivatedCount: checksToReactivate.length,
    supersededCount: checksToSupersede.length,
  };
}

export async function reconcileSessionChecklist(
  sessionId: string,
): Promise<ReconcileChecklistSummary> {
  const parsedSessionId = parseEvidenceId(sessionId);

  return trainingTransaction(async (transaction) => {
    await lockTrainingSession(transaction, parsedSessionId);
    return reconcileSessionChecklistInTransaction(transaction, parsedSessionId);
  });
}
