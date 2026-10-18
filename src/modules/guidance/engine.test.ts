import { describe, expect, it } from "vitest";
import {
  calculateSpoilerPenalty,
  escalateSpoilerLevel,
  prepareGuidancePromptContext,
} from "./engine";
import type {
  AttemptRecord,
  FindingRecord,
  MethodologyDeviationRecord,
  SessionCheckRecord,
  SessionPhaseSnapshot,
  TrainingSessionAggregate,
} from "../training/types";

function createMockSession(overrides: Partial<TrainingSessionAggregate> = {}): TrainingSessionAggregate {
  const activeCheck: SessionCheckRecord = {
    id: "check-1",
    trainingSessionId: "session-1",
    sessionPhaseId: "phase-1",
    frameworkCheckId: null,
    semanticKey: "reconnaissance.port-scan",
    title: "Perform initial port enumeration",
    description: "Scan ports",
    priority: "required",
    provenance: "core",
    sortOrder: 1,
    status: "active",
    sourceVersion: 1,
    activatedAt: new Date(),
    completedAt: null,
    skippedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const currentPhase: SessionPhaseSnapshot = {
    id: "phase-1",
    trainingSessionId: "session-1",
    frameworkPhaseId: null,
    semanticKey: "reconnaissance",
    name: "Reconnaissance",
    description: "Recon phase",
    sortOrder: 0,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    checks: [activeCheck],
  };

  return {
    session: {
      id: "session-1",
      frameworkId: "ptes-standard",
      name: "Test Machine",
      targetIp: "10.10.10.10",
      status: "in_progress",
      startedAt: new Date(),
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    phases: [currentPhase],
    currentPhase,
    findings: [],
    hypotheses: [],
    attempts: [],
    notes: [],
    context: [],
    deviations: [],
    progress: {
      required: { completed: 0, total: 1, percentage: 0 },
      coverage: { completed: 0, total: 1, percentage: 0 },
      completedChecks: 0,
      remainingChecks: 1,
    },
    ...overrides,
  };
}

describe("guidance/engine", () => {
  describe("calculateSpoilerPenalty", () => {
    it("returns correct penalties according to spoiler levels", () => {
      expect(calculateSpoilerPenalty(0)).toBe(0);
      expect(calculateSpoilerPenalty(1)).toBe(1);
      expect(calculateSpoilerPenalty(2)).toBe(2);
      expect(calculateSpoilerPenalty(3)).toBe(3);
      expect(calculateSpoilerPenalty(4)).toBe(5);
      expect(calculateSpoilerPenalty(5)).toBe(10);
      expect(calculateSpoilerPenalty(6)).toBe(25);
    });
  });

  describe("escalateSpoilerLevel", () => {
    it("safely escalates up to level 6", () => {
      expect(escalateSpoilerLevel(0)).toBe(1);
      expect(escalateSpoilerLevel(3)).toBe(4);
      expect(escalateSpoilerLevel(5)).toBe(6);
      expect(escalateSpoilerLevel(6)).toBe(6);
    });
  });

  describe("prepareGuidancePromptContext", () => {
    it("builds baseline prompt context without deviations or failed attempts", () => {
      const session = createMockSession();
      const promptContext = prepareGuidancePromptContext({
        session,
        spoilerLevel: 0,
        userQuery: "How do I start?",
      });

      expect(promptContext.spoilerLevel).toBe(0);
      expect(promptContext.visibleState.currentPhase).toBe("Reconnaissance");
      expect(promptContext.visibleState.activeChecks).toHaveLength(1);
      expect(promptContext.visibleState.failedAttemptsCount).toBe(0);
      expect(promptContext.visibleState.deviationsCount).toBe(0);
      expect(promptContext.systemInstruction).not.toContain("methodology deviation(s)");
      expect(promptContext.systemInstruction).not.toContain("recent unsuccessful attempt(s)");
    });

    it("detects and injects methodology deviations warning into system instruction", () => {
      const deviation: MethodologyDeviationRecord = {
        id: "dev-1",
        trainingSessionId: "session-1",
        type: "phase_gate_override",
        reason: "User skipped required checks",
        sessionPhaseId: "phase-1",
        createdAt: new Date(),
      };

      const session = createMockSession({
        deviations: [deviation],
      });

      const promptContext = prepareGuidancePromptContext({
        session,
        spoilerLevel: 1,
      });

      expect(promptContext.visibleState.deviationsCount).toBe(1);
      expect(promptContext.systemInstruction).toContain("1 recorded methodology deviation(s)");
      expect(promptContext.systemInstruction).toContain("Remind them to complete required enumeration checks");
    });

    it("detects and injects failed attempts warning when failed attempts >= 2", () => {
      const attempts: AttemptRecord[] = [
        {
          id: "att-1",
          trainingSessionId: "session-1",
          hypothesisId: "hypo-1",
          action: "sqlmap run",
          result: "no injection found",
          outcome: "rejected",
          notes: null,
          createdAt: new Date(),
        },
        {
          id: "att-2",
          trainingSessionId: "session-1",
          hypothesisId: "hypo-2",
          action: "hydra brute force",
          result: "timed out",
          outcome: "inconclusive",
          notes: null,
          createdAt: new Date(),
        },
      ];

      const session = createMockSession({
        attempts,
      });

      const promptContext = prepareGuidancePromptContext({
        session,
        spoilerLevel: 2,
      });

      expect(promptContext.visibleState.failedAttemptsCount).toBe(2);
      expect(promptContext.systemInstruction).toContain("2 recent unsuccessful attempt(s)");
      expect(promptContext.systemInstruction).toContain("Guide them toward forming disciplined, evidence-backed hypotheses");
    });

    it("correctly includes confirmed findings in visibleState", () => {
      const findings: FindingRecord[] = [
        {
          id: "f-1",
          trainingSessionId: "session-1",
          title: "Port 80 Open",
          category: "service",
          source: "user_evidence",
          importance: "medium",
          evidenceState: "confirmed",
          evidence: "nmap scan result",
          contextKind: "service",
          contextValue: "http",
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "f-2",
          trainingSessionId: "session-1",
          title: "Suspected FTP",
          category: "service",
          source: "user_evidence",
          importance: "low",
          evidenceState: "observed", // Not confirmed
          evidence: "partial banner",
          contextKind: "service",
          contextValue: "ftp",
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const session = createMockSession({ findings });
      const promptContext = prepareGuidancePromptContext({
        session,
        spoilerLevel: 1,
      });

      expect(promptContext.visibleState.confirmedFindings).toHaveLength(1);
      expect(promptContext.visibleState.confirmedFindings[0].identifier).toBe("http");
    });
  });
});
