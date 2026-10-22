"use server";

import { revalidatePath } from "next/cache";
import {
  advanceTrainingSessionPhase,
  completeSessionCheck,
  completeTrainingSession,
  deleteTrainingSession,
  pauseTrainingSession,
  renameTrainingSession,
  resetTrainingSession,
  resumeTrainingSession,
  setTrainingSessionTargetIp,
  skipSessionCheck,
  resetSessionCheck,
  startTrainingSession,
  getTrainingSession,
  type CompleteSessionInput,
} from "@/modules/training/service";
import {
  confirmFinding,
  createAttempt,
  createFinding,
  createHypothesis,
  deleteFinding,
  deleteHypothesis,
  updateFinding,
  updateHypothesis,
  type CreateAttemptInput,
  type CreateFindingInput,
  type CreateHypothesisInput,
  type UpdateFindingInput,
  type UpdateHypothesisInput,
} from "@/modules/training/evidence";
import {
  createNote,
  deleteNote,
  type CreateNoteInput,
} from "@/modules/training/notes";
import {
  suggestCanonicalContext,
  type SuggestCanonicalContextInput,
} from "@/modules/context/ai-suggestion";
import type { ContextKind } from "@/modules/context/engine";

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

export async function resetCheckAction(sessionId: string, checkId: string) {
  try {
    await resetSessionCheck(sessionId, checkId);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to reset check",
    };
  }
}

export async function advancePhaseAction(
  sessionId: string,
  overrideReason?: string,
  override?: boolean,
) {
  try {
    const isOverride = Boolean(
      override || (overrideReason && overrideReason.trim().length > 0),
    );
    const result = await advanceTrainingSessionPhase(
      sessionId,
      isOverride ? { override: true, reason: overrideReason } : undefined,
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

export async function updateFindingAction(
  sessionId: string,
  findingId: string,
  input: UpdateFindingInput,
) {
  try {
    await updateFinding(sessionId, findingId, input);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to update finding",
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

export async function deleteFindingAction(
  sessionId: string,
  findingId: string,
) {
  try {
    await deleteFinding(sessionId, findingId);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to delete finding",
    };
  }
}

export async function suggestFindingContextAction(
  _sessionId: string,
  input: SuggestCanonicalContextInput,
) {
  try {
    const suggestion = await suggestCanonicalContext(input);
    return { ok: true as const, data: suggestion };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to detect context",
    };
  }
}

export async function applyFindingContextSuggestionAction(
  sessionId: string,
  findingId: string,
  contextKind: ContextKind,
  contextValue: string,
  evidenceState?: "observed" | "inferred" | "confirmed",
) {
  try {
    await updateFinding(sessionId, findingId, {
      contextKind,
      contextValue,
      evidenceState: evidenceState ?? "confirmed",
    });
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to apply context suggestion",
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

export async function updateHypothesisAction(
  sessionId: string,
  hypothesisId: string,
  input: UpdateHypothesisInput,
) {
  try {
    await updateHypothesis(sessionId, hypothesisId, input);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to update hypothesis",
    };
  }
}

export async function deleteHypothesisAction(
  sessionId: string,
  hypothesisId: string,
) {
  try {
    await deleteHypothesis(sessionId, hypothesisId);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to delete hypothesis",
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

export async function completeSessionAction(
  sessionId: string,
  input?: CompleteSessionInput,
) {
  try {
    await completeTrainingSession(sessionId, input);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to complete session",
    };
  }
}

export async function deleteSessionAction(sessionId: string) {
  try {
    await deleteTrainingSession(sessionId);
    revalidatePath("/training");
    revalidatePath("/");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to delete session",
    };
  }
}

export async function resetSessionAction(sessionId: string) {
  try {
    await resetTrainingSession(sessionId);
    revalidatePath(`/training/${sessionId}`);
    revalidatePath("/training");
    revalidatePath("/");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to restart session",
    };
  }
}

export async function renameSessionAction(sessionId: string, newName: string) {
  try {
    await renameTrainingSession(sessionId, newName);
    revalidatePath(`/training/${sessionId}`);
    revalidatePath("/training");
    revalidatePath("/");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to rename session",
    };
  }
}

export async function getCheckExplanationAction(
  sessionId: string,
  checkId: string,
) {
  try {
    const { getCheckExplanation } = await import("@/modules/checklist/explanation");
    const result = await getCheckExplanation(sessionId, checkId);
    return { ok: true as const, data: result };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to load explanation",
    };
  }
}

export async function autoDraftHypothesisAction(
  sessionId: string,
  input: {
    hypothesis: string;
    findingId?: string | null;
  },
) {
  try {
    const { generateHypothesisDraft } = await import("@/modules/training/hypothesis-draft");
    let findingTitle: string | null = null;
    let findingCategory: string | null = null;
    let findingEvidence: string | null = null;
    let contextKind: string | null = null;
    let contextValue: string | null = null;

    if (input.findingId) {
      const session = await getTrainingSession(sessionId);
      const finding = session.findings.find((f) => f.id === input.findingId);
      if (finding) {
        findingTitle = finding.title;
        findingCategory = finding.category;
        findingEvidence = finding.evidence;
        contextKind = finding.contextKind;
        contextValue = finding.contextValue;
      }
    }

    const draft = await generateHypothesisDraft({
      hypothesis: input.hypothesis,
      findingTitle,
      findingCategory,
      findingEvidence,
      contextKind,
      contextValue,
    });

    return { ok: true as const, data: draft };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to auto-draft hypothesis",
    };
  }
}

export async function switchSessionModeAction(
  sessionId: string,
  mode: "guided" | "adventure",
) {
  try {
    const { switchSessionMode } = await import("@/modules/training/milestone-service");
    await switchSessionMode(sessionId, mode);
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const, mode };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to switch training mode",
    };
  }
}

export async function submitMilestoneAnswerAction(
  sessionId: string,
  milestoneId: string,
  answer: string,
) {
  try {
    const { submitMilestoneAnswer } = await import("@/modules/training/milestone-service");
    const result = await submitMilestoneAnswer(sessionId, milestoneId, answer);
    if (!result.ok) {
      return { ok: false as const, error: result.error || "Incorrect answer" };
    }
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const, milestone: result.milestone };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to submit answer",
    };
  }
}

export async function submitDirectFlagAction(
  sessionId: string,
  flagType: "user_flag" | "root_flag",
  flagValue: string,
) {
  try {
    const { submitDirectFlag } = await import("@/modules/training/milestone-service");
    const result = await submitDirectFlag(sessionId, flagType, flagValue);
    if (!result.ok) {
      return { ok: false as const, error: result.error || "Invalid flag" };
    }
    revalidatePath(`/training/${sessionId}`);
    return { ok: true as const, message: result.message };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Failed to submit flag",
    };
  }
}




