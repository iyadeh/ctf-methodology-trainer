import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../lib/db";
import { notes, trainingSessions } from "../../lib/db/schema";
import { parseEvidenceId, parseEvidenceInput } from "./evidence-input";
import { lockTrainingSession, trainingTransaction } from "./repository";
import { TrainingSessionError } from "./types";
import type { NoteRecord } from "./types";

const textField = z.string().trim().min(1, "Must not be empty.");
const optionalTitle = z.string().trim().max(255).nullable().optional();

export const createNoteSchema = z.strictObject({
  title: optionalTitle,
  body: textField,
});

export const updateNoteSchema = z.strictObject({
  title: optionalTitle,
  body: textField.optional(),
});

export type CreateNoteInput = z.input<typeof createNoteSchema>;
export type UpdateNoteInput = z.input<typeof updateNoteSchema>;

export async function createNote(
  sessionId: string,
  input: CreateNoteInput,
): Promise<NoteRecord> {
  const parsedSessionId = parseEvidenceId(sessionId);
  const data = parseEvidenceInput(createNoteSchema, input);

  return trainingTransaction(async (transaction) => {
    await lockTrainingSession(transaction, parsedSessionId);
    const [note] = await transaction
      .insert(notes)
      .values({
        trainingSessionId: parsedSessionId,
        title: data.title ?? null,
        body: data.body,
      })
      .returning();
    return note;
  });
}

export async function updateNote(
  sessionId: string,
  noteId: string,
  input: UpdateNoteInput,
): Promise<NoteRecord> {
  const parsedSessionId = parseEvidenceId(sessionId);
  const parsedNoteId = parseEvidenceId(noteId);
  const changes = parseEvidenceInput(updateNoteSchema, input);

  if (changes.title === undefined && changes.body === undefined) {
    throw new TrainingSessionError(
      "invalid_input",
      "Update note must contain at least one field to change.",
    );
  }

  return trainingTransaction(async (transaction) => {
    await lockTrainingSession(transaction, parsedSessionId);
    const [note] = await transaction
      .update(notes)
      .set({
        ...changes,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notes.trainingSessionId, parsedSessionId),
          eq(notes.id, parsedNoteId),
        ),
      )
      .returning();

    if (!note) {
      throw new TrainingSessionError("note_not_found", "Note not found.");
    }
    return note;
  });
}

export async function deleteNote(
  sessionId: string,
  noteId: string,
): Promise<{ success: true }> {
  const parsedSessionId = parseEvidenceId(sessionId);
  const parsedNoteId = parseEvidenceId(noteId);

  return trainingTransaction(async (transaction) => {
    await lockTrainingSession(transaction, parsedSessionId);
    const result = await transaction
      .delete(notes)
      .where(
        and(
          eq(notes.trainingSessionId, parsedSessionId),
          eq(notes.id, parsedNoteId),
        ),
      )
      .returning();

    if (result.length === 0) {
      throw new TrainingSessionError("note_not_found", "Note not found.");
    }
    return { success: true };
  });
}

export async function listSessionNotes(sessionId: string): Promise<NoteRecord[]> {
  const parsedSessionId = parseEvidenceId(sessionId);
  const [session] = await db
    .select({ id: trainingSessions.id })
    .from(trainingSessions)
    .where(eq(trainingSessions.id, parsedSessionId));

  if (!session) {
    throw new TrainingSessionError("not_found", "Training Session not found.");
  }

  return db
    .select()
    .from(notes)
    .where(eq(notes.trainingSessionId, parsedSessionId))
    .orderBy(asc(notes.createdAt), asc(notes.id));
}

export async function getNote(
  sessionId: string,
  noteId: string,
): Promise<NoteRecord> {
  const parsedSessionId = parseEvidenceId(sessionId);
  const parsedNoteId = parseEvidenceId(noteId);

  const [note] = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.trainingSessionId, parsedSessionId),
        eq(notes.id, parsedNoteId),
      ),
    );

  if (!note) {
    throw new TrainingSessionError("note_not_found", "Note not found.");
  }
  return note;
}
