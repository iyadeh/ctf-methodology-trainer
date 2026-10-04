import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { config } from "dotenv";
import { inArray } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

const { db } = await import("../../src/lib/db");
const { attackGraphs, attackNodes, attackEdges, trainingSessions } = await import(
  "../../src/lib/db/schema"
);
const {
  createTrainingSession,
  startTrainingSession,
} = await import("../../src/modules/training/service");
const {
  completeTrainingSession,
  getRevealedReferencePath,
} = await import("../../src/modules/training/completion");
const { TrainingSessionError } = await import("../../src/modules/training/types");

const createdSessionIds: string[] = [];
const allCreatedIds: string[] = [];

async function createFixture() {
  const aggregate = await createTrainingSession({
    name: `Stage 23 completion test ${randomUUID()}`,
  });
  createdSessionIds.push(aggregate.session.id);
  allCreatedIds.push(aggregate.session.id);
  return aggregate;
}

afterEach(async () => {
  if (createdSessionIds.length > 0) {
    await db.delete(trainingSessions).where(inArray(trainingSessions.id, createdSessionIds));
    createdSessionIds.length = 0;
  }
});

afterAll(async () => {
  if (allCreatedIds.length > 0) {
    const remaining = await db
      .select({ id: trainingSessions.id })
      .from(trainingSessions)
      .where(inArray(trainingSessions.id, allCreatedIds));
    expect(remaining).toHaveLength(0);
  }
});

describe("Stage 23 — Session Completion & Reference Path Reveal", () => {
  it("rejects completion of an unstarted session", async () => {
    const fixture = await createFixture();

    await expect(
      completeTrainingSession(fixture.session.id),
    ).rejects.toThrowError(TrainingSessionError);
  });

  it("completes an in-progress session and sets completedAt timestamp", async () => {
    const fixture = await createFixture();
    await startTrainingSession(fixture.session.id);

    const completed = await completeTrainingSession(fixture.session.id);

    expect(completed.session.status).toBe("completed");
    expect(completed.session.completedAt).not.toBeNull();
    expect(completed.session.completedAt instanceof Date).toBe(true);

    // Active phase must be marked completed
    const activePhases = completed.phases.filter((p) => p.status === "active");
    expect(activePhases).toHaveLength(0);

    const firstPhase = completed.phases.find((p) => p.sortOrder === 0);
    expect(firstPhase?.status).toBe("completed");
  });

  it("records submitted objective evidence as a confirmed finding upon completion", async () => {
    const fixture = await createFixture();
    await startTrainingSession(fixture.session.id);

    const flagString = "BEECTF{test_root_flag_compromise_2026}";
    const completed = await completeTrainingSession(fixture.session.id, {
      objectiveType: "root_flag",
      objectiveEvidence: flagString,
      notes: "Extracted using manual SQL injection vector",
    });

    expect(completed.session.status).toBe("completed");

    const objectiveFindings = completed.findings.filter(
      (f) => f.category === "objective_capture",
    );
    expect(objectiveFindings).toHaveLength(1);
    expect(objectiveFindings[0].evidence).toBe(flagString);
    expect(objectiveFindings[0].evidenceState).toBe("confirmed");
    expect(objectiveFindings[0].importance).toBe("high");
    expect(objectiveFindings[0].title).toContain("Root Flag");
  });

  it("is idempotent when called on an already completed session", async () => {
    const fixture = await createFixture();
    await startTrainingSession(fixture.session.id);

    const first = await completeTrainingSession(fixture.session.id);
    const second = await completeTrainingSession(fixture.session.id);

    expect(first.session.status).toBe("completed");
    expect(second.session.status).toBe("completed");
    expect(second.session.completedAt).toEqual(first.session.completedAt);
  });

  it("strictly enforces Hidden Knowledge Security Boundary: returns null before completion", async () => {
    const fixture = await createFixture();

    // 1. Not started session
    const beforeStart = await getRevealedReferencePath(fixture.session.id);
    expect(beforeStart).toBeNull();

    // 2. In progress session
    await startTrainingSession(fixture.session.id);
    const whileInProgress = await getRevealedReferencePath(fixture.session.id);
    expect(whileInProgress).toBeNull();
  });

  it("reveals attack graph reference path ONLY after session completion", async () => {
    const fixture = await createFixture();
    await startTrainingSession(fixture.session.id);

    // Seed mock attack graph for this session
    const [graph] = await db
      .insert(attackGraphs)
      .values({
        trainingSessionId: fixture.session.id,
        machineName: "Testbox-23",
        entryNodeIdsJson: JSON.stringify(["node-1"]),
        terminalNodeIdsJson: JSON.stringify(["node-2"]),
        referencePathNodeIdsJson: JSON.stringify(["node-1", "node-2"]),
      })
      .returning();

    await db.insert(attackNodes).values([
      {
        attackGraphId: graph.id,
        nodeKey: "node-1",
        semanticKey: "service.http.open",
        title: "HTTP Port 80 Open",
        description: "Apache web server discovered on target.",
        phase: "reconnaissance",
        kind: "service_discovery",
        spoilerLevel: 0,
        isEntryPoint: true,
        isTerminal: false,
        metadataJson: JSON.stringify({ port: 80, service: "http", toolsUsed: ["nmap"] }),
      },
      {
        attackGraphId: graph.id,
        nodeKey: "node-2",
        semanticKey: "vulnerability.rce.root",
        title: "Command Injection to Root",
        description: "Vulnerable parameter enables root shell and flag extraction.",
        phase: "exploitation",
        kind: "objective_capture",
        spoilerLevel: 6,
        isEntryPoint: false,
        isTerminal: true,
        metadataJson: JSON.stringify({ toolsUsed: ["curl"] }),
      },
    ]);

    await db.insert(attackEdges).values({
      attackGraphId: graph.id,
      sourceNodeKey: "node-1",
      targetNodeKey: "node-2",
      dependencyType: "hard",
      description: "Exploits web service discovered during reconnaissance",
    });

    // BEFORE COMPLETION: MUST BE NULL
    const lockedPath = await getRevealedReferencePath(fixture.session.id);
    expect(lockedPath).toBeNull();

    // AFTER COMPLETION: MUST BE REVEALED
    await completeTrainingSession(fixture.session.id);
    const unlockedPath = await getRevealedReferencePath(fixture.session.id);

    expect(unlockedPath).not.toBeNull();
    expect(unlockedPath?.available).toBe(true);
    expect(unlockedPath?.machineName).toBe("Testbox-23");
    expect(unlockedPath?.referencePathNodes).toHaveLength(2);
    expect(unlockedPath?.referencePathNodes[0].id).toBe("node-1");
    expect(unlockedPath?.referencePathNodes[0].isEntryPoint).toBe(true);
    expect(unlockedPath?.referencePathNodes[1].id).toBe("node-2");
    expect(unlockedPath?.referencePathNodes[1].isTerminal).toBe(true);
    expect(unlockedPath?.edges).toHaveLength(1);
  });
});
