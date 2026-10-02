"use server";

import { revalidatePath } from "next/cache";
import {
  advanceTrainingSessionPhase,
  completeSessionCheck,
  pauseTrainingSession,
  resumeTrainingSession,
  setTrainingSessionTargetIp,
  skipSessionCheck,
  startTrainingSession,
} from "@/modules/training/service";
import {
  confirmFinding,
  createAttempt,
  createFinding,
  createHypothesis,
  type CreateAttemptInput,
  type CreateFindingInput,
  type CreateHypothesisInput,
} from "@/modules/training/evidence";
import {
  createNote,
  deleteNote,
  type CreateNoteInput,
} from "@/modules/training/notes";

export async function startSessionAction(sessionId: string) {
  try {
    await startTrainingSession(sessionId);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to start session",
    };
  }
}

export async function pauseSessionAction(sessionId: string) {
  try {
    await pauseTrainingSession(sessionId);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to pause session",
    };
  }
}

export async function resumeSessionAction(sessionId: string) {
  try {
    await resumeTrainingSession(sessionId);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to resume session",
    };
  }
}

export async function setTargetIpAction(sessionId: string, targetIp: string) {
  try {
    await setTrainingSessionTargetIp(sessionId, targetIp);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to update target IP",
    };
  }
}

export async function completeCheckAction(sessionId: string, checkId: string) {
  try {
    await completeSessionCheck(sessionId, checkId);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to complete check",
    };
  }
}

export async function skipCheckAction(sessionId: string, checkId: string) {
  try {
    await skipSessionCheck(sessionId, checkId);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to skip check",
    };
  }
}

export async function advancePhaseAction(
  sessionId: string,
  overrideReason?: string,
) {
  try {
    const result = await advanceTrainingSessionPhase(
      sessionId,
      overrideReason ? { reason: overrideReason } : undefined,
    );
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const, result };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to advance phase",
    };
  }
}

export async function createFindingAction(
  sessionId: string,
  input: CreateFindingInput,
) {
  try {
    await createFinding(sessionId, input);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to create finding",
    };
  }
}

export async function confirmFindingAction(
  sessionId: string,
  findingId: string,
) {
  try {
    await confirmFinding(sessionId, findingId);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to confirm finding",
    };
  }
}

export async function createHypothesisAction(
  sessionId: string,
  input: CreateHypothesisInput,
) {
  try {
    await createHypothesis(sessionId, input);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to create hypothesis",
    };
  }
}

export async function createAttemptAction(
  sessionId: string,
  input: CreateAttemptInput,
) {
  try {
    await createAttempt(sessionId, input);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to create attempt",
    };
  }
}

export async function createNoteAction(
  sessionId: string,
  input: CreateNoteInput,
) {
  try {
    await createNote(sessionId, input);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to create note",
    };
  }
}

export async function deleteNoteAction(sessionId: string, noteId: string) {
  try {
    await deleteNote(sessionId, noteId);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to delete note",
    };
  }
}
