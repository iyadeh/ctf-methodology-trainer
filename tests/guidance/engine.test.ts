import { describe, expect, it } from "vitest";
import type { AttackGraph } from "../../src/modules/attack-graph/types";
import {
  calculateSpoilerPenalty,
  escalateSpoilerLevel,
  prepareGuidancePromptContext,
} from "../../src/modules/guidance/engine";
import type { TrainingSessionAggregate } from "../../src/modules/training/types";

describe("Stage 21: Guidance Engine", () => {
  const mockSession: TrainingSessionAggregate = {
    session: {
      id: "session-guidance-1",
      name: "Baseme Training",
      frameworkId: "framework-1",
      status: "in_progress",
      targetIp: "10.10.10.1",
      startedAt: new Date(),
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    phases: [],
    currentPhase: {
      id: "phase-guidance-1",
      trainingSessionId: "session-guidance-1",
      frameworkPhaseId: "fw-phase-1",
      semanticKey: "reconnaissance",
      name: "Reconnaissance",
      description: "Information gathering",
      sortOrder: 1,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      checks: [
        {
          id: "check-1",
          trainingSessionId: "session-guidance-1",
          sessionPhaseId: "phase-guidance-1",
          frameworkCheckId: null,
          semanticKey: "service.http.enum",
          title: "Enumerate HTTP Web Services",
          description: "Scan open web ports",
          priority: "required",
          provenance: "playbook",
          sortOrder: 1,
          status: "active",
          sourceVersion: 1,
          activatedAt: new Date(),
          completedAt: null,
          skippedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
    findings: [
      {
        id: "finding-1",
        trainingSessionId: "session-guidance-1",
        title: "Port 80 HTTP Open",
        category: "service",
        evidence: "80/tcp open http",
        evidenceState: "confirmed",
        contextKind: "service",
        contextValue: "http",
        importance: "high",
        source: "user",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    hypotheses: [],
    attempts: [],
    notes: [],
    context: [],
    progress: {
      required: { total: 1, completed: 0, percentage: 0 },
      coverage: { total: 1, completed: 0, percentage: 0 },
      completedChecks: 0,
      remainingChecks: 1,
    },
  };

  const sampleGraph: AttackGraph = {
    id: "graph-sample",
    machineName: "Baseme",
    nodes: [
      {
        id: "node-recon-1",
        semanticKey: "recon.nmap.port-80",
        phase: "reconnaissance",
        kind: "service_discovery",
        title: "Nmap Port 80 Open",
        description: "Apache HTTP server version 2.4.41 detected on port 80.",
        spoilerLevel: 0,
        isEntryPoint: true,
        isTerminal: false,
      },
      {
        id: "node-vuln-1",
        semanticKey: "vuln.admin.default-creds",
        phase: "vulnerability_analysis",
        kind: "vulnerability_identification",
        title: "Admin Portal Found",
        description: "Portal has default admin:secretpass credentials.",
        spoilerLevel: 4,
        isEntryPoint: false,
        isTerminal: false,
      },
    ],
    edges: [],
    entryNodeIds: ["node-recon-1"],
    terminalNodeIds: ["node-vuln-1"],
    referencePathNodeIds: ["node-recon-1", "node-vuln-1"],
    createdAt: new Date().toISOString(),
  };

  describe("calculateSpoilerPenalty", () => {
    it("returns deterministic penalties based on spoiler level", () => {
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
    it("escalates sequentially and caps at 6", () => {
      expect(escalateSpoilerLevel(0)).toBe(1);
      expect(escalateSpoilerLevel(3)).toBe(4);
      expect(escalateSpoilerLevel(5)).toBe(6);
      expect(escalateSpoilerLevel(6)).toBe(6);
    });
  });

  describe("prepareGuidancePromptContext", () => {
    it("assembles visible state and applies strict spoiler filtering", () => {
      const promptContext = prepareGuidancePromptContext({
        session: mockSession,
        graph: sampleGraph,
        spoilerLevel: 2,
        userQuery: "What should I scan next?",
      });

      expect(promptContext.spoilerLevel).toBe(2);
      expect(promptContext.spoilerLevelName).toBe("technique");
      expect(promptContext.visibleState.currentPhase).toBe("Reconnaissance");
      expect(promptContext.visibleState.activeChecks).toHaveLength(1);
      expect(promptContext.visibleState.activeChecks[0].semanticKey).toBe("service.http.enum");
      expect(promptContext.visibleState.confirmedFindings).toHaveLength(1);
      expect(promptContext.visibleState.confirmedFindings[0].identifier).toBe("http");

      // Level 2 must have NO hidden nodes
      expect(promptContext.filteredHiddenContext.allowedNodes).toHaveLength(0);

      // System instruction includes core rules and boundaries
      expect(promptContext.systemInstruction).toContain("CURRENT SPOILER LEVEL: 2");
      expect(promptContext.systemInstruction).toContain("TECHNIQUE");
      expect(promptContext.userQuery).toBe("What should I scan next?");
    });
  });
});
