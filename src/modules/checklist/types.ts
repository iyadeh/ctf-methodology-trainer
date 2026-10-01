import type { checkPriorityEnum } from "../../lib/db/schema";

export type CheckPriority = typeof checkPriorityEnum.enumValues[number];

export type ChecklistProvenance = "core" | "playbook" | "contextual" | "ai_generated" | "generic";

export interface NewDynamicCheck {
  readonly trainingSessionId: string;
  readonly sessionPhaseId: string;
  readonly semanticKey: string;
  readonly title: string;
  readonly description: string;
  readonly priority: CheckPriority;
  readonly provenance: ChecklistProvenance;
  readonly sortOrder: number;
  readonly status: "active" | "inactive";
  readonly sourceVersion: number;
  readonly activatedAt: Date | null;
}

export interface DynamicCheckReactivation {
  readonly id: string;
  readonly status: "active" | "inactive";
  readonly activatedAt: Date | null;
}

export interface DynamicCheckSupersession {
  readonly id: string;
}

export interface ReconcileDynamicChecklistResult {
  readonly checksToInsert: readonly NewDynamicCheck[];
  readonly checksToReactivate: readonly DynamicCheckReactivation[];
  readonly checksToSupersede: readonly DynamicCheckSupersession[];
}

export interface ReconcileChecklistSummary {
  readonly insertedCount: number;
  readonly reactivatedCount: number;
  readonly supersededCount: number;
}
