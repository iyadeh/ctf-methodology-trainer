import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { config } from "dotenv";
import { and, eq, inArray } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

const { db } = await import("../../src/lib/db");
const { methodologyDeviations, sessionChecks, trainingSessions } = await import(
  "../../src/lib/db/schema"
);
const {
  advanceTrainingSessionPhase,
  completeSessionCheck,
  createTrainingSession,
  getTrainingSession,
  getTrainingSessionProgress,
  pauseTrainingSession,
  resumeTrainingSession,
  setTrainingSessionTargetIp,
  skipSessionCheck,
  startTrainingSession,
} = await import("../../src/modules/training/service");

const createdIds: string[] = [];
const allCreatedIds: string[] = [];

async function createFixture() {
  const aggregate = await createTrainingSession({
    name: `Stage 09 verification ${randomUUID()}`,
  });
  createdIds.push(aggregate.session.id);
  allCreatedIds.push(aggregate.session.id);
  return aggregate;
}

afterEach(async () => {
  if (createdIds.length > 0) {
    await db.delete(trainingSessions).where(inArray(trainingSessions.id, createdIds));
    createdIds.length = 0;
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

describe("Training Session PostgreSQL integration", () => {
  it("snapshots all six phases and 48 core checks while initially locked", async () => {
    const aggregate = await createFixture();

    expect(aggregate.session.status).toBe("not_started");
    expect(aggregate.session.startedAt).toBeNull();
    expect(aggregate.currentPhase).toBeNull();
    expect(aggregate.phases.map((phase) => phase.semanticKey)).toEqual([
      "reconnaissance",
      "threat-modeling",
      "vulnerability-analysis",
      "exploitation",
      "post-exploitation",
      "reporting",
    ]);
    expect(aggregate.phases.map((phase) => phase.checks.length)).toEqual([
      10, 7, 6, 6, 10, 9,
    ]);
    expect(aggregate.phases.every((phase) => phase.status === "locked")).toBe(true);
    expect(
      aggregate.phases.flatMap((phase) => phase.checks).every(
        (check) =>
          check.status === "inactive" &&
          check.provenance === "core" &&
          check.sourceVersion === 1 &&
          check.frameworkCheckId !== null,
      ),
    ).toBe(true);
    expect(aggregate.phases[0].checks.map((check) => check.sortOrder)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it("starts once, then pauses and resumes without changing phase or progress", async () => {
    const initial = await createFixture();
    await expect(pauseTrainingSession(initial.session.id)).rejects.toMatchObject({
      code: "invalid_transition",
    });

    const started = await startTrainingSession(initial.session.id);
    expect(started.session.status).toBe("in_progress");
    expect(started.session.startedAt).toBeInstanceOf(Date);
    expect(started.currentPhase?.semanticKey).toBe("reconnaissance");
    expect(started.currentPhase?.checks.every((check) => check.status === "active")).toBe(true);
    expect(started.phases.slice(1).every((phase) => phase.status === "locked")).toBe(true);
    expect(
      started.phases.slice(1).flatMap((phase) => phase.checks).every(
        (check) => check.status === "inactive",
      ),
    ).toBe(true);

    const startedAgain = await startTrainingSession(initial.session.id);
    expect(startedAgain.session.startedAt).toEqual(started.session.startedAt);
    const paused = await pauseTrainingSession(initial.session.id);
    expect(paused.session.status).toBe("paused");
    expect(paused.currentPhase?.id).toBe(started.currentPhase?.id);
    expect(paused.progress).toEqual(started.progress);
    expect(paused.session.startedAt).toEqual(started.session.startedAt);
    await expect(pauseTrainingSession(initial.session.id)).rejects.toMatchObject({
      code: "invalid_transition",
    });
    await expect(startTrainingSession(initial.session.id)).rejects.toMatchObject({
      code: "invalid_transition",
    });
    const resumed = await resumeTrainingSession(initial.session.id);
    expect(resumed.session.status).toBe("in_progress");
    expect(resumed.currentPhase?.id).toBe(started.currentPhase?.id);
    await expect(resumeTrainingSession(initial.session.id)).rejects.toMatchObject({
      code: "invalid_transition",
    });
  });

  it("stores IPv4 and IPv6 target addresses and rejects invalid input", async () => {
    const aggregate = await createFixture();
    const ipv4 = await setTrainingSessionTargetIp(aggregate.session.id, "192.168.56.105");
    expect(ipv4.session.targetIp).toBe("192.168.56.105");
    const ipv6 = await setTrainingSessionTargetIp(aggregate.session.id, "2001:db8::1");
    expect(ipv6.session.targetIp).toBe("2001:db8::1");
    await expect(
      setTrainingSessionTargetIp(aggregate.session.id, "not-an-ip"),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect((await getTrainingSession(aggregate.session.id)).session.targetIp).toBe(
      "2001:db8::1",
    );
  });

  it("completes or skips only active checks owned by the session", async () => {
    const first = await startTrainingSession((await createFixture()).session.id);
    const second = await startTrainingSession((await createFixture()).session.id);
    const firstCheck = first.currentPhase!.checks[0];
    const skippedCheck = first.currentPhase!.checks[1];
    const supersededCheck = first.currentPhase!.checks[2];
    const futureCheck = first.phases[1].checks[0];

    await expect(
      completeSessionCheck(first.session.id, second.currentPhase!.checks[0].id),
    ).rejects.toMatchObject({ code: "check_not_found" });
    await expect(
      completeSessionCheck(first.session.id, futureCheck.id),
    ).rejects.toMatchObject({ code: "invalid_transition" });
    await db
      .update(sessionChecks)
      .set({ status: "superseded" })
      .where(eq(sessionChecks.id, supersededCheck.id));
    await expect(
      skipSessionCheck(first.session.id, supersededCheck.id),
    ).rejects.toMatchObject({ code: "invalid_transition" });

    const completed = await completeSessionCheck(first.session.id, firstCheck.id);
    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeInstanceOf(Date);
    expect(
      (await completeSessionCheck(first.session.id, firstCheck.id)).completedAt,
    ).toEqual(completed.completedAt);

    const skipped = await skipSessionCheck(first.session.id, skippedCheck.id);
    expect(skipped.status).toBe("skipped");
    expect(skipped.skippedAt).toBeInstanceOf(Date);
    await expect(
      completeSessionCheck(first.session.id, skippedCheck.id),
    ).rejects.toMatchObject({ code: "invalid_transition" });
    const progress = await getTrainingSessionProgress(first.session.id);
    expect(progress.required).toEqual({ completed: 1, total: 7, percentage: 14 });
    expect(progress.coverage).toEqual({ completed: 1, total: 9, percentage: 11 });
    expect(progress.completedChecks).toBe(1);
    expect(progress.remainingChecks).toBe(8);
    expect((await advanceTrainingSessionPhase(first.session.id)).status).toBe("blocked");
  });

  it("blocks incomplete Required checks, then advances without a deviation", async () => {
    const started = await startTrainingSession((await createFixture()).session.id);
    const sessionId = started.session.id;
    const blocked = await advanceTrainingSessionPhase(sessionId);
    expect(blocked.status).toBe("blocked");
    if (blocked.status === "blocked") {
      expect(blocked.gate.missingRequiredChecks).toHaveLength(8);
    }
    expect((await getTrainingSession(sessionId)).currentPhase?.semanticKey).toBe(
      "reconnaissance",
    );

    const required = started.currentPhase!.checks.filter(
      (check) => check.priority === "required",
    );
    for (const check of required) {
      await completeSessionCheck(sessionId, check.id);
    }

    const recommended = started.currentPhase!.checks[8];
    await db
      .update(sessionChecks)
      .set({ priority: "suggested" })
      .where(eq(sessionChecks.id, recommended.id));

    expect(await advanceTrainingSessionPhase(sessionId, { override: true })).toMatchObject({
      status: "advanced",
      completedPhaseKey: "reconnaissance",
      activePhaseKey: "threat-modeling",
      overridden: false,
    });
    const advanced = await getTrainingSession(sessionId);
    expect(advanced.phases[0].status).toBe("completed");
    expect(advanced.phases[1].status).toBe("active");
    expect(advanced.phases[1].checks.every((check) => check.status === "active")).toBe(true);
    expect(advanced.phases.slice(2).every((phase) => phase.status === "locked")).toBe(true);
    expect(advanced.phases.slice(2).flatMap((phase) => phase.checks).every(
      (check) => check.status === "inactive",
    )).toBe(true);
    const deviations = await db
      .select()
      .from(methodologyDeviations)
      .where(eq(methodologyDeviations.trainingSessionId, sessionId));
    expect(deviations).toHaveLength(0);
  });

  it("records an explicit blocked-gate override and advances", async () => {
    const started = await startTrainingSession((await createFixture()).session.id);
    const sessionId = started.session.id;
    expect(await advanceTrainingSessionPhase(sessionId, { override: true, reason: "Lab time limit" })).toMatchObject({
      status: "advanced",
      activePhaseKey: "threat-modeling",
      overridden: true,
    });
    const deviations = await db
      .select()
      .from(methodologyDeviations)
      .where(eq(methodologyDeviations.trainingSessionId, sessionId));
    expect(deviations).toHaveLength(1);
    expect(deviations[0]).toMatchObject({
      sessionPhaseId: started.currentPhase!.id,
      type: "phase_gate_override",
      reason: "Lab time limit",
    });
  });

  it("leaves Reporting active and session incomplete at the final phase", async () => {
    const started = await startTrainingSession((await createFixture()).session.id);
    const sessionId = started.session.id;
    for (let index = 0; index < 5; index += 1) {
      expect((await advanceTrainingSessionPhase(sessionId, { override: true })).status).toBe(
        "advanced",
      );
    }
    expect(await advanceTrainingSessionPhase(sessionId)).toEqual({
      status: "final_phase_reached",
      finalPhaseReached: true,
    });
    const final = await getTrainingSession(sessionId);
    expect(final.session.status).toBe("in_progress");
    expect(final.session.completedAt).toBeNull();
    expect(final.currentPhase?.semanticKey).toBe("reporting");
    const deviations = await db
      .select()
      .from(methodologyDeviations)
      .where(
        and(
          eq(methodologyDeviations.trainingSessionId, sessionId),
          eq(methodologyDeviations.type, "phase_gate_override"),
        ),
      );
    expect(deviations).toHaveLength(5);
  });
});
