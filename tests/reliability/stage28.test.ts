import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

import type { AttackGraph } from "../../src/modules/attack-graph/types";
import {
  filterHiddenContextBySpoilerLevel,
  redactSensitiveText,
} from "../../src/modules/guidance/policy";
import {
  calculateCoreProgress,
  calculateMethodologyCoverage,
  evaluatePhaseGate,
} from "../../src/modules/methodology/engine";
import { deriveContextFromFinding } from "../../src/modules/context/engine";
import {
  computeImprovementAreas,
  computeReviewMetrics,
  generateDeterministicNarrative,
} from "../../src/modules/review/metrics";
import { TrainingSessionError } from "../../src/modules/training/types";
import { validateWriteupFile } from "../../src/modules/writeups/validation";
import { normalizeWriteupText } from "../../src/modules/writeups/normalizer";
import { WriteupParseError } from "../../src/modules/writeups/types";

const { maskApiKey } = await import("../../src/modules/settings");
const { isValidUuid, loadTrainingSessionSnapshot } = await import(
  "../../src/modules/training/repository"
);
const { getSessionReview } = await import("../../src/modules/review/service");
const { getDashboardData, listTrainingSessions } = await import("../../src/modules/training/service");

describe("Stage 28 — Reliability, Security, & Polish Suite", () => {
  const mockGraph: AttackGraph = {
    id: "graph-stage28-test",
    machineName: "VulnerableTarget",
    nodes: [
      {
        id: "node-1",
        semanticKey: "recon.http.port-80",
        phase: "reconnaissance",
        kind: "service_discovery",
        title: "Port 80 HTTP Open",
        description: "Apache 2.4.41 detected on port 80",
        spoilerLevel: 0,
        isEntryPoint: true,
        isTerminal: false,
      },
      {
        id: "node-2",
        semanticKey: "vuln.sqli.login",
        phase: "vulnerability_analysis",
        kind: "vulnerability_identification",
        title: "SQL Injection on /login.php",
        description: "Admin login portal has default creds admin:SuperSecretP@ssword123 and database hash.",
        spoilerLevel: 4,
        isEntryPoint: false,
        isTerminal: false,
      },
      {
        id: "node-3",
        semanticKey: "exploit.root.flag",
        phase: "post_exploitation",
        kind: "objective_capture",
        title: "Root Flag Captured",
        description: "Root shell achieved at /root/root.txt holding flag HTB{st4g3_28_s3cur1ty_pr00f}.",
        spoilerLevel: 6,
        isEntryPoint: false,
        isTerminal: true,
      },
    ],
    edges: [],
    entryNodeIds: ["node-1"],
    terminalNodeIds: ["node-3"],
    referencePathNodeIds: ["node-1", "node-2", "node-3"],
    createdAt: new Date().toISOString(),
  };

  describe("Pilar 1: Security & Secret Boundary Audit", () => {
    it("strictly isolates hidden attack graph nodes at Spoiler Levels 0, 1, 2, and 3", () => {
      for (const level of [0, 1, 2, 3] as const) {
        const filtered = filterHiddenContextBySpoilerLevel({
          graph: mockGraph,
          spoilerLevel: level,
          currentPhaseKey: "reconnaissance",
        });

        expect(filtered.allowedNodes).toHaveLength(0);
        expect(filtered.guidanceScope).toBeTruthy();
        expect(filtered.requestedLevel).toBe(level);
      }
    });

    it("redacts credentials and CTF flags automatically at Spoiler Level 4 & 5", () => {
      const sampleText =
        "Service credentials are devuser:P@ssw0rd! and admin:Secret999. Flag is HTB{r00t_fl4g_pwn3d} in /root/root.txt.";
      const { redactedText, redactedItems } = redactSensitiveText(
        sampleText,
        new Set<string>(), // No confirmed discoveries yet
      );

      expect(redactedText).not.toContain("P@ssw0rd!");
      expect(redactedText).not.toContain("Secret999");
      expect(redactedText).not.toContain("HTB{r00t_fl4g_pwn3d}");
      expect(redactedText).toContain("[REDACTED_PASSWORD]");
      expect(redactedText).toContain("[REDACTED_FLAG]");
      expect(redactedItems.length).toBeGreaterThan(0);
    });

    it("preserves learner's own confirmed discoveries while redacting unknown secrets", () => {
      const knownCred = "admin:Secret999";
      const sampleText =
        "Found admin:Secret999 and another secret root:HiddenToorPass!";
      const { redactedText } = redactSensitiveText(
        sampleText,
        new Set<string>([knownCred, "Secret999"]),
      );

      // Known cred is preserved
      expect(redactedText).toContain("admin:Secret999");
      // Unknown cred is redacted
      expect(redactedText).toContain("root:[REDACTED_PASSWORD]");
      expect(redactedText).not.toContain("HiddenToorPass!");
    });

    it("ensures canonical context is derived ONLY from confirmed findings", () => {
      const unconfirmedObserved = deriveContextFromFinding({
        evidenceState: "observed",
        contextKind: "service",
        contextValue: "apache",
      });
      const unconfirmedInferred = deriveContextFromFinding({
        evidenceState: "inferred",
        contextKind: "service",
        contextValue: "ssh",
      });
      const confirmedFinding = deriveContextFromFinding({
        evidenceState: "confirmed",
        contextKind: "service",
        contextValue: "nginx",
      });

      expect(unconfirmedObserved).toHaveLength(0);
      expect(unconfirmedInferred).toHaveLength(0);
      expect(confirmedFinding).toEqual(["service:http"]);
    });
  });

  describe("Pilar 2: Document Parser & File Upload Hardening", () => {
    it("rejects 0-byte empty writeup files", () => {
      expect(() =>
        validateWriteupFile({
          filename: "empty_writeup.txt",
          buffer: Buffer.alloc(0),
        }),
      ).toThrowError(WriteupParseError);
    });

    it("rejects files exceeding the 10 MB maximum limit", () => {
      const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 1);
      expect(() =>
        validateWriteupFile({
          filename: "giant_writeup.txt",
          buffer: oversizedBuffer,
        }),
      ).toThrowError(/exceeds maximum allowed limit/);
    });

    it("rejects untrusted and malicious file extensions", () => {
      for (const dangerousName of [
        "exploit.exe",
        "shell.sh",
        "payload.php",
        "script.js",
        "archive.zip",
      ]) {
        expect(() =>
          validateWriteupFile({
            filename: dangerousName,
            buffer: Buffer.from("harmless content"),
          }),
        ).toThrowError(/Unsupported file extension/);
      }
    });

    it("enforces valid PDF magic byte signature (%PDF-)", () => {
      const fakePdfBuffer = Buffer.from("This is not a real PDF file content");
      expect(() =>
        validateWriteupFile({
          filename: "spoofed.pdf",
          buffer: fakePdfBuffer,
        }),
      ).toThrowError(/does not contain a valid PDF signature/);
    });

    it("sanitizes null bytes and normalizes line endings cleanly", () => {
      const dirtyRawText = "Line 1\r\nLine with null \0byte\r\nLine 3\t\twith tabs";
      const cleaned = normalizeWriteupText(dirtyRawText);

      expect(cleaned).not.toContain("\0");
      expect(cleaned).not.toContain("\r\n");
      expect(cleaned).toContain("Line with null byte");
    });
  });

  describe("Pilar 3: Deterministic Methodology & Math Invariants", () => {
    it("Phase Gate deterministically blocks transition if any required check is pending", () => {
      const checks = [
        {
          semanticKey: "recon.target-reachable",
          title: "Ping Target",
          description: "Verify host reachability",
          priority: "required" as const,
          status: "completed" as const,
        },
        {
          semanticKey: "recon.port-scan",
          title: "Full Port Scan",
          description: "Scan all 65535 ports",
          priority: "required" as const,
          status: "active" as const, // INCOMPLETE REQUIRED
        },
        {
          semanticKey: "recon.banner-grab",
          title: "Grab Banners",
          description: "Optional banner grabbing",
          priority: "recommended" as const,
          status: "active" as const,
        },
      ];

      const gate = evaluatePhaseGate(checks);
      expect(gate.allowed).toBe(false);
      expect(gate.missingRequiredChecks.map((c) => c.semanticKey)).toContain("recon.port-scan");
      expect(gate.missingRequiredChecks.map((c) => c.semanticKey)).not.toContain("recon.banner-grab");
    });

    it("Phase Gate permits advancement when all required checks are completed", () => {
      const checks = [
        {
          semanticKey: "recon.target-reachable",
          title: "Ping Target",
          description: "Verify host reachability",
          priority: "required" as const,
          status: "completed" as const,
        },
        {
          semanticKey: "recon.banner-grab",
          title: "Grab Banners",
          description: "Optional banner grabbing",
          priority: "suggested" as const,
          status: "active" as const, // Incomplete suggested does NOT block
        },
      ];

      const gate = evaluatePhaseGate(checks);
      expect(gate.allowed).toBe(true);
      expect(gate.missingRequiredChecks).toHaveLength(0);
    });

    it("calculateCoreProgress and calculateMethodologyCoverage handle empty lists and produce integer percentages", () => {
      expect(calculateCoreProgress([])).toEqual({
        completed: 0,
        total: 0,
        percentage: 100, // An empty activated checklist has no outstanding work
      });

      const sampleChecks = [
        { status: "completed" as const, semanticKey: "c1", title: "", description: "", priority: "required" as const },
        { status: "completed" as const, semanticKey: "c2", title: "", description: "", priority: "required" as const },
        { status: "active" as const, semanticKey: "c3", title: "", description: "", priority: "required" as const },
      ];

      const progress = calculateCoreProgress(sampleChecks);
      expect(progress.percentage).toBe(67); // 2/3 = 66.666...% rounded to 67
      expect(Number.isInteger(progress.percentage)).toBe(true);

      const coverage = calculateMethodologyCoverage(sampleChecks);
      expect(coverage.percentage).toBe(67);
      expect(Number.isInteger(coverage.percentage)).toBe(true);
    });

    it("computeReviewMetrics strictly limits metrics within [0, 100] bounds", () => {
      const mockSession = {
        id: "s1",
        userId: "u1",
        machineName: "TestBox",
        targetIp: "10.10.10.10",
        status: "completed",
        currentPhase: "post_exploitation",
        mode: "interactive",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date().toISOString(),
      } as unknown as Parameters<typeof computeReviewMetrics>[0]["session"];

      const mockPhase = {
        id: "p1",
        sessionId: "s1",
        semanticKey: "reconnaissance",
        title: "Reconnaissance",
        sortOrder: 1,
        status: "completed",
        createdAt: new Date().toISOString(),
      } as unknown as Parameters<typeof computeReviewMetrics>[0]["phases"][number];

      const input: Parameters<typeof computeReviewMetrics>[0] = {
        session: mockSession,
        phases: [mockPhase],
        checks: [],
        findings: [],
        hypotheses: [],
        attempts: [],
        deviations: [
          { id: "d1", sessionPhaseId: "p1", type: "phase_gate_override", reason: "Forced gate", createdAt: new Date() },
          { id: "d2", sessionPhaseId: "p1", type: "phase_gate_override", reason: "Forced gate 2", createdAt: new Date() },
          { id: "d3", sessionPhaseId: "p1", type: "phase_gate_override", reason: "Forced gate 3", createdAt: new Date() },
          { id: "d4", sessionPhaseId: "p1", type: "phase_gate_override", reason: "Forced gate 4", createdAt: new Date() },
          { id: "d5", sessionPhaseId: "p1", type: "phase_gate_override", reason: "Forced gate 5", createdAt: new Date() },
          { id: "d6", sessionPhaseId: "p1", type: "phase_gate_override", reason: "Forced gate 6", createdAt: new Date() },
        ],
        hintMetrics: {
          totalHints: 15,
          methodologyHints: 4,
          conceptExplanations: 4,
          machineSpecificHints: 5,
          fullReveals: 2,
          totalPenaltyPoints: 120, // Huge hint penalties
        },
      };

      const metrics = computeReviewMetrics(input);
      expect(metrics.reconCoverage).toBeGreaterThanOrEqual(0);
      expect(metrics.reconCoverage).toBeLessThanOrEqual(100);
      expect(metrics.phaseGateCompliance).toBeGreaterThanOrEqual(0);
      expect(metrics.phaseGateCompliance).toBeLessThanOrEqual(100);
      expect(metrics.hypothesisDiscipline).toBeGreaterThanOrEqual(0);
      expect(metrics.hypothesisDiscipline).toBeLessThanOrEqual(100);
      expect(metrics.documentationCoverage).toBeGreaterThanOrEqual(0);
      expect(metrics.documentationCoverage).toBeLessThanOrEqual(100);
      expect(metrics.phaseOverrides).toBe(6);
    });
  });

  describe("Pilar 4: Masking & Key Protection Audit", () => {
    it("safely masks Google Gemini keys without leaking internal tokens", () => {
      const fullKey = "AIzaSyDUMMYSECRETKEYFORTESTING1234567890";
      const masked = maskApiKey(fullKey);

      expect(masked).toBe("AIzaSy••••••••7890");
      expect(masked).not.toContain("DUMMYSECRETKEY");
      expect(masked.length).toBeLessThan(fullKey.length);
    });

    it("returns 'Not Configured' safely for empty, null, or whitespace-only inputs", () => {
      expect(maskApiKey(null)).toBe("Not Configured");
      expect(maskApiKey(undefined)).toBe("Not Configured");
      expect(maskApiKey("")).toBe("Not Configured");
      expect(maskApiKey("   ")).toBe("Not Configured");
    });
  });

  describe("Pilar 5: Graceful AI Degradation & Fallback Guidance", () => {
    it("generates structured deterministic narrative when AI is disabled or unavailable", () => {
      const mockMetrics = {
        reconCoverage: 85,
        phaseGateCompliance: 100,
        hypothesisDiscipline: 90,
        documentationCoverage: 80,
        hintsUsed: 1,
        machineHints: 0,
        fullReveals: 0,
        phaseOverrides: 0,
        totalPenaltyPoints: 5,
        totalDurationMs: 3600000,
        totalDurationFormatted: "1h",
        totalChecksCompleted: 12,
        totalFindingsRecorded: 4,
        totalHypothesesFormed: 3,
        totalAttemptsExecuted: 3,
        breakdown: {
          recon: { completed: 8, total: 10 },
          gates: { compliantTransitions: 5, totalTransitions: 5, overrides: 0 },
          hypotheses: { attemptsWithHypothesis: 3, totalAttempts: 3 },
          documentation: { confirmedWithEvidence: 4, totalConfirmed: 4 },
        },
      };

      const improvementAreas = computeImprovementAreas(mockMetrics, []);
      const narrative = generateDeterministicNarrative(mockMetrics, "TargetMachine", improvementAreas);

      expect(narrative.isAiGenerated).toBe(false);
      expect(narrative.executiveSummary).toContain("TargetMachine");
      expect(narrative.strengths.length).toBeGreaterThan(0);
      expect(narrative.areasForGrowth.length).toBeGreaterThan(0);
      expect(narrative.recommendation).toBeTruthy();
    });
  });

  describe("Pilar 6: ID Safety & Non-UUID Input Hardening", () => {
    it("validates UUIDs correctly and rejects slug strings", () => {
      expect(isValidUuid("5ecac19c-f6c0-461f-96f9-e1bb33739d53")).toBe(true);
      expect(isValidUuid("cap")).toBe(false);
      expect(isValidUuid("baseme")).toBe(false);
      expect(isValidUuid("")).toBe(false);
      expect(isValidUuid("12345")).toBe(false);
    });

    it("rejects non-UUID sessionId with TrainingSessionError('not_found') without database query crash", async () => {
      await expect(loadTrainingSessionSnapshot("cap")).rejects.toThrowError(TrainingSessionError);
      await expect(getSessionReview("cap")).rejects.toThrowError(TrainingSessionError);
    });

    it("listTrainingSessions returns live sessions and metrics from PostgreSQL", async () => {
      const { sessions, metrics } = await listTrainingSessions();
      expect(sessions.length).toBeGreaterThan(0);
      expect(metrics).toHaveLength(4);
      expect(sessions.some((s) => s.id === "586e2932-1189-4996-9ad9-20eb440242fd")).toBe(true);
      const beepSession = sessions.find((s) => s.id === "586e2932-1189-4996-9ad9-20eb440242fd");
      expect(beepSession?.name).toBe("Beep");
      expect(["In Progress", "Paused", "Completed", "Not Started"]).toContain(beepSession?.status);
      if (beepSession?.status === "Paused") {
        expect(beepSession?.action).toBe("Resume");
      } else if (beepSession?.status === "In Progress") {
        expect(beepSession?.action).toBe("Continue");
      }
    });

    it("getDashboardData returns live dashboard state from PostgreSQL", async () => {
      const dashboard = await getDashboardData();
      expect(dashboard.overview).toHaveLength(4);
      expect(dashboard.methodologyProgress).toHaveLength(6);
      expect(Array.isArray(dashboard.recentSessions)).toBe(true);
      if (dashboard.featuredSession) {
        expect(dashboard.featuredSession.name).toBeDefined();
        expect(typeof dashboard.featuredSession.progress).toBe("number");
      }
    });
  });
});
