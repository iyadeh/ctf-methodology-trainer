import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { config } from "dotenv";
import { and, asc, eq, inArray } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

const { db } = await import("../../src/lib/db");
const { sessionChecks, trainingSessions } = await import(
  "../../src/lib/db/schema"
);
const {
  advanceTrainingSessionPhase,
  completeSessionCheck,
  createTrainingSession,
  startTrainingSession,
} = await import("../../src/modules/training/service");
const {
  confirmFinding,
  createFinding,
  updateFinding,
} = await import("../../src/modules/training/evidence");

const createdIds: string[] = [];
const allCreatedIds: string[] = [];

async function createFixture() {
  const aggregate = await createTrainingSession({
    name: `Stage 13 verification ${randomUUID()}`,
  });
  createdIds.push(aggregate.session.id);
  allCreatedIds.push(aggregate.session.id);
  return aggregate.session.id;
}

afterEach(async () => {
  if (createdIds.length > 0) {
    await db.delete(trainingSessions).where(inArray(trainingSessions.id, createdIds));
    createdIds.length = 0;
  }
});

afterAll(async () => {
  if (allCreatedIds.length > 0) {
    await db.delete(trainingSessions).where(inArray(trainingSessions.id, allCreatedIds));
  }
});

describe("Dynamic Checklist PostgreSQL integration", () => {
  it("activates native HTTP playbook checks when HTTP is confirmed", async () => {
    const sessionId = await createFixture();
    await startTrainingSession(sessionId);

    // Initial check count should be 48 core checks
    const initialChecks = await db
      .select()
      .from(sessionChecks)
      .where(eq(sessionChecks.trainingSessionId, sessionId));
    expect(initialChecks).toHaveLength(48);
    expect(initialChecks.every((c) => c.provenance === "core")).toBe(true);

    // Confirm HTTP finding
    await createFinding(sessionId, {
      title: "Apache HTTP Server",
      category: "Attack Surface",
      evidence: "80/tcp open http Apache httpd 2.4.51",
      evidenceState: "confirmed",
      contextKind: "service",
      contextValue: "Apache",
      importance: "high",
    });

    const checksAfterHttp = await db
      .select()
      .from(sessionChecks)
      .where(eq(sessionChecks.trainingSessionId, sessionId))
      .orderBy(asc(sessionChecks.sortOrder));

    // 48 core + 8 HTTP playbook checks = 56 checks
    expect(checksAfterHttp).toHaveLength(56);

    const httpChecks = checksAfterHttp.filter((c) => c.provenance === "playbook");
    expect(httpChecks).toHaveLength(8);
    expect(httpChecks.every((c) => c.status === "active")).toBe(true);
    expect(httpChecks.every((c) => c.activatedAt !== null)).toBe(true);
    expect(httpChecks.every((c) => c.sourceVersion === 1)).toBe(true);
    expect(httpChecks.some((c) => c.semanticKey === "playbook.http.manual-inspection")).toBe(true);
    expect(httpChecks.some((c) => c.semanticKey === "playbook.http.content-discovery")).toBe(true);
  });

  it("activates Generic Service fallback checks for unknown services", async () => {
    const sessionId = await createFixture();
    await startTrainingSession(sessionId);

    // Confirm unknown service: MQTT
    await createFinding(sessionId, {
      title: "MQTT broker exposed",
      category: "Attack Surface",
      evidence: "1883/tcp open mosquitto",
      evidenceState: "confirmed",
      contextKind: "service",
      contextValue: "MQTT",
      importance: "medium",
    });

    const checks = await db
      .select()
      .from(sessionChecks)
      .where(eq(sessionChecks.trainingSessionId, sessionId));

    // 48 core + 9 generic checks = 57 checks
    expect(checks).toHaveLength(57);

    const genericChecks = checks.filter((c) => c.provenance === "generic");
    expect(genericChecks).toHaveLength(9);
    expect(genericChecks.every((c) => c.status === "active")).toBe(true);
    expect(genericChecks.every((c) => c.semanticKey.endsWith(".mqtt"))).toBe(true);
    expect(genericChecks.every((c) => c.title.includes("(MQTT)"))).toBe(true);
  });

  it("deduplicates checks when multiple findings confirm the same service", async () => {
    const sessionId = await createFixture();
    await startTrainingSession(sessionId);

    // Finding 1: Apache
    await createFinding(sessionId, {
      title: "Apache on port 80",
      category: "Attack Surface",
      evidence: "80/tcp open http",
      evidenceState: "confirmed",
      contextKind: "service",
      contextValue: "Apache",
      importance: "medium",
    });

    // Finding 2: Nginx on port 8080 (also resolves to service:http)
    await createFinding(sessionId, {
      title: "Nginx on port 8080",
      category: "Attack Surface",
      evidence: "8080/tcp open http nginx",
      evidenceState: "confirmed",
      contextKind: "service",
      contextValue: "nginx",
      importance: "medium",
    });

    const checks = await db
      .select()
      .from(sessionChecks)
      .where(eq(sessionChecks.trainingSessionId, sessionId));

    // Should NOT duplicate: still 48 core + 8 HTTP = 56
    expect(checks).toHaveLength(56);
    expect(checks.filter((c) => c.provenance === "playbook")).toHaveLength(8);
  });

  it("supersedes uncompleted dynamic checks when context is lost, and reactivates them when restored", async () => {
    const sessionId = await createFixture();
    await startTrainingSession(sessionId);

    const finding = await createFinding(sessionId, {
      title: "FTP server on port 21",
      category: "Attack Surface",
      evidence: "21/tcp open ftp vsftpd",
      evidenceState: "confirmed",
      contextKind: "service",
      contextValue: "FTP",
      importance: "medium",
    });

    // 48 core + 5 FTP playbook checks = 53
    let checks = await db
      .select()
      .from(sessionChecks)
      .where(eq(sessionChecks.trainingSessionId, sessionId));
    expect(checks).toHaveLength(53);
    expect(checks.filter((c) => c.provenance === "playbook" && c.status === "active")).toHaveLength(5);

    // Demote finding to observed (retracting FTP context)
    await updateFinding(sessionId, finding.id, { evidenceState: "observed" });

    checks = await db
      .select()
      .from(sessionChecks)
      .where(eq(sessionChecks.trainingSessionId, sessionId));
    // Checks are NOT deleted! They are superseded
    expect(checks).toHaveLength(53);
    const supersededFtp = checks.filter((c) => c.provenance === "playbook" && c.status === "superseded");
    expect(supersededFtp).toHaveLength(5);

    // Re-confirm finding
    await confirmFinding(sessionId, finding.id);

    checks = await db
      .select()
      .from(sessionChecks)
      .where(eq(sessionChecks.trainingSessionId, sessionId));
    // Reactivated, still no duplicates
    expect(checks).toHaveLength(53);
    const reactivatedFtp = checks.filter((c) => c.provenance === "playbook" && c.status === "active");
    expect(reactivatedFtp).toHaveLength(5);
  });

  it("preserves completed checks even when context is demoted", async () => {
    const sessionId = await createFixture();
    await startTrainingSession(sessionId);

    const finding = await createFinding(sessionId, {
      title: "FTP on port 21",
      category: "Attack Surface",
      evidence: "21/tcp open ftp",
      evidenceState: "confirmed",
      contextKind: "service",
      contextValue: "FTP",
      importance: "medium",
    });

    // Find the FTP anonymous login check
    const [anonymousCheck] = await db
      .select()
      .from(sessionChecks)
      .where(
        and(
          eq(sessionChecks.trainingSessionId, sessionId),
          eq(sessionChecks.semanticKey, "playbook.ftp.test-anonymous-login"),
        ),
      );
    expect(anonymousCheck).toBeDefined();

    // Learner completes the check
    await completeSessionCheck(sessionId, anonymousCheck.id);

    // Demote finding
    await updateFinding(sessionId, finding.id, { evidenceState: "observed" });

    // Completed check remains completed; the other 4 become superseded
    const [completedCheckAfter] = await db
      .select()
      .from(sessionChecks)
      .where(
        and(
          eq(sessionChecks.trainingSessionId, sessionId),
          eq(sessionChecks.semanticKey, "playbook.ftp.test-anonymous-login"),
        ),
      );
    expect(completedCheckAfter.status).toBe("completed");

    const supersededChecks = await db
      .select()
      .from(sessionChecks)
      .where(
        and(
          eq(sessionChecks.trainingSessionId, sessionId),
          eq(sessionChecks.provenance, "playbook"),
          eq(sessionChecks.status, "superseded"),
        ),
      );
    expect(supersededChecks).toHaveLength(4);
  });

  it("enforces newly activated Required playbook checks at the Phase Gate", async () => {
    const sessionId = await createFixture();
    await startTrainingSession(sessionId);

    // Complete all 8 core required checks in reconnaissance
    const coreChecks = await db
      .select()
      .from(sessionChecks)
      .where(
        and(
          eq(sessionChecks.trainingSessionId, sessionId),
          eq(sessionChecks.provenance, "core"),
          eq(sessionChecks.priority, "required"),
        ),
      );
    for (const check of coreChecks) {
      await completeSessionCheck(sessionId, check.id);
    }

    // Now confirm HTTP finding, which introduces 5 new Required checks in reconnaissance
    await createFinding(sessionId, {
      title: "Web service",
      category: "Attack Surface",
      evidence: "80/tcp open http",
      evidenceState: "confirmed",
      contextKind: "service",
      contextValue: "HTTP",
      importance: "high",
    });

    // Phase gate should now be BLOCKED by the HTTP required checks!
    const advanceAttempt = await advanceTrainingSessionPhase(sessionId);
    expect(advanceAttempt.status).toBe("blocked");
    if (advanceAttempt.status === "blocked") {
      expect(advanceAttempt.gate.missingRequiredChecks.length).toBeGreaterThan(0);
      expect(
        advanceAttempt.gate.missingRequiredChecks.some((c) =>
          c.semanticKey.startsWith("playbook.http."),
        ),
      ).toBe(true);
    }

    // Complete the missing HTTP required checks
    const httpRequired = await db
      .select()
      .from(sessionChecks)
      .where(
        and(
          eq(sessionChecks.trainingSessionId, sessionId),
          eq(sessionChecks.provenance, "playbook"),
          eq(sessionChecks.priority, "required"),
          eq(sessionChecks.status, "active"),
        ),
      );
    for (const check of httpRequired) {
      await completeSessionCheck(sessionId, check.id);
    }

    // Phase gate should now SUCCEED
    const successAdvance = await advanceTrainingSessionPhase(sessionId);
    expect(successAdvance.status).toBe("advanced");
    if (successAdvance.status === "advanced") {
      expect(successAdvance.activePhaseKey).toBe("threat-modeling");
      expect(successAdvance.overridden).toBe(false);
    }
  });
});
