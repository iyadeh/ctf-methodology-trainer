import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config } from "dotenv";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

const { db } = await import("../../src/lib/db");
const { attempts, findings, hypotheses, sessionChecks, trainingSessions } = await import(
  "../../src/lib/db/schema"
);
const { createTrainingSession, getTrainingSession, startTrainingSession } = await import(
  "../../src/modules/training/service"
);
const {
  confirmFinding,
  createAttempt,
  createFinding,
  createHypothesis,
  getAttempt,
  getFinding,
  getHypothesis,
  listSessionAttempts,
  listSessionFindings,
  listSessionHypotheses,
  updateAttempt,
  updateFinding,
  updateHypothesis,
} = await import("../../src/modules/training/evidence");

const createdIds: string[] = [];
const allCreatedIds: string[] = [];

async function createFixture() {
  const aggregate = await createTrainingSession({ name: `Stage 10 verification ${randomUUID()}` });
  createdIds.push(aggregate.session.id);
  allCreatedIds.push(aggregate.session.id);
  return aggregate;
}

function findingInput() {
  return {
    title: "Exposed HTTP service",
    category: "Attack Surface",
    evidence: "TCP/80 responds with HTTP",
    source: "Manual enumeration",
  };
}

function hypothesisInput() {
  return {
    hypothesis: "A backup route may expose configuration",
    reasoning: "A directory index exposed backup names",
    expectedResult: "Configuration content is readable",
    testApproach: "Inspect the accessible backup route",
  };
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

describe("learner evidence PostgreSQL integration", () => {
  it("creates, reads, updates, lists, and explicitly confirms Findings", async () => {
    const sessionId = (await createFixture()).session.id;
    const finding = await createFinding(sessionId, findingInput());
    expect(finding).toMatchObject({
      trainingSessionId: sessionId,
      evidenceState: "observed",
      importance: "medium",
    });
    expect(await getFinding(sessionId, finding.id)).toEqual(finding);
    expect((await listSessionFindings(sessionId)).map((record) => record.id)).toEqual([
      finding.id,
    ]);

    const updated = await updateFinding(sessionId, finding.id, {
      title: "Exposed HTTP and TLS service",
      evidenceState: "inferred",
      importance: "high",
      notes: "Version remains unconfirmed",
    });
    expect(updated).toMatchObject({
      title: "Exposed HTTP and TLS service",
      evidenceState: "inferred",
      importance: "high",
    });
    const confirmed = await confirmFinding(sessionId, finding.id);
    expect(confirmed.evidenceState).toBe("confirmed");
    expect((await confirmFinding(sessionId, finding.id)).updatedAt).toEqual(
      confirmed.updatedAt,
    );
    expect((await getFinding(sessionId, finding.id)).evidenceState).toBe("confirmed");
  });

  it("rejects invalid Finding input and cross-session access", async () => {
    const first = await createFixture();
    const second = await createFixture();
    const finding = await createFinding(first.session.id, findingInput());

    await expect(getFinding(second.session.id, finding.id)).rejects.toMatchObject({
      code: "finding_not_found",
    });
    await expect(
      updateFinding(second.session.id, finding.id, { title: "Wrong owner" }),
    ).rejects.toMatchObject({ code: "finding_not_found" });
    await expect(confirmFinding(second.session.id, finding.id)).rejects.toMatchObject({
      code: "finding_not_found",
    });
    await expect(createFinding(first.session.id, { ...findingInput(), title: " " }))
      .rejects.toMatchObject({ code: "invalid_input" });
    await expect(
      createFinding(first.session.id, {
        ...findingInput(),
        evidenceState: "trusted",
      } as unknown as Parameters<typeof createFinding>[1]),
    ).rejects.toMatchObject({ code: "invalid_input" });
    await expect(createFinding("invalid-uuid", findingInput())).rejects.toMatchObject({
      code: "invalid_input",
    });
    await expect(updateFinding(first.session.id, finding.id, {})).rejects.toMatchObject({
      code: "invalid_input",
    });
    expect(await listSessionFindings(second.session.id)).toEqual([]);
    expect((await getFinding(first.session.id, finding.id)).title).toBe(finding.title);
  });

  it("creates, updates, and reads Hypotheses linked to same-session Findings", async () => {
    const sessionId = (await createFixture()).session.id;
    const finding = await createFinding(sessionId, findingInput());
    const hypothesis = await createHypothesis(sessionId, {
      ...hypothesisInput(),
      basedOnFindingId: finding.id,
    });
    expect(hypothesis).toMatchObject({
      trainingSessionId: sessionId,
      basedOnFindingId: finding.id,
      outcome: "open",
    });
    expect(await getHypothesis(sessionId, hypothesis.id)).toEqual(hypothesis);

    const updated = await updateHypothesis(sessionId, hypothesis.id, {
      outcome: "inconclusive",
      reasoning: "Backup route requires authentication",
    });
    expect(updated.outcome).toBe("inconclusive");
    expect((await listSessionHypotheses(sessionId)).map((record) => record.id)).toEqual([
      hypothesis.id,
    ]);
    expect((await getHypothesis(sessionId, hypothesis.id)).reasoning).toBe(
      "Backup route requires authentication",
    );
  });

  it("rejects cross-session Finding links and Hypothesis mutations", async () => {
    const first = await createFixture();
    const second = await createFixture();
    const finding = await createFinding(first.session.id, findingInput());
    const hypothesis = await createHypothesis(first.session.id, hypothesisInput());

    await expect(
      createHypothesis(second.session.id, {
        ...hypothesisInput(),
        basedOnFindingId: finding.id,
      }),
    ).rejects.toMatchObject({ code: "finding_not_found" });
    await expect(
      updateHypothesis(second.session.id, hypothesis.id, { outcome: "rejected" }),
    ).rejects.toMatchObject({ code: "hypothesis_not_found" });
    await expect(
      updateHypothesis(second.session.id, hypothesis.id, {
        basedOnFindingId: finding.id,
      }),
    ).rejects.toMatchObject({ code: "hypothesis_not_found" });
    const secondHypothesis = await createHypothesis(second.session.id, hypothesisInput());
    await expect(
      updateHypothesis(second.session.id, secondHypothesis.id, {
        basedOnFindingId: finding.id,
      }),
    ).rejects.toMatchObject({ code: "finding_not_found" });
    expect((await getHypothesis(first.session.id, hypothesis.id)).outcome).toBe("open");
    expect((await getHypothesis(second.session.id, secondHypothesis.id)).basedOnFindingId)
      .toBeNull();
  });

  it("creates, updates, reads, and lists Attempts linked to same-session Hypotheses", async () => {
    const sessionId = (await createFixture()).session.id;
    const hypothesis = await createHypothesis(sessionId, hypothesisInput());
    const attempt = await createAttempt(sessionId, {
      hypothesisId: hypothesis.id,
      action: "Inspect backup route manually",
      outcome: "inconclusive",
      result: "Request timed out",
    });
    expect(attempt).toMatchObject({
      trainingSessionId: sessionId,
      hypothesisId: hypothesis.id,
      outcome: "inconclusive",
    });
    expect(await getAttempt(sessionId, attempt.id)).toEqual(attempt);
    const updated = await updateAttempt(sessionId, attempt.id, {
      outcome: "confirmed",
      result: "Configuration is readable",
      notes: "Repeated manually after connection recovered",
    });
    expect(updated.outcome).toBe("confirmed");
    expect((await listSessionAttempts(sessionId)).map((record) => record.id)).toEqual([
      attempt.id,
    ]);
    expect((await getAttempt(sessionId, attempt.id)).result).toBe(
      "Configuration is readable",
    );
  });

  it("rejects cross-session Hypothesis links and Attempt mutations", async () => {
    const first = await createFixture();
    const second = await createFixture();
    const hypothesis = await createHypothesis(first.session.id, hypothesisInput());
    const attempt = await createAttempt(first.session.id, {
      hypothesisId: hypothesis.id,
      action: "Inspect backup route",
      outcome: "inconclusive",
    });
    await expect(
      createAttempt(second.session.id, {
        hypothesisId: hypothesis.id,
        action: "Wrong session",
        outcome: "rejected",
      }),
    ).rejects.toMatchObject({ code: "hypothesis_not_found" });
    await expect(
      updateAttempt(second.session.id, attempt.id, { outcome: "confirmed" }),
    ).rejects.toMatchObject({ code: "attempt_not_found" });
    const secondAttempt = await createAttempt(second.session.id, {
      action: "Unlinked manual test",
      outcome: "rejected",
    });
    await expect(
      updateAttempt(second.session.id, secondAttempt.id, { hypothesisId: hypothesis.id }),
    ).rejects.toMatchObject({ code: "hypothesis_not_found" });
    await expect(
      createAttempt(second.session.id, {
        action: "Invalid outcome",
        outcome: "pending",
      } as unknown as Parameters<typeof createAttempt>[1]),
    ).rejects.toMatchObject({ code: "invalid_input" });
    expect((await getAttempt(first.session.id, attempt.id)).outcome).toBe("inconclusive");
    expect((await getAttempt(second.session.id, secondAttempt.id)).hypothesisId).toBeNull();
    expect(await listSessionAttempts(second.session.id)).toHaveLength(1);
  });

  it("exposes isolated learner records without changing checks after confirmation", async () => {
    const first = await startTrainingSession((await createFixture()).session.id);
    const second = await createFixture();
    const sessionId = first.session.id;
    const checksBefore = await db
      .select({ id: sessionChecks.id, status: sessionChecks.status })
      .from(sessionChecks)
      .where(eq(sessionChecks.trainingSessionId, sessionId));
    const finding = await createFinding(sessionId, findingInput());
    const hypothesis = await createHypothesis(sessionId, {
      ...hypothesisInput(),
      basedOnFindingId: finding.id,
    });
    const attempt = await createAttempt(sessionId, {
      hypothesisId: hypothesis.id,
      action: "Inspect route",
      outcome: "rejected",
    });
    await confirmFinding(sessionId, finding.id);

    const fresh = await getTrainingSession(sessionId);
    expect(fresh.findings.map((record) => record.id)).toEqual([finding.id]);
    expect(fresh.hypotheses.map((record) => record.id)).toEqual([hypothesis.id]);
    expect(fresh.attempts.map((record) => record.id)).toEqual([attempt.id]);
    expect(fresh.findings[0].evidenceState).toBe("confirmed");
    expect(fresh.progress).toEqual(first.progress);
    const checksAfter = await db
      .select({ id: sessionChecks.id, status: sessionChecks.status })
      .from(sessionChecks)
      .where(eq(sessionChecks.trainingSessionId, sessionId));
    expect(checksAfter).toEqual(checksBefore);
    const empty = await getTrainingSession(second.session.id);
    expect(empty.findings).toEqual([]);
    expect(empty.hypotheses).toEqual([]);
    expect(empty.attempts).toEqual([]);
    const [persistedFinding] = await db
      .select()
      .from(findings)
      .where(and(eq(findings.id, finding.id), eq(findings.trainingSessionId, sessionId)));
    const [persistedHypothesis] = await db
      .select()
      .from(hypotheses)
      .where(eq(hypotheses.id, hypothesis.id));
    const [persistedAttempt] = await db
      .select()
      .from(attempts)
      .where(eq(attempts.id, attempt.id));
    expect(persistedFinding.evidenceState).toBe("confirmed");
    expect(persistedHypothesis.trainingSessionId).toBe(sessionId);
    expect(persistedAttempt.trainingSessionId).toBe(sessionId);
  });
});
