import type { SessionCheckRecord, SessionPhaseRecord } from "../training/types";
import type { ResolvedPlaybook } from "../playbooks/types";
import type {
  DynamicCheckReactivation,
  DynamicCheckSupersession,
  NewDynamicCheck,
  ReconcileDynamicChecklistResult,
} from "./types";

export type SessionPhaseSnapshotRef = Pick<
  SessionPhaseRecord,
  "id" | "semanticKey" | "status" | "sortOrder"
>;

export type SessionCheckSnapshotRef = Pick<
  SessionCheckRecord,
  "id" | "semanticKey" | "sessionPhaseId" | "status" | "provenance" | "sortOrder"
>;

export function reconcileDynamicChecklist(params: {
  sessionId: string;
  sessionPhases: readonly SessionPhaseSnapshotRef[];
  resolvedPlaybooks: readonly ResolvedPlaybook[];
  existingChecks: readonly SessionCheckSnapshotRef[];
  now?: Date;
}): ReconcileDynamicChecklistResult {
  const {
    sessionId,
    sessionPhases,
    resolvedPlaybooks,
    existingChecks,
    now = new Date(),
  } = params;

  const phaseBySemanticKey = new Map<string, SessionPhaseSnapshotRef>(
    sessionPhases.map((phase) => [phase.semanticKey, phase]),
  );

  const phaseMaxSortOrder = new Map<string, number>();
  for (const phase of sessionPhases) {
    const checksInPhase = existingChecks.filter(
      (check) => check.sessionPhaseId === phase.id,
    );
    const maxSort =
      checksInPhase.length > 0
        ? Math.max(...checksInPhase.map((c) => c.sortOrder))
        : -1;
    phaseMaxSortOrder.set(phase.id, maxSort);
  }

  const existingMap = new Map<string, SessionCheckSnapshotRef>(
    existingChecks.map((check) => [check.semanticKey, check]),
  );

  const desiredSemanticKeys = new Set<string>();
  const checksToInsert: NewDynamicCheck[] = [];
  const checksToReactivate: DynamicCheckReactivation[] = [];
  const checksToSupersede: DynamicCheckSupersession[] = [];

  // 1. Process all desired dynamic checks from resolved playbooks
  for (const resolved of resolvedPlaybooks) {
    const targetPhase = phaseBySemanticKey.get(resolved.playbook.targetPhase);
    if (!targetPhase) {
      continue;
    }

    const provenance = resolved.isFallback ? "generic" : "playbook";
    const serviceSuffix =
      resolved.isFallback && resolved.triggeredByServiceKey
        ? resolved.triggeredByServiceKey.replace(/^service:/, "")
        : null;

    for (const check of resolved.playbook.checks) {
      const semanticKey = serviceSuffix
        ? `${check.semanticKey}.${serviceSuffix}`
        : check.semanticKey;

      const title = serviceSuffix
        ? `${check.title} (${serviceSuffix.toUpperCase()})`
        : check.title;

      desiredSemanticKeys.add(semanticKey);

      const existing = existingMap.get(semanticKey);

      if (!existing) {
        // Needs insertion
        const currentMax = phaseMaxSortOrder.get(targetPhase.id) ?? -1;
        const nextSortOrder = currentMax + 1;
        phaseMaxSortOrder.set(targetPhase.id, nextSortOrder);

        const isActive = targetPhase.status === "active";

        const newCheck: NewDynamicCheck = {
          trainingSessionId: sessionId,
          sessionPhaseId: targetPhase.id,
          semanticKey,
          title,
          description: check.description,
          priority: check.priority,
          provenance,
          sortOrder: nextSortOrder,
          status: isActive ? "active" : "inactive",
          sourceVersion: resolved.playbook.version,
          activatedAt: isActive ? now : null,
        };

        checksToInsert.push(newCheck);
        // Track locally to prevent duplicate insertion within same run
        existingMap.set(semanticKey, {
          id: `pending-${semanticKey}`,
          semanticKey,
          sessionPhaseId: targetPhase.id,
          status: newCheck.status,
          provenance,
          sortOrder: nextSortOrder,
        });
      } else if (existing.status === "superseded") {
        // Needs reactivation
        const isActive = targetPhase.status === "active";
        checksToReactivate.push({
          id: existing.id,
          status: isActive ? "active" : "inactive",
          activatedAt: isActive ? now : null,
        });
      }
    }
  }

  // 2. Identify dynamic checks that are no longer supported by active context
  for (const existing of existingChecks) {
    const isDynamic =
      existing.provenance === "playbook" || existing.provenance === "generic";

    if (isDynamic && !desiredSemanticKeys.has(existing.semanticKey)) {
      if (existing.status === "active" || existing.status === "inactive") {
        checksToSupersede.push({ id: existing.id });
      }
    }
  }

  return {
    checksToInsert,
    checksToReactivate,
    checksToSupersede,
  };
}
