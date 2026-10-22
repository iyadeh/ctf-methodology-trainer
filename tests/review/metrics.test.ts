import { describe, expect, it } from "vitest";
import {
  computeImprovementAreas,
  computeReviewMetrics,
  formatDuration,
  generateDeterministicNarrative,
  reconstructUserPath,
  compareUserAndReferencePaths,
} from "../../src/modules/review/metrics";
import type {
  AttemptRecord,
  FindingRecord,
  HypothesisRecord,
  SessionCheckRecord,
  SessionPhaseRecord,
  TrainingSessionRecord,
} from "../../src/modules/training/types";
import type { RevealedReferencePath } from "../../src/modules/training/completion";
import type { MethodologyDeviationRecord } from "../../src/modules/review/types";

describe("Stage 24 — Review Metrics Engine", () => {
  const dummySession: TrainingSessionRecord = {
    id: "session-1",
    frameworkId: "fw-1",
    name: "Test Machine",
    status: "completed",
    mode: "guided",
    targetIp: "10.10.11.200",
    userFlag: null,
    userFlagSubmittedAt: null,
    rootFlag: null,
    rootFlagSubmittedAt: null,
    startedAt: new Date(Date.now() - 3600000), // 1 hour ago
    completedAt: new Date(),
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(),
  };

  const dummyPhases: SessionPhaseRecord[] = [
    {
      id: "phase-1",
      trainingSessionId: "session-1",
      frameworkPhaseId: "fp-1",
      semanticKey: "reconnaissance",
      name: "Reconnaissance",
      description: "Recon phase",
      sortOrder: 1,
      status: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "phase-2",
      trainingSessionId: "session-1",
      frameworkPhaseId: "fp-2",
      semanticKey: "threat_modeling",
      name: "Threat Modeling",
      description: "Threat modeling phase",
      sortOrder: 2,
      status: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "phase-3",
      trainingSessionId: "session-1",
      frameworkPhaseId: "fp-3",
      semanticKey: "exploitation",
      name: "Exploitation",
      description: "Exploit phase",
      sortOrder: 3,
      status: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  describe("formatDuration", () => {
    it("formats durations accurately", () => {
      expect(formatDuration(0)).toBe("< 1m");
      expect(formatDuration(30000)).toBe("< 1m");
      expect(formatDuration(60000)).toBe("1m");
      expect(formatDuration(1500000)).toBe("25m");
      expect(formatDuration(3600000)).toBe("1h");
      expect(formatDuration(5400000)).toBe("1h 30m");
      expect(formatDuration(8280000)).toBe("2h 18m");
    });
  });

  describe("computeReviewMetrics", () => {
    it("computes 100% scores when all checks, gates, and hypotheses are fully disciplined", () => {
      const checks: SessionCheckRecord[] = [
        {
          id: "c-1",
          trainingSessionId: "session-1",
          sessionPhaseId: "phase-1",
          frameworkCheckId: null,
          semanticKey: "recon.1",
          title: "Service Scan",
          description: "Scan ports",
          priority: "required",
          provenance: "core",
          sortOrder: 1,
          sourceVersion: 1,
          status: "completed",
          activatedAt: new Date(),
          completedAt: new Date(),
          skippedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "c-2",
          trainingSessionId: "session-1",
          sessionPhaseId: "phase-1",
          frameworkCheckId: null,
          semanticKey: "recon.2",
          title: "Banner grab",
          description: "Grab banners",
          priority: "recommended",
          provenance: "core",
          sortOrder: 2,
          sourceVersion: 1,
          status: "completed",
          activatedAt: new Date(),
          completedAt: new Date(),
          skippedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const findings: FindingRecord[] = [
        {
          id: "f-1",
          trainingSessionId: "session-1",
          title: "Open Port 80",
          category: "Attack Surface",
          evidence: "80/tcp open http",
          evidenceState: "confirmed",
          importance: "high",
          contextKind: "service",
          contextValue: "http",
          source: null,
          notes: "Nmap scan result",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const hypotheses: HypothesisRecord[] = [
        {
          id: "h-1",
          trainingSessionId: "session-1",
          basedOnFindingId: "f-1",
          hypothesis: "SQLi in login",
          reasoning: "Dynamic SQL parameter",
          expectedResult: "Auth bypass",
          testApproach: "Inject single quote",
          outcome: "confirmed",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const attempts: AttemptRecord[] = [
        {
          id: "a-1",
          trainingSessionId: "session-1",
          hypothesisId: "h-1",
          action: "Injected quote payload",
          notes: "Error returned",
          result: "Bypass succeeded",
          outcome: "confirmed",
          createdAt: new Date(),
        },
      ];

      const metrics = computeReviewMetrics({
        session: dummySession,
        phases: dummyPhases,
        checks,
        findings,
        hypotheses,
        attempts,
        deviations: [],
      });

      expect(metrics.reconCoverage).toBe(100);
      expect(metrics.phaseGateCompliance).toBe(100);
      expect(metrics.hypothesisDiscipline).toBe(100);
      expect(metrics.documentationCoverage).toBe(100);
      expect(metrics.phaseOverrides).toBe(0);
      expect(metrics.totalDurationFormatted).toBe("1h");
    });

    it("correctly penalizes phase gate overrides and incomplete recon", () => {
      const checks: SessionCheckRecord[] = [
        {
          id: "c-1",
          trainingSessionId: "session-1",
          sessionPhaseId: "phase-1",
          frameworkCheckId: null,
          semanticKey: "recon.1",
          title: "Service Scan",
          description: "Scan ports",
          priority: "required",
          provenance: "core",
          sortOrder: 1,
          sourceVersion: 1,
          status: "completed",
          activatedAt: new Date(),
          completedAt: new Date(),
          skippedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "c-2",
          trainingSessionId: "session-1",
          sessionPhaseId: "phase-1",
          frameworkCheckId: null,
          semanticKey: "recon.2",
          title: "Directory Fuzzing",
          description: "Fuzz endpoints",
          priority: "required",
          provenance: "core",
          sortOrder: 2,
          sourceVersion: 1,
          status: "active", // incomplete!
          activatedAt: new Date(),
          completedAt: null,
          skippedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const deviations: MethodologyDeviationRecord[] = [
        {
          id: "dev-1",
          sessionPhaseId: "phase-1",
          type: "phase_gate_override",
          reason: "User skipped to exploitation",
          createdAt: new Date(),
        },
      ];

      const attempts: AttemptRecord[] = [
        {
          id: "a-1",
          trainingSessionId: "session-1",
          hypothesisId: null, // No hypothesis!
          action: "Random payload test",
          notes: null,
          result: null,
          outcome: "rejected",
          createdAt: new Date(),
        },
      ];

      const metrics = computeReviewMetrics({
        session: dummySession,
        phases: dummyPhases,
        checks,
        findings: [],
        hypotheses: [],
        attempts,
        deviations,
      });

      // 1 of 2 recon checks completed -> 50%
      expect(metrics.reconCoverage).toBe(50);
      // 2 total gated transitions, 1 override -> 50%
      expect(metrics.phaseGateCompliance).toBe(50);
      // 0 of 1 attempts had hypothesis -> 0%
      expect(metrics.hypothesisDiscipline).toBe(0);
      expect(metrics.phaseOverrides).toBe(1);
    });
  });

  describe("reconstructUserPath", () => {
    it("orders events chronologically and assigns step numbers", () => {
      const now = Date.now();
      const findings: FindingRecord[] = [
        {
          id: "f-1",
          trainingSessionId: "session-1",
          title: "Discovered Apache",
          category: "Attack Surface",
          evidence: "80/tcp open",
          evidenceState: "confirmed",
          importance: "high",
          contextKind: "service",
          contextValue: "http",
          source: null,
          notes: null,
          createdAt: new Date(now - 1800000), // 30 min ago
          updatedAt: new Date(now - 1800000),
        },
      ];

      const hypotheses: HypothesisRecord[] = [
        {
          id: "h-1",
          trainingSessionId: "session-1",
          basedOnFindingId: "f-1",
          hypothesis: "SQL injection present",
          reasoning: "Authentication logic",
          expectedResult: "Bypass",
          testApproach: "Boolean blind",
          outcome: "confirmed",
          createdAt: new Date(now - 900000), // 15 min ago
          updatedAt: new Date(now - 900000),
        },
      ];

      const steps = reconstructUserPath({
        session: dummySession,
        phases: dummyPhases,
        findings,
        hypotheses,
        attempts: [],
      });

      expect(steps.length).toBe(3); // Start, Finding, Hypothesis
      expect(steps[0].kind).toBe("phase_start");
      expect(steps[0].stepNumber).toBe(1);
      expect(steps[1].title).toContain("Discovered Apache");
      expect(steps[1].stepNumber).toBe(2);
      expect(steps[2].title).toContain("Hypothesis Formulated");
      expect(steps[2].stepNumber).toBe(3);
    });
  });

  describe("compareUserAndReferencePaths", () => {
    it("matches canonical reference nodes with user findings", () => {
      const userPath = [
        {
          id: "u-1",
          stepNumber: 1,
          phase: "reconnaissance",
          title: "Service: HTTP Port 80",
          description: "Found web server",
          timestamp: new Date(),
          kind: "service_discovery" as const,
        },
      ];

      const findings: FindingRecord[] = [
        {
          id: "f-1",
          trainingSessionId: "session-1",
          title: "HTTP Port 80",
          category: "Attack Surface",
          evidence: "80/tcp open",
          evidenceState: "confirmed",
          importance: "high",
          contextKind: "service",
          contextValue: "http",
          source: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const referencePath: RevealedReferencePath = {
        available: true,
        referencePathNodes: [
          {
            id: "node-1",
            semanticKey: "service.http.80",
            title: "Service Discovery: HTTP (Port 80)",
            description: "Apache HTTP",
            phase: "reconnaissance",
            kind: "service_discovery",
            spoilerLevel: 1,
            isEntryPoint: true,
            isTerminal: false,
            port: 80,
            service: "http",
          },
        ],
        allNodes: [],
        edges: [],
        entryNodeIds: ["node-1"],
        terminalNodeIds: [],
      };

      const comparison = compareUserAndReferencePaths({
        userPath,
        findings,
        referencePath,
      });

      expect(comparison).toHaveLength(1);
      expect(comparison[0].userStatus).toBe("matched");
      expect(comparison[0].referenceNodeId).toBe("node-1");
    });
  });

  describe("computeImprovementAreas and generateDeterministicNarrative", () => {
    it("generates actionable improvement areas when metrics fall below thresholds", () => {
      const metrics = computeReviewMetrics({
        session: dummySession,
        phases: dummyPhases,
        checks: [],
        findings: [],
        hypotheses: [],
        attempts: [],
        deviations: [
          {
            id: "d-1",
            sessionPhaseId: null,
            type: "phase_gate_override",
            reason: "Fast test",
            createdAt: new Date(),
          },
        ],
      });

      const areas = computeImprovementAreas(metrics, [
        {
          id: "d-1",
          sessionPhaseId: null,
          type: "phase_gate_override",
          reason: "Fast test",
          createdAt: new Date(),
        },
      ]);

      expect(areas.some((a) => a.id === "phase-gate-discipline")).toBe(true);

      const narrative = generateDeterministicNarrative(metrics, "Test Machine", areas);
      expect(narrative.executiveSummary).toContain("Test Machine");
      expect(narrative.isAiGenerated).toBe(false);
      expect(narrative.strengths.length).toBeGreaterThan(0);
      expect(narrative.recommendation.length).toBeGreaterThan(0);
    });
  });
});
