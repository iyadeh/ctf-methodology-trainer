import { describe, expect, it } from "vitest";
import {
  calculateCoreProgress,
  calculateMethodologyCoverage,
  evaluatePhaseGate,
  getFirstPhase,
  getNextPhase,
  getPhaseGateOverride,
  isLaterPhase,
  isNormalForwardProgression,
  type SessionCheckState,
} from "./engine";
import { ptesFramework, type CheckPriority } from "./ptes";

function check(
  status: SessionCheckState["status"],
  priority: CheckPriority = "required",
  semanticKey = "reconnaissance.confirm-target-information",
): SessionCheckState {
  return {
    semanticKey,
    title: "Confirm target information",
    priority,
    status,
  };
}

describe("Phase Gate", () => {
  it("blocks active Required checks and lists them", () => {
    expect(evaluatePhaseGate([check("active")])).toEqual({
      allowed: false,
      missingRequiredChecks: [
        {
          semanticKey: "reconnaissance.confirm-target-information",
          title: "Confirm target information",
        },
      ],
    });
  });

  it("allows completed Required checks", () => {
    expect(evaluatePhaseGate([check("completed")])).toEqual({
      allowed: true,
      missingRequiredChecks: [],
    });
  });

  it.each(["recommended", "suggested"] as const)(
    "does not block for active %s checks",
    (priority) => {
      expect(evaluatePhaseGate([check("active", priority)]).allowed).toBe(true);
    },
  );

  it.each(["inactive", "superseded"] as const)(
    "does not block for %s Required checks",
    (status) => {
      expect(evaluatePhaseGate([check(status)]).allowed).toBe(true);
    },
  );

  it("keeps skipped Required checks unsatisfied", () => {
    expect(evaluatePhaseGate([check("skipped")]).allowed).toBe(false);
  });

  it("returns an override contract only for a blocked gate", () => {
    const blocked = evaluatePhaseGate([check("active")]);
    expect(getPhaseGateOverride(blocked)).toEqual({
      type: "phase_gate_override",
      missingRequiredChecks: blocked.missingRequiredChecks,
    });
    expect(getPhaseGateOverride(evaluatePhaseGate([check("completed")]))).toBeNull();
  });
});

describe("methodology progress", () => {
  const checks = [
    check("completed", "required", "required.completed"),
    check("active", "required", "required.active"),
    check("completed", "recommended", "recommended.completed"),
    check("active", "recommended", "recommended.active"),
    check("active", "suggested", "suggested.active"),
    check("inactive", "required", "required.inactive"),
    check("superseded", "recommended", "recommended.superseded"),
  ];

  it("ignores Suggested checks in core progress", () => {
    expect(calculateCoreProgress(checks)).toEqual({
      completed: 1,
      total: 2,
      percentage: 50,
    });
  });

  it("includes only activated Required and Recommended checks in coverage", () => {
    expect(calculateMethodologyCoverage(checks)).toEqual({
      completed: 2,
      total: 4,
      percentage: 50,
    });
  });

  it("counts skipped checks as outstanding work", () => {
    expect(calculateCoreProgress([check("skipped")])).toEqual({
      completed: 0,
      total: 1,
      percentage: 0,
    });
  });

  it("treats an empty denominator as 100 percent", () => {
    expect(calculateCoreProgress([])).toEqual({
      completed: 0,
      total: 0,
      percentage: 100,
    });
    expect(calculateMethodologyCoverage([check("inactive")]).percentage).toBe(100);
  });
});

describe("PTES phase ordering", () => {
  const phases = [...ptesFramework.phases].reverse();

  it("finds first and next phase regardless of input order", () => {
    expect(getFirstPhase(phases)?.semanticKey).toBe("reconnaissance");
    expect(getNextPhase(phases, "reconnaissance")?.semanticKey).toBe("threat-modeling");
    expect(getNextPhase(phases, "reporting")).toBeUndefined();
  });

  it("distinguishes later phases and normal forward progression", () => {
    expect(isLaterPhase(phases, "reconnaissance", "reporting")).toBe(true);
    expect(isLaterPhase(phases, "reporting", "reconnaissance")).toBe(false);
    expect(isLaterPhase(phases, "unknown", "reporting")).toBe(false);
    expect(isNormalForwardProgression(phases, "reconnaissance", "threat-modeling")).toBe(true);
    expect(isNormalForwardProgression(phases, "reconnaissance", "exploitation")).toBe(false);
  });
});

describe("canonical PTES definitions", () => {
  it("contains six phases in required order", () => {
    expect(ptesFramework.phases.map((phase) => phase.semanticKey)).toEqual([
      "reconnaissance",
      "threat-modeling",
      "vulnerability-analysis",
      "exploitation",
      "post-exploitation",
      "reporting",
    ]);
    expect(ptesFramework.phases.map((phase) => phase.sortOrder)).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
  });

  it("uses unique stable semantic keys for phases and checks", () => {
    const phaseKeys = ptesFramework.phases.map((phase) => phase.semanticKey);
    const checkKeys = ptesFramework.phases.flatMap((phase) =>
      phase.checks.map((phaseCheck) => phaseCheck.semanticKey),
    );

    expect(new Set(phaseKeys).size).toBe(phaseKeys.length);
    expect(new Set(checkKeys).size).toBe(checkKeys.length);
    expect(checkKeys.every((key) => key.includes("."))).toBe(true);
  });

  it("contains all 48 core checks with expected priorities", () => {
    expect(ptesFramework.phases.map((phase) => phase.checks.length)).toEqual([
      10, 7, 6, 6, 10, 9,
    ]);
    const checks = ptesFramework.phases.flatMap((phase) => phase.checks);
    expect(checks.filter((phaseCheck) => phaseCheck.priority === "required")).toHaveLength(34);
    expect(checks.filter((phaseCheck) => phaseCheck.priority === "recommended")).toHaveLength(14);
    expect(checks.filter((phaseCheck) => phaseCheck.priority === "suggested")).toHaveLength(0);
  });
});
