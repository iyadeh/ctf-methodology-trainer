import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { methodologyDeviations, sessionPhases } from "@/lib/db/schema";
import { isValidUuid, loadTrainingSessionSnapshot } from "../training/repository";
import { TrainingSessionError } from "../training/types";
import { getRevealedReferencePath } from "../training/completion";
import { computeHintMetricsBySessionId } from "../mentor/repository";
import {
  compareUserAndReferencePaths,
  computeImprovementAreas,
  computeReviewMetrics,
  reconstructUserPath,
} from "./metrics";
import { generateReviewNarrative } from "./narrative";
import type { MethodologyDeviationRecord, SessionReviewData } from "./types";

export async function getSessionReview(sessionId: string): Promise<SessionReviewData> {
  if (!isValidUuid(sessionId)) {
    throw new TrainingSessionError("not_found", "Training Session not found.");
  }

  // 1. Load session snapshot
  const snapshot = await loadTrainingSessionSnapshot(sessionId);

  // 2. Load methodology deviations with phase name
  const deviationRows = await db
    .select({
      id: methodologyDeviations.id,
      sessionPhaseId: methodologyDeviations.sessionPhaseId,
      type: methodologyDeviations.type,
      reason: methodologyDeviations.reason,
      createdAt: methodologyDeviations.createdAt,
      phaseName: sessionPhases.name,
    })
    .from(methodologyDeviations)
    .leftJoin(sessionPhases, eq(methodologyDeviations.sessionPhaseId, sessionPhases.id))
    .where(eq(methodologyDeviations.trainingSessionId, sessionId))
    .orderBy(desc(methodologyDeviations.createdAt));

  const deviations: MethodologyDeviationRecord[] = deviationRows.map((d) => ({
    id: d.id,
    sessionPhaseId: d.sessionPhaseId,
    phaseName: d.phaseName ?? undefined,
    type: d.type,
    reason: d.reason,
    createdAt: d.createdAt,
  }));

  // 3. Load hint metrics
  const hintMetrics = await computeHintMetricsBySessionId(sessionId);

  // 4. Load revealed reference path (null if not completed)
  const referencePath = await getRevealedReferencePath(sessionId);

  // 5. Compute deterministic metrics
  const metrics = computeReviewMetrics({
    session: snapshot.session,
    phases: snapshot.phases,
    checks: snapshot.checks,
    findings: snapshot.findings,
    hypotheses: snapshot.hypotheses,
    attempts: snapshot.attempts,
    deviations,
    hintMetrics,
  });

  // 6. Reconstruct User Path
  const userPath = reconstructUserPath({
    session: snapshot.session,
    phases: snapshot.phases,
    findings: snapshot.findings,
    hypotheses: snapshot.hypotheses,
    attempts: snapshot.attempts,
  });

  // 7. Path Comparison
  const comparison = compareUserAndReferencePaths({
    userPath,
    findings: snapshot.findings,
    referencePath,
    session: snapshot.session,
  });

  // 8. Grounded Improvement Areas
  const improvementAreas = computeImprovementAreas(metrics, deviations);

  // 9. Narrative Generation (AI with deterministic fallback)
  const userPathSummary = userPath
    .slice(0, 10)
    .map((s) => `Step ${s.stepNumber} [${s.phase}]: ${s.title}`)
    .join("\n");

  const narrative = await generateReviewNarrative({
    sessionName: snapshot.session.name,
    targetIp: snapshot.session.targetIp,
    metrics,
    improvementAreas,
    userPathSummary,
  });

  return {
    session: snapshot.session,
    phases: snapshot.phases,
    checks: snapshot.checks,
    findings: snapshot.findings,
    hypotheses: snapshot.hypotheses,
    attempts: snapshot.attempts,
    notes: snapshot.notes,
    metrics,
    userPath,
    referencePath,
    comparison,
    improvementAreas,
    narrative,
    deviations,
  };
}
