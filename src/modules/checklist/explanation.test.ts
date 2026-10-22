import { describe, expect, it, beforeEach } from "vitest";
import { ptesFramework } from "../methodology/ptes";
import {
  checkExplanationSchema,
  clearExplanationCache,
  generateCuratedFallback,
  type FallbackContext,
} from "./explanation";
import type { FindingRecord, SessionCheckRecord, SessionPhaseSnapshot } from "../training/types";

function createMockCheck(overrides: Partial<SessionCheckRecord> = {}): SessionCheckRecord {
  return {
    id: "check-1",
    trainingSessionId: "session-1",
    sessionPhaseId: "phase-1",
    frameworkCheckId: null,
    semanticKey: "reconnaissance.initial-port-enumeration",
    title: "Perform initial port enumeration",
    description: "Scan top ports",
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
    ...overrides,
  };
}

function createMockPhase(overrides: Partial<SessionPhaseSnapshot> = {}): SessionPhaseSnapshot {
  return {
    id: "phase-1",
    trainingSessionId: "session-1",
    frameworkPhaseId: null,
    semanticKey: "reconnaissance",
    name: "Reconnaissance",
    description: "Phase description",
    sortOrder: 0,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    checks: [],
    ...overrides,
  };
}

describe("checkExplanationSchema", () => {
  it("validates a compliant 3-layer explanation structure", () => {
    const validData = {
      why: {
        principle: "Evidence before action",
        importance: "Prevents false positives and system instability",
        mindset: "Test methodically, never assume",
      },
      what: {
        contextSummary: "Target has open HTTP port on 80",
        applicableFindings: ["Port 80 HTTP (Apache 2.4.52)"],
        relevance: "Web attack surface enumeration",
      },
      how: {
        approach: "Inspect headers and fuzz directories",
        commands: [
          {
            label: "Curl headers",
            command: "curl -I http://10.10.11.233/",
            tool: "curl",
            description: "Fetches server response headers",
          },
        ],
        expectedSignals: ["Server: Apache", "Status 200 OK"],
      },
    };

    const parsed = checkExplanationSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it("fails validation when required fields are missing", () => {
    const invalidData = {
      why: {
        principle: "Only principle",
      },
    };

    const parsed = checkExplanationSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });
});

describe("Curated Fallback Generator", () => {
  beforeEach(() => {
    clearExplanationCache();
  });

  it("generates valid 3-layer explanation for initial port enumeration with target IP", () => {
    const ctx: FallbackContext = {
      check: createMockCheck({
        semanticKey: "reconnaissance.initial-port-enumeration",
        title: "Perform initial port enumeration",
      }),
      phase: createMockPhase({ semanticKey: "reconnaissance" }),
      targetIp: "10.10.11.250",
      confirmedFindings: [],
    };

    const explanation = generateCuratedFallback(ctx);
    expect(explanation.why.principle).toBeDefined();
    expect(explanation.what.contextSummary).toContain("10.10.11.250");
    expect(explanation.how.commands.length).toBeGreaterThan(0);
    expect(explanation.how.commands[0]?.command).toContain("10.10.11.250");
    expect(explanation.how.commands[0]?.tool).toBe("nmap");

    // Must satisfy schema
    const validation = checkExplanationSchema.safeParse(explanation);
    expect(validation.success).toBe(true);
  });

  it("generates valid 3-layer explanation for HTTP content discovery playbook check", () => {
    const mockFinding: FindingRecord = {
      id: "finding-1",
      trainingSessionId: "session-1",
      title: "Port 80 Open",
      category: "service",
      evidence: "Apache web server",
      evidenceState: "confirmed",
      importance: "medium",
      source: "user",
      notes: null,
      contextKind: "service",
      contextValue: "http",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ctx: FallbackContext = {
      check: createMockCheck({
        semanticKey: "playbook.http.content-discovery",
        title: "Perform content discovery and directory/file fuzzing",
      }),
      phase: createMockPhase({ semanticKey: "reconnaissance" }),
      targetIp: "10.10.11.100",
      confirmedFindings: [mockFinding],
    };

    const explanation = generateCuratedFallback(ctx);
    expect(explanation.why.principle).toContain("Forced browsing");
    expect(explanation.what.applicableFindings.length).toBeGreaterThan(0);
    expect(explanation.how.commands.some((c) => c.tool === "gobuster" || c.tool === "ffuf")).toBe(true);

    const validation = checkExplanationSchema.safeParse(explanation);
    expect(validation.success).toBe(true);
  });

  it("generates valid 3-layer explanation for SSH audit auth methods check", () => {
    const ctx: FallbackContext = {
      check: createMockCheck({
        semanticKey: "playbook.ssh.audit-auth-methods",
        title: "Determine supported authentication methods",
      }),
      phase: createMockPhase({ semanticKey: "reconnaissance" }),
      targetIp: "10.10.10.5",
      confirmedFindings: [],
    };

    const explanation = generateCuratedFallback(ctx);
    expect(explanation.why.principle).toContain("SSH");
    expect(explanation.how.commands.some((c) => c.command.includes("PreferredAuthentications=none"))).toBe(true);

    const validation = checkExplanationSchema.safeParse(explanation);
    expect(validation.success).toBe(true);
  });

  it("generates valid 3-layer explanation for Post-Exploitation sudo check", () => {
    const ctx: FallbackContext = {
      check: createMockCheck({
        semanticKey: "post-exploitation.review-privilege-escalation-surfaces",
        title: "Review privilege escalation surfaces",
      }),
      phase: createMockPhase({ semanticKey: "post-exploitation" }),
      targetIp: "10.10.10.20",
      confirmedFindings: [],
    };

    const explanation = generateCuratedFallback(ctx);
    expect(explanation.how.commands.some((c) => c.command === "sudo -l")).toBe(true);
  });

  it("generates distinct, non-identical explanations for different checks in threat modeling", () => {
    const phase = createMockPhase({ semanticKey: "threat-modeling" });

    const ctxEntryPoints: FallbackContext = {
      check: createMockCheck({
        semanticKey: "threat-modeling.identify-likely-entry-points",
        title: "Identify likely entry points",
      }),
      phase,
      targetIp: "10.10.11.200",
      confirmedFindings: [],
    };

    const ctxTrustBoundaries: FallbackContext = {
      check: createMockCheck({
        semanticKey: "threat-modeling.identify-authentication-and-trust-boundaries",
        title: "Identify authentication and trust boundaries",
      }),
      phase,
      targetIp: "10.10.11.200",
      confirmedFindings: [],
    };

    const expEntryPoints = generateCuratedFallback(ctxEntryPoints);
    const expTrustBoundaries = generateCuratedFallback(ctxTrustBoundaries);

    expect(checkExplanationSchema.safeParse(expEntryPoints).success).toBe(true);
    expect(checkExplanationSchema.safeParse(expTrustBoundaries).success).toBe(true);

    // Assert that they are NOT identical
    expect(expEntryPoints.why.principle).not.toBe(expTrustBoundaries.why.principle);
    expect(expEntryPoints.how.commands[0]?.command).not.toBe(expTrustBoundaries.how.commands[0]?.command);

    // Assert specific content
    expect(expEntryPoints.why.principle).toContain("entry points");
    expect(expTrustBoundaries.why.principle).toContain("Trust boundaries");
    expect(expTrustBoundaries.how.commands.some((c) => c.command.includes("admin"))).toBe(true);
  });

  it("ensures all 48 PTES checks across all 6 phases have distinct, non-identical explanations", () => {
    let totalChecksTested = 0;

    for (const phaseDef of ptesFramework.phases) {
      const phase = createMockPhase({ semanticKey: phaseDef.semanticKey, name: phaseDef.name });
      const seenPrinciples = new Set<string>();
      const seenFirstCommands = new Set<string>();

      for (const checkDef of phaseDef.checks) {
        const ctx: FallbackContext = {
          check: createMockCheck({
            semanticKey: checkDef.semanticKey,
            title: checkDef.title,
          }),
          phase,
          targetIp: "10.10.11.200",
          confirmedFindings: [],
        };

        const explanation = generateCuratedFallback(ctx);

        // Schema validation
        const valid = checkExplanationSchema.safeParse(explanation);
        expect(valid.success, `Schema validation failed for ${checkDef.semanticKey}`).toBe(true);

        // Assert distinctness within the phase
        expect(
          seenPrinciples.has(explanation.why.principle),
          `Duplicate principle detected in phase ${phaseDef.semanticKey} for check ${checkDef.semanticKey}`,
        ).toBe(false);
        seenPrinciples.add(explanation.why.principle);

        const firstCmd = explanation.how.commands[0]?.command ?? "";
        expect(
          seenFirstCommands.has(firstCmd),
          `Duplicate first command detected in phase ${phaseDef.semanticKey} for check ${checkDef.semanticKey}`,
        ).toBe(false);
        seenFirstCommands.add(firstCmd);

        totalChecksTested++;
      }
    }

    expect(totalChecksTested).toBe(48);
  });
});



