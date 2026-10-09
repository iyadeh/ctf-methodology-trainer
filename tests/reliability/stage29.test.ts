import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

const { db } = await import("../../src/lib/db");
const {
  trainingSessions,
  sessionPhases,
  sessionChecks,
  findings,
  notes,
  machineProfiles,
} = await import("../../src/lib/db/schema");

const {
  createTrainingSession,
  startTrainingSession,
  completeSessionCheck,
  getTrainingSession,
  listTrainingSessions,
  deleteTrainingSession,
  resetTrainingSession,
  renameTrainingSession,
} = await import("../../src/modules/training/service");
const { createFinding } = await import("../../src/modules/training/evidence");
const { createNote } = await import("../../src/modules/training/notes");
const { TrainingSessionError } = await import("../../src/modules/training/types");

const createdSessionIds: string[] = [];
const allCreatedIds: string[] = [];

async function createFixture(namePrefix = "Stage 29 Test") {
  const aggregate = await createTrainingSession({
    name: `${namePrefix} ${randomUUID().slice(0, 8)}`,
  });
  createdSessionIds.push(aggregate.session.id);
  allCreatedIds.push(aggregate.session.id);
  return aggregate;
}

afterEach(async () => {
  if (createdSessionIds.length > 0) {
    for (const id of createdSessionIds) {
      try {
        await deleteTrainingSession(id);
      } catch {
        // Session might have been deleted as part of test
      }
    }
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

describe("Stage 29 — Session Lifecycle Management & Workspace Actions", () => {
  describe("Pillar 1: Session Renaming", () => {
    it("successfully renames a training session and updates record in database", async () => {
      const fixture = await createFixture("Original Name");
      const newName = `Renamed Machine ${randomUUID().slice(0, 6)}`;

      const renamed = await renameTrainingSession(fixture.session.id, newName);

      expect(renamed.session.name).toBe(newName);

      // Verify persistence via reload
      const loaded = await getTrainingSession(fixture.session.id);
      expect(loaded.session.name).toBe(newName);
    });

    it("rejects empty or whitespace-only name with invalid_input error", async () => {
      const fixture = await createFixture("Valid Name");

      await expect(renameTrainingSession(fixture.session.id, "")).rejects.toThrowError(
        TrainingSessionError,
      );
      await expect(renameTrainingSession(fixture.session.id, "   \t\n  ")).rejects.toThrowError(
        TrainingSessionError,
      );
    });

    it("throws not_found when renaming a non-existent session", async () => {
      const nonExistentId = randomUUID();
      await expect(renameTrainingSession(nonExistentId, "New Name")).rejects.toThrowError(
        TrainingSessionError,
      );
    });
  });

  describe("Pillar 2: Session Reset Lifecycle", () => {
    it("resets session progress, wipes findings/notes, and returns phase to reconnaissance", async () => {
      const fixture = await createFixture("Reset Target");
      const sessionId = fixture.session.id;

      // Start session
      await startTrainingSession(sessionId);

      // Add a finding
      await createFinding(sessionId, {
        title: "Test Port 80 Open",
        category: "service",
        evidence: "80/tcp open http Apache 2.4.41",
        importance: "medium",
      });

      // Add a note
      await createNote(sessionId, {
        body: "Investigating port 80 directories",
      });

      // Complete a check
      const firstCheck = fixture.phases.flatMap((p) => p.checks)[0];
      if (firstCheck) {
        await completeSessionCheck(sessionId, firstCheck.id);
      }

      // Verify that finding and note exist
      const beforeReset = await getTrainingSession(sessionId);
      expect(beforeReset.session.status).toBe("in_progress");
      expect(beforeReset.findings.length).toBeGreaterThan(0);
      expect(beforeReset.notes.length).toBeGreaterThan(0);

      // Execute reset
      const resetResult = await resetTrainingSession(sessionId);

      expect(resetResult.session.status).toBe("not_started");
      expect(resetResult.session.completedAt).toBeNull();
      expect(resetResult.findings).toHaveLength(0);
      expect(resetResult.notes).toHaveLength(0);

      // Verify all phases are returned to locked
      for (const phase of resetResult.phases) {
        expect(phase.status).toBe("locked");
      }

      // Verify all checklist items are reset to inactive
      for (const check of resetResult.phases.flatMap((p) => p.checks)) {
        expect(check.status).toBe("inactive");
      }

      // Verify the session can be started afresh
      const restarted = await startTrainingSession(sessionId);
      expect(restarted.session.status).toBe("in_progress");
      expect(restarted.currentPhase?.sortOrder).toBe(0);
      expect(restarted.currentPhase?.status).toBe("active");
    });

    it("throws not_found when resetting non-existent session", async () => {
      const nonExistentId = randomUUID();
      await expect(resetTrainingSession(nonExistentId)).rejects.toThrowError(
        TrainingSessionError,
      );
    });
  });

  describe("Pillar 3: Session Deletion & Cascade Cleanliness", () => {
    it("permanently deletes session and all associated database records without leaving orphans", async () => {
      const fixture = await createFixture("Delete Candidate");
      const sessionId = fixture.session.id;

      await startTrainingSession(sessionId);

      // Add finding, note, and mock machineProfile
      await createFinding(sessionId, {
        title: "Temporary finding",
        category: "service",
        evidence: "Temporary evidence payload",
        importance: "low",
      });

      await createNote(sessionId, {
        body: "Temporary note",
      });

      await db.insert(machineProfiles).values({
        trainingSessionId: sessionId,
        name: "Delete Candidate",
        os: "linux",
        difficulty: "easy",
        targetIp: "10.10.10.100",
        summary: "Delete test machine",
      });

      // Delete session
      await deleteTrainingSession(sessionId);

      // Assert session record is gone
      const sessionRow = await db
        .select()
        .from(trainingSessions)
        .where(eq(trainingSessions.id, sessionId));
      expect(sessionRow).toHaveLength(0);

      // Assert cascade: phases, checks, findings, notes, profiles are wiped
      const phaseRows = await db
        .select()
        .from(sessionPhases)
        .where(eq(sessionPhases.trainingSessionId, sessionId));
      expect(phaseRows).toHaveLength(0);

      const checkRows = await db
        .select()
        .from(sessionChecks)
        .where(eq(sessionChecks.trainingSessionId, sessionId));
      expect(checkRows).toHaveLength(0);

      const findingRows = await db
        .select()
        .from(findings)
        .where(eq(findings.trainingSessionId, sessionId));
      expect(findingRows).toHaveLength(0);

      const noteRows = await db
        .select()
        .from(notes)
        .where(eq(notes.trainingSessionId, sessionId));
      expect(noteRows).toHaveLength(0);

      const profileRows = await db
        .select()
        .from(machineProfiles)
        .where(eq(machineProfiles.trainingSessionId, sessionId));
      expect(profileRows).toHaveLength(0);

      // Verify getTrainingSession throws not_found
      await expect(getTrainingSession(sessionId)).rejects.toThrowError(
        TrainingSessionError,
      );
    });

    it("throws not_found when deleting non-existent session", async () => {
      const nonExistentId = randomUUID();
      await expect(deleteTrainingSession(nonExistentId)).rejects.toThrowError(
        TrainingSessionError,
      );
    });
  });

  describe("Pillar 4: Dynamic Session Listing & Metadata Formatting", () => {
    it("dynamically attaches machineProfile OS, difficulty, and targetIp to session list items", async () => {
      const fixture = await createFixture("Profiled Machine");
      const sessionId = fixture.session.id;

      // Attach profile
      await db.insert(machineProfiles).values({
        trainingSessionId: sessionId,
        name: "Profiled Machine",
        os: "windows",
        difficulty: "hard",
        targetIp: "192.168.100.50",
        summary: "Active Directory domain controller challenge",
      });

      const listResult = await listTrainingSessions();
      const item = listResult.sessions.find((s) => s.id === sessionId);

      expect(item).toBeDefined();
      expect(item?.operatingSystem).toBe("Windows");
      expect(item?.difficulty).toBe("Hard");
      expect(item?.description).toBe("Active Directory domain controller challenge");
      expect(item?.action).toBe("View Details");

      // Verify action dynamically transitions to Continue once started
      await startTrainingSession(sessionId);
      const updatedList = await listTrainingSessions();
      const updatedItem = updatedList.sessions.find((s) => s.id === sessionId);
      expect(updatedItem?.action).toBe("Continue");
      expect(updatedItem?.status).toBe("In Progress");
    });
  });
});
