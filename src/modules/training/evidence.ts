import * as evidenceRepository from "./evidence-repository";
import {
  createAttemptSchema,
  createFindingSchema,
  createHypothesisSchema,
  parseEvidenceId,
  parseEvidenceInput,
  requireNonemptyUpdate,
  updateAttemptSchema,
  updateFindingSchema,
  updateHypothesisSchema,
  type CreateAttemptInput,
  type CreateFindingInput,
  type CreateHypothesisInput,
  type UpdateAttemptInput,
  type UpdateFindingInput,
  type UpdateHypothesisInput,
} from "./evidence-input";
import { lockTrainingSession, trainingTransaction } from "./repository";

export async function createFinding(sessionId: string, input: CreateFindingInput) {
  const id = parseEvidenceId(sessionId);
  const finding = parseEvidenceInput(createFindingSchema, input);
  return trainingTransaction(async (transaction) => {
    await lockTrainingSession(transaction, id);
    return evidenceRepository.insertFinding(transaction, {
      ...finding,
      trainingSessionId: id,
    });
  });
}

export async function updateFinding(
  sessionId: string,
  findingId: string,
  input: UpdateFindingInput,
) {
  const id = parseEvidenceId(sessionId);
  const ownedFindingId = parseEvidenceId(findingId);
  const changes = parseEvidenceInput(updateFindingSchema, input);
  requireNonemptyUpdate(changes);
  return trainingTransaction(async (transaction) => {
    await lockTrainingSession(transaction, id);
    await evidenceRepository.lockFinding(transaction, id, ownedFindingId);
    return evidenceRepository.updateFindingRecord(transaction, id, ownedFindingId, changes);
  });
}

export async function confirmFinding(sessionId: string, findingId: string) {
  const id = parseEvidenceId(sessionId);
  const ownedFindingId = parseEvidenceId(findingId);
  return trainingTransaction(async (transaction) => {
    await lockTrainingSession(transaction, id);
    const finding = await evidenceRepository.lockFinding(transaction, id, ownedFindingId);
    if (finding.evidenceState === "confirmed") return finding;
    return evidenceRepository.updateFindingRecord(transaction, id, ownedFindingId, {
      evidenceState: "confirmed",
    });
  });
}

export async function getFinding(sessionId: string, findingId: string) {
  return evidenceRepository.getFindingRecord(
    parseEvidenceId(sessionId),
    parseEvidenceId(findingId),
  );
}

export async function listSessionFindings(sessionId: string) {
  const id = parseEvidenceId(sessionId);
  await evidenceRepository.ensureSessionExists(id);
  return evidenceRepository.listFindingRecords(id);
}

export async function createHypothesis(sessionId: string, input: CreateHypothesisInput) {
  const id = parseEvidenceId(sessionId);
  const hypothesis = parseEvidenceInput(createHypothesisSchema, input);
  return trainingTransaction(async (transaction) => {
    await lockTrainingSession(transaction, id);
    if (hypothesis.basedOnFindingId) {
      await evidenceRepository.lockFinding(transaction, id, hypothesis.basedOnFindingId);
    }
    return evidenceRepository.insertHypothesis(transaction, {
      ...hypothesis,
      trainingSessionId: id,
    });
  });
}

export async function updateHypothesis(
  sessionId: string,
  hypothesisId: string,
  input: UpdateHypothesisInput,
) {
  const id = parseEvidenceId(sessionId);
  const ownedHypothesisId = parseEvidenceId(hypothesisId);
  const changes = parseEvidenceInput(updateHypothesisSchema, input);
  requireNonemptyUpdate(changes);
  return trainingTransaction(async (transaction) => {
    await lockTrainingSession(transaction, id);
    await evidenceRepository.lockHypothesis(transaction, id, ownedHypothesisId);
    if (changes.basedOnFindingId) {
      await evidenceRepository.lockFinding(transaction, id, changes.basedOnFindingId);
    }
    return evidenceRepository.updateHypothesisRecord(
      transaction,
      id,
      ownedHypothesisId,
      changes,
    );
  });
}

export async function getHypothesis(sessionId: string, hypothesisId: string) {
  return evidenceRepository.getHypothesisRecord(
    parseEvidenceId(sessionId),
    parseEvidenceId(hypothesisId),
  );
}

export async function listSessionHypotheses(sessionId: string) {
  const id = parseEvidenceId(sessionId);
  await evidenceRepository.ensureSessionExists(id);
  return evidenceRepository.listHypothesisRecords(id);
}

export async function createAttempt(sessionId: string, input: CreateAttemptInput) {
  const id = parseEvidenceId(sessionId);
  const attempt = parseEvidenceInput(createAttemptSchema, input);
  return trainingTransaction(async (transaction) => {
    await lockTrainingSession(transaction, id);
    if (attempt.hypothesisId) {
      await evidenceRepository.lockHypothesis(transaction, id, attempt.hypothesisId);
    }
    return evidenceRepository.insertAttempt(transaction, {
      ...attempt,
      trainingSessionId: id,
    });
  });
}

export async function updateAttempt(
  sessionId: string,
  attemptId: string,
  input: UpdateAttemptInput,
) {
  const id = parseEvidenceId(sessionId);
  const ownedAttemptId = parseEvidenceId(attemptId);
  const changes = parseEvidenceInput(updateAttemptSchema, input);
  requireNonemptyUpdate(changes);
  return trainingTransaction(async (transaction) => {
    await lockTrainingSession(transaction, id);
    await evidenceRepository.lockAttempt(transaction, id, ownedAttemptId);
    if (changes.hypothesisId) {
      await evidenceRepository.lockHypothesis(transaction, id, changes.hypothesisId);
    }
    return evidenceRepository.updateAttemptRecord(transaction, id, ownedAttemptId, changes);
  });
}

export async function getAttempt(sessionId: string, attemptId: string) {
  return evidenceRepository.getAttemptRecord(
    parseEvidenceId(sessionId),
    parseEvidenceId(attemptId),
  );
}

export async function listSessionAttempts(sessionId: string) {
  const id = parseEvidenceId(sessionId);
  await evidenceRepository.ensureSessionExists(id);
  return evidenceRepository.listAttemptRecords(id);
}
