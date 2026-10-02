import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { config } from "dotenv";
import { inArray } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

const { db } = await import("../../src/lib/db");
const { trainingSessions } = await import("../../src/lib/db/schema");
const { createTrainingSession } = await import("../../src/modules/training/service");
const {
  createNote,
  deleteNote,
  getNote,
  listSessionNotes,
  updateNote,
} = await import("../../src/modules/training/notes");

const createdIds: string[] = [];
const allCreatedIds: string[] = [];

async function createFixture() {
  const aggregate = await createTrainingSession({
    name: `Stage 14 notes verification ${randomUUID()}`,
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

describe("Session Notes PostgreSQL integration", () => {
  it("creates, reads, updates, lists, and deletes scratchpad notes", async () => {
    const sessionId = await createFixture();

    // 1. Initial list is empty
    expect(await listSessionNotes(sessionId)).toEqual([]);

    // 2. Create note
    const created = await createNote(sessionId, {
      title: "Initial enumeration thoughts",
      body: "Port 80 and 22 are open. Need to fuzz web endpoints.",
    });
    expect(created.id).toBeDefined();
    expect(created.trainingSessionId).toBe(sessionId);
    expect(created.title).toBe("Initial enumeration thoughts");
    expect(created.body).toBe("Port 80 and 22 are open. Need to fuzz web endpoints.");

    // 3. Get note
    const retrieved = await getNote(sessionId, created.id);
    expect(retrieved.id).toBe(created.id);
    expect(retrieved.title).toBe(created.title);

    // 4. Update note
    const updated = await updateNote(sessionId, created.id, {
      title: "Updated thoughts",
      body: "Found /admin login portal.",
    });
    expect(updated.title).toBe("Updated thoughts");
    expect(updated.body).toBe("Found /admin login portal.");

    // 5. List notes
    const list = await listSessionNotes(sessionId);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);

    // 6. Delete note
    const delResult = await deleteNote(sessionId, created.id);
    expect(delResult.success).toBe(true);

    // 7. Verify deletion
    expect(await listSessionNotes(sessionId)).toEqual([]);
    await expect(getNote(sessionId, created.id)).rejects.toMatchObject({
      code: "note_not_found",
    });
  });

  it("isolates notes across sessions", async () => {
    const first = await createFixture();
    const second = await createFixture();

    const noteInFirst = await createNote(first, {
      title: "Private note",
      body: "Secret in session 1",
    });

    // Second session cannot read or mutate note in first session
    await expect(getNote(second, noteInFirst.id)).rejects.toMatchObject({
      code: "note_not_found",
    });
    await expect(
      updateNote(second, noteInFirst.id, { title: "Hacked" }),
    ).rejects.toMatchObject({
      code: "note_not_found",
    });
    await expect(deleteNote(second, noteInFirst.id)).rejects.toMatchObject({
      code: "note_not_found",
    });
  });

  it("rejects empty body input", async () => {
    const sessionId = await createFixture();

    await expect(
      createNote(sessionId, {
        title: "Test",
        body: "   ",
      }),
    ).rejects.toMatchObject({
      code: "invalid_input",
    });
  });
});
