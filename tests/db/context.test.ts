import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config } from "dotenv";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

const { db } = await import("../../src/lib/db");
const { contextObservations, sessionContexts, trainingSessions } = await import("../../src/lib/db/schema");
const { createTrainingSession, getTrainingSession, startTrainingSession } = await import("../../src/modules/training/service");
const { createFinding, updateFinding, confirmFinding, getFinding } = await import("../../src/modules/training/evidence");
const { getSessionContext, reconcileFindingContext } = await import("../../src/modules/context/service");
const contextRepository = await import("../../src/modules/context/repository");
const createdIds: string[] = [];
const allCreatedIds: string[] = [];

async function createFixture() {
  const aggregate = await createTrainingSession({ name: `Stage 11 verification ${randomUUID()}` });
  createdIds.push(aggregate.session.id);
  allCreatedIds.push(aggregate.session.id);
  return aggregate.session.id;
}

const evidence = {
  title: "Recorded service identity",
  category: "Attack Surface",
  evidence: "Learner recorded the service identity from manual enumeration",
  contextKind: "service" as const,
  contextValue: "HTTP",
};

function observations(sessionId: string) {
  return db.select().from(contextObservations)
    .where(eq(contextObservations.trainingSessionId, sessionId));
}

afterEach(async () => {
  vi.restoreAllMocks();
  if (createdIds.length > 0) {
    await db.delete(trainingSessions).where(inArray(trainingSessions.id, createdIds));
    createdIds.length = 0;
  }
});

afterAll(async () => {
  if (allCreatedIds.length === 0) return;
  expect(await db.select().from(trainingSessions).where(inArray(trainingSessions.id, allCreatedIds))).toEqual([]);
  expect(await db.select().from(sessionContexts).where(inArray(sessionContexts.trainingSessionId, allCreatedIds))).toEqual([]);
  expect(await db.select().from(contextObservations).where(inArray(contextObservations.trainingSessionId, allCreatedIds))).toEqual([]);
});

describe("Context Engine PostgreSQL integration", () => {
  it("creates observations and canonical context only after explicit confirmation", async () => {
    const sessionId = await createFixture();
    const finding = await createFinding(sessionId, { ...evidence, contextValue: "HTTPS" });
    expect(await getSessionContext(sessionId)).toEqual([]);
    expect(await observations(sessionId)).toEqual([]);
    await updateFinding(sessionId, finding.id, { evidenceState: "inferred" });
    expect(await getSessionContext(sessionId)).toEqual([]);
    await confirmFinding(sessionId, finding.id);
    const context = await getSessionContext(sessionId);
    expect(context.map((entry) => entry.canonicalKey)).toEqual(["protocol:https", "service:http"]);
    expect(context.every((entry) => entry.observations.length === 1)).toBe(true);
    expect(context[0].observations[0]).toMatchObject({
      findingId: finding.id, sourceKind: "service", sourceValue: "HTTPS", retractedAt: null,
    });
    await confirmFinding(sessionId, finding.id);
    await reconcileFindingContext(sessionId, finding.id);
    expect(await observations(sessionId)).toHaveLength(2);
    expect(await getSessionContext(sessionId)).toEqual(context);
  });

  it("retains canonical context while another confirmed Finding still supports it", async () => {
    const sessionId = await createFixture();
    const first = await createFinding(sessionId, { ...evidence, evidenceState: "confirmed" });
    const second = await createFinding(sessionId, { ...evidence, contextValue: "nginx", evidenceState: "confirmed" });
    const [initial] = await getSessionContext(sessionId);
    expect(initial.observations).toHaveLength(2);
    expect(await db.select().from(sessionContexts).where(eq(sessionContexts.trainingSessionId, sessionId))).toHaveLength(1);

    await updateFinding(sessionId, first.id, { evidenceState: "observed" });
    const [remaining] = await getSessionContext(sessionId);
    expect(remaining.id).toBe(initial.id);
    expect(remaining.observations.map((entry) => entry.findingId)).toEqual([second.id]);
    await updateFinding(sessionId, second.id, { evidenceState: "inferred" });
    expect(await getSessionContext(sessionId)).toEqual([]);
    const [inactive] = await db.select().from(sessionContexts).where(eq(sessionContexts.id, initial.id));
    expect(inactive.state).toBe("inactive");
    expect((await observations(sessionId)).every((entry) => entry.retractedAt !== null)).toBe(true);

    await confirmFinding(sessionId, first.id);
    expect((await getSessionContext(sessionId))[0].id).toBe(initial.id);
    expect(await observations(sessionId)).toHaveLength(3);
  });

  it("reconciles confirmed edits and preserves obsolete observation snapshots", async () => {
    const sessionId = await createFixture();
    const finding = await createFinding(sessionId, { ...evidence, evidenceState: "confirmed" });
    await updateFinding(sessionId, finding.id, { contextValue: "OpenSSH" });
    expect((await getSessionContext(sessionId)).map((entry) => entry.canonicalKey)).toEqual(["service:ssh"]);
    const history = await observations(sessionId);
    expect(history.find((entry) => entry.canonicalKey === "service:http")).toMatchObject({ sourceValue: "HTTP", retractedAt: expect.any(Date) });
    await updateFinding(sessionId, finding.id, { contextKind: null, contextValue: null });
    expect(await getSessionContext(sessionId)).toEqual([]);
    expect(await getFinding(sessionId, finding.id)).toMatchObject({ evidenceState: "confirmed", contextKind: null, contextValue: null });
  });

  it("integrates confirmation through updateFinding and keeps alias history", async () => {
    const sessionId = await createFixture();
    const finding = await createFinding(sessionId, evidence);
    await updateFinding(sessionId, finding.id, { evidenceState: "confirmed" });
    const [initial] = await getSessionContext(sessionId);
    await updateFinding(sessionId, finding.id, { contextValue: "Apache HTTP Server" });
    const [updated] = await getSessionContext(sessionId);
    expect(updated.id).toBe(initial.id);
    expect(updated.observations).toHaveLength(1);
    expect(updated.observations[0].sourceValue).toBe("Apache HTTP Server");
    expect(await observations(sessionId)).toHaveLength(2);
  });

  it("preserves unknown evidence and rejects incomplete structured input", async () => {
    const sessionId = await createFixture();
    const finding = await createFinding(sessionId, { ...evidence, contextValue: "SomeCustomDaemon", evidenceState: "confirmed" });
    expect(await getSessionContext(sessionId)).toEqual([]);
    expect((await getFinding(sessionId, finding.id)).contextValue).toBe("SomeCustomDaemon");
    await expect(updateFinding(sessionId, finding.id, { contextKind: null })).rejects.toMatchObject({ code: "invalid_input" });
    await expect(createFinding(sessionId, { ...evidence, contextValue: undefined })).rejects.toMatchObject({ code: "invalid_input" });
    await createFinding(sessionId, {
      title: "HTTP on port 80", category: "Service", evidence: "OpenSSH port 22", evidenceState: "confirmed",
    });
    expect(await getSessionContext(sessionId)).toEqual([]);
  });

  it("isolates sessions and rejects cross-session application and database relationships", async () => {
    const first = await createFixture();
    const second = await createFixture();
    const finding = await createFinding(first, { ...evidence, evidenceState: "confirmed" });
    expect(await getSessionContext(second)).toEqual([]);
    await expect(reconcileFindingContext(second, finding.id)).rejects.toMatchObject({ code: "finding_not_found" });
    await expect(confirmFinding(second, finding.id)).rejects.toMatchObject({ code: "finding_not_found" });
    await expect(updateFinding(second, finding.id, { contextValue: "SSH" })).rejects.toMatchObject({ code: "finding_not_found" });
    await db.insert(sessionContexts).values({ trainingSessionId: second, canonicalKey: "service:http", state: "inactive" });
    await expect(db.insert(contextObservations).values({
      trainingSessionId: second, findingId: finding.id, canonicalKey: "service:http", sourceKind: "service", sourceValue: "HTTP",
    })).rejects.toMatchObject({ cause: { code: "23503" } });
    expect((await getTrainingSession(second)).context).toEqual([]);
  });

  it("enforces unique canonical tags and unique active support in PostgreSQL", async () => {
    const sessionId = await createFixture();
    const finding = await createFinding(sessionId, { ...evidence, evidenceState: "confirmed" });
    await expect(db.insert(sessionContexts).values({ trainingSessionId: sessionId, canonicalKey: "service:http" }))
      .rejects.toMatchObject({ cause: { code: "23505" } });
    await expect(db.insert(contextObservations).values({
      trainingSessionId: sessionId, findingId: finding.id, canonicalKey: "service:http", sourceKind: "service", sourceValue: "HTTP",
    })).rejects.toMatchObject({ cause: { code: "23505" } });
  });

  it("rolls back Finding confirmation if context reconciliation fails", async () => {
    const sessionId = await createFixture();
    const finding = await createFinding(sessionId, evidence);
    vi.spyOn(contextRepository, "reconcileContextObservations").mockRejectedValueOnce(new Error("Context write failed"));
    await expect(confirmFinding(sessionId, finding.id)).rejects.toThrow("Context write failed");
    expect((await getFinding(sessionId, finding.id)).evidenceState).toBe("observed");
    expect(await observations(sessionId)).toEqual([]);
  });

  it("exposes context in aggregate reads without changing methodology", async () => {
    const sessionId = await createFixture();
    const before = await startTrainingSession(sessionId);
    const finding = await createFinding(sessionId, evidence);
    await confirmFinding(sessionId, finding.id);
    const after = await getTrainingSession(sessionId);
    expect(after.context.map((entry) => entry.canonicalKey)).toEqual(["service:http"]);
    expect(after.phases).toEqual(before.phases);
    expect(after.progress).toEqual(before.progress);
    expect(after.currentPhase).toEqual(before.currentPhase);
    expect(await db.select().from(contextObservations).where(and(
      eq(contextObservations.trainingSessionId, sessionId), isNull(contextObservations.retractedAt),
    ))).toHaveLength(1);
  });
});
