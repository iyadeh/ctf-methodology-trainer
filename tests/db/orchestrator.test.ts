import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

const { db } = await import("../../src/lib/db");
const {
  attackGraphs,
  attackNodes,
  attackEdges,
  generationRuns,
  graphVerifications,
  machineProfiles,
  trainingSessions,
  writeups,
} = await import("../../src/lib/db/schema");
const { generateTrainingSession } = await import(
  "../../src/modules/training/orchestrator"
);
import type { ExtractedMachineFacts } from "../../src/modules/facts/types";

const createdSessionIds: string[] = [];
const createdRunIds: string[] = [];

afterEach(async () => {
  if (createdSessionIds.length > 0) {
    await db
      .delete(trainingSessions)
      .where(inArray(trainingSessions.id, createdSessionIds));
    createdSessionIds.length = 0;
  }
  if (createdRunIds.length > 0) {
    await db
      .delete(generationRuns)
      .where(inArray(generationRuns.id, createdRunIds));
    createdRunIds.length = 0;
  }
});

const mockValidFacts: ExtractedMachineFacts = {
  profile: {
    name: "OrchestratorTarget",
    platform: "HackTheBox",
    os: "linux",
    difficulty: "easy",
    author: "tester",
    targetIp: "10.10.11.50",
  },
  services: [
    {
      port: 80,
      protocol: "tcp",
      service: "http",
      product: "nginx",
      version: "1.18.0",
      provenance: "80/tcp open",
    },
    {
      port: 22,
      protocol: "tcp",
      service: "ssh",
      product: "OpenSSH",
      version: "8.9p1",
      provenance: "22/tcp open",
    },
  ],
  surfaces: [
    {
      kind: "web",
      name: "Login Portal",
      urlOrPath: "/login.php",
      technologies: ["PHP"],
      provenance: "Web search",
    },
  ],
  findings: [
    {
      kind: "credential",
      identifier: "admin:adminpass",
      description: "Admin credentials",
      provenance: "SQL dump",
    },
  ],
  vulnerabilities: [
    {
      title: "SQL Injection in Login",
      category: "injection",
      affectedTarget: "http://10.10.11.50/login.php",
      description: "SQLi in username field",
      severity: "high",
      provenance: "Tested manual payload",
    },
  ],
  objectives: [
    {
      name: "User Flag",
      location: "/home/admin/user.txt",
      type: "user_flag",
      provenance: "cat user.txt",
    },
    {
      name: "Root Flag",
      location: "/root/root.txt",
      type: "root_flag",
      provenance: "cat root.txt",
    },
  ],
  attackSteps: [
    {
      stepNumber: 1,
      phase: "reconnaissance",
      action: "Port scan",
      toolsUsed: ["nmap"],
      prerequisites: [],
      provenance: "scan",
    },
    {
      stepNumber: 2,
      phase: "initial_access",
      action: "SSH login using admin credentials",
      toolsUsed: ["ssh"],
      prerequisites: ["admin:adminpass"],
      provenance: "ssh admin@10.10.11.50",
    },
    {
      stepNumber: 3,
      phase: "privilege_escalation",
      action: "Abuse sudo privileges on bash",
      toolsUsed: ["sudo"],
      prerequisites: [],
      provenance: "sudo bash",
    },
  ],
  summary: "Valid test writeup for orchestration.",
};

describe("Stage 20: Training Generation Orchestrator", () => {
  it("orchestrates the full pipeline and persists hidden knowledge atomically", async () => {
    const uniqueContent = `# Orchestrator Test Machine ${randomUUID()}
This is a test writeup document with unique content.
Open ports: 80/tcp, 22/tcp.
Admin login at /login.php.
`;
    const buffer = Buffer.from(uniqueContent, "utf-8");

    let extractorCallCount = 0;
    const mockExtractor = async () => {
      extractorCallCount++;
      return mockValidFacts;
    };

    const result = await generateTrainingSession({
      writeupFile: {
        filename: "orchestrator-test.md",
        buffer,
        mimeType: "text/markdown",
      },
      extractFactsFn: mockExtractor,
    });

    expect(result.ok).toBe(true);
    expect(result.sessionId).toBeDefined();
    expect(result.generationRunId).toBeDefined();
    expect(result.machineProfile?.name).toBe("OrchestratorTarget");
    expect(extractorCallCount).toBe(1);

    createdSessionIds.push(result.sessionId!);
    createdRunIds.push(result.generationRunId);

    // 0. Verify writeups table
    const [writeupRecord] = await db
      .select()
      .from(writeups)
      .where(eq(writeups.sha256Hash, result.fingerprint));
    expect(writeupRecord).toBeDefined();
    expect(writeupRecord.filename).toBe("orchestrator-test.md");

    // 1. Verify generation_runs table
    const [runRecord] = await db
      .select()
      .from(generationRuns)
      .where(eq(generationRuns.id, result.generationRunId));
    expect(runRecord).toBeDefined();
    expect(runRecord.status).toBe("completed");
    expect(runRecord.progressPercent).toBe(100);
    expect(runRecord.trainingSessionId).toBe(result.sessionId);

    // 2. Verify machine_profiles table
    const [profileRecord] = await db
      .select()
      .from(machineProfiles)
      .where(eq(machineProfiles.trainingSessionId, result.sessionId!));
    expect(profileRecord).toBeDefined();
    expect(profileRecord.name).toBe("OrchestratorTarget");
    expect(profileRecord.os).toBe("linux");

    // 3. Verify attack_graphs table
    const [graphRecord] = await db
      .select()
      .from(attackGraphs)
      .where(eq(attackGraphs.trainingSessionId, result.sessionId!));
    expect(graphRecord).toBeDefined();
    expect(graphRecord.machineName).toBe("OrchestratorTarget");

    // 4. Verify attack_nodes and attack_edges
    const nodes = await db
      .select()
      .from(attackNodes)
      .where(eq(attackNodes.attackGraphId, graphRecord.id));
    expect(nodes.length).toBeGreaterThan(3);

    const edges = await db
      .select()
      .from(attackEdges)
      .where(eq(attackEdges.attackGraphId, graphRecord.id));
    expect(edges.length).toBeGreaterThan(0);

    // 5. Verify graph_verifications table
    const [verificationRecord] = await db
      .select()
      .from(graphVerifications)
      .where(eq(graphVerifications.attackGraphId, graphRecord.id));
    expect(verificationRecord).toBeDefined();
    expect(verificationRecord.status).toBe("validated");
    expect(verificationRecord.confidence).toBeGreaterThanOrEqual(85);

    // 6. Test Idempotency: Re-submitting the exact same writeup reuses the session without re-extracting
    const repeatResult = await generateTrainingSession({
      writeupFile: {
        filename: "orchestrator-test.md",
        buffer,
        mimeType: "text/markdown",
      },
      extractFactsFn: mockExtractor,
    });

    expect(repeatResult.ok).toBe(true);
    expect(repeatResult.sessionId).toBe(result.sessionId);
    // extractor was NOT called again due to fingerprint cache!
    expect(extractorCallCount).toBe(1);
  });

  it("blocks training session creation when graph verification fails", async () => {
    const brokenFacts: ExtractedMachineFacts = {
      ...mockValidFacts,
      profile: {
        ...mockValidFacts.profile,
        name: "BrokenTarget",
      },
      // Terminal objectives exist, but no attack steps or initial access
      attackSteps: [],
    };

    const uniqueContent = `# Broken Machine ${randomUUID()}
Missing exploitation steps completely.
`;
    const buffer = Buffer.from(uniqueContent, "utf-8");

    const result = await generateTrainingSession({
      writeupFile: {
        filename: "broken-test.md",
        buffer,
        mimeType: "text/markdown",
      },
      extractFactsFn: async () => brokenFacts,
    });

    expect(result.ok).toBe(false);
    expect(result.sessionId).toBeUndefined();
    expect(result.error).toContain("verification failed");

    createdRunIds.push(result.generationRunId);

    // Verify generation_runs is marked failed
    const [runRecord] = await db
      .select()
      .from(generationRuns)
      .where(eq(generationRuns.id, result.generationRunId));
    expect(runRecord.status).toBe("failed");
    expect(runRecord.trainingSessionId).toBeNull();

    // Verify no trainingSession was created for BrokenTarget
    const sessions = await db
      .select()
      .from(trainingSessions)
      .where(eq(trainingSessions.name, "BrokenTarget"));
    expect(sessions).toHaveLength(0);
  });

  it("handles domain name targets (e.g. chall.petircysec.xyz) cleanly without inet syntax errors", async () => {
    const domainFacts: ExtractedMachineFacts = {
      ...mockValidFacts,
      profile: {
        ...mockValidFacts.profile,
        name: "BeeFest 2022",
        targetIp: "chall.petircysec.xyz",
      },
    };

    const uniqueContent = `# BeeFest 2022 ${randomUUID()}
Target domain: chall.petircysec.xyz
`;
    const buffer = Buffer.from(uniqueContent, "utf-8");

    const result = await generateTrainingSession({
      writeupFile: {
        filename: "beefest-domain-test.md",
        buffer,
        mimeType: "text/markdown",
      },
      extractFactsFn: async () => domainFacts,
    });

    expect(result.ok).toBe(true);
    expect(result.sessionId).toBeDefined();
    expect(result.machineProfile?.targetIp).toBe("chall.petircysec.xyz");

    createdSessionIds.push(result.sessionId!);
    createdRunIds.push(result.generationRunId);

    const [profile] = await db
      .select()
      .from(machineProfiles)
      .where(eq(machineProfiles.trainingSessionId, result.sessionId!));
    expect(profile).toBeDefined();
    expect(profile.targetIp).toBe("chall.petircysec.xyz");
  });
});
