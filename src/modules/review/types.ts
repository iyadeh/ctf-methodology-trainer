import { z } from "zod";
import type {
  AttemptRecord,
  FindingRecord,
  HypothesisRecord,
  SessionCheckRecord,
  NoteRecord,
  SessionPhaseRecord,
  TrainingSessionRecord,
} from "../training/types";
import type { RevealedReferencePath } from "../training/completion";

export interface ReviewMetrics {
  readonly reconCoverage: number;
  readonly phaseGateCompliance: number;
  readonly hypothesisDiscipline: number;
  readonly documentationCoverage: number;
  readonly hintsUsed: number;
  readonly machineHints: number;
  readonly fullReveals: number;
  readonly phaseOverrides: number;
  readonly totalPenaltyPoints: number;
  readonly totalDurationMs: number;
  readonly totalDurationFormatted: string;
  readonly totalChecksCompleted: number;
  readonly totalFindingsRecorded: number;
  readonly totalHypothesesFormed: number;
  readonly totalAttemptsExecuted: number;
  readonly breakdown: {
    readonly recon: {
      readonly completed: number;
      readonly total: number;
    };
    readonly gates: {
      readonly compliantTransitions: number;
      readonly totalTransitions: number;
      readonly overrides: number;
    };
    readonly hypotheses: {
      readonly attemptsWithHypothesis: number;
      readonly totalAttempts: number;
    };
    readonly documentation: {
      readonly confirmedWithEvidence: number;
      readonly totalConfirmed: number;
    };
  };
}

export type UserPathStepKind =
  | "phase_start"
  | "service_discovery"
  | "surface_enumeration"
  | "vulnerability"
  | "hypothesis"
  | "attempt"
  | "objective_capture"
  | "milestone";

export interface UserPathStep {
  readonly id: string;
  readonly stepNumber: number;
  readonly phase: string;
  readonly title: string;
  readonly description: string;
  readonly timestamp: Date;
  readonly durationFormatted?: string;
  readonly kind: UserPathStepKind;
  readonly evidence?: string | null;
  readonly toolsUsed?: readonly string[];
  readonly matchedReferenceNodeId?: string;
}

export type PathComparisonStatus =
  | "matched"
  | "partially_matched"
  | "unmatched"
  | "alternative";

export interface PathComparisonItem {
  readonly referenceNodeId: string;
  readonly referenceStepNumber: number;
  readonly referenceTitle: string;
  readonly referencePhase: string;
  readonly referenceKind: string;
  readonly referenceTools?: readonly string[];
  readonly userStatus: PathComparisonStatus;
  readonly matchedUserStepTitle?: string;
  readonly matchedEvidence?: string;
  readonly notes?: string;
}

export interface ImprovementArea {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly severity: "low" | "medium" | "high";
  readonly metric: string;
}

export const reviewNarrativeSchema = z.object({
  executiveSummary: z.string().min(1),
  strengths: z.array(z.string().min(1)),
  areasForGrowth: z.array(z.string().min(1)),
  recommendation: z.string().min(1),
});

export type ReviewNarrativeContent = z.infer<typeof reviewNarrativeSchema>;

export interface ReviewNarrative extends ReviewNarrativeContent {
  readonly isAiGenerated: boolean;
}

export interface MethodologyDeviationRecord {
  readonly id: string;
  readonly sessionPhaseId: string | null;
  readonly phaseName?: string;
  readonly type: string;
  readonly reason: string | null;
  readonly createdAt: Date;
}

export interface SessionReviewData {
  readonly session: TrainingSessionRecord;
  readonly phases: readonly SessionPhaseRecord[];
  readonly checks: readonly SessionCheckRecord[];
  readonly findings: readonly FindingRecord[];
  readonly hypotheses: readonly HypothesisRecord[];
  readonly attempts: readonly AttemptRecord[];
  readonly notes: readonly NoteRecord[];
  readonly metrics: ReviewMetrics;
  readonly userPath: readonly UserPathStep[];
  readonly referencePath: RevealedReferencePath | null;
  readonly comparison: readonly PathComparisonItem[];
  readonly improvementAreas: readonly ImprovementArea[];
  readonly narrative: ReviewNarrative;
  readonly deviations: readonly MethodologyDeviationRecord[];
}
