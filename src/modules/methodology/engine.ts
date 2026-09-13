import type { CheckPriority } from "./ptes";

export type SessionCheckState = Readonly<{
  semanticKey: string;
  title: string;
  priority: CheckPriority;
  status: "inactive" | "active" | "completed" | "skipped" | "superseded";
}>;

export type MissingRequiredCheck = Pick<
  SessionCheckState,
  "semanticKey" | "title"
>;

export type PhaseGateResult = Readonly<{
  allowed: boolean;
  missingRequiredChecks: readonly MissingRequiredCheck[];
}>;

export type PhaseGateOverride = Readonly<{
  type: "phase_gate_override";
  missingRequiredChecks: readonly MissingRequiredCheck[];
}>;

export type ProgressResult = Readonly<{
  completed: number;
  total: number;
  percentage: number;
}>;

export type OrderedPhase = Readonly<{
  semanticKey: string;
  sortOrder: number;
}>;

function isActivated(check: SessionCheckState): boolean {
  return (
    check.status === "active" ||
    check.status === "completed" ||
    check.status === "skipped"
  );
}

export function evaluatePhaseGate(
  checks: readonly SessionCheckState[],
): PhaseGateResult {
  const missingRequiredChecks = checks
    .filter(
      (check) =>
        check.priority === "required" &&
        (check.status === "active" || check.status === "skipped"),
    )
    .map(({ semanticKey, title }) => ({ semanticKey, title }));

  return {
    allowed: missingRequiredChecks.length === 0,
    missingRequiredChecks,
  };
}

export function getPhaseGateOverride(
  gate: PhaseGateResult,
): PhaseGateOverride | null {
  if (gate.allowed) return null;

  return {
    type: "phase_gate_override",
    missingRequiredChecks: gate.missingRequiredChecks,
  };
}

function calculateProgress(
  checks: readonly SessionCheckState[],
  priorities: readonly CheckPriority[],
): ProgressResult {
  const included = checks.filter(
    (check) => priorities.includes(check.priority) && isActivated(check),
  );
  const completed = included.filter((check) => check.status === "completed").length;
  const total = included.length;

  return {
    completed,
    total,
    // An empty activated checklist has no outstanding work.
    percentage: total === 0 ? 100 : Math.round((completed / total) * 100),
  };
}

export function calculateCoreProgress(
  checks: readonly SessionCheckState[],
): ProgressResult {
  return calculateProgress(checks, ["required"]);
}

export function calculateMethodologyCoverage(
  checks: readonly SessionCheckState[],
): ProgressResult {
  return calculateProgress(checks, ["required", "recommended"]);
}

function orderedPhases<Phase extends OrderedPhase>(
  phases: readonly Phase[],
): Phase[] {
  return [...phases].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.semanticKey.localeCompare(right.semanticKey),
  );
}

export function getFirstPhase<Phase extends OrderedPhase>(
  phases: readonly Phase[],
): Phase | undefined {
  return orderedPhases(phases)[0];
}

export function getNextPhase<Phase extends OrderedPhase>(
  phases: readonly Phase[],
  currentSemanticKey: string,
): Phase | undefined {
  const ordered = orderedPhases(phases);
  const currentIndex = ordered.findIndex(
    (phase) => phase.semanticKey === currentSemanticKey,
  );

  return currentIndex < 0 ? undefined : ordered[currentIndex + 1];
}

export function isLaterPhase(
  phases: readonly OrderedPhase[],
  currentSemanticKey: string,
  targetSemanticKey: string,
): boolean {
  const ordered = orderedPhases(phases);
  const currentIndex = ordered.findIndex(
    (phase) => phase.semanticKey === currentSemanticKey,
  );
  const targetIndex = ordered.findIndex(
    (phase) => phase.semanticKey === targetSemanticKey,
  );

  return currentIndex >= 0 && targetIndex > currentIndex;
}

export function isNormalForwardProgression(
  phases: readonly OrderedPhase[],
  currentSemanticKey: string,
  targetSemanticKey: string,
): boolean {
  return getNextPhase(phases, currentSemanticKey)?.semanticKey === targetSemanticKey;
}
