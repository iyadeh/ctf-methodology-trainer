import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessionMilestones, trainingSessions } from "@/lib/db/schema";
import type {
  SessionMilestoneRecord,
  TrainingSessionMode,
} from "./types";
import {
  generateGenericMethodologyMilestones,
  type SessionMilestoneDraft,
} from "./milestone-generator";
import { verifyMilestoneAnswer } from "./milestone-verifier";
import * as repository from "./repository";

export interface SubmitMilestoneAnswerResult {
  readonly ok: boolean;
  readonly milestone?: SessionMilestoneRecord;
  readonly error?: string;
  readonly nextUnlockedMilestoneId?: string;
}

export interface SubmitDirectFlagResult {
  readonly ok: boolean;
  readonly message?: string;
  readonly error?: string;
}

/**
 * Inserts a list of milestone drafts for a given session.
 */
export async function initializeSessionMilestones(
  sessionId: string,
  drafts: SessionMilestoneDraft[],
  tx?: repository.TrainingTransaction,
): Promise<SessionMilestoneRecord[]> {
  const client = tx || db;

  const rows: (typeof sessionMilestones.$inferInsert)[] = drafts.map((draft) => ({
    trainingSessionId: sessionId,
    sortOrder: draft.sortOrder,
    title: draft.title,
    question: draft.question,
    taskType: draft.taskType,
    phase: draft.phase,
    answerHash: draft.answerHash,
    expectedAnswer: draft.expectedAnswer,
    formatHint: draft.formatHint,
    hint: draft.hint,
    status: draft.status,
  }));

  return client.insert(sessionMilestones).values(rows).returning();
}

/**
 * Loads all milestones for a session ordered by sortOrder.
 * If none exist, initializes default methodology milestones.
 */
export async function getOrInitializeSessionMilestones(
  sessionId: string,
  machineName = "the target",
): Promise<SessionMilestoneRecord[]> {
  const existing = await db
    .select()
    .from(sessionMilestones)
    .where(eq(sessionMilestones.trainingSessionId, sessionId))
    .orderBy(asc(sessionMilestones.sortOrder));

  if (existing.length > 0) {
    return existing;
  }

  // Generate generic methodology fallback milestones
  const drafts = generateGenericMethodologyMilestones(machineName);
  return initializeSessionMilestones(sessionId, drafts);
}

/**
 * Verifies and submits an answer for a specific guided milestone task.
 */
export async function submitMilestoneAnswer(
  sessionId: string,
  milestoneId: string,
  answer: string,
): Promise<SubmitMilestoneAnswerResult> {
  return repository.trainingTransaction(async (tx) => {
    const [milestone] = await tx
      .select()
      .from(sessionMilestones)
      .where(
        and(
          eq(sessionMilestones.id, milestoneId),
          eq(sessionMilestones.trainingSessionId, sessionId),
        ),
      );

    if (!milestone) {
      return { ok: false, error: "Milestone task not found." };
    }

    if (milestone.status === "completed") {
      return { ok: true, milestone };
    }

    const verifyResult = verifyMilestoneAnswer({
      userAnswer: answer,
      expectedAnswer: milestone.expectedAnswer,
      answerHash: milestone.answerHash,
      formatHint: milestone.formatHint,
      taskType: milestone.taskType,
    });

    if (!verifyResult.isCorrect) {
      return {
        ok: false,
        error: verifyResult.feedback || "Incorrect answer. Check your evidence or format and try again.",
      };
    }

    const now = new Date();

    // 1. Mark current milestone as completed
    const [completedMilestone] = await tx
      .update(sessionMilestones)
      .set({
        status: "completed",
        userAnswer: verifyResult.normalizedUserAnswer || answer.trim(),
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(sessionMilestones.id, milestoneId))
      .returning();

    // 2. Update flag on session record if this was a flag task
    if (milestone.taskType === "user_flag") {
      await tx
        .update(trainingSessions)
        .set({
          userFlag: answer.trim(),
          userFlagSubmittedAt: now,
          updatedAt: now,
        })
        .where(eq(trainingSessions.id, sessionId));
    } else if (milestone.taskType === "root_flag") {
      await tx
        .update(trainingSessions)
        .set({
          rootFlag: answer.trim(),
          rootFlagSubmittedAt: now,
          updatedAt: now,
        })
        .where(eq(trainingSessions.id, sessionId));
    }

    // 3. Automatically unlock the next milestone in sequence
    const [nextMilestone] = await tx
      .select()
      .from(sessionMilestones)
      .where(
        and(
          eq(sessionMilestones.trainingSessionId, sessionId),
          eq(sessionMilestones.sortOrder, milestone.sortOrder + 1),
        ),
      );

    let nextUnlockedMilestoneId: string | undefined;
    if (nextMilestone && nextMilestone.status === "locked") {
      await tx
        .update(sessionMilestones)
        .set({ status: "unlocked", updatedAt: now })
        .where(eq(sessionMilestones.id, nextMilestone.id));
      nextUnlockedMilestoneId = nextMilestone.id;
    }

    return {
      ok: true,
      milestone: completedMilestone,
      nextUnlockedMilestoneId,
    };
  });
}

/**
 * Submits a flag directly (used in Adventure Mode or Quick Flag Submit in Guided Mode).
 */
export async function submitDirectFlag(
  sessionId: string,
  flagType: "user_flag" | "root_flag",
  flagValue: string,
): Promise<SubmitDirectFlagResult> {
  const trimmed = (flagValue || "").trim();
  if (!trimmed) {
    return { ok: false, error: "Flag cannot be empty." };
  }

  return repository.trainingTransaction(async (tx) => {
    // Check if there is an associated flag milestone to verify against
    const [flagMilestone] = await tx
      .select()
      .from(sessionMilestones)
      .where(
        and(
          eq(sessionMilestones.trainingSessionId, sessionId),
          eq(sessionMilestones.taskType, flagType),
        ),
      );

    if (flagMilestone && (flagMilestone.expectedAnswer || flagMilestone.answerHash)) {
      const verifyResult = verifyMilestoneAnswer({
        userAnswer: trimmed,
        expectedAnswer: flagMilestone.expectedAnswer,
        answerHash: flagMilestone.answerHash,
        taskType: flagType,
      });

      if (!verifyResult.isCorrect) {
        return {
          ok: false,
          error: "Invalid flag. Check the hash or string and try again.",
        };
      }

      // Mark the milestone completed as well
      const now = new Date();
      await tx
        .update(sessionMilestones)
        .set({
          status: "completed",
          userAnswer: trimmed,
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(sessionMilestones.id, flagMilestone.id));
    }

    // Persist to training_sessions
    const now = new Date();
    if (flagType === "user_flag") {
      await tx
        .update(trainingSessions)
        .set({
          userFlag: trimmed,
          userFlagSubmittedAt: now,
          updatedAt: now,
        })
        .where(eq(trainingSessions.id, sessionId));
    } else {
      await tx
        .update(trainingSessions)
        .set({
          rootFlag: trimmed,
          rootFlagSubmittedAt: now,
          updatedAt: now,
        })
        .where(eq(trainingSessions.id, sessionId));
    }

    return {
      ok: true,
      message: `${flagType === "user_flag" ? "User" : "Root"} flag verified and captured!`,
    };
  });
}

/**
 * Switches a session's mode between "guided" and "adventure".
 */
export async function switchSessionMode(
  sessionId: string,
  mode: TrainingSessionMode,
): Promise<{ ok: boolean; mode: TrainingSessionMode }> {
  await db
    .update(trainingSessions)
    .set({ mode, updatedAt: new Date() })
    .where(eq(trainingSessions.id, sessionId));

  return { ok: true, mode };
}
