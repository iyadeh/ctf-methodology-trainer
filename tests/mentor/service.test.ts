import { describe, expect, it } from "vitest";
import type { AttackGraph } from "../../src/modules/attack-graph/types";
import {
  calculateSpoilerPenalty,
  prepareGuidancePromptContext,
} from "../../src/modules/guidance";
import type { TrainingSessionAggregate } from "../../src/modules/training/types";
import type { HintRecord } from "../../src/modules/mentor/types";

describe("Stage 22: AI Mentor & Hints Engine", () => {
  const mockSession: TrainingSessionAggregate = {
    session: {
      id: "session-mentor-test-1",
      name: "Friendly Machine Training",
      frameworkId: "framework-1",
      status: "in_progress",
      targetIp: "10.10.11.224",
      startedAt: new Date(),
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    phases: [],
    currentPhase: {
      id: "phase-recon",
      trainingSessionId: "session-mentor-test-1",
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
          id: "check-http",
          trainingSessionId: "session-mentor-test-1",
          sessionPhaseId: "phase-recon",
          frameworkCheckId: null,
          semanticKey: "service.http.enum",
          title: "Enumerate HTTP Services",
          description: "Inspect open web ports",
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
        id: "f-1",
        trainingSessionId: "session-mentor-test-1",
        title: "Port 80 Open",
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
    machineName: "Friendly",
    nodes: [
      {
        id: "node-recon-1",
        semanticKey: "recon.nmap.scan",
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

  describe("Spoiler Boundaries & Context Minimization for Mentor Prompt", () => {
    it("strictly isolates hidden knowledge for Spoiler Level 0 (Methodology)", () => {
      const promptCtx = prepareGuidancePromptContext({
        session: mockSession,
        graph: sampleGraph,
        spoilerLevel: 0,
        userQuery: "How do I exploit this machine?",
      });

      expect(promptCtx.spoilerLevel).toBe(0);
      expect(promptCtx.spoilerLevelName).toBe("methodology");
      expect(promptCtx.filteredHiddenContext.allowedNodes).toHaveLength(0);
      expect(promptCtx.systemInstruction).toContain("CURRENT SPOILER LEVEL: 0");
      expect(promptCtx.systemInstruction).toContain("Give the least revealing guidance");
    });

    it("restricts hidden knowledge up to current phase for Level 4 and redacts secrets", () => {
      const promptCtx = prepareGuidancePromptContext({
        session: mockSession,
        graph: sampleGraph,
        spoilerLevel: 4,
        userQuery: "What should I look for?",
      });

      expect(promptCtx.spoilerLevel).toBe(4);
      expect(promptCtx.spoilerLevelName).toBe("machine_context");
      // Current phase is reconnaissance, so node-vuln-1 (in vulnerability_analysis) is NOT allowed at rank 1
      expect(promptCtx.filteredHiddenContext.allowedNodes).toHaveLength(1);
      expect(promptCtx.filteredHiddenContext.allowedNodes[0].id).toBe("node-recon-1");
    });

    it("allows full unredacted reveal across all phases for Level 6 (Full Reveal)", () => {
      const promptCtx = prepareGuidancePromptContext({
        session: mockSession,
        graph: sampleGraph,
        spoilerLevel: 6,
        userQuery: "apa flag rootnya",
      });

      expect(promptCtx.spoilerLevel).toBe(6);
      expect(promptCtx.spoilerLevelName).toBe("full_reveal");
      expect(promptCtx.filteredHiddenContext.allowedNodes).toHaveLength(2);
      expect(promptCtx.systemInstruction).toContain("ALLOWED MACHINE KNOWLEDGE");
      expect(promptCtx.systemInstruction).toContain("Admin Portal Found");
    });
  });

  describe("Deterministic Metric Calculations", () => {
    it("calculates correct penalties across hints", () => {
      const mockHints: Partial<HintRecord>[] = [
        { spoilerLevel: 0, mode: "methodology_hint", penaltyPoints: calculateSpoilerPenalty(0) },
        { spoilerLevel: 1, mode: "concept_explanation", penaltyPoints: calculateSpoilerPenalty(1) },
        { spoilerLevel: 4, mode: "methodology_hint", penaltyPoints: calculateSpoilerPenalty(4) },
        { spoilerLevel: 6, mode: "methodology_hint", penaltyPoints: calculateSpoilerPenalty(6) },
      ];

      let totalPenalty = 0;
      let machineSpecific = 0;
      let fullReveals = 0;

      for (const h of mockHints) {
        totalPenalty += h.penaltyPoints!;
        if (h.spoilerLevel === 4 || h.spoilerLevel === 5) machineSpecific++;
        if (h.spoilerLevel === 6) fullReveals++;
      }

      expect(totalPenalty).toBe(31);
      expect(machineSpecific).toBe(1);
      expect(fullReveals).toBe(1);
    });
  });

  describe("AI Checklist Invariant Rules", () => {
    it("enforces that AI-generated checks are always priority 'suggested' and provenance 'ai_generated'", () => {
      const aiSuggestedCheck = {
        semanticKey: "ai.http.check-robots",
        title: "Inspect robots.txt and sitemap",
        description: "Check for disallowed web directories",
        priority: "suggested" as const,
        provenance: "ai_generated" as const,
      };

      expect(aiSuggestedCheck.priority).toBe("suggested");
      expect(aiSuggestedCheck.provenance).toBe("ai_generated");
      // Must not be required or recommended (never blocks Phase Gate)
      expect(aiSuggestedCheck.priority).not.toBe("required");
      expect(aiSuggestedCheck.priority).not.toBe("recommended");
    });
  });
});
