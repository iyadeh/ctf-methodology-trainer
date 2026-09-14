import { ensureSessionExists, lockFinding } from "../training/evidence-repository";
import { parseEvidenceId } from "../training/evidence-input";
import { lockTrainingSession, trainingTransaction, type TrainingTransaction } from "../training/repository";
import type { FindingRecord } from "../training/types";
import { deriveContextFromFinding } from "./engine";
import { readSessionContext, reconcileContextObservations } from "./repository";

export function reconcileFindingContextInTransaction(
  transaction: TrainingTransaction,
  finding: FindingRecord,
) {
  return reconcileContextObservations(transaction, finding, deriveContextFromFinding(finding));
}

export async function reconcileFindingContext(sessionId: string, findingId: string): Promise<void> {
  const id = parseEvidenceId(sessionId);
  const ownedFindingId = parseEvidenceId(findingId);
  await trainingTransaction(async (transaction) => {
    await lockTrainingSession(transaction, id);
    const finding = await lockFinding(transaction, id, ownedFindingId);
    await reconcileFindingContextInTransaction(transaction, finding);
  });
}

export async function getSessionContext(sessionId: string) {
  const id = parseEvidenceId(sessionId);
  await ensureSessionExists(id);
  return readSessionContext(id);
}
