import type { AttackGraph } from "../attack-graph/types";
import type { ExtractedMachineFacts } from "../facts/types";

export type GraphVerificationStatus = "validated" | "low_confidence" | "failed";

export type VerificationCheckName =
  | "acyclicity"
  | "entry_points"
  | "terminal_objectives"
  | "reachability"
  | "phase_ordering"
  | "critical_milestones"
  | "fact_alignment"
  | "orphan_nodes";

export interface VerificationCheckResult {
  readonly name: VerificationCheckName;
  readonly passed: boolean;
  readonly score: number; // 0.0 to 1.0 contribution
  readonly description: string;
  readonly issues: readonly string[];
}

export interface GraphVerification {
  readonly status: GraphVerificationStatus;
  readonly confidence: number; // 0.00 to 1.00
  readonly missingSteps: readonly string[];
  readonly unsupportedSteps: readonly string[];
  readonly conflicts: readonly string[];
  readonly checks: readonly VerificationCheckResult[];
  readonly verifiedAt: string;
}

export interface VerifyGraphParams {
  readonly graph: AttackGraph;
  readonly facts?: ExtractedMachineFacts;
  readonly writeupText?: string;
}
