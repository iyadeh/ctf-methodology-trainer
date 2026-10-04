import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { config } from "dotenv";
import { inArray } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

const { db } = await import("../../src/lib/db");
const { trainingSessions } = await import("../../src/lib/db/schema");
const {
  createTrainingSession,
  startTrainingSession,
} = await import("../../src/modules/training/service");
const {
  completeTrainingSession,
} = await import("../../src/modules/training/completion");
const {
  createFinding,
  createHypothesis,
  createAttempt,
} = await import("../../src/modules/training/evidence");
const { getSessionReview } = await import("../../src/modules/review/service");

const createdSessionIds: string[] = [];
const allCreatedIds: string[] = [];

async function createFixture() {
  const aggregate = await createTrainingSession({
    name: `Stage 24 review test ${randomUUID()}`,
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

describe("Stage 24 — Session Review Database Integration", () => {
  it("computes comprehensive review for a completed training session", async () => {
    const fixture = await createFixture();
    const sessionId = fixture.session.id;

    // Start session
    await startTrainingSession(sessionId);

    // Create and confirm finding
    const finding = await createFinding(sessionId, {
      title: "Apache HTTP Port 80",
      category: "Attack Surface",
      evidence: "80/tcp open http",
      evidenceState: "confirmed",
      importance: "high",
      contextKind: "service",
      contextValue: "http",
    });

    // Create hypothesis
    const hypothesis = await createHypothesis(sessionId, {
      basedOnFindingId: finding.id,
      hypothesis: "Web application vulnerable to parameter injection",
      reasoning: "GET parameters reflected without sanitization",
      expectedResult: "Database banner leakage",
      testApproach: "Send boolean probe in query string",
    });

    // Create attempt
    await createAttempt(sessionId, {
      hypothesisId: hypothesis.id,
      action: "Injected boolean sleep payload into id parameter",
      notes: "Response delayed by 5 seconds",
      result: "Confirmed time-based SQLi",
      outcome: "confirmed",
    });

    // Complete session with objective proof
    await completeTrainingSession(sessionId, {
      objectiveType: "root_flag",
      objectiveEvidence: "BEECTF{m3th0d0l0gy_m4st3r_2026}",
      notes: "Methodical test completed successfully.",
    });

    // Retrieve Session Review
    const review = await getSessionReview(sessionId);

    expect(review.session.status).toBe("completed");
    expect(review.metrics.totalFindingsRecorded).toBeGreaterThanOrEqual(2); // Initial finding + objective finding
    expect(review.metrics.totalHypothesesFormed).toBe(1);
    expect(review.metrics.totalAttemptsExecuted).toBe(1);
    expect(review.metrics.hypothesisDiscipline).toBe(100);
    expect(review.metrics.phaseGateCompliance).toBe(100);
    expect(review.metrics.phaseOverrides).toBe(0);

    // User path contains start, finding, hypothesis, attempt, objective
    expect(review.userPath.length).toBeGreaterThanOrEqual(4);
    expect(review.userPath.some((s) => s.kind === "objective_capture")).toBe(true);

    // Narrative review
    expect(review.narrative.executiveSummary.length).toBeGreaterThan(0);
    expect(review.narrative.strengths.length).toBeGreaterThan(0);
    expect(review.narrative.recommendation.length).toBeGreaterThan(0);

    // Improvement areas
    expect(review.improvementAreas.length).toBeGreaterThan(0);
  });
});
