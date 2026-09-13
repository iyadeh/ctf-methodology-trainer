import type {
  sessionChecks,
  sessionPhases,
  trainingSessions,
} from "@/lib/db/schema";
import type { PhaseGateResult, ProgressResult } from "@/modules/methodology/engine";

export type TrainingSessionRecord = typeof trainingSessions.$inferSelect;
export type SessionPhaseRecord = typeof sessionPhases.$inferSelect;
export type SessionCheckRecord = typeof sessionChecks.$inferSelect;

export type SessionPhaseSnapshot = SessionPhaseRecord & {
  checks: SessionCheckRecord[];
};

export type TrainingSessionAggregate = {
  session: TrainingSessionRecord;
  phases: SessionPhaseSnapshot[];
  currentPhase: SessionPhaseSnapshot | null;
  progress: {
    required: ProgressResult;
    coverage: ProgressResult;
    completedChecks: number;
    remainingChecks: number;
  };
};

export type AdvancePhaseResult =
  | { status: "blocked"; gate: PhaseGateResult }
  | {
      status: "advanced";
      completedPhaseKey: string;
      activePhaseKey: string;
      overridden: boolean;
    }
  | { status: "final_phase_reached"; finalPhaseReached: true };

export class TrainingSessionError extends Error {
  constructor(
    public readonly code:
      | "not_found"
      | "framework_not_found"
      | "invalid_input"
      | "invalid_transition"
      | "invalid_state"
      | "check_not_found",
    message: string,
  ) {
    super(message);
    this.name = "TrainingSessionError";
  }
}
